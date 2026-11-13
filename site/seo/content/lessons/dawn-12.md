# Product 页面核心架构：从选择 Variant 到完成加购


这节课进入 Shopify Theme 开发中非常核心的模块：**商品详情页（Product Page）**。

前面学习了 Shopify 的产品、Variant、Metafields 等数据模型，也研究了加购、购物车和 Section Rendering 的基本原理。

现在我们把这些知识放回 Dawn 的真实源码中。

本课重点不是简单地认识几个 Liquid 文件，而是搞清楚一个完整的业务过程：

用户进入商品详情页，选择颜色、尺码，页面上的商品图片、价格、库存、SKU、URL 随之变化，最后点击 Add to Cart。

**这一连串操作究竟是如何实现的？**

先看一个典型场景：

<box border radius="lg" padding={3} gap={3}>
  <row align="start" gap={3}>
    <LessonImage src="assets/fill/img-33.jpg" alt="minimal white cotton t shirt ecommerce product photography front view"/>
    <box flex="1" gap={1}>
      **Classic Cotton T-Shirt**

      <title size="xl" color="default">$29.00</title>
      <text color="secondary" size="xs">SKU: TSH-WHT-S</text>
      <badge color="success">In stock</badge>
    </box>
  </row>
  **Color**
  <row gap={2}>
    <badge color="success">White</badge>
    <badge>Black</badge>
    <badge>Blue</badge>
  </row>
  **Size**
  <row gap={2}>
    <badge color="success">S</badge>
    <badge>M</badge>
    <badge>L</badge>
  </row>
  <divider color="subtle"/>
  <text color="secondary" size="xs">假设用户切换为 Black / M</text>
  <row align="center" justify="between">
    **商品价格**
    **$32.00**
  </row>
  <row align="center" justify="between">
    **SKU**
    **TSH-BLK-M**
  </row>
  <row align="center" justify="between">
    **库存**
    <badge color="success">In stock</badge>
  </row>
  <row align="center" justify="between">
    **当前 Variant ID**
    <text tabularNums>456789012</text>
  </row>
  <box background="surface-secondary" radius="md" padding={2}>
    <row align="center" justify="center" gap={2}>
      <icon name="shopping-cart"/>
      **Add to cart**
    </row>
  </box>
  <caption color="secondary">交互示意图，价格、SKU 和 Variant ID 为演示数据。</caption>
</box>

这里其实发生了一个很重要的事情：

**用户选择的不是简单的颜色和尺码，而是在选择一个具体的 Product Variant。**

页面需要根据这个 Variant 同步更新相关信息。

---

## 一、先认识商品详情页的核心文件

打开 Dawn 源码，我们主要关注下面这些文件：

| 文件 | 作用 |
|---|---|
| `sections/main-product.liquid` | 商品详情页的主 Section |
| `snippets/product-variant-picker.liquid` | Variant 选择器 |
| `snippets/product-variant-options.liquid` | 颜色、尺码等选项的 HTML |
| `snippets/product-media-gallery.liquid` | 商品图片和媒体画廊 |
| `snippets/buy-buttons.liquid` | 加购和动态结账按钮 |
| `assets/global.js` | VariantSelects 等通用组件 |
| `assets/product-info.js` | Variant 切换及商品信息更新 |
| `assets/product-form.js` | 加购请求和购物车更新 |

源码链接：

- <Link url="https://github.com/Shopify/dawn/blob/main/sections/main-product.liquid" title="main-product.liquid"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/assets/product-info.js" title="product-info.js"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/assets/global.js" title="global.js"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/assets/product-form.js" title="product-form.js"/>

我们先看整体架构：

<box border radius="lg" padding={3} gap={2}>
  <title size="lg">Product 页面组件架构</title>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **main-product.liquid**

    <text color="secondary" size="xs">商品详情页主 Section</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={2} align="center">
        **Media Gallery**

        <text color="secondary" size="xs">图片、视频、3D 模型</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={2} align="center">
        **Product Info**

        <text color="secondary" size="xs">标题、价格、SKU、库存</text>
      </box>
    </grid-item>
  </grid>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <grid columns={2} gap={2}>
    <grid-item>
      <box border radius="md" padding={2} align="center">
        **VariantSelects**

        <text color="secondary" size="xs">global.js</text>
      </box>
    </grid-item>
    <grid-item>
      <box border radius="md" padding={2} align="center">
        **ProductForm**

        <text color="secondary" size="xs">product-form.js</text>
      </box>
    </grid-item>
  </grid>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface" border radius="md" padding={3} align="center">
    **ProductInfo**

    <badge color="success">核心协调器</badge>
    <text color="secondary" size="xs">product-info.js</text>
    <text color="secondary" size="xs">监听 Variant 变化、请求 Shopify、更新页面</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **Shopify Section Rendering**

    <text color="secondary" size="xs">服务端根据 option_values 重新渲染 Liquid</text>
  </box>
</box>

这里先记住一个概念：

Dawn 并不是使用一个巨大的 JavaScript 文件来管理商品详情页，而是拆分成多个自定义元素（Custom Elements）。

例如：

```html
<product-info>
  <variant-selects>
    ...
  </variant-selects>

  <product-form>
    ...
  </product-form>
</product-info>
```

这三个标签都不是浏览器原生 HTML 标签，而是 Dawn 通过 JavaScript 注册的 Web Components。

其中：

- `product-info`：负责协调商品信息更新。
- `variant-selects`：负责监听选项变化。
- `product-form`：负责处理加购。

特别注意：`product-info` 是 HTML 自定义元素，不是 Shopify Liquid 中的一个 `product_info` 对象。

---

## 二、第一步：main-product.liquid 如何组织页面？

打开 `sections/main-product.liquid`。

首先看最外层：

```liquid
<product-info
  id="MainProduct-{{ section.id }}"
  data-section="{{ section.id }}"
  data-product-id="{{ product.id }}"
  data-update-url="true"
  data-url="{{ product.url }}"
>
  ...
</product-info>
```

这里有几个非常重要的属性。

| 属性 | 作用 |
|---|---|
| `data-section` | 当前 Section ID |
| `data-product-id` | 当前 Product ID |
| `data-update-url` | 切换 Variant 时是否更新 URL |
| `data-url` | 当前商品 URL |

为什么需要把这些数据放到 HTML 属性上？

因为 JavaScript 可以直接读取：

```js
this.dataset.section
this.dataset.productId
this.dataset.updateUrl
this.dataset.url
```

例如：

```js
this.dataset.productId
```

就能拿到当前商品 ID。

这种方式是 Liquid 向前端 JavaScript 传递服务端数据的常见方式。

### 1. 商品详情页使用 Section Blocks 组织内容

继续看：

```liquid
{%- assign product_form_id = 'product-form-' | append: section.id -%}

{%- for block in section.blocks -%}
  {%- case block.type -%}

    {%- when 'title' -%}
      ...

    {%- when 'price' -%}
      ...

    {%- when 'inventory' -%}
      ...

    {%- when 'variant_picker' -%}
      {% render 'product-variant-picker' %}

    {%- when 'buy_buttons' -%}
      {% render 'buy-buttons' %}

  {%- endcase -%}
{%- endfor -%}
```

这和我们之前学习的 Shopify Theme Section 架构是对应的。

商品详情页并不是把标题、价格、Variant 选择器、加购按钮的位置全部写死。

而是通过 Theme Editor 中的 Blocks 决定：

- 显示哪些内容。
- 内容按照什么顺序排列。
- 每个 Block 使用什么配置。

例如，商家可以在 Theme Editor 中把价格放在标题下面，也可以把库存信息放在加购按钮上面。

这就是 Dawn 商品详情页的可配置性。

### 2. 一个非常重要的 Liquid 属性

你会反复看到：

```liquid
product.selected_or_first_available_variant
```

例如：

```liquid
{{ product.selected_or_first_available_variant.price }}

{{ product.selected_or_first_available_variant.sku }}

{{ product.selected_or_first_available_variant.id }}

{{ product.selected_or_first_available_variant.inventory_quantity }}
```

它代表当前应该选中的 Variant：

- 如果 URL 中指定了有效的 `?variant=`，优先使用指定 Variant。
- 否则使用第一个可购买的 Variant。
- 如果没有可购买的 Variant，则可能回退到第一个 Variant。

因此，Dawn 初始页面的价格、SKU、库存、加购 Variant ID 等信息，都是围绕这个属性渲染的。

---

## 三、第二步：Variant 选择器究竟生成了什么 HTML？

这是整个课程最重要的部分之一。

打开：

`snippets/product-variant-picker.liquid`

核心代码：

```liquid
<variant-selects
  id="variant-selects-{{ section.id }}"
  data-section="{{ section.id }}"
  data-product-handle="{{ product.handle }}"
  data-product-title="{{ product.title | escape }}"
  data-product-id="{{ product.id }}"
>
  {%- for option in product.options_with_values -%}

    ...

  {%- endfor -%}

  <script type="application/json" data-selected-variant>
    {{ product.selected_or_first_available_variant | json }}
  </script>

</variant-selects>
```

这里有两个值得研究的地方。

### 1. 为什么使用 product.options_with_values？

还记得我们之前学习过的 Shopify Product 数据模型吗？

假设有一个商品：

```text
Product: T-Shirt

Options:
  Color:
    White
    Black

  Size:
    S
    M
    L
```

Liquid：

```liquid
product.options_with_values
```

可以理解为：

```js
[
  {
    name: "Color",
    position: 1,
    values: [
      "White",
      "Black"
    ]
  },
  {
    name: "Size",
    position: 2,
    values: [
      "S",
      "M",
      "L"
    ]
  }
]
```

这只是简化示意。

实际上，现代 Shopify Liquid 的 OptionValue 对象还提供了很多信息，例如：

```liquid
value.id
value.name
value.available
value.selected
value.swatch
value.product_url
```

注意：

这里遍历的是 Option 和 OptionValue，不是 Variant。

这个区别非常重要。

### 2. product-variant-options.liquid

打开：

`snippets/product-variant-options.liquid`

这里负责生成具体的选项 HTML。

例如按钮模式：

```liquid
<input
  type="radio"
  id="{{ input_id }}"
  name="{{ input_name }}"
  value="{{ escaped_value }}"
  form="{{ product_form_id }}"
  {% if value.selected %}
    checked
  {% endif %}
  {% if option_disabled %}
    class="disabled"
  {% endif %}
  data-product-url="{{ value.product_url }}"
  data-option-value-id="{{ value.id }}"
  data-option-name="{{ option.name | escape }}"
>
<label for="{{ input_id }}">
  {{ value }}
</label>
```

重点是：

```html
data-option-value-id="{{ value.id }}"
```

**这个 ID 不是 Variant ID，而是 OptionValue ID。**

例如：

```text
Color = Black
OptionValue ID = 111

Size = M
OptionValue ID = 222
```

用户选择 Black / M，前端最终得到：

```js
selectedOptionValues = [
  "111",
  "222"
];
```

而不是直接得到：

```js
variantId = 456789;
```

为什么 Shopify 要这么设计？

因为 Shopify 需要根据用户选择的 OptionValue 组合，判断实际对应哪个 Variant，以及这个组合是否可用。

也就是说：

```text
用户选择 OptionValue
        ↓
Shopify 根据 OptionValue 组合
        ↓
解析对应 Variant
```

这也是我们马上要研究的 Section Rendering 机制的关键。

### 3. 页面为什么还要输出一份 JSON？

再看：

```liquid
<script type="application/json" data-selected-variant>
  {{ product.selected_or_first_available_variant | json }}
</script>
```

这段代码的目的，是将当前选中的 Variant 数据直接嵌入 HTML。

浏览器可以通过：

```js
const variant = JSON.parse(
  this.querySelector(
    '[data-selected-variant]'
  ).textContent
);
```

拿到完整 Variant 数据。

例如：

```js
{
  id: 456789,
  title: "Black / M",
  available: true,
  price: 3200,
  sku: "TSH-BLK-M",
  featured_media: {
    id: 987654
  }
}
```

这里同样是简化示意。

**请记住：Dawn 并不是自己在前端维护一份完整的 Variant 数据库，而是通过 Liquid 输出当前状态，再由 Shopify 在选项变化后重新计算。**

---

## 四、第三步：用户改变选项后，JavaScript 如何知道？

现在进入 `assets/global.js`。

搜索：

```js
class VariantSelects extends HTMLElement
```

这就是前面 HTML 中：

```html
<variant-selects>
```

对应的 JavaScript 实现。

### 1. 监听 change 事件

```js
connectedCallback() {
  this.addEventListener('change', (event) => {

    const target =
      this.getInputForEventTarget(event.target);

    this.updateSelectionMetadata(event);

    this.dispatchProductSelectEvent();

    publish(
      PUB_SUB_EVENTS.optionValueSelectionChange,
      {
        data: {
          event,
          target,
          selectedOptionValues: this.selectedOptionValues,
        },
      }
    );

  });
}
```

整个过程分成三步：

1. 获取用户刚刚改变的 OptionValue。
2. 更新选择器自己的状态。
3. 发布一个全局事件，通知其他组件。

这里出现了一个我们之前还没有深入研究的设计：

**Pub/Sub（发布订阅模式）。**

Dawn 在 `assets/constants.js` 中定义：

```js
const PUB_SUB_EVENTS = {
  cartUpdate: 'cart-update',
  quantityUpdate: 'quantity-update',
  optionValueSelectionChange: 'option-value-selection-change',
  variantChange: 'variant-change',
  cartError: 'cart-error',
};
```

然后通过：

```js
publish(eventName, data);
```

发布事件。

其他组件通过：

```js
subscribe(eventName, callback);
```

订阅事件。

这样，VariantSelects 就不需要直接调用 ProductInfo 的方法。

两个组件可以独立存在，通过事件通信。

### 2. selectedOptionValues 是怎么得到的？

看 `VariantSelects` 中这个 getter：

```js
get selectedOptionValues() {

  return Array.from(
    this.querySelectorAll(
      'select option[selected], fieldset input:checked'
    )
  ).map(
    ({ dataset }) => dataset.optionValueId
  );

}
```

我们把它拆开。

假设用户选择：

```text
Color: Black
Size: M
```

页面 HTML 中：

```html
<input
  type="radio"
  value="Black"
  data-option-value-id="111"
  checked
>

<input
  type="radio"
  value="M"
  data-option-value-id="222"
  checked
>
```

执行：

```js
this.selectedOptionValues
```

结果：

```js
["111", "222"]
```

这就是下一步请求 Shopify 所需要的数据。

---

## 五、第四步：ProductInfo 如何接收事件并请求 Shopify？

现在打开：

`assets/product-info.js`

搜索：

```js
class ProductInfo extends HTMLElement
```

### 1. ProductInfo 订阅 Variant 变化

看：

```js
connectedCallback() {

  this.initializeProductSwapUtility();

  this.onVariantChangeUnsubscriber = subscribe(
    PUB_SUB_EVENTS.optionValueSelectionChange,
    this.handleOptionValueChange.bind(this)
  );

  this.initQuantityHandlers();

}
```

这里：

```js
subscribe(
  PUB_SUB_EVENTS.optionValueSelectionChange,
  ...
)
```

就是订阅刚刚 VariantSelects 发布的事件。

当用户改变颜色或尺码时，ProductInfo 就会收到通知。

接下来执行：

```js
handleOptionValueChange({
  data: {
    event,
    target,
    selectedOptionValues
  }
})
```

### 2. handleOptionValueChange

源码核心：

```js
handleOptionValueChange({
  data: {
    event,
    target,
    selectedOptionValues
  }
}) {

  if (!this.contains(event.target)) return;

  this.resetProductFormState();

  const productUrl =
    target.dataset.productUrl ||
    this.pendingRequestUrl ||
    this.dataset.url;

  this.pendingRequestUrl = productUrl;

  const shouldSwapProduct =
    this.dataset.url !== productUrl;

  const shouldFetchFullPage =
    this.dataset.updateUrl === 'true' &&
    shouldSwapProduct;

  this.renderProductInfo({
    requestUrl: this.buildRequestUrlWithParams(
      productUrl,
      selectedOptionValues,
      shouldFetchFullPage
    ),
    targetId: target.id,
    callback: shouldSwapProduct
      ? this.handleSwapProduct(
          productUrl,
          shouldFetchFullPage
        )
      : this.handleUpdateProductInfo(productUrl),
  });

}
```

我们逐个理解。

**第一：检查事件是否来自当前商品组件。**

```js
if (!this.contains(event.target)) return;
```

因为一个页面可能存在多个 ProductInfo 实例。

不能让其他商品的选项变化影响当前组件。

**第二：获取商品 URL。**

```js
const productUrl =
  target.dataset.productUrl ||
  this.pendingRequestUrl ||
  this.dataset.url;
```

正常情况下，就是：

```js
this.dataset.url
```

也就是当前商品 URL。

但这里还有一个高级场景：

如果 OptionValue 的 `product_url` 指向另一个商品，Dawn 也支持切换到另一个商品。

这通常涉及 Shopify Combined Listings（组合商品展示）等场景。

**第三：决定是否需要替换整个商品页面。**

```js
const shouldSwapProduct =
  this.dataset.url !== productUrl;
```

如果商品 URL 没有变化，只需要更新当前商品信息。

如果商品 URL 发生变化，就需要执行商品切换逻辑。

---

### 3. 最重要的地方：buildRequestUrlWithParams

继续看：

```js
buildRequestUrlWithParams(
  url,
  optionValues,
  shouldFetchFullPage = false
) {

  const params = [];

  !shouldFetchFullPage &&
    params.push(
      `section_id=${this.sectionId}`
    );

  if (optionValues.length) {
    params.push(
      `option_values=${optionValues.join(',')}`
    );
  }

  return `${url}?${params.join('&')}`;

}
```

这里就是 Dawn 实现 Variant 动态切换的核心。

假设：

```js
url = '/products/classic-t-shirt';

optionValues = [
  '111',
  '222'
];
```

请求地址就是：

```http
GET /products/classic-t-shirt?section_id=template--123__main&option_values=111,222
```

注意，具体 Section ID 会根据当前主题实例而变化。

这里传递的参数是：

```text
option_values=111,222
```

不是：

```text
variant=456789
```

也不是：

```text
options[Color]=Black&options[Size]=M
```

这点非常重要。

Shopify 收到 OptionValue ID 组合后，会根据商品数据解析对应 Variant。

然后重新执行 Liquid。

例如：

```liquid
{{ product.selected_or_first_available_variant.price }}
```

这次就能得到新选中 Variant 的价格。

同样：

```liquid
{{ product.selected_or_first_available_variant.sku }}

{{ product.selected_or_first_available_variant.featured_media }}

{{ product.selected_or_first_available_variant.available }}
```

也都会对应新的 Variant 状态。

这就是 Shopify Section Rendering 与 Variant 选择器结合的核心。

### 4. 这次请求返回的是 JSON 还是 HTML？

答案是 HTML。

与我们上一课的 Predictive Search 一样：

```js
fetch(requestUrl, {
  signal: this.abortController.signal
})
.then(response => response.text())
.then(responseText => {

  const html = new DOMParser()
    .parseFromString(
      responseText,
      'text/html'
    );

  callback(html);

});
```

这里：

- `fetch` 请求 Shopify 商品 URL。
- `response.text()` 获取 HTML。
- `DOMParser` 将 HTML 转换成 DOM。
- `callback` 根据新 DOM 更新当前页面。

注意，**浏览器没有刷新整个页面。**

Shopify 在服务端重新渲染了 Section，浏览器只获取 HTML，然后局部更新。

另外，这里还有一个非常好的性能设计：

```js
this.abortController?.abort();

this.abortController = new AbortController();
```

每次新的 Variant 请求发起前，都会取消上一个尚未完成的请求。

这与上一课 Predictive Search 的实现形成了一个很好的对比。

---

## 六、第五步：收到新 HTML 后，页面究竟更新了什么？

现在进入最核心的方法：

```js
handleUpdateProductInfo(productUrl)
```

它负责将服务端返回的新商品信息同步到当前页面。

我们重点拆成七个部分。

### 1. 获取新的 Variant

```js
const sourceVariantSelects =
  this.getVariantSelects(html);

const variant =
  this.getSelectedVariant(html);
```

其中：

```js
getSelectedVariant(productInfoNode) {

  return this.parseJsonScript(
    this.getVariantSelects(productInfoNode),
    '[data-selected-variant]'
  );

}
```

实际上就是从新 HTML 中找到：

```html
<script type="application/json" data-selected-variant>
  ...
</script>
```

然后解析成 JavaScript 对象。

现在我们终于得到了真正的 Variant：

```js
{
  id: 456789,
  title: "Black / M",
  price: 3200,
  sku: "TSH-BLK-M",
  available: true
}
```

因此，整个过程是：

```text
OptionValue ID
      ↓
Shopify 服务端
      ↓
匹配 Variant
      ↓
返回 HTML
      ↓
读取 selected-variant JSON
      ↓
得到 Variant ID 和其他属性
```

### 2. 更新 Variant 选择器本身

```js
updateOptionValues(html) {

  const variantSelects =
    html.querySelector('variant-selects');

  if (variantSelects) {

    HTMLUpdateUtility.viewTransition(
      this.variantSelectors,
      variantSelects,
      this.preProcessHtmlCallbacks
    );

  }

}
```

这里有一个容易忽略的地方：

Dawn 不只是更新价格。

它还会将服务端重新生成的整个 `variant-selects` 元素替换掉当前元素。

为什么？

因为不同 Variant 组合下，某些选项可能变成不可用。

例如：

| 颜色 | 尺码 | 状态 |
|---|---|---|
| Black | S | 可用 |
| Black | M | 可用 |
| Black | L | 售罄 |
| White | S | 可用 |
| White | M | 售罄 |
| White | L | 可用 |

用户选择 Black 后，尺码选项的可用状态可能需要变化。

这些状态由 Shopify 服务端根据最新选项组合计算，再通过 Liquid 重新输出。

所以 Dawn 选择直接替换选择器，而不是在前端自己重新计算全部选项状态。

### 3. 更新浏览器 URL

```js
updateURL(url, variantId) {

  if (this.dataset.updateUrl === 'false') return;

  window.history.replaceState(
    {},
    '',
    `${url}${variantId ? `?variant=${variantId}` : ''}`
  );

}
```

假设原来的 URL：

```text
/products/classic-t-shirt
```

用户选择 Black / M 后：

```text
/products/classic-t-shirt?variant=456789
```

这里使用的是：

```js
history.replaceState()
```

而不是：

```js
location.href =
```

所以不会发生页面跳转或刷新。

为什么要更新 URL？

因为用户可以：

- 复制当前 Variant 的链接。
- 刷新页面后恢复对应 Variant。
- 分享某个具体颜色和尺码的商品链接。

注意，URL 使用的是 Variant ID，而请求 Shopify 时使用的是 OptionValue ID。

这两个 ID 在整个流程中承担不同职责。

### 4. 更新真正用于加购的 Variant ID

这是最重要的一步之一：

```js
updateVariantInputs(variantId) {

  this.querySelectorAll(
    `#product-form-${this.dataset.section},
     #product-form-installment-${this.dataset.section}`
  ).forEach((productForm) => {

    const input =
      productForm.querySelector('input[name="id"]');

    input.value = variantId ?? '';

    input.dispatchEvent(
      new Event('change', {
        bubbles: true
      })
    );

  });

}
```

还记得我们之前学习过的加购表单吗？

Shopify 原生商品加购表单需要传：

```html
<input
  type="hidden"
  name="id"
  value="456789"
>
```

这里的 `name="id"` 就是 Variant ID。

因此，用户选择不同 Variant 时，Dawn 必须同步更新这个隐藏输入框。

否则会发生什么？

例如：

用户选择了 Black / M，但隐藏输入框仍然保存 White / S 的 Variant ID。

那么点击加购时，加入购物车的就会是 White / S。

所以：

**页面显示的 Variant 和真正提交给 Shopify 的 Variant ID 必须保持一致。**

### 5. 更新价格、SKU、库存等信息

接着看：

```js
const updateSourceFromDestination = (
  id,
  shouldHide = (source) => false
) => {

  const source =
    html.getElementById(`${id}-${this.sectionId}`);

  const destination =
    this.querySelector(
      `#${id}-${this.dataset.section}`
    );

  if (source && destination) {

    destination.innerHTML =
      source.innerHTML;

    destination.classList.toggle(
      'hidden',
      shouldHide(source)
    );

  }

};
```

然后：

```js
updateSourceFromDestination('price');

updateSourceFromDestination('Sku');

updateSourceFromDestination('Inventory');

updateSourceFromDestination('Volume');

updateSourceFromDestination('Price-Per-Item');
```

看懂了吗？

Shopify 服务端已经帮我们生成了新的价格 HTML、SKU HTML、库存 HTML。

Dawn 只需要把新 HTML 拷贝到原来的位置。

例如：

```text
服务端返回的 HTML
    ↓
#price-section-id
    ↓
取出 innerHTML
    ↓
替换当前页面价格区域
```

所以并不需要自己写：

```js
priceElement.textContent = variant.price;
```

也不需要自己处理货币格式、促销价格、税费展示等细节。

直接复用 Liquid 的渲染结果即可。

### 6. 更新商品图片

继续看：

```js
this.updateMedia(
  html,
  variant?.featured_media?.id
);
```

这里非常有意思。

为什么商品图片也需要更新？

因为 Shopify 允许 Variant 关联 Featured Media。

例如：

```text
White / S → 白色商品图片
Black / M → 黑色商品图片
Blue / L  → 蓝色商品图片
```

当用户切换 Variant，Dawn 会：

1. 从新 HTML 获取媒体列表。
2. 比较新旧媒体 ID。
3. 添加新媒体。
4. 移除不再需要的媒体。
5. 根据服务端返回的顺序重新排列媒体。
6. 将当前 Variant 对应的 Featured Media 设为活动图片。
7. 同步更新媒体弹窗中的内容。

其中最关键的调用：

```js
this.querySelector('media-gallery')
  ?.setActiveMedia?.(
    `${this.dataset.section}-${variantFeaturedMediaId}`,
    true
  );
```

这里并不是简单地将商品主图的 `src` 替换掉。

而是调用 Media Gallery 自己的 API，让媒体画廊切换到对应的图片。

这也是 Dawn 将组件拆分的重要价值：ProductInfo 不需要自己实现轮播图逻辑。

### 7. 更新加购按钮状态

最后还要更新按钮是否可用：

```js
this.productForm?.toggleSubmitButton(
  html.getElementById(
    `ProductSubmitButton-${this.sectionId}`
  )?.hasAttribute('disabled') ?? true,
  window.variantStrings.soldOut
);
```

例如：

用户选择了一个售罄的 Variant。

Shopify 服务端会生成：

```html
<button disabled>
  Sold out
</button>
```

Dawn 根据这个服务端结果，禁用当前加购按钮。

如果用户又切换到有库存的 Variant，就会恢复按钮。

这也是一个重要设计：

**Variant 的可购买状态以 Shopify 服务端计算结果为准，而不是单纯相信浏览器端的判断。**

---

### 8. 还有一些容易忽略的更新

`handleUpdateProductInfo()` 还处理了：

```js
this.pickupAvailability?.update(variant);
```

更新门店自提信息。

```js
this.updateQuantityRules(this.sectionId, html);
```

更新当前 Variant 对应的购买数量规则，例如：

- 最小购买数量。
- 最大购买数量。
- 购买数量增量。
- 阶梯价格规则。

最后：

```js
publish(PUB_SUB_EVENTS.variantChange, {
  data: {
    sectionId: this.sectionId,
    html,
    variant,
  },
});
```

再次发布一个事件：

```text
variant-change
```

注意，这与之前的：

```text
option-value-selection-change
```

不是一回事。

两者的区别：

| 事件 | 含义 |
|---|---|
| option-value-selection-change | 用户改变了 OptionValue |
| variant-change | Shopify 已经返回并确定了新的 Variant |

这两个事件之间存在一个异步请求过程。

这也是一个很好的架构设计：把用户操作和最终业务状态变化区分开。

---

## 七、第六步：点击 Add to Cart 后发生什么？

现在我们已经知道：

用户选择 Variant 后，隐藏输入框中的 Variant ID 会被更新。

接下来就看加购。

打开：

`snippets/buy-buttons.liquid`

核心代码：

```liquid
<product-form>

  {%- form 'product',
    product,
    id: product_form_id,
    class: 'form',
    data-type: 'add-to-cart-form'
  -%}

    <input
      type="hidden"
      name="id"
      value="{{ product.selected_or_first_available_variant.id }}"
      class="product-variant-id"
    >

    <button type="submit">
      Add to cart
    </button>

  {%- endform -%}

</product-form>
```

这里和我们之前学过的 Shopify 原生加购表单完全对应。

### 1. 为什么使用 product-form 自定义元素？

打开：

`assets/product-form.js`

```js
customElements.define(
  'product-form',
  class ProductForm extends HTMLElement {

    constructor() {
      super();

      this.form = this.querySelector('form');

      this.form.addEventListener(
        'submit',
        this.onSubmitHandler.bind(this)
      );

    }

  }
);
```

它监听表单提交。

接下来：

```js
onSubmitHandler(evt) {

  evt.preventDefault();

  ...
}
```

这里阻止了浏览器默认的表单提交行为。

然后自己使用 Fetch API 实现 AJAX 加购。

### 2. 加购请求

核心代码：

```js
const formData = new FormData(this.form);

const variantId = formData.get('id');

fetch(`${routes.cart_add_url}`, {
  method: 'POST',
  body: formData
});
```

实际源码还包含请求头、购物车 Section 参数、异常处理等逻辑。

这里最关键的是：

```js
formData.get('id')
```

获取的就是刚刚通过 Variant 切换更新的 Variant ID。

例如：

```js
{
  id: "456789",
  quantity: "1"
}
```

Shopify 收到请求后，就知道用户想购买哪个 Variant。

### 3. 为什么加购时还传 sections？

Dawn 还有一段：

```js
if (this.cart) {

  formData.append(
    'sections',
    this.cart
      .getSectionsToRender()
      .map(section => section.id)
  );

  formData.append(
    'sections_url',
    window.location.pathname
  );

}
```

这个设计你应该已经很熟悉了。

还记得我们之前讨论过购物车弹窗和 Section Rendering 吗？

例如用户加购成功后，希望购物车抽屉立即更新：

- 商品数量。
- 商品图片。
- 商品标题。
- Variant 信息。
- 商品价格。
- 购物车总价。

Dawn 会将需要更新的 Section ID 一起传给 Shopify。

Shopify 在加购成功后返回对应的 Section HTML。

然后：

```js
this.cart.renderContents(response);
```

更新购物车 UI。

整个过程不需要刷新页面。

### 4. 完整加购流程

<box border radius="lg" padding={3} gap={2}>
  <title size="lg">Dawn Add to Cart 执行流程</title>
  <list connector="solid" marker="number" gap={2}>
    <list-item>
      用户点击 Add to Cart。
    </list-item>
    <list-item>
      ProductForm 监听 submit，阻止默认提交。
    </list-item>
    <list-item>
      FormData 获取 Variant ID 和 Quantity。
    </list-item>
    <list-item>
      附带购物车需要更新的 Section 信息。
    </list-item>
    <list-item>
      POST Shopify Cart Add 接口。
    </list-item>
    <list-item>
      Shopify 返回加购结果和相关 Section HTML。
    </list-item>
    <list-item>
      发布 cartUpdate 事件。
    </list-item>
    <list-item>
      Cart Drawer / Cart Notification 更新 UI。
    </list-item>
  </list>
  <badge color="success">加购完成</badge>
</box>

这里还需要区分两个功能：

**Add to Cart 和 Dynamic Checkout 并不是同一个东西。**

Dawn 中：

```liquid
{{ form | payment_button }}
```

生成的是 Shopify 提供的动态结账按钮。

它与自己实现的 AJAX 加购按钮是两条不同的购买路径。

---

## 八、现在把整个 Variant 切换过程串起来

这是本课最重要的知识图。

<box border radius="lg" padding={3} gap={2}>
  <title size="lg">Variant 切换完整链路</title>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **用户选择 Color / Size**

    <text color="secondary" size="xs">HTML change 事件</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **VariantSelects**

    <text color="secondary" size="xs">获取 selectedOptionValues</text>
    <text color="secondary" size="xs">发布 optionValueSelectionChange</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **ProductInfo**

    <text color="secondary" size="xs">订阅事件，构造请求 URL</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **Shopify Section Rendering**

    <text color="secondary" size="xs">option_values=111,222</text>
    <text color="secondary" size="xs">服务端解析并匹配 Variant</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **返回新的 Section HTML**

    <text color="secondary" size="xs">包含新的 Variant JSON 和 Liquid 渲染结果</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} gap={2}>
    **ProductInfo 更新页面**
    <grid columns={2} gap={2}>
      {#each ["Variant Picker","商品价格","SKU","库存","商品图片","URL","Quantity Rules","加购 Variant ID"] as item}
        <grid-item>
          <row align="center" gap={1}>
            <icon name="check-circle" color="success" size="xs"/>
            <text size="xs">{item}</text>
          </row>
        </grid-item>
      {/each}
    </grid>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface" border radius="md" padding={3} align="center">
    **用户点击 Add to Cart**

    <text color="secondary" size="xs">ProductForm 提交正确的 Variant ID</text>
  </box>
</box>

这里有一个非常值得你记住的设计原则：

**Shopify 负责商品数据和 Variant 的最终解析，Dawn 负责将 Shopify 返回的结果同步到前端各个组件。**

Dawn 并没有在浏览器中重新实现一套 Shopify Variant 解析引擎。

---

## 九、动手实验：自己验证源码

在 Dawn 项目中完成以下四项实验。

<box border radius="lg" padding={3} gap={3}>
  **实验 1：观察 Variant 请求**

  在商品详情页打开 DevTools → Network。

  切换颜色或尺码，观察请求 URL。

  重点找：

  ```text
  option_values=
  section_id=
  ```

  看看它传递的是不是 OptionValue ID。

  <divider color="subtle"/>
  **实验 2：观察返回的 HTML**

  点击刚才的请求，查看 Response。

  搜索：

  ```text
  data-selected-variant
  ```

  对比切换前后的 Variant JSON。

  <divider color="subtle"/>
  **实验 3：观察加购 Variant ID**

  在 Console 中执行：

  ```js
  document.querySelector(
    'product-form input[name="id"]'
  ).value
  ```

  切换不同 Variant，看看这个值是否发生变化。

  <divider color="subtle"/>
  **实验 4：观察完整加购请求**

  点击 Add to Cart。

  找到 Cart Add 请求，查看 Form Data：

  ```text
  id
  quantity
  ```

  确认提交的 Variant ID 与当前选择的 Variant 一致。
</box>

---

## 十、本课知识总结

这一课实际上涉及了三个非常重要的前端架构知识。

| 知识 | Dawn 中的实现 |
|---|---|
| Web Components | ProductInfo、VariantSelects、ProductForm |
| Pub/Sub | Variant 选择事件和商品状态变化事件 |
| Server-driven UI | Shopify Section Rendering 返回 HTML，前端局部更新 |

还有一个非常重要的 ID 区别：

| ID | 用途 |
|---|---|
| Product ID | 标识商品 |
| OptionValue ID | 提交选中的选项组合 |
| Variant ID | 标识最终购买的具体商品规格 |
| Section ID | 标识需要重新渲染的页面区域 |

这几个概念一定不要混淆。

## 课后理解检查



{@body const [answer,setAnswer] = DIL.useState("B")}
{@body const [show,setShow] = DIL.useState(false)}
<box border radius="lg" padding={3} gap={3}>
  **问题：**

  用户在 Dawn 商品详情页选择了 Black / M，前端拿到了两个 OptionValue ID。

  Dawn 为什么不直接通过这两个 ID 在浏览器中找到对应 Variant，而是请求 Shopify Section Rendering？

  <radio-group direction="col" value={answer} onChange={v=>{setAnswer(v);setShow(false);}}>
    <radio value="A">A. 因为浏览器无法读取 Shopify 的商品数据。</radio>
    <radio value="B">B. 因为需要 Shopify 服务端根据选项组合解析 Variant，并返回权威的价格、库存、媒体和可用性等数据。</radio>
    <radio value="C">C. 因为 Section Rendering 会刷新整个商品详情页。</radio>
    <radio value="D">D. 因为 OptionValue ID 本身就是 Variant ID。</radio>
  </radio-group>
  <button block onClick={()=>setShow(true)}>提交答案</button>
  {#if show}
    {#if answer==="B"}
      <badge color="success">回答正确</badge>
      核心就是服务端负责解析和提供权威商品状态，前端负责更新 UI。
    {:else}
      <badge color="warning">再想一想</badge>
      提示：OptionValue ID 和 Variant ID 是不同的概念，而且 Section Rendering 不会刷新整个页面。
    {/if}
  {/if}
</box>
