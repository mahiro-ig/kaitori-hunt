"use client";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Providers } from "@/components/providers";
import { GuardBoundary } from "./guard-boundary";

const HeaderAndPad = dynamic(
  () => import("@/app/_components/header-gate").then(m => m.HeaderAndPad),
  { ssr: false }
);

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <GuardBoundary>
        <HeaderAndPad>{children}</HeaderAndPad>
      </GuardBoundary>
    </Providers>
  );
}
