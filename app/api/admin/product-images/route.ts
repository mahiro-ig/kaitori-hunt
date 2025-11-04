// /app/api/admin/product-images/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "product-images";

function isAdmin(session: any) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return (
    session?.user?.role === "admin" ||
    (session?.user?.email &&
      adminEmails.includes(String(session.user.email).toLowerCase()))
  );
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
  ].filter(Boolean) as string[];
  if (!origin || !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  const session = await getServerSession(authOptions as any);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (<=10MB)" }, { status: 413 });
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext ? "." + ext : ""}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(name, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (upErr) {
    console.error("[product-images upload error]", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(name);
  return NextResponse.json({ publicUrl: pub.publicUrl, path: name }, { status: 200 });
}
