// app/api/verifications/me/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let userId = (session.user as any)?.id as string | undefined;
  if (!userId && session.user?.email) {
    const { data: urow, error: uerr } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .maybeSingle();
    if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });
    userId = urow?.id;
  }
  if (!userId) return NextResponse.json({ data: null }, { status: 200 });

  const { data, error } = await supabaseAdmin
    .from("verifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ data: null }, { status: 200 });

  // 署名URL
  let signedFront: string | null = null;
  let signedSelfie: string | null = null;

  if (data.id_photo_path) {
    const { data: f1 } = await supabaseAdmin.storage
      .from("id-photos")
      .createSignedUrl(data.id_photo_path, 60);
    signedFront = f1?.signedUrl ?? null;
  }
  if (data.face_path) {
    const { data: f2 } = await supabaseAdmin.storage
      .from("face-captures")
      .createSignedUrl(data.face_path, 60);
    signedSelfie = f2?.signedUrl ?? null;
  }

  return NextResponse.json({ data, signedFront, signedSelfie }, { status: 200 });
}
