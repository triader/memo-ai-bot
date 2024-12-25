import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { Trash2, Edit } from 'lucide-react';
import CategorySelect from './CategorySelect';

interface Word {
  id: string;
  word: string;
  translation: string;
  mastery_level: number;
  correct_answers: number;
  incorrect_answers: number;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

export default function WordList({ userId }: { userId: string }) {
  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWords();
  }, [userId, selectedCategory]);

  async function fetchWords() {
    try {
      let query = supabase
        .from('words')
        .select(
          `
          *,
          categories (
            name
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWords(data || []);
    } catch (error) {
      console.error('Error fetching words:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteWord(id: string) {
    try {
      const { error } = await supabase.from('words').delete().eq('id', id).eq('user_id', userId);

      if (error) throw error;
      setWords(words.filter((word) => word.id !== id));
    } catch (error) {
      console.error('Error deleting word:', error);
    }
  }

  if (loading) {
    return <div className="flex justify-center">Loading...</div>;
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
