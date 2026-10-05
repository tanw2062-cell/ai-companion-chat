export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  return await readQuota(event, user)
})
