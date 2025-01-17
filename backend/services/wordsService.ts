import { SupabaseClient } from '@supabase/supabase-js';
import { Category } from './category';

export class WordsService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async hasWordsInCategory(userId: number, category: Category): Promise<boolean> {
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
