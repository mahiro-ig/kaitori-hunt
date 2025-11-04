// app/api/purchases/[purchaseId]/history/route.ts
export const runtime = "nodejs";         // Edgeだと管理鍵やnext-authと相性が悪い
export const dynamic = "force-dynamic";  // 静的最適化を完全に無効化
export const revalidate = 0;

import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Supabase Adminクライアントは「ハンドラ内で」生成（= ビルド時評価を避ける）
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "[history route] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { purchaseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "認証エラー" }, { status: 401 });
    }

    const purchaseId = params?.purchaseId;
    if (!purchaseId) {
      return NextResponse.json({ error: "purchaseId が不正です" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 自分のリクエストか確認
    const { data: req, error: reqErr } = await supabase
      .from("buyback_requests")
      .select("id")
      .eq("id", purchaseId)
      .eq("user_id", userId)
      .single();

    if (reqErr || !req) {
      return NextResponse.json({ error: "権限エラー" }, { status: 403 });
    }

    // 履歴取得（外部キー列：buyback_request_id）
    const { data, error } = await supabase
      .from("purchase_status_history")
      .select("id, previous_status, new_status, changed_at")
      .eq("buyback_request_id", purchaseId)
      .order("changed_at", { ascending: true });

    if (error) {
      console.error("[history][select] error:", error);
      return NextResponse.json({ error: "履歴の取得に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ histories: data ?? [] }, { status: 200 });
  } catch (e: any) {
    console.error("[history][GET] fatal:", e?.message ?? e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
