/**
 * 聊天区紧凑显示（浏览器半边）。
 *
 * 一块样式、两块共用：对齐栏与收尾检测走**同一条**判定与同一套 CSS——
 * 命中就打 data-zz="quiet"，样式由这一个选择器生效。
 * 正文、代码块、输入框都不在范围内（只挑 blockquote，且排除代码块里的引用）。
 *
 * 判定靠块内文本（不依赖打包后的类名，也不用 CSS 的文本匹配）：
 *   · 对齐栏：块首是「本层目标：」（根上的回帖）或「根本目标：」（有上一层时），
 *     以及旧写法「我按哪个目标改：」「服务上层：」开头
 *   · 块内含「收尾检测」「本轮五项」「待确认：」等 → 收尾检测
 *
 * ⚠️ 只补标、不摘标。摘标是「一会儿对、一会儿又变回去」的根源：
 *    另一个还在跑的旧实例、或一次重渲染把标记拿掉，要等下一轮扫描才补回来，
 *    中间那段就是错的样式，看起来就像来回跳。
 *    宁可多标一个（只是小一号，不影响读），也不让已经对的块掉回原样。
 *
 * 打包：esbuild 打包
 */

const ATTR = 'data-zz'
const MARK = 'quiet'
const STYLE_ID = 'dsh-chat-density-style'
const GLOBAL_KEY = '__dshChatDensity'
const VERSION = '6'

const ALIGN_PREFIXES = ['根本目标：', '本层目标：', '我按哪个目标改：', '服务上层：']
/* 旧写法曾以层号起头（第一层）做完你能……：现在对齐栏不写层号，正则留着兜旧回帖。 */
const ALIGN_HEAD = /^（第[0-9〇一二三四五六七八九十百]+层）/
const TAIL_KEYS = ['收尾检测', '本轮五项', '待确认：', '画像无更新', '可归纳项：']

/* 唯一一套样式：两块完全相同 */
const CSS = `
blockquote[${ATTR}="${MARK}"] {
  font-size: 12.5px !important;
  line-height: 1.32 !important;
  color: var(--dsw-alias-label-secondary) !important;
  padding: 3px 0 3px 8px !important;
  margin: 22px 0 !important;
  border-left-width: 2px !important;
}
blockquote[${ATTR}="${MARK}"] p { margin: 0 !important; }
blockquote[${ATTR}="${MARK}"] li { margin: 0 !important; }
blockquote[${ATTR}="${MARK}"] code { font-size: 0.94em !important; }
`

/** 样式版本变了就换掉旧 style 元素（重载后不必刷新整页也能拿到新样式）。 */
function ensureStyle() {
  const existing = document.getElementById(STYLE_ID)
  if (existing && existing.getAttribute('data-version') === VERSION) return
  if (existing) existing.remove()
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.setAttribute('data-version', VERSION)
  style.textContent = CSS
  document.head.appendChild(style)
}

/** 是不是这两块之一（两块同等对待，不区分样式）。 */
function isQuietBlock(text) {
  const head = text.trimStart().slice(0, 24)
  if (ALIGN_HEAD.test(head)) return true
  if (ALIGN_PREFIXES.some((prefix) => head.startsWith(prefix))) return true
  return TAIL_KEYS.some((key) => text.includes(key))
}

/** 只补标、不摘标（见文件头说明）。已经标过的直接跳过。 */
function scan() {
  for (const el of document.querySelectorAll('blockquote')) {
    if (el.getAttribute(ATTR) === MARK) continue
    if (el.closest('pre, code')) continue
    const text = (el.textContent ?? '').slice(0, 600)
    if (isQuietBlock(text)) el.setAttribute(ATTR, MARK)
  }
}

/* 依赖声明：与能正常加载的设置页插件同款。
   空的 inject 会让宿主判定该条目「未激活」→ web boot 报 1 entry did not activate，
   所以这里用 'slots'（客户端框架的内置服务，照设置页插件共用的写法）。 */
export const inject = ['slots']

/** 入口：注入样式，盯着 DOM 变更随时补标（流式追加、重渲染都算）。 */
export function apply() {
  /* 同一个页面里被加载第二次时，先把上一实例停手：
     两个扫描器各自 800ms 一轮，一个补一个摘，就会看到样式来回跳。 */
  const prev = window[GLOBAL_KEY]
  if (prev && typeof prev.stop === 'function') {
    try { prev.stop() } catch { /* 旧实例已失效，忽略 */ }
  }

  const boot = () => {
    ensureStyle()
    scan()

    let raf = 0
    const schedule = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => { raf = 0; scan() })
    }

    /* attributes 一起盯：别人（旧实例）把标记摘掉时，下一帧就补回去。 */
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [ATTR],
    })

    /* 轮询兜底：极小概率漏掉的节点，800ms 内补上。 */
    const timer = window.setInterval(scan, 800)

    window[GLOBAL_KEY] = {
      version: VERSION,
      stop() {
        observer.disconnect()
        window.clearInterval(timer)
        if (raf) window.cancelAnimationFrame(raf)
      },
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true })
  } else {
    boot()
  }
}
