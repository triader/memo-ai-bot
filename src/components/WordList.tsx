import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import CategorySelect from './CategorySelect';
import { supabase } from '../config/supabase';
import { WordsService } from '../../backend/services/wordsService';
import { useAppSelector } from '../store/hooks';

interface Word {
  id: string;
  word: string;
  translation: string;
  level: number | null;
  category_id: string;
  user_id: string;
  created_at: string;
  mastery_level: number;
  last_practiced: string;
}

const wordsService = new WordsService(supabase);

export default function WordList() {
  const [words, setWords] = useState<Word[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const userId = useAppSelector((state) => state.auth.userId);

  useEffect(() => {
    if (userId) {
      fetchWords();
    }
  }, [userId, selectedCategory]);

  async function fetchWords() {
    try {
      if (!userId) return;

      // Convert string userId to number for backend service
      const numericUserId = parseInt(userId, 10);
      const backendWords = await wordsService.getWordsByLevel(
        numericUserId,
        selectedCategory,
        null
      );
      setWords(backendWords);
    } catch (error) {
      console.error('Error fetching words:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteWord(wordId: string) {
    try {
      if (!userId) return;

      // Convert string userId to number for backend service
      const numericUserId = parseInt(userId, 10);
      await wordsService.deleteWord(numericUserId, wordId, selectedCategory);
      fetchWords();
    } catch (error) {
      console.error('Error deleting word:', error);
    }
  }

  if (loading) {
    return <div className="flex justify-center">Loading...</div>;
  }

  if (!userId) {
    return <div className="text-center text-gray-500">Please log in to view your words.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <CategorySelect userId={userId} value={selectedCategory} onChange={setSelectedCategory} />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Word
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Translation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {words.map((word) => (
                <tr key={word.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {word.word}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {word.translation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${word.mastery_level || 0}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-gray-500">{word.mastery_level || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => deleteWord(word.id)}
                      className="text-red-500 hover:text-red-700 mr-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
