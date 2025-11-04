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

// SupabaseのSessionからUser型を取得
export type User = Session['user'];

// コンテキストが提供する型
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

  // 初期セッション取得 + 状態変化購読
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Cookieの直接読取・JSON.parse 等は一切しない
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
          title: 'ログイン失敗',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
      toast({ title: 'ログイン成功', description: 'ようこそ！' });
      return true;
    } catch (e: any) {
      toast({
        title: 'ログイン失敗',
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
        title: 'ログアウト失敗',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'ログアウト完了', description: 'またお待ちしています！' });
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
