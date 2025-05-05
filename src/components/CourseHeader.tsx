import React from 'react';

interface CourseHeaderProps {
  title: string;
  description: string;
  imageUrl: string;
  level: string;
  wordCount: number;
  progress: number;
  lastStudied?: string;
}

const CourseHeader: React.FC<CourseHeaderProps> = ({
  title,
  description,
  imageUrl,
  level,
  wordCount,
  progress,
  lastStudied
}) => {
  return (
    <div className="bg-white shadow-md">
      <div className="relative h-64">
        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center mb-2">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">{level}</span>
            <span className="ml-4 text-sm">{wordCount} words</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-lg opacity-90">{description}</p>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-48 bg-gray-200 rounded-full h-3 mr-4">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-gray-600">{progress}% Complete</span>
          </div>
          {lastStudied && (
            <span className="text-gray-500 text-sm">Last studied: {lastStudied}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseHeader;
