import React from 'react';
import CourseCard from './CourseCard';

interface Course {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  level: string;
  wordCount: number;
  progress?: number;
}

interface CourseGridProps {
  courses: Course[];
  title?: string;
}

const CourseGrid: React.FC<CourseGridProps> = ({ courses, title }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      {title && <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            id={course.id}
            title={course.title}
            description={course.description}
            imageUrl={course.imageUrl}
            level={course.level}
            wordCount={course.wordCount}
            progress={course.progress}
          />
        ))}
      </div>
    </div>
  );
};

export default CourseGrid;
