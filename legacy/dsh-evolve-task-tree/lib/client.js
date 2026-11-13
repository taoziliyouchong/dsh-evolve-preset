window.__ModuleLoader__.load({
	id: "dsh-evolve-task-tree",
	factory: (require) => {
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
/* \u7F16\u8F91\u6001\uFF1A\u5361\u7247\u6CBF\u7528\u8FDB\u5165\u7F16\u8F91\u524D\u91CF\u5230\u7684\u5927\u5C0F\uFF08\u5BBD\u7531\u5E03\u5C40\u7ED9\uFF09\uFF0C\u8868\u5355\u5728\u5361\u5185\u6EDA\u52A8\u2014\u2014\u70B9\u300C\u7F16\u8F91\u300D\u4E0D\u7F29\u8282\u70B9\u3001
   \u65C1\u8FB9\u7684\u5361\u4E5F\u4E0D\u8DDF\u7740\u56DE\u6392\u3002 */
.ztt-card-editing { display:flex; flex-direction:column; overflow:hidden; }
.ztt-card-editing .ztt-detail { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; }
.ztt-card-editing .ztt-editform { flex:1 1 auto; min-height:0; overflow:auto; padding-right:2px; }

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
var AutoArea = function AutoArea2({ value, onChange, rows = 1 }) {
  const ref = (0, import_react.useRef)(null);
  (0, import_react.useLayoutEffect)(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight + 2, 56) + "px";
  }, [value]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "textarea",
    {
      ref,
      className: "ztt-editarea",
      rows,
      value,
      onChange
    }
  );
};
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
  const [editBox, setEditBox] = (0, import_react.useState)(0);
  const cardEl = (0, import_react.useRef)(null);
  const startEdit = () => {
    const el = cardEl.current;
    setEditBox(el && el.offsetHeight > 0 ? el.offsetHeight : 0);
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
    setEditBox(0);
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
      setEditBox(0);
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
      ref: (el) => {
        cardEl.current = el;
        if (typeof setRef === "function") setRef(el);
      },
      className: "ztt-card ztt-card-" + display + (focus ? " ztt-card-focus" : " ztt-card-minor") + (on ? " ztt-card-on" : "") + (open ? " ztt-card-open" : "") + (editing ? " ztt-card-editing" : ""),
      "data-editing": editing ? "true" : "false",
      style: { left: x, top: y, width, height: editing && editBox > 0 ? editBox : void 0 },
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
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AutoArea, { rows: 2, value: draft ? draft.goal : "", onChange: setField("goal") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ztt-editfield", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-editlabel", children: "\u57FA\u672C\u70B9\uFF08\u6BCF\u884C\u4E00\u6761\uFF09" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AutoArea, { rows: 3, value: draft ? draft.points : "", onChange: setField("points") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ztt-editfield", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-editlabel", children: "\u786C\u9700\u6C42\uFF08\u6BCF\u884C\u4E00\u6761\uFF09" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AutoArea, { rows: 2, value: draft ? draft.hard : "", onChange: setField("hard") })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ztt-editfield", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "ztt-editlabel", children: "\u8F6F\u9700\u6C42\uFF08\u6BCF\u884C\u4E00\u6761\uFF09" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AutoArea, { rows: 2, value: draft ? draft.soft : "", onChange: setField("soft") })
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
  if (state.mode !== "" && state.mode !== "plugin-evolution") {
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

		return module.exports;
	}
});
