// app/dashboard/profile/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authAPI } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

export default function ProfilePage() {
  const router = useRouter()
  const { status } = useSession()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    postalCode: "",
    address: "",
    notes: "",
  })

  // 認証ガード
  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.push("/auth/login?redirect=/dashboard/profile")
    }
  }, [status, router])

  // ページ開いたら /api/me を叩いて初期化
  useEffect(() => {
    if (status !== "authenticated") return
    ;(async () => {
      try {
        const res = await authAPI.getCurrentUser()
        if (res.success && res.data) {
          setFormData({
            name: res.data.name,
            email: res.data.email,
            phone: res.data.phone,
            postalCode: res.data.postalCode,
            address: res.data.address,
            notes: "", // notes は自由入力
          })
        } else {
          toast({ title: "取得失敗", description: res.message, variant: "destructive" })
        }
      } catch (err) {
        toast({ title: "エラー", description: "ユーザー情報の取得に失敗しました", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    })()
  }, [status])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((p) => ({ ...p, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { name, phone, postalCode, address } = formData
      const res = await authAPI.updateProfile({ name, phone, postalCode, address })
      if (res.success) {
        toast({ title: "更新完了", description: "会員情報を更新しました" })
      } else {
        toast({ title: "更新失敗", description: res.message, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "エラー", description: "更新に失敗しました", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex justify-center h-64 items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center mb-6">
        <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary mr-4">
          <ArrowLeft className="mr-1 h-4 w-4" />
          ダッシュボードに戻る
        </Link>
        <h1 className="text-2xl font-bold">会員情報の編集</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>会員情報</CardTitle>
          <CardDescription>会員情報を確認・編集できます</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* お名前 */}
            <div className="space-y-2">
              <Label htmlFor="name">お名前</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                required
              />
            </div>
            {/* メール（読み取り専用） */}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input id="email" name="email" type="email" value={formData.email} disabled className="bg-muted" />
            </div>
            {/* 電話番号 */}
            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} disabled={isSubmitting} />
            </div>
            {/* 郵便番号 */}
            <div className="space-y-2">
              <Label htmlFor="postalCode">郵便番号</Label>
              <Input
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            {/* 住所 */}
            <div className="space-y-2">
              <Label htmlFor="address">住所</Label>
              <Input id="address" name="address" value={formData.address} onChange={handleChange} disabled={isSubmitting} />
            </div>
            

            <Alert className="bg-muted">
              <AlertDescription>
                18歳未満の方は買取申込ごとに保護者同意書が必要です。詳細はお問い合わせください。
              </AlertDescription>
            </Alert>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "更新中..." : <><Save className="mr-2 h-4 w-4" />更新する</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
