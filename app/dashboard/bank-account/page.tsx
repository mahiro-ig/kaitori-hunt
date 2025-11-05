"use client"

'use client'

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
    bankName:      "",
    branchName:    "",
    accountType:   "譎ｮ騾・,
    accountNumber: "",
    accountName:   "",
  })
  const [isFetching, setIsFetching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 隱崎ｨｼ繧ｬ繝ｼ繝・  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") {
      router.push("/auth/login?redirect=/dashboard/bank-account")
    }
  }, [status, router])

  // 蛻晄悄繝・・繧ｿ蜿門ｾ・  useEffect(() => {
    if (status !== "authenticated") return
    const fetchData = async () => {
      setIsFetching(true)
      try {
        const res = await fetch("/api/auth/bank-account")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆")
        setFormData({
          bankName:      data.bankName,
          branchName:    data.branchName,
          accountType:   data.accountType,
          accountNumber: data.accountNumber,
          accountName:   data.accountName,
        })
      } catch (err) {
        toast({
          title: "蜿門ｾ励お繝ｩ繝ｼ",
          description: err instanceof Error ? err.message : "繧ｨ繝ｩ繝ｼ",
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
    setFormData(prev => ({ ...prev, [name]: value }))
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
      if (!res.ok) throw new Error(data.error || "譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆")
      toast({ title: "譖ｴ譁ｰ謌仙粥", description: "謖ｯ霎ｼ蜈域ュ蝣ｱ繧呈峩譁ｰ縺励∪縺励◆" })
    } catch (err) {
      toast({
        title: "譖ｴ譁ｰ繧ｨ繝ｩ繝ｼ",
        description: err instanceof Error ? err.message : "繧ｨ繝ｩ繝ｼ",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ陦ｨ遉ｺ
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
          繝繝・す繝･繝懊・繝峨↓謌ｻ繧・        </Link>
        <h1 className="text-2xl font-bold">謖ｯ霎ｼ蜈域ュ蝣ｱ縺ｮ邱ｨ髮・/h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>謖ｯ霎ｼ蜈亥哨蠎ｧ諠・ｱ</CardTitle>
          <CardDescription>
            雋ｷ蜿夜≡縺ｮ謖ｯ霎ｼ蜈亥哨蠎ｧ諠・ｱ繧貞・蜉帙＠縺ｦ縺上□縺輔＞
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 驫陦悟錐 */}
            <div className="space-y-2">
              <Label htmlFor="bankName">驫陦悟錐</Label>
              <Input
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
            {/* 謾ｯ蠎怜錐 */}
            <div className="space-y-2">
              <Label htmlFor="branchName">謾ｯ蠎怜錐</Label>
              <Input
                id="branchName"
                name="branchName"
                value={formData.branchName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
            {/* 蜿｣蠎ｧ遞ｮ蛻･ */}
            <div className="space-y-2">
              <Label htmlFor="accountType">蜿｣蠎ｧ遞ｮ蛻･</Label>
              <Input
                id="accountType"
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
            {/* 蜿｣蠎ｧ逡ｪ蜿ｷ */}
            <div className="space-y-2">
              <Label htmlFor="accountNumber">蜿｣蠎ｧ逡ｪ蜿ｷ</Label>
              <Input
                id="accountNumber"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
            {/* 蜿｣蠎ｧ蜷咲ｾｩ */}
            <div className="space-y-2">
              <Label htmlFor="accountName">蜿｣蠎ｧ蜷咲ｾｩ・医き繧ｿ繧ｫ繝奇ｼ・/Label>
              <Input
                id="accountName"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <Alert className="bg-muted">
              <AlertDescription>
                豕ｨ諢丈ｺ矩・ｼ壼哨蠎ｧ蜷咲ｾｩ縺ｯ莨壼藤逋ｻ骭ｲ譎ゅ・豌丞錐縺ｨ荳閾ｴ縺励※縺・ｋ蠢・ｦ√′縺ゅｊ縺ｾ縺吶・            
              </AlertDescription>
            </Alert>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  譖ｴ譁ｰ荳ｭ...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  謖ｯ霎ｼ蜈域ュ蝣ｱ繧呈峩譁ｰ縺吶ｋ
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
