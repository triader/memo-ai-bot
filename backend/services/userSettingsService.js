export class UserSettingsService {
  constructor(supabase) {
    this.supabase = supabase;
    this.userSettings = new Map();
  }

  async getCurrentCategory(userId) {
    let settings = {};

    try {
      const {
        data: { current_category_id },
        error: settingsError
      } = await this.supabase
        .from('user_settings')
        .select('current_category_id')
        .eq('user_id', userId)
        .single();

      if (current_category_id) {
        const { data: category } = await this.supabase
          .from('categories')
          .select('*')
          .eq('id', current_category_id)
          .single();

        if (category) {
          settings.currentCategory = { name: category.name, id: category.id };
        }
        return settings;
      }

      if (!current_category_id) {
        // Pull default category before creating a new record
        const { data: defaultCategory } = await this.supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .limit(1);

        if (defaultCategory?.length > 0) {
          // Create a new user settings record with the userId and default category
          await this.supabase
            .from('user_settings')
            .insert([{ user_id: userId, current_category_id: defaultCategory[0].id }]);
        }
      }

      if (!current_category_id) {
        const { data: categories } = await this.supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId);

        if (categories?.length) {
          settings = { currentCategory: { name: category[0].name, id: categories[0].id } };
          this.userSettings.set(userId, settings);
        }
      }

      return settings;
    } catch (error) {
      console.error('Error in getCurrentCategory:', error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  async setCurrentCategory(userId, categoryId) {
    try {
      await this.supabase
        .from('user_settings')
        .update({ current_category_id: categoryId })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error in setCurrentCategory:', error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }
}
