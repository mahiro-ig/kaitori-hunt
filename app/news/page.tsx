"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type NewsRow = {
  id: string;
  title: string;
  body: string | null;
  published_at: string; // ISO
  is_active: boolean;
};

export default function NewsListPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [items, setItems] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(0);
  const limit = 10;

  const fetchPage = async (reset = false) => {
    setLoading(true);
    const rangeFrom = reset ? 0 : from;
    const rangeTo = rangeFrom + limit - 1;

    const { data, error } = await supabase
      .from("news")
      .select("id,title,body,published_at,is_active")
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (!error) {
      setItems(reset ? (data ?? []) : [...items, ...(data ?? [])]);
      setFrom(rangeTo + 1);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* === ヘッダー行：左に戻るボタン（ghost）、中央にタイトル === */}
      <div className="relative mb-6">
        {/* 左固定：戻る（詳細と同じスタイル） */}
        <div className="absolute left-0 top-0">
          <Button variant="ghost" onClick={() => router.back()} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </div>

        {/* 中央：タイトル・説明（常に中央揃え） */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tighter md:text-4xl">ニュース一覧</h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            ニュースを新しい順に表示しています。
          </p>
        </div>
      </div>

      {/* === 一覧 === */}
      <div className="space-y-4">
        {items.length === 0 && !loading ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">現在ニュースはありません</CardTitle>
            </CardHeader>
          </Card>
        ) : (
          items.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">
                  <Link href={`/news/${n.id}`} className="hover:underline underline-offset-4">
                    {n.title}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {new Date(n.published_at).toLocaleString("ja-JP")}
                </CardDescription>
              </CardHeader>
              {n.body ? (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {n.body.length > 120 ? `${n.body.slice(0, 120)}…` : n.body}
                  </p>
                </CardContent>
              ) : null}
            </Card>
          ))
        )}
      </div>

      {/* === さらに読み込む === */}
      <div className="mt-6 flex justify-center">
        <Button variant="outline" disabled={loading} onClick={() => fetchPage()}>
          {loading ? "読み込み中…" : "さらに読み込む"}
        </Button>
      </div>
    </div>
  );
}
