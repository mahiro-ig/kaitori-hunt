// /app/api/admin/users/route.ts
export const runtime = "nodejs";           // ← Edge 禁止（起動即死を防ぐ）
export const dynamic = "force-dynamic";    // ← キャッシュさせない

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"; // 遅延初期化（例外を検出しやすい）

// キャッシュ無効
const noStore = { headers: { "Cache-Control": "no-store" } } as const;

// ========================================
// 認可: x-admin-api-key ヘッダ（NextAuth非依存）
// ========================================
function requireAdminApiKey(req: NextRequest) {
  try {
    const headerKey = (req.headers.get("x-admin-api-key") ?? "").trim();
    const envKey = (process.env.ADMIN_API_KEY ?? "").trim();
    if (!envKey || headerKey !== envKey) {
      return { ok: false as const, status: 401 as const, error: "Unauthorized" };
    }
    return { ok: true as const };
  } catch (e: any) {
    return {
      ok: false as const,
      status: 500 as const,
      error: `Auth guard crashed: ${String(e?.message ?? e)}`,
    };
  }
}

// ========================================
// ユーティリティ
// ========================================
function parseNumber(v: string | null, def: number, max: number) {
  const n = v ? Number(v) : def;
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), max);
}

// ========================================
// GET /api/admin/users
//   - 検索: ?q=foo
//   - ページング: ?limit=50&cursor=<created_at ISO>
//   - 診断: ?diag=1 でヘッダ出力
// ========================================
export async function GET(request: NextRequest) {
  // 0) 認可
  const guard = requireAdminApiKey(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status, ...noStore });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const limit = parseNumber(url.searchParams.get("limit"), 50, 200);
  const cursor = url.searchParams.get("cursor"); // 直前ページの末尾 created_at
  const wantDiag = url.searchParams.get("diag") === "1";

  // 1) Supabase Admin 初期化（ここで env 不備などを検出）
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
          `ADMIN_API_KEY=${process.env.ADMIN_API_KEY ? "set" : "missing"}`,
        ].join(";")
      );
    }
    return res;
  }

  // 2) クエリ（検索・ページング）
  try {
    // 取得カラム（必要に応じて調整）
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
      .limit(limit + 1); // 次ページ判定のため +1

    if (cursor) {
      // 新しい順に並べているので「前ページ末尾より古いもの」
      query = query.lt("created_at", cursor);
    }

    if (q) {
      const like = `%${q}%`;
      // name / email / phone / address あたりで部分一致
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
      if (wantDiag) {
        res.headers.set("x-diag-query", "users.select.order.limit");
      }
      return res;
    }

    const rows = data ?? [];

    // ページング用カーソル
    let nextCursor: string | null = null;
    let items = rows;
    if (rows.length > limit) {
      const tail = rows[limit - 1];
      nextCursor = tail?.created_at ?? null;
      items = rows.slice(0, limit);
    }

    const res = NextResponse.json(
      {
        // 互換: 既存UIが users を期待している想定
        users: items,
        // 追加: ページング用情報
        nextCursor,
        total: count ?? null,
      },
      noStore
    );

    if (wantDiag) {
      res.headers.set("x-diag-runtime", runtime);
      res.headers.set(
        "x-diag-env",
        [
          `SUPABASE_URL=${process.env.SUPABASE_URL ? "set" : "missing"}`,
          `SERVICE_ROLE=${process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing"}`,
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
