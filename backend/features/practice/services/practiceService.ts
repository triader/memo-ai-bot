import { SupabaseClient } from '@supabase/supabase-js';

export class PracticeService {
  constructor(private supabase: SupabaseClient) {}

  async getNextWord(userId: number, currentCategory: any, previousWords = []) {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data: words, error } = await this.supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', currentCategory.id)
      .lt('mastery_level', 90)
      .or(`last_practiced.is.null,last_practiced.lt.${oneDayAgo.toISOString()}`)
      .not('id', 'in', `(${previousWords.join(',')})`)
      .order('last_practiced', { ascending: true, nullsFirst: true })
      .limit(1);

    if (error) {
      console.error('Error fetching word:', error);
      throw error;
    }
    if (!words?.length) return null;

    const { data: otherWords, error: otherError } = await this.supabase
      .from('words')
      .select('word, translation')
      .eq('category_id', currentCategory.id)
      .neq('id', words[0].id)
      .limit(10);

    if (otherError) {
      console.error('Error fetching other words:', otherError);
      throw otherError;
    }

    return {
      word: words[0],
      otherWords: otherWords?.map((w) => w.word) || [],
      otherTranslations: otherWords?.map((w) => w.translation) || []
    };
  }

  async getPracticedWordsDetails(wordIds: string[]) {
    if (!wordIds || !wordIds.length) {
      console.error('No word IDs provided to getPracticedWordsDetails');
      return [];
    }

    const { data, error } = await this.supabase.from('words').select('*').in('id', wordIds);

    if (error) {
      console.error('Error fetching practiced words details:', error);
      throw error;
    }

    if (!data || !data.length) {
      console.warn('No word details found for IDs:', wordIds);
      return [];
    }

    return data;
  }
}
