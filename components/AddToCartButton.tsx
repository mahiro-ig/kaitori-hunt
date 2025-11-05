"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

export interface AddToCartButtonProps {
  itemId: string;
  quantity?: number;
}

export default function AddToCartButton({ itemId, quantity = 1 }: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, quantity }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? "カート追加時に不明なエラーが発生しました");
        }
        toast({ title: "カートに追加しました！" });
      } catch (error: any) {
        toast({
          title: "カートに追加できませんでした",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {isPending ? "追加中…" : "カートに入れる"}
    </Button>
  );
}
