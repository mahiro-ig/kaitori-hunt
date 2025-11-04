import { getServerSession } from "next-auth/next";
// ✅ app/api/.. を参照しない。必ず lib 側から取る
import { authOptions } from "@/lib/auth";

type GateOk = {
  ok: true;
  session: Awaited<ReturnType<typeof getServerSession>>;
  userId: string;
  email: string;
  role: string | undefined;
};

type GateNg = { ok: false; status: 401 | 403 | 500; error: string };

export async function requireAdminSession(): Promise<GateOk | GateNg> {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id as string | undefined;
    const email = (session as any)?.user?.email?.toLowerCase?.() as string | undefined;
    const role = (session as any)?.user?.role as string | undefined;

    if (!session || !userId) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = role === "admin" || (!!email && adminEmails.includes(email));
    if (!isAdmin) {
      return { ok: false, status: 403, error: "Forbidden" };
    }

    return { ok: true, session, userId, email: email ?? "", role };
  } catch (e: any) {
    return { ok: false, status: 500, error: e?.message ?? "Internal error" };
  }
}
