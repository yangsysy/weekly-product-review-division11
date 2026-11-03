/**
 * 周产品目标与复盘的数据适配层。
 *
 * 页面只依赖下面 3 个方法：
 * - getOverview(params): 获取某周的汇总指标和产品列表
 * - getProductDetail(params): 获取某个产品的详情
 * - saveReview(payload): 保存复盘草稿或完成复盘
 *
 * 接真实服务时，保留返回字段即可把 mock 实现替换成 fetch/axios。
 * 字段命名参考预算测算表：start_time、end_time、actual_start_time、actual_end_time、
 * actual_period_days、owner、product_name、product_image_url、
 * season、monthly_sales、target_daily_sales、unit_price、ad_order_ratio、
 * ad_orders、ad_spend（目标日均广告花费）、cpc、cvr、clicks、acos、ad_sales_ratio、
 * actual_ad_orders（阶段累计）、actual_daily_ad_orders、actual_clicks（阶段累计）、
 * actual_daily_clicks、
 * activity_type、recent_cpc、previous_week_cpc、recent_ad_cvr、
 * previous_week_ad_cvr、previous_week_ad_order_ratio、actual_daily_sales。
 */
window.weeklyProductReviewApi = (() => {
  const legacyRows = [
    {
      product_id: "B0D4YVETTE", product_name: "Yvette 运动内衣", asin: "B0D4YVETTE", owner: "黄颖凝",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "de", line: "bra", season: "冬季",
      completion: true, monthly_sales: 300, target_daily_sales: 25, actual_daily_sales: 29,
      unit_price: 72.99, ad_order_ratio: 0.48, ad_orders: 12, ad_spend: 200, cpc: 0.50,
      cvr: 0.03, clicks: 400, acos: 0.2283, ad_sales_ratio: 0.1096, activity_type: "Z测算",
      recent_cpc: 0.49, previous_week_cpc: 0.49, recent_ad_cvr: 0.0323, previous_week_ad_cvr: 0.0248,
      previous_week_ad_order_ratio: null, sales_change: 8.4, status: "attention", status_text: "需要关注",
      reviewed: false, thumb: "Y", tone: "blue", note: "广告带来的销售额增长明显，但花费增速高于销售增速，需要继续观察高花费关键词的转化效率。"
    },
    {
      product_id: "B0FLEXX01", product_name: "Flexx 无痕文胸", asin: "L22M489D男毛衫", owner: "杨思宇",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "de", line: "bra", season: "冬季",
      completion: true, monthly_sales: 500, target_daily_sales: 30, actual_daily_sales: 35,
      unit_price: 38.86, ad_order_ratio: 0.57, ad_orders: 17, ad_spend: 130, cpc: 0.92,
      cvr: 0.12, clicks: 141, acos: 0.1973, ad_sales_ratio: 0.1115, activity_type: "Z测算",
      recent_cpc: 0.85, previous_week_cpc: 0.92, recent_ad_cvr: 0.0949, previous_week_ad_cvr: 0.1262,
      previous_week_ad_order_ratio: 0.6095, sales_change: 14.7, status: "normal", status_text: "表现正常",
      reviewed: true, thumb: "F", tone: "rose", note: "自然销售和广告销售同步增长，转化效率保持稳定。"
    },
    {
      product_id: "B0MOVEAIR", product_name: "Move Air 训练背心", asin: "L20M244D毛衣", owner: "杨思宇",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "de", line: "sports", season: "冬季",
      completion: true, monthly_sales: 500, target_daily_sales: 30, actual_daily_sales: 32,
      unit_price: 38.50, ad_order_ratio: 0.59, ad_orders: 18, ad_spend: 150, cpc: 0.93,
      cvr: 0.11, clicks: 161, acos: 0.2196, ad_sales_ratio: 0.1296, activity_type: "Z测算",
      recent_cpc: 0.95, previous_week_cpc: 0.93, recent_ad_cvr: 0.0971, previous_week_ad_cvr: 0.0552,
      previous_week_ad_order_ratio: 0.6095, sales_change: -6.2, status: "risk", status_text: "风险产品",
      reviewed: false, thumb: "M", tone: "green", note: "点击量保持增长，但转化率连续两周下降，建议拆解流量来源和落地页表现。"
    },
    {
      product_id: "B0THERMO22", product_name: "Thermo Base Layer", asin: "夹克9931H", owner: "杨思宇",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "de", line: "outdoor", season: "冬季",
      completion: true, monthly_sales: 400, target_daily_sales: 8, actual_daily_sales: 9,
      unit_price: 64.46, ad_order_ratio: 0.30, ad_orders: 2, ad_spend: 60, cpc: 0.50,
      cvr: 0.02, clicks: 120, acos: 0.3878, ad_sales_ratio: 0.1164, activity_type: "价格折扣",
      recent_cpc: 0.46, previous_week_cpc: 0.53, recent_ad_cvr: 0.0491, previous_week_ad_cvr: 0.0202,
      previous_week_ad_order_ratio: 0.4615, sales_change: 4.3, status: "normal", status_text: "表现正常",
      reviewed: true, thumb: "T", tone: "orange", note: "广告结构稳定，周末转化表现优于工作日。"
    },
    {
      product_id: "B0SOFTLACE", product_name: "Soft Lace Bra", asin: "DE-9933D夹克", owner: "杨思宇",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "de", line: "bra", season: "冬季",
      completion: true, monthly_sales: 800, target_daily_sales: 35, actual_daily_sales: 29,
      unit_price: 83.00, ad_order_ratio: 0.37, ad_orders: 13, ad_spend: 170, cpc: 0.20,
      cvr: 0.015, clicks: 852, acos: 0.1606, ad_sales_ratio: 0.0586, activity_type: "价格折扣",
      recent_cpc: 0.52, previous_week_cpc: 0.21, recent_ad_cvr: 0.0382, previous_week_ad_cvr: 0.0194,
      previous_week_ad_order_ratio: 0.4543, sales_change: -11.5, status: "risk", status_text: "风险产品",
      reviewed: false, thumb: "S", tone: "rose", note: "销售额和转化率下滑，广告成本明显偏高，需要结合竞品价格和评价变化进一步判断。"
    },
    {
      product_id: "B0RUNPRO88", product_name: "RunPro 运动短裤", asin: "B23M2024衬衫", owner: "杨思宇",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "de", line: "sports", season: "冬四季",
      completion: true, monthly_sales: 200, target_daily_sales: 10, actual_daily_sales: 11,
      unit_price: 39.36, ad_order_ratio: 0.08, ad_orders: 1, ad_spend: 10, cpc: 0.62,
      cvr: 0.05, clicks: 16, acos: 0.3150, ad_sales_ratio: 0.0252, activity_type: "Z测算",
      recent_cpc: 0.70, previous_week_cpc: 0.62, recent_ad_cvr: 0.0897, previous_week_ad_cvr: 0.0369,
      previous_week_ad_order_ratio: 0.4063, sales_change: 9.6, status: "normal", status_text: "表现正常",
      reviewed: true, thumb: "R", tone: "green", note: "本周销售额增长主要来自自然单，广告效率保持在健康区间。"
    },
    {
      product_id: "B0CLOUDY70", product_name: "Cloudy Soft 塑形背心", asin: "B0CLOUDY70", owner: "杨思宇",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "de", line: "bra", season: "冬季",
      completion: true, monthly_sales: 280, target_daily_sales: 14, actual_daily_sales: 14,
      unit_price: 51.20, ad_order_ratio: 0.32, ad_orders: 7, ad_spend: 120, cpc: 0.58,
      cvr: 0.07, clicks: 206, acos: 0.3310, ad_sales_ratio: 0.075, activity_type: "Z测算",
      recent_cpc: 0.70, previous_week_cpc: 0.72, recent_ad_cvr: 0.078, previous_week_ad_cvr: 0.064,
      previous_week_ad_order_ratio: 0.42, sales_change: 2.4, status: "pending", status_text: "待复盘",
      reviewed: false, thumb: "C", tone: "blue", note: "本周整体平稳，但广告销售额占比上升，需要补充关键词层面的判断。"
    },
    {
      product_id: "B0TRAILPRO", product_name: "Trail Pro 防风外套", asin: "B0TRAILPRO", owner: "林运营",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "uk", line: "outdoor", season: "冬季",
      completion: true, monthly_sales: 240, target_daily_sales: 12, actual_daily_sales: 10,
      unit_price: 67.20, ad_order_ratio: 0.28, ad_orders: 5, ad_spend: 98, cpc: 0.74,
      cvr: 0.06, clicks: 132, acos: 0.382, ad_sales_ratio: 0.08, activity_type: "价格折扣",
      recent_cpc: 0.70, previous_week_cpc: 0.67, recent_ad_cvr: 0.058, previous_week_ad_cvr: 0.067,
      previous_week_ad_order_ratio: 0.32, sales_change: -3.1, status: "attention", status_text: "需要关注",
      reviewed: false, thumb: "P", tone: "orange", note: "流量略有下滑，广告成本上升，需观察库存和类目竞争变化。"
    },
    {
      product_id: "B0ACTIVE33", product_name: "Active Seamless Top", asin: "B0ACTIVE33", owner: "林运营",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "us", line: "sports", season: "冬季",
      completion: true, monthly_sales: 220, target_daily_sales: 11, actual_daily_sales: 13,
      unit_price: 42.30, ad_order_ratio: 0.25, ad_orders: 6, ad_spend: 76, cpc: 0.60,
      cvr: 0.09, clicks: 118, acos: 0.248, ad_sales_ratio: 0.06, activity_type: "Z测算",
      recent_cpc: 0.61, previous_week_cpc: 0.65, recent_ad_cvr: 0.085, previous_week_ad_cvr: 0.072,
      previous_week_ad_order_ratio: 0.27, sales_change: 15.2, status: "normal", status_text: "表现正常",
      reviewed: true, thumb: "A", tone: "green", note: "广告点击和自然搜索同步增长，整体表现稳定。"
    },
    {
      product_id: "B0EVERYDAY", product_name: "Everyday Comfort Bra", asin: "B0EVERYDAY", owner: "林运营",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "de", line: "bra", season: "冬季",
      completion: true, monthly_sales: 180, target_daily_sales: 9, actual_daily_sales: 8,
      unit_price: 48.60, ad_order_ratio: 0.24, ad_orders: 4, ad_spend: 55, cpc: 0.66,
      cvr: 0.06, clicks: 84, acos: 0.340, ad_sales_ratio: 0.05, activity_type: "Z测算",
      recent_cpc: 0.62, previous_week_cpc: 0.58, recent_ad_cvr: 0.051, previous_week_ad_cvr: 0.064,
      previous_week_ad_order_ratio: 0.28, sales_change: -4.8, status: "pending", status_text: "待复盘",
      reviewed: false, thumb: "E", tone: "rose", note: "销售表现弱于上周，待补充转化下降原因。"
    },
    {
      product_id: "B0HIKELITE", product_name: "Hike Lite 速干裤", asin: "B0HIKELITE", owner: "林运营",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "uk", line: "outdoor", season: "冬季",
      completion: true, monthly_sales: 160, target_daily_sales: 8, actual_daily_sales: 9,
      unit_price: 55.40, ad_order_ratio: 0.18, ad_orders: 3, ad_spend: 42, cpc: 0.55,
      cvr: 0.08, clicks: 76, acos: 0.320, ad_sales_ratio: 0.04, activity_type: "Z测算",
      recent_cpc: 0.57, previous_week_cpc: 0.60, recent_ad_cvr: 0.078, previous_week_ad_cvr: 0.069,
      previous_week_ad_order_ratio: 0.20, sales_change: 6.6, status: "normal", status_text: "表现正常",
      reviewed: true, thumb: "H", tone: "orange", note: "销售保持小幅增长，广告投入与产出匹配。"
    },
    {
      product_id: "B0LUXEFORM", product_name: "LuxeForm 塑形衣", asin: "B0LUXEFORM", owner: "林运营",
      start_time: "2026-10-29", end_time: "2026-11-04", market: "us", line: "bra", season: "冬季",
      completion: true, monthly_sales: 120, target_daily_sales: 6, actual_daily_sales: 5,
      unit_price: 58.20, ad_order_ratio: 0.20, ad_orders: 3, ad_spend: 52, cpc: 0.72,
      cvr: 0.05, clicks: 72, acos: 0.489, ad_sales_ratio: 0.05, activity_type: "价格折扣",
      recent_cpc: 0.72, previous_week_cpc: 0.64, recent_ad_cvr: 0.049, previous_week_ad_cvr: 0.061,
      previous_week_ad_order_ratio: 0.22, sales_change: -8.5, status: "risk", status_text: "风险产品",
      reviewed: false, thumb: "L", tone: "rose", note: "转化率和广告效率同步下降，需要重点关注。"
    }
  ];

  const targetData = [
    ["何昊坛", "L23M911薄夹克", "冬四季", 300, 3, 36.00, 0.45, 1, 10, 0.30, 0.0400, 34, 0.2083, 0.0938, "Z测算"],
    ["何昊坛", "LT23M1148夹克", "冬季", 400, 15, 0.00, 0.00, 0, 0, 0.00, 0.0000, 0, 0.0000, 0.0000, "Z测算"],
    ["何昊坛", "LT24M1248绗缝加绒棉服", "冬季", 600, 35, 62.00, 0.11, 4, 40, 0.53, 0.0500, 76, 0.1710, 0.0185, "Z测算"],
    ["何佳琪", "夹克9937D", "冬四季", 300, 7, 42.25, 0.25, 2, 15, 0.47, 0.0550, 32, 0.2023, 0.0506, "Z测算"],
    ["何佳琪", "夹克9932D", "冬季", 900, 45, 64.56, 0.30, 14, 135, 0.30, 0.0300, 450, 0.1549, 0.0465, "Z测算"],
    ["何佳琪", "LT25M1463翻领条绒加绒外套", "冬季", 100, 5, 67.98, 0.43, 2, 30, 0.35, 0.0250, 86, 0.2059, 0.0886, "Z测算"],
    ["何佳琪", "L23M951D休闲长T恤", "冬四季", 800, 20, 11.89, 0.09, 2, 5, 0.60, 0.2000, 8, 0.2523, 0.0227, "Z测算"],
    ["雷迎秋", "L23M949D休闲长T恤", "冬四季", 1200, 60, 14.93, 0.30, 18, 70, 0.61, 0.1570, 115, 0.2602, 0.0781, "Z测算"],
    ["雷迎秋", "夹克9939D", "冬季", 900, 40, 46.48, 0.36, 15, 100, 0.40, 0.0580, 250, 0.1484, 0.0539, "Z测算"],
    ["雷迎秋", "LT25M1433翻领牛仔风外套", "冬季", 100, 10, 64.99, 0.57, 6, 90, 0.52, 0.0330, 173, 0.2425, 0.1382, "Z测算"],
    ["李巧", "L23W962D长袖T恤", "冬四季", 700, 30, 12.59, 0.31, 9, 70, 0.98, 0.1300, 72, 0.5988, 0.1856, "Z测算"],
    ["李巧", "L23W753抓绒套头外套", "冬季", 200, 20, 19.99, 0.13, 3, 15, 0.60, 0.1000, 25, 0.3002, 0.0375, "Z测算"],
    ["李巧", "L23W928圆领套头卫衣", "冬季", 600, 35, 35.88, 0.36, 13, 140, 0.88, 0.0800, 159, 0.3066, 0.1113, "Z测算"],
    ["李巧", "LT26M1550半开襟毛衣", "冬季", 250, 15, 35.47, 0.30, 5, 51, 0.90, 0.0800, 56, 0.3172, 0.0952, "Z测算"],
    ["谢宇浩", "L23M973D亨利领T恤", "冬四季", 2000, 80, 16.32, 0.18, 14, 60, 0.83, 0.2000, 72, 0.2543, 0.0458, "Z测算"],
    ["何佳琪", "LT23M1574亨利领麻灰T恤", "冬四季", 100, 14, 19.09, 0.61, 9, 60, 1.05, 0.1500, 57, 0.3667, 0.2237, "Z测算"],
    ["黄熙媛", "夹克9938D", "冬四季", 400, 5, 45.98, 0.18, 1, 15, 0.50, 0.0300, 30, 0.3625, 0.0652, "价格折扣"],
    ["黄熙媛", "DE-L21M494男棉服", "冬季", 300, 25, 72.99, 0.48, 12, 200, 0.50, 0.0300, 400, 0.2283, 0.1096, "Z测算"],
    ["杨思宇", "L22M489D男毛衫", "冬季", 500, 30, 38.86, 0.57, 17, 130, 0.92, 0.1200, 141, 0.1973, 0.1115, "Z测算"],
    ["杨思宇", "L20M244D毛衣", "冬季", 500, 30, 38.50, 0.59, 18, 150, 0.93, 0.1100, 161, 0.2196, 0.1296, "Z测算"],
    ["杨思宇", "夹克9931H", "冬季", 400, 8, 64.46, 0.30, 2, 60, 0.50, 0.0200, 120, 0.3878, 0.1164, "价格折扣"],
    ["杨思宇", "DE-9933D夹克", "冬季", 800, 35, 83.00, 0.37, 13, 170, 0.20, 0.0150, 852, 0.1606, 0.0586, "价格折扣"],
    ["杨思宇", "B23M2024衬衫", "冬四季", 200, 10, 39.36, 0.08, 1, 10, 0.62, 0.0500, 16, 0.3150, 0.0252, "Z测算"],
    ["张熙萍", "LT24M1241大格型法兰绒衬衫", "冬四季", 100, 7, 41.00, 0.45, 3, 50, 0.72, 0.0450, 70, 0.3902, 0.1756, "价格折扣"],
    ["张熙萍", "L22M687灯芯绒棉外套", "冬季", 700, 35, 73.03, 0.45, 16, 125, 0.20, 0.0250, 623, 0.1095, 0.0487, "Z测算"],
    ["张熙萍", "DE-L22M681D加绒衬衫", "冬季", 900, 50, 54.00, 0.22, 11, 100, 0.28, 0.0300, 358, 0.1728, 0.0372, "Z测算"],
    ["郑茜", "L22M680男棉衬衫", "冬季", 120, 8, 62.58, 0.60, 5, 62, 0.45, 0.0350, 137, 0.2055, 0.1233, "Z测算"],
    ["郑茜", "L21M427男棉衬衫", "冬季", 150, 6, 75.71, 0.25, 2, 20, 0.40, 0.0300, 50, 0.1761, 0.0440, "价格折扣"],
    ["郑茜", "L21M445男衬衫", "冬四季", 250, 15, 39.47, 0.39, 6, 70, 0.85, 0.0700, 83, 0.3076, 0.1184, "Z测算"],
    ["周兴尧", "TJ2棉抓", "冬季", 1800, 100, 51.20, 0.35, 35, 280, 0.34, 0.0420, 824, 0.1581, 0.0547, "Z测算"],
    ["周兴尧", "T21M475立领抓绒衣", "冬季", 900, 45, 49.20, 0.43, 19, 180, 0.39, 0.0420, 461, 0.1887, 0.0812, "Z测算"],
    ["周兴尧", "H19M047软壳裤", "冬季", 0, 1, 49.98, 0.00, 0, 0, 0.39, 0.0300, 0, 0.0000, 0.0000, "无活动"],
    ["周兴尧", "IX9抓绒裤D", "冬季", 50, 3, 53.98, 0.75, 2, 30, 0.50, 0.0380, 59, 0.2438, 0.1828, "价格折扣"],
    ["刘红呈", "AT23M3116圆领长T", "冬四季", 650, 30, 14.56, 0.20, 6, 20, 1.00, 0.3000, 20, 0.2289, 0.0458, "Z测算"],
    ["刘红呈", "AT23M3115男小高领保暖衣", "冬四季", 250, 15, 15.48, 0.27, 4, 15, 0.95, 0.2500, 16, 0.2455, 0.0663, "价格折扣"],
    ["刘红呈", "DE-F828D男冲锋衣", "冬季", 500, 25, 73.42, 0.60, 15, 250, 0.58, 0.0350, 431, 0.2257, 0.1361, "价格折扣"],
    ["刘红呈", "DE-冲816D-男", "冬季", 3200, 200, 74.08, 0.40, 80, 800, 0.45, 0.0450, 1778, 0.1350, 0.0540, "Z测算"],
    ["汤凯峰", "AT25M3336圆领套头卫衣", "冬季", 450, 30, 31.29, 0.40, 12, 115, 1.15, 0.1200, 100, 0.3063, 0.1225, "Z测算"],
    ["汤凯峰", "AT24M3189连帽防泼水卫衣", "冬季", 150, 15, 39.86, 0.46, 7, 80, 1.05, 0.0900, 76, 0.2927, 0.1332, "Z测算"],
    ["范笑语", "L21M470卫衣", "冬季", 200, 5, 49.39, 0.60, 3, 60, 1.10, 0.0550, 55, 0.4049, 0.2430, "价格折扣"],
    ["汤凯峰", "L20M176卫衣", "冬季", 150, 10, 50.76, 0.36, 4, 40, 0.55, 0.0500, 72, 0.2167, 0.0780, "Z测算"],
    ["陈锶琪", "L22W672长polo衫", "冬四季", 250, 8, 19.99, 0.00, 0, 0, 0.00, 0.0000, 0, 0.0000, 0.0000, "无活动"],
    ["陈锶琪", "AT23W4106女摇粒绒马甲", "冬季", 300, 18, 20.71, 0.30, 5, 24, 0.44, 0.1000, 54, 0.2125, 0.0637, "Z测算"],
    ["陈锶琪", "AT23W4117半开襟长袖", "冬季", 300, 18, 19.50, 0.26, 5, 23, 0.50, 0.1000, 47, 0.2564, 0.0667, "Z测算"],
    ["陈锶琪", "DE-H21W433棉服", "冬季", 1500, 110, 68.33, 0.30, 33, 373, 0.35, 0.0310, 1065, 0.1652, 0.0496, "Z测算"],
    ["陈锶琪", "AT25W4337简洁款滑雪服", "冬季", 200, 8, 74.35, 0.50, 4, 60, 0.45, 0.0300, 133, 0.2017, 0.1009, "价格折扣"],
    ["李艳1", "AT23W4114圆领长袖", "冬四季", 400, 20, 14.00, 0.17, 3, 16, 0.75, 0.1600, 21, 0.3348, 0.0569, "Z测算"],
    ["李艳1", "AT23W4116女半高领长袖", "冬季", 100, 10, 16.50, 0.20, 2, 10, 0.65, 0.1350, 15, 0.2918, 0.0584, "Z测算"],
    ["李艳1", "AT24W4186滑雪棉服", "冬季", 350, 20, 70.98, 0.56, 11, 150, 0.42, 0.0315, 358, 0.1878, 0.1059, "价格折扣"],
    ["童佳", "C20M109D上衣", "冬四季", 2000, 75, 20.40, 0.34, 25, 110, 0.78, 0.1800, 140, 0.2124, 0.0716, "Z测算"],
    ["童佳", "长裤（无）", "冬四季", 800, 20, 40.00, 0.34, 7, 30, 0.26, 0.0580, 117, 0.1121, 0.0381, "价格折扣"],
    ["童佳", "L20M175D男卫衣", "冬季", 600, 40, 39.90, 0.55, 22, 240, 1.04, 0.0950, 230, 0.2744, 0.1501, "Z测算"],
    ["童佳", "B23M2009卫衣", "冬季", 300, 17, 43.00, 0.55, 9, 120, 1.03, 0.0800, 117, 0.2994, 0.1647, "价格折扣"]
  ];

  const actualData = new Map([
    ["L23M911薄夹克", [13, 37.47, 0, 487.08, 59.69, 0.1276, 0.0234, 0.0042]],
    ["LT23M1148夹克", [32, 50.22, 0, 1607.05, 22.15, 0.0188, 0.1375, 0.0000]],
    ["LT24M1248绗缝加绒棉服", [168, 62.41, 1, 10484.58, 220.68, 0.0260, 0.2122, 0.0164]],
    ["夹克9937D", [26, 43.69, 0, 1135.90, 108.98, 0.1009, 0.0548, 0.0313]],
    ["夹克9932D", [169, 66.17, 0, 11182.33, 721.02, 0.0695, 0.1125, 0.0243]],
    ["LT25M1463翻领条绒加绒外套", [18, 71.97, 0, 1295.37, 135.61, 0.1097, 0.2116, 0.0153]],
    ["L23M951D休闲长T恤", [95, 12.30, 0, 1168.26, 75.40, 0.0695, 0.0516, 0.0297]],
    ["L23M949D休闲长T恤", [295, 14.86, 0, 4383.29, 246.90, 0.0613, 0.1368, 0.1185]],
    ["夹克9939D", [147, 46.20, 2, 6790.80, 402.42, 0.0643, 0.0960, 0.0272]],
    ["LT25M1433翻领牛仔风外套", [22, 69.44, 1, 1527.58, 194.47, 0.1323, 0.1378, 0.0244]],
    ["L23W962D长袖T恤", [134, 13.98, 0, 1872.82, 281.04, 0.1551, 0.0129, 0.1485]],
    ["L23W753抓绒套头外套", [59, 20.03, 0, 1182.02, 56.10, 0.0525, 0.0957, 0.1603]],
    ["L23W928圆领套头卫衣", [147, 36.06, 1, 5300.24, 539.91, 0.1069, 0.0887, 0.0913]],
    ["LT26M1550半开襟毛衣", [49, 38.79, 0, 1900.54, 307.00, 0.1665, 0.0386, 0.0471]],
    ["L23M973D亨利领T恤", [336, 17.01, 0, 5714.76, 334.74, 0.0636, 0.1181, 0.0982]],
    ["LT23M1574亨利领麻灰T恤", [25, 23.89, 0, 597.28, 168.09, 0.2864, -0.0321, 0.1212]],
    ["夹克9938D", [23, 49.57, 0, 1140.13, 87.10, 0.0814, 0.1059, 0.0091]],
    ["DE-L21M494男棉服", [88, 74.20, 2, 6529.50, 811.28, 0.1292, 0.1364, 0.0225]],
    ["L22M489D男毛衫", [114, 38.86, 0, 4430.09, 632.89, 0.1479, 0.0713, 0.0659]],
    ["L20M244D毛衣", [105, 37.60, 0, 3947.81, 652.93, 0.1704, 0.0709, 0.0520]],
    ["夹克9931H", [29, 61.37, 0, 1779.74, 163.14, 0.0967, 0.1057, 0.0341]],
    ["DE-9933D夹克", [247, 85.17, 0, 21037.90, 856.07, 0.0457, 0.1628, 0.0269]],
    ["B23M2024衬衫", [28, 39.74, 0, 1112.74, 77.75, 0.0749, 0.1242, 0.0373]],
    ["LT24M1241大格型法兰绒衬衫", [12, 42.38, 0, 508.56, 143.24, 0.2867, -0.0299, 0.0378]],
    ["L22M687灯芯绒棉外套", [122, 73.52, 13, 8969.08, 624.13, 0.0746, 0.0903, 0.0136]],
    ["DE-L22M681D加绒衬衫", [190, 57.15, 1, 10859.39, 559.41, 0.0565, 0.1479, 0.0239]],
    ["L22M680男棉衬衫", [29, 61.45, 1, 1782.17, 155.39, 0.0922, 0.0814, 0.0525]],
    ["L21M427男棉衬衫", [33, 76.90, 0, 2537.77, 128.73, 0.0557, 0.1240, 0.0248]],
    ["L21M445男衬衫", [49, 40.47, 0, 1982.87, 252.66, 0.1324, 0.1174, 0.0696]],
    ["TJ2棉抓", [407, 51.20, 0, 20837.23, 1319.14, 0.0683, 0.1330, 0.0422]],
    ["T21M475立领抓绒衣", [210, 49.07, 0, 10305.54, 807.33, 0.0833, 0.1044, 0.0470]],
    ["H19M047软壳裤", [1, 49.98, 0, 49.98, 4.02, 0.0853, 0.2989, 0.0000]],
    ["IX9抓绒裤D", [5, 51.67, 0, 258.35, 95.61, 0.3751, -0.1250, 0.0321]],
    ["AT23M3116圆领长T", [126, 15.27, 0, 1923.71, 112.83, 0.0637, 0.1482, 0.1604]],
    ["AT23M3115男小高领保暖衣", [34, 15.74, 0, 535.00, 64.31, 0.1252, 0.0674, 0.0909]],
    ["DE-F828D男冲锋衣", [86, 75.69, 2, 6509.34, 968.98, 0.1539, 0.0120, 0.0355]],
    ["DE-冲816D-男", [731, 74.64, 28, 54564.98, 3739.75, 0.0735, 0.1488, 0.0345]],
    ["AT25M3336圆领套头卫衣", [75, 30.41, 0, 2280.57, 451.06, 0.2028, -0.0165, 0.0781]],
    ["AT24M3189连帽防泼水卫衣", [28, 38.39, 0, 1074.83, 211.52, 0.2018, 0.0185, 0.0400]],
    ["L21M470卫衣", [13, 54.09, 0, 703.23, 214.64, 0.3102, -0.1250, 0.0352]],
    ["L20M176卫衣", [50, 50.12, 0, 2505.76, 252.12, 0.1056, 0.0433, 0.0195]],
    ["L22W672长polo衫", [10, 19.69, 0, 196.88, 0.39, 0.0070, 0.2248, 0.0000]],
    ["AT23W4106女摇粒绒马甲", [83, 21.59, 1, 1791.75, 101.44, 0.0616, 0.0962, 0.1212]],
    ["AT23W4117半开襟长袖", [57, 18.96, 2, 1080.81, 101.49, 0.0989, 0.0622, 0.1065]],
    ["DE-H21W433棉服", [360, 69.15, 22, 24895.64, 1325.59, 0.0582, 0.1019, 0.0391]],
    ["AT25W4337简洁款滑雪服", [20, 74.01, 9, 1480.24, 189.06, 0.1327, 0.1185, 0.0290]],
    ["AT23W4114圆领长袖", [66, 13.51, 0, 891.91, 72.08, 0.0858, 0.0723, 0.0965]],
    ["AT23W4116女半高领长袖", [31, 14.35, 0, 444.80, 31.58, 0.0760, 0.1124, 0.1636]],
    ["AT24W4186滑雪棉服", [56, 72.97, 15, 4086.22, 599.44, 0.1517, -0.0247, 0.0271]],
    ["C20M109D上衣", [440, 20.15, 0, 8864.67, 578.00, 0.0702, 0.1131, 0.1669]],
    ["长裤（无）", [65, 44.52, 2, 2894.12, 149.96, 0.0568, 0.1690, 0.0345]],
    ["L20M175D男卫衣", [165, 37.39, 0, 6169.25, 659.08, 0.1443, 0.0385, 0.0845]],
    ["B23M2009卫衣", [50, 44.65, 0, 2232.59, 351.47, 0.1624, 0.0620, 0.0843]]
  ]);

  // 截图中的本周期广告表现：花费、广告比、ACOS、CVR、CTR、CPC、点击、广告订单、广告销售额、广告单占比。
  const actualAdPerformanceData = new Map([
    ["DE-冲816D-男", [2811.28, 0.0565, 0.1885, 0.0410, 0.0039, 0.47, 5923, 243, 14910.14, 0.3338]],
    ["C20M109D上衣", [458.82, 0.0568, 0.1848, 0.2200, 0.0015, 0.75, 609, 134, 2482.45, 0.3182]],
    ["TJ2棉抓", [972.07, 0.0517, 0.1691, 0.0464, 0.0024, 0.33, 2909, 135, 5747.82, 0.3342]],
    ["DE-H21W433棉服", [954.29, 0.0433, 0.1189, 0.0431, 0.0020, 0.31, 3109, 134, 8028.25, 0.3750]],
    ["L23M973D亨利领T恤", [315.20, 0.0602, 0.2975, 0.1842, 0.0038, 0.83, 380, 70, 1059.45, 0.2351]],
    ["L23M949D休闲长T恤", [212.10, 0.0534, 0.2548, 0.2029, 0.0037, 0.77, 276, 56, 832.51, 0.2237]],
    ["DE-9933D夹克", [629.38, 0.0349, 0.1323, 0.0328, 0.0069, 0.28, 2259, 74, 4756.60, 0.2996]],
    ["T21M475立领抓绒衣", [636.89, 0.0668, 0.1911, 0.0498, 0.0012, 0.39, 1628, 81, 3333.55, 0.3857]],
    ["DE-L22M681D加绒衬衫", [427.48, 0.0444, 0.2204, 0.0315, 0.0033, 0.32, 1335, 42, 1939.44, 0.2263]],
    ["夹克9932D", [554.70, 0.0546, 0.1656, 0.0318, 0.0032, 0.30, 1856, 59, 3350.25, 0.3491]],
    ["LT24M1248绗缝加绒棉服", [157.41, 0.0200, 0.1560, 0.0450, 0.0034, 0.35, 444, 20, 1009.00, 0.1190]],
    ["L20M175D男卫衣", [596.62, 0.1017, 0.2867, 0.0891, 0.0013, 0.84, 707, 63, 2081.34, 0.3879]],
    ["夹克9939D", [327.21, 0.0532, 0.2793, 0.0357, 0.0028, 0.38, 868, 31, 1171.65, 0.2177]],
    ["L23W928圆领套头卫衣", [494.16, 0.0982, 0.3225, 0.0844, 0.0028, 0.80, 616, 52, 1532.46, 0.3537]],
    ["L23W962D长袖T恤", [259.89, 0.1438, 0.4058, 0.1534, 0.0023, 0.77, 339, 52, 640.40, 0.3955]],
    ["AT23M3116圆领长T", [90.59, 0.0521, 0.4457, 0.1412, 0.0025, 1.07, 85, 12, 203.25, 0.1270]],
    ["L22M687灯芯绒棉外套", [559.95, 0.0674, 0.2110, 0.0182, 0.0030, 0.23, 2421, 44, 2654.33, 0.3607]],
    ["L22M489D男毛衫", [524.19, 0.1233, 0.2226, 0.1045, 0.0027, 0.82, 641, 67, 2354.39, 0.5877]],
    ["L20M244D毛衣", [517.67, 0.1361, 0.2995, 0.0798, 0.0041, 0.79, 652, 52, 1728.61, 0.5143]],
    ["L23M951D休闲长T恤", [21.88, 0.0237, 0.2251, 0.2500, 0.0027, 0.78, 28, 7, 97.18, 0.0737]],
    ["DE-L21M494男棉服", [669.20, 0.1075, 0.2705, 0.0276, 0.0014, 0.45, 1484, 41, 2473.71, 0.4659]],
    ["DE-F828D男冲锋衣", [728.56, 0.1169, 0.2143, 0.0388, 0.0021, 0.53, 1365, 53, 3400.32, 0.6163]],
    ["AT23W4106女摇粒绒马甲", [79.70, 0.0495, 0.1607, 0.1398, 0.0012, 0.43, 186, 26, 495.93, 0.3133]],
    ["AT25M3336圆领套头卫衣", [357.09, 0.1616, 0.4358, 0.0818, 0.0008, 0.94, 379, 31, 819.31, 0.4267]],
    ["AT23W4114圆领长袖", [61.85, 0.0743, 0.5113, 0.1158, 0.0020, 0.65, 95, 11, 120.97, 0.1667]],
    ["长裤（无）", [109.93, 0.0430, 0.2090, 0.0313, 0.0049, 0.25, 448, 14, 526.00, 0.2154]],
    ["L23W753抓绒套头外套", [52.77, 0.0496, 0.1414, 0.1624, 0.0011, 0.45, 117, 19, 373.16, 0.3559]],
    ["AT23W4117半开襟长袖", [91.76, 0.0899, 0.2611, 0.1084, 0.0012, 0.45, 203, 22, 351.46, 0.3860]],
    ["AT24W4186滑雪棉服", [459.79, 0.1175, 0.2166, 0.0342, 0.0045, 0.43, 1081, 37, 2123.25, 0.6786]],
    ["L20M176卫衣", [208.29, 0.0881, 0.3135, 0.0212, 0.0024, 0.28, 756, 16, 664.34, 0.3200]],
    ["B23M2009卫衣", [273.97, 0.1277, 0.3110, 0.0895, 0.0020, 1.07, 257, 23, 880.92, 0.4600]],
    ["LT26M1550半开襟毛衣", [275.57, 0.1500, 0.3518, 0.0745, 0.0035, 0.79, 349, 26, 783.31, 0.5306]],
    ["L21M445男衬衫", [181.19, 0.0964, 0.2760, 0.0807, 0.0015, 0.81, 223, 18, 656.37, 0.3673]],
    ["AT23M3115男小高领保暖衣", [48.03, 0.0948, 1.6936, 0.0417, 0.0023, 1.00, 48, 2, 28.36, 0.0882]],
    ["L21M427男棉衬衫", [97.86, 0.0436, 0.1725, 0.0285, 0.0092, 0.28, 351, 10, 567.34, 0.3030]],
    ["LT23M1148夹克", [13.35, 0.0133, 0.2008, 0.0400, 0.0011, 0.27, 50, 2, 66.50, 0.0625]],
    ["AT23W4116女半高领长袖", [29.35, 0.0710, 0.2269, 0.2041, 0.0008, 0.60, 49, 10, 129.36, 0.3226]],
    ["夹克9931H", [111.07, 0.0674, 0.1926, 0.0330, 0.0026, 0.33, 333, 11, 576.62, 0.3793]],
    ["L22M680男棉衬衫", [128.86, 0.0773, 0.1520, 0.0506, 0.0022, 0.41, 316, 16, 847.60, 0.5517]],
    ["B23M2024衬衫", [61.86, 0.0606, 0.2028, 0.0486, 0.0025, 0.33, 185, 9, 305.05, 0.3214]],
    ["AT24M3189连帽防泼水卫衣", [172.01, 0.1650, 0.7976, 0.0345, 0.0016, 0.85, 203, 7, 215.67, 0.2500]],
    ["夹克9937D", [99.68, 0.0928, 0.3306, 0.0292, 0.0022, 0.42, 240, 7, 301.52, 0.2692]],
    ["LT23M1574亨利领麻灰T恤", [122.38, 0.2099, 0.3678, 0.1345, 0.0008, 1.03, 119, 16, 332.76, 0.7200]],
    ["夹克9938D", [61.09, 0.0586, 0.2135, 0.0116, 0.0151, 0.08, 773, 9, 286.08, 0.3913]],
    ["LT25M1433翻领牛仔风外套", [187.09, 0.1275, 0.3732, 0.0215, 0.0039, 0.45, 419, 9, 501.32, 0.4091]],
    ["AT25W4337简洁款滑雪服", [131.95, 0.0941, 0.1632, 0.0395, 0.0018, 0.37, 354, 14, 808.49, 0.7000]],
    ["LT25M1463翻领条绒加绒外套", [108.05, 0.0884, 0.2560, 0.0224, 0.0037, 0.35, 313, 7, 422.03, 0.3889]],
    ["L21M470卫衣", [193.90, 0.2807, 0.7361, 0.0321, 0.0009, 1.04, 187, 6, 263.42, 0.4615]],
    ["L23M911薄夹克", [56.21, 0.1204, 1.0316, 0.0043, 0.0016, 0.24, 230, 1, 54.49, 0.0769]],
    ["LT24M1241大格型法兰绒衬衫", [136.38, 0.2732, 0.5684, 0.0405, 0.0021, 0.79, 173, 7, 239.95, 0.5833]],
    ["L22W672长polo衫", [0.00, 0.0000, 0.0000, 0.0000, 0.0000, 0.00, 0, 0, 0.00, 0.0000]],
    ["IX9抓绒裤D", [62.92, 0.2485, 0.4587, 0.0234, 0.0031, 0.49, 128, 3, 137.16, 0.6000]],
    ["H19M047软壳裤", [2.40, 0.0530, 1.0000, 0.0000, 0.0082, 0.40, 6, 0, 0.00, 0.0000]]
  ]);

  const actualPeriod = {
    start_time: "2026-10-29",
    end_time: "2026-11-02",
    days: 5
  };
  const getPeriodDays = (startTime, endTime) => {
    const start = new Date(`${startTime}T00:00:00`);
    const end = new Date(`${endTime}T00:00:00`);
    return Math.max(0, Math.round((end - start) / 86400000) + 1);
  };
  const resolveActualPeriod = (startTime, endTime) => {
    const actualEndTime = endTime <= actualPeriod.end_time ? endTime : actualPeriod.end_time;
    return {
      start_time: startTime,
      end_time: actualEndTime,
      days: getPeriodDays(startTime, actualEndTime),
      is_complete: actualEndTime === endTime
    };
  };
  const tones = ["blue", "rose", "green", "orange"];
  const rows = targetData.map(([
    owner, product_name, season, monthly_sales, target_daily_sales, unit_price,
    ad_order_ratio, ad_orders, ad_spend, cpc, cvr, clicks, acos,
    ad_sales_ratio, activity_type
  ], index) => {
    const [actual_sales, actual_average_price, multi_channel_sales, actual_sales_amount,
      actual_ad_spend, actual_ad_sales_ratio, expected_profit_margin, actual_cvr] = actualData.get(product_name) || [];
    const [reported_ad_spend, reported_ad_sales_ratio, actual_acos, reported_cvr,
      actual_ctr, actual_cpc, actual_clicks, actual_ad_orders, actual_ad_sales_amount,
      actual_ad_order_ratio] = actualAdPerformanceData.get(product_name) || [];
    return ({
    product_id: `TARGET-${String(index + 1).padStart(3, "0")}`,
    product_name,
    product_image_url: null,
    asin: product_name.split(" ")[0],
    owner,
    start_time: "2026-10-29",
    end_time: "2026-11-04",
    actual_start_time: actualPeriod.start_time,
    actual_end_time: actualPeriod.end_time,
    market: "de",
    line: "target",
    season,
    completion: true,
    monthly_sales,
    target_daily_sales,
    actual_sales,
    actual_daily_sales: actual_sales == null ? null : actual_sales / actualPeriod.days,
    actual_average_price,
    multi_channel_sales,
    actual_sales_amount,
    unit_price,
    ad_order_ratio,
    ad_orders,
    ad_spend,
    target_daily_ad_spend: ad_spend,
    cpc,
    cvr,
    clicks,
    acos,
    ad_sales_ratio,
    actual_ad_spend: reported_ad_spend ?? actual_ad_spend,
    actual_daily_ad_spend: (reported_ad_spend ?? actual_ad_spend) == null ? null : (reported_ad_spend ?? actual_ad_spend) / actualPeriod.days,
    actual_ad_sales_ratio: reported_ad_sales_ratio ?? actual_ad_sales_ratio,
    actual_acos,
    actual_ctr,
    actual_cpc,
    actual_clicks,
    actual_daily_clicks: actual_clicks == null ? null : actual_clicks / actualPeriod.days,
    actual_ad_orders,
    actual_daily_ad_orders: actual_ad_orders == null ? null : actual_ad_orders / actualPeriod.days,
    actual_ad_sales_amount,
    actual_ad_order_ratio,
    expected_profit_margin,
    actual_cvr: reported_cvr ?? actual_cvr,
    actual_period_days: actualPeriod.days,
    activity_type: activity_type === "Z测算" ? "Z划算" : activity_type,
    recent_cpc: null,
    previous_week_cpc: null,
    recent_ad_cvr: null,
    previous_week_ad_cvr: null,
    previous_week_ad_order_ratio: null,
    sales_change: null,
    status: "pending",
    status_text: "等待实际数据",
    reviewed: false,
    thumb: owner.slice(0, 1),
    tone: tones[index % tones.length],
    note: actual_sales == null
      ? "本周期目标数据已录入，实际销售与广告表现等待数据接口回填。"
      : `已导入 ${actualPeriod.start_time} 至 ${actualPeriod.end_time} 的阶段实际数据。`
  });
  });

  const overview = {
    week: { start_time: "2026-10-26", end_time: "2026-11-01", label: "2026 · 第44周" },
    actual_period: structuredClone(actualPeriod),
    kpis: {
      sales: 128460, ad_spend: 22850, ad_sales: 87320, acos: 0.2617, roas: 3.82,
      product_count: rows.length, pending_review_count: rows.filter((row) => !row.reviewed).length
    },
    products: rows
  };

  return {
    async getOverview({ start_time, end_time } = {}) {
      const result = structuredClone(overview);
      if (start_time && end_time) {
        result.week = {
          start_time,
          end_time,
          label: `${start_time} 至 ${end_time}`
        };
        const isTargetPeriod = start_time === "2026-10-29" && end_time === "2026-11-04";
        result.products = isTargetPeriod ? result.products : [];
        result.actual_period = resolveActualPeriod(start_time, end_time);
        result.products = result.products.map((product) => ({
          ...product,
          actual_start_time: result.actual_period.start_time,
          actual_end_time: result.actual_period.end_time,
          actual_period_days: result.actual_period.days
        }));
        result.kpis.product_count = result.products.length;
        result.kpis.pending_review_count = result.products.filter((row) => !row.reviewed).length;
      }
      return result;
    },
    async getProductDetail({ productId }) {
      return structuredClone(rows.find((row) => row.product_id === productId));
    },
    async saveReview(payload) {
      const row = rows.find((item) => item.product_id === payload.product_id);
      if (row) {
        row.reviewed = payload.status === "completed";
        row.review_note = payload.review_note;
        row.review_tags = payload.review_tags || [];
        row.next_action = payload.next_action || "";
      }
      return { success: true, data: structuredClone(row) };
    }
  };
})();
