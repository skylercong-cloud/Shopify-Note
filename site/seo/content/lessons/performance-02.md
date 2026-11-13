# 深入浏览器关键渲染路径：CSS、JavaScript、DOM 如何相互阻塞？


上一课了解了浏览器从收到 HTML 到页面显示的整体流程。

这一课，我们重点研究其中最复杂、也是前端开发者最容易优化的部分：

**Critical Rendering Path（关键渲染路径，简称 CRP）。**

这次我们会深入到浏览器的执行顺序，不仅要知道哪些资源会阻塞，还要知道它们为什么阻塞、相互之间有什么依赖，以及如何通过代码消除不必要的等待。

---

### 一、先理解最重要的三个“阻塞”

在理解 CSS 和 JavaScript 之前，必须先区分三个概念。

<box border radius="xl" padding={3} gap={3}>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="file-code" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **1. HTML 解析阻塞（Parser Blocking）**

      浏览器的主 HTML 解析器暂停工作，暂时不继续把后面的 HTML 转化为 DOM 节点。
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="monitor" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **2. 渲染阻塞（Render Blocking）**

      浏览器暂时无法将某些已经解析的页面内容绘制到屏幕上。
    </box>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="40px" align="center" justify="center">
      <icon name="code-2" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      **3. JavaScript 执行阻塞**

      某段 JS 必须等待其他资源或条件满足后才能执行，比如前面尚未加载完成的样式表。
    </box>
  </row>
</box>

这三件事不是同一回事。

例如，CSS 可以阻塞首次渲染，但通常不会停止 HTML 解析；而一个普通的同步 JavaScript 可能同时导致 HTML 解析暂停，并延迟页面显示。

#### 先看一张关系图

<box border radius="lg" padding={3} gap={2}>
  <svg viewBox="0 0 340 262" width="100%">
    <rect x="115" y="5" width="110" height="35" rx="7" fill="#64748b" fillOpacity=".16" stroke="#94a3b8"/>
    <text x="170" y="27" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="600">HTML 解析</text>
    <path d="M170 40 V58 M166 53 L170 58 L174 53" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.5" fill="none"/>
    <rect x="22" y="59" width="125" height="41" rx="7" fill="#3b82f6" fillOpacity=".12" stroke="#3b82f6"/>
    <rect x="193" y="59" width="125" height="41" rx="7" fill="#d97706" fillOpacity=".12" stroke="#d97706"/>
    <text x="84" y="76" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">遇到 CSS</text>
    <text x="84" y="91" textAnchor="middle" fontSize="10" fill="currentColor">下载并解析</text>
    <text x="255" y="76" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">遇到同步 JS</text>
    <text x="255" y="91" textAnchor="middle" fontSize="10" fill="currentColor">下载并执行</text>
    <path d="M170 43 H255 V59" stroke="currentColor" strokeOpacity=".38" strokeWidth="1.5" fill="none"/>
    <path d="M84 100 V137 M255 100 V137" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" fill="none"/>
    <rect x="5" y="138" width="158" height="54" rx="7" fill="#3b82f6" fillOpacity=".08" stroke="#3b82f6" strokeOpacity=".55"/>
    <rect x="177" y="138" width="158" height="54" rx="7" fill="#d97706" fillOpacity=".08" stroke="#d97706" strokeOpacity=".55"/>
    <text x="84" y="156" textAnchor="middle" fontSize="11" fill="currentColor" fontWeight="600">通常阻塞首次渲染</text>
    <text x="84" y="174" textAnchor="middle" fontSize="10" fill="currentColor">但继续解析 HTML</text>
    <text x="256" y="156" textAnchor="middle" fontSize="11" fill="currentColor" fontWeight="600">暂停 HTML 主解析器</text>
    <text x="256" y="174" textAnchor="middle" fontSize="10" fill="currentColor">可能延迟首次渲染</text>
    <path d="M84 193 V212 H256 V193" fill="none" stroke="#0d9488" strokeWidth="1.5" strokeDasharray="4 3"/>
    <rect x="64" y="215" width="212" height="38" rx="7" fill="#0d9488" fillOpacity=".1" stroke="#0d9488"/>
    <text x="170" y="230" textAnchor="middle" fontSize="11" fill="currentColor" fontWeight="600">CSS 还可能阻塞 JS 执行</text>
    <text x="170" y="244" textAnchor="middle" fontSize="9.5" fill="currentColor">当 JS 依赖已解析但未就绪的样式表</text>
  </svg>
</box>

这也是浏览器官方文档区分 parser-blocking 与 render-blocking 的关键。

接下来逐个研究。

---

## 二、CSS 为什么会阻塞渲染，却不阻塞 HTML 解析？

### 1. 一个最简单的例子

假设有一个页面：

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello World</h1>
  <p>这是页面内容</p>
</body>
</html>
```

其中 `style.css`：

```css
h1 {
  color: red;
  font-size: 32px;
}

p {
  color: blue;
}
```

假设这个 CSS 文件由于网络问题，需要 2 秒才能下载完成。

那么浏览器会做什么？

**第一步：遇到 CSS。**

```html
<link rel="stylesheet" href="style.css">
```

浏览器开始下载 `style.css`。

**第二步：继续解析 HTML。**

它继续读取：

```html
<h1>Hello World</h1>
<p>这是页面内容</p>
```

并构建对应的 DOM。

这是最关键的一点：

**普通外部 CSS 文件通常不会阻止浏览器继续构建 DOM。**

**第三步：等待 CSS 就绪后完成受影响内容的渲染。**

对于位于 `<head>`、适用于当前屏幕的普通样式表，浏览器通常会等其加载和处理完成，再进行首次内容绘制。

原因是浏览器还不知道这些元素最终应该是什么样子。

### 2. 用时间线观察

假设 HTML 下载很快，CSS 下载需要 2 秒。

<box border radius="lg" padding={3} gap={3}>
  <text weight="medium">场景 A：仅有一个阻塞渲染的 CSS</text>
  <svg viewBox="0 0 342 163" width="100%">
    <g fontSize="10" fill="currentColor" opacity=".7">
      <text x="91" y="14">0s</text>
      <text x="155" y="14">0.5s</text>
      <text x="234" y="14">1.5s</text>
      <text x="292" y="14">2s</text>
    </g>
    <line x1="94" y1="21" x2="330" y2="21" stroke="currentColor" strokeOpacity=".25"/>
    <g fill="currentColor" fontSize="10.5">
      <text x="6" y="49">HTML 解析</text>
      <text x="6" y="83">CSS 下载</text>
      <text x="6" y="117">首次渲染</text>
    </g>
    <rect x="95" y="35" width="42" height="21" rx="3" fill="#0d9488"/>
    <rect x="95" y="69" width="202" height="21" rx="3" fill="#3b82f6"/>
    <rect x="297" y="103" width="28" height="21" rx="3" fill="#d97706"/>
    <path d="M297 21 V130" stroke="currentColor" strokeOpacity=".4" strokeDasharray="4 3"/>
    <text x="137" y="142" fontSize="10" fill="currentColor">DOM 已构建完成，但 CSS 还在下载</text>
    <text x="121" y="50" fontSize="9" textAnchor="middle" fill="white">DOM</text>
    <text x="195" y="83" fontSize="10" textAnchor="middle" fill="white">CSS 请求进行中</text>
  </svg>
  <caption>示意时间线，不是实际浏览器测量；渲染是否开始还会受到样式计算与主线程任务等因素影响。</caption>
</box>

这里最容易误解的点在于：

`DOMContentLoaded` 和首次绘制可能出现在完全不同的时间。

单纯的 CSS 通常不直接阻塞 `DOMContentLoaded`，而首次渲染可能仍然等待 CSS。

---

### 3. CSS 为什么要阻塞渲染？

考虑一份 CSS：

```css
.title {
  color: red;
}
```

浏览器刚读取完这条规则，又发现后面还有：

```css
.title {
  display: none;
}
```

如果前面的 CSS 还没有全部处理完就绘制页面，最终可能需要立即推翻之前的呈现结果。

这会出现 FOUC（Flash of Unstyled Content，无样式内容闪烁）等问题。

所以，阻塞渲染并不一定是坏事。

**必要的关键 CSS 阻塞首次渲染，是浏览器保证页面视觉正确性的一种机制。**

需要优化的不是“所有 CSS 阻塞”，而是“不必要的 CSS 阻塞”。

#### 哪些 CSS 是真正关键的？

以商品详情页为例：

| CSS | 是否通常属于首屏关键样式 |
|---|---|
| Header 布局 | 是 |
| 商品主图布局 | 是 |
| 商品标题、价格 | 是 |
| 首屏购买按钮 | 是 |
| 页面底部 Footer | 通常不是 |
| 屏幕外评论列表 | 通常不是 |
| 弹窗打开后的复杂样式 | 视实现而定 |

注意：这些只是判断方向，具体取决于视口大小与页面结构。

---

## 三、JavaScript 为什么会阻塞 HTML 解析？

现在来看最经典的解析阻塞问题。

### 1. 先看代码

```html
<!DOCTYPE html>
<html>
<head>
  <script src="app.js"></script>
</head>

<body>
  <h1>商品标题</h1>
  <p>商品价格：¥199</p>
</body>
</html>
```

假设 `app.js` 需要 1 秒才能下载完成。

浏览器解析到：

```html
<script src="app.js"></script>
```

时，会暂停主 HTML 解析器，等待脚本下载并执行完成。

为什么必须停下来？

因为 JavaScript 不只是读取 DOM，它还可以修改正在解析的文档。

例如：

```js
document.write("<div>新内容</div>");
```

或者：

```js
document.body?.appendChild(
  document.createElement("div")
);
```

浏览器必须遵循脚本在文档中的执行语义，不能假设脚本对后续解析过程没有影响。

因此，普通同步脚本会导致解析器暂停。

### 2. 对比 CSS 的区别

| 行为 | 普通 head CSS | 普通同步 JS |
|---|---|---|
| 触发资源下载 | 是 | 是 |
| 通常阻塞 HTML 解析 | 否 | 是 |
| 可能延迟首次渲染 | 是 | 是 |
| 可能阻止后续 DOM 构建 | 通常不直接阻止 | 是 |
| 可能影响 `DOMContentLoaded` | 间接 | 直接 |

注意这里的“普通同步 JS”指没有 `async` 或 `defer` 的经典脚本；这个表也不包含特殊的 `blocking="render"` 等显式控制。

#### 同步 JS 的时间线

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">场景 B：HTML 头部存在同步 JavaScript</text>
  <svg viewBox="0 0 342 143" width="100%">
    <g fontSize="10.5" fill="currentColor">
      <text x="4" y="37">HTML 解析</text>
      <text x="4" y="72">JS 下载</text>
      <text x="4" y="107">JS 执行</text>
    </g>
    <rect x="94" y="22" width="39" height="21" rx="3" fill="#0d9488"/>
    <rect x="245" y="22" width="80" height="21" rx="3" fill="#0d9488"/>
    <rect x="133" y="57" width="75" height="21" rx="3" fill="#3b82f6"/>
    <rect x="208" y="92" width="37" height="21" rx="3" fill="#d97706"/>
    <rect x="133" y="22" width="112" height="21" rx="3" fill="#e07a5f" fillOpacity=".12" stroke="#e07a5f" strokeDasharray="3 3"/>
    <text x="189" y="35" fontSize="10" textAnchor="middle" fill="currentColor">解析暂停</text>
    <g fontSize="9" fill="white">
      <text x="170" y="71" textAnchor="middle">下载</text>
      <text x="226" y="106" textAnchor="middle">执行</text>
    </g>
    <text x="170" y="132" textAnchor="middle" fontSize="10" fill="currentColor" opacity=".7">时间向右 →</text>
  </svg>
</box>

注意一个细节：

HTML 解析器暂停，不代表浏览器网络层全部暂停。

浏览器的预加载扫描器仍可能提前发现 HTML 中某些可静态识别的资源，并启动下载。

这能缓解解析阻塞造成的资源发现延迟，但不能消除同步 JavaScript 的阻塞语义。

---

## 四、最关键的知识点：CSS 竟然还能阻塞 JavaScript 执行

如果你只记住 CSS 阻塞渲染、JS 阻塞 HTML 解析，实际上还没有完全理解关键渲染路径。

真正复杂的是：

**CSS、JavaScript 和 DOM 之间会形成依赖链。**

来看下面的例子。

### 1. 同时引入 CSS 和 JS

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">

  <script src="app.js"></script>
</head>

<body>
  <h1>商品详情</h1>
</body>
</html>
```

假设：

- `style.css` 下载需要 2 秒。
- `app.js` 下载需要 500ms。
- `app.js` 执行需要 50ms。

现在请思考：

**JavaScript 下载只需要 500ms，它会在 500ms 后立即执行吗？**

答案是：通常不会。

因为它前面有一个尚未加载完成、会阻塞脚本执行的 CSS 样式表。

### 2. 为什么 JavaScript 要等待 CSS？

原因是 JS 可以读取依赖 CSS 的计算结果。

例如：

```js
const title = document.querySelector("h1");

console.log(getComputedStyle(title).color);
```

如果 CSS 尚未加载完成，浏览器无法按照正确的样式表状态给出预期结果。

所以，对于一个位于尚未就绪的阻塞脚本样式表之后的普通同步脚本，浏览器需要等待相关样式表完成后再执行脚本。

与此同时，HTML 解析器又在等待这个同步 JS 执行完成。

依赖关系因此变成：

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 248" width="100%">
    <rect x="12" y="5" width="145" height="43" rx="7" fill="#3b82f6" fillOpacity=".12" stroke="#3b82f6"/>
    <rect x="183" y="5" width="145" height="43" rx="7" fill="#64748b" fillOpacity=".12" stroke="#94a3b8"/>
    <text x="84" y="22" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">CSS 下载 + 解析</text>
    <text x="84" y="38" textAnchor="middle" fontSize="10" fill="currentColor">需要 2 秒</text>
    <text x="255" y="22" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">JS 下载</text>
    <text x="255" y="38" textAnchor="middle" fontSize="10" fill="currentColor">需要 0.5 秒</text>
    <path d="M84 48 V74 H170 V92 M255 48 V74 H170" stroke="currentColor" strokeOpacity=".48" fill="none" strokeWidth="1.5"/>
    <rect x="83" y="92" width="174" height="43" rx="7" fill="#d97706" fillOpacity=".12" stroke="#d97706"/>
    <text x="170" y="109" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">JS 可以执行</text>
    <text x="170" y="125" textAnchor="middle" fontSize="10" fill="currentColor">必须满足两个前置条件</text>
    <path d="M170 135 V159" stroke="currentColor" strokeOpacity=".48" strokeWidth="1.5"/>
    <rect x="83" y="159" width="174" height="38" rx="7" fill="#0d9488" fillOpacity=".12" stroke="#0d9488"/>
    <text x="170" y="182" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">HTML 解析继续</text>
    <path d="M170 197 V215" stroke="currentColor" strokeOpacity=".48" strokeWidth="1.5"/>
    <text x="170" y="235" textAnchor="middle" fontSize="11" fill="currentColor">随后完成 DOM 与相关渲染工作</text>
  </svg>
  <caption>此图描述的是样式表位于同步脚本之前，且会阻塞该脚本执行的情况。CSS 与 JS 的下载本身可以并行。</caption>
</box>

### 3. 看具体时间线

<box border radius="lg" padding={3} gap={2}>
  <table>
    <table-row><table-cell width="24%"><text weight="medium">时间</text></table-cell><table-cell><text weight="medium">发生的事情</text></table-cell></table-row>
    <table-row><table-cell>0ms</table-cell><table-cell>浏览器开始下载 CSS、JS</table-cell></table-row>
    <table-row><table-cell>500ms</table-cell><table-cell>JS 下载完成，但 CSS 仍未就绪</table-cell></table-row>
    <table-row><table-cell>2000ms</table-cell><table-cell>CSS 下载、解析完成，JS 可以开始执行</table-cell></table-row>
    <table-row><table-cell>2050ms</table-cell><table-cell>JS 执行完成，HTML 解析继续</table-cell></table-row>
    <table-row><table-cell>之后</table-cell><table-cell>构建后续 DOM，安排页面渲染</table-cell></table-row>
  </table>
  <caption>为了理解依赖关系而简化的假设。实际资源解析、网络调度和浏览器任务安排还会产生额外耗时。</caption>
</box>

这样你应该发现了一个关键事实：

虽然 JS 只下载了 500ms，但它实际上等待了大约 2 秒才开始执行。

更重要的是，**因为 HTML 在等待 JS，CSS 的延迟还间接导致了 HTML 解析延迟。**

这是一条典型的关键路径：

```text
CSS 未就绪
    ↓
同步 JavaScript 等待 CSS
    ↓
HTML 解析器等待 JavaScript
    ↓
后续 DOM 无法及时构建
    ↓
首次内容显示被推迟
```

MDN 对 `DOMContentLoaded` 的说明也专门提到这一点：同步脚本会等待已经解析到的相关样式表，延迟脚本也可能受到样式表的间接影响。

#### 这里再深入思考一个问题

把代码改成：

```html
<head>
  <script src="app.js"></script>

  <link rel="stylesheet" href="style.css">
</head>
```

这时 JS 执行是否还会等待后面的 CSS？

通常不需要等待尚未被主解析器处理为脚本阻塞依赖的后续样式表。

但这不代表调整顺序就是最佳优化方案，因为同步脚本依然阻塞 HTML 解析，并且 CSS 可能被更晚发现，首次渲染仍然会等待关键样式。

所以，**调整 CSS 和 JS 的先后位置，不一定能解决根本问题。真正需要优化的是不必要的同步依赖。**

---

## 五、defer 和 async 究竟解决了什么问题？

前面看到，一个同步脚本可能产生两层等待：

1. HTML 解析器要等它执行完。
2. 它自己还可能等待前面的 CSS 加载完成。

这时候 `defer` 和 `async` 就非常重要了。

### 1. 普通 script

```html
<script src="app.js"></script>
```

浏览器的行为：

```text
开始解析 HTML
      ↓
遇到 script
      ↓
暂停 HTML 解析
      ↓
下载并执行 JS
      ↓
继续解析 HTML
```

如果脚本放在 `<head>`，可能推迟整个页面主体 DOM 的构建。

### 2. defer

```html
<script src="app.js" defer></script>
```

浏览器行为变成：

```text
             ┌── 下载 app.js ──┐
             │                 │
解析 HTML ───┴─────────────────┴── 解析完成
                                    ↓
                             执行 defer 脚本
                                    ↓
                             DOMContentLoaded
```

这就解决了一个重要问题：

**JS 下载不再迫使 HTML 解析器停止工作。**

并且，普通外部 `defer` 脚本会在 HTML 解析完成后执行，按照文档中出现的顺序执行。

例如：

```html
<script src="vendor.js" defer></script>
<script src="product.js" defer></script>
<script src="cart.js" defer></script>
```

即使 `cart.js` 下载完成得比 `vendor.js` 早，三个普通 defer 脚本的执行顺序仍按文档顺序排列。

因此，当代码存在明确的初始化依赖时，`defer` 通常是适合的选择。

但请注意两个细节：

- `defer` 脚本仍可能等待相关样式表完成加载。
- `defer` 脚本执行完后才会触发 `DOMContentLoaded`，但浏览器不一定要等 `DOMContentLoaded` 才能进行首次绘制。

### 3. async

```html
<script src="analytics.js" async></script>
```

`async` 也允许 JS 下载与 HTML 解析并行，但执行时机不同。

它通常在下载完成后尽快执行，不等待整个 HTML 解析完成。

```text
HTML 解析 ─────────┐   ┌───────── 继续解析
                   │   │
JS 下载 ───────────┘   │
                       │
                    JS 执行
```

因此，`async` 可以在脚本执行期间中断 HTML 解析，也可能占用主线程，推迟渲染。

更重要的是，多个 `async` 脚本之间没有文档顺序执行保证。

例如：

```html
<script src="a.js" async></script>
<script src="b.js" async></script>
```

如果 `b.js` 先下载完成，它就可能先执行。

所以独立的分析脚本适合使用 `async`，但有顺序依赖的脚本需要特别谨慎。

### 4. 四种脚本方式完整对比

| 脚本方式 | 下载可与 HTML 解析并行 | 执行时机 | 执行顺序 |
|---|---|---|---|
| 普通 classic script | 可以借助浏览器预扫描提前获取，但解析器会等待 | 遇到标签时 | 按解析顺序 |
| `defer` | 是 | HTML 解析完成后 | 按文档顺序 |
| `async` | 是 | 下载完成后尽快执行 | 不保证 |
| `type="module"` | 是 | 默认具有 defer 类似行为 | 受模块依赖及执行语义约束 |

补充两个细节：`defer` 对没有 `src` 的普通内联脚本无效；模块脚本默认就具有延后执行的行为，不需要再添加 `defer`。

### 5. 实际代码：为什么选择 defer？

假设我们在商品页面初始化购买按钮：

`product.js`：

```js
const button = document.querySelector("#buy-button");

button.addEventListener("click", () => {
  console.log("加入购物车");
});
```

如果在 `<head>` 中同步加载：

```html
<head>
  <script src="product.js"></script>
</head>

<body>
  <button id="buy-button">
    加入购物车
  </button>
</body>
```

那么 `product.js` 执行时，后面的按钮还未被 HTML 解析器创建。

`button` 可能是 `null`，接下来调用 `addEventListener` 就会报错。

改成：

```html
<head>
  <script src="product.js" defer></script>
</head>
```

脚本在 HTML 解析完成后执行，按钮就已经存在。

如果改成 `async` 呢？

不能保证正确，因为 JS 可能在按钮 DOM 创建之前就执行。

因此对于许多 Shopify Theme 的交互脚本，`defer` 比 `async` 更容易管理。

Shopify 官方的 Theme 性能指南也推荐使用 `defer` 处理需要依赖顺序的 Theme 脚本，`async` 主要适用于互不依赖的脚本。

---

## 六、为什么 DOMContentLoaded 不等于页面显示完成？

现在我们再进一步。

前面讨论的是 HTML 解析和脚本执行，但实际页面还需要浏览器安排绘制。

这里有三个重要时间点：

**HTML 解析完成、DOMContentLoaded、首次绘制。**

它们不是同一个东西。

### 1. 第一种情况：只有 CSS

```html
<head>
  <link rel="stylesheet" href="slow.css">
</head>

<body>
  <h1>Hello</h1>
</body>
```

假设 HTML 很快解析完成，但 CSS 还需要较长时间才能加载完成。

可能出现：

```text
0ms       开始加载
100ms     HTML 解析完成
110ms     DOMContentLoaded
2000ms    CSS 完成
之后       FCP
```

这个例子说明：`DOMContentLoaded` 可以早于 FCP。

### 2. 第二种情况：CSS + defer JS

```html
<head>
  <link rel="stylesheet" href="slow.css">
  <script src="app.js" defer></script>
</head>
```

假设 HTML 已解析完成，`app.js` 已下载，但 CSS 尚未就绪。

defer 脚本可能需要等待相关 CSS。

而 `DOMContentLoaded` 又需要等待 defer 脚本完成。

这时就形成了：

```text
CSS 加载完成
      ↓
defer JS 执行完成
      ↓
DOMContentLoaded
```

因此 CSS 虽然通常不直接阻塞 `DOMContentLoaded`，却能够**通过阻塞 JS 执行，间接推迟这个事件**。

这就是为什么我们不能简单记成：

“CSS 不影响 DOMContentLoaded。”

更准确的说法是：

**DOMContentLoaded 不直接等待所有 CSS，但可能通过脚本执行依赖而受到 CSS 的影响。**

---

## 七、关键渲染路径中，还有一个隐藏角色：预加载扫描器

你可能会产生一个疑问。

假设 HTML 解析器被 JS 阻塞，那么后面的图片、CSS 是不是都不能下载？

不完全是。

现代浏览器通常有一个机制，叫做 **Preload Scanner（预加载扫描器）**。

它会扫描已经收到的 HTML，尝试提前发现资源。

### 1. 例如

```html
<head>
  <script src="heavy.js"></script>
</head>

<body>
  <img src="hero.webp">
</body>
```

主 HTML 解析器遇到同步 JS 时，需要等待它执行完。

但浏览器的预加载扫描器可能提前找到：

```html
<img src="hero.webp">
```

然后开始下载图片。

不过前提是，对应的 HTML 字节已经到达浏览器，并且资源引用能够被静态识别。

### 2. 为什么 JS 动态创建的图片可能更慢？

比较以下两种方式：

<text weight="medium">方式 A：直接写在 HTML 中</text>

```html
<img src="product.webp" alt="商品">
```

浏览器可以较早发现图片请求。

<text weight="medium">方式 B：通过 JS 创建图片</text>

```html
<div id="product-image"></div>

<script src="product.js" defer></script>
```

`product.js`：

```js
const img = document.createElement("img");

img.src = "product.webp";

document.querySelector("#product-image").append(img);
```

第二种方式必须先下载、解析并执行 `product.js`，才能发现图片地址。

它增加了新的资源发现依赖：

```text
下载 JS
   ↓
解析并执行 JS
   ↓
创建 img 元素
   ↓
发现图片 URL
   ↓
请求图片
```

对于首屏商品主图来说，这可能严重推迟 LCP。

### 3. CSS 背景图也存在同样的问题

例如：

```html
<div class="hero"></div>
```

```css
.hero {
  background-image: url("banner.webp");
}
```

预加载扫描器不能直接从 HTML 中发现 CSS 文件内部的 `background-image`。

这可能形成：

```text
HTML
  ↓
发现并下载 CSS
  ↓
解析 CSS、匹配样式
  ↓
发现背景图片
  ↓
下载图片
```

如果背景图是 LCP 元素，就要特别关注它被发现的时间。

对于必须使用 CSS 背景图的场景，可以考虑有针对性地预加载：

```html
<link
  rel="preload"
  as="image"
  href="banner.webp"
  fetchpriority="high"
>
```

但预加载不应该滥用，因为过多的高优先级请求会相互竞争网络资源。Google 的 LCP 优化指南专门强调了这一问题。

---

## 八、另一种阻塞：JS 已经执行，页面却还没更新

前面说的 CSS、JS 阻塞主要发生在资源加载和 DOM 构建阶段。

但还有一种非常重要的情况：

**资源都已经加载好了，JavaScript 却把浏览器主线程占满了。**

例如：

```js
const box = document.querySelector(".box");

box.style.width = "300px";

const start = performance.now();

while (performance.now() - start < 500) {
  // 模拟同步计算
}
```

浏览器并不会因为你执行了：

```js
box.style.width = "300px";
```

就必须立即把新的宽度绘制到屏幕上。

很多 DOM 和样式更新会先标记相应的渲染工作为待处理状态。

浏览器随后寻找合适的渲染机会，再进行样式计算、布局、绘制或合成。

但如果 JS 长时间执行，主线程不能及时处理这些工作，更新就可能被延迟。

这里我们可以把阻塞进一步分成两个层次。

| 层次 | 典型问题 | 主要影响 |
|---|---|---|
| 资源与解析阶段 | CSS、同步 JS、脚本依赖 | 页面何时开始显示 |
| 运行与渲染阶段 | JS 长任务、复杂 DOM、强制布局 | 页面显示和交互是否流畅 |

这两个层次也会相互影响：如果页面加载期间执行大量 JS，哪怕 HTML 和 CSS 都已经准备好，首次绘制仍可能被推迟。

### 强制同步布局：一个高级但常见的问题

来看下面这段代码：

```js
const boxes = document.querySelectorAll(".box");

boxes.forEach((box) => {
  box.style.width = "200px";

  console.log(box.offsetWidth);
});
```

写入 `width` 之后立即读取布局属性，可能导致浏览器为了返回准确的尺寸而提前计算布局。

如果一千个元素反复执行这种读写交替，可能产生大量不必要的布局计算。

可以考虑把读取和写入分批组织。

```js
const boxes = [...document.querySelectorAll(".box")];

// 批量读取
const widths = boxes.map((box) => box.offsetWidth);

// 批量写入
boxes.forEach((box, index) => {
  box.style.width = `${widths[index] + 20}px`;
});
```

这样更容易避免交替读取、修改导致的布局抖动。

但也要明白，批量读写不意味着浏览器一定只布局一次；还要考虑 CSS、DOM 关系以及其他代码是否让布局失效。

---

## 九、结合 Shopify Theme，看一次完整的性能优化

现在回到你比较熟悉的 Shopify 开发场景。

假设我们有这样一个 `theme.liquid`：

```liquid
<!DOCTYPE html>
<html lang="{{ request.locale.iso_code }}">
<head>
  {{ 'base.css' | asset_url | stylesheet_tag }}

  <script src="{{ 'vendor.js' | asset_url }}"></script>
  <script src="{{ 'theme.js' | asset_url }}"></script>
  <script src="{{ 'product.js' | asset_url }}"></script>

  {{ content_for_header }}
</head>

<body>
  {{ content_for_layout }}
</body>
</html>
```

先不考虑各脚本具体做了什么，我们分析浏览器可能遇到的问题。

### 1. 分析原来的依赖关系

```text
下载 base.css ─────────────────┐
                              ↓
下载 vendor.js ───────→ 等待 CSS → 执行
                              ↓
                        HTML 解析继续
                              ↓
下载 theme.js ─────────→ 执行
                              ↓
下载 product.js ───────→ 执行
                              ↓
                    继续解析页面主体
                              ↓
                  商品标题、主图等 DOM
                              ↓
                         页面显示
```

真实浏览器会提前发现并并行下载一些资源，因此这不是严格的请求瀑布图。

但是同步脚本造成的解析和执行依赖确实存在。

如果 `vendor.js` 很大，或者某个第三方脚本执行时间很长，商品页面的 DOM 就可能被延迟创建。

### 2. 第一轮优化：使用 defer

```liquid
<head>
  {{ 'base.css' | asset_url | stylesheet_tag }}

  <script
    src="{{ 'vendor.js' | asset_url }}"
    defer
  ></script>

  <script
    src="{{ 'theme.js' | asset_url }}"
    defer
  ></script>

  <script
    src="{{ 'product.js' | asset_url }}"
    defer
  ></script>

  {{ content_for_header }}
</head>
```

前提是脚本本身不依赖必须在 HTML 解析过程中同步执行的行为，且彼此依赖关系适合 defer 的执行顺序。

这样做带来几个好处：

首先，浏览器可以继续解析 HTML，不需要为了下载这些脚本而暂停主解析器。

其次，JS 资源可以与页面解析并行下载。

最后，`vendor.js`、`theme.js` 和 `product.js` 仍然可以按照它们在文档中出现的顺序执行。

Shopify 文档还特别说明：Liquid 的 `script_tag` 过滤器并不提供 `defer` 参数，因此需要手动编写带 `defer` 属性的 `<script>` 标签。

### 3. 第二轮优化：不要让 JS 负责生成所有首屏内容

再假设我们的商品标题是通过 JS 请求数据后生成的。

```html
<div id="product-title"></div>
```

```js
fetch("/api/product")
  .then((res) => res.json())
  .then((product) => {
    document.querySelector("#product-title").textContent =
      product.title;
  });
```

这就需要等待 JS 下载、执行、发起请求、获取数据，最后才能渲染标题。

对于 Shopify 商品页的核心内容，更好的方式通常是直接使用 Liquid：

```liquid
<h1>{{ product.title }}</h1>
```

这样浏览器在收到相关 HTML 后，就能够直接构建标题 DOM，不需要再等待额外的客户端请求。

这个思想非常重要：

**优先使用服务端输出的 HTML 承载首屏关键内容，再通过 JavaScript 增强交互。**

这就是渐进增强（Progressive Enhancement）在电商 Theme 中的重要价值。

### 4. 第三轮优化：正确处理首屏图片

例如：

```liquid
{{
  product.featured_image
  | image_url: width: 1000
  | image_tag:
    loading: 'eager',
    fetchpriority: 'high'
}}
```

如果这张图片确定是 LCP 候选元素，以上策略可以让浏览器更积极地获取它。

但不要把所有图片都设置成高优先级，否则高优先级之间也会发生资源竞争。

### 5. 第四轮优化：审查 Shopify 平台资源

Shopify 还有两个值得注意的特点。

首先，`{{ content_for_header }}` 会输出平台管理的必要资源，你不能简单地对其整体添加 `defer` 或随意删除。

其次，Shopify 可能流式返回 HTML。官方文档建议，在依赖关系允许的前提下，把首屏需要尽早发现的关键 CSS 等资源放在适当位置，让浏览器尽早请求，而不是等后续页面 Section 完成服务端渲染。

另外，Shopify 的 `{% javascript %}` 和 `{% stylesheet %}` 标签还有平台自己的资源收集与加载机制，并非你在文件里写的每段 JS 都直接变成当前位置的普通同步脚本。

因此，Shopify 性能优化需要同时理解浏览器机制和 Shopify 的资源生成机制。

---

## 十、亲手验证：一个浏览器阻塞实验

以下实验可以在本地验证资源阻塞行为。

准备三个文件：

<text weight="medium">index.html</text>

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">

  <link rel="stylesheet" href="./style.css">

  <script src="./app.js"></script>
</head>

<body>
  <h1 id="title">商品详情</h1>
  <button id="buy">加入购物车</button>
</body>
</html>
```

<text weight="medium">style.css</text>

```css
body {
  font-family: sans-serif;
}

h1 {
  color: blue;
}

button {
  padding: 12px 24px;
}
```

<text weight="medium">app.js</text>

```js
console.log("JS 开始执行:", performance.now());

const title = document.querySelector("#title");

console.log("能否找到 title:", Boolean(title));

console.log("JS 执行结束:", performance.now());
```

用本地 HTTP 服务器打开页面，然后进行三次实验。

{@body const [exp,setExp]=DIL.useState("normal")}
{@body const experimentData = {
normal:{tag:'<script src="./app.js"></script>',html:'在 head 中遇到同步脚本后暂停解析，下载和执行结束才继续构建 body。',result:'通常打印 false，因为 title 节点尚未创建。',order:'HTML 部分解析 → JS 下载执行 → HTML 继续解析 → DOMContentLoaded'},
defer:{tag:'<script src="./app.js" defer></script>',html:'脚本下载与 HTML 解析可以并行；DOM 构建完成后再执行脚本。',result:'打印 true，因为执行时 title 节点已经存在。',order:'HTML 解析与 JS 下载并行 → JS 执行 → DOMContentLoaded'},
async:{tag:'<script src="./app.js" async></script>',html:'脚本下载可以并行，下载就绪后尽快执行，可能打断 HTML 解析。',result:'不保证 true 或 false，取决于脚本执行时 DOM 是否已经包含 title。',order:'HTML 解析与 JS 下载并行 → JS 就绪后执行（时机不确定）'}
}}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">交互实验：切换脚本加载方式</text>
  <segmented-control block size="lg" value={exp} onChange={setExp} options={[{"label":"普通 script","value":"normal"},{"label":"defer","value":"defer"},{"label":"async","value":"async"}]}/>
  <box background="surface-secondary" radius="md" padding={3}>
    <text size="sm" weight="medium">{experimentData[exp].tag}</text>
  </box>
  <box gap={1}>
    **浏览器行为**

    {experimentData[exp].html}
  </box>
  <box gap={1}>
    **控制台的预期结果**

    {experimentData[exp].result}
  </box>
  <box gap={1}>
    **关键执行顺序**

    <text color="secondary" size="sm">{experimentData[exp].order}</text>
  </box>
  <button block variant="outline" onClick={()=>GenUI.copy(experimentData[exp].tag)}>
    <icon name="copy" size="sm"/> 复制当前 script 标签
  </button>
</box>

接下来再做一次更深入的实验：通过 Chrome DevTools 的 Network Throttling 模拟慢速网络，让 `style.css` 加载变慢。

观察普通同步脚本是否要等待 CSS 就绪，以及改成 `defer` 之后，HTML 解析和 JS 执行顺序如何变化。

这比死记硬背定义有效得多。

---

## 十一、如何通过 Chrome DevTools 找到真实阻塞链？

可按以下顺序检查 Shopify 商品页。

<box gap={3}>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="36px" align="center" justify="center">
      <text weight="medium">1</text>
    </box>
    <box flex="1" gap={1}>
      **Network 面板：检查资源什么时候开始下载**

      重点查看主 HTML、CSS、JS 和商品主图。观察它们的起始时间、完成时间、Initiator（发起者）和 Priority（优先级）。
    </box>
  </row>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="36px" align="center" justify="center">
      <text weight="medium">2</text>
    </box>
    <box flex="1" gap={1}>
      **Performance 面板：检查解析和主线程活动**

      点击录制并刷新页面，查看 Main 轨道中的 HTML 解析、Evaluate Script、Recalculate Style、Layout、Paint 等任务。
    </box>
  </row>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="36px" align="center" justify="center">
      <text weight="medium">3</text>
    </box>
    <box flex="1" gap={1}>
      **Insights：检查 Render blocking requests**

      查看浏览器识别出的阻塞渲染资源，判断它们是否真正属于首屏关键依赖。
    </box>
  </row>
  <row align="start" gap={3}>
    <box background="surface-secondary" radius="lg" size="36px" align="center" justify="center">
      <text weight="medium">4</text>
    </box>
    <box flex="1" gap={1}>
      **对照 FCP 和 LCP**

      如果 CSS 很早下载完成，但 FCP 很晚，继续排查 JS 长任务和渲染工作。如果 FCP 正常而 LCP 很晚，就进一步检查最大图片的发现、下载和渲染链路。
    </box>
  </row>
</box>

Chrome Performance 面板可以显示资源的阻塞状态、请求优先级和发起关系，这比仅仅查看文件大小更有诊断价值。

再给你一段方便在控制台使用的代码：

```js
const nav = performance.getEntriesByType("navigation")[0];

console.table({
  DOMContentLoaded:
    nav.domContentLoadedEventEnd - nav.startTime,

  Load:
    nav.loadEventEnd - nav.startTime,
});

console.table(
  performance.getEntriesByType("paint").map((entry) => ({
    name: entry.name,
    time: entry.startTime.toFixed(2) + "ms",
  }))
);
```

对比 DOMContentLoaded、FCP 和 `load`，你就能观察它们并不一定同步发生。

不过这些时间戳只能告诉你结果。要定位具体阻塞链，仍然需要 Performance 时间线。

---

## 十二、本课知识总结

今天我们解决了一个核心问题：

**DOM、CSS、JS 和渲染不是简单的串行步骤，而是一组相互依赖、又可以部分并行的任务。**

| 问题 | 正确理解 |
|---|---|
| CSS 会阻塞 DOM 解析吗？ | 普通 CSS 通常不会直接阻塞 |
| CSS 会阻塞首次渲染吗？ | head 中适用的普通样式表通常会 |
| CSS 会阻塞 JS 吗？ | 会，某些后续脚本必须等待已解析的相关样式表 |
| 普通同步 JS 会阻塞 HTML 解析吗？ | 会 |
| defer 能消除 JS 的全部阻塞吗？ | 不能，只是避免在下载期间阻塞 HTML 解析，并改变执行时机 |
| async 一定比 defer 快吗？ | 不一定，执行时机不可预测，还可能中断解析 |
| DOMContentLoaded 代表页面已经显示了吗？ | 不代表 |
| JS 执行完成是否意味着页面立即更新？ | 不意味着，仍要经过必要的渲染流程 |

从性能优化角度来看，有三条非常重要的原则：

**第一，尽早发现关键资源。** 页面首屏依赖的 HTML、CSS 和图片应该尽可能早被浏览器发现。

**第二，消除不必要的同步依赖。** 尤其是同步 JS 对 HTML 解析的阻塞，以及非关键 CSS 对首次渲染的阻塞。

**第三，减少关键路径上的工作量。** 即使资源已经下载完成，JS 执行、样式计算和布局仍然需要时间。

## 参考资料

- [Understand the critical path | web.dev](https://web.dev/learn/performance/understanding-the-critical-path)
- [Understand the critical path | web.dev](https://web.dev/learn/performance/understanding-the-critical-path?hl=en)
- [Don't fight the browser preload scanner | Articles | web.dev](https://web.dev/articles/preload-scanner)
- [PageSpeed Rules and Recommendations | Articles | web.dev](https://web.dev/articles/critical-rendering-path/page-speed-rules-and-recommendations?hl=en)
- [Optimize resource loading | web.dev](https://web.dev/learn/performance/optimize-resource-loading)
- [Assist the browser with resource hints | web.dev](https://web.dev/learn/performance/resource-hints?authuser=0000)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp)
- [Optimize resource loading with the Fetch Priority API | Articles | web.dev](https://web.dev/articles/fetch-priority)
- [Optimize Largest Contentful Paint | Articles | web.dev](https://web.dev/articles/optimize-lcp?authuser=115)
- [Don't fight the browser preload scanner | Articles | web.dev](https://web.dev/articles/preload-scanner?authuser=23)
- [Optimize resource loading | web.dev](https://web.dev/learn/performance/optimize-resource-loading?hl=en)
- [Don't fight the browser preload scanner | Articles | web.dev](https://web.dev/articles/preload-scanner?authuser=371)
- [Critical rendering path - Performance | MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path)
- [Populating the page: how browsers work - Performance | MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)
- [Document: DOMContentLoaded event - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)
- [JavaScript performance optimization - Learn web development | MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/JavaScript)
- [<script> HTML script element - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script)
- [web.dev/src/site/content/en/blog/critical-rendering-path-analyzing-crp/index.md at main · GoogleChrome/web.dev · GitHub](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/blog/critical-rendering-path-analyzing-crp/index.md)
- [content/files/en-us/web/api/document/domcontentloaded_event/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/api/document/domcontentloaded_event/index.md?plain=1)
- [content/files/en-us/learn_web_development/extensions/performance/javascript/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/learn_web_development/extensions/performance/javascript/index.md?plain=1)
- [content/files/en-us/web/html/reference/elements/script/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/html/reference/elements/script/index.md?plain=1)
- [Populating the page: how browsers work - Web Performance | MDN](https://ptacts.uspto.gov/ptacts/public-informations/petitions/1548238/download-documents?artifactId=3sunBXd81DOrU-JwODjqykXa-kBLttqIyylQXdaazkuF-3ieyHlXDDM)
- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [Defer render-blocking CSS and JavaScript](https://shopify.dev/docs/storefronts/themes/best-practices/performance/defer-non-critical-resources)
- [Use defer and async on non-critical scripts](https://shopify.dev/docs/storefronts/themes/best-practices/performance/defer-scripts)
- [General best practices for app performance](https://shopify.dev/docs/apps/build/performance/general-best-practices)
- [ParserBlockingScript](https://shopify.dev/docs/storefronts/themes/tools/theme-check/checks/parser-blocking-javascript)
- [Remove or optimize apps causing render-blocking issues](https://shopify.dev/docs/storefronts/themes/best-practices/performance/remove-render-blocking-apps)
- [Debugging performance with metric gaps](https://shopify.dev/docs/storefronts/themes/best-practices/performance/performance-gaps)
- [JavaScript and stylesheet tags](https://shopify.dev/docs/storefronts/themes/best-practices/javascript-and-stylesheet-tags)
- [The Shopify platform](https://shopify.dev/docs/storefronts/themes/best-practices/performance/platform)
- [Performance insights: Get actionable insights on your website's performance | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance-insights?hl=en)
- [Render-blocking requests | Performance insights | Chrome for Developers](https://developer.chrome.com/docs/performance/insights/render-blocking?authuser=921975487)
- [Performance features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance/reference/)
- [Insights sidebar in the DevTools Performance panel | Blog | Chrome for Developers](https://developer.chrome.com/blog/devtools-insights-sidebar?authuser=23)
- [Performance features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance/reference)
- [Performance | Chrome for Developers](https://developer.chrome.com/docs/performance/insights?authuser=2&hl=en)
- [Performance insights: Get actionable insights on your website's performance | Chrome DevTools | Chrome for Developers](https://developer.chrome.google.cn/docs/devtools/performance-insights?hl=en)
