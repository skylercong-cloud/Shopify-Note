# Dawn 商品库存、数量规则与门店自提

## 一、为什么要把库存、数量和价格放在同一课？

它们看起来是三个独立功能，但在 Dawn 中存在紧密的依赖关系。

假设一个批发商品有如下配置：

| 属性 | Black / M | White / M |
|---|---:|---:|
| 库存数量 | 25 | 8 |
| 最小购买数量 | 5 | 2 |
| 最大购买数量 | 30 | 10 |
| 购买增量 | 5 | 2 |
| 基础单价 | $20 | $25 |
| 买满 10 件单价 | $18 | $23 |

用户选择 Black / M 时，页面应该显示：

- 当前库存状态。
- 数量输入框最小为 5，每次增减 5。
- 达到 10 件时展示对应的阶梯单价。
- 加购按钮根据可购买状态启用或禁用。

用户切换 White / M 后，**这些信息必须一起更新**。

但它们不是同一个 JavaScript 组件负责的。

<box border radius="lg" padding={3} gap={2}>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **VariantSelects**
    <text color="secondary" size="xs">用户切换颜色 / 尺码</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box border radius="md" padding={3} align="center">
    **ProductInfo**
    <text color="secondary" size="xs">请求新 Section HTML，协调更新</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={3}>
        **Inventory**
        <text size="xs" color="secondary">库存展示</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={3}>
        **QuantityInput**
        <text size="xs" color="secondary">数量限制</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={3}>
        **PricePerItem**
        <text size="xs" color="secondary">阶梯单价</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={3}>
        **PickupAvailability**
        <text size="xs" color="secondary">门店自提</text>
      </box>
    </grid-item>
  </grid>
</box>

今天主要研究这些文件：

| 源码 | 职责 |
|---|---|
| [main-product.liquid](https://github.com/Shopify/dawn/blob/main/sections/main-product.liquid) | 输出库存、数量和阶梯价格 HTML |
| [product-info.js](https://github.com/Shopify/dawn/blob/main/assets/product-info.js) | 协调 Variant 切换后的更新 |
| [global.js](https://github.com/Shopify/dawn/blob/main/assets/global.js) | `QuantityInput` 组件 |
| [price-per-item.js](https://github.com/Shopify/dawn/blob/main/assets/price-per-item.js) | 阶梯单价的动态展示 |
| [pickup-availability.js](https://github.com/Shopify/dawn/blob/main/assets/pickup-availability.js) | 自提信息的请求与展示 |
| [pickup-availability.liquid](https://github.com/Shopify/dawn/blob/main/sections/pickup-availability.liquid) | 服务端生成门店自提 HTML |

---

## 二、库存：`available`、`inventory_quantity`、`inventory_policy` 有什么区别？

这是很多 Shopify 开发者容易混淆的地方。

先看三个属性：

```liquid
{{ variant.available }}

{{ variant.inventory_quantity }}

{{ variant.inventory_policy }}
```

它们代表的是不同的业务含义。

| 属性 | 含义 |
|---|---|
| `available` | 当前 Variant 是否可购买 |
| `inventory_quantity` | Variant 的库存数量 |
| `inventory_policy` | 缺货后是否允许继续销售 |
| `inventory_management` | 是否跟踪库存及其管理方式 |

例如：

```text
库存数量：0
库存策略：continue
```

此时：

```liquid
variant.available
```

仍然可能为 `true`。

因为商家允许缺货继续销售。

所以不能简单地写：

```liquid
{% if variant.inventory_quantity > 0 %}
  Add to Cart
{% else %}
  Sold Out
{% endif %}
```

这种判断会错误处理允许超卖的商品。

### 1. Dawn 如何显示库存状态？

在 `main-product.liquid` 的 `inventory` Block 中，可以看到类似以下逻辑：

```liquid
{% if variant.inventory_management == 'shopify' %}

  {% if variant.inventory_quantity > 0 %}

    {% if variant.inventory_quantity <= inventory_threshold %}
      Low stock
    {% else %}
      In stock
    {% endif %}

  {% elsif variant.inventory_policy == 'continue' %}

    Continue selling

  {% else %}

    Out of stock

  {% endif %}

{% endif %}
```

其中的 `inventory_threshold` 是 Theme Editor 中可配置的库存提醒阈值。

例如：

```text
Threshold = 10

库存 25 → In stock
库存 5  → Low stock
库存 0 且 deny → Out of stock
库存 0 且 continue → Continue selling
```

实际代码使用翻译字符串和相关图标，而不是直接写这些英文。

这里还要区分：

- **展示库存状态**：可以使用 `inventory_quantity`、`inventory_policy` 等数据。
- **判断能不能加购**：应该以 Shopify 的 `available` 及数量限制等条件为基础。

官方的 Variant 对象文档也明确区分了库存数量、库存策略和可购买状态。

### 2. 加购按钮还需要检查最小数量

看 `snippets/buy-buttons.liquid`。

它会计算：

```liquid
{% liquid
  assign check_against_inventory = true

  if product.selected_or_first_available_variant.inventory_management != 'shopify'
    or product.selected_or_first_available_variant.inventory_policy == 'continue'
    assign check_against_inventory = false
  endif

  if product.selected_or_first_available_variant.quantity_rule.min
      > product.selected_or_first_available_variant.inventory_quantity
      and check_against_inventory
    assign quantity_rule_soldout = true
  endif
%}
```

为什么需要额外判断？

假设：

```text
库存：3 件
最小购买：5 件
库存策略：deny
```

尽管库存大于 0，但用户最少必须买 5 件，实际上无法满足购买规则。

因此 Dawn 会禁用加购按钮。

**这说明“有库存”和“满足购买条件”不是完全相同的概念。**

---

## 三、Quantity Rules：Shopify 为什么有最小、最大和增量限制？

这是一个非常适合深入学习的功能，尤其是 B2B 商城。

Shopify 的 Variant 可以包含：

```liquid
variant.quantity_rule.min
variant.quantity_rule.max
variant.quantity_rule.increment
```

官方默认值是：

```js
{
  min: 1,
  max: null,
  increment: 1
}
```

当商家配置 B2B 数量规则后，可以变成：

```js
{
  min: 5,
  max: 50,
  increment: 5
}
```



这代表：

- 至少购买 5 件。
- 最多购买 50 件。
- 数量必须符合每次增加 5 件的规则。

### 1. Dawn 如何输出数量输入框？

打开 `main-product.liquid`，搜索 `quantity_selector`。

你会看到：

```liquid
<quantity-input
  class="quantity"
  data-url="{{ product.url }}"
  data-section="{{ section.id }}"
>
  <button name="minus" type="button">
    -
  </button>

  <input
    class="quantity__input"
    type="number"
    name="quantity"
    min="{{ product.selected_or_first_available_variant.quantity_rule.min }}"
    data-min="{{ product.selected_or_first_available_variant.quantity_rule.min }}"
    step="{{ product.selected_or_first_available_variant.quantity_rule.increment }}"
    data-cart-quantity="{{ cart_qty }}"
    form="{{ product_form_id }}"
  >

  <button name="plus" type="button">
    +
  </button>
</quantity-input>
```

上面是从源码中摘取的关键结构，省略了 `max`、ARIA 属性和其他显示代码。

注意其中四个重要字段：

| 字段 | 用途 |
|---|---|
| `min` | HTML 输入框最小值 |
| `step` | 每次增加或减少的步长 |
| `data-cart-quantity` | 当前购物车已有数量 |
| `form` | 将数量输入关联到购买表单 |

最后一个非常重要。

数量输入框在 `main-product.liquid` 中，而真正的购买表单在 `buy-buttons.liquid` 中。

这两个控件不一定具有父子关系。

所以 Dawn 通过：

```html
form="product-form-section-id"
```

让数量输入框参与 Product Form 的提交。

也就是说：

```js
new FormData(this.form)
```

能够拿到这个位于表单外部的 `quantity` 输入框。

这不是 Shopify 的特殊语法，而是 HTML 原生的表单关联能力。

---

## 四、QuantityInput：点击 + 和 - 时发生什么？

现在打开：

[assets/global.js](https://github.com/Shopify/dawn/blob/main/assets/global.js)

找到：

```js
class QuantityInput extends HTMLElement
```

构造函数核心：

```js
constructor() {
  super();

  this.input = this.querySelector('input');

  this.changeEvent = new Event(
    'change',
    { bubbles: true }
  );

  this.input.addEventListener(
    'change',
    this.onInputChange.bind(this)
  );

  this.querySelectorAll('button').forEach(
    (button) => button.addEventListener(
      'click',
      this.onButtonClick.bind(this)
    )
  );
}
```

它做了两件事：

1. 监听数量输入框的 `change`。
2. 监听加号、减号按钮的 `click`。

### 1. 为什么使用 stepUp 和 stepDown？

看：

```js
onButtonClick(event) {
  event.preventDefault();

  const previousValue = this.input.value;

  if (event.target.name === 'plus') {
    this.input.stepUp();
  } else {
    this.input.stepDown();
  }

  if (previousValue !== this.input.value) {
    this.input.dispatchEvent(this.changeEvent);
  }
}
```

这里是核心逻辑的简化版。实际源码还对 `data-min` 等情况做了特殊处理。

注意：

```js
this.input.stepUp();
this.input.stepDown();
```

它不是简单地：

```js
input.value = Number(input.value) + 1;
```

因为数量增量可能是 5，或者 10。

例如：

```html
<input type="number" min="5" step="5" value="10">
```

执行：

```js
input.stepUp();
```

会依据输入框的步长规则增加数量。

因此，能够复用浏览器原生的数字输入能力。

### 2. 为什么修改 value 后还要派发 change 事件？

```js
this.input.dispatchEvent(
  new Event('change', {
    bubbles: true
  })
);
```

这是一个重要的 JavaScript 知识点。

**通过 JavaScript 修改 input.value，并不会自动触发 input 或 change 事件。**

所以 Dawn 需要手动派发。

这样其他监听数量变化的组件才能收到通知。

例如：

```text
QuantityInput
    ↓
change
    ↓
PricePerItem
    ↓
更新阶梯价格展示
```

这意味着 QuantityInput 不需要直接知道价格组件在哪里。

它只负责更新数量、派发事件。

---

## 五、ProductInfo 如何处理“购物车已有数量”？

这是刚才 Quantity Rules 中容易忽略的另一层逻辑。

假设一个商品：

```text
最小购买数量：5
最大购买数量：50
购买增量：5
```

用户购物车中已经有 40 件。

这时商品详情页允许再添加多少件？

最多只能再添加：

\[
50-40=10
\]

所以数量输入框不能继续允许用户添加 50 件，否则总数可能超过数量上限。

Dawn 就在 `product-info.js` 中处理了这个问题。

### 1. setQuantityBoundries()

源码中的关键逻辑：

```js
setQuantityBoundries() {
  const data = {
    cartQuantity:
      this.quantityInput.dataset.cartQuantity
        ? parseInt(this.quantityInput.dataset.cartQuantity)
        : 0,

    min:
      this.quantityInput.dataset.min
        ? parseInt(this.quantityInput.dataset.min)
        : 1,

    max:
      this.quantityInput.dataset.max
        ? parseInt(this.quantityInput.dataset.max)
        : null,

    step: parseInt(this.quantityInput.step) || 1,
  };

  let min = data.min;

  const max =
    data.max === null
      ? null
      : data.max - data.cartQuantity;

  // Dawn 后续还会调整 min 和输入框状态
}
```

最值得注意的是：

```js
data.max - data.cartQuantity
```

它计算的是：

**当前还能向购物车添加的数量，而不是整个购物车允许的总数量。**

我们来看一个完整例子。

<box border radius="lg" padding={3} gap={3}>
  **数量规则模拟**
  {@body const [cartQty,setCartQty] = DIL.useState("30")}
  {@body const currentQty = Number(cartQty)}
  {@body const remaining = Math.max(0,50-currentQty)}
  <box gap={1}>
    <label>购物车中已有数量</label>
    <radio-group direction="row" value={cartQty} onChange={setCartQty}>
      <radio value="0">0 件</radio>
      <radio value="30">30 件</radio>
      <radio value="45">45 件</radio>
      <radio value="50">50 件</radio>
    </radio-group>
  </box>
  <grid columns={3} gap={2}>
    <grid-item>
      <box background="surface-secondary" padding={3} radius="md" gap={1}>
        <text color="secondary" size="xs">最大数量</text>
        <title size="xl" tabularNums>50</title>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" padding={3} radius="md" gap={1}>
        <text color="secondary" size="xs">已在购物车</text>
        <title size="xl" tabularNums>{currentQty}</title>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" padding={3} radius="md" gap={1}>
        <text color="secondary" size="xs">剩余可加购</text>
        <title size="xl" tabularNums>{remaining}</title>
      </box>
    </grid-item>
  </grid>
  <box gap={1}>
    <row justify="between" align="center">
      <text size="sm" weight="medium">当前购买数量</text>
      <text size="sm" color="secondary">{currentQty} / 50</text>
    </row>
    <box background="surface-tertiary" radius="full" height="12px" clip>
      <box background={remaining===0?"#DC8B57":"#16A34A"} height="100%" width={`${currentQty/50*100}%`} radius="full"/>
    </box>
  </box>
  {#if remaining===0}
    <text color="danger" weight="medium" size="sm">已达到最大购买数量，不能继续添加。</text>
  {:else}
    <text color="success" weight="medium" size="sm">还可以添加最多 {remaining} 件（示例增量为 5）。</text>
  {/if}
  <caption>这是基于 max - cartQuantity 的规则演示，不代表 Shopify 服务器实际库存或实时购买资格。</caption>
</box>

这里还有一个容易混淆的地方。

`quantity_rule.min` 是订单购买数量规则，而详情页输入框的当前最小值，还可能受到购物车已有数量影响。

例如已经购买了 30 件，增量为 5，则下一次加购不一定还要再添加 30 件，而是按照剩余数量和步长进行控制。

Dawn 通过 `setQuantityBoundries()` 动态计算输入框上下限。

---

## 六、购物车更新后，商品详情页为什么也会发生变化？

假设商品详情页当前显示：

```text
已有 10 件在购物车
```

然后用户打开 Cart Drawer，把数量从 10 改成 20。

此时商品详情页原来的 `data-cart-quantity` 已经过时了。

如果不更新，就可能导致数量上限计算错误。

所以 ProductInfo 不仅监听 Variant 变化，也监听购物车变化。

源码：

```js
initQuantityHandlers() {
  if (!this.quantityInput) return;

  this.quantityForm =
    this.querySelector('.product-form__quantity');

  if (!this.quantityForm) return;

  this.setQuantityBoundries();

  if (!this.dataset.originalSection) {
    this.cartUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.cartUpdate,
      this.fetchQuantityRules.bind(this)
    );
  }
}
```

注意：

```js
PUB_SUB_EVENTS.cartUpdate
```

这正是我们之前深入学过的 Pub/Sub 事件。

### 1. fetchQuantityRules()

```js
fetchQuantityRules() {
  const currentVariantId =
    this.productForm?.variantIdInput?.value;

  if (!currentVariantId) return;

  return fetch(
    `${this.dataset.url}?variant=${currentVariantId}&section_id=${this.dataset.section}`
  )
    .then((response) => response.text())
    .then((responseText) => {
      const html = new DOMParser().parseFromString(
        responseText,
        'text/html'
      );

      this.updateQuantityRules(
        this.dataset.section,
        html
      );
    });
}
```

有没有发现？

这里又使用了 Section Rendering。

但与切换 Variant 时的请求不同：

切换 Variant：

```text
/products/t-shirt
?section_id=main
&option_values=111,222
```

购物车更新后刷新数量规则：

```text
/products/t-shirt
?variant=456789
&section_id=main
```

为什么第二次请求使用 Variant ID？

因为当前 Variant 已经确定了。

这里只需要让 Shopify 重新计算：

```liquid
cart | item_count_for_variant: variant.id
```

然后输出最新的数量规则和购物车已有数量。

### 2. updateQuantityRules()

源码：

```js
const quantityFormUpdated =
  html.getElementById(`Quantity-Form-${sectionId}`);

const selectors = [
  '.quantity__input',
  '.quantity__rules',
  '.quantity__label'
];
```

Dawn 从返回的 HTML 中读取三个部分：

- 数量输入框。
- 数量规则提示。
- 数量标签。

对于输入框，它重点同步：

```js
const attributes = [
  'data-cart-quantity',
  'data-min',
  'data-max',
  'step'
];
```

对于数量规则和标签，则更新对应的 HTML。

这样就完成了：

```text
Cart Drawer 修改商品数量
          ↓
publish(cartUpdate)
          ↓
ProductInfo 收到事件
          ↓
请求当前 Product Section
          ↓
Shopify 重新读取 Cart 数据
          ↓
返回最新的数量规则 HTML
          ↓
ProductInfo 更新输入框
```

这体现了 Dawn 的一个重要架构特点：

**购物车状态变化后，不是让每个组件自己猜测新的业务规则，而是重新获取 Shopify 服务端的权威数据。**

---

## 七、阶梯定价：PricePerItem 为什么需要独立组件？

现在进入价格部分。

假设一个 B2B 商品有这样的阶梯价格：

| 购买数量 | 单价 |
|---|---:|
| 1～9 件 | $20 |
| 10～49 件 | $18 |
| 50 件及以上 | $16 |

这种价格规则通常称为 Volume Pricing（阶梯定价）。

Shopify 的 Variant 对象中包含：

```liquid
variant.quantity_price_breaks
```

每一条记录的核心属性是：

```liquid
price_break.minimum_quantity
price_break.price
```

例如：

```js
[
  {
    minimum_quantity: 10,
    price: 1800
  },
  {
    minimum_quantity: 50,
    price: 1600
  }
]
```

注意，这里的价格数值示例按常见货币最小单位表达；Liquid 中展示时应使用 `money` 等格式化过滤器。

这些阶梯价格来自 Shopify 的定价数据，而不是 Dawn 随意定义的价格规则。

### 1. Dawn 如何在 Liquid 中展示阶梯价格？

在 `main-product.liquid` 中：

```liquid
{% if product.selected_or_first_available_variant.quantity_price_breaks.size > 0 %}

  <volume-pricing id="Volume-{{ section.id }}">
    <ul>
      {% for price_break in product.selected_or_first_available_variant.quantity_price_breaks %}

        <li>
          <span>
            {{ price_break.minimum_quantity }}+
          </span>

          <span>
            {{ price_break.price | money }}
          </span>
        </li>

      {% endfor %}
    </ul>
  </volume-pricing>

{% endif %}
```

这是用于说明结构的简化代码。

真正的 Dawn 还包含基础单价、数量限制提示，以及折扣价展示逻辑。

### 2. 为什么需要 price-per-item.js？

如果价格表只在页面初次加载时渲染一次，用户改变数量后，当前单价展示不会自动变化。

所以 Dawn 实现了：

```js
class PricePerItem extends HTMLElement
```

对应：

```html
<price-per-item>
```

打开：

[assets/price-per-item.js](https://github.com/Shopify/dawn/blob/main/assets/price-per-item.js)

构造函数：

```js
constructor() {
  super();

  this.variantId = this.dataset.variantId;

  this.input = document.getElementById(
    `Quantity-${this.dataset.sectionId || this.dataset.variantId}`
  );

  if (this.input) {
    this.input.addEventListener(
      'change',
      this.onInputChange.bind(this)
    );
  }

  this.getVolumePricingArray();
}
```

这里又出现了熟悉的设计。

`PricePerItem` 不直接修改数量输入框，而是监听它的 `change`。

### 3. 它为什么还要订阅 Variant 和 Cart 事件？

在 `connectedCallback()` 中：

```js
this.variantIdChangedUnsubscriber = subscribe(
  PUB_SUB_EVENTS.variantChange,
  (event) => {
    this.variantId = event.data.variant.id.toString();
    this.getVolumePricingArray();
  }
);
```

当 Variant 切换时：

- 当前 Variant ID 改变。
- 对应的阶梯价格可能改变。
- 因此重新读取阶梯价格表。

此外还监听：

```js
subscribe(
  PUB_SUB_EVENTS.cartUpdate,
  (response) => {
    // 根据购物车最新数量更新当前单价
  }
);
```

为什么？

因为阶梯价格可能取决于购物车中已有的同一 Variant 数量和当前准备加购的数量。

例如：

```text
购物车已有：7 件
本次准备加购：5 件

参与阶梯价格判断的数量：
7 + 5 = 12 件
```

如果满 10 件触发单价 $18，那么当前商品详情页就需要展示对应的阶梯价格信息。

Dawn 的 `PricePerItem` 正是根据已有数量、输入数量和 Shopify 返回的阶梯配置更新前端显示。

需要特别注意：

**PricePerItem 更新的是用户看到的价格提示，不是 Shopify 服务器上的实际成交价格。**

最后真正采用什么价格，仍由 Shopify 在购物车及结算流程中计算。

---

## 八、Pickup Availability：Dawn 如何实现门店自提库存？

现在进入今天最后一个核心模块。

假设用户购买一双鞋。

商品详情页可能展示：

<box border radius="lg" padding={3} gap={3}>
  **Pickup availability**
  <row align="center" gap={2}>
    <icon name="check-circle" color="success" size="lg"/>
    <box flex="1" gap={1}>
      **Pickup available at Downtown Store**
      <text color="secondary" size="xs">Usually ready in 2 hours</text>
    </box>
  </row>
  <divider color="subtle"/>
  <row align="center" justify="between">
    <text color="secondary" size="sm">Check availability at other stores</text>
    <icon name="chevron-right" color="secondary"/>
  </row>
  <caption>示意数据，并非真实门店库存。</caption>
</box>

它和前面讲的商品整体库存是两个不同的概念。

商品可能可以在线购买，但某个门店不能自提。

反过来，有些门店可通过库存调拨提供自提服务，即使该门店当前没有现货。

Shopify 官方的 Pickup Availability 文档也明确说明了门店调拨会影响自提可用性与预计准备时间。

### 1. 门店自提的 Liquid 数据

核心对象：

```liquid
product_variant.store_availabilities
```

Dawn 在 `sections/pickup-availability.liquid` 中：

```liquid
{% assign pick_up_availabilities =
  product_variant.store_availabilities
  | where: 'pick_up_enabled', true
%}
```

注意：

这里使用的是：

```liquid
product_variant
```

而不是普通的：

```liquid
product.selected_or_first_available_variant
```

原因在于 Pickup Availability Section 使用 Variant 专用 URL 请求，Shopify 会在这个请求上下文中提供对应的 `product_variant`。

每条 Store Availability 数据主要包含：

| 属性 | 含义 |
|---|---|
| `location.name` | 门店名称 |
| `location.address` | 门店地址 |
| `available` | 是否可自提 |
| `pick_up_enabled` | 是否启用自提 |
| `pick_up_time` | 预计可取货时间 |

### 2. 为什么 Pickup Availability 单独做成一个 Section？

这也是 Dawn 很有意思的设计。

你可能会想：

既然商品详情页已经渲染了 Variant 数据，为什么不直接在 `main-product.liquid` 中渲染所有门店自提信息？

因为自提信息有自己的请求、展示和生命周期。

Dawn 将它拆成：

```text
buy-buttons.liquid
    ↓
<pickup-availability>
    ↓
pickup-availability.js
    ↓
Shopify Pickup Availability Section
```

它可以独立请求、独立更新，而不需要把所有逻辑放到 `product-info.js` 中。

### 3. 先看 buy-buttons.liquid

相关代码：

```liquid
<pickup-availability
  class="product__pickup-availabilities quick-add-hidden"
  data-root-url="{{ routes.root_url }}"
  data-variant-id="{{ product.selected_or_first_available_variant.id }}"
  data-has-only-default-variant="{{ product.has_only_default_variant }}"
  data-product-page-color-scheme="gradient color-{{ section.settings.color_scheme }}"
  {% if product.selected_or_first_available_variant.available
    and pick_up_availabilities.size > 0
  %}
    available
  {% endif %}
>
  <template>
    <!-- 请求失败后的提示 UI -->
  </template>
</pickup-availability>
```

它首先输出一个容器：

```html
<pickup-availability>
```

此时完整的门店自提 HTML 尚未插入其中。

### 4. pickup-availability.js 如何请求门店数据？

打开：

[assets/pickup-availability.js](https://github.com/Shopify/dawn/blob/main/assets/pickup-availability.js)

构造函数：

```js
constructor() {
  super();

  if (!this.hasAttribute('available')) return;

  this.errorHtml = this.querySelector('template')
    .content.firstElementChild.cloneNode(true);

  this.onClickRefreshList =
    this.onClickRefreshList.bind(this);

  this.fetchAvailability(this.dataset.variantId);
}
```

这里有一个关键判断：

```js
if (!this.hasAttribute('available')) return;
```

当这个组件没有 `available` 属性时，初始化阶段不会执行自提请求。

接下来：

```js
fetchAvailability(variantId) {
  if (!variantId) return;

  let rootUrl = this.dataset.rootUrl;

  if (!rootUrl.endsWith('/')) {
    rootUrl = rootUrl + '/';
  }

  const variantSectionUrl =
    `${rootUrl}variants/${variantId}/?section_id=pickup-availability`;

  fetch(variantSectionUrl)
    .then((response) => response.text())
    .then((text) => {
      const sectionInnerHTML = new DOMParser()
        .parseFromString(text, 'text/html')
        .querySelector('.shopify-section');

      this.renderPreview(sectionInnerHTML);
    });
}
```

注意这个 URL：

```http
GET /variants/456789/?section_id=pickup-availability
```

这与我们之前学习的商品 Section Rendering 不一样。

商品信息更新：

```http
GET /products/t-shirt?section_id=main&option_values=111,222
```

门店自提：

```http
GET /variants/456789/?section_id=pickup-availability
```

**它直接根据 Variant ID 请求对应的自提 Section。**

Shopify 官方文档也使用这个 Variant 路由来获取自提信息。

### 5. renderPreview 如何更新 DOM？

看：

```js
renderPreview(sectionInnerHTML) {
  const drawer =
    document.querySelector('pickup-availability-drawer');

  if (drawer) drawer.remove();

  if (
    !sectionInnerHTML.querySelector(
      'pickup-availability-preview'
    )
  ) {
    this.innerHTML = '';
    this.removeAttribute('available');
    return;
  }

  this.innerHTML = sectionInnerHTML.querySelector(
    'pickup-availability-preview'
  ).outerHTML;

  this.setAttribute('available', '');

  document.body.appendChild(
    sectionInnerHTML.querySelector(
      'pickup-availability-drawer'
    )
  );

  // ...
}
```

这里发生了两次 DOM 更新。

第一：

```js
this.innerHTML = preview.outerHTML;
```

更新商品详情页中的自提状态。

第二：

```js
document.body.appendChild(drawer);
```

将完整的门店自提抽屉插入 `body`。

为什么把 Drawer 放到 body？

这样可以让抽屉作为独立的顶层 UI 进行管理，避免被商品信息区域的布局和定位限制影响。

### 6. Variant 切换时，自提信息怎么同步？

还记得 `product-info.js` 中的这行代码吗？

```js
this.pickupAvailability?.update(variant);
```

它最终调用：

```js
update(variant) {
  if (variant?.available) {
    this.fetchAvailability(variant.id);
  } else {
    this.removeAttribute('available');
    this.innerHTML = '';
  }
}
```

所以：

```text
切换 Variant
      ↓
Shopify 返回新 Variant
      ↓
ProductInfo 调用 PickupAvailability.update()
      ↓
根据新 Variant ID 请求 Pickup Section
      ↓
Shopify 重新渲染门店自提 HTML
      ↓
替换自提状态与 Drawer
```

注意，这意味着一次 Variant 切换**可能触发不止一个请求**：

- 请求 Product Section，更新商品价格、库存、图片等。
- 请求 Pickup Availability Section，更新门店自提。

这两个功能虽然最终都会更新页面，却分别由不同组件管理。

---

## 九、从源码中发现一个值得优化的问题

现在我们不只要会阅读源码，还要学会评估实现质量。

比较一下两个组件的异步请求机制。

### ProductInfo

```js
this.abortController?.abort();

this.abortController = new AbortController();

fetch(url, {
  signal: this.abortController.signal
});
```

它会取消之前未完成的 Variant 请求。

### PickupAvailability

```js
fetch(variantSectionUrl)
  .then((response) => response.text())
  .then((text) => {
    this.renderPreview(...);
  });
```

它没有使用 AbortController。

假设用户快速切换：

```text
Black / M
    ↓
White / M
    ↓
Blue / M
```

每次都可能发起 Pickup Availability 请求。

如果响应乱序，就存在旧自提信息覆盖新自提信息的风险。

例如：

<box border radius="lg" padding={3} gap={3}>
  **异步请求竞态**
  <list connector="solid" marker="number" gap={2}>
    <list-item>
      用户选择 Black，发起请求 A。
    </list-item>
    <list-item>
      用户选择 White，发起请求 B。
    </list-item>
    <list-item>
      B 先返回，页面显示 White 的自提信息。
    </list-item>
    <list-item>
      A 后返回，页面又被更新成 Black 的自提信息。
    </list-item>
  </list>
  <text color="danger" weight="medium" size="sm">最终商品是 White，但自提状态可能是 Black。</text>
</box>

这是从当前实现推导出的潜在竞态，不表示所有商店都一定会出现。

### 如何优化？

可为 PickupAvailability 增加 AbortController。

下面是基于原组件的改造示意：

```js
class PickupAvailability extends HTMLElement {
  abortController = null;

  async fetchAvailability(variantId) {
    if (!variantId) return;

    this.abortController?.abort();

    const controller = new AbortController();
    this.abortController = controller;

    const rootUrl = this.dataset.rootUrl.endsWith('/')
      ? this.dataset.rootUrl
      : `${this.dataset.rootUrl}/`;

    const url =
      `${rootUrl}variants/${variantId}/?section_id=pickup-availability`;

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();

      if (controller.signal.aborted) return;

      const doc = new DOMParser()
        .parseFromString(text, 'text/html');

      const section = doc.querySelector('.shopify-section');

      if (!section) {
        throw new Error('Pickup Section not found');
      }

      this.renderPreview(section);
    } catch (error) {
      if (error.name === 'AbortError') return;

      console.error(error);
      this.renderError();
    }
  }

  update(variant) {
    if (!variant?.available) {
      this.abortController?.abort();
      this.removeAttribute('available');
      this.innerHTML = '';
      return;
    }

    this.fetchAvailability(variant.id);
  }
}
```

这段代码主要演示并发控制，并不是可直接替换原文件的完整版本；完整改造还需要保留 Dawn 的构造函数、重试事件和 Drawer 生命周期管理。

这里最重要的是理解：

**同一个用户动作可能触发多个独立组件的异步请求，每个组件都需要保证自己的结果不会过期。**

这是成熟前端项目中非常重要的工程问题。

---

## 十、把所有组件的联动关系串起来

现在你应该能理解为什么 Dawn 要使用多个 Web Components 和 Pub/Sub。

<box border radius="lg" padding={3} gap={2}>
  <title size="lg">商品状态联动架构</title>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **VariantSelects**
    <text size="xs" color="secondary">用户改变商品选项</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box border radius="md" padding={3} align="center">
    **ProductInfo**
    <text size="xs" color="secondary">Section Rendering + Variant JSON</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box background="surface-secondary" radius="md" padding={3} gap={2}>
    **同步商品详情**
    <grid columns={2} gap={2}>
      {#each ["Price","Inventory","SKU","Media Gallery","Quantity Rules","ProductForm"] as item}
        <grid-item>
          <row align="center" gap={1}>
            <icon name="check" color="success" size="sm"/>
            <text size="sm">{item}</text>
          </row>
        </grid-item>
      {/each}
    </grid>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box border radius="md" padding={3} align="center">
    **publish(variantChange)**
    <text size="xs" color="secondary">通知订阅组件新的 Variant 已确定</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **PricePerItem**
    <text size="xs" color="secondary">重新读取阶梯价格，更新单价</text>
  </box>
  <divider color="subtle"/>
  <box border radius="md" padding={3} align="center">
    **PickupAvailability**
    <text size="xs" color="secondary">由 ProductInfo 直接调用，单独请求自提 Section</text>
  </box>
  <divider color="subtle"/>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **Cart Update**
    <text size="xs" color="secondary">购物车变化后，重新刷新数量规则和价格提示</text>
  </box>
</box>

注意：PickupAvailability 这里是由 ProductInfo 直接调用 `update()`，不是通过订阅 `variantChange` 事件。不同模块虽然都响应 Variant 变化，但通信机制不一定完全相同。

---

## 十一、实际调试：建议你做四个实验

你可以直接使用 Dawn 的开发主题。

| 实验 | 操作 | 观察重点 |
|---|---|---|
| 库存 | 切换有货、售罄、允许继续销售的 Variant | `available`、按钮状态、Inventory HTML |
| 数量规则 | 设置最小数量、最大数量与增量 | `min`、`max`、`step` |
| 阶梯定价 | 改变购买数量 | `PricePerItem.updatePricePerItem()` |
| 门店自提 | 切换不同 Variant | `/variants/{id}/?section_id=pickup-availability` |

可以先在 Console 执行：

```js
const productInfo = document.querySelector('product-info');

const quantity = productInfo?.querySelector(
  '.quantity__input'
);

console.table({
  variantId: productInfo?.querySelector(
    'product-form input[name="id"]'
  )?.value,

  quantity: quantity?.value,
  min: quantity?.min,
  max: quantity?.max,
  step: quantity?.step,
  cartQuantity: quantity?.dataset.cartQuantity,

  pickupAvailable: productInfo?.querySelector(
    'pickup-availability'
  )?.hasAttribute('available'),
});
```

再切换 Variant、修改购物车数量，观察这些数据何时变化。

为了验证异步请求，建议同时打开 Network，过滤：

```text
section_id=
```

你会发现商品详情页中的多个功能，都在使用 Shopify Section Rendering，但它们的触发时机、请求参数和 DOM 更新范围各不相同。

---

## 十二、本课总结

今天真正需要记住的是以下几个概念。

| 概念 | 负责组件 | 核心知识 |
|---|---|---|
| 库存状态 | main-product.liquid | 库存数量不等于可购买状态 |
| 数量限制 | QuantityInput | min、max、step |
| 剩余可购买数量 | ProductInfo | 最大数量减去购物车已有数量 |
| 阶梯单价 | PricePerItem | 输入数量与已有数量共同影响展示 |
| 门店自提 | PickupAvailability | Variant 专用 Section Rendering |
| 数据同步 | Pub/Sub + Section Rendering | 购物车和 Variant 变化后刷新相关 UI |

我们还发现了一个比较深入的工程问题：

**即使 Dawn 使用了组件化架构，每个独立组件的异步请求也仍然需要考虑竞态、取消请求、DOM 生命周期以及状态一致性。**

这不只是 Shopify 开发知识，也是非常实用的前端架构知识。

## 参考资料

- [Show pickup availability on product pages](https://shopify.dev/docs/storefronts/themes/delivery-fulfillment/pickup-availability)
- [Liquid objects: quantity_rule](https://shopify.dev/docs/api/liquid/objects/quantity_rule)
- [QuantityRule - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/QuantityRule)
- [QuantityRule - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/quantityrule)
- [QuantityRule - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/QuantityRule)
- [StoreAvailability - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/StoreAvailability)
- [StoreAvailability - Storefront API](https://shopify.dev/docs/api/storefront/2025-10/objects/storeavailability)
- [QuantityRule - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/latest/objects/quantityrule)
- [Theme store requirements](https://shopify.dev/docs/storefronts/themes/store/requirements)
- [Support local pickup on storefronts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections/local-pickup)
- [QuantityRule - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/unstable/objects/QuantityRule)
- [Liquid objects: variant](https://shopify.dev/docs/api/liquid/objects/variant)
- [Liquid objects: quantity_price_break](https://shopify.dev/docs/api/liquid/objects/quantity_price_break)
- [Liquid objects: product](https://shopify.dev/docs/api/liquid/objects/product)
- [QuantityPriceBreak - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/QuantityPriceBreak)
- [QuantityPriceBreak - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/2026-01/objects/QuantityPriceBreak)
- [QuantityPriceBreak - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/latest/objects/QuantityPriceBreak)
- [QuantityPriceBreak - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/quantitypricebreak)
- [Product Variant](https://shopify.dev/docs/api/admin-rest/unstable/resources/product-variant)
- [Product - Storefront API](https://shopify.dev/docs/api/storefront/2026-01/objects/Product)
- [Product - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/Product)
