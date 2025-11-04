// lib/send-buyback-submitted-email.ts
import nodemailer from "nodemailer";

/**
 * 単体で完結する送信モジュール（方案B）
 * - 環境変数が未設定なら明示的に throw して、誤って 127.0.0.1:587 に接続しない
 * - 既存の受付/入金メールとは独立（同じ .env を参照）
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
  // 1) SMTP_URL がある場合はそれを最優先（例: smtp://user:pass@host:port）
  if (SMTP_URL && SMTP_URL.trim()) {
    return nodemailer.createTransport(SMTP_URL);
  }

  // 2) ホスト未設定なら明示エラー（localhost:587 へ行く事故を防止）
  if (!SMTP_HOST || !String(SMTP_HOST).trim()) {
    throw new Error(
      "SMTP_HOST is not set. Set SMTP_URL or SMTP_HOST/SMTP_PORT(/SMTP_USER/SMTP_PASS) in your .env"
    );
  }

  const port = Number(SMTP_PORT ?? 587);
  const secure = port === 465; // SMTPS

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
 * 申込受付（確認）メールを送信
 */
export async function sendBuybackSubmittedEmail(args: {
  to: string; // 送信先メールアドレス
  requestNumber: string | number; // 申込番号（数値でもOK）
  method: "shipping" | "instore";
  items?: Array<{ name: string; qty: number }>; // name は「製品名 / カラー / 容量」など連結済み
  customerName?: string | null;
  submittedAtISO?: string; // 指定時はその日時、未指定なら現在(Asia/Tokyo)で表示
}) {
  const submittedAt = args.submittedAtISO ? new Date(args.submittedAtISO) : new Date();

  const submittedAtJa = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(submittedAt);

  const itemsHtml = (args.items ?? [])
    .map((it) => `・${escapeHtml(it.name)} × ${Number(it.qty)}`)
    .join("<br/>");

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.7;">
      <p>${args.customerName ? escapeHtml(args.customerName) + " 様" : "お客様 様"}</p>
      <p>この度は買取ハントをご利用いただき、誠にありがとうございます。</p>
      <p>買取申込を確認いたしました。担当者が申込内容を確認後、申込受付メールを送信させていただきます。</p>
      <p>本メールは受付前のご案内となります。<strong>必ず[お申込みを受け付けました]という件名のメールを受信後、商品の発送またはご来店いただきますようお願いいたします。</p>
      <p>お申込み内容の詳細や進行状況は、マイページよりご確認いただけます。</p>
      <p><b>申込番号：</b>${escapeHtml(args.requestNumber)}<br/>
         <b>申込方法：</b>${args.method === "shipping" ? "郵送買取" : "店頭買取"}<br/>
         <b>申込日時：</b>${escapeHtml(submittedAtJa)}</p>
      ${
        itemsHtml
          ? `<hr style="border:none;border-top:1px solid #eee;"/>
             <p style="margin:8px 0 4px 0;"><b>申込商品</b></p>
             <p style="margin:0;">${itemsHtml}</p>`
          : ""
      }
      <hr style="border:none;border-top:1px solid #eee;"/>
      <p style="font-size:12px;color:#666;margin-top:8px;">
        ※申込受付後は原則キャンセル不可です。発送後のキャンセルにつきましては、査定後(着払い)でのご返却となります。<br/>
        ※郵送の場合は、受付日当日中の発送をお願いいたします。<br/>
        ※店頭買取の場合は、受付日営業時間内にご来店ください。<br/>
      </p>
      <p>マイページ：https://kaitori-hunt.jp/dashboard</p>
      <p style="font-size:12px;color:#666;">本メールにお心当たりのない場合は破棄してください。</p>
    </div>
  `;

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: args.to,
    subject: `【買取ハント】買取申込のご確認（申込番号：${String(args.requestNumber)}）`,
    html,
  });
}

/** HTMLエスケープ（数値/undefinedも安全に処理・replaceAll非依存） */
function escapeHtml(input: unknown): string {
  const s = String(input ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
