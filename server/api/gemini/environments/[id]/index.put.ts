/**
 * PUT /api/gemini/environments/:id
 * 更新 Gemini 环境
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少环境 ID' })
    }

    const payload = await readBody(event)
    const record = await updateGeminiEnvironment(id, payload)
    return record
  } catch (error) {
    return handleApiError(error)
  }
})

