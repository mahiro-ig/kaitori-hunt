// app/admin/users/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

type UserRecord = {
  public_id: string;
  id: string;
  name: string;
  email: string;
  phone: string | null;
  postal_code: string | null;
  address: string | null;
  created_at: string;
  bank_name: string | null;
  branch_name: string | null;
  account_type: string | null; // '普通' | '当座' | null などを想定
  account_number: string | null;
  account_name: string | null;
};

type AccountType = '普通' | '当座' | '';

export default function UsersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 編集ダイアログ用の状態
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBranchName, setEditBranchName] = useState('');
  const [editAccountType, setEditAccountType] = useState<AccountType>('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editAccountName, setEditAccountName] = useState('');

  // 認証チェック＆初回ロード
  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      router.push('/auth/login?redirect=/admin/users');
      return;
    }
    fetchUsers();
  }, [status, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'ユーザー一覧の取得に失敗しました' });
        setUsers([]);
      } else {
        const json = await res.json();
        setUsers(json.users);
      }
    } catch {
      toast({ variant: 'destructive', title: 'ユーザー一覧の取得に失敗しました' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      u.public_id.toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const openEditDialog = (u: UserRecord) => {
    setSelectedUser(u);
    setEditName(u.name ?? '');
    setEditEmail(u.email ?? '');
    setEditPhone(u.phone ?? '');
    setEditAddress(u.address ?? '');
    setEditBankName(u.bank_name ?? '');
    setEditBranchName(u.branch_name ?? '');
    // DBが '普通' / '当座' 以外の可能性もあるのでガード
    const at = (u.account_type ?? '') as AccountType;
    setEditAccountType(at === '普通' || at === '当座' ? at : '');
    setEditAccountNumber(u.account_number ?? '');
    setEditAccountName(u.account_name ?? '');
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
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
          account_type: editAccountType || null,
          account_number: editAccountNumber,
          account_name: editAccountName,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '更新に失敗しました');

      setUsers((prev) =>
        prev.map((u) =>
          u.public_id === selectedUser.public_id
            ? {
                ...u,
                name: editName,
                email: editEmail,
                phone: editPhone,
                address: editAddress,
                bank_name: editBankName,
                branch_name: editBranchName,
                account_type: editAccountType || null,
                account_number: editAccountNumber,
                account_name: editAccountName,
              }
            : u
        )
      );

      toast({ title: 'ユーザー情報を更新しました' });
      setIsEditDialogOpen(false);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: '更新に失敗しました',
        description: e.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">ユーザー管理</h1>

      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="公開ID／氏名／メールで絞り込み..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4 max-w-sm"
          />

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>公開ID</TableHead>
                  <TableHead>氏名</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead>銀行名</TableHead>
                  <TableHead>支店名</TableHead>
                  <TableHead>口座種別</TableHead>
                  <TableHead>口座番号</TableHead>
                  <TableHead>口座名義</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(u)}
                        >
                          編集
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-4">
                      該当するユーザーが見つかりませんでした
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
            <DialogTitle>ユーザー情報を編集</DialogTitle>
            <DialogDescription>
              会員情報と振込先情報を更新します。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label>会員情報</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="氏名"
            />
            <Input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="メール"
            />
            <Input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="電話番号"
            />
            <Input
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              placeholder="住所"
            />

            <Label className="mt-4">振込先情報</Label>
            <Input
              value={editBankName}
              onChange={(e) => setEditBankName(e.target.value)}
              placeholder="銀行名"
            />
            <Input
              value={editBranchName}
              onChange={(e) => setEditBranchName(e.target.value)}
              placeholder="支店名"
            />

            <Select
              value={editAccountType}
              onValueChange={(value) => setEditAccountType(value as AccountType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="口座種別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="普通">普通</SelectItem>
                <SelectItem value="当座">当座</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={editAccountNumber}
              onChange={(e) => setEditAccountNumber(e.target.value)}
              placeholder="口座番号"
            />
            <Input
              value={editAccountName}
              onChange={(e) => setEditAccountName(e.target.value)}
              placeholder="口座名義"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>保存する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
