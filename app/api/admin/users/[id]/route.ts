// app/api/admin/users/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; 
import { requireAdminAPI } from "@/lib/auth";


const noStore = { headers: { "Cache-Control": "no-store" } } as const;


function looksLikePublicId(v: string) {

  return /^[0-9a-z-]{6,}$/i.test(v);
}


export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    
    await requireAdminAPI(_request);

    if (!supabaseAdmin) {
      console.error("[api/admin/users/[id]] supabaseAdmin is not initialized");
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500, ...noStore });
    }

    const publicId = params?.id ?? "";
    if (!publicId || !looksLikePublicId(publicId)) {
      return NextResponse.json({ error: "不正なIDです" }, { status: 400, ...noStore });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        [
          "public_id",
          "id",
          "name",
          "email",
          "phone",
          "postal_code",
          "address",
          "created_at",
          "bank_name",
          "branch_name",
          "account_type",
          "account_number",
          "account_name",
        ].join(",")
      )
      .eq("public_id", publicId)
      .maybeSingle();

    if (error) {
      console.error(`[api/admin/users/${publicId}] GET error:`, error);
      return NextResponse.json({ error: "ユーザー取得に失敗しました" }, { status: 500, ...noStore });
    }

    if (!data) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404, ...noStore });
    }

    return NextResponse.json({ user: data }, noStore);
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    const msg = e?.message ?? "Unknown error";
    return NextResponse.json({ error: msg }, { status, ...noStore });
  }
}


export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    
    await requireAdminAPI(request);

    if (!supabaseAdmin) {
      console.error("[api/admin/users/[id]] supabaseAdmin is not initialized");
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500, ...noStore });
    }

    const publicId = params?.id ?? "";
    if (!publicId || !looksLikePublicId(publicId)) {
      return NextResponse.json({ error: "不正なIDです" }, { status: 400, ...noStore });
    }

    
    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const {
      name,
      email,
      phone,
      address,
      bank_name,
      branch_name,
      account_type,
      account_number,
      account_name,
      postal_code,
      
    } = body as Record<string, unknown>;

    // 更新フィールド組み立て
    const updates: Record<string, any> = {};
    if (typeof name === "string") updates.name = name;
    if (typeof email === "string") updates.email = email;
    if (typeof phone === "string") updates.phone = phone;
    if (typeof address === "string") updates.address = address;
    if (typeof bank_name === "string") updates.bank_name = bank_name;
    if (typeof branch_name === "string") updates.branch_name = branch_name;
    if (typeof account_type === "string") updates.account_type = account_type;
    if (typeof account_number === "string") updates.account_number = account_number;
    if (typeof account_name === "string") updates.account_name = account_name;
    if (typeof postal_code === "string") updates.postal_code = postal_code;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "更新対象がありません" }, { status: 400, ...noStore });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("public_id", publicId)
      .select(
        [
          "public_id",
          "id",
          "name",
          "email",
          "phone",
          "postal_code",
          "address",
          "created_at",
          "bank_name",
          "branch_name",
          "account_type",
          "account_number",
          "account_name",
        ].join(",")
      )
      .maybeSingle();

    if (error) {
      console.error(`[api/admin/users/${publicId}] PUT error:`, error);
      return NextResponse.json({ error: "ユーザー情報の更新に失敗しました" }, { status: 500, ...noStore });
    }

    if (!data) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404, ...noStore });
    }

    return NextResponse.json({ user: data }, noStore);
  } catch (e: any) {
    const status = e?.statusCode ?? 500;
    const msg = e?.message ?? "Unknown error";
    return NextResponse.json({ error: msg }, { status, ...noStore });
  }
}
