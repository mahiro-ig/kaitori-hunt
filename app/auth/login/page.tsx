"use client"

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
    if (!formData.email.trim()) newErrors.email = "繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ繧貞・蜉帙＠縺ｦ縺上□縺輔＞";
    if (!formData.password) newErrors.password = "繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 笨・Cookie 蜿肴丐縺ｾ縺ｧ蠕・▽髢｢謨ｰ・域怙螟ｧ7遘抵ｼ・  async function waitForSession(maxMs = 7000, stepMs = 200) {
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
        setLoginError("繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｾ縺溘・繝代せ繝ｯ繝ｼ繝峨′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ縲・);
        toast({
          title: "繝ｭ繧ｰ繧､繝ｳ縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
          description: result?.error ?? "繧ゅ≧荳蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "繝ｭ繧ｰ繧､繝ｳ縺励∪縺励◆",
        description: "繧ｻ繝・す繝ｧ繝ｳ遒ｺ遶九ｒ遒ｺ隱堺ｸｭ縺ｧ縺吮ｦ",
      });

      // 笨・Cookie 縺後ヶ繝ｩ繧ｦ繧ｶ縺ｫ蜿肴丐縺輔ｌ繧九∪縺ｧ蠕・▽
      const ok = await waitForSession();

      if (!ok) {
        toast({
          title: "繧ｻ繝・す繝ｧ繝ｳ遒ｺ遶九↓螟ｱ謨励＠縺ｾ縺励◆",
          description: "騾壻ｿ｡迺ｰ蠅・ｒ縺皮｢ｺ隱阪・縺・∴縲∝・蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // 笨・遒ｺ螳溘↓繧ｻ繝・す繝ｧ繝ｳ遒ｺ遶句ｾ後√し繝ｼ繝仙・縺ｧ蜀崎ｪｭ縺ｿ霎ｼ縺ｿ
      window.location.assign(redirectTo);
    } catch (err) {
      toast({
        title: "繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆",
        description: String((err as Error)?.message ?? err),
        variant: "destructive",
      });
      setLoginError("繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲よ凾髢薙ｒ縺翫＞縺ｦ蜀崎ｩｦ陦後＠縺ｦ縺上□縺輔＞縲・);
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold">繧｢繧ｫ繧ｦ繝ｳ繝医Ο繧ｰ繧､繝ｳ</h1>
        <p className="text-sm text-muted-foreground">
          繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｨ繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦ繝ｭ繧ｰ繧､繝ｳ縺励※縺上□縺輔＞
        </p>
      </div>

      {loginError && (
        <Alert className="mb-6 bg-destructive/10 border-destructive">
          <AlertDescription>{loginError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ</Label>
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
          <Label htmlFor="password">繝代せ繝ｯ繝ｼ繝・/Label>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉・
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
            繝ｭ繧ｰ繧､繝ｳ迥ｶ諷九ｒ菫晄戟縺吶ｋ
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              繝ｭ繧ｰ繧､繝ｳ荳ｭ窶ｦ
            </>
          ) : (
            "繝ｭ繧ｰ繧､繝ｳ"
          )}
        </Button>

        <p className="text-center text-sm">
          <Link href="/auth/forgot-password" className="underline hover:text-primary">
            繝代せ繝ｯ繝ｼ繝峨ｒ縺雁ｿ倥ｌ縺ｮ譁ｹ縺ｯ縺薙■繧・          </Link>
        </p>

        <p className="text-center text-sm">
          繧｢繧ｫ繧ｦ繝ｳ繝医ｒ縺頑戟縺｡縺ｧ縺ｪ縺・〒縺吶°?{" "}
          <Link href="/auth/register" className="underline hover:text-primary">
            譁ｰ隕冗匳骭ｲ
          </Link>
        </p>
      </form>
    </div>
  );
}
