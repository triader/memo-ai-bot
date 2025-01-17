"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordsService = void 0;
class WordsService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async hasWordsInCategory(userId, category) {
        const { data, error } = await this.supabase
            .from('words')
            .select('id')
            .eq('user_id', userId)
            .eq('category_id', category.id)
            .limit(1);
        if (error) {
            console.error('Error checking words in category:', error);
            return false;
        }
        return data.length > 0;
    }
}
exports.WordsService = WordsService;
//# sourceMappingURL=wordsService.js.map