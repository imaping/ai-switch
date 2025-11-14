export default defineEventHandler(async (event) => {
  const payload = await readBody(event)
  return await upsertRemoteEnvironment(payload)
})
