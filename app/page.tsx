"use client"

'use client';

import { useEffect, useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, Gamepad, Smartphone, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
// import { Header } from "@/components/header"; // 竊・蜑企勁
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

/* ======================
   縺顔衍繧峨○陦ｨ遉ｺ・亥酔讒矩繝ｻ蜊雁・鬮倥＆繝ｻ荳ｭ遶矩・濶ｲ・・   ====================== */
type NewsRow = {
  id: string;
  title: string;
  body: string | null;
  published_at: string; // ISO
  is_active: boolean;
};

function NewsSection() {
  const [news, setNews] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("news")
        .select("id,title,body,published_at,is_active")
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .limit(3);
      if (!error) setNews(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="w-full py-6 md:py-8">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">繝九Η繝ｼ繧ｹ</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl">
              譛譁ｰ縺ｮ縺顔衍繧峨○
            </p>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-4xl">
          {loading ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ窶ｦ</CardTitle>
                <CardDescription>蟆代・♀蠕・■縺上□縺輔＞縲・/CardDescription>
              </CardHeader>
            </Card>
          ) : news.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">迴ｾ蝨ｨ縺顔衍繧峨○縺ｯ縺ゅｊ縺ｾ縺帙ｓ</CardTitle>
                <CardDescription>蜈ｬ髢倶ｸｭ縺ｮ縺顔衍繧峨○縺瑚ｿｽ蜉縺輔ｌ繧九→陦ｨ遉ｺ縺輔ｌ縺ｾ縺吶・/CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <ul className="text-sm md:text-base text-foreground space-y-2">
                  {news.map((n) => (
                    <li key={n.id} className="leading-6">
                      <span className="font-medium">
                        {new Date(n.published_at).toLocaleDateString("ja-JP")}
                      </span>
                      <span className="mx-2">・・/span>
                      <Link
                        href={`/news/${n.id}`}
                        className="font-medium hover:underline underline-offset-4"
                      >
                        {n.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="flex justify-end px-6 pb-4">
                <Link href="/news" className="text-sm md:text-base underline underline-offset-4 hover:opacity-80">
                  縺吶∋縺ｦ縺ｮ縺顔衍繧峨○繧定ｦ九ｋ
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<"" | "iphone" | "camera" | "game">("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session)
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 笘・菫ｮ豁｣迚茨ｼ夐撼陦ｨ遉ｺ繝舌Μ繧｢繝ｳ繝医ｒ髯､螟悶☆繧九ヱ繝ｩ繝｡繝ｼ繧ｿ繧定ｿｽ蜉
  const onSubmitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (category) params.set("category", category);
    // 陦ｨ遉ｺ荳ｭ縺ｮ繝舌Μ繧｢繝ｳ繝医・縺ｿ繧貞ｯｾ雎｡縺ｫ縺吶ｋ繝輔Λ繧ｰ繧定ｿｽ蜉
    params.set("visibleOnly", "1");

    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header 縺ｯ layout 邨檎罰縺ｧ蜃ｺ縺ｦ繧九・縺ｧ縺薙％縺ｧ縺ｯ謠冗判縺励↑縺・*/}

      <main className="flex-1">
        {/* ====== HERO ====== */}
        <section className="w-full py-6 md:py-12 lg:py-16 bg-muted">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-10 xl:gap-12 place-items-center">
              <div className="flex flex-col justify-center space-y-3 w-full">
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tighter sm:text-4xl xl:text-5xl/none lg:whitespace-nowrap lg:leading-none">
                    蝗ｽ蜀・怙鬮伜､雋ｷ蜿悶・蜊ｳ譌･迴ｾ驥大喧
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-lg">
                    iPhone繝ｻ繧ｫ繝｡繝ｩ繝ｻ繧ｲ繝ｼ繝繧貞｣ｲ繧九↑繧芽ｲｷ蜿悶ワ繝ｳ繝・br />
                    蜊ｳ譌･譟ｻ螳壹・譛遏ｭ蜈･驥代〒譁ｰ蜩√ｒ繧ｹ繝繝ｼ繧ｺ縺ｫ迴ｾ驥大喧
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href={session ? '/dashboard' : '/auth/register'}>
                    <Button size="lg">
                      譁ｰ隕冗匳骭ｲ
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/how-it-works">
                    <Button variant="outline" size="lg">
                      雋ｷ蜿悶・豬√ｌ
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-center w-full">
                <div className="w-full max-w-[320px]">
                  <Image
                    src="/images/logo-symbol.png"
                    width={320}
                    height={320}
                    alt="繝ｭ繧ｴ"
                    priority
                    className="rounded-lg object-contain w-full aspect-square"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====== SEARCH BAR ====== */}
        <section aria-label="蝠・刀讀懃ｴ｢" className="w-full py-4 md:py-6">
          <div className="mx-auto max-w-4xl px-4 md:px-6">
            <form
              onSubmit={onSubmitSearch}
              className="rounded-2xl border bg-background p-3 md:p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <input
                    type="search"
                    inputMode="search"
                    aria-label="繧ｭ繝ｼ繝ｯ繝ｼ繝画､懃ｴ｢"
                    placeholder="JAN繧ｳ繝ｼ繝峨・蝠・刀蜷阪〒讀懃ｴ｢"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full rounded-xl border bg-background pl-9 pr-3 h-12 md:h-10 text-base md:text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="sr-only">繧ｫ繝・ざ繝ｪ</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full md:w-[180px] rounded-xl border bg-background px-3 h-12 md:h-10 text-base md:text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">縺吶∋縺ｦ縺ｮ繧ｫ繝・ざ繝ｪ</option>
                    <option value="iphone">iPhone</option>
                    <option value="camera">繧ｫ繝｡繝ｩ</option>
                    <option value="game">繧ｲ繝ｼ繝</option>
                  </select>
                </div>

                <div className="md:w-[120px]">
                  <Button type="submit" className="w-full h-12 md:h-10 text-base md:text-sm rounded-xl">
                    讀懃ｴ｢
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                萓・ 縲景Phone 17 Pro 256GB縲阪郡witch 譛画ｩ檸L縲・              </div>
            </form>
          </div>
        </section>

        {/* ====== 縺顔衍繧峨○ ====== */}
        <NewsSection />

        {/* ====== 雋ｷ蜿悶き繝・ざ繝ｪ繝ｼ ====== */}
        <section className="w-full py-12 md:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">雋ｷ蜿悶き繝・ざ繝ｪ繝ｼ</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl">
                  蟆る摩繧ｹ繧ｿ繝・ヵ縺御ｸ∝ｯｧ縺ｫ譟ｻ螳壹＠縲∝ｸょｴ萓｡蛟､縺ｫ蝓ｺ縺･縺・◆驕ｩ豁｣萓｡譬ｼ縺ｧ雋ｷ蜿悶＞縺溘＠縺ｾ縺吶・                </p>
              </div>
            </div>

            <div className="mx-auto mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 max-w-6xl">
              <Link href="/categories/iphone" className="group relative overflow-hidden rounded-lg border p-6 hover:border-primary">
                <div className="flex flex-col items-center space-y-4">
                  <div className="rounded-full bg-muted p-4">
                    <Smartphone className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold">iPhone</h3>
                  <p className="text-muted-foreground text-center">
                    譛譁ｰ繝｢繝・Ν縺九ｉ驕主悉縺ｮ繝｢繝・Ν縺ｾ縺ｧ縲∵眠蜩∵悴菴ｿ逕ｨ蜩√ｒ鬮倅ｾ｡雋ｷ蜿悶＞縺溘＠縺ｾ縺吶・                  </p>
                  <Button variant="outline" className="mt-2 group-hover:bg-primary group-hover:text-primary-foreground">
                    隧ｳ邏ｰ繧定ｦ九ｋ
                  </Button>
                </div>
              </Link>

              <Link href="/categories/camera" className="group relative overflow-hidden rounded-lg border p-6 hover:border-primary">
                <div className="flex flex-col items-center space-y-4">
                  <div className="rounded-full bg-muted p-4">
                    <Camera className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold">繧ｫ繝｡繝ｩ</h3>
                  <p className="text-muted-foreground text-center">
                    荳逵ｼ繝ｬ繝輔√Α繝ｩ繝ｼ繝ｬ繧ｹ縲√さ繝ｳ繝代け繝医き繝｡繝ｩ縺ｪ縺ｩ縲∵眠蜩∵悴菴ｿ逕ｨ蜩√ｒ雋ｷ蜿悶＠縺ｦ縺・∪縺吶・                  </p>
                  <Button variant="outline" className="mt-2 group-hover:bg-primary group-hover:text-primary-foreground">
                    隧ｳ邏ｰ繧定ｦ九ｋ
                  </Button>
                </div>
              </Link>

              <Link href="/categories/game" className="group relative overflow-hidden rounded-lg border p-6 hover:border-primary">
                <div className="flex flex-col items-center space-y-4">
                  <div className="rounded-full bg-muted p-4">
                    <Gamepad className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold">繧ｲ繝ｼ繝</h3>
                  <p className="text-muted-foreground text-center">
                    繧ｲ繝ｼ繝讖滓悽菴薙ｄ繧ｽ繝輔ヨ縲∝捉霎ｺ讖溷勣縺ｪ縺ｩ譁ｰ蜩∵悴菴ｿ逕ｨ蜩√ｒ蟷・ｺ・￥雋ｷ蜿門ｯｾ蠢懊＠縺ｦ縺・∪縺吶・                  </p>
                  <Button variant="outline" className="mt-2 group-hover:bg-primary group-hover:text-primary-foreground">
                    隧ｳ邏ｰ繧定ｦ九ｋ
                  </Button>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ====== 雋ｷ蜿悶・豬√ｌ ====== */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">雋ｷ蜿悶・豬√ｌ</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl">
                  邁｡蜊・繧ｹ繝・ャ繝励〒縲√≠縺ｪ縺溘・陬ｽ蜩√ｒ鬮倅ｾ｡雋ｷ蜿悶＞縺溘＠縺ｾ縺吶・                </p>
              </div>
            </div>

            <div className="mx-auto mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 max-w-6xl">
              <div className="flex flex-col items-center space-y-4 rounded-lg border bg-background p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  1
                </div>
                <h3 className="text-xl font-bold">莨壼藤逋ｻ骭ｲ繝ｻ繝ｭ繧ｰ繧､繝ｳ</h3>
                <p className="text-muted-foreground text-center">
                  邁｡蜊倥↑莨壼藤逋ｻ骭ｲ縺ｧ縲∬ｲｷ蜿門ｱ･豁ｴ縺ｮ邂｡逅・ｄ迚ｹ蜈ｸ縺悟女縺代ｉ繧後∪縺吶・                </p>
              </div>

              <div className="flex flex-col items-center space-y-4 rounded-lg border bg-background p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  2
                </div>
                <h3 className="text-xl font-bold">雋ｷ蜿也筏霎ｼ</h3>
                <p className="text-muted-foreground text-center">
                  螢ｲ繧翫◆縺・｣ｽ蜩√ｒ繧ｫ繝ｼ繝医↓蜈･繧後※縲∬ｲｷ蜿也筏霎ｼ繧偵＠縺ｾ縺励ｇ縺・・                </p>
              </div>

              <div className="flex flex-col items-center space-y-4 rounded-lg border bg-background p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  3
                </div>
                <h3 className="text-xl font-bold">驛ｵ騾√・譟ｻ螳壹・雋ｷ蜿匁・遶・/h3>
                <p className="text-muted-foreground text-center">
                  陬ｽ蜩√ｒ驛ｵ騾√ｂ縺励￥縺ｯ蠎苓・縺ｫ縺頑戟縺｡霎ｼ縺ｿ縺・◆縺縺阪∝ｰる摩繧ｹ繧ｿ繝・ヵ縺梧渊螳壹りｲｷ蜿夜≡鬘阪↓縺皮ｴ榊ｾ励＞縺溘□縺代ｌ縺ｰ雋ｷ蜿匁・遶九〒縺吶・                </p>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <Link href="/auth/register">
                <Button size="lg">
                  莉翫☆縺蝉ｼ壼藤逋ｻ骭ｲ縺吶ｋ
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ====== FOOTER ====== */}
      <footer role="contentinfo" className="border-t bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:py-10 pb-[env(safe-area-inset-bottom)]">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-xs sm:text-[13px] md:text-sm text-muted-foreground text-center sm:text-left shrink-0">
              ﾂｩ 2025 莠泌香蠏仙膚莠区ｪ蠑丈ｼ夂､ｾ. All rights reserved.
            </p>

            <nav aria-label="繝輔ャ繧ｿ繝ｼ繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ" className="min-w-0">
              <ul
                className="flex flex-wrap sm:flex-nowrap justify-center sm:justify-end
                           gap-x-5 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3
                           text-xs sm:text-[13px] md:text-sm"
              >
                <li><Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/about">莨夂､ｾ讎りｦ・/Link></li>
                <li><Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/terms">蛻ｩ逕ｨ隕冗ｴ・/Link></li>
                <li><Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/privacy">繝励Λ繧､繝舌す繝ｼ繝昴Μ繧ｷ繝ｼ</Link></li>
                <li><Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/faq">繧医￥縺ゅｋ雉ｪ蝠・/Link></li>
                <li><Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/legal">迚ｹ螳壼膚蜿門ｼ墓ｳ募所縺ｳ蜿､迚ｩ蝟ｶ讌ｭ豕輔↓蝓ｺ縺･縺剰｡ｨ險・/Link></li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
