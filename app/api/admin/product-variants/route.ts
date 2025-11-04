// /app/api/admin/product-variants/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminSession } from "@/lib/admin-auth";

type NewVariant = {
  product_id: string;
  jan_code: string;
  color: string;
  capacity: string;
  buyback_price?: number | null;
  target_quantity?: number | null;
  current_quantity?: number | null;
  next_price?: number | null;
  next_price_quantity?: number | null;
};

function toNumberOr<T>(v: any, fallback: T): number | T {
  if (v === "" || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : (fallback as any);
}

function validate(body: any): { ok: boolean; data?: NewVariant; error?: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };

  const {
    product_id,
    jan_code,
    color,
    capacity,
    buyback_price,
    target_quantity,
    current_quantity,
    next_price,
    next_price_quantity,
  } = body;

  if (!product_id || typeof product_id !== "string") return { ok: false, error: "product_id is required" };
  if (!jan_code || typeof jan_code !== "string") return { ok: false, error: "jan_code is required" };
  if (!color || typeof color !== "string") return { ok: false, error: "color is required" };
  if (capacity == null || typeof capacity !== "string") return { ok: false, error: "capacity is required" };

  const payload: NewVariant = {
    product_id,
    jan_code: jan_code.trim(),
    color: color.trim(),
    capacity: capacity.trim(),
    buyback_price: toNumberOr(buyback_price, 0),
    target_quantity: toNumberOr(target_quantity, 0),
    current_quantity: toNumberOr(current_quantity, 0),
    next_price: next_price == null || next_price === "" ? null : Number(next_price),
    next_price_quantity: next_price_quantity == null || next_price_quantity === "" ? null : Number(next_price_quantity),
  };

  return { ok: true, data: payload };
}

export async function POST(req: Request) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  if (!supabaseAdmin) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const body = await req.json().catch(() => null);
  const v = validate(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .insert(v.data as any)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 200 });
}