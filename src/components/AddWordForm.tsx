import React, { useState } from 'react';
import { supabase } from '../config/supabase';
import { Plus } from 'lucide-react';
import CategorySelect from './CategorySelect';

export default function AddWordForm({ userId }: { userId: string }) {
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) {
      alert('Please select or create a category');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('words').insert([
        {
          user_id: userId,
          word: word.trim(),
          translation: translation.trim(),
          category_id: categoryId,
        },
      ]);

      if (error) throw error;

      setWord('');
      setTranslation('');
    } catch (error) {
      console.error('Error adding word:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-6">Add New Word</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CategorySelect userId={userId} value={categoryId} onChange={setCategoryId} />

        <div>
          <label htmlFor="word" className="block text-sm font-medium text-gray-700">
            Word
          </label>
          <input
            type="text"
            id="word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="translation" className="block text-sm font-medium text-gray-700">
            Translation
          </label>
          <input
            type="text"
            id="translation"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !categoryId}
          className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? (
            'Adding...'
          ) : (
            <>
              <Plus className="w-5 h-5 mr-2" />
              Add Word
            </>
          )}
        </button>
      </form>
    </div>
  );
}
