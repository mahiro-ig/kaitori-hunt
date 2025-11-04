// app/api/auth/bank-account/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type BankAccountBody = {
  bankName:      string;
  branchName:    string;
  accountType:   string;
  accountNumber: string;
  accountName:   string;
};


export async function GET() {
  const session: any = await getServerSession(authOptions);
  const userId: string | undefined = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "未認証です" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      "bank_name, branch_name, account_type, account_number, account_name"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("🔥 BankAccount GET error:", error);
    return NextResponse.json(
      { error: "取得に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    bankName:      data?.bank_name      ?? "",
    branchName:    data?.branch_name    ?? "",
    accountType:   data?.account_type   ?? "普通",
    accountNumber: data?.account_number ?? "",
    accountName:   data?.account_name   ?? "",
  });
}


export async function PUT(request: Request) {
  const session: any = await getServerSession(authOptions);
  const userId: string | undefined    = session?.user?.id;
  const userEmail: string | undefined = session?.user?.email;
  if (!userId || !userEmail) {
    return NextResponse.json({ error: "未認証です" }, { status: 401 });
  }

  const {
    bankName,
    branchName,
    accountType,
    accountNumber,
    accountName,
  } = (await request.json()) as BankAccountBody;

  if (!bankName) {
    return NextResponse.json(
      { error: "銀行名は必須です" },
      { status: 400 }
    );
  }

  
  const upsertData = {
    id:             userId,
    email:          userEmail,
    bank_name:      bankName,
    branch_name:    branchName,
    account_type:   accountType,
    account_number: accountNumber,
    account_name:   accountName,
  };

  const { error } = await supabaseAdmin
    .from("users")
    .upsert(upsertData, { onConflict: "id" });

  if (error) {
    console.error("🔥 BankAccount PUT error:", error);
    return NextResponse.json(
      { error: "更新に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "更新成功" });
}
