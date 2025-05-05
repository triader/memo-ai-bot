import { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { supabase } from '../config/supabase';
import { WordsService } from '../../backend/services/wordsService';
import CategorySelect from './CategorySelect';

const wordsService = new WordsService(supabase);

interface Word {
  id: string;
  word: string;
  translation: string;
  mastery_level: number;
}

export default function PracticeMode() {
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = useAppSelector((state) => state.auth.userId);

  useEffect(() => {
    if (userId && selectedCategory) {
      fetchWords();
    }
  }, [userId, selectedCategory]);

  const fetchWords = async () => {
    try {
      if (!userId) return;

      const numericUserId = parseInt(userId, 10);
      const wordsData = await wordsService.getWordsByLevel(numericUserId, selectedCategory, null);
      setWords(wordsData);
      setCurrentWordIndex(0);
      setShowTranslation(false);
    } catch (error) {
      setError('Failed to fetch words. Please try again.');
      console.error('Error fetching words:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async (isCorrect: boolean) => {
    if (!userId || !words[currentWordIndex]) return;

    try {
      const numericUserId = parseInt(userId, 10);
      await wordsService.updateWordProgress(numericUserId, words[currentWordIndex].id, isCorrect);

      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
        setShowTranslation(false);
      } else {
        // Practice session completed
        setWords([]);
        setCurrentWordIndex(0);
        setShowTranslation(false);
      }
    } catch (error) {
      console.error('Error updating word progress:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center">Loading...</div>;
  }

  if (!userId) {
    return <div className="text-center text-gray-500">Please log in to practice.</div>;
  }

  if (!selectedCategory) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Select a Category</h2>
          <CategorySelect userId={userId} value={selectedCategory} onChange={setSelectedCategory} />
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold mb-4">Practice Session Complete!</h2>
          <p className="text-gray-600 mb-4">You've completed all words in this category.</p>
          <button
            onClick={() => setSelectedCategory('')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Choose Another Category
          </button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentWordIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-4">
          <CategorySelect userId={userId} value={selectedCategory} onChange={setSelectedCategory} />
        </div>

        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">{currentWord.word}</h2>
          {showTranslation ? (
            <p className="text-xl text-gray-700 mb-6">{currentWord.translation}</p>
          ) : (
            <button
              onClick={() => setShowTranslation(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Show Translation
            </button>
          )}
        </div>

        {showTranslation && (
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => handleNext(false)}
              className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
            >
              Incorrect
            </button>
            <button
              onClick={() => handleNext(true)}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Correct
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          Word {currentWordIndex + 1} of {words.length}
        </div>
      </div>
    </div>
  );
}
