window.__ModuleLoader__.load({
	id: "dsh-profile-panel",
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

// packages/dsh-profile-panel/src/entry.jsx
var entry_exports = {};
__export(entry_exports, {
  ProfilePanel: () => ProfilePanel,
  SessionProfileToggle: () => SessionProfileToggle,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(entry_exports);
var import_react = require("react");

// packages/dsh-profile-panel/src/profile-text.js
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

// packages/dsh-profile-panel/src/entry.jsx
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
                      placeholder: "\u624B\u586B\u8DEF\u5F84\u7247\u6BB5\uFF0C\u56DE\u8F66\u52A0\u5165",
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

		return module.exports;
	}
});
