import { SupabaseClient } from '@supabase/supabase-js';
import { Category } from './category';

export class UserSettingsService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async createInitialSettings(userId: number) {
    try {
      const { error } = await this.supabase.from('user_settings').insert([
        {
          user_id: userId,
          current_category_id: null
        }
      ]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating initial user settings:', error);
      throw error;
    }
  }

  async getOrCreateCategoryContext(userId: number, categoryId: string) {
    // First try to get existing context
    const { data: existingContext, error: fetchError } = await this.supabase
      .from('user_category_languages')
      .select('*')
      .match({ user_id: userId, category_id: categoryId })
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found"
      throw fetchError;
    }

    if (existingContext) {
      return existingContext;
    }

    // If no context exists, create a new one
    const { data: newContext, error: insertError } = await this.supabase
      .from('user_category_languages')
      .insert([
        {
          user_id: userId,
          category_id: categoryId,
          original_context: null,
          learning_context: null
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;
    return newContext;
  }

  async getCurrentCategory(userId: number): Promise<Category | undefined> {
    try {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('current_category_id')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data?.current_category_id) {
        const { data: category } = await this.supabase
          .from('categories')
          .select('*')
          .eq('id', data.current_category_id)
          .single();

        if (category) {
          return { name: category.name, id: category.id, user_id: userId };
        }
      }

      return undefined;
    } catch (error) {
      console.error('Error getting current category:', error);
      throw error;
    }
  }

  async setCurrentCategory(userId: number, categoryId: string | null) {
    try {
      const { error } = await this.supabase
        .from('user_settings')
        .update({ current_category_id: categoryId })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error setting current category:', error);
      throw error;
    }
  }

  async updateCategoryContext(userId: number, categoryId: string, contextData: any) {
    const { data, error } = await this.supabase
      .from('user_category_languages')
      .update(contextData)
      .match({ user_id: userId, category_id: categoryId });

    if (error) throw error;
    return data;
  }

  async getCategoryContext(userId: number, categoryId: string) {
    return await this.getOrCreateCategoryContext(userId, categoryId);
  }
}
