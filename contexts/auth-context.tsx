// contexts/auth-context.tsx（例）
// SupabaseのセッションをReact Contextで配布するクライアント専用プロバイダ
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { toast } from '@/components/ui/use-toast';

// SupabaseのSessionからUser型を拝借
export type User = Session['user'];

// Contextの公開インターフェース
export interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClientComponentClient<Database>();

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初期セッション取得 + 認証状態の購読
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // ここで落としてもUX悪いのでログだけにするならconsole.warnでもOK
          toast({
            title: 'セッション取得に失敗しました',
            description: error.message,
            variant: 'destructive',
          });
        }
        if (!mounted) return;
        setSession(data.session ?? null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Cookieの不整合でクラッシュしないようにnull合体
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({
          title: 'ログインに失敗しました',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
      toast({ title: 'ログインしました', description: 'ようこそ！' });
      return true;
    } catch (e: any) {
      toast({
        title: 'ログインに失敗しました',
        description: e?.message ?? String(e),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'ログアウトに失敗しました',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'ログアウトしました', description: 'またのご利用をお待ちしています。' });
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoggedIn: !!session,
      isLoading,
      login,
      logout,
    }),
    [session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
