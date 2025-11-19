/**
 * DELETE /api/gemini/environments/:id
 * 删除 Gemini 环境
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少环境 ID' })
    }

    await deleteGeminiEnvironment(id)
    return { success: true }
  } catch (error) {
    return handleApiError(error)
  }
})

