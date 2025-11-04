// /lib/supabaseAdmin.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// import type { Database } from "@/lib/database.types"; // 型を使うなら有効化

// let _admin: SupabaseClient<Database> | null = null;
let _admin: SupabaseClient | null = null;

/**
 * Supabase Service Role クライアント（サーバー専用・遅延初期化）
 * - クライアント側からの import を防止（server-only）
 * - トップレベルで env を読まない → ビルド安定
 * - 初回アクセス時にだけ生成（シングルトン）
 * - API ルートでは runtime: "nodejs" 前提
 */
export function getSupabaseAdmin(): SupabaseClient /* <Database> */ {
  if (typeof window !== "undefined") {
    throw new Error("[supabaseAdmin] Do not import/use on the client.");
  }
  if (_admin) return _admin;

  // サーバー用 env のみを許可（NEXT_PUBLIC_* は使用禁止）
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    // ここで初めて検証（= モジュール評価時には実行されない）
    throw new Error(
      "[supabaseAdmin] Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  _admin = createClient(/* <Database> */ url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "kaitori-hunt-admin" },
    },
  });

  return _admin;
}

/**
 * 互換レイヤー：
 * 既存コードが `supabaseAdmin.from(...).select(...)` のように
 * 変数（オブジェクト）として参照している場合でも、
 * この Proxy により “初回アクセス時にだけ” 実体を生成して委譲します。
 *
 * 例：
 *   import { supabaseAdmin } from "@/lib/supabaseAdmin";
 *   const { data } = await supabaseAdmin.from("users").select("*");
 */
export const supabaseAdmin: SupabaseClient /* <Database> */ = new Proxy(
  {} as SupabaseClient /* <Database> */,
  {
    get(_target, prop, receiver) {
      const client = getSupabaseAdmin();
      // @ts-expect-error: dynamic proxy delegation
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
    // 一応 has/ownKeys も委譲しておくと型的に安心（任意）
    has(_target, prop) {
      return prop in getSupabaseAdmin();
    },
    ownKeys() {
      return Reflect.ownKeys(getSupabaseAdmin() as object);
    },
    getOwnPropertyDescriptor(_t, prop) {
      const client = getSupabaseAdmin() as any;
      const desc = Object.getOwnPropertyDescriptor(client, prop);
      if (desc) return desc;
      // 関数プロパティでも問題なく列挙できるようにする
      return {
        configurable: true,
        enumerable: true,
        writable: false,
        value: (client as any)[prop],
      };
    },
  }
);
