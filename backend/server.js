import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { supabase } from './config/supabase.js';
import { parseCommand } from './utils/commandParser.js';
import { handleStart } from './handlers/startHandler.js';
import { handleAddWord } from './handlers/wordHandler.js';
import { handlePractice, practiceStates } from './handlers/practiceHandler.js';
import { handleBulkImport } from './handlers/bulkImportHandler.js';
import { handleMyWords, handleWordDelete } from './handlers/wordManagementHandler.js';
import { handleDeleteCommand } from './handlers/deleteWordHandler.js';
import { mainKeyboard, cancelKeyboard } from './utils/keyboards.js';
import { UserSettingsService } from './services/userSettingsService.js';
import { handleCategory, categoryStates } from './handlers/categoryHandler.js';
import { handleWordEdit } from './handlers/wordEditHandler.js';

// Load environment variables
dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is missing');
}

// Initialize bot and express
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const app = express();

// Enable CORS with specific options
app.use(
  cors({
    origin: true,
    methods: ['POST'],
    allowedHeaders: ['Content-Type']
  })
);
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Express endpoint to handle commands from the web interface
app.post('/bot/command', async (req, res) => {
  try {
    const { command, userId } = req.body;

    if (!command || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const msg = {
      text: command,
      chat: { id: userId },
      from: { id: userId }
    };

    switch (command) {
      case '/add':
        await handleAddWord(bot, supabase)(msg);
        res.json({ success: true });
        break;
      case '/category':
        await handleCategory(bot, supabase, userSettingsService)(msg);
        break;
      default:
        res.status(400).json({ error: 'Unknown command' });
    }
  } catch (error) {
    console.error('Error handling command:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle all messages
bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Handle cancel command globally
    if (text === '❌ Cancel') {
      practiceStates.delete(chatId);
      categoryStates.delete(chatId);
      await bot.sendMessage(chatId, 'Operation cancelled.', mainKeyboard);
      return;
    }

    // First check if there's an active practice state
    const practiceState = practiceStates.get(chatId);
    if (practiceState) {
      await handlePractice(bot, supabase, userSettingsService)(msg);
      return;
    }

    // If message is a command, handle it
    if (text?.startsWith('/')) {
      const parsedCommand = parseCommand(text);
      switch (parsedCommand.command) {
        case '/delete':
          await handleDeleteCommand(bot, supabase)(msg);
          break;
        case '/start':
          await handleStart(bot)(msg);
          break;
        case '/add':
          await handleAddWord(bot, supabase, userSettingsService)(msg);
          break;
        case '/practice':
          await handlePractice(bot, supabase, userSettingsService)(msg);
          break;
        case '/words':
          await handleMyWords(bot, supabase, userSettingsService)(msg);
          break;
        case '/category':
          await handleCategory(bot, supabase, userSettingsService)(msg);
          break;
        case '/edit':
          const editHandler = handleWordEdit(bot, supabase);
          await editHandler(msg);
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

    // Handle menu buttons and text input
    const editHandler = handleWordEdit(bot, supabase);

    switch (text) {
      case '📝 Add Word':
        await handleAddWord(bot, supabase, userSettingsService)(msg);
        break;
      case '📥 Import':
        await handleBulkImport(bot, supabase)(msg);
        break;
      case '🎯 Practice':
        await handlePractice(bot, supabase, userSettingsService)(msg);
        break;
      case '📚 My Words':
        await handleMyWords(bot, supabase, userSettingsService)(msg);
        break;
      case '❌ Cancel':
        await bot.sendMessage(chatId, 'Operation cancelled.', mainKeyboard);
        break;
      case '🔄 Change Category':
        await handleCategory(bot, supabase, userSettingsService)(msg);
        break;
      case '✏️ Edit word':
        await editHandler(msg);
        break;
      default:
        // Handle document uploads for import
        if (msg.document) {
          await handleBulkImport(bot, supabase)(msg);
          return;
        }

        // Try to handle as word edit input first
        const handled = await editHandler(msg);

        // If not handled by edit handler, treat as word addition
        if (!handled) {
          await handleAddWord(bot, supabase, userSettingsService)(msg);
        }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    try {
      await bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.', mainKeyboard);
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }
});

// Handle callback queries
bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const [action, wordId] = query.data.split('_');

    switch (action) {
      case 'edit':
        await handleWordEdit(bot, supabase)(query.message, wordId);
        break;
      case 'delete':
        await handleWordDelete(bot, supabase)(query.message, wordId);
        break;
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    try {
      await bot.sendMessage(
        query.message.chat.id,
        '❌ An error occurred. Please try again.',
        mainKeyboard
      );
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

console.log('Bot is running...');

const userSettingsService = new UserSettingsService(supabase);
