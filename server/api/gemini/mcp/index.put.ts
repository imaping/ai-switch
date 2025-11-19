/**
 * PUT /api/gemini/mcp
 * 创建 Gemini MCP 服务
 */
export default defineEventHandler(async (event) => {
  try {
    const payload = await readBody(event)
    const record = await upsertGeminiMcp(payload)
    return record
  } catch (error) {
    return handleApiError(error)
  }
})

