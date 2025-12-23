/**
 * 创建 WSL 环境
 * POST /api/remote/wsl/environments
 */
export default defineEventHandler(async (event) => {
  const { createWslEnvironment } = await import('../../../utils/remote/service')
  try {
    const body = await readBody(event)

    if (!body.distroName) {
      return {
        success: false,
        error: 'WSL 分发版名称必填'
      }
    }

    const record = await createWslEnvironment(body.distroName, body.title)

    return {
      success: true,
      data: record
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    }
  }
})
