"use client";

import React, { useState, useRef, useEffect, DragEvent, ClipboardEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Check, AlertCircle, Shield, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

export default function EkycPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { status } = useSession();

  const [activeStep, setActiveStep] = useState<"document" | "selfie" | "verification">("document");

  // ■ プレビュー状態 ■
  const [docPreview, setDocPreview] = useState<string>("");
  const [selfiePreview, setSelfiePreview] = useState<string>("");

  // ■ カメラキャプチャ制御 ■
  const [capturingStep, setCapturingStep] = useState<"document" | "selfie" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ■ 検証シミュレーション ■
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "processing" | "success" | "failed">("pending");
  const [verificationProgress, setVerificationProgress] = useState(0);

  // ■ レコード作成 ■
  const createVerificationRecord = async (idPath: string, facePath: string) => {
    try {
      const res = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_photo_path: idPath, face_path: facePath }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "レコード作成に失敗");
      toast({ title: "提出完了", description: "審査待ちに登録しました" });
    } catch (e: any) {
      console.error(e);
      toast({ title: "エラー", description: e.message, variant: "destructive" });
    }
  };

  // ■ ファイルアップロード ■
  const uploadViaApi = async (bucket: "id-photos" | "face-captures", file: File): Promise<string> => {
    if (status !== "authenticated") throw new Error("認証が必要です");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/upload/${bucket}`, { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "アップロード失敗");
    return json.url as string;
  };

  // ■ カメラ起動 ■
  const startCamera = async (step: "document" | "selfie") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCapturingStep(step);
    } catch (e: any) {
      console.error(e);
      toast({ title: "カメラ起動エラー", description: e.message, variant: "destructive" });
    }
  };

  // ■ プレビュー再生 ■
  useEffect(() => {
    if (capturingStep && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.warn);
    }
  }, [capturingStep]);

  // ■ 撮影 ■
  const capturePhoto = () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || !capturingStep) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const fileName = capturingStep === "document" ? "document.jpg" : "selfie.jpg";
      const bucket = capturingStep === "document" ? "id-photos" : "face-captures";
      const file = new File([blob], fileName, { type: "image/jpeg" });
      const localUrl = URL.createObjectURL(file);

      try {
        const publicUrl = await uploadViaApi(bucket, file);
        if (capturingStep === "document") {
          setDocPreview(publicUrl);
        } else {
          setSelfiePreview(publicUrl);
        }
        toast({
          title: `${capturingStep === "document" ? "書類" : "自撮り"}アップロード完了`,
          description: `${capturingStep === "document" ? "身分証明書" : "自撮り写真"}をアップロードしました`,
        });
        // 両方揃ったらレコード作成
        if (docPreview && selfiePreview) {
          const idPath = docPreview.split("/storage/v1/object/public/")[1];
          const facePath = selfiePreview.split("/storage/v1/object/public/")[1];
          await createVerificationRecord(idPath!, facePath!);
        }
      } catch (e: any) {
        console.error(e);
        toast({ title: "アップロードエラー", description: e.message, variant: "destructive" });
        if (capturingStep === "document") {
          setDocPreview("");
        } else {
          setSelfiePreview("");
        }
      }
    }, "image/jpeg");

    // カメラ停止
    stream.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCapturingStep(null);
  };

  // ■ 撮影キャンセル ■
  const cancelCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCapturingStep(null);
  };

  // ■ 検証シミュレーション開始 ■
  const handleStartVerification = () => {
    setVerificationStatus("processing");
    let prog = 0;
    const iv = setInterval(() => {
      prog += 10;
      setVerificationProgress(prog);
      if (prog >= 100) {
        clearInterval(iv);
        setVerificationStatus("success");
      }
    }, 300);
  };
  const handleComplete = () => router.push("/dashboard");

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* 戻る＆タイトル */}
      <div className="flex items-center mb-6">
        <Link href="/auth/register" className="flex items-center text-sm text-muted-foreground hover:text-primary mr-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> 登録に戻る
        </Link>
        <h1 className="text-2xl font-bold">本人確認</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary" />
            <CardTitle>オンライン本人確認</CardTitle>
          </div>
          <CardDescription>
            身分証明書と自撮り写真を使用して簡単に本人確認を行います。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeStep} onValueChange={(v) => setActiveStep(v as any)} className="w-full">
            {/* STEP1: Document */}
            <TabsContent value="document" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center">
                {capturingStep === "document" ? (
                  <>
                    <video ref={videoRef} muted playsInline className="rounded-lg w-full h-auto" />
                    <div className="flex space-x-4 mt-4">
                      <Button onClick={capturePhoto}>撮影</Button>
                      <Button variant="outline" onClick={cancelCapture}>キャンセル</Button>
                    </div>
                  </>
                ) : docPreview ? (
                  <div className="text-center">
                    <Image src={docPreview} alt="Document" width={200} height={150} className="mx-auto mb-4 rounded object-contain" />
                    <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-100">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => startCamera("document")}>再撮影</Button>
                  </div>
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="mb-4 text-muted-foreground">身分証明書をカメラで撮影</p>
                    <Button onClick={() => startCamera("document")}>写真を撮影</Button>
                  </>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setActiveStep("selfie")} disabled={!docPreview}>次へ</Button>
              </div>
            </TabsContent>

            {/* STEP2: Selfie */}
            <TabsContent value="selfie" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center">
                {capturingStep === "selfie" ? (
                  <>
                    <video ref={videoRef} muted playsInline className="rounded-lg w-full h-auto" />
                    <div className="flex space-x-4 mt-4">
                      <Button onClick={capturePhoto}>撮影</Button>
                      <Button variant="outline" onClick={cancelCapture}>キャンセル</Button>
                    </div>
                  </>
                ) : selfiePreview ? (
                  <div className="text-center">
                    <Image src={selfiePreview} alt="Selfie" width={200} height={200} className="mx-auto mb-4 rounded-full object-contain" />
                    <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-green-100">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => startCamera("selfie")}>再撮影</Button>
                  </div>
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="mb-4 text-muted-foreground">カメラを起動して自撮りを撮影</p>
                    <Button onClick={() => startCamera("selfie")}>写真を撮影</Button>
                  </>
                )}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep("document")}>戻る</Button>
                <Button onClick={() => setActiveStep("verification")} disabled={!selfiePreview}>次へ</Button>
              </div>
            </TabsContent>

            {/* STEP3: Verification */}
            <TabsContent value="verification" className="space-y-4">
              <div className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span>書類</span>
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span>自撮り</span>
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span>検証</span>
                  {verificationStatus === "pending" && <span className="text-muted-foreground">未開始</span>}
                  {verificationStatus === "processing" && <span className="text-blue-600">処理中…</span>}
                  {verificationStatus === "success" && <Check className="h-5 w-5 text-green-600" />}
                  {verificationStatus === "failed" && <AlertCircle className="h-5 w-5 text-red-600" />}
                </div>
                {verificationStatus === "processing" && (
                  <>
                    <Progress value={verificationProgress} className="mt-4 h-2" />
                    <p className="text-xs text-center mt-2 text-muted-foreground">検証中です。しばらくお待ちください…</p>
                  </>
                )}
                {(verificationStatus === "success" || verificationStatus === "failed") && (
                  <Alert className={`mt-4 ${verificationStatus === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                    {verificationStatus === "success" ? (
                      <>
                        <Check className="h-4 w-4" />
                        <AlertTitle>検証完了</AlertTitle>
                        <AlertDescription>本人確認書類の提出が完了しました。</AlertDescription>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>検証失敗</AlertTitle>
                        <AlertDescription>本人確認に失敗しました。再度お試しください。</AlertDescription>
                      </>
                    )}
                  </Alert>
                )}
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setActiveStep("selfie")} disabled={verificationStatus === "processing"}>戻る</Button>
                  {verificationStatus === "pending" && <Button onClick={handleStartVerification}>検証を開始</Button>}
                  {verificationStatus === "success" && <Button onClick={handleComplete}>完了</Button>}
                  {verificationStatus === "failed" && <Button onClick={() => setActiveStep("document")}>やり直す</Button>}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
