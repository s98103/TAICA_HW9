// 店家頁：shop.html?id=<shop-id>
"use strict";
renderChrome("home");

// ---------- 照片區：一排橫向捲動＋左右箭頭＋圓點，點照片放大 ----------
function galleryHtml(shop) {
  const photos = shop.photos?.length ? shop.photos : [shop.cover].filter(Boolean);
  if (!photos.length) return "";
  return `
    <section class="gallery" aria-label="${esc(shop.name)} 的照片">
      <div class="gallery-track" tabindex="0">
        ${photos.map((src, i) => `
          <button class="gallery-item" type="button" data-i="${i}" aria-label="放大第 ${i + 1} 張照片">
            <img src="${esc(src)}" alt="${esc(shop.name)} 照片 ${i + 1}" loading="${i < 3 ? "eager" : "lazy"}">
          </button>`).join("")}
      </div>
      <button class="gallery-arrow prev" type="button" aria-label="上一張">‹</button>
      <button class="gallery-arrow next" type="button" aria-label="下一張">›</button>
      <div class="gallery-dots" role="tablist">${photos.map((_, i) => `<button type="button" data-i="${i}" aria-label="第 ${i + 1} 張"></button>`).join("")}</div>
    </section>
    <div class="lightbox" hidden role="dialog" aria-modal="true" aria-label="放大照片">
      <button class="lb-close" type="button" aria-label="關閉">×</button>
      <button class="lb-arrow prev" type="button" aria-label="上一張">‹</button>
      <img class="lb-img" alt="">
      <button class="lb-arrow next" type="button" aria-label="下一張">›</button>
      <p class="lb-count"></p>
    </div>`;
}

function setupGallery(root, photos, name) {
  const track = root.querySelector(".gallery-track");
  if (!track) return;
  const items = [...track.querySelectorAll(".gallery-item")];
  const dots = [...root.querySelectorAll(".gallery-dots button")];
  const prev = root.querySelector(".gallery-arrow.prev"), next = root.querySelector(".gallery-arrow.next");

  // 照片都塞得下就不用箭頭和圓點
  const update = () => {
    const overflow = track.scrollWidth > track.clientWidth + 4;
    root.querySelector(".gallery").classList.toggle("static", !overflow);
    const left = track.scrollLeft;
    let cur = 0;
    items.forEach((it, i) => { if (it.offsetLeft - track.offsetLeft <= left + 10) cur = i; });
    if (left + track.clientWidth >= track.scrollWidth - 4) cur = items.length - 1;
    dots.forEach((d, i) => d.classList.toggle("on", i === cur));
    prev.disabled = left <= 4;
    next.disabled = left + track.clientWidth >= track.scrollWidth - 4;
  };
  const go = (i) => track.scrollTo({ left: items[i].offsetLeft - track.offsetLeft, behavior: "smooth" });
  const step = (dir) => track.scrollBy({ left: dir * (items[0].offsetWidth + 12), behavior: "smooth" });
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  dots.forEach((d) => d.addEventListener("click", () => go(+d.dataset.i)));
  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  window.addEventListener("resize", update);
  items.forEach((it) => it.querySelector("img").addEventListener("load", update));
  update();

  // 放大檢視
  const lb = root.querySelector(".lightbox"), img = lb.querySelector(".lb-img"), count = lb.querySelector(".lb-count");
  let idx = 0, lastFocus = null;
  const show = (i) => {
    idx = (i + photos.length) % photos.length;
    img.src = photos[idx];
    img.alt = `${name} 照片 ${idx + 1}`;
    count.textContent = `${idx + 1} / ${photos.length}`;
    lb.classList.toggle("single", photos.length === 1);
  };
  const open = (i) => { lastFocus = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = "hidden"; lb.querySelector(".lb-close").focus(); };
  const close = () => { lb.hidden = true; document.body.style.overflow = ""; lastFocus?.focus(); };
  items.forEach((it) => it.addEventListener("click", () => open(+it.dataset.i)));
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-arrow.prev").addEventListener("click", () => show(idx - 1));
  lb.querySelector(".lb-arrow.next").addEventListener("click", () => show(idx + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });
  // 手機左右滑動切換
  let x0 = null;
  lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

(async () => {
  const main = document.getElementById("main");
  try {
    const index = await loadIndex();
    const id = param("id");
    const shop = index.shops.find((s) => s.id === id);
    if (!shop) { main.innerHTML = emptyState(`找不到店家「${esc(id)}」<span class="kao">( ˘•_•˘ ).oO</span> <a class="btn" href="index.html">回首頁</a>`); return; }
    const tags = tagMap(index);
    const area = index.areas.find((a) => a.id === shop.area);
    const body = renderMarkdown(await fetchDoc(shop.path), shop.path);
    document.title = `${shop.name}｜${SITE.name}`;

    const info = [
      ["地址", shop.address ? esc(shop.address) : null],
      ["營業時間", shop.hours ? esc(shop.hours) : null],
      ["用餐限時", shop.time_limit ? esc(shop.time_limit) : null],
      ["價位", shop.price ? `<span class="price-sign" title="${esc(priceText(shop.price))}">${priceLabel(shop.price)}</span>` : null],
      ["推薦必點", shop.must_order?.length ? shop.must_order.map(esc).join("、") : null],
      ["造訪", `${esc(shop.visited)}（共 ${shop.visits} 次）`],
    ];

    main.innerHTML = `
      <p class="crumbs"><a href="index.html">店家</a> ／ <a href="page.html?p=wiki/areas/${esc(shop.area)}">${esc(shop.city)}・${esc(shop.district)}</a></p>
      <header class="shop-head">
        <h1>${esc(shop.name)} ${shop.status === "closed" ? '<span class="badge-closed">已歇業</span>' : ""}</h1>
        ${shop.name_en ? `<p class="en">${esc(shop.name_en)}</p>` : ""}
        <p class="summary">${esc(shop.summary)}</p>
        <div class="chips">${shop.tags.map((t) => `<a class="chip" href="page.html?p=wiki/tags/${esc(t)}">${esc(tags[t]?.icon || "")} ${esc(tags[t]?.name || t)}</a>`).join("")}</div>
      </header>
      ${galleryHtml(shop)}
      <div class="shop-layout">
        <article class="prose">${body}</article>
        <aside class="shop-side">
          <section class="panel">
            <h2>Google 評分</h2>
            <div class="big-rating">${googleRating(shop)}<small> / 5</small></div>
            <p class="rating-note">${shop.google_reviews ? `${shop.google_reviews.toLocaleString()} 則評論・` : ""}${esc(shop.rating_checked)} 紀錄</p>
            <a class="btn-map" href="${esc(shop.map_url)}" target="_blank" rel="noopener">📍 點我看位置！</a>
          </section>
          <section class="panel">
            <h2>我的體感</h2>
            <ul class="scores">${Object.entries(SITE.scoreLabels).map(([k, label]) => `<li><span>${label}</span>${beans(shop.scores?.[k])}</li>`).join("")}</ul>
          </section>
          <section class="panel">
            <h2>店家資訊</h2>
            <dl class="info">${info.map(([k, v]) => `<dt>${k}</dt><dd>${v ?? '<span class="na">— 尚未紀錄</span>'}</dd>`).join("")}</dl>
          </section>
          ${area ? `<section class="panel"><h2>同一區</h2><a class="btn-ghost" href="page.html?p=wiki/areas/${esc(area.id)}">看${esc(area.name)}的 ${area.count} 家店 →</a></section>` : ""}
        </aside>
      </div>`;
    setupGallery(main, shop.photos?.length ? shop.photos : [shop.cover], shop.name);
  } catch (e) {
    main.innerHTML = emptyState(esc(e.message));
  }
})();
