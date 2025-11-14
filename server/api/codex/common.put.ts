export default defineEventHandler(async (event) => {
  const { content } = await readBody(event)
  return await saveCodexGeneralConfig(content)
})
