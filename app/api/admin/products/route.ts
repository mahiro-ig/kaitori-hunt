// /app/api/admin/products/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminSession } from "@/lib/admin-auth";

type NewProduct = {
  name: string;
  category: "iphone" | "camera" | "game";
  description?: string | null;
  max_buyback_price?: number | null;
  image_url?: string | null;
  caution_text?: string | null;
};

function validate(body: any): { ok: boolean; data?: NewProduct; error?: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const { name, category, description, max_buyback_price, image_url, caution_text } = body;

  if (!name || typeof name !== "string") return { ok: false, error: "name is required" };
  if (!["iphone", "camera", "game"].includes(category)) return { ok: false, error: "invalid category" };

  const payload: NewProduct = {
    name: name.trim(),
    category,
    description: description ?? null,
    max_buyback_price: typeof max_buyback_price === "number" ? max_buyback_price : max_buyback_price == null ? null : Number(max_buyback_price),
    image_url: image_url ?? null,
    caution_text: caution_text ?? null,
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
    .from("products")
    .insert(v.data!)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 200 });
}
