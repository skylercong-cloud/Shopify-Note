# JavaScript 资源优化：Tree Shaking、Code Splitting、动态加载与执行性能


这一课，我们从浏览器底层原理，进入真正的前端工程实践。

前面已经学习了：

- 浏览器如何下载、解析和执行 JavaScript。
- 同步 JS 为什么阻塞 HTML 解析。
- JavaScript 长任务如何阻塞主线程。
- HTTP 缓存如何减少重复下载。

现在有一个新的问题：

**假设某个网站的 `theme.js` 有 500KB，里面包含大量功能，但用户打开商品详情页时只需要其中一小部分代码，应该怎样优化？**

你可能会想到 Tree Shaking、Code Splitting、Dynamic Import。

但它们解决的并不是同一个问题。

本课要重点建立这样一个认知：

> JavaScript 性能优化，不只是让文件变小，更重要的是减少浏览器在关键时间段必须下载、解析、编译和执行的代码。

---

## 一、首先理解：500KB 的 JS 为什么可能很慢？

假设浏览器请求：

```html
<script src="theme.js" defer></script>
```

服务器返回一个 500KB 的 JavaScript 文件。

我们可以将 JS 的处理成本简化成五个部分。

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 348" width="100%">
    {#each [
      {y:5,t:"1. Download",s:"通过网络获取 JavaScript 文件",c:"#64748b"},
      {y:72,t:"2. Decompress",s:"解压 gzip / Brotli 等内容编码",c:"#64748b"},
      {y:139,t:"3. Parse & Compile",s:"解析语法、生成内部执行表示",c:"#3b82f6"},
      {y:206,t:"4. Evaluate / Execute",s:"执行模块初始化及业务代码",c:"#d97706"},
      {y:273,t:"5. Runtime Work",s:"后续事件、DOM 更新、计算和内存使用",c:"#0d9488"}
    ] as p,i}
      <rect x="25" y={p.y} width="290" height="52" rx="8" fill={p.c} fillOpacity=".09" stroke={p.c} strokeOpacity=".45"/>
      <text x="170" y={p.y+21} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="currentColor">{p.t}</text>
      <text x="170" y={p.y+39} textAnchor="middle" fontSize="10.5" fill="currentColor" opacity=".65">{p.s}</text>
      {#if i<4}
        <path d={`M170 ${p.y+52} v12 m-4 -4 l4 4 4 -4`} fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5"/>
      {/if}
    {/each}
  </svg>
  <caption>概念流程，并非全部严格串行。现代 JavaScript 引擎可以使用后台解析、延迟编译、即时编译及缓存等优化。</caption>
</box>

这就带来了一个很容易被忽视的事实：

**JavaScript 文件下载完成，并不意味着浏览器已经完成了这份 JavaScript 带来的全部工作。**

### 1. 下载成本

假设 JS 原始大小为 500KB，经过 Brotli 压缩后只有 130KB。

网络真正传输的可能是压缩后的内容。

所以 Network 面板中通常需要区分：

- Transfer Size：实际网络传输量。
- Resource Size：解码内容编码后，资源的大小。

它们不一定相同。

### 2. 解析和编译成本

当浏览器获得 JS 后，JavaScript 引擎还需要理解代码结构，并准备执行。

例如：

```js
function calculatePrice(price, quantity) {
  return price * quantity;
}
```

浏览器需要识别函数声明、参数、表达式等结构。

JavaScript 引擎可能采用延迟解析或延迟编译等策略，因此不是所有函数都会在下载完成后立刻被完整编译成最终机器码。

但代码量和复杂度仍然会影响解析、编译和内存成本。

### 3. 执行成本

再看一个例子：

```js
function calculatePrice(price, quantity) {
  return price * quantity;
}

initializeCart();
initializeGallery();
initializeRecommendations();
```

前面的函数声明本身通常很轻量。

但后面三个初始化函数可能执行大量同步工作。

例如：

```js
function initializeRecommendations() {
  for (let i = 0; i < 100000; i++) {
    // 复杂计算
  }
}
```

即使整个 JS 文件只有 20KB，也可能产生严重的主线程阻塞。

所以：

**JS 文件大小和 JS 执行耗时相关，但不是简单的线性关系。**

Chrome 的 JavaScript 执行时间指南也明确区分了网络、解析编译、执行和内存成本。

### 4. 一个模拟案例

假设我们有两个 JS 文件：

| 指标 | 文件 A | 文件 B |
|---|---:|---:|
| 传输大小 | 200KB | 40KB |
| 下载时间 | 600ms | 200ms |
| 解析编译 | 45ms | 10ms |
| 同步执行 | 20ms | 350ms |

这里的数字是为了讲解的假设。

虽然文件 B 比 A 小得多，但 B 的同步执行时间远高于 A。

如果文件 B 正好在页面首屏加载期间执行，就可能造成明显卡顿。

因此，**压缩文件和优化 JavaScript 执行性能是两个不同的优化方向。**

---

## 二、JavaScript 优化的四个主要层次

JavaScript 优化可分为四个层次。

<box border radius="xl" padding={3} gap={3}>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" padding={2}>
      <icon name="trash-2" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **第一层：不要发送不需要的代码**

      删除无用功能、无用依赖，通过 Tree Shaking 排除可安全删除的代码。
    </box>
  </row>
  <divider color="subtle"/>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" padding={2}>
      <icon name="package-open" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **第二层：不要一次发送所有代码**

      通过 Code Splitting，将代码拆成适合不同页面、组件或场景加载的资源。
    </box>
  </row>
  <divider color="subtle"/>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" padding={2}>
      <icon name="clock-3" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **第三层：不要在错误的时间执行代码**

      通过 `defer`、Dynamic Import、按需初始化、任务分片，把非关键工作移出关键路径。
    </box>
  </row>
  <divider color="subtle"/>
  <row gap={3} align="start">
    <box background="surface-secondary" radius="lg" padding={2}>
      <icon name="cpu" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **第四层：让必须执行的代码更高效**

      优化算法、减少 DOM 操作、消除重复计算、使用 Worker 等。
    </box>
  </row>
</box>

接下来我们逐一研究。

---

## 三、Tree Shaking：删除不会使用的代码

Tree Shaking 是现代前端构建工具提供的一项重要优化能力。

它主要依赖 ES Module 的静态 `import`、`export` 结构，分析模块之间的引用关系，尽可能删除构建结果中没有使用且可以安全删除的代码。

### 1. 从一个简单例子理解

假设你的项目有一个工具模块：

**utils.js**

```js
export function formatPrice(price) {
  return `¥${price.toFixed(2)}`;
}

export function calculateDiscount(price, rate) {
  return price * (1 - rate);
}

export function heavyRecommendationAlgorithm(products) {
  // 大量复杂推荐逻辑
  return products;
}
```

在商品页面中，你只使用了：

```js
import { formatPrice } from "./utils.js";

console.log(formatPrice(199));
```

如果使用支持 Tree Shaking 的构建工具，例如 Rollup、Vite 或 webpack 的合适生产构建配置，它就有机会发现：

`calculateDiscount()` 没被使用。

`heavyRecommendationAlgorithm()` 也没被使用。

那么构建产物可能近似变成：

```js
function formatPrice(price) {
  return `¥${price.toFixed(2)}`;
}

console.log(formatPrice(199));
```

其他不需要的代码被删除。

这就是 Tree Shaking 的基本作用。

### 2. Tree Shaking 在什么时候发生？

这是一个很重要的区别。

**Tree Shaking 主要是构建阶段的优化，不是浏览器在运行时自动删除没调用的函数。**

比如：

```text
源代码
    ↓
ES Module 依赖分析
    ↓
判断哪些代码可以安全移除
    ↓
Tree Shaking / Dead Code Elimination
    ↓
生成生产环境 JavaScript 文件
    ↓
浏览器下载、解析和执行
```

如果你直接将未经构建的 `utils.js` 发给浏览器，浏览器不会因为只导入了一个函数，就保证把网络响应里其他两个函数的源码删除。

原生 ES Module 的模块加载，与构建工具的 Tree Shaking，是两种不同的能力。

---

## 四、为什么 Tree Shaking 有时候不生效？

这是理解 Tree Shaking 最关键的部分。

它不是看到某个函数没有被直接调用，就一定可以删除。

JavaScript 存在**副作用（Side Effects）**。

### 1. 什么是副作用？

假设有一个模块：

```js
// analytics.js

console.log("Analytics initialized");

window.analyticsEnabled = true;

export function track(eventName) {
  console.log(eventName);
}
```

另一个文件：

```js
import "./analytics.js";
```

即使没有调用 `track()`，也不能直接删除整个模块。

因为模块导入时会执行：

```js
console.log("Analytics initialized");

window.analyticsEnabled = true;
```

这些操作会产生外部可观察的效果。

如果构建工具把模块整个删除，就改变了程序行为。

所以，Tree Shaking 必须考虑代码的副作用。

### 2. package.json 的 sideEffects

在 webpack 等构建工具中，可以通过：

```json
{
  "sideEffects": false
}
```

向构建工具声明一个包中的模块没有需要保留的导入时副作用。

但是不能随意这样写。

例如：

```js
import "./global.css";
```

这个导入就是为了让样式生效。

如果包被不正确地声明为完全没有副作用，构建工具就可能把原本需要保留的样式导入删除。

所以很多项目会显式保留 CSS：

```json
{
  "sideEffects": ["**/*.css"]
}
```

这类配置必须根据实际模块行为决定，不能机械复制。webpack 官方文档也特别说明了 CSS 和其他副作用模块的情况。

### 3. CommonJS 为什么可能影响 Tree Shaking？

比较两种导入方式。

ES Module：

```js
import { formatPrice } from "./utils.js";
```

CommonJS：

```js
const utils = require("./utils");
```

ES Module 的静态结构通常更容易让构建工具分析引用关系。

而 CommonJS 可以动态构造 `require` 路径，部分情况下更难静态分析。

但不能简单理解为：

“CommonJS 完全不能优化。”

现代构建工具对一些 CommonJS 模式也具有分析和转换能力，只是优化的可靠程度与使用模式有关。

### 4. Tree Shaking 的边界

例如：

```js
function calculateA() {}
function calculateB() {}

const functions = {
  a: calculateA,
  b: calculateB
};

functions[window.currentMode]();
```

因为真正使用的函数取决于运行时的 `window.currentMode`，构建工具通常很难证明其中某个函数永远不被调用。

所以动态访问、运行时依赖以及副作用，都可能限制优化效果。

#### 本节结论

Tree Shaking 的本质是：

**在保证程序行为正确的前提下，尽可能减少最终发送到浏览器的无用代码。**

但 Tree Shaking 不能解决所有问题。

假设 `theme.js` 中有十个功能，每个功能都在网站某个页面使用。

那么从整个项目来看，这些功能都不是无用代码。

但当前商品页可能只需要其中三个。

这时候就需要下一项技术。

---

## 五、Code Splitting：为什么所有代码都有用，却不应该同时下载？

Tree Shaking 只能删除确定不需要的代码。

但还有一种情况：

你的网站有很多功能，每个功能都确实需要，只是**不需要在同一个时间、同一个页面加载**。

例如一个 Shopify 商店：

```text
首页：
  Hero Banner
  商品推荐
  搜索

商品页：
  商品变体
  图片画廊
  加入购物车
  尺码指南

集合页：
  商品筛选
  商品排序
  分页

所有页面：
  Header
  Cart Drawer
  用户菜单
```

如果将所有功能都打包进一个文件：

```text
theme.js（500KB）
    ├── Header
    ├── Cart Drawer
    ├── 商品变体
    ├── 图片画廊
    ├── 尺码指南
    ├── 集合筛选
    ├── 商品排序
    └── 其他功能
```

那么即使用户只打开首页，也需要获取这个文件。

但首页并不需要商品变体、集合筛选或尺码指南等代码。

于是就出现了新的优化需求：

**按照页面、组件或使用时机，将 JavaScript 拆分为不同的文件。**

这就是 Code Splitting（代码分割）。

### 1. Code Splitting 的基本原理

我们将原来的 500KB 文件拆成：

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">全局大 Bundle 与按功能拆分的对比</text>
  <box gap={1}>
    <row align="center" justify="between">
      <text size="sm">原方案：theme.js</text>
      <text size="sm" weight="medium" tabularNums>500KB</text>
    </row>
    <box height="29px" radius="sm" background="#d97706" align="center" justify="center">
      <text size="xs" color="#ffffff" weight="medium">全部功能打包在一起</text>
    </box>
  </box>
  <box gap={1}>
    <text size="sm" color="secondary">拆分后（模拟大小）</text>
    {#each [
      {name:"global.js",size:60,c:"#3b82f6"},
      {name:"product.js",size:120,c:"#0d9488"},
      {name:"collection.js",size:100,c:"#8b5cf6"},
      {name:"size-guide.js",size:80,c:"#d97706"},
      {name:"其他页面代码",size:140,c:"#64748b"}
    ] as x}
      <row align="center" gap={2}>
        <box width="116px">
          <text size="xs">{x.name}</text>
        </box>
        <box flex="1" background="surface-tertiary" height="15px" radius="sm" clip>
          <box width={`${x.size/140*100}%`} height="100%" background={x.c} radius="sm"/>
        </box>
        <text size="xs" tabularNums width="46px" textAlign="end">{x.size}KB</text>
      </row>
    {/each}
  </box>
  <caption>全部为演示数字。为了突出代码分割效果，假设拆分后总大小不变；实际构建可能因共享运行时代码、重复依赖和压缩产生不同结果。</caption>
</box>

现在假设用户打开首页。

原方案：

```text
首页 → 下载 500KB theme.js
```

拆分后：

```text
首页 → 下载 60KB global.js
```

如果首页还有自身功能，就再加载相应模块。

而商品页：

```text
商品页
  ├── global.js
  └── product.js
```

这就实现了按页面加载。

### 2. Code Splitting 为什么能改善性能？

减少初始加载的 JS，通常可以降低：

- 首次需要下载的字节数。
- 初始 JavaScript 解析和编译负担。
- 初始执行和模块初始化工作。
- 内存使用及主线程资源竞争。

但需要注意：

**仅仅把一个大文件拆成十个文件，并不意味着性能一定会提升。**

例如你拆成：

```html
<script src="a.js" defer></script>
<script src="b.js" defer></script>
<script src="c.js" defer></script>
<script src="d.js" defer></script>
```

如果每个页面仍然把它们全部加载，初始 JavaScript 总量可能基本不变，甚至增加额外的请求及模块管理开销。

因此 Code Splitting 真正的价值是：

**拆分之后，使一部分代码能够不在当前页面加载，或者不在当前阶段加载。**

---

## 六、Dynamic Import：如何真正做到按需加载？

到这里必须区分两个概念：

**Code Splitting 是把代码拆开。**

**Dynamic Import 是在运行时按需加载 JavaScript 模块的一种机制。**

它们通常配合使用，但不是同一个概念。

### 1. 静态导入

例如：

```js
import { openSizeGuide } from "./size-guide.js";

const button = document.querySelector("#size-guide");

button.addEventListener("click", () => {
  openSizeGuide();
});
```

这段代码虽然只在用户点击时调用 `openSizeGuide()`，但模块本身属于当前静态模块依赖图。

浏览器通常需要在入口模块初始化过程中获取、链接并执行这些依赖模块。

也就是说：

**函数延迟调用，不等于代码延迟加载。**

如果 `size-guide.js` 依赖较多模块，即使用户从来不打开尺码指南，也可能在页面加载时承担这部分模块的获取和初始化成本。

### 2. 动态导入

我们改成：

```js
const button = document.querySelector("#size-guide");

button.addEventListener("click", async () => {
  const { openSizeGuide } = await import("./size-guide.js");

  openSizeGuide();
});
```

区别就在于：

```js
import("./size-guide.js")
```

只有当代码执行到这里时，浏览器才会发起相应的动态模块加载流程；如果资源此前已经被缓存或导入，则可以复用。

假设用户始终没有点击尺码指南：

```text
用户打开商品页
       ↓
初始化基础功能
       ↓
用户浏览商品、加入购物车
       ↓
从未点击尺码指南
       ↓
尺码指南模块无需因这次 import() 而加载
```

这就是我们希望达到的效果。

MDN 明确说明，动态 `import()` 可以在运行时加载模块，并返回一个 Promise。

### 3. defer、async 和 import() 的本质区别

这一点一定要理解透彻。

| 加载方式 | 什么时候开始加载？ | 主要解决什么问题？ |
|---|---|---|
| `<script defer>` | 浏览器发现标签后 | 不阻塞 HTML 解析，延后执行 |
| `<script async>` | 浏览器发现标签后 | 并行下载，就绪后尽快执行 |
| 静态 `import` | 入口模块加载过程中 | 声明模块依赖 |
| 动态 `import()` | 执行到该表达式时 | 按需加载模块 |

所以：

```html
<script src="size-guide.js" defer></script>
```

虽然不会因为文件下载而暂停 HTML 解析，但浏览器依然会在页面加载期间下载它。

而：

```js
await import("./size-guide.js");
```

只在触发对应逻辑时需要加载。

**defer 优化的是加载与执行的阻塞关系；Dynamic Import 可以改变模块是否需要在初始阶段加载。**

### 4. Dynamic Import 也有代价

假设用户点击尺码指南时，才开始下载一个 150KB 的 JS 模块。

在网络较慢的设备上，点击后可能需要等待几百毫秒才能打开。

也就是说：

**你减少了首次页面加载的工作，但把部分等待转移到了用户点击之后。**

这并不一定是坏事，但要根据功能的重要程度作出选择。

例如：

- 商品变体选择：用户很可能马上操作，交互逻辑应该尽早准备。
- 加入购物车：购买路径上的关键功能，不宜产生不必要的首次点击等待。
- 尺码指南：可以考虑点击时加载。
- 页面底部视频：可以等接近视口时再加载。
- 不常使用的复杂弹窗：通常适合按需加载。

这就引出了下一层优化。

---

## 七、不要只按点击加载，还可以提前预测使用时机

我们刚才让尺码指南模块在点击时才开始加载。

但如果模块比较大，第一次点击可能存在可感知的等待。

有没有一种折中方案？

有。

**当用户表现出使用意图时，提前加载。**

例如，桌面端用户把鼠标移动到尺码指南按钮附近。

这可能意味着用户准备点击。

我们就可以开始加载模块：

```js
let sizeGuidePromise;

function loadSizeGuide() {
  if (!sizeGuidePromise) {
    sizeGuidePromise = import("./size-guide.js").catch((error) => {
      sizeGuidePromise = undefined;
      throw error;
    });
  }

  return sizeGuidePromise;
}

const button = document.querySelector("#size-guide");

button.addEventListener("pointerenter", () => {
  void loadSizeGuide().catch(() => {});
});

button.addEventListener("focus", () => {
  void loadSizeGuide().catch(() => {});
});

button.addEventListener("click", async () => {
  try {
    const { openSizeGuide } = await loadSizeGuide();
    openSizeGuide();
  } catch (error) {
    console.error("尺码指南加载失败", error);
  }
});
```

这里做了三个优化。

**第一，鼠标悬停或键盘聚焦时提前请求。**

**第二，使用同一个 Promise，避免重复创建加载流程。**

**第三，即使用户直接点击，仍然可以正常加载。**

不过要注意，`pointerenter` 和 `focus` 只是可能的意图信号，并不能覆盖所有触屏设备的使用情况。

此外，提前加载不是免费的。如果大量按钮都在鼠标移动时触发大模块下载，也会形成资源竞争。

因此，只有比较可能使用、且加载成本确实明显的功能，才值得采用这种策略。

Shopify 官方也将点击、Hover/Focus 和进入视口作为按需加载 JavaScript 的典型触发方式。

---

## 八、Shopify Theme 实战：怎样组织 JavaScript 才合理？

现在进入本课最重要的 Shopify 部分。

假设你的 Theme 目录如下：

```text
layout/
  theme.liquid

sections/
  main-product.liquid
  main-collection.liquid
  featured-collection.liquid

snippets/
  product-card.liquid

assets/
  theme.js
  product.js
  collection.js
  cart-drawer.js
  size-guide.js
  gallery.js
```

我们先讨论一个重要问题：

**Shopify Theme 应该把全部功能写在 `theme.js`，还是每个 Section 单独管理 JS？**

答案取决于功能的作用范围和加载成本。

### 1. 第一种方案：所有页面都加载 theme.js

例如：

```liquid
<!-- layout/theme.liquid -->

<script
  src="{{ 'theme.js' | asset_url }}"
  defer
></script>
```

如果 `theme.js` 负责所有页面功能：

```js
initializeHeader();
initializeCart();
initializeProduct();
initializeCollection();
initializeGallery();
initializeSizeGuide();
```

这就存在明显的优化空间。

在一个集合页上：

`initializeProduct()` 可能根本没有需要操作的商品详情区域。

而在商品页上：

`initializeCollection()` 可能也不需要执行。

虽然可以在函数内部判断：

```js
function initializeCollection() {
  const collection = document.querySelector(".collection");

  if (!collection) return;

  // 初始化集合页功能
}
```

但这种方式只避免了后续的部分执行工作。

它并不能避免包含该函数的整个 `theme.js` 被下载及进行必要的解析。

所以，**运行时判断是否需要执行，与构建时或加载时不发送这份代码，存在本质区别。**

### 2. 第二种方案：按照页面类型加载 JS

这是 Shopify Theme 中非常实用的一种方案。

例如：

```liquid
<!-- layout/theme.liquid -->

<script
  src="{{ 'theme.js' | asset_url }}"
  defer
></script>

{% case request.page_type %}
  {% when 'product' %}
    <script
      src="{{ 'product.js' | asset_url }}"
      defer
    ></script>

  {% when 'collection' %}
    <script
      src="{{ 'collection.js' | asset_url }}"
      defer
    ></script>
{% endcase %}
```

这样：

```text
首页：
  theme.js

商品页：
  theme.js
  product.js

集合页：
  theme.js
  collection.js
```

这是按页面加载的一种实现方式。

优点是代码简单、清晰，不需要额外引入复杂构建系统。

但它依然存在一个问题：

商品页的 `product.js` 可能包含商品变体、图片缩放、尺码指南、视频播放等全部功能。

而用户实际上不一定会使用其中的大部分功能。

所以我们还可以继续优化。

---

## 九、Shopify 实战：使用 Import Map + Dynamic Import 按需加载

这里介绍一种 Shopify 官方目前推荐的现代模块组织方式：

**Import Map + 原生 ES Module + Dynamic Import。**

Shopify 已经提供了相关模块兼容性支持，可以利用浏览器原生模块系统组织 Theme JS，而不必仅仅为了模块引用就引入一个打包工具。

我们实现一个商品详情页的尺码指南。

目标：

- 商品页打开时不下载 `size-guide.js`。
- 用户点击尺码指南才加载模块。
- 下载成功后显示 Dialog。
- 多次点击不重复执行模块的顶层初始化。
- 兼容 Shopify Theme Editor 中动态重新渲染的商品 Section。

### 第一步：在 theme.liquid 定义 Import Map

```liquid
<!-- layout/theme.liquid -->

<head>
  {{ 'base.css' | asset_url | stylesheet_tag }}

  <script type="importmap">
    {
      "imports": {
        "size-guide": {{ 'size-guide.js' | asset_url | json }}
      }
    }
  </script>

  <script
    type="module"
    src="{{ 'theme.js' | asset_url }}"
  ></script>

  {{ content_for_header }}
</head>
```

重点是：

```json
{
  "imports": {
    "size-guide": "/实际的版本化资源URL"
  }
}
```

Import Map 的作用是让浏览器知道：

当 JavaScript 中出现：

```js
import("size-guide");
```

时，应该到哪里加载这个模块。

这样你的 JS 源文件里就不需要硬编码 Shopify CDN URL。

而：

```liquid
{{ 'size-guide.js' | asset_url | json }}
```

会由 Liquid 输出带版本信息、经过正确 JSON 字符串编码的 URL。

这里的 `type="module"` 脚本默认具有类似 `defer` 的行为，不需要额外写 `defer`。

Import Map 需要在使用这些模块名称的模块脚本之前定义。

### 第二步：在商品 Section 输出 HTML

```liquid
<!-- sections/main-product.liquid -->

<section data-product-section>

  <h1>{{ product.title }}</h1>

  <button
    type="button"
    data-size-guide-trigger
  >
    查看尺码指南
  </button>

  <dialog data-size-guide>
    <h2>尺码指南</h2>

    <p>请选择适合你的商品尺码。</p>

    <form method="dialog">
      <button type="submit">关闭</button>
    </form>
  </dialog>

</section>
```

注意，这里使用的是原生 HTML `<dialog>`。

它已经具备很多浏览器原生的弹窗行为，我们不需要为了一个基础弹窗引入完整 UI 框架。

这也符合 Shopify 推荐尽可能利用原生浏览器能力、减少不必要 JS 的思路。

### 第三步：实现 size-guide.js

```js
// assets/size-guide.js

export function openSizeGuide(section) {
  const dialog = section.querySelector(
    "[data-size-guide]"
  );

  if (!dialog) return;

  if (!dialog.open) {
    dialog.showModal();
  }
}
```

这是一个真正的 ES Module。

它导出了 `openSizeGuide()`。

但如果不被加载，也不需要在商品页初始化时执行。

### 第四步：theme.js 中按需加载

```js
// assets/theme.js

document.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const button = target.closest(
    "[data-size-guide-trigger]"
  );

  if (!button) return;

  const section = button.closest(
    "[data-product-section]"
  );

  if (!section) return;

  button.disabled = true;

  try {
    const { openSizeGuide } = await import("size-guide");

    openSizeGuide(section);
  } catch (error) {
    console.error("尺码指南加载失败", error);
  } finally {
    button.disabled = false;
  }
});
```

这样就完成了真正的按需模块加载。

#### 浏览器实际执行过程

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 319" width="100%">
    {#each [
      {y:5,t:"用户打开商品页",s:"HTML、关键 CSS、theme.js 加载",c:"#64748b"},
      {y:70,t:"尺码指南模块尚未加载",s:"size-guide.js 不在初始静态依赖中",c:"#64748b"},
      {y:135,t:"用户点击尺码指南",s:"theme.js 捕获点击事件",c:"#3b82f6"},
      {y:200,t:"执行 import('size-guide')",s:"获取、链接并执行 size-guide.js",c:"#d97706"},
      {y:265,t:"打开 Dialog",s:"执行 openSizeGuide(section)",c:"#0d9488"}
    ] as n,i}
      <rect x="25" y={n.y} width="290" height="49" rx="8" fill={n.c} fillOpacity=".1" stroke={n.c} strokeOpacity=".45"/>
      <text x="170" y={n.y+20} textAnchor="middle" fontWeight="600" fontSize="12" fill="currentColor">{n.t}</text>
      <text x="170" y={n.y+36} textAnchor="middle" fontSize="10" fill="currentColor" opacity=".7">{n.s}</text>
      {#if i<4}
        <path d={`M170 ${n.y+49} v14 m-4 -4 l4 4 4 -4`} stroke="currentColor" strokeOpacity=".45" fill="none"/>
      {/if}
    {/each}
  </svg>
  <caption>如果模块此前已经加载过，浏览器可以复用已有模块记录；不需要每次点击都重新下载和执行。</caption>
</box>

这套方案有几个非常实用的优点。

首先，网页初始加载时不用为尺码指南下载额外的 JavaScript 模块。

其次，JS 模块地址通过 Shopify `asset_url` 管理，能够利用 Shopify 的资源版本化机制。

还有一个很重要的细节：

我们使用了**事件委托**，而不是在页面首次加载时为每一个尺码按钮单独注册监听器。

这使它更容易应对 Shopify Theme Editor 对 Section 的重新渲染。

Shopify 官方文档说明，Theme Editor 可能动态替换 Section HTML，而普通的页面初始化脚本不会因此自动重新执行。

所以，在这种场景下，事件委托是一种相当实用的方案。

当然，如果模块还需要管理每个 Section 的复杂实例状态或释放外部资源，就需要进一步设计初始化和销毁生命周期，不能仅靠事件委托解决全部问题。

---

## 十、Shopify 的 {% javascript %} 到底是什么？会自动按需加载吗？

这个问题和你之前学习的 Shopify Section 非常相关。

Shopify 支持在 Section、Block、Snippet 中写：

```liquid
{% javascript %}
  console.log("Section JavaScript");
{% endjavascript %}
```

从代码组织角度看，这很方便。

例如：

```liquid
<!-- sections/featured-collection.liquid -->

<div class="featured-collection">
  ...
</div>

{% javascript %}
  // 组件相关 JavaScript
{% endjavascript %}
```

但这里存在一个很容易被误解的地方：

**`{% javascript %}` 不等于 ES Module，也不等于每个 Section 会自动生成单独按需加载的 JS 文件。**

根据 Shopify 目前的官方实现，Shopify 会收集这些标签中的 JavaScript，按文件类型合并：

| 来源 | Shopify 生成的资源 |
|---|---|
| Section 中的 `{% javascript %}` | `scripts.js` |
| Block 中的 `{% javascript %}` | `block-scripts.js` |
| Snippet 中的 `{% javascript %}` | `snippet-scripts.js` |

这些资源通过 `content_for_header` 注入，并以带 `defer` 的脚本方式加载。

每个文件中的 JavaScript 还会被包装在独立的立即执行函数作用域中。

因此，假设你有三个 Section：

```text
sections/
  main-product.liquid
  main-collection.liquid
  slideshow.liquid
```

分别写了：

```liquid
{% javascript %}
  // 商品页逻辑
{% endjavascript %}
```

```liquid
{% javascript %}
  // 集合页逻辑
{% endjavascript %}
```

```liquid
{% javascript %}
  // 轮播图逻辑
{% endjavascript %}
```

不要直接认为 Shopify 会生成：

```text
product.js
collection.js
slideshow.js
```

然后根据页面自动加载其中一个。

Shopify 内置的这种 JS 机制主要是**按 Section、Block、Snippet 文件类型收集并合并代码**，不是 Vite 式的按路由 Code Splitting，也不提供你前面看到的构建器 Tree Shaking 能力。

这意味着，对于很大的非关键功能，仍然需要考虑把它移出自动合并的 JS，使用独立资源和按需加载。

这里顺便区分一下 Shopify 的另一项机制：

`{% stylesheet %}` 的 CSS 现在支持基于页面实际渲染树进行内容子集化，只包含该页面使用的相关样式。

**不要把 CSS 的页面级子集化能力，直接理解成 JavaScript 也具备完全相同的自动按需打包机制。**

### 另外三个必须知道的限制

第一，`{% javascript %}` 中不执行 Liquid：

```liquid
{% javascript %}
  const productId = {{ product.id }};
{% endjavascript %}
```

这种写法不正确。

第二，收集的 JavaScript 并不是针对每个 Section 实例分别执行一份初始化脚本。

如果同一个 Section 被添加两次，你需要自行管理两个实例。

第三，如果你希望控制 JS 的精确下载时机，或者使用标准 ES Module 的 `import/export`，通常更适合把代码放到 Theme `assets/` 中，并通过模块脚本加载。

---

## 十一、第三方 App 脚本：Shopify 网站经常被忽略的性能问题

假设你已经把自己的 `theme.js` 从 300KB 优化到 80KB。

但 Performance 面板仍然显示大量 JavaScript 长任务。

为什么？

因为 Shopify 页面上执行的 JavaScript，不只有你编写的 Theme 代码。

可能还包括：

```text
Shopify Storefront
   │
   ├── Theme JavaScript
   ├── Shopify 平台脚本
   ├── 评论 App
   ├── 营销弹窗 App
   ├── 在线客服 App
   ├── 商品推荐 App
   └── 其他第三方资源
```

这些脚本都可能竞争网络资源、CPU 和主线程执行时间。

### 1. 第三方脚本通常有什么问题？

例如某个评论 App：

```html
<script
  src="https://third-party.example.com/reviews.js"
  async
></script>
```

虽然使用了 `async`，不会像普通同步脚本一样阻塞 HTML 主解析器，但它仍可能：

- 与商品主图竞争网络带宽。
- 在下载完成后占用主线程。
- 执行大量 DOM 操作。
- 触发样式计算和布局。
- 注册额外的事件监听器。
- 执行页面当前根本不需要的功能。

所以，**async 不等于零性能开销。**

### 2. 怎样判断哪个 App 真正影响性能？

这里有一套很有效的方法。

打开 Chrome DevTools → Performance。

录制商品页加载，然后查看 First / Third Party 相关的脚本归属分析。

Chrome 的 Performance 面板能够帮助区分第一方、第三方脚本的执行活动，并查看不同来源的传输量和主线程时间。

例如得到以下模拟结果：

| 脚本来源 | 传输大小 | 主线程耗时 |
|---|---:|---:|
| Theme JS | 75KB | 35ms |
| 评论 App | 120KB | 240ms |
| 客服 App | 80KB | 130ms |
| 营销 App | 45KB | 180ms |

这时最应该优先排查的，就不一定是 Theme 自己的代码。

但也不能只看哪个文件最大，或者执行耗时最高。

还要看这项耗时是否发生在 LCP 前、用户交互期间，以及该 App 对业务的必要性。

### 3. Shopify App Embed 的意义

对于开发 Shopify App 的场景，Shopify 推荐使用 Theme App Extensions。

App Embed 可以根据适用页面和配置决定脚本的加载范围，从而减少不必要的全站加载。

还有一个与你后续 Shopify App 学习有关的时间点：

Shopify 已宣布旧式 ScriptTag 机制将于 **2027 年 3 月 1 日**停止在店面运行，推荐使用 Theme App Extensions；如果只是采集分析或转化数据，则考虑 Web Pixel。

这不是让你直接删除所有第三方 App，而是要对它们进行性能审计。

对于非关键功能，可以评估是否有条件加载、延迟加载或替换更轻量的实现。

---

## 十二、实际排查：怎么知道哪些 JavaScript 没有被使用？

现在我们要把理论变成可执行的性能诊断流程。

上一课讲过 Chrome Performance。

这次还需要掌握一个新工具：

**Chrome DevTools Coverage。**

### 1. Coverage 是什么？

Coverage 可以统计页面加载和交互过程中，哪些 JavaScript 与 CSS 代码被使用，哪些没有被执行或覆盖到。

例如：

```text
theme.js
Total Bytes: 400KB
Unused Bytes: 280KB
```

说明在当前这次测试过程中，大量代码没有被使用。

Chrome 官方文档说明，可以通过 Sources 中的 Coverage 视图，进一步查看具体未使用的代码范围。

### 2. 怎么打开？

在 Chrome DevTools 中：

1. 按 `Ctrl + Shift + P` 打开命令菜单。
2. 搜索 `Coverage`。
3. 选择 `Show Coverage`。
4. 点击重新加载，开始记录。
5. 观察不同 JavaScript 文件的 Total Bytes、Unused Bytes。

然后尝试打开购物车、切换变体、显示尺码指南，观察 Coverage 的变化。

#### 注意：Coverage 显示没使用，不等于代码应该被删除

例如用户没有打开购物车，那么购物车交互代码可能被标记为未使用。

但不能因此就直接删除购物车功能。

正确的判断应该是：

**这段代码当前没使用，是永远不需要，还是应该延迟到真正需要时加载？**

这是区分 Tree Shaking 和 Code Splitting 的关键。

### 3. Performance 与 Coverage 各自看什么？

| 工具 | 主要用途 |
|---|---|
| Network | 哪些 JS 下载了、大小和耗时 |
| Coverage | 哪些代码在当前测试场景中未被使用 |
| Performance Main | JS 什么时候执行、耗时多少 |
| Performance Bottom-Up | 哪些函数累计消耗时间 |
| Lighthouse | 发现未使用 JS、执行时间等优化机会 |

把这几个工具组合起来，就可以建立一套比较完整的诊断流程。

---

## 十三、JavaScript 优化前后，应该比较哪些指标？

假设一个模拟 Shopify 商品页初始加载了 450KB JavaScript。

经过优化后，将部分逻辑按需加载。

<box border radius="xl" padding={3} gap={3}>
  <title size="md">模拟优化前后对比</title>
  <Chart content={{"chartType":"bar","meta":{"description":"教学模拟数据，并非真实店铺实测。"},"xKey":"metric","series":[{"dataKey":"before","label":"优化前"},{"dataKey":"after","label":"优化后"}],"yAxisMin":0,"data":[{"metric":"初始 JS（KB）","before":450,"after":150},{"metric":"启动脚本耗时（ms）","before":310,"after":110},{"metric":"最长任务（ms）","before":180,"after":65}]}}/>
  <caption>指标单位已在横轴标签中注明；这些数值用于说明优化方向，而不是承诺可以获得相同比例的提升。</caption>
</box>

在优化前，所有 JS 都在页面加载期间下载。

优化后：

```text
首次进入商品页
   ├── Global JS
   └── Product Core JS

用户打开尺码指南
   └── Size Guide JS

用户打开评论区域
   └── Review JS

用户触发高级图片功能
   └── Gallery Enhancement JS
```

初始脚本负担因此下降。

但是否提升 LCP 和 INP，仍然需要实际测量。

还要注意一个更深层的问题：

**有些 JS 延后以后，首屏性能改善了，但第一次点击功能反而变慢。**

所以不能只比较首次加载，也要录制用户真实的关键操作。

对于 Shopify 商品页，至少要检查：变体切换、加入购物车、购物车抽屉和首次使用懒加载功能时的响应表现。

---

## 十四、一套适合 Shopify Theme 的 JavaScript 架构建议

如果从零开发一个中等复杂度的 Shopify Theme，可从下面这套结构起步。

```text
theme/
├── layout/
│   └── theme.liquid
│
├── sections/
│   ├── main-product.liquid
│   ├── main-collection.liquid
│   └── featured-collection.liquid
│
├── snippets/
│   ├── product-card.liquid
│   └── price.liquid
│
└── assets/
    ├── theme.js
    ├── product.js
    ├── collection.js
    │
    ├── cart-api.js
    ├── product-gallery.js
    ├── size-guide.js
    ├── reviews.js
    │
    └── base.css
```

各个文件的职责可以这样安排：

| 文件 | 职责 | 加载策略 |
|---|---|---|
| `theme.js` | 全站最基础的事件管理和交互 | 全局加载，尽量轻量 |
| `product.js` | 商品变体、价格、购买表单等 | 商品页加载 |
| `collection.js` | 集合页筛选、排序等 | 集合页加载 |
| `cart-api.js` | 共享购物车请求方法 | 由需要它的模块引入 |
| `product-gallery.js` | 图片放大、复杂画廊功能 | 根据首屏需要或交互时机加载 |
| `size-guide.js` | 尺码指南弹窗逻辑 | 按需加载 |
| `reviews.js` | 评论交互 | 接近视口或按需加载 |

这里不一定需要 Vite 或 webpack。

如果 Theme 规模还不大，可以先使用浏览器原生 ES Module 和 Shopify `asset_url`、Import Map。

当项目出现大量源码模块、TypeScript 编译、第三方依赖、复杂模块共享和生产构建需求时，再考虑引入 Vite、Rollup 等构建工具进行 Tree Shaking 和自动 Code Splitting。

**不要因为听说现代项目都用构建工具，就无条件给一个轻量 Shopify Theme 增加复杂的打包流程。**

但同样，也不要因为 Shopify 支持原生 JS 资源，就拒绝合理的模块化和构建优化。

真正的选择标准是代码规模、维护成本、产物体积、缓存表现以及浏览器实际性能。

---

## 十五、本课总结：把几个容易混淆的概念彻底分清

| 技术 | 解决的核心问题 |
|---|---|
| Minification | 减少代码中的冗余字符与部分可安全简化的结构 |
| Compression（gzip / Brotli） | 减少 HTTP 传输字节数 |
| Tree Shaking | 构建时删除可安全排除的无用代码 |
| Code Splitting | 把代码拆成不同资源块 |
| Dynamic Import | 运行时按需加载模块 |
| `defer` | 避免经典脚本下载阻塞 HTML 解析，并延后执行 |
| `async` | 并行获取、就绪后尽快执行独立脚本 |
| `scheduler.yield()` | 主线程任务分片，让出执行机会 |
| Web Worker | 将适合的计算转移出页面主线程 |

还有一个非常重要的对照：

**Tree Shaking** 解决“哪些代码最终根本不用发送”。

**Code Splitting** 解决“哪些代码不需要一起发送”。

**Dynamic Import** 解决“哪些代码不需要现在发送”。

**任务调度** 解决“已经需要执行的代码，怎样不长时间阻塞主线程”。

它们可以结合使用，但任何一种都不能完全替代其他几种。

### 最终建立的优化顺序

以后你接手一个 JS 体积较大、加载缓慢的 Shopify Theme，可以按照下面的顺序判断：

<box gap={2}>
  {#each [
    {title:"先删除",desc:"这个功能或第三方依赖是不是根本不需要？"},
    {title:"再拆分",desc:"这段代码是不是只有某个页面才需要？"},
    {title:"再按需加载",desc:"是不是必须在页面加载时就获取它？"},
    {title:"再优化执行",desc:"真正耗时的函数、DOM 操作和计算在哪里？"},
    {title:"最后验证",desc:"FCP、LCP、INP、首次交互有没有整体改善？"}
  ] as item,i}
    <row align="start" gap={3}>
      <box background="surface-secondary" radius="lg" size="34px" align="center" justify="center">
        <text weight="medium">{i+1}</text>
      </box>
      <box flex="1" gap={1}>
        **{item.title}**
        <text color="secondary" size="sm">{item.desc}</text>
      </box>
    </row>
  {/each}
</box>

## 参考资料

- [JavaScript and stylesheet tags](https://shopify.dev/docs/storefronts/themes/best-practices/javascript-and-stylesheet-tags)
- [Defer render-blocking CSS and JavaScript](https://shopify.dev/docs/storefronts/themes/best-practices/performance/defer-non-critical-resources)
- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [Load JavaScript on user interaction](https://shopify.dev/docs/storefronts/themes/best-practices/performance/load-javascript-on-user-interaction)
- [Use defer and async on non-critical scripts](https://shopify.dev/docs/storefronts/themes/best-practices/performance/defer-scripts)
- [Load first-paint resources before content_for_header](https://shopify.dev/docs/storefronts/themes/best-practices/performance/load-critical-resources-before-content-for-header)
- [Sections](https://shopify.dev/docs/storefronts/themes/architecture/sections)
- [Stylesheet content subsetting](https://shopify.dev/docs/storefronts/themes/best-practices/performance/stylesheet-subsetting)
- [Best practices for building Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices)
- [Remove or optimize apps causing render-blocking issues](https://shopify.dev/docs/storefronts/themes/best-practices/performance/remove-render-blocking-apps)
- [Configure theme app extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration)
- [ScriptTag](https://shopify.dev/docs/api/admin-rest/latest/resources/scripttag)
- [Storefront performance](https://shopify.dev/docs/apps/build/performance/storefront)
- [Use theme app extensions instead of script tags (required)](https://shopify.dev/docs/apps/build/security/storefront/use-theme-app-extensions-instead-of-script-tags)
- [Migrate to theme app extensions](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/migrate)
- [scriptTags - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/2026-07/queries/scriptTags)
- [ScriptTag - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/unstable/objects/scripttag)
- [ScriptTag - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/2026-01/objects/ScriptTag)
- [ScriptTag - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/2026-10/objects/ScriptTag)
- [Integrate sections and blocks with the theme editor](https://shopify.dev/docs/storefronts/themes/best-practices/editor/integrate-sections-and-blocks)
- [Load JavaScript modules with import maps instead of bundlers](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-import-maps-for-modules)
- [The Shopify platform](https://shopify.dev/docs/storefronts/themes/best-practices/performance/platform)
- [The theme editor](https://shopify.dev/docs/storefronts/themes/tools/online-editor)
- [import() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
- [import defer - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/defer)
- [import defer - JavaScript | MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/import/defer)
- [Coverage: Find unused JavaScript and CSS | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/coverage?hl=en)
- [Remove unused JavaScript | Lighthouse | Chrome for Developers](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript?authuser=104)
- [What's New In DevTools (Chrome 59) | Blog | Chrome for Developers](https://developer.chrome.com/blog/new-in-devtools-59)
- [Performance features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance/reference)
- [Remove unused JavaScript | Lighthouse | Chrome for Developers](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript?authuser=889162768)
- [Reduce JavaScript execution time | Lighthouse | Chrome for Developers](https://developer.chrome.com/docs/lighthouse/performance/bootup-time?isappinstalled=0)
- [Tree Shaking | webpack](https://webpack.js.org/guides/tree-shaking/)
- [webpack](https://webpack.js.org/guides/tree-shaking)
- [Reduce JavaScript payloads with code splitting | Articles | web.dev](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting?authuser=53)
- [Reduce JavaScript payloads with code splitting | Articles | web.dev](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting?authuser=51)
- [{% stylesheet %} and {% javascript %} tags include all code from all instances, instead of what's actually used on the page - Online Store and Theme Development - Shopify Developer Community Forums](https://community.shopify.dev/t/stylesheet-and-javascript-tags-include-all-code-from-all-instances-instead-of-whats-actually-used-on-the-page/22481)
