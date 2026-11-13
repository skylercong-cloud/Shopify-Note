# 参考 3 商品页集成示意

> **本课目标：** 理解知识如何组合；代码是示意，需要适配主题。

> 集成示意：以下硬编码 section ID 与 DOM 替换方式需要按实际 Theme 适配，不应直接作为通用生产实现。


假设需求是：

> 做一个服装 Product page，支持 Color / Size 选规格、切图、显示 Material、打开 Size Guide、Ajax 加购并打开 Cart Drawer。

不要直接开写 JS。先拆数据模型。

## 数据建模

```text
Product
├── title / description / media
├── Options
│   ├── Color
│   └── Size
├── Variants
│   ├── Black / S
│   ├── Black / M
│   └── ...
├── Product Metafield
│   └── custom.material = Cotton
└── Product Metafield
    └── custom.size_guide
          ↓ reference
       Size Guide Metaobject
```

这样：

- SKU / price / stock → Variant；
- Material → Metafield；
- 多字段可复用 Size Guide → Metaobject；
- Cart Drawer → Theme UI。

## Liquid 首屏应该输出什么？

```liquid
{% assign current_variant = product.selected_or_first_available_variant %}
{% assign material = product.metafields.custom.material.value %}
{% assign size_guide = product.metafields.custom.size_guide.value %}

<article data-product-section data-product-id="{{ product.id }}">
  <h1>{{ product.title | escape }}</h1>

  <div data-price>
    {{ current_variant.price | money }}
  </div>

  {% if material != blank %}
    <p>Material: {{ material }}</p>
  {% endif %}

  {% if size_guide %}
    <details>
      <summary>{{ size_guide.title.value | escape }}</summary>
      <p>Chest: {{ size_guide.chest.value }}</p>
      <p>Waist: {{ size_guide.waist.value }}</p>
    </details>
  {% endif %}

  {% form 'product', product, id: 'ProductForm' %}
    <input type="hidden" name="id" value="{{ current_variant.id }}" data-variant-id>
    <input type="number" name="quantity" value="1" min="1">
    <button type="submit" {% unless current_variant.available %}disabled{% endunless %}>
      Add to cart
    </button>
  {% endform %}
</article>
```

首屏即使 JS 还没执行，Title、Price、Material、Form 等核心内容已经存在。

## Variant Picker 的 JS 负责什么？

```text
读取用户选择的 Color / Size
       ↓
解析目标 Variant
       ↓
更新 hidden input 的 variant ID
       ↓
更新价格 / 可售状态
       ↓
切换 Media
       ↓
可选：同步 ?variant=...
```

它不负责：

- 决定可信价格；
- 修改 Shopify 库存；
- 自己造一个 Order。

## Ajax 加购

```js
const form = document.querySelector('#ProductForm');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const variantId = Number(formData.get('id'));
  const quantity = Number(formData.get('quantity') || 1);

  const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      items: [{ id: variantId, quantity }],
      sections: ['cart-drawer', 'cart-icon-bubble']
    })
  });

  if (!response.ok) {
    // 生产代码：显示 Shopify 返回的库存/加购错误
    return;
  }

  const result = await response.json();

  // 生产 Theme 应按自己的 section wrapper 结构安全替换。
  document.querySelector('#cart-drawer').innerHTML = result.sections['cart-drawer'];
});
```

这里把前面课程完整连起来：

```text
Product / Variant 数据模型
        ↓
Liquid SSR
        ↓
Metafield / Metaobject 内容
        ↓
JS Variant interaction
        ↓
Ajax Cart API
        ↓
Section Rendering
        ↓
Cart Drawer UI
        ↓
Shopify Checkout
```

## 最后的工程检查

| 检查项 | 为什么 |
|---|---|
| 首屏主图是否被 lazy load | 影响 LCP |
| Product form 是否提交 Variant ID | Product ID 不能直接替代 |
| 无 JS 时页面是否仍有核心内容 | Progressive enhancement |
| Size Guide 是否被重复存进每个 Product | 可复用数据应考虑 Metaobject |
| Cart Drawer 更新是否使用 Shopify 返回的新 HTML/数据 | 避免前端状态漂移 |
| URL 是否同步 Variant / filter 等重要状态 | 刷新/分享/后退 |
| 活动价是否只靠浏览器参数 | 价格安全边界错误 |

---

---

## 使用提示

对照你的主题验证 section ID 与 DOM 替换位置。

