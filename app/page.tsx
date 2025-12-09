'use client';

import { useEffect, useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, Gamepad, Smartphone, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

/* ======================
   お知らせ表示（同構造・半分高さ・中立配色）
   ====================== */
type NewsRow = {
  id: string;
  title: string | null;
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
    <section className="w-full py-6 md:py-8" aria-labelledby="news-heading">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            {/*  フレーズだけ差し替え */}
            <h2 id="news-heading" className="text-3xl font-bold tracking-tighter md:text-4xl">
              ニュース
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl">
              最新のお知らせ
            </p>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-4xl">
          {loading ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">読み込み中…</CardTitle>
                <CardDescription>少々お待ちください。</CardDescription>
              </CardHeader>
            </Card>
          ) : (news?.length ?? 0) === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">現在お知らせはありません</CardTitle>
                <CardDescription>公開中のお知らせが追加されると表示されます。</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <ul className="text-sm md:text-base text-foreground space-y-2">
                  {news.map((n) => (
                    <li key={n.id} className="leading-6">
                      <span className="font-medium">
                        {n.published_at ? new Date(n.published_at).toLocaleDateString("ja-JP") : ""}
                      </span>
                      <span className="mx-2">：</span>
                      <Link
                        href={`/news/${n.id}`}
                        className="font-medium hover:underline underline-offset-4"
                      >
                        {n.title ?? "(無題のお知らせ)"}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="flex justify-end px-6 pb-4">
                <Link href="/news" className="text-sm md:text-base underline underline-offset-4 hover:opacity-80">
                  すべてのお知らせを見る
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

  // 既存ロジック維持：非表示バリアントを除外するパラメータを追加
  const onSubmitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (category) params.set("category", category);
    params.set("visibleOnly", "1"); // 表示中のバリアントのみ
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header は layout 経由で描画 */}

      <main className="flex-1">
        {/* ====== HERO ====== */}
        <section className="w-full py-6 md:py-12 lg:py-16 bg-muted" aria-labelledby="hero-heading">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-10 xl:gap-12 place-items-center">
              <div className="flex flex-col justify-center space-y-3 w-full">
                <div className="space-y-2">
                  {/* フレーズ更新（ブランド軸） */}
                  <h1 id="hero-heading" className="text-2xl font-bold tracking-tighter sm:text-4xl xl:text-5xl/none lg:whitespace-nowrap lg:leading-none">
                    新品高価買取・即日現金化
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-lg">
                    iPhone・カメラ・ゲームの専門買取サービス<br />
                    即日査定・最短入金で新品をスムーズに現金化
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href={session ? '/dashboard' : '/auth/register'}>
                    <Button size="lg">
                      新規登録
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/how-it-works">
                    <Button variant="outline" size="lg">
                      買取の流れ
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
                    alt="買取ハント ロゴ"
                    priority
                    className="rounded-lg object-contain w-full aspect-square"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====== SEARCH BAR ====== */}
        <section aria-label="商品検索" className="w-full py-4 md:py-6">
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
                    aria-label="キーワード検索"
                    placeholder="JAN または 商品名で検索"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full rounded-xl border bg-background pl-9 pr-3 h-12 md:h-10 text-base md:text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="sr-only">カテゴリ</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full md:w-[180px] rounded-xl border bg-background px-3 h-12 md:h-10 text-base md:text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">すべてのカテゴリ</option>
                    <option value="iphone">iPhone</option>
                    <option value="camera">カメラ</option>
                    <option value="game">ゲーム</option>
                  </select>
                </div>

                <div className="md:w-[120px]">
                  <Button type="submit" className="w-full h-12 md:h-10 text-base md:text-sm rounded-xl">
                    検索
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                例: 「iPhone 17 Pro 256GB」「Switch 有機EL」
              </div>
            </form>
          </div>
        </section>

        {/* ====== お知らせ ====== */}
        <NewsSection />

        {/* ====== 買取カテゴリー ====== */}
        <section className="w-full py-12 md:py-20 lg:py-24" aria-labelledby="category-heading">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 id="category-heading" className="text-3xl font-bold tracking-tighter md:text-4xl">
                  買取カテゴリー
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl">
                  専門スタッフが丁寧に査定し、市場価値に基づいた適正価格で買取します。
                </p>
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
                    最新モデルから過去のモデルまで、新品未使用品を高価買取いたします。
                  </p>
                  <Button variant="outline" className="mt-2 group-hover:bg-primary group-hover:text-primary-foreground">
                    詳細を見る
                  </Button>
                </div>
              </Link>

              <Link href="/categories/camera" className="group relative overflow-hidden rounded-lg border p-6 hover:border-primary">
                <div className="flex flex-col items-center space-y-4">
                  <div className="rounded-full bg-muted p-4">
                    <Camera className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold">カメラ</h3>
                  <p className="text-muted-foreground text-center">
                    一眼レフ、ミラーレス、フィルムカメラなど、新品未使用品を買取しています。
                  </p>
                  <Button variant="outline" className="mt-2 group-hover:bg-primary group-hover:text-primary-foreground">
                    詳細を見る
                  </Button>
                </div>
              </Link>

              <Link href="/categories/game" className="group relative overflow-hidden rounded-lg border p-6 hover:border-primary">
                <div className="flex flex-col items-center space-y-4">
                  <div className="rounded-full bg-muted p-4">
                    <Gamepad className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold">ゲーム</h3>
                  <p className="text-muted-foreground text-center">
                    ゲーム機本体やソフト、周辺機器など新品未使用品を幅広く買取対応しています。
                  </p>
                  <Button variant="outline" className="mt-2 group-hover:bg-primary group-hover:text-primary-foreground">
                    詳細を見る
                  </Button>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ====== 買取の流れ ====== */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted" aria-labelledby="flow-heading">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 id="flow-heading" className="text-3xl font-bold tracking-tighter md:text-4xl">買取の流れ</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl">
                  簡単3ステップで、あなたの商品を高価買取いたします。
                </p>
              </div>
            </div>

            <div className="mx-auto mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 max-w-6xl">
              <div className="flex flex-col items-center space-y-4 rounded-lg border bg-background p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">1</div>
                <h3 className="text-xl font-bold">会員登録・ログイン</h3>
                <p className="text-muted-foreground text-center">
                   簡単な会員登録で、買取履歴の管理や特典が受けられます。
                </p>
              </div>

              <div className="flex flex-col items-center space-y-4 rounded-lg border bg-background p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">2</div>
                <h3 className="text-xl font-bold">買取申込</h3>
                <p className="text-muted-foreground text-center">
                  売りたい商品をカートに入れて、買取申込をしましょう。
                </p>
              </div>

              <div className="flex flex-col items-center space-y-4 rounded-lg border bg-background p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">3</div>
                <h3 className="text-xl font-bold">郵送・査定・成立</h3>
                <p className="text-muted-foreground text-center">
                  商品を郵送もしくはお持ち込みいただき、専門スタッフが査定。買取金額にご納得いただければ買取成立です。
                </p>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <Link href="/auth/register">
                <Button size="lg">
                  今すぐ会員登録する
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
              © 2025 五十嵐商事株式会社. All rights reserved.
            </p>

            <nav aria-label="フッターナビゲーション" className="min-w-0">
              <ul
                className="flex flex-wrap sm:flex-nowrap justify-center sm:justify-end
                           gap-x-5 sm:gap-x-8 md:gap-x-10 lg:gap-x-12 gap-y-3
                           text-xs sm:text-[13px] md:text-sm"
              >
                <li><Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/about">会社概要</Link></li>
                <li><Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/terms">利用規約</Link></li>
                <li><Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/privacy">プライバシーポリシー</Link></li>
                <li><Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/faq">よくある質問</Link></li>
                <li><Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/legal">特定商取引法及び古物営業法に基づく表記</Link></li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
