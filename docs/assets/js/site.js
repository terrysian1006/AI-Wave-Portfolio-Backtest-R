/*
  site.js
  全站共用的程式。每一頁都載入這個檔案。

  目錄
  1. 章節清單 CHAPTERS（新增章節只需要改這裡）
  2. 頁首、頁尾、上一頁下一頁
  3. 首頁章節卡片
  4. 表格排序
  5. 第二章：敘述統計表（含群組篩選）
  6. 第二章：相關係數熱圖、最低相關查詢
  7. 第四章：績效總表、夏普指標長條圖
  8. 提示框（滑鼠移到圖上顯示數值）
  9. 啟動
*/

/* 1. 章節清單：順序就是導覽列與上一頁/下一頁的順序 */
const CHAPTERS = [
  { file: "chapters/01-motivation.html", no: "01", title: "研究動機與資料", summary: "為什麼研究 AI 衝擊下的資產配置，37 檔標的怎麼分組，樣本期間怎麼切。" },
  { file: "chapters/02-assets.html", no: "02", title: "個別資產特性", summary: "報酬走勢、波動與左尾風險、相關係數熱圖：哪些資產可以互相分散風險。" },
  { file: "chapters/03-method.html", no: "03", title: "策略與回測方法", summary: "7 種投資組合策略、參數設定，以及避免前視偏誤的滾動視窗回測。" },
  { file: "chapters/04-results.html", no: "04", title: "樣本外實證結果", summary: "522 個交易日的樣本外績效：報酬、波動、夏普、下行風險、換手率。" },
  { file: "chapters/05-conclusion.html", no: "05", title: "結論與後續", summary: "三大結論、模型限制與後續研究方向。" }
];

const SITE_TITLE = "人性溢價與反 AI 烏托邦";
const ROOT = document.body.dataset.root || "";

function el(tag, attrs, html) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/* 2. 頁首、頁尾、上一頁下一頁 */
function currentChapterIndex() {
  const path = location.pathname;
  return CHAPTERS.findIndex(c => path.endsWith(c.file));
}

function buildHeader() {
  const here = currentChapterIndex();
  const header = el("header", { class: "site-header" });
  const inner = el("div", { class: "inner" });
  inner.appendChild(el("a", { class: "site-title", href: ROOT + "index.html" }, SITE_TITLE));
  const nav = el("nav", { class: "site-nav", "aria-label": "章節導覽" });
  nav.appendChild(el("a", Object.assign({ href: ROOT + "index.html" }, here === -1 ? { "aria-current": "page" } : {}), "首頁"));
  CHAPTERS.forEach((c, i) => {
    const attrs = { href: ROOT + c.file };
    if (i === here) attrs["aria-current"] = "page";
    nav.appendChild(el("a", attrs, c.no + " " + c.title));
  });
  inner.appendChild(nav);
  header.appendChild(inner);
  document.body.prepend(header);
}

function buildPager() {
  const here = currentChapterIndex();
  const main = document.querySelector("main");
  if (here === -1 || !main) return;
  const prev = here === 0 ? { file: "index.html", title: "首頁" } : CHAPTERS[here - 1];
  const next = CHAPTERS[here + 1];
  const pager = el("div", { class: "pager" });
  pager.appendChild(el("a", { href: ROOT + prev.file }, "← " + prev.title));
  pager.appendChild(next ? el("a", { href: ROOT + next.file }, next.title + " →") : el("span"));
  main.appendChild(pager);
}

function buildFooter() {
  const footer = el("footer", { class: "site-footer" });
  footer.appendChild(el("div", { class: "inner" },
    "Terry Lai｜財務金融資訊分析期末報告網頁版｜數字皆取自原報告表 1 至表 6｜個人課堂研究，非投資建議"));
  document.body.appendChild(footer);
}

/* 3. 首頁章節卡片：放在 id="chapter-cards" 的容器裡 */
function buildChapterCards() {
  const box = document.getElementById("chapter-cards");
  if (!box) return;
  box.innerHTML = "";
  CHAPTERS.forEach(c => {
    box.appendChild(el("a", { class: "card", href: ROOT + c.file },
      `<div class="card-no">CHAPTER ${c.no}</div><h3>${c.title}</h3><p>${c.summary}</p>`));
  });
}

/* 4. 表格排序：給 <table> 加 class="sortable-table"，數字欄位的 <td> 加 data-value */
function makeSortable(table) {
  const headers = table.querySelectorAll("thead th");
  headers.forEach((th, col) => {
    th.classList.add("sortable");
    th.addEventListener("click", () => {
      const asc = !th.classList.contains("sorted-asc");
      headers.forEach(h => h.classList.remove("sorted-asc", "sorted-desc"));
      th.classList.add(asc ? "sorted-asc" : "sorted-desc");
      const rows = Array.from(table.tBodies[0].rows);
      rows.sort((a, b) => {
        const x = a.cells[col], y = b.cells[col];
        const xv = x.dataset.value !== undefined ? parseFloat(x.dataset.value) : x.textContent;
        const yv = y.dataset.value !== undefined ? parseFloat(y.dataset.value) : y.textContent;
        const r = typeof xv === "number" ? xv - yv : String(xv).localeCompare(String(yv));
        return asc ? r : -r;
      });
      rows.forEach(r => table.tBodies[0].appendChild(r));
    });
  });
}

/* 5. 敘述統計表（表 1）：容器 id="stats-table"，篩選按鈕容器 id="group-filter" */
function renderStatsTable() {
  const box = document.getElementById("stats-table");
  if (!box || !window.REPORT_DATA) return;
  const D = window.REPORT_DATA;
  const groupName = Object.fromEntries(D.groups.map(g => [g.id, g.name]));
  let html = "<table class='sortable-table'><thead><tr><th>代號</th><th>群組</th>";
  D.statColumns.forEach(c => { html += `<th>${c}</th>`; });
  html += "</tr></thead><tbody>";
  D.assets.forEach(a => {
    html += `<tr data-group="${a.group}"><td title="${a.name}｜${a.role}"><strong>${a.ticker}</strong></td><td class="text">${groupName[a.group]}</td>`;
    a.stats.forEach(v => { html += `<td class="num" data-value="${v}">${v.toFixed(3)}</td>`; });
    html += "</tr>";
  });
  box.innerHTML = html + "</tbody></table>";
  makeSortable(box.querySelector("table"));

  const filter = document.getElementById("group-filter");
  if (!filter) return;
  const options = [{ id: "all", name: "全部 37 檔" }].concat(D.groups);
  options.forEach((g, i) => {
    const b = el("button", { type: "button", "aria-pressed": i === 0 ? "true" : "false" }, g.name);
    b.addEventListener("click", () => {
      filter.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      box.querySelectorAll("tbody tr").forEach(r => {
        r.style.display = g.id === "all" || r.dataset.group === g.id ? "" : "none";
      });
    });
    filter.appendChild(b);
  });
}

/* 6. 相關係數熱圖（表 2 至表 5）：容器 id="corr-heatmap"；最低相關查詢 id="lowest-corr" */
function mixColor(from, to, t) {
  const f = from.match(/\w\w/g).map(h => parseInt(h, 16));
  const g = to.match(/\w\w/g).map(h => parseInt(h, 16));
  return "rgb(" + f.map((v, i) => Math.round(v + (g[i] - v) * t)).join(",") + ")";
}
function corrColor(v) {
  const t = Math.min(Math.abs(v) / 0.7, 1);
  return v >= 0 ? mixColor("F1F2F4", "1F3A5F", t) : mixColor("F1F2F4", "A33A3A", t);
}

function renderHeatmap() {
  const box = document.getElementById("corr-heatmap");
  if (!box || !window.REPORT_DATA) return;
  const D = window.REPORT_DATA;
  const T = D.correlation.tickers, M = D.correlation.matrix;
  const groupOf = Object.fromEntries(D.assets.map(a => [a.ticker, a.group]));
  const starts = T.map((t, i) => i > 0 && groupOf[t] !== groupOf[T[i - 1]]);
  let html = "<table class='heatmap' aria-label='37 檔資產相關係數矩陣'><thead><tr><th></th>";
  T.forEach((t, j) => { html += `<th class="${starts[j] ? "group-start" : ""}">${t}</th>`; });
  html += "</tr></thead><tbody>";
  T.forEach((r, i) => {
    html += `<tr><th>${r}</th>`;
    T.forEach((c, j) => {
      const v = M[i][j];
      html += `<td class="${starts[j] ? "group-start" : ""}" style="background:${corrColor(v)}" data-tip="${r} × ${c}：${v.toFixed(3)}"></td>`;
    });
    html += "</tr>";
  });
  box.innerHTML = html + "</tbody></table>";
  attachTooltip(box);
}

function renderLowest() {
  const box = document.getElementById("lowest-corr");
  if (!box || !window.REPORT_DATA) return;
  const D = window.REPORT_DATA;
  const T = D.correlation.tickers, M = D.correlation.matrix;
  const nameOf = Object.fromEntries(D.assets.map(a => [a.ticker, a.name]));
  const select = el("select", { class: "control", "aria-label": "選擇資產" });
  T.forEach(t => select.appendChild(el("option", { value: t }, t + "｜" + nameOf[t])));
  select.value = "SPY";
  const list = el("ol", { class: "lowest-list" });
  function update() {
    const i = T.indexOf(select.value);
    const pairs = T.map((t, j) => ({ t, v: M[i][j] })).filter((p, j) => j !== i).sort((a, b) => a.v - b.v).slice(0, 5);
    list.innerHTML = pairs.map(p => `<li><strong>${p.t}</strong>（${nameOf[p.t]}）：<span class="num">${p.v.toFixed(3)}</span></li>`).join("");
  }
  select.addEventListener("change", update);
  box.appendChild(el("label", {}, "選一檔資產："));
  box.appendChild(select);
  box.appendChild(list);
  update();
}

/* 7. 績效總表（表 6）：容器 id="perf-table"；夏普指標長條圖 id="sharpe-bars" */
function renderPerfTable() {
  const box = document.getElementById("perf-table");
  if (!box || !window.REPORT_DATA) return;
  const D = window.REPORT_DATA;
  let html = "<table class='sortable-table'><thead><tr><th>策略</th><th>類型</th>";
  D.performanceColumns.forEach(c => { html += `<th>${c}</th>`; });
  html += "</tr></thead><tbody>";
  D.performance.forEach(p => {
    const cls = p.strategy === "NS-GMVP" ? "highlight" : p.strategy === "Tangency" ? "danger" : "";
    html += `<tr class="${cls}"><td>${p.strategy}</td><td class="text">${p.type}</td>`;
    p.values.forEach(v => { html += `<td class="num" data-value="${v}">${v.toFixed(3)}</td>`; });
    html += "</tr>";
  });
  box.innerHTML = html + "</tbody></table>";
  makeSortable(box.querySelector("table"));
}

function renderSharpeBars() {
  const box = document.getElementById("sharpe-bars");
  if (!box || !window.REPORT_DATA) return;
  const D = window.REPORT_DATA;
  const col = D.performanceColumns.indexOf("Sharpe");
  const rows = D.performance.map(p => ({ s: p.strategy, v: p.values[col] }));
  const min = Math.min(0, ...rows.map(r => r.v)), max = Math.max(...rows.map(r => r.v));
  const span = (max - min) * 1.35;  // 右側留空間放數值標籤
  const zero = (-min / span) * 100;
  box.innerHTML = "";
  rows.forEach(r => {
    box.appendChild(el("div", {}, r.s));
    const track = el("div", { class: "bar-track", "data-tip": `${r.s} 夏普指標：${r.v.toFixed(3)}` });
    const w = Math.abs(r.v) / span * 100;
    const left = r.v >= 0 ? zero : zero - w;
    track.appendChild(el("div", { class: "bar " + (r.v >= 0 ? "pos" : "neg") + (r.s === "NS-GMVP" ? " focus" : ""), style: `left:${left}%;width:${w}%` }));
    track.appendChild(el("div", { class: "zero", style: `left:${zero}%` }));
    const labelPos = r.v >= 0 ? `left:calc(${left + w}% + 6px)` : `left:calc(${zero}% + 6px)`;
    track.appendChild(el("span", { class: "bar-value num", style: labelPos }, r.v.toFixed(3)));
    box.appendChild(track);
  });
  attachTooltip(box);
}

/* 8. 提示框：任何帶 data-tip 的元素，滑鼠移上去就顯示 */
function attachTooltip(container) {
  let tip = document.getElementById("tooltip");
  if (!tip) { tip = el("div", { id: "tooltip", role: "status" }); document.body.appendChild(tip); }
  container.addEventListener("mousemove", e => {
    const target = e.target.closest("[data-tip]");
    if (!target) { tip.style.display = "none"; return; }
    tip.textContent = target.dataset.tip;
    tip.style.display = "block";
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + "px";
    tip.style.top = (e.clientY + 14) + "px";
  });
  container.addEventListener("mouseleave", () => { tip.style.display = "none"; });
}

/* 9. 啟動 */
buildHeader();
buildChapterCards();
renderStatsTable();
renderHeatmap();
renderLowest();
renderPerfTable();
renderSharpeBars();
document.querySelectorAll("table.sortable-table").forEach(t => { if (!t.closest("#stats-table, #perf-table")) makeSortable(t); });
buildPager();
buildFooter();
