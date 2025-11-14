/**
 * PUT /api/claude/common
 * 保存 Claude 通用配置
 */
export default defineEventHandler(async (event) => {
  try {
    const { content } = await readBody(event)

    if (typeof content !== 'object') {
      throw createError({ statusCode: 400, message: '配置必须是 JSON 对象' })
    }

    const record = await saveClaudeGeneralConfig(content)
    return record
  } catch (error) {
    return handleApiError(error)
  }
})
