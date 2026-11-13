# Dawn 源码研读路线

Dawn 源码研读分为七个专题。

| 专题 | 研究重点 |
|---|---|
| 1. 页面运行入口 | 从 `theme.liquid` 追踪到页面最终渲染 |
| 2. 商品详情页 | `main-product`、商品媒体、变体选择、加购 |
| 3. 商品集合页 | 商品网格、筛选、排序、分页、异步更新 |
| 4. JavaScript 架构 | Custom Elements、事件、组件生命周期、状态管理 |
| 5. 购物车架构 | Cart API、Cart Drawer、购物车更新和并发 |
| 6. CSS 架构 | CSS 组织、组件样式、响应式和性能 |
| 7. 工程化设计 | Theme Editor、可扩展性、性能、代码重构 |

**学习方式也做一些调整：**

每次选择 Dawn 中一个真实的源码模块，按照以下顺序研究：

1. 这个模块解决什么业务问题？
2. 涉及哪些文件？文件之间如何调用？
3. 逐段阅读关键 Liquid / JavaScript 代码。
4. 分析它为什么这样设计。
5. 分析有没有其他实现方式，各自的优缺点。
6. 如果我们自己开发，应该怎样设计？

不再花大量时间解释已经掌握的基础概念。

## 第一阶段：先从商品详情页源码入手

源码研读从 Dawn 的 **Product Detail Page（商品详情页）** 开始。

原因是商品详情页几乎涵盖了 Dawn 最核心的工程设计：

- Liquid 如何组织商品数据。
- Snippet 如何组合业务 UI。
- Custom Elements 如何管理组件。
- Pub/Sub 如何实现组件通信。
- Section Rendering 如何更新商品信息。
- Ajax 如何完成加购。
- Cart Drawer 如何响应购物车变化。

### 1. 首先认识这几个核心文件

我已经查阅了 Shopify 官方 Dawn 仓库当前 `main` 分支的源码。

<box border radius="lg" padding={3} gap={3}>
  <row align="center">
    <LessonImage src="assets/fill/img-19.jpg" alt="Shopify Dawn theme product detail page desktop storefront screenshot"/>
    <box flex="1" gap={1}>
      **Dawn 商品详情页源码**
      <text color="secondary" size="xs">从 Liquid 到 JavaScript 的完整调用链</text>
      <text size="xs"><Link url={turn451579search0.url.uri} title="Shopify / Dawn 官方 GitHub 仓库"/></text>
    </box>
  </row>
  <divider color="subtle"/>
  | 文件 | 重点研究内容 |
  |---|---|
  | `templates/product.json` | 商品页实际使用哪些组件 |
  | `sections/main-product.liquid` | 商品页主体如何组织 |
  | `snippets/product-media-gallery.liquid` | 商品媒体画廊 |
  | `snippets/product-variant-picker.liquid` | 变体选择器 |
  | `snippets/buy-buttons.liquid` | 商品购买表单 |
  | `snippets/price.liquid` | 价格展示逻辑 |
  | `assets/product-info.js` | 商品信息更新核心 |
  | `assets/product-form.js` | Ajax 加购核心 |
</box>

这些不是随意挑选的文件，而是当前官方源码中实际存在的文件。

注意：官方仓库的 `main` 分支可能包含尚未正式发布的功能，因此我们暂时以它作为源码研读基准；如果你使用的是特定 Dawn 版本，后面可以对照该版本的实现。

### 2. 先看商品页的真实执行链

```text
templates/product.json
        │
        ▼
sections/main-product.liquid
        │
        ├── product-media-gallery
        │
        ├── product-variant-picker
        │
        ├── price
        │
        └── buy-buttons
                │
                ▼
       浏览器加载 JavaScript
                │
        ┌───────┴────────┐
        ▼                ▼
  product-info.js   product-form.js
        │                │
        ▼                ▼
  变体选择与更新       Ajax 加购
        │                │
        ▼                ▼
  Section Rendering   Cart API
                         │
                         ▼
                    Cart Drawer
```

这里有一个很值得研究的设计：

Dawn 并没有用一个庞大的 JavaScript 类管理整个商品详情页，而是把商品信息更新和购买表单拆分成了不同组件。

这符合 Dawn 官方强调的 HTML-first、JavaScript 按需增强、服务端渲染的设计原则。

### 3. 先看一个真实的代码设计

在 `main-product.liquid` 中，Dawn 使用了：

```liquid
<product-info
  id="MainProduct-{{ section.id }}"
  data-section="{{ section.id }}"
  data-product-id="{{ product.id }}"
  data-update-url="true"
  data-url="{{ product.url }}"
>
```

注意这里：

`product-info` 并不是普通的 HTML 标签。

它对应 `product-info.js` 中注册的 Custom Element：

```js
customElements.define(
  'product-info',
  class ProductInfo extends HTMLElement {
    // ...
  }
);
```

也就是说，Liquid 负责输出组件需要的 HTML 和数据，JavaScript 则为这个 HTML 元素赋予行为。

这是我们接下来要深入研究的核心设计之一。

### 4. Dawn 的商品选择究竟如何工作？

这是商品详情页的完整业务流程。

假设用户选择：

```text
颜色：Blue
尺码：42
```

Dawn 的实际流程大致是：

1. `variant-selects` 处理用户选项变化。
2. 通过 Pub/Sub 发布 `optionValueSelectionChange` 事件。
3. `product-info` 订阅这个事件。
4. `handleOptionValueChange()` 接收选中的 Option Value。
5. `buildRequestUrlWithParams()` 生成请求地址。
6. `renderProductInfo()` 发起 Fetch 请求。
7. Shopify 返回新的商品 HTML。
8. Dawn 更新价格、库存、图片、购买按钮及 Variant ID。
9. 使用 `history.replaceState()` 更新当前商品 URL。

其中 `product-info.js` 还使用了 `AbortController`，防止连续选择商品选项时旧请求干扰新请求。

这部分值得单独花一节课逐行研究。

### 5. 再看加购

`buy-buttons.liquid` 输出：

```liquid
<product-form>
  {% form 'product', product %}
    <input type="hidden" name="id" value="...">
    <button type="submit">加入购物车</button>
  {% endform %}
</product-form>
```

而 `product-form.js` 注册了：

```js
customElements.define(
  'product-form',
  class ProductForm extends HTMLElement {
    // ...
  }
);
```

它会拦截表单提交，构建 `FormData`，请求 Shopify Cart Ajax API，并通过返回的 Section HTML 更新购物车组件。

这里我们还会深入研究它为什么使用事件总线、为什么把购物车更新交给 Cart Drawer，以及它怎样处理错误和 Loading 状态。

---

## 接下来的具体课程安排

我把原来的学习计划进一步调整为真正的源码研读课程：

| 课程 | 内容 |
|---|---|
| 第 1 课 | 商品详情页源码：`main-product.liquid` |
| 第 2 课 | `product-variant-picker.liquid`：变体选择器实现 |
| 第 3 课 | `product-info.js`：商品信息更新机制 |
| 第 4 课 | `product-form.js`：Ajax 加购实现 |
| 第 5 课 | `product-media-gallery`：图片画廊及媒体切换 |
| 第 6 课 | `cart-drawer.js`：购物车抽屉完整实现 |
| 第 7 课 | Pub/Sub、Custom Elements、HTMLUpdateUtility |
| 第 8 课 | Collection 商品网格、商品卡片和 Quick Add |
| 第 9 课 | `facets.js`：筛选、排序和异步更新 |
| 第 10 课 | Predictive Search 搜索联想 |
| 第 11 课 | Dawn 的性能优化、可访问性与工程设计复盘 |

## 参考资料

- [GitHub - Shopify/dawn: Shopify's first source available reference theme, with Online Store 2.0 features and performance built-in. · GitHub](https://github.com/Shopify/dawn)
- [GitHub - Shopify/dawn: Shopify's first source available reference theme, with Online Store 2.0 features and performance built-in. · GitHub](https://github.com/shopify/dawn)
- [dawn/sections/main-product.liquid at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/sections/main-product.liquid)
- [GitHub - Shopify-Developers/Shopify-Dawn: Shopify's first source available reference theme, with Online Store 2.0 features and performance built-in. · GitHub](https://github.com/Shopify-Developers/Shopify-Dawn)
- [dawn/README.md at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/README.md)
- [dawn/layout/theme.liquid at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/layout/theme.liquid)
- [dawn/sections/featured-product.liquid at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/sections/featured-product.liquid)
- [dawn/templates/product.json at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/templates/product.json)
- [dawn/sections/featured-collection.liquid at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/sections/featured-collection.liquid)
- [dawn/assets/product-info.js at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/assets/product-info.js)
- [dawn/assets/product-form.js at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/assets/product-form.js)
- [dawn/snippets/product-variant-picker.liquid at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/snippets/product-variant-picker.liquid)
- [dawn/snippets/buy-buttons.liquid at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/snippets/buy-buttons.liquid)
- [dawn/snippets/price.liquid at main · Shopify/dawn · GitHub](https://github.com/Shopify/dawn/blob/main/snippets/price.liquid)
