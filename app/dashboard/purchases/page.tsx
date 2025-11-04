"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { purchaseAPI } from "@/lib/api"
import type { Purchase } from "@/types/api"

export default function PurchasesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 認証ガード
  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/auth/login?redirect=/dashboard/purchases")
  }, [status, session, router])

  // 購入履歴取得
  useEffect(() => {
    const userId = (session?.user as any)?.id as string | undefined
    if (status !== "authenticated" || !userId) return

    ;(async () => {
      setIsLoading(true)
      try {
        const response = await purchaseAPI.getUserPurchases(userId)
        if (response.success) {
          const raw = response.data as any
          const list: Purchase[] = Array.isArray(raw)
            ? raw
            : Array.isArray(raw.purchases)
              ? raw.purchases
              : []
          setPurchases(list)
        } else {
          setError(response.message || "買取履歴を取得できませんでした")
        }
      } catch (err) {
        console.error(err)
        setError("買取履歴の取得中にエラーが発生しました")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [status, session])

  const getStatusColor = (s: string) => {
    switch (s) {
      case "申込受付":       return "bg-blue-100 text-blue-800"
      case "査定開始":       return "bg-purple-100 text-purple-800"
      case "査定中":         return "bg-yellow-100 text-yellow-800"
      case "査定完了":       return "bg-green-100 text-green-800"
      case "入金処理":       return "bg-orange-100 text-orange-800"
      case "入金完了":       return "bg-red-100 text-red-800"
      case "キャンセル済み": return "bg-gray-100 text-gray-800"
      default:               return "bg-gray-100 text-gray-800"
    }
  }

  const inProgressStatuses = ["申込受付", "査定開始", "査定中", "査定完了", "入金処理"]
  const completedStatuses  = ["入金完了", "キャンセル済み"]

  // API の purchase_method をラベルへ
  const getMethodLabel = (p: any): "郵送買取" | "店頭買取" | null => {
    if (p?.purchase_method === "shipping") return "郵送買取"
    if (p?.purchase_method === "instore")  return "店頭買取"
    return null
  }

  const renderCard = (p: any) => {
    const dateLabel = p?.created_at ? new Date(p.created_at).toLocaleString("ja-JP") : "-"
    // ★修正：金額は final_price を優先。null/undefined の場合は「査定中」
    const priceLabel =
      p?.final_price != null
        ? `¥${Number(p.final_price).toLocaleString()}`
        : "査定中"

    const reservation = p?.reservationNumber ?? p?.reservation_number ?? p?.id
    const methodLabel = getMethodLabel(p)

    return (
      <Card key={p?.id}>
        <CardHeader>
          <CardTitle>申込番号: {reservation}</CardTitle>
          <CardDescription>申込日時: {dateLabel}</CardDescription>

          {methodLabel && (
            <div className="mt-1">
              <span className="text-sm text-muted-foreground">買取方法: </span>
              <Badge variant="secondary" className="align-middle">
                {methodLabel}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground mb-1">商品:</p>
            <ul className="ml-4 list-disc space-y-1 mb-2">
              {Array.isArray(p?.items) &&
                p.items.map((item: any) => (
                  <li key={item?.variant?.id ?? `${p?.id}-${item?.id ?? Math.random()}`}>
                    {item?.variant?.product?.name ?? "不明な商品"} × {item?.quantity ?? 1}
                  </li>
                ))}
            </ul>
            <p>
              <span className="text-muted-foreground">金額:</span> {priceLabel}
            </p>
          </div>

          <Badge className={`${getStatusColor(p?.status)} px-3 py-1 rounded-full text-sm`}>
            {p?.status}
          </Badge>

          <Link href={`/dashboard/purchases/${p?.id}`} prefetch={false}>
            <Button variant="outline" size="sm" className="mt-4 md:mt-0 flex items-center">
              詳細 <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="p-4 text-center">
        <Skeleton className="mx-auto h-12 w-12 animate-spin border-b-2 border-primary rounded-full" />
      </div>
    )
  }
  if (error) {
    return <div className="p-4 text-red-500">エラー: {error}</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link href="/dashboard" prefetch={false}>
          <Button variant="ghost" size="sm" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> ダッシュボードへ
          </Button>
        </Link>
        <h1 className="text-2xl font-bold ml-4">買取履歴</h1>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="in-progress">進行中</TabsTrigger>
          <TabsTrigger value="completed">完了</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {purchases.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">履歴なし</p>
          ) : (
            <div className="space-y-4">{purchases.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="in-progress">
          {purchases.filter((p: any) => inProgressStatuses.includes(p?.status)).length === 0 ? (
            <p className="text-center text-muted-foreground py-12">進行中なし</p>
          ) : (
            <div className="space-y-4">
              {purchases
                .filter((p: any) => inProgressStatuses.includes(p?.status))
                .map(renderCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {purchases.filter((p: any) => completedStatuses.includes(p?.status)).length === 0 ? (
            <p className="text-center text-muted-foreground py-12">完了なし</p>
          ) : (
            <div className="space-y-4">
              {purchases
                .filter((p: any) => completedStatuses.includes(p?.status))
                .map(renderCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
