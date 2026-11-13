/**
 * 画像 markdown 的解析与回写（纯函数，无 IO）。
 *
 * 画像文件是一份人写的 markdown：`# 标题`、`一、节名`、`1. 条目`、以及括号附注这类说明段。
 * 面板只在这一层做「段落模型 → 编辑 → 回写整篇」，文件仍是唯一真身。
 *
 * 模型：段落＝两段空白（连续 2 个以上换行）之间的原文；每段记住它后面的分隔串。
 * 回写 = 逐段原样拼回，因此「打开不编辑」逐字节等于原文件（含末尾换行、分隔空行），
 * 编辑一段只动那一段；只有增删移这类结构操作才把分隔统一成空行。
 *
 * 段落种类：
 *   title   第一段 `# ` 开头的标题
 *   section `一、…`（中文数字＋顿号）开头的节标题
 *   item    `1. …`／`1.…` 开头的条目（`num`、`gap` 分开存，回写按原样式）
 *   text    其余段落（前言、括号附注等）
 */

const TITLE_RE = /^#\s+(.*)$/
const SECTION_RE = /^([一二三四五六七八九十百]+)、\s*([\s\S]*)$/
const ITEM_RE = /^(\d+)\.(\s*)([\s\S]*)$/

const SECTION_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

/** 段落分类：返回 { kind, num?, gap?, heading?, body? }。 */
export function classify(text) {
  const title = TITLE_RE.exec(text)
  if (title) return { kind: 'title', body: title[1] }
  const section = SECTION_RE.exec(text)
  if (section) return { kind: 'section', heading: section[1], body: section[2].trim() }
  const item = ITEM_RE.exec(text)
  if (item) return { kind: 'item', num: item[1], gap: item[2], body: item[3] }
  return { kind: 'text', body: text }
}

/**
 * 把整篇文本切成段落。
 * 返回 { leading, paras: [{ text, after, kind, ... }], tail }。
 * 不变式：serialize(parse(src)) === src。
 */
export function parse(text) {
  const src = String(text ?? '')
  if (src === '') return { leading: '', paras: [], tail: '' }
  const lines = src.split('\n')
  let lead = 0
  while (lead < lines.length && lines[lead] === '') lead += 1
  if (lead === lines.length) return { leading: src, paras: [], tail: '' }

  // 块：空行或「标题／节／条目」行开头都起新块；块内其余行是续行。
  const blocks = []
  let cur = null
  let blanks = 0
  for (let i = lead; i < lines.length; i += 1) {
    const line = lines[i]
    if (line === '') { if (cur) blanks += 1; continue }
    const startsBlock = TITLE_RE.test(line) || SECTION_RE.test(line) || ITEM_RE.test(line)
    if (cur === null) {
      cur = { lines: [line], blanks: 0 }
    } else if (startsBlock || blanks > 0) {
      cur.blanks = blanks
      blocks.push(cur)
      cur = { lines: [line], blanks: 0 }
    } else {
      cur.lines.push(line)
    }
    blanks = 0
  }
  if (cur) { cur.blanks = blanks; blocks.push(cur) }

  const paras = []
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    const isLast = i === blocks.length - 1
    const raw = block.lines.join('\n')
    paras.push({ text: raw, after: isLast ? '' : '\n'.repeat(block.blanks + 1), ...classify(raw) })
  }
  // 文末换行数＝最后一块后面的空行数
  const tail = '\n'.repeat(blocks[blocks.length - 1].blanks)
  // 记下原文档风格：单换行分隔（紧凑）还是空行分隔
  const seps = paras.map((p) => p.after).filter((s) => s !== '')
  paras.compact = seps.length > 0 && seps.filter((s) => s === '\n').length > seps.length / 2
  return { leading: '\n'.repeat(lead), paras, tail }
}

/** 回写：逐段原样拼回。 */
export function serialize(doc) {
  const paras = doc.paras || []
  let out = doc.leading || ''
  for (const para of paras) out += para.text + (para.after || '')
  out += doc.tail || ''
  return out
}

/** 段间默认分隔（沿用原文档风格：紧凑用单换行，否则空行）。 */
function gap(paras) {
  return paras.compact ? '\n' : '\n\n'
}

/** 摘出一段并缝好邻居（返回被摘出的段）。 */
function detach(paras, index) {
  const para = paras[index]
  const prev = paras[index - 1]
  if (prev) prev.after = index === paras.length - 1 ? '' : (para.after || gap(paras))
  paras.splice(index, 1)
  return para
}

/** 把 para 插到 at 之后（at = -1 表示最前）。 */
function insertAfter(paras, at, para) {
  if (at < 0) {
    if (paras.length > 0 && !paras[0].after) paras[0].after = gap(paras)
    if (paras.length > 0) para.after = para.after || gap(paras)
    paras.unshift(para)
    return 0
  }
  const prev = paras[at]
  const wasLast = at === paras.length - 1
  const sep = wasLast ? gap(paras) : (prev.after || gap(paras))
  prev.after = sep
  para.after = wasLast ? '' : sep
  paras.splice(at + 1, 0, para)
  return at + 1
}

/** 标题段的下标（没有就 -1）。 */
export function titleIndex(paras) {
  return paras.findIndex((p) => p.kind === 'title')
}

/** 文档标题文本。 */
export function docTitle(paras) {
  const i = titleIndex(paras)
  return i >= 0 ? paras[i].body : ''
}

/** 改标题（只动标题段）。 */
export function setTitle(paras, title) {
  const i = titleIndex(paras)
  const next = title.trim()
  if (i >= 0) {
    paras[i].text = `# ${next}`
    paras[i].body = next
  } else {
    paras.unshift({ text: `# ${next}`, after: paras.length ? '\n\n' : '', kind: 'title', body: next })
  }
  return paras
}

/** 节：每个 `一、…` 到下一个节标题之前算一节；节外的段落不算。 */
export function sections(paras) {
  const out = []
  let current = null
  paras.forEach((para, index) => {
    if (para.kind === 'section') {
      current = { index, heading: para.heading, title: para.body, items: [], texts: [], end: index }
      out.push(current)
      return
    }
    if (!current) return
    current.end = index
    if (para.kind === 'item') current.items.push({ index, num: para.num, gap: para.gap, body: para.body })
    else if (para.kind === 'text') current.texts.push({ index, body: para.body })
  })
  return out
}

/** 条目数（全篇）。 */
export function countEntries(paras) {
  return paras.reduce((n, p) => (p.kind === 'item' ? n + 1 : n), 0)
}

/** 第一节之前的说明段（前言）：返回 { index, body }，供逐段编辑。 */
export function preamble(paras) {
  const first = paras.findIndex((p) => p.kind === 'section')
  const end = first >= 0 ? first : paras.length
  const out = []
  for (let i = 0; i < end; i += 1) {
    if (paras[i].kind === 'text') out.push({ index: i, body: paras[i].body })
  }
  return out
}

/** 改条目正文（保留原编号与编号后的间隔样式）。 */
export function setItemBody(para, body) {
  const gap = para.gap === undefined ? ' ' : para.gap
  para.body = body
  para.text = `${para.num}.${gap}${body}`
  return para
}

/** 改说明段正文。 */
export function setTextBody(para, body) {
  para.body = body
  para.text = body
  return para
}

/** 改节名（保留中文数字与顿号）。 */
export function setSectionTitle(para, title) {
  const next = title.trim()
  para.body = next
  para.heading = para.heading || '一'
  para.text = `${para.heading}、${next}`
  return para
}

/** 节内重排编号（1 起），沿用该节第一条的间隔样式。 */
export function renumberSection(paras, sectionIndex) {
  const sec = sections(paras).find((s) => s.index === sectionIndex)
  if (!sec) return paras
  const gap = sec.items.length > 0 ? sec.items[0].gap : ' '
  sec.items.forEach((entry, i) => {
    const para = paras[entry.index]
    para.num = String(i + 1)
    para.gap = gap
    para.text = `${para.num}.${gap}${para.body}`
  })
  return paras
}

/** 加一条：atStart 时插在节标题后（节首），否则插在节末。 */
export function addItem(paras, sectionIndex, body, gapStyle = ' ', atStart = false) {
  const sec = sections(paras).find((s) => s.index === sectionIndex)
  if (!sec) return -1
  const at = atStart ? sec.index : (sec.items.length > 0 ? sec.items[sec.items.length - 1].index : sec.end)
  const para = { text: `1.${gapStyle}${body}`, after: '', kind: 'item', num: '1', gap: gapStyle, body }
  const index = insertAfter(paras, at, para)
  renumberSection(paras, sectionIndex)
  return index
}

/** 删一条（节内重排编号）。 */
export function removeItem(paras, index) {
  const para = paras[index]
  if (!para || para.kind !== 'item') return paras
  const owner = sections(paras).find((s) => s.items.some((e) => e.index === index))
  detach(paras, index)
  if (owner) renumberSection(paras, owner.index)
  return paras
}

/** 删一段说明文字（不动编号）。 */
export function removeParagraph(paras, index) {
  const para = paras[index]
  if (!para || para.kind !== 'text') return paras
  detach(paras, index)
  return paras
}

/** 节内上移／下移一条；返回新下标（移不动返回原下标）。 */
export function moveItem(paras, index, delta) {
  const owner = sections(paras).find((s) => s.items.some((e) => e.index === index))
  if (!owner) return index
  const pos = owner.items.findIndex((e) => e.index === index)
  const target = pos + delta
  if (target < 0 || target >= owner.items.length) return index
  const other = owner.items[target].index
  const a = paras[index]
  const b = paras[other]
  for (const key of ['text', 'kind', 'num', 'gap', 'body']) {
    const tmp = a[key]
    a[key] = b[key]
    b[key] = tmp
  }
  renumberSection(paras, owner.index)
  return other
}

/** 换节：把条目挪到目标节末，两节都重排。 */
export function moveItemToSection(paras, index, targetSectionIndex) {
  const owner = sections(paras).find((s) => s.items.some((e) => e.index === index))
  const targetHeading = paras[targetSectionIndex]
  if (!owner || owner.index === targetSectionIndex || !targetHeading) return -1
  const ownerHeading = paras[owner.index]
  const para = detach(paras, index)
  const target = sections(paras).find((s) => paras[s.index] === targetHeading)
  if (!target) return -1
  const at = target.items.length > 0 ? target.items[target.items.length - 1].index : target.end
  const moved = insertAfter(paras, at, para)
  const ownerNow = sections(paras).find((s) => paras[s.index] === ownerHeading)
  if (ownerNow) renumberSection(paras, ownerNow.index)
  renumberSection(paras, target.index)
  return moved
}

/** 文末新开一节。 */
export function addSection(paras, title) {
  const used = paras.filter((p) => p.kind === 'section').map((p) => p.heading)
  const heading = SECTION_NUMERALS.find((n) => used.indexOf(n) === -1) || String(used.length + 1)
  const next = title.trim()
  const last = paras[paras.length - 1]
  if (last) last.after = gap(paras)
  paras.push({ text: `${heading}、${next}`, after: '', kind: 'section', heading, body: next })
  return paras
}

/** 删一节（连带节内条目与说明段）。 */
export function removeSection(paras, sectionIndex) {
  const sec = sections(paras).find((s) => s.index === sectionIndex)
  if (!sec) return paras
  const prev = paras[sec.index - 1]
  const lastAfter = paras[sec.end].after
  const atEnd = sec.end === paras.length - 1
  paras.splice(sec.index, sec.end - sec.index + 1)
  if (prev) prev.after = atEnd ? '' : (lastAfter || gap(paras))
  return paras
}

/** 统计：字数、条目数、节数。 */
export function stats(paras) {
  const chars = paras.reduce((n, p) => n + Array.from(p.text).length, 0)
  return { chars, entries: countEntries(paras), sections: sections(paras).length }
}
