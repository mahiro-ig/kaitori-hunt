// app/api/auth/profile/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";            // ← ここを相対パスから変更
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ProfileBody = {
  name:       string;
  phone:      string;
  postalCode: string;
  address:    string;
};

// GET: プロフィール取得
export async function GET() {
  const session: any = await getServerSession(authOptions);
  const userId: string | undefined = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "未認証です" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("name, phone, postal_code, address")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("🔥 Profile GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({
    name:       data?.name        ?? "",
    phone:      data?.phone       ?? "",
    postalCode: data?.postal_code ?? "",
    address:    data?.address     ?? "",
  });
}

// PUT: プロフィール更新（なければ新規作成）
export async function PUT(request: Request) {
  const session: any = await getServerSession(authOptions);
  const userId: string | undefined    = session?.user?.id;
  const userEmail: string | undefined = session?.user?.email;
  if (!userId || !userEmail) {
    return NextResponse.json({ error: "未認証です" }, { status: 401 });
  }

  const { name, phone, postalCode, address } = (await request.json()) as ProfileBody;

  if (!name) {
    return NextResponse.json({ error: "氏名は必須です" }, { status: 400 });
  }

  const upsertData = {
    id:          userId,
    email:       userEmail, // NOT NULL対策
    name,
    phone,
    postal_code: postalCode,
    address,
  };

  const { error } = await supabaseAdmin
    .from("users")
    .upsert(upsertData, { onConflict: "id" });

  if (error) {
    console.error("🔥 Profile PUT error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ message: "更新成功" });
}
