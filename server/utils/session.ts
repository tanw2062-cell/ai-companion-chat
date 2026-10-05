import { createHmac, timingSafeEqual } from 'node:crypto'

export interface AuthUser {
  id: number
  google_id: string
  email: string
  name: string | null
  avatar: string | null
  is_premium: boolean
  subscription_ends_at: string | null
  daily_chat_date: string | null
  daily_chat_count: number
}

const cookieName = 'star_session'

const secret = () => {
  const config = useRuntimeConfig()
  return String(config.googleClientSecret || 'dev-session')
}

const sign = (payload: string) => {
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

const verify = (token: string) => {
  const idx = token.lastIndexOf('.')
  if (idx <= 0) {
    return null
  }
  const payload = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null
  }
  return payload
}

export const setAuthCookie = (event: Parameters<typeof setCookie>[0], userId: number) => {
  setCookie(event, cookieName, sign(String(userId)), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14
  })
}

export const clearAuthCookie = (event: Parameters<typeof deleteCookie>[0]) => {
  deleteCookie(event, cookieName, { path: '/' })
}

export const isPremiumActive = (user: Pick<AuthUser, 'is_premium' | 'subscription_ends_at'>) => {
  if (!user.is_premium) {
    return false
  }
  if (!user.subscription_ends_at) {
    return true
  }
  return new Date(user.subscription_ends_at).getTime() > Date.now()
}

export const getAuthUser = async (event: Parameters<typeof getCookie>[0]) => {
  const raw = getCookie(event, cookieName)
  if (!raw) {
    return null
  }
  const userId = verify(raw)
  if (!userId) {
    return null
  }
  const full =
    'id, google_id, email, name, avatar, is_premium, subscription_ends_at, daily_chat_date, daily_chat_count'
  let { data, error } = await getSupabase().from('users').select(full).eq('id', userId).maybeSingle()
  if (error) {
    const fallback = await getSupabase()
      .from('users')
      .select('id, google_id, email, name, avatar')
      .eq('id', userId)
      .maybeSingle()
    data = fallback.data
      ? {
          ...fallback.data,
          is_premium: false,
          subscription_ends_at: null,
          daily_chat_date: null,
          daily_chat_count: 0
        }
      : null
    error = fallback.error
  }
  if (error || !data) {
    return null
  }
  const row = data as Record<string, unknown>
  return {
    id: Number(row.id),
    google_id: String(row.google_id),
    email: String(row.email),
    name: (row.name as string | null) || null,
    avatar: (row.avatar as string | null) || null,
    is_premium: Boolean(row.is_premium),
    subscription_ends_at: (row.subscription_ends_at as string | null) || null,
    daily_chat_date: (row.daily_chat_date as string | null) || null,
    daily_chat_count: Number(row.daily_chat_count || 0)
  } as AuthUser
}
