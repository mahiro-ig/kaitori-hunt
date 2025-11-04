// app/api/auth/register/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import bcrypt from "bcryptjs";

type RegisterBody = {
  name: string;
  email: string;
  password: string;
};

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RegisterBody>;
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!name || !email || !password) return badRequest("全ての項目を入力してください");

    const PASSWORD_PATTERN =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!PASSWORD_PATTERN.test(password)) {
      return badRequest("パスワードは8文字以上で、大文字・小文字・数字・特殊文字(@$!%*?&)を各1つ以上含めてください");
    }

    // 既存ユーザー重複チェック（Service RoleでRLSバイパス）
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (selErr) {
      console.error("register select err:", selErr.message);
      return NextResponse.json({ error: "ユーザー確認に失敗しました" }, { status: 500 });
    }
    if (existing) return badRequest("すでにこのメールアドレスは登録されています");

    const hashed = await bcrypt.hash(password, 10);

    const { error: insErr } = await supabaseAdmin
      .from("users")
      .insert([{ name, email, password: hashed, role: "user" }]) // role列がなければ外してOK
      .single();

    if (insErr) {
      console.error("register insert err:", insErr.message);
      return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("register fatal:", e?.message || e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
