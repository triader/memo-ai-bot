"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHandler = void 0;
const utils_1 = require("../utils");
const features_1 = require("../features");
const server_1 = require("../server");
const config_1 = require("../config");
const startHandler = (bot) => async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId || !chatId)
        return;
    try {
        // Check if user has settings
        const { data: existingSettings } = await config_1.supabase
            .from('user_settings')
            .select('user_id')
            .eq('user_id', userId)
            .single();
        if (!existingSettings) {
            // Create initial user settings
            await server_1.userSettingsService.createInitialSettings(userId);
        }
        const hasCategories = await server_1.categoryService.hasCategories(userId);
        const keyboard = await (0, utils_1.mainKeyboard)(userId);
        if (!hasCategories) {
            // New user without categories - go straight to category creation
            await bot.sendMessage(chatId, 'Welcome to the Language Learning Bot! 🎉\n\n' +
                "To get started, let's create your first category.\n" +
                'Categories help you organize your words (e.g., "Verbs", "Food", "Travel").\n\n' +
                'Please enter a name for your first category:', keyboard);
            features_1.categoryStates.set(chatId, { step: 'creating_category' });
        }
        else {
            // Existing user with categories
            await bot.sendMessage(chatId, 'Welcome back to the Language Learning Bot! 📚', keyboard);
        }
    }
    catch (error) {
        console.error('Error in start handler:', error);
        await bot.sendMessage(chatId, '❌ An error occurred. Please try /start again.');
    }
};
exports.startHandler = startHandler;
//# sourceMappingURL=startHandler.js.map