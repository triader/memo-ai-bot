import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { supabase } from './config';
import { inputHandler } from './inputHandler';
import { CategoryService, UserService, UserSettingsService, WordsService } from './services';
import { PracticeService } from './features';
import crypto from 'crypto';

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

app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

inputHandler(bot);

const verifyTelegramData = (data: any, botToken: string): boolean => {
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const checkString = Object.keys(data)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join('\n');
  const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  return hmac === data.hash;
};

app.post('/auth/telegram', async (req: any, res: any) => {
  const telegramData = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

  if (!verifyTelegramData(telegramData, botToken)) {
    return res.status(403).json({ error: 'Invalid Telegram data' });
  }

  try {
    // Create or update user in Supabase
    const { data, error } = await supabase.from('users').upsert({
      id: telegramData.id,
      first_name: telegramData.first_name,
      last_name: telegramData.last_name,
      username: telegramData.username,
      photo_url: telegramData.photo_url
    });

    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    // Respond with success
    res.json({ message: 'User authenticated successfully', user: data });
  } catch (err) {
    console.error('Error during authentication:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

console.log('Bot is running...');

export const userSettingsService = new UserSettingsService(supabase);
export const categoryService = new CategoryService(supabase);
export const practiceService = new PracticeService(supabase);
export const wordsService = new WordsService(supabase);
export const userService = new UserService(supabase);
