// /app/admin/layout.tsx
"use client";

import type React from "react";
import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  ShieldCheck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Newspaper,
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { signOut as nextAuthSignOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";

/**
 * ポイント
 * - 認証/認可は middleware.ts & SSR（/lib/auth.ts の assertAdminSSR）で担保する。
 * - ここ（レイアウト）では UI だけを描画し、/admin/login のみサイドバー等を出さない。
 * - 既存 UI/クラスは変更しない。
 */

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();

  // /admin/login ではサイドバー等を出さない
  const isLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  // モバイルメニュー開閉
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 画面内リンク
  const navItems = useMemo(
    () => [
      { name: "ダッシュボード", href: "/admin", icon: LayoutDashboard },
      { name: "買取管理", href: "/admin/purchases", icon: ShoppingBag },
      { name: "ユーザー管理", href: "/admin/users", icon: Users },
      { name: "本人確認", href: "/admin/verifications", icon: ShieldCheck },
      { name: "レポート", href: "/admin/reports", icon: BarChart3 },
      { name: "ニュース", href: "/admin/news", icon: Newspaper },
      { name: "設定", href: "/admin/settings", icon: Settings },
    ],
    []
  );

  // ログアウト（NextAuth を正として、必要なら Supabase も併用でサインアウト）
  const handleLogout = async () => {
    try {
      // Supabase を使っているセッションが残っていればクリア（使っていなければ何も起きない）
      await supabase.auth.signOut().catch(() => {});
    } finally {
      await nextAuthSignOut({ redirect: false }).catch(() => {});
      router.replace("/admin/login");
    }
  };

  // /admin/login 配下：そのまま children を描画（サイドバーなし）
  if (isLogin) {
    return <>{children}</>;
  }

  // 管理画面（UI のみ。保護は middleware/SSR が実施）
  return (
    <SidebarProvider>
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex">
        <SidebarHeader className="flex items-center justify-center p-4">
          <Link href="/admin">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={150}
              height={40}
              className="h-auto w-auto"
              priority
            />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link href={item.href}>
                      <item.icon className="mr-2 h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-5 w-5" />
            ログアウト
          </Button>
        </SidebarFooter>
      </Sidebar>

      {/* Mobile Header */}
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:hidden">
          <Link href="/admin" className="flex items-center">
            <Image
              src="/images/logo-symbol.png"
              alt="Logo"
              width={40}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen((v) => !v)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-20 bg-background pt-16 md:hidden">
            <nav className="flex flex-col p-4">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`mb-2 flex items-center rounded-md p-3 ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
              <Button variant="outline" className="mt-4 w-full justify-start" onClick={handleLogout}>
                <LogOut className="mr-2 h-5 w-5" />
                ログアウト
              </Button>
            </nav>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 p-4 md:ml-64">
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
