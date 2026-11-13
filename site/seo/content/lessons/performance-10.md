# CSS 深度性能优化：样式计算、渲染隔离与动画


前面几课，我们已经知道 CSS 会影响浏览器的 Style、Layout、Paint 和 Composite。

但今天需要再深入一层。

假设有一个 Shopify 集合页，里面有 500 个商品卡片。

用户点击一个商品的颜色选项后，你只执行了一行 JavaScript：

```js
document.body.classList.add("color-selected");
```

这行 JS 可能不到 1ms 就执行完。

但是 Performance 面板却显示：

```text
Function Call          0.5ms
Recalculate Style     35ms
Layout                48ms
Paint                 25ms
```

为什么修改一个 class，会导致浏览器做这么多工作？

这就是今天要研究的核心问题。

### 一、先纠正一个常见认识：CSS 性能不只是文件大小

很多开发者谈 CSS 优化，首先想到：

- 压缩 CSS。
- 删除没用的 CSS。
- 减少选择器层级。
- 合并 CSS 文件。

这些做法可能有价值，但 CSS 还有两个不同阶段的性能成本。

| 阶段 | 主要成本 | 常见优化方向 |
|---|---|---|
| CSS 加载阶段 | 请求、下载、解析、阻塞首次渲染 | 减少关键 CSS、控制资源加载 |
| CSS 运行阶段 | 样式计算、布局、绘制、合成 | 缩小失效范围、控制布局和绘制成本 |

例如，一份 30KB 的 CSS，下载很快，但里面的样式变化可能影响数千个 DOM 节点。

反过来，一份 200KB 的 CSS，如果缓存命中、样式稳定，未必会在用户每次操作时造成严重问题。

所以今天我们主要研究第二个阶段。

---

## 二、浏览器到底是怎么计算 CSS 样式的？

我们先回顾浏览器的处理过程：

```text
HTML → DOM
CSS  → CSS 规则
          ↓
    选择器匹配 + 层叠计算
          ↓
      Computed Style
          ↓
         Layout
          ↓
         Paint
          ↓
       Composite
```

其中 **Style Calculation（样式计算）** 不是简单把 CSS 文件解析成对象。

浏览器还需要为元素确定最终生效的样式。

### 1. 一个元素可能同时匹配很多规则

例如：

```html
<div class="product-card featured">
  <h3 class="title">运动跑鞋</h3>
</div>
```

CSS：

```css
h3 {
  color: black;
}

.product-card .title {
  color: gray;
}

.featured .title {
  font-weight: bold;
}

.product-card.featured .title {
  color: red;
}
```

浏览器需要考虑：

- 哪些规则匹配这个元素。
- 不同规则的层叠优先级。
- 属性是否继承。
- CSS 变量的最终值。
- 媒体查询、容器查询等条件。
- 相应的样式计算结果。

最终会得到这个 `h3` 的计算样式。

例如：

```text
color: red
font-weight: bold
```

这里要特别注意：

**CSSOM 是样式规则的数据表示，而 Computed Style 是某个元素最终计算出的样式结果。**

不能把它们当成同一个东西。

### 2. 为什么修改 class 会导致样式重新计算？

看下面的代码：

```js
const card = document.querySelector(".product-card");

card.classList.add("selected");
```

浏览器需要判断：

原来匹配这个元素的 CSS 规则是否发生了变化？

例如：

```css
.product-card {
  background: white;
}

.product-card.selected {
  background: #eef6ff;
}
```

添加 `selected` 后，新的选择器变得适用。

浏览器就需要更新对应样式。

但实际问题还要更复杂：

**浏览器需要确定这次修改究竟影响哪些元素。**

这就涉及 Style Invalidation（样式失效追踪）。

---

## 三、Style Invalidation：为什么修改一个元素可能影响很多元素？

我们来看两个例子。

### 例子 A：只影响一个商品卡片

HTML：

```html
<div class="product-card">
  <h3>商品 A</h3>
</div>

<div class="product-card">
  <h3>商品 B</h3>
</div>
```

CSS：

```css
.product-card.selected {
  border-color: blue;
}
```

JS：

```js
card.classList.add("selected");
```

浏览器通常有机会将需要更新的范围限制在当前卡片及相关受影响元素。

但不保证一定只计算一个节点，具体取决于其他选择器和继承关系。

### 例子 B：影响整页商品卡片

CSS：

```css
body.sale-mode .product-card {
  border-color: red;
}
```

JS：

```js
document.body.classList.add("sale-mode");
```

现在情况不同了。

原本没有匹配的规则：

```css
body.sale-mode .product-card
```

可能突然匹配页面上所有 `.product-card`。

如果集合页有 500 个商品卡片，浏览器就可能需要更新大量元素的样式。

<box border radius="lg" padding={3} gap={3}>
  <text weight="medium">局部 class 更新与祖先 class 更新</text>
  <grid columns={2} gap={3}>
    <grid-item>
      <box gap={2}>
        <text size="xs" weight="medium" textAlign="center">只更新一张卡片</text>
        <grid columns={3} gap={1}>
          {#each Array.from({length:12},(_,i)=>i) as i}
            <grid-item>
              <box height="31px" radius="sm" background={i===4?"#0d9488":"surface-tertiary"} border={i===4?{size:1,color:"#0d9488"}:undefined}/>
            </grid-item>
          {/each}
        </grid>
        <text color="secondary" size="xs" textAlign="center">通常影响范围较小</text>
      </box>
    </grid-item>
    <grid-item>
      <box gap={2}>
        <text size="xs" weight="medium" textAlign="center">更新祖先状态</text>
        <grid columns={3} gap={1}>
          {#each Array.from({length:12},(_,i)=>i) as i}
            <grid-item>
              <box height="31px" radius="sm" background="#d97706" backgroundOpacity={0.8}/>
            </grid-item>
          {/each}
        </grid>
        <text color="secondary" size="xs" textAlign="center">可能影响整个卡片集合</text>
      </box>
    </grid-item>
  </grid>
  <caption>这是更新影响范围的概念示意，不意味着添加祖先 class 必然重新计算全部 DOM。</caption>
</box>

这里得到一个重要的优化原则：

**尽量让频繁变化的 UI 状态只影响必要的 DOM 子树。**

但不是说全局 class 一定不应该使用。

例如全站切换深色模式，本来就需要改变大量元素的颜色，这种全局更新是合理的。

真正需要避免的是：为了切换一个小按钮状态，却无意中让数千个节点参与样式更新。

---

## 四、CSS 选择器越复杂，就一定越慢吗？

这是一个很经典，但也很容易被误解的问题。

我们比较三种选择器：

```css
.product-card {
  color: red;
}
```

```css
.product-list .product-card {
  color: red;
}
```

```css
body main .collection .product-list
  > .product-card:not(.disabled) {
  color: red;
}
```

直觉上会认为：

第三种最长，因此一定最慢。

但不能简单这样判断。

现代浏览器的选择器匹配引擎已经做了大量优化。

**选择器长度、层级和性能之间不存在一个可以直接套用的固定公式。**

真正的耗时还取决于：

- 页面 DOM 结构。
- 需要匹配多少元素。
- 样式失效范围。
- 选择器是否触发较昂贵的匹配路径。
- 选择器使用频率与实际交互场景。

例如一个仅匹配少量元素的复杂选择器，可能完全不构成问题。

而一个看起来很简单的选择器：

```css
* {
  ...
}
```

如果涉及大量元素与频繁样式变化，也可能具有可观的计算成本。

Chrome 官方建议结合选择器的匹配尝试次数、实际匹配数量以及计算耗时定位真正的问题，而不是仅凭语法复杂度推断。

### 1. 一个需要特别关注的选择器：`:has()`

例如：

```css
.product-card:has(.out-of-stock) {
  opacity: 0.5;
}
```

`:has()` 是很强大的关系选择器。

它允许你根据后代等相关元素的状态改变父级样式。

但这意味着某个后代发生变化时，浏览器还可能需要判断祖先的相关规则是否仍然匹配。

因此，在大量动态节点和高频更新的场景中，值得测量它对样式计算的影响。

不过不能认为：

“只要用了 `:has()` 就一定慢。”

现代浏览器已经针对它做了优化。**只有在实测存在样式计算瓶颈时，才值得专门改写。**

---

---

## 五、CSS contain：能不能让浏览器少计算一些元素？

前面讲的是如何减少不必要的样式变化。

现在我们换一个思路：

**能不能告诉浏览器，页面中的某个区域与外部相对独立，让它尽量限制布局和绘制的影响范围？**

可以。

这就是 CSS Containment（渲染隔离）技术。

### 1. 先看一个实际场景

假设一个 Shopify 集合页有这样的结构：

```html
<main class="collection">
  <section class="filter-bar">
    <!-- 筛选器 -->
  </section>

  <section class="product-grid">
    <article class="product-card">商品 A</article>
    <article class="product-card">商品 B</article>
    <article class="product-card">商品 C</article>
    <!-- 更多商品 -->
  </section>
</main>
```

每个 `.product-card` 都有图片、标题、价格、促销标签。

用户切换某个商品的选中状态时，卡片内部的 DOM 发生变化。

在传统布局中，如果这些变化影响元素尺寸，可能需要重新计算相关布局依赖。

但某些区域如果有明确的尺寸约束，浏览器就有机会限制影响范围。

例如：

```css
.product-card {
  contain: layout paint;
}
```

这里表达的意图是：

商品卡片的布局与绘制具有一定独立性，尽可能限制相关工作和效果在卡片边界附近。

### 2. contain 的四种主要隔离类型

| 类型 | 主要作用 |
|---|---|
| `contain: layout` | 建立布局隔离边界 |
| `contain: paint` | 限制后代绘制越出隔离边界 |
| `contain: size` | 元素尺寸计算不依赖内部内容的固有尺寸贡献 |
| `contain: style` | 限制计数器等样式相关效果的传播 |

这里最需要深入理解的是 `size`。

例如：

```css
.product-card {
  contain: size;
}
```

这并不是一个可以无脑使用的性能优化。

它可能导致卡片不再根据里面的标题、图片等内容决定自身尺寸。

如果你没有给卡片指定合适的尺寸或其他约束，布局就可能出问题。

所以：

**`contain` 不仅影响性能，也可能改变 CSS 布局和视觉语义。**

MDN 还指出，`contain: layout`、`contain: paint` 等隔离方式可能创建新的 containing block、stacking context 和格式化上下文。

例如购物车抽屉里的某个弹出菜单，如果被父级的 paint containment 裁切，就可能无法正常显示到容器外面。

这意味着：

**Containment 不是越多越好，而应该用于真正独立、边界清晰的组件。**

### 3. contain: content 与 contain: strict

CSS 提供了两个组合值：

```css
.component {
  contain: content;
}
```

相当于组合布局、绘制和样式隔离，但不包含尺寸隔离。

而：

```css
.component {
  contain: strict;
}
```

还包含尺寸隔离。

因此 `strict` 更容易改变依赖子内容决定尺寸的布局。

实际项目中，我不建议把整个商品网格统一设置成 `contain: strict`，除非你非常清楚布局约束和副作用。

---

## 六、content-visibility：大型页面中非常值得掌握的 CSS 性能技术

接下来是本课最值得重点学习的新属性：

```css
content-visibility: auto;
```

它可以让浏览器在某些内容与用户当前视图不相关时，暂时跳过其内部的部分渲染工作。

这个属性对长页面、文章列表、复杂商品推荐区等场景特别有用。

### 1. 先理解传统页面会发生什么

假设 Shopify 商品详情页结构为：

```text
商品主图
商品标题与购买区
商品描述
商品规格表
用户评论（200 条）
相关推荐（100 个商品）
Footer
```

用户进入页面时，只能看见商品主图和购买区。

但浏览器可能仍然需要为页面中大量其他 DOM 元素执行相关样式计算与布局工作。

注意，这不是说浏览器一定会把所有屏幕外像素完整绘制到屏幕上，而是说长页面的大型 DOM 仍然可能带来初始布局等成本。

### 2. 使用 content-visibility

例如：

```css
.product-reviews {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px;
}

.product-recommendations {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
}
```

可以理解为告诉浏览器：

“这些区域的内部内容在当前不需要呈现时，可以跳过部分渲染工作；需要呈现时再进行处理。”

`contain-intrinsic-size` 则提供尺寸估算，帮助浏览器在跳过内部布局时仍能为对应区域保留合理空间。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">首屏与屏幕外内容的处理策略</text>
  <box border radius="lg" padding={2} gap={2}>
    <box background="#3b82f6" radius="md" padding={3} gap={1}>
      <text color="#ffffff" weight="medium" size="sm">当前视口：首屏内容</text>
      <text color="#ffffff" size="xs">商品主图 · 价格 · 变体 · 购买按钮</text>
      <text color="#ffffff" size="xs">正常执行需要的布局和绘制</text>
    </box>
    <divider color="subtle"/>
    <box background="surface-secondary" border={{size:1,color:"subtle",style:"dashed"}} radius="md" padding={3} gap={1}>
      <text weight="medium" size="sm">屏幕外：评论区域</text>
      <text color="secondary" size="xs">可暂时跳过内部渲染工作</text>
      <text color="secondary" size="xs">以估算高度保留布局空间</text>
    </box>
    <box background="surface-secondary" border={{size:1,color:"subtle",style:"dashed"}} radius="md" padding={3} gap={1}>
      <text weight="medium" size="sm">屏幕外：相关推荐</text>
      <text color="secondary" size="xs">可暂时跳过内部渲染工作</text>
    </box>
  </box>
  <caption>概念示意：浏览器自行判断内容是否与用户相关。不是简单地以“在视口内部还是外部”作为唯一条件。</caption>
</box>

当用户向下滚动到评论区附近，浏览器会在需要时完成该区域此前跳过的相关工作。

`content-visibility: auto` 已在现代浏览器中得到较广泛支持，但老旧浏览器以及部分实现细节仍需要验证。

### 3. 为什么还要 contain-intrinsic-size？

假设评论区实际高度为 1200px。

如果浏览器跳过内部布局后，不为它保留足够空间，页面滚动高度可能发生明显变化。

所以我们使用：

```css
.reviews {
  content-visibility: auto;
  contain-intrinsic-size: auto 1200px;
}
```

这里的 `auto 1200px` 很重要。

在没有可复用的实际尺寸时，可以使用 1200px 作为估算。

而当浏览器已经完成过正常布局，并获得元素实际尺寸后，可以在适用条件下复用记住的尺寸。

这样可以减少内容从跳过状态切换到正常渲染时产生的布局变化。

但是估算值不能随便写。

如果评论区实际只有 300px，却预留了 2000px，用户滚动时仍可能出现明显布局变化。

因此，最好根据组件的典型高度给出合理估算，并通过实际测量验证。

### 4. content-visibility 是不是 Lazy Loading？

**不是。**

这是必须区分的两个概念。

`content-visibility: auto` 主要帮助浏览器跳过暂时不必要的内部渲染工作。

`loading="lazy"` 主要用于推迟图片、iframe 等资源的获取。

例如：

```html
<section class="recommendations">
  <img src="product-a.webp" loading="lazy">
  <img src="product-b.webp" loading="lazy">
</section>
```

```css
.recommendations {
  content-visibility: auto;
  contain-intrinsic-size: auto 700px;
}
```

两者可以配合使用：

- `content-visibility` 减少部分屏幕外渲染工作。
- `loading="lazy"` 避免过早获取某些图片。

但 `content-visibility` **不会自动删除 DOM、阻止全部网络请求或者让 JavaScript 不执行**。

这也是为什么第 14 课学习大型列表性能时，我们还要继续研究虚拟列表和数据分页。

### 5. content-visibility 适合所有区域吗？

不适合。

例如：

```css
.product-main {
  content-visibility: auto;
}
```

如果这是首屏最重要的商品内容，一般没有必要让浏览器采用可能跳过其内容的策略。

尤其是涉及：

- LCP 主图。
- 用户立即需要操作的购买表单。
- 复杂吸顶和滚动定位逻辑。
- 需要准确读取内部元素尺寸的 JS。

都应该先验证行为。

另外，`content-visibility: auto` 的屏幕外内容通常仍然存在于 DOM 和无障碍树中，与 `display: none` 不同；使用时还要测试焦点、查找页面文本、滚动定位与可访问性行为。

---

## 七、CSS 动画：为什么 transform 通常比 width、left 更好？

这部分我们在第 3 课接触过，现在结合实际组件深入分析。

假设 Shopify 商品页有一个 Cart Drawer。

用户点击购物车图标后，抽屉从右侧滑出。

### 1. 低效方案：动画改变 right

```css
.cart-drawer {
  position: fixed;
  width: 400px;
  right: -400px;
  top: 0;
  bottom: 0;

  transition: right 300ms;
}

.cart-drawer.is-open {
  right: 0;
}
```

动画过程中，`right` 持续发生变化。

这通常需要浏览器更新定位元素的布局信息。

如果动画每一帧都发生 Layout，可能增加主线程工作量。

### 2. 更适合动画的方案：transform

```css
.cart-drawer {
  position: fixed;
  width: min(400px, 100vw);
  right: 0;
  top: 0;
  bottom: 0;

  transform: translateX(100%);
  transition: transform 300ms ease;
}

.cart-drawer.is-open {
  transform: translateX(0);
}
```

这里元素在布局中的位置保持相对稳定，变化的是视觉变换。

符合条件时，浏览器可以通过合成器高效执行相关动画，避免逐帧 Layout 和 Paint。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">动画属性影响的渲染阶段</text>
  <table>
    <table-row>
      <table-cell width="32%"><text weight="medium">动画属性</text></table-cell>
      <table-cell><text weight="medium">常见渲染路径</text></table-cell>
    </table-row>
    <table-row>
      <table-cell>`width`</table-cell>
      <table-cell>Style → Layout → Paint → Composite</table-cell>
    </table-row>
    <table-row>
      <table-cell>`left` / `right`</table-cell>
      <table-cell>Style → Layout → Paint → Composite</table-cell>
    </table-row>
    <table-row>
      <table-cell>`background-color`</table-cell>
      <table-cell>Style → Paint → Composite</table-cell>
    </table-row>
    <table-row>
      <table-cell>`transform`</table-cell>
      <table-cell>符合条件时可在合成阶段更新</table-cell>
    </table-row>
    <table-row>
      <table-cell>`opacity`</table-cell>
      <table-cell>符合条件时可在合成阶段更新</table-cell>
    </table-row>
  </table>
</box>

这里必须理解一个高级细节：

**不是 CSS 动画天然比 JS 动画快，而是动画是否能避开昂贵的 Layout 和 Paint 更重要。**

CSS `transform` 动画和符合条件的 Web Animations API 动画，都有可能交由合成器高效处理。

#### 3. will-change 真的能让动画更快吗？

例如：

```css
.cart-drawer {
  will-change: transform;
}
```

它告诉浏览器：

“这个元素之后可能发生 transform 变化，你可以提前准备相关优化。”

但这是一个**优化提示**，并不保证一定创建新图层。

更重要的是，不要这样写：

```css
* {
  will-change: transform;
}
```

因为潜在的图层准备和相关资源占用可能增加内存成本，甚至让页面变慢。

MDN 明确建议将 `will-change` 视为最后的性能优化手段，而不是默认写法。

实际商品页中，一两个需要频繁动画的抽屉或浮层，经过测量后可以考虑使用。

但几百个商品卡片都添加 `will-change`，通常是不合理的。

#### 4. 购物车动画还要注意可访问性

这里顺便补充一个实际开发问题。

关闭的 Cart Drawer 即使被：

```css
transform: translateX(100%);
```

移出了可见区域，它的按钮和链接也不一定自动退出键盘 Tab 顺序。

因此在真实项目中还需要结合 `inert`、焦点管理、适当的可见性状态，以及 `prefers-reduced-motion` 等机制。

例如：

```css
@media (prefers-reduced-motion: reduce) {
  .cart-drawer {
    transition: none;
  }
}
```

性能优化不能以破坏交互正确性为代价。

---

## 八、CSS 文件应该怎么组织？Shopify 目前有一项非常重要的能力

前面讨论的主要是运行阶段的 Style、Layout 和 Paint。

现在回到 CSS 加载阶段。

假设 Theme 有：

```text
assets/
  base.css
  product.css
  collection.css
  cart.css
  reviews.css
```

如果你在 `theme.liquid` 中无条件引入：

```liquid
{{ 'base.css' | asset_url | stylesheet_tag }}
{{ 'product.css' | asset_url | stylesheet_tag }}
{{ 'collection.css' | asset_url | stylesheet_tag }}
{{ 'cart.css' | asset_url | stylesheet_tag }}
{{ 'reviews.css' | asset_url | stylesheet_tag }}
```

那么每个页面都可能下载这些 CSS，即使部分样式在当前页面没有用处。

这可能增加首屏资源成本。

最简单的改造方式是按页面类型加载：

```liquid
{{ 'base.css' | asset_url | stylesheet_tag }}

{% case request.page_type %}
  {% when 'product' %}
    {{ 'product.css' | asset_url | stylesheet_tag }}

  {% when 'collection' %}
    {{ 'collection.css' | asset_url | stylesheet_tag }}
{% endcase %}
```

但 Shopify 现在还有一项值得了解的平台能力。

### 1. Shopify 的 stylesheet 自动子集化

从 2026 年 4 月开始，Shopify 已经对 `{% stylesheet %}` 中的 CSS 引入自动子集化能力。

例如：

```liquid
<!-- sections/main-product.liquid -->

<div class="main-product">
  ...
</div>

{% stylesheet %}
  .main-product {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
{% endstylesheet %}
```

以及：

```liquid
<!-- sections/main-collection.liquid -->

<div class="collection-grid">
  ...
</div>

{% stylesheet %}
  .collection-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
{% endstylesheet %}
```

Shopify 会根据当前页面真正参与渲染的 Section、Block 和 Snippet 文件，决定哪些 `{% stylesheet %}` 中的 CSS 应该包含在当前页面的样式资源中。

这意味着商品页可以避免加载完全无关的集合页 Section 样式。

但注意：**这项自动子集化不适用于普通 `assets/*.css` 文件。**

### 2. 一个很容易踩到的坑

假设你在 `sections/main-product.liquid` 中写：

```liquid
{% stylesheet %}
  .site-header {
    background: black;
  }
{% endstylesheet %}
```

但 `.site-header` 实际上属于另一个独立的 Header Section。

那么这个 CSS 的生效可能取决于 `main-product.liquid` 是否在当前页面的渲染树中。

如果某个页面没有渲染商品 Section，相关 CSS 可能不会包含进页面。

这就是为什么 Shopify 建议：

**每个 Section 的 `{% stylesheet %}` 尽量只管理本文件及其直接渲染的组件样式。**

真正的全局 CSS 应放在共享的 assets 样式文件中。

### 3. Section Rendering API 还有一个新的注意点

这一点尤其重要，因为你之前深入学习过 Section Rendering。

假设你通过 AJAX 获取新的商品区域 HTML：

```js
const response = await fetch(
  "/products/example?sections=main-product"
);

const sections = await response.json();
```

Shopify 返回的 Section HTML 可能包含：

```html
<style data-section-stylesheet>
  .main-product {
    display: grid;
  }
</style>
```

这部分是该 Section 所需要的子集化 CSS。

如果你把整个 Section HTML 一并插入 DOM，相关样式可以随之保留。

但如果你只从返回 HTML 中提取了内部某个节点，丢弃了：

```html
<style data-section-stylesheet>
```

就可能导致新的 Section 内容缺少所需样式。

所以：

**在 Shopify 2026 年的自动 CSS 子集化机制下，通过 Section Rendering API 局部替换 DOM 时，也需要关注返回 HTML 中附带的 Section 样式。**

这将是我们后面第 16 课 Shopify Theme 高级性能优化的一个重点。

---

## 九、Chrome DevTools 如何真正诊断 CSS 性能？

现在我们已经学了不少 CSS 优化方法，但不应该凭感觉修改。

需要通过 Performance 验证。

### 1. 找到 Recalculate Style

打开 Chrome DevTools → Performance。

录制一次具体操作，例如：

- 切换商品卡片选中状态。
- 打开筛选面板。
- 切换 Cart Drawer。
- 向下滚动复杂商品列表。

然后找到 Main 轨道里的 `Recalculate Style` 或对应的样式计算活动。

假设看到：

```text
Click
 └── Event Handler             3ms

Update Rendering
 ├── Recalculate Style        42ms
 ├── Layout                   55ms
 └── Paint                    21ms
```

这里可以初步判断：

JavaScript 事件回调本身不是主要耗时。

真正昂贵的是后续浏览器渲染工作。

### 2. 使用 CSS Selector Stats

Chrome Performance 面板提供 CSS 选择器统计能力。

在 Capture Settings 中开启：

`Enable CSS selector stats`

再录制对应操作。

然后检查耗时较高的 `Recalculate Style` 活动，在 Selector Stats 中查看：

- `Elapsed`：该选择器匹配耗时。
- `Match Attempts`：尝试匹配的元素数量。
- `Match Count`：真正匹配的元素数量。
- Slow-path non-matches：较昂贵匹配路径中的未命中比例。

Chrome 还提供 CSS selector costs 相关 Insight，帮助定位选择器匹配开销。

假设结果是：

| Selector | Elapsed | Match Attempts |
|---|---:|---:|
| `.product-card` | 2ms | 500 |
| `.collection .product-card .price` | 9ms | 2,000 |
| `body:has(.filter-active) .product-card` | 28ms | 7,000 |

这些数字只是教学示例。

此时最后一个选择器就值得优先调查。

但要注意，启用 Selector Stats 本身会带来性能记录开销，因此不应把打开该功能时测到的总时间直接当成用户真实耗时。

### 3. 如何诊断 Paint 问题？

可以使用 DevTools 的 Rendering 工具：

1. 打开命令菜单。
2. 搜索 `Show Rendering`。
3. 启用 `Paint flashing`。
4. 操作页面并观察哪些区域发生重绘。

如果用户只是悬停某一个商品卡片，却看到大片区域频繁重绘，就值得进一步检查样式和图层影响。

但是绿色闪烁只表示发生了绘制，不代表每次绘制一定很慢。

最终仍要查看实际的绘制耗时。

---

## 十、实战实验：验证 content-visibility 是否真的有用

我们设计一个可以直接在本地浏览器运行的实验。

目标：创建一个包含大量复杂节点的长页面，然后对比是否使用 `content-visibility`。

### 1. HTML

```html
<button id="toggle">
  切换渲染优化
</button>

<div id="list" class="list"></div>
```

### 2. CSS

```css
.list {
  max-width: 900px;
  margin: auto;
}

.card {
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.list.optimized .card {
  content-visibility: auto;
  contain-intrinsic-size: auto 220px;
}
```

### 3. JavaScript

```js
const list = document.querySelector("#list");

const fragment = document.createDocumentFragment();

for (let i = 0; i < 500; i++) {
  const card = document.createElement("article");

  card.className = "card";

  card.innerHTML = `
    <h3>商品 ${i}</h3>
    <p>这是商品描述信息</p>
    <p>更多商品详情</p>
    <p>售价：¥199</p>
  `;

  fragment.append(card);
}

list.append(fragment);

document.querySelector("#toggle").onclick = () => {
  list.classList.toggle("optimized");
};
```

这次实验建议这样进行：

首先保持 `optimized` 关闭，刷新页面，录制 Performance。

然后启用 `optimized`，再次刷新页面，录制 Performance。

观察样式计算、Layout、Paint 等活动及总耗时。

你可能发现对于屏幕外的大量内容，浏览器减少了部分初始渲染工作。

但也可能出现：

- 内容本身太简单，改善不明显。
- `contain-intrinsic-size` 与实际高度不符，产生滚动位置变化。
- 滚动到新的卡片区域时，出现额外布局工作。

另外，代码中的 `innerHTML` 使用的是固定示例内容，不应在真实项目中直接拼接未经转义的用户输入。

**实验的关键不是证明 `content-visibility` 永远有效，而是学会判断它究竟把哪些工作减少或延后了。**

---

## 十一、一个 Shopify 集合页的 CSS 优化案例

假设有一个商品集合页：

```text
Collection Page
  ├── Filter Bar
  ├── Sort Bar
  ├── 100 个商品卡片
  │    ├── 商品图
  │    ├── 标题
  │    ├── 价格
  │    └── 颜色选项
  └── Pagination
```

假设实测发现：

用户点击筛选条件后，页面重新构建大量商品 DOM，并触发昂贵的样式计算和布局。

我们可以逐层分析：

**第一层：不要每次都更新整个页面。**

尽量只替换确实需要更新的商品区域、结果数量等组件。

**第二层：缩小频繁更新的样式影响范围。**

避免一个简单的卡片状态变化意外影响数百个无关卡片。

**第三层：检查 Layout。**

商品卡片尺寸是否稳定？图片是否预留空间？标题高度变化是否导致不必要的布局抖动？

**第四层：检查动画属性。**

筛选抽屉是否通过 `transform` 移动？卡片悬停动画是否不必要地反复改变几何尺寸？

**第五层：评估屏幕外渲染工作。**

对于很长的内容，可以测试 `content-visibility`，但不能用它取代合理的分页、DOM 数量控制与按需加载。

这样就把 CSS 性能优化与后面第 14 课的大型列表性能联系起来了。

---

## 十二、第 10 课总结

今天我们真正深入了 CSS 性能的两个维度：**加载成本和运行时渲染成本**。

| 知识点 | 核心结论 |
|---|---|
| Style Calculation | 浏览器需要确定元素最终计算样式 |
| Style Invalidation | DOM、class 等变化会导致相关样式失效 |
| CSS 选择器 | 不要仅凭选择器长度判断性能 |
| `:has()` | 很强大，但动态复杂页面中值得测量 |
| `contain` | 通过隔离限制部分布局、绘制等影响 |
| `content-visibility` | 可以跳过暂时不必要的内部渲染工作 |
| `contain-intrinsic-size` | 为跳过渲染的内容保留合理布局空间 |
| `transform` / `opacity` | 符合条件时能利用合成器优化动画 |
| `will-change` | 谨慎使用，不是默认性能开关 |
| Shopify CSS 子集化 | `{% stylesheet %}` 的 CSS 可按页面渲染树自动筛选 |

现在你应该能够区分三个优化目标：

**减少要加载的 CSS：** 减轻网络和首次渲染成本。

**减少要重新计算的样式：** 缩小 Style Invalidation 和选择器匹配开销。

**减少 Layout 与 Paint：** 通过合理的尺寸约束、渲染隔离和动画属性选择控制后续渲染成本。

特别要记住：真正的 CSS 性能优化，是先通过 DevTools 找到耗时的样式或渲染阶段，再选择有针对性的解决方案。

## 参考资料

- [Stylesheet content subsetting](https://shopify.dev/docs/storefronts/themes/best-practices/performance/stylesheet-subsetting)
- [Automatic CSS subsetting for {% stylesheet %} tags - Shopify developer changelog](https://shopify.dev/changelog/posts/automatic-css-subsetting-for-stylesheet-tags)
- [JavaScript and stylesheet tags](https://shopify.dev/docs/storefronts/themes/best-practices/javascript-and-stylesheet-tags)
- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [contain CSS property - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain)
- [contain-intrinsic-size CSS property - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain-intrinsic-size)
- [Using CSS containment - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Using)
- [content-visibility CSS property - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility)
- [will-change CSS property - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change)
- [CSS performance optimization - Learn web development | MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS)
- [will-change CSS 属性 - CSS：层叠样式表 | MDN](https://developer.mozilla.org/zh-CN/docs/Web/CSS/Reference/Properties/will-change)
- [Stylesheet content subsetting](https://shopify-dev.shopifycloud.com/docs/storefronts/themes/best-practices/performance/stylesheet-subsetting)
- [Analyze CSS selector performance during Recalculate Style events | Chrome DevTools | Chrome for Developers](https://developer.chrome.google.cn/docs/devtools/performance/selector-stats?hl=en)
- [CSS selector costs | Performance insights | Chrome for Developers](https://developer.chrome.google.cn/docs/performance/insights/slow-css-selector?hl=en)
- [Analyze CSS selector performance during Recalculate Style events | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance/selector-stats?authuser=605480194)
- [CSS selector costs | Performance insights | Chrome for Developers](https://developer.chrome.com/docs/performance/insights/slow-css-selector?authuser=945769740)
- [Analyze CSS selector performance during Recalculate Style events | Chrome DevTools | Chrome for Developers](https://ccn.web.tr/web-api/iframe-proxy?url=https%3A%2F%2Fdeveloper.chrome.com%2Fdocs%2Fdevtools%2Fperformance%2Fselector-stats)
- [content/files/en-us/web/css/reference/properties/will-change/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/properties/will-change/index.md?plain=1)
- [web.dev/src/site/content/en/blog/animations-and-performance/index.md at main · GoogleChrome/web.dev · GitHub](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/blog/animations-and-performance/index.md)
- [How to create high-performance CSS animations | Articles | web.dev](https://web.dev/articles/animations-guide?authuser=56)
- [How to create high-performance CSS animations | Articles | web.dev](https://web.dev/articles/animations-guide?authuser=5)
- [How to create high-performance CSS animations | Articles | web.dev](https://web.dev/articles/animations-guide?authuser=115)
- [How to create high-performance CSS animations | Articles | web.dev](https://web.dev/articles/animations-guide?authuser=80)
- [Why are some animations slow? | Articles | web.dev](https://web.dev/articles/animations-overview?hl=en)
