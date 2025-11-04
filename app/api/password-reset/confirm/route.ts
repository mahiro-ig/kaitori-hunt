// /app/api/password-reset/confirm/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BCRYPT_ROUNDS = 10;

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    const { token, password } = await req.json().catch(() => ({} as any));
    const newPw =
      typeof password === "string" ? password.trim() : "";

    // 入力必須
    if (!token || !newPw) {
      return NextResponse.json(
        { error: "入力が不足しています" },
        { status: 400 }
      );
    }

    // パスワード強度チェック（登録時と同じルール）
    if (!PASSWORD_PATTERN.test(newPw)) {
      return NextResponse.json(
        {
          error:
            "パスワードは8文字以上で、大文字・小文字・数字・特殊文字(@$!%*?&)をそれぞれ1つ以上含める必要があります",
        },
        { status: 400 }
      );
    }

    // トークン情報の取得
    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("user_id, expires_at, used")
      .eq("token", token)
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return NextResponse.json(
        { error: "無効なリンクです。再度お手続きください。" },
        { status: 400 }
      );
    }

    if (tokenRow.used) {
      return NextResponse.json(
        { error: "このリンクはすでに使用されています" },
        { status: 400 }
      );
    }

    // 期限チェック
    const nowMs = Date.now();
    const expMs = Date.parse(tokenRow.expires_at);
    if (Number.isNaN(expMs) || nowMs > expMs) {
      return NextResponse.json(
        { error: "このリンクの有効期限が切れています" },
        { status: 400 }
      );
    }

    // 新パスワードをハッシュ化
    const hash = await bcrypt.hash(newPw, BCRYPT_ROUNDS);

    // ユーザーのパスワード更新（public.users.password にハッシュを上書き）
    const { error: updErr } = await supabaseAdmin
      .from("users")
      .update({
        password: hash,
        // 監査入れるならここで password_updated_at: new Date().toISOString()
      })
      .eq("id", tokenRow.user_id);

    if (updErr) {
      console.error("[password-reset/confirm] user update error:", updErr);
      return NextResponse.json(
        { error: "パスワード更新に失敗しました" },
        { status: 500 }
      );
    }

    // トークンを使用済みに (失敗しても致命ではないのでログだけ)
    const { error: usedErr } = await supabaseAdmin
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("token", token);

    if (usedErr) {
      console.error("[password-reset/confirm] mark used error:", usedErr);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[password-reset/confirm] fatal:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
