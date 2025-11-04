// /lib/admin-auth.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin =
    (session.user as any)?.role === "admin" ||
    (session.user?.email && adminEmails.includes(session.user.email.toLowerCase()));

  if (!isAdmin) return { ok: false as const, status: 403 as const, error: "Forbidden" };

  return { ok: true as const, session };
}
