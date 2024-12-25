export class CategoryService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getUserCategories(userId) {
    const { data: categories } = await this.supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);
    return categories;
  }

  async createCategory(userId, name) {
    const { data: newCategory, error } = await this.supabase
      .from('categories')
      .insert([
        {
          user_id: userId,
          name: name.trim(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return newCategory;
  }
}
