/**
 * dsh-evolve-basic-terms —— 进化模式基础词条（合包宿主半边）
 *
 * 订阅字典（dsh-term-dict）建好通用层之后，把本包 assets/basic-terms.md 里字典还没有的词条补进去：
 * 只补缺失，不覆盖、不删用户已有条目；写入前留一份 general.md.bak。
 * 通用层还不存在时不动——首建归 dsh-term-dict，它只在那时复制自己的默认模板。
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 本模块名（合包内只是一段）。 */
export const name = 'dsh-evolve-basic-terms'

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
/** 字典通用层：与 dsh-term-dict 同一个路径。 */
export const GENERAL_FILE = join(DSH_HOME, 'evolve', 'dict', 'general.md')
/** 本包自带的基础词条资产。 */
export const BASIC_TERMS_FILE = fileURLToPath(new URL('../assets/basic-terms.md', import.meta.url))

/**
 * 按二级标题切词条。
 * 标题形如 `## 词条名（别名：另一叫法）`；key 取括号前的词条名，用来与已有字典比对。
 * @param {string} text 词条文件正文
 * @returns {{ key: string, text: string }[]}
 */
export function splitEntries(text) {
  const entries = []
  let current = null
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = /^##\s+(.+?)\s*$/.exec(line)
    if (match) {
      const key = match[1].split('（')[0].trim()
      current = { key, text: line }
      entries.push(current)
      continue
    }
    if (current) current.text += '\n' + line
  }
  return entries
}

/**
 * 把基础词条里缺失的那些补进通用层。
 * 三种情况不写：通用层还没建、没有资产文件、一条都不缺。返回补了几条。
 * @returns {{ added: number, reason?: string }}
 */
export function mergeBasicTerms() {
  if (!existsSync(GENERAL_FILE)) return { added: 0, reason: '通用层还没建' }
  if (!existsSync(BASIC_TERMS_FILE)) return { added: 0, reason: '没有基础词条资产' }
  const current = readFileSync(GENERAL_FILE, 'utf8')
  const have = new Set(splitEntries(current).map((entry) => entry.key))
  const missing = splitEntries(readFileSync(BASIC_TERMS_FILE, 'utf8'))
    .filter((entry) => !have.has(entry.key))
  if (missing.length === 0) return { added: 0 }
  copyFileSync(GENERAL_FILE, GENERAL_FILE + '.bak')
  const body = current.replace(/\s*$/, '')
    + '\n\n'
    + missing.map((entry) => entry.text.replace(/\s*$/, '')).join('\n\n')
    + '\n'
  writeFileSync(GENERAL_FILE, body, 'utf8')
  return { added: missing.length }
}

/** 挂载：每次启动补一次（幂等，已有的不动）。 */
export function apply() {
  try {
    const result = mergeBasicTerms()
    if (result.added > 0) console.log(`[dsh-evolve-preset] 基础词条：补进 ${result.added} 条`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[dsh-evolve-preset] basic-terms 未生效：${message}`)
  }
}
