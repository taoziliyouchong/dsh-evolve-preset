/**
 * 会话任务树面板（浏览器半边源码）—— GLM 重构版。
 *
 * 右侧栏一块标签页：只画**当前会话**的树——现在做到哪／这活替谁做／旁边还有哪几件。
 *
 * 呈现：根在上、子节点往下分层，父子之间用贝塞尔曲线相连；每个节点是一张真 HTML 卡片
 * （左侧状态色条 + 标题 + 状态·替父），**点卡片展开**详情：目标／基本点／子任务／硬需求／软需求，
 * 各成一小节。全树只有当前在跑的那张卡标「运行中」（品牌色描边、加粗），其余没做完的标「排队中」；
 * 在跑的那条路径用品牌色连线串起来。
 *
 * 与旧版（SVG 手绘文字）的区别：
 *  - 文字是 HTML：自动换行，不再手工估宽截断，中英混排不漂；
 *  - 布局两阶段：先按预估高度摆位，渲染后实测每张卡的真实高度再修正一次（展开收起不叠字）；
 *  - 缩放用 CSS transform（矢量渲染，缩小不糊）；连线单独一层 SVG，只画线。
 *
 * 交互：图上滚轮＝缩放；按住拖动＝平移（左右上下都行）；Shift+滚轮＝横向滚动；点节点＝展开详情。
 *
 * 数据只有一条来源：宿主 dsh-evolve-task-tree 的只读路由 `GET /dsh-evolve-task-tree/api/tree?sessionId=…`，
 * 判读口径（运行中=当前树进行中链的末端，由宿主下发的 runningId 定；其余没做完的算排队中）
 * 与工具/命令同一套，面板不另造一份。
 *
 * 注册三段（官方两段式，另两段在 apply 里）：
 *  1. tab 类型 → ctx.sidebarRightTabs.register(...)：右侧栏「＋」打开的选择列（guide）多一张卡片；
 *  2. body   → sidebar.right.pane.tab（key 等于 TAB_ID 与 TAB_KIND 两个）；
 *  3. 标题   → sidebar.right.pane.tab.title（同样两个 key）。
 * ⚠️ 宿主按 `definition.id ?? tab.kind` 找内容（ui-sidebar-right 的 TabSlot），两个 key 都要挂，
 *    否则类型晚一步注册时界面落到原生兜底「这类内容还没有可用的查看方式」。
 *
 * ⚠️ 客户端 entry 只用已验证的写法：`export const inject = ['slots']` + `ctx.slots.inject/register`；
 *   服务一律 `ctx.get('…')` 探测（直接 ctx.sidebarRightTabs 会把 entry 打成 failed）。
 *   sidebarRightTabs 在本 entry 起来时可能还没进上下文 → 轮询等它到位再注册类型。
 *   DIAG 会把注册进度写进卡片描述，界面不出来时一眼定位。
 *
 * 打包：esbuild（esbuild → 套 window.__ModuleLoader__.load 外壳，id 等于包名）。
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

/** 宿主路由前缀。 */
const ROUTE = 'dsh-evolve-task-tree/api'
/** 本实现在标签系统里的身份，也是 body / title 座位的 key 之一。 */
const TAB_ID = 'dsh-evolve-task-tree/task-tree'
/** 本包占用的 tab kind，openTab 认它，也是内容座位的兜底 key。 */
const TAB_KIND = 'dshTaskTree'
/** 卡片在选择列里的位置：紧贴「文件」之后。 */
const GUIDE_ORDER = 11
/** 样式只注入一次。 */
const STYLE_ID = 'dsh-evolve-task-tree-style'

/** 基本点的序号（与回帖对齐栏同一套）。 */
const MARKS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

/** 布局常量：深度往下走，同层兄弟横向排；重点卡片更宽，其余缩小让位。 */
const NODE_W = 240
/** 重点卡片的宽度（默认＝正在做的那件事，或你点中的那张）。 */
const FOCUS_W = NODE_W
/** 收起态的预估高度（真实高度渲染后实测修正）。 */
const EST_H = 84
const SIB_GAP = 22
const LEVEL_GAP = 58
/** 一个会话挂几棵树时，树与树之间横向留的间距（平级并排、同一条画布上）。 */
const TREE_GAP = 120
/** 画布四周留白的最小值；实际取 max(它, 视口尺寸)，树才能拖到视口任意位置（含完全拖出）。 */
const MARGIN_MIN = 480

/** 卡面状态：全树只有一个「运行中」，其余没做完的一律「排队中」（与宿主 displayStatus 同一口径）。 */
const DISPLAY_LABEL = { running: '运行中', queued: '排队中', done: '已定', obsolete: '已废', dropped: '已否' }
/** 保存时把卡面状态映射回底层 status。 */
const STATUS_OF_DISPLAY = { running: 'active', queued: 'pending', done: 'done', obsolete: 'obsolete' }

function displayKey(node, runningId) {
  if (runningId && node.id === runningId) return 'running'
  if (node.status === 'active' || node.status === 'pending') return 'queued'
  if (node.status === 'done') return 'done'
  if (node.status === 'obsolete') return 'obsolete'
  return 'dropped'
}
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳']

const CSS = `
.ztt-root { display:flex; flex-direction:column; gap:10px; padding:12px 12px 14px; font-size:13px;
  height:100%; min-height:320px; box-sizing:border-box; color:var(--dsw-alias-label-primary); }

/* 头部：标题 / 统计 / 现在做到哪，各归其位 */
.ztt-head { display:flex; flex-direction:column; gap:7px;
  padding-bottom:11px; border-bottom:1px solid var(--dsw-alias-border-l1); }
/* 一个会话挂了几棵树：同一块画布左右并排，每棵树上方一个「第 N 棵」小标 */
.ztt-treelabel { position:absolute; font-size:11.5px; line-height:1.4; letter-spacing:.04em;
  color:var(--dsw-alias-label-secondary); white-space:nowrap; pointer-events:none; user-select:none; }
.ztt-headline { display:flex; align-items:center; gap:8px; }
.ztt-roottitle { flex:1 1 auto; min-width:0; font-size:16px; font-weight:600; line-height:1.4;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ztt-stat { flex:0 0 auto; font-size:11.5px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }

/* 编辑态：像一张小表单，保存即写回本会话 */
.ztt-editfield { display:flex; flex-direction:column; gap:4px; }
.ztt-editlabel { font-size:12.5px; line-height:1.5; color:var(--dsw-alias-label-secondary); }
.ztt-editarea { width:100%; box-sizing:border-box; resize:vertical; font:inherit; font-size:13px;
  line-height:1.6; padding:7px 9px; border:1px solid var(--dsw-alias-border-l2); border-radius:8px;
  background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); }
.ztt-editarea:focus { outline:none; border-color:var(--dsw-alias-brand-primary); }
.ztt-editactions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.ztt-savebtn { flex:0 0 auto; white-space:nowrap; padding:4px 12px; border:0; border-radius:7px;
  background:var(--dsw-alias-brand-primary); color:#fff; font:inherit; font-size:12.5px;
  font-weight:400; line-height:1.4; cursor:pointer; }
.ztt-savebtn:disabled { opacity:.6; cursor:default; }
.ztt-editactions .ztt-textbtn { font-size:12px; }
.ztt-edithint { flex:1 1 auto; min-width:0; font-size:11px; line-height:1.45;
  color:var(--dsw-alias-label-secondary); }
.ztt-statusrow { display:flex; gap:6px; flex-wrap:wrap; }
.ztt-statusbtn { padding:3px 11px; border:1px solid var(--dsw-alias-border-l2); border-radius:999px;
  background:none; color:var(--dsw-alias-label-secondary); font:inherit; font-size:12.5px; cursor:pointer; }
.ztt-statusbtn-on { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-label-primary);
  background:var(--dsw-alias-bg-layer-2); }
.ztt-cardactions { display:flex; justify-content:flex-end; margin-top:10px; }
/* 编辑态：卡片沿用进入编辑前量到的大小（宽由布局给），表单在卡内滚动——点「编辑」不缩节点、
   旁边的卡也不跟着回排。 */
.ztt-card-editing { display:flex; flex-direction:column; overflow:hidden; }
.ztt-card-editing .ztt-detail { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; }
.ztt-card-editing .ztt-editform { flex:1 1 auto; min-height:0; overflow:auto; padding-right:2px; }

/* 图标按钮：不抢戏，hover 才亮 */
.ztt-iconbtn { flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center;
  width:26px; height:26px; padding:0; border:0; border-radius:7px; background:none;
  color:var(--dsw-alias-label-secondary); cursor:pointer; transition:background .12s, color .12s; }
.ztt-iconbtn:hover { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
.ztt-textbtn { padding:0; border:0; background:none; color:var(--dsw-alias-label-secondary);
  font:inherit; font-size:12px; cursor:pointer; white-space:nowrap; }
.ztt-textbtn:hover { color:var(--dsw-alias-label-primary); }

/* 画布：点阵底纹，像一块真的画板 */
.ztt-graphbox { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; gap:8px; }
.ztt-toolbar { display:flex; align-items:center; gap:8px; }
.ztt-hint { flex:1 1 auto; min-width:0; font-size:11.5px; color:var(--dsw-alias-label-secondary);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ztt-tools { flex:0 0 auto; display:flex; gap:2px; }
.ztt-wrap { position:relative; flex:1 1 auto; min-height:240px; overflow:hidden;
  cursor:grab; user-select:none;
  border:1px solid var(--dsw-alias-border-l1); border-radius:14px;
  background:var(--dsw-alias-bg-layer-1); }
.ztt-wrap:active { cursor:grabbing; }
.ztt-inner { position:absolute; left:0; top:0; transform-origin:0 0; will-change:transform; }
.ztt-edges { position:absolute; left:0; top:0; pointer-events:none; overflow:visible; }
.ztt-edge { fill:none; stroke:var(--dsw-alias-border-l2); stroke-width:2; }
.ztt-edge-on { stroke:var(--dsw-alias-brand-primary); stroke-width:2.6; }
.ztt-edge-derived { fill:none; stroke:var(--dsw-alias-border-l2); stroke-width:1.6; stroke-dasharray:5 4; opacity:.85; }

/* 卡片：重点白底带影，其余浅底降权 */
.ztt-card { position:absolute; box-sizing:border-box; padding:12px 14px 11px 18px;
  border:1px solid var(--dsw-alias-border-l2); border-radius:12px;
  background:var(--dsw-alias-bg-base); cursor:pointer;
  transition:box-shadow .15s ease, border-color .15s ease, background .15s ease; }
.ztt-card:hover { border-color:var(--dsw-alias-border-l2); }
.ztt-card::before { content:''; position:absolute; left:0; top:12px; bottom:12px; width:3px;
  border-radius:0 2px 2px 0; background:var(--dsw-alias-border-l2); }
.ztt-card-running::before { background:var(--dsw-alias-brand-primary); }
.ztt-card-done::before { background:var(--dsw-alias-state-success-primary); opacity:.6; }
/* 排队中：已列出、还没轮到（含待办与暂时没在跑的支）——虚线边框 + 灰竖条，与"已废"（整体降透明）区分开 */
.ztt-card-queued { border-style:dashed; }
.ztt-card-queued::before { background:var(--dsw-alias-border-l2); }
.ztt-card-dropped::before { background:var(--dsw-alias-state-error-primary); }
.ztt-card-obsolete { opacity:.62; background:var(--dsw-alias-bg-layer-2); }
.ztt-card-obsolete::before { background:var(--dsw-alias-border-l2); }
.ztt-card-obsolete .ztt-title { color:var(--dsw-alias-label-secondary); font-weight:600; }
.ztt-card-obsolete .ztt-sub { color:var(--dsw-alias-label-secondary); }
.ztt-card-focus { z-index:2; padding:13px 15px 12px 19px; box-shadow:0 4px 18px rgba(0,0,0,.11); }
.ztt-card-focus::before { width:4px; top:11px; bottom:11px; }
/* 层次单向：画布浅灰 → 所有卡片白 → 详情只靠分隔线；普通卡靠"没有阴影"降权 */
.ztt-card-on { border-color:var(--dsw-alias-brand-primary); }
.ztt-card-open { border-color:var(--dsw-alias-brand-primary); }
.ztt-title { font-size:14px; font-weight:600; line-height:1.55;
  color:var(--dsw-alias-label-primary); overflow-wrap:break-word; overflow:hidden;
  display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; }
.ztt-card-open .ztt-title { display:block; -webkit-line-clamp:unset; }
.ztt-card-focus .ztt-title { font-size:17.5px; }
.ztt-card-focus .ztt-sub { font-size:12.5px; }
.ztt-card-focus .ztt-line { font-size:13.5px; }
/* 未展开的卡：主文字用主色，运行中的再加粗一档，排队中的降一档，已定的再降 */
/* 收起态左右各收 4px：同宽里多显示一点字（展开与编辑态不动） */
.ztt-card-minor { padding-left:14px; padding-right:10px; }
.ztt-card-minor .ztt-title { font-size:14.5px; font-weight:600; color:var(--dsw-alias-label-primary); }
.ztt-card-minor.ztt-card-running .ztt-title { font-weight:700; }
.ztt-card-minor.ztt-card-done .ztt-title { color:var(--dsw-alias-label-secondary); }
.ztt-card-minor.ztt-card-queued .ztt-title { color:var(--dsw-alias-label-secondary); font-weight:600; }
.ztt-sub { display:flex; align-items:center; gap:6px; margin-top:6px; font-size:12px;
  line-height:1.4; color:var(--dsw-alias-label-secondary); }
.ztt-dot { flex:0 0 auto; width:6px; height:6px; border-radius:50%;
  background:var(--dsw-alias-label-secondary); }
.ztt-dot-running { background:var(--dsw-alias-brand-primary); }
.ztt-dot-done { background:var(--dsw-alias-state-success-primary); }
.ztt-dot-queued { background:transparent; box-shadow:inset 0 0 0 1px var(--dsw-alias-label-secondary); }
.ztt-dot-dropped { background:var(--dsw-alias-state-error-primary); }
/* 展开区：浅底内嵌块＋细边框；组标题带小竖条、右边拖细线，一眼分得清 */
.ztt-detail { margin-top:12px; padding-top:11px; border-top:1px solid var(--dsw-alias-border-l1); }
/* 展开后的显式收起入口：点它或点详情正文空白都能缩回去 */
.ztt-collapsebtn { display:block; margin:0 0 8px auto; padding:2px 9px; font-size:12px; line-height:1.7;
  color:var(--dsw-alias-label-secondary); background:transparent; border:1px solid var(--dsw-alias-border-l1);
  border-radius:6px; cursor:pointer; }
.ztt-collapsebtn:hover { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l2); }
.ztt-group { margin-top:14px; }
.ztt-group:first-child { margin-top:0; }
.ztt-grouplabel { display:flex; align-items:center; gap:7px; font-size:13.5px; line-height:1.7;
  font-weight:600; color:var(--dsw-alias-label-primary); margin-bottom:6px; }
.ztt-grouplabel::before { content:''; flex:0 0 auto; width:3px; height:13px; border-radius:1.5px;
  background:var(--dsw-alias-brand-primary); opacity:.6; }
.ztt-grouplabel::after { content:''; flex:1 1 auto; height:1px; background:var(--dsw-alias-border-l1); }
.ztt-line { font-size:13.5px; line-height:1.7; color:var(--dsw-alias-label-primary);
  overflow-wrap:break-word; }
.ztt-linemark { color:var(--dsw-alias-brand-primary); opacity:.75; margin-right:6px; }
.ztt-derived { font-size:12.5px; color:var(--dsw-alias-label-secondary); }
/* 基本点＝编号清单，能数；硬需求加粗最重；软需求次要色，往后退 */
/* 编号行：三块共用同一套排版，只有字重与颜色不同 */
.ztt-numrow { display:flex; gap:8px; align-items:flex-start; }
.ztt-numrow + .ztt-numrow { margin-top:3px; }
.ztt-point { font-weight:700; }
.ztt-pointnum { flex:0 0 auto; min-width:13px; color:var(--dsw-alias-label-secondary);
  font-variant-numeric:tabular-nums; font-weight:700; }
/* 三块的主次：只有基本点用品牌色竖条、最实；硬需求次之；软需求最轻 */
.ztt-group-hard .ztt-grouplabel { color:var(--dsw-alias-label-secondary); }
.ztt-group-hard .ztt-grouplabel::before { background:var(--dsw-alias-border-l2); opacity:1; }
.ztt-group-soft .ztt-grouplabel { color:var(--dsw-alias-label-secondary); }
.ztt-group-soft .ztt-grouplabel::before { background:var(--dsw-alias-border-l2); opacity:1; }
.ztt-hard { font-weight:600; }
.ztt-soft { color:var(--dsw-alias-label-secondary); font-weight:400; }
.ztt-card-minor .ztt-line { font-size:12.5px; }
.ztt-note { margin:0; font-size:12px; line-height:1.65; color:var(--dsw-alias-label-secondary); }
.ztt-error { margin:0; font-size:12px; color:var(--dsw-alias-state-error-primary); word-break:break-all; }
.ztt-foot { display:flex; flex-direction:column; gap:3px; }
.ztt-footitem { font-size:11.5px; line-height:1.5; color:var(--dsw-alias-label-secondary); }
`

/** 注入一次样式。 */
function ensureStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

/** 拼路由（锚 document.baseURI，保留查询串——只取 pathname 会把 ?sessionId 丢掉）。 */
function api(path) {
  const relative = String(path).replace(/^\/+/, '')
  if (typeof document === 'undefined') return '/' + relative
  const url = new URL(relative, document.baseURI)
  return url.pathname + url.search
}

/** 基本点：数组或「｜」「\n」分隔的字符串都收。 */
function pointList(node) {
  const raw = node.points
  if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter((item) => item !== '')
  if (typeof raw !== 'string') return []
  return raw.split(/[｜|\n]/).map((item) => item.trim()).filter((item) => item !== '')
}

/** 硬需求／软需求：按「｜」与换行拆（与 align 写入、回帖对齐栏同一口径；句内「；」不拆）。 */
function itemList(text) {
  return String(text || '')
    .split(/[｜|\n]/)
    .map((item) => item.trim())
    .filter((item) => item !== '')
}

/** 展开态的预估高度（真实高度渲染后实测修正，这里只需量级对）。 */
function estHeight(node, open) {
  if (!open) return EST_H
  const points = pointList(node).length
  const hard = itemList(node.hard).length
  const soft = itemList(node.soft).length
  const groups = [points > 0, hard > 0, soft > 0].filter(Boolean).length
  return EST_H + 18 + (points + hard + soft) * 19 + groups * 20
}

/**
 * 一条父子连线的路径（父下沿中点 → 子上沿中点）。
 * 抽出来是因为几棵树并排时位移了坐标，边要重算一遍。
 */
function edgeD(from, to) {
  const x1 = from.x + from.w / 2
  const y1 = from.y + from.h
  const x2 = to.x + to.w / 2
  const y2 = to.y
  const dy = Math.max(16, (y2 - y1) / 2)
  return 'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + (y1 + dy) + ', ' + x2 + ' ' + (y2 - dy) + ', ' + x2 + ' ' + y2
}

/**
 * 衍生连线：源卡与衍生卡之间一根横线（同一行时就是纯横；错开时走三段折线）。
 * 与父子连线区分：虚线、不参与层级，只标「从哪来」。
 */
function derivedD(a, b) {
  const left = a.x + a.w / 2 <= b.x + b.w / 2 ? a : b
  const right = left === a ? b : a
  const x1 = left.x + left.w + 2
  const x2 = right.x - 2
  const y1 = left.y + left.h / 2
  const y2 = right.y + right.h / 2
  const mx = (x1 + x2) / 2
  if (Math.abs(y2 - y1) < 2) return 'M ' + x1 + ' ' + y1 + ' H ' + x2
  return 'M ' + x1 + ' ' + y1 + ' H ' + mx + ' V ' + y2 + ' H ' + x2
}

/** 每个带 from 的节点连一条虚线到源节点；跨树也连（坐标已在同一画布上）。 */
function derivedEdges(placed) {
  const pos = new Map(placed.map((item) => [item.id, item]))
  const out = []
  for (const item of placed) {
    const fromId = item.node && item.node.from
    if (!fromId) continue
    const src = pos.get(fromId)
    if (!src) continue
    out.push({ key: 'derived-' + item.id, fromId, toId: item.id, d: derivedD(src, item) })
  }
  return out
}

/**
 * 一个会话挂几棵树：同一块画布上左右并排（树与树平级），共用一套平移缩放。
 * 单棵时直接走 buildLayout，坐标与以前完全一致。
 * @returns 同 buildLayout，另加 labels（每棵树的「第 N 棵」标签位）。
 */
function buildLayoutAll(roots, openSet, heights, viewport, focusId) {
  const list = (roots || []).filter(Boolean)
  if (list.length <= 1) {
    const one = buildLayout(list[0], openSet, heights, viewport, focusId)
    return { ...one, labels: [] }
  }
  const marginX = Math.max(MARGIN_MIN, viewport.w || 0)
  const marginY = Math.max(MARGIN_MIN, viewport.h || 0)
  const placed = []
  const labels = []
  let cursor = marginX
  let maxContentH = EST_H
  for (let i = 0; i < list.length; i += 1) {
    const root = list[i]
    const one = buildLayout(root, openSet, heights, { w: 0, h: 0 }, focusId)
    const shiftX = cursor - one.marginX
    const shiftY = marginY - one.marginY
    const moved = one.placed.map((item) => ({ ...item, x: item.x + shiftX, y: item.y + shiftY }))
    placed.push(...moved)
    const rootItem = moved.find((item) => item.id === root.id) || moved[0]
    if (rootItem) labels.push({ id: 'label-' + root.id, x: rootItem.x, y: Math.max(8, rootItem.y - 26), text: '第 ' + (i + 1) + ' 棵' })
    cursor += one.contentW + TREE_GAP
    maxContentH = Math.max(maxContentH, one.contentH)
  }
  const pos = new Map(placed.map((item) => [item.id, item]))
  const edges = []
  const link = (node) => {
    for (const child of node.children || []) {
      const from = pos.get(node.id)
      const to = pos.get(child.id)
      if (from && to) {
        edges.push({
          key: (node.id || '?') + '->' + (child.id || '?'),
          parentId: node.id || '',
          childId: child.id || '',
          d: edgeD(from, to),
        })
      }
      link(child)
    }
  }
  list.forEach(link)
  const contentW = Math.max(cursor - TREE_GAP - marginX, FOCUS_W)
  const contentH = Math.max(maxContentH, EST_H)
  return { placed, edges, derived: derivedEdges(placed), width: contentW + marginX * 2, height: contentH + marginY * 2, contentW, contentH, marginX, marginY, labels }
}

/**
 * 上→下分层布局：叶子按顺序占列，父节点落在首末子节点的中点；每层取该层最高的一张卡定层高。
 * @param root - 树的根节点。
 * @param openSet - 已展开节点的 id 集合。
 * @param heights - 实测高度表（缺项用预估）。
 * @param viewport - 画布可视区尺寸，用来定四周留白（每边至少一个视口那么大）。
 * @returns 摆位结果：{ placed, edges, width, height, contentW, contentH, marginX, marginY }。
 */
function buildLayout(root, openSet, heights, viewport, focusId) {
  const marginX = Math.max(MARGIN_MIN, viewport.w || 0)
  const marginY = Math.max(MARGIN_MIN, viewport.h || 0)
  /** 宽度按节点算：重点卡更宽、其余更窄，布局跟着变才不会重叠。 */
  const widthOf = (node) => (node.id === focusId ? FOCUS_W : NODE_W)
  const heightOf = (node) => heights.get(node.id) ?? estHeight(node, openSet.has(node.id))

  const items = []
  const collect = (node, depth) => {
    items.push({ node, depth })
    for (const child of node.children || []) collect(child, depth + 1)
  }
  collect(root, 0)

  const levels = []
  for (const item of items) {
    if (!levels[item.depth]) levels[item.depth] = []
    levels[item.depth].push(item)
  }
  const levelY = []
  let cursorY = marginY
  for (let depth = 0; depth < levels.length; depth += 1) {
    levelY[depth] = cursorY
    let tallest = 0
    for (const item of levels[depth]) tallest = Math.max(tallest, heightOf(item.node))
    cursorY += tallest + LEVEL_GAP
  }

  const pos = new Map()
  let cursorX = marginX
  const place = (node, depth) => {
    const w = widthOf(node)
    const kids = node.children || []
    let centerX
    if (kids.length === 0) {
      centerX = cursorX + w / 2
      cursorX += w + SIB_GAP
    } else {
      const centers = kids.map((child) => place(child, depth + 1))
      centerX = (centers[0] + centers[centers.length - 1]) / 2
    }
    pos.set(node.id, { x: centerX - w / 2, y: levelY[depth], h: heightOf(node), w })
    return centerX
  }
  place(root, 0)

  const edges = []
  const link = (node) => {
    const from = pos.get(node.id)
    for (const child of node.children || []) {
      const to = pos.get(child.id)
      if (from && to) {
        const x1 = from.x + from.w / 2
        const y1 = from.y + from.h
        const x2 = to.x + to.w / 2
        const y2 = to.y
        const dy = Math.max(16, (y2 - y1) / 2)
        edges.push({
          key: (node.id || '?') + '->' + (child.id || '?'),
          parentId: node.id || '',
          childId: child.id || '',
          d: 'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + (y1 + dy) + ', ' + x2 + ' ' + (y2 - dy) + ', ' + x2 + ' ' + y2,
        })
      }
      link(child)
    }
  }
  link(root)

  const contentW = Math.max(cursorX - SIB_GAP - marginX, FOCUS_W)
  const contentH = Math.max(cursorY - LEVEL_GAP - marginY, estHeight(root, openSet.has(root.id)))
  const width = contentW + marginX * 2
  const height = contentH + marginY * 2
  const placedList = [...pos.entries()].map(([id, p]) => ({ id, node: items.find((i) => i.node.id === id).node, x: p.x, y: p.y, h: p.h, w: p.w }))
  return { placed: placedList, edges, derived: derivedEdges(placedList), width, height, contentW, contentH, marginX, marginY }
}

/** 现在做到哪：进行中、且没有进行中子节点的那几条路径（展平成 id 集合）。 */
function activePathIds(root) {
  const ids = new Set()
  const walk = (node, path) => {
    const kids = (node.children || []).filter((child) => child.status === 'active')
    const next = [...path, node]
    if (node.status === 'active' && kids.length === 0) for (const item of next) ids.add(item.id || '')
    else for (const child of kids) walk(child, next)
  }
  if (root) walk(root, [])
  return ids
}

/** 树的家底：按卡面状态数（头部那行统计：运行中只有一个，其余没做完的算排队中）。 */
function treeStats(root, runningId) {
  const out = { running: 0, queued: 0, done: 0, obsolete: 0, dropped: 0, total: 0 }
  const walk = (node) => {
    out.total += 1
    const key = displayKey(node, runningId)
    out[key] = (out[key] || 0) + 1
    for (const child of node.children || []) walk(child)
  }
  if (root) walk(root)
  return out
}

/** 正在做的那件事：进行中链的最末端节点（默认放大的那张卡）。 */
function runningNodeId(root) {
  let found = null
  const walk = (node) => {
    if (node.status !== 'active') return
    found = node.id || null
    for (const child of node.children || []) walk(child)
  }
  if (root) walk(root)
  return found
}

/** 编辑框：高度跟着内容走，框里不出现上下滚——点开编辑一次看全四样。 */
const AutoArea = function AutoArea({ value, onChange, rows = 1 }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(el.scrollHeight + 2, 56) + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      className="ztt-editarea"
      rows={rows}
      value={value}
      onChange={onChange}
    />
  )
}

/** 一张节点卡（HTML）：收起＝标题＋状态；展开＝对齐栏字段＋「编辑」入口；编辑态＝字段与状态表单。 */
const NodeCard = function NodeCard({ node, x, y, width, focus, on, open, onToggle, setRef, sessionId, onChanged, runningId, derivedFrom }) {
  const goal = String(node.goal || '').trim()
  const points = pointList(node)
  const hard = String(node.hard || '').trim()
  const soft = String(node.soft || '').trim()
  const hardList = itemList(hard)
  const softList = itemList(soft)
  const display = displayKey(node, runningId)
  const status = DISPLAY_LABEL[display] || display
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [draftStatus, setDraftStatus] = useState('active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // 进入编辑前量到的卡片高度：编辑态沿用它（宽由布局给），表单在卡内滚动，
  // 点「编辑」时整个节点不缩、旁边的卡也不跟着回排。
  const [editBox, setEditBox] = useState(0)
  const cardEl = useRef(null)

  const startEdit = () => {
    const el = cardEl.current
    setEditBox(el && el.offsetHeight > 0 ? el.offsetHeight : 0)
    setDraft({
      goal,
      points: points.join('\n'),
      hard: itemList(hard).join('\n'),
      soft: itemList(soft).join('\n'),
    })
    setDraftStatus(display)
    setError(null)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setDraft(null)
    setError(null)
    setEditBox(0)
  }

  const setField = (key) => (event) => {
    const value = event && event.target ? event.target.value : ''
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const save = async () => {
    if (!draft) return
    if (!sessionId) {
      setError('拿不到会话 id')
      return
    }
    const toLines = (text) => String(text || '').split(/\n/).map((s) => s.trim()).filter((s) => s !== '')
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(api(ROUTE + '/node'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sessionId,
          id: node.id,
          goal: String(draft.goal || '').trim(),
          points: toLines(draft.points),
          hard: toLines(draft.hard).join('｜'),
          soft: toLines(draft.soft).join('｜'),
          status: STATUS_OF_DISPLAY[draftStatus] || 'active',
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data || data.ok === false) {
        throw new Error((data && data.error) || ('HTTP ' + res.status))
      }
      setEditing(false)
      setDraft(null)
      setEditBox(0)
      if (typeof onChanged === 'function') onChanged()
    } catch (e) {
      setError(String((e && e.message) || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={(el) => { cardEl.current = el; if (typeof setRef === 'function') setRef(el) }}
      className={'ztt-card ztt-card-' + display
        + (focus ? ' ztt-card-focus' : ' ztt-card-minor')
        + (on ? ' ztt-card-on' : '') + (open ? ' ztt-card-open' : '')
        + (editing ? ' ztt-card-editing' : '')}
      data-editing={editing ? 'true' : 'false'}
      style={{ left: x, top: y, width, height: editing && editBox > 0 ? editBox : undefined }}
      onClick={() => { if (!editing) onToggle(node.id) }}
    >
      <div className="ztt-title">{goal !== '' ? goal : node.title}</div>
      <div className="ztt-sub">{status}</div>
      {open && (
        <div className="ztt-detail" onClick={(e) => {
          // 只有落在真正可操作的元素上才拦点击；点正文/空白要冒泡到卡片，让「再点一次收起」生效。
          const t = e.target
          if (t && typeof t.closest === 'function'
            && t.closest('button, textarea, input, select, a, [contenteditable="true"]')) {
            e.stopPropagation()
          }
        }}>
          {!editing && (
            <button
              type="button"
              className="ztt-collapsebtn"
              onClick={(e) => { e.stopPropagation(); onToggle(node.id) }}
            >收起 ▴</button>
          )}
          {derivedFrom !== '' && (
            <div className="ztt-line ztt-derived">衍生自「{derivedFrom}」</div>
          )}
          {editing ? (
            <div className="ztt-editform">
              <label className="ztt-editfield">
                <span className="ztt-editlabel">本层目标</span>
                <AutoArea rows={2} value={draft ? draft.goal : ''} onChange={setField('goal')} />
              </label>
              <label className="ztt-editfield">
                <span className="ztt-editlabel">基本点（每行一条）</span>
                <AutoArea rows={3} value={draft ? draft.points : ''} onChange={setField('points')} />
              </label>
              <label className="ztt-editfield">
                <span className="ztt-editlabel">硬需求（每行一条）</span>
                <AutoArea rows={2} value={draft ? draft.hard : ''} onChange={setField('hard')} />
              </label>
              <label className="ztt-editfield">
                <span className="ztt-editlabel">软需求（每行一条）</span>
                <AutoArea rows={2} value={draft ? draft.soft : ''} onChange={setField('soft')} />
              </label>
              <div className="ztt-editfield">
                <span className="ztt-editlabel">状态</span>
                <div className="ztt-statusrow">
                  {[['running', '运行中'], ['queued', '排队中'], ['done', '已定'], ['obsolete', '已废']].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={'ztt-statusbtn' + (draftStatus === value ? ' ztt-statusbtn-on' : '')}
                      onClick={() => setDraftStatus(value)}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div className="ztt-editactions">
                <button type="button" className="ztt-savebtn" disabled={saving} onClick={save}>
                  {saving ? '保存中…' : '保存'}
                </button>
                <button type="button" className="ztt-textbtn" onClick={cancelEdit}>取消</button>
                <span className="ztt-edithint">保存后下一轮会话按它走</span>
              </div>
              {error !== null && <p className="ztt-error">{error}</p>}
            </div>
          ) : (
            <>
              {points.length > 0 && (
                <div className="ztt-group ztt-group-points">
                  <div className="ztt-grouplabel">基本点</div>
                  {points.map((point, i) => (
                    <div className="ztt-line ztt-numrow ztt-point" key={i}>
                      <span className="ztt-pointnum">{MARKS[i] ?? i + 1}</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              )}
              {hardList.length > 0 && (
                <div className="ztt-group ztt-group-hard">
                  <div className="ztt-grouplabel">硬需求</div>
                  {hardList.map((item, i) => (
                    <div className="ztt-line ztt-numrow ztt-hard" key={i}>
                      <span className="ztt-pointnum">{MARKS[i] ?? i + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
              {softList.length > 0 && (
                <div className="ztt-group ztt-group-soft">
                  <div className="ztt-grouplabel">软需求</div>
                  {softList.map((item, i) => (
                    <div className="ztt-line ztt-numrow ztt-soft" key={i}>
                      <span className="ztt-pointnum">{MARKS[i] ?? i + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="ztt-cardactions">
                <button type="button" className="ztt-textbtn" onClick={startEdit}>编辑</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** 图形本体：固定视口 + transform 平移缩放（只动合成层，不触发重排）＋ 两阶段布局。 */
function TreeGraph({ roots, currentRootId, runningId: runningIdProp, sessionId, onChanged }) {
  const [heights, setHeights] = useState(() => new Map())
  const cardRefs = useRef(new Map())
  const wrapRef = useRef(null)
  const dragged = useRef(false)
  // 视图＝平移 (x,y) ＋ 缩放 s，直接喂给 inner 的 transform：缩放拖动只改它，不碰布局。
  const [view, setView] = useState({ x: 0, y: 0, s: 1 })
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [selected, setSelected] = useState(null)
  const [touched, setTouched] = useState(false)
  const viewRef = useRef(view)
  viewRef.current = view

  // 运行中的那颗由宿主给（与对齐栏、注入同一口径）；拿不到时退回本地推导。
  const runningId = useMemo(() => {
    if (runningIdProp) return runningIdProp
    const list = roots || []
    const cur = list.find((r) => r.id === currentRootId) || list[0]
    return runningNodeId(cur) || runningNodeId(list[0])
  }, [runningIdProp, roots, currentRootId])
  const focusId = selected ?? (touched ? null : runningId)
  // 展开与放大同步：同一时刻只有重点那张卡是展开的。
  const openSet = useMemo(() => (focusId ? new Set([focusId]) : new Set()), [focusId])
  // 几棵树并排画在同一块画布上（单棵时坐标与以前一致）。
  const graph = useMemo(
    () => buildLayoutAll(roots, openSet, heights, viewport, focusId),
    [roots, openSet, heights, viewport.w, viewport.h, focusId],
  )
  // 卡片标题表：衍生卡片要显示源卡片的名字（源被删就退回 id）。
  const titleById = useMemo(
    () => new Map((graph.placed || []).map((item) => [item.id, String(item.node.title || item.node.goal || '')])),
    [graph],
  )
  const activeIds = useMemo(() => {
    const out = new Set()
    for (const item of roots || []) for (const id of activePathIds(item)) out.add(id)
    return out
  }, [roots])

  // 量画布可视区：决定初始居中，也决定四周留白大小。
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setViewport({ w: el.clientWidth, h: el.clientHeight })
    measure()
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(measure)
      observer.observe(el)
      return () => observer.disconnect()
    }
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // 两阶段布局的第二阶段：渲染后实测每张卡的真实高度（只在布局相关变化时跑）。
  useLayoutEffect(() => {
    const next = new Map()
    let changed = false
    for (const [id, el] of cardRefs.current) {
      if (!el) continue
      const h = typeof el.offsetHeight === 'number' ? el.offsetHeight : 0
      if (h <= 0) continue
      next.set(id, h)
      if (Math.abs((heights.get(id) ?? -1) - h) > 0.5) changed = true
    }
    if (changed && next.size > 0) setHeights(next)
  }, [roots, openSet, heights, viewport.w, viewport.h])

  /** 把某张卡（缺省＝整树内容中心）摆到视口中央的那组视图参数。 */
  const centeredView = (nextScale, targetId) => {
    const s = nextScale ?? viewRef.current.s
    const target = targetId ? graph.placed.find((item) => item.id === targetId) : null
    const cx = target ? target.x + target.w / 2 : graph.marginX + graph.contentW / 2
    const cy = target ? target.y + target.h / 2 : graph.marginY + graph.contentH / 2
    return { s, x: viewport.w / 2 - cx * s, y: viewport.h / 2 - cy * s }
  }

  // 只在第一次量到可视区时对准一次：有「正在做」的卡就把它拉到中间（别让它贴在最右），否则整树居中。
  const centeredRef = useRef(false)
  useEffect(() => {
    if (centeredRef.current || viewport.w === 0 || viewport.h === 0) return
    centeredRef.current = true
    setView(centeredView(1, focusId ?? runningId))
  }, [viewport.w, viewport.h, graph.marginX, graph.marginY, graph.contentW, graph.contentH])

  const backToTree = () => setView(centeredView())
  const resetScale = () => setView(centeredView(1, focusId ?? runningId))
  const fitToWidth = () => {
    if (viewport.w <= 0) return
    setView(centeredView(Math.min(1, Math.max(0.3, (viewport.w - 44) / graph.contentW))))
  }

  // 滚轮＝缩放，围绕光标锚定：只换 transform 的两个数，浏览器走合成层，不重排。
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (event) => {
      // 鼠标落在可编辑块里：滚轮归它自己（滚动内容），不抢来缩放画布。
      const target = event.target
      if (target && typeof target.closest === 'function'
        && target.closest('textarea, input, select, [contenteditable="true"]')) {
        return
      }
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      const cur = viewRef.current
      const next = Math.min(2.5, Math.max(0.25, cur.s * (event.deltaY < 0 ? 1.12 : 1 / 1.12)))
      if (next === cur.s) return
      const cx = (px - cur.x) / cur.s
      const cy = (py - cur.y) / cur.s
      setView({ s: next, x: px - cx * next, y: py - cy * next })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // 按住拖动＝平移：同样只改 transform。编辑态卡片里的按下不归画布——否则一拖，
  // 正在编辑的卡片跟着画布跑，文字选不上、光标乱跳。
  const drag = useRef({ active: false, px: 0, py: 0, x: 0, y: 0 })
  const onPointerDown = (event) => {
    const target = event.target
    if (target && typeof target.closest === 'function' && target.closest('[data-editing="true"]')) {
      dragged.current = false
      drag.current.active = false
      return
    }
    const cur = viewRef.current
    drag.current = { active: true, px: event.clientX, py: event.clientY, x: cur.x, y: cur.y }
    dragged.current = false
  }
  const onPointerMove = (event) => {
    if (!drag.current.active) return
    const dx = event.clientX - drag.current.px
    const dy = event.clientY - drag.current.py
    if (!dragged.current && Math.abs(dx) + Math.abs(dy) < 6) return
    dragged.current = true
    setView((cur) => ({ ...cur, x: drag.current.x + dx, y: drag.current.y + dy }))
  }
  const onPointerUp = () => { drag.current.active = false }

  // 点卡片＝选中它：放大与展开同时落到这张，原来那张随即收起；再点一次＝一起取消。
  const toggle = (id) => {
    if (dragged.current) return
    setTouched(true)
    setSelected((prev) => (prev === id ? null : id))
  }

  // 点选后把镜头对准它：布局怎么变都不会把它甩出视野（保存刷新不再重挂画布，镜头也不会被重置）。
  const focusedRef = useRef(null)
  useEffect(() => {
    if (selected === focusedRef.current) return
    focusedRef.current = selected
    if (!selected) return
    setView(centeredView(1, selected))
  }, [selected, graph])

  return (
    <div className="ztt-graphbox">
      <div className="ztt-toolbar">
        <span className="ztt-hint">滚轮缩放 · 拖动平移 · 点卡片放大＋看详情（再点一次、点详情空白或按「收起」缩回）</span>
        <div className="ztt-tools">
          <button type="button" className="ztt-iconbtn" title="回到树" onClick={backToTree}><IconLocate /></button>
          <button type="button" className="ztt-iconbtn" title="适应宽度" onClick={fitToWidth}><IconFit /></button>
          <button type="button" className="ztt-iconbtn" title="原始大小" onClick={resetScale}><IconActual /></button>
        </div>
      </div>
      <div className="ztt-wrap" ref={wrapRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
        <div className="ztt-inner"
          style={{
            width: graph.width,
            height: graph.height,
            transform: 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.s + ')',
          }}>
          <svg className="ztt-edges" width={graph.width} height={graph.height}>
            {graph.edges.map((edge) => {
              const on = activeIds.has(edge.childId) && activeIds.has(edge.parentId)
              return <path key={edge.key} className={'ztt-edge' + (on ? ' ztt-edge-on' : '')} d={edge.d} />
            })}
            {(graph.derived || []).map((edge) => (
              <path key={edge.key} className="ztt-edge-derived" d={edge.d} />
            ))}
          </svg>
          {(graph.labels || []).map((label) => (
            <div key={label.id} className="ztt-treelabel" style={{ left: label.x, top: label.y }}>{label.text}</div>
          ))}
          {graph.placed.map((item) => (
            <NodeCard
              key={item.id}
              node={item.node}
              x={item.x}
              y={item.y}
              width={item.w}
              focus={item.node.id === focusId}
              on={item.node.id === runningId}
              open={openSet.has(item.id)}
              onToggle={toggle}
              sessionId={sessionId}
              onChanged={onChanged}
              runningId={runningId}
              derivedFrom={item.node.from ? (titleById.get(item.node.from) || item.node.from) : ''}
              setRef={(el) => {
                if (el) cardRefs.current.set(item.node.id, el)
                else cardRefs.current.delete(item.node.id)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** 面板主体：读本会话的树，画成节点连线图。 */
export function TaskTreeTab(props) {
  const sessionId = props && props.sessionId
  const [state, setState] = useState({ loading: true, tree: null, mode: '', error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => { ensureStyle() }, [])

  useEffect(() => {
    let alive = true
    setState((prev) => ({ ...prev, loading: !prev.tree, error: null }))
    const url = api(ROUTE + '/tree?sessionId=' + encodeURIComponent(String(sessionId || '')))
    fetch(url, { headers: { accept: 'application/json' } })
      .then(async (res) => ({ res, data: await res.json().catch(() => null) }))
      .then(({ res, data }) => {
        if (!alive) return
        if (!res.ok || !data || data.ok === false) {
          setState({ loading: false, tree: null, mode: '', error: (data && data.error) || ('HTTP ' + res.status) })
          return
        }
        setState({ loading: false, tree: data.tree || null, mode: data.mode || '', error: null })
      })
      .catch((error) => {
        if (!alive) return
        setState({ loading: false, tree: null, mode: '', error: String((error && error.message) || error) })
      })
    return () => { alive = false }
  }, [sessionId, tick])

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  if (state.loading) {
    return <div className="ztt-root"><p className="ztt-note">读取中…</p></div>
  }
  if (state.error !== null) {
    return (
      <div className="ztt-root">
        <p className="ztt-error">读取失败：{state.error}</p>
        <span><button type="button" className="ztt-textbtn" onClick={refresh}>重试</button></span>
      </div>
    )
  }
  // 任务树与对齐栏只属于进化模式：标准等模式里不画树、不画对齐卡（后端也不写）。
  if (state.mode !== '' && state.mode !== 'plugin-evolution') {
    return (
      <div className="ztt-root">
        <p className="ztt-note">本会话不是进化模式：任务树与对齐栏只在进化模式里用。</p>
        <span><button type="button" className="ztt-textbtn" onClick={refresh}>刷新</button></span>
      </div>
    )
  }
  if (state.tree === null) {
    return (
      <div className="ztt-root">
        <p className="ztt-note">本会话还没有任务树。要把任务摆成方向图时，跟我说一声「立棵树」。</p>
        <span><button type="button" className="ztt-textbtn" onClick={refresh}>刷新</button></span>
      </div>
    )
  }

  const tree = state.tree
  const roots = Array.isArray(tree.roots) && tree.roots.length > 0
    ? tree.roots
    : (tree.root ? [tree.root] : [])
  const currentRoot = roots.find((r) => tree.root && r.id === tree.root.id) || roots[0] || null
  const dropped = tree.dropped || []
  const unplaced = tree.unplaced || []
  // 运行中的那颗由宿主给（与对齐栏同一口径）：全树只标一个「运行中」，其余没做完的算排队中。
  // 宿主还没升级到下发 runningId 时，本地按同一套判（进行中链的末端）补上，别让统计掉成 0 运行中。
  const runningId = String(tree.runningId || '')
    || (currentRoot ? runningNodeId(currentRoot) : '')
    || (roots[0] ? runningNodeId(roots[0]) : '')
  // 几棵树同一块画布并排：统计按全部树算，标题写「N 棵树并列」。
  const stats = roots.reduce((acc, r) => {
    const one = treeStats(r, runningId)
    return {
      running: acc.running + one.running,
      queued: acc.queued + one.queued,
      done: acc.done + one.done,
      obsolete: acc.obsolete + one.obsolete,
      dropped: acc.dropped + one.dropped,
      total: acc.total + one.total,
    }
  }, { running: 0, queued: 0, done: 0, obsolete: 0, dropped: 0, total: 0 })

  return (
    <div className="ztt-root">
      <div className="ztt-head">
        <div className="ztt-headline">
          <span className="ztt-roottitle" title={roots.map((r) => r.title).join(' ＋ ')}>
            {roots.length > 1 ? `${roots.length} 棵树并列` : (currentRoot ? currentRoot.title : '（本会话还没立树）')}
          </span>
          {roots.length > 0 && (
            <span className="ztt-stat">
              {stats.running} 运行中 · {stats.queued} 排队中 · {stats.done} 已定 · {stats.obsolete} 已废 · 共 {stats.total} 项
            </span>
          )}
          <button type="button" className="ztt-iconbtn" title="刷新" onClick={refresh}><IconRefresh /></button>
        </div>
      </div>
      {roots.length > 0 && <TreeGraph roots={roots} currentRootId={tree.root ? tree.root.id : ''} runningId={runningId} sessionId={sessionId} onChanged={refresh} />}
      {(dropped.length > 0 || unplaced.length > 0) && (
        <div className="ztt-foot">
          {dropped.length > 0 && (
            <span className="ztt-footitem">已否 {dropped.length} 项：{dropped.map((item) => item.title).join('｜')}</span>
          )}
          {unplaced.length > 0 && (
            <span className="ztt-footitem">未归位 {unplaced.length} 项：{unplaced.map((item) => item.title).join('、')}</span>
          )}
        </div>
      )}
    </div>
  )
}

/** 标签页标题（chip 上的那行字）。 */
export function TaskTreeTitle() {
  return <span>任务树</span>
}

/** 图标：刷新。 */
function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 11.5a8.5 8.5 0 1 0-2.4 5.7" />
      <path d="M20.5 5.5v6h-6" />
    </svg>
  )
}

/** 图标：回到树（准星）。 */
function IconLocate() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
    </svg>
  )
}

/** 图标：适应宽度（左右箭头）。 */
function IconFit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16" />
      <path d="M8 8l-4 4 4 4" />
      <path d="M16 8l4 4-4 4" />
    </svg>
  )
}

/** 图标：原始大小（方框）。 */
function IconActual() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  )
}

/** 指南页卡片上的树形小图标。 */
function TreeGlyph({ size = 22, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="5" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M12 7.4v3.1M12 10.5H6v5.1M12 10.5h6v5.1" />
    </svg>
  )
}

/** 需要的客户端服务：只用已验证的 slots。 */
export const inject = ['slots']

/**
 * 自证状态：注册走到哪一步了。
 * 它显示在右侧栏「＋」菜单那张卡片的描述行尾——界面不可用时，这一行就是现场：
 * `类型✗…`＝tab 类型没注册上；`类型✓ 座位✗`＝类型在、内容座位没挂上；`座位✓2`＝两条都齐。
 */
const DIAG = { type: '等待服务', seats: 0 }

/** 挂进卡片描述的诊断尾巴。 */
function diagText() {
  return '　【' + (DIAG.type === 'ok' ? '类型✓' : '类型✗' + DIAG.type) + ' 座位' + (DIAG.seats > 0 ? '✓' + DIAG.seats : '✗') + '】'
}

/** 本包注册的类型定义（右侧栏选择列据此多一张卡片）。 */
const TAB_DEFINITION = {
  id: TAB_ID,
  kind: TAB_KIND,
  priority: 'extension',
  title: () => '任务树',
  guide: [{
    id: 'current-session',
    order: GUIDE_ORDER,
    title: () => '任务树',
    description: () => '看本会话的方向图：做到哪／替谁做／旁边还有哪几件' + diagText(),
    icon: TreeGlyph,
  }],
}

/**
 * 注册三段；任一段失败都不牵连其他段。
 * @param ctx - 客户端根上下文。
 */
export function apply(ctx) {
  ensureStyle()

  // 1) tab 类型：等 sidebarRightTabs 服务进上下文再注册（apply 期通常还没有）。
  const registerType = () => {
    try {
      const tabs = typeof ctx.get === 'function' ? ctx.get('sidebarRightTabs') : undefined
      if (!tabs || typeof tabs.register !== 'function') return false
      tabs.register(TAB_DEFINITION)
      DIAG.type = 'ok'
      return true
    } catch (error) {
      DIAG.type = String((error && error.message) || error).slice(0, 32)
      return true
    }
  }
  if (!registerType()) {
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      if (registerType() || tries > 600) clearInterval(timer)
    }, 500)
    try {
      if (typeof ctx.effect === 'function') ctx.effect(() => () => clearInterval(timer))
    } catch { /* 清理不了也只是多一个定时器，注册过一次就不再动手 */ }
  }

  // 2) 面板主体：会话 id 由座位注入，组件只读它。
  //    两个 key 都挂：类型注册成功时宿主按类型的 id 找内容，类型缺失时退回按 kind 找——
  //    两条路都铺上，界面就不会落到「这类内容还没有可用的查看方式」。
  for (const key of [TAB_ID, TAB_KIND]) {
    try {
      ctx.slots.inject('sidebar.right.pane.tab', () => {
        const dispose = ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key,
          inject: (sessionId) => ({ sessionId }),
        }, TaskTreeTab)
        DIAG.seats += 1
        return dispose
      })
    } catch { /* 这个座位没有就算了 */ }
  }

  // 3) 标签页标题（同样两个 key，理由同 2）。
  for (const key of [TAB_ID, TAB_KIND]) {
    try {
      ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab.title',
        key,
      }, TaskTreeTitle))
    } catch { /* 同上 */ }
  }
}
