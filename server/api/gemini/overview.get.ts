/**
 * GET /api/gemini/overview
 * 获取 Gemini 环境概览
 */
export default defineEventHandler(async () => {
  try {
    return await getGeminiOverview()
  } catch (error) {
    return handleApiError(error)
  }
})

