"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.wordsService = exports.practiceService = exports.categoryService = exports.userSettingsService = exports.bot = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const inputHandler_1 = require("./inputHandler");
const services_1 = require("./services");
const features_1 = require("./features");
// Load environment variables
dotenv_1.default.config();
if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is missing');
}
// Initialize bot and express
exports.bot = new node_telegram_bot_api_1.default(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const app = (0, express_1.default)();
// Enable CORS with specific options
app.use((0, cors_1.default)({
    origin: true,
    methods: ['POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express_1.default.json());
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
(0, inputHandler_1.inputHandler)(exports.bot);
// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
});
console.log('Bot is running...');
exports.userSettingsService = new services_1.UserSettingsService(config_1.supabase);
exports.categoryService = new services_1.CategoryService(config_1.supabase);
exports.practiceService = new features_1.PracticeService(config_1.supabase);
exports.wordsService = new services_1.WordsService(config_1.supabase);
exports.userService = new services_1.UserService(config_1.supabase);
//# sourceMappingURL=server.js.map