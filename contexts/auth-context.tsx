"use client"

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

// Supabase縺ｮSession縺九ｉUser蝙九ｒ蜿門ｾ・export type User = Session['user'];

// 繧ｳ繝ｳ繝・く繧ｹ繝医′謠蝉ｾ帙☆繧句梛
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

  // 蛻晄悄繧ｻ繝・す繝ｧ繝ｳ蜿門ｾ・+ 迥ｶ諷句､牙喧雉ｼ隱ｭ
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
      // Cookie縺ｮ逶ｴ謗･隱ｭ蜿悶・JSON.parse 遲峨・荳蛻・＠縺ｪ縺・      setSession(newSession ?? null);
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
          title: '繝ｭ繧ｰ繧､繝ｳ螟ｱ謨・,
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
      toast({ title: '繝ｭ繧ｰ繧､繝ｳ謌仙粥', description: '繧医≧縺薙◎・・ });
      return true;
    } catch (e: any) {
      toast({
        title: '繝ｭ繧ｰ繧､繝ｳ螟ｱ謨・,
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
        title: '繝ｭ繧ｰ繧｢繧ｦ繝亥､ｱ謨・,
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: '繝ｭ繧ｰ繧｢繧ｦ繝亥ｮ御ｺ・, description: '縺ｾ縺溘♀蠕・■縺励※縺・∪縺呻ｼ・ });
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
