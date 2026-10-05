import { createHash, timingSafeEqual } from 'node:crypto'

const skip = new Set(['sign', 'sign_type'])

export const zpaySign = (params: Record<string, string | number | undefined | null>, key: string) => {
  const pairs = Object.keys(params)
    .filter((name) => {
      if (skip.has(name)) {
        return false
      }
      const value = params[name]
      return value !== undefined && value !== null && String(value) !== ''
    })
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((name) => `${name}=${params[name]}`)
    .join('&')
  return createHash('md5').update(`${pairs}${key}`, 'utf8').digest('hex')
}

export const zpayVerify = (params: Record<string, string>, key: string) => {
  const expected = zpaySign(params, key)
  const given = String(params.sign || '').toLowerCase()
  const a = Buffer.from(expected)
  const b = Buffer.from(given)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const siteOrigin = (event: Parameters<typeof getRequestURL>[0]) => {
  const config = useRuntimeConfig(event)
  const fromEnv = String(config.public.siteUrl || process.env.NUXT_PUBLIC_SITE_URL || '').trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }
  const vercel = String(process.env.VERCEL_URL || '').trim()
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, '')}`
  }
  return getRequestURL(event).origin
}
