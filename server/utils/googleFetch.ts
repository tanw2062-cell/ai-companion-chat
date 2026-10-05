import { ProxyAgent, fetch as undiciFetch, type Dispatcher, type RequestInit as UndiciInit } from 'undici'

const PROXY_HOSTS = new Set([
  'oauth2.googleapis.com',
  'www.googleapis.com',
  'googleapis.com',
  'openrouter.ai'
])

let dispatcher: Dispatcher | null = null
let proxyUri = ''
let useDirect = false

const candidateProxies = () => {
  const config = useRuntimeConfig()
  const list = [
    String(config.googleHttpsProxy || ''),
    String(process.env.GOOGLE_HTTPS_PROXY || ''),
    String(process.env.HTTPS_PROXY || ''),
    String(process.env.https_proxy || '')
  ].map((item) => item.trim()).filter(Boolean)
  if (!list.length && process.env.NODE_ENV !== 'production') {
    list.push('http://127.0.0.1:10808', 'http://127.0.0.1:7890')
  }
  return [...new Set(list)]
}

const probeProxy = async (uri: string) => {
  const agent = new ProxyAgent({
    uri,
    connect: { timeout: 12_000, family: 4 }
  })
  const res = await undiciFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    dispatcher: agent,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=authorization_code'
  })
  await res.text()
  return agent
}

const getDispatcher = async (): Promise<Dispatcher | null> => {
  if (useDirect) {
    return null
  }
  if (dispatcher) {
    return dispatcher
  }
  for (const uri of candidateProxies()) {
    try {
      dispatcher = await probeProxy(uri)
      proxyUri = uri
      return dispatcher
    } catch {
      // try next
    }
  }
  useDirect = true
  proxyUri = ''
  return null
}

export const googleFetch = async (url: string, init: UndiciInit = {}) => {
  const host = new URL(url).hostname
  if (!PROXY_HOSTS.has(host)) {
    return fetch(url, init)
  }
  const agent = await getDispatcher()
  if (!agent) {
    return fetch(url, init)
  }
  return undiciFetch(url, {
    ...init,
    dispatcher: agent
  })
}

export const googleProxyInUse = () => proxyUri
