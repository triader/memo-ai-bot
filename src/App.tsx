import { useState, useEffect } from 'react';
import { supabase } from './config/supabase';
import { Languages, BookOpen, Plus, RotateCcw, Award, LogOut, Shield } from 'lucide-react';
import WordList from './components/WordList';
import AddWordForm from './components/AddWordForm';
import PracticeMode from './components/PracticeMode';
import Stats from './components/Stats';
import AdminPanel from './components/AdminPanel';
import AuthContainer from './components/auth/AuthContainer';

function App() {
  const [view, setView] = useState<'words' | 'add' | 'practice' | 'stats' | 'admin'>('words');
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id ?? null);
      checkAdminStatus(session?.user?.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
      await checkAdminStatus(session?.user?.id);
    } catch (err) {
      console.error('Error checking auth status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function checkAdminStatus(userId: string | undefined) {
    if (!userId) return;

    const { data, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (data?.is_admin) {
      setIsAdmin(true);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return <AuthContainer onAuthSuccess={() => checkUser()} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Languages className="w-8 h-8 text-blue-500" />
              <span className="ml-2 text-xl font-semibold">LangLearn</span>
            </div>
            <div className="flex space-x-4 items-center">
              <button
                onClick={() => setView('words')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  view === 'words'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BookOpen className="w-5 h-5 mr-1" />
                Words
              </button>
              <button
                onClick={() => setView('add')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  view === 'add' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Plus className="w-5 h-5 mr-1" />
                Add
              </button>
              <button
                onClick={() => setView('practice')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  view === 'practice'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <RotateCcw className="w-5 h-5 mr-1" />
                Practice
              </button>
              <button
                onClick={() => setView('stats')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  view === 'stats'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Award className="w-5 h-5 mr-1" />
                Stats
              </button>
              {isAdmin && (
                <button
                  onClick={() => setView('admin')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    view === 'admin'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Shield className="w-5 h-5 mr-1" />
                  Admin
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-500 hover:text-red-700"
              >
                <LogOut className="w-5 h-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4">
        {view === 'words' && <WordList userId={userId} />}
        {view === 'add' && <AddWordForm userId={userId} />}
        {view === 'practice' && <PracticeMode userId={userId} />}
        {view === 'stats' && <Stats userId={userId} />}
        {view === 'admin' && isAdmin && <AdminPanel />}
      </main>
    </div>
  );
}

export default App;
