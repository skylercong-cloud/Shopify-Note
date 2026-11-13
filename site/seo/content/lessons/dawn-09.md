# Cart 数据模型与 Checkout：购物车中的数据是如何传递到订单的？


上一课研究了 Dawn 的购物车交互机制：

- Cart Drawer 如何打开和关闭。
- Ajax Cart API 如何修改购物车。
- Section Rendering 如何更新购物车 DOM。
- Pub/Sub 如何同步不同组件。
- Dawn 如何处理请求并发和 Checkout 前的等待。

今天我们进一步研究一个更偏业务、但对 Theme 开发非常重要的问题：

**购物车里除了商品、Variant 和数量，还能保存哪些数据？这些数据又是如何进入 Checkout，最终成为订单数据的？**

例如，假设你正在开发一个跨境电商网站：

用户购买一件 T-Shirt，同时：

- 选择礼品包装。
- 填写定制文字。
- 参加某个营销活动。
- 选择订阅购买。
- 使用优惠券。

这些信息分别应该存在哪里？

如果全部塞进 `cart.items`，显然不合理。Shopify 为不同层级的数据提供了不同的字段。

今天先建立一个整体的数据模型，再逐个结合 Dawn 源码分析。

## 一、先建立购物车的数据模型

我把 Shopify Cart 中值得关注的数据分成五类：

<box border radius="lg" padding={3} gap={3}>
  <title size="lg">Shopify Cart 数据结构</title>
  <box background="surface-secondary" radius="md" padding={3} gap={1}>
    **Cart（整个购物车）**
    <text color="secondary" size="xs">购物车级数据</text>
    - `note`
    - `attributes`
    - `currency`
    - `total_price`
    - `cart_level_discount_applications`
  </box>
  <box padding={{left:3}} gap={2}>
    <row align="center" gap={2}>
      <icon name="corner-down-right" color="secondary"/>
      **items[]**
    </row>
    <box border radius="md" padding={3} gap={1}>
      **Cart Item A**
      - `product_id`
      - `variant_id`
      - `quantity`
      - `key`
      - `properties`
      - `selling_plan_allocation`
      - `line_level_discount_allocations`
    </box>
    <box border radius="md" padding={3} gap={1}>
      **Cart Item B**
      - `product_id`
      - `variant_id`
      - `quantity`
      - `key`
      - `properties`
      - `selling_plan_allocation`
      - `line_level_discount_allocations`
    </box>
  </box>
</box>

这里最重要的是区分两个层级：

**Cart 级别：** 描述整个购物车。

**Cart Item 级别：** 描述某一条购买记录。

例如：

| 业务需求 | 对应字段 |
|---|---|
| 整个订单的配送备注 | `cart.note` |
| 整个订单的营销活动 ID | `cart.attributes` |
| 某件商品的定制文字 | `item.properties` |
| 某件商品的订阅计划 | `selling_plan` |
| 某件商品的折扣 | `line_level_discount_allocations` |
| 整个购物车的折扣 | `cart_level_discount_applications` |

记住这个分类，后面就不会混淆。

## 二、Line Item Properties：商品行项目属性

这是 Theme 开发中非常常用的功能。

假设你卖的是定制 T-Shirt。

用户购买时，除了选择商品规格，还需要填写：

```text
商品：T-Shirt
颜色：Black
尺码：M
定制文字：Hello World
礼品包装：Yes
```

其中：

- 颜色、尺码属于 Variant Option。
- 定制文字、礼品包装属于 Line Item Properties。

它们有什么区别？

Variant Option 决定用户购买的是哪个 Variant。

Line Item Properties 则是用户在购买时额外提供的信息，不会因此创建新的 Variant。

### 1. 如何在 Liquid 中创建 Line Item Properties？

在 Product Form 中添加普通表单元素即可。

```liquid
{% form 'product', product, id: 'product-form' %}

  <!-- Variant ID -->
  <input
    type="hidden"
    name="id"
    value="{{ product.selected_or_first_available_variant.id }}"
  >

  <!-- 定制文字 -->
  <input
    type="text"
    name="properties[Engraving]"
    placeholder="Enter your text"
  >

  <!-- 礼品包装 -->
  <select name="properties[Gift wrap]">
    <option value="No">No</option>
    <option value="Yes">Yes</option>
  </select>

  <button type="submit">
    Add to cart
  </button>

{% endform %}
```

这里最重要的是命名规则：

```html
name="properties[属性名称]"
```

Shopify 会将这些表单字段解析为一个对象。

例如：

```json
{
  "Engraving": "Hello World",
  "Gift wrap": "Yes"
}
```

最终购物车中的商品数据类似：

```json
{
  "variant_id": 123456789,
  "quantity": 1,
  "properties": {
    "Engraving": "Hello World",
    "Gift wrap": "Yes"
  }
}
```

官方文档：[Add line item properties](https://shopify.dev/docs/api/ajax/reference/cart#add-line-item-properties)。

### 2. Dawn 是怎么处理这些属性的？

现在回到 Dawn 源码。

打开：

`assets/product-form.js`

找到：

```js
const formData = new FormData(this.form);
```

然后：

```js
config.body = formData;

fetch(`${routes.cart_add_url}`, config);
```

这两句非常关键。

Dawn 并没有手动去读取：

```js
properties.Engraving
properties['Gift wrap']
```

而是直接：

```js
new FormData(this.form)
```

把整个 Product Form 中的表单字段序列化，然后提交给 Shopify。

因此，只要你的自定义输入框属于这个 Product Form，就能够自动参与加购请求。

这意味着：

**你完全可以通过 Liquid 添加自定义购买信息，而不需要修改 Dawn 的 product-form.js。**

当然，如果你的输入框不在 Product Form 内，就需要通过 `form` 属性关联表单，或者自己处理数据。

再看 Dawn 的一个真实案例。

打开：

[snippets/gift-card-recipient-form.liquid](https://github.com/Shopify/dawn/blob/main/snippets/gift-card-recipient-form.liquid)

Dawn 原生支持礼品卡发送给指定收件人。

其中就有：

```liquid
<input
  type="email"
  name="properties[Recipient email]"
>

<input
  type="text"
  name="properties[Recipient name]"
>

<textarea
  name="properties[Message]"
></textarea>
```

这就是 Line Item Properties 的实际应用。

Dawn 利用同一套 Product Form 机制，把收件人信息一起提交给 Shopify。

### 3. 加入购物车后，如何读取这些属性？

Liquid：

```liquid
{% for item in cart.items %}

  {{ item.product.title }}

  {% for property in item.properties %}

    {{ property.first }}:
    {{ property.last }}

  {% endfor %}

{% endfor %}
```

例如：

```text
T-Shirt

Engraving: Hello World
Gift wrap: Yes
```

Ajax：

```js
fetch(`${routes.cart_url}.js`)
  .then(res => res.json())
  .then(cart => {

    cart.items.forEach(item => {

      console.log(item.properties);

    });

  });
```

你可以在购物车页面、Cart Drawer、Quick Order List 等地方使用这些属性。

Shopify 官方也提供了在购物车页面遍历 `item.properties` 的示例。

### 4. 一个重要细节：以下划线开头的属性

Shopify 有一个特殊约定：

如果 Line Item Property 的 key 以下划线 `_` 开头，它就是 Private Line Item Property。

例如：

```html
<input
  type="hidden"
  name="properties[_campaign_id]"
  value="summer-2026"
>
```

它与普通属性的区别：

| 属性 | 普通属性 | Private 属性 |
|---|---|---|
| 购物车数据中存在 | 是 | 是 |
| Ajax API 可读取 | 是 | 是 |
| Liquid 可读取 | 是 | 是 |
| Checkout 中可见 | 是 | 否 |
| Shopify Admin 订单详情中可见 | 是 | 是 |

这里有个特别重要的误区：

**Private 并不意味着数据保密。**

它只是让属性在 Checkout 等界面中不显示，并不是安全机制。

例如，你仍然可以通过 Ajax Cart API 读取 `_campaign_id`。

如果你希望在购物车页面也隐藏它，需要 Theme 自己过滤。

Dawn 已经做了这个处理。

在 `snippets/cart-drawer.liquid` 中：

```liquid
{% for property in item.properties %}

  {% assign property_first_char =
    property.first | slice: 0
  %}

  {% if property.last != blank
    and property_first_char != '_'
  %}

    {{ property.first }}:
    {{ property.last }}

  {% endif %}

{% endfor %}
```

它会过滤掉所有以下划线开头的属性。

这正是 Dawn 对 Private Properties 的处理方式。

官方文档：[Private line item properties](https://shopify.dev/docs/api/ajax/reference/cart#private-properties-and-attributes)。

### 5. Line Item Properties 有一个非常重要的副作用

假设：

```text
商品：T-Shirt
Variant：Black / M
```

用户添加两次：

第一次：

```json
{
  "Engraving": "Alice"
}
```

第二次：

```json
{
  "Engraving": "Bob"
}
```

你可能认为它们应该合并成一条记录：

```text
T-Shirt Black/M × 2
```

但 Shopify 会将它们拆成两条 Cart Item：

```text
T-Shirt Black/M × 1
  Engraving: Alice

T-Shirt Black/M × 1
  Engraving: Bob
```

因为它们的购买属性不同。

这也解释了上一课为什么我强调：

**Variant ID 不能唯一标识购物车中的一条商品记录，Cart Item Key 才更适合精确定位。**

而且，Properties 发生变化时，Cart Item Key 也可能变化。

---

## 三、Cart Attributes：整个购物车的自定义属性

现在换一个场景。

假设用户购买了：

```text
T-Shirt
Shoes
Hat
```

这次购物车来自一个营销活动：

```text
Campaign ID: summer-2026
Source: facebook
```

这些信息应该放到哪个商品的 Properties 里面？

显然不合适。

因为它们描述的是整个购物车，而不是某一个商品。

这就是 Cart Attributes 的用途。

### 1. Cart Attributes 的结构

例如：

```json
{
  "attributes": {
    "Campaign ID": "summer-2026",
    "Source": "facebook",
    "Gift wrap": "Yes"
  }
}
```

在 Liquid 中：

```liquid
{{ cart.attributes['Campaign ID'] }}

{{ cart.attributes['Source'] }}
```

### 2. 如何创建 Cart Attributes？

Shopify 提供了专门的表单命名规则：

```html
name="attributes[属性名称]"
```

例如：

```liquid
<label for="CampaignId">
  Campaign ID
</label>

<input
  id="CampaignId"
  type="text"
  name="attributes[Campaign ID]"
  value="{{ cart.attributes['Campaign ID'] }}"
>
```

提交购物车表单时，Shopify 就能接收到这个属性。

如果使用 Ajax：

```js
fetch(routes.cart_update_url, {
  ...fetchConfig(),

  body: JSON.stringify({
    attributes: {
      'Campaign ID': 'summer-2026',
      'Source': 'facebook'
    }
  })
});
```

注意，`cart/update.js` 既可以更新商品数量，也可以更新购物车属性。

官方文档：[Update cart attributes](https://shopify.dev/docs/api/ajax/reference/cart#update-cart-attributes)。

### 3. Dawn 有没有使用 Cart Attributes？

这里我们结合源码看。

在当前研究的 Dawn 基础版本中：

- `cart-note` 有完整实现。
- `cart.attributes` 没有对应的通用用户输入组件。

也就是说，Dawn 原生提供了购物车备注功能，但如果你需要让用户填写营销活动 ID、礼品包装选择等 Cart Attributes，需要自己添加表单或 Ajax 逻辑。

这其实很简单。

你可以在购物车页面添加：

```liquid
<input
  type="text"
  name="attributes[Campaign ID]"
  value="{{ cart.attributes['Campaign ID'] }}"
  form="cart"
>
```

这里的：

```html
form="cart"
```

很重要。

因为 Dawn 的购物车页面中，商品列表的 form 和 footer 是分开的。

即使这个 input 不在 form 标签内部，也可以通过 `form` 属性关联到：

```html
<form id="cart">
```

这是 HTML 原生表单能力，不是 Shopify 特有的功能。

### 4. Private Cart Attributes

Cart Attributes 也支持 Private 模式。

规则与 Line Item Properties 不完全一样：

- Private Line Item Property：key 前面加一个 `_`。
- Private Cart Attribute：key 前面加两个 `_`。

例如：

```js
{
  attributes: {
    '__internal_campaign_id': 'summer-2026'
  }
}
```

有个重要区别：

Private Cart Attributes 不会出现在 Liquid 的 `cart.attributes` 对象中，也不会通过 Ajax Cart API 返回。

但是它们仍然可以在 Shopify Admin 的订单详情中查看。

因此，不能把 Private Cart Attributes 当成可以通过 Theme 随时读取的隐藏变量。

## 四、Cart Note：购物车备注

Cart Note 和 Cart Attributes 很容易混淆。

它们的主要区别是：

| 对比 | Cart Note | Cart Attributes |
|---|---|---|
| 数据结构 | 一个字符串 | Key-Value 对 |
| 适合用途 | 自由文本备注 | 结构化业务信息 |
| Liquid | `cart.note` | `cart.attributes` |
| Ajax 更新 | `{ note: '...' }` | `{ attributes: {...} }` |

例如：

Cart Note：

```text
Please deliver after 5 PM.
```

Cart Attributes：

```json
{
  "Delivery method": "Express",
  "Gift wrap": "Yes",
  "Campaign ID": "summer-2026"
}
```

### 1. Dawn 是如何实现 Cart Note 的？

打开：

`snippets/cart-drawer.liquid`

找到：

```liquid
{% if settings.show_cart_note %}

  <cart-note class="cart__note field">

    <textarea
      id="CartDrawer-Note"
      name="note"
      placeholder="Order note"
    >{{ cart.note }}</textarea>

  </cart-note>

{% endif %}
```

这里有两个值得注意的地方：

第一：

```liquid
{{ cart.note }}
```

负责将已经保存的备注显示出来。

第二：

```html
<cart-note>
```

它是一个自定义 Web Component。

接着打开：

`assets/cart.js`

找到：

```js
customElements.define(
  'cart-note',
  class CartNote extends HTMLElement {

    constructor() {
      super();

      this.addEventListener(
        'input',
        debounce((event) => {

          const newNote = event.target.value;

          const body = JSON.stringify({
            note: newNote
          });

          fetch(routes.cart_update_url, {
            ...fetchConfig(),
            body
          });

        }, ON_CHANGE_DEBOUNCE_TIMER)
      );

    }

  }
);
```

我这里省略了错误处理和 Standard Events 部分。

整个流程是：

```text
用户输入备注
    ↓
触发 input
    ↓
debounce 300ms
    ↓
获取最新输入内容
    ↓
POST /cart/update.js
    ↓
Shopify 保存 cart.note
```

注意，它并没有在每次输入时都立即请求 Shopify。

这和我们上一课研究的商品数量更新机制是类似的。

### 2. 为什么 Cart Note 使用 cart/update.js？

因为 Cart Note 属于整个购物车。

它不属于某一条商品记录。

因此使用：

```js
{
  note: 'Please deliver after 5 PM'
}
```

而不是：

```js
{
  line: 1,
  properties: {
    note: 'Please deliver after 5 PM'
  }
}
```

后者的意思是给第一条商品记录添加属性，业务含义完全不同。

---

## 五、Selling Plan：订阅商品是如何进入购物车的？

接下来研究一个 Shopify 比较有特色的数据模型。

假设你卖咖啡。

用户有两种购买方式：

```text
一次性购买：

$20 / 袋

订阅购买：

每月配送一次
$16 / 袋
```

用户选择订阅后，购买的不仅仅是一个 Variant，还包含一个 Selling Plan。

### 1. Selling Plan 是什么？

可以理解为：

**Selling Plan 定义了商品的购买计划及其相关规则。**

例如：

```text
Product:
Coffee

Variant:
500g

Selling Plan:
Deliver every month

Selling Plan ID:
183638
```

注意：

Selling Plan 不是 Product Variant，也不是 Line Item Property。

它是 Shopify 独立的购买计划数据。

### 2. 如何将 Selling Plan 加入购物车？

Shopify Ajax Cart API 支持：

```js
fetch(`${routes.cart_add_url}`, {

  method: 'POST',

  headers: {
    'Content-Type': 'application/json'
  },

  body: JSON.stringify({

    items: [
      {
        id: 123456789,
        quantity: 1,
        selling_plan: 183638
      }
    ]

  })

});
```

其中：

```js
selling_plan: 183638
```

就是 Selling Plan ID。

Shopify 返回的购物车商品中，会有：

```json
{
  "variant_id": 123456789,
  "quantity": 1,
  "selling_plan_allocation": {
    "selling_plan": {
      "id": 183638,
      "name": "Deliver every month",
      "recurring_deliveries": true
    }
  }
}
```

`selling_plan_allocation` 表示这个购物车行项目所分配的购买计划。

官方文档：[Add a selling plan](https://shopify.dev/docs/api/ajax/reference/cart#add-a-selling-plan)。

### 3. Dawn 如何展示 Selling Plan？

打开：

`snippets/cart-drawer.liquid`

可以看到：

```liquid
{% if item.selling_plan_allocation != null %}

  <p class="product-option">
    {{ item.selling_plan_allocation.selling_plan.name }}
  </p>

{% endif %}
```

这说明 Dawn 已经考虑了订阅商品在购物车中的展示。

但是这里有一个值得注意的地方：

**当前研究的 Dawn 基础版 `snippets/buy-buttons.liquid` 并没有内置通用的 Selling Plan 选择器。**

它的购物车展示能力，并不代表它本身就提供了完整的订阅购买 UI。

如果需要订阅选择功能，通常需要订阅 App 或者自定义购买控件提供 Selling Plan 选择器。

例如：

```html
<select name="selling_plan">

  <option value="">
    One-time purchase
  </option>

  <option value="183638">
    Deliver every month
  </option>

</select>
```

因为 Dawn 使用：

```js
const formData = new FormData(this.form);
```

所以只要这个控件位于 Product Form 中，选择的 Selling Plan ID 就能随加购请求一起提交。

这也是为什么我之前说，理解 Dawn 的 ProductForm 比单纯理解 `cart/add.js` 更重要。

它实际上是连接 Theme 表单与 Shopify Cart API 的桥梁。

---

## 六、Discount：折扣数据是如何进入购物车的？

这一部分也很重要。

Shopify 的折扣不是简单地把商品价格改成一个新价格。

它有自己的折扣计算和分配机制。

我们先区分两种情况。

### 1. Line Item Discount

商品行项目级别的折扣。

例如：

```text
T-Shirt

原价：$100
折扣：$20

最终价格：$80
```

Liquid 中：

```liquid
{{ item.original_price | money }}

{{ item.final_price | money }}
```

其中：

- `original_price`：原始单件价格。
- `final_price`：折扣后的单件价格。

如果你想查看折扣具体信息：

```liquid
{% for discount in item.line_level_discount_allocations %}

  {{ discount.discount_application.title }}

  {{ discount.amount | money }}

{% endfor %}
```

### 2. Cart Level Discount

购物车级别的折扣。

例如：

```text
T-Shirt：$100
Shoes：$200

购物车总额：$300

购物车折扣：$30

最终总额：$270
```

Liquid：

```liquid
{% for discount in cart.cart_level_discount_applications %}

  {{ discount.title }}

  {{ discount.total_allocated_amount | money }}

{% endfor %}
```

注意这两个字段：

```liquid
item.line_level_discount_allocations
```

和：

```liquid
cart.cart_level_discount_applications
```

一个描述商品行项目上的折扣，另一个描述购物车级别的折扣。

Dawn 的 `cart-drawer.liquid` 已经分别实现了它们的展示。

### 3. 如何通过 Ajax 应用优惠券？

Shopify Ajax Cart API 的 `cart/update.js` 支持 `discount` 参数。

例如：

```js
fetch(routes.cart_update_url, {

  ...fetchConfig(),

  body: JSON.stringify({
    discount: 'SUMMER10'
  })

});
```

移除折扣：

```js
fetch(routes.cart_update_url, {

  ...fetchConfig(),

  body: JSON.stringify({
    discount: ''
  })

});
```

也支持传入多个折扣代码，使用逗号分隔。

需要注意，优惠券能否生效、能否叠加，以及最终折扣金额，都由 Shopify 的折扣规则决定，不应该由 Theme 自己计算。

### 4. Dawn 为什么同时有 original_price 和 final_price？

因为 Shopify 会负责计算最终价格，而 Dawn 负责展示。

例如：

```liquid
{% if item.original_price != item.final_price %}

  <s>
    {{ item.original_price | money }}
  </s>

  <strong>
    {{ item.final_price | money }}
  </strong>

{% else %}

  {{ item.original_price | money }}

{% endif %}
```

这就是 Dawn 购物车中的价格展示逻辑。

它不需要知道优惠券是怎么计算的，也不需要自己计算折扣金额。

这体现了一个重要原则：

**Theme 不负责决定商品的真实成交价格，Theme 负责展示 Shopify 计算后的价格。**

## 七、Checkout：这些数据最终如何进入订单？

现在把前面所有知识串起来。

这是整个购物流程中最关键的一段。

### 1. 用户加购时，数据已经保存在 Shopify Cart 中

例如用户选择：

```text
商品：Coffee
Variant：500g
数量：2

定制属性：
Gift wrap = Yes

Selling Plan：
Deliver every month

购物车属性：
Campaign ID = summer-2026

购物车备注：
Please deliver after 5 PM.
```

ProductForm 提交：

```js
const formData = new FormData(this.form);

fetch(routes.cart_add_url, {
  ...config,
  body: formData
});
```

Shopify 将商品及相关信息保存到当前购物车。

Cart Attributes 和 Cart Note 则通过 `cart/update.js` 更新。

这里要理解一个重要概念：

**购物车的真实数据保存在 Shopify 服务器端的购物车会话中，而不是仅保存在浏览器的 JavaScript 变量中。**

所以，即使页面局部重新渲染，购物车数据也不会因此丢失。

### 2. 用户点击 Checkout

回到：

`snippets/cart-drawer.liquid`

找到：

```liquid
<form
  action="{{ routes.cart_url }}"
  id="CartDrawer-Form"
  method="post"
>

  <!-- Cart Items -->

</form>
```

再找到 Checkout 按钮：

```liquid
<button
  type="submit"
  name="checkout"
  form="CartDrawer-Form"
>
  Checkout
</button>
```

注意：

```html
name="checkout"
```

这是关键。

它告诉 Shopify：用户现在要进入结算流程。

Dawn 不需要自己构造一个包含所有商品、价格、折扣、属性的 JSON，再发送给 Checkout。

因为这些数据已经在 Shopify 的购物车会话中。

流程是：

<box border radius="lg" padding={3} gap={2}>
  <list connector="solid" marker="number" gap={3}>
    <list-item>
      **Product Form**

      提交 Variant、Quantity、Properties、Selling Plan。
    </list-item>
    <list-item>
      **Shopify Cart**

      保存购物车商品、备注、Attributes，并计算相关价格和折扣。
    </list-item>
    <list-item>
      **Cart Drawer / Cart Page**

      使用 Liquid 和 Ajax 更新购物车展示。
    </list-item>
    <list-item>
      **Checkout**

      用户提交 `name="checkout"`，Shopify 根据当前购物车会话创建结算流程。
    </list-item>
    <list-item>
      **Order**

      付款成功并创建订单后，相关购物信息进入订单数据。
    </list-item>
  </list>
</box>

Shopify 官方文档也明确说明，购物车页面通过 `routes.cart_url` 的 POST 表单以及 `name="checkout"` 控件来进入 Checkout。

### 3. 这些数据在订单中对应什么？

可以这样理解：

| Cart 数据 | 订单中的对应信息 |
|---|---|
| Line Item Properties | 商品行项目附加属性 |
| Cart Attributes | 订单自定义属性 |
| Cart Note | 订单备注 |
| Selling Plan | 订阅/购买计划相关信息 |
| Discounts | 订单及商品折扣记录 |

其中，Cart Attributes 会传递到 Checkout 最终生成的订单中。

因此，如果你需要在 Shopify Admin 的订单详情中查看活动来源、定制文字、礼品包装等信息，应该从购物车数据设计阶段就考虑好放在哪里。

---

## 八、真实业务案例：如果我要开发一个营销活动页，应该如何设计购物车数据？

现在做一个综合案例。

假设你正在开发一个活动页面：

`/pages/summer-sale`

活动规则：

1. 用户购买指定商品。
2. 用户可以填写定制文字。
3. 用户可以选择礼品包装。
4. 每笔订单记录活动 ID。
5. 购买时还可以选择订阅计划。

我们应该怎么实现？

### 1. 商品级数据

放到 Product Form 中：

```liquid
<!-- 定制文字 -->
<input
  type="text"
  name="properties[Engraving]"
>

<!-- 礼品包装 -->
<select name="properties[Gift wrap]">
  <option value="No">No</option>
  <option value="Yes">Yes</option>
</select>

<!-- 内部活动标识 -->
<input
  type="hidden"
  name="properties[_campaign_id]"
  value="summer-2026"
>

<!-- Selling Plan -->
<select name="selling_plan">
  <option value="">One-time purchase</option>
  <option value="183638">
    Monthly subscription
  </option>
</select>
```

以上控件应放在 Dawn 原有的 Product Form 内，而不是再嵌套创建一个 form。

### 2. 购物车级数据

通过 Ajax Cart API：

```js
fetch(routes.cart_update_url, {

  ...fetchConfig(),

  body: JSON.stringify({

    attributes: {
      'Campaign ID': 'summer-2026',
      'Campaign Source': 'landing-page'
    }

  })

});
```

### 3. 购物车备注

通过：

```js
fetch(routes.cart_update_url, {

  ...fetchConfig(),

  body: JSON.stringify({

    note: 'Please include gift packaging'

  })

});
```

### 4. 价格和优惠

这里特别强调一个问题。

你之前曾经问过：活动页能不能在加购时给商品指定一个自定义售价？

现在可以明确回答：

**Line Item Properties 和 Cart Attributes 都不能用来修改商品售价。**

它们只是附加数据。

如果活动页需要特殊售价，应该通过 Shopify 支持的价格和折扣机制实现，例如：

- 不同价格的 Variant。
- Shopify Discount。
- Shopify Functions。
- 符合业务场景的折扣 App。

不能把前端提交的自定义价格当作真实成交价格。

### 5. 最终订单数据

最后你就可以在订单中获得类似这样的业务信息：

```text
订单
├── Campaign ID
│   └── summer-2026
│
├── Campaign Source
│   └── landing-page
│
├── Cart Note
│   └── Please include gift packaging
│
└── 商品
    ├── Coffee / 500g
    ├── Quantity: 2
    ├── Engraving: Hello World
    ├── Gift wrap: Yes
    └── Selling Plan: Monthly
```

这就是 Shopify 购物车数据模型在实际业务中的应用。

---

## 九、本课知识总结

这节课有五个核心概念：

| 概念 | 作用 | 典型场景 |
|---|---|---|
| Line Item Properties | 商品行项目附加数据 | 定制文字、礼品信息 |
| Cart Attributes | 整个购物车的结构化数据 | 活动 ID、配送选择 |
| Cart Note | 整个购物车的自由文本备注 | 配送说明 |
| Selling Plan | 商品购买计划 | 每月订阅 |
| Discounts | 折扣计算和分配 | 优惠券、自动折扣 |

还有三个容易踩坑的地方：

1. 同一个 Variant 可以因为不同 Properties 或 Selling Plan 而产生多条 Cart Item。
2. Private Property 不是安全机制，Private Cart Attribute 也不能通过 Liquid 和 Ajax API 读取。
3. 修改 Properties 时，Shopify 会覆盖整个 Properties 对象，而不是自动合并。

---

## 十、本课自测

{@body const questions=[{q:"如果需要为购物车中的每一件商品保存不同的定制文字，应该使用什么？",opts:["cart.note","cart.attributes","item.properties","selling_plan"],a:2,why:"定制文字属于某条商品行项目，因此使用 item.properties。不同属性可能使相同 Variant 分成不同 Cart Item。"},{q:"如果需要记录整个订单来自哪个营销活动，最适合使用什么？",opts:["item.properties","cart.attributes","product.metafields","variant.options"],a:1,why:"营销活动来源描述整个购物车，而不是某个商品，使用 Cart Attributes 更合适。"},{q:"Dawn 的 ProductForm 为什么能自动提交自定义 properties？",opts:["Shopify 自动扫描页面所有 input","FormData(this.form) 自动序列化表单字段","Pub/Sub 自动收集属性","Liquid 自动生成 Ajax JSON"],a:1,why:"Dawn 使用 new FormData(this.form)，所以属于该表单的 properties 字段会自动参与提交。"},{q:"给 properties 的 key 加下划线，意味着什么？",opts:["数据会被加密","数据无法被 Shopify Admin 查看","数据在 Checkout 中视觉隐藏，但仍可在其他位置读取","数据不会进入订单"],a:2,why:"Private Line Item Properties 只是 Checkout 展示层面的隐藏，不是加密或权限控制。"}]}
{@body const [answers,setAnswers]=DIL.useState({})}
{@body const [submitted,setSubmitted]=DIL.useState(false)}
<box border radius="lg" padding={3} gap={3}>
  <row align="center" justify="between">
    **知识检查**
    <badge color="info">{Object.keys(answers).length}/4 已作答</badge>
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
          <text size="sm" color="secondary">{q.why}</text>
        </box>
      {/if}
    </box>
    {#if i!==questions.length-1}
      <divider color="subtle"/>
    {/if}
  {/each}
  {#if submitted}
    <title size="xl" color="success" tabularNums>{questions.filter((q,i)=>answers[i]===q.a).length}/4</title>
    <button block color="secondary" variant="outline" onClick={()=>{setAnswers({});setSubmitted(false)}}>重新练习</button>
  {:else}
    <button block disabled={Object.keys(answers).length!==4} onClick={()=>setSubmitted(true)}>提交答案</button>
  {/if}
</box>

## 参考资料

- [Cart API reference](https://shopify.dev/docs/api/ajax/reference/cart)
- [Attribute - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/attribute)
- [cart](https://shopify.dev/docs/storefronts/themes/architecture/templates/cart)
- [Cart and Checkout Validation Function API](https://shopify.dev/docs/api/functions/2026-01/cart-and-checkout-validation)
- [Cart Line Item API](https://shopify.dev/docs/api/pos-ui-extensions/latest/target-apis/contextual-apis/cart-line-item-api)
- [Attribute - Storefront API](https://shopify.dev/docs/api/storefront/2026-01/objects/Attribute)
- [Cart - Storefront API](https://shopify.dev/docs/api/storefront/2026-04/objects/Cart)
- [Cart API](https://shopify.dev/docs/api/pos-ui-extensions/latest/target-apis/contextual-apis/cart-api)
- [Cart - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/Cart)
- [Cart and Checkout Validation Function API](https://shopify.dev/docs/api/functions/unstable/cart-and-checkout-validation)
