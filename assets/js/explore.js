// 探索：地區、標籤、報告總覽
"use strict";
renderChrome("explore");

(async () => {
  const main = document.getElementById("main");
  try {
    const index = await loadIndex();
    const cities = ["台北市", "新北市"];
    main.innerHTML = `
      <header class="page-head"><h1>探索</h1><p>依地區、標籤或主題報告找咖啡廳</p></header>

      <h2 class="section-title">地區</h2>
      <div class="area-groups">${cities.map((c) => {
        const as = index.areas.filter((a) => a.city === c);
        return `<section class="panel"><h3>${c}</h3>${as.length
          ? `<div class="chips">${as.map((a) => `<a class="chip" href="page.html?p=wiki/areas/${esc(a.id)}">${esc(a.name)} <small>${a.count}</small></a>`).join("")}</div>`
          : `<p class="na">還沒有收錄</p>`}</section>`;
      }).join("")}</div>

      <h2 class="section-title">標籤</h2>
      <div class="tile-grid">${index.tags.map((t) => `
        <a class="tile" href="page.html?p=wiki/tags/${esc(t.id)}">
          <span class="tile-icon" aria-hidden="true">${esc(t.icon)}</span>
          <span class="tile-text"><b>${esc(t.name)}</b><small>${esc(t.description)}</small></span>
          <span class="tile-count">${t.count} 家</span>
        </a>`).join("")}
      </div>

      <h2 class="section-title">報告</h2>
      ${index.reports.length
        ? `<div class="tile-grid">${index.reports.map((r) => `
          <a class="tile" href="page.html?p=reports/${esc(r.id)}">
            <span class="tile-icon" aria-hidden="true">📝</span>
            <span class="tile-text"><b>${esc(r.title)}</b><small>${esc(r.date)}・${esc(r.summary)}</small></span>
          </a>`).join("")}</div>`
        : emptyState("還沒有報告，收錄幾家店之後，可以請 AI 產生排行榜或比較報告")}`;
  } catch (e) {
    main.innerHTML = emptyState(esc(e.message));
  }
})();
