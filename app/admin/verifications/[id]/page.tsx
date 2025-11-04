// app/admin/verifications/[id]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Check, X, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type VerificationRecord = {
  id: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  idPhotoUrl: string | null;   // ← null を許容
  facePhotoUrl: string | null; // ← null を許容
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
};

export default function VerificationDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();

  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [status, setStatus] = useState<VerificationRecord["status"]>("pending");
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusColor = (s: typeof status) => {
    switch (s) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 詳細データ取得
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/verifications/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "取得に失敗しました");
        }
        setRecord(json as VerificationRecord);
        setStatus((json as VerificationRecord).status);
      } catch (e: any) {
        console.error("fetch error:", e);
        toast({
          title: "読み込みエラー",
          description: e.message,
          variant: "destructive",
        });
      }
    })();
  }, [id, toast]);

  // ステータス更新（approved / rejected を常に手動変更可能）
  const updateStatus = async (newStatus: "approved" | "rejected") => {
    if (!record) return;
    try {
      setIsUpdating(true);
      const res = await fetch(`/api/admin/verifications/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          // 拒否時は理由も送信（API 側で reject_reason 等に保存）
          rejectReason: newStatus === "rejected" ? rejectReason : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "更新に失敗しました");

      setStatus(newStatus);
      setRecord((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setIsApproveOpen(false);
      setIsRejectOpen(false);
      toast({
        title: newStatus === "approved" ? "承認しました" : "拒否しました",
      });
    } catch (e: any) {
      console.error("status update error:", e);
      toast({ title: "エラー", description: e.message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!record) {
    return <p className="p-4">読み込み中...</p>;
  }
  const { user, idPhotoUrl, facePhotoUrl } = record;

  return (
    <div className="space-y-6 p-4">
      {/* ヘッダー */}
      <div className="flex items-center mb-6">
        <Link
          href="/admin/verifications"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mr-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          本人確認一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold">本人確認詳細: {record.id}</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* 写真比較 */}
        <div className="md:w-2/3 space-y-6">
          <Card>
            <CardHeader className="flex justify-between items-center pb-2">
              <CardTitle>写真比較 (目視照合用)</CardTitle>
              <span
                className={`px-3 py-1 rounded-full text-sm ${getStatusColor(
                  status
                )}`}
              >
                {{
                  pending: "審査待ち",
                  approved: "承認済み",
                  rejected: "拒否",
                }[status]}
              </span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-center text-sm font-medium">身分証明書</h4>
                  <div className="border rounded-lg overflow-hidden flex items-center justify-center min-h-40">
                    {idPhotoUrl ? (
                      <Image
                        src={idPhotoUrl}
                        alt="身分証明書"
                        width={800}
                        height={600}
                        className="w-full object-contain h-auto"
                        priority
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-60 flex items-center justify-center text-gray-400">
                        未提出
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-center text-sm font-medium">自撮り写真</h4>
                  <div className="border rounded-lg overflow-hidden flex items-center justify-center min-h-40">
                    {facePhotoUrl ? (
                      <Image
                        src={facePhotoUrl}
                        alt="自撮り写真"
                        width={800}
                        height={600}
                        className="w-full object-contain h-auto"
                        priority
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-60 flex items-center justify-center text-gray-400">
                        未提出
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ユーザー情報＆アクション */}
        <div className="md:w-1/3 space-y-6">
          {/* ユーザー情報 */}
          <Card>
            <CardHeader>
              <CardTitle>ユーザー情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    プロフィールを見る
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <Mail className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      メール
                    </p>
                    <p>{user.email}</p>
                  </div>
                </div>
                {user.phone && (
                  <div className="flex items-start">
                    <span className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground">
                      📞
                    </span>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        電話
                      </p>
                      <p>{user.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ステータス操作 */}
          <Card>
            <CardHeader>
              <CardTitle>アクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>現在のステータス</Label>
                <div
                  className={`px-3 py-2 rounded-md text-sm ${getStatusColor(
                    status
                  )}`}
                >
                  {{
                    pending: "審査待ち",
                    approved: "承認済み",
                    rejected: "拒否",
                  }[status]}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 承認ダイアログ（常に操作可能） */}
                <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={isUpdating}>
                      <Check className="mr-2 h-4 w-4" /> 承認する
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>本人確認を承認</DialogTitle>
                      <DialogDescription>
                        本当に承認しますか？
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsApproveOpen(false)}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={() => updateStatus("approved")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "処理中..." : "承認する"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* 拒否ダイアログ（常に操作可能） */}
                <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={isUpdating}
                    >
                      <X className="mr-2 h-4 w-4" /> 拒否する
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>本人確認を拒否</DialogTitle>
                      <DialogDescription>
                        理由を入力してください。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="reason">拒否理由 *</Label>
                      <Textarea
                        id="reason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="理由を入力"
                        required
                      />
                    </div>
                    <DialogFooter className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsRejectOpen(false)}
                      >
                        キャンセル
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => updateStatus("rejected")}
                        disabled={!rejectReason || isUpdating}
                      >
                        {isUpdating ? "処理中..." : "拒否する"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              <Button
                variant="outline"
                className="w-full flex items-center justify-center"
                disabled={isUpdating}
              >
                <Mail className="mr-2 h-4 w-4" /> ユーザーにメール送信
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
