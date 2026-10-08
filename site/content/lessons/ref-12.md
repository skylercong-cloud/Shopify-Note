# 参考 12 SEO 排查与标签参考

> **本课目标：** 按需查询属性、接口和原始案例。

![Canonical URL 解释图](content/assets/09-seo-canonical.png)

SEO 这一章不要只理解成 `<meta>` 标签大全。对电商 Theme 更关键的是：**页面语义、URL 规范化、可抓取的服务端 HTML、结构化商品数据、性能**一起工作。


## SEO 三件套

### 三者分别回答什么？

| 元信息 | 回答的问题 | 常见 Liquid |
|---|---|---|
| `<title>` | “这个文档叫什么？” | `page_title` |
| meta description | “页面主要讲什么？” | `page_description` |
| canonical | “多个 URL 版本里哪个是规范版本？” | `canonical_url` |

典型：

```liquid
<title>
  {{ page_title }}
  {% unless page_title contains shop.name %} – {{ shop.name }}{% endunless %}
</title>

{% if page_description %}
  <meta name="description" content="{{ page_description | escape }}">
{% endif %}

<link rel="canonical" href="{{ canonical_url }}">
```


Shopify 官方 Theme SEO Metadata 重点：

```text
Title
Meta Description
Canonical URL
```

官方： [Add SEO metadata to your theme](https://shopify.dev/docs/storefronts/themes/seo/metadata)

典型代码：

```liquid
<title>
  {{ page_title }}

  {% if current_page != 1 %}
    – Page {{ current_page }}
  {% endif %}

  {% unless page_title contains shop.name %}
    – {{ shop.name }}
  {% endunless %}
</title>

{% if page_description %}
  <meta
    name="description"
    content="{{ page_description | escape }}"
  >
{% endif %}

<link
  rel="canonical"
  href="{{ canonical_url }}"
>
```

---

## `{{ canonical_url }}` 在哪里配置？

`canonical_url` 不是 Admin 里一个“Canonical 输入框”，而是 Shopify 根据当前页面上下文提供的 Liquid 全局对象。

完整定义：[Liquid `canonical_url`](https://shopify.dev/docs/api/liquid/objects/canonical_url)

如果你需要编辑 Product 自己的搜索结果标题、描述和 handle，Admin 中可以进入 Product 的 **Search engine listing** 区域；这和 `canonical_url` 的平台计算不是一回事。

官方 Product SEO 编辑步骤：[Adding and updating products](https://help.shopify.com/en/manual/products/add-update-products)


答案：**不需要你在后台单独配置这个变量。**

它是 Shopify 的全局 Liquid 对象：

```liquid
{{ canonical_url }}
```

Shopify 根据当前页面计算 canonical URL。

你需要做的是在 `theme.liquid` 的 `<head>` 输出：

```liquid
<link rel="canonical" href="{{ canonical_url }}">
```

官方： [canonical_url](https://shopify.dev/docs/api/liquid/objects/canonical_url)

先检查现有 Theme 是否已经输出，避免重复 canonical。

---

## Filter / Sort / Pagination 为什么和 SEO 有关？

### Canonical ≠ robots ≠ noindex

这三个概念不要混：

| 机制 | 主要目的 |
|---|---|
| Canonical | 告诉搜索引擎内容的首选规范 URL |
| robots.txt | 给 crawler 抓取路径规则 |
| robots meta / noindex | 控制某页面是否应进入索引 |

因此 `canonical` 不是一个“禁止搜索引擎访问此 URL”的开关。


一个 Collection 可能出现：

```text
/collections/shoes
/collections/shoes?page=2
/collections/shoes?sort_by=price-ascending
/collections/shoes?filter.v.option.color=black
```

这会产生大量 URL 变体。

SEO 需要正确处理：

- Title
- Canonical
- Pagination 内容
- 页面主体语义
- 爬虫策略

不要把 SEO 理解成“只加 meta description”。

---

## H1 与 `<title>` 不是一回事

```html
<title>Nike Air Max Running Shoes | Store</title>
```

属于 Document Metadata。

```html
<h1>Nike Air Max</h1>
```

属于页面主体语义结构。

两者可以相关，但职责不同。

---

## JSON-LD Structured Data

### HTML 给人看，Structured Data 给机器理解

Product 页面视觉上写：

```html
<h1>Classic T-Shirt</h1>
<p>$29.00</p>
```

人能看懂，但搜索引擎还需要更明确的 Product / Offer 语义。JSON-LD 可以表达：

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Classic T-Shirt",
  "offers": {
    "@type": "Offer",
    "price": "29.00",
    "priceCurrency": "USD"
  }
}
```

真实生产环境还要正确处理 Variant、availability、image、brand 等，并避免 Theme 与 SEO App 重复输出冲突的 schema。不要复制一份静态 JSON-LD 就认为“SEO 做完了”。


Product 页面常见：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Nike Air Max"
}
</script>
```

它帮助机器理解：

- Product
- Offer
- Price
- Availability
- SKU
- Image

Liquid 可以服务端生成 JSON-LD。

---

## robots.txt 与 hreflang

Shopify 默认管理 robots.txt，可在特殊场景定制，但不要无目的修改爬虫规则。

SEO 官方入口： [Shopify Theme SEO](https://shopify.dev/docs/storefronts/themes/seo)

多市场 / 多语言还涉及 hreflang；Shopify Markets 和平台输出会参与其中，所以要避免重复生成冲突标签。

---

## SEO 排查 Checklist

遇到“为什么这个 Product SEO 不对”，建议按顺序检查：

1. HTML `<title>` 是否正确且页面间有区分；
2. meta description 是否存在且不是全站同一段；
3. canonical 是否只有一个、目标是否合理；
4. H1 / 页面主体是否真的由服务端 HTML 输出；
5. Product structured data 是否有效、是否被 App 重复输出；
6. 商品图片是否有有意义的 alt；
7. Filter / sort / pagination URL 是否产生大量无意义索引页；
8. robots / noindex 是否意外阻止关键页面；
9. Markets / hreflang 是否由 Shopify 正确输出且没有重复手写；
10. Core Web Vitals 是否严重影响用户体验。

---

---

## 使用提示

此页与主线对应课程存在概念交集；需要查具体接口时再使用，无需顺序重复阅读。

