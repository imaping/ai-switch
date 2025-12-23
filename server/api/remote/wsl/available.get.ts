/**
 * 检查 WSL 是否可用
 * GET /api/remote/wsl/available
 */
export default defineEventHandler(async () => {
  const { checkWslAvailable } = await import('../../../utils/remote/wsl')
  try {
    const available = await checkWslAvailable()

    return {
      success: true,
      data: {
        available
      }
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    }
  }
})
