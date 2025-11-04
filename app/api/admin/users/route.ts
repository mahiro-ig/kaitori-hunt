// app/api/admin/users/route.ts
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // ← あなたの環境に合わせて（/lib/auth.ts に authOptions がある想定）
import { supabaseAdmin } from "@/lib/supabase"; // or "@/lib/supabaseAdmin" を使っている場合はそちらに

const noStore = { headers: { "Cache-Control": "no-store" } } as const;

// このファイル内で完結する簡易管理者ガード
async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin =
    (session.user as any)?.role === "admin" ||
    (session.user?.email && adminEmails.includes(session.user.email.toLowerCase()));

  if (!isAdmin) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }

  return { ok: true as const, session };
}

// GET /api/admin/users → 一覧取得（新しい順）
// 必要なら後で ?page= / ?pageSize= / ?q= などを拡張できます
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdminSession();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status, ...noStore });
    }

    if (!supabaseAdmin) {
      console.error("[api/admin/users] supabaseAdmin is not initialized");
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500, ...noStore });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        [
          "id",
          "name",
          "public_id",
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
