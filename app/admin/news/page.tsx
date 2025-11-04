// app/admin/news/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

type NewsRow = {
  id: string;
  title: string;
  body: string | null;
  published_at: string; // ISO
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// --- 共通：エラーテキストを確実に拾う ---
async function readError(res: Response) {
  const ct = res.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const j = await res.json();
      return j?.error || j?.message || JSON.stringify(j);
    }
    return await res.text();
  } catch {
    return res.statusText || "Unknown error";
  }
}

export default function AdminNewsPage() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<NewsRow[]>([]);

  // filters
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  // editor
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    published_at: toDatetimeLocal(new Date().toISOString()),
    is_active: true,
  });

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const hay = `${r.title} ${r.body ?? ""}`.toLowerCase();
      const okQ = q.trim() ? hay.includes(q.toLowerCase()) : true;
      const okActive = onlyActive ? r.is_active : true;
      return okQ && okActive;
    });
  }, [rows, q, onlyActive]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/news", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const msg = await readError(res);
        throw new Error(`(${res.status}) ${msg}`);
      }
      const data = (await res.json()) as NewsRow[];
      setRows(data ?? []);
    } catch (e: any) {
      console.error(e);
      alert(`ニュースの取得に失敗しました：${e.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditId(null);
    setForm({
      title: "",
      body: "",
      published_at: toDatetimeLocal(new Date().toISOString()),
      is_active: true,
    });
  };

  const onClickNew = () => {
    resetForm();
    setOpen(true);
  };

  const onClickEdit = (r: NewsRow) => {
    setEditId(r.id);
    setForm({
      title: r.title ?? "",
      body: r.body ?? "",
      published_at: toDatetimeLocal(r.published_at),
      is_active: !!r.is_active,
    });
    setOpen(true);
  };

  const upsert = async () => {
    try {
      if (!form.title.trim()) {
        alert("タイトルは必須です。");
        return;
      }
      const pubISO = form.published_at
        ? new Date(form.published_at).toISOString()
        : new Date().toISOString();

      const payload = {
        title: form.title,
        body: form.body || null,
        published_at: pubISO,
        is_active: form.is_active,
      };

      const url = editId ? `/api/admin/news/${editId}` : "/api/admin/news";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await readError(res);
        throw new Error(`(${res.status}) ${msg}`);
      }

      setOpen(false);
      await fetchNews();
    } catch (e: any) {
      console.error(e);
      alert(`保存に失敗しました：${e.message ?? String(e)}`);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("このお知らせを削除します。よろしいですか？")) return;
    try {
      const res = await fetch(`/api/admin/news/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const msg = await readError(res);
        throw new Error(`(${res.status}) ${msg}`);
      }
      await fetchNews();
    } catch (e: any) {
      console.error(e);
      alert(`削除に失敗しました：${e.message ?? String(e)}`);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <a href="/admin">
            <ArrowLeft className="w-4 h-4 mr-2" />
            管理トップへ
          </a>
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex items-start justify-between space-y-2 sm:flex-row sm:items-center">
          <div>
            <CardTitle>ニュース管理</CardTitle>
            <CardDescription>お知らせの作成・編集・公開切替を行います。</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchNews}>
              <RefreshCw className="w-4 h-4 mr-2" />
              再読み込み
            </Button>
            <Button onClick={onClickNew}>
              <Plus className="w-4 h-4 mr-2" />
              新規作成
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* フィルタ */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex-1">
              <Label htmlFor="q">キーワード検索</Label>
              <Input
                id="q"
                placeholder="タイトル・本文で検索"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-2 sm:pt-7">
              <Switch
                id="onlyActive"
                checked={onlyActive}
                onCheckedChange={setOnlyActive}
              />
              <Label htmlFor="onlyActive">公開中のみ表示</Label>
            </div>
          </div>

          {/* テーブル */}
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">公開日時</TableHead>
                  <TableHead>タイトル</TableHead>
                  <TableHead className="w-[120px]">ステータス</TableHead>
                  <TableHead className="w-[160px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>読み込み中...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-gray-500">
                      該当するお知らせはありません。
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {new Date(r.published_at).toLocaleString("ja-JP")}
                      </TableCell>
                      <TableCell className="font-medium break-words">
                        {r.title}
                      </TableCell>
                      <TableCell>
                        {r.is_active ? (
                          <Badge>公開中</Badge>
                        ) : (
                          <Badge variant="secondary">非公開</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => onClickEdit(r)}>
                            <Pencil className="w-4 h-4 mr-1" />
                            編集
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onDelete(r.id)}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 新規・編集ダイアログ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "お知らせを編集" : "お知らせを作成"}</DialogTitle>
            <DialogDescription>
              タイトルは必須です。公開日時・公開状況を設定できます。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="例）Apple Watchの買取を開始しました"
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="body">本文（任意）</Label>
              <Textarea
                id="body"
                value={form.body}
                onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))}
                placeholder="本文を入力（改行可）"
                rows={6}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1">
                <Label htmlFor="published_at">公開日時</Label>
                <Input
                  id="published_at"
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(e) => setForm((s) => ({ ...s, published_at: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-2 pt-6">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((s) => ({ ...s, is_active: v }))}
                />
                <Label htmlFor="is_active">公開する</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button onClick={upsert}>{editId ? "更新する" : "作成する"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
