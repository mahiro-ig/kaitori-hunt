// app/auth/resubmit/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

type Verif = {
  id: string;
  user_id: string;
  id_photo_path: string | null;
  face_path: string | null;
  status: "pending" | "approved" | "rejected" | "resubmitted";
  created_at: string | null;
};

export default function AuthResubmitPage() {
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const sessionReady = status !== "loading";

  const [me, setMe] = useState<string | null>(null);
  const [verif, setVerif] = useState<Verif | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [previewFront, setPreviewFront] = useState<string | null>(null);
  const [previewSelfie, setPreviewSelfie] = useState<string | null>(null);
  const [signedFront, setSignedFront] = useState<string | null>(null);
  const [signedSelfie, setSignedSelfie] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resubmittedDone, setResubmittedDone] = useState(false);

  // file input と ObjectURL 管理
  const frontInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const previewFrontUrlRef = useRef<string | null>(null);
  const previewSelfieUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewFrontUrlRef.current) URL.revokeObjectURL(previewFrontUrlRef.current);
      if (previewSelfieUrlRef.current) URL.revokeObjectURL(previewSelfieUrlRef.current);
    };
  }, []);

  // セッション確定後に最新レコード取得
  useEffect(() => {
    if (!sessionReady) return;
    if (!session) {
      setMe(null);
      setVerif(null);
      setLoading(false);
      return;
    }
    setMe(((session.user as any)?.id as string | undefined) ?? null);

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/verifications/me", {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "取得に失敗しました");

        const v = (json.data ?? null) as Verif | null;
        setVerif(v);

        // キャッシュバスター
        const bust = `&_=${Date.now()}`;
        const addBust = (u: string | null) =>
          u ? `${u}${u.includes("?") ? "&" : "?"}${bust}` : null;

        setSignedFront(addBust(json.signedFront ?? null));
        setSignedSelfie(addBust(json.signedSelfie ?? null));
      } catch (e: any) {
        toast({ title: "取得エラー", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionReady, session, toast]);

  // 「resubmitted になったらサーバー画像は非表示」にする
  const hideServerImages = verif?.status === "resubmitted";

  // 実際に表示に使うURL（resubmitted のときは null にする）
  const signedFrontForDisplay = hideServerImages ? null : signedFront;
  const signedSelfieForDisplay = hideServerImages ? null : signedSelfie;

  const canSubmit = useMemo(
    () => !!verif && (!!frontFile || !!selfieFile),
    [verif, frontFile, selfieFile]
  );

  const onChangeFront = (f: File | null) => {
    if (previewFrontUrlRef.current) {
      URL.revokeObjectURL(previewFrontUrlRef.current);
      previewFrontUrlRef.current = null;
    }
    setFrontFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      previewFrontUrlRef.current = url;
      setPreviewFront(url);
    } else {
      setPreviewFront(null);
    }
  };

  const onChangeSelfie = (f: File | null) => {
    if (previewSelfieUrlRef.current) {
      URL.revokeObjectURL(previewSelfieUrlRef.current);
      previewSelfieUrlRef.current = null;
    }
    setSelfieFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      previewSelfieUrlRef.current = url;
      setPreviewSelfie(url);
    } else {
      setPreviewSelfie(null);
    }
  };

  const handleCreateVerification = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/verifications/start", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "作成に失敗しました");
      setVerif(json.data as Verif);
      toast({ title: "本人確認の申請を開始しました" });
    } catch (e: any) {
      toast({ title: "作成エラー", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const clearClientPreviewsAndInputs = async () => {
    try {
      if (previewFrontUrlRef.current) {
        URL.revokeObjectURL(previewFrontUrlRef.current);
        previewFrontUrlRef.current = null;
      }
      if (previewSelfieUrlRef.current) {
        URL.revokeObjectURL(previewSelfieUrlRef.current);
        previewSelfieUrlRef.current = null;
      }
    } catch {}
    setPreviewFront(null);
    setPreviewSelfie(null);
    setFrontFile(null);
    setSelfieFile(null);
    if (frontInputRef.current) frontInputRef.current.value = "";
    if (selfieInputRef.current) selfieInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!verif) return;
    try {
      const fd = new FormData();
      fd.append("verifId", verif.id);
      if (frontFile) fd.append("front", frontFile, frontFile.name);
      if (selfieFile) fd.append("selfie", selfieFile, selfieFile.name);

      const res = await fetch("/api/verifications/upload-resubmit", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "再提出に失敗しました");

      // 送信後はローカルプレビューと input を完全クリア
      await clearClientPreviewsAndInputs();

      // サーバー側のサインURLは更新するが、表示は抑制（status=resubmitted のため）
      const updated = json.data as Verif;
      setVerif(updated);

      const bust = `&_=${Date.now()}`;
      const addBust = (u: string | null) =>
        u ? `${u}${u.includes("?") ? "&" : "?"}${bust}` : null;
      setSignedFront(addBust(json.signedFront ?? null));
      setSignedSelfie(addBust(json.signedSelfie ?? null));

      setResubmittedDone(true);
      toast({ title: "再提出を受け付けました" });
    } catch (e: any) {
      toast({ title: "エラー", description: e.message, variant: "destructive" });
    }
  };

  // セッション確認中
  if (!sessionReady || loading) {
    return <div className="p-6 text-sm text-muted-foreground">セッション確認中…</div>;
  }

  // 未ログイン
  if (!session) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4">
        <p className="text-sm">再提出にはログインが必要です。</p>
        <Button asChild><Link href="/auth/login">ログインへ</Link></Button>
      </div>
    );
  }

  // 再提出完了後の Thanks 画面
  if (resubmittedDone) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <Card className="text-center py-10">
          <CardHeader>
            <CardTitle className="text-3xl md:text-4xl font-bold">Thanks 🎉</CardTitle>
          </CardHeader>
        </Card>
        <Card className="text-center py-4 mt-4">
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              再提出ありがとうございました。順次担当者による再審査を実施させていただきます。
            </p>
            <div className="pt-2">
              <Button asChild size="lg">
                <Link href="/">ホームに戻る</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // レコード未作成 → 申請開始
  if (session && !verif) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4">
        <p className="text-sm">本人確認レコードが見つかりません。申請を開始しますか？</p>
        <Button onClick={handleCreateVerification} disabled={creating}>
          {creating ? "作成中…" : "本人確認を申請する"}
        </Button>
      </div>
    );
  }

  // 通常表示（resubmitted 時はサーバー画像を非表示）
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>本人確認の再提出</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>身分証明書（表面）</Label>
              <Input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => onChangeFront(e.target.files?.[0] ?? null)}
              />
              <div className="rounded border p-2 min-h-[180px] flex items-center justify-center">
                {previewFront ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewFront} alt="preview front" className="max-h-60" />
                ) : signedFrontForDisplay ? (
                  <Image
                    src={signedFrontForDisplay}
                    alt="current front"
                    width={600}
                    height={400}
                    className="h-auto w-full object-contain"
                  />
                ) : hideServerImages ? (
                  <span className="text-xs text-muted-foreground">提出済み画像は非表示です</span>
                ) : (
                  <span className="text-xs text-muted-foreground">未提出</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>自撮り写真</Label>
              <Input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => onChangeSelfie(e.target.files?.[0] ?? null)}
              />
              <div className="rounded border p-2 min-h-[180px] flex items-center justify-center">
                {previewSelfie ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewSelfie} alt="preview selfie" className="max-h-60" />
                ) : signedSelfieForDisplay ? (
                  <Image
                    src={signedSelfieForDisplay}
                    alt="current selfie"
                    width={600}
                    height={400}
                    className="h-auto w-full object-contain"
                  />
                ) : hideServerImages ? (
                  <span className="text-xs text-muted-foreground">提出済み画像は非表示です</span>
                ) : (
                  <span className="text-xs text-muted-foreground">未提出</span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              再提出する
            </Button>
          </div>

          
        </CardContent>
      </Card>
    </div>
  );
}
