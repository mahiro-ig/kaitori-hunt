// /app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs';

import NextAuth from 'next-auth/next';
import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  // 管理者ログインページ（運用方針に合わせてそのまま）
  pages: { signIn: '/admin/login' },

  // JWTセッション（そのまま）
  session: { strategy: 'jwt', maxAge: 60 * 60 * 2 },

  // ← 重要：Cookieの独自上書きを削除（http検証でSecure強制を避ける）
  // NextAuthのデフォルトに任せることで、NEXTAUTH_URLがhttpなら非Secureに自動切替

  // プロキシ/Hostヘッダ整合性向上
  trustHost: true,

  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const rawEmail = (credentials?.email ?? '').trim();
          const inputPw = credentials?.password ?? '';
          const emailLc = rawEmail.toLowerCase();

          if (!rawEmail || !inputPw) throw new Error('メールまたはパスワードが違います');
          if (!supabaseAdmin) throw new Error('メールまたはパスワードが違います');

          const { data: userRow, error: userErr } = await supabaseAdmin
            .from('users')
            .select('id, email, name, password')
            .eq('email', emailLc)
            .maybeSingle();

          if (userErr || !userRow?.password) throw new Error('メールまたはパスワードが違います');

          const ok = await bcrypt.compare(inputPw, userRow.password);
          if (!ok) throw new Error('メールまたはパスワードが違います');

          return {
            id: userRow.id,
            email: (userRow.email ?? emailLc).toLowerCase(),
            name: userRow.name ?? '',
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // 初回ログイン時の基本情報付与
      if (user) {
        token.sub = (user as any).id as string;
        (token as any).id = (user as any).id;
        (token as any).email = ((user as any).email || '').toLowerCase();
      }

      // 管理者判定（admin_users or ADMIN_EMAILS）
      try {
        const uid = (token.sub as string) ?? (token as any).id;
        const emailLc = ((token as any).email || '').toLowerCase();
        let role: 'admin' | 'user' = 'user';
        if (uid && supabaseAdmin) {
          const { data: row } = await supabaseAdmin
            .from('admin_users')
            .select('user_id')
            .eq('user_id', uid)
            .maybeSingle();
          if (row?.user_id) role = 'admin';
          else if (emailLc && ADMIN_EMAILS.includes(emailLc)) role = 'admin';
        }
        (token as any).role = role;
      } catch {
        (token as any).role = 'user';
      }

      return token as JWT;
    },

    async session({ session, token }) {
      (session.user as any) = {
        ...session.user,
        id: (token.sub as string) ?? (token as any).id,
        role: (token as any).role ?? 'user',
        email: ((token as any).email || session.user?.email || '').toLowerCase(),
      } as Session['user'];
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith('/')) return new URL(url, baseUrl).toString();
      return baseUrl;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
