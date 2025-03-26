import { useEffect } from 'react';

interface TelegramLoginProps {
  botName: string;
  buttonSize?: 'large' | 'medium' | 'small';
  radius?: number;
  onAuth?: (user: any) => void;
  authUrl: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void;
  }
}

const TelegramLogin: React.FC<TelegramLoginProps> = ({
  botName,
  buttonSize = 'large',
  radius = 10,
  onAuth,
  authUrl
}) => {
  useEffect(() => {
    // Create container for the button if it doesn't exist
    const container = document.getElementById('telegram-login-button');
    if (!container) return;

    // Create and inject the script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?7';
    script.async = true;
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', radius.toString());
    script.setAttribute('data-auth-url', authUrl);
    script.setAttribute('data-request-access', 'write');

    // Add callback function to window object
    window.onTelegramAuth = (user: any) => {
      if (onAuth) {
        onAuth(user);
      }
    };

    container.appendChild(script);

    // Cleanup
    return () => {
      container.removeChild(script);
      delete window.onTelegramAuth;
    };
  }, [botName, buttonSize, radius, onAuth, authUrl]);

  return <div id="telegram-login-button" />;
};

export default TelegramLogin;
