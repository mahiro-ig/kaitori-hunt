// /lib/supabaseAdmin.ts
import "server-only"; 
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;


if (typeof window !== "undefined") {
  throw new Error(
    "[supabaseAdmin] This module must not be imported on the client."
  );
}

// 必須環境変数チェック
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Supabase Admin クライアント初期化に必要な環境変数がありません。\n" +
      "SUPABASE_URL または NEXT_PUBLIC_SUPABASE_URL、そして SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。"
  );
}


export const supabaseAdmin /* : SupabaseClient<Database> */: SupabaseClient =
  createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false, 
      detectSessionInUrl: false,
    },
    
  });
