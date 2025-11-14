export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const payload = await readBody(event)
  return await upsertRemoteEnvironment(payload, id)
})
