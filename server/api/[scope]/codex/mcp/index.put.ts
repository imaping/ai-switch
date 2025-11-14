/**
 * PUT /api/:scope/codex/mcp
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'

  try {
    const payload = await readBody(event)
    if (scope === 'local') {
      return await upsertCodexMcp(payload)
    }
    return await upsertRemoteCodexMcp(scope, payload)
  } catch (error) {
    return handleApiError(error)
  }
})

