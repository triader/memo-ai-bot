"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkImportHandler = void 0;
const utils_1 = require("../utils");
const services_1 = require("../services");
const constants_1 = require("../constants");
const server_1 = require("../server");
const config_1 = require("../config");
const userStates = new Map();
const createCategoryKeyboard = (categories) => {
    const keyboard = categories.map((cat) => [
        {
            text: cat.name
        }
    ]);
    keyboard.push([{ text: constants_1.BUTTONS.CANCEL }]);
    return {
        keyboard,
        resize_keyboard: true,
        one_time_keyboard: true
    };
};
const bulkImportHandler = (bot) => {
    return async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const text = msg.text;
        if (!userId || !chatId || !text)
            return;
        try {
            // Handle initial command
            if (text === '/import' || text === '📥 Import') {
                const categories = await server_1.categoryService.getUserCategories(userId);
                userStates.set(chatId, { step: 'selecting_category' });
                let message;
                if (categories?.length) {
                    message = 'Choose a category or type a new category name:';
                    const categoryKeyboard = createCategoryKeyboard(categories);
                    await bot.sendMessage(chatId, message, { reply_markup: categoryKeyboard });
                }
                else {
                    message = 'You have no categories yet. Please enter a name for your first category:';
                    await bot.sendMessage(chatId, message, utils_1.cancelKeyboard);
                }
                return;
            }
            // Get current state
            const userState = userStates.get(chatId);
            if (!userState) {
                console.log('No state found for chat:', chatId);
                return;
            }
            // Handle cancel command in any state
            if (text === constants_1.BUTTONS.CANCEL) {
                userStates.delete(chatId);
                const keyboard = await (0, utils_1.mainKeyboard)(userId);
                await bot.sendMessage(chatId, 'Operation cancelled.', keyboard);
                return;
            }
            // Handle state-specific logic
            switch (userState.step) {
                case 'selecting_category':
                    const categories = await server_1.categoryService.getUserCategories(userId);
                    const selectedCategory = categories.find((cat) => cat.name === text);
                    try {
                        const category = selectedCategory || (await server_1.categoryService.createCategory(userId, text));
                        userStates.set(chatId, {
                            step: 'waiting_for_file',
                            selectedCategory: category
                        });
                        const message = selectedCategory
                            ? `Category "${category.name}" selected.`
                            : `Category "${category.name}" created.`;
                        await bot.sendMessage(chatId, `${message} Please send your Excel file (.xlsx or .xls) with columns "word" and "translation".`, utils_1.cancelKeyboard);
                    }
                    catch (error) {
                        console.error('Error in category selection:', error);
                        const keyboard = await (0, utils_1.mainKeyboard)(userId);
                        await bot.sendMessage(chatId, '❌ Failed to process category. Please try again.', keyboard);
                        userStates.delete(chatId);
                    }
                    break;
                case 'waiting_for_file':
                    if (!msg.document) {
                        await bot.sendMessage(chatId, 'Please send an Excel file (.xlsx or .xls)', utils_1.cancelKeyboard);
                        return;
                    }
                    if (!msg.document.mime_type?.includes('spreadsheet')) {
                        await bot.sendMessage(chatId, 'Please send an Excel file (.xlsx or .xls)');
                        return;
                    }
                    try {
                        const file = await bot.getFile(msg.document.file_id);
                        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
                        const data = await services_1.ExcelProcessor.processFile(fileUrl);
                        services_1.ExcelProcessor.validateData(data);
                        const words = services_1.ExcelProcessor.prepareWords(data, userId, userState.selectedCategory.id);
                        const { error } = await config_1.supabase.from('words').insert(words);
                        if (error)
                            throw error;
                        const keyboard = await (0, utils_1.mainKeyboard)(userId);
                        await bot.sendMessage(chatId, `✅ Successfully imported ${words.length} words to category "${userState.selectedCategory.name}"!`, keyboard);
                    }
                    catch (error) {
                        console.error('Import error:', error);
                        const keyboard = await (0, utils_1.mainKeyboard)(userId);
                        await bot.sendMessage(chatId, error instanceof Error
                            ? error.message
                            : "❌ Failed to process the Excel file. Please make sure it's properly formatted.", keyboard);
                    }
                    finally {
                        userStates.delete(chatId);
                    }
                    break;
                default:
                    console.error('Invalid state:', userState.step);
                    userStates.delete(chatId);
                    const keyboard = await (0, utils_1.mainKeyboard)(userId);
                    await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.', keyboard);
            }
        }
        catch (error) {
            console.error('Error in bulk import handler:', error);
            userStates.delete(chatId);
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.', keyboard);
        }
    };
};
exports.bulkImportHandler = bulkImportHandler;
//# sourceMappingURL=bulkImportHandler.js.map