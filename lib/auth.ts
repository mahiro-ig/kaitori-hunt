// /lib/auth.ts
import { createClient } from "@supabase/supabase-js"
import CredentialsProvider from "next-auth/providers/credentials"
import { NextAuthOptions } from "next-auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

// ================================
// NextAuth 設定（Supabase Auth と連携）
// ================================

// Supabase 管理クライアント（認証用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Supabase Auth 経由でログイン認証を行う NextAuth 設定
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Supabase Auth でログインを試行
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })
        if (error || !data.user) return null

        // Supabase のユーザー情報を NextAuth セッションに変換
        return {
          id: data.user.id,
          email: data.user.email,
          role: data.user.app_metadata?.role ?? "user",
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.role = (user as any).role ?? "user"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub
        ;(session.user as any).role = (token as any).role
      }
      return session
    },
  },
}

// ================================
// requireAdminAPI (API認可チェック用)
// ================================
export async function requireAdminAPI(request: Request) {
  if (process.env.DEBUG_ADMIN === "1") {
    console.log("[admin dbg] auth header =", request.headers.get("authorization"))
    console.log("[admin dbg] x-admin-key =", request.headers.get("x-admin-key"))
    console.log("[admin dbg] x-admin-api-key =", request.headers.get("x-admin-api-key"))
  }

  // 1) 内部APIキーによる認可（Authorization: Bearer またはヘッダキー）
  const auth = request.headers.get("authorization") || ""
  const headerKey1 = request.headers.get("x-admin-key") || ""
  const headerKey2 = request.headers.get("x-admin-api-key") || ""
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null
  const incomingKey = bearer || headerKey1 || headerKey2

  const envKey =
    process.env.INTERNAL_ADMIN_API_KEY ||
    process.env.ADMIN_API_KEY ||
    process.env.ADMIN_INTERNAL_API_KEY

  if (incomingKey && envKey && incomingKey === envKey) {
    if (process.env.DEBUG_ADMIN === "1") console.log("[admin dbg] passed by API key")
    return { type: "key" as const }
  }

  // 2) NextAuth セッション認証
  let uid: string | null = null
  let role: string | null = null
  let email: string | null = null

  try {
    const { getServerSession } = await import("next-auth/next")
    const { authOptions } = await import("@/lib/auth") // ← 自分自身から import OK
    const session = await getServerSession(authOptions)
    uid = (session?.user as any)?.id ?? null
    role = (session?.user as any)?.role ?? null
    email = (session?.user as any)?.email ?? null

    if (process.env.DEBUG_ADMIN === "1") {
      console.log("[admin dbg] session.user.id   =", uid)
      console.log("[admin dbg] session.user.role =", role)
      console.log("[admin dbg] session.user.email=", email)
    }
  } catch (e) {
    if (process.env.DEBUG_ADMIN === "1") {
      console.warn("[admin dbg] getServerSession failed:", (e as Error)?.message)
    }
  }

  if (!uid) {
    const e = new Error("Unauthorized")
    ;(e as any).statusCode = 401
    throw e
  }

  // 3) 管理者判定（role==='admin' or admin_users テーブルに登録）
  try {
    if (role === "admin") {
      if (process.env.DEBUG_ADMIN === "1") console.log("[admin dbg] passed by role=admin")
      return { type: "session" as const, userId: uid }
    }

    if (!supabaseAdmin) {
      const e = new Error("Server DB not initialized")
      ;(e as any).statusCode = 500
      throw e
    }

    if (process.env.DEBUG_ADMIN === "1") {
      const head = await supabaseAdmin.from("admin_users").select("user_id,id").limit(5)
      console.log("[admin dbg] check uid =", uid)
      console.log("[admin dbg] admin_users(head) =", head.data)
    }

    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .select("id,user_id")
      .or(`id.eq.${uid},user_id.eq.${uid}`)
      .maybeSingle()

    if (process.env.DEBUG_ADMIN === "1") {
      console.log("[admin dbg] admin_users hit =", !!data, "error =", error?.message)
    }

    if (error) {
      const e = new Error("DB error")
      ;(e as any).statusCode = 500
      throw e
    }
    if (!data) {
      const e = new Error("Forbidden")
      ;(e as any).statusCode = 403
      throw e
    }

    return { type: "session" as const, userId: uid }
  } catch (e) {
    throw e
  }
}
