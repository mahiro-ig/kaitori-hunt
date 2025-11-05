// app/_components/client-root.tsx
"use client";

import type { ReactNode } from "react";

// ここでクライアント用の Provider / フック使用OK
// ※ 下記4つは既存そのまま使います。必ずクライアント安全にしてください。
import { Providers } from "@/components/providers"; // ← SessionProvider 内包（"use client" 必須）
import { AuthProvider } from "@/contexts/auth-context"; // ← "use client" 必須
import { CartProvider } from "@/contexts/cart-context"; // ← "use client" 必須
import { HeaderAndPad } from "@/app/_components/header-gate"; // ← フックを使うなら "use client" 必須

export default function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <AuthProvider>
        <CartProvider>
          <HeaderAndPad>{children}</HeaderAndPad>
        </CartProvider>
      </AuthProvider>
    </Providers>
  );
}
