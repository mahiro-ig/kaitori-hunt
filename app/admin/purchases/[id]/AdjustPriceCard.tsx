"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

type Props = {
  id: string;                  // buyback_requests.id
  initialPrice?: number | null;
  currentFinalPrice?: number | null;
  currentReason?: string | null;
  onUpdated?: (p: { final_price: number; reason: string }) => void;
};

export default function AdjustPriceCard({
  id,
  initialPrice,
  currentFinalPrice,
  currentReason,
  onUpdated,
}: Props) {
  const [finalPrice, setFinalPrice] = useState<number>(
    currentFinalPrice ?? initialPrice ?? 0
  );
  const [reason, setReason] = useState<string>(currentReason ?? "");
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    if (!Number.isFinite(finalPrice) || finalPrice < 0) {
      toast({ title: "金額エラー", description: "0以上の数値で入力してください", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/buyback-requests/${id}/adjust`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ final_price: finalPrice, reason }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "更新に失敗しました");
        }
        toast({ title: "査定確定しました" });
        onUpdated?.({ final_price: finalPrice, reason });
      } catch (e: any) {
        toast({ title: "エラー", description: e.message, variant: "destructive" });
      }
    });
  };

  // 減額差額の簡易表示
  const diff = (currentFinalPrice ?? initialPrice ?? 0) - finalPrice;

  return (
    <Card>
      <CardHeader>
        <CardTitle>査定確定（即時反映）</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">申込金額</div>
            <div className="text-xl font-semibold">
              {(initialPrice ?? 0).toLocaleString()} 円
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">現在の確定金額</div>
            <div className="text-xl">
              {(currentFinalPrice ?? initialPrice ?? 0).toLocaleString()} 円
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm">確定金額（税抜/税込は運用に合わせて）</label>
          <Input
            type="number"
            value={finalPrice}
            onChange={(e) => setFinalPrice(Number(e.target.value))}
            min={0}
            inputMode="numeric"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">減額理由（破損/箱なし/付属品不足など）</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="外箱に大きなへこみ、シュリンク破れ…など"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          差額: <span className={diff > 0 ? "text-red-600" : ""}>
            {diff.toLocaleString()} 円{diff > 0 ? " 減" : diff < 0 ? " 増" : ""}
          </span>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "確定中…" : "承認して確定"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
