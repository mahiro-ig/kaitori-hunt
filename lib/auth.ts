// /lib/auth.ts
import "server-only";

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * NextAuth（usersテーブルのハッシュ照合版）
 * - Supabase Auth は使わない
 * - Service Role で users を参照し、password を bcrypt.compare で検証
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email ?? "").trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        // users からパスワードハッシュ取得
        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("id, email, password, role, name")
          .eq("email", email)
          .maybeSingle();

        if (error || !user?.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          role: (user as any).role ?? "user",
          name: (user as any).name ?? null,
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as any).id;
        (token as any).role = (user as any).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        (session.user as any).id = token.sub;
        (session.user as any).role = (token as any).role ?? "user";
      }
      return session;
    },
  },
};

/**
 * requireAdminAPI: 管理APIガード
 * - 内部APIキー or NextAuth セッション
 * - admin_users テーブル or role=admin を許可
 */
export async function requireAdminAPI(request: Request) {
  if (process.env.DEBUG_ADMIN === "1") {
    console.log("[admin dbg] auth header =", request.headers.get("authorization"));
    console.log("[admin dbg] x-admin-key =", request.headers.get("x-admin-key"));
    console.log("[admin dbg] x-admin-api-key =", request.headers.get("x-admin-api-key"));
  }

  // 1) 内部APIキー認証（Authorization: Bearer / x-admin-key / x-admin-api-key）
  const auth = request.headers.get("authorization") || "";
  const headerKey1 = request.headers.get("x-admin-key") || "";
  const headerKey2 = request.headers.get("x-admin-api-key") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const incomingKey = bearer || headerKey1 || headerKey2;

  const envKey =
    process.env.INTERNAL_ADMIN_API_KEY ||
    process.env.ADMIN_API_KEY ||
    process.env.ADMIN_INTERNAL_API_KEY;

  if (incomingKey && envKey && incomingKey === envKey) {
    if (process.env.DEBUG_ADMIN === "1") console.log("[admin dbg] passed by API key");
    return { type: "key" as const };
  }

  // 2) NextAuth セッション認証
  let uid: string | null = null;
  let role: string | null = null;
  let email: string | null = null;

  try {
    const { getServerSession } = await import("next-auth/next");
    const session = await getServerSession(authOptions);
    uid = (session?.user as any)?.id ?? null;
    role = (session?.user as any)?.role ?? null;
    email = (session?.user as any)?.email ?? null;

    if (process.env.DEBUG_ADMIN === "1") {
      console.log("[admin dbg] session.user.id   =", uid);
      console.log("[admin dbg] session.user.role =", role);
      console.log("[admin dbg] session.user.email=", email);
    }
  } catch (e) {
    if (process.env.DEBUG_ADMIN === "1") {
      console.warn("[admin dbg] getServerSession failed:", (e as Error)?.message);
    }
  }

  if (!uid) {
    const e = new Error("Unauthorized");
    (e as any).statusCode = 401;
    throw e;
  }

  // 3) 管理者判定（role==='admin' or admin_users に登録）
  try {
    if (role === "admin") {
      if (process.env.DEBUG_ADMIN === "1") console.log("[admin dbg] passed by role=admin");
      return { type: "session" as const, userId: uid };
    }

    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("id,user_id")
      .or(`id.eq.${uid},user_id.eq.${uid}`)
      .maybeSingle();

    if (process.env.DEBUG_ADMIN === "1") {
      console.log("[admin dbg] admin_users hit =", !!data, "error =", error?.message);
    }

    if (error) {
      const e = new Error("DB error");
      (e as any).statusCode = 500;
      throw e;
    }
    if (!data) {
      const e = new Error("Forbidden");
      (e as any).statusCode = 403;
      throw e;
    }

    return { type: "session" as const, userId: uid };
  } catch (e) {
    throw e;
  }
}
