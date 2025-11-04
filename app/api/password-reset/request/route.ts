// /app/api/password-reset/request/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPasswordResetEmail } from "@/lib/send-password-reset-email";

const RESET_TOKEN_TTL_MIN = 60; // トークン有効期限（分）

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      // サーバーの設定ミスでも挙動を悟らせない
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { email } = await req.json().catch(() => ({ email: "" }));
    const normEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    // emailが無くても、常に "ok" を返して情報を漏らさない
    if (!normEmail) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // そのメールアドレスのユーザーを取得（public.users）
    const { data: userRow, error: selErr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", normEmail)
      .maybeSingle();

    // ユーザーがいない場合・エラーの場合も結果は同じ
    if (selErr || !userRow) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ランダムな一時トークンを生成
    const token = crypto.randomBytes(32).toString("hex"); // 64文字程度
    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000
    ).toISOString();

    // DBにトークンを記録
    const { error: insErr } = await supabaseAdmin
      .from("password_reset_tokens")
      .insert([
        {
          token,
          user_id: userRow.id,
          expires_at: expiresAt,
          used: false,
        },
      ]);

    // 失敗しても外部的には同じレスポンス
    if (insErr) {
      console.error("[password-reset/request] insert error:", insErr);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ユーザーに送るリンク
    // 例: https://kaitori-hunt.com/auth/reset-password?token=xxxx
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaitori-hunt.com";
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/auth/reset-password?token=${token}`;

    // メール送信 (失敗してもレスポンスは変えない)
    try {
      await sendPasswordResetEmail({
        to: normEmail,
        resetUrl,
        ttlMinutes: RESET_TOKEN_TTL_MIN,
      });
    } catch (mailErr) {
      console.error("[password-reset/request] mail error:", mailErr);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[password-reset/request] fatal:", err);
    // ここでも「メール無効」などは返さず常にok
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
