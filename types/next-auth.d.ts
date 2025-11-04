// types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      /** Supabase のユーザーID */
      id: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    /** Supabase のユーザーID */
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Supabase のユーザーID */
    id: string;
  }
}

