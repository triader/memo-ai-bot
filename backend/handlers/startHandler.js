import { mainKeyboard } from '../utils/keyboards.js';

export const handleStart = (bot) => async (msg) => {
  const chatId = msg.chat.id;
  const message = `
Welcome to the Language Learning Bot! 🎉

Click the buttons below to:
• Add new words to learn
• Practice existing words
• Get translations and explanations

Let's start learning! 📚
`;
  
  await bot.sendMessage(chatId, message, mainKeyboard);
};