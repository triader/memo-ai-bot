import { mainKeyboard, cancelKeyboard, BotState, stateManager } from '../../utils';
import { categoryService, userSettingsService } from '../../server';
import { onCategorySelectClick } from './categoryCallback';
import { BUTTONS } from '../../constants';
import { createCategoryInlineKeyboard, handleError, showCategoryList } from './helpers';
import { MESSAGES } from './constants';
import TelegramBot, { Message } from 'node-telegram-bot-api';

export const categoryStates = new Map();

export const categoryHandler = (bot: TelegramBot) => async (msg: Message) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from?.id;

  if (!chatId || !userId || !text) {
    return;
  }

  try {
    await bot.sendChatAction(chatId, 'typing');

    if (text?.startsWith(BUTTONS.CATEGORY)) {
      return await handleCategoryList(bot, chatId, userId);
    }

    const state = categoryStates.get(chatId);
    if (!state) return;

    const handlers: { [key: string]: () => Promise<void> } = {
      selecting_category: () => onCategorySelectClick(bot, chatId, userId, text, state),
      confirming_delete: () => onCategoryDelete(bot, chatId, userId, text, state),
      saving_edited_category: () => onCategoryEdit(bot, chatId, userId, text, state)
    };

    const handler = handlers[state.step];
    if (handler) {
      await handler();
    }
    categoryStates.delete(chatId);
    stateManager.setState(BotState.IDLE);
  } catch (error) {
    await handleError(bot, chatId, userId);
  }
};

async function handleCategoryList(bot: TelegramBot, chatId: number, userId: number) {
  const categories = await categoryService.getUserCategories(userId);

  if (!categories?.length) {
    await bot.sendMessage(chatId, MESSAGES.NO_CATEGORIES, cancelKeyboard);
    categoryStates.set(chatId, { step: 'creating_category' });
    return;
  }

  const currentCategory = await userSettingsService.getCurrentCategory(userId);
  const inlineKeyboard = createCategoryInlineKeyboard(categories, currentCategory);

  await bot.sendMessage(chatId, MESSAGES.CATEGORY_LIST, {
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

async function onCategoryDelete(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  text: string,
  state: any
) {
  const { categoryToDelete } = state;

  if (text !== categoryToDelete.name) {
    await bot.sendMessage(
      chatId,
      `❌ Category name doesn't match. Please type "${categoryToDelete.name}" exactly to confirm deletion, or press Cancel.`,
      cancelKeyboard
    );
    return;
  }

  try {
    const currentCategory = await userSettingsService.getCurrentCategory(userId);

    if (currentCategory?.id === categoryToDelete.id) {
      const categories = await categoryService.getUserCategories(userId);
      const newCurrentCategory = categories?.find((cat) => cat.id !== categoryToDelete.id);

      if (newCurrentCategory) {
        await userSettingsService.setCurrentCategory(userId, newCurrentCategory.id);
      } else {
        await userSettingsService.setCurrentCategory(userId, null);
      }
    }

    await categoryService.deleteCategory(userId, categoryToDelete.id);

    await bot.sendMessage(
      chatId,
      `✅ Category "${categoryToDelete.name}" and all its words have been deleted.`,
      await mainKeyboard(userId)
    );

    const remainingCategories = await categoryService.getUserCategories(userId);
    if (remainingCategories && remainingCategories.length > 0) {
      await showCategoryList(bot, chatId, userId);
    } else {
      await bot.sendMessage(
        chatId,
        'You have no categories left. Please create a new category:',
        cancelKeyboard
      );
      categoryStates.set(chatId, { step: 'creating_category' });
      stateManager.setState(BotState.CREATING_CATEGORY);
      return;
    }

    categoryStates.delete(chatId);
    stateManager.setState(BotState.IDLE);
  } catch (error) {
    console.error('Error deleting category:', error);
    await handleError(bot, chatId, userId, 'Failed to delete category. Please try again.');
  }
}

export const onCategoryCreate = (bot: TelegramBot) => async (msg: Message) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from?.id;
  const categoryName = text?.trim();

  if (!chatId || !userId) {
    return;
  }

  if (!categoryName) {
    await bot.sendMessage(chatId, 'Please enter a valid category name.', cancelKeyboard);
    return;
  }

  try {
    const existingCategories = await categoryService.getUserCategories(userId);
    if (
      existingCategories &&
      existingCategories.some((cat) => cat.name.toLowerCase() === categoryName.toLowerCase())
    ) {
      await bot.sendMessage(
        chatId,
        '❌ A category with this name already exists. Please choose a different name.',
        cancelKeyboard
      );
      return;
    }

    const category = await categoryService.createCategory(userId, categoryName);
    const currentCategory = await userSettingsService.getCurrentCategory(userId);
    if (!currentCategory) {
      await userSettingsService.setCurrentCategory(userId, category.id);
    }

    await bot.sendMessage(
      chatId,
      `✅ Category "${category.name}" created successfully!`,
      await mainKeyboard(userId)
    );

    await showCategoryList(bot, chatId, userId);

    categoryStates.delete(chatId);
    stateManager.setState(BotState.IDLE);
  } catch (error) {
    console.error('Error creating category:', error);
    await handleError(bot, chatId, userId, 'Failed to create category. Please try again.');
  }
};

async function onCategoryEdit(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  text: string,
  state: any
) {
  const newName = text.trim();
  if (!newName) {
    await bot.sendMessage(chatId, '❌ Please enter a valid name.', cancelKeyboard);
    return;
  }

  try {
    await categoryService.updateCategory(userId, state.categoryToEdit.id, newName);

    await bot.sendMessage(
      chatId,
      `✅ Category name updated to "${newName}"`,
      await mainKeyboard(userId)
    );

    await showCategoryList(bot, chatId, userId);

    categoryStates.delete(chatId);
    stateManager.setState(BotState.IDLE);
  } catch (error) {
    await handleError(bot, chatId, userId, 'Failed to update category name. Please try again.');
  }
}
