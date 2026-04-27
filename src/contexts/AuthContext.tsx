import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isAgent: boolean;
  isOwner: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  isAdmin: false,
  isManager: false,
  isAgent: false,
  isOwner: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setRole(data?.role || null);
    } catch (err) {
      console.error('Error fetching user role:', err);
      setRole(null);
    }
  };

  useEffect(() => {
    // Check for mock user bypass
    const mockUserStr = localStorage.getItem('gharpayy_mock_user');
    if (mockUserStr) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        setUser(mockUser);
        setRole('admin'); // Hardcode role to admin for bypass
        setLoading(false);
        return; // Skip normal Supabase auth if bypassed
      } catch (e) {
        localStorage.removeItem('gharpayy_mock_user');
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (localStorage.getItem('gharpayy_mock_user')) return; // Prioritize mock user
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem('gharpayy_mock_user');
    await supabase.auth.signOut();
    setRole(null);
    setUser(null);
    setSession(null);
  };

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isAgent = role === 'agent';
  const isOwner = role === 'owner';

  return (
    <AuthContext.Provider value={{ 
      user, session, role, loading, 
      isAdmin, isManager, isAgent, isOwner,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
