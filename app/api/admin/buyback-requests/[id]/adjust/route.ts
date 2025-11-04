// app/api/admin/buyback-requests/[id]/adjust/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminAPI } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<Params> }
) {
  try {
    // ★ 管理APIガード（APIキー or セッション + admin_users）
    const authResult = await requireAdminAPI(request);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Next.js 15: params は Promise
    const { id: rawId } = await context.params;
    const pathId = decodeURIComponent(String(rawId || "")).trim();

    // UUID前提（違っていたら 400）
    if (!isUUID(pathId)) {
      return NextResponse.json(
        { error: "id must be UUID" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 入力
    const body = await request.json().catch(() => ({}));
    const final_price = Number(body?.final_price);
    const reason = (body?.reason ?? "").toString().trim();

    if (!Number.isFinite(final_price) || final_price < 0) {
      return NextResponse.json(
        { error: "final_price invalid" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // レコード取得
    const { data: existing, error: getErr } = await supabaseAdmin
      .from("buyback_requests")
      .select("id, total_price, final_price, status")
      .eq("id", pathId)
      .maybeSingle();

    if (getErr || !existing) {
      console.error("[adjust] select error:", getErr);
      return NextResponse.json(
        { error: "not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const previous_price = (existing.final_price ?? existing.total_price ?? 0) as number;
    const nowIso = new Date().toISOString();

    // 更新（査定確定 → ステータスは「査定完了」）
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("buyback_requests")
      .update({
        final_price,
        deduction_reason: reason,
        is_assessed: true,
        status: "査定完了",
        updated_at: nowIso,
      })
      .eq("id", existing.id)
      .select()
      .maybeSingle();

    if (updErr) {
      console.error("[adjust] update error:", updErr);
      return NextResponse.json(
        { error: updErr.message },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 価格履歴に記録（★ changed_by の特別扱いはしない／従来通りセッション時のみ入る想定）
    // requireAdminAPI は API キー経由でも通るため、その場合は changed_by を送らないようにする（フィールド未送信）。
    const priceHistoryPayload: Record<string, any> = {
      buyback_request_id: existing.id,
      previous_price,
      new_price: final_price,
      reason,
    };
    if (authResult.type === "session") {
      priceHistoryPayload.changed_by = (authResult as { type: "session"; userId: string }).userId;
    }

    const { error: histErr } = await supabaseAdmin
      .from("buyback_price_history")
      .insert(priceHistoryPayload as any);

    if (histErr) {
      console.error("[adjust] price_history insert error:", histErr);
      return NextResponse.json(
        {
          warning: "updated but history insert failed",
          detail: histErr.message,
          buyback: updated,
        },
        { status: 207, headers: { "Cache-Control": "no-store" } }
      );
    }

    // ステータス履歴（★ 旧来のスキーマに限定：purchase_id / status / note / created_at）
    await supabaseAdmin.from("purchase_status_history").insert({
      purchase_id: existing.id,
      status: "査定完了",
      note: reason ? `査定確定（即時）: ${reason}` : "査定確定（即時）",
      created_at: nowIso,
    } as any);

    return NextResponse.json(
      { buyback: updated },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("PATCH /api/admin/buyback-requests/[id]/adjust fatal:", e);
    const status = e?.statusCode ?? 500;
    return NextResponse.json(
      { error: e?.message ?? "server error" },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
