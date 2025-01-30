"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inputHandler = inputHandler;
const handlers_1 = require("./handlers");
const server_1 = require("./server");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const features_1 = require("./features");
function inputHandler(bot) {
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from?.id;
        const text = msg.text;
        if (!chatId || !userId || !text)
            return;
        try {
            // Skip processing if this is a callback query message
            // @ts-ignore
            if (msg.callback_query) {
                return;
            }
            // Special handling for /start command
            if (text === '/start') {
                await (0, handlers_1.startHandler)(bot)(msg);
                return;
            }
            // Check if user has any categories before proceeding
            const hasCategories = await server_1.categoryService.hasCategories(userId);
            if (!hasCategories) {
                // When no categories exist, set state and treat all input as category name
                if (!features_1.categoryStates.get(chatId)) {
                    features_1.categoryStates.set(chatId, { step: 'creating_category' });
                }
                await (0, features_1.categoryHandler)(bot)(msg);
                return;
            }
            // Rest of the handler logic for users with categories...
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            // Handle cancel command globally
            if (text === constants_1.BUTTONS.CANCEL) {
                utils_1.stateManager.clearState();
                await bot.sendMessage(chatId, 'Operation cancelled.', keyboard);
                return;
            }
            const state = utils_1.stateManager.getState();
            switch (state) {
                case utils_1.BotState.ADDING_WORD:
                    await (0, handlers_1.addWordHandler)(bot)(msg);
                    return;
                case utils_1.BotState.PRACTICING:
                    await (0, features_1.practiceHandler)(bot)(msg);
                    return;
                case utils_1.BotState.IMPORTING:
                    await (0, handlers_1.bulkImportHandler)(bot)(msg);
                    return;
                case utils_1.BotState.CREATING_CATEGORY:
                    await (0, features_1.onCategoryCreate)(bot)(msg);
                    return;
                // are these needed?
                case utils_1.BotState.EDITING_CATEGORY:
                case utils_1.BotState.DELETING_CATEGORY: //TODO: refactor to use different handlers
                    await (0, features_1.categoryHandler)(bot)(msg);
                    return;
                // case BotState.EDITING_WORD:
                //   await wordEditHandler(bot)(msg);
                //   return;
                case utils_1.BotState.SETTING_ORIGINAL_CONTEXT:
                    await (0, features_1.setUpOriginalContext)(bot, msg);
                    return;
                case utils_1.BotState.SETTING_LEARNING_CONTEXT:
                    await (0, features_1.setUpLearningContext)(bot, msg);
                    return;
                case utils_1.BotState.SETTING_WORDS_PER_LEVEL:
                    await (0, handlers_1.setWordsPerLevelHandler)(bot)(msg);
                    return;
            }
            // Handle commands when in IDLE state
            if (text?.startsWith('/')) {
                const parsedCommand = (0, utils_1.commandParser)(text);
                if (!parsedCommand)
                    return;
                switch (parsedCommand.command) {
                    case '/start':
                        await (0, handlers_1.startHandler)(bot)(msg);
                        break;
                    case '/reset':
                        utils_1.stateManager.setState(utils_1.BotState.IDLE);
                        await bot.sendMessage(chatId, 'The bot has been reset', keyboard);
                        break;
                    default:
                        await bot.sendMessage(chatId, '❓ Unknown command. Please use the menu buttons below.', keyboard);
                }
                return;
            }
            // Handle menu buttons
            switch (text) {
                case constants_1.BUTTONS.ADD_WORD:
                    utils_1.stateManager.setState(utils_1.BotState.ADDING_WORD);
                    await (0, handlers_1.addWordHandler)(bot)(msg);
                    break;
                case constants_1.BUTTONS.PRACTICE:
                    await (0, features_1.practiceHandler)(bot)(msg);
                    break;
                case constants_1.BUTTONS.IMPORT:
                    utils_1.stateManager.setState(utils_1.BotState.IMPORTING);
                    await (0, handlers_1.bulkImportHandler)(bot)(msg);
                    break;
                case constants_1.BUTTONS.MY_WORDS:
                    await (0, handlers_1.myWordsHandler)(bot)(msg);
                    break;
                // case BUTTONS.EDIT_WORD:
                //   stateManager.setState(BotState.EDITING_WORD);
                //   await wordEditHandler(bot)(msg);
                //   break;
                case constants_1.BUTTONS.DELETE_WORD:
                    await (0, handlers_1.deleteWordHandler)(bot)(msg);
                    break;
                case constants_1.BUTTONS.MORE_OPTIONS:
                    await bot.sendMessage(chatId, 'Additional options:', utils_1.mainKeyboardSecondary);
                    break;
                case constants_1.BUTTONS.BACK_TO_MAIN:
                    await bot.sendMessage(chatId, 'Main menu:', keyboard);
                    break;
                case constants_1.BUTTONS.CHANGE_CONTEXT:
                    await (0, features_1.initiateContextChange)(bot, chatId, userId);
                    break;
                case constants_1.BUTTONS.SET_WORDS_PER_LEVEL:
                    await (0, handlers_1.setWordsPerLevelHandler)(bot)(msg);
                    break;
                default:
                    if (text?.startsWith(constants_1.BUTTONS.CATEGORY)) {
                        await (0, features_1.categoryHandler)(bot)(msg); //TODO: only call a function that handles category button click            return;
                        return;
                    }
                    if (utils_1.stateManager.getState() === utils_1.BotState.IDLE) {
                        await (0, features_1.translateAIHandler)(bot)(msg);
                    }
            }
        }
        catch (error) {
            utils_1.stateManager.clearState();
            console.error('Error in input handler:', error);
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', keyboard);
        }
    });
    bot.on('callback_query', async (query) => {
        if (!query.data)
            return;
        try {
            if (Object.values(features_1.PRACTICE_TYPES).includes(query.data)) {
                await (0, features_1.handlePracticeCallback)(bot, query);
                return;
            }
            const isCategoryAction = Object.values(features_1.CATEGORY_ACTIONS).some((prefix) => query.data?.startsWith(prefix)) ||
                query.data === features_1.CATEGORY_ACTIONS.NEW;
            if (isCategoryAction) {
                await (0, features_1.categoryCallback)(bot)(query);
                return;
            }
            if (query.data?.startsWith('translate_') ||
                query.data?.startsWith('add_trans_') ||
                query.data?.startsWith('more_examples_')) {
                await (0, features_1.handleTranslationCallback)(bot, query);
                return;
            }
            if (query.data?.startsWith('delete_')) {
                if (!query.message)
                    return;
                await (0, handlers_1.deleteWordHandler)(bot)({
                    // @ts-ignore
                    callback_query: query,
                    chat: query.message.chat,
                    from: query.from
                });
                return;
            }
            // Handle my words level navigation
            if (Object.values(utils_1.LEVEL_NAVIGATION).includes(query.data)) {
                if (!query.message)
                    return;
                await (0, handlers_1.myWordsHandler)(bot)({
                    // @ts-ignore
                    callback_query: query,
                    chat: query.message.chat,
                    from: query.from
                });
                return;
            }
            console.warn('Unhandled callback query:', query.data);
        }
        catch (error) {
            console.error('Error handling callback query:', error);
            const chatId = query.message?.chat.id;
            const userId = query.from?.id;
            const keyboard = await (0, utils_1.mainKeyboard)(userId);
            if (!chatId)
                return;
            await bot.sendMessage(chatId, '❌ An error occurred. Please try again.', keyboard);
        }
    });
}
//# sourceMappingURL=inputHandler.js.map