/**
 * 渲染层剥块（设置页开关「对齐栏与收尾检测的渲染」关掉时用）。
 *
 * 开关关掉时，模型仍按模式正文写对齐栏与收尾检测，但这两块不进回复——在 `llm/stream`
 * 这一层把文本剥掉：客户端看到的、落盘进会话档的（assistant/chunk 与 block-end 的内容）
 * 都只剩正文。开关执行点在渲染层，不靠模型自觉。
 *
 * 只认块头，不认内容：
 *   · 开头：`> **本层目标**：…` 起的引用块，连它后面的空行与 `---` 一起丢掉；
 *   · 末尾：`> **收尾检测**` 起的引用块，连它前面的 `---` 一起丢掉。
 * 其余文本原样放行；reasoning / tool-call / usage / finish 等 chunk 不动。
 */

const BAR_HEAD = /^\s*>\s*\*\*本层目标\*\*/
const CLOSE_HEAD = /^\s*>\s*\*\*收尾检测\*\*/
const SEPARATOR = /^\s*---\s*$/
const BLANK = /^\s*$/

/**
 * 逐行过滤器：一段一段吃文本，返回该发出去的部分。
 * 一次模型调用一个实例（lead 只在这次调用的第一块文本上判）。
 */
export class BarFilter {
  constructor() {
    /** lead（开头未定）→ postbar（刚丢掉对齐栏，正在扫尾随空行/分隔线）→ body → drop（正在丢收尾块） */
    this.phase = 'lead'
    this.line = ''
    this.held = ''
    this.blank = ''
    this.inputs = new Map()
    this.outputs = new Map()
  }

  inputOf(index) { return this.inputs.get(index) || '' }

  outputOf(index) { return this.outputs.get(index) || '' }

  /** 吃一段文本，返回其中可以立刻发出去的部分（只含完整行）。 */
  push(text, index) {
    if (typeof text !== 'string' || text === '') return ''
    this.inputs.set(index, (this.inputs.get(index) || '') + text)
    this.line += text
    let out = ''
    for (;;) {
      const nl = this.line.indexOf('\n')
      if (nl < 0) break
      const line = this.line.slice(0, nl + 1)
      this.line = this.line.slice(nl + 1)
      out += this.consume(line)
    }
    if (out) this.outputs.set(index, (this.outputs.get(index) || '') + out)
    return out
  }

  /** 文本块结束：flush 最后一行与扣住的分隔线，返回还要补发的文本。 */
  endBlock(index) {
    let out = ''
    if (this.line) {
      const line = this.line
      this.line = ''
      out += this.consume(line)
    }
    if (this.phase !== 'drop' && this.held) {
      out += this.held
      this.held = ''
    }
    if (this.phase !== 'drop' && this.blank) {
      out += this.blank
      this.blank = ''
    }
    if (out) this.outputs.set(index, (this.outputs.get(index) || '') + out)
    return out
  }

  consume(line) {
    if (this.phase === 'drop') return ''
    if (this.phase === 'lead') {
      if (BLANK.test(line)) return ''
      if (BAR_HEAD.test(line)) { this.phase = 'postbar'; return '' }
      this.phase = 'body'
      return this.bodyLine(line)
    }
    if (this.phase === 'postbar') {
      // 对齐栏是多行引用块：块头之后的 `>` 行都还算栏内，直到出现正文行。
      if (/^\s*>/.test(line)) return ''
      if (BLANK.test(line) || SEPARATOR.test(line)) return ''
      this.phase = 'body'
      return this.bodyLine(line)
    }
    return this.bodyLine(line)
  }

  bodyLine(line) {
    if (CLOSE_HEAD.test(line)) {
      // 收尾块整个丢掉，连它前面扣住的空行与分隔线一起。
      this.phase = 'drop'
      this.held = ''
      this.blank = ''
      return ''
    }
    if (this.held) {
      if (BLANK.test(line)) { this.held += line; return '' }
      const held = this.held
      this.held = ''
      return held + line
    }
    if (SEPARATOR.test(line)) {
      this.held = this.blank + line
      this.blank = ''
      return ''
    }
    if (BLANK.test(line)) {
      this.blank += line
      return ''
    }
    const blank = this.blank
    this.blank = ''
    return blank + line
  }
}

/**
 * 包住一条模型输出流：text-delta 与 text 类型 block-end 的内容换成剥完的文本，
 * 其余 chunk 原样放行。block-end 是组装消息的权威内容，必须一起改。
 * @param {AsyncIterable<any>} source 模型原始输出流
 */
export async function* filterBarStream(source) {
  const filter = new BarFilter()
  for await (const chunk of source) {
    if (!chunk || typeof chunk !== 'object') { yield chunk; continue }
    if (chunk.type === 'text-delta') {
      const out = filter.push(chunk.text, chunk.index)
      if (out) yield { ...chunk, text: out }
      continue
    }
    if (chunk.type === 'block-end' && chunk.block && chunk.block.type === 'text') {
      const index = chunk.index
      const blockText = typeof chunk.block.text === 'string' ? chunk.block.text : ''
      const seen = filter.inputOf(index)
      // 有的适配器只给 block-end（没有增量），或给的全文比增量长：把没吃过的部分补过滤，别吞正文。
      if (blockText && blockText !== seen) {
        const rest = seen
          ? (blockText.startsWith(seen) ? blockText.slice(seen.length) : '')
          : blockText
        if (rest) {
          const out = filter.push(rest, index)
          if (out) yield { type: 'text-delta', index, text: out }
        }
      }
      const tail = filter.endBlock(index)
      if (tail) yield { type: 'text-delta', index, text: tail }
      yield { ...chunk, block: { ...chunk.block, text: filter.outputOf(index) } }
      continue
    }
    yield chunk
  }
}
