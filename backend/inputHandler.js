import { openai } from './config/openai.js';
import { supabase } from './config/supabase.js';
import {
  myWordsHandler,
  categoryHandler,
  wordEditHandler,
  deleteWordHandler,
  bulkImportHandler,
  addWordHandler,
  practiceHandler,
  startHandler
} from './handlers/index.js';
import { userSettingsService } from './server.js';
import { commandParser } from './utils/commandParser.js';
import { mainKeyboard, mainKeyboardSecondary } from './utils/keyboards.js';
import { BotState, stateManager } from './utils/stateManager.js';
import { deleteStates } from './handlers/deleteWordHandler.js';
import { BUTTONS } from './constants/buttons.js';
import { handleCategoryCallback } from './handlers/categoryHandler.js';
import { translateAIHandler, handleTranslationCallback } from './features/index.js';

export function inputHandler(bot) {
  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const text = msg.text;

      // Handle cancel command globally
      if (text === BUTTONS.CANCEL) {
        stateManager.clearState();
        await bot.sendMessage(chatId, 'Operation cancelled.', mainKeyboard);
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
        case BotState.CHANGING_CATEGORY:
          await categoryHandler(bot, supabase, userSettingsService)(msg);
          return;
        case BotState.IMPORTING:
          await bulkImportHandler(bot, supabase)(msg);
          return;
        case BotState.EDITING_WORD:
          await wordEditHandler(bot, supabase)(msg);
          return;
        case BotState.DELETING_WORD:
          await deleteWordHandler(bot, supabase)(msg);
          return;
      }

      // Handle commands when in IDLE state
      if (text?.startsWith('/')) {
        const parsedCommand = commandParser(text);
        switch (parsedCommand.command) {
          case '/start':
            await startHandler(bot)(msg);
            break;
          case '/reset':
            stateManager.setState(BotState.IDLE);
            await bot.sendMessage(chatId, 'The bot has been reset', mainKeyboard);
            break;
          default:
            await bot.sendMessage(
              chatId,
              '❓ Unknown command. Please use the menu buttons below.',
              mainKeyboard
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
          stateManager.setState(BotState.PRACTICING);
          await practiceHandler(bot, supabase, userSettingsService)(msg);
          break;
        case BUTTONS.MANAGE_CATEGORY:
          stateManager.setState(BotState.CHANGING_CATEGORY);
          await categoryHandler(bot, supabase, userSettingsService)(msg);
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
          stateManager.setState(BotState.DELETING_WORD);
          await deleteWordHandler(bot, supabase, userSettingsService)(msg);
          break;
        case BUTTONS.MORE_OPTIONS:
          await bot.sendMessage(chatId, 'Additional options:', mainKeyboardSecondary);
          break;
        case BUTTONS.BACK_TO_MAIN:
          await bot.sendMessage(chatId, 'Main menu:', mainKeyboard);
          break;
        default:
          if (stateManager.getState() === BotState.IDLE) {
            await translateAIHandler(bot, openai, userSettingsService)(msg);
          }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      stateManager.clearState();
      try {
        await bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.', mainKeyboard);
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  });

  bot.on('callback_query', async (query) => {
    await handleCategoryCallback(bot)(query);

    try {
      if (
        query.data.startsWith('translate_') ||
        query.data.startsWith('add_trans_') ||
        query.data.startsWith('more_examples_')
      ) {
        await handleTranslationCallback(bot, supabase, openai)(query);
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
    } catch (error) {
      console.error('Error handling callback query:', error);
    }
  });
}
