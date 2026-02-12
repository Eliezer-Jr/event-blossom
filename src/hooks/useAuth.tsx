import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

type AppRole = 'admin' | 'event_manager' | 'finance_officer' | 'checkin_staff';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  signInWithOtp: (phone: string) => Promise<{ error: any }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    setRoles((data || []).map((r: any) => r.role as AppRole));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        setTimeout(() => fetchRoles(session.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) fetchRoles(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ session, user, loading, roles, hasRole, signInWithOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
