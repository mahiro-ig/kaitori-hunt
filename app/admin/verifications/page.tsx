"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpDown, Download, Search } from "lucide-react";

import { supabase } from "@/lib/supabase";  // ← ここを追加
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RawVerification = {
  id: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  id_photo_path: string;
  face_path: string;
  users?: { id: string; name: string; email: string }[];
  user?: { id: string; name: string; email: string };
};

export default function VerificationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "yesterday" | "last7days" | "last30days"
  >("all");
  const [verifications, setVerifications] = useState<RawVerification[]>([]);

  useEffect(() => {
    const fetchVerifications = async () => {
      const res = await fetch("/api/admin/verifications");
      const json = await res.json();
      if (!res.ok) {
        console.error("api/admin/verifications error:", json);
        return;
      }
      setVerifications(json as RawVerification[]);
    };
    fetchVerifications();
  }, []);

  const getStatusColor = (status: RawVerification["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filtered = verifications.filter((v) => {
    const lower = searchTerm.toLowerCase();
    const searchMatch =
      v.id.toLowerCase().includes(lower) ||
      ([(v.users?.[0], v.user)][0] &&
        (v.users?.[0]?.name.toLowerCase().includes(lower) ||
          v.users?.[0]?.email.toLowerCase().includes(lower) ||
          v.user?.name.toLowerCase().includes(lower) ||
          v.user?.email.toLowerCase().includes(lower)));

    const statusMatch = statusFilter === "all" || v.status === statusFilter;

    let dateMatch = true;
    const created = new Date(v.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const last7 = new Date(today);
    last7.setDate(today.getDate() - 7);
    const last30 = new Date(today);
    last30.setMonth(today.getMonth() - 1);

    if (dateFilter === "today")
      dateMatch = created.toDateString() === today.toDateString();
    else if (dateFilter === "yesterday")
      dateMatch = created.toDateString() === yesterday.toDateString();
    else if (dateFilter === "last7days") dateMatch = created >= last7;
    else if (dateFilter === "last30days") dateMatch = created >= last30;

    return searchMatch && statusMatch && dateMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">本人確認管理</h1>
          <p className="text-muted-foreground">
            本人確認申請の一覧と詳細を確認できます
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          CSVエクスポート
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>本人確認一覧</CardTitle>
          <CardDescription>
            すべての本人確認申請の一覧です。詳細を確認するには確認IDをクリックしてください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="確認ID、ユーザー名、メールアドレスで検索..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(
                    value as "all" | "pending" | "approved" | "rejected"
                  )
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="ステータスで絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべてのステータス</SelectItem>
                  <SelectItem value="pending">審査待ち</SelectItem>
                  <SelectItem value="approved">承認済み</SelectItem>
                  <SelectItem value="rejected">拒否</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={dateFilter}
                onValueChange={(value) =>
                  setDateFilter(
                    value as
                      | "all"
                      | "today"
                      | "yesterday"
                      | "last7days"
                      | "last30days"
                  )
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="日付で絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての期間</SelectItem>
                  <SelectItem value="today">今日</SelectItem>
                  <SelectItem value="yesterday">昨日</SelectItem>
                  <SelectItem value="last7days">過去7日間</SelectItem>
                  <SelectItem value="last30days">過去30日間</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">すべて</TabsTrigger>
              <TabsTrigger value="pending">審査待ち</TabsTrigger>
              <TabsTrigger value="approved">承認済み</TabsTrigger>
              <TabsTrigger value="rejected">拒否</TabsTrigger>
            </TabsList>

            {(["all", "pending", "approved", "rejected"] as const).map(
              (tab) => (
                <TabsContent key={tab} value={tab}>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">
                            <div className="flex items-center space-x-1">
                              <span>確認ID</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center space-x-1">
                              <span>日時</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </TableHead>
                          <TableHead>名前</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>自撮り写真</TableHead>
                          <TableHead>ステータス</TableHead>
                          <TableHead className="text-right">アクション</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered
                          .filter((v) => (tab === "all" ? true : v.status === tab))
                          .map((v) => (
                            <TableRow key={v.id}>
                              <TableCell className="font-medium">
                                <Link
                                  href={`/admin/verifications/${v.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {v.id}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {new Date(v.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {v.users?.[0]?.name ?? v.user?.name ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {v.users?.[0]?.email ?? v.user?.email ?? "—"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="link"
                                  onClick={async () => {
                                    const { data, error } =
                                      await supabase
                                        .storage
                                        .from("face-captures")
                                        .createSignedUrl(v.face_path, 60);
                                    if (error) {
                                      console.error("signedUrl error:", error);
                                      return;
                                    }
                                    window.open(data.signedUrl, "_blank");
                                  }}
                                >
                                  自撮り
                                </Button>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                                    v.status
                                  )}`}
                                >
                                  {{
                                    pending: "審査待ち",
                                    approved: "承認済み",
                                    rejected: "拒否",
                                  }[v.status]}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Link href={`/admin/verifications/${v.id}`}>
                                  <Button size="sm">詳細</Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              )
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
