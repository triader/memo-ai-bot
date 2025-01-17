import {
  cancelKeyboard,
  mainKeyboardNewCategory,
  BotState,
  stateManager,
  mainKeyboard
} from '../../utils';
import { categoryStates } from './categoryHandler';
import { categoryService, userSettingsService } from '../../server';
import { getCallbackAction, getCallbackCategoryId, showCategoryList } from './helpers';
import { CATEGORY_ACTIONS, MESSAGES } from './constants';
import TelegramBot, { CallbackQuery } from 'node-telegram-bot-api';

export const categoryCallback = (bot: TelegramBot) => async (callbackQuery: CallbackQuery) => {
  const chatId = callbackQuery.message?.chat.id;

  if (!chatId || !callbackQuery.data) {
    return;
  }
  const userId = callbackQuery.from.id;
  const keyboard = await mainKeyboard(userId);

  try {
    const action = getCallbackAction(callbackQuery.data);
    const categoryId = getCallbackCategoryId(callbackQuery.data);

    if (!action) {
      return;
    }

    switch (action) {
      case CATEGORY_ACTIONS.SELECT:
        await onCategorySelectClick(bot, userId, chatId, categoryId!, callbackQuery);
        break;

      case CATEGORY_ACTIONS.NEW:
        await onCategoryCreateClick(bot, chatId, callbackQuery);
        break;

      case CATEGORY_ACTIONS.EDIT:
        await onCategoryEditClick(bot, chatId, categoryId!, callbackQuery);
        break;

      case CATEGORY_ACTIONS.DELETE:
        await onCategoryDeleteClick(bot, userId, chatId, categoryId!, callbackQuery);
        break;

      default:
        console.warn('Unknown callback action:', action);
        break;
    }
  } catch (error) {
    console.error('Error in category callback handler:', error);
    await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', keyboard);
    categoryStates.delete(chatId);
    stateManager.setState(BotState.IDLE);
  }
};

export async function onCategorySelectClick(
  bot: TelegramBot,
  userId: number,
  chatId: number,
  categoryId: string,
  callbackQuery: CallbackQuery
) {
  if (!callbackQuery.message?.message_id) {
    return;
  }

  await userSettingsService.setCurrentCategory(userId, categoryId);
  const category = await categoryService.findCategoryById(userId, categoryId);
  if (!category) return;
  await bot.deleteMessage(chatId, callbackQuery.message?.message_id);

  // Send success message
  await bot.sendMessage(
    chatId,
    `✅ Current category changed to "${category.name}"`,
    mainKeyboardNewCategory(category.name)
  );

  // Show updated category list
  await showCategoryList(bot, chatId, userId);

  await bot.answerCallbackQuery(callbackQuery.id);
  stateManager.setState(BotState.IDLE);
}

export async function onCategoryCreateClick(
  bot: TelegramBot,
  chatId: number,
  callbackQuery: CallbackQuery
) {
  try {
    if (!callbackQuery.message?.message_id) {
      return;
    }

    await bot.deleteMessage(chatId, callbackQuery.message?.message_id);
    await bot.sendMessage(chatId, MESSAGES.NEW_CATEGORY, cancelKeyboard);
    stateManager.setState(BotState.CREATING_CATEGORY);
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('Error in onCategoryCreateClick:', error);
    throw error;
  }
}

async function onCategoryEditClick(
  bot: TelegramBot,
  chatId: number,
  categoryId: string,
  callbackQuery: CallbackQuery
) {
  if (!callbackQuery.message?.message_id) {
    return;
  }

  stateManager.setState(BotState.EDITING_CATEGORY);
  await bot.sendMessage(chatId, MESSAGES.EDIT_CATEGORY, cancelKeyboard);
  categoryStates.set(chatId, {
    step: 'saving_edited_category',
    categoryToEdit: { id: categoryId }
  });
  await bot.deleteMessage(chatId, callbackQuery.message.message_id);
  await bot.answerCallbackQuery(callbackQuery.id);
}

async function onCategoryDeleteClick(
  bot: TelegramBot,
  userId: number,
  chatId: number,
  categoryId: string,
  callbackQuery: CallbackQuery
) {
  if (!callbackQuery.message?.message_id) {
    return;
  }

  stateManager.setState(BotState.DELETING_CATEGORY);

  try {
    const category = await categoryService.validateCategoryDeletion(userId, categoryId);
    if (!category) return;
    await bot.deleteMessage(chatId, callbackQuery.message.message_id);
    await bot.sendMessage(
      chatId,
      `⚠️ This action cannot be undone!\n\nTo delete category "${category.name}" and all its words, please type the category name to confirm:`,
      cancelKeyboard
    );
    categoryStates.set(chatId, {
      step: 'confirming_delete',
      categoryToDelete: category
    });
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error: any) {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: error.message,
      show_alert: true
    });
  }
}
