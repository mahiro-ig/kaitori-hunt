// /lib/mailer.ts
import nodemailer, { type Transporter } from "nodemailer";

type CreateTransporterOptions = {
  // true にすると SMTP 未設定や送信失敗を throw（本番は 1 を推奨）
  requireSmtp?: boolean;
};

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const {
    SMTP_URL,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
  } = process.env;

  // 1) URL 優先
  if (SMTP_URL) {
    cachedTransporter = nodemailer.createTransport(SMTP_URL);
    return cachedTransporter;
  }

  // 2) 分割指定
  if (!SMTP_HOST || !SMTP_PORT) {
    // 送信時に初めて失敗させる（＝ビルド時は通る）
    throw new Error(
      "SMTP_HOST is not set. Set SMTP_URL or SMTP_HOST/SMTP_PORT(/SMTP_USER/SMTP_PASS)."
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure:
      String(SMTP_SECURE ?? "").toLowerCase() === "true" ||
      Number(SMTP_PORT) === 465,
    auth:
      SMTP_USER && SMTP_PASS
        ? { user: SMTP_USER, pass: SMTP_PASS }
        : undefined, // 認証不要の中継を使う場合
  });

  return cachedTransporter;
}

export async function sendMail(
  mail: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  },
  options?: CreateTransporterOptions
) {
  const requireSmtp =
    options?.requireSmtp ??
    (process.env.REQUIRE_SMTP === "1" || process.env.NODE_ENV === "production");

  try {
    const transporter = getTransporter();
    const from =
      mail.from ??
      process.env.SMTP_FROM ??
      process.env.SMTP_USER ??
      "no-reply@example.com";

    await transporter.sendMail({
      from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (err) {
    if (requireSmtp) {
      throw err;
    } else {
      // 開発/プレビューでは落とさずスキップ
      console.warn("[mailer] send skipped or failed (non-fatal in dev):", err);
    }
  }
}
