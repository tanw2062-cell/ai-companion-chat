export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const queryParams = getQuery(event)
  const code = String(queryParams.code || '')
  const state = String(queryParams.state || '')
  const saved = getCookie(event, 'oauth_state') || ''
  deleteCookie(event, 'oauth_state', { path: '/' })

  if (!code || !state || state !== saved) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' })
  }

  const clientId = String(config.googleClientId || '')
  const clientSecret = String(config.googleClientSecret || '')
  const redirectUri = String(config.googleRedirectUri || 'http://localhost:3002/api/auth/google/callback')

  const tokenRes = await googleFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString()
  })
  const tokenJson = (await tokenRes.json()) as { access_token?: string }
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw createError({ statusCode: 502, statusMessage: 'Google token exchange failed' })
  }

  const profileRes = await googleFetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` }
  })
  const profile = (await profileRes.json()) as {
    id?: string
    email?: string
    name?: string
    picture?: string
  }
  if (!profile.id || !profile.email) {
    throw createError({ statusCode: 502, statusMessage: 'Google profile missing' })
  }

  const { data, error } = await getSupabase()
    .from('users')
    .upsert(
      {
        google_id: profile.id,
        email: profile.email,
        name: profile.name || null,
        avatar: profile.picture || null
      },
      { onConflict: 'google_id' }
    )
    .select('id')
    .single()

  if (error || !data?.id) {
    throw createError({ statusCode: 502, statusMessage: 'Supabase user upsert failed' })
  }

  setAuthCookie(event, Number(data.id))
  return sendRedirect(event, '/', 302)
})
