/**
 * DELETE /api/claude/environments/:id
 * 删除 Claude 环境
 */
export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少环境 ID' })
    }

    await deleteClaudeEnvironment(id)
    return { success: true }
  } catch (error) {
    return handleApiError(error)
  }
})
