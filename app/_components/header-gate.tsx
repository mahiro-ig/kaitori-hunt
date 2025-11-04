"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { Header } from "../../components/header";

export function HeaderAndPad({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  if (isAdmin) return <>{children}</>;

  return (
    <div className="min-h-[100svh] overflow-x-hidden bg-background">
      {/* 非固定ヘッダー（通常フロー） */}
      <Header />

      {/* 余白は不要。safe-area の下余白だけ残すなら pb のみ */}
      <main className="pb-[env(safe-area-inset-bottom)]">
        {children}
      </main>
    </div>
  );
}

export default HeaderAndPad;
