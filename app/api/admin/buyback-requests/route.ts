// app/api/admin/buyback-requests/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type PublicUser = { id: string; name: string | null; email: string | null };

function normalizeBuyMethod(
  raw?: string | null
): "郵送買取" | "店頭買取" | "不明" {
  if (!raw) return "不明";
  const s = String(raw).toLowerCase();
  if (s === "shipping" || s === "postal") return "郵送買取";
  if (s === "instore" || s === "in_store" || s === "in-store") return "店頭買取";
  if (s.includes("郵送") || s.includes("宅配") || s.includes("配送")) return "郵送買取";
  if (s.includes("店頭") || s.includes("来店") || s.includes("持込")) return "店頭買取";
  return "不明";
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseInt(v.replace(/[^\d-]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** 管理者判定：role=admin or ADMIN_EMAILS or admin_usersテーブル */
async function assertIsAdmin(session: any) {
  if (!session?.user) throw new Error("UNAUTHORIZED");

  // 1) JWT role=admin
  const role = (session.user as any).role;
  if (role === "admin") return;

  // 2) 環境変数 ADMIN_EMAILS に含まれるか
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const email = (session.user.email ?? "").toLowerCase();
  if (email && adminEmails.includes(email)) return;

  // 3) admin_users テーブルに存在するか
  const userId = (session.user as any).id;
  if (!userId) throw new Error("UNAUTHORIZED");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("DB_ERROR");
  if (!data) throw new Error("UNAUTHORIZED");
}

export async function GET() {
  try {
    // セッション & 管理者チェック
    const session = await getServerSession(authOptions);
    await assertIsAdmin(session);

    const supabase = getSupabaseAdmin();

    // 1) buyback_requests を取得
    const { data: reqRows, error: reqErr } = await supabase
      .from("buyback_requests")
      .select(
        `
        id,
        reservation_number,
        user_id,
        total_price,
        status,
        created_at,
        updated_at,
        items,
        purchase_method
      `
      )
      .order("created_at", { ascending: false });

    if (reqErr) {
      console.error("[buyback-requests] select buyback_requests error:", reqErr);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    const rows = reqRows ?? [];

    // 2) users をまとめ取り
    const userIds = Array.from(
      new Set(
        rows
          .map((r: any) => r?.user_id)
          .filter((v: any): v is string => typeof v === "string" && v.length > 0)
      )
    );

    let usersMap: Record<string, PublicUser> = {};
    if (userIds.length > 0) {
      const { data: userRows, error: usersErr } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", userIds);

      if (usersErr) {
        // Usersが取れなくても致命ではない（ユーザー名は不明表示）
        console.error("[buyback-requests] select users error:", usersErr);
      } else if (userRows?.length) {
        usersMap = userRows.reduce((acc: Record<string, PublicUser>, u: any) => {
          acc[String(u.id)] = {
            id: String(u.id),
            name: u.name ?? null,
            email: u.email ?? null,
          };
          return acc;
        }, {});
      }
    }

    // 3) 整形
    const payload = rows.map((r: any) => {
      const rawMethod: string | null = r?.purchase_method ?? null;
      const user: PublicUser | null =
        r?.user_id && usersMap[r.user_id] ? usersMap[r.user_id] : null;

      return {
        id: String(r.id),
        reservation_number: String(r.reservation_number ?? ""),
        user_id: String(r.user_id ?? ""),
        user,
        items: r.items ?? [],
        total_price: toNumber(r.total_price),
        status: r.status ?? "",
        created_at: r.created_at ?? new Date(0).toISOString(),
        updated_at: r.updated_at ?? r.created_at ?? new Date(0).toISOString(),
        _rawMethod: rawMethod,
        method: normalizeBuyMethod(rawMethod),
      };
    });

    return NextResponse.json({ data: payload }, { status: 200 });
  } catch (e: any) {
    const msg = e?.message || "Unknown error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
