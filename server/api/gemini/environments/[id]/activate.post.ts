/**
 * POST /api/gemini/environments/:id/activate
 * 激活 Gemini 环境
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少环境 ID' })
    }

    const record = await activateGeminiEnvironment(id)
    return record
  } catch (error) {
    return handleApiError(error)
  }
})

