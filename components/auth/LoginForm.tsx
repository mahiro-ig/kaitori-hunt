// components/auth/LoginForm.tsx
'use client';

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      setErrorMsg("ログインに失敗しました。メールアドレスとパスワードを確認してください。");
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block">メールアドレス</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="border px-2 py-1 w-full"
        />
      </div>
      <div>
        <label className="block">パスワード</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="border px-2 py-1 w-full"
        />
      </div>
      {errorMsg && <p className="text-red-600">{errorMsg}</p>}
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white">
        ログイン
      </button>
    </form>
  );
}
