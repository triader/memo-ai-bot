import React from 'react';
import { Link } from 'react-router-dom';

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  level: string;
  wordCount: number;
  progress?: number;
}

const CourseCard: React.FC<CourseCardProps> = ({
  id,
  title,
  description,
  imageUrl,
  level,
  wordCount,
  progress = 0
}) => {
  return (
    <Link to={`/course/${id}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="relative h-48">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-sm">
            {level}
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description}</p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{wordCount} words</span>
            {progress > 0 && (
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
