#!/usr/bin/env node
// 摸啡人生 build script
// 掃描 wiki/ 與 reports/ 的 Markdown frontmatter → 驗證 → 產生 wiki/index.json
// 用法：node scripts/build.js   （有錯誤時不會寫出 index.json，exit code 1）

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

// ---------- 簡化版 YAML frontmatter 解析 ----------
function parseScalar(raw) {
  let v = raw.trim();
  if (v === "" || v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^\[.*\]$/.test(v)) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return splitInline(inner).map(parseScalar);
  }
  if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return v.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function splitInline(s) {
  const out = [];
  let cur = "", q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === ",") { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter((x) => x !== "");
}

function parseFrontmatter(text, file) {
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) { errors.push(`${file}: 找不到 frontmatter（檔案要以 --- 開頭）`); return null; }
  const data = {};
  let parent = null;
  m[1].split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const nested = line.match(/^ {2}([A-Za-z_][\w-]*):(.*)$/);
    const top = line.match(/^([A-Za-z_][\w-]*):(.*)$/);
    if (nested && parent) {
      data[parent][nested[1]] = parseScalar(nested[2]);
    } else if (top) {
      if (top[2].trim() === "") { data[top[1]] = {}; parent = top[1]; }
      else { data[top[1]] = parseScalar(top[2]); parent = null; }
    } else {
      errors.push(`${file}: frontmatter 第 ${i + 2} 行無法解析：「${line}」`);
    }
  });
  // 空的巢狀物件其實是 null
  for (const k of Object.keys(data)) {
    if (data[k] && typeof data[k] === "object" && !Array.isArray(data[k]) && Object.keys(data[k]).length === 0) data[k] = null;
  }
  return { data, body: m[2] };
}

function readDir(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const full = path.join(abs, f);
      const file = rel(full);
      const parsed = parseFrontmatter(fs.readFileSync(full, "utf8"), file);
      return parsed && { file, slug: f.replace(/\.md$/, ""), ...parsed };
    })
    .filter(Boolean);
}

// ---------- 驗證工具 ----------
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const exists = (p) => fs.existsSync(path.join(ROOT, p));

function checkCommon(item, type) {
  const { data, file, slug } = item;
  if (data.type !== type) errors.push(`${file}: type 應為 "${type}"，目前是 ${JSON.stringify(data.type)}`);
  if (data.id !== slug) errors.push(`${file}: id「${data.id}」必須與檔名「${slug}」相同`);
  if (!ID_RE.test(slug)) errors.push(`${file}: 檔名只能用小寫英文、數字與 -`);
}

// ---------- 讀取 ----------
const tags = readDir("wiki/tags");
const areas = readDir("wiki/areas");
const shops = readDir("wiki/shops");
const reports = readDir("reports");

tags.forEach((t) => {
  checkCommon(t, "tag");
  ["name", "icon", "description"].forEach((k) => { if (!t.data[k]) errors.push(`${t.file}: 缺少 ${k}`); });
});
areas.forEach((a) => {
  checkCommon(a, "area");
  if (!a.data.name) errors.push(`${a.file}: 缺少 name`);
  if (!["台北市", "新北市"].includes(a.data.city)) errors.push(`${a.file}: city 只能是 台北市 或 新北市`);
  if (!/^(taipei|newtaipei)-/.test(a.slug)) errors.push(`${a.file}: area-id 要以 taipei- 或 newtaipei- 開頭`);
});

const tagIds = new Set(tags.map((t) => t.slug));
const areaMap = Object.fromEntries(areas.map((a) => [a.slug, a.data]));
const SCORE_KEYS = ["dessert", "vibe", "quiet", "work"];
const photosOf = (id) => {
  const dir = path.join(ROOT, "assets/img/shops", id);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{2}\.jpg$/.test(f)).sort().map((f) => `assets/img/shops/${id}/${f}`) : [];
};
const BODY_SECTIONS = ["## 一句話", "## 環境與氣氛", "## 我點了什麼", "## 讀書／工作適合度", "## 小提醒"];

shops.forEach((s) => {
  const d = s.data, f = s.file;
  checkCommon(s, "shop");
  ["name", "city", "district", "area", "visited", "summary", "status", "map_url", "google_rating", "rating_checked", "cover"].forEach((k) => {
    if (d[k] === null || d[k] === undefined || d[k] === "") errors.push(`${f}: 必填欄位 ${k} 是空的`);
  });
  if (!["台北市", "新北市"].includes(d.city)) errors.push(`${f}: city 只能是 台北市 或 新北市`);
  if (d.area && !areaMap[d.area]) errors.push(`${f}: area「${d.area}」沒有對應的 wiki/areas/${d.area}.md`);
  if (d.area && areaMap[d.area]) {
    if (areaMap[d.area].city !== d.city) errors.push(`${f}: city 與地區頁的 city 不一致`);
    if (areaMap[d.area].name !== d.district) errors.push(`${f}: district「${d.district}」與地區頁 name「${areaMap[d.area].name}」不一致`);
  }
  if (d.visited && !DATE_RE.test(String(d.visited))) errors.push(`${f}: visited 格式要是 YYYY-MM-DD`);
  if (!Number.isInteger(d.visits) || d.visits < 1) errors.push(`${f}: visits 要是 ≥ 1 的整數`);
  if (!["open", "closed"].includes(d.status)) errors.push(`${f}: status 只能是 open 或 closed`);
  if (d.price !== null && d.price !== undefined && ![1, 2, 3, 4].includes(d.price)) errors.push(`${f}: price 只能是 1–4 或 null`);
  if ("overall" in d || "lat" in d || "lng" in d) errors.push(`${f}: overall / lat / lng 欄位已停用，請刪除（改用 google_rating 與 map_url）`);
  if (d.map_url && !/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|share\.google|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/.test(d.map_url))
    errors.push(`${f}: map_url 必須是 Google Maps 連結`);
  if (d.google_rating !== null && d.google_rating !== undefined &&
      (typeof d.google_rating !== "number" || d.google_rating < 1 || d.google_rating > 5 || Math.round(d.google_rating * 10) !== d.google_rating * 10))
    errors.push(`${f}: google_rating 要是 1.0–5.0，一位小數`);
  if (d.google_reviews !== null && d.google_reviews !== undefined && !(Number.isInteger(d.google_reviews) && d.google_reviews >= 0))
    errors.push(`${f}: google_reviews 要是整數或 null`);
  if (d.rating_checked && !DATE_RE.test(String(d.rating_checked))) errors.push(`${f}: rating_checked 格式要是 YYYY-MM-DD`);
  if (d.cover && d.cover !== `assets/img/shops/${s.slug}/cover.jpg`) errors.push(`${f}: cover 必須是 assets/img/shops/${s.slug}/cover.jpg`);
  if (!d.scores || typeof d.scores !== "object") errors.push(`${f}: 缺少 scores`);
  else {
    SCORE_KEYS.forEach((k) => {
      const v = d.scores[k];
      if (v === undefined) errors.push(`${f}: scores 缺少 ${k}（不知道請填 null）`);
      else if (v !== null && !(Number.isInteger(v) && v >= 1 && v <= 5)) errors.push(`${f}: scores.${k} 要是 1–5 整數或 null`);
    });
    Object.keys(d.scores).forEach((k) => { if (!SCORE_KEYS.includes(k)) errors.push(`${f}: scores.${k} 不是允許的項目（只能有 ${SCORE_KEYS.join("、")}）`); });
  }
  if (photosOf(s.slug).length === 0) errors.push(`${f}: 照片區沒有照片（用 python scripts/cover.py 產生 01.jpg…）`);
  if (!Array.isArray(d.tags) || d.tags.length === 0) errors.push(`${f}: tags 至少要有 1 個`);
  else d.tags.forEach((t) => { if (!tagIds.has(t)) errors.push(`${f}: 標籤「${t}」不在詞彙表（wiki/tags/）`); });
  if (d.cover && !exists(d.cover)) errors.push(`${f}: 封面圖 ${d.cover} 不存在（用 python scripts/cover.py 產生）`);
  if (!Array.isArray(d.sources) || d.sources.length === 0) errors.push(`${f}: sources 至少要有 1 個 raw 檔案`);
  else d.sources.forEach((p) => { if (!exists(p)) errors.push(`${f}: 來源 ${p} 不存在`); });
  if (d.summary && d.summary.length > 30) warnings.push(`${f}: summary 超過 30 字（${d.summary.length} 字）`);
  BODY_SECTIONS.forEach((h) => { if (!s.body.includes(h)) errors.push(`${f}: 內文缺少段落「${h}」`); });
  // 標籤與分數一致性
  const sc = d.scores || {};
  if (d.tags?.includes("dessert") && !(sc.dessert >= 4)) warnings.push(`${f}: 有 dessert 標籤但 dessert 分數 < 4`);
  ["address", "hours", "price", "time_limit"].forEach((k) => { if (d[k] === null || d[k] === undefined) warnings.push(`${f}: ${k} 尚未填寫`); });
});

reports.forEach((r) => {
  checkCommon(r, "report");
  ["title", "date", "summary"].forEach((k) => { if (!r.data[k]) errors.push(`${r.file}: 缺少 ${k}`); });
});

// 相對連結檢查
[...shops, ...areas, ...tags, ...reports].forEach((item) => {
  const re = /\]\(([^)\s]+\.(md|jpg|jpeg|png|webp))\)/g;
  let m;
  while ((m = re.exec(item.body))) {
    if (/^https?:/.test(m[1])) continue;
    const target = path.join(ROOT, path.dirname(item.file), m[1]);
    if (!fs.existsSync(target)) errors.push(`${item.file}: 連結 ${m[1]} 指向不存在的檔案`);
  }
});

// 寫作風格（AGENTS.md 5.9）：網站內容不用句號；店家／地區／標籤頁內文不放連結與圖片
const aboutDoc = parseFrontmatter(fs.readFileSync(path.join(ROOT, "wiki/about.md"), "utf8"), "wiki/about.md");
[...shops, ...areas, ...tags, ...reports, { file: "wiki/about.md", ...aboutDoc }].forEach((item) => {
  const text = [item.body, item.data?.summary, item.data?.description].filter(Boolean).join("\n");
  const n = (text.match(/。/g) || []).length;
  if (n) errors.push(`${item.file}: 有 ${n} 個句號「。」，網站內容不使用句號`);
  const badBold = text.match(/\*\*[^*\n]*?[：:，、！？」）]\*\*(?=[^\s*])/g);
  if (badBold) errors.push(`${item.file}: 粗體結尾的 ** 前面不能是標點，網頁會直接顯示星號：${badBold[0]}（請把標點移到 ** 外面）`);
  const jargon = text.match(/\b(time_limit|google_rating|google_reviews|rating_checked|map_url|must_order|scores|dessert|vibe|quiet|work)\b/);
  if (jargon) errors.push(`${item.file}: 網站文字出現資料欄位名稱「${jargon[1]}」，請改成讀者看得懂的說法`);
  if (/^## 再訪紀錄/m.test(item.body || ""))errors.push(`${item.file}: 不寫「再訪紀錄」段落，造訪資訊只記在 visited、visits`);
});
[...shops, ...areas, ...tags].forEach((item) => {
  if (/!\[[^\]]*\]\(/.test(item.body)) errors.push(`${item.file}: 內文不放圖片，照片統一放在店家頁的照片區`);
  if (/\[[^\]]+\]\([^)]+\)/.test(item.body)) errors.push(`${item.file}: 內文不放超連結，地區與標籤會自動顯示在頁面上`);
});

// 未使用的地區與標籤
areas.forEach((a) => { if (!shops.some((s) => s.data.area === a.slug)) warnings.push(`${a.file}: 這個地區還沒有店家`); });

// ---------- 輸出 ----------
warnings.forEach((w) => console.log("⚠️  " + w));
if (errors.length) {
  errors.forEach((e) => console.log("❌ " + e));
  console.log(`\n建置失敗：${errors.length} 個錯誤，未更新 wiki/index.json`);
  process.exit(1);
}

const shopList = shops.map((s) => ({ ...s.data, photos: photosOf(s.slug), path: s.file }))
  .sort((a, b) => String(b.visited).localeCompare(String(a.visited)));
const index = {
  generated: new Date().toISOString(),
  shops: shopList,
  areas: areas.map((a) => ({ ...a.data, path: a.file, count: shopList.filter((s) => s.area === a.slug).length }))
    .sort((a, b) => a.city.localeCompare(b.city) || b.count - a.count),
  tags: tags.map((t) => ({ ...t.data, path: t.file, count: shopList.filter((s) => s.tags.includes(t.slug)).length }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
  reports: reports.map((r) => ({ ...r.data, path: r.file }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date))),
};
fs.writeFileSync(path.join(ROOT, "wiki/index.json"), JSON.stringify(index, null, 2) + "\n");

// 同時輸出 wiki/data.js：把 index 與所有 Markdown 內容打包，讓網站用 file:// 直接點開也能顯示
const docs = {};
[...shops, ...areas, ...tags, ...reports].forEach((it) => { docs[it.file] = fs.readFileSync(path.join(ROOT, it.file), "utf8"); });
docs["wiki/about.md"] = fs.readFileSync(path.join(ROOT, "wiki/about.md"), "utf8");
fs.writeFileSync(path.join(ROOT, "wiki/data.js"),
  "// 由 scripts/build.js 產生，請勿手動修改\nwindow.MOFEI_DATA = " + JSON.stringify({ index, docs }) + ";\n");

console.log(`\n✅ 建置完成：${shopList.length} 家店、${areas.length} 個地區、${tags.length} 個標籤、${reports.length} 份報告 → wiki/index.json、wiki/data.js`);
