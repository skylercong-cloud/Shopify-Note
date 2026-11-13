# SEO 与结构化数据：深入 canonical_url、content_for_header、JSON-LD


这一课我们进入 Dawn 的 SEO 实现。

前面研究过商品详情页、Collection、搜索、Markets 等模块。现在有一个很值得思考的问题：

**Shopify 商品页面的 SEO 信息究竟是谁生成的？Shopify 平台、Liquid 和 Dawn 各自负责什么？**

例如，一个商品有以下 URL：

```text
/products/running-shoes
/products/running-shoes?variant=123456
/products/running-shoes?utm_source=google
/collections/summer/products/running-shoes
```

它们可能展示同一个商品，但搜索引擎应该如何理解这些 URL 的关系？

另外，搜索引擎怎么知道某个页面是商品页、商品售价多少、是否有库存，以及同一个商品还有哪些颜色和尺码？

这些就是本课要回答的问题。

## 一、先建立 Dawn 的 SEO 架构

我们重点研究以下源码：

| 源码 | 作用 |
|---|---|
| [layout/theme.liquid](https://github.com/Shopify/dawn/blob/main/layout/theme.liquid) | 全站 SEO 元数据入口 |
| [snippets/meta-tags.liquid](https://github.com/Shopify/dawn/blob/main/snippets/meta-tags.liquid) | Open Graph 和 Twitter 分享元数据 |
| [sections/main-product.liquid](https://github.com/Shopify/dawn/blob/main/sections/main-product.liquid) | 商品结构化数据 |
| [sections/main-article.liquid](https://github.com/Shopify/dawn/blob/main/sections/main-article.liquid) | 文章结构化数据 |
| [sections/header.liquid](https://github.com/Shopify/dawn/blob/main/sections/header.liquid) | Organization 和 WebSite 结构化数据 |

<box border radius="lg" padding={3} gap={2}>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **Shopify 平台**
    <text color="secondary" size="xs">商品 SEO 字段、URL、canonical、Markets、结构化数据过滤器</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box border radius="md" padding={3} align="center">
    **Dawn Liquid**
    <text color="secondary" size="xs">theme.liquid / meta-tags.liquid / structured_data</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **浏览器最终 HTML**
    <text color="secondary" size="xs">title、description、canonical、hreflang、JSON-LD</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box border radius="md" padding={3} align="center">
    **搜索引擎**
    <text color="secondary" size="xs">抓取、解析、索引，并判断是否展示富媒体搜索结果</text>
  </box>
</box>

这里有一个基本原则：

**Dawn 负责输出符合规范的页面信息，但不负责保证搜索引擎一定收录或者获得排名。**

---

## 二、theme.liquid：所有 SEO 信息的入口

打开 `layout/theme.liquid`。

当前 Dawn 的 `<head>` 开头是：

```liquid
<!doctype html>
<html class="js" lang="{{ request.locale.iso_code }}">
  <head>
    <meta charset="utf-8">

    <meta
      name="viewport"
      content="width=device-width,initial-scale=1"
    >

    <link
      rel="canonical"
      href="{{ canonical_url }}"
    >

    <title>
      {{ page_title }}
      {%- if current_tags %}
        &ndash; tagged "{{ current_tags | join: ', ' }}"
      {% endif -%}
      {%- if current_page != 1 %}
        &ndash; Page {{ current_page }}
      {% endif -%}
      {%- unless page_title contains shop.name %}
        &ndash; {{ shop.name }}
      {% endunless -%}
    </title>

    {% if page_description %}
      <meta
        name="description"
        content="{{ page_description | escape }}"
      >
    {% endif %}

    {% render 'meta-tags' %}

    ...
    {{ content_for_header }}
  </head>
```

这是本课最核心的一段代码。

我们分开研究。

### 1. page_title 从哪里来？

```liquid
{{ page_title }}
```

它是 Shopify 提供的全局 Liquid 对象。

例如商品：

```text
Classic Running Shoes
```

商家可以在商品后台的搜索引擎列表预览中设置 SEO 标题。

Dawn 使用：

```liquid
{{ page_title }}
```

读取 Shopify 提供的当前页面标题。

然后：

```liquid
{% unless page_title contains shop.name %}
  &ndash; {{ shop.name }}
{% endunless %}
```

判断是否需要追加店铺名称。

假设：

```text
page_title = Classic Running Shoes
shop.name = MyStore
```

最终：

```html
<title>
  Classic Running Shoes – MyStore
</title>
```

这样 Dawn 不需要为 Product、Collection、Page、Article 分别手写四套标题生成逻辑。

它们都可以使用全局的 `page_title`。

### 2. 为什么还要处理 current_page？

源码：

```liquid
{% if current_page != 1 %}
  &ndash; Page {{ current_page }}
{% endif %}
```

假设集合页有分页：

```text
/collections/shoes?page=2
```

Dawn 会给标题增加页码信息。

例如：

```text
Shoes – Page 2 – MyStore
```

需要注意，这个标题变化不等于分页 canonical 一定指向第一页。

**Title 和 Canonical 是两种不同的 SEO 信号，不能混为一谈。**

### 3. page_description 从哪里来？

```liquid
{% if page_description %}
  <meta
    name="description"
    content="{{ page_description | escape }}"
  >
{% endif %}
```

`page_description` 同样是 Shopify 提供的全局对象，通常使用对应资源的 SEO 描述或回退内容。

为什么要加：

```liquid
| escape
```

因为这个内容最终会进入 HTML 属性。

如果描述中包含双引号或特殊字符，必须正确转义，避免破坏 HTML 结构。

官方 SEO 文档也推荐使用 `page_title`、`page_description` 和 `canonical_url` 来输出基础 SEO 元数据。

---

## 三、重点一：canonical_url 究竟在哪里配置？

这是你之前专门问过的问题，现在结合源码彻底讲清楚。

### 1. canonical_url 不是 Dawn 自己定义的变量

Dawn 中：

```liquid
<link rel="canonical" href="{{ canonical_url }}">
```

这里的：

```liquid
canonical_url
```

不是 Section Schema 中的设置，也不是 `settings_data.json` 里的字段。

**它是 Shopify 平台提供的全局 Liquid 对象。**

官方文档：[canonical_url](https://shopify.dev/docs/api/liquid/objects/canonical_url)。

它代表当前页面的规范 URL。

### 2. Canonical 是用来做什么的？

假设同一个商品存在多个访问地址：

```text
A: /products/running-shoes

B: /products/running-shoes?variant=123456

C: /products/running-shoes?utm_source=facebook
```

页面 B 是选择了一个 Variant。

页面 C 带有营销追踪参数。

但它们通常属于同一个商品页面。

这时 Shopify 可能输出：

```html
<link
  rel="canonical"
  href="https://example.com/products/running-shoes"
>
```

它的含义是：

> 这些访问形式中的规范页面，优先考虑这个商品主 URL。

注意，Canonical 是给搜索引擎的规范化提示，不是浏览器重定向。

假设用户访问：

```text
/products/running-shoes?variant=123456
```

Canonical 指向：

```text
/products/running-shoes
```

但浏览器不会因此自动跳转到没有 Variant 参数的 URL。

用户仍然可以直接访问对应 Variant。

### 3. 这里有一个重要的 SEO 细节

假设：

```text
/products/running-shoes?variant=123456
```

正好对应 Black / M。

Dawn 在前台能够根据这个 URL 选择对应 Variant。

但搜索引擎的 Canonical 策略未必需要把每个 Variant 当作完全独立的网页。

例如，单页面承载所有 Variant 的商品详情页，通常使用产品主 URL 作为规范地址，同时可以通过结构化数据描述 Variant。

Google 的商品变体结构化数据文档也特别讨论了单页面 Variant 与多页面 Variant 的 Canonical 策略。

### 4. 那我能不能自定义 canonical_url？

你不能像下面这样在 Shopify 后台创建一个普通 Metafield，就让全局 `canonical_url` 自动变成它：

```liquid
product.metafields.custom.canonical_url
```

因为 Shopify 的全局 `canonical_url` 是由平台计算的。

如果业务确实需要覆盖输出，可以在 Theme 中决定最终使用哪个 URL：

```liquid
{% liquid
  assign seo_canonical = canonical_url

  if request.page_type == 'product'
    and product.metafields.custom.canonical_override != blank
    assign seo_canonical =
      product.metafields.custom.canonical_override.value
  endif
%}

<link
  rel="canonical"
  href="{{ seo_canonical | escape }}"
>
```

这是自定义方案，不是 Dawn 默认实现。

但这里必须提醒你：

**不应该因为想让每个 Variant 都被收录，就盲目改写所有商品的 Canonical。**

如果不同 URL 实际上展示相同内容，错误地设置多个 Canonical 反而可能制造重复内容问题。

另外，如果你在 Theme 中增加 Canonical 输出，必须检查页面是否已经存在其他 Canonical，避免重复或冲突。

---

## 四、重点二：content_for_header 究竟是什么？

这是本课第二个重点。

常见问题：

```liquid
{{ content_for_header }}
```

到底是什么？

现在直接看当前 Dawn：

`layout/theme.liquid` 中：

```liquid
{{ content_for_header }}
```

它位于：

```html
<head>
  ...
</head>
```

内部。

### 1. 它不是一份固定的 JSON

`content_for_header` 是 Shopify 平台动态生成的一段内容。

它用于向页面注入 Shopify 运行所需的脚本等内容。

当前官方文档明确说明：

- 它是 Shopify 动态返回的。
- 必须包含在 `theme.liquid` 的 `<head>` 中。
- 不应该修改或解析其内容，因为输出可能变化。

这意味着你不能把它理解为：

```js
const contentForHeader = {
  shop: {},
  routes: {},
  markets: {}
};
```

也不能假设每一家 Shopify 商店都会输出完全相同的脚本标签。

### 2. 为什么 Shopify 要通过它注入内容？

因为 Shopify Theme 不只是一个完全独立的静态网站。

它还需要与 Shopify 的平台功能协作。

例如：

- Shopify 的前台运行环境。
- 平台管理的脚本和相关功能。
- Markets 自动生成的 `hreflang` 信息。
- Shopify 及受支持应用所需的集成内容。

这里的具体输出取决于平台及店铺环境。

**最重要的不是记住它目前包含哪些脚本，而是认识到它属于 Shopify 管理的动态输出边界。**

### 3. 为什么不要通过字符串替换修改它？

例如，有人为了优化性能，可能写出这种代码：

```liquid
{% assign header_content = content_for_header %}

{% assign header_content =
  header_content | remove: '某个脚本片段'
%}

{{ header_content }}
```

这是一种非常不可靠的方式。

原因包括：

1. Shopify 可能更改生成内容的格式。
2. 相关脚本之间可能存在依赖。
3. 删除部分内容可能破坏 Shopify 功能。
4. 不同市场、设备或商店的输出可能不同。

如果是自己开发的第三方脚本，应该从脚本的加载源头、App 配置或 Theme 代码进行管理，而不是靠解析 `content_for_header` 来删除。

### 4. content_for_header 与 SEO 有什么关系？

最值得注意的是多市场 SEO。

Shopify 官方文档明确指出：当店铺使用 Markets 时，Shopify 可以通过 `content_for_header` 自动输出 `hreflang` 标签。

例如：

```html
<link
  rel="alternate"
  hreflang="en-US"
  href="https://example.com/products/shoes"
>

<link
  rel="alternate"
  hreflang="fr-FR"
  href="https://example.com/fr-fr/products/shoes"
>
```

这些 URL 是示意，实际由市场与语言配置决定。

因此，如果你在 `theme.liquid` 中找不到自己想象中的 `hreflang` 循环，不代表 Shopify 没有为网站输出 `hreflang`。

你需要查看浏览器最终返回的 HTML。

这一点十分重要：

**阅读 Liquid 源码与检查最终 HTML，是两个不同层面的调试方法。**

---

## 五、meta-tags.liquid：Dawn 如何实现社交分享 SEO？

接下来打开：

[snippets/meta-tags.liquid](https://github.com/Shopify/dawn/blob/main/snippets/meta-tags.liquid)

这里有一个需要区分的概念：

**SEO Meta Tags 与 Social Sharing Meta Tags 不完全相同。**

例如：

```html
<title>Running Shoes – MyStore</title>
```

主要是页面标题。

而：

```html
<meta property="og:title" content="Running Shoes">
```

主要用于社交平台识别页面信息，生成分享预览。

### 1. Dawn 如何计算 Open Graph 数据？

当前源码：

```liquid
{% liquid
  assign og_title = page_title | default: shop.name

  assign og_url = canonical_url | default: request.origin

  assign og_type = 'website'

  assign og_description =
    page_description
    | default: shop.description
    | default: shop.name

  if request.page_type == 'product'
    assign og_type = 'product'
  elsif request.page_type == 'article'
    assign og_type = 'article'
  elsif request.page_type == 'password'
    assign og_url = request.origin
  endif
%}
```

首先看：

```liquid
request.page_type
```

它表示当前页面类型。

因此 Dawn 可以根据页面类型，动态调整 Open Graph 的 `type`。

| 页面类型 | Open Graph 类型 |
|---|---|
| Product | `product` |
| Article | `article` |
| Collection、普通 Page 等 | `website` |

接下来输出：

```liquid
<meta property="og:site_name" content="{{ shop.name }}">
<meta property="og:url" content="{{ og_url }}">
<meta property="og:title" content="{{ og_title | escape }}">
<meta property="og:type" content="{{ og_type }}">
<meta property="og:description" content="{{ og_description | escape }}">
```

这里又一次复用了：

```liquid
page_title
page_description
canonical_url
```

所以 Dawn 不需要重新维护一套独立的社交分享标题和描述生成逻辑。

### 2. 分享图片来自哪里？

看：

```liquid
{% if page_image %}
  <meta
    property="og:image:secure_url"
    content="https:{{ page_image | image_url }}"
  >

  <meta
    property="og:image:width"
    content="{{ page_image.width }}"
  >

  <meta
    property="og:image:height"
    content="{{ page_image.height }}"
  >
{% endif %}
```

这里使用：

```liquid
page_image
```

它是 Shopify 提供的页面级图片对象。

例如商品详情页，通常会使用与当前页面关联的商品图片。

但请注意：

Open Graph 图片、商品页面当前 Variant 的媒体以及 JSON-LD 的商品图片，并不一定需要在所有情况下完全相同。

它们服务于不同用途。

### 3. 为什么商品页面还有 og:price？

源码：

```liquid
{% if request.page_type == 'product' %}
  <meta
    property="og:price:amount"
    content="{{ product.price | money_without_currency | strip_html }}"
  >

  <meta
    property="og:price:currency"
    content="{{ cart.currency.iso_code }}"
  >
{% endif %}
```

这里的：

```liquid
product.price
```

来自当前市场上下文中的商品价格。

```liquid
cart.currency.iso_code
```

提供当前购物车货币代码。

这也将上一课的 Markets 和本课的分享数据联系起来。

需要注意：**Open Graph 价格元数据不是购物车成交价格的权威来源**，并且这些标签不保证社交平台一定展示价格。

### 4. Twitter Card

Dawn 最后还输出：

```liquid
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ og_title | escape }}">
<meta name="twitter:description" content="{{ og_description | escape }}">
```

这些信息会供支持 Twitter Card 的平台识别。

你可以发现，Dawn 的 `meta-tags.liquid` 很短，因为它主要负责元数据输出，而不是实现复杂的 SEO 算法。

---

## 六、重点三：商品 JSON-LD 结构化数据怎么实现？

这一部分是今天最重要的源码之一。

先理解一个问题：

**搜索引擎怎样知道某个页面展示的是商品，而不是普通文章？**

浏览器用户能根据商品标题、图片、价格和按钮判断。

但搜索引擎更希望得到结构化信息，例如：

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Running Shoes",
  "offers": {
    "@type": "Offer",
    "price": "99.00",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
```

这是一个简化示例。

这种数据格式叫做 **JSON-LD**。

### 1. Dawn 商品页的真实实现

打开：

[sections/main-product.liquid](https://github.com/Shopify/dawn/blob/main/sections/main-product.liquid)

搜索：

```liquid
<script type="application/ld+json">
  {{ product | structured_data }}
</script>
```

你可能会惊讶：

商品结构化数据就这么两行？

是的。

因为 Shopify 已经提供了：

```liquid
structured_data
```

这个 Liquid 过滤器。

它可以根据 Product 对象自动生成符合 Schema.org 结构的数据。

官方文档还说明，当前 `structured_data` 支持 Product 和 Article；商品带有 Variant 时可以输出 `ProductGroup`，以描述商品与变体关系。

### 2. product | json 与 product | structured_data 有什么不同？

这是一个特别值得记住的区别。

```liquid
{{ product | json }}
```

会把 Shopify Product 转换成 JSON 表示。

主要用途是让前端 JavaScript 读取商品数据。

而：

```liquid
{{ product | structured_data }}
```

会转换为 Schema.org 结构化数据。

主要用途是让搜索引擎理解商品实体。

| 对比 | `json` | `structured_data` |
|---|---|---|
| 输出格式 | JSON | JSON-LD 结构数据 |
| 主要用途 | 前端程序读取 | SEO 语义标注 |
| 字段定义 | Shopify Product 数据结构 | Schema.org |
| 是否可以直接代替另一种 | 否 | 否 |

例如：

```liquid
{{ product | json }}
```

可能返回：

```json
{
  "id": 12345,
  "title": "Running Shoes",
  "variants": []
}
```

但这并不是有效的 Product 富媒体搜索结构化数据。

因为搜索引擎需要的是 Schema.org 定义的实体和属性关系。

### 3. Product 与 ProductGroup

假设商品有多个 Variant：

```text
Product: Running Shoes

Variants:
  Black / 40
  Black / 41
  White / 40
  White / 41
```

可以用：

```text
ProductGroup
├── Product: Black / 40
├── Product: Black / 41
├── Product: White / 40
└── Product: White / 41
```

表达它们的关系。

这与我们之前学习的 Shopify 数据模型很相似：

```text
Product
    ↓
Variants
```

但注意，Schema.org 中的 ProductGroup、Product 和 Offer 是搜索引擎使用的语义实体，不等同于 Shopify 内部 Product、Variant 数据库对象的一一映射。

### 4. 为什么结构化数据最好由服务器输出？

假设你自己写：

```js
fetch('/products/shoes.js')
  .then(response => response.json())
  .then(product => {
    // 动态生成 JSON-LD
  });
```

理论上可以动态插入结构化数据。

但是对于商品价格、库存等频繁变化的数据，Google 更推荐直接在初始 HTML 中输出商品结构化数据。

Dawn 的：

```liquid
{{ product | structured_data }}
```

正好符合服务端输出的思路。

这也体现了 Shopify Theme 的一个优势：

**Liquid 不只是用于生成可视化 HTML，还可以直接生成搜索引擎需要的结构化数据。**

### 5. Variant 切换后需要手动更新 JSON-LD 吗？

我们要区分两种情况。

**情况 A：用户首次访问页面**

```text
/products/shoes?variant=123
```

Shopify 会根据访问上下文渲染商品页面与其结构化数据。

**情况 B：用户在页面中切换 Variant**

Dawn 通过 Section Rendering 获取新 HTML，再局部更新商品图片、价格、库存等区域。

但这不意味着浏览器中已有的所有 SEO 元数据都会由 ProductInfo 自动同步。

例如：

```html
<link rel="canonical">
<meta property="og:title">
```

这些位于 `<head>` 中的元素不会因为 `product-info.js` 更新页面价格，就自动随之更新。

对于搜索引擎来说，更重要的是访问对应 URL 时，服务器返回的初始 HTML 是否正确。

因此，在处理 Variant SEO 时，应该优先验证直接访问 Variant URL 的服务端结果，而不是只验证页面切换后 JavaScript 的 DOM 状态。

---

## 七、Dawn 还实现了哪些 JSON-LD？

商品并不是 Dawn 唯一包含结构化数据的地方。

我核对了当前源码，主要还有以下几个位置。

| 源码 | 结构化数据类型 |
|---|---|
| `main-product.liquid` | Product / ProductGroup |
| `main-article.liquid` | Article |
| `header.liquid` | Organization |
| `header.liquid` 首页条件分支 | WebSite + SearchAction |

### 1. Article 结构化数据

打开 `sections/main-article.liquid`：

```liquid
<script type="application/ld+json">
  {{ article | structured_data }}
</script>
```

它和 Product 的实现非常相似。

Shopify 的 `structured_data` 过滤器会根据 Article 生成对应的 Schema.org 数据。

### 2. Organization 结构化数据

打开：

`sections/header.liquid`

其中有：

```liquid
<script type="application/ld+json">
{
  "@context": "http://schema.org",
  "@type": "Organization",
  "name": {{ shop.name | json }},
  "logo": {{ settings.logo | image_url: width: 500 | prepend: "https:" | json }},
  "sameAs": [
    {{ settings.social_facebook_link | json }},
    {{ settings.social_instagram_link | json }}
  ],
  "url": {{ request.origin | append: page.url | json }}
}
</script>
```

这里是简化示意，真实代码还处理没有 Logo 的情况，并包含更多社交链接。

注意几个属性：

- `name`：组织名称。
- `logo`：组织 Logo。
- `sameAs`：相关官方社交资料。
- `url`：组织网站 URL。

### 3. 为什么这里使用 | json，而不是 | escape？

例如：

```liquid
"name": {{ shop.name | json }}
```

而不是：

```liquid
"name": "{{ shop.name | escape }}"
```

因为 JSON 和 HTML 的转义规则不同。

假设商店名称是：

```text
Tom's "Outdoor" Store
```

直接拼接 JSON 字符串可能造成语法错误。

`| json` 会生成合法的 JSON 字符串表示。

因此，当你自己生成 JSON-LD 时，应该使用正确的 JSON 序列化方式。

这是一个很常见但非常重要的安全与正确性细节。

### 4. 首页 WebSite + SearchAction

Dawn 在 `header.liquid` 中还包含：

```liquid
{% if request.page_type == 'index' %}
  {% assign potential_action_target =
    request.origin
    | append: routes.search_url
    | append: '?q={search_term_string}'
  %}

  <script type="application/ld+json">
  {
    "@context": "http://schema.org",
    "@type": "WebSite",
    "name": {{ shop.name | json }},
    "potentialAction": {
      "@type": "SearchAction",
      "target": {{ potential_action_target | json }},
      "query-input": "required name=search_term_string"
    }
  }
  </script>
{% endif %}
```

这段代码与我们第 11 课研究的搜索系统直接相关。

它告诉搜索引擎：

当前网站提供搜索功能，其搜索 URL 可以接受 `q` 参数。

但要注意，Google 是否使用这项结构化数据展示特殊搜索功能，是搜索引擎自己的决定，并不是加入 SearchAction 后就必然出现。

---

## 八、Shopify Markets：canonical 与 hreflang 应该如何协作？

这是上一课国际化知识的延续。

假设同一个商品有三个版本：

```text
美国：
https://example.com/products/shoes

法国：
https://example.com/fr-fr/products/shoes

德国：
https://example.com/de-de/products/shoes
```

理想情况下，每个市场页面都有适合自身的规范 URL。

例如法国页面：

```html
<link
  rel="canonical"
  href="https://example.com/fr-fr/products/shoes"
>
```

同时 Shopify 可以生成：

```html
<link
  rel="alternate"
  hreflang="en-US"
  href="https://example.com/products/shoes"
>

<link
  rel="alternate"
  hreflang="fr-FR"
  href="https://example.com/fr-fr/products/shoes"
>

<link
  rel="alternate"
  hreflang="de-DE"
  href="https://example.com/de-de/products/shoes"
>
```

这两个机制解决的是不同问题：

| 标签 | 解决的问题 |
|---|---|
| Canonical | 当前内容的规范 URL 是哪个？ |
| hreflang | 当前页面有哪些语言或地区版本？ |

Shopify 官方文档明确说明，Markets 的自动 hreflang 通过 `content_for_header` 输出，并根据市场域名和语言设置同步更新。

### 一个很容易犯的错误

假设法国页面：

```text
/fr-fr/products/shoes
```

却把 Canonical 强行指向：

```text
/products/shoes
```

同时又通过 hreflang 声明法国页面是独立的地区版本。

这可能导致 SEO 信号相互冲突。

因此，多市场站点一般应让各个有效的本地化页面使用与自身一致的规范 URL，而不是不分情况地把所有国家页面集中到默认市场。

另外，Google 把 Canonical 视为规范化信号，而不是绝对命令；即使页面声明了 Canonical，Google 仍可能根据其他信号选择不同的规范 URL。

---

## 九、robots.txt 与 Sitemap：为什么 Dawn 源码里没有 robots.txt.liquid？

你可能会发现，当前官方 Dawn 仓库没有：

```text
templates/robots.txt.liquid
```

这不是遗漏。

Shopify 默认会生成：

```text
https://example.com/robots.txt
```

因此正常情况下，Theme 不需要自己维护这个模板。

只有当你确实需要调整抓取规则时，才考虑添加：

```text
templates/robots.txt.liquid
```

官方也提醒，自定义模板可能覆盖 Shopify 默认生成的规则，应在修改前比较原始 robots.txt 与最终输出。

这里还有一个很重要的区别：

- `robots.txt` 主要用于控制爬虫访问。
- `noindex` 用于向支持该指令的搜索引擎表达不要索引页面。
- `canonical` 用于表达规范页面的偏好。

**robots.txt 的 Disallow 并不等于页面一定不会被搜索引擎索引。**

而且，如果禁止抓取某个页面，爬虫可能无法读取页面内的 `noindex` 或 canonical。

所以，不要为了处理 Collection 筛选 URL 的重复问题，就盲目屏蔽所有带查询参数的页面。

另外，Shopify 默认提供 Sitemap，通常可以通过：

```text
https://example.com/sitemap.xml
```

访问。

对于普通 Shopify 商城，优先检查 Shopify 自动生成的 SEO 能力，通常比从零构建自己的 Sitemap 和 robots.txt 更合理。

---

## 十、实际调试：如何验证 Dawn 的 SEO 输出？

这一部分建议你自己在 Dawn 商店中操作。

### 实验 1：查看最终 Head

打开商品详情页，进入 DevTools Console：

```js
console.table({
  title: document.title,
  description: document.querySelector(
    'meta[name="description"]'
  )?.content,
  canonical: document.querySelector(
    'link[rel="canonical"]'
  )?.href,
  ogTitle: document.querySelector(
    'meta[property="og:title"]'
  )?.content,
  ogImage: document.querySelector(
    'meta[property="og:image:secure_url"]'
  )?.content
});
```

这样可以快速检查主要 SEO 元数据。

### 实验 2：检查 hreflang

```js
const hreflangLinks = Array.from(
  document.querySelectorAll(
    'link[rel="alternate"][hreflang]'
  )
);

console.table(
  hreflangLinks.map(link => ({
    language: link.hreflang,
    url: link.href
  }))
);
```

切换不同 Markets，观察结果是否变化。

还要特别注意：

DevTools Elements 展示的是当前 DOM。

如果你需要验证搜索引擎初次收到的 HTML，更应该使用：

```text
View Page Source
```

或者 Network → Document → Response。

### 实验 3：检查 JSON-LD

```js
const scripts = Array.from(
  document.querySelectorAll(
    'script[type="application/ld+json"]'
  )
);

const schemas = scripts.flatMap(script => {
  try {
    return [JSON.parse(script.textContent)];
  } catch (error) {
    console.warn('Invalid JSON-LD:', error);
    return [];
  }
});

console.log(schemas);
```

你可以观察是否包含：

```text
Organization
WebSite
Product
ProductGroup
Article
```

具体出现哪几种取决于当前页面。

注意：JSON 语法合法，不代表一定满足 Google 的所有富媒体结果要求。

### 实验 4：使用 Google Rich Results Test

<Link url="https://search.google.com/test/rich-results" title="打开 Google Rich Results Test"/>

在其中输入公开可访问的商品 URL。

检查：

- 商品实体是否被识别。
- 是否存在缺失的必需字段。
- Offer 的价格与货币是否正确。
- 商品是否存在有效的库存状态。
- Variant 结构是否能够被识别。
- 有没有重复或冲突的商品数据。

Google 也提供了专门的 Product Variant 结构化数据说明，适合结合你之前学过的 Shopify Variant 数据模型阅读。

---

## 十一、从源码工程化角度看，还有哪些值得注意的地方？

我们把自己开发 Theme 时需要考虑的 SEO 风险整理一下。

| 问题 | 为什么重要 | 推荐做法 |
|---|---|---|
| 重复 Canonical | 可能产生冲突信号 | 保留一个明确的规范 URL |
| 重复 JSON-LD | App 和 Theme 可能同时输出商品 Schema | 检查所有输出源及其实体关系 |
| 错误价格货币 | 可能与 Markets、Checkout 数据不一致 | 使用 Shopify 当前上下文的价格 |
| 手写 hreflang | 容易与 Shopify 自动生成的内容冲突 | 优先使用 Shopify Markets 自动机制 |
| 硬编码 URL | 多语言页面可能生成错误链接 | 使用 `routes`、`canonical_url` 等对象 |
| JS 动态生成核心 SEO 数据 | 初始 HTML 可能缺少重要信息 | 尽量通过 Liquid 在服务端输出 |
| 修改 content_for_header | 可能破坏平台功能 | 不解析、不修改 Shopify 注入内容 |

有一个我尤其想强调的点：

**SEO 是最终 HTML 的问题，不只是 Liquid 源码有没有写某段标签的问题。**

Shopify Theme、第三方 App、Markets、Liquid 和浏览器 JavaScript 都可能影响最终页面。

所以分析 SEO Bug 时，不能只看 Dawn 的一个文件。

应该从：

```text
Shopify 后台 SEO 配置
        ↓
Liquid 输出
        ↓
content_for_header
        ↓
App 注入
        ↓
最终 HTML
        ↓
Google 抓取结果
```

逐层排查。

---

## 十二、本课知识检查

{@body const questions=[{q:"Dawn 中的 canonical_url 是从哪里来的？",opts:["Theme Editor 的一个 Schema 设置","Shopify 提供的全局 Liquid 对象","JavaScript 根据 window.location 自动生成"],a:1,why:"canonical_url 由 Shopify 平台提供，Dawn 负责将其输出为 rel=canonical 标签。"},{"q":"为什么不应该通过字符串替换修改 content_for_header？",opts:["因为它是一个只读的商品 JSON","因为它由 Shopify 动态生成，内容可能变化且包含平台依赖","因为它只有在商品页面才存在"],a:1,why:"Shopify 官方明确要求保留 content_for_header，且不建议修改或解析其输出。"},{"q":"product | json 和 product | structured_data 的主要区别是什么？",opts:["两者完全相同","structured_data 输出 Schema.org 语义数据，而 json 输出普通商品 JSON","structured_data 只用于前端加购"],a:1,why:"结构化数据用于搜索引擎理解实体，商品 JSON 则主要供程序读取。"},{"q":"一个有多个语言市场的店铺，应该如何处理 hreflang？",opts:["全部手写固定链接","优先使用 Shopify Markets 自动生成的 hreflang，并验证最终 HTML","所有地区页面都只使用默认国家 URL"],a:1,why:"Shopify 会通过 content_for_header 根据 Markets 配置生成对应 hreflang，手写重复标签可能冲突。"}]}
{@body const [answers,setAnswers]=DIL.useState({})}
{@body const [submitted,setSubmitted]=DIL.useState(false)}
<box border radius="lg" padding={3} gap={3}>
  <row justify="between" align="center">
    **第 17 课自测**
    <text size="xs" color="secondary">{Object.keys(answers).length}/4 已作答</text>
  </row>
  {#each questions as q,i}
    <box gap={2}>
      **{i+1}. {q.q}**
      <radio-group direction="col" value={answers[i]===undefined?"":String(answers[i])} disabled={submitted} onChange={v=>setAnswers(p=>({...p,[i]:Number(v)}))}>
        {#each q.opts as opt,j}
          <radio value={String(j)}>{opt}</radio>
        {/each}
      </radio-group>
      {#if submitted}
        <row align="start" gap={2}>
          <icon name={answers[i]===q.a?"check-circle":"x-circle"} color={answers[i]===q.a?"success":"danger"}/>
          <box flex="1" gap={1}>
            **{answers[i]===q.a?"正确":`正确答案：${q.opts[q.a]}`}**
            <text size="sm" color="secondary">{q.why}</text>
          </box>
        </row>
      {/if}
    </box>
    {#if i!==3}
      <divider color="subtle"/>
    {/if}
  {/each}
  {#if submitted}
    **得分：{questions.filter((q,i)=>answers[i]===q.a).length}/4**
    <button block variant="outline" color="secondary" onClick={()=>{setAnswers({});setSubmitted(false)}}>重新作答</button>
  {:else}
    <button block disabled={Object.keys(answers).length!==4} onClick={()=>setSubmitted(true)}>提交答案</button>
  {/if}
</box>

---

## 第 17 课总结

今天我们建立了 Dawn SEO 的完整知识体系：

- **Shopify 全局对象**：`page_title`、`page_description`、`canonical_url`、`content_for_header`。
- **社交分享数据**：Open Graph、Twitter Card。
- **结构化数据**：`structured_data`、ProductGroup、Article、Organization、WebSite。
- **国际化 SEO**：Markets、Canonical、hreflang。
- **抓取控制**：robots.txt、Sitemap。
- **调试验证**：浏览器最终 HTML、Google Rich Results Test。

最重要的是，理解了 **Shopify 负责提供和计算平台数据，Dawn 负责正确输出，搜索引擎负责最终解释与使用**。

## 参考资料

- [Use hreflang tags in your theme](https://shopify.dev/docs/storefronts/themes/seo/hreflang)
- [Liquid objects: content_for_header](https://shopify.dev/docs/api/liquid/objects/content_for_header)
- [SEO](https://shopify.dev/docs/storefronts/themes/seo)
- [Liquid filters: structured_data](https://shopify.dev/docs/api/liquid/filters/structured_data)
- [Liquid objects: canonical_url](https://shopify.dev/docs/api/liquid/objects/canonical_url)
- [Add SEO metadata to your theme](https://shopify.dev/docs/storefronts/themes/seo/metadata)
- [Customize robots.txt](https://shopify.dev/docs/storefronts/themes/seo/robots-txt)
- [robots.txt.liquid](https://shopify.dev/docs/storefronts/themes/architecture/templates/robots-txt-liquid)
- [Theme store requirements](https://shopify.dev/docs/storefronts/themes/store/requirements)
- [How To Add Merchant Listing Structured Data | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [Intro to Product Structured Data on Google | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Product Variant Structured Data (ProductGroup, Product) | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/appearance/structured-data/product-variants/)
- [Product Variant Structured Data (ProductGroup, Product) | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/appearance/structured-data/product-variants)
- [How To Add Merchant Listing Structured Data | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing?hl=en)
- [How To Add Merchant Listing Structured Data | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing?hl=en&trk=article-ssr-frontend-pulse_little-text-block)
- [Fix Canonicalization Issues | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting?hl=en)
- [What is URL Canonicalization | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/crawling-indexing/canonicalization?COS_TEMPLATE_INTENT=NEWSLETTER)
- [How to Specify a Canonical with rel="canonical" and Other Methods | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=en&rd=1&visit_id=637793253054856063-3621946896)
- [How to Specify a Canonical with rel="canonical" and Other Methods | Google Search Central | Documentation | Google for Developers](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=en&rd=1&visit_id=639246510388780706-4193785449)
- [Rich Results Test - Google Search Console](https://search.google.com/test/rich-results?tp=1)
- [Rich Results Test - Google Search Console](https://search.google.com/test/rich-results?preview=true)
- [Rich Results Test - Google Search Console](https://search.google.com/test/rich-results?mainArticle=true)
- [Rich Results Test - Google Search Console](https://search.google.com/test/rich-results?rel=canonical)
- [Rich Results Test - Google Search Console](https://search.google.com/test/rich-results?region=united-states)
