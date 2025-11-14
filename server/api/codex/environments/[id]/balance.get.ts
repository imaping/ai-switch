/**
 * GET /api/codex/environments/:id/balance
 * 查询 Codex 环境余额
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少环境 ID' })
    }

    const env = await getCodexEnvironment(id)

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

