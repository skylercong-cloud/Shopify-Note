# Predictive Search：实时搜索建议的完整实现


上一课研究了 Collection 的筛选、排序和分页。

这节课进入 Dawn 的搜索系统，重点研究 **Predictive Search（预测搜索）**。

先明确我们要研究的场景：

用户打开 Shopify 商城，点击搜索框，输入：

```text
iph
```

此时不需要按回车，页面就可能出现：

- Products：iPhone 相关商品
- Queries：相关搜索建议
- Collections：相关集合
- Pages：相关页面

用户继续输入：

```text
iphone 16
```

搜索建议会再次更新。

这套功能看起来简单，但实际上涉及输入事件、防抖、异步请求、Section Rendering、HTML 解析、DOM 更新、键盘交互以及请求竞态处理。

我们按照 Dawn 的真实源码，把它完整拆开。

## 一、先看源码：搜索系统由哪些文件组成？

这次我们主要研究 5 个文件。

| 文件 | 职责 |
|---|---|
| `layout/theme.liquid` | 加载搜索 JS、注册路由 |
| `assets/search-form.js` | 搜索表单基础交互 |
| `assets/predictive-search.js` | 预测搜索核心逻辑 |
| `sections/predictive-search.liquid` | 预测搜索结果 HTML |
| `snippets/header-search.liquid` | Header 搜索框及弹窗 |

另外还有：

- `sections/main-search.liquid`：完整搜索结果页。
- `config/settings_schema.json`：预测搜索相关主题设置。

可以直接打开：

- <Link url="https://github.com/Shopify/dawn/blob/main/assets/search-form.js" title="search-form.js"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/assets/predictive-search.js" title="predictive-search.js"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/sections/predictive-search.liquid" title="predictive-search.liquid"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/snippets/header-search.liquid" title="header-search.liquid"/>

我们先建立一个整体架构：

<box border radius="lg" padding={3} gap={2}>
  <title size="lg">Dawn 搜索系统架构</title>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **搜索输入框**

    <text color="secondary" size="xs">header-search.liquid / main-search.liquid</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **SearchForm**

    <text color="secondary" size="xs">search-form.js · 输入监听、防抖、重置</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface" border={{size:1,color:"#16A34A"}} radius="md" padding={3} align="center">
    **PredictiveSearch**

    <badge color="success">核心控制器</badge>
    <text color="secondary" size="xs">predictive-search.js</text>
    <text color="secondary" size="xs">请求、缓存、键盘交互、结果展示</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **Shopify Predictive Search API**

    <text color="secondary" size="xs">/search/suggest</text>
    <text color="secondary" size="xs">服务端搜索与 Liquid 渲染</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **predictive-search.liquid**

    <text color="secondary" size="xs">生成商品、集合、搜索建议等 HTML</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **DOMParser + innerHTML**

    <text color="secondary" size="xs">将结果插入搜索建议区域</text>
  </box>
</box>

---

## 二、第一步：Dawn 是怎么初始化 Predictive Search 的？

打开 `layout/theme.liquid`。

你会看到：

```liquid
<script
  src="{{ 'search-form.js' | asset_url }}"
  defer="defer"
></script>

{% if settings.predictive_search_enabled %}
  <script
    src="{{ 'predictive-search.js' | asset_url }}"
    defer="defer"
  ></script>
{% endif %}
```

这里有一个值得学习的设计。

### 1. 为什么有两个 JS 文件？

`search-form.js` 定义了基础类：

```js
class SearchForm extends HTMLElement {
  // ...
}

customElements.define('search-form', SearchForm);
```

`predictive-search.js` 则继承它：

```js
class PredictiveSearch extends SearchForm {
  // ...
}

customElements.define(
  'predictive-search',
  PredictiveSearch
);
```

这意味着：

**PredictiveSearch 是一个具备 SearchForm 基础能力的增强型组件。**

当主题关闭预测搜索时：

```liquid
<search-form>
  ...
</search-form>
```

只提供普通搜索表单交互。

当开启预测搜索时：

```liquid
<predictive-search>
  ...
</predictive-search>
```

则启用完整的预测搜索能力。

这种渐进增强（Progressive Enhancement）的思想值得借鉴。

### 2. 主题设置在哪里？

打开 `config/settings_schema.json`，找到 Search behavior 相关配置。

主要有：

```json
{
  "id": "predictive_search_enabled",
  "type": "checkbox",
  "default": true
}
```

以及：

```text
predictive_search_show_vendor
predictive_search_show_price
```

这几个设置分别控制：

- 是否启用预测搜索。
- 商品建议是否展示 Vendor。
- 商品建议是否展示价格。

注意，这些属于 Theme 设置。

Shopify Search & Discovery 中的 Search settings 则负责搜索资源类型等搜索行为配置。

两者不要混淆。

---

## 三、第二步：SearchForm 如何监听输入？

打开 `assets/search-form.js`。

这是整个搜索系统的基础类。

```js
class SearchForm extends HTMLElement {

  constructor() {
    super();

    this.input = this.querySelector(
      'input[type="search"]'
    );

    this.resetButton = this.querySelector(
      'button[type="reset"]'
    );

    if (this.input) {

      this.input.form.addEventListener(
        'reset',
        this.onFormReset.bind(this)
      );

      this.input.addEventListener(
        'input',
        debounce((event) => {
          this.onChange(event);
        }, 300).bind(this)
      );
    }
  }
}
```

重点看：

```js
this.input.addEventListener(
  'input',
  debounce((event) => {
    this.onChange(event);
  }, 300).bind(this)
);
```

这里有一个 300ms 的防抖。

假设用户输入：

```text
i
ip
iph
ipho
iphon
iphone
```

浏览器会产生多次 `input` 事件。

但如果每次都发送请求，就会产生大量无效请求。

防抖后，只有用户停止输入 300ms，才执行一次 `onChange()`。

<box border radius="lg" padding={3} gap={2}>
  **输入事件与防抖时间线**
  <text color="secondary" size="xs">示意：用户连续输入，每次间隔小于 300ms</text>
  {#each [{t:"0ms",v:"i"},{t:"100ms",v:"ip"},{t:"180ms",v:"iph"},{t:"260ms",v:"ipho"},{t:"350ms",v:"iphon"},{t:"430ms",v:"iphone"}] as item}
    <row align="center" gap={2}>
      <text color="secondary" tabularNums width="65px" size="xs">{item.t}</text>
      <box flex="1" background="surface-tertiary" height="9px" radius="full"/>
      <text weight="medium" width="65px">{item.v}</text>
    </row>
  {/each}
  <divider color="subtle"/>
  <row align="center" gap={2}>
    <icon name="clock" color="success"/>
    **730ms：停止输入 300ms 后，执行一次搜索**
  </row>
</box>

这里还有一个非常有意思的 JavaScript 继承细节。

父类 `SearchForm` 监听的是：

```js
this.onChange(event)
```

而不是直接调用某个固定函数。

因为子类 `PredictiveSearch` 重写了 `onChange()`：

```js
class PredictiveSearch extends SearchForm {

  onChange() {

    super.onChange();

    // 预测搜索逻辑

  }

}
```

因此，父类负责监听输入和防抖，实际执行的却是子类的搜索逻辑。

这就是 JavaScript 中的动态方法分派。

---

## 四、第三步：PredictiveSearch.onChange 做了什么？

打开 `assets/predictive-search.js`。

```js
onChange() {

  super.onChange();

  const newSearchTerm = this.getQuery();

  if (
    !this.searchTerm ||
    !newSearchTerm.startsWith(this.searchTerm)
  ) {

    this.querySelector(
      '#predictive-search-results-groups-wrapper'
    )?.remove();

  }

  this.updateSearchForTerm(
    this.searchTerm,
    newSearchTerm
  );

  this.searchTerm = newSearchTerm;

  if (!this.searchTerm.length) {

    this.close(true);

    return;

  }

  this.getSearchResults(this.searchTerm);

}
```

我们逐行看。

### 1. 获取当前搜索词

```js
getQuery() {

  return this.input.value.trim();

}
```

例如：

```text
" iphone "
```

会被处理成：

```text
"iphone"
```

### 2. 为什么判断 startsWith？

这部分很值得研究：

```js
if (
  !this.searchTerm ||
  !newSearchTerm.startsWith(this.searchTerm)
) {
  // 删除之前的结果
}
```

假设：

第一次输入：

```text
iph
```

第二次输入：

```text
iphone
```

新关键词以旧关键词开头。

因此 Dawn 暂时保留旧搜索结果，避免搜索框下面突然变空。

但如果用户删除字符：

```text
iphone
```

变成：

```text
iph
```

新关键词不再以旧关键词开头。

Dawn 就会删除旧的结果组，避免用户看到与当前输入不匹配的内容。

这是一个用户体验层面的优化。

### 3. 为什么 updateSearchForTerm 要单独存在？

搜索结果还没有返回时，Dawn 就先更新底部的搜索按钮文字。

例如：

```text
Search for "iph"
```

变成：

```text
Search for "iphone"
```

不需要等待服务器返回。

这样输入框和下方的搜索提示能够保持同步。

### 4. 空字符串直接关闭

```js
if (!this.searchTerm.length) {
  this.close(true);
  return;
}
```

用户清空输入框后：

- 关闭下拉面板。
- 清理搜索状态。
- 不再发起搜索请求。

---

## 五、第四步：Predictive Search 到底请求了什么 API？

这是本课最核心的部分。

看 `getSearchResults()`：

```js
getSearchResults(searchTerm) {

  const queryKey = searchTerm
    .replace(' ', '-')
    .toLowerCase();

  this.setLiveRegionLoadingState();

  if (this.cachedResults[queryKey]) {

    this.renderSearchResults(
      this.cachedResults[queryKey]
    );

    return;
  }

  fetch(
    `${routes.predictive_search_url}` +
    `?q=${encodeURIComponent(searchTerm)}` +
    `&section_id=predictive-search`
  )
    .then(response => response.text())
    .then(text => {

      // 解析 HTML

    });

}
```

这里最重要的是：

```js
routes.predictive_search_url
```

它来自 `layout/theme.liquid` 中定义的全局路由：

```liquid
predictive_search_url:
  '{{ routes.predictive_search_url }}'
```

也就是说，Shopify 已经为 Theme 提供了预测搜索专用路由。

请求形式：

```http
GET /search/suggest?q=iphone&section_id=predictive-search
```

注意，它不是：

```http
GET /search?q=iphone
```

也不是：

```http
GET /search/suggest.json?q=iphone
```

它请求的是 Shopify 的 Predictive Search HTML 接口。

### 1. Shopify 为什么提供两个接口？

Shopify Predictive Search 实际上有两种返回形式：

| 接口 | 返回内容 | 常见用途 |
|---|---|---|
| `/search/suggest.json` | JSON | 自己编写前端 UI |
| `/search/suggest` + `section_id` | Section HTML | 使用 Liquid 渲染 UI |

Dawn 选择第二种。

原因很简单：

Shopify 可以在服务端直接执行 Liquid，将搜索结果转换成最终 HTML。

前端不需要自己处理商品数据、价格格式、图片地址、翻译文本等。

官方文档：<Link ref="turn929396search0" title="Predictive Search API reference"/>。

### 2. 搜索结果类型在哪里配置？

Shopify Predictive Search 支持：

- Products
- Collections
- Pages
- Articles
- Query suggestions

API 可以通过：

```text
resources[type]
```

指定资源类型。

例如：

```text
resources[type]=product,collection
```

但你仔细看 Dawn 的请求：

```js
fetch(
  `${routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&section_id=predictive-search`
);
```

它没有传 `resources[type]`。

为什么？

因为 Shopify 有默认搜索资源配置，Search & Discovery 的 Search settings 可以调整相关搜索资源类型。

默认资源类型包括：

```text
query, product, collection, page
```

文章需要相应地启用。

此外，API 还支持：

```text
resources[limit]
resources[limit_scope]
resources[options][unavailable_products]
```

其中结果数量限制最大为 10，具体如何分配由 `limit_scope` 控制。

所以 Dawn 并没有自行控制这些参数，而是把搜索行为交给 Shopify 的配置层。

### 3. Shopify 到底根据什么匹配商品？

这是另外一个值得了解的知识点。

商品搜索并不只是匹配标题。

Shopify 的 Predictive Search 会根据多个商品属性匹配：

| 属性 | 是否参与商品搜索 |
|---|---|
| title | 是 |
| body | 是 |
| product_type | 是 |
| tag | 是 |
| vendor | 是 |
| variants.title | 是 |
| variants.sku | 是 |
| variants.barcode | 是 |
| Product Category | 是 |

而且支持一定程度的：

- 部分单词匹配。
- 拼写错误容忍。
- 变体标题匹配。

例如用户输入：

```text
cofee
```

也可能匹配到：

```text
Coffee
```

所以这里不是 Dawn 自己实现的模糊搜索算法，而是 Shopify 搜索引擎在完成匹配。

---

## 六、第五步：Shopify 服务端返回的究竟是什么？

现在进入 Liquid。

打开：

[sections/predictive-search.liquid](https://github.com/Shopify/dawn/blob/main/sections/predictive-search.liquid)

首先看：

```liquid
{%- if predictive_search.performed -%}

  ...

{%- endif -%}
```

这里有一个很重要的 Liquid 对象：

```liquid
predictive_search
```

它不是普通页面渲染时就一定有完整搜索结果的对象。

官方文档明确说明：只有通过 Predictive Search API 和 Section Rendering API 渲染对应 Section 时，`predictive_search` 才会提供相应的查询结果。

这意味着：

普通页面第一次加载时：

```liquid
predictive_search.performed
```

可能是 `false`。

当浏览器发起：

```http
GET /search/suggest?q=iphone&section_id=predictive-search
```

Shopify 才会在这次 Section 渲染过程中提供搜索结果。

### 1. predictive_search 对象结构

可以先这样理解：

```js
predictive_search = {
  performed: true,

  terms: 'iphone',

  resources: {
    queries: [],
    products: [],
    collections: [],
    pages: [],
    articles: []
  }
}
```

这是用于理解的简化示意结构。

注意，Dawn 当前源码直接使用了：

```liquid
predictive_search.resources.queries
predictive_search.resources.products
predictive_search.resources.collections
predictive_search.resources.pages
predictive_search.resources.articles
```

### 2. Dawn 如何组织搜索结果？

它并不是简单地将所有结果混在一起。

而是分组展示。

例如：

<box border radius="lg" padding={3} gap={3}>
  <title size="lg">Search suggestions</title>
  **Suggestions**
  <box background="surface-secondary" radius="md" padding={2}>
    <row align="center" gap={2}>
      <icon name="search" color="secondary"/>
      iphone 16
    </row>
    <divider color="subtle"/>
    <row align="center" gap={2}>
      <icon name="search" color="secondary"/>
      iphone case
    </row>
  </box>
  **Collections**
  <box background="surface-secondary" radius="md" padding={2}>
    iPhone Accessories
  </box>
  **Products**
  <row gap={3}>
    <LessonImage src="assets/fill/img-31.jpg" alt="iPhone smartphone product isolated white background"/>
    <box flex="1" gap={1}>
      **iPhone 16**

      <text color="secondary" size="xs">Apple</text>
      $799.00
    </box>
  </row>
  <row gap={3}>
    <LessonImage src="assets/fill/img-32.jpg" alt="iPhone protective phone case product photography"/>
    <box flex="1" gap={1}>
      **iPhone 16 Case**

      <text color="secondary" size="xs">Accessories</text>
      $29.00
    </box>
  </row>
  <divider color="subtle"/>
  <row align="center" justify="between">
    **Search for "iphone"**
    <icon name="arrow-right"/>
  </row>
  <caption color="secondary">示意图：Dawn Predictive Search 的分组布局，不代表真实商店的搜索结果。</caption>
</box>

对应 Liquid：

```liquid
{% for query in predictive_search.resources.queries %}
  {{ query.styled_text }}
{% endfor %}

{% for collection in predictive_search.resources.collections %}
  {{ collection.title }}
{% endfor %}

{% for product in predictive_search.resources.products %}
  {{ product.title }}
{% endfor %}
```

文章和页面也使用类似方式遍历。

### 3. 为什么 Article 和 Page 会重复输出两次？

仔细观察源码：

```text
predictive-search-results-pages-list-desktop
predictive-search-results-pages-list-mobile
```

你会发现 Page 和 Article 被分别输出了两份。

这是为了适配桌面端和移动端不同的 UI 布局。

通过 CSS 控制不同设备显示哪一份。

这也解释了后面键盘交互中为什么需要过滤隐藏元素。

### 4. 商品图片和价格怎么处理？

商品部分：

```liquid
{% for product in predictive_search.resources.products %}

  {% if product.featured_media != blank %}

    <img
      src="{{ product.featured_media | image_url: width: 150 }}"
      alt="{{ product.featured_media.alt | escape }}"
    >

  {% endif %}

  {{ product.title | escape }}

  {% if settings.predictive_search_show_price %}

    {% render 'price',
      product: product,
      use_variant: true,
      show_badges: false
    %}

  {% endif %}

{% endfor %}
```

这里又复用了 Dawn 的：

```liquid
snippets/price.liquid
```

所以商品价格的展示逻辑不需要在搜索模块中重新开发。

这就是 Dawn Snippet 复用的价值。

---

## 七、第六步：前端怎么接收和渲染结果？

回到：

`assets/predictive-search.js`

看这一段：

```js
fetch(url)
  .then(response => {

    if (!response.ok) {
      throw new Error(response.status);
    }

    return response.text();

  })
  .then(text => {

    const resultsMarkup = new DOMParser()
      .parseFromString(text, 'text/html')
      .querySelector(
        '#shopify-section-predictive-search'
      )
      .innerHTML;

    this.renderSearchResults(resultsMarkup);

  });
```

这里是我们上一课学过的 Section Rendering 思路。

### 1. 为什么使用 DOMParser？

因为返回的是 HTML 字符串。

假设 Shopify 返回：

```html
<div id="shopify-section-predictive-search">

  <div id="predictive-search-results">

    <ul>
      <li>iPhone 16</li>
      <li>iPhone 16 Pro</li>
    </ul>

  </div>

</div>
```

前端需要将字符串转换成可操作的 DOM：

```js
const document = new DOMParser()
  .parseFromString(html, 'text/html');
```

然后找到：

```js
document.querySelector(
  '#shopify-section-predictive-search'
);
```

取出内部 HTML。

### 2. 为什么不直接替换整个 Section？

因为当前页面的搜索框和下拉面板已经存在。

Dawn 只需要替换：

```html
<div data-predictive-search>
  ...
</div>
```

对应的内部内容。

实现：

```js
renderSearchResults(resultsMarkup) {

  this.predictiveSearchResults.innerHTML =
    resultsMarkup;

  this.setAttribute('results', true);

  this.setLiveRegionResults();

  this.open();

}
```

没有刷新整个页面，也没有重新创建搜索组件本身。

### 3. 为什么缓存 HTML，而不是缓存 JSON？

Dawn 中：

```js
this.cachedResults = {};
```

拿到结果后：

```js
this.allPredictiveSearchInstances.forEach(
  (predictiveSearchInstance) => {

    predictiveSearchInstance.cachedResults[queryKey] =
      resultsMarkup;

  }
);
```

这里有两个值得注意的设计。

第一，缓存的是 HTML 字符串。

第二，所有 PredictiveSearch 实例共享搜索结果缓存。

假设页面有：

- Header 搜索框。
- 搜索结果页搜索框。

当 Header 搜索框已经搜索过 `iphone`，另一个搜索框再次搜索 `iphone`，就可以直接复用缓存。

缓存命中时：

```js
if (this.cachedResults[queryKey]) {

  this.renderSearchResults(
    this.cachedResults[queryKey]
  );

  return;

}
```

直接渲染，不需要重新请求 Shopify。

不过要注意：

这只是当前页面生命周期内的内存缓存，并不是 LocalStorage 或 IndexedDB 持久化缓存。

---

## 八、第七步：键盘上下键是怎么实现的？

这是 Predictive Search 中非常值得前端工程师研究的部分。

我们平时使用搜索框：

1. 输入关键词。
2. 按 ArrowDown。
3. 选中第一个结果。
4. 再按 ArrowDown。
5. 选中第二个结果。
6. 按 Enter。
7. 跳转到对应商品。

这套逻辑在：

```js
onKeyup(event) {

  switch (event.code) {

    case 'ArrowUp':
      this.switchOption('up');
      break;

    case 'ArrowDown':
      this.switchOption('down');
      break;

    case 'Enter':
      this.selectOption();
      break;

  }

}
```

### 1. 如何知道当前选中了哪一个？

Dawn 使用：

```html
aria-selected="true"
```

例如：

```html
<li
  role="option"
  aria-selected="false"
>
  <a href="/products/iphone-16">
    iPhone 16
  </a>
</li>
```

用户按下 ArrowDown 后：

```html
<li
  role="option"
  aria-selected="true"
>
```

就代表当前选中了这个选项。

### 2. switchOption 如何工作？

源码核心：

```js
const selectedElement =
  this.querySelector('[aria-selected="true"]');

const allVisibleElements = Array.from(
  this.querySelectorAll(
    'li, button.predictive-search__item'
  )
).filter(
  element => element.offsetParent !== null
);
```

这里：

```js
element.offsetParent !== null
```

非常值得注意。

为什么？

因为 Dawn 有些搜索结果在桌面端和移动端分别输出了两份。

其中一份会被 CSS 隐藏。

如果键盘遍历所有 DOM 元素，就可能选中用户根本看不到的选项。

所以需要先过滤隐藏元素。

然后计算当前选项的索引：

```js
activeElementIndex =
  selectedElementIndex + 1;
```

更新选中状态：

```js
activeElement.setAttribute(
  'aria-selected',
  true
);
```

同时更新：

```js
this.input.setAttribute(
  'aria-activedescendant',
  activeElement.id
);
```

### 3. 为什么使用 aria-activedescendant？

这涉及 Web Accessibility（无障碍访问）。

搜索框采用：

```html
role="combobox"
```

搜索结果采用：

```html
role="listbox"
```

每个结果采用：

```html
role="option"
```

而：

```html
aria-activedescendant
```

告诉辅助技术：

当前搜索框关联的活动选项是哪一个。

它与普通的焦点切换不一样。

用户按上下键时，焦点仍然留在搜索输入框上，只是活动选项发生变化。

这是标准的 Combobox/Listbox 交互模式。



### 4. Enter 如何选择结果？

```js
selectOption() {

  const selectedOption = this.querySelector(
    '[aria-selected="true"] a, button[aria-selected="true"]'
  );

  if (selectedOption) {
    selectedOption.click();
  }

}
```

非常简单。

找到当前选中的链接或按钮，直接触发点击。

如果选中的是商品链接，就跳转商品详情页。

如果选中的是底部 Search for 按钮，则进入完整搜索结果页。

---

## 九、第八步：搜索结果加载和下拉框高度

还有两个容易忽略的小细节。

### 1. Loading 状态

```js
setLiveRegionLoadingState() {

  this.statusElement =
    this.statusElement ||
    this.querySelector('.predictive-search-status');

  this.setLiveRegionText(
    this.loadingText
  );

  this.setAttribute('loading', true);

}
```

这里除了展示 Loading，还会更新：

```html
role="status"
```

对应的屏幕阅读器提示。

结果加载完成后：

```js
setLiveRegionResults() {

  this.removeAttribute('loading');

  this.setLiveRegionText(
    this.querySelector(
      '[data-predictive-search-live-region-count-value]'
    ).textContent
  );

}
```

因此，Dawn 不只是视觉上展示搜索结果，还考虑了无障碍体验。

### 2. 搜索面板最大高度

```js
getResultsMaxHeight() {

  this.resultsMaxHeight =
    window.innerHeight -
    document
      .querySelector('.section-header')
      ?.getBoundingClientRect()
      .bottom;

  return this.resultsMaxHeight;

}
```

计算方式：

\[
最大高度 = 视口高度 - Header底部位置
\]

这样搜索结果下拉面板就不会无限向下延伸，超出浏览器可视区域。

---

## 十、第九步：性能分析——Dawn 的实现有哪些优点和不足？

这是本课我特别希望你掌握的内容。

### 1. Dawn 的性能优化

| 优化手段 | 解决的问题 |
|---|---|
| 300ms Debounce | 减少请求数量 |
| HTML 缓存 | 避免重复请求 |
| Section Rendering | 减少响应内容 |
| 服务端搜索 | 不需要前端下载全部商品 |
| 限制建议数量 | 减少 DOM 节点 |
| Loading 状态 | 改善等待体验 |
| 动态最大高度 | 控制下拉面板布局 |

### 2. 一个值得注意的问题：请求竞态

这里我要带你深入看一个源码细节。

Dawn 初始化了：

```js
this.abortController = new AbortController();
```

请求时：

```js
fetch(url, {
  signal: this.abortController.signal
});
```

你可能会认为：

用户输入新关键词时，旧请求就会被取消。

但实际上，**当前这份 Dawn 源码并没有在每次输入新关键词时取消旧请求。**

我们继续查找：

```js
onFormReset(event) {

  super.onFormReset(event);

  if (super.shouldResetForm()) {

    this.searchTerm = '';

    this.abortController.abort();

    this.abortController =
      new AbortController();

    this.closeResults(true);

  }

}
```

你会发现，`abort()` 只在表单重置时调用。

而不是每次输入新关键词时调用。

这就存在一种理论上的竞态：

<box border radius="lg" padding={3} gap={3}>
  **请求竞态示例**
  <text color="secondary" size="xs">假设用户先后输入两个关键词，网络响应顺序与请求顺序不同</text>
  <box gap={1}>
    **请求 A：iphone**
    <row align="center" gap={2}>
      <badge color="info">先发出</badge>
      <box flex="1" height="8px" background="surface-tertiary" radius="full"/>
      <text size="xs" color="secondary">耗时 800ms</text>
    </row>
  </box>
  <box gap={1}>
    **请求 B：iphone 16**
    <row align="center" gap={2}>
      <badge color="success">后发出</badge>
      <box flex="1" height="8px" background="surface-tertiary" radius="full"/>
      <text size="xs" color="secondary">耗时 200ms</text>
    </row>
  </box>
  <divider color="subtle"/>
  <list connector="solid" marker="number" gap={2}>
    <list-item>
      B 先返回，页面显示 `iphone 16` 的结果。
    </list-item>
    <list-item>
      A 后返回，页面又显示 `iphone` 的结果。
    </list-item>
  </list>
  <badge color="danger">旧请求覆盖新结果</badge>
</box>

当然，实际发生的概率取决于网络和请求耗时，但从代码结构上看，确实存在这个风险。

### 3. 如果我们自己实现，应该怎么优化？

可采用以下方式：

- AbortController 取消旧请求。
- 请求序号校验，防止旧响应覆盖新响应。

例如：

```js
class BetterPredictiveSearch {

  constructor() {
    this.abortController = null;
    this.requestId = 0;
  }

  async search(keyword) {

    // 取消旧请求
    this.abortController?.abort();

    this.abortController =
      new AbortController();

    const controller = this.abortController;

    // 当前请求序号
    const requestId = ++this.requestId;

    try {

      const response = await fetch(
        `/search/suggest?q=${encodeURIComponent(keyword)}&section_id=predictive-search`,
        {
          signal: controller.signal
        }
      );

      const html = await response.text();

      // 只允许最新请求更新 DOM
      if (requestId !== this.requestId) {
        return;
      }

      this.render(html);

    } catch (error) {

      if (error.name === 'AbortError') {
        return;
      }

      console.error(error);

    }

  }

  render(html) {
    // 更新搜索结果
  }

}
```

这段是我们自己的优化示例，不是 Dawn 原代码。

这里最关键的是：

```js
if (requestId !== this.requestId) {
  return;
}
```

即使旧请求已经返回，也不允许它更新 DOM。

这是一种非常实用的异步请求管理方式，在搜索、自动补全、联想查询、远程下拉框中都能用到。

---

## 十一、完整执行时间线

现在把整个系统串起来。

假设用户在 Header 搜索框中输入 `iphone`。

<box border radius="lg" padding={3} gap={2}>
  <title size="lg">Predictive Search 完整执行流程</title>
  <list connector="solid" marker="number" gap={3}>
    <list-item>
      **HTML 初始化**

      浏览器解析 `<predictive-search>`，创建自定义元素实例。
    </list-item>
    <list-item>
      **SearchForm 监听输入**

      监听 input，300ms 防抖。
    </list-item>
    <list-item>
      **PredictiveSearch.onChange**

      读取关键词，更新搜索状态。
    </list-item>
    <list-item>
      **getSearchResults**

      检查缓存，缓存未命中则发起请求。
    </list-item>
    <list-item>
      **Shopify 搜索引擎**

      根据关键词匹配商品、集合、页面、文章和搜索建议。
    </list-item>
    <list-item>
      **Shopify Liquid**

      使用 `predictive_search` 对象渲染 `sections/predictive-search.liquid`。
    </list-item>
    <list-item>
      **返回 HTML**

      浏览器获取 Section HTML 字符串。
    </list-item>
    <list-item>
      **DOMParser**

      提取 `shopify-section-predictive-search` 内部 HTML。
    </list-item>
    <list-item>
      **renderSearchResults**

      更新下拉面板、Loading 状态和无障碍提示。
    </list-item>
    <list-item>
      **用户选择结果**

      点击建议链接跳转，或者提交完整搜索表单。
    </list-item>
  </list>
  <badge color="success">Predictive Search 完成</badge>
</box>

## 十二、动手实验：建议你在自己的 Dawn 项目中验证

这次有四个实验。

<box border radius="lg" padding={3} gap={3}>
  **实验 1：确认 API 请求**

  打开 DevTools → Network → Fetch/XHR。

  输入关键词，观察：

  ```text
  /search/suggest?q=iphone&section_id=predictive-search
  ```

  重点查看 Response，确认返回的是 HTML，而不是 JSON。

  <divider color="subtle"/>
  **实验 2：研究 Liquid 数据**

  打开：

  `sections/predictive-search.liquid`

  尝试理解：

  ```liquid
  predictive_search.performed
  predictive_search.terms
  predictive_search.resources.products
  predictive_search.resources.collections
  ```

  <divider color="subtle"/>
  **实验 3：研究键盘交互**

  在 `switchOption()` 设置断点。

  按上下键，观察：

  ```js
  aria-selected
  aria-activedescendant
  ```

  <divider color="subtle"/>
  **实验 4：验证请求竞态**

  在 Network 中使用 Slow 3G 网络模拟。

  快速输入不同关键词，观察请求返回顺序与最终展示结果是否一致。

  进一步尝试自己增加 AbortController 和请求序号控制。
</box>

---

## 十三、本课需要真正掌握的知识

这节课有几个关键点，我帮你提炼一下：

1. Predictive Search 和完整搜索页面是两套不同的请求流程。
2. Dawn 使用 Shopify 的 `/search/suggest` 接口，而不是自己查询商品数据。
3. Dawn 选择 HTML Section Rendering，而不是 JSON。
4. `predictive_search` 是在对应的预测搜索 Section 请求中提供的 Liquid 对象。
5. `SearchForm` 负责基础表单行为，`PredictiveSearch` 通过继承扩展搜索功能。
6. Dawn 使用 HTML 缓存、Debounce 和 DOM 局部更新优化性能。
7. 键盘交互使用 ARIA Combobox/Listbox 模式。
8. 异步请求必须考虑竞态，不能只依赖防抖。

**特别值得记住的是第 3 点：**

Shopify Theme 开发中，你会越来越多地看到一种模式：

```text
前端发起请求
    ↓
Shopify 服务端执行 Liquid
    ↓
返回 HTML
    ↓
前端解析 HTML
    ↓
更新局部 DOM
```

这是一种区别于传统 SPA 的重要开发模式。

## 参考资料

- [Predictive Search API reference](https://shopify.dev/docs/api/ajax/reference/predictive-search)
- [Liquid objects: predictive_search](https://shopify.dev/docs/api/liquid/objects/predictive_search)
- [predictiveSearch - Storefront API](https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch)
- [predictiveSearch - Storefront API](https://shopify.dev/docs/api/storefront/2027-01/queries/predictiveSearch)
- [predictiveSearch - Storefront API](https://shopify.dev/docs/api/storefront/2026-01/queries/predictiveSearch)
- [predictiveSearch - Storefront API](https://shopify.dev/docs/api/storefront/latest/queries/predictivesearch)
- [Liquid objects: predictive_search_resources](https://shopify.dev/docs/api/liquid/objects/predictive_search_resources)
- [Add predictive search to your theme](https://shopify.dev/docs/storefronts/themes/navigation-search/search/predictive-search)
- [predictiveSearch - Storefront API](https://shopify-dev.shopifycloud.com/docs/api/storefront/latest/queries/predictiveSearch)
- [Predictive Search API reference](https://shopify-dev.shopifycloud.com/docs/api/ajax/reference/predictive-search)
- [Shopify Help Center | Predictive search](https://help.shopify.com/en/manual/online-store/storefront-search/predictive-search)
