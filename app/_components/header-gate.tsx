// app/_components/client-root.tsx
"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Providers } from "@/components/providers";

const HeaderAndPad = dynamic(
  () => import("@/app/_components/header-gate").then((m) => m.HeaderAndPad),
  { ssr: false }
);

export default function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <HeaderAndPad>{children}</HeaderAndPad>
    </Providers>
  );
}
