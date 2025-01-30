import { SupabaseClient } from '@supabase/supabase-js';
import { Category } from './category';

export interface Word {
  id: string;
  word: string;
  translation: string;
  level: number | null;
  category_id: string;
  user_id: string;
  created_at: string;
}

export class WordsService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async hasWordsInCategory(userId: string, category: Category): Promise<boolean> {
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

  async getWordsCountInLevel(userId: number, categoryId: string, level: number): Promise<number> {
    const { data, error } = await this.supabase
      .from('words')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('level', level);

    if (error) {
      console.error('Error counting words in level:', error);
      return 0;
    }

    return data.length;
  }

  async getNextAvailableLevel(
    userId: number,
    categoryId: string,
    wordsPerLevel: number | null
  ): Promise<number> {
    if (!wordsPerLevel) return 1;

    const { data, error } = await this.supabase
      .from('words')
      .select('level')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('level', { ascending: false })
      .limit(1);

    if (error || !data.length) {
      return 1;
    }

    const currentLevelCount = await this.getWordsCountInLevel(userId, categoryId, data[0].level);
    return currentLevelCount >= wordsPerLevel ? data[0].level + 1 : data[0].level;
  }

  async getTotalWordsCount(userId: number, categoryId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('words')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('category_id', categoryId);

    if (error) {
      console.error('Error fetching total words count:', error);
      return 0;
    }

    return data.length;
  }

  async getWordsByLevel(userId: number, categoryId: string, level: number): Promise<Word[]> {
    const { data, error } = await this.supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('level', level)
      .order('created_at');

    if (error) {
      console.error('Error fetching words by level:', error);
      return [];
    }

    return data;
  }

  async getCurrentAndMaxLevel(
    userId: number,
    categoryId: string
  ): Promise<{ current: number; max: number }> {
    const { data, error } = await this.supabase
      .from('words')
      .select('level')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('level', { ascending: false })
      .limit(1);

    if (error || !data.length) {
      return { current: 1, max: 1 };
    }

    return { current: 1, max: data[0].level };
  }

  async addWord(
    userId: number,
    categoryId: string,
    word: string,
    translation: string
  ): Promise<{ id: string } | null> {
    try {
      // Get category settings
      const { data: categoryData } = await this.supabase
        .from('categories')
        .select('words_per_level')
        .eq('id', categoryId)
        .single();

      let level = null;
      const wordsPerLevel = categoryData?.words_per_level;

      if (wordsPerLevel) {
        // Get current max level
        const { data: maxLevelData } = await this.supabase
          .from('words')
          .select('level')
          .eq('user_id', userId)
          .eq('category_id', categoryId)
          .order('level', { ascending: false })
          .limit(1);

        const currentMaxLevel = maxLevelData?.[0]?.level || 0;

        // Count words in the current max level
        const wordsInCurrentLevel = await this.getWordsCountInLevel(
          userId,
          categoryId,
          currentMaxLevel || 1
        );

        // If current level is full or there are no words yet, create new level
        if (wordsInCurrentLevel >= wordsPerLevel || currentMaxLevel === 0) {
          level = (currentMaxLevel || 0) + 1;
        } else {
          // Add to current level if it's not full
          level = currentMaxLevel || 1;
        }
      }

      const { data, error } = await this.supabase
        .from('words')
        .insert({
          user_id: userId,
          category_id: categoryId,
          word,
          translation,
          level
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error adding word:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in addWord:', error);
      return null;
    }
  }

  async deleteWord(
    userId: number,
    wordId: string,
    categoryId: string
  ): Promise<{ word: string; translation: string } | null> {
    try {
      // First get the word details
      const { data: wordData, error: fetchError } = await this.supabase
        .from('words')
        .select('word, translation')
        .eq('id', wordId)
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .single();

      if (fetchError || !wordData) {
        console.error('Error fetching word details:', fetchError);
        return null;
      }

      // Then delete the word
      const { error: deleteError } = await this.supabase
        .from('words')
        .delete()
        .eq('id', wordId)
        .eq('user_id', userId)
        .eq('category_id', categoryId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return null;
      }

      return {
        word: wordData.word,
        translation: wordData.translation
      };
    } catch (error) {
      console.error('Error in deleteWord:', error);
      return null;
    }
  }

  async getWordsForDeletion(userId: number, categoryId: string): Promise<Word[]> {
    const { data, error } = await this.supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('level', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching words for deletion:', error);
      return [];
    }

    return data;
  }

  async updateWordProgress(userId: number, wordId: string, isCorrect: boolean): Promise<void> {
    const { data: word, error: fetchError } = await this.supabase
      .from('words')
      .select('mastery_level')
      .eq('id', wordId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching word progress:', fetchError);
      return;
    }

    const currentLevel = word?.mastery_level || 0;
    const newLevel = isCorrect ? Math.min(100, currentLevel + 10) : Math.max(0, currentLevel - 5);

    const { error: updateError } = await this.supabase
      .from('words')
      .update({
        mastery_level: newLevel,
        last_practiced: new Date().toISOString()
      })
      .eq('id', wordId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating word progress:', updateError);
    }
  }

  async getWordsWithProgress(userId: number, categoryId: string): Promise<Word[]> {
    const { data, error } = await this.supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching words with progress:', error);
      return [];
    }

    return data;
  }

  async reorganizeWordsIntoLevels(
    userId: number,
    categoryId: string,
    wordsPerLevel: number
  ): Promise<boolean> {
    try {
      // First update category setting
      const { error: categoryError } = await this.supabase
        .from('categories')
        .update({ words_per_level: wordsPerLevel })
        .eq('id', categoryId)
        .eq('user_id', userId);

      if (categoryError) throw categoryError;

      // Get all words for this category
      const { data: words, error: wordsError } = await this.supabase
        .from('words')
        .select('id')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .order('created_at', { ascending: true });

      if (wordsError) throw wordsError;

      // Calculate new level assignments
      const updates = words.map((word, index) => ({
        id: word.id,
        level: Math.floor(index / wordsPerLevel) + 1
      }));

      // Update all words with their new levels
      for (const update of updates) {
        const { error } = await this.supabase
          .from('words')
          .update({ level: update.level })
          .eq('id', update.id)
          .eq('user_id', userId);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error reorganizing words into levels:', error);
      return false;
    }
  }
}
