// app/categories/game/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";

import { useCart } from "@/contexts/cart-context";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Variant = Database["public"]["Tables"]["product_variants"]["Row"];

// 文字正規化 (trim + NFKC)
const normalize = (v: unknown) => {
  const s = String(v ?? "").trim();
  // @ts-ignore
  return typeof s.normalize === "function" ? s.normalize("NFKC") : s;
};
// 表示用（空なら "N/A"）
const toDisplay = (v: unknown) => {
  const s = normalize(v);
  return s ? s : "N/A";
};
const isNA = (s: string) => normalize(s) === "N/A";

export default function GameCategoryPage() {
  const supabase = useMemo(() => createClientComponentClient<Database>(), []);
  const router = useRouter();
  const { status } = useSession();
  const { addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Variant[]>([]);
  const [selectedColor, setSelectedColor] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // データ取得
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: prods, error: prodErr } = await supabase
          .from("products")
          .select("*")
          .eq("category", "game")
          .order("created_at", { ascending: false });
        if (prodErr) throw prodErr;
        if (!mounted) return;

        setProducts(prods ?? []);

        const ids = prods?.map((p) => p.id) ?? [];
        if (ids.length) {
          const { data: vars, error: varErr } = await supabase
            .from("product_variants")
            .select("*")
            .in("product_id", ids)
            .eq("is_hidden", false);
          if (varErr) throw varErr;
          if (!mounted) return;

          setAllVariants(vars ?? []);

          // 表示可能なバリアントがある商品のみ残す
          const visibleIds = new Set((vars ?? []).map((v) => v.product_id));
          setProducts((prev) => prev.filter((p) => visibleIds.has(p.id)));
        } else {
          setAllVariants([]);
        }
      } catch {
        if (!mounted) return;
        setError("データの取得に失敗しました。");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const getMaxPrice = (product: Product) => {
    const vs = allVariants.filter((v) => v.product_id === product.id);
    return vs.length ? Math.max(...vs.map((v) => v.buyback_price)) : 0;
  };

  const openCartDialog = (product: Product) => {
    setSelectedProduct(product);
    const vs = allVariants.filter((v) => v.product_id === product.id);
    setSelectedVariants(vs);
    setSelectedColor("");
    setIsDialogOpen(true);
  };

  const availableColors = Array.from(
    new Set(selectedVariants.map((v) => toDisplay(v.color)))
  ).filter(Boolean) as string[];

  const handleCartSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const colorKey = toDisplay(selectedColor);

    if (!selectedProduct) {
      toast({
        title: "エラー",
        description: "商品が選択されていません。",
        variant: "destructive",
      });
      return;
    }
    if (!colorKey) {
      toast({
        title: "未入力です",
        description: "カラーを選択してください。",
        variant: "destructive",
      });
      return;
    }

    if (status === "loading") return;
    if (status !== "authenticated") {
      toast({
        title: "ログインが必要です",
        description:
          "カートに追加するにはログインが必要です。ログイン画面へ移動します。",
        variant: "destructive",
      });
      const url = typeof window !== "undefined" ? window.location.href : "/";
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(url)}`);
      return;
    }

    setIsAddingToCart(true);
    try {
      let variant = selectedVariants.find(
        (v) => toDisplay(v.color) === colorKey
      );

      if (!variant) {
        // 念のためDB再問い合わせ
        let q = supabase
          .from("product_variants")
          .select("id,color")
          .eq("product_id", selectedProduct.id)
          .eq("is_hidden", false);

        if (isNA(colorKey)) {
          // @ts-ignore
          q = q.or("color.is.null,color.eq.N/A");
        } else {
          q = q.eq("color", normalize(colorKey));
        }

        const { data } = await q.maybeSingle();
        if (data) variant = { id: data.id } as Variant;
      }

      if (!variant?.id) {
        toast({
          title: "商品が見つかりません",
          description: `選択：${colorKey}`,
          variant: "destructive",
        });
        return;
      }

      const ok = await addToCart(String(variant.id), colorKey, "");
      if (ok) {
        toast({
          title: "カートに追加しました",
          description: `${selectedProduct.name}（${colorKey}）`,
        });
        setIsDialogOpen(false);
      } else {
        toast({
          title: "エラー",
          description: "カートに追加に失敗しました。",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "エラー",
        description: "カート処理中に問題が発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

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
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー（戻る＋タイトル） */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center text-sm text-muted-foreground hover:text-primary mr-4"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            トップへ戻る
          </Link>
          <h1 className="text-3xl font-bold">ゲーム</h1>
        </div>
      </div>

      {/* グリッド：SP2 / TB3 / PC4 列 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => {
          let imageUrl = "/placeholder.svg?height=300&width=300";
          if (product.image_url) {
            if (product.image_url.startsWith("http")) {
              imageUrl = product.image_url;
            } else {
              const { data } = supabase.storage
                .from("product-images")
                .getPublicUrl(product.image_url);
              imageUrl = data.publicUrl;
            }
          }

          return (
            <Card key={product.id} className="overflow-hidden group">
              <Link
                href={`/products/game/${product.id}`}
                className="block relative z-0"
              >
                <CardHeader className="p-0">
                  <div className="relative aspect-square">
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4">
                  <CardTitle className="text-base md:text-lg mb-1 line-clamp-2">
                    {product.name}
                  </CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground mb-2 line-clamp-2">
                    {product.description}
                  </p>
                  <p className="font-bold text-base md:text-lg">
                    買取上限 ¥{getMaxPrice(product).toLocaleString()}
                  </p>
                </CardContent>
              </Link>

              <CardFooter className="p-3 md:p-4 pt-0 flex gap-2 relative z-10">
                <Link
                  href={`/products/game/${product.id}`}
                  className="hidden md:block"
                >
                  <Button variant="outline" size="sm">
                    詳細を見る
                  </Button>
                </Link>

                <Button
                  size="sm"
                  className="w-full md:w-auto"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openCartDialog(product);
                  }}
                >
                  カートに入れる
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-[425px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>オプションを選択</DialogTitle>
            <DialogDescription className="sr-only">
              カラーを選択してください
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCartSubmit}>
            <div className="grid gap-4 py-4">
              {selectedProduct && (
                <div className="space-y-2">
                  <label className="text-sm font-medium block">カラー</label>

                  {!isMobile ? (
                    <Select
                      value={selectedColor}
                      onValueChange={(v) => setSelectedColor(String(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="カラーを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColors.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                    >
                      <option value="">カラーを選択</option>
                      {availableColors.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isAddingToCart}
                type="button"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isAddingToCart || status === "loading" || !selectedColor}
              >
                {status === "loading"
                  ? "ログイン確認中…"
                  : isAddingToCart
                  ? "追加中…"
                  : "カートに追加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
