import { useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { supabase } from '../config/supabase';
import { WordsService } from '../../backend/services/wordsService';
import CategorySelect from './CategorySelect';

const wordsService = new WordsService(supabase);

export default function AddWordForm() {
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const userId = useAppSelector((state) => state.auth.userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const numericUserId = parseInt(userId, 10);
      await wordsService.addWord(numericUserId, selectedCategory, word, translation);
      setWord('');
      setTranslation('');
      setSuccess(true);
    } catch (error) {
      setError('Failed to add word. Please try again.');
      console.error('Error adding word:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return <div className="text-center text-gray-500">Please log in to add words.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <div className="mt-1">
            <CategorySelect
              userId={userId}
              value={selectedCategory}
              onChange={setSelectedCategory}
            />
          </div>
        </div>

        <div>
          <label htmlFor="word" className="block text-sm font-medium text-gray-700">
            Word
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              required
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter word"
            />
          </div>
        </div>

        <div>
          <label htmlFor="translation" className="block text-sm font-medium text-gray-700">
            Translation
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="translation"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              required
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter translation"
            />
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">Word added successfully!</div>}

        <div>
          <button
            type="submit"
            disabled={loading || !selectedCategory}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Word'}
          </button>
        </div>
      </form>
    </div>
  );
}
