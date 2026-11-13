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

// packages/dsh-chat-density/src/entry.jsx
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
      const later = reals.filter((b) => hasGateLine(b.textContent ?? "") && (el.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
      if (later.length > 0) {
        replaced = true;
        break;
      }
    }
    if (replaced) el.setAttribute(REPLACED, "1");
    else el.removeAttribute(REPLACED);
  }
}
var NOTICE_ID = "dsh-evolve-notice";
var NOTICE_STYLE_ID = "dsh-evolve-notice-style";
var NOTICE_CSS = `
.zz-card {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  overflow: hidden; box-sizing: border-box;
  width: 600px; max-width: calc(100vw - 40px);
  padding: 34px 38px 30px; border-radius: 20px;
  background: var(--dsw-alias-bg-overlay, #1e2026);
  color: var(--dsw-alias-label-primary, #f4f6fb);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.14));
  box-shadow: 0 40px 120px rgba(0,0,0,.55);
  animation: zz-notice-pop .26s cubic-bezier(.18,.9,.32,1.15);
}
.zz-strip {
  position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg, var(--dsw-alias-brand-primary, #4d6bfe), rgba(139,92,246,.9) 45%, transparent);
}
.zz-head { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.zz-icon {
  width: 44px; height: 44px; flex: none; display: flex; align-items: center; justify-content: center;
  border-radius: 12px; background: rgba(77,107,254,.14);
  color: var(--dsw-alias-brand-primary, #8ea2ff);
}
.zz-title { font-size: 16px; font-weight: 700; letter-spacing: .01em; }
.zz-sub { margin-top: 3px; font-size: 12.5px; color: var(--dsw-alias-label-secondary, rgba(255,255,255,.6)); }
.zz-lead { font-size: 17px; line-height: 1.6; font-weight: 500; }
.zz-name {
  padding: 1px 7px; border-radius: 6px; font-weight: 700;
  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.18));
}
.zz-cmd {
  margin-left: 2px; padding: 1px 6px; border-radius: 5px;
  background: rgba(127,127,127,.16); font-size: .86em;
  color: var(--dsw-alias-label-secondary, rgba(255,255,255,.72));
}
.zz-harm {
  margin-top: 18px; padding: 14px 16px; border-radius: 10px;
  border-left: 3px solid var(--dsw-alias-state-warn-primary, #f0a020);
  background: rgba(240,160,32,.10);
  font-size: 15.5px; line-height: 1.6;
}
.zz-harm b { color: var(--dsw-alias-state-warn-primary, #f0a020); font-weight: 700; }
.zz-actions { display: flex; justify-content: flex-end; margin-top: 26px; }
.zz-button {
  min-width: 132px; height: 44px; padding: 0 26px; border: 0; border-radius: 11px;
  background: var(--dsw-alias-brand-primary, #4d6bfe); color: #fff;
  font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;
  box-shadow: 0 10px 30px rgba(77,107,254,.35);
  transition: filter .15s ease, transform .15s ease;
}
.zz-button:hover { filter: brightness(1.08); }
.zz-button:active { transform: translateY(1px); }
@keyframes zz-notice-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes zz-notice-pop {
  from { opacity: 0; transform: translate(-50%, -50%) translateY(12px) scale(.96); }
  to { opacity: 1; transform: translate(-50%, -50%); }
}
`;
function ensureNoticeStyle() {
  if (document.getElementById(NOTICE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = NOTICE_STYLE_ID;
  style.textContent = NOTICE_CSS;
  document.head.appendChild(style);
}
function showCompressNotice() {
  if (!document.body) return;
  const old = document.getElementById(NOTICE_ID);
  if (old) old.remove();
  ensureNoticeStyle();
  const host = document.createElement("div");
  host.id = NOTICE_ID;
  const setImportant = (name, value) => host.style.setProperty(name, value, "important");
  setImportant("position", "fixed");
  setImportant("top", "0");
  setImportant("left", "0");
  setImportant("right", "0");
  setImportant("bottom", "0");
  setImportant("width", "100%");
  setImportant("height", "100%");
  setImportant("box-sizing", "border-box");
  setImportant("z-index", "2147483000");
  setImportant("display", "grid");
  setImportant("place-items", "center");
  setImportant("margin", "0");
  setImportant("padding", "32px");
  setImportant("background", "rgba(8,10,14,.58)");
  setImportant("backdrop-filter", "blur(6px)");
  setImportant("-webkit-backdrop-filter", "blur(6px)");
  host.innerHTML = `
    <div class="zz-card">
      <div class="zz-strip"></div>
      <div class="zz-head">
        <div class="zz-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3.2 22 20.4H2L12 3.2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M12 9.2v4.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="12" cy="17.1" r="1.05" fill="currentColor"/>
          </svg>
        </div>
        <div>
          <div class="zz-title" id="${NOTICE_ID}-title">\u8FDB\u5316\u6A21\u5F0F \xB7 \u4F7F\u7528\u63D0\u793A</div>
          <div class="zz-sub">\u9996\u6B21\u5B89\u88C5\u6216\u66F4\u65B0\u540E\u63D0\u793A\u4E00\u6B21</div>
        </div>
      </div>
      <div class="zz-lead">\u4E0D\u8981\u4F7F\u7528\u4E0A\u4E0B\u6587\u538B\u7F29\u63D2\u4EF6 <strong class="zz-name">billion-context</strong>\uFF08\u547D\u4EE4\u540D <span class="zz-cmd">bili</span>\uFF09\u3002</div>
      <div class="zz-harm">\u5B83\u4E0D\u4EC5\u4F1A\u8BA9 <b>token \u6D88\u8017\u66F4\u5927</b>\uFF0C<b>\u6548\u679C\u4E5F\u6CA1\u6709\u90A3\u4E48\u597D</b>\u3002</div>
      <div class="zz-actions"><button type="button" class="zz-button">\u77E5\u9053\u4E86</button></div>
    </div>
  `;
  document.body.append(host);
  const close = () => {
    host.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (event) => {
    if (event.key === "Escape") close();
  };
  host.querySelector(".zz-button").addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  host.querySelector(".zz-button").focus();
}
var BILLION_API = "/dsh-evolution-settings/api/billion-context";
async function maybeShowCompressNotice() {
  try {
    const path = new URL(String(BILLION_API).replace(/^\/+/, ""), document.baseURI).pathname;
    const res = await fetch(path, { headers: { accept: "application/json" } });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.ok === false) return;
    if (data.installed !== true || data.enabled !== true) return;
    showCompressNotice();
  } catch {
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
    void maybeShowCompressNotice();
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
