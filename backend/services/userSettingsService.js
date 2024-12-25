export class UserSettingsService {
  constructor(supabase) {
    this.supabase = supabase;
    this.userSettings = new Map();
  }

  async getCurrentCategory(userId) {
    let settings = this.userSettings.get(userId);

    if (!settings?.currentCategory) {
      const { data: categories } = await this.supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);

      if (categories?.length) {
        settings = { currentCategory: categories[0] };
        this.userSettings.set(userId, settings);
      }
    }

    return settings?.currentCategory;
  }

  setCurrentCategory(userId, category) {
    let settings = this.userSettings.get(userId) || {};
    settings.currentCategory = category;
    this.userSettings.set(userId, settings);
  }
}
