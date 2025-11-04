// app/api/buyback/update-status/route.ts
export const runtime = "nodejs";         // nodemailer を使うので Edge 不可
export const dynamic = "force-dynamic";  // 常に実行時評価

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"; // ← 遅延初期化版に切替
import { sendMail } from "@/lib/mailer";                // ← 遅延初期化のメールユーティリティ

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

const yen = (v: number) => `¥${Math.round(v).toLocaleString()}`;
const formatDate = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
};

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
  return obj.color || obj.colour || obj.variant_color || obj.color_name || obj.colour_name;
}
function normalizeCapacity(val: any): string | undefined {
  if (val == null) return undefined;
  if (typeof val === "number") {
    if (val >= 1000 && val % 1000 === 0) return `${val / 1000}TB`;
    return `${val}GB`;
  }
  const s = String(val);
  if (/\b(GB|TB)\b/i.test(s)) return s;
  if (/^\d+$/.test(s)) return `${s}GB`;
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
  // ← ここで初めて Service Role を生成（ビルド時に env を評価しない）
  const supabaseAdmin = getSupabaseAdmin();

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

  // ステータス更新
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("buyback_requests")
    .update({ status: newStatus })
    .eq("id", requestId)
    .select("*")
    .single();
  if (updateErr || !updated) {
    return NextResponse.json({ error: updateErr?.message ?? "update failed" }, { status: 500 });
  }

  // 履歴登録（失敗は致命ではない）
  await supabaseAdmin.from("purchase_status_history").insert({
    buyback_request_id: updated.id,
    previous_status: before.status,
    new_status: newStatus,
    changed_at: new Date().toISOString(),
  });

  // ユーザー情報
  const { data: user } = await supabaseAdmin
    .from("users")
    .select(
      "email, name, phone, postal_code, address, bank_name, branch_name, account_number, account_name"
    )
    .eq("id", updated.user_id)
    .single();

  // 対象外 or 宛先なしなら通知スキップ
  if (!["申込受付", "入金完了"].includes(newStatus) || !user?.email) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // items
  const items: Item[] = Array.isArray(updated.items)
    ? (updated.items as Item[])
    : (() => {
        try {
          return JSON.parse((updated.items as any) || "[]");
        } catch {
          return [];
        }
      })();

  // バリアント/プロダクト名解決
  const rawIds = items.map((it) => it.variant_id).filter((v) => v != null) as Array<string | number>;
  const idKeys = Array.from(new Set(rawIds.map((v) => String(v))));

  let variantNameMap: Record<string, string> = {};
  let variantColorMap: Record<string, string> = {};
  let variantCapacityMap: Record<string, string> = {};
  let variantToProduct: Record<string, string> = {};
  let productNameMap: Record<string, string> = {};
  let productColorMap: Record<string, string> = {};
  let productCapacityMap: Record<string, string> = {};

  if (idKeys.length > 0) {
    const { data: variants } = await supabaseAdmin
      .from("product_variants")
      .select("*")
      .in(
        "id",
        idKeys.every((k) => !Number.isNaN(Number(k))) ? idKeys.map((k) => Number(k)) : idKeys
      );

    for (const v of (variants as any[]) ?? []) {
      const vid = String(v.id);
      const vName = pickNameLike(v);
      const vColor = pickColorLike(v);
      const vCap = pickCapacityLike(v);
      if (vName) variantNameMap[vid] = vName;
      if (vColor) variantColorMap[vid] = vColor;
      if (vCap) variantCapacityMap[vid] = vCap;
      if (v?.product_id != null) variantToProduct[vid] = String(v.product_id);
    }

    const productIds = Array.from(new Set(Object.values(variantToProduct)));
    if (productIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from("products")
        .select("*")
        .in(
          "id",
          productIds.every((k) => !Number.isNaN(Number(k)))
            ? productIds.map((k) => Number(k))
            : productIds
        );

      for (const p of (products as any[]) ?? []) {
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

    return [baseName, color, capacity].filter(Boolean).join(" / ");
  };

  const totalFromItems = items.reduce(
    (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0),
    0
  );
  const acceptedAmount =
    typeof updated.total_price === "number" ? updated.total_price : totalFromItems;
  const paidAmount =
    typeof updated.final_price === "number" ? updated.final_price : acceptedAmount;

  const appliedAt = formatDate((updated as any).created_at ?? null);
  const reservationNumber = (updated as any).reservation_number || null;

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
        </tr>`;
      })
      .join("");

    subject = "【買取ハント】お申込みを受け付けました";
    html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;line-height:1.7;color:#222;">
      <p>${user?.name ?? "お客様"} 様</p>
      <p>この度は買取ハントをご利用いただき、誠にありがとうございます。</p>
      <p>下記のお申込みを<strong>受付</strong>いたしました。<br>
      ※受付日当日中の発送またはご来店をお願いいたします。</p>

      ${reservationNumber ? `<p style="margin:8px 0;"><strong>予約番号：</strong>${reservationNumber}</p>` : ""}

      <h3 style="margin:16px 0 8px;">申込日時</h3>
      <p>${appliedAt}</p>

      <h3 style="margin:16px 0 8px;">申込者情報</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;">
        <tr><th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">氏名</th><td style="padding:6px;border:1px solid #ddd;">${user?.name ?? "-"}</td></tr>
        <tr><th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">メール</th><td style="padding:6px;border:1px solid #ddd;">${user?.email ?? "-"}</td></tr>
        <tr><th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">電話</th><td style="padding:6px;border:1px solid #ddd;">${user?.phone ?? "-"}</td></tr>
        <tr><th style="padding:6px;border:1px solid #ddd;background:#f8f8f8;">住所</th><td style="padding:6px;border:1px solid #ddd;">${
          [user?.postal_code, user?.address].filter(Boolean).join(" ") || "-"
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
    </div>`;
  }

  if (newStatus === "入金完了") {
    subject = "【買取ハント】ご入金が完了しました";
    html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;line-height:1.7;color:#222;">
      <p>${user?.name ?? "お客様"} 様</p>
      <p>この度は買取ハントをご利用いただき、誠にありがとうございます。</p>
      <p>お申込みの<strong>入金が完了</strong>しましたので、ご連絡いたします。</p>
      ${reservationNumber ? `<p style="margin:8px 0;"><strong>申込番号：</strong>${reservationNumber}</p>` : ""}
      <p><strong>入金金額：</strong> ${yen(
        typeof updated.final_price === "number" ? updated.final_price : acceptedAmount
      )}</p>
      ${(updated as any).deduction_reason ? `<p><strong>差引理由：</strong>${(updated as any).deduction_reason}</p>` : ""}
      ${
        user?.bank_name || user?.branch_name || user?.account_number || user?.account_name
          ? `<p style="margin-top:8px;">ご登録口座：${[
              user?.bank_name,
              user?.branch_name,
              user?.account_name,
              user?.account_number ? `（番号末尾${String(user.account_number).slice(-4)}）` : null,
            ].filter(Boolean).join(" / ")}</p>`
          : ""
      }
      <p>今後とも買取ハントをよろしくお願いいたします。</p>
      <p style="margin-top:16px;">買取ハント</p>
    </div>`;
  }

  // 送信（lib/mailer の遅延初期化を利用）
  if (subject && html && user?.email) {
    try {
      await sendMail(
        {
          from:
            process.env.EMAIL_FROM ??
            process.env.SMTP_FROM ??
            process.env.SMTP_USER ??
            '"買取ハント" <no-reply@kaitori-hunt.jp>',
          to: user.email,
          subject,
          html,
        },
        // 本番は REQUIRE_SMTP=1 or NODE_ENV=production で厳格化（mailer 側既定）
        undefined
      );
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message ?? "send failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
