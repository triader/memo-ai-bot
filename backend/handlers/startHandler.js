import { mainKeyboard } from '../utils/keyboards.js';

export const startHandler = (bot) => async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Welcome message
    const keyboard = await mainKeyboard(userId);
    await bot.sendMessage(chatId, 'Welcome to the Language Learning Bot!', keyboard);
  } catch (error) {
    console.error('Error in start handler:', error);
  }
};
