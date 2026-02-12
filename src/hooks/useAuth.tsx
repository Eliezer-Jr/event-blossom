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
  sendOtp: (phone: string) => Promise<{ error: any }>;
  verifyOtp: (phone: string, code: string) => Promise<{ error: any }>;
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

  const sendOtp = async (phone: string) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-otp?action=send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ phone }),
        }
      );
      const data = await res.json();
      if (!res.ok) return { error: { message: data.error } };
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const verifyOtp = async (phone: string, code: string) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-otp?action=verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ phone, code }),
        }
      );
      const data = await res.json();
      if (!res.ok) return { error: { message: data.error } };

      // Set the session from the response
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ session, user, loading, roles, hasRole, sendOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
