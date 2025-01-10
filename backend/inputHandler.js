import { supabase } from './config/supabase.js';
import {
  myWordsHandler,
  wordEditHandler,
  deleteWordHandler,
  bulkImportHandler,
  addWordHandler,
  startHandler
} from './handlers/index.js';
import { userSettingsService } from './server.js';
import {
  commandParser,
  BotState,
  stateManager,
  mainKeyboard,
  mainKeyboardSecondary
} from './utils/index.js';
import { deleteStates } from './handlers/deleteWordHandler.js';
import { BUTTONS } from './constants/buttons.js';
import {
  CATEGORY_ACTIONS,
  categoryHandler,
  categoryStates,
  onCategoryCreate
} from './features/categoryManagement/index.js';
import {
  translateAIHandler,
  handleTranslationCallback,
  practiceHandler,
  handlePracticeCallback,
  categoryCallback,
  setUpLearningContext,
  setUpOriginalContext,
  initiateContextChange
} from './features/index.js';
import { CategoryService } from './services/categoryService.js';
import { PRACTICE_TYPES } from './features/practice/constants/index.js';

export function inputHandler(bot) {
  const categoryService = new CategoryService(supabase);

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    try {
      // Skip processing if this is a callback query message
      if (msg.callback_query) {
        return;
      }

      // Special handling for /start command
      if (text === '/start') {
        await startHandler(bot, supabase, userSettingsService)(msg);
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
          await addWordHandler(bot, supabase, userSettingsService)(msg);
          return;
        case BotState.PRACTICING:
          await practiceHandler(bot, supabase, userSettingsService)(msg);
          return;
        case BotState.IMPORTING:
          await bulkImportHandler(bot, supabase)(msg);
          return;
        case BotState.CREATING_CATEGORY:
          await onCategoryCreate(bot)(msg);
          return;
        // are these needed?
        case BotState.EDITING_CATEGORY:
        case BotState.DELETING_CATEGORY: //TODO: refactor to use different handlers
          await categoryHandler(bot)(msg);
          return;
        case BotState.EDITING_WORD:
          await wordEditHandler(bot, supabase)(msg);
          return;
        case BotState.SETTING_ORIGINAL_CONTEXT:
          await setUpOriginalContext(bot, msg);
          return;
        case BotState.SETTING_LEARNING_CONTEXT:
          await setUpLearningContext(bot, msg);
          return;
      }

      // Handle commands when in IDLE state
      if (text?.startsWith('/')) {
        const parsedCommand = commandParser(text);
        switch (parsedCommand.command) {
          case '/start':
            await startHandler(bot, supabase, userSettingsService)(msg);
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
          await addWordHandler(bot, supabase, userSettingsService)(msg);
          break;
        case BUTTONS.PRACTICE:
          await practiceHandler(bot, supabase, userSettingsService)(msg);
          break;
        case BUTTONS.IMPORT:
          stateManager.setState(BotState.IMPORTING);
          await bulkImportHandler(bot, supabase)(msg);
          break;
        case BUTTONS.MY_WORDS:
          await myWordsHandler(bot, supabase, userSettingsService)(msg);
          break;
        case BUTTONS.EDIT_WORD:
          stateManager.setState(BotState.EDITING_WORD);
          await wordEditHandler(bot, supabase)(msg);
          break;
        case BUTTONS.DELETE_WORD:
          await deleteWordHandler(bot, supabase, userSettingsService)(msg);
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
        default:
          if (text.startsWith(BUTTONS.CATEGORY)) {
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

  bot.on('callback_query', async (query) => {
    try {
      if (Object.values(PRACTICE_TYPES).includes(query.data)) {
        await handlePracticeCallback(bot, query);
        return;
      }
      const isCategoryAction =
        Object.values(CATEGORY_ACTIONS).some((prefix) => query.data.startsWith(prefix)) ||
        query.data === CATEGORY_ACTIONS.NEW;
      if (isCategoryAction) {
        await categoryCallback(bot)(query);
        return;
      }
      if (
        query.data.startsWith('translate_') ||
        query.data.startsWith('add_trans_') ||
        query.data.startsWith('more_examples_')
      ) {
        await handleTranslationCallback(bot, query);
        return;
      }

      const state = deleteStates.get(query.message.chat.id);
      if (state?.action === 'SELECT_WORD_TO_DELETE') {
        await deleteWordHandler(
          bot,
          supabase,
          userSettingsService
        )({
          callback_query: query,
          chat: query.message.chat.id,
          from: query.from
        });
        return;
      }

      console.warn('Unhandled callback query:', query.data);
    } catch (error) {
      console.error('Error handling callback query:', error);
      const chatId = query.message.chat.id;
      const userId = query.from.id;
      const keyboard = await mainKeyboard(userId);
      await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', keyboard);
    }
  });
}
