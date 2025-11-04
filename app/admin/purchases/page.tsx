// app/admin/purchases/page.tsx など（このページのファイルパス）
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Filter, Search, ArrowUpDown, Download } from "lucide-react";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; // ← 不要になったので削除
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type BuybackRequest = {
  id: string;
  reservation_number: string;
  user_id: string;
  user: { id: string; name: string | null; email: string | null } | null;
  items: { product_name?: string; price?: number | string; quantity?: number | string }[];
  total_price: number;
  status:
    | "申込受付"
    | "査定開始"
    | "査定中"
    | "査定完了"
    | "入金処理"
    | "入金完了"
    | "キャンセル済み"
    | string;
  method?: "郵送買取" | "店頭買取" | "不明";
  _rawMethod?: string | null;
  created_at: string;
  updated_at: string;
};

function MethodBadge({ method }: { method: BuybackRequest["method"] }) {
  if (method === "郵送買取")
    return <Badge className="bg-blue-100 text-blue-800">郵送買取</Badge>;
  if (method === "店頭買取")
    return <Badge className="bg-green-100 text-green-800">店頭買取</Badge>;
  return <Badge className="bg-gray-100 text-gray-800">不明</Badge>;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseInt(v.replace(/[^\d-]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function safeParseItems(src: unknown): any[] {
  try {
    if (src == null) return [];
    if (typeof src === "string") {
      const parsed = JSON.parse(src);
      return Array.isArray(parsed) ? parsed : [];
    }
    if (Array.isArray(src)) return src;
    return [];
  } catch {
    return [];
  }
}

/** ✅ 数量合計（未指定は1としてカウント）を返す */
function countItems(items: any[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, it) => {
    const rawQty =
      it?.quantity ??
      it?.qty ??
      it?.個数 ??
      it?.数量 ??
      1;
    const q = toNumber(rawQty);
    return sum + Math.max(1, q || 1);
  }, 0);
}

export default function PurchasesPage() {
  const [data, setData] = useState<BuybackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] =
    useState<"created_at" | "total_price" | "id">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/buyback-requests", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          console.error("[/api/admin/buyback-requests] status=", res.status);
          setData([]);
          return;
        }
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];

        // items の型が文字列の可能性に備えつつ整形
        const mapped: BuybackRequest[] = rows.map((r: any) => ({
          id: String(r.id),
          reservation_number: String(r.reservation_number ?? ""),
          user_id: String(r.user_id ?? ""),
          user: r.user ?? null,
          items: safeParseItems(r.items),
          total_price: toNumber(r.total_price),
          status: r.status ?? "",
          created_at: r.created_at ?? new Date(0).toISOString(),
          updated_at: r.updated_at ?? r.created_at ?? new Date(0).toISOString(),
          _rawMethod: r._rawMethod ?? null,
          method: r.method ?? "不明",
        }));

        setData(mapped);
      } catch (e) {
        console.error("fetchRequests fatal:", e);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []); // ← 初回だけ。検索/並び替えは現状クライアント側のまま（最小変更）

  if (loading) {
    return <div className="p-6">読み込み中...</div>;
  }

  const filtered = data.filter((r) => {
    const term = searchTerm.toLowerCase().trim();
    const reservation = String(r.reservation_number ?? "").toLowerCase();
    const userName = String(r.user?.name ?? "").toLowerCase();
    const methodLabel = String(r.method ?? "不明").toLowerCase();
    const rawMethod = String(r._rawMethod ?? "").toLowerCase();

    const matchesSearch =
      term === "" ||
      reservation.includes(term) ||
      userName.includes(term) ||
      methodLabel.includes(term) ||
      rawMethod.includes(term);

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === "created_at") {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortDirection === "asc" ? ta - tb : tb - ta;
    }
    if (sortField === "total_price") {
      return sortDirection === "asc"
        ? a.total_price - b.total_price
        : b.total_price - a.total_price;
    }
    return sortDirection === "asc"
      ? String(a.id).localeCompare(String(b.id))
      : String(b.id).localeCompare(String(a.id));
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  );

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "申込受付":
        return <Badge className="bg-blue-100 text-blue-800">申込受付</Badge>;
      case "査定開始":
        return <Badge className="bg-purple-100 text-purple-800">査定開始</Badge>;
      case "査定中":
        return <Badge className="bg-yellow-100 text-yellow-800">査定中</Badge>;
      case "査定完了":
        return <Badge className="bg-green-100 text-green-800">査定完了</Badge>;
      case "入金処理":
        return <Badge className="bg-orange-100 text-orange-800">入金処理</Badge>;
      case "入金完了":
        return <Badge className="bg-red-100 text-red-800">入金完了</Badge>;
      case "キャンセル済み":
        return <Badge className="bg-gray-100 text-gray-800">キャンセル済み</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">買取管理</h1>
          <p className="text-muted-foreground">
            買取申込の一覧と詳細を確認できます
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          CSVエクスポート
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="申込番号、ユーザー名、買取方法（郵送買取/店頭買取）で検索..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="申込受付">申込受付</SelectItem>
            <SelectItem value="査定開始">査定開始</SelectItem>
            <SelectItem value="査定中">査定中</SelectItem>
            <SelectItem value="査定完了">査定完了</SelectItem>
            <SelectItem value="入金処理">入金処理</SelectItem>
            <SelectItem value="入金完了">入金完了</SelectItem>
            <SelectItem value="キャンセル済み">キャンセル済み</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>買取一覧</CardTitle>
          <CardDescription>
            すべての買取申込が表示されています。詳細は申込番号をクリックしてください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">
                    <button
                      className="p-0 font-medium"
                      onClick={() => handleSort("id")}
                    >
                      申込番号 <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>買取方法</TableHead>
                  <TableHead>商品数</TableHead>
                  <TableHead>
                    <button
                      className="p-0 font-medium"
                      onClick={() => handleSort("total_price")}
                    >
                      金額 <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>
                    <button
                      className="p-0 font-medium"
                      onClick={() => handleSort("created_at")}
                    >
                      申込日 <ArrowUpDown className="ml-2 h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((r) => {
                  const userName = r.user?.name ?? "(不明)";
                  const userEmail = r.user?.email ?? "";
                  const itemCount = countItems(r.items); // ✅ 数量合計
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/purchases/${r.id}`}
                          className="text-primary hover:underline"
                        >
                          {r.reservation_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{userName}</div>
                          <div className="text-xs text-muted-foreground">
                            {userEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <MethodBadge method={r.method} />
                      </TableCell>
                      <TableCell>{itemCount} 点</TableCell>
                      <TableCell>¥{r.total_price.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell>
                        {new Date(r.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/purchases/${r.id}`}>
                          <Button size="sm">詳細</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                      該当する買取申込はありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((v) => Math.max(v - 1, 1))}
                disabled={safeCurrentPage === 1}
              >
                前へ
              </Button>
              <div className="text-sm">
                {safeCurrentPage} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((v) => Math.min(v + 1, totalPages))}
                disabled={safeCurrentPage === totalPages}
              >
                次へ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
