import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

interface Stats {
  total_words: number;
  mastered_words: number;
  learning_words: number;
  total_correct: number;
  total_incorrect: number;
}

export default function Stats() {
  const [stats, setStats] = useState<Stats>({
    total_words: 0,
    mastered_words: 0,
    learning_words: 0,
    total_correct: 0,
    total_incorrect: 0
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId]);

  async function checkUser() {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const { data: words, error } = await supabase.from('words').select('*').eq('user_id', userId);

      if (error) throw error;

      const stats = {
        total_words: words.length,
        mastered_words: words.filter((word) => word.mastery_level >= 80).length,
        learning_words: words.filter((word) => word.mastery_level < 80).length,
        total_correct: words.reduce((sum, word) => sum + word.correct_answers, 0),
        total_incorrect: words.reduce((sum, word) => sum + word.incorrect_answers, 0)
      };

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

  if (!userId) {
    return <div className="text-center text-gray-500">Please log in to view your stats.</div>;
  }

  const accuracy =
    stats.total_correct + stats.total_incorrect > 0
      ? Math.round((stats.total_correct / (stats.total_correct + stats.total_incorrect)) * 100)
      : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-6">Your Progress</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-blue-700">Words</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-blue-600">
              Total: <span className="font-semibold">{stats.total_words}</span>
            </p>
            <p className="text-sm text-blue-600">
              Mastered: <span className="font-semibold">{stats.mastered_words}</span>
            </p>
            <p className="text-sm text-blue-600">
              Learning: <span className="font-semibold">{stats.learning_words}</span>
            </p>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-green-700">Performance</h3>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-green-600">
              Correct Answers: <span className="font-semibold">{stats.total_correct}</span>
            </p>
            <p className="text-sm text-green-600">
              Incorrect Answers: <span className="font-semibold">{stats.total_incorrect}</span>
            </p>
            <p className="text-sm text-green-600">
              Accuracy: <span className="font-semibold">{accuracy}%</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
