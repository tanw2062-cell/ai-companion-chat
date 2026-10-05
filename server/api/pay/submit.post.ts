export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Login required' })
  }

  const config = useRuntimeConfig(event)
  const pid = String(config.zpayPid || process.env.ZPAY_PID || '')
  const key = String(config.zpayKey || process.env.ZPAY_KEY || '')
  const type = String(config.zpayType || process.env.ZPAY_TYPE || 'alipay')
  if (!pid || !key) {
    throw createError({ statusCode: 500, statusMessage: 'ZPAY_PID or ZPAY_KEY missing' })
  }

  const origin = siteOrigin(event)
  const outTradeNo = `u${user.id}${Date.now()}`.slice(0, 32)
  const params: Record<string, string> = {
    pid,
    type,
    out_trade_no: outTradeNo,
    name: 'Premium Member',
    money: '9.90',
    notify_url: `${origin}/api/pay/notify`,
    return_url: `${origin}/pay/return`,
    param: String(user.id),
    sign_type: 'MD5'
  }
  params.sign = zpaySign(params, key)

  const url = new URL('https://zpayz.cn/submit.php')
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value)
  }
  return { url: url.toString(), out_trade_no: outTradeNo }
})
