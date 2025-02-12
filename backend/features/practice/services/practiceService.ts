import { SupabaseClient } from '@supabase/supabase-js';
import { PRACTICE_MODES } from '../constants';
export class PracticeService {
  constructor(private supabase: SupabaseClient) {}

  async getNextWord(
    userId: number,
    currentCategory: any,
    currentLevel: number,
    previousWords = [],
    practiceMode: PRACTICE_MODES
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the start of the day

    let query = this.supabase
      .from('words')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', currentCategory.id)
      .eq('level', currentLevel)
      .not('id', 'in', `(${previousWords.join(',')})`)
      .order('created_at', { ascending: true, nullsFirst: true })
      .limit(1);

    if (practiceMode === PRACTICE_MODES.LEARN) {
      query = query.eq('mastery_level', 0);
    } else {
      query = query
        .gt('mastery_level', 0)
        .or(`last_practiced.is.null,last_practiced.lt.${today.toISOString()}`);
    }

    const { data: word, error } = await query;

    if (error) {
      console.error('Error fetching word:', error);
      return null;
    }

    if (!word?.length) return null;

    const { data: otherWords, error: otherError } = await this.supabase
      .from('words')
      .select('word, translation')
      .eq('category_id', currentCategory.id)
      .neq('id', word[0].id)
      .limit(10);

    if (otherError) {
      console.error('Error fetching other words:', otherError);
      throw otherError;
    }

    return {
      word: word[0],
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
