/**
 * GET /api/:scope/codex/environments/:id/balance
 */
export default defineEventHandler(async (event) => {
  const scope = getRouterParam(event, 'scope') || 'local'
  const id = getRouterParam(event, 'id')

  try {
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少环境 ID' })
    }

    const env =
      scope === 'local'
        ? await getCodexEnvironment(id)
        : await getRemoteCodexEnvironment(scope, id)

    if (!env.balanceUrl) {
      throw createError({ statusCode: 400, message: '未配置余额查询' })
    }

    const result = await fetchBalance({
      url: env.balanceUrl,
      request: env.balanceRequest,
      jsonPath: env.balanceJsonPath,
      formula: env.balanceFormula,
      apiKey: env.apiKey,
    })

    return result
  } catch (error) {
    return handleApiError(error)
  }
})

