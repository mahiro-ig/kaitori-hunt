// app/api/buyback/update-status/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs"; // nodemailer利用のためEdge不可

// ---- 環境変数のサニタイズ＆検証 ----
const GMAIL_USER = (process.env.GMAIL_USER || "").trim();
const RAW_PASS = process.env.GMAIL_PASS || "";
const GMAIL_PASS = RAW_PASS.replace(/\s+/g, "");
const MAIL_FROM = (process.env.MAIL_FROM || `"買取ハント" <${GMAIL_USER}>`).trim();

if (!GMAIL_USER || !GMAIL_PASS) {
  console.error(
    `ENV missing. GMAIL_USER=${GMAIL_USER ? "set" : "missing"}, GMAIL_PASS length=${GMAIL_PASS ? GMAIL_PASS.length : 0}`
  );
}

// ---- SMTPトランスポート ----
async function getTransport() {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
  try {
    await transporter.verify();
    return transporter;
  } catch {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // STARTTLS
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
    await transporter.verify();
    return transporter;
  }
}

// 金額表記
const yen = (v: number) => `¥${Math.round(v).toLocaleString()}`;

// 日付整形
const formatDate = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
};

// 任意のレコードから「名前/カラー/容量っぽい」候補を拾うユーティリティ
function pickNameLike(obj: any): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  return (
    obj.display_name ||
    obj.variant_name ||
    obj.title ||
    obj.name ||
    obj.model ||
    obj.label ||
    obj.product_name ||
    obj.full_name ||
    obj.sku ||
    obj.code
  );
}
function pickColorLike(obj: any): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  return (
    obj.color ||
    obj.colour ||
    obj.variant_color ||
    obj.color_name ||
    obj.colour_name
  );
}
function normalizeCapacity(val: any): string | undefined {
  if (val == null) return undefined;
  if (typeof val === "number") {
    if (val >= 1000 && val % 1000 === 0) return `${val / 1000}TB`;
    return `${val}GB`;
  }
  const s = String(val);
  // 既に単位付ならそのまま
  if (/\b(GB|TB)\b/i.test(s)) return s;
  // 数字だけならGB付与
  if (/^\d+$/.test(s)) return `${s}GB`;
  // "256 gb" → "256GB"
  return s.replace(/\s*gb\b/i, "GB").replace(/\s*tb\b/i, "TB");
}
function pickCapacityLike(obj: any): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  return (
    normalizeCapacity(obj.capacity) ||
    normalizeCapacity(obj.storage) ||
    normalizeCapacity(obj.memory) ||
    normalizeCapacity(obj.rom) ||
    normalizeCapacity(obj.size)
  );
}

export async function POST(req: Request) {
  const { requestId, newStatus } = await req.json();
  if (!requestId || !newStatus) {
    return NextResponse.json({ error: "requestId/newStatus is required" }, { status: 400 });
  }

  // 更新前
  const { data: before, error: beforeErr } = await supabaseAdmin
    .from("buyback_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (beforeErr || !before) {
    return NextResponse.json({ error: beforeErr?.message ?? "request not found" }, { status: 404 });
  }

  // 更新
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("buyback_requests")
    .update({ status: newStatus })
    .eq("id", requestId)
    .select("*")
    .single();
  if (updateErr || !updated) {
    return NextResponse.json({ error: updateErr?.message ?? "update failed" }, { status: 500 });
  }

  // 履歴登録
  await supabaseAdmin.from("purchase_status_history").insert({
    buyback_request_id: updated.id,
    previous_status: before.status,
    new_status: newStatus,
    changed_at: new Date().toISOString(),
  });

  // ユーザー
  const { data: user } = await supabaseAdmin
    .from("users")
    .select(
      "email, name, phone, postal_code, address, bank_name, branch_name, account_number, account_name"
    )
    .eq("id", updated.user_id)
    .single();

  // メール対象ステータス以外なら終了
  if (!["申込受付", "入金完了"].includes(newStatus) || !user?.email) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // itemsパース（name/title/variant_name, color, capacity も拾えるように）
  type Item = {
    price?: number;
    quantity?: number;
    variant_id?: string | number | null;
    name?: string | null;
    title?: string | null;
    variant_name?: string | null;
    product_name?: string | null;
    color?: string | null;
    colour?: string | null;
    variant_color?: string | null;
    capacity?: string | number | null;
    storage?: string | number | null;
    memory?: string | number | null;
    rom?: string | number | null;
    size?: string | number | null;
  };
  const items: Item[] = Array.isArray(updated.items)
    ? (updated.items as Item[])
    : (() => {
        try {
          return JSON.parse((updated.items as any) || "[]");
        } catch {
          return [];
        }
      })();

  // --- 商品名/カラー/容量 解決（バリアント→プロダクトの2段階, *取得で吸収）---
  const rawIds = items
    .map((it) => it.variant_id)
    .filter((v) => v !== undefined && v !== null) as Array<string | number>;
  const idKeys = Array.from(new Set(rawIds.map((v) => String(v))));

  let variantNameMap: Record<string, string> = {};
  let variantColorMap: Record<string, string> = {};
  let variantCapacityMap: Record<string, string> = {};
  let variantToProduct: Record<string, string> = {};

  let productNameMap: Record<string, string> = {};
  let productColorMap: Record<string, string> = {};
  let productCapacityMap: Record<string, string> = {};

  if (idKeys.length > 0) {
    // (a) product_variants から * 取得
    const { data: variants, error: vErr } = await supabaseAdmin
      .from("product_variants")
      .select("*")
      .in(
        "id",
        idKeys.every((k) => !Number.isNaN(Number(k))) ? idKeys.map((k) => Number(k)) : idKeys
      );

    if (vErr) {
      console.warn("variant fetch error:", vErr.message);
    } else if (variants && variants.length > 0) {
      for (const v of variants as any[]) {
        const vid = String(v.id);
        const vName = pickNameLike(v);
        const vColor = pickColorLike(v);
        const vCap = pickCapacityLike(v);
        if (vName) variantNameMap[vid] = vName;
        if (vColor) variantColorMap[vid] = vColor;
        if (vCap) variantCapacityMap[vid] = vCap;
        if (v.product_id != null) variantToProduct[vid] = String(v.product_id);
      }
    }

    // (b) products から * 取得
    const productIds = Array.from(new Set(Object.values(variantToProduct)));
    if (productIds.length > 0) {
      const { data: products, error: pErr } = await supabaseAdmin
        .from("products")
        .select("*")
        .in(
          "id",
          productIds.every((k) => !Number.isNaN(Number(k)))
            ? productIds.map((k) => Number(k))
            : productIds
        );

      if (pErr) {
        console.warn("product fetch error:", pErr.message);
      } else if (products && products.length > 0) {
        for (const p of products as any[]) {
          const pid = String(p.id);
          const pName = pickNameLike(p);
          const pColor = pickColorLike(p);
          const pCap = pickCapacityLike(p);
          if (pName) productNameMap[pid] = pName;
          if (pColor) productColorMap[pid] = pColor;
          if (pCap) productCapacityMap[pid] = pCap;
        }
      }
    }
  }

  // アイテムごとの表示名（商品名 / カラー / 容量）を確定
  const resolveItemDisplay = (it: Item) => {
    const key = it.variant_id != null ? String(it.variant_id) : "";

    const baseName =
      (it.name ?? undefined) ||
      (it.variant_name ?? undefined) ||
      (it.title ?? undefined) ||
      (variantNameMap[key] ?? undefined) ||
      (key && variantToProduct[key] ? productNameMap[variantToProduct[key]] : undefined) ||
      (it.product_name ?? undefined) ||
      (key ? `Variant #${key}` : "-");

    const color =
      pickColorLike(it) ||
      (variantColorMap[key] ?? undefined) ||
      (key && variantToProduct[key] ? productColorMap[variantToProduct[key]] : undefined);

    const capacity =
      pickCapacityLike(it) ||
      (variantCapacityMap[key] ?? undefined) ||
      (key && variantToProduct[key] ? productCapacityMap[variantToProduct[key]] : undefined);

    const parts = [baseName, color, capacity].filter(Boolean);
    return parts.join(" / ");
  };

  // 合計
  const totalFromItems = items.reduce(
    (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0),
    0
  );
  const acceptedAmount =
    typeof updated.total_price === "number" ? updated.total_price : totalFromItems;
  const paidAmount =
    typeof updated.final_price === "number" ? updated.final_price : acceptedAmount;

  // 申込日時 & 予約番号（申込番号）
  const appliedAt = formatDate((updated as any).created_at ?? null);
  const reservationNumber = (updated as any).reservation_number || null;

  // --- メール本文 ---
  let subject = "";
  let html = "";

  if (newStatus === "申込受付") {
    const rows = items
      .map((it) => {
        const display = resolveItemDisplay(it);
        return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${display}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${it.quantity ?? "-"}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${
            it.price != null ? yen(it.price) : "—"
          }</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${
            it.price != null && it.quantity != null ? yen(it.price * it.quantity) : "—"
          }</td>
        </tr>
        `;
      })
      .join("");

    subject = "【買取ハント】お申込みを受け付けました";
    html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;line-height:1.7;color:#222;">
      <p>${user.name ?? "お客様"} 様</p>
      <p>この度は買取ハントをご利用いただき、誠にありがとうございます。</p>
      <p>下記のお申込みを<strong>受付</strong>いたしました。<br>
      ※受付日当日中の発送またはご来店をお願いいたします。</p>

      ${reservationNumber ? `<p style="margin:8px 0;"><strong>予約番号：</strong>${reservationNumber}</p>` : ""}

      <h3 style="margin:16px 0 8px;">申込日時</h3>
      <p>${appliedAt}</p>

      <h3 style="margin:16px 0 8px;">申込者情報</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;">
        <tr><th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">氏名</th><td style="padding:6px;border:1px solid #ddd;">${user.name ?? "-"}</td></tr>
        <tr><th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">メール</th><td style="padding:6px;border:1px solid #ddd;">${user.email}</td></tr>
        <tr><th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">電話</th><td style="padding:6px;border:1px solid #ddd;">${user.phone ?? "-"}</td></tr>
        <tr><th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">住所</th><td style="padding:6px;border:1px solid #ddd;">${
          [user.postal_code, user.address].filter(Boolean).join(" ") || "-"
        }</td></tr>
      </table>

      <h3 style="margin:20px 0 8px;">お申込み商品</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;width:100%;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #ddd;background:#f8f8f8;text-align:left;">商品名 / カラー / 容量</th>
            <th style="padding:8px;border:1px solid #ddd;background:#f8f8f8;text-align:right;">数量</th>
            <th style="padding:8px;border:1px solid #ddd;background:#f8f8f8;text-align:right;">単価</th>
            <th style="padding:8px;border:1px solid #ddd;background:#f8f8f8;text-align:right;">小計</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:8px;border:1px solid #ddd;background:#fafafa;text-align:right;"><strong>合計</strong></td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;"><strong>${yen(acceptedAmount)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <p style="margin-top:8px;">商品到着後またはご来店時に査定を行い、結果はマイページでご確認いただけます。申込金額と査定金額が同額の場合は、入金のお知らせをもって査定結果の通知に代えさせていただきます。</p>
      <p style="margin-top:16px;">買取ハント</p>
    </div>
    `;
  }

  if (newStatus === "入金完了") {
    subject = "【買取ハント】ご入金が完了しました";
    html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;line-height:1.7;color:#222;">
      <p>${user.name ?? "お客様"} 様</p>
      <p>この度は買取ハントをご利用いただき、誠にありがとうございます。</p>
      <p>お申込みの<strong>入金が完了</strong>しましたので、ご連絡いたします。</p>
      ${reservationNumber ? `<p style="margin:8px 0;"><strong>申込番号：</strong>${reservationNumber}</p>` : ""}
      <p><strong>入金金額：</strong> ${yen(paidAmount)}</p>
      ${(updated as any).deduction_reason ? `<p><strong>差引理由：</strong>${(updated as any).deduction_reason}</p>` : ""}
      ${
        user.bank_name || user.branch_name || user.account_number || user.account_name
          ? `<p style="margin-top:8px;">ご登録口座：${[
              user.bank_name,
              user.branch_name,
              user.account_name,
              user.account_number ? `（番号末尾${String(user.account_number).slice(-4)}）` : null,
            ].filter(Boolean).join(" / ")}</p>`
          : ""
      }
      <p>今後とも買取ハントをよろしくお願いいたします。</p>
      <p style="margin-top:16px;">買取ハント</p>
    </div>
    `;
  }

  // 送信
  if (subject && html) {
    try {
      const transporter = await getTransport();
      await transporter.sendMail({
        from: MAIL_FROM,
        replyTo: MAIL_FROM,
        to: user.email!,
        subject,
        html,
      });
    } catch (e: any) {
      console.error("SMTP send error:", e);
      return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
