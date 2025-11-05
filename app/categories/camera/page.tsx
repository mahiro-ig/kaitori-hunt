"use client"

// app/categories/camera/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react'; // ShoppingCart 繧貞炎髯､
import { toast } from '@/components/ui/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

import { useCart } from '@/contexts/cart-context';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// 笏笏 蝙句ｮ夂ｾｩ 笏笏
type Product = Database['public']['Tables']['products']['Row'];
type Variant = Database['public']['Tables']['product_variants']['Row'];

// 蛟､縺ｮ豁｣隕丞喧・・rim + NFKC・・const normalize = (v: unknown) => {
  const s = String(v ?? '').trim();
  // @ts-ignore
  return typeof s.normalize === 'function' ? s.normalize('NFKC') : s;
};

// 陦ｨ遉ｺ逕ｨ・・N/A" 陦ｨ遉ｺ縺ｫ邨ｱ荳
const toDisplay = (v: unknown) => {
  const s = normalize(v);
  return s ? s : 'N/A';
};
const isNA = (s: string) => normalize(s) === 'N/A';

export default function CameraCategoryPage() {
  const supabase = useMemo(() => createClientComponentClient<Database>(), []);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Variant[]>([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: prods, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('category', 'camera')
          .order('created_at', { ascending: false });
        if (prodErr) throw prodErr;
        if (!mounted) return;

        setProducts(prods ?? []);

        const ids = prods?.map((p) => p.id) ?? [];
        if (ids.length) {
          const { data: vars, error: varErr } = await supabase
            .from('product_variants')
            .select('*')
            .in('product_id', ids)
            .eq('is_hidden', false); // 笘・陦ｨ遉ｺ荳ｭ縺ｮ繝舌Μ繧｢繝ｳ繝医・縺ｿ蜿門ｾ・          if (varErr) throw varErr;
          if (!mounted) return;
          setAllVariants(vars ?? []);

          // 笘・蜿ｯ隕悶ヰ繝ｪ繧｢繝ｳ繝医′1莉ｶ繧ゅ↑縺・膚蜩√・荳隕ｧ縺九ｉ髯､螟・          const visibleIds = new Set((vars ?? []).map((v) => v.product_id));
          setProducts((prev) => prev.filter((p) => visibleIds.has(p.id)));
        } else {
          setAllVariants([]);
        }
      } catch {
        if (!mounted) return;
        setError('繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
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
    setSelectedColor('');
    setSelectedModel('');
    setIsDialogOpen(true);
  };

  const availableColors = Array.from(
    new Set(selectedVariants.map((v) => toDisplay(v.color)))
  ).filter(Boolean) as string[];

  const availableModels = selectedVariants
    .filter((v) => toDisplay(v.color) === toDisplay(selectedColor))
    .map((v) => toDisplay(v.capacity))
    .filter(Boolean) as string[];

  const handleCartSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const colorKey = toDisplay(selectedColor);
    const modelKey = toDisplay(selectedModel);

    if (!selectedProduct) {
      toast({ title: '繧ｨ繝ｩ繝ｼ', description: '蝠・刀縺碁∈謚槭＆繧後※縺・∪縺帙ｓ縲・, variant: 'destructive' });
      return;
    }
    if (!colorKey || !modelKey) {
      toast({ title: '驕ｸ謚槭＠縺ｦ縺上□縺輔＞', description: '繧ｫ繝ｩ繝ｼ縺ｨ繝｢繝・Ν繧帝∈謚槭＠縺ｦ縺上□縺輔＞', variant: 'destructive' });
      return;
    }

    if (status === 'loading') return;

    if (status !== 'authenticated') {
      toast({
        title: '繝ｭ繧ｰ繧､繝ｳ縺悟ｿ・ｦ√〒縺・,
        description: '蝠・刀繧偵き繝ｼ繝医↓霑ｽ蜉縺吶ｋ縺ｫ縺ｯ繝ｭ繧ｰ繧､繝ｳ縺励※縺上□縺輔＞縲・,
        variant: 'destructive',
      });
      const url = typeof window !== 'undefined' ? window.location.href : '/';
      // 笨・NextAuth 縺ｮ pages.signIn 縺ｫ萓晏ｭ倥○縺壹∽ｸ闊ｬ繝ｭ繧ｰ繧､繝ｳ縺ｸ閾ｪ蜑埼・遘ｻ
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(url)}`);
      return;
    }

    setIsAddingToCart(true);
    try {
      let variant = selectedVariants.find(
        (v) => toDisplay(v.color) === colorKey && toDisplay(v.capacity) === modelKey
      );

      if (!variant) {
        let q = supabase
          .from('product_variants')
          .select('id,color,capacity')
          .eq('product_id', selectedProduct.id)
          .eq('is_hidden', false); // 笘・髱櫁｡ｨ遉ｺ繧帝勁螟・
        if (isNA(colorKey)) {
          // @ts-ignore
          q = q.or('color.is.null,color.eq.N/A');
        } else {
          q = q.eq('color', normalize(colorKey));
        }

        if (isNA(modelKey)) {
          // @ts-ignore
          q = q.or('capacity.is.null,capacity.eq.N/A');
        } else {
          q = q.eq('capacity', normalize(modelKey));
        }

        const { data } = await q.maybeSingle();
        if (data) variant = { id: data.id } as Variant;
      }

      if (!variant?.id) {
        toast({
          title: '邨・∩蜷医ｏ縺帙′隕九▽縺九ｊ縺ｾ縺帙ｓ',
          description: `驕ｸ謚・ ${colorKey} / ${modelKey}`,
          variant: 'destructive',
        });
        return;
      }

      const ok = await addToCart(String(variant.id), colorKey, modelKey);
      if (ok) {
        toast({
          title: '繧ｫ繝ｼ繝医↓霑ｽ蜉縺励∪縺励◆',
          description: `${selectedProduct.name}・・{colorKey}, ${modelKey}・荏,
        });
        setIsDialogOpen(false);
      } else {
        toast({
          title: '繧ｨ繝ｩ繝ｼ',
          description: '繧ｫ繝ｼ繝医↓霑ｽ蜉縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: '繧ｨ繝ｩ繝ｼ', description: '繧ｫ繝ｼ繝郁ｿｽ蜉荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆', variant: 'destructive' });
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
      {/* 繝倥ャ繝繝ｼ・医き繝ｼ繝医い繧､繧ｳ繝ｳ蜑企勁貂医∩・・*/}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center text-sm text-muted-foreground hover:text-primary mr-4"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            繝帙・繝縺ｫ謌ｻ繧・          </Link>
          <h1 className="text-3xl font-bold">繧ｫ繝｡繝ｩ雋ｷ蜿・/h1>
        </div>
      </div>

      {/* 蝠・刀繧ｰ繝ｪ繝・ラ・壹Δ繝舌う繝ｫ2蛻・/ 繧ｿ繝悶Ξ繝・ヨ3蛻・/ PC4蛻・*/}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => {
          let imageUrl = '/placeholder.svg?height=300&width=300';
          if (product.image_url) {
            if (product.image_url.startsWith('http')) {
              imageUrl = product.image_url;
            } else {
              const { data } = supabase.storage
                .from('product-images')
                .getPublicUrl(product.image_url);
              imageUrl = data.publicUrl;
            }
          }

          return (
            <Card key={product.id} className="overflow-hidden group">
              <Link href={`/products/camera/${product.id}`} className="block relative z-0">
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
                    譛螟ｧ ﾂ･{getMaxPrice(product).toLocaleString()}
                  </p>
                </CardContent>
              </Link>

              <CardFooter className="p-3 md:p-4 pt-0 flex gap-2 relative z-10">
                <Link href={`/products/camera/${product.id}`} className="hidden md:block">
                  <Button variant="outline" size="sm">
                    隧ｳ邏ｰ繧定ｦ九ｋ
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
                  繧ｫ繝ｼ繝医↓蜈･繧後ｋ
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
            <DialogTitle>繧ｪ繝励す繝ｧ繝ｳ繧帝∈謚・/DialogTitle>
            <DialogDescription className="sr-only">
              繧ｫ繝ｩ繝ｼ縺ｨ繝｢繝・Ν繧帝∈謚槭＠縺ｦ縺上□縺輔＞
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCartSubmit}>
            <div className="grid gap-4 py-4">
              {selectedProduct && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">繧ｫ繝ｩ繝ｼ</label>

                    {!isMobile ? (
                      <Select
                        value={selectedColor}
                        onValueChange={(v) => setSelectedColor(String(v))}
                      >
                        <SelectTrigger className="w/full">
                          <SelectValue placeholder="繧ｫ繝ｩ繝ｼ繧帝∈謚・ />
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
                        <option value="">繧ｫ繝ｩ繝ｼ繧帝∈謚・/option>
                        {availableColors.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium block">繝｢繝・Ν</label>

                    {!isMobile ? (
                      <Select
                        value={selectedModel}
                        onValueChange={(v) => setSelectedModel(String(v))}
                        disabled={!selectedColor}
                      >
                        <SelectTrigger className="w/full">
                          <SelectValue placeholder="繝｢繝・Ν繧帝∈謚・ />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={!selectedColor}
                      >
                        <option value="">繝｢繝・Ν繧帝∈謚・/option>
                        {availableModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isAddingToCart}
                type="button"
              >
                繧ｭ繝｣繝ｳ繧ｻ繝ｫ
              </Button>

              <Button
                type="submit"
                disabled={
                  isAddingToCart ||
                  status === 'loading' ||
                  !selectedColor ||
                  !selectedModel
                }
              >
                {status === 'loading'
                  ? '繝ｭ繧ｰ繧､繝ｳ遒ｺ隱堺ｸｭ窶ｦ'
                  : isAddingToCart
                  ? '霑ｽ蜉荳ｭ窶ｦ'
                  : '繧ｫ繝ｼ繝医↓霑ｽ蜉'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
