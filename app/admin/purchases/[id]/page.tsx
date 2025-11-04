"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, User as UserIcon, Mail, Phone, Home } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineIcon,
  TimelineTitle,
  TimelineContent,
  TimelineDot,
} from "@/components/ui/timeline";
import { Input } from "@/components/ui/input"; // 金額入力に使用

// ========== 型 ==========
type VariantLite = {
  id: number;
  color: string | null;
  capacity: string | null;
  // products.id は UUID（string）
  product: { id: string; name: string | null; image_url: string | null } | null;
};

type Item = {
  product_name: string | null;
  jan_code: string | null;
  image_url: string | null;
  price: number | null; // 申込当時の単価
  quantity: number | null;
  variant_id?: number | null;
  variant?: VariantLite | null; // 参照で補強
};

type StatusHistory = {
  id: string;
  previous_status: string;
  new_status: string;
  changed_at: string;
};

type BuyMethodLabel = "郵送買取" | "店頭買取" | "不明";

type BuybackRequest = {
  id: string;
  reservation_number: string;
  items: Item[];
  total_price: number;
  status: string;
  verification_status: string | null;
  purchase_method_raw?: string | null;
  purchase_method?: BuyMethodLabel;
  final_price?: number | null;
  deduction_reason?: string | null;
  is_assessed?: boolean | null;

  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    postal_code: string;
    bank_name: string;
    branch_name: string;
    account_type: string;
    account_number: string;
    account_name: string;
  };
};

// ========== ユーザー側APIロジックと整合する method 推定 ==========
function normalizeMethod(val: unknown): "shipping" | "instore" | null {
  if (typeof val === "string") {
    const v = val.toLowerCase();
    if (v === "shipping") return "shipping";
    if (v === "instore" || v === "in_store" || v === "store") return "instore";
    if (/(mail|post|postal|delivery|shipment|courier|yuso|postage|郵送|宅配|配送)/.test(v))
      return "shipping";
    if (/(instore|in_store|store|walkin|walk_in|counter|shop|tentou|tenpo|来店|店頭|持込)/.test(v))
      return "instore";
  }
  if (typeof val === "number") {
    if (val === 1) return "shipping";
    if (val === 2) return "instore";
  }
  return null;
}

function inferMethodFromRecord(r: Record<string, any>): "shipping" | "instore" | null {
  const directKeys = [
    "purchase_method",
    "fulfillment_type",
    "method",
    "type",
    "channel",
    "mode",
    "order_type",
    "orderType",
  ];
  for (const k of directKeys) {
    if (k in r) {
      const n = normalizeMethod(r[k]);
      if (n) return n;
    }
  }
  if (typeof r.instore === "boolean" && r.instore) return "instore";
  if (typeof r.shipping === "boolean" && r.shipping) return "shipping";

  const hasAnyKey = (obj: any, keys: string[]) => !!obj && keys.some((k) => k in obj);

  const shippingHints = [
    "shipping_address",
    "shippingAddress",
    "recipient",
    "recipient_name",
    "postal_code",
    "zip",
    "address",
    "address1",
    "address2",
    "prefecture",
    "city",
    "label_url",
    "tracking_number",
    "shipment",
    "delivery",
    "is_postal",
    "courier",
    "pickup_requested",
    "pickup_date",
  ];
  const storeHints = [
    "store_id",
    "storeId",
    "store_code",
    "storeName",
    "branch",
    "counter",
    "visit_date",
    "dropoff_slot",
    "dropoffTime",
    "in_store",
    "instore",
    "walk_in",
  ];
  if (hasAnyKey(r, shippingHints)) return "shipping";
  if (hasAnyKey(r, storeHints)) return "instore";

  for (const k of ["meta", "metadata", "extra", "context", "detail"]) {
    const o = r[k];
    if (o && typeof o === "object") {
      for (const dk of directKeys) {
        if (dk in o) {
          const n = normalizeMethod(o[dk]);
          if (n) return n;
        }
      }
      if (hasAnyKey(o, shippingHints)) return "shipping";
      if (hasAnyKey(o, storeHints)) return "instore";
    }
  }

  return null;
}

function toJapaneseLabel(n: "shipping" | "instore" | null): BuyMethodLabel {
  if (n === "shipping") return "郵送買取";
  if (n === "instore") return "店頭買取";
  return "不明";
}

// ========== UI パーツ ==========
function MethodBadge({ method }: { method?: BuyMethodLabel }) {
  if (method === "郵送買取")
    return <Badge className="bg-blue-100 text-blue-800">郵送買取</Badge>;
  if (method === "店頭買取")
    return <Badge className="bg-green-100 text-green-800">店頭買取</Badge>;
  return <Badge className="bg-gray-100 text-gray-800">不明</Badge>;
}

// 数値化ヘルパー（null/undefined/空文字 → null）
const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// 申込当時の価格キー候補のみを採用（現在価格っぽいキーは除外）
const pickOrderUnitPrice = (it: any): number | null => {
  const candidates = [
    "price", // 例: {"price":195000}
    "order_price",
    "buy_price",
    "unit_price_at_order",
    "base_price_at_order",
    "agreed_unit_price",
  ];
  for (const k of candidates) {
    if (it?.[k] !== undefined && it?.[k] !== null && it?.[k] !== "") {
      return toNum(it[k]);
    }
  }
  return toNum(it?.price ?? null);
};

export default function PurchaseDetailPage() {
  const params = useParams();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params?.id[0]
      : undefined;

  const supabase = createClientComponentClient();

  const [purchase, setPurchase] = useState<BuybackRequest | null>(null);
  const [histories, setHistories] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 査定確定（減額）用 state
  const [assessPrice, setAssessPrice] = useState<number>(0);
  const [assessReason, setAssessReason] = useState<string>("");
  const [isAssessing, setIsAssessing] = useState<boolean>(false);

  const getStatusColor = (s: string) => {
    switch (s) {
      case "申込受付":
        return "bg-blue-100 text-blue-800";
      case "査定開始":
        return "bg-purple-100 text-purple-800";
      case "査定中":
        return "bg-yellow-100 text-yellow-800";
      case "査定完了":
        return "bg-green-100 text-green-800";
      case "入金処理":
        return "bg-orange-100 text-orange-800";
      case "入金完了":
        return "bg-red-100 text-red-800";
      case "キャンセル済み":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // --- Supabase から “保存そのまま” の items/total_price ---
  const fetchOriginalFromSupabase = async (reqId: string): Promise<{
    record: any | null;
    items: any[];
    total_price: number | null;
  } | null> => {
    const { data, error } = await supabase
      .from("buyback_requests")
      .select("*")
      .eq("id", reqId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("supabase original fetch error:", error);
      return null;
    }
    if (!data) return null;

    let rawItems: any[] = [];
    if (Array.isArray(data.items)) rawItems = data.items;
    else if (typeof data.items === "string") {
      try {
        rawItems = JSON.parse(data.items || "[]");
      } catch {
        rawItems = [];
      }
    }
    return {
      record: data,
      items: rawItems,
      total_price: toNum(data.total_price),
    };
  };

  // final_price 等の補完（万一 API が欠損している場合）
  const fetchAssessFromSupabase = async (reqId: string) => {
    const { data, error } = await supabase
      .from("buyback_requests")
      .select("final_price, deduction_reason, is_assessed, status")
      .eq("id", reqId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("supabase assess fields fetch error:", error);
      return {
        final_price: undefined,
        deduction_reason: undefined,
        is_assessed: undefined,
        status: undefined,
      } as {
        final_price?: number | null;
        deduction_reason?: string | null;
        is_assessed?: boolean | null;
        status?: string;
      };
    }
    return data as {
      final_price?: number | null;
      deduction_reason?: string | null;
      is_assessed?: boolean | null;
      status?: string;
    };
  };

  const fetchMethodFromSupabase = async (reqId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from("buyback_requests")
      .select("*")
      .eq("id", reqId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("supabase purchase_method fetch error:", error);
      return null;
    }
    return data ? (data as any).purchase_method ?? null : null;
  };

  // --- 参照補強: variant_id -> product_variants(UUID product_id) -> products ---
  const enrichItemsWithVariants = async (rawItems: any[]): Promise<Item[]> => {
    // variant_id を抽出（数値）
    const variantIds = Array.from(
      new Set(
        rawItems
          .map((it) => (it?.variant_id != null ? Number(it.variant_id) : null))
          .filter((v): v is number => Number.isFinite(v))
      )
    );

    // variant map（key: variant.id:number）
    const variantMap = new Map<
      number,
      { id: number; color: string | null; capacity: string | null; product_id: string | null; jan_code: string | null }
    >();

    if (variantIds.length > 0) {
      const { data: variantData, error: variantErr } = await supabase
        .from("product_variants")
        .select("id, color, capacity, product_id, jan_code") // product_id は UUID(string)
        .in("id", variantIds);

      if (variantErr) {
        console.warn("product_variants fetch error:", variantErr);
      } else {
        for (const v of (variantData || [])) {
          variantMap.set(Number(v.id), {
            id: Number(v.id),
            color: v.color ?? null,
            capacity: v.capacity ?? null,
            product_id: v.product_id ?? null, // UUID
            jan_code: v.jan_code ?? null,
          });
        }
      }
    }

    // product_id(UUID string) 抽出
    const productIdSet = new Set<string>();
    for (const v of variantMap.values()) {
      if (typeof v.product_id === "string" && v.product_id.trim() !== "") {
        productIdSet.add(v.product_id);
      }
    }
    const productIds = Array.from(productIdSet);

    // product map（key: products.id:string(UUID)）
    const productMap = new Map<string, { id: string; name: string | null; image_url: string | null }>();
    if (productIds.length > 0) {
      const { data: productData, error: productErr } = await supabase
        .from("products")
        .select("id, name, image_url")
        .in("id", productIds); // ← UUID をそのまま .in()

      if (productErr) {
        console.warn("products fetch error:", productErr);
      } else {
        for (const p of (productData || [])) {
          productMap.set(String(p.id), {
            id: String(p.id),
            name: p.name ?? null,
            image_url: p.image_url ?? null,
          });
        }
      }
    }

    // Item 正規化 + 参照合成
    const items: Item[] = rawItems.map((it: any) => {
      const unitPrice = pickOrderUnitPrice(it);
      const quantity = toNum(it?.quantity);
      const variantId = Number.isFinite(Number(it?.variant_id)) ? Number(it.variant_id) : null;

      let variant: VariantLite | null = null;
      let jan_code_from_variant: string | null = null;

      if (variantId && variantMap.has(variantId)) {
        const v = variantMap.get(variantId)!;
        jan_code_from_variant = v.jan_code ?? null;

        const p = v.product_id ? productMap.get(String(v.product_id)) ?? null : null;

        variant = {
          id: v.id,
          color: v.color,
          capacity: v.capacity,
          product: p ? { id: p.id, name: p.name, image_url: p.image_url } : null,
        };
      }

      // 表示優先順（要件：products.image_url を優先）
      const image_url: string | null =
        (variant?.product?.image_url ?? null) /* products.image_url */ ??
        (typeof it?.image_url === "string" ? it.image_url : null);

      const product_name: string | null = it?.product_name ?? (variant?.product?.name ?? null);
      const jan_code: string | null = it?.jan_code ?? jan_code_from_variant ?? null;

      return {
        product_name,
        jan_code,
        image_url,
        price: unitPrice,
        quantity,
        variant_id: variantId,
        variant,
      };
    });

    return items;
  };

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1) API から基本情報（ユーザー、履歴など）
      const res = await fetch(`/api/admin/buyback-requests/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET /api/admin/buyback-requests/${id} ${res.status} ${text}`);
      }
      const json = await res.json();
      const req = json.request as any;

      // 2) Supabase から “保存されたままの items/total_price + record全体（method推定で使用）”
      const original = req?.id ? await fetchOriginalFromSupabase(String(req.id)) : null;

      // original.items を採用（無ければ API の items をパース）
      const rawItems: any[] =
        original?.items && Array.isArray(original.items)
          ? original.items
          : Array.isArray(req.items)
          ? req.items
          : (() => {
              try {
                return JSON.parse(req.items || "[]");
              } catch {
                return [];
              }
            })();

      // 3) items を variant/product 情報で補強（UUID対応）
      const items: Item[] = await enrichItemsWithVariants(rawItems);

      // 4) 方式推定（ユーザー側API準拠）→ 日本語バッジ
      const recordForMethod = original?.record ?? req ?? {};
      const methodNormalized =
        normalizeMethod(recordForMethod.purchase_method) ?? // ← まずは purchase_method
        normalizeMethod(recordForMethod.fulfillment_type) ??
        normalizeMethod(recordForMethod.method) ??
        normalizeMethod(recordForMethod.type) ??
        normalizeMethod(recordForMethod.channel) ??
        (typeof recordForMethod.instore === "boolean" && recordForMethod.instore
          ? "instore"
          : null) ??
        (typeof recordForMethod.shipping === "boolean" && recordForMethod.shipping
          ? "shipping"
          : null) ??
        inferMethodFromRecord(recordForMethod);

      const methodLabel: BuyMethodLabel = toJapaneseLabel(methodNormalized);

      // 5) final_price 等が API 側で欠損なら Supabase で補完
      let final_price = req.final_price;
      let deduction_reason = req.deduction_reason;
      let is_assessed = req.is_assessed;
      let statusFromApi = req.status;

      if (req?.id && (typeof final_price === "undefined" || final_price === null)) {
        const filled = await fetchAssessFromSupabase(String(req.id));
        if (typeof final_price === "undefined" || final_price === null)
          final_price = filled.final_price ?? final_price;
        if (typeof deduction_reason === "undefined")
          deduction_reason = filled.deduction_reason ?? deduction_reason;
        if (typeof is_assessed === "undefined") is_assessed = filled.is_assessed ?? is_assessed;
        if (typeof statusFromApi === "undefined") statusFromApi = filled.status ?? statusFromApi;
      }

      // 6) 合計金額は DB 保存値を最優先（無ければ items から再計算）
      const totalPriceFromDb = original?.total_price ?? toNum(req.total_price);
      const fallbackTotal =
        items.reduce((sum, it) => sum + (it.price ?? 0) * (it.quantity ?? 0), 0) || 0;
      const reliableTotal = (totalPriceFromDb ?? fallbackTotal) ?? 0;

      const u = req.user as any;
      const next: BuybackRequest = {
        id: req.id,
        reservation_number: req.reservation_number,
        items,
        total_price: reliableTotal,
        status: statusFromApi,
        verification_status: json.verification_status ?? null,
        purchase_method_raw: recordForMethod?.purchase_method ?? null,
        purchase_method: methodLabel,
        final_price: toNum(final_price),
        deduction_reason: deduction_reason ?? null,
        is_assessed: Boolean(is_assessed ?? false),
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          address: u.address,
          postal_code: u.postal_code,
          bank_name: u.bank_name,
          branch_name: u.branch_name,
          account_type: u.account_type,
          account_number: u.account_number,
          account_name: u.account_name,
        },
      };

      setPurchase(next);
      setStatus(statusFromApi);
      setHistories(json.histories as StatusHistory[]);

      const initialAssessPrice = (next.final_price as number | null) ?? reliableTotal ?? 0;
      setAssessPrice(Number(initialAssessPrice) || 0);
      setAssessReason((next.deduction_reason as string | null) ?? "");
    } catch (e) {
      console.error("fetch error:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = async () => {
    if (!purchase) return;
    if (status === purchase.status && !note.trim()) {
      alert("ステータス変更または備考の入力がありません。");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1) ステータス変更を伴うときは、メール自動送信用APIを呼ぶ
      if (status !== purchase.status) {
        const mailRes = await fetch(`/api/buyback/update-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ requestId: purchase.id, newStatus: status }),
        });
        if (!mailRes.ok) {
          const text = await mailRes.text().catch(() => "");
          console.error("POST /api/buyback/update-status failed", {
            status: mailRes.status,
            body: text,
          });
          try {
            const err = JSON.parse(text);
            throw new Error(err?.error || `ステータス更新（メール送信）に失敗しました (${mailRes.status})`);
          } catch {
            throw new Error(`ステータス更新（メール送信）に失敗しました (${mailRes.status})`);
          }
        }
      }

      // 2) 備考がある場合のみ、従来のAPIで備考を保存（UIはそのまま）
      if (note.trim().length > 0) {
        const res = await fetch(`/api/admin/buyback-requests/${purchase.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ id: purchase.id, status, note }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("PATCH /api/admin/buyback-requests/[id] failed", {
            status: res.status,
            statusText: res.statusText,
            body: text,
          });
          try {
            const err = JSON.parse(text);
            throw new Error(err?.message || `備考の保存に失敗しました (${res.status})`);
          } catch {
            throw new Error(`備考の保存に失敗しました (${res.status})`);
          }
        }
      }

      await fetchData();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "更新に失敗しました（詳細はConsoleを確認）");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 査定確定（減額）ハンドラ（楽観的更新あり）
  const handleAssessConfirm = async () => {
    if (!purchase) return;
    if (!Number.isFinite(assessPrice) || assessPrice < 0) {
      alert("確定金額は0以上の数値で入力してください。");
      return;
    }
    try {
      setIsAssessing(true);
      const res = await fetch(`/api/admin/buyback-requests/${purchase.id}/adjust`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          final_price: Number(assessPrice),
          reason: assessReason ?? "",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "査定確定に失敗しました");
      }

      // 楽観更新
      setPurchase((prev) =>
        prev
          ? {
              ...prev,
              final_price: Number(assessPrice),
              deduction_reason: assessReason ?? "",
              is_assessed: true,
              status: "査定完了",
            }
          : prev
      );

      await fetchData();
      alert("査定を確定しました。");
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "査定確定に失敗しました");
    } finally {
      setIsAssessing(false);
    }
  };

  if (loading || !purchase) {
    return <div className="p-6">読み込み中...</div>;
  }

  const isAssessed = purchase.is_assessed === true || purchase.status === "査定完了";
  const finalPrice = purchase.final_price;

  return (
    <div className="container py-10">
      {/* Back & Title */}
      <div className="mb-4">
        <Link
          href="/admin/purchases"
          className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          買取一覧に戻る
        </Link>
      </div>

      <h1 className="mt-2 text-2xl font-bold">買取詳細: {purchase.reservation_number}</h1>
      <div className="mt-2">
        <span className="text-sm text-gray-500 mr-2">買取方法</span>
        <MethodBadge method={purchase.purchase_method} />
        {purchase.purchase_method_raw && (
          <span className="ml-2 text-xs text-muted-foreground">（raw: {purchase.purchase_method_raw}）</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {/* Products */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>買取商品</CardTitle>
              <CardDescription>商品の詳細情報（UUID対応のvariant参照で補強）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {purchase.items.map((item, idx) => {
                const displayName =
                  item.product_name ?? item.variant?.product?.name ?? "商品名不明";
                const displayImg =
                  item.image_url /* products.image_url 優先（API側 or 参照補強） */ ??
                  item.variant?.product?.image_url ??
                  null;
                const variantText = [item.variant?.color || undefined, item.variant?.capacity || undefined]
                  .filter(Boolean)
                  .join(" / ");

                return (
                  <div key={idx} className="flex items-center space-x-4">
                    {displayImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={displayImg}
                        alt={displayName}
                        className="w-20 h-20 object-cover rounded"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          console.warn("image load error:", displayImg);
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                        No Image
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        JAN: {item.jan_code ?? "—"}
                        {item.variant_id ? (
                          <>
                            {" "} | VariantID: {item.variant_id}
                            {variantText ? ` (${variantText})` : ""}
                          </>
                        ) : null}
                      </p>
                      <p className="text-sm">
                        ¥{item.price != null ? Number(item.price).toLocaleString() : "—"} ×{" "}
                        {item.quantity != null ? item.quantity : "—"} 点
                      </p>
                    </div>
                  </div>
                );
              })}
              <Separator className="my-4" />
              <div className="text-right font-bold">
                合計金額: ¥{Number(purchase.total_price ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {/* 査定確定（減額）カード */}
          <Card>
            <CardHeader>
              <CardTitle>査定確定（減額）</CardTitle>
              <CardDescription>承認ボタンを押すと「確定金額」として即時反映されます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">申込金額</p>
                  <p className="text-lg font-semibold">
                    ¥{Number(purchase.total_price ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">現在の確定金額</p>
                  <p className="text-lg font-semibold">
                    {finalPrice != null ? `¥${Number(finalPrice).toLocaleString()}` : "未確定"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={isAssessed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {isAssessed ? "確定済み" : "未確定"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">確定金額</p>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={assessPrice}
                  onChange={(e) => setAssessPrice(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">減額理由（任意）</p>
                <Textarea
                  placeholder="外箱つぶれ / 付属品不足 など"
                  value={assessReason}
                  onChange={(e) => setAssessReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button className="w-full" onClick={handleAssessConfirm} disabled={isAssessing}>
                  {isAssessing ? "確定中..." : "承認して確定"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>買取ステータス履歴</CardTitle>
              <CardDescription>ステータス変更の履歴</CardDescription>
            </CardHeader>
            <CardContent>
              <Timeline>
                {histories.map((h) => (
                  <TimelineItem key={h.id}>
                    <TimelineConnector />
                    <TimelineHeader>
                      <TimelineIcon>
                        <TimelineDot className={getStatusColor(h.new_status)} />
                      </TimelineIcon>
                      <TimelineTitle>
                        {h.previous_status} → {h.new_status}
                      </TimelineTitle>
                    </TimelineHeader>
                    <TimelineContent>
                      <p className="text-sm text-gray-500">{new Date(h.changed_at).toLocaleString()}</p>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardContent>
          </Card>
        </div>

        {/* Customer & Action */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>顧客情報</CardTitle>
              <CardDescription>申し込みユーザー</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <UserIcon className="h-10 w-10 rounded-full bg-gray-200 p-2" />
                <div>
                  <p className="text-lg font-semibold">{purchase.user.name}</p>
                  <Badge
                    className={
                      purchase.verification_status === "verified"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {purchase.verification_status === "verified" ? "本人確認済み" : "未確認"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">買取方法</p>
                <MethodBadge method={purchase.purchase_method} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Home className="mr-2 h-4 w-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-500">住所</p>
                </div>
                <p>
                  {purchase.user.postal_code} {purchase.user.address}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Phone className="mr-2 h-4 w-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-500">電話番号</p>
                </div>
                <p>{purchase.user.phone}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-500">メール</p>
                </div>
                <p>{purchase.user.email}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">振込先情報</p>
                <p>
                  {purchase.user.bank_name} / {purchase.user.branch_name}
                </p>
                <p>
                  {purchase.user.account_type}：{purchase.user.account_number}
                </p>
                <p>名義：{purchase.user.account_name}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>アクション</CardTitle>
              <CardDescription>ステータス更新と備考</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">現在のステータス</p>
                <Badge className={getStatusColor(purchase.status)}>{purchase.status}</Badge>
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="申込受付">申込受付</SelectItem>
                  <SelectItem value="査定開始">査定開始</SelectItem>
                  <SelectItem value="査定中">査定中</SelectItem>
                  <SelectItem value="査定完了">査定完了</SelectItem>
                  <SelectItem value="入金処理">入金処理</SelectItem>
                  <SelectItem value="入金完了">入金完了</SelectItem>
                  <SelectItem value="キャンセル済み">キャンセル済み</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="備考（任意）" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button className="w-full" onClick={handleUpdate} disabled={isSubmitting}>
                {isSubmitting ? "更新中..." : "ステータスを更新"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
