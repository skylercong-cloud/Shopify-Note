# 深入 `product-variant-picker.liquid`：Shopify 如何实现商品变体选择？


上一课分析了 `main-product.liquid`，知道它是商品详情页的组装器。

今天我们开始研究一个更有技术含量的功能：

**用户选择一个商品颜色或尺码后，Shopify 是如何知道用户选择了哪个 Variant，并同步更新价格、库存、SKU、商品图片和加购按钮的？**

我们会沿着一条真实的代码执行链来学习，而不是孤立地看 Liquid 或 JavaScript。

#### 本课学习路线

```text
product.json
    ↓
main-product.liquid
    ↓
product-variant-picker.liquid
    ↓
product-variant-options.liquid
    ↓
variant-selects (Web Component)
    ↓
product-info.js
    ↓
Section Rendering API
    ↓
更新价格、库存、SKU、图片、Variant ID
    ↓
product-form.js
    ↓
加入购物车
```

今天重点研究前面这条链路，尤其是 Liquid 和 JavaScript 如何协作。

## 一、先看 product-variant-picker.liquid

源码：

<Link url="https://github.com/Shopify/dawn/blob/main/snippets/product-variant-picker.liquid" title="snippets/product-variant-picker.liquid"/>

先看最外层：

```liquid
{%- unless product.has_only_default_variant -%}
  <variant-selects
    id="variant-selects-{{ section.id }}"
    data-section="{{ section.id }}"
    data-product-handle="{{ product.handle }}"
    data-product-title="{{ product.title | escape }}"
    data-product-id="{{ product.id }}"
    data-currency-code="{{ cart.currency.iso_code }}"
  >
    ...
  </variant-selects>
{%- endunless -%}
```

这里有三个知识点。

#### 1. 为什么判断 has_only_default_variant？

```liquid
product.has_only_default_variant
```

它表示商品是否只有默认变体。

例如：

| 商品 | 是否需要 Variant Picker |
|---|---|
| 普通水杯，没有颜色、尺寸选项 | 不需要 |
| T 恤，有 S/M/L 尺码 | 需要 |
| 鞋子，有颜色和尺码 | 需要 |

因此：

```liquid
unless product.has_only_default_variant
```

意味着只有真正存在多个变体选项时，才输出变体选择器。

#### 2. `<variant-selects>` 是什么？

和上一课的 `<product-info>` 一样，它也是一个自定义 Web Component。

它的职责更加专一：

**监听用户对商品选项的选择，并将选中的选项通知商品信息组件。**

它对应的 JavaScript 不在 `product-variant-picker.js`，而是在：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/global.js" title="assets/global.js"/>

我们稍后会进入这个文件。

#### 3. 为什么要输出 data 属性？

例如：

```liquid
data-product-id="{{ product.id }}"
data-product-handle="{{ product.handle }}"
data-currency-code="{{ cart.currency.iso_code }}"
```

这些数据供 JavaScript 读取：

```js
this.dataset.productId
this.dataset.productHandle
this.dataset.currencyCode
```

这是 Liquid 和 JavaScript 之间的一种数据传递方式。

---

## 二、商品选项是如何遍历的？

继续看：

```liquid
{%- for option in product.options_with_values -%}
```

这里需要回忆一下 Shopify 商品数据模型。

假设有一个商品：

<box border radius="lg" padding={3} gap={3}>
  <title size="lg">经典 T 恤</title>
  <LessonImage src="assets/fill/img-21.jpg" alt="minimal white black cotton t shirt ecommerce product photography"/>
  **商品选项**
  <box gap={1}>
    <text weight="medium" size="sm">Color</text>
    <row gap={2}>
      {#each ["Black","White"] as c}
        <badge color="secondary">{c}</badge>
      {/each}
    </row>
  </box>
  <box gap={1}>
    <text weight="medium" size="sm">Size</text>
    <row gap={2}>
      {#each ["S","M","L"] as s}
        <badge color="secondary">{s}</badge>
      {/each}
    </row>
  </box>
  <divider color="subtle"/>
  **对应的 Variants**
  | Variant | Color | Size |
  |---|---|---|
  | V1 | Black | S |
  | V2 | Black | M |
  | V3 | Black | L |
  | V4 | White | S |
  | V5 | White | M |
  | V6 | White | L |
</box>

对应的 Liquid 数据结构可以理解为：

```text
product
  └── options_with_values
        ├── option: Color
        │     ├── name: Color
        │     └── values
        │           ├── Black
        │           └── White
        │
        └── option: Size
              ├── name: Size
              └── values
                    ├── S
                    ├── M
                    └── L
```

因此：

```liquid
{% for option in product.options_with_values %}
```

第一次循环拿到 Color，第二次拿到 Size。

注意：这里的 `option` 不是 Variant，而是 Product Option 对象。

### 1. option 对象有哪些重要属性？

在 Dawn 中，主要使用：

| 属性 | 含义 |
|---|---|
| `option.name` | 选项名称，例如 Color |
| `option.position` | 选项位置 |
| `option.values` | 该选项下的所有可选值 |
| `option.selected_value` | 当前选中的值 |

这里的 `option.values` 也值得特别注意。

现代 Shopify Liquid 中，它的元素不只是简单的字符串，而是 ProductOptionValue 对象。

例如源码使用了：

```liquid
value.id
value.available
value.selected
value.swatch
value.product_url
```

也就是说，每个选项值还带有自己的 ID、可用状态、Swatch 等信息。

这也是今天最重要的数据模型知识之一。

### 2. Dawn 如何决定显示按钮还是下拉框？

看这段代码：

```liquid
assign swatch_count =
  option.values
  | map: 'swatch'
  | compact
  | size

assign picker_type = block.settings.picker_type

if swatch_count > 0 and block.settings.swatch_shape != 'none'
  if block.settings.picker_type == 'dropdown'
    assign picker_type = 'swatch_dropdown'
  else
    assign picker_type = 'swatch'
  endif
endif
```

这里的 `block.settings.picker_type` 来源于 Section Schema。

上一课知道，Theme Editor 可以配置：

```json
{
  "type": "select",
  "id": "picker_type",
  "options": [
    {
      "value": "dropdown",
      "label": "Dropdown"
    },
    {
      "value": "button",
      "label": "Button"
    }
  ]
}
```

但是 Dawn 又增加了一层判断：

如果该 Option 有 Swatch 数据，就优先考虑 Swatch 展示方式。

所以最终有四种可能：

| picker_type | 展示效果 |
|---|---|
| `button` | 普通按钮 |
| `dropdown` | 下拉框 |
| `swatch` | 色块选择 |
| `swatch_dropdown` | 带色块的下拉框 |

这体现了 Dawn 的一个设计原则：

**商家配置决定基础展示方式，商品数据可以进一步影响实际展示形式。**

---

## 三、深入 product-variant-options.liquid

接下来打开：

<Link url="https://github.com/Shopify/dawn/blob/main/snippets/product-variant-options.liquid" title="snippets/product-variant-options.liquid"/>

这个文件很重要。

它负责真正生成每个选项的 HTML。

在上一层中：

```liquid
{% render 'product-variant-options',
  option: option,
  block: block,
  picker_type: picker_type
%}
```

传入三个参数：

- `option`：当前商品选项。
- `block`：Block 配置。
- `picker_type`：展示类型。

然后内部：

```liquid
{%- for value in option.values -%}
```

遍历当前选项的每一个值。

例如 Color：

```text
Black
White
```

#### 1. 先看最重要的三个数据属性

源码：

```liquid
{%- capture input_dataset -%}
  data-product-url="{{ value.product_url }}"
  data-option-value-id="{{ value.id }}"
  data-option-name="{{ option.name | escape }}"
{%- endcapture -%}
```

这三个属性非常重要。

| HTML 属性 | 含义 |
|---|---|
| `data-product-url` | 该选项关联的商品 URL |
| `data-option-value-id` | 当前选项值的 ID |
| `data-option-name` | 选项名称 |

尤其是：

```liquid
data-option-value-id="{{ value.id }}"
```

它是整个变体选择流程的关键。

这里要区分三个不同的 ID：

- Product ID：商品 ID。
- Option Value ID：某个选项值的 ID。
- Variant ID：一个完整商品变体的 ID。

它们完全不是一回事。

例如：

```text
Product ID: 100

Color:
  Black -> Option Value ID: 201
  White -> Option Value ID: 202

Size:
  S -> Option Value ID: 301
  M -> Option Value ID: 302

Variants:
  Black + S -> Variant ID: 1001
  Black + M -> Variant ID: 1002
  White + S -> Variant ID: 1003
  White + M -> Variant ID: 1004
```

这里的 ID 只是示意。

你应该特别记住：

**Shopify 新版 Dawn 的变体选择流程，先收集 Option Value ID，再让 Shopify 确定对应的 Variant，而不是直接在浏览器中通过字符串拼接得到 Variant ID。**

#### 2. 普通按钮是如何生成的？

源码：

```liquid
{%- elsif picker_type == 'button' -%}

  <input
    type="radio"
    id="{{ input_id }}"
    name="{{ input_name | escape }}"
    value="{{ escaped_value }}"
    form="{{ product_form_id }}"
    {% if value.selected %}
      checked
    {% endif %}
    {% if option_disabled %}
      class="disabled"
    {% endif %}
    {{ input_dataset }}
  >

  <label for="{{ input_id }}">
    {{ value }}
  </label>

{%- endif -%}
```

最终可能生成：

```html
<input
  type="radio"
  name="Color-1"
  value="Black"
  data-option-value-id="201"
  data-option-name="Color"
>

<label>Black</label>
```

这里有几个细节：

- `type="radio"`：同一个选项只能选择一个值。
- `checked`：由 Liquid 根据当前选中状态输出。
- `data-option-value-id`：提供给 JavaScript 使用。
- `data-option-name`：记录当前选项名称。

#### 3. 下拉框又是如何生成的？

源码：

```liquid
<option
  id="{{ input_id }}"
  value="{{ escaped_value }}"
  {% if value.selected %}
    selected="selected"
  {% endif %}
  {{ input_dataset }}
>
  {{ value }}
</option>
```

最终可能生成：

```html
<select name="options[Color]">
  <option
    value="Black"
    data-option-value-id="201"
    data-option-name="Color"
  >
    Black
  </option>

  <option
    value="White"
    data-option-value-id="202"
    data-option-name="Color"
  >
    White
  </option>
</select>
```

所以你会发现：

**无论是按钮还是下拉框，最终都能通过 `data-option-value-id` 获得对应的 Option Value ID。**

这就保证了后续 JavaScript 可以用统一的方式处理不同的 UI。

---

## 四、进入 JavaScript：variant-selects

现在进入最核心的地方。

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/global.js" title="assets/global.js"/>

搜索：

```js
class VariantSelects extends HTMLElement
```

你会看到：

```js
class VariantSelects extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('change', (event) => {
      const target = this.getInputForEventTarget(event.target);

      this.updateSelectionMetadata(event);

      this.dispatchProductSelectEvent();

      publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
        data: {
          event,
          target,
          selectedOptionValues: this.selectedOptionValues,
        },
      });
    });
  }
}
```

这段代码就是用户选择颜色或尺码之后，触发后续更新的入口。

我们逐步拆解。

### 1. connectedCallback

你还记得 Web Component 生命周期吗？

```js
connectedCallback()
```

当 `<variant-selects>` 被插入 DOM 时，就会执行。

它在这里做的事情很简单：

监听内部所有选项的 `change` 事件。

因为使用的是事件冒泡，所以不需要给每个 Radio 或 Select 单独绑定监听器。

例如：

```html
<variant-selects>
  <input type="radio">
  <input type="radio">

  <select>
    <option>...</option>
  </select>
</variant-selects>
```

用户修改任何一个选项，都会触发这个监听器。

### 2. getInputForEventTarget

```js
getInputForEventTarget(target) {
  return target.tagName === 'SELECT'
    ? target.selectedOptions[0]
    : target;
}
```

为什么需要这个方法？

因为用户操作可能来自两种元素：

- Radio Input。
- Select。

对于 Radio，直接使用当前 Input。

对于 Select，需要获取真正被选中的 Option。

这样后续代码就可以统一处理。

### 3. updateSelectionMetadata

```js
updateSelectionMetadata({ target }) {
  const { value, tagName } = target;

  if (tagName === 'SELECT' && target.selectedOptions.length) {
    // 更新当前选中 Option 的 selected 属性
    ...
  } else if (tagName === 'INPUT' && target.type === 'radio') {
    const selectedSwatchValue = target
      .closest('.product-form__input')
      .querySelector('[data-selected-value]');

    if (selectedSwatchValue) {
      selectedSwatchValue.textContent = value;
    }
  }
}
```

它主要负责更新选择器本身的 UI 状态。

例如选择 Black 后：

```text
Color:
  Black  ← 当前选中
  White
```

如果是 Swatch，还会更新色块显示。

这里还有一个容易忽略的细节：

对于 Select，代码会主动同步 HTML 的 `selected` 属性。

因为浏览器修改下拉框的当前选项时，DOM 上的 `selected` 属性不一定会自动同步。

而 Dawn 后续使用了：

```js
select option[selected]
```

所以必须手动维护这个状态。

### 4. selectedOptionValues：真正重要的地方

看这个 getter：

```js
get selectedOptionValues() {
  return Array.from(
    this.querySelectorAll(
      'select option[selected], fieldset input:checked'
    )
  ).map(({ dataset }) => dataset.optionValueId);
}
```

这段代码很关键。

假设：

```text
Color = Black
Size = M
```

那么：

```js
this.selectedOptionValues
```

得到的就是：

```js
[
  "201",
  "302"
]
```

注意：

不是：

```js
["Black", "M"]
```

也不是：

```js
[1002]
```

而是两个 Option Value ID。

这就是为什么之前 Liquid 要输出：

```liquid
data-option-value-id="{{ value.id }}"
```

现在你应该理解它的真正用途了。

---

## 五、事件如何从 variant-selects 传递到 product-info？

现在来到一个非常值得学习的架构设计。

在 `variant-selects` 中：

```js
publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
  data: {
    event,
    target,
    selectedOptionValues: this.selectedOptionValues,
  },
});
```

这里的 `publish` 是 Dawn 使用的发布订阅机制。

你可以把它理解为一个事件总线。

而在上一课研究过的：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/product-info.js" title="assets/product-info.js"/>

里面：

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

它订阅了同一个事件。

于是整个过程是：

<box border radius="lg" padding={3} gap={2}>
  <title size="lg">事件传递关系</title>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **用户选择 Black**
    <text color="secondary" size="xs">Radio change</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary" size="lg"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **variant-selects**
    <text color="secondary" size="xs">收集已选 Option Value ID</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary" size="lg"/>
    <text color="secondary" size="xs">publish</text>
  </box>
  <box border radius="md" padding={3} align="center">
    **PUB_SUB_EVENTS.optionValueSelectionChange**
    <text color="secondary" size="xs">事件总线</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary" size="lg"/>
    <text color="secondary" size="xs">subscribe</text>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **product-info**
    <text color="secondary" size="xs">接收事件，开始更新商品信息</text>
  </box>
</box>

为什么不让 `variant-selects` 直接调用 `product-info` 的方法？

因为两个组件应该尽量保持独立。

`variant-selects` 只关心用户选了什么。

`product-info` 才负责商品信息如何更新。

这就是发布订阅模式的价值。

---

## 六、最重要的部分：product-info 如何获得正确的 Variant？

接下来回到 `product-info.js`。

搜索：

```js
handleOptionValueChange
```

源码：

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
      ? this.handleSwapProduct(productUrl, shouldFetchFullPage)
      : this.handleUpdateProductInfo(productUrl),
  });
}
```

这段代码包含整个 Variant 更新流程的关键。

我们先看：

```js
selectedOptionValues
```

例如：

```js
["201", "302"]
```

接下来：

```js
this.buildRequestUrlWithParams(
  productUrl,
  selectedOptionValues,
  shouldFetchFullPage
)
```

进入这个方法：

```js
buildRequestUrlWithParams(
  url,
  optionValues,
  shouldFetchFullPage = false
) {
  const params = [];

  !shouldFetchFullPage &&
    params.push(`section_id=${this.sectionId}`);

  if (optionValues.length) {
    params.push(
      `option_values=${optionValues.join(',')}`
    );
  }

  return `${url}?${params.join('&')}`;
}
```

假设商品 URL 是：

```text
/products/classic-t-shirt
```

那么请求可能是：

```text
/products/classic-t-shirt
  ?section_id=template--123__main
  &option_values=201,302
```

<badge color="success">关键知识点</badge>

**Dawn 没有在浏览器里遍历 `product.variants`，自己计算出对应的 Variant ID。**

它把选中的 Option Value ID 发送给 Shopify，由 Shopify 根据商品数据确定对应的 Variant，并返回重新渲染的 HTML。

这就是整个架构最值得理解的地方。

### 1. 为什么使用 Section Rendering？

因为请求 URL 中有：

```text
section_id=template--123__main
```

Shopify 会根据这个参数返回对应 Section 的 HTML。

例如：

```js
fetch(requestUrl)
  .then(response => response.text())
  .then(responseText => {
    const html = new DOMParser()
      .parseFromString(responseText, 'text/html');

    callback(html);
  });
```

注意：

这里并不是请求一个只返回 Variant JSON 的接口。

它拿到的是 Shopify 根据最新选项重新渲染出来的 HTML。

所以里面已经包含：

- 最新的 Variant ID。
- 最新价格。
- 最新库存状态。
- 最新 SKU。
- 最新商品媒体。
- 最新的选项可用状态。
- 最新的购买按钮状态。

这也解释了为什么 Shopify Theme 开发中，Section Rendering API 非常重要。

---

## 七、拿到新 HTML 后，具体更新哪些东西？

重点看：

```js
handleUpdateProductInfo(productUrl)
```

这个方法。

首先：

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

你还记得上一节 `product-variant-picker.liquid` 最后输出的代码吗？

```liquid
<script type="application/json" data-selected-variant>
  {{ product.selected_or_first_available_variant | json }}
</script>
```

现在就派上用场了。

Shopify 返回 HTML 后，Dawn 从 HTML 中找到这段 JSON，然后解析成真正的 Variant 对象。

例如概念上：

```js
{
  id: 1002,
  title: "Black / M",
  available: true,
  price: 12900,
  featured_media: {
    id: 888
  }
}
```

以上仅为示意数据。

这样，浏览器终于拿到了真正的 Variant ID。

接下来：

### 1. 更新选项状态

```js
this.updateOptionValues(html);
```

它会把服务器返回的新 `variant-selects` 更新到当前页面。

为什么要更新？

因为选中 Color 后，其他选项的可用性可能发生变化。

例如：

| 尺码 | Black | White |
|---|---|---|
| S | 有货 | 有货 |
| M | 有货 | 无货 |
| L | 无货 | 有货 |

当用户切换颜色时，尺码的可用状态也需要重新计算。

这个工作交给 Shopify 服务端计算，然后把结果返回给浏览器。

### 2. 更新浏览器 URL

```js
this.updateURL(productUrl, variant?.id);
```

例如：

```text
/products/classic-t-shirt?variant=1002
```

这样用户刷新页面或者复制 URL 时，就可以定位到对应 Variant。

### 3. 更新购买表单中的 Variant ID

这是非常关键的一步：

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
      new Event('change', { bubbles: true })
    );
  });
}
```

还记得上一课的：

```liquid
<input
  type="hidden"
  name="id"
  value="{{ product.selected_or_first_available_variant.id }}"
>
```

现在终于知道它如何更新了。

用户选择新 Variant 后，Dawn 会把最新的 Variant ID 写入这个隐藏输入框。

因此，当用户点击加购时，提交的就是最新 Variant ID，而不是最初页面加载时的 Variant ID。

### 4. 更新价格、SKU、库存

接下来：

```js
updateSourceFromDestination('price');

updateSourceFromDestination('Sku');

updateSourceFromDestination('Inventory');

updateSourceFromDestination('Volume');

updateSourceFromDestination('Price-Per-Item');
```

这些代码本质上都是：

1. 在服务器返回的新 HTML 中找到对应节点。
2. 找到当前页面中的对应节点。
3. 把新节点的 HTML 内容替换过去。

例如：

```js
const source =
  html.getElementById(`price-${this.sectionId}`);

const destination =
  this.querySelector(`#price-${this.dataset.section}`);

if (source && destination) {
  destination.innerHTML = source.innerHTML;
}
```

这里有一个非常值得注意的设计：

**Dawn 不需要在 JavaScript 中重新计算价格。**

价格计算交给 Shopify Liquid 和 Shopify 商品数据模型。

JavaScript 只负责获取服务器计算好的 HTML，并替换页面对应区域。

### 5. 更新商品图片

```js
this.updateMedia(
  html,
  variant?.featured_media?.id
);
```

这里会根据新 Variant 的 `featured_media` 更新媒体画廊。

例如：

```text
选择 Black
    ↓
Variant ID = 1002
    ↓
featured_media.id = 888
    ↓
展示黑色商品图片
```

它不仅会更新当前激活的媒体，还会根据返回的 HTML 同步媒体列表，并更新媒体弹窗内容。

### 6. 更新购买按钮状态

```js
this.productForm?.toggleSubmitButton(
  html.getElementById(
    `ProductSubmitButton-${this.sectionId}`
  )?.hasAttribute('disabled') ?? true,
  window.variantStrings.soldOut
);
```

例如：

- 新 Variant 有货：按钮可以点击。
- 新 Variant 售罄：按钮禁用。
- 当前组合不存在：进入 unavailable 状态。

最后还会发布：

```js
publish(PUB_SUB_EVENTS.variantChange, {
  data: {
    sectionId: this.sectionId,
    html,
    variant,
  },
});
```

这样其他订阅该事件的组件也能知道 Variant 已经发生变化。

---

## 八、把整个过程串起来

我们用一个完整的例子总结。

假设用户原本选择：

```text
Color: White
Size: S
Variant ID: 1003
Price: $99
```

现在用户将颜色改成 Black。

<box border radius="xl" padding={3} gap={3}>
  <title size="lg">Variant 变化全过程</title>
  <box background="surface-secondary" radius="md" padding={3} gap={1}>
    **① 用户操作**
    <text size="sm">Color: White → Black</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} gap={1}>
    **② variant-selects**
    <text size="sm">收集选中的 Option Value ID</text>
    <text color="secondary" size="xs" tabularNums>例如：201、302</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} gap={1}>
    **③ product-info.js**
    <text size="sm">通过 Section Rendering 请求 Shopify</text>
    <text color="secondary" size="xs">传递 option_values 参数</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} gap={1}>
    **④ Shopify 服务端**
    <text size="sm">根据选项组合解析 Variant，并重新渲染 HTML</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} gap={2}>
    **⑤ 浏览器更新**
    <grid columns={2} gap={2}>
      {#each [{k:"Variant ID",v:"1002"},{k:"Price",v:"$129"},{k:"SKU",v:"TS-BLK-M"},{k:"库存",v:"In stock"}] as item}
        <grid-item>
          <box background="surface-secondary" padding={2} radius="md">
            <text color="secondary" size="xs">{item.k}</text>
            **{item.v}**
          </box>
        </grid-item>
      {/each}
    </grid>
    <text size="sm">同步更新商品图片、选项可用状态、加购按钮。</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface" border radius="md" padding={3} gap={1}>
    **⑥ product-form.js**
    <text size="sm">用户加购时，提交最新 Variant ID 和数量。</text>
  </box>
</box>

---

## 九、再补充一个问题：加购到底是谁负责的？

虽然今天重点是 Variant 选择，但必须把两个组件的职责区分清楚。

| 文件 | 主要职责 |
|---|---|
| `product-variant-picker.liquid` | 输出选项选择 UI |
| `global.js` | 监听选项变化、发布事件 |
| `product-info.js` | 请求新 HTML，更新 Variant 相关信息 |
| `buy-buttons.liquid` | 输出购买表单 |
| `product-form.js` | 监听表单提交，执行 AJAX 加购 |

用户点击加购时：

```js
const formData = new FormData(this.form);

const variantId = formData.get('id');
const quantity = parseInt(formData.get('quantity')) || 1;
```

随后：

```js
fetch(`${routes.cart_add_url}`, config)
```

这才是真正执行加购的地方。

因此，**选择 Variant 和提交加购是两个不同的业务流程，只是通过隐藏表单中的 Variant ID 联系起来。**

源码：

- <Link url="https://github.com/Shopify/dawn/blob/main/assets/product-form.js" title="product-form.js"/>
- <Link url="https://github.com/Shopify/dawn/blob/main/snippets/buy-buttons.liquid" title="buy-buttons.liquid"/>

---

## 十、本课知识检查

这次我准备了三个问题，重点检查你是否真正理解了整个数据流。

{@body const questions = [{q:"用户选择 Black 后，variant-selects 传递给 product-info 的 selectedOptionValues 是什么？",opts:["Variant ID，例如 1002","Option Value ID，例如 [201, 302]","选项文本，例如 ['Black', 'M']","完整的 product 对象"],a:1,why:"Dawn 收集每个已选选项的 data-option-value-id，再通过 option_values 参数交给 Shopify。它不是直接传 Variant ID。"}, {q:"Dawn 为什么请求 Section Rendering，而不是只请求一个 Variant JSON？",opts:["因为浏览器不能处理 JSON","因为 Shopify 服务端可以根据选项重新渲染包含价格、库存、图片、选项状态等内容的 HTML","因为每次切换 Variant 都必须刷新整个页面","因为 Liquid 只能生成 JSON"],a:1,why:"Section Rendering 返回重新渲染的 Section HTML，Dawn 从中提取 Variant JSON 和其他 UI 片段，局部更新页面。"}, {q:"用户选择新 Variant 后，真正决定加购哪个 Variant 的关键数据是什么？",opts:["当前选中的颜色文本","product.options_with_values","购买表单中 name='id' 的隐藏输入框","URL 中的商品 handle"],a:2,why:"product-info.js 将最新 Variant ID 写入购买表单的隐藏输入框，product-form.js 提交 FormData 时读取这个 ID。"}]}
{@body const [answers,setAnswers] = DIL.useState({})}
{@body const [submitted,setSubmitted] = DIL.useState(false)}
<box border radius="xl" padding={3} gap={3}>
  <row align="center" justify="between">
    **本课小测**
    <badge color="info">{Object.keys(answers).length}/3 已回答</badge>
  </row>
  {#each questions as q,i}
    <box gap={2}>
      **{i+1}. {q.q}**
      <radio-group direction="col" value={answers[i] === undefined ? "" : String(answers[i])} disabled={submitted} onChange={v=>setAnswers(old=>({...old,[i]:Number(v)}))}>
        {#each q.opts as opt,j}
          <radio value={String(j)}>{opt}</radio>
        {/each}
      </radio-group>
      {#if submitted}
        <box background="surface-secondary" radius="md" padding={2} gap={1}>
          <row align="center" gap={2}>
            {#if answers[i]===q.a}
              <icon name="check-circle-filled" color="success"/>
              **回答正确**
            {:else}
              <icon name="x-circle" color="danger"/>
              **正确答案：{q.opts[q.a]}**
            {/if}
          </row>
          <text size="sm">{q.why}</text>
        </box>
      {/if}
    </box>
    {#if i!==2}
      <divider color="subtle"/>
    {/if}
  {/each}
  {#if !submitted}
    <button block disabled={Object.keys(answers).length!==3} onClick={()=>setSubmitted(true)}>提交答案</button>
  {:else}
    <title size="xl" color="success" textAlign="center">{questions.filter((q,i)=>answers[i]===q.a).length}/3</title>
    <button block variant="outline" onClick={()=>{setAnswers({});setSubmitted(false)}}>重新作答</button>
  {/if}
</box>
