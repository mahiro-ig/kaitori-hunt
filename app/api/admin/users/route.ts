// app/api/admin/users/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdminAPI } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    // 管理APIガード（APIキー or セッション + admin_users）
    await requireAdminAPI(request)

    if (!supabaseAdmin) {
      console.error('[api/admin/users] supabaseAdmin is not initialized')
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        public_id,
        email,
        phone,
        postal_code,
        address,
        created_at,
        bank_name,
        branch_name,
        account_type,
        account_number,
        account_name
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[api/admin/users] GET error:', error)
      return NextResponse.json(
        { error: 'ユーザー一覧取得に失敗しました' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      { users: data },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    const status = e?.statusCode ?? 500
    const msg = e?.message ?? 'Unknown error'
    return NextResponse.json(
      { error: msg },
      { status, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
