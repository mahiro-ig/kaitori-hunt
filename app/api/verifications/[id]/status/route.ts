// app/api/verifications/[id]/status/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: Params
) {
  // params を await してから id を取り出す
  const { id } = await params;

  // リクエストボディからステータスを取得
  const { status } = await request.json(); // "approved" or "rejected"

  // service-role キーで安全に UPDATE
  const { data, error } = await supabaseAdmin
    .from("verifications")
    .update({ status })
    .eq("id", id)
    .single();

  if (error) {
    console.error("verifications update error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
