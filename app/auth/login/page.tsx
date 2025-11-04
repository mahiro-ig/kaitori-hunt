'use client';

import React, { useMemo, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(
    () =>
      searchParams.get("from") ||
      searchParams.get("redirect") ||
      "/dashboard",
    [searchParams]
  );

  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
    setLoginError(null);
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!formData.email.trim()) newErrors.email = "メールアドレスを入力してください";
    if (!formData.password) newErrors.password = "パスワードを入力してください";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Cookie 反映まで待つ関数（最大7秒）
  async function waitForSession(maxMs = 7000, stepMs = 200) {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      const session = await getSession();
      if (session && session.user) return true;
      await new Promise((r) => setTimeout(r, stepMs));
    }
    return false;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isLoading) return;

    setIsLoading(true);
    setLoginError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (!result || result.error) {
        setLoginError("メールアドレスまたはパスワードが正しくありません。");
        toast({
          title: "ログインに失敗しました",
          description: result?.error ?? "もう一度お試しください。",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "ログインしました",
        description: "セッション確立を確認中です…",
      });

      // ✅ Cookie がブラウザに反映されるまで待つ
      const ok = await waitForSession();

      if (!ok) {
        toast({
          title: "セッション確立に失敗しました",
          description: "通信環境をご確認のうえ、再度お試しください。",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // ✅ 確実にセッション確立後、サーバ側で再読み込み
      window.location.assign(redirectTo);
    } catch (err) {
      toast({
        title: "エラーが発生しました",
        description: String((err as Error)?.message ?? err),
        variant: "destructive",
      });
      setLoginError("エラーが発生しました。時間をおいて再試行してください。");
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold">アカウントログイン</h1>
        <p className="text-sm text-muted-foreground">
          メールアドレスとパスワードを入力してログインしてください
        </p>
      </div>

      {loginError && (
        <Alert className="mb-6 bg-destructive/10 border-destructive">
          <AlertDescription>{loginError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="example@example.com"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? "border-destructive" : ""}
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="パスワードを入力"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? "border-destructive" : ""}
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            disabled={isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="rememberMe"
            name="rememberMe"
            checked={formData.rememberMe}
            onCheckedChange={checked =>
              setFormData(prev => ({ ...prev, rememberMe: checked as boolean }))
            }
            disabled={isLoading}
          />
          <Label htmlFor="rememberMe" className="text-sm">
            ログイン状態を保持する
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ログイン中…
            </>
          ) : (
            "ログイン"
          )}
        </Button>

        <p className="text-center text-sm">
          <Link href="/auth/forgot-password" className="underline hover:text-primary">
            パスワードをお忘れの方はこちら
          </Link>
        </p>

        <p className="text-center text-sm">
          アカウントをお持ちでないですか?{" "}
          <Link href="/auth/register" className="underline hover:text-primary">
            新規登録
          </Link>
        </p>
      </form>
    </div>
  );
}
