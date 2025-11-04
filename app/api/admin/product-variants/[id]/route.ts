// /app/api/admin/product-variants/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminSession } from "@/lib/admin-auth";

// Next.js 15 の dynamic API 仕様：params は Promise
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  if (!supabaseAdmin) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  // ★ 重要：params を await してから id を使用
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // 受け入れ対象のみをホワイトリスト更新
  const allowKeys: (keyof any)[] = [
    "jan_code",
    "color",
    "capacity",
    "buyback_price",
    "target_quantity",
    "current_quantity",
    "next_price",
    "next_price_quantity",
    "is_hidden",
  ];
  const patch: Record<string, any> = {};
  for (const k of allowKeys) {
    if (k in body) patch[k] = (body as any)[k];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "empty patch" }, { status: 400 });
  }

  // 型の軽い正規化
  if ("buyback_price" in patch) patch.buyback_price = patch.buyback_price === "" ? null : Number(patch.buyback_price);
  if ("target_quantity" in patch) patch.target_quantity = patch.target_quantity === "" ? null : Number(patch.target_quantity);
  if ("current_quantity" in patch) patch.current_quantity = patch.current_quantity === "" ? null : Number(patch.current_quantity);
  if ("next_price" in patch) patch.next_price = patch.next_price === "" ? null : Number(patch.next_price);
  if ("next_price_quantity" in patch) patch.next_price_quantity = patch.next_price_quantity === "" ? null : Number(patch.next_price_quantity);

  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .update(patch as any)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  if (!supabaseAdmin) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  // ★ 重要：params を await
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("product_variants").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
