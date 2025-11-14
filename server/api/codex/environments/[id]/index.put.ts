export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')!
    const payload = await readBody(event)
    return await updateCodexEnvironment(id, payload)
  } catch (error) {
    return handleApiError(error)
  }
})
