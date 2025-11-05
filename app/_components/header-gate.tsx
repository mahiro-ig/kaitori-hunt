"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { Header } from "@/components/header";

export function HeaderAndPad({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  if (isAdmin) return <>{children}</>;

  return (
    <div className="min-h-[100svh] overflow-x-hidden bg-background">
      <Header />
      <main className="pb-[env(safe-area-inset-bottom)]">{children}</main>
    </div>
  );
}

// ✅ default export を必ず用意
export default HeaderAndPad;
