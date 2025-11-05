// app/cart/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCart } from "@/contexts/cart-context";
import { authAPI } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";


async function fetchServerCart(): Promise<{ items: any[] | null }> {
  const doFetch = async (): Promise<Response> =>
    fetch("/api/cart", {
      cache: "no-store",
      credentials: "include",
    });

  let res = await doFetch();
  if (res.status === 401) {
    
    await new Promise((r) => setTimeout(r, 80));
    res = await doFetch();
  }
  if (!res.ok) return { items: null };
  return res.json();
}


function pickFirst<T = string>(...candidates: any[]): T | "" {
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== "") {
      return c as T;
    }
  }
  return "" as unknown as T;
}

function mapUserToForm(user: any) {
  const meta = user?.user_metadata ?? {};

  const name = pickFirst(user?.name, meta?.name, meta?.full_name);
  const postalCode = pickFirst(
    user?.postal_code,
    user?.postalCode,
    meta?.postal_code,
    meta?.postalCode
  );
  const address = pickFirst(user?.address, meta?.address);
  const phone = pickFirst(
    user?.phone,
    user?.phone_number,
    user?.phoneNumber,
    meta?.phone,
    meta?.phone_number,
    meta?.phoneNumber
  );
  const email = pickFirst(user?.email, meta?.email);
  const uid = pickFirst(user?.id, user?.uid, user?.user_id);

  return {
    form: { name, postalCode, address, phone, email },
    uid: uid || null,
  };
}

// ------------------------------------
// 店頭買取の営業時間（JST）
// ------------------------------------
const BUSINESS_HOURS_BY_WEEKDAY: Record<
  number,
  | {
      openHour: number;
      openMinute?: number;
      closeHour: number;
      closeMinute?: number;
    }
  | null
> = {
  0: null,
  1: { openHour: 10, closeHour: 18 },
  2: { openHour: 10, closeHour: 18 },
  3: { openHour: 10, closeHour: 18 },
  4: { openHour: 10, closeHour: 18 },
  5: { openHour: 10, closeHour: 18 },
  6: { openHour: 10, closeHour: 17 },
};

function z2(n: number) {
  return String(n).padStart(2, "0");
}
function formatRange(h: {
  openHour: number;
  openMinute?: number;
  closeHour: number;
  closeMinute?: number;
}) {
  const om = h.openMinute ?? 0;
  const cm = h.closeMinute ?? 0;
  return `${z2(h.openHour)}:${z2(om)}–${z2(h.closeHour)}:${z2(cm)}`;
}
function getTodayHoursLabelJST(): string | null {
  const nowUtc = new Date();
  const jst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
  const wd = jst.getUTCDay();
  const h = BUSINESS_HOURS_BY_WEEKDAY[wd];
  return h ? formatRange(h) : null;
}

export default function CartPage() {
  const router = useRouter();
  const { items, removeFromCart, clearCart } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false); 

  // 買取方法
  const [purchaseMethod, setPurchaseMethod] = useState<"shipping" | "instore">("shipping");
  const todayHoursLabel = getTodayHoursLabelJST();

  
  const supabase = createClientComponentClient<Database>();
  const [userId, setUserId] = useState<string | null>(null);


  const [serverItems, setServerItems] = useState<any[] | null>(null);
  const [loadingServerItems, setLoadingServerItems] = useState<boolean>(true);

  const refreshServerItems = useCallback(async () => {
    setLoadingServerItems(true);
    try {
      const data = await fetchServerCart();
      
      setServerItems(data.items ?? null);
    } catch {
      setServerItems(null);
    } finally {
      setLoadingServerItems(false);
    }
  }, []);

  useEffect(() => {
    refreshServerItems();
  }, [refreshServerItems]);

  useEffect(() => {
    const onFocus = () => refreshServerItems();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshServerItems]);

  
  const displayItems = useMemo(() => {
    return Array.isArray(serverItems) && serverItems.length > 0 ? serverItems : items;
  }, [serverItems, items]);

  // 見積合計
  const totalEstimate = (displayItems || []).reduce(
    (sum, item) => sum + Number(item?.variant?.buyback_price || 0) * Number(item?.quantity || 0),
    0
  );

  // 商品の数量合計
  const totalQuantity = (displayItems || []).reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0),
    0
  );

  // フォーム状態
  const [formData, setFormData] = useState({
    name: "",
    postalCode: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const prefilledRef = useRef(false);

  
  useEffect(() => {
    if (prefilledRef.current) return;

    (async () => {
      try {
        let baseUser: any = {};

       
        const { data: authData } = await supabase.auth.getUser();
        const sUser = authData?.user ?? null;
        if (sUser) {
          baseUser = {
            id: pickFirst(baseUser?.id, sUser.id),
            email: pickFirst(baseUser?.email, (sUser as any)?.email),
            user_metadata: pickFirst(baseUser?.user_metadata, (sUser as any)?.user_metadata) || {},
          };

          
          const { data: dbUser } = await supabase
            .from("users")
            .select("id,email,name,phone,postal_code,address")
            .eq("id", sUser.id)
            .maybeSingle();

          if (dbUser) {
            baseUser = {
              ...baseUser,
              id: pickFirst(baseUser?.id, dbUser.id),
              email: pickFirst(baseUser?.email, dbUser.email),
              name: pickFirst(baseUser?.name, dbUser.name),
              phone: pickFirst(baseUser?.phone, dbUser.phone),
              postal_code: pickFirst(
                baseUser?.postal_code,
                (baseUser as any)?.postalCode,
                dbUser.postal_code
              ),
              address: pickFirst(baseUser?.address, dbUser.address),
            };
          }
        }

       
        try {
          const res = await authAPI.getCurrentUser();
          const maybe =
            (res as any)?.data?.user ?? (res as any)?.user ?? (res as any)?.data ?? res;
          if (maybe) {
            baseUser = {
              ...baseUser,
              id: pickFirst(baseUser?.id, maybe?.id, maybe?.uid, maybe?.user_id),
              email: pickFirst(baseUser?.email, maybe?.email),
              name: pickFirst(baseUser?.name, maybe?.name),
              phone: pickFirst(
                baseUser?.phone,
                maybe?.phone,
                maybe?.phone_number,
                maybe?.phoneNumber,
                maybe?.user_metadata?.phone
              ),
              postal_code: pickFirst(
                baseUser?.postal_code,
                (baseUser as any)?.postalCode,
                maybe?.postal_code,
                maybe?.postalCode,
                maybe?.user_metadata?.postal_code,
                maybe?.user_metadata?.postalCode
              ),
              address: pickFirst(baseUser?.address, maybe?.address, maybe?.user_metadata?.address),
              user_metadata: pickFirst(baseUser?.user_metadata, maybe?.user_metadata) || {},
            };
          }
        } catch {}

        const { form, uid } = mapUserToForm(baseUser);
        setFormData((prev) => ({ ...prev, ...form }));
        if (uid) setUserId(uid);

        prefilledRef.current = true;
      } catch (err) {
        console.error("ユーザー情報プリセット失敗:", err);
      }
    })();
  }, []); 

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "お名前を入力してください";
    if (purchaseMethod === "shipping") {
      if (!formData.postalCode.trim()) newErrors.postalCode = "郵便番号を入力してください";
      if (!formData.address.trim()) newErrors.address = "住所を入力してください";
    }
    if (!formData.phone.trim()) newErrors.phone = "電話番号を入力してください";
    if (!formData.email.trim()) newErrors.email = "メールアドレスを入力してください";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "有効なメールアドレスを入力してください";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 数量変更
  const [pendingQtyIds, setPendingQtyIds] = useState<Record<string, boolean>>({});

  const patchQuantityOnServer = useCallback(
    async (id: string, nextQty: number) => {
      const res = await fetch(`/api/cart/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: nextQty }),
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push("/auth/login?redirect=/cart");
        return { ok: false };
      }
      if (res.status === 409) {
        clearCart();
        setServerItems([]);
        toast({
          title: "カートの有効期限が切れました",
          description: "30分を超えたため、カートをリセットしました。もう一度商品を追加してください。",
          variant: "destructive",
        });
        return { ok: false };
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({} as any));
        throw new Error(payload?.error || "数量の更新に失敗しました");
      }
      return { ok: true };
    },
    [router, clearCart]
  );

  const handleQuantityChange = useCallback(
    async (id: string, nextQtyRaw: number) => {
      const nextQty = Math.max(1, Math.min(999, Number.isFinite(nextQtyRaw) ? nextQtyRaw : 1));

      setServerItems((prev) => {
        if (!prev) return prev;
        return prev.map((it) => (it.id === id ? { ...it, quantity: nextQty } : it));
      });
      setPendingQtyIds((p) => ({ ...p, [id]: true }));
      try {
        const { ok } = await patchQuantityOnServer(id, nextQty);
        if (ok) {
          await refreshServerItems();
        }
      } catch (e: any) {
        console.error(e);
        toast({
          title: "エラー",
          description: e?.message ?? "数量の更新に失敗しました",
          variant: "destructive",
        });
        await refreshServerItems();
      } finally {
        setPendingQtyIds((p) => {
          const { [id]: _, ...rest } = p;
          return rest;
        });
      }
    },
    [patchQuantityOnServer, refreshServerItems]
  );

  const handleRemove = async (id: string) => {
    try {
      setServerItems((prev) => (prev ? prev.filter((it) => it.id !== id) : prev));
      removeFromCart(id);
    } finally {
      await refreshServerItems();
    }
  };

  
  const ensureUserId = useCallback(async (): Promise<string | null> => {
    if (userId) return userId;

    try {
      const res = await authAPI.getCurrentUser();
      const maybe =
        (res as any)?.data?.user ?? (res as any)?.user ?? (res as any)?.data ?? res;
      const uidNA = pickFirst(maybe?.id, maybe?.uid, maybe?.user_id);
      if (uidNA) return uidNA as string;
    } catch {}

    try {
      const { data } = await supabase.auth.getUser();
      const sid = data?.user?.id ?? null;
      if (sid) return sid;
    } catch {}

    return null;
  }, [userId, supabase]);

  // 申込送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[cart] submit: clicked");
    if (isSubmitting) {
      console.log("[cart] submit: blocked (isSubmitting=true)");
      return;
    }

    if (!validateForm()) {
      console.log("[cart] submit: validation failed", { formData, purchaseMethod });
      toast({
        title: "入力内容を確認してください",
        description: "未入力または形式不正の項目があります。",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    toast({ title: "送信開始", description: "申込処理を開始しました…" });

    try {
      // A. いまの userId を確定
      console.log("[cart] resolve userId…");
      const ensuredUserId = await ensureUserId();
      if (!ensuredUserId) {
        console.log("[cart] submit: UNAUTHORIZED (no userId)");
        toast({
          title: "ログインが必要です",
          description: "ログイン後にもう一度お試しください。",
          variant: "destructive",
        });
        router.push("/auth/login?redirect=/cart");
        return;
      }
      console.log("[cart] userId =", ensuredUserId);

      
      const basisItems =
        (Array.isArray(serverItems) && serverItems.length > 0 ? serverItems : items) ?? [];
      if (basisItems.length === 0) {
        console.log("[cart] submit: CART_EMPTY (display basis is empty)");
        toast({
          title: "カートが空です",
          description: "画面を更新して、もう一度お試しください。",
          variant: "destructive",
        });
        return;
      }

      
      const cartItemsPayload = basisItems.map((it: any) => ({
        variant: {
          id: String(it?.variant?.id ?? it?.product_variant_id ?? it?.pv_id ?? it?.id ?? ""),
          buyback_price: Number(it?.variant?.buyback_price ?? it?.buyback_price ?? it?.price ?? 0),
        },
        quantity: Number(it?.quantity ?? it?.qty ?? 1),
      }));

      const totalPricePayload = cartItemsPayload.reduce(
        (s: number, it: any) => s + it.variant.buyback_price * it.quantity,
        0
      );

      console.log("[cart] POST /api/buyback/request", {
        count: cartItemsPayload.length,
        total: totalPricePayload,
      });

      // D. 申込APIへPOST
      const resp = await fetch("/api/buyback/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cartItemsPayload,
          totalPrice: totalPricePayload,
          purchaseMethod,
        }),
        credentials: "include",
        cache: "no-store",
      });

      const json = await resp.json().catch(() => ({}));
      console.log("[cart] /api/buyback/request response", resp.status, json);

      if (resp.status === 401) {
        toast({ title: "ログインが必要です", variant: "destructive" });
        router.push("/auth/login?redirect=/cart");
        return;
      }
      if (!resp.ok) {
        throw new Error(json?.error || `申込に失敗しました (status ${resp.status})`);
      }

      // Thanks
      const itemsForStorage = basisItems.map((item: any) => ({
        id: String(item?.variant?.id ?? item?.id ?? ""),
        name: item?.product?.name ?? "",
        imageUrl: item?.imageUrl ?? "",
        variant: {
          buyback_price: Number(item?.variant?.buyback_price ?? 0),
          color: item?.variant?.color ?? "",
          capacity: item?.variant?.capacity ?? "",
        },
        quantity: Number(item?.quantity ?? 0),
      }));

      sessionStorage.setItem(
        "orderData",
        JSON.stringify({
          items: itemsForStorage,
          totalEstimate: basisItems.reduce(
            (sum: number, it: any) =>
              sum + Number(it?.variant?.buyback_price || 0) * Number(it?.quantity || 0),
            0
          ),
          orderNumber:
            (json?.request?.reservation_number &&
              String(json.request.reservation_number)) ||
            json?.request?.id ||
            "",
          purchaseMethod,
        })
      );

      
      setIsNavigating(true);          
      router.replace("/cart/thanks"); 
      await clearCart();              
      setServerItems([]);             
      toast({ title: "買取申込を受け付けました" });
      console.log("[cart] success → thanks");
      return;
    } catch (err: any) {
      console.error("[cart] submit FAILED:", err);
      toast({
        title: "エラー",
        description: err?.message ?? "申込に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      console.log("[cart] submit: done");
    }
  };

  const QuantityStepper = ({
    id,
    value,
    disabled,
    onCommit,
  }: {
    id: string;
    value: number;
    disabled?: boolean;
    onCommit: (q: number) => void;
  }) => {
    const [local, setLocal] = useState<number>(Number(value || 1));
    const typingTimer = useRef<number | null>(null);

    useEffect(() => {
      setLocal(Number(value || 1));
    }, [value]);

    const commit = (q: number) => onCommit(Math.max(1, Math.min(999, Math.floor(q))));

    const bump = (delta: number) => {
      const next = Math.max(1, Math.min(999, (local || 1) + delta));
      setLocal(next);
      commit(next);
    };

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseInt(e.target.value, 10);
      const next = Number.isFinite(raw) ? raw : 1;
      setLocal(next);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => commit(next), 200) as unknown as number;
    };

    return (
      <div className="flex items-center gap-1 md:gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm"
          onClick={() => bump(-1)}
          disabled={disabled || pendingQtyIds[id]}
        >
          −
        </Button>

        <Input
          type="number"
          className="
            w-14 h-8 text-center text-xs
            md:w-16 md:h-9 md:text-sm
          "
          min={1}
          max={999}
          value={local}
          onChange={onChange}
          disabled={disabled || pendingQtyIds[id]}
          inputMode="numeric"
          pattern="[0-9]*"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm"
          onClick={() => bump(1)}
          disabled={disabled || pendingQtyIds[id]}
        >
          ＋
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link
          href="/"
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary mr-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          ホームに戻る
        </Link>
        <h1 className="text-2xl font-bold">買取カート</h1>
      </div>

      {/* ローディング中のフォールバック */}
      {loadingServerItems && serverItems === null ? (
        <div className="text-center py-12 text-muted-foreground">読み込み中…</div>
      ) : (displayItems ?? []).length === 0 && !isNavigating ? ( 
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">カートに商品がありません</h2>
          <p className="text-muted-foreground mb-6">
            買取を希望する商品をカートに追加してください。
          </p>
          <Link href="/">
            <Button>ホームに戻る</Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {/* 左：商品リストとフォーム */}
          <div className="md:col-span-2 space-y-6">
            {/* 商品一覧 */}
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">買取希望商品</h2>
              <ul className="space-y-4">
                {(displayItems ?? []).map((item: any) => (
                  <li key={item.id} className="flex items-center space-x-4">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item?.product?.name ?? "item image"}
                        width={80}
                        height={80}
                        className="object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-sm text-gray-500">No Image</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item?.product?.name ?? ""}</p>
                      <p className="text-sm text-gray-600">
                        カラー: {item?.variant?.color ?? "-"}
                      </p>
                      <p className="text-sm text-gray-600">
                        容量: {item?.variant?.capacity ?? "-"}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <p>
                        単価: ¥
                        {Number(item?.variant?.buyback_price ?? 0).toLocaleString()}
                      </p>

                      <QuantityStepper
                        id={item.id}
                        value={Number(item?.quantity ?? 1)}
                        disabled={false}
                        onCommit={(q) => handleQuantityChange(item.id, q)}
                      />

                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemove(item.id)}
                          disabled={pendingQtyIds[item.id]}
                        >
                          削除
                        </Button>
                      </div>

                      <p className="font-semibold">
                        小計: ¥
                        {(
                          Number(item?.variant?.buyback_price ?? 0) * Number(item?.quantity ?? 0)
                        ).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 買取方法の選択 */}
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">買取方法</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <label
                  className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer ${
                    purchaseMethod === "shipping" ? "border-primary" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="purchaseMethod"
                    value="shipping"
                    checked={purchaseMethod === "shipping"}
                    onChange={() => setPurchaseMethod("shipping")}
                  />
                  <span>郵送買取</span>
                </label>

                <label
                  className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer ${
                    purchaseMethod === "instore" ? "border-primary" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="purchaseMethod"
                    value="instore"
                    checked={purchaseMethod === "instore"}
                    onChange={() => setPurchaseMethod("instore")}
                  />
                  <span>店頭買取</span>
                </label>
              </div>

              {purchaseMethod === "instore" ? (
                <Alert>
                  <AlertDescription>
                    店頭買取は
                    {todayHoursLabel ? (
                      <>本日の営業時間内（{todayHoursLabel}）にご来店ください。</>
                    ) : (
                      <>本日は休業日のため受付できません。営業日にお申し込みください。</>
                    )}
                    来店時間の指定は不要です。
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription>
                    郵送買取の支払い方法は銀行振込のみとなります。振込先情報はマイページでご登録ください。
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* お客様情報・書類案内・フォーム */}
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">お客様情報</h2>

              {purchaseMethod === "shipping" && (
                <>
                  <Alert className="mb-4">
                    <AlertDescription>
                      発送先: 〒950-0087 新潟県新潟市中央区東大通1-2-30 第3マルカビル 10F 五十嵐商事株式会社 査定部宛
                    </AlertDescription>
                  </Alert>

                  <div className="mb-6 border-2 border-yellow-300 bg-yellow-50 rounded p-4">
                    <p className="font-medium mb-2">
                      郵送買取をご利用の方は必要書類のご同封をお願いします：
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>
                        買取依頼書／買取同意書（記入・署名の上、必ず同封してください）
                        <Link
                          href="/docs/買取依頼書_買取同意書.pdf"
                          target="_blank"
                          className="ml-2 underline hover:text-primary"
                        >
                          買取依頼書をダウンロード
                        </Link>
                      </li>
                      <li>住民票の写し（原本）※初回の方のみ</li>
                    </ul>
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 入力フォーム */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">お名前</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">
                      郵便番号{purchaseMethod === "instore" && ""}
                    </Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={errors.postalCode ? "border-destructive" : ""}
                    />
                    {errors.postalCode && (
                      <p className="text-sm text-destructive">{errors.postalCode}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">
                    住所{purchaseMethod === "instore" && ""}
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={errors.address ? "border-destructive" : ""}
                  />
                  {errors.address && (
                    <p className="text-sm text-destructive">{errors.address}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">電話番号</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input id="email" name="email" value={formData.email} disabled className="bg-muted" />
                </div>

                {purchaseMethod === "shipping" && (
                  <div className="border border-gray-200 bg-gray-100 rounded p-4">
                    <p className="text-sm">
                      郵送買取の支払い方法は銀行振込のみとなります。振込先情報はマイページでご登録ください。
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "送信中..." : "買取を申し込む"}
                </Button>
              </form>
            </div>
          </div>

          {/* 申込内容の確認サイドバー */}
          <div className="md:col-span-1">
            <div className="sticky top-6 rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">申込内容の確認</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">商品数</span>
                  <span>{totalQuantity}点</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">見積合計</span>
                  <span className="font-semibold">¥{totalEstimate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">買取方法</span>
                  <span className="font-medium">
                    {purchaseMethod === "shipping" ? "郵送買取" : "店頭買取"}
                  </span>
                </div>
                {purchaseMethod === "instore" && (
                  <div className="text-sm text-muted-foreground">
                    本日の受付時間：
                    {todayHoursLabel ? <span>{todayHoursLabel}</span> : <span>本日休業</span>}
                  </div>
                )}
                <Separator />
                <p className="text-sm text-muted-foreground">
                  ※実際の価格は状態により変動します。
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  申込を送信すると{" "}
                  <Link href="/terms" className="underline underline-offset-2">
                    利用規約
                  </Link>{" "}
                  に同意したことになります。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 遷移中のオーバーレイ*/}
      {isNavigating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/70 backdrop-blur-sm">
          <div className="rounded-lg border bg-white px-6 py-4 shadow">
            <p className="font-medium">まもなく申込が完了します…</p>
            <p className="text-sm text-muted-foreground mt-1">数秒お待ちください</p>
          </div>
        </div>
      )}
    </div>
  );
}
