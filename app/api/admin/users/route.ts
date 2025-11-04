// app/api/admin/users/route.ts
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // ← 必ず server専用のAdminクライアントに

const noStore = { headers: { "Cache-Control": "no-store" } } as const;

// 最小ガード: APIキーのみで保護（next-auth非依存）
function requireAdminApiKey(req: NextRequest) {
  const headerKey = req.headers.get("x-admin-api-key") ?? "";
  const envKey = process.env.ADMIN_API_KEY ?? "";
  if (!envKey || headerKey !== envKey) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  // 認可
  const guard = requireAdminApiKey(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status, ...noStore });
  }

  if (!supabaseAdmin) {
    console.error("[api/admin/users] supabaseAdmin is not initialized");
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500, ...noStore });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        [
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
        ].join(",")
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api/admin/users] GET error:", error);
      return NextResponse.json({ error: "ユーザー一覧取得に失敗しました" }, { status: 500, ...noStore });
    }

    return NextResponse.json({ users: data ?? [] }, noStore);
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    const msg = e?.message ?? "Unknown error";
    return NextResponse.json({ error: msg }, { status, ...noStore });
  }
}
