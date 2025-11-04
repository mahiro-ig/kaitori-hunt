"use client"

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, User as UserIcon, Archive as ArchiveIcon, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

type UserProfile = {
  id: string
  publicId: string           
  name: string
  email: string
  phone: string
  postalCode: string
  address: string
  bankName: string
  branchName: string
  accountType: string
  accountNumber: string
  accountName: string
  createdAt: string
}


export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 認証ガード
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/auth/login?redirect=/dashboard')
    }
  }, [status, router])

  // ユーザー情報取得
  useEffect(() => {
    if (status !== 'authenticated') return

    const fetchUser = async () => {
      try {
        const res = await fetch('/api/me')
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || '認証に失敗しました')
        } else {
          setUser(data)
        }
      } catch {
        setError('ユーザー情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [status])

  if (status === 'loading' || loading) {
    return <div className="p-4">読み込み中...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">エラー: {error}</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">マイページ</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/" prefetch={false} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> ホームに戻る
          </Link>
        </Button>
      </div>

      {/* メインコンテンツ */}
      <div className="grid gap-6">
        {/* ユーザー情報カード */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>ユーザー情報</CardTitle>
            <CardDescription>アカウント情報と会員ID</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">お名前</h3>
                <p className="text-lg font-medium">{user?.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">メールアドレス</h3>
                <p className="text-lg font-medium">{user?.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">会員登録日</h3>
                <p className="text-lg font-medium">{user?.createdAt.split('T')[0] ?? '不明'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">会員ID</h3>
                <p className="text-lg font-medium">{user?.publicId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 下部カード群 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 買取履歴 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">買取履歴一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <ArchiveIcon className="h-8 w-8 text-primary" />
                <span className="text-sm">過去の買取履歴を確認</span>
              </div>
              <div className="mt-4 flex justify-end">
                <Link
                  href={
                    session
                      ? '/dashboard/purchases'
                      : '/auth/login?redirect=/dashboard/purchases'
                  }
                  prefetch={false}
                >
                  <Button variant="ghost" size="sm">
                    詳細を見る
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* プロフィール */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">プロフィール</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <UserIcon className="h-8 w-8 text-primary mr-2" />
                <div className="text-sm">個人情報と設定</div>
              </div>
              <div className="mt-4 flex justify-end">
                <Link
                  href={
                    session
                      ? '/dashboard/profile'
                      : '/auth/login?redirect=/dashboard/profile'
                  }
                  prefetch={false}
                >
                  <Button variant="ghost" size="sm">
                    編集する
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 振込口座 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">振込口座</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-primary mr-2" />
                <div className="text-sm">買取金額の振込先口座</div>
              </div>
              <div className="mt-4 flex justify-end">
                <Link
                  href={
                    session
                      ? '/dashboard/bank-account'
                      : '/auth/login?redirect=/dashboard/bank-account'
                  }
                  prefetch={false}
                >
                  <Button variant="ghost" size="sm">
                    管理する
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
