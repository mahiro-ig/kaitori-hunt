// app/api/admin/users/[id]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdminAPI } from '@/lib/auth'

// GET  /api/admin/users/:id → ユーザー詳細取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認可（APIキー or セッション+admin_users）
    await requireAdminAPI(request)

    if (!supabaseAdmin) {
      console.error('[api/admin/users/[id]] supabaseAdmin is not initialized')
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const { id: publicId } = await params
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        public_id,
        id,
        name,
        email,
        phone,
        postal_code,
        address,
        created_at,
        status,
        bank_name,
        branch_name,
        account_type,
        account_number,
        account_name
      `)
      .eq('public_id', publicId)
      .single()

    if (error) {
      console.error(`[api/admin/users/${publicId}] GET error:`, error)
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      { user: data },
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

// PUT /api/admin/users/:id → ユーザー情報更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認可（APIキー or セッション+admin_users）
    await requireAdminAPI(request)

    if (!supabaseAdmin) {
      console.error('[api/admin/users/[id]] supabaseAdmin is not initialized')
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const { id: publicId } = await params
    const body = await request.json().catch(() => ({} as Record<string, unknown>))

    const {
      name,
      email,
      phone,
      address,
      status,
      bank_name,
      branch_name,
      account_type,
      account_number,
      account_name,
    } = body as Record<string, unknown>

    // 更新するフィールドをマッピング
    const updates: Record<string, any> = {}
    if (typeof name === 'string') updates.name = name
    if (typeof email === 'string') updates.email = email
    if (typeof phone === 'string') updates.phone = phone
    if (typeof address === 'string') updates.address = address
    if (typeof status === 'string') updates.status = status
    if (typeof bank_name === 'string') updates.bank_name = bank_name
    if (typeof branch_name === 'string') updates.branch_name = branch_name
    if (typeof account_type === 'string') updates.account_type = account_type
    if (typeof account_number === 'string') updates.account_number = account_number
    if (typeof account_name === 'string') updates.account_name = account_name

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: '更新対象がありません' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('public_id', publicId)
      .single()

    if (error) {
      console.error(`[api/admin/users/${publicId}] PUT error:`, error)
      return NextResponse.json(
        { error: 'ユーザー情報の更新に失敗しました' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      { user: data },
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
