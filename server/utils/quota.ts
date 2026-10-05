import { createHmac } from 'node:crypto'
import { DAILY_LIMIT } from './companions'
import { getAuthUser, isPremiumActive, type AuthUser } from './session'

const cookieName = 'star_quota'

const todayUtc = () => new Date().toISOString().slice(0, 10)

const secret = () => String(useRuntimeConfig().googleClientSecret || 'dev-session')

const pack = (date: string, count: number) => {
  const payload = `${date}.${count}`
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

const unpack = (raw: string | undefined) => {
  if (!raw) {
    return { date: todayUtc(), count: 0 }
  }
  const parts = raw.split('.')
  if (parts.length < 3) {
    return { date: todayUtc(), count: 0 }
  }
  const date = parts[0]
  const count = Number(parts[1] || 0)
  const sig = parts.slice(2).join('.')
  const payload = `${date}.${count}`
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url')
  if (sig !== expected) {
    return { date: todayUtc(), count: 0 }
  }
  if (date !== todayUtc()) {
    return { date: todayUtc(), count: 0 }
  }
  return { date, count }
}

export const readQuota = async (event: Parameters<typeof getCookie>[0], user: AuthUser | null) => {
  if (user && isPremiumActive(user)) {
    return { remaining: -1, used: 0, limit: DAILY_LIMIT, premium: true }
  }
  if (user) {
    const day = todayUtc()
    const used = user.daily_chat_date === day ? user.daily_chat_count : 0
    return { remaining: Math.max(0, DAILY_LIMIT - used), used, limit: DAILY_LIMIT, premium: false }
  }
  const q = unpack(getCookie(event, cookieName))
  return { remaining: Math.max(0, DAILY_LIMIT - q.count), used: q.count, limit: DAILY_LIMIT, premium: false }
}

export const consumeQuota = async (event: Parameters<typeof getCookie>[0], user: AuthUser | null) => {
  const current = await readQuota(event, user)
  if (current.premium) {
    return current
  }
  if (current.remaining <= 0) {
    throw createError({ statusCode: 402, statusMessage: 'Daily free chat limit reached' })
  }
  if (user) {
    const day = todayUtc()
    const used = user.daily_chat_date === day ? user.daily_chat_count + 1 : 1
    await getSupabase()
      .from('users')
      .update({ daily_chat_date: day, daily_chat_count: used })
      .eq('id', user.id)
    return { remaining: Math.max(0, DAILY_LIMIT - used), used, limit: DAILY_LIMIT, premium: false }
  }
  const next = unpack(getCookie(event, cookieName))
  const used = next.count + 1
  setCookie(event, cookieName, pack(todayUtc(), used), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 36
  })
  return { remaining: Math.max(0, DAILY_LIMIT - used), used, limit: DAILY_LIMIT, premium: false }
}
