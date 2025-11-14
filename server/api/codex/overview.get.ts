export default defineEventHandler(async () => {
  try {
    return await getCodexOverview()
  } catch (error) {
    return handleApiError(error)
  }
})
