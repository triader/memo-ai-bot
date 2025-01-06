import { userSettingsService } from '../../server.js';
import { categoryService } from '../../server.js';
import { mainKeyboard } from '../../utils/keyboards.js';
import { BotState, stateManager } from '../../utils/stateManager.js';
import { categoryStates } from './categoryHandler.js';
import { CATEGORY_ACTIONS, MESSAGES } from './constants.js';

export const handleError = async (
  bot,
  chatId,
  userId,
  message = 'Failed to process category. Please try again.'
) => {
  console.error('Error:', message);
  const keyboard = await mainKeyboard(userId);
  await bot.sendMessage(chatId, `❌ ${message}`, keyboard);
  categoryStates.delete(chatId);
  stateManager.setState(BotState.IDLE);
};

export const sendSuccessMessage = async (bot, chatId, userId, message, customKeyboard = null) => {
  const keyboard = customKeyboard || (await mainKeyboard(userId));
  await bot.sendMessage(chatId, `✅ ${message}`, keyboard);
  categoryStates.delete(chatId);
  stateManager.setState(BotState.IDLE);
};

export const createCategoryInlineKeyboard = (categories, currentCategory) => {
  const keyboard = categories.flatMap((cat) => [
    [
      {
        text: `${cat.name}${cat.id === currentCategory?.id ? ' ✅' : ''}`,
        callback_data: CATEGORY_ACTIONS.SELECT + cat.id
      }
    ],
    [
      {
        text: '✏️ Edit',
        callback_data: CATEGORY_ACTIONS.EDIT + cat.id
      },
      {
        text: '🗑️ Delete',
        callback_data: CATEGORY_ACTIONS.DELETE + cat.id
      }
    ]
  ]);

  keyboard.push([
    {
      text: '➕ New Category',
      callback_data: CATEGORY_ACTIONS.NEW
    }
  ]);

  return keyboard;
};

export async function showCategoryList(bot, chatId, userId) {
  const categories = await categoryService.getUserCategories(userId);
  const currentCategory = await userSettingsService.getCurrentCategory(userId);
  const inlineKeyboard = createCategoryInlineKeyboard(categories, currentCategory);

  await bot.sendMessage(chatId, MESSAGES.CATEGORY_LIST, {
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

export function getCallbackAction(callbackData) {
  if (callbackData.startsWith(CATEGORY_ACTIONS.SELECT)) return CATEGORY_ACTIONS.SELECT;
  if (callbackData.startsWith(CATEGORY_ACTIONS.EDIT)) return CATEGORY_ACTIONS.EDIT;
  if (callbackData.startsWith(CATEGORY_ACTIONS.DELETE)) return CATEGORY_ACTIONS.DELETE;
  if (callbackData === CATEGORY_ACTIONS.NEW) return CATEGORY_ACTIONS.NEW;
  return null;
}

export function getCallbackCategoryId(callbackData) {
  if (!callbackData || callbackData === CATEGORY_ACTIONS.NEW) return null;
  return callbackData.split('_').pop();
}
