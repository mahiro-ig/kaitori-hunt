// /app/api/admin/_lib/adminGuard.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * - Bearer INTERNAL_ADMIN_API_KEY または next-auth セッション + admin_users で許可
 * - 失敗時は throw で 401/403 を上位に伝搬
 */
export async function requireAdmin(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const headerKey = request.headers.get('x-admin-key') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null
  const internalKey = bearer || headerKey
  if (internalKey && internalKey === process.env.INTERNAL_ADMIN_API_KEY) {
    return { type: 'key' as const }
  }

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    const e = new Error('Unauthorized')
    // @ts-ignore
    e.statusCode = 401
    throw e
  }

  if (!supabaseAdmin) {
    const e = new Error('Server misconfig')
    // @ts-ignore
    e.statusCode = 500
    throw e
  }

  const { data: admin, error } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[requireAdmin] supabase error', error)
    const e = new Error('DB error')
    // @ts-ignore
    e.statusCode = 500
    throw e
  }
  if (!admin) {
    const e = new Error('Forbidden')
    // @ts-ignore
    e.statusCode = 403
    throw e
  }

  return { type: 'session' as const, userId }
}
