"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react"; 
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useCart } from "@/contexts/cart-context";

type ProductRow = Database["public"]["Tables"]["products"]["Row"] & {
  caution_text: string | null;
};
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];

export default function IPhoneProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const supabase = createClientComponentClient<Database>();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedCapacity, setSelectedCapacity] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 商品は常に取得（取扱停止＝可視バリアント0でも表示用に必要）
        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .select("*, caution_text")
          .eq("id", id)
          .single();
        if (prodErr || !prod) throw prodErr ?? new Error("Product not found");
        setProduct(prod);

        // バリアントは表示中のみ取得
        const { data: vars, error: varErr } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", id)
          .eq("is_hidden", false);
        if (varErr) throw varErr;
        setVariants(vars ?? []);
      } catch (e) {
        console.error("fetchData error", e);
        setError("商品情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchData();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-[600px] w-full" />
          <div>
            <Skeleton className="h-6 mb-2 w-1/2" />
            <Skeleton className="h-4 mb-4 w-full" />
            <Skeleton className="h-4 mb-2 w-1/4" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">{error || "商品が見つかりませんでした"}</p>
      </div>
    );
  }

  let imageUrl = "/placeholder.svg?height=600&width=600";
  if (product.image_url) {
    if (product.image_url.startsWith("http")) {
      imageUrl = product.image_url;
    } else {
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(product.image_url);
      imageUrl = urlData.publicUrl;
    }
  }

  const availableColors = Array.from(new Set(variants.map((v) => v.color))).filter(Boolean);
  const availableCapacities = variants
    .filter((v) => v.color === selectedColor)
    .map((v) => v.capacity)
    .filter(Boolean);

  const selectedVariant = variants.find(
    (v) => v.color === selectedColor && v.capacity === selectedCapacity
  );
  const isDiscontinued = variants.length === 0;

  const handleAddToCart = async () => {
    if (availableColors.length > 0 && !selectedColor) {
      toast({ title: "選択してください", description: "カラーを選択してください", variant: "destructive" });
      return;
    }
    if (availableCapacities.length > 0 && !selectedCapacity) {
      toast({ title: "選択してください", description: "容量を選択してください", variant: "destructive" });
      return;
    }
    if (!selectedVariant) {
      toast({ title: "エラー", description: "選択されたバリアントが無効です", variant: "destructive" });
      return;
    }

    setIsAdding(true);
    try {
      const success = await addToCart(
        String(selectedVariant.id),
        selectedColor,
        selectedCapacity,
        quantity
      );
      if (success) {
        toast({
          title: "カートに追加しました",
          description: `${product.name} (${selectedColor}, ${selectedCapacity}) ×${quantity} を追加しました。`,
        });
      } else {
        toast({ title: "エラー", description: "カートに追加できませんでした", variant: "destructive" });
      }
    } catch (e) {
      console.error("Error adding to cart:", e);
      toast({ title: "エラーが発生しました", description: "カート追加中にエラーが発生しました", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link
            href="/categories/iphone"
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary mr-4"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            iPhoneカテゴリーに戻る
          </Link>
          <h1 className="text-2xl font-bold">製品詳細</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="border rounded-lg overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.name}
            width={600}
            height={600}
            className="w-full object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-3xl font-bold">{product.name}</h2>
            <p className="text-muted-foreground mt-2">{product.description}</p>
            <div className="flex items-center mt-4">
              <Badge variant="outline" className="text-sm font-medium">
                人気商品
              </Badge>
              <Badge variant="outline" className="text-sm font-medium ml-2">
                高価買取
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {isDiscontinued ? (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm">
                現在この商品は<strong>取扱停止</strong>です。お申し込みはできません。
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">カラーを選択</label>
                  <Select value={selectedColor} onValueChange={setSelectedColor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="カラーを選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColors.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">容量を選択</label>
                  <Select
                    value={selectedCapacity}
                    onValueChange={setSelectedCapacity}
                    disabled={!selectedColor}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="容量を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCapacities.map((cap) => (
                        <SelectItem key={cap} value={cap}>
                          {cap}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedVariant && (
                  <>
                    <p className="text-sm text-gray-500 mt-2">JANコード: {selectedVariant.jan_code}</p>
                    {product.caution_text && (
                      <div className="text-sm text-red-600 mt-1 whitespace-pre-wrap">
                        {product.caution_text}
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="text-sm font-medium mb-1 block">数量</label>
                  <input
                    type="number"
                    value={quantity}
                    min={1}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4">
            {isDiscontinued ? (
              <>
                <p className="text-2xl font-bold mb-4">取扱停止</p>
                <Button type="button" size="lg" className="w-full" disabled>
                  現在お申し込みできません
                </Button>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold mb-4">
                  {selectedVariant
                    ? `¥${selectedVariant.buyback_price.toLocaleString()}`
                    : "価格を選択してください"}
                </p>
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || isAdding}
                >
                  {isAdding ? "追加中…" : "カートに入れる"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
