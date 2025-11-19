/**
 * POST /api/gemini/environments
 * 创建 Gemini 环境
 */
export default defineEventHandler(async (event) => {
  try {
    const payload = await readBody(event)
    const record = await createGeminiEnvironment(payload)
    return record
  } catch (error) {
    return handleApiError(error)
  }
})

