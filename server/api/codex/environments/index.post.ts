export default defineEventHandler(async (event) => {
  try {
    const payload = await readBody(event)
    return await createCodexEnvironment(payload)
  } catch (error) {
    return handleApiError(error)
  }
})
