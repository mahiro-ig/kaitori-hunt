"use server"

import { cookies } from "next/headers"
import type { User, Product, ProductVariant, BuybackRequest, AdminUser } from "@/types/api"

// サーバーサイドAPI URL
const API_URL = process.env.API_URL || "https://api.kaitori-hunt.example.com/v1"

// サーバーサイドAPIリクエスト用のヘルパー関数
async function fetchServerAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    // クッキーから認証トークンを取得
    const cookieStore = cookies()
    const token = cookieStore.get("authToken")?.value

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      cache: "no-store", // SSR時のキャッシュを無効化
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Server API Error:", error)
    throw error
  }
}

// ユーザー情報を取得
export async function getCurrentUser(): Promise<User | null> {
  try {
    const data = await fetchServerAPI<{ data: User }>("/auth/me")
    return data.data
  } catch (error) {
    console.error("Failed to get current user:", error)
    return null
  }
}

// 製品カテゴリーを取得
export async function getProductsByCategory(category: string): Promise<Product[]> {
  try {
    const data = await fetchServerAPI<{ data: Product[] }>(`/products/category/${category}`)
    return data.data
  } catch (error) {
    console.error(`Failed to get products for category ${category}:`, error)
    return []
  }
}

// 製品詳細を取得
export async function getProductDetails(
  productId: string,
): Promise<{ product: Product; variants: ProductVariant[] } | null> {
  try {
    const data = await fetchServerAPI<{ data: { product: Product; variants: ProductVariant[] } }>(
      `/products/${productId}`,
    )
    return data.data
  } catch (error) {
    console.error(`Failed to get product details for ${productId}:`, error)
    return null
  }
}

// 買取履歴を取得
export async function getPurchaseHistory(): Promise<BuybackRequest[]> {
  try {
    const data = await fetchServerAPI<{ data: BuybackRequest[] }>("/user/purchases")
    return data.data
  } catch (error) {
    console.error("Failed to get purchase history:", error)
    return []
  }
}

// 買取詳細を取得
export async function getPurchaseDetails(purchaseId: string): Promise<BuybackRequest | null> {
  try {
    const data = await fetchServerAPI<{ data: BuybackRequest }>(`/user/purchases/${purchaseId}`)
    return data.data
  } catch (error) {
    console.error(`Failed to get purchase details for ${purchaseId}:`, error)
    return null
  }
}

// 管理者用API
export async function getAllUsers(): Promise<User[]> {
  try {
    const data = await fetchServerAPI<{ data: User[] }>("/admin/users")
    return data.data
  } catch (error) {
    console.error("Failed to get all users:", error)
    return []
  }
}

export async function getUserDetails(userId: string): Promise<User | null> {
  try {
    const data = await fetchServerAPI<{ data: User }>(`/admin/users/${userId}`)
    return data.data
  } catch (error) {
    console.error(`Failed to get user details for ${userId}:`, error)
    return null
  }
}

export async function updateUserStatus(userId: string, status: string, note?: string): Promise<boolean> {
  try {
    await fetchServerAPI(`/admin/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, note }),
    })
    return true
  } catch (error) {
    console.error(`Failed to update status for user ${userId}:`, error)
    return false
  }
}

export async function getAllPurchases(): Promise<BuybackRequest[]> {
  try {
    const data = await fetchServerAPI<{ data: BuybackRequest[] }>("/admin/purchases")
    return data.data
  } catch (error) {
    console.error("Failed to get all purchases:", error)
    return []
  }
}

export async function getPendingVerifications(): Promise<User[]> {
  try {
    const data = await fetchServerAPI<{ data: User[] }>("/admin/verifications/pending")
    return data.data
  } catch (error) {
    console.error("Failed to get pending verifications:", error)
    return []
  }
}

export async function approveVerification(userId: string): Promise<boolean> {
  try {
    await fetchServerAPI(`/admin/verifications/${userId}/approve`, {
      method: "POST",
    })
    return true
  } catch (error) {
    console.error(`Failed to approve verification for user ${userId}:`, error)
    return false
  }
}

export async function rejectVerification(userId: string, reason: string): Promise<boolean> {
  try {
    await fetchServerAPI(`/admin/verifications/${userId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    })
    return true
  } catch (error) {
    console.error(`Failed to reject verification for user ${userId}:`, error)
    return false
  }
}

export async function adminLogin(email: string, password: string): Promise<AdminUser | null> {
  try {
    const data = await fetchServerAPI<{ data: AdminUser }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    return data.data
  } catch (error) {
    console.error("Failed to login as admin:", error)
    return null
  }
}
