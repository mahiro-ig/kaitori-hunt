"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"

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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"

export default function BankAccountPage() {
  const { status } = useSession()
  const router = useRouter()

  const [formData, setFormData] = useState({
    bankName: "",
    branchName: "",
    accountType: "普通",
    accountNumber: "",
    accountName: "",
  })
  const [isFetching, setIsFetching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // セッション確認（未ログインはログイン画面へ）
  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.push("/auth/login?redirect=/dashboard/bank-account")
    }
  }, [status, router])

  // 初期データ取得
  useEffect(() => {
    if (status !== "authenticated") return
    const fetchData = async () => {
      setIsFetching(true)
      try {
        const res = await fetch("/api/auth/bank-account")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "情報の取得に失敗しました。")
        setFormData({
          bankName: data.bankName ?? "",
          branchName: data.branchName ?? "",
          accountType: data.accountType ?? "普通",
          accountNumber: data.accountNumber ?? "",
          accountName: data.accountName ?? "",
        })
      } catch (err) {
        toast({
          title: "取得エラー",
          description: err instanceof Error ? err.message : "不明なエラーです。",
          variant: "destructive",
        })
      } finally {
        setIsFetching(false)
      }
    }
    fetchData()
  }, [status])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/auth/bank-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "保存に失敗しました。")
      toast({
        title: "保存しました",
        description: "振込口座情報を更新しました。",
      })
    } catch (err) {
      toast({
        title: "保存エラー",
        description: err instanceof Error ? err.message : "不明なエラーです。",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ローディング表示
  if (status === "loading" || isFetching) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center mb-6">
        <Link
          href="/dashboard"
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary mr-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          ダッシュボードに戻る
        </Link>
        <h1 className="text-2xl font-bold">振込口座の登録 / 編集</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>振込口座情報</CardTitle>
          <CardDescription>
            売上の振込先として使用します。正確にご入力ください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 銀行名 */}
            <div className="space-y-2">
              <Label htmlFor="bankName">銀行名</Label>
              <Input
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="例）○○銀行"
              />
            </div>

            {/* 支店名 */}
            <div className="space-y-2">
              <Label htmlFor="branchName">支店名</Label>
              <Input
                id="branchName"
                name="branchName"
                value={formData.branchName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="例）新潟支店"
              />
            </div>

            {/* 口座種別 */}
            <div className="space-y-2">
              <Label htmlFor="accountType">口座種別</Label>
              <Input
                id="accountType"
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="普通 / 当座"
              />
            </div>

            {/* 口座番号 */}
            <div className="space-y-2">
              <Label htmlFor="accountNumber">口座番号</Label>
              <Input
                id="accountNumber"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                inputMode="numeric"
                placeholder="半角数字のみ"
              />
            </div>

            {/* 口座名義（カナ） */}
            <div className="space-y-2">
              <Label htmlFor="accountName">口座名義（カナ）</Label>
              <Input
                id="accountName"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                placeholder="例）イガラシ　タロウ"
              />
            </div>

            <Alert className="bg-muted">
              <AlertDescription>
                口座名義は
                <b>カタカナ・全角・スペース可</b>
                で、本人確認書類の氏名と一致させてください。
              </AlertDescription>
            </Alert>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  振込口座を保存する
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
