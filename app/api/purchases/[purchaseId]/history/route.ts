// app/api/purchases/[purchaseId]/history/route.ts

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(
  request: Request,
  context: { params: Promise<{ purchaseId: string }> }
) {
  // 動的ルートの params は await して取得する
  const { purchaseId } = await context.params

  // 認証チェック
  const { authOptions } = (await import("@/lib/auth")) as any
  const session = (await getServerSession(authOptions)) as any
  if (!session?.user) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 })
  }

  // 自分のリクエストか確認
  const { data: req, error: reqErr } = await supabaseAdmin
    .from("buyback_requests")
    .select("id")
    .eq("id", purchaseId)
    .eq("user_id", session.user.id)
    .single()
  if (reqErr || !req) {
    return NextResponse.json({ error: "権限エラー" }, { status: 403 })
  }

  // 履歴取得：外部キー列名を buyback_request_id に変更
  const { data, error } = await supabaseAdmin
    .from("purchase_status_history")
    .select("id, previous_status, new_status, changed_at")
    .eq("buyback_request_id", purchaseId)
    .order("changed_at", { ascending: true })

  if (error) {
    console.error("history取得エラー:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ histories: data || [] })
}
