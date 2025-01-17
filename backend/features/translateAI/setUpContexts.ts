import TelegramBot, { Message } from 'node-telegram-bot-api';
import { userSettingsService } from '../../server';
import { cancelKeyboard, mainKeyboard, stateManager, BotState } from '../../utils';

export async function initiateContextChange(bot: TelegramBot, chatId: number, userId: number) {
  try {
    await bot.sendMessage(
      chatId,
      'Let\'s update your language contexts. What language are you translating from? (e.g., "English" or "Russian")',
      cancelKeyboard
    );
    stateManager.setState(BotState.SETTING_ORIGINAL_CONTEXT);
  } catch (error) {
    console.error('Error initiating context change:', error);
    const keyboard = await mainKeyboard(userId);
    await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', keyboard);
  }
}

export async function setUpOriginalContext(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text;

  if (!chatId || !userId || !text) return;

  try {
    await bot.sendChatAction(chatId, 'typing');
    const currentCategory = await userSettingsService.getCurrentCategory(userId);
    if (!currentCategory) return;
    await userSettingsService.updateCategoryContext(userId, currentCategory.id, {
      original_context: text
    });
    await bot.sendMessage(
      chatId,
      'What context are you learning? (e.g., "English" or "Genetics")',
      cancelKeyboard
    );
    stateManager.setState(BotState.SETTING_LEARNING_CONTEXT);
  } catch (error) {
    console.error('Error setting original context:', error);
    await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
  }
}

export async function setUpLearningContext(bot: TelegramBot, msg: Message) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const text = msg.text;

  if (!chatId || !userId || !text) return;

  try {
    const currentCategory = await userSettingsService.getCurrentCategory(userId);
    if (!currentCategory) return;
    await userSettingsService.updateCategoryContext(userId, currentCategory.id, {
      learning_context: text
    });
    const keyboard = await mainKeyboard(userId);
    await bot.sendMessage(
      chatId,
      'Great! Your language contexts have been set. You can now start translating!',
      keyboard
    );
    stateManager.setState(BotState.IDLE);
  } catch (error) {
    console.error('Error setting learning context:', error);
    await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
  }
}
