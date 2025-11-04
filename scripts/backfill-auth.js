// scripts/backfill-auth.js
// public.users をバックフィルして auth.users を作成し、auth_id で public.users.id を置換
// 依存: @supabase/supabase-js, dotenv

// --- dotenv 読み込み（.env.local → .env の順で試行）---
let loaded = false
try {
  const r = require('dotenv').config({ path: './.env.local' })
  loaded = !r.error
} catch (_) {}
if (!loaded) {
  try {
    const r2 = require('dotenv').config({ path: './.env' })
    loaded = !r2.error
  } catch (_) {}
}
console.log('[env] NEXT_PUBLIC_SUPABASE_URL:', (process.env.NEXT_PUBLIC_SUPABASE_URL || '').slice(0, 40) + '...')
console.log('[env] SUPABASE_SERVICE_ROLE_KEY:', (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 8) + '...')

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ENV不足: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を確認してください（.env.local か .env）')
  process.exit(1)
}

// public 用クライアント（既定スキーマ=public）
const adminPublic = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Admin API（createUser/listUsers 等）
const adminAuth = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

/** auth 側の既存ユーザー全件（または十分大きいページ）をまとめて取得して email→id のMapを作成 */
async function buildAuthEmailMap(perPage = 1000, maxPages = 50) {
  const emailToId = new Map()
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await adminAuth.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('[listUsers] error on page', page, error)
      break
    }
    const users = data?.users ?? []
    for (const u of users) {
      const email = (u.email || '').toLowerCase()
      if (email) emailToId.set(email, u.id)
    }
    if (users.length < perPage) break // 取り切った
  }
  return emailToId
}

async function main() {
  // 0) auth 側の既存ユーザーを一括取得（email→id）
  console.log('[backfill] auth users を読み込み中...')
  const authEmailMap = await buildAuthEmailMap(1000, 50)
  console.log('[backfill] auth users 読み込み完了, 件数:', authEmailMap.size)

  // 1) public.users を取得（email があるユーザーだけ対象）
  const { data: users, error: usersErr } = await adminPublic
    .from('users')
    .select('id,email,name,phone,created_at')
    .order('created_at', { ascending: true })

  if (usersErr) {
    console.error('[backfill] public.users 取得エラー:', usersErr)
    process.exit(1)
  }

  const targets = (users || []).filter((u) => !!u.email)
  console.log(`[backfill] 対象件数: ${targets.length}`)

  for (const u of targets) {
    const email = (u.email || '').toLowerCase()
    try {
      // 2) 既に auth.users に存在するか（メモリMapで照合）
      let authId = authEmailMap.get(email) || null

      // 3) 無ければ auth.users を作成（Admin API）
      if (!authId) {
        const tmpPass = crypto.randomBytes(12).toString('base64url')
        const { data: created, error: createErr } = await adminAuth.auth.admin.createUser({
          email,
          password: tmpPass,
          email_confirm: true,
          user_metadata: {
            name: u.name ?? null,
            phone: u.phone ?? null,
          },
          app_metadata: { role: 'user' },
        })
        if (createErr) {
          console.warn(`[backfill] createUser 警告（重複等） ${email}:`, createErr.message)
          // listUsers をもう一度最小限走らせて再解決
          const { data: re } = await adminAuth.auth.admin.listUsers({ page: 1, perPage: 200 })
          const found = re?.users?.find(ux => (ux.email || '').toLowerCase() === email)
          if (!found) {
            console.error(`[backfill] auth id を解決できません (${email})`)
            continue
          }
          authId = found.id
          authEmailMap.set(email, authId)
        } else {
          authId = created?.user?.id || null
          if (!authId) {
            console.error(`[backfill] createUser 成功っぽいが ID 不明 (${email})`)
            continue
          }
          authEmailMap.set(email, authId)
        }
      }

      // 既に同一IDならスキップ
      if (u.id === authId) {
        console.log(`[SKIP] 既に同期済み: ${email} (${u.id})`)
        continue
      }

      // 4) public.users.id を authId に置換（※FKは ON UPDATE CASCADE 前提）
      const { error: updErr } = await adminPublic
        .from('users')
        .update({ id: authId })
        .eq('id', u.id)

      if (updErr) {
        console.error(`[backfill] ID置換エラー ${email}:`, updErr)
        continue
      }

      console.log(`[OK] ${email}  ${u.id} -> ${authId}`)
    } catch (e) {
      console.error(`[backfill] 予期せぬエラー (${email}):`, e)
    }
  }

  console.log('[backfill] 完了')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
