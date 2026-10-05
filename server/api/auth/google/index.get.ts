import { randomBytes } from 'node:crypto'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const clientId = String(config.googleClientId || '')
  const redirectUri = String(config.googleRedirectUri || 'http://localhost:3002/api/auth/google/callback')
  if (!clientId) {
    throw createError({ statusCode: 500, statusMessage: 'GOOGLE_CLIENT_ID missing' })
  }
  const state = randomBytes(16).toString('hex')
  setCookie(event, 'oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600
  })
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('prompt', 'select_account')
  return sendRedirect(event, url.toString(), 302)
})
