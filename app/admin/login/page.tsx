"use client"

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

  // 繧ｯ繧ｨ繝ｪ縺ｮ繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ
  useEffect(() => {
    const ed = sp.get('error_description');
    const e = sp.get('error');
    if (ed) setErrMsg(decodeURIComponent(ed));
    else if (e === 'not_admin') setErrMsg('邂｡逅・・ｨｩ髯舌′蠢・ｦ√〒縺吶・);
    else if (e === 'unauthorized') setErrMsg('繝ｭ繧ｰ繧､繝ｳ縺悟ｿ・ｦ√〒縺吶・);
    else setErrMsg(null);
  }, [sp]);

  // 隱崎ｨｼ貂医∩縺九▽ admin 縺ｮ蝣ｴ蜷医・縺ｿ閾ｪ蜍暮・遘ｻ
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
        setErrMsg('繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｾ縺溘・繝代せ繝ｯ繝ｼ繝峨′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ縲・);
        return;
      }

      // 縺薙％縺ｧ縺ｯ role 蛻､螳壹○縺壹［iddleware 蛛ｴ縺ｧ譛邨ら｢ｺ隱・
      router.replace(next);
    } catch (err: any) {
      setErrMsg(err?.message ?? '繝ｭ繧ｰ繧､繝ｳ縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-3">邂｡逅・Ο繧ｰ繧､繝ｳ</h1>

      {errMsg && <div className="mb-4 text-sm text-red-600">{errMsg}</div>}

      <section className="space-y-6">
        <form onSubmit={handleSubmit} className="border rounded-lg p-4">
          <h2 className="font-medium mb-2">繝代せ繝ｯ繝ｼ繝峨〒繝ｭ繧ｰ繧､繝ｳ</h2>
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
              placeholder="繝代せ繝ｯ繝ｼ繝・
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
              {sending ? '繝ｭ繧ｰ繧､繝ｳ荳ｭ窶ｦ' : '繝ｭ繧ｰ繧､繝ｳ'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
