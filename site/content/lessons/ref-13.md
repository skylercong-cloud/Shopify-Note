# 参考 13 性能排查参考

> **本课目标：** 按需查询属性、接口和原始案例。

![Theme 性能加载优先级](content/assets/10-theme-performance.png)

性能优化的目标不是“把每个资源都延迟”，而是：**关键内容尽快出现，非关键内容晚一点，主线程保持可响应。**


## 三个核心 Web Vitals

| 指标 | 用人话解释 | Shopify Theme 常见罪魁祸首 |
|---|---|---|
| LCP | 首屏最大主要内容多久出现 | Hero/Product image 太晚、资源优先级错误、服务器/第三方拖延 |
| CLS | 页面加载时会不会乱跳 | 图片没尺寸、异步 Banner、字体/组件尺寸不稳定 |
| INP | 点击/输入后多久看到响应 | 大 JS、长任务、复杂 DOM、第三方脚本 |

性能不是单一 Lighthouse 分数，而是用户真实加载与交互体验。


```text
LCP → 首屏主要内容什么时候出现
CLS → 页面加载时是否乱跳
INP → 用户交互到下一次可见更新是否足够快
```

官方： [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)

---

## LCP：首屏主图不要 lazy load

官方当前明确建议不要 lazy-load LCP image，并可以对明确的 LCP 图使用 `fetchpriority="high"`。

```liquid
{{ product.featured_image
  | image_url: width: 1200
  | image_tag:
    loading: 'eager',
    fetchpriority: 'high',
    widths: '400, 600, 800, 1000, 1200',
    sizes: '(min-width: 990px) 50vw, 100vw'
}}
```

但不要机械地让页面所有图片都 `eager + high`，否则“高优先级”就失去意义。

官方：

- [Never lazy-load the LCP image](https://shopify.dev/docs/storefronts/themes/best-practices/performance/never-lazy-load-lcp-image)
- [Mark the LCP image with fetchpriority="high"](https://shopify.dev/docs/storefronts/themes/best-practices/performance/set-fetchpriority-high-on-lcp-image)


错误：

```html
<img loading="lazy" ...>
```

如果这张图正好是 Product Page 首屏 LCP Image，它会延迟主要内容显示。

常见策略：

```text
首屏 LCP Image
→ eager
→ fetchpriority="high"

下方 Gallery Images
→ lazy
```

---

## 图片优化

### `srcset / sizes` 的核心不是语法，而是避免下载过大的源图

```liquid
{{ image
  | image_url: width: 1200
  | image_tag:
    widths: '320, 480, 640, 800, 1200',
    sizes: '(min-width: 990px) 50vw, 100vw',
    loading: 'lazy'
}}
```

如果桌面卡片实际只占 300px，却始终下载 3000px 原图，CSS 把图片“缩小显示”并不会把网络成本缩小。


Shopify Image CDN 可以按宽度输出资源：

```liquid
{{
  product.featured_image
  | image_url: width: 800
  | image_tag
}}
```

不要显示 400px 的图，却让用户下载 5000px 原图。

关注：

- `srcset`
- `sizes`
- `width` / `height`
- `aspect-ratio`
- lazy loading
- fetch priority

---

## CLS

### Shopify Image 对象为什么比裸字符串 URL 更有价值？

因为 Image 对象知道 width / height / aspect ratio 等元数据。使用 `image_url` + `image_tag` 能让 Theme 更容易生成尺寸信息和 responsive image markup，从而提前给浏览器布局空间。

对于固定 Product Card，还可以配合：

```css
.product-card__media {
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

.product-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```


图片没有固定宽高时：

```text
页面先布局
→ 图片加载
→ 高度突然出现
→ 内容向下跳
```

避免方式：

- 给图片 width / height
- 保留 aspect ratio
- Product Card 图片容器预留尺寸

---

## JavaScript 不应接管一切

### Shopify 官方现在明确强调“essential content server-side”

一个商品页不应是：

```html
<div id="product-app"></div>
```

然后等 JS 请求商品数据才显示 Title / Price。

更合理：

```text
Liquid 先渲染
Product title / price / image / form
        ↓
浏览器已有可读可操作基础 HTML
        ↓
JS 再增强
Variant picker / drawer / animation / async update
```

官方：[Render essential content in Liquid and HTML, not JavaScript](https://shopify.dev/docs/storefronts/themes/best-practices/performance/render-essential-content-server-side)


Shopify Theme 的推荐思路：

```text
Shopify
→ Liquid SSR
→ HTML
→ Browser
→ JS Enhancement
```

而不是：

```text
<div id="app"></div>
→ 下载巨大 JS
→ API
→ JS Render Everything
```

Theme 本身适合 Progressive Enhancement。

Shopify 官方也强调减少不必要 JavaScript、优先使用浏览器原生能力。

---

## `defer` 与按需加载

```html
<script
  src="{{ 'product.js' | asset_url }}"
  defer
></script>
```

可以减少 parser-blocking。

更大的原则：

> **当前页面不需要的 JS，就不要让用户下载和执行。**

例如：

```text
product.js
collection.js
cart.js
predictive-search.js
```

按功能组织，而不是所有逻辑都堆进一个超大的 `theme.js`。

---

## Liquid 也会慢

### “服务端渲染”不代表 Liquid 可以随便写

常见问题：

- 深层嵌套循环；
- 对高 Variant Product 遍历/输出大量数据；
- 一个页面反复做相同昂贵计算；
- 输出巨大 JSON 再让 JS 二次解析；
- 为了一个小组件读取远超需要的数据结构。

优化的基本原则仍然是：**减少工作量、减少 payload、减少重复。**


性能不是只有浏览器端。

Shopify 服务端执行 Liquid，复杂 Liquid 会增加 TTFB。

官方重点建议：

- 避免深层嵌套 loops
- 避免循环中大量 metafield access
- 不要无意义遍历大量 variants
- 减少重复复杂 render 嵌套
- 控制 pagination 深度

官方： [Performance best practices](https://shopify.dev/docs/storefronts/themes/best-practices/performance)

---

## App / Third-party Scripts

### 排查性能时建立“责任清单”

DevTools Network / Performance 里至少区分：

```text
Theme 自己的 JS / CSS
Shopify 平台资源
App embed / App block 资源
Analytics
Ads / marketing pixels
Chat / reviews / personalization
```

一个 `theme.js` 优化了 20KB，并不能抵消 8 个第三方 App 在主线程执行数百毫秒的成本。性能优化要针对最终页面，而不是只针对你自己的仓库代码。


线上性能：

```text
Theme
+
Shopify runtime
+
App Embeds
+
Analytics
+
Chat
+
Review
+
Marketing / Tracking
```

所以 Lighthouse 变慢时，不要只盯自己的 `theme.js`。

要检查：

- Network
- Third-party JS
- App Embed
- Main-thread time
- Coverage
- Long tasks

---

---

## 使用提示

此页与主线对应课程存在概念交集；需要查具体接口时再使用，无需顺序重复阅读。

