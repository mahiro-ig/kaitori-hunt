"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // メール内リンクから渡されたトークン
  const token = sp.get("token") ?? "";

  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [errors, setErrors] = useState<{
    password?: string;
    password2?: string;
    global?: string;
  }>({});

  const validate = () => {
    const nextErr: typeof errors = {};

    if (!token) {
      nextErr.global = "無効なリンクです。もう一度お手続きください。";
    }

    if (!password) {
      nextErr.password = "新しいパスワードを入力してください";
    } else if (!PASSWORD_PATTERN.test(password)) {
      nextErr.password =
        "8文字以上で、大文字・小文字・数字・記号(@$!%*?&)を各1文字以上含めてください";
    }

    if (password !== password2) {
      nextErr.password2 = "パスワードが一致しません";
    }

    setErrors(nextErr);
    return Object.keys(nextErr).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          json?.error ??
          "パスワードの更新に失敗しました。リンクの有効期限切れの可能性があります。";
        setErrors({ global: msg });
        toast({
          title: "エラー",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "パスワードを更新しました",
        description: "新しいパスワードでログインしてください。",
      });

      router.push("/auth/login");
    } catch (err) {
      console.error("reset-password submit error:", err);
      const msg = "通信エラーが発生しました。時間をおいて再度お試しください。";
      setErrors({ global: msg });
      toast({
        title: "通信エラー",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-2xl font-semibold mb-6 text-center">
        新しいパスワードを設定
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.global && (
          <p className="text-sm text-red-500 text-center">{errors.global}</p>
        )}

        {/* 新しいパスワード */}
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">新しいパスワード</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPw1 ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              aria-invalid={!!errors.password}
              aria-describedby="pw-help"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setShowPw1((s) => !s)}
              aria-label={showPw1 ? "パスワードを隠す" : "パスワードを表示"}
            >
              {showPw1 ? <EyeOff /> : <Eye />}
            </button>
          </div>
          <p id="pw-help" className="text-xs text-muted-foreground">
            8文字以上、
            <span className="font-medium">大文字</span>・
            <span className="font-medium">小文字</span>・
            <span className="font-medium">数字</span>・
            <span className="font-medium">記号</span>
            （@$!%*?& のいずれか）を各1文字以上含めてください。
          </p>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password}</p>
          )}
        </div>

        {/* 新しいパスワード（確認） */}
        <div className="space-y-1.5">
          <Label htmlFor="newPassword2">新しいパスワード（確認）</Label>
          <div className="relative">
            <Input
              id="newPassword2"
              type={showPw2 ? "text" : "password"}
              value={password2}
              onChange={(e) => {
                setPassword2(e.target.value);
                if (errors.password2) {
                  setErrors((prev) => ({
                    ...prev,
                    password2: undefined,
                  }));
                }
              }}
              aria-invalid={!!errors.password2}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setShowPw2((s) => !s)}
              aria-label={
                showPw2 ? "確認用パスワードを隠す" : "確認用パスワードを表示"
              }
            >
              {showPw2 ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {errors.password2 && (
            <p className="text-xs text-red-500">{errors.password2}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !token}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              更新中…
            </>
          ) : (
            "パスワードを更新する"
          )}
        </Button>
      </form>
    </div>
  );
}
