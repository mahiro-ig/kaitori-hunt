// lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ====== 共通設定 ======
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 環境変数の存在チェック（ビルド時/起動時の事故を早期検知）
if (!supabaseUrl) {
  throw new Error('[lib/supabase] NEXT_PUBLIC_SUPABASE_URL is not set')
}
if (!supabaseAnonKey) {
  throw new Error('[lib/supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
}

// サーバー/ブラウザ判定
export const isServer = typeof window === 'undefined'

// ====== 1) ブラウザ/SSR 共通の匿名クライアント（RLS 有効） ======
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // ブラウザ側ではセッションを維持、SSR でも問題なし（auth-helpers 併用可）
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ====== 2) サーバー専用 Service Role クライアント（RLS 無効・管理用） ======
/**
 * 注意:
 * - Client Bundle に絶対に含めないため、`typeof window === 'undefined'` で生成を分岐
 * - 環境変数が未設定の場合は null にしておき、必要時に requireSupabaseAdmin() で検知
 */
export const supabaseAdmin: SupabaseClient | null =
  isServer && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
        // 管理用 API は基本 no-cache で良い（必要に応じて個別APIで制御）
      })
    : null

/**
 * サーバー専用の admin クライアントを“実行時に”取得するヘルパー。
 * - import 時に例外を投げず、呼び出し時にだけ厳格チェック
 * - ブラウザや Edge で誤って呼ぶと明確にエラーにする
 */
export function requireSupabaseAdmin(): SupabaseClient {
  if (!isServer) {
    throw new Error('requireSupabaseAdmin can only be used on the server.')
  }
  if (!supabaseAdmin) {
    throw new Error(
      'supabaseAdmin is not initialized. Check SUPABASE_SERVICE_ROLE_KEY and server runtime.'
    )
  }
  return supabaseAdmin
}

// 便利エイリアス
export const getSupabaseAdmin = requireSupabaseAdmin
