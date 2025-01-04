export class UserSettingsService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async createInitialSettings(userId) {
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

  async getCurrentCategory(userId) {
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
          return { name: category.name, id: category.id };
        }
      }

      return undefined;
    } catch (error) {
      console.error('Error getting current category:', error);
      throw error;
    }
  }

  async setCurrentCategory(userId, categoryId) {
    try {
      await this.supabase
        .from('user_settings')
        .update({ current_category_id: categoryId })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating current category:', error);
      throw error;
    }
  }
}
