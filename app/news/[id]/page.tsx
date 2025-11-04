"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type NewsRow = {
  id: string;
  title: string;
  body: string | null;
  published_at: string; // ISO
  is_active: boolean;
};

export default function NewsDetailPage() {
  const supabase = createClientComponentClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [row, setRow] = useState<NewsRow | null>(null);
  const [loading, setLoading] = useState(true);

  const id = params?.id;

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      // 公開側：is_active = true のみ取得
      const { data, error } = await supabase
        .from("news")
        .select("id,title,body,published_at,is_active")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();
      if (!error) setRow(data ?? null);
      setLoading(false);
    })();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p>読み込み中…</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>お知らせが見つかりませんでした</CardTitle>
            <CardDescription>URLが正しいか、公開中かをご確認ください。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/news">
                <ArrowLeft className="mr-2 h-4 w-4" />
                一覧へ戻る
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{row.title}</CardTitle>
          <CardDescription>
            {new Date(row.published_at).toLocaleString("ja-JP")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {row.body ? (
            <div className="prose prose-neutral max-w-none whitespace-pre-wrap">
              {row.body}
            </div>
          ) : (
            <p className="text-muted-foreground">本文はありません。</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button variant="outline" asChild>
          <Link href="/news">
            ニュース一覧へ
          </Link>
        </Button>
      </div>
    </div>
  );
}
