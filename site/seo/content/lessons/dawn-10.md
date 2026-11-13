# Collection：集合页筛选、排序与分页机制


先调整一下后续课程安排：商品推荐与异步加载我们之前已经研究过了，这次不重复。

接下来进入 Dawn 中另一个非常重要的模块：**Collection 页面。**

这部分也很值得深入，因为它涉及 Shopify Theme 中比较典型的服务端与客户端协作：

- Liquid 如何生成筛选条件？
- Shopify 如何根据筛选参数返回商品？
- Dawn 如何实现多条件组合筛选？
- 点击筛选项后，如何不刷新整个页面？
- 排序参数如何传递？
- 分页与筛选如何协同？
- 浏览器 URL、DOM 和 Shopify 服务端状态如何保持一致？

我们今天的目标是：不仅知道如何使用 Shopify 原生筛选，而是理解 Dawn 是如何把整套筛选系统实现出来的。

## 一、先理解整个架构：三件事分别由谁负责？

首先建立一个非常重要的认知：

**Dawn 负责筛选 UI 和交互，Shopify 负责筛选配置、商品匹配和排序计算。**

它们不是一回事。

<box border radius="lg" padding={3} gap={3}>
  <box background="surface-secondary" radius="md" padding={3} gap={1}>
    **① Shopify Search & Discovery**

    <badge color="info">配置层</badge>
    - 定义哪些字段可以筛选。
    - 配置筛选名称。
    - 配置筛选值展示方式。
    - 配置筛选逻辑。
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} gap={1}>
    **② Shopify Liquid**

    <badge color="info">数据层</badge>
    - 提供 `collection.filters`。
    - 提供 `collection.sort_options`。
    - 根据 URL 参数返回筛选后的商品。
    - 提供商品数量和分页数据。
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} gap={1}>
    **③ Dawn JavaScript**

    <badge color="success">交互层</badge>
    - 监听筛选条件变化。
    - 生成 URL 参数。
    - 请求 Shopify Section HTML。
    - 更新筛选项、商品列表和数量。
    - 维护浏览器历史记录。
  </box>
</box>

这三个部分各司其职。

如果你只修改 Dawn 的 Liquid，却没有在 Shopify 后台配置筛选源，那么可能根本拿不到你想要的筛选项。

反过来，即使 Shopify 后台已经配置好筛选条件，如果 Theme 没有实现筛选 UI，也无法让用户使用。

---

## 二、筛选条件到底在哪里配置？

先解决一个很容易产生误解的问题：

**Dawn 并没有在自己的 Schema 中定义 Color、Size、Material 等具体筛选项。**

这些筛选项是在 Shopify 的 Search & Discovery 应用中配置的。

官方应用：<Entity value="Shopify Search & Discovery" category="software"/>。

后台路径：

```text
Shopify Admin
    ↓
Apps
    ↓
Search & Discovery
    ↓
Filters
    ↓
Add filter
```

### 1. Shopify 支持哪些筛选数据源？

分成两类。

**标准筛选条件**

| 筛选条件 | 数据来源 |
|---|---|
| Availability | 商品是否有货 |
| Category | 商品分类 |
| Price | 商品价格 |
| Product type | 商品类型 |
| Tags | 商品标签 |
| Vendor | 商品供应商 |

**自定义筛选条件**

| 筛选条件 | 数据来源 |
|---|---|
| Color | Product Option |
| Size | Product Option |
| Material | Product Metafield |
| Origin | Product Metafield |
| Weight | Product / Variant Metafield |
| 自定义属性 | Metaobject / Metafield |

例如，你希望实现：

```text
筛选：

Color
  □ Red
  □ Blue
  □ Black

Material
  □ Cotton
  □ Polyester
  □ Wool

Origin
  □ China
  □ Japan
  □ USA
```

可以这样设计：

- Color：商品 Variant Option。
- Material：Product Metafield。
- Origin：Product Metafield。

假设你创建了两个 Metafield：

```text
custom.material
类型：Single line text

custom.origin
类型：Single line text
```

然后给商品填写：

```text
Product A:
  material = Cotton
  origin = China

Product B:
  material = Wool
  origin = Japan

Product C:
  material = Cotton
  origin = USA
```

接下来在 Search & Discovery 中选择对应的 Metafield 作为筛选源。

注意，Metafield 筛选支持的类型并不是无限制的，当前官方支持的主要类型包括单行文本、文本列表、整数、小数、布尔值以及 Metaobject Reference 等。



### 2. 后台配置完毕，Dawn 怎么拿到这些筛选项？

答案是：

```liquid
collection.filters
```

这是 Shopify 提供的 Liquid 对象。

打开 Dawn：

[snippets/facets.liquid](https://github.com/Shopify/dawn/blob/main/snippets/facets.liquid)

你会看到：

```liquid
{% for filter in results.filters %}

  {{ filter.label }}

  {% for value in filter.values %}

    {{ value.label }}

  {% endfor %}

{% endfor %}
```

这里的 `results` 是调用 Snippet 时传进来的：

```liquid
{% render 'facets',
  results: collection,
  enable_filtering: section.settings.enable_filtering,
  enable_sorting: section.settings.enable_sorting,
  filter_type: section.settings.filter_type
%}
```

所以：

```liquid
results.filters
```

实际上就是：

```liquid
collection.filters
```

Dawn 只是把它抽象成一个通用参数 `results`，这样搜索页面也可以复用这套 Snippet。

### 3. filter 对象究竟有什么属性？

这是我们今天非常值得深入的地方。

根据 Shopify Liquid Filter 对象定义，以及 Dawn 的实际使用，可以重点认识这些属性：

| 属性 | 含义 |
|---|---|
| `filter.label` | 筛选项名称 |
| `filter.type` | 筛选类型 |
| `filter.param_name` | URL 参数名称 |
| `filter.values` | 可选筛选值 |
| `filter.active_values` | 当前已经选中的值 |
| `filter.operator` | 多值筛选逻辑 |
| `filter.presentation` | 展示方式 |
| `filter.url_to_remove` | 移除当前筛选的 URL |
| `filter.min_value` | 价格区间下限 |
| `filter.max_value` | 价格区间上限 |
| `filter.range_max` | 价格区间最大值 |



而 `filter.values` 中的每个 value 也有自己的属性：

| 属性 | 含义 |
|---|---|
| `value.label` | 展示名称 |
| `value.value` | 实际筛选值 |
| `value.param_name` | URL 参数名称 |
| `value.active` | 是否已选中 |
| `value.count` | 对应的商品数量 |
| `value.url_to_add` | 添加筛选值后的 URL |
| `value.url_to_remove` | 移除筛选值后的 URL |
| `value.swatch` | 色块信息 |
| `value.image` | 图片信息 |



例如，一个简化的 Color Filter 可以理解为：

```js
{
  label: 'Color',
  type: 'list',
  param_name: 'filter.v.option.color',

  presentation: 'swatch',
  operator: 'OR',

  values: [
    {
      label: 'Red',
      value: 'Red',
      active: false,
      count: 8
    },
    {
      label: 'Blue',
      value: 'Blue',
      active: true,
      count: 12
    }
  ]
}
```

这只是帮助理解的简化结构，不是完整的 Liquid Drop 序列化结果。

你会发现：

**Dawn 不需要知道这是 Color、Material 还是 Origin。**

它只需要遍历 Shopify 返回的 Filter 对象。

这就是为什么同一个 `facets.liquid` 能够支持各种不同的筛选条件。

---

## 三、Dawn 如何将 Filter 数据生成 HTML？

现在深入：

[snippets/facets.liquid](https://github.com/Shopify/dawn/blob/main/snippets/facets.liquid)

先看最核心的代码：

```liquid
{% for filter in results.filters %}

  {% case filter.type %}

    {% when 'boolean', 'list' %}

      <details>

        <summary>
          {{ filter.label }}
        </summary>

        <fieldset>

          {% for value in filter.values %}

            <label>

              <input
                type="checkbox"
                name="{{ value.param_name }}"
                value="{{ value.value }}"

                {% if value.active %}
                  checked
                {% endif %}
              >

              {{ value.label }}

              ({{ value.count }})

            </label>

          {% endfor %}

        </fieldset>

      </details>

    {% when 'price_range' %}

      <!-- 价格区间筛选 -->

  {% endcase %}

{% endfor %}
```

这段代码非常重要。

### 1. 为什么使用 filter.type 判断？

因为 Shopify 的 Filter 并不只有一种类型。

主要有：

- `list`：列表筛选，例如 Color、Material、Vendor。
- `boolean`：布尔筛选。
- `price_range`：价格区间筛选。

Dawn 根据类型生成不同的 UI。

例如：

Color：

```text
□ Red
□ Blue
□ Black
```

Price：

```text
Minimum:  $10

Maximum:  $100
```

两者的数据结构不一样，因此需要分别处理。

### 2. 为什么 checkbox 的 name 不能随便写？

这是非常关键的细节：

```liquid
name="{{ value.param_name }}"
value="{{ value.value }}"
```

你可能会想：

为什么不直接写：

```html
name="color"
value="Red"
```

因为 Shopify 的筛选参数有自己的命名规范。

例如：

```text
filter.v.option.color
```

这是 Variant Color 的筛选参数。

而 Product Metafield 的 Material 可能是：

```text
filter.p.m.custom.material
```

这里：

- `filter`：筛选参数命名空间。
- `p`：Product 级别。
- `m.custom.material`：Metafield 的 namespace 和 key。

不同筛选源的参数结构不同。

所以 Dawn 不自己拼接参数，而是直接使用 Shopify 返回的：

```liquid
value.param_name
```

这样无论后台增加多少筛选项，都不需要修改 Theme。

官方参数规范：<Link ref="turn748920view0" title="Shopify Storefront Filtering URL Parameters"/>。

### 3. 为什么 value.count 很重要？

例如：

```liquid
{{ value.label }} ({{ value.count }})
```

页面可能显示：

```text
Red (8)
Blue (12)
Black (0)
```

其中 `count` 是当前筛选条件下，该筛选值对应的结果数量。

当用户选择：

```text
Material = Cotton
```

其他筛选值的数量也可能发生变化。

例如：

```text
Color：

Red (3)
Blue (5)
Black (0)
```

Shopify 会根据当前筛选状态重新计算这些数量。

Dawn 会重新渲染筛选 HTML，因此不需要自己写一套复杂的商品计数算法。

### 4. Swatch 筛选是怎么实现的？

你在 Dawn 中还能看到：

```liquid
{% if presentation == 'swatch' %}

  {% render 'swatch-input',
    id: input_id,
    type: 'checkbox',
    name: value.param_name,
    value: value.value,
    swatch: value.swatch,
    checked: value.active
  %}

{% endif %}
```

这说明 Shopify 返回的筛选值不只是文字。

还可以包含视觉信息：

- 颜色。
- 图片。
- Swatch。

因此，筛选组件可以根据 `filter.presentation` 选择：

```text
text
swatch
image
```

这部分的 UI 展示由 Dawn 实现，具体 Swatch 数据则来自 Shopify。

---

## 四、筛选逻辑：AND 和 OR 到底是什么意思？

这部分一定要理解。

假设现在有：

```text
Color:
  Red
  Blue
  Black

Material:
  Cotton
  Wool
```

用户选择：

```text
Color = Red
Color = Blue
Material = Cotton
```

默认情况下：

同一个 Filter 内的多个值通常是 OR。

不同 Filter 之间通常是 AND。

所以最终逻辑是：

\[
(Red \ OR \ Blue) \ AND \ Cotton
\]

即：

```text
商品颜色是 Red 或 Blue

并且

商品材质是 Cotton
```

但是有一个细节：

Shopify 支持某些筛选源使用 AND 逻辑，例如 Product Tags，以及特定类型的 Metafield 列表。

这可以在 Search & Discovery 中配置。

Dawn 怎么处理？

你会看到：

```liquid
{% if filter.operator == 'AND' %}

  <span class="facets__and-helptext">
    {{ 'products.facets.filter_and_operator_subtitle' | t }}
  </span>

{% endif %}
```

Dawn 只是根据 Shopify 返回的 `filter.operator` 展示对应的提示。

真正执行 AND 或 OR 的仍然是 Shopify 服务端。

这也是一个很好的架构分工案例。

---

## 五、排序：Dawn 如何实现 Sort By？

现在来看排序。

打开：

[sections/main-collection-product-grid.liquid](https://github.com/Shopify/dawn/blob/main/sections/main-collection-product-grid.liquid)

你会看到：

```liquid
{% assign sort_by =
  collection.sort_by
  | default: collection.default_sort_by
%}

<select name="sort_by" id="SortBy">

  {% for option in collection.sort_options %}

    <option
      value="{{ option.value }}"

      {% if option.value == sort_by %}
        selected
      {% endif %}
    >

      {{ option.name }}

    </option>

  {% endfor %}

</select>
```

这里使用了两个重要属性：

```liquid
collection.sort_by
collection.sort_options
```

### 1. collection.sort_options

它是 Shopify 提供的当前集合页可用排序方式。

原生支持的主要选项包括：

| value | 含义 |
|---|---|
| `manual` | 手动排序 |
| `best-selling` | 最畅销 |
| `title-ascending` | 名称升序 |
| `title-descending` | 名称降序 |
| `price-ascending` | 价格从低到高 |
| `price-descending` | 价格从高到低 |
| `created-ascending` | 上架时间从早到晚 |
| `created-descending` | 上架时间从晚到早 |



所以你会发现，Dawn 根本没有自己定义排序算法。

它只负责展示 Shopify 提供的选项。

### 2. 选择排序后发生了什么？

假设用户选择：

```text
Price: Low to High
```

浏览器会生成：

```text
sort_by=price-ascending
```

URL 变成：

```text
/collections/all?sort_by=price-ascending
```

Shopify 根据这个参数重新排序商品。

然后返回排序后的商品集合。

所以：

```liquid
{% for product in collection.products %}
```

遍历到的商品顺序已经是排序后的顺序。

这和前端拿到所有商品后自己调用：

```js
products.sort(...)
```

完全不同。

Shopify 是在服务端完成商品排序的。

### 3. 为什么评分排序不在原生选项里？

这是一个需要特别记住的边界。

假设你有一个评分 Metafield：

```text
custom.rating
```

即使你创建了这个 Metafield，也不意味着：

```liquid
collection.sort_options
```

就会自动增加：

```text
rating-descending
```

原生 Collection Sort 并不支持任意 Metafield 排序。

如果业务必须按照评分排序，就需要考虑：

- 通过应用提供排序能力。
- 使用自定义应用和自己的数据查询层。
- 预先组织商品顺序，再使用手动排序等方案。

不要把筛选能力和排序能力混为一谈。

**Metafield 可以作为符合条件的筛选源，但不代表它天然就是原生排序字段。**

---

## 六、最重要的部分：facets.js 如何实现无刷新筛选？

现在进入真正的 JavaScript 核心。

源码：

[assets/facets.js](https://github.com/Shopify/dawn/blob/main/assets/facets.js)

组件：

```js
class FacetFiltersForm extends HTMLElement {
  // ...
}

customElements.define(
  'facet-filters-form',
  FacetFiltersForm
);
```

它是 Dawn 的筛选交互核心。

我们按照实际执行顺序分析。

### 1. 监听表单变化

```js
constructor() {
  super();

  this.debouncedOnSubmit = debounce(
    (event) => {
      this.onSubmitHandler(event);
    },
    800
  );

  const facetForm = this.querySelector('form');

  facetForm.addEventListener(
    'input',
    this.debouncedOnSubmit.bind(this)
  );
}
```

这里有两个重点：

第一，监听 `input` 事件。

第二，使用 800ms 防抖。

例如用户连续选择：

```text
Color = Red
Material = Cotton
Origin = China
```

不会每次点击都立即发起网络请求。

而是在短时间内连续操作后，统一处理。

这可以减少重复请求。

注意：800ms 是 Dawn 当前实现中的具体策略，不是 Shopify 的强制要求。

### 2. 如何将表单转换成 URL 参数？

源码：

```js
createSearchParams(form) {

  const formData = new FormData(form);

  return new URLSearchParams(
    formData
  ).toString();

}
```

例如 HTML：

```html
<form>

  <input
    type="checkbox"
    name="filter.v.option.color"
    value="Red"
    checked
  >

  <input
    type="checkbox"
    name="filter.p.m.custom.material"
    value="Cotton"
    checked
  >

  <select name="sort_by">
    <option value="price-ascending" selected>
      Price low to high
    </option>
  </select>

</form>
```

转换结果：

```text
filter.v.option.color=Red
&filter.p.m.custom.material=Cotton
&sort_by=price-ascending
```

这就是 Shopify 识别的筛选与排序参数。

注意：

`FormData` 会保留同名字段的多个值，因此同一个筛选项选择多个值时，也可以正确序列化。

### 3. onSubmitHandler：为什么要区分移动端和桌面端？

Dawn 同时支持：

- Desktop Facets Form。
- Mobile Facets Form。
- Desktop Sort Form。
- Mobile Sort Form。

所以源码中会根据当前触发事件，决定从哪些表单收集参数。

简化来看：

```js
onSubmitHandler(event) {

  event.preventDefault();

  const forms = [];

  const isMobile =
    event.target.closest('form').id ===
    'FacetFiltersFormMobile';

  // 根据设备收集对应表单的数据

  // 最终统一生成 searchParams

  this.onSubmitForm(searchParams, event);

}
```

桌面端需要把筛选表单和排序表单组合起来。

否则用户选择了 Material 后再改变排序，可能丢失之前的筛选条件。

这是一处非常重要的细节。

### 4. renderPage：真正发起请求的地方

这是整个文件的核心方法。

源码：

```js
static renderPage(searchParams, event) {

  const sections = this.getSections();

  // 显示 loading

  sections.forEach((section) => {

    const url =
      `${window.location.pathname}` +
      `?section_id=${section.section}` +
      `&${searchParams}`;

    fetch(url)
      .then(response => response.text())
      .then(html => {

        this.renderSection(html, event);

      });

  });

  this.updateURLHash(searchParams);

}
```

这里有一个非常关键的设计：

**Dawn 没有请求 JSON，而是请求 Shopify 渲染好的 Section HTML。**

例如：

```http
GET /collections/all?section_id=template--123__product-grid&filter.v.option.color=Red
```

Shopify 服务端收到请求后：

1. 解析筛选参数。
2. 根据当前集合执行筛选。
3. 根据排序参数执行排序。
4. 执行 Liquid。
5. 返回对应 Section 的 HTML。

这和我们之前学习过的 Product Recommendations、Quick Add、Cart Drawer 使用的技术是相通的。

### 5. DOMParser：如何更新商品列表？

拿到 HTML 后：

```js
const parsedHTML =
  new DOMParser().parseFromString(
    html,
    'text/html'
  );
```

然后：

```js
document.getElementById(
  'ProductGridContainer'
).innerHTML =
  parsedHTML.getElementById(
    'ProductGridContainer'
  ).innerHTML;
```

这里需要注意：

不是刷新整个网页。

也不是仅仅替换一个商品卡片。

而是替换：

```html
<div id="ProductGridContainer">
  ...
</div>
```

内部的全部内容。

因此：

- 商品列表会更新。
- 分页会更新。
- 空结果提示会更新。
- 商品卡片会重新生成。

另外，Dawn 还会更新：

```text
ProductCount
ProductCountDesktop
ActiveFacets
FacetsWrapper
```

为什么需要更新 Facets？

假设用户选择：

```text
Material = Cotton
```

此时：

```text
Color:
Red (3)
Blue (5)
Black (0)
```

如果不更新筛选项，用户看到的数量就会过时。

所以 Dawn 不仅更新商品列表，还会用 Shopify 返回的 HTML 同步整个筛选区域。

### 6. 为什么还要更新浏览器 URL？

看：

```js
static updateURLHash(searchParams) {

  history.pushState(
    { searchParams },
    '',
    `${window.location.pathname}?${searchParams}`
  );

}
```

这里使用的是：

```js
history.pushState()
```

而不是：

```js
window.location.href = url;
```

所以不会发生完整页面跳转。

但浏览器地址栏会更新。

例如：

```text
/collections/all
```

变成：

```text
/collections/all?filter.v.option.color=Red
```

这样做有三个好处：

1. 用户可以复制 URL 分享当前筛选结果。
2. 刷新页面后仍然可以恢复筛选条件。
3. 浏览器返回和前进按钮能够正常工作。

Dawn 还监听了：

```js
window.addEventListener(
  'popstate',
  onHistoryChange
);
```

当用户点击浏览器返回按钮时，重新根据历史记录中的 `searchParams` 渲染商品列表。

注意这里：

```js
FacetFiltersForm.renderPage(
  searchParams,
  null,
  false
);
```

第三个参数为 `false`，避免再次调用 `pushState`，从而避免产生重复的历史记录。

---

## 七、完整时间线：一次筛选到底发生了什么？

现在把刚才的源码串起来。

假设用户在 Collection 页面选择：

```text
Color = Red
Material = Cotton
Sort = Price Low to High
```

<box border radius="lg" padding={3} gap={2}>
  <title size="lg">Dawn Facet Filtering 时间线</title>
  <list connector="solid" marker="number" gap={3}>
    <list-item>
      **用户操作**

      勾选 Color、Material，选择排序方式。
    </list-item>
    <list-item>
      **FacetFiltersForm**

      监听 input 事件，启动 800ms debounce。
    </list-item>
    <list-item>
      **createSearchParams()**

      使用 FormData 和 URLSearchParams 生成查询参数。
    </list-item>
    <list-item>
      **renderPage()**

      构造带有 `section_id` 和筛选参数的 URL。
    </list-item>
    <list-item>
      **Shopify 服务端**

      执行筛选、排序、Liquid 渲染。
    </list-item>
    <list-item>
      **返回 Section HTML**

      浏览器通过 fetch 获取 HTML 字符串。
    </list-item>
    <list-item>
      **DOMParser**

      解析 HTML，更新商品列表、筛选项和商品数量。
    </list-item>
    <list-item>
      **history.pushState()**

      更新浏览器 URL，不刷新整个页面。
    </list-item>
  </list>
  <badge color="success">筛选完成</badge>
</box>



**Dawn 的筛选是服务端计算、客户端局部更新，而不是浏览器下载所有商品后进行 JavaScript 筛选。**

这也是 Shopify Theme 架构与很多传统 SPA 商品筛选实现的一个重要区别。

---

## 八、分页：它和筛选、排序是什么关系？

最后看分页。

源码：

[snippets/pagination.liquid](https://github.com/Shopify/dawn/blob/main/snippets/pagination.liquid)

在 Collection Section 中：

```liquid
{% paginate collection.products
  by section.settings.products_per_page
%}

  {% for product in collection.products %}

    {% render 'card-product',
      card_product: product
    %}

  {% endfor %}

  {% if paginate.pages > 1 %}

    {% render 'pagination',
      paginate: paginate
    %}

  {% endif %}

{% endpaginate %}
```

这里有两个重要对象：

```liquid
collection.products
paginate
```

### 1. products_per_page 是什么？

假设：

```json
{
  "products_per_page": 16
}
```

那么 Shopify 每页最多返回 16 个商品。

如果当前集合有 100 个商品：

```text
第 1 页：16 个
第 2 页：16 个
第 3 页：16 个
...
第 7 页：4 个
```

Dawn 使用：

```liquid
paginate.pages
```

获取总页数。

使用：

```liquid
paginate.next.url
```

生成下一页 URL。

### 2. 筛选后分页如何变化？

假设原集合有：

```text
100 个商品
每页 16 个
总共 7 页
```

用户筛选：

```text
Material = Cotton
```

筛选后只剩：

```text
30 个商品
```

这时：

```text
每页 16 个
总共 2 页
```

Shopify 会根据筛选后的结果重新计算分页。

因此分页不是 Dawn 自己计算的，而是 Shopify 服务端生成的。

### 3. 为什么切换筛选条件时要回到第一页？

假设用户当前在第 6 页。

突然选择一个筛选条件，结果只有 10 个商品。

如果继续停留在第 6 页，就没有任何商品了。

因此，Shopify 提供的 `filter_value.url_to_add` 和 `url_to_remove` 会移除原有的分页参数。应用筛选条件后，通常从第一页开始。

### 4. Dawn 的分页是无刷新的吗？

这里有一个值得注意的区别。

Dawn 的筛选更新使用：

```js
fetch()
```

而 `pagination.liquid` 中的分页链接是普通：

```html
<a href="{{ paginate.next.url }}">
```

`facets.js` 并没有像筛选表单那样拦截这些分页链接。

因此，Dawn 默认点击下一页会进行正常页面导航。

这意味着：

| 操作 | 默认实现 |
|---|---|
| 修改筛选条件 | Ajax 局部更新 |
| 修改排序条件 | Ajax 局部更新 |
| 点击下一页 | 正常页面导航 |
| 点击浏览器返回 | popstate + Ajax 更新 |

如果你想实现真正的 Ajax 分页或 Infinite Scroll，需要在 Dawn 现有分页机制上继续扩展。

---

## 九、从性能角度看，Dawn 的筛选系统有哪些值得学习的设计？

这里总结几个值得你在实际开发中借鉴的点。

**1. 服务端筛选，避免前端加载全部商品**

商品数量很大时，不需要将整个集合的所有商品下载到浏览器，再进行筛选。

**2. Debounce 减少请求**

避免用户连续勾选多个条件时产生大量请求。

**3. Section Rendering**

只请求需要的 Section HTML，不必重新获取整个页面。

**4. 局部 DOM 更新**

不刷新 Header、Footer 等与筛选无关的页面区域。

**5. 筛选结果缓存**

Dawn 维护了：

```js
FacetFiltersForm.filterData
```

相同 URL 的筛选结果可以复用已获取的 HTML，减少重复网络请求。

**6. 浏览器历史记录**

通过 `pushState` 和 `popstate`，让无刷新筛选也拥有合理的浏览器导航体验。

**7. 筛选项动态更新**

筛选结果变化后，重新更新可选项、商品数量、禁用状态和已选筛选标签。

### 一个值得你注意的源码细节

Dawn 使用 debounce 控制请求频率，但 debounce 本身不等于并发请求管理。

如果用户连续操作，前一个请求还没有返回，后一个请求可能已经发出。

因此，如果你自己实现一套更复杂的筛选系统，可以进一步考虑：

- `AbortController` 取消过期请求。
- 请求序号校验，避免旧响应覆盖新结果。
- 对缓存设置合理的容量和清理策略。

这属于在 Dawn 现有实现之上的工程优化。

---

## 十、实际调试：建议你做三个实验

<box border radius="lg" padding={3} gap={3}>
  **实验 1：观察筛选参数**

  1. 打开一个 Dawn Collection 页面。
  2. 打开 DevTools → Network。
  3. 选择 Fetch/XHR。
  4. 勾选 Color。
  5. 查看请求 URL。

  重点观察：

  ```text
  section_id=...
  filter.v.option.color=...
  ```

  <divider color="subtle"/>
  **实验 2：观察 Section HTML**

  找到筛选请求，打开 Response。

  你应该看到 Shopify 返回的 HTML，而不是商品 JSON。

  尝试搜索：

  ```html
  id="ProductGridContainer"
  ```

  观察返回内容是否包含新的商品卡片和筛选项。

  <divider color="subtle"/>
  **实验 3：观察浏览器历史记录**

  连续选择两个筛选条件。

  然后点击浏览器返回按钮。

  在 `assets/facets.js` 的：

  ```js
  window.addEventListener('popstate', ...)
  ```

  设置断点。

  观察浏览器如何根据历史参数重新渲染页面。
</box>

---

## 十一、本课知识检验

{@body const questions=[{q:"Dawn 中具体的 Color、Material、Origin 筛选项主要在哪里配置？",opts:["main-collection-product-grid.liquid 的 Schema","Search & Discovery 应用","assets/facets.js","card-product.liquid"],a:1,why:"Search & Discovery 定义可用筛选源，Dawn 读取 collection.filters 并负责展示。"},{"q:"为什么 Dawn 使用 value.param_name，而不是直接写死 name='color'？",opts:["因为 HTML 不支持 color 字段","因为 Shopify 不同筛选源有不同的 URL 参数规范","因为 JavaScript 不支持固定名称"],a:1,why:"例如 Variant Option 和 Product Metafield 的参数格式不同，Liquid 返回的 param_name 才是正确参数名。"},{"q:"Dawn 点击筛选项后，商品是在哪里完成筛选的？",opts:["浏览器通过 Array.filter()","Dawn JavaScript 通过 DOM 查询","Shopify 服务端根据 URL 参数筛选并渲染 Liquid"],a:2,why:"Dawn 发送带筛选参数的 Section Rendering 请求，Shopify 服务端计算结果并返回 HTML。"},{"q:"Dawn 为什么使用 history.pushState？",opts:["让浏览器刷新页面","更新 URL 并保留返回、前进导航能力","把筛选结果保存到 Shopify 数据库"],a:1,why:"pushState 不会刷新页面，但会创建历史记录，popstate 则负责恢复历史筛选状态。"}]}
{@body const [answers,setAnswers]=DIL.useState({})}
{@body const [submitted,setSubmitted]=DIL.useState(false)}
<box border radius="lg" padding={3} gap={3}>
  <row justify="between" align="center">
    **第 10 课自测**
    <badge color="info">{Object.keys(answers).length}/4</badge>
  </row>
  {#each questions as q,i}
    <box gap={2}>
      **{i+1}. {q.q}**
      <radio-group direction="col" value={answers[i]===undefined?"":String(answers[i])} disabled={submitted} onChange={v=>setAnswers(old=>({...old,[i]:Number(v)}))}>
        {#each q.opts as opt,j}
          <radio value={String(j)}>{opt}</radio>
        {/each}
      </radio-group>
      {#if submitted}
        <box background="surface-secondary" padding={2} radius="md" gap={1}>
          <row align="center" gap={2}>
            {#if answers[i]===q.a}
              <icon name="check-circle-filled" color="success"/>
              **正确**
            {:else}
              <icon name="x-circle" color="danger"/>
              **正确答案：{q.opts[q.a]}**
            {/if}
          </row>
          <text color="secondary" size="sm">{q.why}</text>
        </box>
      {/if}
    </box>
    {#if i!==3}
      <divider color="subtle"/>
    {/if}
  {/each}
  {#if submitted}
    <title size="xl" color="success" tabularNums>{questions.filter((q,i)=>answers[i]===q.a).length}/4</title>
    <button block variant="outline" onClick={()=>{setAnswers({});setSubmitted(false)}}>重新作答</button>
  {:else}
    <button block disabled={Object.keys(answers).length!==4} onClick={()=>setSubmitted(true)}>提交答案</button>
  {/if}
</box>

## 参考资料

- [Liquid filters: sort_by](https://shopify.dev/docs/api/liquid/filters/sort_by)
- [Liquid objects: collection](https://shopify.dev/docs/api/liquid/objects/collection)
- [Collection URL parameters](https://shopify.dev/docs/api/hydrogen/latest/collections/collection-url-parameters)
- [Storefront filtering](https://shopify.dev/docs/storefronts/themes/navigation-search/filtering/storefront-filtering)
- [Filter - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/Filter)
- [collection](https://shopify.dev/docs/storefronts/themes/architecture/templates/collection)
- [Liquid objects: sort_option](https://shopify.dev/docs/api/liquid/objects/sort_option)
- [Filter - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/filter)
- [Liquid objects: filter](https://shopify.dev/docs/api/liquid/objects/filter)
- [Liquid objects: filter_value](https://shopify.dev/docs/api/liquid/objects/filter_value)
- [Support storefront filtering](https://shopify.dev/docs/storefronts/themes/navigation-search/filtering/storefront-filtering/support-storefront-filtering)
- [Shopify Help Center | Add storefront filtering](https://help.shopify.com/en/manual/online-store/themes/customizing-themes/common-customizations/storefront-filters)
- [Shopify Help Center | Adding filters with Shopify Search & Discovery](https://help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-filters)
- [Shopify Help Center | Storefront search](https://help.shopify.com/en/manual/online-store/storefront-search)
- [theme-liquid-docs/data/filters.json at main · Shopify/theme-liquid-docs · GitHub](https://github.com/Shopify/theme-liquid-docs/blob/main/data/filters.json)
- [horizon/snippets/filter-remove-buttons.liquid at main · Shopify/horizon · GitHub](https://github.com/Shopify/horizon/blob/main/snippets/filter-remove-buttons.liquid)
- [liquid-skills/skills/shopify-liquid-themes/references/objects-tier2.md at main · benjaminsehl/liquid-skills · GitHub](https://github.com/benjaminsehl/liquid-skills/blob/main/skills/shopify-liquid-themes/references/objects-tier2.md)
- [Shopify Cheat Sheet — A resource for building Shopify Themes with Liquid - Shopify](https://www.shopify.com/partners/shopify-cheat-sheet)
- [Storefront filtering - OURSELVES](https://ourselves.featurebase.app/help/articles/3123111-storefront-filtering)
- [Liquid objects: filter](https://shopify-dev.shopifycloud.com/docs/api/liquid/objects/filter)
- [Liquid objects: filter_value](https://shopify-dev.shopifycloud.com/docs/api/liquid/objects/filter_value)
- [Support storefront filtering](https://shopify-dev.shopifycloud.com/docs/storefronts/themes/navigation-search/filtering/storefront-filtering/support-storefront-filtering)
- [Liquid objects: filter](https://shopify--dev.storefront-preview-proxy.getredo.com/docs/api/liquid/objects/filter)
- [Filter](https://developers.finqu.com/reference/liquid/objects/store/filter)
- [filter | Shoplazza Developer Documentation](https://www.shoplazza.dev/docs/theme/references/liquid/objects/filter)
