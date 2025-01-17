import { SupabaseClient } from '@supabase/supabase-js';
import { Category } from './category';

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
}
