import {
  myWordsHandler,
  deleteWordHandler,
  bulkImportHandler,
  addWordHandler,
  startHandler,
  setWordsPerLevelHandler
} from './handlers';
import { categoryService, userSettingsService, wordsService } from './server';
import {
  commandParser,
  BotState,
  stateManager,
  mainKeyboard,
  mainKeyboardSecondary,
  LEVEL_NAVIGATION
} from './utils';
import { BUTTONS } from './constants';
import {
  translateAIHandler,
  practiceHandler,
  handlePracticeCallback,
  categoryCallback,
  setUpLearningContext,
  setUpOriginalContext,
  initiateContextChange,
  CATEGORY_ACTIONS,
  categoryHandler,
  categoryStates,
  onCategoryCreate,
  handleTranslationCallback
} from './features';
import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { getLevelSelectionKeyboard, getMainKeyboard } from './utils/keyboards';
import { MY_WORDS_CALLBACK_PREFIX } from './handlers/myWordsHandler';
import { PRACTICE_CALLBACK_PREFIX } from './features/practice/utils/keyboards';
export function inputHandler(bot: TelegramBot) {
  bot.on('message', async (msg: Message) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;
    console.log('🚀 ~ bot.on ~ userId:', userId);

    if (!chatId || !userId || !text) return;

    try {
      // Skip processing if this is a callback query message
      // @ts-ignore
      if (msg.callback_query) {
        return;
      }

      // Special handling for /start command
      if (text === '/start') {
        await startHandler(bot)(msg);
        return;
      }

      // Check if user has any categories before proceeding
      const hasCategories = await categoryService.hasCategories(userId);
      if (!hasCategories) {
        // When no categories exist, set state and treat all input as category name
        if (!categoryStates.get(chatId)) {
          categoryStates.set(chatId, { step: 'creating_category' });
        }
        await categoryHandler(bot)(msg);
        return;
      }

      // Handle "Select Level" and "Level {$number} ${progress}%" buttons
      if (text === BUTTONS.SELECT_LEVEL || text.startsWith('🏆 Level')) {
        const currentCategory = await userSettingsService.getCurrentCategory(userId);
        if (currentCategory) {
          const levelKeyboard = await getLevelSelectionKeyboard(
            currentCategory.id,
            currentCategory.current_level
          );
          await bot.sendMessage(chatId, 'Your levels:', levelKeyboard);
        }
        return;
      }

      // Rest of the handler logic for users with categories...
      const keyboard = await mainKeyboard(userId);

      // Handle cancel command globally
      if (text === BUTTONS.CANCEL) {
        stateManager.clearState();
        await bot.sendMessage(chatId, 'Operation cancelled.', keyboard);
        return;
      }

      const state = stateManager.getState();

      switch (state) {
        case BotState.ADDING_WORD:
          await addWordHandler(bot)(msg);
          return;
        case BotState.PRACTICING:
          await practiceHandler(bot)(msg);
          return;
        case BotState.IMPORTING:
          await bulkImportHandler(bot)(msg);
          return;
        case BotState.CREATING_CATEGORY:
          await onCategoryCreate(bot)(msg);
          return;
        // are these needed?
        case BotState.EDITING_CATEGORY:
        case BotState.DELETING_CATEGORY: //TODO: refactor to use different handlers
          await categoryHandler(bot)(msg);
          return;
        // case BotState.EDITING_WORD:
        //   await wordEditHandler(bot)(msg);
        //   return;
        case BotState.SETTING_ORIGINAL_CONTEXT:
          await setUpOriginalContext(bot, msg);
          return;
        case BotState.SETTING_LEARNING_CONTEXT:
          await setUpLearningContext(bot, msg);
          return;
        case BotState.SETTING_WORDS_PER_LEVEL:
          await setWordsPerLevelHandler(bot)(msg);
          return;
      }

      // Handle commands when in IDLE state
      if (text?.startsWith('/')) {
        const parsedCommand = commandParser(text);
        if (!parsedCommand) return;
        switch (parsedCommand.command) {
          case '/start':
            await startHandler(bot)(msg);
            break;
          case '/reset':
            stateManager.setState(BotState.IDLE);
            await bot.sendMessage(chatId, 'The bot has been reset', keyboard);
            break;
          default:
            await bot.sendMessage(
              chatId,
              '❓ Unknown command. Please use the menu buttons below.',
              keyboard
            );
        }
        return;
      }
      // Handle menu buttons
      switch (text) {
        case BUTTONS.ADD_WORD:
          stateManager.setState(BotState.ADDING_WORD);
          await addWordHandler(bot)(msg);
          break;
        case BUTTONS.PRACTICE:
          await practiceHandler(bot)(msg);
          break;
        case BUTTONS.IMPORT:
          stateManager.setState(BotState.IMPORTING);
          await bulkImportHandler(bot)(msg);
          break;
        case BUTTONS.MY_WORDS:
          await myWordsHandler(bot)(msg);
          break;
        // case BUTTONS.EDIT_WORD:
        //   stateManager.setState(BotState.EDITING_WORD);
        //   await wordEditHandler(bot)(msg);
        //   break;
        case BUTTONS.DELETE_WORD:
          await deleteWordHandler(bot)(msg);
          break;
        case BUTTONS.MORE_OPTIONS:
          await bot.sendMessage(chatId, 'Additional options:', mainKeyboardSecondary);
          break;
        case BUTTONS.BACK_TO_MAIN:
          await bot.sendMessage(chatId, 'Main menu:', keyboard);
          break;
        case BUTTONS.CHANGE_CONTEXT:
          await initiateContextChange(bot, chatId, userId);
          break;
        case BUTTONS.SET_WORDS_PER_LEVEL:
          await setWordsPerLevelHandler(bot)(msg);
          break;
        case BUTTONS.RESET_PROGRESS:
          const currentCategory = await userSettingsService.getCurrentCategory(userId);
          if (!currentCategory) {
            await bot.sendMessage(chatId, 'No active category found.', await mainKeyboard(userId));
            return;
          }

          // Confirm reset
          await bot.sendMessage(chatId, 'Are you sure you want to reset progress for this level?', {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Yes', callback_data: 'confirm_reset' },
                  { text: '❌ No', callback_data: 'cancel_reset' }
                ]
              ]
            }
          });
          break;
        default:
          if (text?.startsWith(BUTTONS.CATEGORY)) {
            await categoryHandler(bot)(msg); //TODO: only call a function that handles category button click            return;
            return;
          }
          if (stateManager.getState() === BotState.IDLE) {
            await translateAIHandler(bot)(msg);
          }
      }
    } catch (error) {
      stateManager.clearState();
      console.error('Error in input handler:', error);
      const keyboard = await mainKeyboard(userId);
      await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', keyboard);
    }
  });

  bot.on('callback_query', async (query: CallbackQuery) => {
    if (!query.data) return;
    try {
      if (
        query.data === 'review_words' ||
        query.data === 'learn_new_words' ||
        query.data.startsWith(PRACTICE_CALLBACK_PREFIX)
      ) {
        await handlePracticeCallback(bot, query);
        return;
      }

      const isCategoryAction =
        Object.values(CATEGORY_ACTIONS).some((prefix) => query.data?.startsWith(prefix)) ||
        query.data === CATEGORY_ACTIONS.NEW;
      if (isCategoryAction) {
        await categoryCallback(bot)(query);
        return;
      }

      if (
        query.data?.startsWith('translate_') ||
        query.data?.startsWith('add_trans_') ||
        query.data?.startsWith('more_examples_')
      ) {
        await handleTranslationCallback(bot, query);
        return;
      }

      if (query.data?.startsWith('delete_')) {
        if (!query.message) return;
        await deleteWordHandler(bot)({
          // @ts-ignore
          callback_query: query,
          chat: query.message.chat,
          from: query.from
        });
        return;
      }

      // Handle my words level navigation
      if (query.data.startsWith(MY_WORDS_CALLBACK_PREFIX)) {
        //FIXME: to better handle callbacks for level navigation in different components
        query.data = query.data.replace(MY_WORDS_CALLBACK_PREFIX, '');

        if (Object.values(LEVEL_NAVIGATION).includes(query.data as any)) {
          if (!query.message) return;
          await myWordsHandler(bot)({
            // @ts-ignore
            callback_query: query,
            chat: query.message.chat,
            from: query.from
          });
          return;
        }
      }

      // Handle level selection from inline keyboard
      if (query.data.startsWith('select_level_') && query.message) {
        const selectedLevel = parseInt(query.data.split('_')[2], 10);
        const currentCategory = await userSettingsService.getCurrentCategory(query.from.id);
        if (currentCategory) {
          await categoryService.updateCategoryLevel(currentCategory.id, selectedLevel);

          // Delete the original message
          await bot.deleteMessage(query.message.chat.id, query.message.message_id);

          await bot.sendMessage(
            query.message.chat.id,
            `✅ Current level set to ${selectedLevel}`,
            await getMainKeyboard(query.from.id)
          );
          // Resend the inline keyboard with the updated state
          const levelKeyboard = await getLevelSelectionKeyboard(currentCategory.id, selectedLevel);
          await bot.sendMessage(query.message.chat.id, `Your levels:`, levelKeyboard);
        }
        return;
      }

      // Handle reset confirmation
      if (query.data === 'confirm_reset' && query.message) {
        const userId = query.from.id;
        const currentCategory = await userSettingsService.getCurrentCategory(userId);

        if (currentCategory && currentCategory.current_level) {
          // Reset mastery levels for all words in the current level
          await wordsService.resetLevelProgress(
            userId,
            currentCategory.id,
            currentCategory.current_level
          );

          await bot.editMessageText('✅ Progress reset successfully!', {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id
          });
        }
        return;
      }

      if (query.data === 'cancel_reset' && query.message) {
        await bot.editMessageText('Reset cancelled.', {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id
        });
        return;
      }

      console.warn('Unhandled callback query:', query.data);
    } catch (error) {
      console.error('Error handling callback query:', error);
      const chatId = query.message?.chat.id;
      const userId = query.from?.id;
      const keyboard = await mainKeyboard(userId);
      if (!chatId) return;
      await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', keyboard);
    }
  });
}
