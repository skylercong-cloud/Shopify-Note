# Cart Drawer & Cart：购物车抽屉与购物车更新机制


上一课完整研究了 Quick Add，已经打通了这条链路：

```text
商品卡片
   ↓
Quick Add
   ↓
ProductForm
   ↓
Shopify Ajax Cart API
   ↓
Cart Drawer
```

今天我们继续往下研究，重点放在购物车本身。

这节课非常重要，因为购物车是 Shopify Theme 中交互最复杂的模块之一。它不仅仅是展示商品，还涉及：

- 购物车数据模型。
- Ajax Cart API。
- Section Rendering。
- Web Components。
- Pub/Sub 发布订阅机制。
- 异步请求与并发控制。
- DOM 局部更新。
- 焦点管理与无障碍交互。

**本课的核心目标：搞清楚 Shopify 购物车的数据是怎么变化的，以及 Dawn 如何把变化同步到页面上的多个组件。**

## 一、先理解 Cart Drawer 的整体架构

我们先不急着看 API，先看 Dawn 是怎么组织购物车代码的。

这次主要研究五个文件：

| 文件 | 职责 |
|---|---|
| `snippets/cart-drawer.liquid` | 购物车抽屉的 Liquid HTML |
| `assets/cart-drawer.js` | 抽屉打开、关闭、渲染 |
| `assets/cart.js` | 商品数量修改、删除、购物车备注 |
| `assets/pubsub.js` | 发布订阅事件机制 |
| `assets/constants.js` | 事件名称及其他全局常量 |

源码：

- [cart-drawer.liquid](https://github.com/Shopify/dawn/blob/main/snippets/cart-drawer.liquid)
- [cart-drawer.js](https://github.com/Shopify/dawn/blob/main/assets/cart-drawer.js)
- [cart.js](https://github.com/Shopify/dawn/blob/main/assets/cart.js)
- [pubsub.js](https://github.com/Shopify/dawn/blob/main/assets/pubsub.js)

### 1. Cart Drawer 是在哪里引入的？

打开：

`layout/theme.liquid`

你会看到：

```liquid
{%- if settings.cart_type == 'drawer' -%}
  {%- render 'cart-drawer' -%}
{%- endif -%}

{% sections 'header-group' %}
```

这里说明两件事：

第一，Cart Drawer 并不是在商品详情页或者集合页中单独创建的。

它是在整个 Theme 的公共布局中引入的。

因此，只要购物车类型配置为 Drawer，整个网站都可以使用它。

第二，它的位置在 Header Group 之前。

这意味着它在页面初始化时就已经存在于 DOM 中，不需要用户点击购物车图标后才创建。

这里也可以看出 Shopify Theme 的一种典型架构：

- `layout`：负责整个网站的公共布局。
- `sections`：负责页面区域。
- `snippets`：负责可复用的局部组件。
- `assets`：负责 CSS、JavaScript 等静态资源。

### 2. cart-drawer.liquid 的 DOM 结构

打开 `snippets/cart-drawer.liquid`。

我们先忽略具体商品信息，简化一下它的结构：

```liquid
<cart-drawer class="drawer">

  <div id="CartDrawer">

    <!-- 遮罩 -->
    <div id="CartDrawer-Overlay"></div>

    <!-- 抽屉主体 -->
    <div class="drawer__inner">

      <!-- Header -->
      <div class="drawer__header">
        <h2>Shopping Cart</h2>
        <button>Close</button>
      </div>

      <!-- 商品列表 -->
      <cart-drawer-items>

        <form id="CartDrawer-Form">

          <div id="CartDrawer-CartItems">

            {% for item in cart.items %}
              <!-- 商品信息 -->
              <!-- 商品价格 -->
              <!-- 商品数量 -->
              <!-- 删除按钮 -->
            {% endfor %}

          </div>

        </form>

      </cart-drawer-items>

      <!-- Footer -->
      <div class="drawer__footer">

        <!-- 商品总价 -->

        <!-- Checkout 按钮 -->

      </div>

    </div>

  </div>

</cart-drawer>
```

这里最重要的是两个自定义元素：

```html
<cart-drawer>
```

和：

```html
<cart-drawer-items>
```

它们不是一回事。

<box border radius="lg" padding={3} gap={3}>
  **两个组件的职责**
  <box background="surface-secondary" radius="md" padding={3} gap={1}>
    **cart-drawer**

    <badge color="info">抽屉容器</badge>
    - 打开和关闭抽屉
    - 控制遮罩
    - 控制页面滚动
    - 管理焦点
    - 更新抽屉整体内容
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} gap={1}>
    **cart-drawer-items**

    <badge color="success">商品列表</badge>
    - 遍历购物车商品
    - 修改商品数量
    - 删除商品
    - 更新购物车商品列表
    - 显示错误信息
  </box>
</box>

这是一种很好的组件职责划分。

抽屉容器不需要关心具体怎么修改商品数量，商品列表也不需要关心整个抽屉如何打开。

### 3. 为什么购物车商品遍历的是 cart.items，而不是 product.variants？

这里联系一下我们之前学习的 Shopify 数据模型。

```liquid
{% for item in cart.items %}
  {{ item.product.title }}
  {{ item.variant.title }}
  {{ item.quantity }}
  {{ item.final_line_price | money }}
{% endfor %}
```

这里的 `item` 不是 Product，也不是 Variant。

它代表的是一个 **Cart Line Item（购物车行项目）**。

这几个概念需要严格区分：

| 对象 | 含义 |
|---|---|
| Product | 商品 |
| Variant | 商品的具体规格 |
| Cart Item | 购物车中的一条购买记录 |

举个例子。

用户购买：

```text
T-Shirt / Black / M
```

购买 2 件。

购物车中会有一条记录：

```text
Product: T-Shirt
Variant: Black / M
Quantity: 2
```

但如果用户又购买了同一个 Variant，只是附带了不同的商品属性，或者使用不同的 Selling Plan，就可能产生另一条 Cart Item。

所以：

**一个 Variant 不一定只对应购物车中的一条记录。**

Shopify 的 Cart API 也明确支持这种情况，同一 Variant 可以因为 Properties、Selling Plan 或价格差异被拆分成不同的购物车行。

这就引出了一个非常重要的字段：

```liquid
{{ item.key }}
```

`item.key` 是购物车行项目的标识，不要把它和 Variant ID 混淆。

例如：

```text
Variant ID:
123456789

Cart Item A:
key = 123456789:abc...

Cart Item B:
key = 123456789:def...
```

虽然 Variant ID 一样，但它们是两条不同的购物车行项目。

另外几个字段也值得记住：

- `item.index`：当前购物车行项目的位置，从 1 开始。
- `item.key`：购物车行项目的标识。
- `item.variant.id`：Variant ID。
- `item.quantity`：购买数量。
- `item.properties`：商品附加属性。
- `item.selling_plan_allocation`：订阅计划分配信息。
- `item.final_line_price`：该行最终价格。

尤其注意 `index` 和 `key` 的区别，后面修改购物车时会用到。

---

## 二、Cart Drawer 是如何打开和关闭的？

进入：

`assets/cart-drawer.js`

首先看组件定义：

```js
class CartDrawer extends HTMLElement {

  constructor() {
    super();

    this.addEventListener(
      'keyup',
      (evt) => evt.code === 'Escape' && this.close()
    );

    this.querySelector('#CartDrawer-Overlay')
      .addEventListener('click', this.close.bind(this));

    this.setHeaderCartIconAccessibility();
  }

}

customElements.define('cart-drawer', CartDrawer);
```

这段代码说明：

Dawn 使用 Web Component 实现 Cart Drawer。

浏览器遇到：

```html
<cart-drawer>
```

就会使用这里定义的 `CartDrawer` 类。

### 1. 点击 Header 的购物车图标

看：

```js
setHeaderCartIconAccessibility() {

  const cartLink = document.querySelector(
    '#cart-icon-bubble'
  );

  if (!cartLink) return;

  cartLink.setAttribute('role', 'button');

  cartLink.setAttribute(
    'aria-haspopup',
    'dialog'
  );

  cartLink.addEventListener('click', (event) => {

    event.preventDefault();

    this.open(cartLink);

  });
}
```

这里有一个小细节：

Header 中的购物车图标原本是一个普通链接：

```liquid
<a href="{{ routes.cart_url }}"
   id="cart-icon-bubble">
```

正常情况下，点击它应该进入购物车页面。

但当购物车模式为 Drawer 时，Dawn 使用 JavaScript 拦截了点击：

```js
event.preventDefault();
```

然后调用：

```js
this.open(cartLink);
```

所以：

- 开启 Drawer 模式：点击购物车图标打开抽屉。
- 使用普通 Cart Page 模式：点击购物车图标进入购物车页面。

### 2. open() 方法

这是抽屉打开的核心：

```js
open(triggeredBy) {

  if (this.classList.contains('active')) return;

  if (triggeredBy) {
    this.setActiveElement(triggeredBy);
  }

  setTimeout(() => {
    this.classList.add('animate', 'active');
  });

  this.addEventListener(
    'transitionend',
    () => {

      trapFocus(
        document.getElementById('CartDrawer'),
        this.querySelector('.drawer__inner')
      );

    },
    { once: true }
  );

  document.body.classList.add('overflow-hidden');
}
```

我们关注几个关键点。

**A. 为什么要添加 active class？**

```js
this.classList.add('animate', 'active');
```

CSS 会根据这些 class 控制抽屉显示和动画。

也就是说：

JS 控制状态，CSS 负责动画效果。

**B. 为什么要给 body 添加 overflow-hidden？**

```js
document.body.classList.add('overflow-hidden');
```

防止用户打开购物车抽屉后，仍然可以滚动背后的页面。

**C. trapFocus 是什么？**

这是无障碍交互中的一个重要概念。

当 Modal 或 Drawer 打开时，键盘用户通过 Tab 键应该只能在当前弹窗中切换焦点。

例如：

```text
打开购物车
    ↓
Tab
    ↓
关闭按钮
    ↓
商品数量输入框
    ↓
删除按钮
    ↓
Checkout 按钮
    ↓
回到关闭按钮
```

不能让焦点跑到背后的页面。

关闭抽屉时，再通过：

```js
removeTrapFocus(this.activeElement);
```

恢复焦点。

Dawn 还处理了：

- 点击遮罩关闭。
- 按 Escape 关闭。
- 关闭后恢复页面滚动。
- 记录打开抽屉之前的触发元素。

这些看起来只是 UI 细节，但在实际 Theme 开发中非常重要。

### 3. close() 方法

```js
close() {

  this.classList.remove('active');

  removeTrapFocus(this.activeElement);

  document.body.classList.remove(
    'overflow-hidden'
  );

}
```

可以看到，它与 `open()` 基本是相反的操作。

这里我想强调：

**不要把 Drawer 的打开关闭逻辑和购物车数据更新逻辑混在一起。**

一个负责 UI 状态，一个负责数据状态。

这是我们以后开发自己的 Theme 时应该遵循的设计原则。

---

## 三、Shopify Ajax Cart API：购物车数据到底怎么修改？

这是本课最重要的知识点之一。

我们先不看 Dawn，单独理解 Shopify 提供的 Cart API。

Shopify Ajax Cart API 提供了几个核心接口：

| 接口 | HTTP 方法 | 用途 |
|---|---|---|
| `/cart.js` | GET | 查询当前购物车 |
| `/cart/add.js` | POST | 添加商品 |
| `/cart/change.js` | POST | 修改某一条购物车记录 |
| `/cart/update.js` | POST | 批量更新购物车、备注和属性 |
| `/cart/clear.js` | POST | 清空购物车商品 |

官方文档：[Shopify Cart API Reference](https://shopify.dev/docs/api/ajax/reference/cart)。

这里要特别注意：它们操作的对象是当前访客会话中的购物车，不是 Shopify Admin API 中的商品数据。

### 1. GET /cart.js：查询购物车

例如：

```js
fetch(`${window.Shopify.routes.root}cart.js`)
  .then(res => res.json())
  .then(cart => {
    console.log(cart);
  });
```

返回的购物车对象大致如下：

```json
{
  "token": "...",
  "item_count": 3,
  "total_price": 59900,
  "currency": "USD",
  "items": [
    {
      "id": 123456789,
      "variant_id": 123456789,
      "product_id": 987654321,
      "key": "123456789:abc...",
      "quantity": 2,
      "price": 19900,
      "properties": {},
      "product_title": "T-Shirt",
      "variant_title": "Black / M"
    }
  ]
}
```

这里有几个重要字段：

- `item_count`：购物车商品总件数。
- `items`：购物车行项目数组。
- `total_price`：购物车总价，单位为货币最小单位。
- `key`：购物车行项目标识。
- `variant_id`：Variant ID。
- `quantity`：购买数量。

注意：

```js
cart.items.length
```

和：

```js
cart.item_count
```

不是一回事。

例如：

```text
购物车：

T-Shirt / Black / M：2 件
Shoes / Size 42：1 件

cart.items.length = 2
cart.item_count = 3
```

一个代表行项目数量，一个代表商品件数。

### 2. POST /cart/add.js：添加商品

例如：

```js
const formData = {
  items: [
    {
      id: 123456789,
      quantity: 2
    }
  ]
};

fetch(`${window.Shopify.routes.root}cart/add.js`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(formData)
});
```

你应该已经很熟悉这个接口了。

这里补充一个容易忽略的知识：

`cart/add.js` 成功响应默认返回的是本次添加的商品行项目，而不是完整的购物车对象。

如果你还需要购物车的完整统计信息，需要另外获取购物车数据，或者使用 bundled section rendering 获取需要展示的 HTML。

### 3. POST /cart/change.js：修改某一条购物车记录

假设购物车：

```text
第 1 行：T-Shirt，数量 2
第 2 行：Shoes，数量 1
第 3 行：Hat，数量 3
```

用户把 T-Shirt 数量改成 5。

可以这样请求：

```js
fetch(`${window.Shopify.routes.root}cart/change.js`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    line: 1,
    quantity: 5
  })
});
```

这里：

```js
line: 1
```

表示购物车中的第一条记录。

也可以使用：

```js
{
  id: '123456789:abc...',
  quantity: 5
}
```

这里的 `id` 可以是 Variant ID 或 Cart Item Key。

不过要特别注意：当一个 Variant 对应多个购物车行项目时，使用 Variant ID 可能无法精确定位。

因此，实际开发中更推荐使用 Cart Item Key，或者确保使用的行号对应当前最新购物车顺序。

`change.js` 每次只能修改一条已有购物车记录。

### 4. POST /cart/update.js：批量更新

假设用户在 Bulk Order 页面修改了三个商品：

```text
Variant A：2 → 5
Variant B：3 → 8
Variant C：1 → 0
```

可以一次请求：

```js
fetch(`${window.Shopify.routes.root}cart/update.js`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    updates: {
      'key-a': 5,
      'key-b': 8,
      'key-c': 0
    }
  })
});
```

这里的 `updates` 是一个映射：

```text
Cart Item Key → 目标数量
```

设置为 0 就是删除对应商品。

除此之外，它还可以更新：

```js
{
  note: 'Please deliver in the morning',
  attributes: {
    gift_wrap: 'yes'
  }
}
```

也就是说，Cart Update 不仅能更新商品数量，还可以修改购物车备注和属性。

特别提醒：Shopify 允许 `updates` 使用 Variant ID，但同一 Variant 存在多个购物车行项目时，只会更新第一个匹配项。因此，使用 Cart Item Key 更安全。

### 5. POST /cart/clear.js：清空购物车

```js
fetch(`${window.Shopify.routes.root}cart/clear.js`, {
  method: 'POST'
});
```

清空所有商品行项目。

但有一个容易忽略的细节：

**清空商品不等于清空购物车的全部属性。**

Shopify 文档说明，清空后购物车的 Note 和 Attributes 仍然保留。

### 6. 这几个 API 应该如何选择？

我给你一个实际开发中比较好用的判断：

<box border radius="lg" padding={3} gap={2}>
  **购物车操作选择**
  <box background="surface-secondary" radius="md" padding={3}>
    用户想添加一个新商品？

    <badge color="success">cart/add.js</badge>
  </box>
  <box background="surface-secondary" radius="md" padding={3}>
    用户想修改购物车中某一条商品的数量？

    <badge color="info">cart/change.js</badge>
  </box>
  <box background="surface-secondary" radius="md" padding={3}>
    用户想批量修改多条商品记录？

    <badge color="info">cart/update.js</badge>
  </box>
  <box background="surface-secondary" radius="md" padding={3}>
    用户想清空所有商品？

    <badge color="danger">cart/clear.js</badge>
  </box>
  <box background="surface-secondary" radius="md" padding={3}>
    用户只想查询购物车？

    <badge>GET cart.js</badge>
  </box>
</box>

这也解释了上一课中为什么 Dawn 的 Standard Quick Add 使用 `cart/add.js`，而 Bulk Quick Add 使用 `cart/update.js`。

---

## 四、深入 cart.js：购物车商品数量是如何修改的？

现在我们回到 Dawn。

打开：

[assets/cart.js](https://github.com/Shopify/dawn/blob/main/assets/cart.js)

这个文件非常值得仔细研究。

它实际上同时服务于：

- 普通购物车页面。
- Cart Drawer。

### 1. CartRemoveButton：删除商品

源码：

```js
class CartRemoveButton extends HTMLElement {

  constructor() {
    super();

    this.addEventListener('click', (event) => {

      event.preventDefault();

      const cartItems =
        this.closest('cart-items') ||
        this.closest('cart-drawer-items');

      cartItems.updateQuantity(
        this.dataset.index,
        0,
        event
      );

    });
  }

}

customElements.define(
  'cart-remove-button',
  CartRemoveButton
);
```

这里有一个很巧妙的设计：

```js
this.closest('cart-items') ||
this.closest('cart-drawer-items')
```

为什么要这样写？

因为删除商品这个行为，无论发生在购物车页面还是购物车抽屉，都应该使用相同的逻辑。

Dawn 并没有写两套删除逻辑。

它只需要找到当前所属的购物车商品容器，然后调用：

```js
updateQuantity(line, 0, event)
```

也就是把数量设置为 0。

### 2. CartItems：购物车的核心组件

```js
class CartItems extends
  window.StandardEvents.createViewEventElement(HTMLElement) {

  constructor() {
    super();

    this.debouncedOnChange = debounce(
      (event) => {
        this.onChange(event);
      },
      ON_CHANGE_DEBOUNCE_TIMER
    );

    this.addEventListener(
      'change',
      this.debouncedOnChange
    );
  }

}
```

这里先关注两件事：

第一，它监听的是 `change`，而不是每次键盘输入都直接发送请求。

第二，它使用了 debounce。

Dawn 中：

```js
const ON_CHANGE_DEBOUNCE_TIMER = 300;
```

也就是说，用户修改数量后，会等待短暂时间再执行更新。

例如：

```text
用户连续输入：

1 → 2 → 5 → 10

不会每次都立即请求服务器。

而是在用户停止修改后，
统一处理最终数量 10。
```

这样可以减少无意义的网络请求。

### 3. validateQuantity：为什么需要验证数量？

源码中有：

```js
validateQuantity(event) {

  const inputValue = parseInt(
    event.target.value
  );

  const index = event.target.dataset.index;

  if (inputValue < event.target.dataset.min) {

    // 最小数量错误

  } else if (
    inputValue > parseInt(event.target.max)
  ) {

    // 超过最大数量

  } else if (
    inputValue % parseInt(event.target.step) !== 0
  ) {

    // 不满足数量增量规则

  } else {

    this.updateQuantity(
      index,
      inputValue,
      event
    );

  }

}
```

这里对应 Shopify Variant 的 Quantity Rules。

例如：

```text
最小购买数量：2
最大购买数量：20
每次增量：2
```

那么：

| 输入 | 是否有效 |
|---|---|
| 1 | <badge color="danger">无效</badge> |
| 2 | <badge color="success">有效</badge> |
| 3 | <badge color="danger">无效</badge> |
| 4 | <badge color="success">有效</badge> |
| 20 | <badge color="success">有效</badge> |
| 22 | <badge color="danger">无效</badge> |

所以 Theme 不能仅仅在输入框上设置 `min`、`max`、`step` 就认为万事大吉。

还需要在 JavaScript 中进行验证，并正确处理 Shopify 返回的错误。

### 4. updateQuantity：真正修改购物车的地方

这是本课需要重点理解的方法。

源码：

```js
updateQuantity(line, quantity, event) {

  this.enableLoading(line);

  const body = JSON.stringify({
    line,
    quantity,
    sections: sectionsToRender.map(
      (section) => section.section
    ),
    sections_url: window.location.pathname
  });

  fetch(routes.cart_change_url, {
    ...fetchConfig(),
    body
  });

}
```

我们重点分析三个参数：

```js
line
quantity
sections
```

前两个我们已经理解：

- `line`：购物车行项目位置。
- `quantity`：希望修改成的目标数量。

第三个：

```js
sections
```

又回到了我们之前学过的 Section Rendering。

Dawn 希望在修改购物车数量的同一个请求中，让 Shopify 帮它重新生成购物车相关 HTML。

例如：

```js
[
  'cart-drawer',
  'cart-icon-bubble'
]
```

如果是普通 Cart Page，还需要更新：

```js
[
  'main-cart-items',
  'cart-icon-bubble',
  'cart-live-region-text',
  'main-cart-footer'
]
```

所以，修改购物车数量并不是：

```text
修改购物车数据
    ↓
再请求购物车 HTML
    ↓
再更新页面
```

而是：

```text
一次 cart/change.js 请求
    ↓
Shopify 修改购物车数据
    ↓
Shopify 同时生成指定 Section HTML
    ↓
返回 JSON + sections
    ↓
Dawn 更新 DOM
```

这就是 Shopify 的 **Bundled Section Rendering**。

官方支持在一次 Cart API 请求中获取最多 5 个 Section 的 HTML。

### 5. Dawn 如何更新对应的 DOM？

请求成功后，Dawn 会执行：

```js
sectionsToRender.forEach((section) => {

  const elementToReplace =
    document.getElementById(section.id)
      .querySelector(section.selector) ||
    document.getElementById(section.id);

  elementToReplace.innerHTML =
    this.getSectionInnerHTML(
      parsedState.sections[section.section],
      section.selector
    );

});
```

这里需要理解：

```js
parsedState.sections
```

不是普通的购物车数据，而是 Shopify 返回的 Section HTML。

例如：

```js
parsedState.sections['cart-drawer']
```

里面是服务器重新渲染的购物车抽屉 HTML。

Dawn 使用：

```js
DOMParser
```

解析 HTML，然后取出需要替换的部分。

这和上一课 Quick Add 中的 HTML 解析技术是一样的。

不过有一点需要注意：

**这里并没有刷新整个页面，而是替换指定 DOM 节点内部的 HTML。**

### 6. 为什么修改数量后还要更新 cart-icon-bubble？

假设用户购物车原本是：

```text
商品 A：2 件
商品 B：1 件

总件数：3
```

用户把商品 A 改成 5 件。

那么：

```text
商品 A：5 件
商品 B：1 件

总件数：6
```

除了购物车列表，Header 上的购物车数量也需要同步更新。

所以 Dawn 会一起请求：

```text
cart-drawer
cart-icon-bubble
```

这样就不需要在 JavaScript 中自己计算购物车总数量，再单独修改 Header 上的数字。

由 Shopify 重新生成 HTML，Theme 负责替换即可。

---

## 五、Pub/Sub：Dawn 如何让不同组件同步购物车状态？

这是今天最值得深入理解的架构设计。

假设一个网站有这些组件：

```text
ProductForm
QuickAdd
CartDrawer
CartItems
CartIcon
CartRecommendations
```

它们都可能与购物车发生关系。

例如：

- ProductForm 加购商品。
- Quick Add 快速加购。
- CartItems 修改商品数量。
- CartDrawer 展示最新购物车。
- CartIcon 显示购物车总件数。

问题来了：

**如果 ProductForm 加购成功，怎么通知其他组件购物车已经发生变化？**

一种很直接的做法是：

```js
// ProductForm.js

document.querySelector(
  'cart-drawer'
).update();

document.querySelector(
  '#cart-icon-bubble'
).update();

document.querySelector(
  'cart-recommendations'
).update();
```

但这样会产生严重的耦合。

ProductForm 必须知道页面上有哪些组件，以及每个组件如何更新。

以后增加一个购物车相关组件，就要回来修改 ProductForm。

Dawn 使用的是另一种方式：Pub/Sub。

### 1. pubsub.js

打开：

[assets/pubsub.js](https://github.com/Shopify/dawn/blob/main/assets/pubsub.js)

核心代码非常简单：

```js
let subscribers = {};

function subscribe(eventName, callback) {

  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }

  subscribers[eventName] = [
    ...subscribers[eventName],
    callback
  ];

  return function unsubscribe() {

    subscribers[eventName] =
      subscribers[eventName].filter(
        cb => cb !== callback
      );

  };

}

function publish(eventName, data) {

  if (subscribers[eventName]) {

    const promises =
      subscribers[eventName].map(
        callback => callback(data)
      );

    return Promise.all(promises);

  }

  return Promise.resolve();

}
```

这就是一个非常轻量的事件发布订阅系统。

它有两个核心方法：

**subscribe：订阅事件**

```js
subscribe('cart-update', callback);
```

表示：

我关心购物车更新事件。

当这个事件发生时，请调用我的 callback。

**publish：发布事件**

```js
publish('cart-update', {
  cartData: cart
});
```

表示：

购物车发生变化了，通知所有订阅者。

### 2. Dawn 定义的购物车事件

打开：

`assets/constants.js`

```js
const PUB_SUB_EVENTS = {
  cartUpdate: 'cart-update',
  quantityUpdate: 'quantity-update',
  optionValueSelectionChange:
    'option-value-selection-change',
  variantChange: 'variant-change',
  cartError: 'cart-error'
};
```

所以 Dawn 并不是随意拼接事件字符串，而是统一管理事件名称。

### 3. ProductForm 如何发布事件？

回到上一课的：

`assets/product-form.js`

加购成功后：

```js
publish(PUB_SUB_EVENTS.cartUpdate, {
  source: 'product-form',
  productVariantId: variantId,
  cartData: response
});
```

这段代码不需要知道有哪些组件在监听。

它只负责发布：

```text
cart-update
```

### 4. CartItems 如何订阅事件？

在 `assets/cart.js` 中：

```js
connectedCallback() {

  super.connectedCallback();

  this.cartUpdateUnsubscriber = subscribe(
    PUB_SUB_EVENTS.cartUpdate,
    (event) => {

      if (event.source === 'cart-items') {
        return;
      }

      return this.onCartUpdate();

    }
  );

}
```

意思是：

只要购物车发生变化，如果这次变化不是自己发起的，就执行：

```js
this.onCartUpdate();
```

同步购物车商品列表。

为什么要判断：

```js
event.source === 'cart-items'
```

因为 CartItems 自己修改数量后，也会发布 cart-update。

如果自己又监听到自己发出的事件，然后重新请求、重新更新，就可能产生不必要的重复操作。

所以通过 `source` 区分事件来源。

另外：

```js
disconnectedCallback() {

  if (this.cartUpdateUnsubscriber) {
    this.cartUpdateUnsubscriber();
  }

}
```

当组件从 DOM 中移除时，取消订阅，避免遗留无效的事件监听。

### 5. Pub/Sub 的真正价值

我们把刚才的例子重新画一下：

<box border radius="lg" padding={3} gap={3}>
  **购物车事件流**
  <grid columns={2} gap={2}>
    <grid-item background="surface-secondary" radius="md" padding={2}>
      **ProductForm**
      <text size="xs" color="secondary">加购成功</text>
    </grid-item>
    <grid-item background="surface-secondary" radius="md" padding={2}>
      **CartItems**
      <text size="xs" color="secondary">修改数量成功</text>
    </grid-item>
    <grid-item background="surface-secondary" radius="md" padding={2}>
      **QuickAdd**
      <text size="xs" color="secondary">快速加购</text>
    </grid-item>
    <grid-item background="surface-secondary" radius="md" padding={2}>
      **BulkAdd**
      <text size="xs" color="secondary">批量更新</text>
    </grid-item>
  </grid>
  <box align="center" gap={1}>
    <icon name="arrow-down" color="secondary"/>
    **publish(cart-update)**
    <text size="xs" color="secondary">统一发布购物车变化事件</text>
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **Pub/Sub Event Bus**
    <text color="secondary" size="xs">事件分发中心</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <grid columns={2} gap={2}>
    <grid-item border radius="md" padding={2}>
      **CartDrawer**
      <text color="secondary" size="xs">更新购物车展示</text>
    </grid-item>
    <grid-item border radius="md" padding={2}>
      **其他订阅组件**
      <text color="secondary" size="xs">同步自己的状态</text>
    </grid-item>
  </grid>
</box>

这就是事件驱动架构的一种实现。

你作为前端工程师，应该会发现它和 Vue、React 项目中常见的事件总线思想很相似。

但有一点需要区分：

Pub/Sub 负责的是**通知组件发生了什么**，并不负责真正修改 Shopify 服务器上的购物车数据。

真正的数据修改仍然由 Ajax Cart API 完成。

---

## 六、并发问题：为什么购物车更新不能随便发请求？

这一部分是 Dawn 源码中比较有工程价值的地方。

假设用户快速修改商品数量：

```text
第一次：2 → 3
第二次：3 → 5
第三次：5 → 8
```

如果三个请求同时发送：

```text
Request A：quantity = 3
Request B：quantity = 5
Request C：quantity = 8
```

可能出现：

```text
C 先返回
A 后返回
B 最后返回
```

如果前端没有正确处理，就可能出现显示结果和服务器实际状态不一致的问题。

Dawn 在不同场景下采用了不同的保护措施。

### 1. Debounce：减少重复请求

前面已经看过：

```js
debounce(
  event => this.onChange(event),
  ON_CHANGE_DEBOUNCE_TIMER
);
```

它解决的是短时间内连续修改输入值的问题。

### 2. pendingQuantitySaves：追踪尚未完成的数量更新

Dawn 在 CartItems 中维护：

```js
static pendingQuantitySaves = new Set();
```

每次发起数量更新请求，就把对应 Promise 放进去。

请求完成后：

```js
CartItems.pendingQuantitySaves.delete(save);
```

这让 Dawn 知道：

当前还有没有未完成的购物车数量更新。

### 3. 为什么 Checkout 前需要等待？

这是一个很细节但非常重要的场景。

假设用户：

1. 把商品数量从 2 改成 5。
2. 立即点击 Checkout。

但是数量更新请求还没有完成。

如果直接进入结算，就可能出现：

```text
页面显示：5 件

服务器购物车：2 件
```

Dawn 专门实现了：

```js
waitForQuantitySave(event)
```

它会：

```js
this.debouncedOnChange.flush();
```

先立即执行尚未触发的防抖任务。

然后：

```js
await Promise.all(
  CartItems.pendingQuantitySaves
);
```

等待未完成的数量更新请求。

只有数量更新成功，才继续执行 Checkout。

如果更新失败，则不会继续提交结算。

这个设计非常值得学习：

**不能只保证用户看到的 UI 正确，还要保证用户进入下一步流程时，服务器上的数据已经正确保存。**

---

## 七、把整个购物车架构串联起来

到这里，我们已经研究了购物车的主要模块。

现在做一次完整梳理：

<box border radius="lg" padding={3} gap={3}>
  <title size="lg">Dawn Cart Architecture</title>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **Shopify Cart Session**
    <text size="xs" color="secondary">服务器端购物车数据是真正的数据来源</text>
  </box>
  <box align="center">
    <icon name="arrow-down-up" color="secondary"/>
    <text color="secondary" size="xs">Ajax Cart API</text>
  </box>
  <grid columns={2} gap={2}>
    <grid-item border radius="md" padding={2}>
      **cart/add.js**
      <text color="secondary" size="xs">添加商品</text>
    </grid-item>
    <grid-item border radius="md" padding={2}>
      **cart/change.js**
      <text color="secondary" size="xs">修改单行商品</text>
    </grid-item>
    <grid-item border radius="md" padding={2}>
      **cart/update.js**
      <text color="secondary" size="xs">批量更新</text>
    </grid-item>
    <grid-item border radius="md" padding={2}>
      **cart.js**
      <text color="secondary" size="xs">读取购物车</text>
    </grid-item>
  </grid>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **Bundled Section Rendering**
    <text color="secondary" size="xs">返回更新后的 Section HTML</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <grid columns={2} gap={2}>
    <grid-item border radius="md" padding={2}>
      **CartDrawer**
      <text color="secondary" size="xs">抽屉 UI</text>
    </grid-item>
    <grid-item border radius="md" padding={2}>
      **CartItems**
      <text color="secondary" size="xs">商品行项目交互</text>
    </grid-item>
  </grid>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" radius="md" padding={3} align="center">
    **Pub/Sub**
    <text color="secondary" size="xs">通知其他组件购物车状态变化</text>
  </box>
</box>

这里有一个需要建立的核心认知：

Shopify 负责购物车数据、计算和结算能力；Dawn 负责交互、展示、请求调度以及 DOM 更新。

购物车抽屉并不是 Shopify 自动提供的一套现成 UI，而是 Theme 自己通过 Liquid、JavaScript 和 Ajax Cart API 实现的。

另外，Checkout 按钮也很值得注意。Dawn 使用：

```liquid
<button
  type="submit"
  name="checkout"
  form="CartDrawer-Form"
>
  Checkout
</button>
```

结算表单由 Shopify 处理，Theme 负责提交表单。

---

## 八、本课建议你动手做的三个实验

最好打开 Dawn 开发环境，使用 Chrome DevTools 验证。

<box border radius="lg" padding={3} gap={3}>
  **实验 1：观察购物车数量更新**

  <badge color="info">重点</badge>
  1. 添加一个商品。
  2. 打开 Cart Drawer。
  3. 修改商品数量。
  4. 观察 Network 中的 `cart/change.js`。
  5. 查看响应中的 `sections`。
  6. 观察购物车 DOM 是否发生局部替换。

  <divider color="subtle"/>
  **实验 2：观察 Pub/Sub**

  在 `assets/cart.js` 中找到：

  ```js
  subscribe(PUB_SUB_EVENTS.cartUpdate, ...)
  ```

  在回调处打断点。

  然后通过 ProductForm 加购商品，观察：

  - `event.source` 是什么？
  - `event.cartData` 包含什么？
  - 哪些组件会响应？

  <divider color="subtle"/>
  **实验 3：观察 Checkout 的等待机制**

  在 `waitForQuantitySave()` 中打断点。

  快速修改商品数量，然后立即点击 Checkout。

  观察：

  - `pendingQuantitySaves` 是否有数据？
  - `debouncedOnChange.flush()` 做了什么？
  - 为什么要等待 Promise？
</box>

## 九、再深入一个容易忽略的设计：三种 DOM 更新路径

Dawn 中这三个方法的职责如下：

| 方法 | 所属组件 | 典型触发场景 |
|---|---|---|
| `CartDrawer.renderContents()` | CartDrawer | 加购成功后渲染购物车抽屉 |
| `CartItems.updateQuantity()` | CartItems | 修改数量或删除商品 |
| `CartItems.onCartUpdate()` | CartItems | 其他组件修改购物车后同步列表 |

尤其是第三个方法。

它并不是简单地使用现有的 `parsedState.sections`，而是会根据当前组件类型重新请求 Section：

```js
if (this.tagName === 'CART-DRAWER-ITEMS') {

  fetch(`${routes.cart_url}?section_id=cart-drawer`);

} else {

  fetch(`${routes.cart_url}?section_id=main-cart-items`);

}
```

也就是说：

- Drawer 模式重新请求 `cart-drawer` Section。
- 普通购物车页面重新请求 `main-cart-items` Section。

这里出现了两种 Section Rendering 使用方式：

**方式 A：独立请求 Section Rendering**

```http
GET /cart?section_id=cart-drawer
```

**方式 B：Bundled Section Rendering**

```http
POST /cart/change.js
```

请求参数中包含：

```js
{
  line: 1,
  quantity: 3,
  sections: ['cart-drawer', 'cart-icon-bubble']
}
```

第二种把购物车修改和 HTML 生成合并到一次请求中。

这两个机制虽然都能获取 Section HTML，但调用时机和用途不同。

最后看一下继承关系：

```js
class CartDrawerItems extends CartItems {

  getSectionsToRender() {

    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner'
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      }
    ];

  }

}
```

这段代码说明：

**Dawn 通过继承 CartItems，实现了普通购物车页面和购物车抽屉共享同一套商品操作逻辑，但可以分别更新不同的 Section。**

这是一种非常值得借鉴的架构。

---

## 十、本课自测

建议你尝试回答下面三个问题，不需要看源码。

1. 为什么 `Cart Item Key` 比 `Variant ID` 更适合精确定位购物车中的某一条记录？

2. 为什么 Dawn 修改购物车数量使用 `cart/change.js`，而上一课的 Bulk Quick Add 使用 `cart/update.js`？

3. `publish(cartUpdate)` 只是发布事件，为什么它本身并不能保证购物车数据已经更新到 Shopify 服务器？

这三个问题如果都能解释清楚，说明你已经理解了本课的核心。

## 参考资料

- [Cart API reference](https://shopify.dev/docs/api/ajax/reference/cart)
- [About the Shopify Ajax API](https://shopify.dev/docs/api/ajax)
- [Shopify Ajax API reference](https://shopify.dev/docs/api/ajax/reference/index)
- [Cart API reference](https://shopify-dev.shopifycloud.com/docs/api/ajax/reference/cart)
- [Cart Ajax API requests — Liquid Ajax Cart](https://liquid-ajax-cart.js.org/v1/reference/requests/)
- [Reference — Liquid Ajax Cart](https://liquid-ajax-cart.js.org/v1/reference/)
- [Cart AJAX API | Deploi](https://deploi.ca/shopify/builds/primitives/cart-ajax-api)
- [AJAX Cart Requests | Kaching Appz Developers](https://developers.kachingappz.app/cart/ajax-cart-requests/)
