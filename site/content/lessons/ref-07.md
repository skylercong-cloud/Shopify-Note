# 参考 7 活动价与折扣补充参考

> **本课目标：** 按需查询属性、接口和原始案例。

## 先建立“价格权威”模型

前端可以展示价格、选择 Variant、提交 Cart mutation，但**浏览器不是价格的最终权威**。

```text
浏览器
  ├── 可以说：我要 Variant 123，数量 2
  ├── 可以说：这次购买附带 campaign=summer
  └── 不应该能说：请把价格改成 $1
                ↓
Shopify / Function / Discount
                ↓
可信的价格与折扣计算
```

因此当业务问“能不能前端传个 price？”时，正确思路不是找一个隐藏参数，而是选择正确的 Shopify 定价机制。


## 为什么不能加购时传 `price`？

假设 Shopify Variant 原价：

```text
$29.99
```

活动页显示：

```text
$19.99
```

错误思路：

```js
{
  id: variantId,
  quantity: 1,
  price: 1999
}
```

为什么不允许浏览器决定最终价格？

因为用户可以打开 DevTools：

```js
price: 1
```

客户端永远不能成为可信的最终交易价格来源。

正确思维：

```text
Browser
→ 提出购买意图

Shopify 后端
→ 根据可信规则决定最终价格
```

---

## 常见特殊价格方案

### 方案选择表

| 需求 | 更适合的机制 | 说明 |
|---|---|---|
| 公开促销码 | Discount code | 商家熟悉、配置简单 |
| 自动满减/折扣 | Automatic discount / Function | 规则由 Shopify 执行 |
| 订阅价、周期购买 | Selling Plan | 购买计划是独立商业概念 |
| 同一商品长期存在不同可购买 SKU | Variant | 前提是它真的是不同规格/库存/sku |
| 复杂企业规则、会员层级、组合规则 | Shopify Functions + App 配置 | App 管配置，Function 执行交易规则 |
| 只是记录活动来源 | Line Item Property / Cart attribute | 只能记录上下文，不能作为价格授权 |

> 不要为了“做活动价”随便复制一堆 Variant。Variant 是商品模型，不应该被当成所有营销规则的万能开关。


### Discount

适合：

```text
原价 $29.99
优惠 -$10
最终 $19.99
```

### Selling Plan

适合：

```text
一次性购买 $29.99
订阅购买 $19.99
```

### 活动专用 Variant / Product

业务简单且 SKU 模型允许时，可以使用独立 SKU / Variant。

### Shopify Functions

复杂促销逻辑可以通过 Function 在 Shopify 后端实时计算。

官方：

- [About discounts](https://shopify.dev/docs/apps/build/discounts)
- [Build a Discount Function](https://shopify.dev/docs/apps/build/discounts/build-discount-function?extension=javascript)
- [About Shopify Functions](https://shopify.dev/docs/apps/build/functions)

---

## Line Item Property 可以传活动上下文，但不是安全凭证

例如：

```js
properties: {
  _campaign: 'summer_sale'
}
```

它可以告诉系统：

```text
这条 Cart Line 来自 Summer Sale 业务上下文
```

但用户也可以自己伪造这个字段。

所以后端 Function/App 还应该验证：

- 活动是否存在
- 当前时间是否有效
- Variant 是否属于活动
- Buyer 是否符合条件
- 数量是否满足
- 真正活动价是多少

结论：

> **客户端上下文可以参与判断，但不能单独作为优惠授权。**

---

## Shopify App 与 Function 的区别

### 把 App 和 Function 想成“系统”和“规则插件”

| 维度 | App | Shopify Function |
|---|---|---|
| 形态 | 完整应用 | Shopify 后端特定扩展点上的逻辑 |
| UI | 可以有 Admin UI | 本身通常不是一个完整 UI 应用 |
| 数据库 | 可以有自己的 DB | 通常读取输入并返回规则结果 |
| OAuth / 权限 | 常见 | 通常随 App 部署和配置 |
| Webhook / API | 可以 | 不是其核心职责 |
| 典型例子 | ERP 集成、评价 App、营销平台 | Discount、Cart transform、Delivery/Payment customization |

典型架构：

```text
Merchant
  ↓
App Admin UI
  ↓ 保存“会员 9 折”等配置
App / Metafield / DB
  ↓
Shopify Function
  ↓ 在结账相关扩展点执行
Discount result
```

官方：[About Shopify Functions](https://shopify.dev/docs/apps/build/functions)


一句话：

> **App 是完整应用/业务系统；Function 是 Shopify 在特定业务节点执行的后端扩展逻辑。**

```text
Shopify App
│
├── Admin UI
├── React / Web App
├── Database
├── Admin GraphQL API
├── OAuth
├── Webhooks
└── Shopify Function
      └── Discount / Delivery / Cart / Payment 等规则
```

| 项目 | App | Function |
|---|---|---|
| 定位 | 完整业务应用 | 业务规则扩展 |
| UI | 可以有 | 通常没有 |
| 数据库 | 可以有 | Function 自身不是数据库 |
| OAuth | App 负责 | 不负责 |
| Webhook | App 可使用 | 不是主要职责 |
| 执行 | App 服务自身运行 | Shopify 在对应运行点调用 |
| 典型场景 | ERP / 营销后台 / Product 管理 | 折扣、配送、购物车规则 |

官方： [About Shopify Functions](https://shopify.dev/docs/apps/build/functions)

---

---

## 使用提示

此页与主线对应课程存在概念交集；需要查具体接口时再使用，无需顺序重复阅读。

