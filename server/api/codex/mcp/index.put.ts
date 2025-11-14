/**
 * PUT /api/codex/mcp
 * 创建 Codex MCP 服务
 */
export default defineEventHandler(async (event) => {
  try {
    const payload = await readBody(event)
    const record = await upsertCodexMcp(payload)
    return record
  } catch (error) {
    return handleApiError(error)
  }
})

