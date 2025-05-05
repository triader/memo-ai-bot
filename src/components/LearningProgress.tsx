import React from 'react';

interface LearningProgressProps {
  totalWords: number;
  learnedWords: number;
  streak: number;
  lastStudied: string;
  accuracy: number;
}

const LearningProgress: React.FC<LearningProgressProps> = ({
  totalWords,
  learnedWords,
  streak,
  lastStudied,
  accuracy
}) => {
  const progress = Math.round((learnedWords / totalWords) * 100);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Learning Progress</h2>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Words Learned</div>
            <div className="text-2xl font-bold text-gray-800">
              {learnedWords}/{totalWords}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Current Streak</div>
            <div className="text-2xl font-bold text-gray-800">{streak} days</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Accuracy</div>
            <div className="text-2xl font-bold text-gray-800">{accuracy}%</div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Last Studied</div>
            <div className="text-lg font-medium text-gray-800">{lastStudied}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningProgress;
