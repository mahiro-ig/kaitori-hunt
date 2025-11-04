// /app/api/admin/product-variants/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminSession } from "@/lib/admin-auth";

type Ctx = { params: { id: string } };

// 数値 or null に揃える
function toNumOrNull(v: unknown) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// id 抜き出し
function idFromCtx(ctx: Ctx) {
  return (ctx.params?.id ?? "").trim();
}

/* ================================
   PATCH /api/admin/product-variants/[id]
   body(JSON): allow list のみ更新
   ================================ */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const id = idFromCtx(ctx);
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // 更新許可フィールド
  const allow = new Set([
    "jan_code",
    "color",
    "capacity",
    "buyback_price",
    "target_quantity",
    "current_quantity",
    "next_price",
    "next_price_quantity",
    "is_hidden",
    "notes",
    "sku",
    "title",
    "priority",
  ]);

  const patch: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!allow.has(k)) continue;

    switch (k) {
      case "buyback_price":
      case "target_quantity":
      case "current_quantity":
      case "next_price":
      case "next_price_quantity":
      case "priority":
        patch[k] = toNumOrNull(v);
        break;
      case "is_hidden":
        if (typeof v === "boolean") patch[k] = v;
        else if (v === "1" || v === "true") patch[k] = true;
        else if (v === "0" || v === "false") patch[k] = false;
        break;
      default:
        patch[k] = v;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "empty patch" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

/* ================================
   DELETE /api/admin/product-variants/[id]
   ================================ */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const id = idFromCtx(ctx);
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("product_variants").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
