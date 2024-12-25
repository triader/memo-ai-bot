import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { Award, TrendingUp, Check, X } from 'lucide-react';

interface Stats {
  total_words: number;
  mastered_words: number;
  total_correct: number;
  total_incorrect: number;
}

export default function Stats({ userId }: { userId: string }) {
  const [stats, setStats] = useState<Stats>({
    total_words: 0,
    mastered_words: 0,
    total_correct: 0,
    total_incorrect: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userId]);

  async function fetchStats() {
    try {
      const { data: words, error } = await supabase.from('words').select('*').eq('user_id', userId);

      if (error) throw error;

      const stats = words.reduce(
        (acc, word) => ({
          total_words: acc.total_words + 1,
          mastered_words: acc.mastered_words + (word.mastery_level >= 90 ? 1 : 0),
          total_correct: acc.total_correct + (word.correct_answers || 0),
          total_incorrect: acc.total_incorrect + (word.incorrect_answers || 0)
        }),
        { total_words: 0, mastered_words: 0, total_correct: 0, total_incorrect: 0 }
      );

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Words</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_words}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Award className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Mastered Words</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.mastered_words}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Check className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Correct Answers</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_correct}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <X className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Incorrect Answers</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total_incorrect}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
