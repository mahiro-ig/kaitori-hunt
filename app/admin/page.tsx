// @ts-nocheck
// app/admin/dashboard/page.tsx

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  ShoppingBag,
  Users as UsersIcon,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  UserPlus,
} from "lucide-react"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type RawRequest = {
  id: number
  status: string
  created_at: string
  total_price: number | null
  product: { name: string } | null
  profile: { name: string } | null
}

type RawStatusHistory = {
  id: number
  status: string
  changed_at: string
  purchase: {
    id: number
    total_price: number | null
    product: { name: string } | null
    profile: { name: string } | null
  } | null
}

type RawSignup = {
  id: number
  created_at: string
  profile: { name: string } | null
}

type RawVerification = {
  id: number
  status: string
  created_at: string
  profile: { name: string } | null
}

type Activity = {
  id: string
  type: "purchase" | "status_change" | "signup" | "verification"
  status?: string
  user: string
  item?: string
  amount?: string
  date: string
}

export default async function AdminDashboard() {
  const now = new Date()

  // 1. 買取申込総数／保留中
  const totalReqRes = await supabaseAdmin
    .from("buyback_requests")
    .select("*", { head: true, count: "exact" })
  const totalRequests = totalReqRes.count ?? 0

  const pendingReqRes = await supabaseAdmin
    .from("buyback_requests")
    .select("*", { head: true, count: "exact" })
    .eq("status", "pending")
  const pendingRequests = pendingReqRes.count ?? 0

  // 2. 登録ユーザー数（累計）
  const totalUsersRes = await supabaseAdmin
    .from("users")
    .select("*", { head: true, count: "exact" })
  const totalUsers = totalUsersRes.count ?? 0

  // 3. 本人確認：保留中＆24時間以内
  const resPendingVer = await supabaseAdmin
    .from("verifications")
    .select("*", { head: true, count: "exact" })
    .eq("status", "pending")
  const pendingVerifications = resPendingVer.count ?? 0

  const since24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const res24hVer = await supabaseAdmin
    .from("verifications")
    .select("*", { head: true, count: "exact" })
    .gte("created_at", since24hAgo)
  const last24hVerCount = res24hVer.count ?? 0

  // 4. 今月の買取総額＆先月比
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const resThisMonthSum = await supabaseAdmin
    .from("buyback_requests")
    .select("total_price")
    .eq("status", "入金完了")
    .gte("created_at", startThisMonth)
    .lte("created_at", endThisMonth)
  const thisMonthData = resThisMonthSum.data ?? []
  const thisMonthSum = thisMonthData.reduce((s, r) => s + (r.total_price ?? 0), 0)

  const resPrevMonthSum = await supabaseAdmin
    .from("buyback_requests")
    .select("total_price")
    .eq("status", "入金完了")
    .gte("created_at", startPrevMonth)
    .lte("created_at", endPrevMonth)
  const prevMonthData = resPrevMonthSum.data ?? []
  const prevMonthSum = prevMonthData.reduce((s, r) => s + (r.total_price ?? 0), 0)

  const pctMonthChange = prevMonthSum > 0
    ? Math.round(((thisMonthSum - prevMonthSum) / prevMonthSum) * 100)
    : 0

  // 5. 週次変動アラート
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const resWeek1 = await supabaseAdmin
    .from("buyback_requests")
    .select("total_price")
    .eq("status", "入金完了")
    .gte("created_at", weekAgo)
    .lte("created_at", now.toISOString())
  const resWeek2 = await supabaseAdmin
    .from("buyback_requests")
    .select("total_price")
    .eq("status", "入金完了")
    .gte("created_at", twoWeeksAgo)
    .lte("created_at", weekAgo)

  const sumWeek1 = (resWeek1.data ?? []).reduce((s, r) => s + (r.total_price ?? 0), 0)
  const sumWeek2 = (resWeek2.data ?? []).reduce((s, r) => s + (r.total_price ?? 0), 0)

  const pctWeek = sumWeek2 > 0
    ? Math.round(((sumWeek1 - sumWeek2) / sumWeek2) * 100)
    : 0
  const weeklyMessage = pctWeek >= 0
    ? `先週の買取総額は前週比${pctWeek}%増加しました`
    : `先週の買取総額は前週比${Math.abs(pctWeek)}%減少しました`

  // 6. Alerts
  const alerts: { id: number; message: string; priority: "high" | "medium" | "low" }[] = [
    { id: 1, message: `本人確認が${pendingVerifications}件保留中です`, priority: "high" },
    { id: 2, message: `買取申込が${pendingRequests}件承認待ちです`, priority: "medium" },
    { id: 3, message: weeklyMessage, priority: "low" },
  ]

  // 7. 直近15件のアクティビティ取得
  const reqRes = await supabaseAdmin
    .from<RawRequest>("buyback_requests")
    .select("id, status, created_at, total_price, product:products(name), profile:profiles(name)")
    .order("created_at", { ascending: false })
    .limit(15)
  const statusRes = await supabaseAdmin
    .from<RawStatusHistory>("purchase_status_history")
    .select("id, status, changed_at, purchase:buyback_requests(id, total_price, product:products(name), profile:profiles(name))")
    .order("changed_at", { ascending: false })
    .limit(15)
  const signupRes = await supabaseAdmin
    .from<RawSignup>("users")
    .select("id, created_at, profile:profiles(name)")
    .order("created_at", { ascending: false })
    .limit(15)
  const verifRes = await supabaseAdmin
    .from<RawVerification>("verifications")
    .select("id, status, created_at, profile:profiles(name)")
    .order("created_at", { ascending: false })
    .limit(15)

  const rawRequests = reqRes.data ?? []
  const rawStatus = statusRes.data ?? []
  const rawSignups = signupRes.data ?? []
  const rawVerifs = verifRes.data ?? []

  const recentActivity: Activity[] = [
    ...rawRequests.map(r => ({
      id: `req-${r.id}-${r.created_at}`,
      type: "purchase" as const,
      status: r.status,
      user: r.profile?.name ?? "—",
      item: r.product?.name ?? "—",
      amount: `¥${(r.total_price ?? 0).toLocaleString()}`,
      date: r.created_at.slice(0, 10),
    })),
    ...rawStatus.map(h => ({
      id: `hist-${h.id}-${h.changed_at}`,
      type: "status_change" as const,
      status: h.status,
      user: h.purchase?.profile?.name ?? "—",
      item: h.purchase?.product?.name ?? "—",
      amount: `¥${(h.purchase?.total_price ?? 0).toLocaleString()}`,
      date: h.changed_at.slice(0, 10),
    })),
    ...rawSignups.map(u => ({
      id: `signup-${u.id}-${u.created_at}`,
      type: "signup" as const,
      user: u.profile?.name ?? "—",
      date: u.created_at.slice(0, 10),
    })),
    ...rawVerifs.map(v => ({
      id: `verif-${v.id}-${v.created_at}`,
      type: "verification" as const,
      status: v.status,
      user: v.profile?.name ?? "—",
      date: v.created_at.slice(0, 10),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">管理者ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">最終更新: {now.toLocaleString("ja-JP")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 買取申込総数 */}
        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">買取申込総数</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">承認待ち: {pendingRequests}</p>
            <Link href="/admin/buyback_requests" className="mt-2 inline-block text-xs text-primary hover:underline">
              詳細を見る
            </Link>
          </CardContent>
        </Card>

        {/* 登録ユーザー数（累計） */}
        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">登録ユーザー数</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <Link href="/admin/users" className="mt-2 inline-block text-xs text-primary hover:underline">
              詳細を見る
            </Link>
          </CardContent>
        </Card>

        {/* 本人確認待ち（保留中＆24時間以内） */}
        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">本人確認待ち</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingVerifications}</div>
            <p className="text-xs text-muted-foreground">24時間以内: {last24hVerCount}</p>
            <Link href="/admin/verifications" className="mt-2 inline-block text-xs text-primary hover:underline">
              詳細を見る
            </Link>
          </CardContent>
        </Card>

        {/* 今月の買取総額（先月比） */}
        <Card>
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">今月の買取総額</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{thisMonthSum.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              先月比 {pctMonthChange >= 0 ? `+${pctMonthChange}%` : `${pctMonthChange}%`}
            </p>
            <Link href="/admin/reports" className="mt-2 inline-block text-xs text-primary hover:underline">
              詳細を見る
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">アラート</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {alerts.map(a => (
              <div
                key={a.id}
                className={`flex items-center rounded-md p-3 ${
                  a.priority === "high" ? "bg-red-50 text-red-800"
                    : a.priority === "medium" ? "bg-yellow-50 text-yellow-800"
                    : "bg-blue-50 text-blue-800"
                }`}
              >
                <AlertCircle className="mr-2 h-5 w-5" />
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity (Last 15) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">最近のアクティビティ（直近15件）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {recentActivity.map(act => (
              <div key={act.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{act.user}</p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    {act.type === "purchase" ? (
                      <>
                        <ShoppingBag className="mr-1 h-4 w-4" />
                        <span>{act.item} — {act.amount}</span>
                      </>
                    ) : act.type === "status_change" ? (
                      <>
                        <TrendingUp className="mr-1 h-4 w-4" />
                        <span>「{act.item}」のステータスが「{act.status}」に変更</span>
                      </>
                    ) : act.type === "signup" ? (
                      <>
                        <UserPlus className="mr-1 h-4 w-4" />
                        <span>アカウント作成</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-1 h-4 w-4" />
                        <span>本人確認</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{act.date}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
