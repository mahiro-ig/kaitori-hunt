// app/api/auth/exchange/route.ts
import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  // ★ next は login 以外にする（login だと戻って再度 flow を壊しがち）
  const next = url.searchParams.get("next") ?? "/admin/settings";

  const res = NextResponse.redirect(new URL(next, url.origin));
  const cookieStore = await nextCookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: async (name: string) => cookieStore.get(name)?.value,
      set: async (name: string, value: string, options?: Parameters<typeof res.cookies.set>[2]) => {
        res.cookies.set(name, value, options);
      },
      remove: async (name: string, options?: Parameters<typeof res.cookies.set>[1]) => {
        res.cookies.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });

  // 既にログイン済みなら code 無視して next へ
  const { data: pre } = await supabase.auth.getSession();
  if (pre.session) return res;

  if (!code) {
    // code なし → login へ
    return NextResponse.redirect(new URL("/auth/login", url.origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // 交換に失敗しても、セッションが存在すれば成功扱いで next へ
    const { data: post } = await supabase.auth.getSession();
    if (post.session) return res;

    // 本当に失敗している場合のみ login に戻す
    const q = new URLSearchParams({
      error_description: error.message || "auth exchange failed",
    });
    return NextResponse.redirect(new URL(`/admin/login?${q.toString()}`, url.origin));
  }

  // 成功
  return res;
}
