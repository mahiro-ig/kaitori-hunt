// app/api/me/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// 管理鍵クライアントは「ハンドラ内で」生成（= ビルド時評価を避ける）
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("[/api/me] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/me
export async function GET(_req: NextRequest) {
  try {
    // 1) セッション確認
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "未認証です" }, { status: 401 });
    }

    // 2) DB 取得
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, name, email, phone, postal_code, address, bank_name, branch_name, account_type, account_number, account_name"
      )
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("[/api/me][GET] select error:", error);
      return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
    }

    // 3) snake_case → camelCase で返却
    const {
      id,
      name,
      email,
      phone,
      postal_code,
      address,
      bank_name,
      branch_name,
      account_type,
      account_number,
      account_name,
    } = data;

    return NextResponse.json({
      id,
      name,
      email,
      phone: phone ?? "",
      postalCode: postal_code ?? "",
      address: address ?? "",
      bankName: bank_name ?? "",
      branchName: branch_name ?? "",
      accountType: account_type ?? "",
      accountNumber: account_number ?? "",
      accountName: account_name ?? "",
    });
  } catch (e: any) {
    console.error("[/api/me][GET] fatal:", e?.message ?? e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// PUT /api/me
export async function PUT(request: Request) {
  try {
    // 1) セッション確認
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "未認証です" }, { status: 401 });
    }

    // 2) 入力取得
    const body = await request.json();
    const {
      name,
      phone,
      postalCode,
      address,
      bankName,
      branchName,
      accountType,
      accountNumber,
      accountName,
    } = body ?? {};

    // 3) バリデーション
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
    }

    // 4) 更新
    const supabase = getSupabaseAdmin();
    const updates = {
      name,
      phone: phone || null,
      postal_code: postalCode || null,
      address: address || null,
      bank_name: bankName || null,
      branch_name: branchName || null,
      account_type: accountType || null,
      account_number: accountNumber || null,
      account_name: accountName || null,
    };

    const { error } = await supabase.from("users").update(updates).eq("id", userId);

    if (error) {
      console.error("[/api/me][PUT] update error:", error);
      return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ message: "更新完了" });
  } catch (e: any) {
    console.error("[/api/me][PUT] fatal:", e?.message ?? e);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
