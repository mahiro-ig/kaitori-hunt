// next-auth.d.ts

import NextAuth, { DefaultSession } from "next-auth"
import { JWT as DefaultJWT } from "next-auth/jwt"

// ─────────────────────────────────────────────────────────────────────────────
//  1) Session.user.id を追加
// ─────────────────────────────────────────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    // DefaultSession が持つ user プロパティを引き継ぎつつ、id: string を追加
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  2) JWT にも id を追加
// ─────────────────────────────────────────────────────────────────────────────
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    // authorize コールバックで token.id = user.id をセットしているので型にも追加
    id: string
  }
}
