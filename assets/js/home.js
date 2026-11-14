// 首頁：標語＋隨機摸啡＋篩選＋卡片
"use strict";
renderChrome("home");

(async () => {
  const grid = document.getElementById("shop-grid");
  let index;
  try { index = await loadIndex(); } catch (e) { grid.innerHTML = emptyState(esc(e.message)); return; }
  const tags = tagMap(index);
  const shops = index.shops;
  const openShops = shops.filter((s) => s.status !== "closed");

  document.getElementById("stat-shops").textContent = shops.length;

  // 🎲 隨機摸啡：從營業中的店抽一家
  const $pick = document.getElementById("pick"), $pickResult = document.getElementById("pick-result");
  if (!openShops.length) $pick.disabled = true;
  let last = null;
  $pick.addEventListener("click", () => {
    const pool = openShops.length > 1 ? openShops.filter((s) => s.id !== last) : openShops;
    const s = pool[Math.floor(Math.random() * pool.length)];
    last = s.id;
    $pickResult.innerHTML = `今天就去 <a href="shop.html?id=${esc(s.id)}">${esc(s.name)}</a>（${esc(s.district)}・${googleRating(s)}）摸啡吧！<span class="kao">☕(˶ˆᴗˆ˶)✨</span>`;
  });

  // 篩選元件
  const $q = document.getElementById("q"), $city = document.getElementById("city"),
    $district = document.getElementById("district"), $sort = document.getElementById("sort"),
    $chips = document.getElementById("tag-chips"), $count = document.getElementById("result-count");
  const state = { tags: new Set(param("tag") ? [param("tag")] : []) };

  $sort.innerHTML = Object.entries(SITE.sortOptions).map(([k, v]) => `<option value="${k}">排序：${v}</option>`).join("");
  function fillDistricts() {
    const ds = [...new Set(shops.filter((s) => !$city.value || s.city === $city.value).map((s) => s.district))];
    const cur = $district.value;
    $district.innerHTML = `<option value="">全部行政區</option>` + ds.map((d) => `<option ${d === cur ? "selected" : ""}>${esc(d)}</option>`).join("");
  }
  const usedTags = index.tags.filter((t) => t.count > 0);
  $chips.innerHTML = usedTags.map((t) => `<button type="button" class="chip" data-tag="${t.id}">${t.icon} ${esc(t.name)} <small>${t.count}</small></button>`).join("");
  $chips.insertAdjacentHTML("afterend", priceLegend());

  function apply() {
    const q = $q.value.trim().toLowerCase();
    let list = shops.filter((s) =>
      (!$city.value || s.city === $city.value) &&
      (!$district.value || s.district === $district.value) &&
      [...state.tags].every((t) => s.tags.includes(t)) &&
      (!q || [s.name, s.name_en, s.district, s.summary, ...(s.must_order || [])].join(" ").toLowerCase().includes(q)));
    const key = $sort.value;
    const val = (s) => key === "visited" ? s.visited : key === "google_rating" ? s.google_rating : (s.scores?.[key] ?? -1);
    list = list.slice().sort((a, b) => (val(b) > val(a) ? 1 : val(b) < val(a) ? -1 : b.google_rating - a.google_rating));

    $chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", state.tags.has(c.dataset.tag)));
    $count.textContent = `共 ${list.length} 家`;
    grid.innerHTML = shops.length === 0
      ? emptyState(`還沒有收錄任何店家 <span class="kao">☕(˘ω˘)zzz</span><br>把筆記、Google 連結和照片交給 AI，依 <code>AGENTS.md</code> 進行 ingest 就會出現在這裡`)
      : list.length ? list.map((s) => shopCard(s, tags)).join("") : emptyState(`沒有符合條件的店家，試試放寬篩選條件 <span class="kao">( ˘•_•˘ ).oO</span>`);
  }

  $city.addEventListener("change", () => { fillDistricts(); apply(); });
  [$district, $sort].forEach((el) => el.addEventListener("change", apply));
  $q.addEventListener("input", apply);
  $chips.addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    state.tags.has(c.dataset.tag) ? state.tags.delete(c.dataset.tag) : state.tags.add(c.dataset.tag);
    apply();
  });
  fillDistricts();
  apply();
})();
