// /app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";             // 読み取り用クライアント
import { supabaseAdmin } from "@/lib/supabaseAdmin";   // 挿入用サービスロールキー
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // 1) 必須項目チェック
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "全ての項目を入力してください" },
        { status: 400 }
      );
    }

    // ✅ パスワード強度チェック（フロントと同じルール）
    const PASSWORD_PATTERN =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!PASSWORD_PATTERN.test(password)) {
      return NextResponse.json(
        {
          error:
            "パスワードは8文字以上で、大文字・小文字・数字・特殊文字(@$!%*?&)をそれぞれ1つ以上含める必要があります",
        },
        { status: 400 }
      );
    }

    // 2) 重複チェック（行0件なら data === null）
    const { data: existingUser, error: selectError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle(); // ← single() から maybeSingle() に変更済み

    if (selectError) {
      console.error("Supabase select error:", selectError);
      return NextResponse.json(
        { error: "ユーザー確認に失敗しました" },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "すでにこのメールアドレスは登録されています" },
        { status: 400 }
      );
    }

    // 3) パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4) サーバーサイドクライアントで挿入
    const { error: insertError } = await supabaseAdmin
      .from("users")
      .insert([
        {
          name,
          email,
          password: hashedPassword,
        },
      ])
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json(
        { error: "登録に失敗しました" },
        { status: 500 }
      );
    }

    // 成功レスポンス
    return NextResponse.json({ message: "登録成功" }, { status: 200 });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
