// app/api/admin/users/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // あなたのパスに合わせて

const noStore = { headers: { "Cache-Control": "no-store" } } as const;

// ============ 認可: セッション or APIキー ============
async function requireAdmin(req: NextRequest) {
  // 1) セッション（推奨）
  try {
    const session = await getServerSession(authOptions);
    if (session) {
      const adminEmails = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const isAdmin =
        (session.user as any)?.role === "admin" ||
        (session.user?.email &&
          adminEmails.includes(session.user.email.toLowerCase()));
      if (isAdmin) return { ok: true as const };
    }
  } catch (e) {
    // セッション側が壊れても後段でAPIキーを試す
  }

  // 2) APIキー（サーバー間・curl用。ブラウザでは使わない）
  const headerKey = (req.headers.get("x-admin-api-key") ?? "").trim();
  const envKey = (process.env.ADMIN_API_KEY ?? "").trim();
  if (envKey && headerKey === envKey) {
    return { ok: true as const };
  }

  return { ok: false as const, status: 401 as const, error: "Unauthorized" };
}

// ============ ユーティリティ ============
function parseNumber(v: string | null, def: number, max: number) {
  const n = v ? Number(v) : def;
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), max);
}

// ============ GET ============
export async function GET(request: NextRequest) {
  // 認可（セッション or APIキー）
  const guard = await requireAdmin(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status, ...noStore });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const limit = parseNumber(url.searchParams.get("limit"), 50, 200);
  const cursor = url.searchParams.get("cursor");
  const wantDiag = url.searchParams.get("diag") === "1";

  // Supabase 初期化（env 問題はここで可視化）
  let sb;
  try {
    sb = getSupabaseAdmin();
  } catch (e: any) {
    const res = NextResponse.json(
      { error: "Supabase admin init failed", detail: String(e?.message ?? e) },
      { status: 500, ...noStore }
    );
    if (wantDiag) {
      res.headers.set("x-diag-runtime", runtime);
      res.headers.set(
        "x-diag-env",
        [
          `SUPABASE_URL=${process.env.SUPABASE_URL ? "set" : "missing"}`,
          `SERVICE_ROLE=${process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing"}`,
          `ADMIN_EMAILS=${process.env.ADMIN_EMAILS ? "set" : "missing"}`,
          `ADMIN_API_KEY=${process.env.ADMIN_API_KEY ? "set" : "missing"}`,
        ].join(";")
      );
    }
    return res;
  }

  try {
    const columns = [
      "id",
      "public_id",
      "name",
      "email",
      "phone",
      "postal_code",
      "address",
      "created_at",
      "bank_name",
      "branch_name",
      "account_type",
      "account_number",
      "account_name",
    ].join(",");

    let query = sb
      .from("users")
      .select(columns, { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) query = query.lt("created_at", cursor);

    if (q) {
      const like = `%${q}%`;
      query = query.or(
        [
          `name.ilike.${like}`,
          `email.ilike.${like}`,
          `phone.ilike.${like}`,
          `address.ilike.${like}`,
          `public_id.ilike.${like}`,
        ].join(",")
      );
    }

    const { data, error, count } = await query;
    if (error) {
      const res = NextResponse.json(
        { error: "Supabase query error", detail: error.message },
        { status: 500, ...noStore }
      );
      if (wantDiag) res.headers.set("x-diag-query", "users.select.order.limit");
      return res;
    }

    const rows = data ?? [];
    let nextCursor: string | null = null;
    let items = rows;
    if (rows.length > limit) {
      const tail = rows[limit - 1];
      nextCursor = tail?.created_at ?? null;
      items = rows.slice(0, limit);
    }

    const res = NextResponse.json(
      { users: items, nextCursor, total: count ?? null },
      noStore
    );
    if (wantDiag) {
      res.headers.set("x-diag-runtime", runtime);
      res.headers.set(
        "x-diag-env",
        [
          `SUPABASE_URL=${process.env.SUPABASE_URL ? "set" : "missing"}`,
          `SERVICE_ROLE=${process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing"}`,
          `ADMIN_EMAILS=${process.env.ADMIN_EMAILS ? "set" : "missing"}`,
          `ADMIN_API_KEY=${process.env.ADMIN_API_KEY ? "set" : "missing"}`,
        ].join(";")
      );
    }
    return res;
  } catch (e: any) {
    const status = Number(e?.statusCode) || 500;
    const msg = String(e?.message ?? e);
    return NextResponse.json({ error: msg }, { status, ...noStore });
  }
}
