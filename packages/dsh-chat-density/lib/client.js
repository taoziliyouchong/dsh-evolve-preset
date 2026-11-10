window.__ModuleLoader__.load({
	id: "dsh-chat-density",
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
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(entry_exports);
var ATTR = "data-zz";
var MARK = "quiet";
var LATE_MARK = "late-bar";
var REPLACED = "data-zz-replaced";
var STYLE_ID = "dsh-chat-density-style";
var GLOBAL_KEY = "__dshChatDensity";
var VERSION = "7";
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
blockquote[${ATTR}="${LATE_MARK}"] {
  font-size: 12.5px !important;
  line-height: 1.32 !important;
  color: var(--dsw-alias-label-secondary) !important;
  padding: 3px 0 3px 8px !important;
  margin: 22px 0 !important;
  border-left-width: 2px !important;
  border-left-style: dashed !important;
}
blockquote[${ATTR}="${LATE_MARK}"] p { margin: 0 !important; }
blockquote[${ATTR}="${LATE_MARK}"][${REPLACED}="1"] { display: none !important; }
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
function isLateBlock(text) {
  const head = text.trimStart();
  return head.startsWith("\u23F3") && head.includes("\u5BF9\u9F50\u680F\u8349\u7A3F");
}
function hasGateLine(text) {
  return /关卡[：:]/.test(text);
}
function scan() {
  for (const el of document.querySelectorAll("blockquote")) {
    if (el.closest("pre, code")) continue;
    const text = (el.textContent ?? "").slice(0, 800);
    if (isLateBlock(text)) {
      if (el.getAttribute(ATTR) !== LATE_MARK) el.setAttribute(ATTR, LATE_MARK);
      continue;
    }
    if (el.getAttribute(ATTR) === MARK) continue;
    if (isQuietBlock(text)) el.setAttribute(ATTR, MARK);
  }
  for (const el of document.querySelectorAll(`blockquote[${ATTR}="${LATE_MARK}"]`)) {
    let p = el.parentElement;
    let replaced = false;
    for (let depth = 0; p && depth < 10; depth++, p = p.parentElement) {
      const reals = Array.from(p.querySelectorAll(`blockquote[${ATTR}="${MARK}"]`));
      if (reals.some((b) => hasGateLine(b.textContent ?? ""))) {
        replaced = true;
        break;
      }
    }
    if (replaced) el.setAttribute(REPLACED, "1");
    else el.removeAttribute(REPLACED);
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

		return module.exports;
	}
});
