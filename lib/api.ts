// lib/api.ts

import type {
  User,
  Product,
  Purchase,
  Verification,
  ApiResponse,
} from "@/types/api";

// 共通 API リクエスト関数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const isDev = process.env.NODE_ENV === "development";
    const baseUrl = isDev ? "" : process.env.NEXT_PUBLIC_API_URL ?? "";
    const url = `${baseUrl}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        message: data.message || `Error: ${res.status} ${res.statusText}`,
        status: res.status,
      };
    }

    return {
      success: true,
      data: data as T,
      status: res.status,
    };
  } catch (err) {
    console.error(`⚠️ API Request Error (${endpoint}):`, err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Unknown error occurred",
      status: 500,
    };
  }
}

// 認証 API
export const authAPI = {
  login(email: string, password: string) {
    return apiRequest<{ user: User; token: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  },
  register(data: { name: string; email: string; password: string }) {
    return apiRequest<{ user: User; token: string }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },
  logout() {
    return apiRequest<null>("/api/auth/logout", { method: "POST" });
  },
  getCurrentUser() {
    return apiRequest<User>("/api/me");
  },
  updateProfile(data: {
    name: string;
    phone: string;
    postalCode: string;
    address: string;
  }) {
    return apiRequest<User>(
      "/api/auth/profile",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },
  changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return apiRequest<null>(
      "/api/auth/password",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },
};

// ユーザー API
export const userAPI = {
  getAllUsers() {
    return apiRequest<User[]>("/api/users");
  },
  getUser(id: string) {
    return apiRequest<User>(`/api/users/${id}`);
  },
  updateUser(id: string, data: Partial<User>) {
    return apiRequest<User>(
      `/api/users/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },
  deleteUser(id: string) {
    return apiRequest<null>(`/api/users/${id}`, { method: "DELETE" });
  },
  updateBankAccount(data: {
    bankName: string;
    branchName: string;
    accountType: string;
    accountNumber: string;
    accountName: string;
  }) {
    return apiRequest<User>(
      "/api/auth/bank-account",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },
};

// 商品 API
export const productAPI = {
  getAllProducts() {
    return apiRequest<Product[]>("/api/products");
  },
  getProductsByCategory(category: string) {
    return apiRequest<Product[]>(
      `/api/products/category/${category}`
    );
  },
  getProduct(id: string) {
    return apiRequest<Product>(`/api/products/${id}`);
  },
  createProduct(data: Omit<Product, "id" | "createdAt">) {
    return apiRequest<Product>(
      "/api/products",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },
  updateProduct(id: string, data: Partial<Product>) {
    return apiRequest<Product>(
      `/api/products/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },
  deleteProduct(id: string) {
    return apiRequest<null>(`/api/products/${id}`, { method: "DELETE" });
  },
};

// 購入 API
export const purchaseAPI = {
  getAllPurchases() {
    return apiRequest<Purchase[]>("/api/purchases");
  },
  getUserPurchases(userId: string) {
    return apiRequest<Purchase[]>(
      `/api/purchases/user/${userId}`
    );
  },
  getPurchase(id: string) {
    return apiRequest<Purchase>(`/api/purchases/${id}`);
  },
  createPurchase(data: { productId: string; amount: number }) {
    return apiRequest<Purchase>(
      "/api/purchases",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },
  updatePurchaseStatus(id: string, status: string) {
    return apiRequest<Purchase>(
      `/api/purchases/${id}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      }
    );
  },
};



// カート API
export const cartAPI = {
  getCartItems() {
    return apiRequest<any[]>("/api/cart");
  },
  addToCart(variantId: string, color?: string, capacity?: string) {
    return apiRequest<any>(
      "/api/cart",
      {
        method: "POST",
        body: JSON.stringify({ variantId, color, capacity }),
      }
    );
  },
  removeFromCart(itemId: string) {
    return apiRequest<null>(
      `/api/cart/${itemId}`,
      { method: "DELETE" }
    );
  },
  clearCart() {
    return apiRequest<null>(
      "/api/cart/clear",
      { method: "POST" }
    );
  },
  // 修正：フォームデータではなく、必ず cartItems と totalPrice を一緒に送信
  submitBuybackRequest(
    cartItems: Array<{ variant: { id: string; buyback_price: number }; quantity: number }>,
    totalPrice: number
  ) {
    return apiRequest<any>(
      "/api/buyback/request",
      {
        method: "POST",
        body: JSON.stringify({ cartItems, totalPrice }),
      }
    );
  },
};

// 管理者 API
export const adminAPI = {
  login(email: string, password: string) {
    return apiRequest<{ user: User; token: string }>(
      "/api/admin/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
  },
  logout() {
    return apiRequest<null>("/api/admin/logout", { method: "POST" });
  },
  getDashboardStats() {
    return apiRequest<{
      totalUsers: number;
      totalPurchases: number;
      totalVerifications: number;
      recentPurchases: Purchase[];
    }>("/api/admin/dashboard");
  },
  generateReport(
    type: "users" | "purchases" | "verifications",
    dateRange: { start: string; end: string }
  ) {
    return apiRequest<{ url: string }>(
      "/api/admin/reports",
      {
        method: "POST",
        body: JSON.stringify({ type, dateRange }),
      }
    );
  },
};
