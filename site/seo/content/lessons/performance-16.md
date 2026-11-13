# Shopify Theme 高级性能优化：Liquid、Section Rendering、生命周期与复杂商品




前面的课程已经解决了浏览器层面的问题：网络资源加载、DOM、CSS、Layout、JavaScript 主线程、图片、字体和大型商品列表。

但 Shopify Theme 还有一层特殊的架构：

**它不是单纯的前端页面，而是 Shopify 服务端 Liquid 渲染与浏览器运行时 JavaScript 共同组成的系统。**

理解这一点，才能做好复杂 Theme 的性能优化。

本课分为五个重点：

| 模块 | 核心问题 |
|---|---|
| Liquid 服务端优化 | 如何避免昂贵的数据获取、循环和 Snippet 渲染 |
| 高变体商品 | 如何支持超过 250 个 Variant 的商品 |
| Section Rendering | 如何高效、正确地替换局部 HTML |
| Theme Editor 生命周期 | 如何处理 Section 动态重建、事件和内存清理 |
| Cart Drawer 工程架构 | 如何保证加购、局部刷新和异步状态一致性 |

我们会以一个复杂 Shopify 商店为例。

假设它包含一个有 1000 个商品的集合页，以及一个拥有数百个 Variant 的商品详情页，还提供 Ajax 筛选、快速购买、Cart Drawer 和可自由增删的 Theme Section。

---

## 一、先建立 Shopify Theme 的完整性能模型

一个 Shopify Theme 的性能问题，可以发生在四个不同的位置。

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 342 295" width="100%">
    {#each [
      {y:5,title:"1. Shopify 服务端",sub:"Liquid 查询、循环、Section 和 Snippet 渲染",color:"#64748b"},
      {y:73,title:"2. 网络与 CDN",sub:"HTML 流式输出、图片、CSS / JS 下载",color:"#3b82f6"},
      {y:141,title:"3. 浏览器渲染",sub:"DOM、Style、Layout、Paint、Composite",color:"#0d9488"},
      {y:209,title:"4. 运行时交互",sub:"Variant、Ajax、Section 更新、Cart Drawer",color:"#d97706"}
    ] as item,i}
      <rect x="16" y={item.y} width="310" height="52" rx="8" fill={item.color} fillOpacity=".1" stroke={item.color} strokeOpacity=".5"/>
      <text x="171" y={item.y+21} fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">{item.title}</text>
      <text x="171" y={item.y+39} fontSize="10.5" textAnchor="middle" fill="currentColor" opacity=".7">{item.sub}</text>
      {#if i<3}
        <path d={`M171 ${item.y+52} v13 m-4 -4 4 4 4 -4`} fill="none" stroke="currentColor" strokeOpacity=".45"/>
      {/if}
    {/each}
    <text x="171" y="287" fontSize="10" textAnchor="middle" fill="currentColor" opacity=".65">四层可能相互影响，但需要分别定位</text>
  </svg>
</box>

假设一个商品页的实际表现是：

```text
TTFB：600ms
HTML 完整接收：2100ms
商品主图开始请求：2150ms
主图下载完成：2800ms
LCP：3000ms
```

这里最值得先研究的，可能不是图片压缩，而是：

**为什么在收到 HTML 首字节之后，过了这么久商品主图的 URL 才被浏览器发现？**

如果商品 Section 的 Liquid 渲染较慢，导致主图 HTML 输出较晚，那么即使浏览器侧代码很优秀，LCP 仍可能被拖慢。

Shopify 官方性能指南也专门区分了 TTFB、完整 HTML 输出、FCP 和 LCP 之间的这种关系。

因此，我们首先研究 Liquid。

---

## 二、Liquid 服务端优化：为什么代码看起来简单，性能却可能很差？

Liquid 不像浏览器 JavaScript 那样运行在用户电脑上。

它主要在 Shopify 服务端被执行，用于生成 HTML。

但这不意味着 Liquid 性能可以忽略。

尤其当它涉及：

- 大量 Product、Variant 等对象。
- 嵌套循环。
- Metafield 和 Metaobject 访问。
- 多层 `{% render %}`。
- 大量重复过滤器计算。

就可能增加服务端渲染时间。

### 1. 第一个典型问题：嵌套循环

假设我们需要在集合页显示商品及其变体信息。

原代码：

```liquid
{% for product in collection.products %}

  <div class="product-card">
    <h3>{{ product.title }}</h3>

    {% for variant in product.variants %}
      <span>{{ variant.title }}</span>
      <span>{{ variant.price | money }}</span>
    {% endfor %}
  </div>

{% endfor %}
```

假设当前页有 50 个商品，每个商品平均有 20 个 Variant。

那么内部循环执行次数约为：

\[
50\times20=1000
\]

如果每次循环还读取 Metafield：

```liquid
{{ variant.metafields.custom.material.value }}
```

就可能进一步增加服务端数据访问成本。

现在思考一个问题：

**集合页的商品卡片，真的需要输出每个商品的所有 Variant 吗？**

通常不需要。

用户可能只需要看到商品主图、标题、价格、颜色选项及是否有货。

因此，可以先从业务需求上减少数据。

```liquid
{% for product in collection.products limit: 24 %}

  {% assign selected_variant = product.selected_or_first_available_variant %}

  <article class="product-card">
    <h3>{{ product.title | escape }}</h3>

    <p>{{ selected_variant.price | money }}</p>

    {% if selected_variant.available %}
      <span>有货</span>
    {% else %}
      <span>缺货</span>
    {% endif %}
  </article>

{% endfor %}
```

这样就避免为了展示一张卡片而遍历所有 Variant。

不过还有一个重要细节：如果这是完整集合页，应该使用第 14 课学习的 `{% paginate collection.products by 24 %}` 实现分页，而不是只用 `limit: 24` 后永远不提供其他商品。`limit` 更适合首页精选商品等固定大小的展示场景。

Shopify 官方当前还专门优化了 `collection.products` 和 `collections` 的 `for ... limit` 数据获取行为，在符合条件时，限制循环数量也能减少底层对象获取。

### 2. 第二个问题：循环中重复查找对象

例如，假设要判断哪些 Variant 已经存在于购物车。

低效写法：

```liquid
{% for variant in product.variants %}

  {% assign in_cart = false %}

  {% for item in cart.items %}
    {% if item.variant_id == variant.id %}
      {% assign in_cart = true %}
      {% break %}
    {% endif %}
  {% endfor %}

  {% if in_cart %}
    <span>已在购物车</span>
  {% endif %}

{% endfor %}
```

这是一个嵌套循环。

每个 Variant 都可能重新遍历 Cart Items。

我们可以将购物车中的 Variant ID 提前提取出来：

```liquid
{% assign cart_variant_ids = cart.items | map: 'variant_id' %}

{% for variant in product.variants %}

  {% if cart_variant_ids contains variant.id %}
    <span>已在购物车</span>
  {% endif %}

{% endfor %}
```

这样避免在 Liquid 模板代码里反复执行显式的内层循环。

但是需要特别注意：

**这不意味着 `contains` 一定使用哈希表，或者整个算法必然变成 O(n)。**

它仍然需要完成成员判断。

这种优化真正的价值是减少重复的 Liquid 循环结构，并让部分处理交由 Shopify 的内部过滤器实现。

如果数据量巨大，还需要通过 Theme Inspector 测量实际收益。

Shopify 官方也推荐使用 `map`、`where`、`first`、`join` 等过滤器简化某些嵌套循环。

### 3. 第三个问题：在循环内重复访问 Metafield

假设商品页需要显示 40 个自定义配置项：

```liquid
{% for block in section.blocks %}

  {% assign data = product.metafields.custom.settings.value %}

  <div>
    {{ data.title }}
  </div>

{% endfor %}
```

这里 `product.metafields.custom.settings.value` 每次循环都被重新求值。

如果它返回的内容在整个 Section 中不变，就没必要反复访问。

可以改成：

```liquid
{% assign data = product.metafields.custom.settings.value %}

{% for block in section.blocks %}
  <div>
    {{ data.title }}
  </div>
{% endfor %}
```

这类优化的原则很简单：

**循环中不会变化的结果，尽量在循环外计算一次。**

但如果读取的是每个 Variant 各自不同的 Metafield：

```liquid
variant.metafields.custom.material.value
```

就不能直接把它移到外层并假装所有 Variant 的值相同。

这时候正确的优化可能是改变数据获取策略：只加载当前需要的 Variant，而不是访问全部 Variant 的自定义数据。

Shopify 官方将循环中的重复 Metafield 查询列为 Liquid 性能问题的重要来源。

### 4. 第四个问题：Snippet 嵌套过深

假设商品网格这样组织：

```text
collection.liquid
   └── product-card.liquid
         └── price.liquid
               └── discount.liquid
                     └── badge.liquid
```

如果一个集合页有 50 个商品，那么多层 `{% render %}` 会被反复调用。

每次 `render` 都有作用域创建、参数传递及执行等开销。

但不要因此直接得出“Snippet 越少越好”的结论。

Snippet 带来的模块化、代码复用和维护价值也很重要。

更合理的做法是：

**先识别高频调用链，然后仅对其中测得明显昂贵的部分做扁平化处理。**

例如，价格格式化逻辑非常简单时，可能不需要再拆成四级 Snippet。

Shopify 当前官方性能文档也明确建议减少循环中的深度嵌套 `render`，同时使用 `render` 而不是已经废弃的 `include`。

---

## 三、Liquid 优化不是靠猜：要看 Theme Inspector

这里介绍一个关键诊断思维。

假设我们有两个候选问题：

```text
A：collection.products 循环
B：product-card Snippet
```

你觉得 A 更慢，因为它循环 24 次。

但 Theme Inspector 显示：

| 操作 | 总耗时（模拟） | 调用次数 |
|---|---:|---:|
| Collection 主循环 | 25ms | 1 |
| product-card | 180ms | 24 |
| Variant Metafield 访问 | 130ms | 240 |
| 价格格式化 | 8ms | 24 |

这时真正要优先调查的可能是变体 Metafield 访问。

Theme Inspector 的 Flame Graph 可以看到调用关系；聚合视图则有助于发现那些单次并不明显、但被反复调用的昂贵操作。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">Liquid 渲染开销示意</text>
  <box gap={2}>
    {#each [
      {name:"Variant Metafield",v:130,color:"#d97706"},
      {name:"其他 product-card 工作",v:50,color:"#64748b"},
      {name:"Collection 循环",v:25,color:"#3b82f6"},
      {name:"价格格式化",v:8,color:"#0d9488"}
    ] as x}
      <box gap={1}>
        <row justify="between">
          <text size="sm">{x.name}</text>
          <text size="sm" tabularNums>{x.v}ms</text>
        </row>
        <box background="surface-tertiary" height="13px" radius="sm" clip>
          <box width={`${x.v/130*100}%`} height="100%" background={x.color} radius="sm"/>
        </box>
      </box>
    {/each}
  </box>
  <caption>这里的数值是用于说明分析方法的假设，不应与上表中的父子调用时间简单相加，因为总耗时可能包含子调用。</caption>
</box>

官方资料：

<Link url="https://shopify.dev/docs/storefronts/themes/tools/theme-inspector" title="Shopify Theme Inspector for Chrome"/>

**这一部分的核心原则是：优化 Liquid，首先减少不必要的数据获取和重复工作，而不是优先纠结几个字符的模板语法差异。**

---

---

## 四、高变体商品：为什么不能再依赖 product.variants 获取全部变体？

这一部分非常重要，尤其是你之前已经深入学习过 Shopify 的 Product、Option 和 Variant 数据模型。

我们先回顾它们的关系。

假设有一个商品：

```text
运动鞋
  ├── Color：10 个值
  ├── Size：20 个值
  └── Material：3 个值
```

理论上可能存在：

\[
10\times20\times3=600
\]

种选项组合。

当然，并非每一种组合都必须对应一个实际创建的 Variant。

假设商家确实创建了 600 个 Variant。

以前你可能这样写：

```liquid
{% for variant in product.variants %}
  <option value="{{ variant.id }}">
    {{ variant.title }}
  </option>
{% endfor %}
```

看起来可以把所有变体放在下拉框里。

**但现在这种写法既可能存在性能问题，也可能存在功能正确性问题。**

Shopify 当前明确规定：Liquid 的 `product.variants` 最多返回 **250 个 Variant**。

因此，一个拥有 600 个 Variant 的商品，不能依靠这个对象获取全部 600 个。

### 1. 250 个 Variant 不是商品本身的数量上限

这是一个必须区分的概念。

`product.variants` 返回最多 250 个，并不意味着 Shopify 商品只能创建 250 个变体。

它是 Liquid 渲染时对该对象可访问变体数量的限制。

而且，即使你使用：

```liquid
{% paginate product.variants by 50 %}
```

也不能据此突破 `product.variants` 本身的 250 个限制。

所以，我们需要改变技术方案。

### 2. 错误架构：初始页面序列化全部 Variant

例如：

```liquid
<script>
  const variants = {{ product.variants | json }};
</script>
```

然后在 JS 中根据 Color、Size、Material 查找变体。

这有两个问题。

**性能问题：** 商品变体多时，HTML 中需要输出较大的 JSON，浏览器还要解析并保存这份数据。

**功能问题：** 超过 250 个 Variant 时，这份数组并不完整。

即使你写了一个很高效的 JS 查找算法，也无法在不完整的数据中找到第 300 个 Variant。

这时候需要从“加载所有 Variant”转向：

**加载用户当前选项组合需要的 Variant。**

---

## 五、Shopify 的新方案：product_option_value + option_values

Shopify 针对高变体商品提供了更合适的数据访问方式。

两个核心能力是：

1. `product.options_with_values` 中提供的 `product_option_value` 对象。
2. 商品 URL 上的 `option_values` 查询参数。

### 1. product_option_value 是什么？

以前我们可能只把 Option Value 当成一个字符串：

```text
Color: Red
Color: Blue
Size: M
Size: L
```

现在 Shopify 的 Option Value 对象还包含更多信息。

| 属性 | 用途 |
|---|---|
| `id` | 选项值的唯一 ID |
| `name` | 选项值名称 |
| `selected` | 当前是否选中 |
| `available` | 在相关选项上下文中的可购买性 |
| `variant` | 与当前选项上下文关联的 Variant（如果存在） |
| `product_url` | 对于 Combined Listings，可能指向关联商品 |
| `swatch` | 与该选项值关联的颜色或图片色板 |

这使我们不必先获取完整 Variant 列表，再推导所有选项值。

### 2. Liquid 直接生成 Option 选择器

例如：

```liquid
<div
  data-product-root
  data-section-id="{{ section.id }}"
  data-product-url="{{ product.url }}"
>
  {% for option in product.options_with_values %}

    <fieldset>
      <legend>{{ option.name | escape }}</legend>

      {% for option_value in option.values %}

        <label>
          <input
            type="radio"
            name="option-{{ option.position }}"
            value="{{ option_value.name | escape }}"
            data-option-value-id="{{ option_value.id }}"
            {% if option_value.selected %}
              checked
            {% endif %}
          >

          {{ option_value.name | escape }}

          {% unless option_value.available %}
            <span>不可购买</span>
          {% endunless %}
        </label>

      {% endfor %}
    </fieldset>

  {% endfor %}
</div>
```

这段代码并没有遍历：

```liquid
product.variants
```

而是遍历：

```liquid
product.options_with_values
```

因此它不会因为 `product.variants` 截断而丢失第 251 个之后的变体组合入口。

这里还要理解一个细节：

**Option Value 的 `available` 并不总是简单地表示某个完整 Variant 是否有库存。**

它会考虑当前已选择的其他 Option 上下文。

Shopify 官方将这种行为区分为按前序选项判断的 *top-down availability*，与针对具体相邻组合的可购买状态判断。

实际 Theme 中，要根据你希望实现的选择体验决定如何展示“缺货”“不可用”等状态，不能仅凭一项 `available == false` 就断言这个选项值在所有组合中永远不可购买。

### 3. 用户选择 Option 后，怎样获取对应 Variant？

假设用户选择：

```text
Color = Blue
Size = 42
Material = Leather
```

我们获取这三个 Option Value 的 ID。

例如：

```text
10001,10042,10088
```

然后请求：

```text
/products/running-shoes?option_values=10001,10042,10088
```

Shopify 就能够在这个选项组合上下文中生成商品页面。

但我们并不需要重新请求完整页面。

可以结合 Section Rendering API：

```text
/products/running-shoes
  ?option_values=10001,10042,10088
  &section_id=template--123456__main
```

服务器返回这个商品 Section 的最新 HTML。

这样，新的价格、可购买状态、Option 状态等可以直接由 Shopify Liquid 输出。

**这一模式就是：客户端维护用户选择，Shopify 服务端负责解析该选择对应的商品状态。**

它也是 Shopify 官方高变体商品指南推荐的重要技术路径。

### 4. 注意无效组合

例如：

```text
蓝色 + 42码 + 真皮
```

可能根本没有创建对应 Variant。

当用户使用 `option_values` 指定的选项组合不存在时：

```liquid
product.selected_variant
```

和：

```liquid
product.selected_or_first_available_variant
```

都可能返回 `nil`。

因此不要在模板中无条件写：

```liquid
{{ product.selected_or_first_available_variant.id }}
```

然后假设它永远存在。

应处理空状态：

```liquid
{% assign current_variant = product.selected_or_first_available_variant %}

{% if current_variant %}
  <p>{{ current_variant.price | money }}</p>

  {% if current_variant.available %}
    <button type="submit">加入购物车</button>
  {% else %}
    <button type="button" disabled>暂时缺货</button>
  {% endif %}
{% else %}
  <p>当前选项组合不可购买</p>
  <button type="button" disabled>组合不可用</button>
{% endif %}
```

这不仅是性能问题，更是商品购买逻辑的正确性问题。

---

## 六、Section Rendering API：它究竟在 Shopify 架构中负责什么？

接下来研究 Shopify Theme 最重要的动态更新机制。

先考虑普通 JavaScript 更新：

```js
price.textContent = "$299";
```

这由浏览器直接修改 DOM。

但如果价格和购买状态来自复杂的 Shopify 商品数据呢？

例如：

- 市场和货币上下文。
- 当前变体。
- 缺货状态。
- 销售计划。
- 商品关联 Metafield。
- 不同 Option Value 的选中状态。

如果这些信息全部由客户端独立计算，会增加数据和状态同步的复杂度。

Section Rendering API 提供了另一种方式。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">Section Rendering 的执行过程</text>
  <svg viewBox="0 0 342 307" width="100%">
    {#each [
      {y:5,t:"用户更改商品选项",s:"浏览器收集选中的 Option Value ID",c:"#3b82f6"},
      {y:68,t:"发送 Section Rendering 请求",s:"携带商品 URL、option_values、section_id",c:"#64748b"},
      {y:131,t:"Shopify 服务端执行 Liquid",s:"重新生成当前上下文中的 Section HTML",c:"#d97706"},
      {y:194,t:"浏览器接收 HTML",s:"解析新 Section，检查有效性",c:"#64748b"},
      {y:257,t:"局部更新 DOM",s:"保留页面导航与无关区域",c:"#0d9488"}
    ] as x,i}
      <rect x="14" y={x.y} width="314" height="46" rx="8" fill={x.c} fillOpacity=".1" stroke={x.c} strokeOpacity=".5"/>
      <text x="171" y={x.y+18} fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">{x.t}</text>
      <text x="171" y={x.y+34} fontSize="10.2" textAnchor="middle" fill="currentColor" opacity=".7">{x.s}</text>
      {#if i<4}
        <path d={`M171 ${x.y+46} v15 m-4 -4 4 4 4 -4`} stroke="currentColor" strokeOpacity=".4" fill="none"/>
      {/if}
    {/each}
  </svg>
</box>

这意味着：

**Section Rendering 在 Shopify 服务端重新生成 HTML，但不会自动导致浏览器整页刷新。**

浏览器是否整页刷新，取决于你的客户端代码。

如果你用 `fetch()` 获取 Section HTML，再只替换一个 DOM 子树，就不会发生完整文档导航。

### 1. sections 与 section_id 有什么区别？

Shopify 提供两种常见请求方式。

#### 一次请求多个 Section

```text
?sections=main-product,cart-icon-bubble
```

返回 JSON：

```json
{
  "main-product": "<div>...</div>",
  "cart-icon-bubble": "<div>...</div>"
}
```

最多可以请求五个 Section。

#### 一次请求单个 Section 的 HTML

```text
?section_id=main-product
```

返回直接的 HTML 字符串。

它们的区别：

| 参数 | 返回格式 | 适合情况 |
|---|---|---|
| `sections` | JSON 对象 | 一个请求中更新多个 Section |
| `section_id` | HTML 字符串 | 只需要一个 Section |

Shopify 官方说明，两种方式都可以在指定页面 URL 的上下文中渲染 Section。

### 2. Section ID 不一定等于文件名

假设文件名：

```text
sections/main-product.liquid
```

但 JSON Template 中的 Section ID 可能是：

```text
template--123456__main
```

它并不一定叫：

```text
main-product
```

因此在 Liquid 中应该提供：

```liquid
data-section-id="{{ section.id }}"
```

然后由 JavaScript 读取。

这可以避免把某个商店的动态 Section ID 硬编码到 JS 中。

---

---

## 七、实战：使用 Section Rendering 开发高变体商品选择器

现在我们来写一个更接近真实 Theme 的实现。

目标是：

- 初始页面只输出当前选项和必要商品信息。
- 用户选择颜色、尺码时，获取 Shopify 最新的商品状态。
- 不依赖完整的 `product.variants` 数组。
- 快速连续选择时，不让旧响应覆盖新响应。
- 保留 Shopify 服务端返回的 Section 样式。

### 第一步：Liquid 输出商品信息与表单

继续使用上面介绍的 Option Value 结构，并为商品价格和购买表单添加标记。

```liquid
{% assign current_variant = product.selected_or_first_available_variant %}

<section
  data-product-root
  data-section-id="{{ section.id }}"
  data-product-url="{{ product.url }}"
>
  <h1>{{ product.title | escape }}</h1>

  {% for option in product.options_with_values %}
    <fieldset>
      <legend>{{ option.name | escape }}</legend>

      {% for value in option.values %}
        <label>
          <input
            type="radio"
            name="option-{{ option.position }}"
            value="{{ value.name | escape }}"
            data-option-value-id="{{ value.id }}"
            {% if value.product_url %}
              data-product-url="{{ value.product_url }}"
            {% endif %}
            {% if value.selected %}checked{% endif %}
          >

          {{ value.name | escape }}
        </label>
      {% endfor %}
    </fieldset>
  {% endfor %}

  <p data-product-price>
    {% if current_variant %}
      {{ current_variant.price | money }}
    {% else %}
      当前组合不可用
    {% endif %}
  </p>

  {% form 'product', product %}
    <input
      type="hidden"
      name="id"
      value="{{ current_variant.id }}"
    >

    <button
      type="submit"
      {% unless current_variant.available %}disabled{% endunless %}
    >
      {% if current_variant.available %}
        加入购物车
      {% else %}
        暂时不可购买
      {% endif %}
    </button>
  {% endform %}
</section>
```

注意这里有一个很重要的设计：

**Option Value 的交互状态在 Section 中生成，但真正提交给 Cart API 的仍然是 Variant ID。**

它们不是一回事。

- Option Value ID：标识某个选项值，例如 Blue。
- Variant ID：标识商品的一个具体可购买变体，例如 Blue / Size 42 / Leather。

所以，不要把 `option_values` 的 ID 列表直接传给 `/cart/add.js` 作为商品变体 ID。

### 第二步：JavaScript 监听选项变化

```js
// assets/product-options.js

let activeRequest = null;
let requestVersion = 0;

document.addEventListener("change", async (event) => {
  const input = event.target;

  if (
    !(input instanceof HTMLInputElement) ||
    !input.matches("[data-option-value-id]")
  ) {
    return;
  }

  const root = input.closest("[data-product-root]");
  if (!root) return;

  const sectionId = root.dataset.sectionId;

  // 取得当前选中的全部 Option Value ID
  const selectedIds = [
    ...root.querySelectorAll(
      "input[data-option-value-id]:checked"
    )
  ].map((element) => element.dataset.optionValueId);

  // Combined Listing 可根据选择切换商品 URL
  const productUrl =
    input.dataset.productUrl ||
    root.dataset.productUrl;

  const url = new URL(productUrl, window.location.origin);

  url.searchParams.set(
    "option_values",
    selectedIds.join(",")
  );

  url.searchParams.set("section_id", sectionId);

  // 取消前一次请求
  activeRequest?.abort();

  const controller = new AbortController();
  activeRequest = controller;

  const version = ++requestVersion;

  root.setAttribute("aria-busy", "true");

  const button = root.querySelector(
    'form[action*="/cart/add"] button[type="submit"]'
  );

  if (button) button.disabled = true;

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("商品 Section 加载失败");
    }

    const html = await response.text();

    const parsed = new DOMParser().parseFromString(
      html,
      "text/html"
    );

    const wrapperId = `shopify-section-${sectionId}`;

    const nextWrapper = parsed.getElementById(
      wrapperId
    );

    if (!nextWrapper) {
      throw new Error("返回 HTML 缺少目标 Section");
    }

    // 防止过期请求修改 DOM
    if (version !== requestVersion) return;

    const currentWrapper = document.getElementById(
      wrapperId
    );

    if (!currentWrapper) return;

    currentWrapper.replaceWith(nextWrapper);

    // 仅将用户可导航的商品选择地址写入历史
    url.searchParams.delete("section_id");

    history.replaceState({}, "", url);

    const focused = nextWrapper.querySelector(
      `[data-option-value-id="${input.dataset.optionValueId}"]`
    );

    focused?.focus({ preventScroll: true });

  } catch (error) {
    if (error.name === "AbortError") return;

    if (version === requestVersion) {
      console.error(error);
      // 实际项目应显示可访问的错误提示及重试入口
    }
  } finally {
    if (version === requestVersion && root.isConnected) {
      root.removeAttribute("aria-busy");

      if (button) {
        button.disabled = false;
      }
    }
  }
});
```

这是一份解释整体机制的教学实现。它假设页面只有一个主要商品选择器；对于 Quick View、多商品表单、Combined Listings 的完整切换和复杂购买表单，需要进一步扩展。

尤其在真实商品中，应让服务端最新 HTML 决定按钮是否可购买，而不是在请求失败时无条件重新启用原购买按钮。

### 这段代码解决了什么问题？

我们仔细分析其中几个关键设计。

#### 1. 不在客户端遍历全部 Variant

代码只收集选中的 Option Value ID：

```js
const selectedIds = [...checkedInputs].map(
  input => input.dataset.optionValueId
);
```

它不需要将 600 个 Variant 全部放入页面。

#### 2. 不自行计算复杂商品价格

价格由 Shopify Liquid 在选项上下文中重新生成。

对于涉及不同市场、销售计划或其他商品状态的场景，可以降低客户端独立计算带来的状态不一致风险。

#### 3. 使用 AbortController 处理连续选择

假设用户快速点击：

```text
红色 → 蓝色 → 黑色
```

可能产生三个请求。

如果红色请求最后返回，却覆盖了黑色商品的结果，就会出现错误 UI。

通过取消旧请求和请求版本检查，可以避免这种情况。

#### 4. 并不刷新整页

Shopify 在服务器端渲染新的商品 Section。

浏览器只替换对应的 Section DOM。

因此 Header、Footer 等无关区域无需重新导航。

#### 5. 避免丢失 Section 样式

这部分值得单独展开。

---

## 八、2026 年必须注意：Section Rendering 返回的 CSS

Shopify 现在会对 Section、Block、Snippet 中的：

```liquid
{% stylesheet %}
  ...
{% endstylesheet %}
```

进行页面级 CSS 子集化。

简单来说：

**只把当前页面渲染树中需要的 `{% stylesheet %}` CSS 包含到页面样式中。**

例如：

```liquid
<!-- sections/main-product.liquid -->

<div class="product">
  ...
</div>

{% stylesheet %}
  .product {
    display: grid;
    gap: 24px;
  }
{% endstylesheet %}
```

在通过 Section Rendering API 动态请求时，返回的 HTML 可能包含：

```html
<div id="shopify-section-template--123__main">

  <style data-section-stylesheet>
    .product {
      display: grid;
      gap: 24px;
    }
  </style>

  <div class="product">
    ...
  </div>

</div>
```

这意味着如果你只提取：

```js
parsed.querySelector(".product").innerHTML
```

再更新：

```js
currentProduct.innerHTML = nextProduct.innerHTML;
```

就可能丢失新 Section 所需的 CSS。

正确做法要么保留完整 Section HTML，要么在局部更新时专门管理返回的：

```html
<style data-section-stylesheet>
```

Shopify 官方明确说明，2026 年的 CSS 子集化也适用于 Section Rendering API。

另外，这个能力仅针对 Shopify 管理的 `{% stylesheet %}` 样式。通过 `asset_url` 加载的普通 `assets/*.css` 文件，不会自动按 Section 渲染树进行同样的子集化。

### 但插入 HTML 就能自动运行里面的 JavaScript 吗？

**不能这样假设。**

例如：

```js
container.innerHTML = responseHTML;
```

通过 `innerHTML` 插入的 `<script>` 不会像一次正常 HTML 文档解析中的脚本那样直接执行。

所以，即使 Shopify 返回了一段包含完整 HTML 的 Section，也不能认为所有 JavaScript 组件会自动初始化。

这就引出了更重要的下一部分：**Section 生命周期。**

---

---

## 九、Theme Editor 为什么经常出现“首次正常，编辑后失效”？

这是 Shopify Theme 开发者很容易遇到的问题。

假设你开发了一个图片轮播 Section。

HTML：

```liquid
<div class="product-gallery">
  <button data-next-slide>下一张</button>

  <div class="slides">
    ...
  </div>
</div>
```

JS：

```js
document.querySelector("[data-next-slide]")
  .addEventListener("click", () => {
    console.log("切换图片");
  });
```

普通页面第一次打开时，一切正常。

但是在 Shopify Theme Editor 中，商家修改了轮播图的某个设置。

页面预览会动态更新。

结果“下一张”按钮突然不能点击了。

为什么？

### 1. Theme Editor 并不是每次都刷新整个页面

Shopify Theme Editor 可以动态添加、删除或重新渲染 Section HTML，而不执行完整文档导航。

假设原来的结构是：

```text
Section A
  ├── Button A
  └── Slider A
```

编辑器修改设置后：

```text
删除原有 Section A DOM
         ↓
生成新的 Section A HTML
         ↓
插入新的 Button A 和 Slider A
```

虽然新旧按钮的 HTML 看起来一样，但它们不是同一个 DOM 节点。

原来给旧按钮注册的：

```js
button.addEventListener(...)
```

不会自动转移到新按钮。

而 `DOMContentLoaded` 也不会因为 Shopify 局部重新渲染一次 Section 就再次触发。

因此，这类代码：

```js
document.addEventListener("DOMContentLoaded", () => {
  initializeGallery();
});
```

**只能保证正常首次加载时进行初始化，不能覆盖所有动态重建场景。**

Shopify 官方专门要求 Theme 开发者处理这种生命周期。

---

## 十、Theme Editor 的关键生命周期事件

Shopify 提供了一套编辑器事件。

| 事件 | 什么时候发生 | 开发者应该做什么 |
|---|---|---|
| `shopify:section:load` | Section 被添加或重新渲染 | 初始化新 Section |
| `shopify:section:unload` | Section 即将被删除或重新渲染 | 清理旧实例 |
| `shopify:section:select` | 商家在编辑器中选中 Section | 确保对应内容可见 |
| `shopify:section:deselect` | 取消选中 Section | 恢复必要的交互状态 |
| `shopify:block:select` | 选中某个 Block | 滚动或切换到对应 Block |
| `shopify:block:deselect` | 取消选中 Block | 清理对应选择状态 |

例如商家选中了轮播图第三张幻灯片对应的 Block，那么 Theme 最好自动切换到第三张，让商家立即看到自己编辑的内容。

Shopify 官方列出了这些事件，以及事件携带的 `sectionId`、`blockId` 等信息。

### 1. 不能只初始化，还必须清理

这是比监听 `shopify:section:load` 更重要的一点。

假设每次初始化轮播图时都注册一个全局监听器：

```js
function initGallery() {
  window.addEventListener("resize", () => {
    updateGallerySize();
  });
}
```

商家调整 Section 十次。

如果你每次都调用 `initGallery()`，却没有移除原来的监听器，就可能产生十个重复的 `resize` 回调。

这带来：

- 重复计算。
- 不必要的 Layout。
- 内存占用。
- 旧 DOM 引用无法及时释放。
- 难以追踪的交互 Bug。

所以我们需要明确的组件生命周期：

```text
创建 DOM
   ↓
初始化组件
   ↓
组件正常工作
   ↓
Section 即将移除
   ↓
取消事件、Observer、定时器、请求
   ↓
销毁组件状态
```

这和 React 的 Effect Cleanup、Vue 的组件卸载有相似的工程思想。

但在 Shopify Theme 中，你可以用原生 JavaScript 实现，不一定需要 React 或 Vue。

---

## 十一、原生 JavaScript 实现可靠的 Section 生命周期

我们实现一个图片画廊组件。

这次不把它写成一堆零散的全局函数，而是封装为一个具有初始化和销毁能力的类。

### 1. Liquid HTML

```liquid
<div data-gallery>
  <button type="button" data-gallery-prev>
    上一张
  </button>

  <button type="button" data-gallery-next>
    下一张
  </button>

  <div data-gallery-track>
    ...
  </div>
</div>
```

### 2. JavaScript 组件类

```js
class ProductGallery {
  constructor(root) {
    this.root = root;
    this.index = 0;

    this.controller = new AbortController();

    this.slides = [
      ...root.querySelectorAll("[data-slide]")
    ];

    root.querySelector("[data-gallery-next]")
      ?.addEventListener(
        "click",
        () => this.next(),
        { signal: this.controller.signal }
      );

    root.querySelector("[data-gallery-prev]")
      ?.addEventListener(
        "click",
        () => this.previous(),
        { signal: this.controller.signal }
      );

    this.resizeObserver = new ResizeObserver(() => {
      this.updateSize();
    });

    this.resizeObserver.observe(root);
  }

  next() {
    if (!this.slides.length) return;

    this.index = (this.index + 1) % this.slides.length;
    this.render();
  }

  previous() {
    if (!this.slides.length) return;

    this.index = (
      this.index - 1 + this.slides.length
    ) % this.slides.length;

    this.render();
  }

  render() {
    this.slides.forEach((slide, index) => {
      slide.hidden = index !== this.index;
    });
  }

  updateSize() {
    // 只在尺寸确实变化时执行必要的更新。
    // 避免在 ResizeObserver 中反复制造尺寸变化。
  }

  destroy() {
    // 自动取消通过该 signal 注册的事件监听器
    this.controller.abort();

    // 停止尺寸观察
    this.resizeObserver.disconnect();
  }
}
```

这里使用了两个很重要的浏览器能力：

**AbortController：** 可以统一取消使用同一个 `signal` 注册的多个监听器。

**ResizeObserver：** 监听元素尺寸变化，但组件销毁时必须断开观察。

实际项目里，如果还用了 `IntersectionObserver`、`setInterval`、第三方 Slider 实例等，也需要在 `destroy()` 中进行相应清理。

### 3. 管理组件实例

```js
const galleryInstances = new WeakMap();

function mountGalleries(container) {
  const roots = [
    ...(container.matches?.("[data-gallery]")
      ? [container]
      : []),
    ...container.querySelectorAll("[data-gallery]")
  ];

  for (const root of roots) {
    if (galleryInstances.has(root)) continue;

    const instance = new ProductGallery(root);

    galleryInstances.set(root, instance);
  }
}

function unmountGalleries(container) {
  const roots = [
    ...(container.matches?.("[data-gallery]")
      ? [container]
      : []),
    ...container.querySelectorAll("[data-gallery]")
  ];

  for (const root of roots) {
    const instance = galleryInstances.get(root);

    if (!instance) continue;

    instance.destroy();

    galleryInstances.delete(root);
  }
}
```

为什么使用 `WeakMap`？

因为我们希望以 DOM 元素为键，记录它对应的组件实例，并避免全局 Map 长期强引用已经被移除的节点。

但 `WeakMap` 本身**不等于自动执行资源清理**。

即使 DOM 节点最终可以被垃圾回收，已经注册的全局监听器、Observer、外部库状态等仍可能需要主动清理。

所以 `destroy()` 依然非常重要。

### 4. 绑定 Theme Editor 事件

```js
function initialize() {
  mountGalleries(document);
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialize,
    { once: true }
  );
} else {
  initialize();
}

document.addEventListener(
  "shopify:section:load",
  (event) => {
    mountGalleries(event.target);
  }
);

document.addEventListener(
  "shopify:section:unload",
  (event) => {
    unmountGalleries(event.target);
  }
);
```

这样我们就实现了：

正常页面首次加载时初始化。

Theme Editor 重新渲染 Section 时，销毁旧组件并初始化新组件。

但还有一个需要注意的边界：

**这些 `shopify:section:*` 事件是 Theme Editor 的生命周期事件，不应该假设你自己通过 `fetch()` 和 `replaceWith()` 替换 Section 后，Shopify 也会自动触发它们。**

对于自己实现的 Section Rendering，需要在替换前后主动调用相应的 `unmount` 和 `mount`，或者采用能够自动响应 DOM 连接变化的组件机制。

例如：

```js
unmountGalleries(currentSection);

currentSection.replaceWith(nextSection);

mountGalleries(nextSection);
```

这才能同时兼容 Theme Editor 和你自己编写的 Ajax 局部更新。

### 5. 更现代的方案：Web Components

如果组件特别多，你还可以使用原生 Custom Elements。

例如：

```js
class ProductGalleryElement extends HTMLElement {
  connectedCallback() {
    // 元素插入 DOM 后初始化
  }

  disconnectedCallback() {
    // 元素离开 DOM 后清理
  }
}

if (!customElements.get("product-gallery")) {
  customElements.define(
    "product-gallery",
    ProductGalleryElement
  );
}
```

当你通过 Section Rendering 删除旧组件、插入新组件时，浏览器能够调用对应的连接生命周期。

因此，**Web Components 对 Shopify Theme 是一种很自然的架构选择**：每个组件可以拥有自己的状态和生命周期，而无需引入整套前端框架。

但也要处理重复连接、组件重新插入、外部资源清理等问题，不能简单地在每次 `connectedCallback()` 中无条件重复注册监听器。

---

---

## 十二、Cart Drawer：性能优化中最容易出错的并发场景

现在我们把前面的知识用于购物车。

假设用户在商品页快速点击三次加入购物车。

或者用户先修改购物车数量，又马上删除某个商品。

这时候可能出现多个异步请求。

```text
请求 A：加入商品
请求 B：修改数量
请求 C：删除商品
```

需要特别注意：

**这些请求不只是获取数据，而是在修改 Shopify 服务器上的购物车状态。**

这和普通 Section Rendering GET 请求有本质区别。

### 1. GET 请求与购物车修改请求不能采用相同的策略

例如商品变体切换：

```js
fetch("/products/example?section_id=...")
```

它只是获取新的 HTML。

用户快速切换选项，可以取消旧请求，并忽略旧响应。

但购物车加购：

```js
fetch("/cart/add.js", { method: "POST" })
```

已经具有修改服务器状态的副作用。

即使浏览器调用：

```js
controller.abort();
```

也不代表 Shopify 服务器一定撤销了这次加购。

请求可能已经到达服务器并成功修改购物车。

因此：

**AbortController 可以阻止客户端继续处理某些请求结果，但不能当成购物车操作的事务回滚工具。**

这个区别非常重要。

### 2. 一种可靠的策略：串行化购物车修改

对于同一页面、同一个购物车状态管理模块发起的修改，我们可以先采用串行处理策略。

例如：

```js
let cartQueue = Promise.resolve();

function enqueueCartMutation(operation) {
  const result = cartQueue.then(operation);

  // 让后续任务即使在前一次失败后仍可继续
  cartQueue = result.catch(() => {});

  return result;
}
```

现在所有通过这个队列提交的购物车修改，会按顺序执行。

例如：

```js
enqueueCartMutation(() => addItem(111, 1));
enqueueCartMutation(() => updateQuantity(222, 2));
enqueueCartMutation(() => removeItem(333));
```

就不会在这个客户端队列内部同时发送三项修改。

这种方案优点是容易推理和维护。

但是要注意：

它并不能协调同一个商店其他浏览器标签页、第三方 App 或不经过队列提交的购物车请求。

如果项目还支持复杂的并发编辑，仍然需要根据服务器返回的最新状态进行同步。

### 3. Bundled Section Rendering：购物车更新后直接返回 HTML

Shopify 支持在 Cart Ajax API 中附加 Section 请求。

例如：

```js
async function addItem(variantId, quantity) {
  const response = await fetch(
    window.Shopify.routes.root + "cart/add.js",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [
          {
            id: variantId,
            quantity
          }
        ],
        sections: [
          "cart-drawer",
          "cart-icon-bubble"
        ],
        sections_url: window.location.pathname
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.description || "加购请求失败"
    );
  }

  return data;
}
```

这有助于避免：

```text
POST /cart/add.js
       ↓
GET /cart.js
       ↓
GET /?sections=cart-drawer
       ↓
GET /?sections=cart-icon-bubble
```

这种不必要地分散成多个步骤的实现。

但它也不是说所有场景都只需要一个请求。

因为 Section Rendering 仍然可能失败。

### 4. 一个最重要的异常：加购成功，但 sections 为 null

假设服务器返回：

```json
{
  "items": [
    {
      "id": 123456,
      "quantity": 1
    }
  ],
  "sections": null
}
```

此时你应该怎样处理？

很多开发者会直接重新发送一次：

```js
POST /cart/add.js
```

这是错误的。

因为第一次请求可能已经成功把商品加入购物车，只是后面的 Section HTML 渲染失败。

重复发送会导致商品数量增加两次。

Shopify 官方明确说明：

**Bundled Section Rendering 在购物车修改完成之后执行。Section 渲染失败可能返回 `null`，且不会因此改变已经完成的购物车操作。**

因此正确的状态逻辑应该是：

```text
发送加购请求
     ↓
Shopify 修改 Cart
     ↓
加购成功？
     ├── 否 → 显示错误，不更新为成功
     │
     └── 是
          ↓
       Section HTML 完整吗？
          ├── 是 → 更新购物车 DOM
          │
          └── 否 → 单独重新获取 Section HTML
                         ↓
                      更新 UI
```

这里的重点是：

**重试的是展示数据的获取，而不是重复执行购物车修改。**

更进一步，如果请求发生超时或网络中断、客户端无法确认服务器是否已经完成修改，也不应该盲目重复提交。可以先重新获取权威购物车状态，确认当前结果。

---

## 十三、一个更完整的 Cart Drawer 更新实现

我们组合前面的队列和 Bundled Section Rendering。

这里假设 Theme 已经存在两个静态 Section：

```text
cart-drawer
cart-icon-bubble
```

实际项目应使用当前 Theme 对应的真实 Section ID。

```js
const CART_SECTIONS = [
  "cart-drawer",
  "cart-icon-bubble"
];

let cartQueue = Promise.resolve();

function enqueueCart(operation) {
  const result = cartQueue.then(operation);

  cartQueue = result.catch(() => {});

  return result;
}

function updateSections(sections) {
  for (const id of CART_SECTIONS) {
    const html = sections?.[id];

    if (typeof html !== "string") {
      throw new Error(`缺少 Section: ${id}`);
    }

    const current = document.getElementById(
      `shopify-section-${id}`
    );

    const doc = new DOMParser().parseFromString(
      html,
      "text/html"
    );

    const next = doc.getElementById(
      `shopify-section-${id}`
    );

    if (!current || !next) {
      throw new Error(`Section DOM 不完整: ${id}`);
    }

    // 实际组件应在替换前销毁旧实例
    current.replaceWith(next);

    // 然后初始化新实例
  }
}

async function getCartSections() {
  const url = new URL(
    window.Shopify.routes.root,
    window.location.origin
  );

  url.searchParams.set(
    "sections",
    CART_SECTIONS.join(",")
  );

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("重新获取 Cart Section 失败");
  }

  return response.json();
}

async function addToCart(variantId, quantity = 1) {
  return enqueueCart(async () => {
    const response = await fetch(
      window.Shopify.routes.root + "cart/add.js",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [{ id: variantId, quantity }],
          sections: CART_SECTIONS,
          sections_url: window.location.pathname
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.description || "加购失败"
      );
    }

    let sections = data.sections;

    const incomplete =
      !sections ||
      CART_SECTIONS.some(
        (id) => typeof sections[id] !== "string"
      );

    if (incomplete) {
      // 只重新获取 HTML，不重复加购
      sections = await getCartSections();
    }

    updateSections(sections);

    return data;
  });
}
```

这份代码展示了关键的并发与异常处理思路，但还不是完整的生产购物车模块。

例如 `updateSections()` 目前逐个替换 Section，如果第二个 Section 不完整，可能在第一个已经更新之后抛出错误。生产代码应先解析并验证所有待更新 Section，再统一提交 DOM 更新，避免 UI 部分成功、部分失败。

另外，真实实现还需要：

- 加购按钮 Loading 状态和防重复点击。
- 处理售罄、库存不足、数量限制等错误。
- 购买表单中的 Selling Plan 和其他必要字段。
- Drawer 打开、关闭及焦点管理。
- 在 DOM 替换前销毁组件，替换后重新初始化。
- 为 Section 刷新失败提供购物车页面导航等兜底方案。

对于复杂商店，我更推荐将这些逻辑封装在统一的 `CartController` 中，让加购、改数量、删除商品等操作都经过同一个协调层。

---

## 十四、Section Rendering 最容易出现的五类 Bug

现在我们已经接触了商品、集合页、购物车三类动态 Section。

可以把它们的典型问题归纳如下：

| 问题 | 根本原因 | 解决思路 |
|---|---|---|
| 修改筛选后出现旧结果 | 旧请求后返回，覆盖了新状态 | AbortController + 请求版本校验 |
| 加购两次 | 误将修改请求失败当成可直接重试 | 区分修改结果与 Section 渲染结果 |
| 更新 Section 后按钮失效 | 旧事件绑定随旧 DOM 被移除 | 事件委托或组件重新初始化 |
| 新 Section 样式丢失 | 更新时丢弃了子集化 CSS | 保留完整 Section 或管理对应 style |
| 页面使用一段时间后越来越卡 | Observer、定时器、组件实例未清理 | 明确组件 destroy 生命周期 |

这五类问题体现了一个共同原则：

**Section Rendering 不只是获取一段 HTML 并设置 innerHTML，它同时涉及请求状态、DOM 生命周期、样式资源和业务一致性。**

顺便修正一下前面商品选项示例里用于简化展示的失败处理：请求失败后，不能简单把旧购买按钮重新设为 `disabled = false`。如果按钮原本对应售罄或旧 Variant，恢复启用可能产生错误购买。更可靠的做法是保留禁用状态并提供重试或重新获取商品状态的入口；只有成功获取并确认新 Variant 可购买后，才启用购买操作。

---

## 十五、从零设计 Shopify Theme 架构

综合今天的知识，可以设计一套比较清晰的 Theme 结构。

```text
theme/
│
├── layout/
│   └── theme.liquid
│
├── templates/
│   ├── product.json
│   └── collection.json
│
├── sections/
│   ├── main-product.liquid
│   ├── main-collection.liquid
│   └── cart-drawer.liquid
│
├── snippets/
│   ├── product-card.liquid
│   ├── variant-picker.liquid
│   ├── price.liquid
│   └── product-media.liquid
│
└── assets/
    ├── theme.js
    ├── product-options.js
    ├── cart-controller.js
    ├── collection-controller.js
    ├── product-gallery.js
    └── base.css
```

职责可划分为四个层次。

<box gap={3}>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="database" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **Liquid：负责初始数据和 HTML**

      输出商品标题、价格、当前变体、图片、筛选项等首屏必要内容。避免全量获取不需要的数据。
    </box>
  </row>
  <divider color="subtle"/>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="mouse-pointer-click" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **JavaScript Controller：负责用户意图和异步状态**

      例如 `ProductController` 管理选项选择与请求版本，`CartController` 管理购物车修改队列和错误恢复。
    </box>
  </row>
  <divider color="subtle"/>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="blocks" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **UI Component：负责局部 DOM 和生命周期**

      例如商品 Gallery、Cart Drawer、筛选弹窗，明确初始化和清理机制。
    </box>
  </row>
  <divider color="subtle"/>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="server" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **Shopify Ajax / Section Rendering：负责服务端数据和 HTML 更新**

      商品选项变化获取对应商品状态，集合筛选获取最新结果，购物车修改获取最新 Cart HTML。
    </box>
  </row>
</box>

这里最关键的架构原则是：

**不要让 Liquid、JavaScript 和 DOM 各自维护一套互相独立、又必须随时保持一致的复杂商品状态。**

例如商品变体的价格、库存与可购买性，应该有明确的数据来源。

JavaScript 可以维护用户当前正在选择什么，但最终可购买的 Variant 和购物车结果仍需要以 Shopify 的权威数据为准。

---

## 十六、三个场景，该选择什么方案？

检验你是否真正理解这节课，可以看下面的判断。

{@body const [scenario,setScenario]=DIL.useState("variant")}
{@body const cases={
variant:{title:"商品有 600 个 Variant",problem:"不能依赖 product.variants 获取所有变体。",solution:"使用 product.options_with_values 生成选择器，基于 option_values 和 Section Rendering 按需获取选项组合对应的商品状态。"},
collection:{title:"集合页有 1000 个商品",problem:"不应该让 Liquid 初始输出全部商品，也不应该只筛选当前页的 JS 数组。",solution:"使用 Shopify 原生筛选、排序和 paginate；通过 Section Rendering 增强交互，保持分页导航。"},
editor:{title:"编辑器修改 Section 后按钮失效",problem:"旧 DOM 被删除，旧事件监听器不会自动绑定到新节点。",solution:"使用 shopify:section:load/unload 管理组件，或使用 Custom Elements 生命周期；自行触发的 Section 替换也要管理初始化和清理。"},
cart:{title:"加购成功，但 Cart Drawer 没更新",problem:"购物车修改已经成功，Bundled Section Rendering 可能单独失败。",solution:"不要重复提交 cart/add；单独获取最新 Section HTML，失败时提供可用的购物车导航兜底。"}
}}
<box border radius="xl" padding={3} gap={3}>
  <radio-group direction="col" value={scenario} onChange={setScenario}>
    <radio value="variant">600 个 Variant 的商品页</radio>
    <radio value="collection">1000 个商品的集合页</radio>
    <radio value="editor">Theme Editor 中组件失效</radio>
    <radio value="cart">加购成功但抽屉更新失败</radio>
  </radio-group>
  <divider color="subtle"/>
  **{cases[scenario].title}**
  <text size="sm" color="secondary">{cases[scenario].problem}</text>
  <text size="sm">{cases[scenario].solution}</text>
</box>

---

## 十七、第 16 课总结

我们今天学习的内容，可以总结成五个非常重要的原则。

| 领域 | 必须掌握的原则 |
|---|---|
| Liquid 性能 | 少获取、少重复、避免高成本嵌套循环 |
| Variant 数据 | 不依赖 `product.variants` 获取超过 250 个变体 |
| Section Rendering | 服务端生成 HTML，浏览器负责局部更新 |
| Section 生命周期 | DOM 替换后要处理 JS 初始化、销毁与 CSS |
| Cart Ajax | 区分购物车修改成功与 Section HTML 渲染成功 |

这里还有一个需要记住的区别：

**Theme Editor 的 Section 重渲染和你自己通过 Section Rendering API 进行的 DOM 更新，虽然都在替换 HTML，但它们不等于同一套自动生命周期。**

Theme Editor 提供专门的编辑器事件。

你自己的 Ajax 组件则需要自行管理 DOM、请求并发和组件资源。

复杂 Theme 的性能排查顺序：

```text
Shopify Theme 性能问题
          ↓
先判断慢在服务端还是浏览器
          ↓
服务端慢？
  ├── Theme Inspector
  ├── 检查 Liquid 循环
  ├── 检查 Product / Variant 数据访问
  └── 检查 Snippet / Metafield
          ↓
浏览器加载慢？
  ├── Network
  ├── LCP Breakdown
  ├── 图片与字体
  └── CSS / JS 优先级
          ↓
用户交互慢或状态错误？
  ├── Performance Main Thread
  ├── Section Rendering
  ├── 请求竞态与状态一致性
  └── 组件生命周期
```

## 参考资料

- [Integrate sections and blocks with the theme editor](https://shopify.dev/docs/storefronts/themes/best-practices/editor/integrate-sections-and-blocks)
- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [Avoid deeply nested Liquid loops](https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-deeply-nested-liquid-loops)
- [Sections](https://shopify.dev/docs/storefronts/themes/architecture/sections)
- [Debugging performance with metric gaps](https://shopify.dev/docs/storefronts/themes/best-practices/performance/performance-gaps)
- [Cart API reference](https://shopify.dev/docs/api/ajax/reference/cart)
- [Move metafield access outside loops](https://shopify.dev/docs/storefronts/themes/best-practices/performance/move-metafield-access-outside-loops)
- [Flatten nested render calls, especially inside loops](https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-nested-renders)
- [Liquid performance optimization patterns](https://shopify.dev/docs/storefronts/themes/best-practices/performance/liquid-performance-patterns)
- [Limit how many items a Liquid array fetches](https://shopify.dev/docs/storefronts/themes/best-practices/performance/limit-product-queries-with-pagination)
- [Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)
- [The theme editor](https://shopify.dev/docs/storefronts/themes/tools/online-editor)
- [Filter collections before entering loops](https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-conditionals-in-loops)
- [Support high-variant products](https://shopify.dev/docs/storefronts/themes/product-merchandising/variants/support-high-variant-products)
- [Liquid objects: product](https://shopify.dev/docs/api/liquid/objects/product)
- [ProductVariant - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant)
- [ProductVariant - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/productvariant)
- [JavaScript and stylesheet tags](https://shopify.dev/docs/storefronts/themes/best-practices/javascript-and-stylesheet-tags)
- [Liquid objects: product_option_value](https://shopify.dev/docs/api/liquid/objects/product_option_value)
- [Render essential content in Liquid and HTML, not JavaScript](https://shopify.dev/docs/storefronts/themes/best-practices/performance/render-essential-content-server-side)
- [shopify-variant-selector](https://shopify.dev/docs/api/storefront-web-components/components/shopify-variant-selector)
- [ProductVariant - Storefront API](https://shopify.dev/docs/api/storefront/2026-01/objects/ProductVariant)
- [Support product variants](https://shopify.dev/docs/storefronts/themes/product-merchandising/variants)
- [Product form store](https://shopify.dev/docs/api/hydrogen/latest/products/create-product-form-store)
- [Stylesheet content subsetting](https://shopify.dev/docs/storefronts/themes/best-practices/performance/stylesheet-subsetting)
- [Sections API is sometimes returning null - Shopify App Store - Shopify Developer Community Forums](https://community.shopify.dev/t/sections-api-is-sometimes-returning-null/39219)
- [Section rendering API fails? - Online Store and Theme Development - Shopify Developer Community Forums](https://community.shopify.dev/t/section-rendering-api-fails/1981)
- [New pagination limits for Liquid & Storefront GraphQL API - #5 by Ruben_Stacksync - Changelog - Shopify Developer Community Forums](https://community.shopify.dev/t/new-pagination-limits-for-liquid-storefront-graphql-api/17481/5)
- [New pagination limits for Liquid & Storefront GraphQL API - Changelog - Shopify Developer Community Forums](https://community.shopify.dev/t/new-pagination-limits-for-liquid-storefront-graphql-api/17481)
- [The selected_or_first_available_variant can return an unavailable variant - Online Store and Theme Development - Shopify Developer Community Forums](https://community.shopify.dev/t/the-selected-or-first-available-variant-can-return-an-unavailable-variant/36105)
