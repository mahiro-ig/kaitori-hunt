// API共通レスポンス型
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
  status?: number
}

// ユーザー型
export interface User {
  id: string
  name: string
  email: string
  phone: string
  address: string
  postalCode: string
  status: "認証済み" | "認証待ち" | "認証失敗" | "無効"
  verificationDocumentType?: string
  verificationDocumentUrl?: string
  selfieImageUrl?: string
  verificationDate?: string
  verifiedBy?: string
  bankAccount?: {
    bankName: string
    branchName: string
    accountType: string
    accountNumber: string
    accountName: string
  }
  createdAt: string
  updatedAt: string
  role?: string
  profileImage?: string
  verified?: boolean
}

// 管理者ユーザー型
export interface AdminUser {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "operator"
  token: string
  createdAt: string
  updatedAt: string
}

// 認証レスポンス型
export interface AuthResponse {
  user: User
  token: string
}

// 製品型
export interface Product {
  id: string
  name: string
  description: string
  category: string
  imageUrl: string
  basePrice?: number
  createdAt?: string
  condition?: string
  price?: number
}

// 製品バリアント型
export interface ProductVariant {
  id: string
  productId: string
  color?: string
  capacity?: string
  condition?: string
  price: number
  imageUrl?: string
  targetQuantity?: number
  currentQuantity?: number
  nextPrice?: number
  nextPriceQuantity?: number
}

// カートアイテム型
export interface CartItem {
  id: string
  userId: string
  product: Product
  variant: ProductVariant
  createdAt: string
}

// 買取リクエスト型
export interface BuybackRequest {
  id: string
  userId: string
  user: User
  items: {
    id: string
    product: Product
    variant: ProductVariant
    price: number
  }[]
  totalAmount: number
  status:
    | "買取依頼済み"
    | "買取依頼承認済み"
    | "発送待ち"
    | "発送済み"
    | "査定完了"
    | "取引完了"
    | "キャンセル"
    | "査定待ち"
    | "支払い完了"
  shippingInfo?: {
    trackingNumber?: string
    carrier?: string
    shippedDate?: string
  }
  paymentInfo?: {
    paymentDate?: string
    paymentAmount: number
    paymentMethod: string
    transactionId?: string
  }
  notes?: string
  adminNotes?: string
  createdAt: string
  updatedAt: string
}

// 本人確認型
export interface Verification {
  id: string
  userId: string
  user: User
  status: "pending" | "approved" | "rejected" | "審査待ち"
  documentType: string
  documentImage: string
  createdAt: string
  updatedAt: string
  selfieImage?: string
}

// 購入履歴型
export interface Purchase {
  id: string
  userId: string
  productId: string
  status: string
  amount: number
  createdAt: string
  updatedAt: string
  product: Product
}
export type LanguageCode = "ja" | "en" | "zh" | "vi" | "th" | "ko"
