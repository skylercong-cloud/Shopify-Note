# Section Rendering API 与 product-info.js：Dawn 如何实现局部更新？


上一课搞清楚了一个完整的 Variant 选择过程：

```text
用户选择商品选项
    ↓
variant-selects
    ↓
收集 Option Value ID
    ↓
product-info.js
    ↓
请求 Shopify
    ↓
Shopify Liquid 重新渲染 HTML
    ↓
浏览器解析 HTML
    ↓
更新页面局部 DOM
```

今天我们把这个过程再往深处挖。

这次不只是学习 Section Rendering API 怎么用，而是要理解：

1. 为什么 Shopify 要设计 Section Rendering API？
2. `section_id` 和 `sections` 有什么区别？
3. 浏览器拿到 HTML 字符串后，如何将它转换为 DOM？
4. Dawn 如何把新 DOM 替换到旧页面中？
5. `HTMLUpdateUtility.viewTransition()` 究竟做了什么？
6. `AbortController` 如何解决快速切换 Variant 时的请求竞争问题？
7. 这种架构有哪些性能优势和潜在瓶颈？

我们直接从 Dawn 源码开始。

---

## 一、先理解 Section Rendering API 的本质

先明确一个概念：

**Section Rendering API 并不是一个负责更新浏览器 DOM 的 API，而是一个负责在 Shopify 服务端重新渲染 Section，并将 HTML 返回给浏览器的 API。**

DOM 更新仍然由前端 JavaScript 完成。

这是理解整个架构的基础。

### 1. 为什么需要 Section Rendering API？

假设用户在商品详情页选择了一个新颜色。

现在有两种实现方式。

<box border radius="lg" padding={3} gap={3}>
  **方案 A：重新加载整个页面**
  <box background="surface-secondary" padding={3} radius="md" gap={1}>
    <text weight="medium" color="danger">Full Page Reload</text>
    浏览器重新请求整个商品页面：
    - Header
    - Announcement Bar
    - 商品详情
    - 推荐商品
    - Footer
    - 其他所有页面内容
  </box>
  <text color="secondary" size="sm">大量内容其实没有发生变化，却需要重新传输和处理。</text>
  <divider color="subtle"/>
  **方案 B：只请求需要更新的 Section**
  <box background="surface-secondary" padding={3} radius="md" gap={1}>
    <text weight="medium" color="success">Section Rendering</text>
    浏览器只请求商品详情 Section：
    - 新 Variant
    - 新价格
    - 新库存
    - 新商品图片
    - 新选项可用状态
  </box>
  <text color="secondary" size="sm">其他页面区域继续保持原样。</text>
</box>

这就是 Section Rendering 的核心价值：减少不必要的页面重新请求和 DOM 更新。

Shopify 官方也将它定位为通过 Ajax 获取指定 Section 的 HTML，从而实现页面局部更新。

### 2. Section Rendering API 有两种主要请求方式

这里是今天第一个重要知识点。

Shopify 提供两种参数：

- `section_id`
- `sections`

它们不是一回事。

| 对比 | `section_id` | `sections` |
|---|---|---|
| 请求数量 | 一个 Section | 最多五个 Section |
| 返回类型 | HTML 字符串 | JSON 对象 |
| 常见用途 | 更新单个区域 | 同时更新多个区域 |
| 解析方式 | `response.text()` | `response.json()` |

#### 方式一：section_id

例如：

```http
GET /products/classic-t-shirt?section_id=main-product
```

Shopify 返回：

```html
<div id="shopify-section-main-product">
  <product-info>
    <!-- 新的商品详情 HTML -->
  </product-info>
</div>
```

注意，返回的是 HTML，不是 JSON。

因此：

```js
const response = await fetch(url);
const html = await response.text();
```

#### 方式二：sections

例如：

```http
GET /products/classic-t-shirt?sections=main-product,header
```

Shopify 返回：

```json
{
  "main-product": "<div>商品详情 HTML</div>",
  "header": "<div>Header HTML</div>"
}
```

因此：

```js
const response = await fetch(url);
const sections = await response.json();

console.log(sections["main-product"]);
console.log(sections["header"]);
```

一个请求就可以获取多个 Section 的 HTML。

还有一个细节：如果请求的某个 Section 无法渲染，对应 JSON 字段可能是 `null`，即使整个请求 HTTP 状态码是 200，也不能认为每个 Section 都成功了。

官方文档：

<Link url="https://shopify.dev/docs/api/ajax/section-rendering" title="Shopify Section Rendering API"/>

---

## 二、Dawn 为什么使用 section_id？

现在回到我们正在研究的：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/product-info.js" title="assets/product-info.js"/>

找到：

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

我们重点分析一下。

假设：

```js
url = '/products/classic-t-shirt';

optionValues = [
  '201',
  '302'
];
```

那么最终请求：

```http
/products/classic-t-shirt
?section_id=template--123__main
&option_values=201,302
```

这里有两个不同的参数：

**第一个：section_id**

告诉 Shopify：

我只需要重新渲染哪个 Section？

**第二个：option_values**

告诉 Shopify：

用户当前选择了哪些商品选项？

两者配合，Shopify 就能知道：

1. 应该使用哪个商品。
2. 应该根据哪些选项值确定 Variant。
3. 应该重新渲染哪个 Section。
4. 应该返回哪些商品信息。

这就是 Dawn 的整个请求设计。

### 1. sectionId 从哪里来？

回到：

<Link url="https://github.com/Shopify/dawn/blob/main/sections/main-product.liquid" title="sections/main-product.liquid"/>

你会看到：

```liquid
<product-info
  id="MainProduct-{{ section.id }}"
  data-section="{{ section.id }}"
  data-product-id="{{ product.id }}"
  data-update-url="true"
  data-url="{{ product.url }}"
>
```

这里：

```liquid
data-section="{{ section.id }}"
```

最终 JavaScript 可以通过：

```js
this.dataset.section
```

获得 Section ID。

而：

```js
this.sectionId
```

是 Dawn 在 `ProductInfo` 中使用的属性访问入口。

你可以把整个关系理解为：

```text
Liquid
  ↓
section.id
  ↓
data-section
  ↓
product-info.dataset.section
  ↓
this.sectionId
  ↓
section_id=xxx
```

注意，动态 Section ID 通常不是简单的文件名。

例如：

```text
template--123456__main
```

它包含了模板实例信息。

这也是为什么开发时不应该随便硬编码 Section ID。

### 2. 为什么有时候 Dawn 不请求 Section？

你会发现：

```js
!shouldFetchFullPage &&
  params.push(`section_id=${this.sectionId}`);
```

这说明某些情况下，Dawn 会故意不传 `section_id`。

为什么？

看前面的：

```js
const shouldSwapProduct =
  this.dataset.url !== productUrl;

const shouldFetchFullPage =
  this.dataset.updateUrl === 'true' &&
  shouldSwapProduct;
```

这里涉及一个比较特殊的场景：**切换商品，而不仅仅是切换 Variant。**

例如 Shopify Combined Listings 中，用户可能通过颜色选择，从一个商品跳转到另一个关联商品。

此时：

```text
当前商品：
/products/black-t-shirt

切换后：
/products/white-t-shirt
```

这已经不是同一个商品的 Variant 变化了。

Dawn 需要根据情况：

- 只替换当前 `product-info`。
- 或者请求完整页面并替换整个 `main`。

在 Dawn 的 `main-product.liquid` 中：

```liquid
data-update-url="true"
```

因此当商品 URL 变化时，会进入完整页面请求的分支。

对应代码：

```js
if (updateFullPage) {
  HTMLUpdateUtility.viewTransition(
    document.querySelector('main'),
    html.querySelector('main'),
    this.preProcessHtmlCallbacks,
    this.postProcessHtmlCallbacks
  );
}
```

这里替换的是整个 `<main>`，而不是仅仅商品详情区域。

这两个场景一定要区分：

| 场景 | 更新范围 |
|---|---|
| 同一个商品切换 Variant | 商品详情中的局部内容 |
| 切换关联商品 | `product-info` 或整个 `main` |

---

## 三、浏览器拿到 HTML 后发生了什么？

现在来到今天最重要的浏览器知识点。

看 `product-info.js`：

```js
renderProductInfo({
  requestUrl,
  targetId,
  callback
}) {
  this.abortController?.abort();

  this.abortController = new AbortController();

  fetch(requestUrl, {
    signal: this.abortController.signal
  })
    .then((response) => response.text())
    .then((responseText) => {
      this.pendingRequestUrl = null;

      const html = new DOMParser()
        .parseFromString(responseText, 'text/html');

      callback(html);

      document.querySelector(`#${targetId}`)?.focus();
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted by user');
      } else {
        console.error(error);
      }

      this.variantSelectors?.rejectPendingSelectPromise(error);
    });
}
```

这里有三个关键步骤：

```text
fetch
  ↓
response.text()
  ↓
DOMParser
  ↓
callback
```

我们分别分析。

### 1. response.text()

```js
const responseText = await response.text();
```

假设 Shopify 返回：

```html
<div id="shopify-section-template--123__main">

  <product-info>

    <div class="product__info-container">

      <div id="price-template--123__main">
        $129.00
      </div>

      <div id="Sku-template--123__main">
        TS-BLK-M
      </div>

    </div>

  </product-info>

</div>
```

此时：

```js
responseText
```

只是一个普通的 JavaScript 字符串。

它还不是 DOM 节点。

你不能直接：

```js
responseText.querySelector('.product__info-container');
```

因为字符串没有 `querySelector` 方法。

所以需要下一步。

### 2. DOMParser：把 HTML 字符串解析为 DOM

```js
const html = new DOMParser()
  .parseFromString(responseText, 'text/html');
```

现在：

```js
html
```

是一个 Document 对象。

可以：

```js
html.querySelector('product-info');

html.querySelector('#price-template--123__main');

html.querySelector('.product__info-container');
```

这里要特别理解：

**DOMParser 创建的是一个独立的、内存中的 Document，不是当前页面的 document。**

你可以把它理解成：

<box border radius="lg" padding={3} gap={3}>
  **当前页面 DOM**
  <box background="surface-secondary" radius="md" padding={3}>
    <text color="success" weight="medium">浏览器正在展示的页面</text>
    <text size="sm">用户当前看到的商品详情、图片、价格等。</text>
  </box>
  <row align="center" justify="center" gap={2}>
    <icon name="arrow-down" color="secondary"/>
    <text size="xs" color="secondary">fetch 获取新 HTML</text>
  </row>
  <box background="surface-secondary" radius="md" padding={3}>
    <text weight="medium" color="info">DOMParser 解析</text>
    <text size="sm">创建一个独立的 Document，在内存中解析新 HTML。</text>
  </box>
  <row align="center" justify="center" gap={2}>
    <icon name="arrow-down" color="secondary"/>
    <text size="xs" color="secondary">JavaScript 从新 Document 提取节点</text>
  </row>
  <box border radius="md" padding={3}>
    <text weight="medium">更新当前页面 DOM</text>
    <text size="sm">只把需要的节点内容替换到正在展示的页面。</text>
  </box>
</box>

所以：

```js
html.querySelector(...)
```

是在新 Document 中查找。

而：

```js
this.querySelector(...)
```

是在当前页面的 DOM 中查找。

这是两个完全不同的 DOM 树。

#### 3. DOMParser 解析时，里面的 JavaScript 会执行吗？

这是一个很好的问题。

例如返回的 HTML 中包含：

```html
<script>
  console.log('hello');
</script>
```

通过：

```js
new DOMParser().parseFromString(
  responseText,
  'text/html'
);
```

解析时，脚本不会像正常页面解析那样执行，事件处理器也不会在这个独立文档中触发。

但这里有个容易忽略的细节：

如果之后将这些节点插入真实页面，脚本和事件处理器可能获得执行机会。

MDN 对这一行为有明确说明。

这也是 Dawn 后面为什么专门处理 Script 标签的原因，我们马上就会看到。

---

## 四、Dawn 如何将新 DOM 替换到旧页面？

刚才我们已经拿到了：

```js
const html = new DOMParser()
  .parseFromString(responseText, 'text/html');
```

但是此时页面还没有发生任何变化。

因为 `html` 是一个独立的 Document。

接下来，Dawn 需要从新 Document 中取出需要的内容，再更新当前页面。

我们先看：

```js
callback(html);
```

这里的 `callback` 是一个回调函数，具体执行哪种更新逻辑，取决于之前传入的是哪个函数。

对于同一个商品切换 Variant，执行的是：

```js
handleUpdateProductInfo(productUrl)
```

这个方法中：

```js
const sourceVariantSelects =
  this.getVariantSelects(html);

const variant =
  this.getSelectedVariant(html);
```

分别拿到新 HTML 中的选项选择器和 Variant 数据。

然后：

```js
this.updateOptionValues(html);
```

更新商品选项。

接下来：

```js
this.updateVariantInputs(variant?.id);
```

更新加购表单中的 Variant ID。

然后：

```js
updateSourceFromDestination('price');
updateSourceFromDestination('Sku');
updateSourceFromDestination('Inventory');
```

更新价格、SKU 和库存。

这些都是对当前页面 DOM 的操作。

### 1. 看一个典型的 DOM 更新过程

假设当前页面：

```html
<div id="price">
  $99.00
</div>
```

Shopify 返回的新 HTML：

```html
<div id="price">
  $129.00
</div>
```

Dawn 执行：

```js
const source = html.getElementById('price');

const destination = this.querySelector('#price');

if (source && destination) {
  destination.innerHTML = source.innerHTML;
}
```

结果：

```html
<div id="price">
  $129.00
</div>
```

这里有个值得注意的地方：

它不是把整个商品详情页面重新替换，而是只替换价格容器内部的 HTML。

所以对于同一个商品的 Variant 切换，Dawn 实际采用了比较精细的更新策略。

不过，更新 `variant-selects` 时，它采用了另外一种方式：

```js
HTMLUpdateUtility.viewTransition(
  this.variantSelectors,
  variantSelects,
  this.preProcessHtmlCallbacks
);
```

接下来我们就研究这个方法。

---

## 五、深入 HTMLUpdateUtility.viewTransition()

打开：

<Link url="https://github.com/Shopify/dawn/blob/main/assets/global.js" title="assets/global.js"/>

搜索：

```js
class HTMLUpdateUtility
```

你会看到：

```js
class HTMLUpdateUtility {
  static viewTransition(
    oldNode,
    newContent,
    preProcessCallbacks = [],
    postProcessCallbacks = []
  ) {
    preProcessCallbacks?.forEach(
      (callback) => callback(newContent)
    );

    const newNodeWrapper = document.createElement('div');

    HTMLUpdateUtility.setInnerHTML(
      newNodeWrapper,
      newContent.outerHTML
    );

    const newNode = newNodeWrapper.firstChild;

    // dedupe IDs
    const uniqueKey = Date.now();

    oldNode.querySelectorAll('[id], [form]').forEach(
      (element) => {
        element.id &&
          (element.id = `${element.id}-${uniqueKey}`);

        element.form &&
          element.setAttribute(
            'form',
            `${element.form.getAttribute('id')}-${uniqueKey}`
          );
      }
    );

    oldNode.parentNode.insertBefore(newNode, oldNode);

    oldNode.style.display = 'none';

    postProcessCallbacks?.forEach(
      (callback) => callback(newNode)
    );

    setTimeout(() => oldNode.remove(), 500);
  }
}
```

这段代码非常值得研究。

它实际上使用了一种类似双缓冲的 DOM 替换策略。

### 1. 第一步：创建新 DOM 节点

```js
const newNodeWrapper = document.createElement('div');

HTMLUpdateUtility.setInnerHTML(
  newNodeWrapper,
  newContent.outerHTML
);

const newNode = newNodeWrapper.firstChild;
```

为什么不直接使用：

```js
oldNode.innerHTML = newContent.innerHTML;
```

因为 Dawn 想要替换整个节点，而不只是节点内部内容。

例如：

旧节点：

```html
<variant-selects id="variant-selects-123">
  ...
</variant-selects>
```

新节点：

```html
<variant-selects id="variant-selects-123">
  ...
</variant-selects>
```

Dawn 会创建一个完整的新 `variant-selects` 元素。

这样，新元素插入页面时，可以重新触发 Web Component 的生命周期。

例如：

```js
connectedCallback() {
  this.addEventListener('change', ...);
}
```

新组件就可以重新绑定自己的事件。

### 2. 第二步：为什么需要处理 ID？

源码：

```js
const uniqueKey = Date.now();

oldNode.querySelectorAll('[id], [form]').forEach(
  (element) => {
    element.id &&
      (element.id = `${element.id}-${uniqueKey}`);

    element.form &&
      element.setAttribute(
        'form',
        `${element.form.getAttribute('id')}-${uniqueKey}`
      );
  }
);
```

这里处理的是旧节点内部的 ID 和表单关联。

为什么？

因为接下来新旧节点会短暂同时存在。

例如：

```html
<div>
  <variant-selects id="variant-selects-123">
    <!-- 新节点 -->
  </variant-selects>

  <variant-selects id="variant-selects-123">
    <!-- 旧节点 -->
  </variant-selects>
</div>
```

如果两个节点内部存在相同 ID，就可能影响：

```js
document.querySelector('#some-id');
```

以及表单的 `form` 属性关联。

因此 Dawn 会为旧节点内部的相关 ID 添加一个时间戳后缀，减少新旧节点重叠期间的冲突。

注意：这里使用的是 `oldNode.querySelectorAll()`，处理的是旧节点的后代元素，不包含旧节点本身。

### 3. 第三步：插入新节点

```js
oldNode.parentNode.insertBefore(
  newNode,
  oldNode
);
```

这里使用的是：

```js
insertBefore
```

而不是：

```js
replaceChild
```

这非常关键。

`insertBefore` 会先把新节点插入旧节点之前。

此时 DOM 中同时存在：

```text
新节点
旧节点
```

接下来：

```js
oldNode.style.display = 'none';
```

隐藏旧节点。

最后：

```js
setTimeout(() => oldNode.remove(), 500);
```

500ms 后再彻底移除旧节点。

整个过程：

<box border radius="lg" padding={3} gap={3}>
  **阶段 1：初始状态**
  <box background="surface-secondary" radius="md" padding={3}>
    <box border radius="md" padding={2} align="center">
      **旧节点**
      <text size="xs" color="secondary">正常显示</text>
    </box>
  </box>
  <row justify="center">
    <icon name="arrow-down" color="secondary"/>
  </row>
  **阶段 2：插入新节点**
  <box background="surface-secondary" radius="md" padding={3} gap={2}>
    <box border={{size:1,color:"#16A34A"}} radius="md" padding={2} align="center">
      **新节点**
      <badge color="success">已插入</badge>
    </box>
    <box border radius="md" padding={2} align="center">
      **旧节点**
      <text size="xs" color="secondary">仍然存在</text>
    </box>
  </box>
  <row justify="center">
    <icon name="arrow-down" color="secondary"/>
  </row>
  **阶段 3：隐藏旧节点**
  <box background="surface-secondary" radius="md" padding={3} gap={2}>
    <box border={{size:1,color:"#16A34A"}} radius="md" padding={2} align="center">
      **新节点**
      <badge color="success">正常显示</badge>
    </box>
    <box background="surface" radius="md" padding={2} align="center">
      <text color="secondary" lineThrough>旧节点</text>
      <text color="secondary" size="xs">display: none</text>
    </box>
  </box>
  <row justify="center">
    <icon name="arrow-down" color="secondary"/>
  </row>
  **阶段 4：500ms 后**
  <box background="surface-secondary" radius="md" padding={3}>
    <box border={{size:1,color:"#16A34A"}} radius="md" padding={2} align="center">
      **新节点**
      <badge color="success">最终保留</badge>
    </box>
  </box>
</box>

为什么不直接删除旧节点，再插入新节点？

这种方式可以避免替换过程中出现短暂的空白区域，并让新旧内容的切换更加平滑。

但它也有代价：短时间内页面会同时保留两份 DOM，增加一定的内存和 DOM 管理开销。

### 4. 为什么还要重新执行 Script？

继续看：

```js
static setInnerHTML(element, html) {
  element.innerHTML = html;

  element.querySelectorAll('script').forEach(
    (oldScriptTag) => {
      const newScriptTag = document.createElement('script');

      Array.from(oldScriptTag.attributes).forEach(
        (attribute) => {
          newScriptTag.setAttribute(
            attribute.name,
            attribute.value
          );
        }
      );

      newScriptTag.appendChild(
        document.createTextNode(oldScriptTag.innerHTML)
      );

      oldScriptTag.parentNode.replaceChild(
        newScriptTag,
        oldScriptTag
      );
    }
  );
}
```

还记得刚才讲的 DOMParser 吗？

通过 `innerHTML` 插入的 Script 通常不会像正常创建的 Script 那样自动执行。

所以 Dawn 采取了一个办法：

1. 先通过 `innerHTML` 插入 HTML。
2. 找出里面所有 Script。
3. 创建新的 Script 元素。
4. 复制原来的属性和内容。
5. 用新 Script 替换旧 Script。

这样新创建的 Script 就可以获得正常执行的机会。

这也是为什么你在 Theme 开发中，不能简单认为：

```js
element.innerHTML = newHtml;
```

就等于完整执行了新 HTML 中的所有行为。

**HTML 插入、DOM 生命周期、JavaScript 执行，是三个不同的事情。**

另外，使用 `innerHTML` 和动态执行 Script 时必须注意 XSS 风险。只能处理可信任的 HTML，不能把未经验证的用户输入直接拼接进去。

### 5. 最后为什么有 postProcessCallbacks？

源码：

```js
postProcessCallbacks?.forEach(
  (callback) => callback(newNode)
);
```

回到 `product-info.js`：

```js
initializeProductSwapUtility() {
  this.preProcessHtmlCallbacks.push((html) =>
    html.querySelectorAll('.scroll-trigger')
      .forEach((element) =>
        element.classList.add('scroll-trigger--cancel')
      )
  );

  this.postProcessHtmlCallbacks.push((newNode) => {
    window?.Shopify?.PaymentButton?.init();

    window?.ProductModel?.loadShopifyXR();
  });
}
```

你看：

替换 DOM 之前，Dawn 会处理滚动动画相关元素。

替换 DOM 之后，会重新初始化：

- Shopify Payment Button。
- Shopify Product Model。

为什么？

因为这些功能可能依赖特定的 DOM 结构或者初始化过程。

当原来的 DOM 被替换后，不能假设这些功能仍然正常工作。

这也是一个很重要的前端工程经验：

**动态替换 DOM 时，不仅要考虑 HTML 内容，还要考虑被替换节点所依赖的 JavaScript 行为是否需要重新初始化。**

另外，`viewTransition` 这个方法名容易让人误以为它调用了浏览器原生 View Transitions API。

实际上 Dawn 当前这里使用的是双缓冲式 DOM 替换，源码注释也明确提到未来可以考虑改用原生 View Transitions API。

---

## 六、深入 AbortController：如何避免请求竞争？

这是今天另一个非常重要的知识点。

我们回到：

```js
renderProductInfo({
  requestUrl,
  targetId,
  callback
}) {
  this.abortController?.abort();

  this.abortController = new AbortController();

  fetch(requestUrl, {
    signal: this.abortController.signal
  })
    ...
}
```

先想一个真实场景。

用户在商品详情页快速选择颜色：

```text
第 1 次：Black
第 2 次：White
第 3 次：Blue
```

每次选择都会触发一次网络请求。

假设没有处理请求竞争：

<box border radius="lg" padding={3} gap={3}>
  **没有 AbortController 的情况**
  <text size="xs" color="secondary">时间向下推进 ↓</text>
  {#each [{name:"Black 请求",duration:"耗时 900ms",end:"第三个完成",color:"#DC8B8B",width:"100%"},{name:"White 请求",duration:"耗时 500ms",end:"第二个完成",color:"#D6A04C",width:"65%"},{name:"Blue 请求",duration:"耗时 200ms",end:"第一个完成",color:"#16A34A",width:"30%"}] as item}
    <box gap={1}>
      **{item.name}**
      <row align="center" gap={2}>
        <box background={item.color} height="10px" radius="full" width={item.width}/>
        <text color="secondary" size="xs">{item.duration}</text>
      </row>
      <text size="xs" color="secondary">{item.end}</text>
    </box>
  {/each}
  <box background="surface-secondary" radius="md" padding={2}>
    <text color="danger" weight="medium" size="sm">最终可能显示 Black 的信息，而用户最后选择的是 Blue。</text>
  </box>
</box>

这就是典型的 Race Condition（竞态条件）。

网络请求的响应顺序不一定等于发起顺序。

### 1. Dawn 如何解决？

看第一行：

```js
this.abortController?.abort();
```

每次新请求开始之前，先取消上一次请求。

然后：

```js
this.abortController = new AbortController();
```

创建一个新的控制器。

最后：

```js
fetch(requestUrl, {
  signal: this.abortController.signal
});
```

把控制器的 signal 交给 fetch。

于是整个过程：

<box border radius="lg" padding={3} gap={3}>
  **使用 AbortController**
  <list connector="solid" marker="number" gap={3}>
    <list-item>
      **用户选择 Black**

      发起请求 A，创建 Controller A。
    </list-item>
    <list-item>
      **用户选择 White**

      执行 `Controller A.abort()`，取消请求 A。

      创建 Controller B，发起请求 B。
    </list-item>
    <list-item>
      **用户选择 Blue**

      执行 `Controller B.abort()`，取消请求 B。

      创建 Controller C，发起请求 C。
    </list-item>
    <list-item>
      **请求 C 返回**

      解析 HTML，更新页面。

      最终页面显示 Blue。
    </list-item>
  </list>
  <badge color="success">最终结果与用户最后选择一致</badge>
</box>

MDN 对 AbortController 的定义就是通过 AbortSignal 取消异步操作，包括 fetch 请求和响应体读取。

### 2. AbortError 是什么？

看 Dawn 的 catch：

```js
.catch((error) => {
  if (error.name === 'AbortError') {
    console.log('Fetch aborted by user');
  } else {
    console.error(error);
  }
});
```

当请求被取消时，fetch 通常会抛出一个 `AbortError`。

所以 Dawn 单独处理了这个错误。

它不是普通的网络错误，而是预期中的请求取消行为。

### 3. AbortController 是否意味着服务端也停止计算了？

不一定。

这是一个很重要的细节。

```js
controller.abort();
```

主要是通知浏览器取消对应的异步操作。

浏览器可以停止等待响应、读取响应体等，但不应该认为 Shopify 服务端一定已经停止了 Liquid 渲染或其他处理。

因此：

- 它解决了前端旧响应覆盖新响应的问题。
- 它可以减少不必要的网络数据接收。
- 它不保证取消服务端已经开始的全部工作。

如果一个交互可能产生大量请求，可以进一步考虑防抖，但防抖会引入额外等待时间。

Dawn 这里选择的是立即请求，同时取消前一个请求。

### 4. 再看一个容易忽略的细节：pendingRequestUrl

在：

```js
const productUrl =
  target.dataset.productUrl ||
  this.pendingRequestUrl ||
  this.dataset.url;
```

为什么要这样写？

假设用户第一次选择某个选项，触发了商品切换：

```text
/products/black-t-shirt
    ↓
/products/white-t-shirt
```

但新商品的 HTML 还没返回，当前页面上的 `product-info` 仍然属于旧商品。

如果用户此时又选择了一个选项，直接使用：

```js
this.dataset.url
```

就可能重新请求旧商品。

所以 Dawn 使用：

```js
this.pendingRequestUrl
```

保存正在请求的目标商品 URL。

这样在连续操作时，后续请求能够继续基于正确的目标商品。

这是一种非常值得学习的并发状态处理方式。

---

## 七、从性能角度重新审视整个架构

现在我们已经理解了 Dawn 的实现。

接下来站在性能优化的角度，看看这套架构解决了什么问题，又引入了什么开销。

### 1. 网络层

优势：

- 同一个商品切换 Variant 不需要重新下载整个页面。
- 只请求一个 Section。
- AbortController 减少无效响应的处理。

潜在瓶颈：

- 每次切换仍然需要一次网络往返。
- Shopify 仍然需要执行对应的服务端渲染。
- 返回的 HTML 可能比较大。

优化思路：

- 减少商品详情 Section 中不必要的复杂内容。
- 避免在 Variant 切换时请求整个页面。
- 对连续、高频操作评估是否需要防抖。

### 2. 浏览器解析层

每次请求成功：

```js
new DOMParser().parseFromString(
  responseText,
  'text/html'
);
```

浏览器都需要解析 HTML。

因此：

Section Rendering 并不意味着浏览器不需要重新解析 HTML。

它只是避免重新解析和替换整个页面。

如果 Section 本身包含大量 HTML，DOMParser 仍然可能产生明显的 CPU 开销。

### 3. DOM 更新层

Dawn 采用了两种策略：

| 更新方式 | 使用场景 |
|---|---|
| `innerHTML` 替换 | 价格、SKU、库存等局部内容 |
| `HTMLUpdateUtility.viewTransition` | 需要替换整个组件的情况 |

这是一种比较合理的策略。

因为如果只是价格变化，没必要把整个商品详情组件重新创建。

反过来，如果是 Variant Picker，直接创建一个新的 Web Component，更容易保证组件生命周期和事件监听正常。

但也要注意：

`viewTransition` 暂时保留新旧两份 DOM，替换大型组件时会产生额外的内存和 DOM 操作成本。

### 4. 资源加载层

Section HTML 中还可能包含：

- 图片。
- 视频。
- CSS。
- Script。

DOMParser 的独立文档并不保证完全不触发资源加载。例如 MDN 提到其中的图片、iframe 可能加载资源。

因此，不应该认为局部 HTML 请求就一定没有额外资源开销。

特别是自定义商品详情页时，需要关注返回 HTML 是否包含了不必要的图片和资源引用。

---

## 八、一个非常重要的知识点：加购时的 Bundled Section Rendering

现在我们把今天学到的知识和上一课的 `product-form.js` 联系起来。

你还记得 Dawn 加购代码吗？

```js
const formData = new FormData(this.form);

if (this.cart) {
  formData.append(
    'sections',
    this.cart.getSectionsToRender()
      .map((section) => section.id)
  );

  formData.append(
    'sections_url',
    window.location.pathname
  );
}
```

然后：

```js
fetch(`${routes.cart_add_url}`, config)
  .then((response) => response.json())
  .then((response) => {
    this.cart.renderContents(response);
  });
```

你有没有发现？

这里又出现了：

```text
sections
sections_url
```

它实际上使用的是 Shopify 的 **Bundled Section Rendering（捆绑式 Section 渲染）**。

它和刚才研究的 Section Rendering API 有关联，但使用场景不同。

### 1. 两种场景对比

<box border radius="lg" padding={3} gap={3}>
  **商品 Variant 切换**
  <badge color="info">GET Section Rendering</badge>
  ```text
  GET /products/xxx
      ?section_id=main
      &option_values=201,302
  ```
  <text size="sm" color="secondary">返回单个 Section 的 HTML，浏览器自己更新商品详情。</text>
  <divider color="subtle"/>
  **加入购物车**
  <badge color="success">POST Bundled Section Rendering</badge>
  ```text
  POST /cart/add.js

  id=1002
  quantity=1
  sections=cart-drawer,cart-icon-bubble
  sections_url=/products/xxx
  ```
  <text size="sm" color="secondary">购物车更新与指定 Section 的重新渲染在同一个请求中完成。</text>
</box>

例如加购成功后，Shopify 可以一次性返回：

```json
{
  "items": [
    {
      "id": 1002,
      "quantity": 1
    }
  ],
  "sections": {
    "cart-drawer": "<div>更新后的购物车抽屉</div>",
    "cart-icon-bubble": "<div>更新后的购物车数量</div>"
  }
}
```

这样就不需要：

```text
第一次请求：加购
    ↓
第二次请求：查询购物车
    ↓
第三次请求：重新获取购物车抽屉
```

而是一个请求就拿到加购结果和需要更新的 Section。

Shopify 官方文档规定，Cart API 的 `/cart/add`、`/cart/change`、`/cart/clear`、`/cart/update` 均支持 Bundled Section Rendering，每次最多请求五个 Section。

官方文档：

<Link url="https://shopify.dev/docs/api/ajax/reference/cart" title="Shopify Ajax Cart API"/>

---

## 九、实际开发中如何调试这套机制？

以后你自己开发 Dawn 或者基于 Dawn 改造 Theme，可以按照下面的方式调试。

**第一步：打开浏览器 Network 面板。**

用户切换 Variant 时，观察请求：

```text
/products/classic-t-shirt
?section_id=template--123__main
&option_values=201,302
```

重点检查：

- 请求 URL 是否正确。
- 是否传递了所有 Option Value ID。
- 是否请求了正确的 Section。
- 请求是否被取消。

**第二步：查看 Response。**

确认 Shopify 返回的 HTML 是否包含：

```html
<script type="application/json" data-selected-variant>
```

以及其中的 Variant ID 是否正确。

**第三步：检查 DOM 更新。**

在 Elements 面板观察：

- `variant-selects` 是否被替换。
- Price 是否更新。
- SKU 是否更新。
- 隐藏表单中的 `input[name="id"]` 是否更新。
- 加购按钮是否正确启用或禁用。

**第四步：测试快速切换。**

快速连续切换颜色，观察 Network 中是否出现：

```text
请求 A：canceled
请求 B：canceled
请求 C：200
```

然后确认页面最终显示的是 C 对应的商品信息。

---

## 十、本课总结

今天最重要的是理解下面这张架构图：

<box border radius="lg" padding={3} gap={2}>
  <title size="lg">Dawn 的局部更新架构</title>
  <box background="surface-secondary" padding={3} radius="md" align="center">
    **用户交互**
    <text size="xs" color="secondary">切换 Variant</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **product-info.js**
    <text size="xs" color="secondary">构造请求 URL、AbortController</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" padding={3} radius="md" align="center">
    **Shopify Section Rendering API**
    <text size="xs" color="secondary">服务端执行 Liquid，生成新 HTML</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **DOMParser**
    <text size="xs" color="secondary">解析 HTML，生成独立 Document</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box background="surface-secondary" padding={3} radius="md" align="center">
    **HTMLUpdateUtility**
    <text size="xs" color="secondary">提取、替换、初始化新 DOM</text>
  </box>
  <box align="center">
    <icon name="arrow-down" color="secondary"/>
  </box>
  <box border radius="md" padding={3} align="center">
    **浏览器更新页面**
    <text size="xs" color="secondary">更新价格、库存、SKU、图片、Variant ID</text>
  </box>
</box>

你需要牢牢记住四个结论：

1. Section Rendering API 负责服务端生成 HTML，不负责浏览器 DOM 更新。
2. DOMParser 负责把 HTML 字符串解析为独立的 Document。
3. HTMLUpdateUtility 负责将新节点更新到当前页面，并处理部分组件重新初始化。
4. AbortController 负责取消过期请求，避免旧响应覆盖新状态。

## 参考资料

- [Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)
- [Use the Section Rendering API for dynamic updates](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-section-rendering-api)
- [Cart API reference](https://shopify.dev/docs/api/ajax/reference/cart)
- [About the Shopify Ajax API](https://shopify.dev/docs/api/ajax)
- [DOMParser: parseFromString() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString)
- [AbortController - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Using the Fetch API - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [AbortController: abort() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort)
- [DOMParser: parseFromString() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString?from=20423&from_column=20423)
- [DOMParser：parseFromString() 方法 - Web API | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/DOMParser/parseFromString)
- [Using the Fetch API - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch...)
- [content/files/en-us/web/api/domparser/parsefromstring/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/api/domparser/parsefromstring/index.md?plain=1)
- [content/files/en-us/web/api/abortcontroller/abort/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/api/abortcontroller/abort/index.md?plain=1)
- [content/files/en-us/web/api/fetch_api/using_fetch/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/api/fetch_api/using_fetch/index.md?plain=1)
- [content/files/en-us/web/api/abortcontroller/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/api/abortcontroller/index.md?plain=1)
- [Shopify-Development-Skill-for-AI-Agents/shopify-development/reference/11-theme-apis.md at main · uppifyagency/Shopify-Development-Skill-for-AI-Agents · GitHub](https://github.com/uppifyagency/Shopify-Development-Skill-for-AI-Agents/blob/main/shopify-development/reference/11-theme-apis.md)
- [DOMParser: parseFromString() method - Web APIs | MDN](https://monge.univ-eiffel.fr/~forax/MDN/en-US/docs/Web/API/DOMParser/parseFromString.html)
- [Cart API reference](https://shopify-dev.shopifycloud.com/docs/api/ajax/reference/cart)
- [Cart API reference](https://shopify--dev.storefront-preview-proxy.getredo.com/docs/api/ajax/reference/cart)
- [(Feature request) Ajax API: Get full cart in /add.js request response - Online Store and Theme Development - Shopify Developer Community Forums](https://community.shopify.dev/t/feature-request-ajax-api-get-full-cart-in-add-js-request-response/21478)
- [4. Refresh theme: Side cart not showing items on first add - Online Store and Theme Development - Shopify Developer Community Forums](https://community.shopify.dev/t/4-refresh-theme-side-cart-not-showing-items-on-first-add/27037)
- [Cart AJAX API | Sellerlane Help Center](https://sellerlane.io/docs/reference/cart-api/)
- [Issue with Bundled Section Rendering not responding](https://community.shopify.com/t/issue-with-bundled-section-rendering-not-responding/365168)
- [How to Build an AJAX Cart Drawer in Shopify (the 2026 Way)](https://www.freecodecamp.org/news/shopify-ajax-cart-drawer)
