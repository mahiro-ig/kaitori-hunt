// app/dashboard/purchases/[id]/page.tsx
'use client'

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Truck, FileDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineIcon,
  TimelineTitle,
  TimelineContent,
  TimelineDot,
} from "@/components/ui/timeline"
import { Badge } from "@/components/ui/badge"

// ==============================
// 型定義（必要最小限の変更：snapshot_name を追加／variant・product を null 許容）
// ==============================
interface PurchaseItem {
  price: number
  quantity: number
  snapshot_name?: string | null
  variant: {
    id: number
    color: string | null
    capacity: string | null
    product: {
      id: number
      name: string | null
      image_url: string | null
    } | null
  } | null
}

interface PurchaseType {
  id: string
  reservation_number: string
  created_at: string
  status: string
  items: PurchaseItem[]
  amount: number
  purchase_method?: "shipping" | "instore" | null
  final_price: number | null
  deduction_reason: string | null
  is_assessed: boolean | null
}

interface HistoryEntry {
  id: string
  previous_status: string
  new_status: string
  changed_at: string
}

export default function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  // Next.js Params 解決（既存コード踏襲）
  const { id } = React.use(params as any) as { id: string }

  const [purchase, setPurchase] = useState<PurchaseType | null>(null)
  const [histories, setHistories] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [shippingCompany, setShippingCompany] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 認証ガード
  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.push(`/auth/login?redirect=/dashboard/purchases/${id}`)
    }
  }, [status, router, id])

  // 購入データ取得
  useEffect(() => {
    if (status !== "authenticated") return
    const userId = (session?.user as any)?.id
    if (!userId) return

    ;(async () => {
      try {
        const res = await fetch(`/api/purchases/user/${userId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "取得に失敗しました")
        const found = (json.purchases as PurchaseType[]).find(p => p.id === id)
        if (!found) throw new Error("該当する購入が見つかりません")
        setPurchase(found)
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました")
      } finally {
        setLoading(false)
      }
    })()
  }, [status, session, id])

  // 履歴データ取得
  useEffect(() => {
    if (!purchase) return
    ;(async () => {
      try {
        const res = await fetch(`/api/purchases/${id}/history`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "履歴の取得に失敗しました")
        setHistories(json.histories || [])
      } catch (err) {
        console.error(err)
      }
    })()
  }, [purchase, id])

  // ステータスカラー
  const getStatusColor = (s: string) => {
    switch (s) {
      case "申込受付": return "bg-blue-100 text-blue-800"
      case "査定開始": return "bg-purple-100 text-purple-800"
      case "査定中": return "bg-yellow-100 text-yellow-800"
      case "査定完了": return "bg-green-100 text-green-800"
      case "入金処理": return "bg-orange-100 text-orange-800"
      case "入金完了": return "bg-red-100 text-red-800"
      case "キャンセル済み": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // 買取方法ラベル
  const getMethodLabel = (m?: "shipping" | "instore" | null) =>
    m === "shipping" ? "郵送買取" : m === "instore" ? "店頭買取" : null

  // 発送情報登録
  const handleShippingSubmit = () => {
    if (!shippingCompany || !trackingNumber) {
      toast({
        title: "入力エラー",
        description: "運送会社と追跡番号を入力してください",
        variant: "destructive",
      })
      return
    }
    // TODO: PUT /api/purchases/${id}/shipping
    toast({ title: "発送情報を登録しました" })
    setIsDialogOpen(false)
  }

  if (status === "loading" || loading) {
    return <p className="text-center py-8">読み込み中…</p>
  }
  if (error) {
    return <p className="text-center py-8 text-red-600">エラー: {error}</p>
  }
  if (!purchase) {
    return <p className="text-center py-8">購入データが見つかりません。</p>
  }

  const methodLabel = getMethodLabel(purchase.purchase_method)
  const isAssessed = purchase.is_assessed === true || purchase.status === "査定完了"

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-center mb-6">
        <Link
          href="/dashboard/purchases"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mr-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> 買取履歴に戻る
        </Link>
        <h1 className="text-2xl font-bold">買取依頼詳細</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* メイン内容 */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  {/* 申込番号 */}
                  <CardTitle className="text-lg font-medium">
                    申込番号: {purchase.reservation_number}
                  </CardTitle>
                  <CardDescription>
                    申込日: {new Date(purchase.created_at).toLocaleDateString("ja-JP")}
                  </CardDescription>

                  {/* 申込日の下に買取方法を表示 */}
                  {methodLabel && (
                    <div className="mt-1">
                      <span className="text-sm text-muted-foreground">買取方法: </span>
                      <Badge variant="secondary" className="align-middle">
                        {methodLabel}
                      </Badge>
                    </div>
                  )}
                </div>
                <span
                  className={`mt-2 md:mt-0 px-3 py-1 rounded-full text-sm ${getStatusColor(
                    purchase.status
                  )}`}
                >
                  {purchase.status}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 商品一覧 */}
              <section>
                <h2 className="text-lg font-semibold mb-4">商品一覧</h2>
                <div className="space-y-4">
                  {purchase.items.map((it, idx) => {
                    const v = it.variant
                    const p = v?.product ?? null

                    // ====== フォールバック強化（順） ======
                    // 1) products.name
                    // 2) API が返す snapshot_name（注文時のタイトル）
                    // 3) "商品ID: <variant.id>"
                    // 4) "商品（削除済み）"
                    const titleBase =
                      (p?.name && p.name.trim()) ||
                      (it.snapshot_name && it.snapshot_name.trim()) ||
                      (v?.id != null ? `商品ID: ${v.id}` : "商品（削除済み）")

                    const attrs = [v?.color ?? undefined, v?.capacity ?? undefined]
                      .filter(Boolean)
                      .join(" / ")

                    const title = attrs ? `${titleBase} / ${attrs}` : titleBase

                    // 画像は product.image_url のみ使用（なければプレースホルダー）
                    const imageUrl = p?.image_url ?? null

                    return (
                      <div
                        key={v?.id ?? `row-${idx}`}
                        className="flex items-center space-x-4 p-4 border rounded-md"
                      >
                        <div className="w-16 h-16 relative">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={title}
                              fill
                              className="object-cover rounded"
                            />
                          ) : (
                            <div className="bg-gray-100 w-full h-full flex items-center justify-center rounded">
                              <FileDown className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{title}</p>
                          <p className="text-sm">
                            単価: ¥{it.price.toLocaleString()} × {it.quantity} 個
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <Separator />

              {/* 合計金額 */}
              <section>
                <h2 className="text-lg font-semibold mb-2">合計金額</h2>
                <p className="text-xl font-bold">¥{purchase.amount.toLocaleString()}</p>
              </section>

              <Separator />

              {/* 査定結果 */}
              <section>
                <h2 className="text-lg font-semibold mb-2">査定結果</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">査定額（確定）</p>
                    <p className="text-lg font-semibold">
                      {purchase.final_price != null
                        ? `¥${purchase.final_price.toLocaleString()}`
                        : "未確定"}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Badge
                      className={
                        isAssessed
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {isAssessed ? "確定済み" : "未確定"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">減額理由</p>
                    <p className="text-sm">
                      {purchase.deduction_reason ?? "—"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ※ ステータスが「査定完了」になると、査定額が確定します。
                </p>
              </section>

              <Separator />

              {/* 発送情報ダイアログ */}
              {purchase.status === "発送待ち" && (
                <section className="mt-6">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Truck className="mr-2 h-4 w-4" /> 発送情報を登録する
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>発送情報の登録</DialogTitle>
                        <DialogDescription>
                          商品を発送した後、運送会社と追跡番号を入力してください。
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="shippingCompany">運送会社</Label>
                          <Select
                            value={shippingCompany}
                            onValueChange={setShippingCompany}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="運送会社を選択" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ヤマト運輸">ヤマト運輸</SelectItem>
                              <SelectItem value="佐川急便">佐川急便</SelectItem>
                              <SelectItem value="日本郵便">日本郵便</SelectItem>
                              <SelectItem value="福山通運">福山通運</SelectItem>
                              <SelectItem value="西濃運輸">西濃運輸</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trackingNumber">追跡番号</Label>
                          <Input
                            id="trackingNumber"
                            name="trackingNumber"
                            value={trackingNumber}
                            onChange={e => setTrackingNumber(e.target.value)}
                            placeholder="追跡番号を入力"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          キャンセル
                        </Button>
                        <Button onClick={handleShippingSubmit}>登録する</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </section>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 買取ステータス履歴 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>買取ステータス履歴</CardTitle>
              <CardDescription>ステータス変更の履歴</CardDescription>
            </CardHeader>
            <CardContent>
              <Timeline>
                {histories.map(h => (
                  <TimelineItem key={h.id}>
                    <TimelineConnector />
                    <TimelineHeader>
                      <TimelineIcon>
                        <TimelineDot className={getStatusColor(h.new_status)} />
                      </TimelineIcon>
                      <TimelineTitle>
                        {h.previous_status} → {h.new_status}
                      </TimelineTitle>
                    </TimelineHeader>
                    <TimelineContent>
                      <p className="text-sm text-gray-500">
                        {new Date(h.changed_at).toLocaleString("ja-JP")}
                      </p>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
