// app/api/admin/verifications/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    // 1) 管理者認可（APIキー or セッション+admin_users）
    await requireAdminAPI(request)

    if (!supabaseAdmin) {
      console.error('[api/admin/verifications] supabaseAdmin is not initialized')
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 2) verifications を user_id 含めて取得
    const { data: verifs, error: verifError } = await supabaseAdmin
      .from('verifications')
      .select('id, created_at, status, face_path, user_id')

    if (verifError) {
      console.error('[api/admin/verifications] fetch error:', verifError)
      return NextResponse.json(
        { error: verifError.message },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    if (!verifs || verifs.length === 0) {
      // データなしでも空配列を返す
      return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })
    }

    // 3) ユーザー情報を一括取得
    const userIds = Array.from(new Set(verifs.map((v) => v.user_id))).filter(Boolean)
    let users: Array<{ id: string; name: string | null; email: string | null }> = []

    if (userIds.length > 0) {
      const { data: u, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, name, email')
        .in('id', userIds as string[])

      if (userError) {
        console.error('[api/admin/verifications] users fetch error:', userError)
        return NextResponse.json(
          { error: userError.message },
          { status: 500, headers: { 'Cache-Control': 'no-store' } }
        )
      }
      users = u ?? []
    }

    const userMap = users.reduce<Record<string, { id: string; name: string | null; email: string | null }>>(
      (acc, u) => {
        acc[u.id] = u
        return acc
      },
      {}
    )

    // 4) フロント用の形に整形（既存仕様に合わせて users 配列でラップ）
    const result = verifs.map((v) => ({
      id: v.id,
      created_at: v.created_at,
      status: v.status,
      face_path: v.face_path,
      users: userMap[v.user_id] ? [userMap[v.user_id]] : [],
    }))

    // 5) JSON で返却
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    const status = e?.statusCode ?? 500
    const msg = e?.message ?? 'Unknown error'
    return NextResponse.json(
      { error: msg },
      { status, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
