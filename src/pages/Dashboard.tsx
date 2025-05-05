import React, { useEffect, useState } from 'react';
import CourseGrid from '../components/CourseGrid';
import LearningProgress from '../components/LearningProgress';
import { supabase } from '../config/supabase';
import { CategoryService } from '../../backend/services/categoryService';
import { Category as BackendCategory } from '../../backend/services/category';
import { useAppSelector } from '../store/hooks';

interface Category extends BackendCategory {
  wordCount: number;
  progress: number;
}

const categoryService = new CategoryService(supabase);

const Dashboard: React.FC = () => {
  const [userCategories, setUserCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWords: 0,
    learnedWords: 0,
    streak: 0,
    lastStudied: '',
    accuracy: 0
  });

  const userId = useAppSelector((state) => state.auth.userId);

  useEffect(() => {
    if (userId) {
      fetchCategories();
      fetchStats();
    }
  }, [userId]);

  const fetchCategories = async () => {
    try {
      if (!userId) return;

      // Convert string userId to number for backend service
      const numericUserId = parseInt(userId, 10);

      // Fetch user's own categories
      const userCategoriesData = await categoryService.getUserCategories(numericUserId);

      // Get word counts for each category
      const userCategoriesWithStats = await Promise.all(
        userCategoriesData.map(async (category) => {
          // Only fetch the count of words and mastered words
          const { data: wordsData, error } = await supabase
            .from('words')
            .select('mastery_level')
            .eq('user_id', numericUserId)
            .eq('category_id', category.id);

          if (error) {
            console.error('Error fetching words for category:', error);
            return {
              ...category,
              wordCount: 0,
              progress: 0
            };
          }

          const wordCount = wordsData.length;
          const learnedWords = wordsData.filter((w) => w.mastery_level >= 90).length;
          const progress = wordCount > 0 ? Math.round((learnedWords / wordCount) * 100) : 0;

          return {
            ...category,
            wordCount,
            progress
          };
        })
      );

      setUserCategories(userCategoriesWithStats);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (!userId) return;

      const numericUserId = parseInt(userId, 10);

      // Only fetch the essential stats
      const { data: wordsData, error } = await supabase
        .from('words')
        .select('mastery_level, last_practiced')
        .eq('user_id', numericUserId);

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      const totalWords = wordsData.length;
      const learnedWords = wordsData.filter((w) => w.mastery_level >= 90).length;
      const accuracy = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

      // Get the most recent practice date
      const lastPracticed = wordsData
        .filter((w) => w.last_practiced)
        .sort(
          (a, b) => new Date(b.last_practiced).getTime() - new Date(a.last_practiced).getTime()
        )[0]?.last_practiced;

      setStats({
        totalWords,
        learnedWords,
        streak: 0, // TODO: Implement streak calculation
        lastStudied: lastPracticed ? new Date(lastPracticed).toLocaleDateString() : 'Never',
        accuracy
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return <div className="text-center text-gray-500">Please log in to view your dashboard.</div>;
  }

  const userCourseData = userCategories.map((category) => ({
    id: category.id,
    title: category.name,
    description: `Learn ${category.wordCount} words in ${category.name}`,
    imageUrl: `https://source.unsplash.com/random/500x300/?${category.name}`,
    level: 'Private',
    wordCount: category.wordCount,
    progress: category.progress
  }));

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome back!</h1>
          <p className="text-gray-600">Continue your learning journey</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CourseGrid courses={userCourseData} title="Your Categories" />
          </div>
          <div>
            <LearningProgress {...stats} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
