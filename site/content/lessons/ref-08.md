# 参考 8 Collection 实现补充参考

> **本课目标：** 按需查询属性、接口和原始案例。

## Collection 在 Admin 的位置与创建

### 旧 Admin 模型下的经典创建过程

如果你的后台仍显示 Manual / Smart：

**Manual：**

```text
Products → Collections → Add collection
→ Title / Description
→ Manual
→ 保存
→ 手工添加 Products
→ 设置 Sort
```

**Smart：**

```text
Products → Collections → Add collection
→ Smart
→ 定义 conditions
→ 选择 ALL / ANY 规则逻辑
→ Shopify 自动维护成员
```

新 Collections model 的 UI 可能把这些能力重新组织为 sources + conditions，但“集合成员来自哪里、是否由条件自动维护”的建模问题仍然相同。


**Admin：** `Products → Collections`。

当前 Shopify 正在逐步推出新的 Collections model，因此你可能看到两种后台体验：

- 旧模型：**Manual collection / Smart collection**；
- 新模型：Collection 可以从不同 sources 添加 Product / Variant / existing collections / app sources，并支持条件。

如果你的 Admin 已经看到新 Collections UI，优先按当前界面操作；理解旧的 Manual / Smart 思维仍然很有价值，因为大量现有店铺和教程仍使用这个术语。

官方 Help Center：

- [Creating collections and adding products](https://help.shopify.com/en/manual/products/collections/create-collection)
- [Creating and modifying smart collections](https://help.shopify.com/en/manual/products/collections/smart-collections/create)

开发文档：

- [Liquid `collection` object](https://shopify.dev/docs/api/liquid/objects/collection)
- [Collection template](https://shopify.dev/docs/storefronts/themes/architecture/templates/collection)


## Collection 不是 Product 的父目录

### Collection 更像“集合/查询结果”，不是目录树

Product A 可以同时属于：

```text
Running Shoes
Nike
Men's Shoes
Best Sellers
New Arrivals
```

所以不要设计成：

```text
Product.parentCollection
```

更接近：

```text
Product ↔ many Collections
```

### Manual 与 Smart 的经典区别

| | Manual | Smart / Automated |
|---|---|---|
| 谁决定商品成员 | 商家手动选择 | Shopify 根据 conditions 自动匹配 |
| 适合 | 精选、首页运营位 | Vendor、Tag、Type、Price 等规则集合 |
| 商品数据变化后 | 成员不会自动因条件变化更新 | 条件重新匹配 |
| 人工排序 | 常见 | 也可配置 sort order，但成员由条件决定 |

> 新 Collections model 正在变化中，创建能力可能比上表更丰富；上表用于帮助理解经典数据模型，而不是限制最新 Admin UI。


Collection 是一个 Product 集合。

一个 Product 可以属于多个 Collections：

```text
Nike Air Max
├── Running Shoes
├── Nike
├── Best Sellers
└── Men's Shoes
```

所以关系更接近多对多。

Liquid 官方： [collection](https://shopify.dev/docs/api/liquid/objects/collection)

---

## Collection 页面运行链路

### Collection 常用 Liquid 属性

| 属性 | 含义 | 常见使用 |
|---|---|---|
| `collection.id` | Collection ID | data 属性、调试 |
| `collection.title` | 标题 | H1 |
| `collection.handle` | URL handle | URL / 逻辑判断 |
| `collection.url` | Collection URL | 链接 |
| `collection.description` | 描述 | SEO / 页面内容 |
| `collection.image` | Collection 图片 | Hero |
| `collection.products` | 当前 Collection 商品 | Product grid |
| `collection.products_count` | 当前视图商品数 | 过滤后结果数语义 |
| `collection.all_products_count` | Collection 全部商品数 | 未过滤总量语义 |
| `collection.filters` | Storefront filters | 筛选 UI |
| `collection.sort_options` | 可用排序项 | Sort select |
| `collection.sort_by` | 当前 URL 排序值 | UI 状态 |
| `collection.default_sort_by` | 默认排序 | 初始化 |
| `collection.metafields` | Collection 自定义字段 | Hero、副标题、SEO 扩展 |

完整列表：[Liquid `collection` object](https://shopify.dev/docs/api/liquid/objects/collection)


```text
/collections/shoes
      ↓
Shopify 找到 Collection
      ↓
collection.json
      ↓
Collection Sections
      ↓
collection.products
      ↓
Product Card
```

例如：

```liquid
<h1>{{ collection.title }}</h1>

{% for product in collection.products %}
  {% render 'product-card', product: product %}
{% endfor %}
```

React 类比：

```jsx
products.map(product => (
  <ProductCard product={product} />
))
```

---

## Product Card 为什么要拆成 Snippet？

### 一个 Product Card 最好接受明确参数

教学版：

```liquid
{% render 'product-card',
  product: product,
  show_vendor: true,
  image_loading: 'lazy'
%}
```

Snippet 内只依赖传入的 `product`，而不是偷偷依赖外层某个 `collection`。这样它可以复用于：

- Collection grid；
- Search results；
- Related products；
- Featured collection；
- Landing page 推荐商品。

这和 React 中让组件 props 明确、降低隐式上下文依赖是同一个工程思想。


不要在 Collection、Search、Recommendation 每个地方重复写一整份 Card。

推荐：

```text
sections/
└── main-collection-product-grid.liquid

snippets/
└── product-card.liquid
```

Collection：

```liquid
{% render 'product-card', product: product %}
```

好处：

- 复用
- 样式统一
- 易维护
- Collection / Search 共用

---

## Pagination

### Collection products 为什么要 paginate？

官方 Collection template 文档说明 Collection Product 分页每页最多 50 个。典型实现：

```liquid
{% paginate collection.products by 24 %}
  <div class="product-grid">
    {% for product in collection.products %}
      {% render 'product-card', product: product %}
    {% endfor %}
  </div>

  {{ paginate | default_pagination }}
{% endpaginate %}
```

`paginate` 不只是“画页码”；它还决定 Liquid 当前能访问哪一段资源集合。


```liquid
{% paginate collection.products by 24 %}

  {% for product in collection.products %}
    {% render 'product-card', product: product %}
  {% endfor %}

  {{ paginate | default_pagination }}

{% endpaginate %}
```

URL：

```text
/collections/shoes?page=2
```

它体现了 Shopify Theme 的重要模式：

> **URL 是页面状态的一部分。**

---

---

## 使用提示

此页与主线对应课程存在概念交集；需要查具体接口时再使用，无需顺序重复阅读。

