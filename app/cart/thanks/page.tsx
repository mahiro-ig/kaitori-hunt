// app/cart/thanks/page.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/cart-context";
import { useSession } from "next-auth/react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";

interface OrderItem {
  id: string;       // product_variants.id を文字列で保持（数値なら parseInt で変換）
  name: string;     // あとから上書き
  imageUrl: string; // あとから上書き
  variant: {
    buyback_price: number;
    color?: string;
    capacity?: string;
    type?: string;
  };
  quantity: number;
}

interface OrderData {
  items: OrderItem[];
  totalEstimate: number;
  orderNumber: string;
}

export default function ThanksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const { data: session, status } = useSession();
  const supabase = createClientComponentClient<Database>();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const didInit = useRef(false);
  const didFetchNumber = useRef(false);
  const didFetchNames = useRef(false);

  // 1) 初回ロード：sessionStorage を読み、クエリ ?rsv= があれば最優先で採用
  useEffect(() => {
    if (didInit.current) return;
    const rsv = searchParams.get("rsv");
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("orderData") : null;

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as OrderData;
        setOrderData({
          ...parsed,
          orderNumber: rsv ? String(rsv) : String(parsed?.orderNumber ?? ""),
        });
      } catch {
        // 破損していたら最小表示
        if (rsv) {
          setOrderData({
            items: [],
            totalEstimate: 0,
            orderNumber: String(rsv),
          });
        } else {
          router.replace("/");
          return;
        }
      }
      // 片付け
      sessionStorage.removeItem("orderData");
      clearCart();
      didInit.current = true;
      return;
    }

    // sessionStorage が無い場合でも rsv があれば番号だけ表示
    if (rsv) {
      setOrderData({
        items: [],
        totalEstimate: 0,
        orderNumber: String(rsv),
      });
      clearCart();
      didInit.current = true;
      return;
    }

    // 何も無ければホームへ
    router.replace("/");
  }, [router, clearCart, searchParams]);

  // 2) 予約番号の再取得（クエリ rsv が無い時のみ）
  useEffect(() => {
    if (status === "loading" || didFetchNumber.current || !orderData) return;
    const hasQueryRsv = !!searchParams.get("rsv");
    if (hasQueryRsv) return; // すでに番号が確定しているのでスキップ

    const userId = (session?.user as any)?.id;
    if (!userId) return;
    didFetchNumber.current = true;

    (async () => {
      const { data, error } = await supabase
        .from("buyback_requests")
        .select("reservation_number")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data?.reservation_number) {
        setOrderData(prev =>
          prev
            ? { ...prev, orderNumber: String(data.reservation_number) }
            : prev
        );
      }
    })();
  }, [status, session, orderData, supabase, searchParams]);

  // 3) 商品名・画像の上書き（product_variants → products）
  useEffect(() => {
    if (!orderData || didFetchNames.current || orderData.items.length === 0) return;
    didFetchNames.current = true;

    (async () => {
      console.log("[Thanks] raw items:", orderData.items);
      const rawVariantIds = orderData.items.map(i => i.id);

      // variant.id が数値に変換できるもののみ対象（UUID などはスキップ）
      const variantIdsNum = rawVariantIds
        .map(id => parseInt(id, 10))
        .filter(n => Number.isFinite(n));

      if (variantIdsNum.length === 0) {
        console.warn("[Thanks] variantIds が数値に変換できず空。名称上書きはスキップします。");
        return;
      }

      // ① product_variants から id, product_id を取得
      const { data: variantRows, error: varError } = await supabase
        .from("product_variants")
        .select("id, product_id")
        .in("id", variantIdsNum);

      if (varError || !variantRows || variantRows.length === 0) {
        console.error("[Thanks] product_variants クエリエラー:", varError);
        return;
      }

      const vidToPid = new Map<number, number>();
      (variantRows as Array<{ id: number; product_id: number }>).forEach(v =>
        vidToPid.set(v.id, v.product_id)
      );

      const productIds = Array.from(new Set(variantRows.map(v => v.product_id)));
      if (productIds.length === 0) return;

      // ② products から id, name, image_url を取得
      const { data: productRows, error: prodError } = await supabase
        .from("products")
        .select("id, name, image_url")
        .in("id", productIds);

      if (prodError || !productRows || productRows.length === 0) {
        console.error("[Thanks] products クエリエラー:", prodError);
        return;
      }

      const pidToInfo = new Map<number, { name: string; image_url: string }>();
      (productRows as Array<{ id: number; name: string; image_url: string }>).forEach(
        p => pidToInfo.set(p.id, { name: p.name, image_url: p.image_url })
      );

      // ③ items を上書き
      setOrderData(prev =>
        prev
          ? {
              ...prev,
              items: prev.items.map(item => {
                const vid = parseInt(item.id, 10);
                const pid = Number.isFinite(vid) ? vidToPid.get(vid) : undefined;
                const info = pid !== undefined ? pidToInfo.get(pid) : undefined;
                return {
                  ...item,
                  name: info?.name ?? item.name,
                  imageUrl: info?.image_url ?? item.imageUrl,
                };
              }),
            }
          : prev
      );
    })();
  }, [orderData, supabase]);

  if (!orderData) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-green-50 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">買取申込を完了しました</h1>
          <p className="text-lg text-muted-foreground mb-2">
            申込番号: <span className="font-medium">{orderData.orderNumber}</span>
          </p>
          <p className="text-muted-foreground">
            ご登録のメールアドレスに確認メールをお送りしました。
          </p>
        </div>

        {/* 申込内容 */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">申込内容</h2>
            <div className="space-y-4">
              {orderData.items.map((item) => (
                <div key={`${item.id}`} className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-md overflow-hidden">
                    <Image
                      alt={item.name || "商品画像"}
                      src={item.imageUrl || "/placeholder.svg"}
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    {item.variant.color && (
                      <p className="text-sm text-muted-foreground">カラー: {item.variant.color}</p>
                    )}
                    {item.variant.capacity && (
                      <p className="text-sm text-muted-foreground">容量: {item.variant.capacity}</p>
                    )}
                    {item.variant.type && (
                      <p className="text-sm text-muted-foreground">タイプ: {item.variant.type}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">数量: {item.quantity}</span>
                      <span className="font-semibold">
                        単価: ¥{Number(item.variant.buyback_price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <Separator className="my-4" />
              <div className="flex justify-between items-center">
                <span className="font-medium">買取見積もり合計</span>
                <span className="text-xl font-bold">
                  ¥{Number(orderData.totalEstimate).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 今後の流れ */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-2">今後の流れ</h2>
          <p className="mb-4">
            担当者が申込内容を確認後、申込受付メールをお送りします。<br />
            申込受付メールに記載の手順に従って商品を発送または店舗にご来店ください。
          </p>
          <p className="text-sm text-muted-foreground">
            ※実際の買取価格は、査定時の状態によって変動する場合があります。
          </p>
        </div>

        {/* ボタン */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" passHref>
            <Button variant="outline" className="w-full sm:w-auto">
              ホームに戻る
            </Button>
          </Link>
          <Link href="/dashboard" passHref>
            <Button className="w-full sm:w-auto">マイページへ</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
