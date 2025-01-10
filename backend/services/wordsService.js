class WordsService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async hasWordsInCategory(userId, category) {
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

export const createWordsService = (supabase) => {
  return new WordsService(supabase);
};
