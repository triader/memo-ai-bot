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
  translateHandler
} from './handlers/index.js';
import { userSettingsService } from './server.js';
import { commandParser } from './utils/commandParser.js';
import { mainKeyboard, mainKeyboardSecondary } from './utils/keyboards.js';
import { BotState, stateManager } from './utils/stateManager.js';

export function inputHandler(bot) {
  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const text = msg.text;

      // Handle cancel command globally
      if (text === '❌ Cancel') {
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
        case '📝 Add Word':
          stateManager.setState(BotState.ADDING_WORD);
          await addWordHandler(bot, supabase, userSettingsService)(msg);
          break;
        case '🎯 Practice':
          stateManager.setState(BotState.PRACTICING);
          await practiceHandler(bot, supabase, userSettingsService)(msg);
          break;
        case '🔄 Change Category':
          stateManager.setState(BotState.CHANGING_CATEGORY);
          await categoryHandler(bot, supabase, userSettingsService)(msg);
          break;
        case '📥 Import':
          stateManager.setState(BotState.IMPORTING);
          await bulkImportHandler(bot, supabase)(msg);
          break;
        case '📚 My Words':
          await myWordsHandler(bot, supabase, userSettingsService)(msg);
          break;
        case '✏️ Edit word':
          stateManager.setState(BotState.EDITING_WORD);
          await wordEditHandler(bot, supabase)(msg);
          break;
        case '🗑️ Delete word':
          stateManager.setState(BotState.DELETING_WORD);
          await deleteWordHandler(bot, supabase)(msg);
          break;
        case '⚙️ More options':
          await bot.sendMessage(chatId, 'Additional options:', mainKeyboardSecondary);
          break;
        case '◀️ Back to main':
          await bot.sendMessage(chatId, 'Main menu:', mainKeyboard);
          break;
        default:
          await translateHandler(bot, openai)(msg);
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
}
