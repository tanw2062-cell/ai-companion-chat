const asRecord = (input: unknown) => {
  const out: Record<string, string> = {}
  if (!input || typeof input !== 'object') {
    return out
  }
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === undefined || value === null) {
      continue
    }
    out[key] = Array.isArray(value) ? String(value[0]) : String(value)
  }
  return out
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const key = String(config.zpayKey || process.env.ZPAY_KEY || '')
  const query = asRecord(getQuery(event))
  let body: Record<string, string> = {}
  try {
    body = asRecord(await readBody(event))
  } catch {
    body = {}
  }
  const params = { ...query, ...body }

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  if (!key || !zpayVerify(params, key)) {
    return 'fail'
  }
  if (params.trade_status !== 'TRADE_SUCCESS') {
    return 'success'
  }
  if (Number(params.money) !== 9.9) {
    return 'fail'
  }

  const outTradeNo = params.out_trade_no
  const userId = Number(params.param || 0)
  if (!outTradeNo || !userId) {
    return 'fail'
  }

  const db = getSupabase()
  const existed = await db.from('payments').select('out_trade_no').eq('out_trade_no', outTradeNo).maybeSingle()
  if (existed.data?.out_trade_no) {
    return 'success'
  }

  const { error: payError } = await db.from('payments').insert({
    out_trade_no: outTradeNo,
    user_id: userId,
    money: params.money,
    trade_no: params.trade_no || null,
    trade_status: params.trade_status
  })
  if (payError && !String(payError.message || '').toLowerCase().includes('duplicate')) {
    return 'fail'
  }

  const { data: user } = await db
    .from('users')
    .select('subscription_ends_at')
    .eq('id', userId)
    .maybeSingle()
  const now = Date.now()
  const currentEnd = user?.subscription_ends_at ? new Date(String(user.subscription_ends_at)).getTime() : 0
  const base = currentEnd > now ? currentEnd : now
  const nextEnd = new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString()
  await db.from('users').update({ is_premium: true, subscription_ends_at: nextEnd }).eq('id', userId)
  return 'success'
})
