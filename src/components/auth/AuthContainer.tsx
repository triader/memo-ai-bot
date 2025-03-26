import React, { useState } from 'react';
import { Languages } from 'lucide-react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import TelegramLogin from '../TelegramLogin';

interface AuthContainerProps {
  onAuthSuccess: () => void;
}

const AuthContainer: React.FC<AuthContainerProps> = ({ onAuthSuccess }) => {
  const [view, setView] = useState<'login' | 'signup'>('login');

  const handleTelegramAuth = async (telegramUser: any) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(telegramUser)
      });

      const result = await response.json();

      if (response.ok) {
        onAuthSuccess();
      } else {
        console.error('Authentication failed:', result.error);
      }
    } catch (err) {
      console.error('Error during authentication:', err);
    }
  };

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

        {/* Telegram Login Button */}
        <div className="flex justify-center mt-4">
          <TelegramLogin
            botName="FlashCardsAIBot"
            onAuth={handleTelegramAuth}
            authUrl={`${import.meta.env.VITE_API_URL}/auth/telegram`}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthContainer;
