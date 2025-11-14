/**
 * useBalance composable
 * 提供余额查询相关的工具函数和状态管理
 */

export interface BalanceQueryState {
  loading: boolean
  error?: string
  lastUpdated?: string
}

export const useBalance = () => {
  // 格式化余额显示
  const formatBalance = (balance?: number): string => {
    if (balance === undefined || balance === null) {
      return '--'
    }
    return balance.toFixed(2)
  }

  // 格式化时间显示
  const formatTimestamp = (timestamp?: string): string => {
    if (!timestamp) return '--'
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now.getTime() - date.getTime()

      // 小于 1 分钟
      if (diff < 60000) {
        return '刚刚'
      }

      // 小于 1 小时
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000)
        return `${minutes} 分钟前`
      }

      // 小于 24 小时
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000)
        return `${hours} 小时前`
      }

      // 格式化为日期时间
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (err) {
      return timestamp
    }
  }

  // 判断余额是否需要更新
  const needsUpdate = (lastUpdated?: string, thresholdMinutes = 5): boolean => {
    if (!lastUpdated) return true
    try {
      const date = new Date(lastUpdated)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      return diff > thresholdMinutes * 60000
    } catch (err) {
      return true
    }
  }

  // 验证余额查询配置
  const validateBalanceQuery = (config: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!config) {
      errors.push('余额查询配置不能为空')
      return { valid: false, errors }
    }

    if (!config.url || typeof config.url !== 'string') {
      errors.push('API URL 不能为空')
    }

    if (config.method && !['GET', 'POST'].includes(config.method)) {
      errors.push('HTTP 方法必须是 GET 或 POST')
    }

    if (!config.extractPath || typeof config.extractPath !== 'string') {
      errors.push('数据提取路径不能为空')
    }

    // 验证 headers 格式
    if (config.headers) {
      if (typeof config.headers !== 'object') {
        errors.push('请求头必须是对象格式')
      }
    }

    // 验证 formula 格式
    if (config.formula) {
      if (typeof config.formula !== 'string') {
        errors.push('计算公式必须是字符串')
      } else if (!config.formula.includes('value')) {
        errors.push('计算公式必须包含 "value" 变量')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // 测试 JSON 路径提取
  const testJsonPath = (data: any, path: string): { success: boolean; value?: any; error?: string } => {
    try {
      const segments = path.split('.').filter(Boolean)
      let current = data

      for (const segment of segments) {
        if (current === null || current === undefined) {
          return {
            success: false,
            error: `路径 "${path}" 在中间断开了`,
          }
        }

        // 处理数组索引 e.g., items[0]
        const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/)
        if (arrayMatch) {
          const [, key, index] = arrayMatch
          current = current[key]
          if (!Array.isArray(current)) {
            return {
              success: false,
              error: `"${key}" 不是数组`,
            }
          }
          current = current[Number.parseInt(index, 10)]
        } else {
          current = current[segment]
        }
      }

      return {
        success: true,
        value: current,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || '提取失败',
      }
    }
  }

  // 测试计算公式
  const testFormula = (value: number, formula: string): { success: boolean; result?: number; error?: string } => {
    try {
      // 创建一个安全的计算环境
      const func = new Function('value', `return ${formula}`)
      const result = func(value)

      if (typeof result !== 'number' || Number.isNaN(result)) {
        return {
          success: false,
          error: '公式计算结果不是有效数字',
        }
      }

      return {
        success: true,
        result,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || '公式执行失败',
      }
    }
  }

  return {
    // 工具函数
    formatBalance,
    formatTimestamp,
    needsUpdate,
    validateBalanceQuery,
    testJsonPath,
    testFormula,
  }
}
