import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { supabase } from './config/supabase.js';
import { parseCommand } from './utils/commandParser.js';
import { handleStart } from './handlers/startHandler.js';
import { handleAddWord } from './handlers/wordHandler.js';
import { handlePractice } from './handlers/practiceHandler.js';
import { handleBulkImport } from './handlers/bulkImportHandler.js';
import { handleMyWords, handleWordEdit, handleWordDelete } from './handlers/wordManagementHandler.js';
import { handleDeleteCommand } from './handlers/deleteWordHandler.js';
import { mainKeyboard, cancelKeyboard } from './utils/keyboards.js';

// Load environment variables
dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is missing');
}

// Initialize bot and express
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const app = express();

// Enable CORS with specific options
app.use(cors({
  origin: true,
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));
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

    if (!text) return;

    // Handle commands
    const parsedCommand = parseCommand(text);
    if (parsedCommand) {
      switch (parsedCommand.command) {
        case '/delete':
          await handleDeleteCommand(bot, supabase)(msg);
          break;
        case '/start':
          await handleStart(bot)(msg);
          break;
        case '/add':
          await handleAddWord(bot, supabase)(msg);
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

    // Handle menu button actions
    switch (text) {
      case '📝 Add Word':
        await handleAddWord(bot, supabase)(msg);
        break;
      case '📥 Bulk Import':
        await bot.sendMessage(
          chatId,
          'Please upload an Excel file (.xlsx or .xls) with columns "word" and "translation"'
        );
        break;
      case '🎯 Practice':
        await handlePractice(bot, supabase)(msg);
        break;
      case '📚 My Words':
        await handleMyWords(bot, supabase)(msg);
        break;
      case '❌ Cancel':
        await bot.sendMessage(chatId, 'Operation cancelled.', mainKeyboard);
        break;
      default:
        // Handle document uploads for bulk import
        if (msg.document) {
          await handleBulkImport(bot, supabase)(msg);
          return;
        }
        
        // Handle word addition flow
        await handleAddWord(bot, supabase)(msg);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    try {
      await bot.sendMessage(
        msg.chat.id,
        '❌ An error occurred. Please try again.',
        mainKeyboard
      );
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