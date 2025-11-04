// app/admin/reports/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Calendar, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// ===== 型 =====
type Summary = { total: number; count: number; avg: number };
type CategoryAgg = Record<string, { amount: number; count: number }>;
type UserAggRow = { user_id: string; amount: number; count: number };
type TrendCatRow = { category: string; count: number };
type MonthRow = { month: string; amount: number };
type StatusRow = { name: string; value: number };
type DayCountRow = { date: string; count: number };

type PSHRow = { buyback_request_id: string; new_status: string; created_at: string };
type BuybackRow = {
  id: string;
  user_id: string;
  created_at: string;
  total_price: number | null;
  items: any[] | null;
};
type VariantRow = { id: string; product_id: string };
type ProductRow = { id: string; category: string | null };

// ===== Util =====
const toArray = <T,>(x: T[] | null | undefined): T[] => (Array.isArray(x) ? x : []);
const safeAvg = (amount: number, count: number) => (count > 0 ? Math.round(amount / count) : 0);
const toYYYYMM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const toYYYYMMDD = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};
function startDateFromPeriod(p: "day" | "week" | "month" | "quarter" | "year") {
  const now = new Date();
  const d = new Date(now);
  if (p === "day") d.setDate(d.getDate() - 1);
  else if (p === "week") d.setDate(d.getDate() - 7);
  else if (p === "month") d.setMonth(d.getMonth() - 1);
  else if (p === "quarter") d.setMonth(d.getMonth() - 3);
  else if (p === "year") d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
}
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"];
const yenFormatter = (n: unknown) => `¥${Number(n).toLocaleString()}`;

// ===== Supabaseレスポンス吸収ヘルパー（ここだけ internal props に触る）=====
const pickRows = async <T,>(builder: any): Promise<T[]> => {
  const resp: any = await builder;
  const ERR = "error" as const;
  const DAT = "data" as const;
  if (resp && resp[ERR]) throw resp[ERR];
  return toArray<T>(resp?.[DAT]);
};

// タイムスタンプを動的に拾う（created_at が無いテーブルでもOK）
const extractTS = (row: any): string | null =>
  row?.created_at ??
  row?.createdAt ??
  row?.changed_at ??
  row?.changedAt ??
  row?.updated_at ??
  row?.updatedAt ??
  row?.inserted_at ??
  row?.insertedAt ??
  row?.timestamp ??
  row?.ts ??
  null;

export default function ReportsPage() {
  // Database 型は使わず any で受ける（型起因の赤を根絶）
  const supabase = createClientComponentClient<any>();

  const [periodFilter, setPeriodFilter] =
    useState<"day" | "week" | "month" | "quarter" | "year">("month");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [summary, setSummary] = useState<Summary>({ total: 0, count: 0, avg: 0 });
  const [categorySummary, setCategorySummary] = useState<CategoryAgg>({});
  const [userSummary, setUserSummary] = useState<UserAggRow[]>([]);
  const [trendCategory, setTrendCategory] = useState<TrendCatRow[]>([]);
  const [trendMonthly, setTrendMonthly] = useState<MonthRow[]>([]);
  const [statusDist, setStatusDist] = useState<StatusRow[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DayCountRow[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setErrMsg(null);
        const fromISO = startDateFromPeriod(periodFilter);

        // 1) purchase_status_history
        // created_at が無い環境に対応するため、*で取りつつ必要カラムも明示
        const stRaw = await pickRows<any>(
          supabase
            .from("purchase_status_history")
            .select("buyback_request_id,new_status,*")
        );

        // TS 正規化 + 期間フィルタ + 降順ソート
        const stRows: PSHRow[] = stRaw
          .map((r: any) => {
            const ts = extractTS(r);
            return ts
              ? ({
                  buyback_request_id: r.buyback_request_id,
                  new_status: r.new_status,
                  created_at: ts,
                } as PSHRow)
              : null;
          })
          .filter(Boolean) as PSHRow[];

        const stFiltered = stRows.filter((r) => new Date(r.created_at) >= new Date(fromISO));
        const allStatus = [...stFiltered].sort(
          (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
        );

        const latestMap = new Map<string, string>();
        for (const row of allStatus) {
          if (!latestMap.has(row.buyback_request_id)) {
            latestMap.set(row.buyback_request_id, row.new_status);
          }
        }
        const paidIds = Array.from(latestMap.entries())
          .filter(([, s]) => s === "入金完了")
          .map(([id]) => id);

        // 2) buyback_requests（こちらは created_at 想定あり。無ければ同様に * に切替可能）
        const requestRows = await pickRows<BuybackRow>(
          supabase
            .from("buyback_requests")
            .select("id,user_id,items,total_price,created_at")
            .gte("created_at", fromISO)
        );

        // 3) product_variants
        const variantIds = Array.from(
          new Set(
            requestRows.flatMap((r) =>
              Array.isArray(r.items)
                ? r.items
                    .map((it) => it.product_variant_id ?? it.variant_id)
                    .filter(Boolean)
                : []
            )
          )
        );
        const variantMap: Record<string, string> = {};
        if (variantIds.length) {
          const variantRows = await pickRows<VariantRow>(
            supabase.from("product_variants").select("id,product_id").in("id", variantIds)
          );
          for (const v of variantRows) variantMap[v.id] = v.product_id;
        }

        // 4) products
        const productIds = Array.from(new Set(Object.values(variantMap)));
        const categoryMap: Record<string, string> = {};
        if (productIds.length) {
          const productRows = await pickRows<ProductRow>(
            supabase.from("products").select("id,category").in("id", productIds)
          );
          for (const p of productRows) categoryMap[p.id] = p.category ?? "未設定";
        }

        // ===== 集計（入金完了のみ）=====
        const paid = requestRows.filter((r) => paidIds.includes(r.id));

        const totalAmount = paid.reduce((sum, r) => {
          if (typeof r.total_price === "number") return sum + r.total_price;
          if (Array.isArray(r.items)) {
            const t = r.items.reduce((s, it) => {
              const q = Number(it.quantity ?? 0);
              const u = Number(it.unit_price ?? it.price ?? 0);
              return s + q * u;
            }, 0);
            return sum + t;
          }
          return sum;
        }, 0);

        const totalCount = paid.reduce((sum, r) => {
          if (!Array.isArray(r.items)) return sum;
          return sum + r.items.reduce((s, it) => s + Number(it.quantity ?? 0), 0);
        }, 0);

        setSummary({ total: totalAmount, count: totalCount, avg: safeAvg(totalAmount, totalCount) });

        // カテゴリ別
        const catAgg: CategoryAgg = {};
        for (const r of paid) {
          if (!Array.isArray(r.items)) continue;
          for (const it of r.items) {
            const vId = it.product_variant_id ?? it.variant_id;
            const pId = vId ? variantMap[vId] : undefined;
            const cat = pId ? categoryMap[pId] ?? "未設定" : "未設定";
            if (categoryFilter !== "all" && cat !== categoryFilter) continue;

            if (!catAgg[cat]) catAgg[cat] = { amount: 0, count: 0 };
            const q = Number(it.quantity ?? 0);
            const u = Number(it.unit_price ?? it.price ?? 0);
            catAgg[cat].amount += q * u;
            catAgg[cat].count += q;
          }
        }
        setCategorySummary(catAgg);

        // ユーザー別
        const userAgg: Record<string, { amount: number; count: number }> = {};
        for (const r of paid) {
          if (!Array.isArray(r.items)) continue;
          const amt = r.items.reduce(
            (s, it) => s + Number(it.quantity ?? 0) * Number(it.unit_price ?? it.price ?? 0),
            0
          );
          const qty = r.items.reduce((s, it) => s + Number(it.quantity ?? 0), 0);
          if (!userAgg[r.user_id]) userAgg[r.user_id] = { amount: 0, count: 0 };
          userAgg[r.user_id].amount += amt;
          userAgg[r.user_id].count += qty;
        }
        setUserSummary(
          Object.entries(userAgg)
            .map(([user_id, s]) => ({ user_id, ...s }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
        );

        // 人気カテゴリ
        setTrendCategory(
          Object.entries(catAgg)
            .map(([category, s]) => ({ category, count: s.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        );

        // 月次
        const now = new Date();
        const monthly: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          monthly[toYYYYMM(d)] = 0;
        }
        for (const r of paid) {
          const key = toYYYYMM(new Date(r.created_at));
          const add =
            typeof r.total_price === "number"
              ? r.total_price
              : Array.isArray(r.items)
              ? r.items.reduce(
                  (s, it) => s + Number(it.quantity ?? 0) * Number(it.unit_price ?? it.price ?? 0),
                  0
                )
              : 0;
          if (monthly[key] != null) monthly[key] += add;
        }
        setTrendMonthly(Object.entries(monthly).map(([month, amount]) => ({ month, amount })));

        // ステータス分布
        const statusMap: Record<string, number> = {};
        latestMap.forEach((st) => {
          statusMap[st] = (statusMap[st] ?? 0) + 1;
        });
        setStatusDist(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

        // 日別件数（過去30日）
        const dayMap: Record<string, number> = {};
        const base = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(base);
          d.setDate(d.getDate() - i);
          dayMap[toYYYYMMDD(d)] = 0;
        }
        for (const r of requestRows) {
          const key = toYYYYMMDD(new Date(r.created_at));
          if (dayMap[key] != null) dayMap[key] += 1;
        }
        setDailyCounts(Object.entries(dayMap).map(([date, count]) => ({ date, count })));
      } catch (e: any) {
        setErrMsg(e?.message ?? "データ取得に失敗しました");
        console.error(e);
      }
    };
    load();
  }, [periodFilter, categoryFilter]);

  // === CSV ===
  const handleExportCSV = () => {
    const lines: string[] = [];

    lines.push("=== Summary ===");
    lines.push("total,count,avg");
    lines.push(`${summary.total},${summary.count},${Math.round(summary.avg)}`);
    lines.push("");

    lines.push("=== Category ===");
    lines.push("category,amount,count,avg");
    for (const [cat, s] of Object.entries(categorySummary)) {
      lines.push(`${cat},${s.amount},${s.count},${safeAvg(s.amount, s.count)}`);
    }

    lines.push("");
    lines.push("=== Top Users ===");
    lines.push("user_id,amount,count");
    for (const u of userSummary) lines.push(`${u.user_id},${u.amount},${u.count}`);

    lines.push("");
    lines.push("=== Monthly (last 6) ===");
    lines.push("month,amount");
    for (const m of trendMonthly) lines.push(`${m.month},${m.amount}`);

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `reports-${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== 表示 =====
  const categoryCards = useMemo(() => {
    return Object.entries(categorySummary).map(([category, stats]) => {
      const avg = safeAvg(stats.amount, stats.count);
      return (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
            <CardDescription>{category} の集計</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>合計金額</span>
                <span>¥{stats.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>件数</span>
                <span>{stats.count}件</span>
              </div>
              <div className="flex justify-between">
                <span>平均単価</span>
                <span>¥{avg.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });
  }, [categorySummary]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">レポート</h1>
          <p className="text-muted-foreground">買取データ分析と統計</p>
          {errMsg && <p className="mt-2 text-sm text-red-600">{errMsg}</p>}
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            期間選択
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV出力
          </Button>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex gap-2 mb-6">
        <Select
          value={periodFilter as string}
          onValueChange={(nextPeriod: string) =>
            setPeriodFilter(nextPeriod as "day" | "week" | "month" | "quarter" | "year")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="期間を選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">日次</SelectItem>
            <SelectItem value="week">週次</SelectItem>
            <SelectItem value="month">月次</SelectItem>
            <SelectItem value="quarter">四半期</SelectItem>
            <SelectItem value="year">年次</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={(nextCategory: string) => setCategoryFilter(nextCategory)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="カテゴリー" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="iphone">iPhone</SelectItem>
            <SelectItem value="camera">カメラ</SelectItem>
            <SelectItem value="game">ゲーム</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* サマリー */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>総買取金額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{summary.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">入金完了ベース</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>買取商品数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.count}</div>
            <p className="text-xs text-muted-foreground">入金完了ベース</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>平均単価</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{Math.round(summary.avg).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">入金完了ベース</p>
          </CardContent>
        </Card>
      </div>

      {/* タブ */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="categories">カテゴリー</TabsTrigger>
          <TabsTrigger value="users">ユーザー</TabsTrigger>
          <TabsTrigger value="trends">トレンド</TabsTrigger>
        </TabsList>

        {/* 概要 */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>月次買取金額</CardTitle>
              <CardDescription>過去6ヶ月の月次推移（入金完了）</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendMonthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={yenFormatter} />
                  <Legend />
                  <Line type="monotone" dataKey="amount" name="金額" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>買取ステータス分布</CardTitle>
                <CardDescription>期間内の最新ステータス</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDist}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {statusDist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>日別買取件数</CardTitle>
                <CardDescription>過去30日間（作成ベース）</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyCounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="件数" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* カテゴリー */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリー別買取金額</CardTitle>
              <CardDescription>入金完了ベース（フィルタ反映）</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(categorySummary).map(([category, s]) => ({
                      name: category,
                      value: s.amount,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {Object.keys(categorySummary).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={yenFormatter} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">{categoryCards}</div>
        </TabsContent>

        {/* ユーザー */}
        <TabsContent value="users" className="space-y-4">
          {userSummary.map((u) => (
            <Card key={u.user_id}>
              <CardHeader>
                <CardTitle>{u.user_id}</CardTitle>
                <CardDescription>上位ユーザー（入金完了ベース）</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between">
                <span>¥{u.amount.toLocaleString()}</span>
                <span>{u.count}件</span>
              </CardContent>
            </Card>
          ))}
          {userSummary.length === 0 && (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                データがありません
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* トレンド */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>人気カテゴリー（件数）</CardTitle>
              <CardDescription>TOP5（入金完了ベース）</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="件数" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {trendCategory.map((t) => (
            <Card key={t.category}>
              <CardHeader>
                <CardTitle>{t.category}</CardTitle>
                <CardDescription>人気カテゴリー（件数）</CardDescription>
              </CardHeader>
              <CardContent>{t.count}件</CardContent>
            </Card>
          ))}
          {trendCategory.length === 0 && (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                データがありません
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
