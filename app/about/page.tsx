"use client"
// app/about/page.tsx

import React, { useState, FormEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, MapPin, Phone as PhoneIcon, Mail, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus("sending")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      })
      if (!res.ok) throw new Error("送信に失敗しました")
      setStatus("success")
      setName("")
      setEmail("")
      setPhone("")
      setMessage("")
    } catch (err) {
      console.error(err)
      setStatus("error")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center mb-6">
        <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary mr-4">
          <ArrowLeft className="mr-1 h-4 w-4" />
          ホームに戻る
        </Link>
        <h1 className="text-2xl font-bold">会社概要</h1>
      </div>

      {/* 会社概要セクション */}
      <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
        <div>
          <h2 className="text-3xl font-bold mb-4">買取ハントについて</h2>
          <p className="text-muted-foreground mb-4">
            買取ハントは、五十嵐商事株式会社が運営する、iPhone、カメラ、ゲーム機の専門買取サービスです。
            カテゴリーにとらわれずあらゆる商品の価値を見抜き、適正価格での買取を実現してきました。
          </p>
          <p className="text-muted-foreground mb-4">
            私たちは、専門知識を持ったスタッフによる丁寧な査定と、迅速な買取、透明性のある買取価格の提示を大切にしています。
            また、お客様の個人情報保護にも最大限の配慮をしており、安心してご利用いただけるサービスを提供しています。
          </p>
          <p className="text-muted-foreground mb-6">
            新品未使用品のみを対象とした買取サービスで、高品質な二次流通市場の形成に貢献しています。
          </p>
          <Link href="/how-it-works">
            <Button>買取の流れを見る</Button>
          </Link>
        </div>
        <div className="order-first md:order-last">
          <Image
            src="/images/logo-symbol.png"
            alt="買取ハント"
            width={400}
            height={400}
            className="rounded-lg w-full max-w-[400px] mx-auto"
          />
        </div>
      </div>

      {/* 会社情報カード */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">会社情報</h2>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>五十嵐商事株式会社</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-2 text-primary shrink-0" />
                  <p>〒950-0087 新潟県新潟市中央区東大通1-2-30 第3マルカビル 10F</p>
                </div>
                <div className="flex items-start">
                  <PhoneIcon className="h-5 w-5 mr-2 text-primary shrink-0" />
                  <p>お問い合わせ電話番号: 025-333-8655</p>
                </div>
                <div className="flex items-start">
                  <Mail className="h-5 w-5 mr-2 text-primary shrink-0" />
                  <p>info@kaitori-hunt.com</p>
                </div>
                <div className="flex items-start">
                  <Clock className="h-5 w-5 mr-2 text-primary shrink-0" />
                  <p>営業時間: 9:30〜19:00 定休日：日曜日、祝日　（店舗営業時間とは異なります。）</p>
                </div>
                <div className="pt-4 space-y-2">
                  <p>
                    <span className="font-medium">設立:</span> 1964年4月1日
                  </p>
                  <p>
                    <span className="font-medium">資本金:</span> 3,500万円
                  </p>
                  <p>
                    <span className="font-medium">代表取締役:</span> 五十嵐真宙
                  </p>
                  <p>
                    <span className="font-medium">古物商許可証:</span> 新潟県公安委員会 第461100000687号
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


    </div>
  )
}
