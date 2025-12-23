/**
 * 发现所有 WSL 分发版
 * GET /api/remote/wsl/discover
 */
export default defineEventHandler(async () => {
  const { checkWslAvailable, listWslDistros } = await import('../../../utils/remote/service')
  try {
    // 检查 WSL 是否可用
    const available = await checkWslAvailable()

    if (!available) {
      return {
        success: false,
        error: 'WSL 未安装或不可用'
      }
    }

    // 发现所有分发版
    const distros = await listWslDistros()

    return {
      success: true,
      data: {
        available: true,
        distros
      }
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    }
  }
})
