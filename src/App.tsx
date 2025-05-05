import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { setUser, clearUser } from './store/slices/authSlice';
import { supabase } from './config/supabase';
import Dashboard from './pages/Dashboard';
import WordList from './components/WordList';
import AddWordForm from './components/AddWordForm';
import PracticeMode from './components/PracticeMode';
import Stats from './components/Stats';
import AuthContainer from './components/auth/AuthContainer';

// For testing purposes
const TEST_USER_ID = '29559383';
const USE_TEST_USER = true; // Set to false to use real authentication

function App() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    if (USE_TEST_USER) {
      // Use test user ID
      dispatch(setUser(TEST_USER_ID));
    } else {
      // Check for existing session
      const checkSession = async () => {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (session?.user) {
          dispatch(setUser(session.user.id));
        }
      };
      checkSession();

      // Listen for auth changes
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          dispatch(setUser(session.user.id));
        } else {
          dispatch(clearUser());
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [dispatch]);

  const handleAuthSuccess = async () => {
    if (USE_TEST_USER) {
      dispatch(setUser(TEST_USER_ID));
    } else {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) {
        dispatch(setUser(user.id));
      }
    }
  };

  return (
    <Router>
      <div className="min-h-screen w-screen bg-gradient-to-br from-blue-500 to-purple-600">
        {isAuthenticated ? (
          <div className="min-h-screen w-full flex flex-col">
            <nav className="bg-white shadow-sm w-full">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                  <div className="flex">
                    <div className="flex-shrink-0 flex items-center">
                      <Link to="/" className="text-xl font-bold text-gray-800">
                        Memo AI
                      </Link>
                    </div>
                    <div className="ml-6 flex space-x-4 sm:space-x-8">
                      <Link
                        to="/"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/words"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Words
                      </Link>
                      <Link
                        to="/add-word"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Add Word
                      </Link>
                      <Link
                        to="/practice"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Practice
                      </Link>
                      <Link
                        to="/stats"
                        className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                      >
                        Stats
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </nav>

            <main className="flex-1 w-full">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/words" element={<WordList />} />
                <Route path="/add-word" element={<AddWordForm />} />
                <Route path="/practice" element={<PracticeMode />} />
                <Route path="/stats" element={<Stats />} />
              </Routes>
            </main>
          </div>
        ) : (
          <div className="min-h-screen w-full flex items-center justify-center">
            <Routes>
              <Route path="/login" element={<AuthContainer onAuthSuccess={handleAuthSuccess} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
