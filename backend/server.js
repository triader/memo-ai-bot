import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { supabase } from './config/supabase.js';
import { UserSettingsService } from './services/userSettingsService.js';
import { inputHandler } from './inputHandler.js';
import { handleTranslationCallback } from './handlers/translateAIHandler.js';

// Load environment variables
dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is missing');
}

// Initialize bot and express
export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
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

inputHandler(bot);
// newUserHandler(bot); // TODO

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

console.log('Bot is running...');

export const userSettingsService = new UserSettingsService(supabase);

// Register the translation callback handler
bot.on('callback_query', handleTranslationCallback(bot));
