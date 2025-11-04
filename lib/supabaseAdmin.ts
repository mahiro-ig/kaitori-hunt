// /lib/supabaseAdmin.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// import type { Database } from "@/lib/database.types"; // 型付けしたい場合は有効化

let _admin: SupabaseClient /* <Database> */ | null = null;

/**
 * Supabase Service Role クライアント（サーバー専用・遅延初期化）
 * - サーバーのみ import 可（client からの import は即エラー）
 * - トップレベルで env を読まず、呼び出し時に検証（= ビルド安定）
 * - Service Role を使うため API ルートは nodejs runtime で使う前提
 */
export function getSupabaseAdmin(): SupabaseClient /* <Database> */ {
  // 念のためのクライアント側防御
  if (typeof window !== "undefined") {
    throw new Error("[supabaseAdmin] Do not import on the client.");
  }

  if (_admin) return _admin;

  // サーバー用 env のみを許可（NEXT_PUBLIC_* は使用禁止）
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    // ここで初めて検証（= ビルド時には実行されない）
    throw new Error(
      "[supabaseAdmin] Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  _admin = createClient(/* <Database> */ url, serviceRoleKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      // service role なので自動リフレッシュ等は不要
    },
    global: {
      headers: {
        "X-Client-Info": "kaitori-hunt-admin",
      },
      // fetch: (input, init) => fetch(input, { ...init, keepalive: true }), // 任意
    },
  });

  return _admin;
}
