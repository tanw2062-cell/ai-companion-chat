import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ProxyAgent, fetch as undiciFetch } from 'undici'

let client: SupabaseClient | null = null

const proxiedFetch: typeof fetch = (input, init) => {
  const config = useRuntimeConfig()
  const proxy = String(config.googleHttpsProxy || process.env.GOOGLE_HTTPS_PROXY || '').trim()
  if (!proxy) {
    return fetch(input, init)
  }
  const dispatcher = new ProxyAgent({
    uri: proxy,
    connect: { timeout: 15_000, family: 4 }
  })
  return undiciFetch(input as string, {
    ...(init || {}),
    dispatcher
  }) as unknown as Promise<Response>
}

export const getSupabase = () => {
  if (client) {
    return client
  }
  const config = useRuntimeConfig()
  const url = String(config.supabaseUrl || process.env.SUPABASE_URL || '')
  const key = String(config.supabaseKey || process.env.SUPABASE_KEY || '')
  if (!url || !key) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase is not configured'
    })
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: proxiedFetch }
  })
  return client
}
