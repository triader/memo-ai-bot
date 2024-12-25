import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Check, X } from 'lucide-react';
import CategorySelect from './CategorySelect';

interface Word {
  id: string;
  word: string;
  translation: string;
  category_id: string;
}

export default function PracticeMode({ userId }: { userId: string }) {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    if (selectedCategory) {
      fetchNextWord();
    }
  }, [userId, selectedCategory]);

  async function fetchNextWord() {
    try {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', userId)
        .eq('category_id', selectedCategory)
        .lt('mastery_level', 90)
        .order('last_practiced', { ascending: true })
        .limit(1)
        .single();

      if (error) throw error;
      setCurrentWord(data);
    } catch (error) {
      console.error('Error fetching word:', error);
      setCurrentWord(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentWord) return;

    const isCorrect = answer.toLowerCase().trim() === currentWord.translation.toLowerCase().trim();
    setResult(isCorrect ? 'correct' : 'incorrect');

    try {
      await supabase.rpc('update_word_progress', {
        p_word_id: currentWord.id,
        p_is_correct: isCorrect
      });

      setTimeout(() => {
        setAnswer('');
        setResult(null);
        fetchNextWord();
      }, 1500);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  if (!selectedCategory) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Select Category to Practice</h2>
        <CategorySelect userId={userId} value={selectedCategory} onChange={setSelectedCategory} />
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center">Loading...</div>;
  }

  if (!currentWord) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">No Words to Practice</h2>
        <p className="text-gray-600">
          All your words in this category are well learned or you need to add new ones.
        </p>
        <button
          onClick={() => setSelectedCategory('')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Choose Another Category
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{currentWord.word}</h2>
        <p className="text-sm text-gray-500 mt-2">Type the translation</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Your answer..."
          disabled={!!result}
        />
        <button
          type="submit"
          disabled={!!result}
          className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Check Answer
        </button>
      </form>

      {result && (
        <div
          className={`mt-4 p-4 rounded-lg ${result === 'correct' ? 'bg-green-100' : 'bg-red-100'}`}
        >
          <div className="flex items-center">
            {result === 'correct' ? (
              <Check className="w-5 h-5 text-green-500 mr-2" />
            ) : (
              <X className="w-5 h-5 text-red-500 mr-2" />
            )}
            <span className={result === 'correct' ? 'text-green-700' : 'text-red-700'}>
              {result === 'correct'
                ? 'Correct!'
                : `Incorrect. The answer is: ${currentWord.translation}`}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => setSelectedCategory('')}
        className="mt-4 w-full py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      >
        Change Category
      </button>
    </div>
  );
}
