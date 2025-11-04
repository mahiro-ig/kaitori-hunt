// /lib/send-password-reset-email.ts
import nodemailer from "nodemailer";

/**
 * パスワード再設定メール送信モジュール
 * - send-buyback-submitted-email.ts と同じ方針で実装
 * - SMTP_URL があれば優先
 * - なければ SMTP_HOST/SMTP_PORT/... を使う
 * - .env が未設定なら throw で気付けるようにする
 */

const {
  SMTP_URL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM = '"買取ハント" <no-reply@kaitori-hunt.jp>',
} = process.env;

function createSafeTransport() {
  // 1) URLがあれば優先 (例: smtp://user:pass@smtp.example.com:587)
  if (SMTP_URL && SMTP_URL.trim()) {
    return nodemailer.createTransport(SMTP_URL);
  }

  // 2) 個別指定パターン。HOST未設定なら即エラーで気付けるようにする。
  if (!SMTP_HOST || !String(SMTP_HOST).trim()) {
    throw new Error(
      "SMTP_HOST is not set. Set SMTP_URL or SMTP_HOST/SMTP_PORT(/SMTP_USER/SMTP_PASS) in your .env"
    );
  }

  const port = Number(SMTP_PORT ?? 587);
  const secure = port === 465; // SMTPSの場合はtrue

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth:
      SMTP_USER && SMTP_PASS
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
          }
        : undefined,
  });
}

const transporter = createSafeTransport();

/**
 * パスワード再設定リンク送信
 */
export async function sendPasswordResetEmail(args: {
  to: string;          // ユーザー宛メールアドレス
  resetUrl: string;    // クリックさせるURL（例: https://kaitori-hunt.com/auth/reset-password?token=...）
  ttlMinutes: number;  // 有効期限（分）
}) {
  // 本文（プレーンテキストでOK。この用途はシンプルでよい）
  const text = [
    "パスワード再設定の手続きを受け付けました。",
    "",
    `以下のURLから新しいパスワードを設定してください。`,
    `(有効期限: ${args.ttlMinutes}分)`,
    "",
    args.resetUrl,
    "",
    "このメールに心当たりがない場合は、このメールを破棄してください。",
  ].join("\n");

  const html = `
    <div style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; line-height:1.7;">
      <p>パスワード再設定の手続きを受け付けました。</p>
      <p>以下のボタン、またはURLから新しいパスワードを設定してください。</p>

      <p style="margin: 16px 0;">
        <a
          href="${escapeHtml(args.resetUrl)}"
          style="
            display:inline-block;
            background:#111827;
            color:#fff;
            text-decoration:none;
            padding:10px 16px;
            border-radius:6px;
            font-weight:500;
          "
        >
          パスワードを再設定する
        </a>
      </p>

      <p style="font-size:14px;color:#444;margin:0;">
        有効期限: ${escapeHtml(args.ttlMinutes)}分
      </p>

      <p style="word-break:break-all;font-size:13px;color:#555;">
        直接アクセスする場合はこちら:<br/>
        ${escapeHtml(args.resetUrl)}
      </p>

      <hr style="border:none;border-top:1px solid #eee; margin:20px 0;"/>

      <p style="font-size:12px;color:#666;margin-top:8px;">
        このメールに心当たりがない場合は、このメールを破棄してください。
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: EMAIL_FROM, // ← ここが "買取ハント <info@kaitori-hunt.com>" とかにできる
    to: args.to,
    subject: "【買取ハント】パスワード再設定のご案内",
    text,
    html,
  });
}

/** HTMLエスケープ */
function escapeHtml(input: unknown): string {
  const s = String(input ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
