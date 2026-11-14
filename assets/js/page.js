// 通用頁：page.html?p=wiki/areas/<id> | wiki/tags/<id> | reports/<id> | wiki/about
"use strict";

(async () => {
  const p = param("p") || "";
  renderChrome(p === "wiki/about" ? "about" : "explore");
  const main = document.getElementById("main");
  const ok = /^(wiki\/(areas|tags)\/[a-z0-9-]+|reports\/[a-z0-9-]+|wiki\/about)$/.test(p);
  if (!ok) { main.innerHTML = emptyState("找不到這個頁面 <span class=\"kao\">( ˘•_•˘ ).oO</span> <a class=\"btn\" href=\"index.html\">回首頁</a>"); return; }

  try {
    const index = await loadIndex();
    const tags = tagMap(index);
    const path = p + ".md";
    const body = renderMarkdown(await fetchDoc(path), path);
    const id = p.split("/").pop();
    let head = "", list = null, back = `<a href="explore.html">探索</a>`;

    if (p.startsWith("wiki/areas/")) {
      const a = index.areas.find((x) => x.id === id) || { name: id, city: "" };
      head = `<h1>${esc(a.name)}</h1><p>${esc(a.city)}・收錄 ${a.count ?? 0} 家咖啡廳</p>`;
      list = index.shops.filter((s) => s.area === id);
      document.title = `${a.name}｜${SITE.name}`;
    } else if (p.startsWith("wiki/tags/")) {
      const t = tags[id] || { name: id, icon: "" };
      head = `<h1>${esc(t.icon)} ${esc(t.name)}</h1><p>${esc(t.description || "")}</p>`;
      list = index.shops.filter((s) => s.tags.includes(id));
      document.title = `${t.name}｜${SITE.name}`;
    } else if (p.startsWith("reports/")) {
      const r = index.reports.find((x) => x.id === id) || { title: id };
      head = `<h1>${esc(r.title)}</h1><p>${esc(r.date || "")}　${esc(r.summary || "")}</p>`;
      document.title = `${r.title}｜${SITE.name}`;
    } else {
      head = `<h1>關於摸啡人生</h1>`;
      back = `<a href="index.html">首頁</a>`;
      document.title = `關於｜${SITE.name}`;
    }

    main.innerHTML = `
      <p class="crumbs">${back}</p>
      <header class="page-head">${head}</header>
      <article class="prose${p === "wiki/about" ? " narrow" : ""}">${body}</article>
      ${list ? `<h2 class="section-title">店家（${list.length}）</h2>
        <div class="grid">${list.length ? list.map((s) => shopCard(s, tags)).join("") : emptyState("目前還沒有店家")}</div>` : ""}`;
  } catch (e) {
    main.innerHTML = emptyState(esc(e.message));
  }
})();
