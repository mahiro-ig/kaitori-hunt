// components/auth/AuthStatus.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function AuthStatus() {
  const { data: session, status } = useSession();

  // 認証状態を確認中
  if (status === 'loading') {
    return <span>認証状態を確認中…</span>;
  }

  // session が null の場合は未ログインとみなす
  if (!session) {
    return (
      <button
        onClick={() => signIn('credentials')}
        className="text-sm px-2 py-1 bg-blue-600 text-white rounded"
      >
        ログイン
      </button>
    );
  }

  // ログイン済み
  return (
    <div className="flex items-center space-x-2">
      <span>
        こんにちは、{session.user.name ?? session.user.email} さん
      </span>
      <button
        onClick={() => signOut()}
        className="text-sm px-2 py-1 bg-gray-200 rounded"
      >
        ログアウト
      </button>
    </div>
  );
}
