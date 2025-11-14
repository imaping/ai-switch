/**
 * GET /api/claude/overview
 * 获取 Claude 环境概览
 */
export default defineEventHandler(async (event) => {
  try {
    const overview = await getClaudeOverview()
    return overview
  } catch (error) {
    return handleApiError(error)
  }
})
