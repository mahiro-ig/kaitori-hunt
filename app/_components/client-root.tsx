"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Providers } from "@/components/providers";

// ✅ named の then をやめて default をそのまま import
const HeaderAndPad = dynamic(() => import("@/app/_components/header-gate"), {
  ssr: false,
});

export default function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <HeaderAndPad>{children}</HeaderAndPad>
    </Providers>
  );
}
