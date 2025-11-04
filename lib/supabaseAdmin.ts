// /lib/supabaseAdmin.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

/**
 * Supabase Service Role クライアント（遅延初期化）
 * - モジュール読込時には作らない（＝ビルド時に env 不足で落ちない）
 * - 使う直前にだけ env を検証して作成
 */
export function getSupabaseAdmin(): SupabaseClient {
  // 念のためのクライアント側防御（server-only があるので通常は到達しない）
  if (typeof window !== "undefined") {
    throw new Error(
      "[supabaseAdmin] This module must not be imported on the client."
    );
  }

  if (_admin) return _admin;

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase Admin 初期化に必要な環境変数が足りません。\n" +
        "SUPABASE_URL（または NEXT_PUBLIC_SUPABASE_URL）と SUPABASE_SERVICE_ROLE_KEY を設定してください。"
    );
  }

  _admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return _admin;
}
