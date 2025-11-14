/**
 * POST /api/claude/environments
 * 创建 Claude 环境
 */
export default defineEventHandler(async (event) => {
  try {
    const payload = await readBody(event)
    const record = await createClaudeEnvironment(payload)
    return record
  } catch (error) {
    return handleApiError(error)
  }
})
