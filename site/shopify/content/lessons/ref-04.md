# 参考 4 Theme / App / Function / Headless 职责表

> **本课目标：** 查阅不同实现层的职责边界。

| 需求 | 优先考虑 |
|---|---|
| Product Page UI | Theme |
| Variant Selector | Theme + JS |
| Cart Drawer | Theme + Ajax Cart API |
| Collection Grid / Filter UI | Theme |
| SEO HTML / JSON-LD | Theme |
| 商家后台管理系统 | App |
| ERP / OMS / CRM 集成 | App + Admin GraphQL API |
| Discount 实时规则 | Discount / Shopify Function |
| 自定义 Shopify 后端规则 | Function |
| React / Next.js 独立 Storefront | Storefront API / Headless |
| Checkout | Shopify Checkout / Extensibility |
| 自定义商品数据 | Metafield / Metaobject |

判断问题时建议先问：

```text
这是 UI 问题？
→ Theme

这是 Commerce 数据读写？
→ Shopify API

这是商家后台业务系统？
→ App

这是 Shopify 运行时后端规则？
→ Function

这是独立前端 Storefront？
→ Headless / Storefront API
```

---

---

## 使用提示

结合技术选型决策表使用。

