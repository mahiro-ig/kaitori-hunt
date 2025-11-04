// app/auth/register/page.tsx
"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((s) => ({
      ...s,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "お名前を入力してください";
    else if (formData.name.length > 50)
      newErrors.name = "お名前は50文字以内で入力してください";

    if (!formData.email.trim())
      newErrors.email = "メールアドレスを入力してください";
    else if (!EMAIL_PATTERN.test(formData.email))
      newErrors.email = "有効なメールアドレスを入力してください";

    if (!formData.password) newErrors.password = "パスワードを入力してください";
    else if (!PASSWORD_PATTERN.test(formData.password))
      newErrors.password =
        "パスワードは8文字以上で、大文字・小文字・数字・特殊文字(@$!%*?&)をそれぞれ1つ以上含める必要があります";

    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "パスワードが一致しません";

    if (!formData.agreeTerms)
      newErrors.agreeTerms = "利用規約に同意してください";

    setErrors(newErrors);
    return { ok: Object.keys(newErrors).length === 0, newErrors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const { ok, newErrors } = validateForm();
    if (!ok) {
      const first = Object.keys(newErrors)[0];
      if (first) {
        const el = document.querySelector(`[name="${first}"]`);
        if (el) (el as HTMLElement).focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) 新規登録
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: "登録に失敗しました",
          description: result?.error ?? "時間をおいて再度お試しください。",
          variant: "destructive",
        });
        return;
      }

      // 2) トーストで「登録成功」を明示
      toast({
        title: "登録が完了しました",
        description: "続けてログインします…",
      });

      // 3) 自動ログイン（画面はまだ遷移しない）
      const loginRes = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (loginRes?.error) {
        toast({
          title: "自動ログインに失敗しました",
          description: loginRes.error,
          variant: "destructive",
        });
        return;
      }

      // 4) ログイン成功も明示して、少しだけ待ってから /dashboard へ
      toast({
        title: "ログインしました",
        description: "ダッシュボードに移動します。",
      });

      await new Promise((r) => setTimeout(r, 900)); // ユーザーにトーストを見せる時間
      router.push("/dashboard");
    } catch (err) {
      console.error("登録エラー:", err);
      toast({
        title: "通信エラー",
        description: "サーバーとの通信に失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-2xl font-semibold mb-6 text-center">新規登録</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 名前 */}
        <div className="space-y-1.5">
          <Label htmlFor="name">名前</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && (
            <p id="name-error" className="text-xs text-red-500">
              {errors.name}
            </p>
          )}
        </div>

        {/* メールアドレス */}
        <div className="space-y-1.5">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-red-500">
              {errors.email}
            </p>
          )}
        </div>

        {/* パスワード */}
        <div className="space-y-1.5">
          <Label htmlFor="password">パスワード</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              required
              aria-invalid={!!errors.password}
              aria-describedby="password-help"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          <p id="password-help" className="text-xs text-muted-foreground">
            8文字以上、<span className="font-medium">大文字</span>・
            <span className="font-medium">小文字</span>・
            <span className="font-medium">数字</span>・
            <span className="font-medium">記号</span>
            （@$!%*?& のいずれか）を各1文字以上含めてください。
          </p>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password}</p>
          )}
        </div>

        {/* パスワード（確認） */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">パスワード（確認）</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setShowConfirmPassword((s) => !s)}
              aria-label={showConfirmPassword ? "確認用パスワードを隠す" : "確認用パスワードを表示"}
            >
              {showConfirmPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirm-error" className="text-xs text-red-500">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* 規約同意 */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="agreeTerms"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onCheckedChange={(checked) =>
              setFormData((s) => ({ ...s, agreeTerms: checked === true }))
            }
          />
          <Label htmlFor="agreeTerms">利用規約に同意する</Label>
        </div>
        {errors.agreeTerms && (
          <p className="text-xs text-red-500">{errors.agreeTerms}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 登録処理中…
            </>
          ) : (
            "登録してはじめる"
          )}
        </Button>

        <div className="text-center text-sm">
          アカウントをお持ちですか?{" "}
          <Link href="/auth/login" className="underline">
            ログイン
          </Link>
        </div>
      </form>
    </div>
  );
}
