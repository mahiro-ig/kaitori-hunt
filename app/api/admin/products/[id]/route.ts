// /app/api/admin/products/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminSession } from "@/lib/admin-auth";

type Ctx = { params: { id: string } };

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdminSession();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  if (!supabaseAdmin) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const id = ctx.params?.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
