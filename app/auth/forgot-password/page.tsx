"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // 状態: idle=まだ送ってない / success=API 200 / error=ネットワーク等で失敗
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  // APIエラーメッセージ（通信失敗などサーバー側500系だけ入れる）
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setStatus("idle");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // 通信自体に失敗したり、サーバーが死んだ場合はres.okがfalseになる
      if (!res.ok) {
        // サーバー側は 200固定の設計だけど、念のため500等に備えておく
        setStatus("error");
        setErrorMsg(
          "送信に失敗しました。時間をおいて再度お試しください。"
        );

        toast({
          title: "送信エラー",
          description:
            "通信に失敗しました。時間をおいて再度お試しください。",
          variant: "destructive",
        });

        return;
      }

      // 正常終了 (200)
      setStatus("success");

      toast({
        title: "送信手続きを受け付けました",
        description:
          "入力されたメールアドレス宛に、パスワード再設定のご案内をお送りします。受信ボックスと迷惑メールフォルダをご確認ください。",
      });
    } catch (err) {
      console.error("forgot-password submit error:", err);

      setStatus("error");
      setErrorMsg("送信に失敗しました。時間をおいて再度お試しください。");

      toast({
        title: "送信エラー",
        description:
          "通信に失敗しました。時間をおいて再度お試しください。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disableForm = status === "success";

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-2xl font-semibold mb-6 text-center">
        パスワード再設定メールを送信
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 成功メッセージ */}
        {status === "success" && (
          <div className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <div>
              入力されたメールアドレス宛に再設定手続きの案内を送信しました。
              数分経っても届かない場合は、迷惑メールフォルダもご確認ください。
            </div>
          </div>
        )}

        {/* エラーメッセージ（サーバーダウン等） */}
        {status === "error" && errorMsg && (
          <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">登録済みメールアドレス</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            disabled={disableForm}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="email-help"
          />
          <p id="email-help" className="text-xs text-muted-foreground">
            ご登録のメールアドレスを入力すると、パスワード再設定用のリンクをお送りします。
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || disableForm}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              送信中…
            </>
          ) : status === "success" ? (
            "送信しました"
          ) : (
            "送信する"
          )}
        </Button>

        {status === "success" && (
          <p className="text-center text-xs text-muted-foreground">
            メール内のリンクからパスワードを再設定し、
            新しいパスワードでログインしてください。
          </p>
        )}

        {status === "success" && (
          <div className="text-center text-sm">
            <a
              className="underline text-blue-600"
              href="/auth/login"
            >
              ログイン画面へ戻る
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
