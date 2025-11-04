"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Menu, ShoppingCart, User, LogOut as LogOutIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/contexts/cart-context";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { data: session, status } = useSession();

  // ✅ 判定：ロード中は一切「マイページ」を出さない
  const isLoggedIn = status === "authenticated" && !!session?.user;

  const { items } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const totalQty = useMemo(() => items.reduce((s, it) => s + (it.quantity ?? 1), 0), [items]);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    toast({ title: "ログアウトしました", description: "またのご利用をお待ちしております。" });
    setIsOpen(false);
    if (pathname.startsWith("/dashboard")) {
      router.replace("/");
    }
    router.refresh();
  };

  const navItems = [
    { href: "/", label: t("nav.home", "ホーム") },
    { href: "/categories/iphone", label: t("nav.iphone", "iPhone") },
    { href: "/categories/camera", label: t("nav.camera", "カメラ") },
    { href: "/categories/game", label: t("nav.game", "ゲーム") },
    { href: "/how-it-works", label: t("nav.mail_purchase", "郵送買取") },
    { href: "/shop-how-it-works", label: t("nav.store_purchase", "店頭買取") },
    { href: "/about", label: t("nav.about", "会社概要") },
  ];

  return (
    <header
      className={`w-full transition-all duration-200 ${
        isScrolled ? "bg-white shadow-sm dark:bg-gray-950" : "bg-white/80 backdrop-blur-sm dark:bg-gray-950/80"
      }`}
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        {/* ===== モバイルヘッダー ===== */}
        <div className="grid grid-cols-3 items-center h-16 md:hidden">
          {/* === 左：メニュー === */}
          <div className="flex items-center justify-start">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="メニュー"
                  className="h-10 w-10 rounded-full hover:bg-gray-100"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              {/* ✅ status で再マウント。loading中は「ログイン/新規登録」扱い */}
              <SheetContent
                key={status}
                side="left"
                className="w-[84%] max-w-[360px] p-0"
                style={{
                  paddingTop: "env(safe-area-inset-top)",
                  paddingLeft: "env(safe-area-inset-left)",
                }}
              >
                <div className="flex items-center gap-2 px-3 py-2 border-b">
                  <Image
                    src="/images/logo-symbol.png"
                    alt="買取ハント"
                    width={24}
                    height={24}
                    sizes="24px"
                    className="h-6 w-6"
                    priority
                  />
                  <span className="text-sm font-semibold">メニュー</span>
                </div>

                <nav className="px-2 py-3">
                  <ul className="space-y-1">
                    {navItems.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <SheetClose asChild>
                            <Link
                              href={item.href}
                              className={`block rounded-lg px-3 py-3 text-[15px] font-medium ${
                                active
                                  ? "bg-neutral-100 text-black dark:bg-neutral-800 dark:text-white"
                                  : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              }`}
                            >
                              {item.label}
                            </Link>
                          </SheetClose>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                {/* === 下部ボタン === */}
                <div className="px-2 pb-3">
                  <div className="mb-2">
                    <LanguageSwitcher variant="minimal" />
                  </div>

                  {status === "authenticated" && isLoggedIn ? (
                    <div className="grid grid-cols-2 gap-2">
                      <SheetClose asChild>
                        <Link href="/dashboard">
                          <Button className="w-full" variant="secondary">
                            <User className="mr-2 h-4 w-4" />
                            {t("nav.mypage", "マイページ")}
                          </Button>
                        </Link>
                      </SheetClose>
                      <Button className="w-full" variant="outline" onClick={handleLogout}>
                        <LogOutIcon className="mr-2 h-4 w-4" />
                        {t("nav.logout", "ログアウト")}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <SheetClose asChild>
                        <Link href="/auth/login">
                          <Button className="w-full" variant="outline">
                            {t("nav.login", "ログイン")}
                          </Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/auth/register">
                          <Button className="w-full">{t("nav.register", "新規登録")}</Button>
                        </Link>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* === 中央：ロゴ === */}
          <div className="flex items-center justify-center">
            <Link href="/" className="flex items-center justify-center">
              <Image
                src="/images/logo.png"
                alt="買取ハント"
                width={100}
                height={24}
                sizes="(max-width: 767px) 100px"
                className="h-10 w-auto"
                priority
              />
            </Link>
          </div>

          {/* === 右：カート === */}
          <div className="flex items-center justify-end">
            <Link href="/cart" className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="カート"
                className="h-10 w-10 rounded-full hover:bg-gray-100 relative"
              >
                <ShoppingCart className="h-5 w-5" />
                {totalQty > 0 && (
                  <Badge className="pointer-events-none absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    {totalQty}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* ===== PCヘッダー ===== */}
        <div className="hidden h-16 w-full items-center justify-between md:flex">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/images/logo.png"
              alt="買取ハント"
              width={180}
              height={44}
              sizes="(min-width: 768px) 180px, 140px"
              className="h-10 lg:h-12 w-auto"
              priority
            />
          </Link>

          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium ${
                  pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="minimal" />
            <Link href="/cart" className="relative">
              <Button variant="ghost" size="icon" aria-label="カート" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalQty > 0 && (
                  <Badge className="pointer-events-none absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    {totalQty}
                  </Badge>
                )}
              </Button>
            </Link>

            {mounted && isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <User className="mr-2 h-4 w-4" />
                    {t("nav.mypage", "マイページ")}
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  {t("nav.logout", "ログアウト")}
                </Button>
              </>
            ) : (
              mounted && (
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm">
                      {t("nav.login", "ログイン")}
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button size="sm">{t("nav.register", "新規登録")}</Button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
