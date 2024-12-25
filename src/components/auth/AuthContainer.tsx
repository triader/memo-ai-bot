import React, { useState } from 'react';
import { Languages } from 'lucide-react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

interface AuthContainerProps {
  onAuthSuccess: () => void;
}

export default function AuthContainer({ onAuthSuccess }: AuthContainerProps) {
  const [view, setView] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-8">
          <Languages className="w-12 h-12 text-blue-500 mr-4" />
          <h1 className="text-3xl font-bold text-gray-800">LangLearn</h1>
        </div>

        {view === 'login' ? (
          <LoginForm onSuccess={onAuthSuccess} onToggleView={() => setView('signup')} />
        ) : (
          <SignupForm onSuccess={onAuthSuccess} onToggleView={() => setView('login')} />
        )}
      </div>
    </div>
  );
}
