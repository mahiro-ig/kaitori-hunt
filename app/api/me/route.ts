// /app/api/me/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// DB から取得するユーザー情報の型
type DbUser = {
  id: string;
  public_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  postal_code: string | null;
  address: string | null;
  bank_name: string | null;
  branch_name: string | null;
  account_type: string | null;
  account_number: string | null;
  account_name: string | null;
  created_at: string; // 会員登録日
};

export async function GET() {
  // NextAuth セッション取得
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "未認証です" }, { status: 401 });
  }

  // Service Role クライアントは “ここで” 遅延初期化
  const supabaseAdmin = getSupabaseAdmin();

  // users テーブルから public_id を含めて取得
  const { data: dbData, error: dbError } = await supabaseAdmin
    .from("users")
    .select(
      `
      id,
      public_id,
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
      created_at
      `
    )
    .eq("id", userId)
    .single<DbUser>();

  if (dbError || !dbData) {
    console.error("[/api/me] users fetch error:", dbError);
    return NextResponse.json(
      { error: "ユーザー情報の取得に失敗しました" },
      { status: 500 }
    );
  }

  // レスポンス整形
  const userProfile = {
    id: dbData.id,
    publicId: dbData.public_id ?? "",
    name: dbData.name ?? "",
    email: dbData.email ?? "",
    phone: dbData.phone ?? "",
    postalCode: dbData.postal_code ?? "",
    address: dbData.address ?? "",
    bankName: dbData.bank_name ?? "",
    branchName: dbData.branch_name ?? "",
    accountType: dbData.account_type ?? "",
    accountNumber: dbData.account_number ?? "",
    accountName: dbData.account_name ?? "",
    createdAt: dbData.created_at,
  };

  return NextResponse.json(userProfile, {
    headers: { "Cache-Control": "no-store" },
  });
}
