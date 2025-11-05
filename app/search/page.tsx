"use client"

'use client'; 

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import NoZoomOnFocus from '@/components/NoZoomOnFocus';
import FixIOSZoom from '@/components/FixIOSZoom';

type CategoryValue = 'all' | 'iphone' | 'camera' | 'game';
const ALL_CATEGORIES: Array<Exclude<CategoryValue, 'all'>> = ['iphone', 'camera', 'game'];

type VariantRow = {
  id: string;
  created_at: string | null;
  jan_code: string | null;
  color: string | null;
  capacity: string | null;
  buyback_price: number | null;
  product_id: string | null;
  products?: {
    id: string;
    name: string | null;
    created_at: string | null;
    updated_at: string | null;
    category: 'iphone' | 'camera' | 'game' | string | null;
    image_url: string | null;
    caution_text: string | null;
  } | null;
};

export default function SearchPage() {
  const supabase = createClientComponentClient();
  const params = useSearchParams();
  const router = useRouter();

  const initialKeyword = (params.get('q') || '').trim();
  const rawCategory = (params.get('category') || '').trim();
  const initialCategory: CategoryValue =
    rawCategory === 'iphone' || rawCategory === 'camera' || rawCategory === 'game'
      ? (rawCategory as CategoryValue)
      : 'all';

  // 笘・霑ｽ蜉: visibleOnly・磯撼陦ｨ遉ｺ繝舌Μ繧｢繝ｳ繝磯勁螟悶ヵ繝ｩ繧ｰ・・
  const visibleOnly = (params.get('visibleOnly') ?? '') === '1';

  const [keyword, setKeyword] = useState(initialKeyword);
  const [category, setCategory] = useState<CategoryValue>(initialCategory);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VariantRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const janQuery = useMemo(() => {
    const onlyDigits = keyword.replace(/\D/g, '');
    if (/^\d{8}$/.test(onlyDigits) || /^\d{13}$/.test(onlyDigits)) return onlyDigits;
    return null;
  }, [keyword]);

  const selectVariant = `
    id,
    created_at,
    jan_code,
    color,
    capacity,
    buyback_price,
    product_id,
    products (
      id,
      name,
      created_at,
      updated_at,
      category,
      image_url,
      caution_text
    )
  `;

  const applyCategory = (q: any, cats: Array<Exclude<CategoryValue, 'all'>>): any => {
    if (cats.length === 1) return q.eq('products.category', cats[0]);
    if (cats.length > 1) return q.in('products.category', cats);
    return q;
  };

  const searchByJAN = async (jan: string, cats: Array<Exclude<CategoryValue, 'all'>>): Promise<VariantRow[]> => {
    let q = supabase.from('product_variants').select(selectVariant).limit(200);
    q = applyCategory(q, cats).eq('jan_code', jan);
    // 笘・霑ｽ蜉: 髱櫁｡ｨ遉ｺ繝舌Μ繧｢繝ｳ繝医ｒ髯､螟・
    if (visibleOnly) q = q.eq('is_hidden', false);
    const { data, error } = (await q) as { data: VariantRow[] | null; error: any };
    if (error) throw error;
    return data ?? [];
  };

  const searchByProductName = async (kw: string, cats: Array<Exclude<CategoryValue, 'all'>>): Promise<VariantRow[]> => {
    if (!kw) return [];
    let p = supabase.from('products').select('id').limit(200);
    if (cats.length === 1) p = p.eq('category', cats[0]);
    if (cats.length > 1) p = p.in('category', cats);
    p = p.ilike('name', `%${kw}%`);
    const { data: prodIds, error: pErr } = (await p) as { data: { id: string }[] | null; error: any };
    if (pErr) throw pErr;
    const ids = (prodIds ?? []).map(o => o.id);
    if (ids.length === 0) return [];
    let vq = supabase
      .from('product_variants')
      .select(selectVariant)
      .in('product_id', ids)
      .limit(200);
    // 笘・霑ｽ蜉: 髱櫁｡ｨ遉ｺ繝舌Μ繧｢繝ｳ繝医ｒ髯､螟・
    if (visibleOnly) vq = vq.eq('is_hidden', false);
    const { data: vars, error: vErr } = (await vq) as { data: VariantRow[] | null; error: any };
    if (vErr) throw vErr;
    return vars ?? [];
  };

  const dedupeById = (arr: VariantRow[]) => {
    const seen = new Set<string>();
    const out: VariantRow[] = [];
    for (const x of arr) {
      if (!x?.id) continue;
      if (seen.has(x.id)) continue;
      seen.add(x.id);
      out.push(x);
    }
    return out;
  };

  const runSearch = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const kw = keyword.trim();
      const cats = category === 'all' ? [...ALL_CATEGORIES] : [category];

      let merged: VariantRow[] = [];
      if (janQuery) {
        merged = await searchByJAN(janQuery, cats);
      } else {
        merged = await searchByProductName(kw, cats);
      }

      setResults(dedupeById(merged));
    } catch (e: any) {
      console.error('[search error]', e?.message || e);
      setErrorMsg('讀懃ｴ｢荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword, initialCategory, visibleOnly]); // 笘・霑ｽ蜉: visibleOnly 螟画峩縺ｫ繧ょ渚蠢・

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (keyword.trim()) p.set('q', keyword.trim());
    if (category !== 'all') p.set('category', category);
    // 笘・霑ｽ蜉: 迴ｾ蝨ｨ縺ｮ visibleOnly 繧堤ｶｭ謖・
    if (visibleOnly) p.set('visibleOnly', '1');
    router.push(`/search${p.toString() ? `?${p.toString()}` : ''}`);
  };

  return (
    <>
      <FixIOSZoom />      {/* 竊・繝壹・繧ｸ隱ｭ霎ｼ/蠕ｩ蟶ｰ譎ゅ↓蛟咲紫繧貞ｼｷ蛻ｶ繝ｪ繧ｻ繝・ヨ */}
      <NoZoomOnFocus />   {/* 竊・繝輔か繝ｼ繧ｫ繧ｹ荳ｭ縺ｮ閾ｪ蜍輔ぜ繝ｼ繝繧呈椛豁｢ */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-10">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            繝帙・繝縺ｫ謌ｻ繧・
          </Link>
        </div>

        {/* 繝輔か繝ｼ繝 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>蝠・刀讀懃ｴ｢</CardTitle>
            <CardDescription>蝠・刀蜷阪∪縺溘・ JAN 繧ｳ繝ｼ繝峨〒讀懃ｴ｢縺ｧ縺阪∪縺吶・/CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </span>
                <Input
                  type="search"
                  inputMode="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="萓具ｼ喨Phone 15 Pro / EOS R7 / 4902370******・・AN・・
                  className="pl-9 text-base md:text-sm h-12 md:h-10"
                  aria-label="讀懃ｴ｢繧ｭ繝ｼ繝ｯ繝ｼ繝・
                />
              </div>

              <div className="min-w-[180px]">
                <Select value={category} onValueChange={(v) => setCategory(v as CategoryValue)}>
                  <SelectTrigger className="text-base md:text-sm h-12 md:h-10">
                    <SelectValue placeholder="縺吶∋縺ｦ縺ｮ繧ｫ繝・ざ繝ｪ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-base md:text-sm">縺吶∋縺ｦ縺ｮ繧ｫ繝・ざ繝ｪ</SelectItem>
                    <SelectItem value="iphone" className="text-base md:text-sm">iPhone</SelectItem>
                    <SelectItem value="camera" className="text-base md:text-sm">繧ｫ繝｡繝ｩ</SelectItem>
                    <SelectItem value="game" className="text-base md:text-sm">繧ｲ繝ｼ繝</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:w-[120px]">
                <Button type="submit" className="w-full text-base md:text-sm h-12 md:h-10">
                  讀懃ｴ｢
                </Button>
              </div>
            </form>

            <p className="mt-2 text-xs text-muted-foreground">
              {janQuery
                ? `JAN 縺ｨ縺励※隱崎ｭ假ｼ・{janQuery}・亥ｮ悟・荳閾ｴ讀懃ｴ｢・荏
                : '繝偵Φ繝茨ｼ壽焚蟄励・縺ｿ8譯・13譯√・JAN縺ｨ縺励※蛻､螳壹＠縲∝ｮ悟・荳閾ｴ縺ｧ謗｢縺励∪縺吶・}
            </p>
          </CardContent>
        </Card>

        {/* 邨先棡 */}
        {loading ? (
          <p className="text-sm text-muted-foreground">讀懃ｴ｢荳ｭ窶ｦ</p>
        ) : errorMsg ? (
          <p className="text-sm text-red-600">{errorMsg}</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">隧ｲ蠖薙☆繧句膚蜩√′隕九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆縲・/p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.map((v) => {
              const productName = v.products?.name ?? '蝠・刀蜷肴悴險ｭ螳・;
              const cat = v.products?.category ?? '繧ｫ繝・ざ繝ｪ譛ｪ險ｭ螳・;
              const img = v.products?.image_url ?? null;

              return (
                <Card key={v.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base line-clamp-1">{productName}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-1">{cat}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {img && (
                      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg border">
                        <Image
                          src={img}
                          alt={productName}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-contain"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-y-1">
                      {v.jan_code && (
                        <>
                          <span className="text-muted-foreground">JAN</span>
                          <span className="font-medium">{v.jan_code}</span>
                        </>
                      )}
                      {v.color && (
                        <>
                          <span className="text-muted-foreground">繧ｫ繝ｩ繝ｼ</span>
                          <span className="font-medium">{v.color}</span>
                        </>
                      )}
                      {v.capacity && (
                        <>
                          <span className="text-muted-foreground">螳ｹ驥・/span>
                          <span className="font-medium">{v.capacity}</span>
                        </>
                      )}
                      {typeof v.buyback_price === 'number' && (
                        <>
                          <span className="text-muted-foreground">雋ｷ蜿門盾閠・ｾ｡譬ｼ</span>
                          <span className="font-semibold">{v.buyback_price.toLocaleString()} 蜀・/span>
                        </>
                      )}
                    </div>

                    <div className="pt-2">
                      {v.products?.category && v.products?.id ? (
                        <Button
                          asChild
                          className="w-full bg-black text-white hover:bg-black/90 h-12 md:h-10 text-base md:text-sm"
                        >
                          <Link href={`/products/${v.products.category}/${v.products.id}`}>
                            蝠・刀繝壹・繧ｸ
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          className="w-full bg-black text-white hover:bg-black/90 disabled:opacity-50 h-12 md:h-10 text-base md:text-sm"
                          disabled
                        >
                          蝠・刀繝壹・繧ｸ
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
