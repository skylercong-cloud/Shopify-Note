# 参考 2 技术选型决策表

> **本课目标：** 比较相邻概念与实现位置。

## Option vs Variant vs Metafield vs Metaobject vs Line Item Property

| 需求 | 应优先考虑 | 理由 |
|---|---|---|
| 黑色/M 有独立库存和 SKU | Variant | 它是独立可购买规格 |
| 商品材质 Cotton | Metafield | Product 的简单自定义字段 |
| 多字段尺码表且多个商品复用 | Metaobject + reference | 独立、结构化、可复用对象 |
| 顾客这一次输入刻字 Alice | Line Item Property | 属于购买实例，不应生成 SKU |
| Color 是用户必须选择的规格 | Product Option | Option values 用来解析 Variant |

## Theme setting vs Metafield

| 场景 | Theme setting | Metafield |
|---|---:|---:|
| 全站按钮圆角 | ✅ | ❌ |
| 首页 Hero 标题 | ✅ | 可选，看内容模型 |
| 每个 Product 都有自己的“材质” | ❌ | ✅ |
| Collection 自己的营销副标题 | 不建议逐 Collection 写 Theme setting | ✅ Collection metafield |
| 商家想在编辑器里选择展示风格 | ✅ | ❌ |

## Filter vs Sort vs Collection

| 概念 | 问题 |
|---|---|
| Collection | 这一页的初始商品集合是什么？ |
| Filter | 从集合里留下哪些商品？ |
| Sort | 已留下的商品怎么排序？ |
| Pagination | 结果的哪一页？ |

## Theme vs App vs Function vs Headless

| 如果需求是… | 首选 |
|---|---|
| 商品详情页 UI | Theme |
| Admin 中复杂业务系统 | App |
| Checkout commerce rule | Function（通常由 App 交付） |
| 自己用 React 完全控制 Storefront | Headless / Storefront API |
| 仅给 Product 增加结构化字段 | Metafield，不要为了字段做整个 App |

---

## 使用提示

用一个实际需求说明选择依据。

