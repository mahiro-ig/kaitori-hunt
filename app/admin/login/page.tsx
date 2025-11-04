// app/admin/login/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

export default function AdminLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { status, data } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const next = useMemo(() => {
    const n = sp.get('next');
    if (!n || n.startsWith('/admin/login')) return '/admin';
    return n;
  }, [sp]);

  // クエリのエラー表示
  useEffect(() => {
    const ed = sp.get('error_description');
    const e = sp.get('error');
    if (ed) setErrMsg(decodeURIComponent(ed));
    else if (e === 'not_admin') setErrMsg('管理者権限が必要です。');
    else if (e === 'unauthorized') setErrMsg('ログインが必要です。');
    else setErrMsg(null);
  }, [sp]);

  // 認証済みかつ admin の場合のみ自動遷移
  useEffect(() => {
    if (status !== 'authenticated') return;
    const role = (data?.user as any)?.role;
    if (role === 'admin' && sp.get('error') !== 'not_admin') {
      router.replace(next);
    }
  }, [status, data, router, next, sp]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;

    setErrMsg(null);
    setSending(true);
    try {
      const emailLc = email.trim().toLowerCase();

      const res = await signIn('credentials', {
        email: emailLc,
        password,
        redirect: false,
      });

      if (!res || res.error || res.ok === false) {
        setErrMsg('メールアドレスまたはパスワードが正しくありません。');
        return;
      }

      // ここでは role 判定せず、middleware 側で最終確認
      router.replace(next);
    } catch (err: any) {
      setErrMsg(err?.message ?? 'ログインに失敗しました。');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-3">管理ログイン</h1>

      {errMsg && <div className="mb-4 text-sm text-red-600">{errMsg}</div>}

      <section className="space-y-6">
        <form onSubmit={handleSubmit} className="border rounded-lg p-4">
          <h2 className="font-medium mb-2">パスワードでログイン</h2>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              autoComplete="username"
              required
            />
            <input
              id="admin-password"
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              autoComplete="current-password"
              required
            />
            <button
              type="submit"
              disabled={sending || !email || !password}
              className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-50 w-full"
            >
              {sending ? 'ログイン中…' : 'ログイン'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
