# 深入 `sections/main-product.liquid`：商品详情页是如何组装出来的？




本课分析 `main-product.liquid` 如何组织商品详情页：

1. 商品详情页的入口在哪里？
2. `main-product.liquid` 如何组织整个商品页面？
3. 商品媒体、商品信息、价格、变体选择器、购买按钮之间是什么关系？
4. Dawn 为什么使用大量 `{% render %}`，而不是把所有 HTML 写在一个 Section 中？
5. Section 的 Block 是如何决定页面显示什么内容的？

**今天的核心目标：看完一个真实的商品详情页源码后，你能够自己画出它的组件调用关系，并理解每一层的职责。**

#### 一、先建立我们的阅读对象

我们以 Shopify 官方 Dawn 仓库为基准：

<Link url="https://github.com/Shopify/dawn" title="Shopify / Dawn 官方源码"/>

本课重点文件：

```text
sections/
  main-product.liquid

snippets/
  product-media-gallery.liquid
  product-variant-picker.liquid
  buy-buttons.liquid
  price.liquid
```

今天主要研究 `main-product.liquid`，其他文件先作为调用链上的节点，不急着展开。

## 二、第一步：先看 `product.json`，而不是直接看 Liquid

先打开 Dawn 的：

<Link url="https://github.com/Shopify/dawn/blob/main/templates/product.json" title="templates/product.json"/>

你会看到类似这样的结构（下面是源码中的核心配置，省略了部分设置）：

```json
{
  "sections": {
    "main": {
      "type": "main-product",
      "blocks": {
        "vendor": {
          "type": "text",
          "settings": {
            "text": "{{ product.vendor }}"
          }
        },
        "title": {
          "type": "title"
        },
        "price": {
          "type": "price"
        },
        "variant_picker": {
          "type": "variant_picker"
        },
        "quantity_selector": {
          "type": "quantity_selector"
        },
        "buy_buttons": {
          "type": "buy_buttons"
        },
        "description": {
          "type": "description"
        }
      },
      "block_order": [
        "vendor",
        "title",
        "price",
        "variant_picker",
        "quantity_selector",
        "buy_buttons",
        "description"
      ]
    },
    "related-products": {
      "type": "related-products"
    }
  },
  "order": [
    "main",
    "related-products"
  ]
}
```

这里有几个非常重要的细节。

#### 1. `type` 决定加载哪个 Section 文件

```json
"main": {
  "type": "main-product"
}
```

这里的 `main` 是当前 Section 实例的 ID。

而 `main-product` 才是 Section 类型，对应：

```text
sections/main-product.liquid
```

所以：

- `main`：这个 Section 实例的标识。
- `main-product`：实际执行的 Section 模板。
- `product.json`：声明这个页面如何使用 Section。

这三个概念不要混淆。

#### 2. `blocks` 是 Block 实例配置

例如：

```json
"title": {
  "type": "title"
}
```

这里：

- `title` 是 Block 实例 ID。
- `type: title` 是 Block 类型。
- `settings` 是该 Block 的配置。

再看一个有意思的例子：

```json
"vendor": {
  "type": "text",
  "settings": {
    "text": "{{ product.vendor }}",
    "text_style": "uppercase"
  }
}
```

注意：这里并没有专门创建一个 `vendor` 类型的 Block。

它实际上使用的是通用的 `text` Block，只是内容绑定到了 `product.vendor`。

这体现了 Dawn 的一个设计思路：

**尽量通过通用组件和可配置数据组合页面，而不是为每一种业务内容都创建一个专门的 Block 类型。**

#### 3. `block_order` 决定实际显示顺序

例如：

```json
"block_order": [
  "vendor",
  "title",
  "price",
  "variant_picker",
  "quantity_selector",
  "buy_buttons"
]
```

它决定了商品信息区域的排列顺序。

商家在 Theme Editor 中拖动 Block，实际上就是在修改这个配置。

#### 4. `order` 决定 Section 的排列顺序

例如：

```json
"order": [
  "main",
  "disclosures",
  "related-products"
]
```

这意味着整个商品页面可能是：

```text
商品详情主体
    ↓
商品信息补充区域
    ↓
关联商品区域
```

注意，`related-products` 是独立的 Section，并不是 `main-product` 内部的 Block。

---

## 三、第二步：进入 main-product.liquid

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/sections/main-product.liquid" title="sections/main-product.liquid"/>

我们先看文件开头。

<badge color="info">源码第 1～10 行</badge>

```liquid
<product-info
  id="MainProduct-{{ section.id }}"
  class="section-{{ section.id }}-padding gradient color-{{ section.settings.color_scheme }}"
  data-section="{{ section.id }}"
  data-product-id="{{ product.id }}"
  data-update-url="true"
  data-url="{{ product.url }}"
  {% if section.settings.image_zoom == 'hover' %}
    data-zoom-on-hover
  {% endif %}
>
```

这段代码看起来很简单，但它实际上决定了整个商品信息区域的 JavaScript 架构。

我们逐个分析。

### 1. 为什么使用 `<product-info>`？

它不是浏览器原生 HTML 标签，而是 Dawn 自定义的 Web Component。

对应的 JavaScript 文件：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/product-info.js" title="assets/product-info.js"/>

里面有：

```js
if (!customElements.get('product-info')) {
  customElements.define(
    'product-info',
    class ProductInfo extends HTMLElement {
      // ...
    }
  );
}
```

也就是说，Dawn 把整个商品信息区域封装成了一个 Custom Element。

这意味着：

```html
<product-info>
  ...
</product-info>
```

并不只是一个普通容器，它具有自己的 JavaScript 行为和生命周期。

为什么这样设计？

因为商品信息区域内部存在很多相互关联的功能：

- Variant 选择。
- 价格更新。
- 库存更新。
- SKU 更新。
- 数量限制更新。
- 购买按钮状态更新。

Dawn 将这些功能放在一个具有明确边界的组件中。

这比在全局 JavaScript 中到处查询：

```js
document.querySelector(...)
```

更容易管理。

### 2. 为什么需要 `section.id`？

```liquid
id="MainProduct-{{ section.id }}"
```

假设当前商品 Section ID 为：

```text
template--123456__main
```

那么最终 HTML 就是：

```html
<product-info id="MainProduct-template--123456__main">
```

为什么不直接使用：

```liquid
id="MainProduct-{{ product.id }}"
```

因为同一个商品可能在同一页面出现多个展示实例，例如主商品区域和 Featured Product 区域。

使用 Section ID 可以让每个组件实例拥有独立的 DOM 标识。

这也是 Dawn 很常见的一种 ID 命名策略：

```liquid
ProductInfo-{{ section.id }}
ProductGallery-{{ section.id }}
ProductForm-{{ section.id }}
```

### 3. 为什么传入这么多 data 属性？

```liquid
data-section="{{ section.id }}"
data-product-id="{{ product.id }}"
data-update-url="true"
data-url="{{ product.url }}"
```

这些属性实际上是在建立 Liquid 和 JavaScript 之间的数据通信接口。

例如 JavaScript：

```js
this.dataset.section
this.dataset.productId
this.dataset.updateUrl
this.dataset.url
```

分别可以读取：

| HTML 属性 | JS 属性 | 用途 |
|---|---|---|
| `data-section` | `dataset.section` | 当前 Section ID |
| `data-product-id` | `dataset.productId` | 商品 ID |
| `data-update-url` | `dataset.updateUrl` | 是否更新浏览器 URL |
| `data-url` | `dataset.url` | 商品 URL |

这是一种很值得借鉴的设计。

Liquid 负责把服务器端数据输出到 HTML，JavaScript 不需要再额外请求一次接口才能知道当前组件属于哪个商品。

---

## 四、第三步：资源加载是如何设计的？

接着往下看。

<badge color="info">源码第 11～55 行附近</badge>

```liquid
{{ 'section-main-product.css' | asset_url | stylesheet_tag }}
{{ 'component-accordion.css' | asset_url | stylesheet_tag }}
{{ 'component-price.css' | asset_url | stylesheet_tag }}
{{ 'component-slider.css' | asset_url | stylesheet_tag }}
```

Dawn 没有把所有 CSS 写进一个文件，而是拆成多个组件样式文件。

例如：

```text
assets/
  section-main-product.css
  component-accordion.css
  component-price.css
  component-slider.css
  component-rating.css
  component-deferred-media.css
```

这样做主要有两个价值：

1. 不同组件的样式职责更加清晰。
2. 组件可以在其他 Section 中复用对应的样式。

但更值得关注的是下面的条件判断。

```liquid
{% unless product.has_only_default_variant %}
  {{ 'component-product-variant-picker.css'
    | asset_url
    | stylesheet_tag
  }}
{% endunless %}
```

这意味着：

如果商品只有默认 Variant，就不需要加载变体选择器相关 CSS。

再看：

```liquid
{% if product.quantity_price_breaks_configured? %}
  {{ 'component-volume-pricing.css'
    | asset_url
    | stylesheet_tag
  }}
{% endif %}
```

只有商品配置了批量价格规则，才加载批量定价样式。

**这里体现了 Dawn 的一个重要性能原则：根据当前商品实际具备的功能，决定是否加载相关资源。**

接下来是 JavaScript：

```liquid
<script
  src="{{ 'product-info.js' | asset_url }}"
  defer="defer"
></script>

<script
  src="{{ 'product-form.js' | asset_url }}"
  defer="defer"
></script>
```

这两个文件是商品详情页的核心 JavaScript。

另外：

```liquid
{% if section.settings.image_zoom == 'hover' %}
  <script
    src="{{ 'magnify.js' | asset_url }}"
    defer="defer"
  ></script>
{% endif %}
```

只有启用了 Hover 放大功能才加载 `magnify.js`。

```liquid
{% if request.design_mode %}
  <script
    src="{{ 'theme-editor.js' | asset_url }}"
    defer="defer"
  ></script>
{% endif %}
```

只有 Theme Editor 环境才加载编辑器相关脚本。

这里值得你注意：

**Dawn 并不是简单地把所有功能的 JS 一次性放到 theme.liquid 中，而是让 Section 根据自己的功能需求声明相关资源。**

当然，这种模式也有一个需要研究的问题：多个 Section 可能引用同一个资源，如何避免不必要的重复加载和初始化？后面研究 Dawn 的资源组织和组件生命周期时，我们会专门讨论。

---

## 五、第四步：main-product 如何组织页面布局？

继续往下。

<badge color="info">源码第 55～85 行附近</badge>

首先：

```liquid
{% assign variant_images =
  product.images
  | where: 'attached_to_variant?', true
  | map: 'src'
%}
```

这里生成一个数组：

```text
variant_images
```

它包含与 Variant 关联的商品图片 URL。

为什么需要这个数组？

因为 Dawn 支持一种商品媒体展示模式：隐藏其他 Variant 的关联图片，只展示当前选中 Variant 相关的媒体。

后面会将这个数组传递给商品媒体画廊。

接下来：

```liquid
<div class="page-width">
  <div class="
    product
    product--{{ section.settings.media_size }}
    product--{{ section.settings.media_position }}
    product--{{ section.settings.gallery_layout }}
    product--mobile-{{ section.settings.mobile_thumbnails }}
    grid grid--1-col
    {% if product.media.size > 0 %}
      grid--2-col-tablet
    {% else %}
      product--no-media
    {% endif %}
  ">
```

这里非常值得研究。

Dawn 并不是在 Liquid 中直接计算所有 CSS 布局，而是根据 Theme Editor 配置，生成对应的 CSS Class。

例如：

```liquid
product--large
product--left
product--stacked
product--mobile-hide
```

这些 Class 再由 CSS 决定具体布局。

对应的配置来源是：

```liquid
section.settings.media_size
section.settings.media_position
section.settings.gallery_layout
section.settings.mobile_thumbnails
```

也就是说：

Theme Editor 修改媒体布局设置，Liquid 输出不同 Class，CSS 决定页面最终表现。

这是一个非常典型的配置驱动 UI 设计。

### 商品页被拆成左右两部分

继续看：

```liquid
<div class="grid__item product__media-wrapper">
  {% render 'product-media-gallery',
    variant_images: variant_images
  %}
</div>
```

左侧是商品媒体区域。

它将真正的媒体展示交给：

`snippets/product-media-gallery.liquid`

右侧：

```liquid
<div class="product__info-wrapper grid__item">

  <section
    id="ProductInfo-{{ section.id }}"
    class="product__info-container"
  >
    ...
  </section>

</div>
```

右侧是商品信息区域。

所以目前可以画出：

<box border radius="xl" padding={3} gap={2}>
  <title size="lg">Dawn 商品页布局</title>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={2} gap={2}>
        <LessonImage src="assets/fill/img-20.jpg" alt="minimal ecommerce product detail large shoe image gallery white background"/>
        **商品媒体区域**
        <text color="secondary" size="xs">product-media-gallery</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={2}>
        <text color="secondary" size="xs">商品信息区域</text>
        <title size="lg">Running Shoes</title>
        <title size="xl">$129.00</title>
        <box border radius="md" padding={2}>
          <text size="xs">Color</text>
          <row gap={1}>
            {#each ["Black","Blue","White"] as c}
              <box background="surface" border radius="md" padding={1}>
                <text size="2xs">{c}</text>
              </box>
            {/each}
          </row>
        </box>
        <box border radius="md" padding={2}>
          <text size="xs">Size: 42</text>
        </box>
        <box background="#64748b" radius="md" padding={2}>
          <text color="#ffffff" textAlign="center" weight="medium" size="sm">Add to cart</text>
        </box>
      </box>
    </grid-item>
  </grid>
  <caption>示意图：左侧媒体 Gallery，右侧商品信息。</caption>
</box>

到这里，你应该已经理解了一个重要事实：

**`main-product.liquid` 本身并不负责实现所有商品 UI，它更像是一个页面级的组装器。**

---

## 六、第五步：最核心的部分——section.blocks 循环

现在来到整个文件最值得研究的地方。

源码：

```liquid
{%- assign product_form_id =
  'product-form-' | append: section.id
-%}

{%- for block in section.blocks -%}

  {%- case block.type -%}

    {%- when 'title' -%}
      ...

    {%- when 'price' -%}
      ...

    {%- when 'variant_picker' -%}
      ...

    {%- when 'buy_buttons' -%}
      ...

  {%- endcase -%}

{%- endfor -%}
```

这是 Dawn 商品信息区域的核心分发机制。

### 1. 为什么不是直接写死 HTML 顺序？

因为商品详情页的内容顺序需要让商家通过 Theme Editor 自由调整。

例如：

商家可以将价格放在 Variant Picker 上面，也可以放在下面。

如果 Dawn 把页面写成：

```liquid
<h1>{{ product.title }}</h1>

{% render 'price' %}

{% render 'product-variant-picker' %}

{% render 'buy-buttons' %}
```

那么页面顺序就固定了。

商家无法通过拖动 Block 调整顺序。

所以 Dawn 使用：

```liquid
{% for block in section.blocks %}
```

遍历当前 Section 实际配置的 Block。

再通过：

```liquid
{% case block.type %}
```

决定渲染哪一种 UI。

### 2. 每种 Block 如何渲染？

我把源码中的主要类型整理了一下：

| Block 类型 | 渲染方式 |
|---|---|
| `@app` | `render block`，渲染 App Block |
| `text` | 直接输出富文本 |
| `title` | 输出商品标题 |
| `price` | 调用 `price` Snippet |
| `inventory` | 根据库存数据输出库存状态 |
| `description` | 输出商品描述 |
| `sku` | 输出当前 Variant SKU |
| `quantity_selector` | 输出数量选择和数量规则 |
| `variant_picker` | 调用 `product-variant-picker` |
| `buy_buttons` | 调用 `buy-buttons` |
| `collapsible_tab` | 输出折叠信息 |
| `popup` | 输出弹窗触发器 |
| `rating` | 从 Metafield 读取评分 |
| `complementary` | 输出关联商品 |
| `icon-with-text` | 调用对应 Snippet |

这里特别注意两个设计。

**设计一：简单的 Block 直接在 Section 内实现。**

例如：

```liquid
{%- when 'description' -%}
  {%- if product.description != blank -%}
    <div class="product__description rte">
      {{ product.description }}
    </div>
  {%- endif -%}
```

这种逻辑比较简单，也没有必要单独抽取 Snippet。

**设计二：复杂或可复用的 Block 抽取为 Snippet。**

例如：

```liquid
{%- when 'variant_picker' -%}

  {% render 'product-variant-picker',
    product: product,
    block: block,
    product_form_id: product_form_id
  %}
```

这里就把变体选择器独立出来了。

后续我们会深入这个 Snippet，看看它如何实现按钮、下拉框、Swatch，以及如何把选项值和 Variant ID 联系起来。

---

## 七、第六步：为什么 product_form_id 要在循环外定义？

注意：

```liquid
{%- assign product_form_id =
  'product-form-' | append: section.id
-%}
```

它在 Block 循环外面。

然后同时传给：

```liquid
product-variant-picker
```

和：

```liquid
buy-buttons
```

为什么？

因为商品选项选择器和购买按钮虽然是两个独立的 UI 模块，但它们实际上属于同一个购买表单。

例如，`buy-buttons.liquid` 中会输出：

```liquid
{% form 'product',
  product,
  id: product_form_id,
  class: 'form'
%}

  <input
    type="hidden"
    name="id"
    value="{{ product.selected_or_first_available_variant.id }}"
  >

  ...

{% endform %}
```

而数量选择器在 `main-product.liquid` 中：

```liquid
<input
  type="number"
  name="quantity"
  form="{{ product_form_id }}"
>
```

你发现了吗？

数量输入框甚至不一定需要写在 `<form>` 标签内部。

HTML 原生支持通过：

```html
form="某个表单的 id"
```

把表单外部的输入元素关联到指定表单。

这样 Dawn 就能让商品信息区域的不同 Block 保持独立布局，同时仍然属于同一个购买表单。

<box border radius="lg" padding={3} gap={2}>
  **商品表单的逻辑关系**
  <box border={{size:1,color:"#0d9488"}} radius="md" padding={2} gap={2}>
    <text color="success" weight="medium" size="sm">product-form-id</text>
    <box background="surface-secondary" radius="md" padding={2}>
      <text size="sm">Variant Picker</text>
      <caption>选择商品选项，更新对应 Variant ID</caption>
    </box>
    <box background="surface-secondary" radius="md" padding={2}>
      <text size="sm">Quantity Selector</text>
      <caption>通过 form 属性关联购买表单</caption>
    </box>
    <box background="surface-secondary" radius="md" padding={2}>
      <text size="sm">Buy Buttons</text>
      <caption>真正的 product form 和提交按钮</caption>
    </box>
  </box>
</box>

这是一个非常好的组件设计案例：

**UI 可以分散，业务表单关系仍然保持统一。**

---

## 八、第七步：Block 循环结束后，为什么还有很多代码？

源码在 Block 循环之后，并没有直接结束。

还有：

```liquid
<a href="{{ product.url }}">
  {{ 'products.product.view_full_details' | t }}
</a>
```

然后：

```liquid
{% render 'product-media-modal',
  variant_images: variant_images
%}
```

接下来：

```liquid
{% assign popups =
  section.blocks | where: 'type', 'popup'
%}

{% for block in popups %}
  <modal-dialog ...>
    ...
  </modal-dialog>
{% endfor %}
```

这里有两个很有意思的设计。

#### 1. Popup 的触发器和内容分开渲染

在 Block 循环中，`popup` Block 只渲染打开弹窗的按钮。

真正的 Modal HTML 则在循环结束后统一输出。

为什么？

因为弹窗内容不一定需要放在商品信息的正常文档流中。

这种设计有助于将弹窗层与商品信息布局解耦。

#### 2. Media Gallery 和 Media Modal 也是分开的

媒体缩略图和画廊主体由：

```text
product-media-gallery.liquid
```

负责。

而放大查看图片的 Modal 则由：

```text
product-media-modal.liquid
```

负责。

这意味着 Gallery 负责媒体展示，Modal 负责媒体放大交互。

它们是同一个业务功能的不同组成部分。

最后还有：

```liquid
<script type="application/ld+json">
  {{ product | structured_data }}
</script>
```

这部分输出商品结构化数据，帮助搜索引擎理解商品信息。

因此，`main-product.liquid` 除了页面 UI，还承担了 SEO 相关输出。

---

## 九、现在我们重新理解 main-product.liquid

把刚才研究的内容组合起来，你就能得到一张完整的结构图。

<box border radius="xl" padding={3} gap={2}>
  <title size="lg">Dawn main-product 源码结构</title>
  <box border radius="md" padding={2} gap={1}>
    **Shopify Section Wrapper**
    <box background="surface-secondary" padding={2} radius="md" gap={2}>
      **`product-info` Custom Element**
      <text size="xs" color="secondary">商品信息更新、选项变化、数量规则</text>
      <grid columns={2} gap={2}>
        <grid-item>
          <box border radius="md" padding={2} gap={2}>
            **左侧**
            <box background="surface-tertiary" padding={2} radius="sm">
              <text size="xs">product-media-gallery</text>
            </box>
            <box background="surface-tertiary" padding={2} radius="sm">
              <text size="xs">product-media-modal</text>
            </box>
          </box>
        </grid-item>
        <grid-item>
          <box border radius="md" padding={2} gap={1}>
            **右侧**
            {#each ["Title","Price","Inventory","Description","Variant Picker","Quantity","Buy Buttons","Other Blocks"] as name}
              <box background="surface-tertiary" padding={1} radius="sm">
                <text size="xs">{name}</text>
              </box>
            {/each}
          </box>
        </grid-item>
      </grid>
      <box border radius="md" padding={2}>
        <text size="xs" weight="medium">其他独立输出</text>
        <text size="xs" color="secondary">Popup Modal · 3D Model · Structured Data</text>
      </box>
    </box>
  </box>
  <caption>这是代码职责结构，不代表浏览器中的所有 DOM 都严格嵌套在同一个父子组件树中。</caption>
</box>

---

## 十、这一课最值得掌握的五个设计思想

以下设计原则解释了 Dawn 如何组织这些 Snippet。

| 设计思想 | Dawn 中的体现 |
|---|---|
| 配置驱动 UI | `product.json` 和 `section.blocks` |
| 组件职责分离 | Gallery、Variant Picker、Buy Buttons |
| 服务端输出数据 | Liquid 负责生成初始 HTML |
| 前端增强 | Custom Elements 负责交互 |
| 按需加载 | 条件加载 CSS、JS 和 3D Model 资源 |

还有一个非常值得注意的地方：

`main-product.liquid` 文件看起来非常长，但其中很大一部分是 `{% schema %}`。

Schema 定义的是 Theme Editor 的配置能力，不是每次访问商品页都要输出的页面 HTML。

所以不能简单地通过文件行数判断页面渲染成本。

---

## 十一、动手思考：检验你是否理解了 Dawn 的设计



假设商家在 Shopify Theme Editor 中，将商品详情页的 Block 顺序从：

```text
Title
Price
Variant Picker
Quantity
Buy Buttons
```

调整成：

```text
Title
Variant Picker
Price
Buy Buttons
Quantity
```

**请问：**

这次调整需要修改 `main-product.liquid` 的 Liquid 代码吗？

还是只修改 `product.json` 中的 `block_order` 就可以？
