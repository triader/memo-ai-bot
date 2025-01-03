import { mainKeyboard, cancelKeyboard } from '../utils/keyboards.js';
import { CategoryService } from '../services/categoryService.js';
import { ExcelProcessor } from '../services/excelProcessor.js';
import { BUTTONS } from '../constants/buttons.js';

const userStates = new Map();

const createCategoryKeyboard = (categories) => {
  const keyboard = categories.map((cat) => [
    {
      text: cat.name
    }
  ]);

  keyboard.push([{ text: BUTTONS.CANCEL }]);

  return {
    keyboard,
    resize_keyboard: true,
    one_time_keyboard: true
  };
};

export const bulkImportHandler = (bot, supabase) => {
  const categoryService = new CategoryService(supabase);

  return async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
      // Handle initial command
      if (text === '/import' || text === '📥 Import') {
        const categories = await categoryService.getUserCategories(userId);

        userStates.set(chatId, { step: 'selecting_category' });

        let message;
        if (categories?.length) {
          message = 'Choose a category or type a new category name:';
          const categoryKeyboard = createCategoryKeyboard(categories);
          await bot.sendMessage(chatId, message, { reply_markup: categoryKeyboard });
        } else {
          message = 'You have no categories yet. Please enter a name for your first category:';
          await bot.sendMessage(chatId, message, cancelKeyboard);
        }
        return;
      }

      // Get current state
      const userState = userStates.get(chatId);

      if (!userState) {
        console.log('No state found for chat:', chatId);
        return;
      }

      // Handle cancel command in any state
      if (text === BUTTONS.CANCEL) {
        userStates.delete(chatId);
        const keyboard = await mainKeyboard(userId);
        await bot.sendMessage(chatId, 'Operation cancelled.', keyboard);
        return;
      }

      // Handle state-specific logic
      switch (userState.step) {
        case 'selecting_category':
          const categories = await categoryService.getUserCategories(userId);
          const selectedCategory = categories.find((cat) => cat.name === text);

          try {
            const category =
              selectedCategory || (await categoryService.createCategory(userId, text));

            userStates.set(chatId, {
              step: 'waiting_for_file',
              selectedCategory: category
            });

            const message = selectedCategory
              ? `Category "${category.name}" selected.`
              : `Category "${category.name}" created.`;

            await bot.sendMessage(
              chatId,
              `${message} Please send your Excel file (.xlsx or .xls) with columns "word" and "translation".`,
              cancelKeyboard
            );
          } catch (error) {
            console.error('Error in category selection:', error);
            const keyboard = await mainKeyboard(userId);
            await bot.sendMessage(
              chatId,
              '❌ Failed to process category. Please try again.',
              keyboard
            );
            userStates.delete(chatId);
          }
          break;

        case 'waiting_for_file':
          if (!msg.document) {
            await bot.sendMessage(
              chatId,
              'Please send an Excel file (.xlsx or .xls)',
              cancelKeyboard
            );
            return;
          }

          if (!msg.document.mime_type.includes('spreadsheet')) {
            await bot.sendMessage(chatId, 'Please send an Excel file (.xlsx or .xls)');
            return;
          }

          try {
            const file = await bot.getFile(msg.document.file_id);
            const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

            const data = await ExcelProcessor.processFile(fileUrl);
            ExcelProcessor.validateData(data);

            const words = ExcelProcessor.prepareWords(data, userId, userState.selectedCategory.id);

            const { error } = await supabase.from('words').insert(words);
            if (error) throw error;

            const keyboard = await mainKeyboard(userId);
            await bot.sendMessage(
              chatId,
              `✅ Successfully imported ${words.length} words to category "${userState.selectedCategory.name}"!`,
              keyboard
            );
          } catch (error) {
            console.error('Import error:', error);
            const keyboard = await mainKeyboard(userId);
            await bot.sendMessage(
              chatId,
              error.message ||
                "❌ Failed to process the Excel file. Please make sure it's properly formatted.",
              keyboard
            );
          } finally {
            userStates.delete(chatId);
          }
          break;

        default:
          console.error('Invalid state:', userState.step);
          userStates.delete(chatId);
          const keyboard = await mainKeyboard(userId);
          await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.', keyboard);
      }
    } catch (error) {
      console.error('Error in bulk import handler:', error);
      userStates.delete(chatId);
      const keyboard = await mainKeyboard(userId);
      await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.', keyboard);
    }
  };
};
