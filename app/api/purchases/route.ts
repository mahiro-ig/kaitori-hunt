// app/api/me/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // 1. セッションから user.id を取得
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "未認証です" }, { status: 401 });
  }

  // 2. users テーブルから必要なカラムを取得
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, name, email, phone, postal_code, address, bank_name, branch_name, account_type, account_number, account_name"
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("🔥 ユーザー情報取得エラー:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }

  // 3. snake_case → camelCase にマッピングして返却
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
    phone:        phone         ?? "",
    postalCode:   postal_code   ?? "",
    address:      address       ?? "",
    bankName:     bank_name     ?? "",
    branchName:   branch_name   ?? "",
    accountType:  account_type  ?? "",
    accountNumber:account_number?? "",
    accountName:  account_name  ?? "",
  });
}

export async function PUT(request: Request) {
  // 1. セッションから user.id を取得
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "未認証です" }, { status: 401 });
  }

  // 2. リクエストボディをパース
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
  } = body;

  // 3. バリデーション
  if (!name) {
    return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
  }

  // 4. 更新データを組み立て
  const updates = {
    name,
    phone:        phone       || null,
    postal_code:  postalCode  || null,
    address:      address     || null,
    bank_name:    bankName    || null,
    branch_name:  branchName  || null,
    account_type: accountType || null,
    account_number: accountNumber || null,
    account_name:   accountName   || null,
  };

  // 5. DB 更新
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId);

  if (error) {
    console.error("🔥 ユーザー情報更新エラー:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }

  // 6. 完了レスポンス
  return NextResponse.json({ message: "更新完了" });
}