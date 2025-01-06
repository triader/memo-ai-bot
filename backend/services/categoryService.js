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

  async hasCategories(userId) {
    const { data: categories } = await this.supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);
    return categories?.length > 0;
  }

  async createCategory(userId, name) {
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

  async deleteCategory(userId, categoryId) {
    try {
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

  async updateCategory(userId, categoryId, newName) {
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

  async findCategoryById(userId, categoryId) {
    const categories = await this.getUserCategories(userId);
    return categories.find((cat) => cat.id === categoryId);
  }

  async validateCategoryDeletion(userId, categoryId) {
    const categories = await this.getUserCategories(userId);
    if (categories.length === 1) {
      throw new Error("Can't delete the last category");
    }
    return categories.find((cat) => cat.id === categoryId);
  }
}
