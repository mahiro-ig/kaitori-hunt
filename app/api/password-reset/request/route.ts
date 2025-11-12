// /app/api/password-reset/request/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendMail } from "@/lib/mailer";

const RESET_TOKEN_TTL_MIN = Number(process.env.PASSWORD_RESET_TTL_MIN ?? "60"); // トークン有効期限（分）

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  try {
    // 入力の正規化（メールは存在有無に関わらず最終レスポンスは常に ok）
    let email = "";
    try {
      const body = await req.json();
      email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    } catch {
      // 何もしない（情報を出さない）
    }
    if (!/.+@.+\..+/.test(email)) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // サービスロールはここで遅延初期化（ビルド時に env 評価しない）
    const supabase = getSupabaseAdmin();

    // 該当ユーザーの存在確認（存在しなくても 200 を返す）
    const { data: userRow } = await supabase
      .from("users")
      .select("id, email, name")
      .ilike("email", email)
      .maybeSingle();

    if (!userRow?.id) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // トークン生成 & 有効期限
    const token = crypto.randomBytes(32).toString("hex"); // 64文字hex
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000).toISOString();

    // 保存（テーブル: password_reset_tokens）
    const { error: insertErr } = await supabase.from("password_reset_tokens").insert([
      {
        token,
        user_id: userRow.id,
        expires_at: expiresAt,
        used: false,
      },
    ]);
    if (insertErr) {
      // 内部ログのみ、外部レスポンスは秘匿
      console.warn("[password-reset/request] token insert failed");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // リセットURL（ENV優先、なければ既定）
    const origin =
      (process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "https://kaitori-hunt.com")
        .replace(/\/+$/, "");
    const resetUrl = `${origin}/auth/reset-password?token=${token}`;

    // メール本文（送信失敗しても 200 を返す）
    const toName = (userRow.name || "").trim();
    const greeting = toName ? `${escapeHtml(toName)} 様` : "お客様 様";
    const subject = "【買取ハント】パスワード再設定のご案内";
    const text = [
      `${toName || "お客様"} 様`,
      "",
      "パスワード再設定のご依頼を受け付けました。",
      "以下のURLから再設定を完了してください。",
      "",
      resetUrl,
      "",
      `※このURLは ${RESET_TOKEN_TTL_MIN} 分で有効期限が切れます。`,
      "※本メールにお心当たりがない場合は破棄してください。",
    ].join("\n");
    const html = `<!doctype html>
<html lang="ja">
  <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,'Noto Sans JP',sans-serif;font-size:14px;color:#111;line-height:1.8">
    <p>${greeting}</p>
    <p>パスワード再設定のご依頼を受け付けました。<br/>以下のボタンから再設定を完了してください。</p>
    <p style="margin:18px 0">
      <a href="${escapeHtml(
        resetUrl
      )}" style="display:inline-block;padding:10px 16px;text-decoration:none;border-radius:6px;border:1px solid #e5e5e5;background:#f6f6f6">
        パスワードを再設定する
      </a>
    </p>
    <p style="color:#666">このリンクは ${RESET_TOKEN_TTL_MIN} 分間有効です。<br/>
    期限切れの場合は、再度お手続きをお願いします。</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#666">※本メールにお心当たりがない場合は破棄してください。</p>
  </body>
</html>`;

    try {
      await sendMail(
        {
          to: userRow.email!,
          subject,
          text,
          html,
          from:
            process.env.EMAIL_FROM ??
            process.env.SMTP_FROM ??
            process.env.SMTP_USER ??
            '"買取ハント" <no-reply@kaitori-hunt.jp>',
        },
        // 本番は REQUIRE_SMTP=1 or NODE_ENV=production で throw（/lib/mailer 側デフォ）
        undefined
      );
    } catch {
      // 送信失敗も握りつぶす（外部には常に 200）
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // 例外詳細を出さず常に ok
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
