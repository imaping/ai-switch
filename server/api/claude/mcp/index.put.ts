/**
 * PUT /api/claude/mcp
 * 创建 Claude MCP 服务
 */
export default defineEventHandler(async (event) => {
  try {
    const payload = await readBody(event)
    const record = await upsertClaudeMcp(payload)
    return record
  } catch (error) {
    return handleApiError(error)
  }
})

