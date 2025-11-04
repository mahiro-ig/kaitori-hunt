// app/admin/users/[id]/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, User as UserIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'

// 型定義
interface BankAccount {
  bankName: string
  branchName: string
  accountType: string
  accountNumber: string
  accountName: string
}
interface UserDetail {
  id: string
  name: string
  email: string
  phone: string
  address: string
  created_at: string
  status: string
  bankAccount: BankAccount
}

export default function UserDetailPage() {
  const router = useRouter()
  const { id: userId } = useParams()
  const { data: session, status } = useSession()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // 編集ダイアログ用ステート
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editBankName, setEditBankName] = useState('')
  const [editBranchName, setEditBranchName] = useState('')
  const [editAccountType, setEditAccountType] = useState('')
  const [editAccountNumber, setEditAccountNumber] = useState('')
  const [editAccountName, setEditAccountName] = useState('')

  // 認証ガード & データ取得
  useEffect(() => {
    if (status === 'loading') return
    if (status !== 'authenticated') {
      router.push(`/auth/login?redirect=/admin/users/${userId}`)
      return
    }
    fetchUser()
  }, [status, userId, router])

  const fetchUser = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      const json = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'ユーザー詳細の取得に失敗しました' })
        return
      }
      // APIから返るsnake_caseをcamelCaseにマッピング
      const u: any = json.user
      const bankAccount: BankAccount = {
        bankName:    u.bank_name ?? '',
        branchName:  u.branch_name ?? '',
        accountType: u.account_type ?? '',
        accountNumber: u.account_number ?? '',
        accountName: u.account_name ?? '',
      }
      setUser({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? '',
        address: u.address ?? '',
        created_at: u.created_at,
        status: u.status ?? '',
        bankAccount,
      })
      // 編集フォームに初期値をセット
      setEditName(u.name)
      setEditEmail(u.email)
      setEditPhone(u.phone ?? '')
      setEditAddress(u.address ?? '')
      setEditBankName(bankAccount.bankName)
      setEditBranchName(bankAccount.branchName)
      setEditAccountType(bankAccount.accountType)
      setEditAccountNumber(bankAccount.accountNumber)
      setEditAccountName(bankAccount.accountName)
    } catch (e) {
      toast({ variant: 'destructive', title: 'ユーザー詳細の取得に失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4">読み込み中…</div>
  if (!user)   return <div className="p-4 text-red-500">ユーザーが見つかりませんでした</div>

  const getStatusColor = (st: string) => {
    switch (st) {
      case '認証済み': return 'bg-green-100 text-green-800'
      case '認証待ち': return 'bg-yellow-100 text-yellow-800'
      case '認証失敗': return 'bg-red-100 text-red-800'
      case '無効':     return 'bg-gray-100 text-gray-800'
      default:         return 'bg-gray-100 text-gray-800'
    }
  }

  // 会員情報＆振込先更新
  const handleUpdateUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          address: editAddress,
          bank_name:    editBankName,
          branch_name:  editBranchName,
          account_type: editAccountType,
          account_number: editAccountNumber,
          account_name: editAccountName,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '更新に失敗しました')
      toast({ title: 'ユーザー情報を更新しました' })
      setIsEditDialogOpen(false)
      fetchUser()
    } catch (e: any) {
      toast({ variant: 'destructive', title: '更新失敗', description: e.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link href="/admin/users" className="flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-1 h-4 w-4" />
          ユーザー一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold ml-4">ユーザー詳細: {user.id}</h1>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <CardTitle>ユーザー情報</CardTitle>
            <CardDescription>会員情報と振込先情報</CardDescription>
          </div>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                編集
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>会員情報＆振込先情報 編集</DialogTitle>
                <DialogDescription>
                  項目を編集して「保存」をクリックしてください。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Label>会員情報</Label>
                <Input value={editName}    onChange={e => setEditName(e.target.value)}    placeholder="お名前" />
                <Input value={editEmail}   onChange={e => setEditEmail(e.target.value)}   placeholder="メールアドレス" />
                <Input value={editPhone}   onChange={e => setEditPhone(e.target.value)}   placeholder="電話番号" />
                <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="住所" />

                <Separator className="my-2" />

                <Label>振込先情報</Label>
                <Input value={editBankName}    onChange={e => setEditBankName(e.target.value)}    placeholder="銀行名" />
                <Input value={editBranchName}  onChange={e => setEditBranchName(e.target.value)}  placeholder="支店名" />
                <Select value={editAccountType} onValueChange={setEditAccountType}>
                  <SelectTrigger><SelectValue placeholder="口座種別" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="普通">普通</SelectItem>
                    <SelectItem value="当座">当座</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={editAccountNumber} onChange={e => setEditAccountNumber(e.target.value)} placeholder="口座番号" />
                <Input value={editAccountName}   onChange={e => setEditAccountName(e.target.value)}   placeholder="口座名義" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleUpdateUser}>保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>お名前</Label>
            <p className="mt-1">{user.name}</p>
          </div>
          <div>
            <Label>メール</Label>
            <p className="mt-1">{user.email}</p>
          </div>
          <div>
            <Label>電話番号</Label>
            <p className="mt-1">{user.phone}</p>
          </div>
          <div>
            <Label>住所</Label>
            <p className="mt-1">{user.address}</p>
          </div>
          <div>
            <Label>銀行名</Label>
            <p className="mt-1">{user.bankAccount.bankName}</p>
          </div>
          <div>
            <Label>支店名</Label>
            <p className="mt-1">{user.bankAccount.branchName}</p>
          </div>
          <div>
            <Label>口座種別</Label>
            <p className="mt-1">{user.bankAccount.accountType}</p>
          </div>
          <div>
            <Label>口座番号</Label>
            <p className="mt-1">{user.bankAccount.accountNumber}</p>
          </div>
          <div className="md:col-span-2">
            <Label>口座名義</Label>
            <p className="mt-1">{user.bankAccount.accountName}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
