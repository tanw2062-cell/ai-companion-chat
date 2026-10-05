import { COMPANIONS } from '../../utils/companions'

type ChatTurn = { role: 'user' | 'assistant', content: string }

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiKey = String(config.openrouterApiKey || '')
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OPENROUTER_API_KEY missing' })
  }

  const body = await readBody<{ companionId?: string, messages?: ChatTurn[] }>(event)
  const companion = COMPANIONS.find(item => item.id === body?.companionId) || COMPANIONS[0]
  const history = Array.isArray(body?.messages) ? body.messages.slice(-16) : []
  const last = history[history.length - 1]
  if (!last || last.role !== 'user' || !String(last.content || '').trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Message required' })
  }

  const user = await getAuthUser(event)
  await consumeQuota(event, user)

  const messages = [
    { role: 'system', content: companion.prompt },
    ...history.map(item => ({
      role: item.role,
      content: String(item.content || '').slice(0, 2000)
    }))
  ]

  const model = String(config.openrouterModel || 'qwen/qwen3.8-27b:free')
  const origin = siteOrigin(event)
  const res = await googleFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': origin,
      'X-Title': 'Star Companion'
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages
    })
  })

  if (!res.ok || !res.body) {
    const detail = await res.text()
    throw createError({ statusCode: 502, statusMessage: detail.slice(0, 200) || 'OpenRouter failed' })
  }

  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache')
  return sendStream(event, res.body as unknown as Parameters<typeof sendStream>[1])
})
