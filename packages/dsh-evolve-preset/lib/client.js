window.__ModuleLoader__.load({
	id: "dsh-evolve-preset",
	factory: (require) => {
// 任务树面板
(function () {

		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/entry.jsx
var entry_exports = {};
__export(entry_exports, {
  TaskTreeTab: () => TaskTreeTab,
  TaskTreeTitle: () => TaskTreeTitle,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(entry_exports);
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var ROUTE = "dsh-evolve-task-tree/api";
var TAB_ID = "dsh-evolve-task-tree/task-tree";
var TAB_KIND = "dshTaskTree";
var GUIDE_ORDER = 11;
var STYLE_ID = "dsh-evolve-task-tree-style";
var MARKS = ["\u2460", "\u2461", "\u2462", "\u2463", "\u2464", "\u2465", "\u2466", "\u2467", "\u2468", "\u2469"];
var NODE_W = 240;
var FOCUS_W = NODE_W;
var EST_H = 84;
var SIB_GAP = 22;
var LEVEL_GAP = 58;
var TREE_GAP = 120;
var MARGIN_MIN = 480;
var DISPLAY_LABEL = { running: "\u8FD0\u884C\u4E2D", queued: "\u6392\u961F\u4E2D", done: "\u5DF2\u5B9A", obsolete: "\u5DF2\u5E9F", dropped: "\u5DF2\u5426" };
var STATUS_OF_DISPLAY = { running: "active", queued: "pending", done: "done", obsolete: "obsolete" };
function displayKey(node, runningId) {
  if (runningId && node.id === runningId) return "running";
  if (node.status === "active" || node.status === "pending") return "queued";
  if (node.status === "done") return "done";
  if (node.status === "obsolete") return "obsolete";
  return "dropped";
}
var CSS = `
.ztt-root { display:flex; flex-direction:column; gap:10px; padding:12px 12px 14px; font-size:13px;
  height:100%; min-height:320px; box-sizing:border-box; color:var(--dsw-alias-label-primary); }

/* \u5934\u90E8\uFF1A\u6807\u9898 / \u7EDF\u8BA1 / \u73B0\u5728\u505A\u5230\u54EA\uFF0C\u5404\u5F52\u5176\u4F4D */
.ztt-head { display:flex; flex-direction:column; gap:7px;
  padding-bottom:11px; border-bottom:1px solid var(--dsw-alias-border-l1); }
/* \u4E00\u4E2A\u4F1A\u8BDD\u6302\u4E86\u51E0\u68F5\u6811\uFF1A\u540C\u4E00\u5757\u753B\u5E03\u5DE6\u53F3\u5E76\u6392\uFF0C\u6BCF\u68F5\u6811\u4E0A\u65B9\u4E00\u4E2A\u300C\u7B2C N \u68F5\u300D\u5C0F\u6807 */
.ztt-treelabel { position:absolute; font-size:11.5px; line-height:1.4; letter-spacing:.04em;
  color:var(--dsw-alias-label-secondary); white-space:nowrap; pointer-events:none; user-select:none; }
.ztt-headline { display:flex; align-items:center; gap:8px; }
.ztt-roottitle { flex:1 1 auto; min-width:0; font-size:16px; font-weight:600; line-height:1.4;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ztt-stat { flex:0 0 auto; font-size:11.5px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }

/* \u7F16\u8F91\u6001\uFF1A\u50CF\u4E00\u5F20\u5C0F\u8868\u5355\uFF0C\u4FDD\u5B58\u5373\u5199\u56DE\u672C\u4F1A\u8BDD */
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

/* \u56FE\u6807\u6309\u94AE\uFF1A\u4E0D\u62A2\u620F\uFF0Chover \u624D\u4EAE */
.ztt-iconbtn { flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center;
  width:26px; height:26px; padding:0; border:0; border-radius:7px; background:none;
  color:var(--dsw-alias-label-secondary); cursor:pointer; transition:background .12s, color .12s; }
.ztt-iconbtn:hover { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
.ztt-textbtn { padding:0; border:0; background:none; color:var(--dsw-alias-label-secondary);
  font:inherit; font-size:12px; cursor:pointer; white-space:nowrap; }
.ztt-textbtn:hover { color:var(--dsw-alias-label-primary); }

/* \u753B\u5E03\uFF1A\u70B9\u9635\u5E95\u7EB9\uFF0C\u50CF\u4E00\u5757\u771F\u7684\u753B\u677F */
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

/* \u5361\u7247\uFF1A\u91CD\u70B9\u767D\u5E95\u5E26\u5F71\uFF0C\u5176\u4F59\u6D45\u5E95\u964D\u6743 */
.ztt-card { position:absolute; box-sizing:border-box; padding:12px 14px 11px 18px;
  border:1px solid var(--dsw-alias-border-l2); border-radius:12px;
  background:var(--dsw-alias-bg-base); cursor:pointer;
  transition:box-shadow .15s ease, border-color .15s ease, background .15s ease; }
.ztt-card:hover { border-color:var(--dsw-alias-border-l2); }
.ztt-card::before { content:''; position:absolute; left:0; top:12px; bottom:12px; width:3px;
  border-radius:0 2px 2px 0; background:var(--dsw-alias-border-l2); }
.ztt-card-running::before { background:var(--dsw-alias-brand-primary); }
.ztt-card-done::before { background:var(--dsw-alias-state-success-primary); opacity:.6; }
/* \u6392\u961F\u4E2D\uFF1A\u5DF2\u5217\u51FA\u3001\u8FD8\u6CA1\u8F6E\u5230\uFF08\u542B\u5F85\u529E\u4E0E\u6682\u65F6\u6CA1\u5728\u8DD1\u7684\u652F\uFF09\u2014\u2014\u865A\u7EBF\u8FB9\u6846 + \u7070\u7AD6\u6761\uFF0C\u4E0E"\u5DF2\u5E9F"\uFF08\u6574\u4F53\u964D\u900F\u660E\uFF09\u533A\u5206\u5F00 */
.ztt-card-queued { border-style:dashed; }
.ztt-card-queued::before { background:var(--dsw-alias-border-l2); }
.ztt-card-dropped::before { background:var(--dsw-alias-state-error-primary); }
.ztt-card-obsolete { opacity:.62; background:var(--dsw-alias-bg-layer-2); }
.ztt-card-obsolete::before { background:var(--dsw-alias-border-l2); }
.ztt-card-obsolete .ztt-title { color:var(--dsw-alias-label-secondary); font-weight:600; }
.ztt-card-obsolete .ztt-sub { color:var(--dsw-alias-label-secondary); }
.ztt-card-focus { z-index:2; padding:13px 15px 12px 19px; box-shadow:0 4px 18px rgba(0,0,0,.11); }
.ztt-card-focus::before { width:4px; top:11px; bottom:11px; }
/* \u5C42\u6B21\u5355\u5411\uFF1A\u753B\u5E03\u6D45\u7070 \u2192 \u6240\u6709\u5361\u7247\u767D \u2192 \u8BE6\u60C5\u53EA\u9760\u5206\u9694\u7EBF\uFF1B\u666E\u901A\u5361\u9760"\u6CA1\u6709\u9634\u5F71"\u964D\u6743 */
.ztt-card-on { border-color:var(--dsw-alias-brand-primary); }
.ztt-card-open { border-color:var(--dsw-alias-brand-primary); }
.ztt-title { font-size:14px; font-weight:600; line-height:1.55;
  color:var(--dsw-alias-label-primary); overflow-wrap:break-word; overflow:hidden;
  display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; }
.ztt-card-open .ztt-title { display:block; -webkit-line-clamp:unset; }
.ztt-card-focus .ztt-title { font-size:17.5px; }
.ztt-card-focus .ztt-sub { font-size:12.5px; }
.ztt-card-focus .ztt-line { font-size:13.5px; }
/* \u672A\u5C55\u5F00\u7684\u5361\uFF1A\u4E3B\u6587\u5B57\u7528\u4E3B\u8272\uFF0C\u8FD0\u884C\u4E2D\u7684\u518D\u52A0\u7C97\u4E00\u6863\uFF0C\u6392\u961F\u4E2D\u7684\u964D\u4E00\u6863\uFF0C\u5DF2\u5B9A\u7684\u518D\u964D */
/* \u6536\u8D77\u6001\u5DE6\u53F3\u5404\u6536 4px\uFF1A\u540C\u5BBD\u91CC\u591A\u663E\u793A\u4E00\u70B9\u5B57\uFF08\u5C55\u5F00\u4E0E\u7F16\u8F91\u6001\u4E0D\u52A8\uFF09 */
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
/* \u5C55\u5F00\u533A\uFF1A\u6D45\u5E95\u5185\u5D4C\u5757\uFF0B\u7EC6\u8FB9\u6846\uFF1B\u7EC4\u6807\u9898\u5E26\u5C0F\u7AD6\u6761\u3001\u53F3\u8FB9\u62D6\u7EC6\u7EBF\uFF0C\u4E00\u773C\u5206\u5F97\u6E05 */
.ztt-detail { margin-top:12px; padding-top:11px; border-top:1px solid var(--dsw-alias-border-l1); }
/* \u5C55\u5F00\u540E\u7684\u663E\u5F0F\u6536\u8D77\u5165\u53E3\uFF1A\u70B9\u5B83\u6216\u70B9\u8BE6\u60C5\u6B63\u6587\u7A7A\u767D\u90FD\u80FD\u7F29\u56DE\u53BB */
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
/* \u57FA\u672C\u70B9\uFF1D\u7F16\u53F7\u6E05\u5355\uFF0C\u80FD\u6570\uFF1B\u786C\u9700\u6C42\u52A0\u7C97\u6700\u91CD\uFF1B\u8F6F\u9700\u6C42\u6B21\u8981\u8272\uFF0C\u5F80\u540E\u9000 */
/* \u7F16\u53F7\u884C\uFF1A\u4E09\u5757\u5171\u7528\u540C\u4E00\u5957\u6392\u7248\uFF0C\u53EA\u6709\u5B57\u91CD\u4E0E\u989C\u8272\u4E0D\u540C */
.ztt-numrow { display:flex; gap:8px; align-items:flex-start; }
.ztt-numrow + .ztt-numrow { margin-top:3px; }
.ztt-point { font-weight:700; }
.ztt-pointnum { flex:0 0 auto; min-width:13px; color:var(--dsw-alias-label-secondary);
  font-variant-numeric:tabular-nums; font-weight:700; }
/* \u4E09\u5757\u7684\u4E3B\u6B21\uFF1A\u53EA\u6709\u57FA\u672C\u70B9\u7528\u54C1\u724C\u8272\u7AD6\u6761\u3001\u6700\u5B9E\uFF1B\u786C\u9700\u6C42\u6B21\u4E4B\uFF1B\u8F6F\u9700\u6C42\u6700\u8F7B */
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
`;
function ensureStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}
function api(path) {
  const relative = String(path).replace(/^\/+/, "");
  if (typeof document === "undefined") return "/" + relative;
  const url = new URL(relative, document.baseURI);
  return url.pathname + url.search;
}
function pointList(node) {
  const raw = node.points;
  if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter((item) => item !== "");
  if (typeof raw !== "string") return [];
  return raw.split(/[｜|\n]/).map((item) => item.trim()).filter((item) => item !== "");
}
function itemList(text) {
  return String(text || "").split(/[｜|\n]/).map((item) => item.trim()).filter((item) => item !== "");
}
function estHeight(node, open) {
  if (!open) return EST_H;
  const points = pointList(node).length;
  const hard = itemList(node.hard).length;
  const soft = itemList(node.soft).length;
  const groups = [points > 0, hard > 0, soft > 0].filter(Boolean).length;
  return EST_H + 18 + (points + hard + soft) * 19 + groups * 20;
}
function edgeD(from, to) {
  const x1 = from.x + from.w / 2;
  const y1 = from.y + from.h;
  const x2 = to.x + to.w / 2;
  const y2 = to.y;
  const dy = Math.max(16, (y2 - y1) / 2);
  return "M " + x1 + " " + y1 + " C " + x1 + " " + (y1 + dy) + ", " + x2 + " " + (y2 - dy) + ", " + x2 + " " + y2;
}
function derivedD(a, b) {
  const left = a.x + a.w / 2 <= b.x + b.w / 2 ? a : b;
  const right = left === a ? b : a;
  const x1 = left.x + left.w + 2;
  const x2 = right.x - 2;
  const y1 = left.y + left.h / 2;
  const y2 = right.y + right.h / 2;
  const mx = (x1 + x2) / 2;
  if (Math.abs(y2 - y1) < 2) return "M " + x1 + " " + y1 + " H " + x2;
  return "M " + x1 + " " + y1 + " H " + mx + " V " + y2 + " H " + x2;
}
function derivedEdges(placed) {
  const pos = new Map(placed.map((item) => [item.id, item]));
  const out = [];
  for (const item of placed) {
    const fromId = item.node && item.node.from;
    if (!fromId) continue;
    const src = pos.get(fromId);
    if (!src) continue;
    out.push({ key: "derived-" + item.id, fromId, toId: item.id, d: derivedD(src, item) });
  }
  return out;
}
function buildLayoutAll(roots, openSet, heights, viewport, focusId) {
  const list = (roots || []).filter(Boolean);
  if (list.length <= 1) {
    const one = buildLayout(list[0], openSet, heights, viewport, focusId);
    return { ...one, labels: [] };
  }
  const marginX = Math.max(MARGIN_MIN, viewport.w || 0);
  const marginY = Math.max(MARGIN_MIN, viewport.h || 0);
  const placed = [];
  const labels = [];
  let cursor = marginX;
  let maxContentH = EST_H;
  for (let i = 0; i < list.length; i += 1) {
    const root = list[i];
    const one = buildLayout(root, openSet, heights, { w: 0, h: 0 }, focusId);
    const shiftX = cursor - one.marginX;
    const shiftY = marginY - one.marginY;
    const moved = one.placed.map((item) => ({ ...item, x: item.x + shiftX, y: item.y + shiftY }));
    placed.push(...moved);
    const rootItem = moved.find((item) => item.id === root.id) || moved[0];
    if (rootItem) labels.push({ id: "label-" + root.id, x: rootItem.x, y: Math.max(8, rootItem.y - 26), text: "\u7B2C " + (i + 1) + " \u68F5" });
    cursor += one.contentW + TREE_GAP;
    maxContentH = Math.max(maxContentH, one.contentH);
  }
  const pos = new Map(placed.map((item) => [item.id, item]));
  const edges = [];
  const link = (node) => {
    for (const child of node.children || []) {
      const from = pos.get(node.id);
      const to = pos.get(child.id);
      if (from && to) {
        edges.push({
          key: (node.id || "?") + "->" + (child.id || "?"),
          parentId: node.id || "",
          childId: child.id || "",
          d: edgeD(from, to)
        });
      }
      link(child);
    }
  };
  list.forEach(link);
  const contentW = Math.max(cursor - TREE_GAP - marginX, FOCUS_W);
  const contentH = Math.max(maxContentH, EST_H);
  return { placed, edges, derived: derivedEdges(placed), width: contentW + marginX * 2, height: contentH + marginY * 2, contentW, contentH, marginX, marginY, labels };
}
function buildLayout(root, openSet, heights, viewport, focusId) {
  const marginX = Math.max(MARGIN_MIN, viewport.w || 0);
  const marginY = Math.max(MARGIN_MIN, viewport.h || 0);
  const widthOf = (node) => node.id === focusId ? FOCUS_W : NODE_W;
  const heightOf = (node) => heights.get(node.id) ?? estHeight(node, openSet.has(node.id));
  const items = [];
  const collect = (node, depth) => {
    items.push({ node, depth });
    for (const child of node.children || []) collect(child, depth + 1);
  };
  collect(root, 0);
  const levels = [];
  for (const item of items) {
    if (!levels[item.depth]) levels[item.depth] = [];
    levels[item.depth].push(item);
  }
  const levelY = [];
  let cursorY = marginY;
  for (let depth = 0; depth < levels.length; depth += 1) {
    levelY[depth] = cursorY;
    let tallest = 0;
    for (const item of levels[depth]) tallest = Math.max(tallest, heightOf(item.node));
    cursorY += tallest + LEVEL_GAP;
  }
  const pos = /* @__PURE__ */ new Map();
  let cursorX = marginX;
  const place = (node, depth) => {
    const w = widthOf(node);
    const kids = node.children || [];
    let centerX;
    if (kids.length === 0) {
      centerX = cursorX + w / 2;
      cursorX += w + SIB_GAP;
    } else {
      const centers = kids.map((child) => place(child, depth + 1));
      centerX = (centers[0] + centers[centers.length - 1]) / 2;
    }
    pos.set(node.id, { x: centerX - w / 2, y: levelY[depth], h: heightOf(node), w });
    return centerX;
  };
  place(root, 0);
  const edges = [];
  const link = (node) => {
    const from = pos.get(node.id);
    for (const child of node.children || []) {
      const to = pos.get(child.id);
      if (from && to) {
        const x1 = from.x + from.w / 2;
        const y1 = from.y + from.h;
        const x2 = to.x + to.w / 2;
        const y2 = to.y;
        const dy = Math.max(16, (y2 - y1) / 2);
        edges.push({
          key: (node.id || "?") + "->" + (child.id || "?"),
          parentId: node.id || "",
          childId: child.id || "",
          d: "M " + x1 + " " + y1 + " C " + x1 + " " + (y1 + dy) + ", " + x2 + " " + (y2 - dy) + ", " + x2 + " " + y2
        });
      }
      link(child);
    }
  };
  link(root);
  const contentW = Math.max(cursorX - SIB_GAP - marginX, FOCUS_W);
  const contentH = Math.max(cursorY - LEVEL_GAP - marginY, estHeight(root, openSet.has(root.id)));
  const width = contentW + marginX * 2;
  const height = contentH + marginY * 2;
  const placedList = [...pos.entries()].map(([id, p]) => ({ id, node: items.find((i) => i.node.id === id).node, x: p.x, y: p.y, h: p.h, w: p.w }));
  return { placed: placedList, edges, derived: derivedEdges(placedList), width, height, contentW, contentH, marginX, marginY };
}
function activePathIds(root) {
  const ids = /* @__PURE__ */ new Set();
  const walk = (node, path) => {
    const kids = (node.children || []).filter((child) => child.status === "active");
    const next = [...path, node];
    if (node.status === "active" && kids.length === 0) for (const item of next) ids.add(item.id || "");
    else for (const child of kids) walk(child, next);
  };
  if (root) walk(root, []);
  return ids;
}
function treeStats(root, runningId) {
  const out = { running: 0, queued: 0, done: 0, obsolete: 0, dropped: 0, total: 0 };
  const walk = (node) => {
    out.total += 1;
    const key = displayKey(node, runningId);
    out[key] = (out[key] || 0) + 1;
    for (const child of node.children || []) walk(child);
  };
  if (root) walk(root);
  return out;
}
function runningNodeId(root) {
  let found = null;
  const walk = (node) => {
    if (node.status !== "active") return;
    found = node.id || null;
    for (const child of node.children || []) walk(child);
  };
  if (root) walk(root);
  return found;
}
var NodeCard = function NodeCard2({ node, x, y, width, focus, on, open, onToggle, setRef, sessionId, onChanged, runningId, derivedFrom }) {
  const goal = String(node.goal || "").trim();
  const points = pointList(node);
  const hard = String(node.hard || "").trim();
  const soft = String(node.soft || "").trim();
  const hardList = itemList(hard);
  const softList = itemList(soft);
  const display = displayKey(node, runningId);
  const status = DISPLAY_LABEL[display] || display;
  const [editing, setEditing] = (0, import_react.useState)(false);
  const [draft, setDraft] = (0, import_react.useState)(null);
  const [draftStatus, setDraftStatus] = (0, import_react.useState)("active");
  const [saving, setSaving] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const startEdit = () => {
    setDraft({
      goal,
      points: points.join("\n"),
      hard: itemList(hard).join("\n"),
      soft: itemList(soft).join("\n")
    });
    setDraftStatus(display);
    setError(null);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setError(null);
  };
  const setField = (key) => (event) => {
    const value = event && event.target ? event.target.value : "";
    setDraft((prev) => prev ? { ...prev, [key]: value } : prev);
  };
  const save = async () => {
    if (!draft) return;
    if (!sessionId) {
      setError("\u62FF\u4E0D\u5230\u4F1A\u8BDD id");
      return;
    }
    const toLines = (text) => String(text || "").split(/\n/).map((s) => s.trim()).filter((s) => s !== "");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(api(ROUTE + "/node"), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sessionId,
          id: node.id,
          goal: String(draft.goal || "").trim(),
          points: toLines(draft.points),
          hard: toLines(draft.hard).join("\uFF5C"),
          soft: toLines(draft.soft).join("\uFF5C"),
          status: STATUS_OF_DISPLAY[draftStatus] || "active"
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.ok === false) {
        throw new Error(data && data.error || "HTTP " + res.status);
      }
      setEditing(false);
      setDraft(null);
      if (typeof onChanged === "function") onChanged();
    } catch (e) {
      setError(String(e && e.message || e));
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      ref: setRef,
      className: "ztt-card ztt-card-" + display + (focus ? " ztt-card-focus" : " ztt-card-minor") + (on ? " ztt-card-on" : "") + (open ? " ztt-card-open" : ""),
      "data-editing": editing ? "true" : "false",
      style: { left: x, top: y, width },
      onClick: () => {
        if (!editing) onToggle(node.id);
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ztt-title", children: goal !== "" ? goal : node.title }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ztt-sub", children: status }),
        open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-detail", onClick: (e) => {
          const t = e.target;
          if (t && typeof t.closest === "function" && t.closest('button, textarea, input, select, a, [contenteditable="true"]')) {
            e.stopPropagation();
          }
        }, children: [
          !editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "ztt-collapsebtn",
              onClick: (e) => {
                e.stopPropagation();
                onToggle(node.id);
              },
              children: "\u6536\u8D77 \u25B4"
            }
          ),
          derivedFrom !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-line ztt-derived", children: [
            "\u884D\u751F\u81EA\u300C",
            derivedFrom,
            "\u300D"
          ] }),
          editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-editform", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ztt-editfield", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-editlabel", children: "\u672C\u5C42\u76EE\u6807" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "ztt-editarea", rows: 2, value: draft ? draft.goal : "", onChange: setField("goal") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ztt-editfield", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-editlabel", children: "\u57FA\u672C\u70B9\uFF08\u6BCF\u884C\u4E00\u6761\uFF09" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "ztt-editarea", rows: 3, value: draft ? draft.points : "", onChange: setField("points") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ztt-editfield", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-editlabel", children: "\u786C\u9700\u6C42\uFF08\u6BCF\u884C\u4E00\u6761\uFF09" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "ztt-editarea", rows: 2, value: draft ? draft.hard : "", onChange: setField("hard") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ztt-editfield", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-editlabel", children: "\u8F6F\u9700\u6C42\uFF08\u6BCF\u884C\u4E00\u6761\uFF09" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "ztt-editarea", rows: 2, value: draft ? draft.soft : "", onChange: setField("soft") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-editfield", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-editlabel", children: "\u72B6\u6001" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ztt-statusrow", children: [["running", "\u8FD0\u884C\u4E2D"], ["queued", "\u6392\u961F\u4E2D"], ["done", "\u5DF2\u5B9A"], ["obsolete", "\u5DF2\u5E9F"]].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: "ztt-statusbtn" + (draftStatus === value ? " ztt-statusbtn-on" : ""),
                  onClick: () => setDraftStatus(value),
                  children: label
                },
                value
              )) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-editactions", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ztt-savebtn", disabled: saving, onClick: save, children: saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ztt-textbtn", onClick: cancelEdit, children: "\u53D6\u6D88" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-edithint", children: "\u4FDD\u5B58\u540E\u4E0B\u4E00\u8F6E\u4F1A\u8BDD\u6309\u5B83\u8D70" })
            ] }),
            error !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ztt-error", children: error })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            points.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-group ztt-group-points", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ztt-grouplabel", children: "\u57FA\u672C\u70B9" }),
              points.map((point, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-line ztt-numrow ztt-point", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-pointnum", children: MARKS[i] ?? i + 1 }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: point })
              ] }, i))
            ] }),
            hardList.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-group ztt-group-hard", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ztt-grouplabel", children: "\u786C\u9700\u6C42" }),
              hardList.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-line ztt-numrow ztt-hard", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-pointnum", children: MARKS[i] ?? i + 1 }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item })
              ] }, i))
            ] }),
            softList.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-group ztt-group-soft", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ztt-grouplabel", children: "\u8F6F\u9700\u6C42" }),
              softList.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-line ztt-numrow ztt-soft", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-pointnum", children: MARKS[i] ?? i + 1 }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item })
              ] }, i))
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ztt-cardactions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ztt-textbtn", onClick: startEdit, children: "\u7F16\u8F91" }) })
          ] })
        ] })
      ]
    }
  );
};
function TreeGraph({ roots, currentRootId, runningId: runningIdProp, sessionId, onChanged }) {
  const [heights, setHeights] = (0, import_react.useState)(() => /* @__PURE__ */ new Map());
  const cardRefs = (0, import_react.useRef)(/* @__PURE__ */ new Map());
  const wrapRef = (0, import_react.useRef)(null);
  const dragged = (0, import_react.useRef)(false);
  const [view, setView] = (0, import_react.useState)({ x: 0, y: 0, s: 1 });
  const [viewport, setViewport] = (0, import_react.useState)({ w: 0, h: 0 });
  const [selected, setSelected] = (0, import_react.useState)(null);
  const [touched, setTouched] = (0, import_react.useState)(false);
  const viewRef = (0, import_react.useRef)(view);
  viewRef.current = view;
  const runningId = (0, import_react.useMemo)(() => {
    if (runningIdProp) return runningIdProp;
    const list = roots || [];
    const cur = list.find((r) => r.id === currentRootId) || list[0];
    return runningNodeId(cur) || runningNodeId(list[0]);
  }, [runningIdProp, roots, currentRootId]);
  const focusId = selected ?? (touched ? null : runningId);
  const openSet = (0, import_react.useMemo)(() => focusId ? /* @__PURE__ */ new Set([focusId]) : /* @__PURE__ */ new Set(), [focusId]);
  const graph = (0, import_react.useMemo)(
    () => buildLayoutAll(roots, openSet, heights, viewport, focusId),
    [roots, openSet, heights, viewport.w, viewport.h, focusId]
  );
  const titleById = (0, import_react.useMemo)(
    () => new Map((graph.placed || []).map((item) => [item.id, String(item.node.title || item.node.goal || "")])),
    [graph]
  );
  const activeIds = (0, import_react.useMemo)(() => {
    const out = /* @__PURE__ */ new Set();
    for (const item of roots || []) for (const id of activePathIds(item)) out.add(id);
    return out;
  }, [roots]);
  (0, import_react.useEffect)(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  (0, import_react.useLayoutEffect)(() => {
    const next = /* @__PURE__ */ new Map();
    let changed = false;
    for (const [id, el] of cardRefs.current) {
      if (!el) continue;
      const h = typeof el.offsetHeight === "number" ? el.offsetHeight : 0;
      if (h <= 0) continue;
      next.set(id, h);
      if (Math.abs((heights.get(id) ?? -1) - h) > 0.5) changed = true;
    }
    if (changed && next.size > 0) setHeights(next);
  }, [roots, openSet, heights, viewport.w, viewport.h]);
  const centeredView = (nextScale, targetId) => {
    const s = nextScale ?? viewRef.current.s;
    const target = targetId ? graph.placed.find((item) => item.id === targetId) : null;
    const cx = target ? target.x + target.w / 2 : graph.marginX + graph.contentW / 2;
    const cy = target ? target.y + target.h / 2 : graph.marginY + graph.contentH / 2;
    return { s, x: viewport.w / 2 - cx * s, y: viewport.h / 2 - cy * s };
  };
  const centeredRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (centeredRef.current || viewport.w === 0 || viewport.h === 0) return;
    centeredRef.current = true;
    setView(centeredView(1, focusId ?? runningId));
  }, [viewport.w, viewport.h, graph.marginX, graph.marginY, graph.contentW, graph.contentH]);
  const backToTree = () => setView(centeredView());
  const resetScale = () => setView(centeredView(1, focusId ?? runningId));
  const fitToWidth = () => {
    if (viewport.w <= 0) return;
    setView(centeredView(Math.min(1, Math.max(0.3, (viewport.w - 44) / graph.contentW))));
  };
  (0, import_react.useEffect)(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (event) => {
      const target = event.target;
      if (target && typeof target.closest === "function" && target.closest('textarea, input, select, [contenteditable="true"]')) {
        return;
      }
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const cur = viewRef.current;
      const next = Math.min(2.5, Math.max(0.25, cur.s * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
      if (next === cur.s) return;
      const cx = (px - cur.x) / cur.s;
      const cy = (py - cur.y) / cur.s;
      setView({ s: next, x: px - cx * next, y: py - cy * next });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const drag = (0, import_react.useRef)({ active: false, px: 0, py: 0, x: 0, y: 0 });
  const onPointerDown = (event) => {
    const target = event.target;
    if (target && typeof target.closest === "function" && target.closest('[data-editing="true"]')) {
      dragged.current = false;
      drag.current.active = false;
      return;
    }
    const cur = viewRef.current;
    drag.current = { active: true, px: event.clientX, py: event.clientY, x: cur.x, y: cur.y };
    dragged.current = false;
  };
  const onPointerMove = (event) => {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.px;
    const dy = event.clientY - drag.current.py;
    if (!dragged.current && Math.abs(dx) + Math.abs(dy) < 6) return;
    dragged.current = true;
    setView((cur) => ({ ...cur, x: drag.current.x + dx, y: drag.current.y + dy }));
  };
  const onPointerUp = () => {
    drag.current.active = false;
  };
  const toggle = (id) => {
    if (dragged.current) return;
    setTouched(true);
    setSelected((prev) => prev === id ? null : id);
  };
  const focusedRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (selected === focusedRef.current) return;
    focusedRef.current = selected;
    if (!selected) return;
    setView(centeredView(1, selected));
  }, [selected, graph]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-graphbox", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-hint", children: "\u6EDA\u8F6E\u7F29\u653E \xB7 \u62D6\u52A8\u5E73\u79FB \xB7 \u70B9\u5361\u7247\u653E\u5927\uFF0B\u770B\u8BE6\u60C5\uFF08\u518D\u70B9\u4E00\u6B21\u3001\u70B9\u8BE6\u60C5\u7A7A\u767D\u6216\u6309\u300C\u6536\u8D77\u300D\u7F29\u56DE\uFF09" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-tools", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ztt-iconbtn", title: "\u56DE\u5230\u6811", onClick: backToTree, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconLocate, {}) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ztt-iconbtn", title: "\u9002\u5E94\u5BBD\u5EA6", onClick: fitToWidth, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconFit, {}) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ztt-iconbtn", title: "\u539F\u59CB\u5927\u5C0F", onClick: resetScale, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconActual, {}) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: "ztt-wrap",
        ref: wrapRef,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerLeave: onPointerUp,
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "ztt-inner",
            style: {
              width: graph.width,
              height: graph.height,
              transform: "translate(" + view.x + "px," + view.y + "px) scale(" + view.s + ")"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { className: "ztt-edges", width: graph.width, height: graph.height, children: [
                graph.edges.map((edge) => {
                  const on = activeIds.has(edge.childId) && activeIds.has(edge.parentId);
                  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { className: "ztt-edge" + (on ? " ztt-edge-on" : ""), d: edge.d }, edge.key);
                }),
                (graph.derived || []).map((edge) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { className: "ztt-edge-derived", d: edge.d }, edge.key))
              ] }),
              (graph.labels || []).map((label) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ztt-treelabel", style: { left: label.x, top: label.y }, children: label.text }, label.id)),
              graph.placed.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                NodeCard,
                {
                  node: item.node,
                  x: item.x,
                  y: item.y,
                  width: item.w,
                  focus: item.node.id === focusId,
                  on: item.node.id === runningId,
                  open: openSet.has(item.id),
                  onToggle: toggle,
                  sessionId,
                  onChanged,
                  runningId,
                  derivedFrom: item.node.from ? titleById.get(item.node.from) || item.node.from : "",
                  setRef: (el) => {
                    if (el) cardRefs.current.set(item.node.id, el);
                    else cardRefs.current.delete(item.node.id);
                  }
                },
                item.id
              ))
            ]
          }
        )
      }
    )
  ] });
}
function TaskTreeTab(props) {
  const sessionId = props && props.sessionId;
  const [state, setState] = (0, import_react.useState)({ loading: true, tree: null, mode: "", error: null });
  const [tick, setTick] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    ensureStyle();
  }, []);
  (0, import_react.useEffect)(() => {
    let alive = true;
    setState((prev) => ({ ...prev, loading: !prev.tree, error: null }));
    const url = api(ROUTE + "/tree?sessionId=" + encodeURIComponent(String(sessionId || "")));
    fetch(url, { headers: { accept: "application/json" } }).then(async (res) => ({ res, data: await res.json().catch(() => null) })).then(({ res, data }) => {
      if (!alive) return;
      if (!res.ok || !data || data.ok === false) {
        setState({ loading: false, tree: null, mode: "", error: data && data.error || "HTTP " + res.status });
        return;
      }
      setState({ loading: false, tree: data.tree || null, mode: data.mode || "", error: null });
    }).catch((error) => {
      if (!alive) return;
      setState({ loading: false, tree: null, mode: "", error: String(error && error.message || error) });
    });
    return () => {
      alive = false;
    };
  }, [sessionId, tick]);
  const refresh = (0, import_react.useCallback)(() => setTick((n) => n + 1), []);
  if (state.loading) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ztt-root", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ztt-note", children: "\u8BFB\u53D6\u4E2D\u2026" }) });
  }
  if (state.error !== null) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-root", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "ztt-error", children: [
        "\u8BFB\u53D6\u5931\u8D25\uFF1A",
        state.error
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ztt-textbtn", onClick: refresh, children: "\u91CD\u8BD5" }) })
    ] });
  }
  if (state.mode !== "" && state.mode !== "evolve") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-root", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ztt-note", children: "\u672C\u4F1A\u8BDD\u4E0D\u662F\u8FDB\u5316\u6A21\u5F0F\uFF1A\u4EFB\u52A1\u6811\u4E0E\u5BF9\u9F50\u680F\u53EA\u5728\u8FDB\u5316\u6A21\u5F0F\u91CC\u7528\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ztt-textbtn", onClick: refresh, children: "\u5237\u65B0" }) })
    ] });
  }
  if (state.tree === null) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-root", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "ztt-note", children: "\u672C\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u4EFB\u52A1\u6811\u3002\u8981\u628A\u4EFB\u52A1\u6446\u6210\u65B9\u5411\u56FE\u65F6\uFF0C\u8DDF\u6211\u8BF4\u4E00\u58F0\u300C\u7ACB\u68F5\u6811\u300D\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ztt-textbtn", onClick: refresh, children: "\u5237\u65B0" }) })
    ] });
  }
  const tree = state.tree;
  const roots = Array.isArray(tree.roots) && tree.roots.length > 0 ? tree.roots : tree.root ? [tree.root] : [];
  const currentRoot = roots.find((r) => tree.root && r.id === tree.root.id) || roots[0] || null;
  const dropped = tree.dropped || [];
  const unplaced = tree.unplaced || [];
  const runningId = String(tree.runningId || "") || (currentRoot ? runningNodeId(currentRoot) : "") || (roots[0] ? runningNodeId(roots[0]) : "");
  const stats = roots.reduce((acc, r) => {
    const one = treeStats(r, runningId);
    return {
      running: acc.running + one.running,
      queued: acc.queued + one.queued,
      done: acc.done + one.done,
      obsolete: acc.obsolete + one.obsolete,
      dropped: acc.dropped + one.dropped,
      total: acc.total + one.total
    };
  }, { running: 0, queued: 0, done: 0, obsolete: 0, dropped: 0, total: 0 });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ztt-head", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-headline", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-roottitle", title: roots.map((r) => r.title).join(" \uFF0B "), children: roots.length > 1 ? `${roots.length} \u68F5\u6811\u5E76\u5217` : currentRoot ? currentRoot.title : "\uFF08\u672C\u4F1A\u8BDD\u8FD8\u6CA1\u7ACB\u6811\uFF09" }),
      roots.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ztt-stat", children: [
        stats.running,
        " \u8FD0\u884C\u4E2D \xB7 ",
        stats.queued,
        " \u6392\u961F\u4E2D \xB7 ",
        stats.done,
        " \u5DF2\u5B9A \xB7 ",
        stats.obsolete,
        " \u5DF2\u5E9F \xB7 \u5171 ",
        stats.total,
        " \u9879"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ztt-iconbtn", title: "\u5237\u65B0", onClick: refresh, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconRefresh, {}) })
    ] }) }),
    roots.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TreeGraph, { roots, currentRootId: tree.root ? tree.root.id : "", runningId, sessionId, onChanged: refresh }),
    (dropped.length > 0 || unplaced.length > 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ztt-foot", children: [
      dropped.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ztt-footitem", children: [
        "\u5DF2\u5426 ",
        dropped.length,
        " \u9879\uFF1A",
        dropped.map((item) => item.title).join("\uFF5C")
      ] }),
      unplaced.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "ztt-footitem", children: [
        "\u672A\u5F52\u4F4D ",
        unplaced.length,
        " \u9879\uFF1A",
        unplaced.map((item) => item.title).join("\u3001")
      ] })
    ] })
  ] });
}
function TaskTreeTitle() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u4EFB\u52A1\u6811" });
}
function IconRefresh() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20.5 11.5a8.5 8.5 0 1 0-2.4 5.7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20.5 5.5v6h-6" })
      ]
    }
  );
}
function IconLocate() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "6.5" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" })
      ]
    }
  );
}
function IconFit() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 12h16" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 8l-4 4 4 4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M16 8l4 4-4 4" })
      ]
    }
  );
}
function IconActual() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "4", y: "4", width: "16", height: "16", rx: "3" })
    }
  );
}
function TreeGlyph({ size = 22, className }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.6",
      strokeLinecap: "round",
      className,
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "5", r: "2.4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "6", cy: "18", r: "2.4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "18", cy: "18", r: "2.4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 7.4v3.1M12 10.5H6v5.1M12 10.5h6v5.1" })
      ]
    }
  );
}
var inject = ["slots"];
var DIAG = { type: "\u7B49\u5F85\u670D\u52A1", seats: 0 };
function diagText() {
  return "\u3000\u3010" + (DIAG.type === "ok" ? "\u7C7B\u578B\u2713" : "\u7C7B\u578B\u2717" + DIAG.type) + " \u5EA7\u4F4D" + (DIAG.seats > 0 ? "\u2713" + DIAG.seats : "\u2717") + "\u3011";
}
var TAB_DEFINITION = {
  id: TAB_ID,
  kind: TAB_KIND,
  priority: "extension",
  title: () => "\u4EFB\u52A1\u6811",
  guide: [{
    id: "current-session",
    order: GUIDE_ORDER,
    title: () => "\u4EFB\u52A1\u6811",
    description: () => "\u770B\u672C\u4F1A\u8BDD\u7684\u65B9\u5411\u56FE\uFF1A\u505A\u5230\u54EA\uFF0F\u66FF\u8C01\u505A\uFF0F\u65C1\u8FB9\u8FD8\u6709\u54EA\u51E0\u4EF6" + diagText(),
    icon: TreeGlyph
  }]
};
function apply(ctx) {
  ensureStyle();
  const registerType = () => {
    try {
      const tabs = typeof ctx.get === "function" ? ctx.get("sidebarRightTabs") : void 0;
      if (!tabs || typeof tabs.register !== "function") return false;
      tabs.register(TAB_DEFINITION);
      DIAG.type = "ok";
      return true;
    } catch (error) {
      DIAG.type = String(error && error.message || error).slice(0, 32);
      return true;
    }
  };
  if (!registerType()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (registerType() || tries > 600) clearInterval(timer);
    }, 500);
    try {
      if (typeof ctx.effect === "function") ctx.effect(() => () => clearInterval(timer));
    } catch {
    }
  }
  for (const key of [TAB_ID, TAB_KIND]) {
    try {
      ctx.slots.inject("sidebar.right.pane.tab", () => {
        const dispose = ctx.slots.register({
          name: "sidebar.right.pane.tab",
          key,
          inject: (sessionId) => ({ sessionId })
        }, TaskTreeTab);
        DIAG.seats += 1;
        return dispose;
      });
    } catch {
    }
  }
  for (const key of [TAB_ID, TAB_KIND]) {
    try {
      ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
        name: "sidebar.right.pane.tab.title",
        key
      }, TaskTreeTitle));
    } catch {
    }
  }
}
})();
// 画像面板
(function () {

		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/entry.jsx
var entry_exports = {};
__export(entry_exports, {
  ProfilePanel: () => ProfilePanel,
  SessionProfileToggle: () => SessionProfileToggle,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(entry_exports);
var import_react = require("react");

// src/profile-text.js
var TITLE_RE = /^#\s+(.*)$/;
var SECTION_RE = /^([一二三四五六七八九十百]+)、\s*([\s\S]*)$/;
var ITEM_RE = /^(\d+)\.(\s*)([\s\S]*)$/;
function classify(text) {
  const title = TITLE_RE.exec(text);
  if (title) return { kind: "title", body: title[1] };
  const section = SECTION_RE.exec(text);
  if (section) return { kind: "section", heading: section[1], body: section[2].trim() };
  const item = ITEM_RE.exec(text);
  if (item) return { kind: "item", num: item[1], gap: item[2], body: item[3] };
  return { kind: "text", body: text };
}
function parse(text) {
  const src = String(text ?? "");
  if (src === "") return { leading: "", paras: [], tail: "" };
  const lines = src.split("\n");
  let lead = 0;
  while (lead < lines.length && lines[lead] === "") lead += 1;
  if (lead === lines.length) return { leading: src, paras: [], tail: "" };
  const blocks = [];
  let cur = null;
  let blanks = 0;
  for (let i = lead; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === "") {
      if (cur) blanks += 1;
      continue;
    }
    const startsBlock = TITLE_RE.test(line) || SECTION_RE.test(line) || ITEM_RE.test(line);
    if (cur === null) {
      cur = { lines: [line], blanks: 0 };
    } else if (startsBlock || blanks > 0) {
      cur.blanks = blanks;
      blocks.push(cur);
      cur = { lines: [line], blanks: 0 };
    } else {
      cur.lines.push(line);
    }
    blanks = 0;
  }
  if (cur) {
    cur.blanks = blanks;
    blocks.push(cur);
  }
  const paras = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const isLast = i === blocks.length - 1;
    const raw = block.lines.join("\n");
    paras.push({ text: raw, after: isLast ? "" : "\n".repeat(block.blanks + 1), ...classify(raw) });
  }
  const tail = "\n".repeat(blocks[blocks.length - 1].blanks);
  const seps = paras.map((p) => p.after).filter((s) => s !== "");
  paras.compact = seps.length > 0 && seps.filter((s) => s === "\n").length > seps.length / 2;
  return { leading: "\n".repeat(lead), paras, tail };
}
function serialize(doc) {
  const paras = doc.paras || [];
  let out = doc.leading || "";
  for (const para of paras) out += para.text + (para.after || "");
  out += doc.tail || "";
  return out;
}
function gap(paras) {
  return paras.compact ? "\n" : "\n\n";
}
function detach(paras, index) {
  const para = paras[index];
  const prev = paras[index - 1];
  if (prev) prev.after = index === paras.length - 1 ? "" : para.after || gap(paras);
  paras.splice(index, 1);
  return para;
}
function insertAfter(paras, at, para) {
  if (at < 0) {
    if (paras.length > 0 && !paras[0].after) paras[0].after = gap(paras);
    if (paras.length > 0) para.after = para.after || gap(paras);
    paras.unshift(para);
    return 0;
  }
  const prev = paras[at];
  const wasLast = at === paras.length - 1;
  const sep = wasLast ? gap(paras) : prev.after || gap(paras);
  prev.after = sep;
  para.after = wasLast ? "" : sep;
  paras.splice(at + 1, 0, para);
  return at + 1;
}
function titleIndex(paras) {
  return paras.findIndex((p) => p.kind === "title");
}
function docTitle(paras) {
  const i = titleIndex(paras);
  return i >= 0 ? paras[i].body : "";
}
function setTitle(paras, title) {
  const i = titleIndex(paras);
  const next = title.trim();
  if (i >= 0) {
    paras[i].text = `# ${next}`;
    paras[i].body = next;
  } else {
    paras.unshift({ text: `# ${next}`, after: paras.length ? "\n\n" : "", kind: "title", body: next });
  }
  return paras;
}
function sections(paras) {
  const out = [];
  let current = null;
  paras.forEach((para, index) => {
    if (para.kind === "section") {
      current = { index, heading: para.heading, title: para.body, items: [], texts: [], end: index };
      out.push(current);
      return;
    }
    if (!current) return;
    current.end = index;
    if (para.kind === "item") current.items.push({ index, num: para.num, gap: para.gap, body: para.body });
    else if (para.kind === "text") current.texts.push({ index, body: para.body });
  });
  return out;
}
function countEntries(paras) {
  return paras.reduce((n, p) => p.kind === "item" ? n + 1 : n, 0);
}
function preamble(paras) {
  const first = paras.findIndex((p) => p.kind === "section");
  const end = first >= 0 ? first : paras.length;
  const out = [];
  for (let i = 0; i < end; i += 1) {
    if (paras[i].kind === "text") out.push({ index: i, body: paras[i].body });
  }
  return out;
}
function setItemBody(para, body) {
  const gap2 = para.gap === void 0 ? " " : para.gap;
  para.body = body;
  para.text = `${para.num}.${gap2}${body}`;
  return para;
}
function setTextBody(para, body) {
  para.body = body;
  para.text = body;
  return para;
}
function renumberSection(paras, sectionIndex) {
  const sec = sections(paras).find((s) => s.index === sectionIndex);
  if (!sec) return paras;
  const gap2 = sec.items.length > 0 ? sec.items[0].gap : " ";
  sec.items.forEach((entry, i) => {
    const para = paras[entry.index];
    para.num = String(i + 1);
    para.gap = gap2;
    para.text = `${para.num}.${gap2}${para.body}`;
  });
  return paras;
}
function addItem(paras, sectionIndex, body, gapStyle = " ", atStart = false) {
  const sec = sections(paras).find((s) => s.index === sectionIndex);
  if (!sec) return -1;
  const at = atStart ? sec.index : sec.items.length > 0 ? sec.items[sec.items.length - 1].index : sec.end;
  const para = { text: `1.${gapStyle}${body}`, after: "", kind: "item", num: "1", gap: gapStyle, body };
  const index = insertAfter(paras, at, para);
  renumberSection(paras, sectionIndex);
  return index;
}
function removeItem(paras, index) {
  const para = paras[index];
  if (!para || para.kind !== "item") return paras;
  const owner = sections(paras).find((s) => s.items.some((e) => e.index === index));
  detach(paras, index);
  if (owner) renumberSection(paras, owner.index);
  return paras;
}
function removeParagraph(paras, index) {
  const para = paras[index];
  if (!para || para.kind !== "text") return paras;
  detach(paras, index);
  return paras;
}
function moveItem(paras, index, delta) {
  const owner = sections(paras).find((s) => s.items.some((e) => e.index === index));
  if (!owner) return index;
  const pos = owner.items.findIndex((e) => e.index === index);
  const target = pos + delta;
  if (target < 0 || target >= owner.items.length) return index;
  const other = owner.items[target].index;
  const a = paras[index];
  const b = paras[other];
  for (const key of ["text", "kind", "num", "gap", "body"]) {
    const tmp = a[key];
    a[key] = b[key];
    b[key] = tmp;
  }
  renumberSection(paras, owner.index);
  return other;
}
function moveItemToSection(paras, index, targetSectionIndex) {
  const owner = sections(paras).find((s) => s.items.some((e) => e.index === index));
  const targetHeading = paras[targetSectionIndex];
  if (!owner || owner.index === targetSectionIndex || !targetHeading) return -1;
  const ownerHeading = paras[owner.index];
  const para = detach(paras, index);
  const target = sections(paras).find((s) => paras[s.index] === targetHeading);
  if (!target) return -1;
  const at = target.items.length > 0 ? target.items[target.items.length - 1].index : target.end;
  const moved = insertAfter(paras, at, para);
  const ownerNow = sections(paras).find((s) => paras[s.index] === ownerHeading);
  if (ownerNow) renumberSection(paras, ownerNow.index);
  renumberSection(paras, target.index);
  return moved;
}
function stats(paras) {
  const chars = paras.reduce((n, p) => n + Array.from(p.text).length, 0);
  return { chars, entries: countEntries(paras), sections: sections(paras).length };
}

// src/entry.jsx
var import_jsx_runtime = require("react/jsx-runtime");
function api(path) {
  const relative = String(path).replace(/^\/+/, "");
  if (typeof document === "undefined") return "/" + relative;
  const url = new URL(relative, document.baseURI);
  return url.pathname + url.search;
}
async function getJson(path) {
  const res = await fetch(api(path), { headers: { accept: "application/json" } });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.ok === false) throw new Error(data && data.error || "HTTP " + res.status);
  return data;
}
async function postJson(path, body) {
  const res = await fetch(api(path), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.ok === false) throw new Error(data && data.error || "HTTP " + res.status);
  return data;
}
function friendlyHostError(e) {
  const s = String(e && e.message || e);
  if (s.indexOf("HTTP 404") !== -1) return "\u5BBF\u4E3B\u8FD8\u6CA1\u52A0\u8F7D\u65B0\u8DEF\u7531\uFF08HTTP 404\uFF09\uFF1A\u91CD\u542F dsh \u540E\u518D\u8FDB\u8FD9\u4E00\u9875";
  return s;
}
var API = "/dsh-profile-panel/api";
var CSS = `
.pp-root, .pp-root * { box-sizing:border-box; }
.pp-root { display:flex; gap:26px; align-items:flex-start; width:100%; font-size:13px; line-height:1.55;
  color:var(--dsw-alias-label-primary); }
.pp-roster { flex:0 0 190px; display:flex; flex-direction:column; gap:1px; }
.pp-grouplabel { margin:16px 0 5px 10px; font-size:11px; color:var(--dsw-alias-label-secondary); }
.pp-grouplabel:first-child { margin-top:2px; }
.pp-row { display:flex; align-items:center; gap:2px; width:100%;
  padding:0 6px 0 0; border:0; border-radius:6px; background:none; color:inherit;
  font:inherit; text-align:left; }
.pp-row:hover { background:var(--dsw-alias-bg-layer-1); }
.pp-row[aria-current="true"] { background:var(--dsw-alias-bg-layer-2); }
.pp-row[aria-current="true"] .pp-rowmain { font-weight:600; }
.pp-rowmain { flex:1 1 auto; min-width:0; display:flex; justify-content:space-between; align-items:center; gap:8px;
  padding:5px 6px 5px 10px; border:0; border-radius:6px; background:none; color:inherit;
  font:inherit; text-align:left; cursor:pointer; }
.pp-rowdel { flex:0 0 auto; padding:0 3px; border:0; background:none; color:var(--dsw-alias-label-secondary);
  font:inherit; font-size:13px; line-height:1; cursor:pointer; opacity:0; }
.pp-row:hover .pp-rowdel, .pp-row[aria-current="true"] .pp-rowdel { opacity:.6; }
.pp-rowdel:hover { color:var(--dsw-alias-state-error-primary); opacity:1; }
.pp-rname { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-rnum { font-size:11px; font-weight:400; color:var(--dsw-alias-label-secondary); }
.pp-newlayer { display:flex; flex-direction:column; gap:5px; padding:4px 6px; }
.pp-newlayerbtn { margin:2px 4px; padding:2px 0; text-align:left; }
.pp-pane { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:12px; }
.pp-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
.pp-titlewrap { min-width:0; }
.pp-titlebtn { display:block; margin:0; padding:0; border:0; border-radius:4px; background:none; color:inherit;
  font:inherit; font-size:15px; font-weight:600; line-height:1.3; text-align:left; cursor:pointer; }
.pp-titlebtn:hover { text-decoration:underline dotted var(--dsw-alias-border-l2); text-underline-offset:3px; }
.pp-titleinput { width:260px; max-width:100%; padding:2px 6px; border:1px solid var(--dsw-alias-border-l1);
  border-radius:6px; background:var(--dsw-alias-bg-base); color:inherit; font:inherit; font-size:15px; font-weight:600; }
.pp-titleinput:focus { outline:none; border-color:var(--dsw-alias-brand-primary); }
.pp-sub { margin:3px 0 0; font-size:12px; color:var(--dsw-alias-label-secondary); word-break:break-all; }
.pp-headacts { display:flex; gap:14px; align-items:center; padding-top:3px; }
.pp-link { padding:0; border:0; background:none; color:var(--dsw-alias-label-primary);
  font:inherit; font-size:12px; cursor:pointer; white-space:nowrap; }
.pp-link.primary { color:var(--dsw-alias-brand-primary); }
.pp-link.danger { color:var(--dsw-alias-state-error-primary); }
.pp-link:disabled { opacity:.45; cursor:default; }
.pp-toolbar { display:flex; gap:14px; align-items:center; border-bottom:1px solid var(--dsw-alias-border-l1);
  padding-bottom:6px; }
.pp-search { flex:1 1 auto; min-width:0; padding:3px 0; border:0;
  border-bottom:1px solid var(--dsw-alias-border-l1); background:none; color:inherit;
  font:inherit; font-size:12px; }
.pp-search:focus { outline:none; border-bottom-color:var(--dsw-alias-brand-primary); }
.pp-tabs { display:flex; flex:0 0 auto; border:1px solid var(--dsw-alias-border-l1); border-radius:6px; overflow:hidden; }
.pp-tab { padding:2px 9px; border:0; background:none; color:inherit; font:inherit; font-size:11px; cursor:pointer; }
.pp-tab + .pp-tab { border-left:1px solid var(--dsw-alias-border-l1); }
.pp-tab[aria-selected="true"] { background:var(--dsw-alias-bg-layer-2); font-weight:500; }
.pp-list { display:flex; flex-direction:column; border:1px solid var(--dsw-alias-border-l1);
  border-radius:8px; overflow:hidden; background:var(--dsw-alias-bg-base); }
.pp-sec { display:flex; justify-content:space-between; align-items:center; gap:8px; width:100%;
  padding:8px 10px; border-top:1px solid var(--dsw-alias-border-l1);
  border-bottom:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary);
  font:inherit; font-size:14px; font-weight:700; letter-spacing:0; }
.pp-sec:first-child { border-top:0; }
.pp-secbtn { flex:1 1 auto; min-width:0; display:flex; align-items:center; gap:6px; padding:0; border:0;
  background:none; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.pp-secbtn:hover { color:var(--dsw-alias-brand-primary); }
.pp-secright { display:flex; align-items:center; gap:8px; }
.pp-seccount { font-size:11px; font-weight:400; padding:0 6px; border-radius:999px;
  background:var(--dsw-alias-bg-layer-1); letter-spacing:0; color:var(--dsw-alias-label-secondary); }
.pp-secadd { width:22px; height:22px; padding:0; border:1px solid var(--dsw-alias-border-l1);
  border-radius:4px; background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-secondary);
  font:inherit; font-size:14px; line-height:20px; text-align:center; cursor:pointer; }
.pp-wsopt { display:flex; align-items:center; gap:8px; padding:3px 0; font-size:12px; cursor:pointer; }
.pp-wsname { flex:0 1 auto; max-width:46%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-wspath { flex:1 1 auto; min-width:0; font-size:11px; color:var(--dsw-alias-label-secondary);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-secadd:hover { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); }
.pp-item { position:relative; display:flex; flex-direction:column; border-bottom:1px solid var(--dsw-alias-border-l1); }
.pp-item:last-child { border-bottom:0; }
.pp-itemmain { display:flex; gap:8px; width:100%; padding:5px 64px 5px 10px; border:0;
  background:none; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.pp-itemmain:hover { background:var(--dsw-alias-bg-layer-1); }
.pp-itemmain.open { background:var(--dsw-alias-bg-layer-1); }
.pp-num { flex:0 0 24px; padding:1px 8px 0 0; margin-right:2px; text-align:right;
  border-right:1px solid var(--dsw-alias-border-l1); font-size:11px; color:var(--dsw-alias-label-secondary); }
.pp-text { flex:1 1 auto; min-width:0; font-size:13px; line-height:1.6; white-space:pre-wrap;
  word-break:break-word; }
.pp-pre { display:flex; flex-direction:column; border:1px solid var(--dsw-alias-border-l1);
  border-radius:8px; overflow:hidden; background:var(--dsw-alias-bg-base); margin-bottom:10px; }
.pp-prehead { padding:7px 10px; border-bottom:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-2); font-size:12px; font-weight:700; }
.pp-quick { position:absolute; right:8px; top:2px; display:none; gap:10px; align-items:center; padding:3px 6px;
  border-radius:4px; background:var(--dsw-alias-bg-base); }
.pp-item:hover .pp-quick { display:flex; }
.pp-quick .pp-link { font-size:11px; color:var(--dsw-alias-label-secondary); }
.pp-quick .pp-link:hover { color:var(--dsw-alias-label-primary); }
.pp-itemacts { display:flex; gap:14px; align-items:center; padding:0 10px 8px 42px; }
.pp-itemacts .pp-link { font-size:11px; color:var(--dsw-alias-label-secondary); }
.pp-itemacts .pp-link:hover { color:var(--dsw-alias-label-primary); }
.pp-card { display:flex; flex-direction:column; gap:8px; margin:4px 0 10px 30px; padding:10px 12px;
  border:1px solid var(--dsw-alias-border-l1); border-radius:8px; background:var(--dsw-alias-bg-layer-1); }
.pp-textarea { width:100%; box-sizing:border-box; min-height:110px; padding:8px 10px;
  border:1px solid var(--dsw-alias-border-l1); border-radius:6px; background:var(--dsw-alias-bg-base);
  color:inherit; font:inherit; font-size:13px; line-height:1.7; resize:vertical; }
.pp-textarea:focus { outline:none; border-color:var(--dsw-alias-brand-primary); }
.pp-raw { min-height:420px; }
.pp-cardrow { display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-size:12px; }
.pp-cardrow label { display:flex; gap:6px; align-items:center; }
.pp-select { padding:4px 8px; border:1px solid var(--dsw-alias-border-l1); border-radius:6px;
  background:var(--dsw-alias-bg-base); color:inherit; font:inherit; font-size:12px; }
.pp-btn { padding:4px 12px; border:1px solid var(--dsw-alias-border-l1); border-radius:6px;
  background:var(--dsw-alias-bg-base); color:inherit; font:inherit; font-size:13px; cursor:pointer; }
.pp-btn:hover:not(:disabled) { border-color:var(--dsw-alias-brand-primary); }
.pp-btn.primary { border-color:var(--dsw-alias-brand-primary); background:var(--dsw-alias-brand-primary); color:#fff; }
.pp-btn:disabled { opacity:.45; cursor:default; }
.pp-btn.small { padding:2px 9px; font-size:12px; }
.pp-btn.danger { color:var(--dsw-alias-state-error-primary); }
.pp-hint { margin:0; font-size:12px; line-height:1.6; color:var(--dsw-alias-label-primary); }
.pp-error { font-size:12px; color:var(--dsw-alias-state-error-primary); }
.pp-confirm { display:flex; flex-direction:column; gap:6px; margin-top:2px; padding:8px 10px;
  border:1px solid var(--dsw-alias-state-error-primary); border-radius:6px;
  background:var(--dsw-alias-bg-layer-1); font-size:11px; line-height:1.7; }
.pp-confirm-title { font-size:12px; font-weight:600; }
.pp-confirmrow { display:flex; gap:10px; align-items:center; }
.pp-footer { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;
  border-top:1px solid var(--dsw-alias-border-l1); padding-top:8px; }
.pp-path { font-size:11px; color:var(--dsw-alias-label-secondary); word-break:break-all; }
.pp-badge { font-size:11px; padding:0 6px; border-radius:999px; background:var(--dsw-alias-bg-layer-2); }
.pp-badge.dirty { color:var(--dsw-alias-state-error-primary); }

.pp-settings { display:flex; flex-direction:column; gap:10px; max-width:640px; }
.pp-h { margin:0; padding:0 0 6px; border-bottom:1px solid var(--dsw-alias-border-l1);
  font-size:12px; font-weight:700; color:var(--dsw-alias-label-primary); letter-spacing:.02em; }
.pp-sect { margin:12px 0 0; font-size:12px; color:var(--dsw-alias-label-primary); }
.pp-sgrid, .pp-srow { display:grid; grid-template-columns:84px minmax(0,1fr); gap:12px; align-items:center; }
.pp-srow-top { align-items:start; }
.pp-slabel { font-size:12px; color:var(--dsw-alias-label-primary); white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis; line-height:1.6; }
.pp-srow-top .pp-slabel { padding-top:7px; }
.pp-sfield { display:flex; align-items:center; gap:8px; min-width:0; }
.pp-sfield-col { flex-direction:column; align-items:stretch; gap:5px; }
.pp-check { display:flex; align-items:center; gap:4px; min-width:0; font-size:12px;
  color:var(--dsw-alias-label-primary); }
.pp-check input { flex:0 0 auto; }
.pp-checkname { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-area { width:100%; box-sizing:border-box; min-height:44px; resize:vertical; padding:6px 8px;
  border:1px solid var(--dsw-alias-border-l1); border-radius:6px; background:var(--dsw-alias-bg-base);
  color:var(--dsw-alias-label-primary); font-family:inherit; font-size:13px; line-height:1.6; }
.pp-area:focus { outline:none; border-color:var(--dsw-alias-brand-primary); }
.pp-numinput { width:96px; }
.pp-unit { font-size:12px; color:var(--dsw-alias-label-primary); }
.pp-input { width:140px; max-width:100%; padding:5px 8px; border:1px solid var(--dsw-alias-border-l1);
  border-radius:6px; background:var(--dsw-alias-bg-base); color:inherit; font:inherit; font-size:13px; }
.pp-input.wide { width:100%; box-sizing:border-box; }
.pp-input:focus { outline:none; border-color:var(--dsw-alias-brand-primary); }
.pp-inline { display:flex; gap:8px; align-items:center; font-size:12px; }
.pp-chips { display:flex; flex-wrap:wrap; gap:6px 14px; align-items:center; }
.pp-chip { display:flex; gap:5px; align-items:center; font-size:12px; }
.pp-wsline { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:5px; }
.pp-rlabel { font-size:12px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }
.pp-wscombo { position:relative; display:inline-flex; align-items:center; }
.pp-wsbtn { display:inline-flex; align-items:center; gap:6px; max-width:420px; padding:2px 8px;
  border:1px solid var(--dsw-alias-border-l1); border-radius:6px; background:var(--dsw-alias-bg-base);
  color:inherit; font:inherit; font-size:12px; cursor:pointer; }
.pp-wsbtn:hover { border-color:var(--dsw-alias-brand-primary); }
.pp-wssummary { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pp-wsdropdown { position:absolute; top:100%; left:0; z-index:30; width:320px; max-height:260px; overflow:auto;
  margin-top:4px; padding:6px; display:flex; flex-direction:column; gap:2px;
  border:1px solid var(--dsw-alias-border-l1); border-radius:8px; background:var(--dsw-alias-bg-base);
  box-shadow:0 8px 24px rgba(0,0,0,.16); }
.pp-lock { font-size:11px; color:var(--dsw-alias-label-primary); padding:0 2px; }
.pp-sfooter { display:flex; gap:10px; align-items:center; flex-wrap:wrap;
  border-top:1px solid var(--dsw-alias-border-l1); padding-top:10px; }
.pp-empty { padding:14px 2px; font-size:12px; color:var(--dsw-alias-label-secondary); }
.pp-toolbar .pp-link { font-size:11px; }
`;
var INITIAL_DOC = {
  loading: false,
  error: null,
  content: "",
  draft: "",
  saving: false,
  saveError: null,
  savedAt: null,
  path: ""
};
function charsOf(text) {
  return Array.from(String(text || "")).length;
}
function workspaceCandidates(list) {
  const out = [];
  for (const ws of list || []) {
    const path = String(ws.path || "");
    if (!path) continue;
    const title = String(ws.title || "");
    out.push({ path, title, label: title ? `${title}\uFF08${path}\uFF09` : path });
  }
  return out;
}
function GrowTextarea(props) {
  const ref = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight + 2, 460) + "px";
  }, [props.value]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { ref, ...props });
}
function ProfilePanel() {
  const [roster, setRoster] = (0, import_react.useState)({ status: "loading", error: null, home: "", profiles: [], settings: null });
  const [activeId, setActiveId] = (0, import_react.useState)("general");
  const [docs, setDocs] = (0, import_react.useState)({});
  const [view, setView] = (0, import_react.useState)("entries");
  const [filter, setFilter] = (0, import_react.useState)("");
  const [collapsed, setCollapsed] = (0, import_react.useState)({});
  const [expanded, setExpanded] = (0, import_react.useState)(null);
  const [editing, setEditing] = (0, import_react.useState)(null);
  const [nameEditing, setNameEditing] = (0, import_react.useState)(false);
  const [nameDraft, setNameDraft] = (0, import_react.useState)("");
  const [creating, setCreating] = (0, import_react.useState)(false);
  const [newName, setNewName] = (0, import_react.useState)("");
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [deleteProfile, setDeleteProfile] = (0, import_react.useState)(false);
  const [deleteEntry, setDeleteEntry] = (0, import_react.useState)(false);
  const [settingsDraft, setSettingsDraft] = (0, import_react.useState)(null);
  const [settingsSaved, setSettingsSaved] = (0, import_react.useState)(false);
  const [settingsError, setSettingsError] = (0, import_react.useState)(null);
  const [savingSettings, setSavingSettings] = (0, import_react.useState)(false);
  const [presets, setPresets] = (0, import_react.useState)([]);
  const [presetsNote, setPresetsNote] = (0, import_react.useState)("");
  const [workspaces, setWorkspaces] = (0, import_react.useState)([]);
  const [workspacesNote, setWorkspacesNote] = (0, import_react.useState)("");
  const [wsOpen, setWsOpen] = (0, import_react.useState)(false);
  const [bindSaving, setBindSaving] = (0, import_react.useState)(false);
  const [bindError, setBindError] = (0, import_react.useState)(null);
  const doc = docs[activeId] || INITIAL_DOC;
  const profile = roster.profiles.find((p) => p.id === activeId) || null;
  const parsed = doc.error ? null : parse(doc.draft);
  const secs = parsed ? sections(parsed.paras) : [];
  const st = parsed ? stats(parsed.paras) : { chars: 0, entries: 0, sections: 0 };
  const dirty = doc.draft !== doc.content;
  const maxChars = roster.settings ? roster.settings.maxChars : 0;
  const patchDoc = (id, patch) => {
    setDocs((cur) => ({ ...cur, [id]: { ...cur[id] || INITIAL_DOC, ...patch } }));
  };
  const loadRoster = async () => {
    setRoster((cur) => ({ ...cur, status: "loading", error: null }));
    try {
      const data = await getJson(API + "/list");
      const profiles = Array.isArray(data.profiles) ? data.profiles : [];
      const nextActive = profiles.some((p) => p.id === activeId) ? activeId : "general";
      setRoster({ status: "ready", error: null, home: data.home || "", profiles, settings: data.settings || null });
      setActiveId(nextActive);
      setSettingsDraft(data.settings ? JSON.parse(JSON.stringify(data.settings)) : null);
      return data;
    } catch (error) {
      setRoster((cur) => ({ ...cur, status: "error", error: friendlyHostError(error) }));
      return null;
    }
  };
  const loadDoc = async (id) => {
    patchDoc(id, { loading: true, error: null });
    try {
      const data = await getJson(API + "/read?id=" + encodeURIComponent(id));
      patchDoc(id, {
        loading: false,
        content: data.content || "",
        draft: data.content || "",
        path: data.path || "",
        savedAt: null,
        saveError: null
      });
    } catch (error) {
      patchDoc(id, { loading: false, error: friendlyHostError(error) });
    }
  };
  (0, import_react.useEffect)(() => {
    void loadRoster();
  }, []);
  (0, import_react.useEffect)(() => {
    const entry = docs[activeId];
    if (entry && !entry.loading && entry.path !== "") return;
    void loadDoc(activeId);
    setExpanded(null);
    setEditing(null);
  }, [activeId]);
  (0, import_react.useEffect)(() => {
    let alive = true;
    getJson(API + "/workspaces").then((data) => {
      if (!alive) return;
      setWorkspaces(Array.isArray(data.workspaces) ? data.workspaces : []);
      setWorkspacesNote("");
    }).catch((error) => {
      if (alive) setWorkspacesNote(friendlyHostError(error));
    });
    return () => {
      alive = false;
    };
  }, []);
  (0, import_react.useEffect)(() => {
    if (view !== "settings" || presets.length > 0) return void 0;
    let alive = true;
    getJson(API + "/presets").then((data) => {
      if (!alive) return;
      setPresets(Array.isArray(data.presets) ? data.presets : []);
      setPresetsNote(data.unavailable || "");
    }).catch((error) => {
      if (alive) setPresetsNote(friendlyHostError(error));
    });
    return () => {
      alive = false;
    };
  }, [view]);
  if (roster.status === "loading") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pp-root", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pp-pane", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pp-hint", children: "\u6B63\u5728\u8BFB\u753B\u50CF\u540D\u518C\u2026" }) }) });
  }
  if (roster.status === "error") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pp-root", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-pane", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "pp-error", role: "alert", children: [
        "\u65E0\u6CD5\u8BFB\u53D6\u753B\u50CF\u540D\u518C\uFF1A",
        roster.error
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-btn", onClick: () => void loadRoster(), children: "\u91CD\u8BD5" })
    ] }) });
  }
  const general = roster.profiles.find((p) => p.kind === "general");
  const tasks = roster.profiles.filter((p) => p.kind === "task");
  const reloadActive = async (id) => {
    const data = await loadRoster();
    if (data) await loadDoc(id);
  };
  const saveDoc = async () => {
    if (doc.saving || !dirty) return;
    patchDoc(activeId, { saving: true, saveError: null });
    try {
      await postJson(API + "/write", { id: activeId, content: doc.draft });
      patchDoc(activeId, { saving: false, content: doc.draft, savedAt: Date.now(), saveError: null });
      const nextTitle = docTitle(parse(doc.draft).paras);
      setRoster((cur) => ({
        ...cur,
        profiles: cur.profiles.map((p) => p.id === activeId ? { ...p, chars: charsOf(doc.draft), title: nextTitle || p.title } : p)
      }));
    } catch (error) {
      patchDoc(activeId, { saving: false, saveError: friendlyHostError(error) });
    }
  };
  const mutateDraft = (mutate) => {
    const current = docs[activeId];
    if (!current) return;
    const docCopy = parse(current.draft);
    mutate(docCopy.paras);
    patchDoc(activeId, { draft: serialize(docCopy), saveError: null });
  };
  const setTitleInDraft = (title) => {
    const next = title.trim();
    if (!next) return;
    mutateDraft((paras) => {
      setTitle(paras, next);
    });
  };
  const startEdit = (entry, sectionIndex) => {
    setDeleteEntry(false);
    setExpanded(entry.index);
    setEditing({ ...entry, body: entry.body, sectionIndex });
  };
  const closeEditing = () => {
    setEditing(null);
    setDeleteEntry(false);
  };
  const toggleSection = (index) => {
    const next = !(collapsed[index] === true);
    setCollapsed((cur) => ({ ...cur, [index]: next }));
    if (next) {
      if (editing) closeEditing();
      setExpanded(null);
    }
  };
  const saveEdit = () => {
    if (!editing) return;
    if (editing.isNew) {
      if (!editing.body.trim()) {
        closeEditing();
        return;
      }
      const secIndex = editing.sectionIndex;
      mutateDraft((paras) => {
        addItem(paras, secIndex, editing.body.trim(), " ", true);
      });
      closeEditing();
      return;
    }
    const target = editing;
    mutateDraft((paras) => {
      const para = paras[target.index];
      if (!para) return;
      if (target.kind === "item") {
        setItemBody(para, target.body);
        const owner = sections(paras).find((s) => s.items.some((e) => e.index === target.index));
        if (owner && target.sectionIndex !== owner.index) moveItemToSection(paras, target.index, target.sectionIndex);
      } else {
        setTextBody(para, target.body);
      }
    });
    closeEditing();
  };
  const removeEntry = () => {
    if (!editing) return;
    const target = editing;
    mutateDraft((paras) => {
      if (target.kind === "item") removeItem(paras, target.index);
      else removeParagraph(paras, target.index);
    });
    closeEditing();
    setExpanded(null);
  };
  const moveEntry = (delta) => {
    if (!editing || editing.isNew) return;
    const index = editing.index;
    let next = index;
    mutateDraft((paras) => {
      next = moveItem(paras, index, delta);
    });
    setEditing((cur) => cur ? { ...cur, index: next } : cur);
    setExpanded(next);
  };
  const createTask = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const data = await postJson(API + "/create", { name });
      setCreating(false);
      setNewName("");
      await reloadActive(data.id);
    } catch (error) {
      setRoster((cur) => ({ ...cur, error: friendlyHostError(error) }));
    } finally {
      setBusy(false);
    }
  };
  const renameTask = async () => {
    const name = nameDraft.trim();
    if (!name || busy) return;
    if (!profile || profile.kind !== "task") {
      setTitleInDraft(name);
      setNameEditing(false);
      return;
    }
    setBusy(true);
    try {
      const data = await postJson(API + "/rename", { id: profile.id, name, slug: profile.id });
      setNameEditing(false);
      await reloadActive(data.id);
    } catch (error) {
      setRoster((cur) => ({ ...cur, error: friendlyHostError(error) }));
    } finally {
      setBusy(false);
    }
  };
  const removeTask = async () => {
    if (busy || !profile || profile.kind !== "task") return;
    setBusy(true);
    try {
      await postJson(API + "/delete", { id: profile.id });
      setDeleteProfile(false);
      setActiveId("general");
      await reloadActive("general");
    } catch (error) {
      setRoster((cur) => ({ ...cur, error: friendlyHostError(error) }));
    } finally {
      setBusy(false);
    }
  };
  const saveSettings = async () => {
    if (!settingsDraft || savingSettings) return;
    setSavingSettings(true);
    setSettingsError(null);
    try {
      const data = await postJson(API + "/settings", settingsDraft);
      setRoster((cur) => ({ ...cur, settings: data.settings }));
      setSettingsDraft(JSON.parse(JSON.stringify(data.settings)));
      setSettingsSaved(true);
      window.setTimeout(() => setSettingsSaved(false), 1600);
    } catch (error) {
      setSettingsError(friendlyHostError(error));
    } finally {
      setSavingSettings(false);
    }
  };
  const patchSettings = (patch) => {
    setSettingsDraft((cur) => cur ? { ...cur, ...patch } : cur);
    setSettingsSaved(false);
  };
  const boundOf = (id) => {
    const all = roster.settings && roster.settings.bindings || {};
    return Array.isArray(all[id]) ? all[id] : [];
  };
  const saveBindings = async (id, list) => {
    if (bindSaving) return;
    setBindSaving(true);
    setBindError(null);
    try {
      const all = { ...roster.settings && roster.settings.bindings || {} };
      if (list.length > 0) all[id] = list;
      else delete all[id];
      const data = await postJson(API + "/settings", { bindings: all });
      setRoster((cur) => ({ ...cur, settings: data.settings }));
      setSettingsDraft((cur) => cur ? { ...cur, bindings: data.settings.bindings } : cur);
    } catch (error) {
      setBindError(friendlyHostError(error));
    } finally {
      setBindSaving(false);
    }
  };
  const toggleBound = (id, value) => {
    const cur = boundOf(id).slice();
    const at = cur.indexOf(value);
    if (at === -1) cur.push(value);
    else cur.splice(at, 1);
    void saveBindings(id, cur);
  };
  const sectionOptions = secs.map((s) => ({ index: s.index, label: s.title || "(\u672A\u547D\u540D\u8282)" }));
  const settingsDirty = settingsDraft && roster.settings && JSON.stringify(settingsDraft) !== JSON.stringify(roster.settings);
  const matchesFilter = (body) => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return String(body || "").toLowerCase().indexOf(needle) !== -1;
  };
  const renderCard = () => {
    if (!editing) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: "pp-card",
        ref: (el) => {
          if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest" });
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            GrowTextarea,
            {
              className: "pp-textarea",
              value: editing.body,
              autoFocus: true,
              spellCheck: false,
              placeholder: editing.kind === "text" ? "\u8BF4\u660E\u6BB5\u6B63\u6587" : "\u6761\u76EE\u6B63\u6587",
              onChange: (e) => setEditing((cur) => cur ? { ...cur, body: e.target.value } : cur),
              onKeyDown: (e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeEditing();
                } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  saveEdit();
                }
              }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-cardrow", children: [
            editing.kind === "item" && editing.sectionIndex >= 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
              "\u6240\u5C5E\u8282",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "select",
                {
                  className: "pp-select",
                  value: editing.sectionIndex,
                  onChange: (e) => setEditing((cur) => cur ? { ...cur, sectionIndex: Number(e.target.value) } : cur),
                  children: sectionOptions.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: opt.index, children: opt.label }, opt.index))
                }
              )
            ] }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: "1 1 auto" } }),
            !editing.isNew && editing.kind === "item" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-link", onClick: () => moveEntry(-1), children: "\u4E0A\u79FB" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-link", onClick: () => moveEntry(1), children: "\u4E0B\u79FB" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-link danger", onClick: () => setDeleteEntry(true), children: "\u5220\u9664" })
            ] }) : null,
            !editing.isNew && editing.kind === "text" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-link danger", onClick: () => setDeleteEntry(true), children: "\u5220\u9664" }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-link", onClick: () => closeEditing(), children: "\u53D6\u6D88" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "pp-btn small primary",
                disabled: editing.kind === "item" && !String(editing.body).trim(),
                onClick: () => saveEdit(),
                children: editing.isNew ? "\u52A0\u5165" : "\u5E94\u7528"
              }
            )
          ] }),
          deleteEntry ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-confirm", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-confirm-title", children: "\u5220\u9664\u8FD9\u4E00\u6761\uFF1F" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u5220\u9664\u540E\u672C\u8282\u7F16\u53F7\u4F1A\u91CD\u6392\uFF1B\u6587\u4EF6\u4ECD\u53EF\u51ED .bak \u627E\u56DE\u3002" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-confirmrow", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-btn small danger", onClick: () => removeEntry(), children: "\u5220\u9664" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-btn small", onClick: () => setDeleteEntry(false), children: "\u53D6\u6D88" })
            ] })
          ] }) : null
        ]
      }
    );
  };
  const renderItem = (entry, sectionIndex) => {
    const isEditing = editing && !editing.isNew && editing.index === entry.index;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-item", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: "pp-itemmain",
          title: "\u70B9\u4E00\u4E0B\u7F16\u8F91",
          onClick: () => {
            if (isEditing) {
              closeEditing();
              return;
            }
            setDeleteEntry(false);
            startEdit(entry, sectionIndex);
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-num", children: entry.kind === "item" ? entry.num : "\xB7" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-text", children: entry.body })
          ]
        }
      ),
      isEditing ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-quick", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-link", onClick: () => startEdit(entry, sectionIndex), children: "\u7F16\u8F91" }) }),
      isEditing ? renderCard() : null
    ] }, "e" + entry.index);
  };
  const renderEntries = () => {
    if (!parsed) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pp-error", children: doc.error });
    if (doc.loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pp-hint", children: "\u6B63\u5728\u8BFB\u8FD9\u4EFD\u753B\u50CF\u2026" });
    const rows = [];
    if (secs.length === 0) {
      rows.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pp-empty", children: "\u8FD9\u4EFD\u753B\u50CF\u91CC\u8FD8\u6CA1\u6709\u300C\u4E00\u3001\u2026\u300D\u8FD9\u6837\u7684\u8282\u3002\u76F4\u63A5\u5728\u539F\u6587\u89C6\u56FE\u91CC\u5199\uFF08\u6807\u9898\u4E0B\u7684\u300C\u539F\u6587\u300D\uFF09\u3002" }, "empty"));
    }
    for (const sec of secs) {
      const items = sec.items.map((e) => ({ index: e.index, num: e.num, body: e.body, kind: "item", sectionIndex: sec.index }));
      const texts = sec.texts.map((e) => ({ index: e.index, body: e.body, kind: "text", sectionIndex: sec.index }));
      const entries = [...items, ...texts].sort((a, b) => a.index - b.index).filter((e) => matchesFilter(e.body));
      if (filter.trim() && entries.length === 0) continue;
      const open = filter.trim() ? true : collapsed[sec.index] !== true;
      rows.push(
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-sec", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-secbtn", onClick: () => toggleSection(sec.index), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            open ? "\u25BE " : "\u25B8 ",
            sec.title || "(\u672A\u547D\u540D\u8282)"
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-secright", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-seccount", children: entries.length }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "pp-secadd",
                title: "\u5728\u8FD9\u4E00\u8282\u52A0\u4E00\u6761",
                onClick: () => {
                  setCollapsed((cur) => ({ ...cur, [sec.index]: false }));
                  setDeleteEntry(false);
                  setExpanded(null);
                  setEditing({ isNew: true, kind: "item", body: "", sectionIndex: sec.index });
                },
                children: "\uFF0B"
              }
            )
          ] })
        ] }, "s" + sec.index)
      );
      if (editing && editing.isNew && editing.sectionIndex === sec.index) {
        rows.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Fragment, { children: renderCard() }, "new" + sec.index));
      }
      if (open) {
        for (const entry of entries) rows.push(renderItem(entry, sec.index));
      }
    }
    const preRows = preamble(parsed.paras).map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Fragment, { children: renderItem({ index: e.index, body: e.body, kind: "text", sectionIndex: -1 }, -1) }, "p" + e.index));
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      preRows.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-pre", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pp-prehead", children: "\u8FD9\u5F20\u753B\u50CF\u7BA1\u4EC0\u4E48\u4EFB\u52A1" }),
        preRows
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pp-list", children: rows })
    ] });
  };
  const renderRaw = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "textarea",
      {
        className: "pp-textarea pp-raw",
        value: doc.draft,
        spellCheck: false,
        onChange: (e) => patchDoc(activeId, { draft: e.target.value, saveError: null })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pp-hint", children: `\u8FD9\u662F\u6574\u7BC7\u539F\u6587\uFF1A\u6761\u76EE\u89C6\u56FE\u8BA4\u4E0D\u51FA\u7684\u5199\u6CD5\u5728\u8FD9\u91CC\u76F4\u63A5\u6539\u3002\u4FDD\u5B58\u5199\u56DE\u540C\u4E00\u4EFD\u6587\u4EF6\u3002\u3000\u5F53\u524D ${st.chars} \u5B57\uFF08\u704C\u6CE8${maxChars > 0 ? `\u4E0A\u9650 ${maxChars} \u5B57` : "\u4E0D\u622A\u65AD"}\uFF09` })
  ] });
  const renderSettings = () => {
    if (!settingsDraft) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pp-hint", children: "\u6B63\u5728\u8BFB\u8BBE\u7F6E\u2026" });
    const presetIds = presets.map((p) => p.id);
    const presetChecked = (id) => (settingsDraft.presets || []).indexOf(id) !== -1;
    const allPresets = presetIds.length > 0 && presetIds.every((id) => presetChecked(id));
    const togglePreset = (id) => {
      const cur = settingsDraft.presets || [];
      const next = cur.indexOf(id) === -1 ? [...cur, id] : cur.filter((x) => x !== id);
      patchSettings({ presets: next });
    };
    const extraPresets = (settingsDraft.presets || []).filter((id) => presetIds.indexOf(id) === -1);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-settings", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pp-sect", children: "\u704C\u6CE8" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-srow", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-slabel", children: "\u5F00\u5173" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-sfield", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pp-check", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "checkbox",
              checked: settingsDraft.enabled !== false,
              onChange: (e) => patchSettings({ enabled: e.target.checked })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-checkname", children: "\u5F00\u573A\u628A\u753B\u50CF\u6CE8\u5165\u4F1A\u8BDD" })
        ] }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-srow", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-slabel", children: "\u4E0A\u9650" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-sfield", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              className: "pp-input pp-numinput",
              type: "number",
              min: "0",
              max: "200000",
              value: settingsDraft.maxChars,
              onChange: (e) => patchSettings({ maxChars: Number(e.target.value) })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-unit", children: "\u5B57\uFF080\uFF1D\u4E0D\u622A\u65AD\uFF1B\u5927\u4E8E 0 \u65F6\u8D85\u51FA\u622A\u65AD\uFF0C\u5E76\u544A\u8BC9\u6A21\u578B\u5B8C\u6574\u7248\u5728\u54EA\uFF09" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pp-sect", children: "\u704C\u6CE8\u7684\u6A21\u5F0F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-srow pp-srow-top", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-slabel", children: "\u9650\u5B9A\u6A21\u5F0F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-sfield pp-sfield-col", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-hint", children: "\u5168\u4E0D\u52FE\uFF1D\u6240\u6709\u6A21\u5F0F\u90FD\u704C\u6CE8\uFF08\u9ED8\u8BA4\uFF09\uFF1B\u52FE\u4E86\u5C31\u53EA\u5728\u8FD9\u4E9B\u6A21\u5F0F\u91CC\u704C\u6CE8\u2014\u2014\u5176\u4F59\u6A21\u5F0F\uFF08\u542B\u65B0\u5EFA\u7684\uFF09\u65E2\u4E0D\u6CE8\u5165\u753B\u50CF\uFF0C\u4E5F\u770B\u4E0D\u5230\u753B\u50CF\u5F00\u5173\u3002" }),
          presetIds.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-chips", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pp-check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: allPresets,
                  onChange: (e) => patchSettings({ presets: e.target.checked ? presetIds.slice() : [] })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-checkname", children: "\u5168\u9009" })
            ] }),
            presets.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "label",
              {
                className: "pp-check",
                title: p.broken ? "\u8FD9\u4E2A\u6A21\u5F0F\u73B0\u5728\u88C5\u4E0D\u8D77\u6765\uFF1A" + p.broken : p.description || p.id,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: presetChecked(p.id), onChange: () => togglePreset(p.id) }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-checkname", children: p.name || p.id }),
                  p.name && p.name !== p.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-lock", children: p.id }) : null,
                  p.isDefault ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-lock", children: "\u9ED8\u8BA4" }) : null,
                  p.broken ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-lock", children: "\u574F" }) : null
                ]
              },
              p.id
            ))
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "textarea",
            {
              className: "pp-area",
              rows: 2,
              value: (settingsDraft.presets || []).join("\n"),
              spellCheck: false,
              placeholder: "\u4E00\u884C\u4E00\u4E2A\u6A21\u5F0F\u7684 agentPreset id\uFF1B\u7559\u7A7A\uFF1D\u6240\u6709\u6A21\u5F0F\u90FD\u704C\u6CE8",
              onChange: (e) => patchSettings({ presets: e.target.value.split("\n") })
            }
          ),
          presetsNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-hint", children: "\u62FF\u4E0D\u5230\u672C\u673A\u6A21\u5F0F\u6E05\u5355\uFF08" + presetsNote + "\uFF09\uFF0C\u53EF\u624B\u586B id\u3002" }) : null,
          extraPresets.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-hint", children: [
            "\u5DF2\u4FDD\u5B58\u3001\u4F46\u672C\u673A\u6E05\u5355\u91CC\u6CA1\u6709\u7684\u6A21\u5F0F\uFF1A",
            extraPresets.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-link", onClick: () => togglePreset(id), children: id + " \xD7" }, id))
          ] }) : null
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pp-sect", children: "\u4E0D\u704C\u6CE8\u7684\u8303\u56F4" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-srow pp-srow-top", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-slabel", children: "\u5DE5\u4F5C\u7A7A\u95F4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-sfield pp-sfield-col", children: [
          (() => {
            const skipList = settingsDraft.skipWorkspaces || [];
            const wss = workspaceCandidates(workspaces);
            const wssPaths = wss.map((w) => w.path);
            const extras = skipList.filter((p) => wssPaths.indexOf(p) === -1);
            const patchSkip = (next) => patchSettings({ skipWorkspaces: next });
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-hint", children: "\u52FE\u4E0A\u7684\u5DE5\u4F5C\u7A7A\u95F4\u4E0D\u81EA\u52A8\u6CE8\u5165\u753B\u50CF\u3002\u5224\u5B9A\u6309\u8DEF\u5F84\u5B50\u4E32\uFF08\u4E0D\u5206\u5927\u5C0F\u5199\uFF09\uFF1A\u52FE\u4E86\u4E0A\u5C42\u76EE\u5F55\uFF0C\u5B83\u4E0B\u9762\u7684\u5DE5\u4F5C\u7A7A\u95F4\u4E5F\u4F1A\u4E00\u8D77\u547D\u4E2D\u3002" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pp-check", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    checked: wss.length > 0 && wss.every((w) => skipList.indexOf(w.path) !== -1),
                    onChange: (e) => {
                      if (e.target.checked) patchSkip(Array.from(/* @__PURE__ */ new Set([...skipList, ...wssPaths])));
                      else patchSkip(skipList.filter((p) => wssPaths.indexOf(p) === -1));
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-checkname", children: "\u5168\u9009" })
              ] }),
              wss.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-chips", children: wss.map((ws) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pp-check", title: ws.path, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    checked: skipList.indexOf(ws.path) !== -1,
                    onChange: () => {
                      if (skipList.indexOf(ws.path) !== -1) patchSkip(skipList.filter((p) => p !== ws.path));
                      else patchSkip([...skipList, ws.path]);
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-checkname", children: ws.title || ws.path }),
                ws.title && ws.path ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-lock", children: ws.path }) : null
              ] }, ws.path)) }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "textarea",
                {
                  className: "pp-area",
                  rows: 2,
                  value: extras.join("\n"),
                  spellCheck: false,
                  placeholder: "\u53E6\u52A0\u8DEF\u5F84\u7247\u6BB5\uFF1A\u4E00\u884C\u4E00\u6761\uFF0C\u4F1A\u8BDD\u7684\u5DE5\u4F5C\u76EE\u5F55\u542B\u5B83\u5C31\u6574\u4E2A\u4F1A\u8BDD\u4E0D\u704C\u6CE8",
                  onChange: (e) => {
                    const next = e.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean);
                    patchSkip([...skipList.filter((p) => wssPaths.indexOf(p) !== -1), ...next]);
                  }
                }
              )
            ] });
          })(),
          workspacesNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-hint", children: "\u62FF\u4E0D\u5230\u672C\u673A\u5DE5\u4F5C\u7A7A\u95F4\u6E05\u5355\uFF08" + workspacesNote + "\uFF09\uFF0C\u53EA\u80FD\u624B\u586B\u8DEF\u5F84\u7247\u6BB5\u3002" }) : null,
          (settingsDraft.skipSessions || []).length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-hint", children: [
            "\u5DF2\u6309\u4F1A\u8BDD\u5173\u6389 " + settingsDraft.skipSessions.length + " \u4E2A",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-link", style: { marginLeft: "8px" }, onClick: () => patchSettings({ skipSessions: [] }), children: "\u5168\u90E8\u6062\u590D" })
          ] }) : null
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-sfooter", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "pp-btn primary",
            disabled: !settingsDirty || savingSettings,
            onClick: () => void saveSettings(),
            children: savingSettings ? "\u4FDD\u5B58\u4E2D\u2026" : settingsDirty ? "\u4FDD\u5B58\u8BBE\u7F6E" : "\u5DF2\u4FDD\u5B58"
          }
        ),
        settingsSaved ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-hint", children: "\u5DF2\u4FDD\u5B58\uFF0C\u4E0B\u4E00\u6B21\u5F00\u4F1A\u8BDD\u8D77\u751F\u6548" }) : null,
        settingsError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-error", role: "alert", children: settingsError }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-hint", children: "\u5199\u5728 " + (roster.home || "$DSH_HOME") + "\\user-profile.settings.json" })
      ] })
    ] });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: CSS }),
    view !== "settings" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { className: "pp-roster", "aria-label": "\u753B\u50CF\u540D\u518C", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pp-grouplabel", children: "\u901A\u7528\u753B\u50CF" }),
      general ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pp-row", "aria-current": activeId === "general" ? "true" : void 0, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: "pp-rowmain",
          onClick: () => {
            setActiveId("general");
            setEditing(null);
            setExpanded(null);
            setDeleteProfile(false);
            setWsOpen(false);
            setBindError(null);
            setView("entries");
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-rname", children: general.title }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-rnum", children: general.entries || 0 })
          ]
        }
      ) }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "pp-grouplabel", children: "\u4EFB\u52A1\u753B\u50CF" }),
      tasks.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-row", "aria-current": activeId === p.id ? "true" : void 0, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "pp-rowmain",
            onClick: () => {
              setActiveId(p.id);
              setEditing(null);
              setExpanded(null);
              setDeleteProfile(false);
              setWsOpen(false);
              setBindError(null);
              setView("entries");
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-rname", children: p.title }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-rnum", children: p.entries || 0 })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "pp-rowdel",
            title: "\u5220\u9664\u4EFB\u52A1\u753B\u50CF\uFF08\u6587\u4EF6\u6539\u540D\u5F52\u6863\uFF0C\u53EF\u627E\u56DE\uFF09",
            onClick: () => {
              setActiveId(p.id);
              setEditing(null);
              setExpanded(null);
              setWsOpen(false);
              setBindError(null);
              setView("entries");
              setDeleteProfile(true);
            },
            children: "\xD7"
          }
        )
      ] }, p.id)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pp-newlayer", children: creating ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: "pp-input",
            autoFocus: true,
            spellCheck: false,
            placeholder: "\u4EFB\u52A1\u753B\u50CF\u540D\uFF08\u5982\uFF1ADSH \u7EF4\u62A4\uFF09",
            value: newName,
            onChange: (e) => setNewName(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") void createTask();
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-cardrow", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-btn small primary", disabled: !newName.trim() || busy, onClick: () => void createTask(), children: "\u521B\u5EFA" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-btn small", onClick: () => {
            setCreating(false);
            setNewName("");
          }, children: "\u53D6\u6D88" })
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-link pp-newlayerbtn", onClick: () => setCreating(true), children: "\uFF0B \u65B0\u5EFA\u4EFB\u52A1\u753B\u50CF" }) })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-pane", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-titlewrap", children: [
          nameEditing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-cardrow", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                className: "pp-titleinput",
                autoFocus: true,
                value: nameDraft,
                onChange: (e) => setNameDraft(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter") void renameTask();
                  if (e.key === "Escape") setNameEditing(false);
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-btn small primary", disabled: busy || !nameDraft.trim(), onClick: () => void renameTask(), children: "\u6539" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-btn small", onClick: () => setNameEditing(false), children: "\u53D6\u6D88" })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "pp-titlebtn",
              title: profile && profile.kind === "task" ? "\u70B9\u4E00\u4E0B\u6539\u540D\uFF08\u6807\u9898\u4E0E\u6587\u4EF6\u540D\u4E00\u8D77\u6539\uFF09" : "\u70B9\u4E00\u4E0B\u6539\u6807\u9898",
              onClick: () => {
                setNameDraft(profile ? profile.title : docTitle(parsed ? parsed.paras : []));
                setNameEditing(true);
              },
              children: profile ? profile.title : "\u901A\u7528\u753B\u50CF"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "pp-sub", children: [
            st.entries,
            " \u6761 \xB7 ",
            st.sections,
            " \u8282 \xB7 ",
            st.chars,
            " \u5B57",
            doc.path ? "\u3000" + doc.path : ""
          ] }),
          profile && profile.kind === "task" ? (() => {
            const bound = boundOf(profile.id);
            const titleOf = (path) => {
              const hit = workspaces.find((w) => w.path === path);
              return hit && (hit.title || hit.path) || path;
            };
            const summary = bound.length === 0 ? "\u6240\u6709\u5DE5\u4F5C\u7A7A\u95F4\uFF08\u4E0D\u7ED1\u5B9A\uFF09" : bound.map(titleOf).join("\u3001");
            const extras = bound.filter((p) => !workspaces.some((w) => w.path === p));
            const pathOptions = workspaceCandidates(workspaces);
            const allBound = pathOptions.length > 0 && pathOptions.every((w) => bound.indexOf(w.path) !== -1);
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "pp-sub pp-wsline", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-rlabel", children: "\u5DE5\u4F5C\u7A7A\u95F4" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-wscombo", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: "pp-wsbtn",
                    "aria-expanded": wsOpen,
                    title: bound.length > 0 ? bound.join("\n") : "\u6240\u6709\u5DE5\u4F5C\u7A7A\u95F4\u90FD\u751F\u6548",
                    onClick: () => {
                      setWsOpen((v) => !v);
                      setBindError(null);
                    },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-wssummary", children: summary }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "\u25BE" })
                    ]
                  }
                ),
                wsOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-wsdropdown", children: [
                  bindError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-error", children: bindError }) : null,
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pp-wsopt", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "input",
                      {
                        type: "checkbox",
                        checked: allBound,
                        onChange: (e) => void saveBindings(profile.id, e.target.checked ? pathOptions.map((w) => w.path) : [])
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-wsname", children: "\u5168\u9009" })
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pp-wsopt", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "input",
                      {
                        type: "checkbox",
                        checked: bound.length === 0,
                        onChange: () => void saveBindings(profile.id, [])
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-wsname", children: "\u6240\u6709\u5DE5\u4F5C\u7A7A\u95F4\uFF08\u4E0D\u7ED1\u5B9A\uFF09" })
                  ] }),
                  pathOptions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-hint", children: workspacesNote || "\u6CA1\u6709\u5DE5\u4F5C\u7A7A\u95F4\u6E05\u5355\uFF0C\u624B\u586B\u8DEF\u5F84\u7247\u6BB5\u3002" }) : pathOptions.map((ws) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pp-wsopt", title: ws.path, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      "input",
                      {
                        type: "checkbox",
                        checked: bound.indexOf(ws.path) !== -1,
                        onChange: () => toggleBound(profile.id, ws.path)
                      }
                    ),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-wsname", children: ws.title || ws.path }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-wspath", children: ws.title ? ws.path : "" })
                  ] }, ws.path)),
                  extras.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "pp-wsopt", title: p, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: true, onChange: () => toggleBound(profile.id, p) }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-wsname", children: "\u5DF2\u7ED1\u5B9A\u7684\u7247\u6BB5" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-wspath", children: p })
                  ] }, "extra:" + p)),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "input",
                    {
                      className: "pp-input wide",
                      placeholder: "\u624B\u586B\u8DEF\u5F84\u7247\u6BB5\uFF0C\u56DE\u8F66\u52A0\u5165\uFF08\u5982 D:\\\u5DE5\u7A0B\uFF09",
                      onKeyDown: (e) => {
                        if (e.key !== "Enter") return;
                        const value = e.currentTarget.value.trim();
                        if (!value) return;
                        e.currentTarget.value = "";
                        if (bound.indexOf(value) === -1) toggleBound(profile.id, value);
                      }
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-hint", children: "\u4E0D\u7ED1\u5B9A\u65F6\uFF0C\u8FD9\u4EFD\u4EFB\u52A1\u753B\u50CF\u4E0D\u968F\u4F1A\u8BDD\u6CE8\u5165\uFF08\u53EA\u5728\u7C7B\u522B\u6E05\u5355\u91CC\u5217\u540D\uFF09\u3002" }),
                  bindSaving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-hint", children: "\u4FDD\u5B58\u4E2D\u2026" }) : null
                ] }) : null
              ] })
            ] });
          })() : null
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pp-headacts", children: view === "settings" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "pp-link primary",
            onClick: () => {
              setView("entries");
              setEditing(null);
              setExpanded(null);
            },
            children: "\u8FD4\u56DE"
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-link", onClick: () => {
          setView("settings");
          setEditing(null);
          setExpanded(null);
          setDeleteProfile(false);
        }, children: "\u8BBE\u7F6E" }) }) })
      ] }),
      deleteProfile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-confirm", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-confirm-title", children: "\u5220\u9664\u4EFB\u52A1\u753B\u50CF\u300C" + (profile ? profile.title : "") + "\u300D\uFF1F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6587\u4EF6\u4F1A\u6539\u540D\u5F52\u6863\uFF08.deleted-\u65F6\u95F4\u6233\uFF09\uFF0C\u627E\u56DE\u53EA\u9700\u6539\u56DE\u540D\u5B57\uFF1B\u8BBE\u7F6E\u91CC\u7684\u7ED1\u5B9A\u4E00\u5E76\u79FB\u9664\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-confirmrow", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-btn small danger", disabled: busy, onClick: () => void removeTask(), children: "\u5220\u9664" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-btn small", onClick: () => setDeleteProfile(false), children: "\u53D6\u6D88" })
        ] })
      ] }) : null,
      view === "entries" || view === "raw" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-toolbar", children: [
        view === "entries" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: "pp-search",
            placeholder: "\u641C\u8FD9\u4EFD\u753B\u50CF\u91CC\u7684\u6761\u76EE\u2026",
            value: filter,
            onChange: (e) => setFilter(e.target.value)
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-search", "aria-hidden": "true" }),
        view === "entries" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "pp-link",
            onClick: () => {
              const allOpen = secs.every((s) => collapsed[s.index] !== true);
              const next = {};
              secs.forEach((s) => {
                next[s.index] = allOpen;
              });
              setCollapsed(next);
              if (allOpen) {
                setExpanded(null);
                setEditing(null);
              }
            },
            children: secs.every((s) => collapsed[s.index] !== true) ? "\u5168\u90E8\u6536\u8D77" : "\u5168\u90E8\u5C55\u5F00"
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-tabs", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-tab", "aria-selected": view === "entries", onClick: () => setView("entries"), children: "\u6761\u76EE" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-tab", "aria-selected": view === "raw", onClick: () => {
            setView("raw");
            setEditing(null);
            setExpanded(null);
          }, children: "\u539F\u6587" })
        ] })
      ] }) : null,
      view === "entries" ? renderEntries() : null,
      view === "raw" ? renderRaw() : null,
      view === "settings" ? renderSettings() : null,
      view !== "settings" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "pp-footer", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-path", children: doc.path || (roster.home ? roster.home + "\\user-profile.md" : "") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "pp-cardrow", children: [
          doc.saveError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-error", children: "\u4FDD\u5B58\u5931\u8D25\uFF1A" + doc.saveError }) : null,
          dirty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-badge dirty", children: "\u672A\u4FDD\u5B58" }) : doc.savedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pp-badge", children: "\u5DF2\u4FDD\u5B58" }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "pp-btn primary", disabled: !dirty || doc.saving, onClick: () => void saveDoc(), children: doc.saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58" })
        ] })
      ] }) : null
    ] })
  ] });
}
var MUTE_CSS = `.pp-mutebtn { padding:2px 8px; border:1px solid var(--dsw-alias-border-l1); border-radius:999px; min-width:58px; text-align:center;
  background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); font:inherit; font-size:11px;
  line-height:1.4; cursor:pointer; white-space:nowrap; }
.pp-mutebtn:hover { border-color:var(--dsw-alias-brand-primary); }
.pp-mutebtn[data-muted="true"] { color:var(--dsw-alias-state-error-primary); border-color:currentColor; }
.pp-mutebtn:disabled { opacity:.6; cursor:default; }`;
var getSessionsService = () => void 0;
function useAgentPreset(sessionId) {
  const [preset, setPreset] = (0, import_react.useState)(void 0);
  (0, import_react.useEffect)(() => {
    if (!sessionId) return void 0;
    let alive = true;
    let face;
    try {
      const service = getSessionsService();
      const binding = service && typeof service.binding === "function" ? service.binding(sessionId) : void 0;
      face = binding && binding.session && binding.session.projections ? binding.session.projections.faceOf("agentPreset") : void 0;
    } catch {
      face = void 0;
    }
    if (!face) return void 0;
    const read = () => {
      if (alive) setPreset(face.getSnapshot());
    };
    read();
    const off = typeof face.subscribe === "function" ? face.subscribe(read) : void 0;
    return () => {
      alive = false;
      if (typeof off === "function") off();
    };
  }, [sessionId]);
  return preset;
}
var MUTE_CACHE = /* @__PURE__ */ new Map();
function SessionProfileToggle(props) {
  const sessionId = props && props.sessionId ? String(props.sessionId) : "";
  const preset = useAgentPreset(sessionId);
  const [muted, setMuted] = (0, import_react.useState)(() => sessionId && MUTE_CACHE.has(sessionId) ? MUTE_CACHE.get(sessionId) : null);
  const [presets, setPresets] = (0, import_react.useState)(null);
  const [serverAllowed, setServerAllowed] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    if (!sessionId) return void 0;
    let alive = true;
    const read = () => {
      getJson(API + "/session-state?id=" + encodeURIComponent(sessionId)).then((data) => {
        if (!alive) return;
        const next = Boolean(data.muted);
        MUTE_CACHE.set(sessionId, next);
        setMuted(next);
        setPresets(Array.isArray(data.presets) ? data.presets : null);
        setServerAllowed(data.allowed === void 0 ? null : Boolean(data.allowed));
      }).catch(() => {
      });
    };
    read();
    window.addEventListener("focus", read);
    return () => {
      alive = false;
      window.removeEventListener("focus", read);
    };
  }, [sessionId]);
  if (!sessionId) return null;
  const blocked = typeof preset === "string" && preset !== "" ? Array.isArray(presets) && presets.length > 0 && presets.indexOf(preset) === -1 : serverAllowed === false;
  const label = blocked ? "\u753B\u50CF\xB7\u7981" : busy ? "\u753B\u50CF\u2026" : muted === null ? "\u753B\u50CF\u2026" : muted ? "\u753B\u50CF\xB7\u7981" : "\u753B\u50CF\xB7\u6CE8";
  const toggle = async () => {
    if (busy || muted === null || blocked) return;
    setBusy(true);
    try {
      const data = await postJson(API + "/session-mute", { id: sessionId, muted: !muted });
      const next = Boolean(data.muted);
      MUTE_CACHE.set(sessionId, next);
      setMuted(next);
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: MUTE_CSS }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: "pp-mutebtn",
        "data-muted": blocked || muted === true ? "true" : "false",
        disabled: busy || muted === null || blocked,
        title: blocked ? "\u5F53\u524D\u6A21\u5F0F\u4E0D\u5728\u753B\u50CF\u704C\u6CE8\u540D\u5355\u91CC\uFF08\u8BBE\u7F6E \u2192 \u7528\u6237\u753B\u50CF \u2192 \u704C\u6CE8\uFF09" : "\u7528\u6237\u753B\u50CF\uFF1A\u672C\u4F1A\u8BDD\u662F\u5426\u704C\u6CE8\u753B\u50CF",
        onClick: () => void toggle(),
        children: label
      }
    )
  ] });
}
var inject = ["slots"];
function apply(ctx) {
  getSessionsService = () => {
    try {
      return ctx.get("sessions");
    } catch {
      return void 0;
    }
  };
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "user-profile",
    order: 30,
    label: "\u7528\u6237\u753B\u50CF"
  }, ProfilePanel));
  try {
    ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
      name: "conversation.input.right",
      id: "profile-session-toggle",
      order: 22,
      label: "\u753B\u50CF\u704C\u6CE8"
    }, SessionProfileToggle));
  } catch {
    try {
      ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
        name: "conversation.session.header.actions",
        id: "profile-session-toggle",
        order: 16,
        label: "\u753B\u50CF\u704C\u6CE8"
      }, SessionProfileToggle));
    } catch {
    }
  }
}
})();
// 对齐栏与收尾检测的字号密度
(function () {

		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/entry.jsx
var entry_exports = {};
__export(entry_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(entry_exports);
var ATTR = "data-zz";
var MARK = "quiet";
var STYLE_ID = "dsh-chat-density-style";
var GLOBAL_KEY = "__dshChatDensity";
var VERSION = "6";
var ALIGN_PREFIXES = ["\u6839\u672C\u76EE\u6807\uFF1A", "\u672C\u5C42\u76EE\u6807\uFF1A", "\u6211\u6309\u54EA\u4E2A\u76EE\u6807\u6539\uFF1A", "\u670D\u52A1\u4E0A\u5C42\uFF1A"];
var ALIGN_HEAD = /^（第[0-9〇一二三四五六七八九十百]+层）/;
var TAIL_KEYS = ["\u6536\u5C3E\u68C0\u6D4B", "\u672C\u8F6E\u4E94\u9879", "\u5F85\u786E\u8BA4\uFF1A", "\u753B\u50CF\u65E0\u66F4\u65B0", "\u53EF\u5F52\u7EB3\u9879\uFF1A"];
var CSS = `
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
`;
function ensureStyle() {
  const existing = document.getElementById(STYLE_ID);
  if (existing && existing.getAttribute("data-version") === VERSION) return;
  if (existing) existing.remove();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.setAttribute("data-version", VERSION);
  style.textContent = CSS;
  document.head.appendChild(style);
}
function isQuietBlock(text) {
  const head = text.trimStart().slice(0, 24);
  if (ALIGN_HEAD.test(head)) return true;
  if (ALIGN_PREFIXES.some((prefix) => head.startsWith(prefix))) return true;
  return TAIL_KEYS.some((key) => text.includes(key));
}
function scan() {
  for (const el of document.querySelectorAll("blockquote")) {
    if (el.getAttribute(ATTR) === MARK) continue;
    if (el.closest("pre, code")) continue;
    const text = (el.textContent ?? "").slice(0, 600);
    if (isQuietBlock(text)) el.setAttribute(ATTR, MARK);
  }
}
var inject = ["slots"];
function apply() {
  const prev = window[GLOBAL_KEY];
  if (prev && typeof prev.stop === "function") {
    try {
      prev.stop();
    } catch {
    }
  }
  const boot = () => {
    ensureStyle();
    scan();
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        scan();
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [ATTR]
    });
    const timer = window.setInterval(scan, 800);
    window[GLOBAL_KEY] = {
      version: VERSION,
      stop() {
        observer.disconnect();
        window.clearInterval(timer);
        if (raf) window.cancelAnimationFrame(raf);
      }
    };
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}
})();
		return {};
	}
});
