let products = [];
let overview = null;
let currentView = "core";
let currentPage = 1;
const pageSize = 25;
let drawerProduct = null;
let activeColumnFilter = null;
let activeColumnFilterButton = null;
let pendingColumnFilterSelection = new Set();
const columnFilters = {};
const columnWidthsByView = { core: {}, full: {} };
const manuallyResizedColumnsByView = { core: new Set(), full: new Set() };
let columnResizeState = null;
let activeInsightType = null;
let activeInsightFilter = "all";
let activeInsightTrigger = null;
let activeWeekStart = formatIsoDate(getThursdayWeek(new Date()));
let pendingWeekStart = activeWeekStart;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function parseLocalDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

function getThursdayWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() - 4 + 7) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

function getWeekRange(startIso) {
  const start = parseLocalDate(startIso);
  return {
    start: startIso,
    end: formatIsoDate(addDays(start, 6))
  };
}

function getLatestSelectableWeekStart() {
  const today = new Date();
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return formatIsoDate(getThursdayWeek(localToday));
}

function getTodayIsoDate() {
  const today = new Date();
  return formatIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
}

function formatWeekRange(startIso) {
  const range = getWeekRange(startIso);
  return `${range.start} 至 ${range.end}`;
}

function renderWeekPreview() {
  const latestWeekStart = getLatestSelectableWeekStart();
  $("#weekPreviewLabel").textContent = formatWeekRange(pendingWeekStart);
  $("#weekDateInput").value = pendingWeekStart;
  $("#weekDateInput").max = getTodayIsoDate();
  $("#nextWeek").disabled = pendingWeekStart >= latestWeekStart;
}

function openWeekPicker() {
  pendingWeekStart = activeWeekStart;
  renderWeekPreview();
  $("#weekPickerPopover").hidden = false;
  $("#weekRangeTrigger").setAttribute("aria-expanded", "true");
  window.requestAnimationFrame(() => $("#weekDateInput").focus());
}

function closeWeekPicker({ restoreFocus = false } = {}) {
  $("#weekPickerPopover").hidden = true;
  $("#weekRangeTrigger").setAttribute("aria-expanded", "false");
  if (restoreFocus) $("#weekRangeTrigger").focus();
}

function shiftPendingWeek(amount) {
  const nextStart = formatIsoDate(addDays(parseLocalDate(pendingWeekStart), amount * 7));
  if (nextStart > getLatestSelectableWeekStart()) return;
  pendingWeekStart = nextStart;
  renderWeekPreview();
}

function formatCurrency(value) {
  return `€${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatPreciseCurrency(value) {
  return value == null ? "—" : `€${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value, digits = 1) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

function formatNullablePercent(value, digits = 1) {
  return value == null ? "—" : formatPercent(value, digits);
}

function formatDecimalCurrency(value) {
  return value == null ? "—" : `€${Number(value).toFixed(2)}`;
}

function classifyProduct(product) {
  const hasActual = product.actual_daily_sales != null;
  const actualRatio = hasActual ? product.actual_daily_sales / Math.max(product.target_daily_sales, 1) : null;
  const adHigh = hasActual && (
    product.actual_ad_sales_ratio > product.ad_sales_ratio ||
    product.actual_acos > product.acos ||
    product.actual_cvr < product.cvr
  );
  const level = !hasActual ? "P3" : adHigh || actualRatio < 0.85 ? "P5" : actualRatio < 1 ? "P4" : "P3";
  const adResult = !hasActual ? "待回填" : adHigh ? "未达标" : "达标";
  const profitResult = product.unit_price ? "有效" : "待测算";
  const action = !hasActual ? "等待实际数据" : adHigh ? "优化广告结构" : actualRatio < 1 ? "关注日销差额" : "继续观察";
  return {
    ...product,
    level,
    adResult,
    profitResult,
    action,
    hasActual,
    salesResult: !hasActual ? "待回填" : actualRatio >= 1 ? "达标" : "未达标",
    weeklySales: hasActual ? product.actual_sales_amount : null,
    weeklyOrders: hasActual ? product.actual_sales : null,
    isFavorite: Boolean(product.is_favorite)
  };
}

function normalizeProductPeriod(product, actualPeriod = {}) {
  if (!product) return product;
  const periodDays = Number(product.actual_period_days ?? actualPeriod.days ?? 0);
  const toDailyValue = (dailyValue, totalValue) => {
    if (dailyValue != null) return Number(dailyValue);
    return totalValue == null || periodDays <= 0 ? null : Number(totalValue) / periodDays;
  };
  return {
    ...product,
    actual_start_time: product.actual_start_time ?? actualPeriod.start_time ?? null,
    actual_end_time: product.actual_end_time ?? actualPeriod.end_time ?? null,
    actual_period_days: periodDays,
    actual_daily_ad_orders: toDailyValue(product.actual_daily_ad_orders, product.actual_ad_orders),
    actual_daily_clicks: toDailyValue(product.actual_daily_clicks, product.actual_clicks)
  };
}

function renderMetrics() {
  const enriched = products.map(classifyProduct);
  const riskCount = enriched.filter((product) => product.level === "P5").length;
  const favoriteIssueCount = enriched.filter((product) => product.isFavorite && product.status !== "normal").length;
  const adComparable = enriched.filter((product) => product.actual_daily_ad_spend != null && product.actual_cvr != null && product.actual_acos != null);
  const adPassCount = adComparable.filter((product) => (
    product.actual_daily_ad_spend <= product.target_daily_ad_spend &&
    product.actual_cvr >= product.cvr &&
    product.actual_acos <= product.acos
  )).length;
  const profitComparable = enriched.filter((product) => product.expected_profit_margin != null);
  const profitPassCount = profitComparable.filter((product) => product.expected_profit_margin >= 0.12).length;
  $("#visibleProductCount").textContent = enriched.length;
  $("#riskProductCount").textContent = riskCount;
  $("#adPassRate").textContent = adComparable.length ? formatPercent(adPassCount / adComparable.length, 0) : "—";
  $("#profitPassRate").textContent = profitComparable.length ? formatPercent(profitPassCount / profitComparable.length, 0) : "—";
  $("#favoriteIssueCount").textContent = favoriteIssueCount;
}

function renderSeverity() {
  const enriched = products.map(classifyProduct);
  const counts = {
    P5: enriched.filter((item) => item.actual_acos > item.acos).length,
    P4: enriched.filter((item) => item.actual_acos <= item.acos && item.actual_cvr < item.cvr).length,
    P3: enriched.filter((item) => item.actual_acos <= item.acos && item.actual_cvr >= item.cvr).length
  };
  const total = Math.max(enriched.length, 1);
  ["P5", "P4", "P3"].forEach((level) => {
    const id = level.toLowerCase();
    $(`#${id}Count`).textContent = counts[level];
    $(`#${id}Bar`).style.width = `${(counts[level] / total) * 100}%`;
  });
}

function getFilteredProducts() {
  const favoriteOnly = $("#favoriteOnly").checked;

  return products
    .map(classifyProduct)
    .filter((product) => {
      const matchesFavorite = !favoriteOnly || product.isFavorite;
      const matchesColumnFilters = Object.entries(columnFilters).every(([key, selectedValues]) => (
        selectedValues.has(getColumnFilterValue(product, key))
      ));
      return matchesFavorite && matchesColumnFilters;
    })
    .sort((a, b) => {
      const targetDifference = Number(b.target_daily_sales || 0) - Number(a.target_daily_sales || 0);
      return targetDifference || a.product_name.localeCompare(b.product_name, "zh-CN", { numeric: true });
    });
}

function getColumnFilterValue(product, key) {
  const completionRate = product.hasActual
    ? product.actual_daily_sales / Math.max(product.target_daily_sales, 1)
    : null;
  const values = {
    product_name: product.product_name,
    owner: product.owner,
    season: product.season,
    activity_type: product.activity_type,
    monthly_sales: product.monthly_sales,
    target_daily_sales: product.target_daily_sales,
    actual_daily_sales: product.actual_daily_sales,
    completion_rate: completionRate,
    unit_price: product.unit_price,
    actual_daily_ad_spend: product.actual_daily_ad_spend,
    actual_ad_orders: product.actual_daily_ad_orders,
    actual_ad_order_ratio: product.actual_ad_order_ratio,
    actual_cpc: product.actual_cpc,
    actual_cvr: product.actual_cvr,
    actual_ctr: product.actual_ctr,
    actual_clicks: product.actual_daily_clicks,
    actual_acos: product.actual_acos,
    actual_ad_sales_ratio: product.actual_ad_sales_ratio,
    actual_ad_sales_amount: product.actual_ad_sales_amount,
    actual_sales: product.actual_sales,
    actual_sales_amount: product.actual_sales_amount,
    actual_average_price: product.actual_average_price,
    multi_channel_sales: product.multi_channel_sales,
    expected_profit_margin: product.expected_profit_margin,
    level: product.level,
    reviewed: product.reviewed ? "completed" : "pending"
  };
  const value = values[key];
  return value == null ? "__EMPTY__" : String(value);
}

function formatColumnFilterValue(key, value) {
  if (value === "__EMPTY__") return "空白";
  const numericValue = Number(value);
  if (["completion_rate", "actual_ad_order_ratio", "actual_cvr", "actual_ctr", "actual_acos", "actual_ad_sales_ratio", "expected_profit_margin"].includes(key)) {
    return formatPercent(numericValue);
  }
  if (["unit_price", "actual_daily_ad_spend", "actual_cpc", "actual_ad_sales_amount", "actual_sales_amount", "actual_average_price"].includes(key)) {
    return formatPreciseCurrency(numericValue);
  }
  if (key === "reviewed") return value === "completed" ? "已复盘" : "待复盘";
  return value;
}

const tableColumnWidths = {
  product_name: 250,
  owner: 90,
  season: 90,
  activity_type: 110,
  monthly_sales: 110,
  target_daily_sales: 90,
  actual_daily_sales: 125,
  completion_rate: 125,
  unit_price: 120,
  actual_daily_ad_spend: 270,
  actual_ad_orders: 115,
  actual_ad_order_ratio: 140,
  actual_cpc: 135,
  actual_cvr: 135,
  actual_ctr: 95,
  actual_clicks: 130,
  actual_acos: 135,
  actual_ad_sales_ratio: 135,
  actual_ad_sales_amount: 120,
  actual_sales: 105,
  actual_sales_amount: 120,
  actual_average_price: 150,
  multi_channel_sales: 120,
  expected_profit_margin: 110,
  level: 125,
  reviewed: 100
};

function getVisibleTableColumns() {
  const coreColumns = [
    "product_name", "owner", "target_daily_sales", "actual_daily_sales", "completion_rate",
    "actual_daily_ad_spend", "actual_ad_orders", "actual_ad_order_ratio", "actual_cpc",
    "actual_cvr", "actual_acos", "actual_ad_sales_ratio", "level", "reviewed"
  ];
  if (currentView === "core") return coreColumns;
  return [
    "product_name", "owner", "season", "activity_type", "monthly_sales", "target_daily_sales",
    "actual_daily_sales", "completion_rate", "unit_price", "actual_daily_ad_spend",
    "actual_ad_orders", "actual_ad_order_ratio", "actual_cpc", "actual_cvr", "actual_ctr",
    "actual_clicks", "actual_acos", "actual_ad_sales_ratio", "actual_ad_sales_amount",
    "actual_sales", "actual_sales_amount", "actual_average_price", "multi_channel_sales",
    "expected_profit_margin", "level", "reviewed"
  ];
}

function getColumnWidth(key) {
  return columnWidthsByView[currentView][key] || tableColumnWidths[key] || 100;
}

function syncReviewTableWidth() {
  const table = $("#reviewTable");
  const wrap = table.closest(".table-wrap");
  const columns = getVisibleTableColumns();
  const savedWidths = Object.fromEntries(columns.map((key) => [key, getColumnWidth(key)]));
  const totalWidth = columns.reduce((total, key) => total + savedWidths[key], 0);
  const availableWidth = wrap.clientWidth - 2;
  const fittedWidth = Math.max(totalWidth, availableWidth);
  const flexibleColumns = columns.filter((key) => !manuallyResizedColumnsByView[currentView].has(key));
  const fillColumns = flexibleColumns.length ? flexibleColumns : [columns[columns.length - 1]];
  const remainingWidth = Math.max(0, availableWidth - totalWidth);
  const extraPerColumn = remainingWidth / fillColumns.length;
  columns.forEach((key) => {
    const column = $(`#reviewTableCols col[data-column-key="${key}"]`);
    if (!column) return;
    const renderedWidth = savedWidths[key] + (fillColumns.includes(key) ? extraPerColumn : 0);
    column.style.width = `${renderedWidth}px`;
  });
  table.style.width = `${fittedWidth}px`;
  table.style.minWidth = `${fittedWidth}px`;
}

function renderReviewTableColumns() {
  $("#reviewTableCols").innerHTML = getVisibleTableColumns().map((key) => (
    `<col data-column-key="${key}" style="width: ${getColumnWidth(key)}px" />`
  )).join("");
  syncReviewTableWidth();
}

function getRenderedColumnWidth(key) {
  const column = $(`#reviewTableCols col[data-column-key="${key}"]`);
  return column ? Math.round(column.getBoundingClientRect().width) : getColumnWidth(key);
}

function applyColumnWidth(key, width) {
  columnWidthsByView[currentView][key] = width;
  syncReviewTableWidth();
}

function beginColumnResize(event, handle) {
  event.preventDefault();
  event.stopPropagation();
  const key = handle.dataset.columnKey;
  const renderedWidth = getRenderedColumnWidth(key);
  columnWidthsByView[currentView][key] = renderedWidth;
  manuallyResizedColumnsByView[currentView].add(key);
  columnResizeState = {
    key,
    startX: event.clientX,
    startWidth: renderedWidth,
    minimumWidth: key === "product_name" ? 180 : 72
  };
  handle.classList.add("is-resizing");
  document.body.classList.add("is-resizing-column");
}

function resizeTableColumn(event) {
  if (!columnResizeState) return;
  const nextWidth = Math.max(
    columnResizeState.minimumWidth,
    Math.round(columnResizeState.startWidth + event.clientX - columnResizeState.startX)
  );
  applyColumnWidth(columnResizeState.key, nextWidth);
}

function endColumnResize() {
  if (!columnResizeState) return;
  $$(".column-resize-handle.is-resizing").forEach((handle) => handle.classList.remove("is-resizing"));
  document.body.classList.remove("is-resizing-column");
  columnResizeState = null;
}

function renderFilterHeader(label, key, extraClass = "") {
  const isActive = Boolean(columnFilters[key]);
  return `<th class="filterable-header ${extraClass}${isActive ? " has-filter" : ""}">
    <span>${label}</span>
    <button class="column-filter-button" type="button" data-filter-key="${key}" data-filter-label="${label}" aria-label="筛选${label}" aria-expanded="false">
      <i data-lucide="${isActive ? "list-filter" : "filter"}"></i>
    </button>
    <button class="column-resize-handle" type="button" data-column-key="${key}" aria-label="调整${label}列宽" title="拖动调整列宽，双击恢复默认宽度"></button>
  </th>`;
}

function renderReviewTableHead() {
  const isFull = currentView === "full";
  $("#reviewTable").classList.toggle("is-full", isFull);
  renderReviewTableColumns();
  $("#reviewTableHead").innerHTML = `
    <tr class="table-group-row">
      ${renderFilterHeader("产品", "product_name", "sticky-column product-column product-filter-header").replace("<th ", '<th rowspan="2" ')}
      <th class="group-heading group-product" colspan="${isFull ? 3 : 1}">产品信息</th>
      <th class="group-heading group-sales" colspan="${isFull ? 5 : 3}">销售目标与实际</th>
      <th class="group-heading group-ad" colspan="${isFull ? 10 : 7}">广告表现</th>
      ${isFull ? '<th class="group-heading group-history" colspan="4">阶段实际数据</th>' : ""}
      ${isFull ? '<th class="group-heading group-profit" colspan="1">利润表现</th>' : ""}
      <th class="group-heading group-review" colspan="2">复盘</th>
    </tr>
    <tr class="table-label-row">
      ${renderFilterHeader("负责人", "owner")}
      ${isFull ? renderFilterHeader("季节", "season") + renderFilterHeader("活动类型", "activity_type") : ""}
      ${isFull ? renderFilterHeader("月销目标", "monthly_sales") : ""}
      ${renderFilterHeader("目标日销", "target_daily_sales")}
      ${renderFilterHeader("实际日销", "actual_daily_sales")}
      ${renderFilterHeader("日销完成率", "completion_rate")}
      ${isFull ? renderFilterHeader("目标客单价", "unit_price") : ""}
      ${renderFilterHeader("广告花费", "actual_daily_ad_spend")}
      ${renderFilterHeader("广告订单", "actual_ad_orders")}
      ${renderFilterHeader("广告单占比", "actual_ad_order_ratio")}
      ${renderFilterHeader("CPC", "actual_cpc")}
      ${renderFilterHeader("CVR", "actual_cvr")}
      ${isFull ? renderFilterHeader("CTR", "actual_ctr") + renderFilterHeader("点击量", "actual_clicks") : ""}
      ${renderFilterHeader("ACOS", "actual_acos")}
      ${renderFilterHeader("广告比", "actual_ad_sales_ratio")}
      ${isFull ? renderFilterHeader("广告销售额", "actual_ad_sales_amount") : ""}
      ${isFull ? renderFilterHeader(overview?.actual_period?.days ? `${overview.actual_period.days}天销量` : "阶段销量", "actual_sales") + renderFilterHeader("阶段销售额", "actual_sales_amount") + renderFilterHeader("实际均价", "actual_average_price") + renderFilterHeader("多渠道销量", "multi_channel_sales") : ""}
      ${isFull ? renderFilterHeader("净利润率", "expected_profit_margin") : ""}
      ${renderFilterHeader("风险等级", "level")}
      ${renderFilterHeader("复盘", "reviewed")}
    </tr>
  `;
}

function renderNumberCell(value, suffix = "", valueClass = "") {
  const suffixes = Array.isArray(suffix) ? suffix : suffix ? [suffix] : [];
  if (!suffixes.length) return `<td class="number-cell"><strong class="${valueClass}">${value}</strong></td>`;
  return `<td class="number-cell"><div class="inline-metric"><strong class="${valueClass}">${value}</strong>${suffixes.map((item) => `<span class="metric-separator">/</span><span>${item}</span>`).join("")}</div></td>`;
}

function renderAdSpendCell(product, valueClass = "") {
  return `<td class="number-cell ad-spend-cell"><div class="inline-metric ad-spend-inline">
    <strong class="${valueClass}">${formatPreciseCurrency(product.actual_daily_ad_spend)}</strong>
    <span class="metric-separator">/</span><span>总${formatPreciseCurrency(product.actual_ad_spend)}</span>
    <span class="metric-separator">/</span><span>目标${formatCurrency(product.target_daily_ad_spend)}</span>
  </div></td>`;
}

function sumProductValues(rows, key) {
  return rows.reduce((total, product) => {
    const value = product[key];
    return total + (value == null || Number.isNaN(Number(value)) ? 0 : Number(value));
  }, 0);
}

function averageProductValues(rows, key) {
  const values = rows
    .map((product) => product[key])
    .filter((value) => value != null && !Number.isNaN(Number(value)))
    .map(Number);
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function divideTotals(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function formatSummaryNumber(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(Number(value).toFixed(digits)).toLocaleString("en-US");
}

function renderReviewSummary(rows) {
  const summary = $("#reviewTableSummary");
  if (!rows.length) {
    summary.innerHTML = "";
    summary.hidden = true;
    return;
  }

  const isFull = currentView === "full";
  const targetDailySales = sumProductValues(rows, "target_daily_sales");
  const actualDailySales = sumProductValues(rows, "actual_daily_sales");
  const actualSales = sumProductValues(rows, "actual_sales");
  const actualSalesAmount = sumProductValues(rows, "actual_sales_amount");
  const targetDailyAdSpend = sumProductValues(rows, "target_daily_ad_spend");
  const actualDailyAdSpend = sumProductValues(rows, "actual_daily_ad_spend");
  const actualAdSpend = sumProductValues(rows, "actual_ad_spend");
  const targetAdOrders = sumProductValues(rows, "ad_orders");
  const actualDailyAdOrders = sumProductValues(rows, "actual_daily_ad_orders");
  const actualAdOrders = sumProductValues(rows, "actual_ad_orders");
  const targetClicks = sumProductValues(rows, "clicks");
  const actualDailyClicks = sumProductValues(rows, "actual_daily_clicks");
  const actualClicks = sumProductValues(rows, "actual_clicks");
  const actualAdSalesAmount = sumProductValues(rows, "actual_ad_sales_amount");
  const completionRate = divideTotals(actualDailySales, targetDailySales);
  const actualAdOrderRatio = divideTotals(actualAdOrders, actualSales);
  const targetAdOrderRatio = averageProductValues(rows, "ad_order_ratio");
  const actualCpc = divideTotals(actualAdSpend, actualClicks);
  const targetCpc = divideTotals(targetDailyAdSpend, targetClicks);
  const actualCvr = divideTotals(actualAdOrders, actualClicks);
  const targetCvr = divideTotals(targetAdOrders, targetClicks);
  const actualAcos = divideTotals(actualAdSpend, actualAdSalesAmount);
  const targetAcos = averageProductValues(rows, "acos");
  const actualAdSalesRatio = divideTotals(actualAdSalesAmount, actualSalesAmount);
  const targetAdSalesRatio = averageProductValues(rows, "ad_sales_ratio");
  const averagePrice = divideTotals(actualSalesAmount, actualSales);
  summary.hidden = false;
  summary.innerHTML = `
    <tr class="summary-row">
      <td class="sticky-column summary-label-cell"><div><strong>当前页统计</strong><span>${rows.length}款</span></div></td>
      <td class="summary-empty"></td>
      ${isFull ? '<td class="summary-empty"></td><td class="summary-empty"></td>' : ""}
      ${isFull ? renderNumberCell(formatSummaryNumber(sumProductValues(rows, "monthly_sales"), 0)) : ""}
      ${renderNumberCell(formatSummaryNumber(targetDailySales))}
      ${renderNumberCell(formatSummaryNumber(actualDailySales), `${formatSummaryNumber(actualSales, 0)}件`)}
      ${renderNumberCell(formatNullablePercent(completionRate, 1), "整体完成率")}
      ${isFull ? renderNumberCell(formatPreciseCurrency(averageProductValues(rows, "unit_price")), "平均") : ""}
      <td class="number-cell ad-spend-cell"><div class="inline-metric ad-spend-inline">
        <strong>${formatPreciseCurrency(actualDailyAdSpend)}</strong>
        <span class="metric-separator">/</span><span>总${formatPreciseCurrency(actualAdSpend)}</span>
        <span class="metric-separator">/</span><span>目标${formatPreciseCurrency(targetDailyAdSpend)}</span>
      </div></td>
      ${renderNumberCell(formatSummaryNumber(actualDailyAdOrders), [`总${formatSummaryNumber(actualAdOrders, 0)}`, `目标${formatSummaryNumber(targetAdOrders, 0)}`])}
      ${renderNumberCell(formatNullablePercent(actualAdOrderRatio), `目标${formatNullablePercent(targetAdOrderRatio)}`)}
      ${renderNumberCell(formatDecimalCurrency(actualCpc), `目标${formatDecimalCurrency(targetCpc)}`)}
      ${renderNumberCell(formatNullablePercent(actualCvr), `目标${formatNullablePercent(targetCvr)}`)}
      ${isFull ? renderNumberCell(formatNullablePercent(averageProductValues(rows, "actual_ctr"))) : ""}
      ${isFull ? renderNumberCell(formatSummaryNumber(actualDailyClicks), [`总${formatSummaryNumber(actualClicks, 0)}`, `目标${formatSummaryNumber(targetClicks, 0)}`]) : ""}
      ${renderNumberCell(formatNullablePercent(actualAcos), `目标${formatNullablePercent(targetAcos)}`)}
      ${renderNumberCell(formatNullablePercent(actualAdSalesRatio), `目标${formatNullablePercent(targetAdSalesRatio)}`)}
      ${isFull ? renderNumberCell(formatPreciseCurrency(actualAdSalesAmount)) : ""}
      ${isFull ? renderNumberCell(formatSummaryNumber(actualSales, 0)) : ""}
      ${isFull ? renderNumberCell(formatPreciseCurrency(actualSalesAmount)) : ""}
      ${isFull ? renderNumberCell(formatPreciseCurrency(averagePrice), "整体均价") : ""}
      ${isFull ? renderNumberCell(formatSummaryNumber(sumProductValues(rows, "multi_channel_sales"), 0)) : ""}
      ${isFull ? renderNumberCell(formatNullablePercent(averageProductValues(rows, "expected_profit_margin")), "平均") : ""}
      <td class="summary-empty"></td>
      <td class="summary-empty"></td>
    </tr>
  `;
}

function getPaginationItems(totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visiblePages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const items = [];
  visiblePages.forEach((page, index) => {
    if (index && page - visiblePages[index - 1] > 1) items.push("ellipsis");
    items.push(page);
  });
  return items;
}

function renderTablePagination(totalRows, totalPages) {
  const pagination = $("#tablePagination");
  if (!totalRows) {
    pagination.innerHTML = "";
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;
  pagination.innerHTML = `
    <span class="pagination-total">共 ${totalRows} 条</span>
    <div class="pagination-controls">
      <button class="pagination-button pagination-arrow" type="button" data-page="${currentPage - 1}" title="上一页" aria-label="上一页" ${currentPage === 1 ? "disabled" : ""}>
        <i data-lucide="chevron-left"></i>
      </button>
      ${getPaginationItems(totalPages).map((item) => item === "ellipsis"
        ? '<span class="pagination-ellipsis">...</span>'
        : `<button class="pagination-button${item === currentPage ? " active" : ""}" type="button" data-page="${item}" ${item === currentPage ? 'aria-current="page"' : ""}>${item}</button>`
      ).join("")}
      <button class="pagination-button pagination-arrow" type="button" data-page="${currentPage + 1}" title="下一页" aria-label="下一页" ${currentPage === totalPages ? "disabled" : ""}>
        <i data-lucide="chevron-right"></i>
      </button>
    </div>
    <span class="pagination-range">第 ${currentPage}/${totalPages} 页</span>
  `;
}

function getComparisonClass(actual, target, lowerIsBetter = false) {
  if (actual == null || target == null) return "";
  if (Number(actual) === Number(target)) return "equal-text";
  const isBetter = lowerIsBetter ? Number(actual) < Number(target) : Number(actual) > Number(target);
  return isBetter ? "good-text" : "bad-text";
}

function renderProductThumb(product) {
  const image = product.product_image_url
    ? `<img src="${product.product_image_url}" alt="${product.product_name}" loading="lazy" />`
    : "";
  return `<span class="product-thumb${image ? " has-image" : " is-placeholder"}">${image}<i data-lucide="image"></i></span>`;
}

function renderReviewTable() {
  const filteredRows = getFilteredProducts();
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const rows = filteredRows.slice(pageStart, pageStart + pageSize);
  const isFull = currentView === "full";
  renderReviewTableHead();
  $("#reviewTableBody").innerHTML = rows.map((product, rowIndex) => {
    const completionRate = product.hasActual ? product.actual_daily_sales / Math.max(product.target_daily_sales, 1) : null;
    const salesComparison = getComparisonClass(product.actual_daily_sales, product.target_daily_sales);
    const spendComparison = getComparisonClass(product.actual_daily_ad_spend, product.target_daily_ad_spend, true);
    const adOrdersComparison = getComparisonClass(product.actual_daily_ad_orders, product.ad_orders);
    const adOrderRatioComparison = getComparisonClass(product.actual_ad_order_ratio, product.ad_order_ratio);
    const cpcComparison = getComparisonClass(product.actual_cpc, product.cpc, true);
    const cvrComparison = getComparisonClass(product.actual_cvr, product.cvr);
    const clicksComparison = getComparisonClass(product.actual_daily_clicks, product.clicks);
    const acosComparison = getComparisonClass(product.actual_acos, product.acos, true);
    const adRatioComparison = getComparisonClass(product.actual_ad_sales_ratio, product.ad_sales_ratio, true);
    const priceComparison = getComparisonClass(product.actual_average_price, product.unit_price);
    const profitClass = product.expected_profit_margin == null ? "" : product.expected_profit_margin >= 0.12 ? "good-text" : "bad-text";
    return `
    <tr data-product-id="${product.product_id}">
      <td class="sticky-column product-column">
        <div class="product-cell">
          <span class="table-row-number" aria-label="第 ${pageStart + rowIndex + 1} 行">${pageStart + rowIndex + 1}</span>
          ${renderProductThumb(product)}
          <div class="product-name">
            <strong>${product.product_name}</strong>
          </div>
        </div>
      </td>
      <td class="text-cell">${product.owner}</td>
      ${isFull ? `<td class="text-cell">${product.season}</td><td class="text-cell"><span class="activity-tag">${product.activity_type}</span></td>` : ""}
      ${isFull ? renderNumberCell(product.monthly_sales) : ""}
      ${renderNumberCell(product.target_daily_sales)}
      ${renderNumberCell(product.hasActual ? Number(product.actual_daily_sales.toFixed(1)) : "—", product.hasActual ? `${product.actual_period_days}天${product.actual_sales}件` : "待回填", salesComparison)}
      ${renderNumberCell(completionRate == null ? "—" : formatPercent(completionRate, 0), product.salesResult, completionRate == null ? "" : completionRate >= 1 ? "good-text" : "bad-text")}
      ${isFull ? renderNumberCell(formatCurrency(product.unit_price)) : ""}
      ${renderAdSpendCell(product, spendComparison)}
      ${renderNumberCell(formatSummaryNumber(product.actual_daily_ad_orders), [`总${formatSummaryNumber(product.actual_ad_orders, 0)}`, `目标${product.ad_orders}`], adOrdersComparison)}
      ${renderNumberCell(formatNullablePercent(product.actual_ad_order_ratio), `目标${formatPercent(product.ad_order_ratio)}`, adOrderRatioComparison)}
      ${renderNumberCell(formatDecimalCurrency(product.actual_cpc), `目标${formatDecimalCurrency(product.cpc)}`, cpcComparison)}
      ${renderNumberCell(formatNullablePercent(product.actual_cvr), `目标${formatPercent(product.cvr)}`, cvrComparison)}
      ${isFull ? renderNumberCell(formatNullablePercent(product.actual_ctr)) : ""}
      ${isFull ? renderNumberCell(formatSummaryNumber(product.actual_daily_clicks), [`总${formatSummaryNumber(product.actual_clicks, 0)}`, `目标${product.clicks}`], clicksComparison) : ""}
      ${renderNumberCell(formatNullablePercent(product.actual_acos), `目标${formatPercent(product.acos)}`, acosComparison)}
      ${renderNumberCell(formatNullablePercent(product.actual_ad_sales_ratio), `目标${formatPercent(product.ad_sales_ratio)}`, adRatioComparison)}
      ${isFull ? renderNumberCell(formatPreciseCurrency(product.actual_ad_sales_amount)) : ""}
      ${isFull ? renderNumberCell(product.actual_sales ?? "—") : ""}
      ${isFull ? renderNumberCell(formatPreciseCurrency(product.actual_sales_amount)) : ""}
      ${isFull ? renderNumberCell(formatPreciseCurrency(product.actual_average_price), `目标${formatPreciseCurrency(product.unit_price)}`, priceComparison) : ""}
      ${isFull ? renderNumberCell(product.multi_channel_sales ?? "—") : ""}
      ${isFull ? renderNumberCell(formatNullablePercent(product.expected_profit_margin), "", profitClass) : ""}
      <td><span class="level-tag ${product.level.toLowerCase()}">${product.level}</span></td>
      <td class="review-action-cell">
        <button class="review-button ${product.reviewed ? "completed" : "pending"}" type="button" data-product-id="${product.product_id}" aria-label="复盘 ${product.product_name}">
          <i data-lucide="notebook-pen"></i><span>复盘</span>
        </button>
        <small>${product.reviewed ? "已完成" : "待复盘"}</small>
      </td>
    </tr>
  `;
  }).join("");

  renderReviewSummary(rows);
  renderTablePagination(filteredRows.length, totalPages);

  $("#emptyState").hidden = filteredRows.length > 0;
  $("#reviewTableBody").hidden = filteredRows.length === 0;
  $("#reviewTableBody").querySelectorAll(".review-button[data-product-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openDrawer(button.dataset.productId);
    });
  });
  $("#reviewTableBody").querySelectorAll(".product-thumb img").forEach((image) => {
    image.addEventListener("error", () => image.remove());
  });
  lucide.createIcons();
}

function renderFavorites() {
  const favorites = products
    .map(classifyProduct)
    .filter((product) => product.salesResult === "未达标")
    .sort((a, b) => (a.actual_daily_sales / a.target_daily_sales) - (b.actual_daily_sales / b.target_daily_sales))
    .slice(0, 3);
  $("#favoriteList").innerHTML = favorites.length ? favorites.map((product, index) => `
    <div class="focus-item">
      <span class="focus-rank">${index + 1}</span>
      <span class="product-thumb">${product.thumb}</span>
      <div class="product-name">
        <strong>${product.product_name}</strong>
        <span>日销 ${Number(product.actual_daily_sales.toFixed(1))}/${product.target_daily_sales} · 完成率 ${formatPercent(product.actual_daily_sales / Math.max(product.target_daily_sales, 1), 0)}</span>
      </div>
      <span class="status-pill risk">${product.salesResult}</span>
    </div>
  `).join("") : `<div class="empty-state"><strong>当前周期暂无收藏产品</strong></div>`;
}

function renderTargetChart() {
  const highRiskProducts = products.map(classifyProduct).filter((product) => product.level === "P5").slice(0, 3);
  $("#targetChart").innerHTML = highRiskProducts.map((product) => {
    const targetHeight = 70;
    const actualHeight = Math.min(94, Math.max(12, (product.actual_daily_sales / Math.max(product.target_daily_sales, 1)) * 70));
    const actualClass = product.actual_daily_sales >= product.target_daily_sales ? "actual" : "missed";
    return `<div class="target-bar"><i style="height:${targetHeight}px"></i><i class="${actualClass}" style="height:${actualHeight}px"></i><label>${product.thumb}</label></div>`;
  }).join("");
}

function getAdInsightCategory(product) {
  if (product.actual_daily_ad_spend == null || product.actual_cvr == null || product.actual_acos == null) return "missing";
  if (product.actual_acos > product.acos) return "acos";
  if (product.actual_cvr < product.cvr) return "cvr";
  if (product.actual_daily_ad_spend > product.target_daily_ad_spend) return "spend";
  return "healthy";
}

function isProfitRisk(product) {
  return product.expected_profit_margin != null && product.expected_profit_margin < 0.12;
}

function isFavoriteIssue(product) {
  return product.isFavorite && (
    product.salesResult === "未达标" ||
    getAdInsightCategory(product) !== "healthy" ||
    isProfitRisk(product)
  );
}

const insightConfigs = {
  visible: {
    eyebrow: "产品范围",
    title: "产品目标与实际",
    subtitle: "查看当前周期全部产品的日销目标完成情况。",
    metricHeading: "日销完成率",
    tabs: [["all", "全部产品"], ["achieved", "已达标"], ["missed", "未达标"]]
  },
  risk: {
    eyebrow: "风险下钻",
    title: "高风险产品明细",
    subtitle: "定位销售、广告或利润表现异常的 P5 产品。",
    metricHeading: "主要风险",
    tabs: [["all", "全部风险"], ["sales", "销售异常"], ["ad", "广告异常"], ["profit", "利润异常"]]
  },
  ad: {
    eyebrow: "广告分析",
    title: "广告效率分布",
    subtitle: "按广告花费、CVR 与 ACOS 综合判断广告健康度。",
    metricHeading: "ACOS 实际 / 目标",
    tabs: [["all", "全部"], ["acos", "ACOS偏高"], ["cvr", "CVR偏低"], ["spend", "花费偏高"], ["healthy", "广告健康"]]
  },
  profit: {
    eyebrow: "利润分析",
    title: "净利润率表现",
    subtitle: "以净利润率 12% 为达标线查看产品利润表现。",
    metricHeading: "净利润率",
    tabs: [["all", "全部"], ["below", "低于12%"], ["passed", "达标"], ["missing", "待测算"]]
  },
  favorite: {
    eyebrow: "重点关注",
    title: "收藏产品异常",
    subtitle: "集中查看已收藏且销售、广告或利润存在异常的产品。",
    metricHeading: "异常表现",
    tabs: [["all", "全部异常"], ["sales", "销售异常"], ["ad", "广告异常"], ["profit", "利润异常"]]
  }
};

function getInsightBaseProducts(type) {
  const enriched = products.map(classifyProduct);
  if (type === "risk") return enriched.filter((product) => product.level === "P5");
  if (type === "ad") return enriched.filter((product) => getAdInsightCategory(product) !== "missing");
  if (type === "favorite") return enriched.filter(isFavoriteIssue);
  return enriched;
}

function matchesInsightFilter(product, type, filter) {
  if (filter === "all") return true;
  if (type === "visible") return filter === "achieved" ? product.salesResult === "达标" : product.salesResult === "未达标";
  if (["risk", "favorite"].includes(type)) {
    if (filter === "sales") return product.salesResult === "未达标";
    if (filter === "ad") return getAdInsightCategory(product) !== "healthy";
    if (filter === "profit") return isProfitRisk(product);
  }
  if (type === "ad") return getAdInsightCategory(product) === filter;
  if (type === "profit") {
    if (filter === "missing") return product.expected_profit_margin == null;
    if (filter === "below") return isProfitRisk(product);
    if (filter === "passed") return product.expected_profit_margin != null && product.expected_profit_margin >= 0.12;
  }
  return true;
}

function getInsightRows() {
  const query = $("#insightSearch").value.trim().toLocaleLowerCase("zh-CN");
  return getInsightBaseProducts(activeInsightType)
    .filter((product) => matchesInsightFilter(product, activeInsightType, activeInsightFilter))
    .filter((product) => !query || `${product.product_name} ${product.owner}`.toLocaleLowerCase("zh-CN").includes(query))
    .sort((a, b) => Number(b.target_daily_sales || 0) - Number(a.target_daily_sales || 0));
}

function getInsightSummary(type) {
  const all = products.map(classifyProduct);
  const salesPassed = all.filter((product) => product.salesResult === "达标").length;
  const salesMissed = all.filter((product) => product.salesResult === "未达标").length;
  const risk = all.filter((product) => product.level === "P5");
  const adComparable = all.filter((product) => getAdInsightCategory(product) !== "missing");
  const adHealthy = adComparable.filter((product) => getAdInsightCategory(product) === "healthy").length;
  const profitComparable = all.filter((product) => product.expected_profit_margin != null);
  const profitPassed = profitComparable.filter((product) => product.expected_profit_margin >= 0.12).length;
  const favorites = all.filter(isFavoriteIssue);
  const targetSales = sumProductValues(all, "target_daily_sales");
  const actualSales = sumProductValues(all, "actual_daily_sales");
  const summaries = {
    visible: [["可见产品", all.length], ["日销达标", salesPassed], ["日销未达标", salesMissed], ["整体完成率", targetSales ? formatPercent(actualSales / targetSales, 0) : "—"]],
    risk: [["P5产品", risk.length], ["销售异常", risk.filter((product) => product.salesResult === "未达标").length], ["广告异常", risk.filter((product) => getAdInsightCategory(product) !== "healthy").length], ["利润异常", risk.filter(isProfitRisk).length]],
    ad: [["可比较产品", adComparable.length], ["广告健康", adHealthy], ["ACOS偏高", adComparable.filter((product) => getAdInsightCategory(product) === "acos").length], ["CVR偏低", adComparable.filter((product) => getAdInsightCategory(product) === "cvr").length]],
    profit: [["有效结果", profitComparable.length], ["利润率达标", profitPassed], ["低于12%", profitComparable.length - profitPassed], ["待测算", all.length - profitComparable.length]],
    favorite: [["收藏异常", favorites.length], ["销售异常", favorites.filter((product) => product.salesResult === "未达标").length], ["广告异常", favorites.filter((product) => getAdInsightCategory(product) !== "healthy").length], ["利润异常", favorites.filter(isProfitRisk).length]]
  };
  return summaries[type];
}

function getInsightDistribution(type) {
  const base = getInsightBaseProducts(type);
  if (type === "visible") return [["achieved", "日销达标", base.filter((product) => product.salesResult === "达标").length, "good"], ["missed", "日销未达标", base.filter((product) => product.salesResult === "未达标").length, "bad"]];
  if (["risk", "favorite"].includes(type)) return [["sales", "销售异常", base.filter((product) => product.salesResult === "未达标").length, "bad"], ["ad", "广告异常", base.filter((product) => getAdInsightCategory(product) !== "healthy").length, "warn"], ["profit", "利润异常", base.filter(isProfitRisk).length, "mint"]];
  if (type === "ad") return [["acos", "ACOS偏高", base.filter((product) => getAdInsightCategory(product) === "acos").length, "bad"], ["cvr", "CVR偏低", base.filter((product) => getAdInsightCategory(product) === "cvr").length, "warn"], ["spend", "花费偏高", base.filter((product) => getAdInsightCategory(product) === "spend").length, "blue"], ["healthy", "广告健康", base.filter((product) => getAdInsightCategory(product) === "healthy").length, "good"]];
  return [["below", "低于12%", base.filter(isProfitRisk).length, "bad"], ["passed", "达标", base.filter((product) => product.expected_profit_margin != null && product.expected_profit_margin >= 0.12).length, "good"], ["missing", "待测算", base.filter((product) => product.expected_profit_margin == null).length, "muted"]];
}

function renderInsightVisual(type) {
  if (type === "visible") {
    const featured = getInsightRows().slice(0, 8);
    if (!featured.length) {
      $("#insightVisual").innerHTML = `<div class="insight-chart-head legend-only"><div><span><i class="chart-dot target"></i>目标日销</span><span><i class="chart-dot actual"></i><i class="chart-dot missed"></i>实际日销</span></div></div><div class="insight-chart-empty"><i data-lucide="chart-column"></i><span>当前筛选条件下暂无可展示产品</span></div>`;
      return;
    }
    const maximum = Math.max(...featured.flatMap((product) => [product.target_daily_sales, product.actual_daily_sales || 0]), 1);
    $("#insightVisual").innerHTML = `<div class="insight-chart-head legend-only"><div><span><i class="chart-dot target"></i>目标日销</span><span><i class="chart-dot actual"></i><i class="chart-dot missed"></i>实际日销</span></div></div><div class="insight-bar-chart">${featured.map((product) => {
      const targetHeight = Math.max(8, product.target_daily_sales / maximum * 112);
      const actualHeight = Math.max(5, Number(product.actual_daily_sales || 0) / maximum * 112);
      const actualClass = product.actual_daily_sales >= product.target_daily_sales ? "actual" : "missed";
      return `<div class="insight-bar-group" title="${product.product_name}"><div><i class="target" style="height:${targetHeight}px"></i><i class="${actualClass}" style="height:${actualHeight}px"></i></div><span>${product.product_name}</span></div>`;
    }).join("")}</div>`;
    return;
  }
  const distribution = getInsightDistribution(type);
  const maximum = Math.max(...distribution.map((item) => item[2]), 1);
  $("#insightVisual").innerHTML = `<div class="insight-chart-head"><strong>表现分布</strong><span>点击分类可筛选下方产品</span></div><div class="insight-distribution">${distribution.map(([filter, label, count, tone]) => `<button type="button" class="insight-distribution-item ${activeInsightFilter === filter ? "active" : ""}" data-insight-filter="${filter}"><span><i class="distribution-dot ${tone}"></i>${label}</span><strong>${count}</strong><div><b class="${tone}" style="width:${count / maximum * 100}%"></b></div></button>`).join("")}</div>`;
}

function getInsightRowPresentation(product, type) {
  const completionRate = product.hasActual ? product.actual_daily_sales / Math.max(product.target_daily_sales, 1) : null;
  if (type === "ad") {
    const category = getAdInsightCategory(product);
    const labels = { acos: "ACOS偏高", cvr: "CVR偏低", spend: "花费偏高", healthy: "广告健康" };
    return { metric: `${formatNullablePercent(product.actual_acos)} / ${formatPercent(product.acos)}`, status: labels[category] || "待回填", tone: category === "healthy" ? "good" : category === "spend" ? "warn" : "bad" };
  }
  if (type === "profit") {
    if (product.expected_profit_margin == null) return { metric: "—", status: "待测算", tone: "muted" };
    return { metric: formatPercent(product.expected_profit_margin), status: product.expected_profit_margin >= 0.12 ? "达标" : "低于12%", tone: product.expected_profit_margin >= 0.12 ? "good" : "bad" };
  }
  if (type === "risk" || type === "favorite") {
    const risks = [];
    if (product.salesResult === "未达标") risks.push("销售");
    if (getAdInsightCategory(product) !== "healthy") risks.push("广告");
    if (isProfitRisk(product)) risks.push("利润");
    return { metric: risks.length ? risks.join("、") : "关注", status: product.level, tone: product.level === "P5" ? "bad" : "warn" };
  }
  return { metric: completionRate == null ? "—" : formatPercent(completionRate, 0), status: product.salesResult, tone: product.salesResult === "达标" ? "good" : "bad" };
}

function renderInsightModal() {
  const config = insightConfigs[activeInsightType];
  if (!config) return;
  $("#insightEyebrow").textContent = config.eyebrow;
  $("#insightTitle").textContent = config.title;
  $("#insightSubtitle").textContent = config.subtitle;
  $("#insightPeriod").textContent = formatWeekRange(activeWeekStart);
  $("#insightMetricHeading").textContent = config.metricHeading;
  $("#insightSummary").innerHTML = getInsightSummary(activeInsightType).map(([label, value], index) => `<div class="insight-stat ${index === 0 ? "primary" : ""}"><span>${label}</span><strong>${value}</strong></div>`).join("");
  $("#insightTabs").innerHTML = config.tabs.map(([value, label]) => `<button type="button" role="tab" aria-selected="${activeInsightFilter === value}" class="${activeInsightFilter === value ? "active" : ""}" data-insight-filter="${value}">${label}</button>`).join("");
  renderInsightVisual(activeInsightType);
  const rows = getInsightRows();
  $("#insightTableBody").innerHTML = rows.map((product, rowIndex) => {
    const presentation = getInsightRowPresentation(product, activeInsightType);
    const productMeta = product.asin && product.asin !== product.product_name ? `<span>${product.asin}</span>` : "";
    return `<tr><td><div class="insight-product"><span class="table-row-number" aria-label="第 ${rowIndex + 1} 行">${rowIndex + 1}</span>${renderProductThumb(product)}<div><strong>${product.product_name}</strong>${productMeta}</div></div></td><td>${product.owner}</td><td>${formatSummaryNumber(product.target_daily_sales, 0)}</td><td>${product.actual_daily_sales == null ? "—" : formatSummaryNumber(product.actual_daily_sales, 1)}</td><td><strong class="insight-key-metric">${presentation.metric}</strong></td><td><span class="insight-status ${presentation.tone}">${presentation.status}</span></td><td><button type="button" class="insight-review-button" data-product-id="${product.product_id}"><i data-lucide="notebook-pen"></i>查看复盘</button></td></tr>`;
  }).join("");
  $("#insightEmpty").hidden = rows.length > 0;
  $("#insightResultCount").textContent = `共 ${rows.length} 款产品`;
  $("#insightTableBody").querySelectorAll(".insight-review-button").forEach((button) => button.addEventListener("click", () => {
    const productId = button.dataset.productId;
    closeInsightModal({ restoreFocus: false });
    openDrawer(productId);
  }));
  lucide.createIcons();
}

function openInsightModal(type, trigger) {
  activeInsightType = type;
  activeInsightFilter = "all";
  activeInsightTrigger = trigger;
  $("#insightSearch").value = "";
  renderInsightModal();
  $(".insight-table-wrap").scrollTo({ top: 0, left: 0 });
  $("#insightModal").classList.add("open");
  $("#insightBackdrop").classList.add("open");
  $("#insightModal").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  $("#closeInsightModal").focus();
}

function closeInsightModal({ restoreFocus = true } = {}) {
  $("#insightModal").classList.remove("open");
  $("#insightBackdrop").classList.remove("open");
  $("#insightModal").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  activeInsightType = null;
  if (restoreFocus && activeInsightTrigger) activeInsightTrigger.focus();
  activeInsightTrigger = null;
}

function renderDashboard() {
  renderMetrics();
  renderReviewTable();
  if (activeInsightType) renderInsightModal();
  lucide.createIcons();
}

async function loadOverview({ showSyncToast = false } = {}) {
  const range = getWeekRange(activeWeekStart);
  const syncButton = $("#syncButton");
  syncButton.disabled = true;
  syncButton.classList.add("loading");
  try {
    overview = await weeklyProductReviewApi.getOverview({
      start_time: range.start,
      end_time: range.end
    });
    products = overview.products.map((product) => normalizeProductPeriod(product, overview.actual_period));
    currentPage = 1;
    $("#weekRangeLabel").textContent = formatWeekRange(activeWeekStart);
    const actualPeriod = overview.actual_period;
    $("#actualPeriodLabel").textContent = actualPeriod?.days
      ? `${actualPeriod.start_time} 至 ${actualPeriod.end_time}（${actualPeriod.days}天${actualPeriod.is_complete ? "，完整周期" : "，周期进行中"}）`
      : "暂无实际数据";
    renderDashboard();
    if (showSyncToast) {
      $(".sync-text").textContent = `最近同步 ${new Date().toLocaleString("zh-CN", { hour12: false })}`;
      showToast("周产品复盘数据已同步");
    }
  } catch (error) {
    console.error("加载周产品复盘数据失败", error);
    showToast("数据加载失败，请稍后重试");
  } finally {
    syncButton.disabled = false;
    syncButton.classList.remove("loading");
  }
}

async function applyWeekSelection() {
  activeWeekStart = pendingWeekStart;
  $("#weekRangeLabel").textContent = formatWeekRange(activeWeekStart);
  closeWeekPicker({ restoreFocus: true });
  await loadOverview();
}

function showToast(message) {
  $("#toast span").textContent = message;
  $("#toast").classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => $("#toast").classList.remove("show"), 2200);
}

async function openDrawer(productId) {
  const detail = await weeklyProductReviewApi.getProductDetail({ productId, week: overview.week });
  const product = classifyProduct(normalizeProductPeriod(detail, overview.actual_period));
  if (!product) return;
  drawerProduct = product;
  $("#drawerProductName").textContent = product.product_name;
  $("#drawerProductMeta").textContent = `${product.asin} · ${product.owner} · ${product.season}`;
  $("#drawerLevel").textContent = product.level;
  $("#drawerLevel").className = `level-tag ${product.level.toLowerCase()}`;
  $("#drawerStatus").textContent = `广告${product.adResult}`;
  $("#drawerStatus").className = `result-tag ${product.adResult === "达标" ? "good" : ["关注", "待回填"].includes(product.adResult) ? "warn" : "bad"}`;
  $("#drawerRevenue").textContent = product.weeklySales == null ? "—" : formatCurrency(product.weeklySales);
  const completionRate = product.hasActual ? product.actual_daily_sales / Math.max(product.target_daily_sales, 1) : null;
  $("#drawerSalesChange").textContent = completionRate == null ? "—" : formatPercent(completionRate, 0);
  $("#drawerSalesChange").className = completionRate == null ? "" : completionRate >= 1 ? "good-text" : "bad-text";
  $("#drawerSpend").textContent = formatPreciseCurrency(product.actual_daily_ad_spend);
  $("#drawerAcos").textContent = `${formatNullablePercent(product.actual_ad_sales_ratio)} / ${formatPercent(product.ad_sales_ratio)}`;
  $("#drawerTargetDaily").textContent = product.target_daily_sales;
  $("#drawerActualDaily").textContent = product.actual_daily_sales == null ? "—" : product.actual_daily_sales;
  $("#drawerAdOrders").textContent = `${formatSummaryNumber(product.actual_daily_ad_orders)} / 总${formatSummaryNumber(product.actual_ad_orders, 0)} / ${product.ad_orders}`;
  $("#drawerCpc").textContent = `${formatDecimalCurrency(product.actual_cpc)} / ${formatDecimalCurrency(product.cpc)}`;
  $("#drawerCvr").textContent = `${formatNullablePercent(product.actual_cvr)} / ${formatPercent(product.cvr)}`;
  $("#drawerAdRatio").textContent = formatNullablePercent(product.expected_profit_margin);
  $("#drawerAdRatio").className = product.expected_profit_margin == null ? "" : product.expected_profit_margin >= 0.12 ? "good-text" : "bad-text";
  $("#reviewNote").value = product.review_note || product.note;
  $("#drawerAction").firstChild.textContent = product.action;
  $("#detailDrawer").classList.add("open");
  $("#drawerBackdrop").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeDrawer() {
  $("#detailDrawer").classList.remove("open");
  $("#drawerBackdrop").classList.remove("open");
  document.body.style.overflow = "";
}

function openFavoriteDrawer() {
  closeDrawer();
  $("#favoriteDrawer").classList.add("open");
  $("#favoriteBackdrop").classList.add("open");
  $("#favoriteDrawer").setAttribute("aria-hidden", "false");
  $("#favoriteButton").setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  $("#closeFavoriteDrawer").focus();
}

function closeFavoriteDrawer({ restoreFocus = true } = {}) {
  $("#favoriteDrawer").classList.remove("open");
  $("#favoriteBackdrop").classList.remove("open");
  $("#favoriteDrawer").setAttribute("aria-hidden", "true");
  $("#favoriteButton").setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  if (restoreFocus) $("#favoriteButton").focus();
}

async function saveReview(status) {
  if (!drawerProduct) return;
  await weeklyProductReviewApi.saveReview({
    product_id: drawerProduct.product_id,
    week: overview.week,
    status,
    review_tags: [],
    review_note: $("#reviewNote").value,
    next_action: $("#drawerAction").textContent.trim()
  });
  const localProduct = products.find((item) => item.product_id === drawerProduct.product_id);
  if (localProduct) {
    localProduct.reviewed = status === "completed";
    localProduct.review_note = $("#reviewNote").value;
  }
}

function getColumnFilterOptions(key) {
  const counts = new Map();
  products.map(classifyProduct).forEach((product) => {
    const value = getColumnFilterValue(product, key);
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return Array.from(counts, ([value, count]) => ({ value, count }))
    .sort((a, b) => {
      if (a.value === "__EMPTY__") return 1;
      if (b.value === "__EMPTY__") return -1;
      return formatColumnFilterValue(key, a.value).localeCompare(
        formatColumnFilterValue(key, b.value),
        "zh-CN",
        { numeric: true }
      );
    });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderColumnFilterOptions() {
  if (!activeColumnFilter) return;
  const search = $("#columnFilterSearch").value.trim().toLowerCase();
  const options = getColumnFilterOptions(activeColumnFilter).filter(({ value }) => (
    formatColumnFilterValue(activeColumnFilter, value).toLowerCase().includes(search)
  ));
  $("#columnFilterOptions").innerHTML = options.length
    ? options.map(({ value, count }) => `
      <label class="column-filter-option">
        <input type="checkbox" value="${escapeHtml(value)}" ${pendingColumnFilterSelection.has(value) ? "checked" : ""} />
        <span title="${escapeHtml(formatColumnFilterValue(activeColumnFilter, value))}">${escapeHtml(formatColumnFilterValue(activeColumnFilter, value))}</span>
        <small>${count}</small>
      </label>
    `).join("")
    : '<div class="column-filter-empty">没有匹配项</div>';
}

function positionColumnFilter(button) {
  const popover = $("#columnFilterPopover");
  const rect = button.getBoundingClientRect();
  const width = popover.offsetWidth || 272;
  const height = popover.offsetHeight || 360;
  const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
  const top = rect.bottom + height + 8 > window.innerHeight
    ? Math.max(8, rect.top - height - 6)
    : rect.bottom + 6;
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function openColumnFilter(button) {
  const key = button.dataset.filterKey;
  const options = getColumnFilterOptions(key);
  activeColumnFilter = key;
  activeColumnFilterButton = button;
  pendingColumnFilterSelection = columnFilters[key]
    ? new Set(columnFilters[key])
    : new Set(options.map(({ value }) => value));
  $$(".column-filter-button").forEach((item) => item.setAttribute("aria-expanded", "false"));
  button.setAttribute("aria-expanded", "true");
  $("#columnFilterTitle").textContent = `筛选：${button.dataset.filterLabel}`;
  $("#columnFilterSearch").value = "";
  $("#columnFilterPopover").hidden = false;
  renderColumnFilterOptions();
  positionColumnFilter(button);
  window.requestAnimationFrame(() => $("#columnFilterSearch").focus());
}

function closeColumnFilter() {
  if (activeColumnFilterButton) activeColumnFilterButton.setAttribute("aria-expanded", "false");
  $("#columnFilterPopover").hidden = true;
  activeColumnFilter = null;
  activeColumnFilterButton = null;
  pendingColumnFilterSelection = new Set();
}

function applyColumnFilter() {
  if (!activeColumnFilter) return;
  const allOptions = getColumnFilterOptions(activeColumnFilter);
  if (pendingColumnFilterSelection.size === allOptions.length) {
    delete columnFilters[activeColumnFilter];
  } else {
    columnFilters[activeColumnFilter] = new Set(pendingColumnFilterSelection);
  }
  closeColumnFilter();
  currentPage = 1;
  renderReviewTable();
}

function clearActiveColumnFilter() {
  if (!activeColumnFilter) return;
  delete columnFilters[activeColumnFilter];
  closeColumnFilter();
  currentPage = 1;
  renderReviewTable();
}

function resetFilters() {
  $("#favoriteOnly").checked = false;
  Object.keys(columnFilters).forEach((key) => delete columnFilters[key]);
  closeColumnFilter();
  currentPage = 1;
  renderReviewTable();
}

$("#favoriteOnly").addEventListener("change", () => {
  currentPage = 1;
  renderReviewTable();
});
$("#resetFilters").addEventListener("click", resetFilters);
$("#tablePagination").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (!button || button.disabled) return;
  currentPage = Number(button.dataset.page);
  renderReviewTable();
  $(".review-panel").scrollIntoView({ behavior: "smooth", block: "start" });
});
$(".review-panel .table-wrap").addEventListener("wheel", (event) => {
  const wrap = event.currentTarget;
  const atTop = wrap.scrollTop <= 0;
  const atBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 1;
  if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) event.preventDefault();
}, { passive: false });
$("#reviewTableHead").addEventListener("click", (event) => {
  const button = event.target.closest(".column-filter-button");
  if (!button) return;
  event.stopPropagation();
  if (activeColumnFilterButton === button && !$("#columnFilterPopover").hidden) closeColumnFilter();
  else openColumnFilter(button);
});
$("#reviewTableHead").addEventListener("pointerdown", (event) => {
  const handle = event.target.closest(".column-resize-handle");
  if (handle) beginColumnResize(event, handle);
});
$("#reviewTableHead").addEventListener("dblclick", (event) => {
  const handle = event.target.closest(".column-resize-handle");
  if (!handle) return;
  event.preventDefault();
  event.stopPropagation();
  manuallyResizedColumnsByView[currentView].delete(handle.dataset.columnKey);
  applyColumnWidth(handle.dataset.columnKey, tableColumnWidths[handle.dataset.columnKey]);
});
$("#reviewTableHead").addEventListener("keydown", (event) => {
  const handle = event.target.closest(".column-resize-handle");
  if (!handle || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const renderedWidth = getRenderedColumnWidth(handle.dataset.columnKey);
  columnWidthsByView[currentView][handle.dataset.columnKey] = renderedWidth;
  manuallyResizedColumnsByView[currentView].add(handle.dataset.columnKey);
  const minimumWidth = handle.dataset.columnKey === "product_name" ? 180 : 72;
  const direction = event.key === "ArrowRight" ? 10 : -10;
  applyColumnWidth(handle.dataset.columnKey, Math.max(minimumWidth, renderedWidth + direction));
});
document.addEventListener("pointermove", resizeTableColumn);
document.addEventListener("pointerup", endColumnResize);
window.addEventListener("resize", syncReviewTableWidth);
$("#columnFilterSearch").addEventListener("input", renderColumnFilterOptions);
$("#columnFilterOptions").addEventListener("change", (event) => {
  const checkbox = event.target.closest('input[type="checkbox"]');
  if (!checkbox) return;
  if (checkbox.checked) pendingColumnFilterSelection.add(checkbox.value);
  else pendingColumnFilterSelection.delete(checkbox.value);
});
$("#columnFilterSelectAll").addEventListener("click", () => {
  if (!activeColumnFilter) return;
  pendingColumnFilterSelection = new Set(getColumnFilterOptions(activeColumnFilter).map(({ value }) => value));
  renderColumnFilterOptions();
});
$("#columnFilterSelectNone").addEventListener("click", () => {
  pendingColumnFilterSelection.clear();
  renderColumnFilterOptions();
});
$("#clearColumnFilter").addEventListener("click", clearActiveColumnFilter);
$("#cancelColumnFilter").addEventListener("click", closeColumnFilter);
$("#applyColumnFilter").addEventListener("click", applyColumnFilter);
$("#closeDrawer").addEventListener("click", closeDrawer);
$("#drawerBackdrop").addEventListener("click", closeDrawer);
$("#favoriteButton").addEventListener("click", openFavoriteDrawer);
$("#closeFavoriteDrawer").addEventListener("click", () => closeFavoriteDrawer());
$("#favoriteBackdrop").addEventListener("click", () => closeFavoriteDrawer());
$$('[data-insight]').forEach((card) => card.addEventListener("click", () => openInsightModal(card.dataset.insight, card)));
$("#closeInsightModal").addEventListener("click", () => closeInsightModal());
$("#insightBackdrop").addEventListener("click", () => closeInsightModal());
$("#insightSearch").addEventListener("input", renderInsightModal);
$("#insightTabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-insight-filter]");
  if (!button) return;
  activeInsightFilter = button.dataset.insightFilter;
  renderInsightModal();
});
$("#insightVisual").addEventListener("click", (event) => {
  const button = event.target.closest("[data-insight-filter]");
  if (!button) return;
  activeInsightFilter = button.dataset.insightFilter;
  renderInsightModal();
});
$("#weekRangeTrigger").addEventListener("click", () => {
  if ($("#weekPickerPopover").hidden) openWeekPicker();
  else closeWeekPicker();
});
$("#closeWeekPicker").addEventListener("click", () => closeWeekPicker({ restoreFocus: true }));
$("#cancelWeekPicker").addEventListener("click", () => closeWeekPicker({ restoreFocus: true }));
$("#previousWeek").addEventListener("click", () => shiftPendingWeek(-1));
$("#nextWeek").addEventListener("click", () => shiftPendingWeek(1));
$("#weekDateInput").addEventListener("change", (event) => {
  if (!event.target.value) return;
  const selectedWeekStart = formatIsoDate(getThursdayWeek(parseLocalDate(event.target.value)));
  pendingWeekStart = selectedWeekStart > getLatestSelectableWeekStart()
    ? getLatestSelectableWeekStart()
    : selectedWeekStart;
  renderWeekPreview();
});
$("#applyWeekPicker").addEventListener("click", applyWeekSelection);
document.addEventListener("pointerdown", (event) => {
  if ($("#weekPickerPopover").hidden || event.target.closest(".week-picker")) return;
  closeWeekPicker();
});
document.addEventListener("pointerdown", (event) => {
  if ($("#columnFilterPopover").hidden || event.target.closest("#columnFilterPopover") || event.target.closest(".column-filter-button")) return;
  closeColumnFilter();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!$("#columnFilterPopover").hidden) closeColumnFilter();
  else if (!$("#weekPickerPopover").hidden) closeWeekPicker({ restoreFocus: true });
  else if ($("#insightModal").classList.contains("open")) closeInsightModal();
  else if ($("#favoriteDrawer").classList.contains("open")) closeFavoriteDrawer();
  else if ($("#detailDrawer").classList.contains("open")) closeDrawer();
});
$("#syncButton").addEventListener("click", () => loadOverview({ showSyncToast: true }));
$("#saveDraft").addEventListener("click", async () => {
  await saveReview("draft");
  showToast("复盘草稿已保存");
});
$("#completeReview").addEventListener("click", async () => {
  await saveReview("completed");
  showToast("本周复盘已完成");
  renderMetrics();
  renderReviewTable();
  window.setTimeout(closeDrawer, 450);
});
$$("[data-view]").forEach((button) => button.addEventListener("click", () => {
  closeColumnFilter();
  currentView = button.dataset.view;
  currentPage = 1;
  $$("[data-view]").forEach((item) => item.classList.toggle("active", item === button));
  renderReviewTable();
}));

async function bootstrap() {
  $("#weekRangeLabel").textContent = formatWeekRange(activeWeekStart);
  renderWeekPreview();
  await loadOverview();
}

bootstrap();
