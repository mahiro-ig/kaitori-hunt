// /lib/supabaseClient.ts
'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * ブラウザ専用 Supabase クライアント（遅延初期化）
 * - 未設定時は実行時に明示エラー
 * - サーバーコードから import しないこと！
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // ブラウザだけでメッセージを出す（SSR/ビルドでは console を汚さない）
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[supabaseClient] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    throw new Error('[supabaseClient] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です');
  }

  _client = createClient(url, anon);
  return _client;
}

