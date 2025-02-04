import { SupabaseClient } from '@supabase/supabase-js';
import { Category } from './category';
import { BUTTONS } from '../constants/buttons';

export class CategoryService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getUserCategories(userId: number): Promise<Category[]> {
    const { data: categories } = await this.supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);
    return categories || [];
  }

  async hasCategories(userId: number) {
    const { data: categories } = await this.supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);
    return categories?.length;
  }

  async createCategory(userId: number, name: string) {
    const { data: newCategory, error } = await this.supabase
      .from('categories')
      .insert([
        {
          user_id: userId,
          name: name.trim()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return newCategory;
  }

  async deleteCategory(userId: number, categoryId: string) {
    try {
      // Delete user_category_languages entries first
      await this.supabase.from('user_category_languages').delete().eq('category_id', categoryId);

      // Delete all words in the category
      await this.supabase
        .from('words')
        .delete()
        .eq('category_id', categoryId)
        .eq('user_id', userId);

      // Delete the category
      const { error } = await this.supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  async updateCategory(userId: number, categoryId: string, newName: string) {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .update({ name: newName.trim() })
        .eq('id', categoryId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async findCategoryById(userId: number, categoryId: string) {
    const categories = await this.getUserCategories(userId);
    return categories?.find((cat) => cat.id === categoryId);
  }

  async getLevelProgress(category: Category) {
    if (category.current_level) {
      const wordsToMaster = await this.calculateWordsToMaster(category.id, category.current_level);
      return BUTTONS.LEVEL_PROGRESS(category.current_level, wordsToMaster);
    } else {
      return BUTTONS.SELECT_LEVEL;
    }
  }

  private async calculateWordsToMaster(categoryId: string, level: number): Promise<number> {
    // Fetch words associated with the category and level
    const { data: words, error } = await this.supabase
      .from('words')
      .select('id, mastery_level')
      .eq('category_id', categoryId)
      .eq('level', level);

    if (error) {
      console.error('Error fetching words:', error);
      return 0;
    }

    if (!words || words.length === 0) {
      return 0;
    }

    const wordsToMaster = words.filter((word) => word.mastery_level !== 100).length;

    return wordsToMaster;
  }

  async validateCategoryDeletion(userId: number, categoryId: string) {
    const categories = await this.getUserCategories(userId);

    if (!categories) {
      throw new Error('No categories found');
    }

    if (categories.length === 1) {
      throw new Error("Can't delete the last category");
    }
    return categories.find((cat) => cat.id === categoryId);
  }

  async getLevelsForCategory(categoryId: string): Promise<number[]> {
    const { data: words, error } = await this.supabase
      .from('words')
      .select('level')
      .eq('category_id', categoryId);

    if (error) {
      console.error('Error fetching levels:', error);
      return [];
    }

    // Filter out null levels, extract unique levels, and sort them
    const levels = [...new Set(words.map((word) => word.level).filter((level) => level !== null))];
    levels.sort((a, b) => a - b); // Sort levels numerically
    return levels;
  }

  async updateCategoryLevel(categoryId: string, level: number) {
    const { error } = await this.supabase
      .from('categories')
      .update({ current_level: level })
      .eq('id', categoryId);

    if (error) {
      console.error('Error updating category level:', error);
      throw error;
    }
  }
}
