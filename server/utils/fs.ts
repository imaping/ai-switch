import { promises as fs } from 'fs'
import path from 'path'

/**
 * 确保目录存在
 */
export async function ensureDirExists(targetPath: string) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
}

/**
 * 读取 JSON 文件
 */
export async function readJsonFile<T>(targetPath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(targetPath, 'utf-8')
    return JSON.parse(content) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback
    }
    throw error
  }
}

/**
 * 写入 JSON 文件
 */
export async function writeJsonFile(
  targetPath: string,
  data: unknown,
  spacing = 2
) {
  await ensureDirExists(targetPath)
  await fs.writeFile(targetPath, JSON.stringify(data, null, spacing), 'utf-8')
}

/**
 * 删除文件
 */
export async function deleteFile(targetPath: string) {
  try {
    await fs.unlink(targetPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}

/**
 * 读取文本文件
 */
export async function readTextFile(targetPath: string): Promise<string> {
  return await fs.readFile(targetPath, 'utf-8')
}

/**
 * 写入文本文件
 */
export async function writeTextFile(targetPath: string, content: string) {
  await ensureDirExists(targetPath)
  await fs.writeFile(targetPath, content, 'utf-8')
}

/**
 * 检查文件是否存在
 */
export async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}
