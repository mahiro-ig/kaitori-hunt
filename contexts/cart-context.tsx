// /contexts/cart-context.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/auth-context";

// カート内アイテムの型定義
export interface CartItem {
  id: string;
  quantity: number;
  variant: {
    id: string;
    color: string;
    capacity: string | null;
    buyback_price: number;
  };
  product: {
    id: string;
    name: string;
    description: string | null;
    max_buyback_price: number | null;
    category: "iphone" | "camera" | "game";
  };
  imageUrl: string;
}

// コンテキストで提供する値の型
export type CartContextValue = {
  items: CartItem[];
  addToCart: (
    variantId: string,
    color: string,
    capacity: string | null,
    quantity?: number,
    userDetails?: {
      phone?: string;
      postal_code?: string;
      address?: string;
      bank_name?: string;
      branch_name?: string;
      account_type?: string;
      account_number?: string;
      account_name?: string;
    }
  ) => Promise<boolean>;
  updateQuantity: (id: string, quantity: number) => Promise<boolean>;
  removeFromCart: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearCart: () => Promise<void>; // ✅ 追加
};

// コンテキストの作成
const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart", {
        method: "GET",
        credentials: "include", // ✅ 認証クッキーを同送
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const text = await res.text();

      if (res.status === 401) {
        // ✅ セッション未確定や未ログインの一時状態は静かに握りつぶす
        setItems([]);
        return;
      }
      if (!res.ok) {
        console.error("[CartContext] fetchCart HTTP error:", res.status, text);
        setItems([]);
        return;
      }

      const json = text ? JSON.parse(text) : { items: [] };
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      console.error("[CartContext] fetchCart unexpected error:", e);
      setItems([]);
    }
  };

  const addToCart = async (
    variantId: string,
    color: string,
    capacity: string | null,
    quantity: number = 1,
    userDetails?: {
      phone?: string;
      postal_code?: string;
      address?: string;
      bank_name?: string;
      branch_name?: string;
      account_type?: string;
      account_number?: string;
      account_name?: string;
    }
  ): Promise<boolean> => {
    try {
      const body = {
        variantId,
        color,
        capacity,
        quantity,
        ...userDetails,
      };

      const res = await fetch("/api/cart", {
        method: "POST",
        credentials: "include", // ✅ 追加
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[CartContext] addToCart HTTP error:", res.status, err);
        return false;
      }
      await fetchCart();
      return true;
    } catch (e) {
      console.error("[CartContext] addToCart error:", e);
      return false;
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
    try {
      const res = await fetch(`/api/cart/${id}`, {
        method: "PATCH",
        credentials: "include", // ✅ 追加
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error(
          "[CartContext] updateQuantity HTTP error:",
          res.status,
          err
        );
        return false;
      }
      return true;
    } catch (e) {
      console.error("[CartContext] updateQuantity error:", e);
      return false;
    }
  };

  const removeFromCart = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      const res = await fetch(`/api/cart/${id}`, {
        method: "DELETE",
        credentials: "include", // ✅ 追加
      });
      if (!res.ok) {
        const err = await res.text();
        console.error(
          "[CartContext] removeFromCart HTTP error:",
          res.status,
          err
        );
        return false;
      }
      return true;
    } catch (e) {
      console.error("[CartContext] removeFromCart error:", e);
      return false;
    }
  };

  const clearCart = async () => {
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        credentials: "include", // ✅ 追加
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("[CartContext] clearCart HTTP error:", res.status, err);
      }
    } catch (e) {
      console.error("[CartContext] clearCart error:", e);
    }
    setItems([]); // ローカル状態もクリア
  };

  useEffect(() => {
    if (isLoggedIn) fetchCart();
    else setItems([]);
  }, [isLoggedIn]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        refresh: fetchCart,
        clearCart, // ✅ 追加
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
