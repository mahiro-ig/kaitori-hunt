"use client"

// app/admin/users/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'

type UserRecord = {
  public_id: string
  id: string
  name: string
  email: string
  phone: string | null
  postal_code: string | null
  address: string | null
  created_at: string
  bank_name: string | null
  branch_name: string | null
  account_type: string | null
  account_number: string | null
  account_name: string | null
}

export default function UsersPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // 邱ｨ髮・ム繧､繧｢繝ｭ繧ｰ逕ｨ繧ｹ繝・・繝・  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editBankName, setEditBankName] = useState('')
  const [editBranchName, setEditBranchName] = useState('')
  const [editAccountType, setEditAccountType] = useState<'譎ｮ騾・ | '蠖灘ｺｧ' | ''>('')
  const [editAccountNumber, setEditAccountNumber] = useState('')
  const [editAccountName, setEditAccountName] = useState('')

  // 隱崎ｨｼ繧ｬ繝ｼ繝会ｼ・ｸ隕ｧ蜿門ｾ・  useEffect(() => {
    if (status === 'loading') return
    if (status !== 'authenticated') {
      router.push('/auth/login?redirect=/admin/users')
      return
    }
    fetchUsers()
  }, [status, router])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      if (!res.ok) {
        toast({ variant: 'destructive', title: '繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' })
        setUsers([])
      } else {
        const json = await res.json()
        setUsers(json.users)
      }
    } catch {
      toast({ variant: 'destructive', title: '繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' })
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(u =>
    !searchTerm ||
      u.public_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openEditDialog = (u: UserRecord) => {
    setSelectedUser(u)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditPhone(u.phone ?? '')
    setEditAddress(u.address ?? '')
    setEditBankName(u.bank_name ?? '')
    setEditBranchName(u.branch_name ?? '')
    setEditAccountType((u.account_type as '譎ｮ騾・ | '蠖灘ｺｧ') ?? '')
    setEditAccountNumber(u.account_number ?? '')
    setEditAccountName(u.account_name ?? '')
    setIsEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!selectedUser) return
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.public_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          address: editAddress,
          bank_name: editBankName,
          branch_name: editBranchName,
          account_type: editAccountType,
          account_number: editAccountNumber,
          account_name: editAccountName,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆')
      setUsers(prev =>
        prev.map(u =>
          u.public_id === selectedUser.public_id
            ? {
                ...u,
                name: editName,
                email: editEmail,
                phone: editPhone,
                address: editAddress,
                bank_name: editBankName,
                branch_name: editBranchName,
                account_type: editAccountType,
                account_number: editAccountNumber,
                account_name: editAccountName,
              }
            : u
        )
      )
      toast({ title: '繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧呈峩譁ｰ縺励∪縺励◆' })
      setIsEditDialogOpen(false)
    } catch (e: any) {
      toast({ variant: 'destructive', title: '譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆', description: e.message })
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・/h1>

      <Card>
        <CardHeader>
          <CardTitle>繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="莨壼藤ID繝ｻ蜷榊燕繝ｻ繝｡繝ｼ繝ｫ縺ｧ讀懃ｴ｢..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="mb-4 max-w-sm"
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>莨壼藤ID</TableHead>
                  <TableHead>蜷榊燕</TableHead>
                  <TableHead>繝｡繝ｼ繝ｫ</TableHead>
                  <TableHead>髮ｻ隧ｱ逡ｪ蜿ｷ</TableHead>
                  <TableHead>菴乗園</TableHead>
                  <TableHead>逋ｻ骭ｲ譌･</TableHead>
                  <TableHead>驫陦悟錐</TableHead>
                  <TableHead>謾ｯ蠎怜錐</TableHead>
                  <TableHead>蜿｣蠎ｧ遞ｮ蛻･</TableHead>
                  <TableHead>蜿｣蠎ｧ逡ｪ蜿ｷ</TableHead>
                  <TableHead>蜿｣蠎ｧ蜷咲ｾｩ</TableHead>
                  <TableHead>謫堺ｽ・/TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => (
                    <TableRow key={u.public_id}>
                      <TableCell>{u.public_id}</TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.phone ?? '-'}</TableCell>
                      <TableCell>{u.address ?? '-'}</TableCell>
                      <TableCell>
                        {new Date(u.created_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell>{u.bank_name ?? '-'}</TableCell>
                      <TableCell>{u.branch_name ?? '-'}</TableCell>
                      <TableCell>{u.account_type ?? '-'}</TableCell>
                      <TableCell>{u.account_number ?? '-'}</TableCell>
                      <TableCell>{u.account_name ?? '-'}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(u)}>
                          邱ｨ髮・                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-4">
                      繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ邱ｨ髮・/DialogTitle>
            <DialogDescription>
              莨壼藤諠・ｱ縺ｨ謖ｯ霎ｼ蜈域ュ蝣ｱ繧堤ｷｨ髮・＠縺ｦ菫晏ｭ倥＠縺ｾ縺吶・            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label>莨壼藤諠・ｱ</Label>
            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="蜷榊燕" />
            <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="繝｡繝ｼ繝ｫ" />
            <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="髮ｻ隧ｱ逡ｪ蜿ｷ" />
            <Input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="菴乗園" />

            <Label className="mt-4">謖ｯ霎ｼ蜈域ュ蝣ｱ</Label>
            <Input value={editBankName} onChange={e => setEditBankName(e.target.value)} placeholder="驫陦悟錐" />
            <Input value={editBranchName} onChange={e => setEditBranchName(e.target.value)} placeholder="謾ｯ蠎怜錐" />
            <Select
              value={editAccountType}
              onValueChange={value => setEditAccountType(value as '譎ｮ騾・ | '蠖灘ｺｧ' | '')}
            >
              <SelectTrigger><SelectValue placeholder="蜿｣蠎ｧ遞ｮ蛻･" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="譎ｮ騾・>譎ｮ騾・/SelectItem>
                <SelectItem value="蠖灘ｺｧ">蠖灘ｺｧ</SelectItem>
              </SelectContent>
            </Select>
            <Input value={editAccountNumber} onChange={e => setEditAccountNumber(e.target.value)} placeholder="蜿｣蠎ｧ逡ｪ蜿ｷ" />
            <Input value={editAccountName} onChange={e => setEditAccountName(e.target.value)} placeholder="蜿｣蠎ｧ蜷咲ｾｩ" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              繧ｭ繝｣繝ｳ繧ｻ繝ｫ
            </Button>
            <Button onClick={handleSave}>菫晏ｭ・/Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
