// 摸啡人生 — 共用邏輯（讀取 index、Markdown 渲染、連結轉換、卡片、頁首頁尾）
"use strict";

const SITE = {
  name: "摸啡人生",
  signature: "𓇋_(˶◕؎◕˶)_𓌉",
  scoreLabels: { dessert: "甜點／餐點", vibe: "氣氛", quiet: "安靜度", work: "讀書工作" },
  // 價位說明（AGENTS.md 5.3）：以「一份餐點＋一杯飲料」的人均消費估算
  prices: { 1: "150 元以下", 2: "151–250 元", 3: "251–400 元", 4: "400 元以上" },
  sortOptions: { google_rating: "Google 評分", visited: "最近造訪", quiet: "安靜度", work: "讀書工作" },
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const param = (k) => new URLSearchParams(location.search).get(k);

// ---------- 頁首／頁尾（所有頁面共用） ----------
function renderChrome(active) {
  const links = [["index.html", "店家", "home"], ["explore.html", "探索", "explore"], ["page.html?p=wiki/about", "關於", "about"]];
  document.body.insertAdjacentHTML("afterbegin", `
    <header class="site-header"><div class="wrap">
      <a class="brand" href="index.html">摸啡<span>人生</span></a>
      <nav class="nav">${links.map(([h, t, k]) => `<a href="${h}" class="${k === active ? "active" : ""}">${t}</a>`).join("")}</nav>
    </div></header>`);
  document.body.insertAdjacentHTML("beforeend", `
    <footer class="site-footer"><div class="wrap">
      <p class="footer-main">摸啡人生・一個人在雙北跑咖啡廳的筆記 <span class="kao">${SITE.signature}</span></p>
      <p>內容由 LLM Wiki 依 <code>AGENTS.md</code> 規則維護　|　<a href="page.html?p=wiki/about">參考網站</a></p>
    </div></footer>`);
}

// ---------- 資料 ----------
let _index;
async function loadIndex() {
  if (!_index && window.MOFEI_DATA) _index = window.MOFEI_DATA.index; // 由 wiki/data.js 提供（點兩下 HTML 也能用）
  if (!_index) {
    const res = await fetch("wiki/index.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("讀不到 wiki/index.json，請先執行 node scripts/build.js");
    _index = await res.json();
  }
  return _index;
}

async function fetchDoc(path) {
  let text = window.MOFEI_DATA?.docs?.[path];
  if (text === undefined) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`讀不到 ${path}`);
    text = await res.text();
  }
  return text.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

// ---------- 連結轉換：Markdown 裡的相對 .md 連結 → 網站網址 ----------
function resolvePath(base, relPath) {
  const u = new URL(relPath, "https://x.invalid/" + base);
  return decodeURIComponent(u.pathname.slice(1)) + u.hash;
}
function siteHref(rootPath) {
  const [p, hash = ""] = rootPath.split("#");
  const h = hash ? "#" + hash : "";
  let m;
  if ((m = p.match(/^wiki\/shops\/([a-z0-9-]+)\.md$/))) return `shop.html?id=${m[1]}${h}`;
  if (/\.md$/.test(p)) return `page.html?p=${p.replace(/\.md$/, "")}${h}`;
  return rootPath;
}
function renderMarkdown(md, basePath) {
  const box = document.createElement("div");
  box.innerHTML = marked.parse(md);
  const isRel = (v) => v && !/^([a-z]+:|#|\/)/i.test(v);
  box.querySelectorAll("a[href]").forEach((a) => {
    const v = a.getAttribute("href");
    if (isRel(v)) a.setAttribute("href", siteHref(resolvePath(basePath, v)));
    else if (/^https?:/.test(v)) { a.target = "_blank"; a.rel = "noopener"; }
  });
  box.querySelectorAll("img[src]").forEach((img) => {
    const v = img.getAttribute("src");
    if (isRel(v)) img.setAttribute("src", resolvePath(basePath, v));
    img.loading = "lazy";
  });
  return box.innerHTML;
}

// ---------- 顯示小元件 ----------
const priceLabel = (p) => (p ? "$".repeat(p) : "—");
const priceText = (p) => (p ? `${"$".repeat(p)}（人均 ${SITE.prices[p]}）` : null);
const priceLegend = () => `<p class="price-legend">💰 價位說明（一份餐點＋一杯飲料的人均）：${[1, 2, 3, 4].map((p) => `<span><b>${"$".repeat(p)}</b> ${SITE.prices[p]}</span>`).join("")}</p>`;
function beans(v) {
  if (v === null || v === undefined) return `<span class="na">—</span>`;
  return `<span class="beans" role="img" aria-label="${v} / 5">${[1, 2, 3, 4, 5].map((i) => `<span class="bean ${i <= v ? "on" : ""}"></span>`).join("")}</span>`;
}
// 封面照片；讀取失敗或沒有照片時，改顯示店名首字色塊
function coverFallback(shop) {
  let h = 0;
  for (const c of shop.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `<div class="cover-fallback" style="background:var(--cover-${(h % 5) + 1})" aria-hidden="true">${esc([...shop.name][0])}</div>`;
}
function coverHtml(shop) {
  if (!shop.cover) return coverFallback(shop);
  return `<img class="cover" src="${esc(shop.cover)}" alt="${esc(shop.name)} 的照片" loading="lazy"
    onerror="this.outerHTML=this.nextElementSibling.innerHTML"><template>${coverFallback(shop)}</template>`;
}
const googleRating = (shop) => `★ ${Number(shop.google_rating).toFixed(1)}`;
function tagMap(index) { return Object.fromEntries(index.tags.map((t) => [t.id, t])); }

function shopCard(shop, tags) {
  return `<a class="card" href="shop.html?id=${esc(shop.id)}">
    ${coverHtml(shop)}
    <div class="card-body">
      <div class="meta"><span>${esc(shop.city.replace("市", ""))}・${esc(shop.district)}　<span title="${esc(priceText(shop.price) || "價位尚未紀錄")}">${priceLabel(shop.price)}</span></span><span class="rating" title="Google 評分">${googleRating(shop)}</span></div>
      <h3>${esc(shop.name)} ${shop.status === "closed" ? '<span class="badge-closed">已歇業</span>' : ""}</h3>
      <p class="summary">${esc(shop.summary)}</p>
      <div class="mini-tags">${shop.tags.map((t) => `<span>${esc(tags[t]?.icon || "")} ${esc(tags[t]?.name || t)}</span>`).join("")}</div>
    </div></a>`;
}
function emptyState(msg) {
  return `<div class="empty">${msg}</div>`;
}

// ---------- 中文斷行：只在「詞與詞之間」或標點後換行，避免「草／莓」「說／話」被拆開 ----------
// 用瀏覽器內建的 Intl.Segmenter 把中文切成詞，在詞的邊界插入 <wbr>，
// 再用 CSS word-break: keep-all 禁止在詞的中間換行。不支援的瀏覽器維持原本的換行方式。
const CJK_RE = /[㐀-鿿豈-﫿]/;
const OPEN_PUNCT = /[（「『《〈【(\[]$/;
const wordSegmenter = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("zh-Hant", { granularity: "word" }) : null;
function wrapCJK(root) {
  if (!wordSegmenter || !root || root.nodeType !== 1) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || !CJK_RE.test(n.data) || p.closest("script, style, code, pre, .kao, select, option, textarea")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const segs = [...wordSegmenter.segment(n.data)];
    if (segs.length < 2) continue;
    const frag = document.createDocumentFragment();
    segs.forEach((s, i) => {
      // 只在「詞」前面放換行點；標點前面不放（避免行首出現「，」），左括號／引號後面也不放；
      // 單一個中文字黏在前一個詞後面（斷詞常把「冰沙」「佛卡夏」切成單字）
      const prev = segs[i - 1];
      const single = s.segment.length === 1 && CJK_RE.test(s.segment);
      const stick = single && prev && prev.isWordLike && CJK_RE.test(prev.segment.slice(-1));
      if (i > 0 && s.isWordLike && !stick && !OPEN_PUNCT.test(prev.segment)) frag.appendChild(document.createElement("wbr"));
      frag.appendChild(document.createTextNode(s.segment));
    });
    n.parentElement.classList.add("cjk-words");
    n.replaceWith(frag);
  }
}
// 各頁內容都是 JS 動態產生的，用 MutationObserver 自動處理新加入的元素
if (wordSegmenter && typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
  new MutationObserver((records) => {
    for (const r of records) r.addedNodes.forEach((el) => { if (el.nodeType === 1 && el.tagName !== "WBR") wrapCJK(el); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", () => wrapCJK(document.body));
}

