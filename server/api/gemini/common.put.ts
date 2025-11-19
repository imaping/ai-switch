/**
 * PUT /api/gemini/common
 * 保存 Gemini 通用配置（.env 片段）
 */
export default defineEventHandler(async (event) => {
  try {
    const { content } = await readBody(event)
    if (typeof content !== 'string') {
      throw createError({ statusCode: 400, message: '配置必须是字符串' })
    }

    const record = await saveGeminiGeneralConfig(content)
    return record
  } catch (error) {
    return handleApiError(error)
  }
})

