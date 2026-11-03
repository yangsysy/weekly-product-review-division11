# 周产品目标与复盘本地原型

本地静态原型已完成，页面名称保持为「运营节奏 - 周产品目标与复盘」。

## 本地预览

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

浏览器打开：

```text
http://127.0.0.1:4173/
```

## 接口适配层

页面不直接读取 mock 数组，统一通过 `api.js` 中的 `window.weeklyProductReviewApi` 获取数据：

```js
await weeklyProductReviewApi.getOverview({ week: "2026-W44" });
await weeklyProductReviewApi.getProductDetail({ productId, week });
await weeklyProductReviewApi.saveReview({
  product_id,
  week,
  status,
  review_tags,
  review_note,
  next_action
});
```

接真实接口时，只需要替换 `api.js` 中的 3 个方法，`index.html`、`styles.css` 和页面交互不需要改动。

## 主要字段

字段已经按预算测算表预留：

- `start_time` / `end_time`
- `owner`
- `product_name` / `asin`
- `season`
- `monthly_sales`
- `target_daily_sales`
- `actual_daily_sales`
- `unit_price`
- `ad_order_ratio`
- `ad_orders`
- `ad_spend`
- `cpc`
- `cvr`
- `clicks`
- `acos`
- `ad_sales_ratio`
- `activity_type`
- `recent_cpc` / `previous_week_cpc`
- `recent_ad_cvr` / `previous_week_ad_cvr`
- `previous_week_ad_order_ratio`

复盘字段单独放在 `saveReview` 的 payload 中，不和预算测算字段混在一起。
