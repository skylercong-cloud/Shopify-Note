# 浏览器渲染流水线与 JavaScript 性能优化


**本课重点：Reflow、Repaint、Composite、强制同步布局、requestAnimationFrame、主线程与 INP。**

上一课，我们解决了一个问题：

> 为什么 CSS 和 JavaScript 会影响 HTML 的解析和首次渲染？

今天我们要研究另一个更深入的问题：

**当 DOM 已经构建完成、CSS 也已经加载，JavaScript 修改了页面后，浏览器究竟如何把这些变化显示到屏幕上？**

这是理解页面卡顿、动画掉帧、滚动不流畅、交互延迟的基础。

本课结束后，你应该能够解释：

1. 为什么修改 `width` 通常比修改 `transform` 更昂贵？
2. 为什么连续修改 100 次 DOM，不一定触发 100 次重排？
3. 为什么读取 `offsetWidth` 可能让浏览器立即执行 Layout？
4. 为什么 `requestAnimationFrame` 不一定能解决卡顿？
5. 为什么 Shopify 的 Cart Drawer、商品变体切换经常出现性能问题？

---

## 一、首先理解浏览器的渲染流水线

现代浏览器将页面内容显示到屏幕上，需要经过一系列处理。

我们先使用一个简化模型：

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 348" width="100%">
    {#each [
      {y:4,t:"JavaScript / CSS 变化",s:"修改 DOM、class、style 或动画状态",c:"#64748b"},
      {y:72,t:"Style",s:"重新计算受影响元素的样式",c:"#3b82f6"},
      {y:140,t:"Layout",s:"计算元素的宽、高与几何位置",c:"#d97706"},
      {y:208,t:"Paint",s:"生成绘制操作并栅格化内容",c:"#0d9488"},
      {y:276,t:"Composite",s:"把合成层组织成最终画面",c:"#8b5cf6"}
    ] as item,i}
      <rect x="23" y={item.y} width="294" height="52" rx="9" stroke={item.c} strokeOpacity=".5" fill={item.c} fillOpacity=".09"/>
      <text x="170" y={item.y+21} fontSize="13" fontWeight="600" textAnchor="middle" fill="currentColor">{item.t}</text>
      <text x="170" y={item.y+39} fontSize="10.5" textAnchor="middle" fill="currentColor" opacity=".65">{item.s}</text>
      {#if i<4}
        <path d={`M170 ${item.y+52} v 13 m -4 -4 l 4 4 4 -4`} stroke="currentColor" strokeOpacity=".5" strokeWidth="1.5" fill="none"/>
      {/if}
    {/each}
  </svg>
  <caption>这是帮助理解的简化像素流水线。真实浏览器还有样式失效追踪、显示列表、栅格化线程和 GPU 等细节，并不意味着每次更新都执行全部阶段。</caption>
</box>

我们先理解几个概念的关系：

- **Style**：元素应该采用什么样式？
- **Layout（Reflow）**：元素有多大、放在哪里？
- **Paint（Repaint）**：元素的内容如何绘制？
- **Composite**：不同层的画面如何组合？

这里最重要的不是背诵这些名称，而是知道：

**不同 CSS 属性的变化，会让浏览器执行不同数量的工作。**

Google 的渲染性能指南将常见更新分成三类路径。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">三种常见渲染更新路径</text>
  <box gap={1}>
    <text size="xs" color="secondary">路径 A · 几何属性变化（如 width）</text>
    <row gap={1} align="center">
      {#each ["Style","Layout","Paint","Composite"] as step,i}
        {#if i>0}<icon name="arrow-right" size="xs" color="tertiary"/>{/if}
        <box flex="1" align="center" background="#b45309" radius="sm" padding={{y:2,x:1}}>
          <text size="2xs" color="#ffffff" weight="medium">{step}</text>
        </box>
      {/each}
    </row>
  </box>
  <box gap={1}>
    <text size="xs" color="secondary">路径 B · 视觉属性变化（如 background-color）</text>
    <row gap={1} align="center">
      {#each ["Style","Paint","Composite"] as step,i}
        {#if i>0}<icon name="arrow-right" size="xs" color="tertiary"/>{/if}
        <box flex="1" background="#0d9488" align="center" radius="sm" padding={{y:2,x:1}}>
          <text size="2xs" color="#ffffff" weight="medium">{step}</text>
        </box>
      {/each}
    </row>
  </box>
  <box gap={1}>
    <text size="xs" color="secondary">路径 C · 合成友好属性变化（如 transform）</text>
    <row align="center" gap={1}>
      <box flex="1" background="#6366f1" radius="sm" align="center" padding={{y:2,x:1}}>
        <text size="2xs" color="#ffffff" weight="medium">Style / 属性更新</text>
      </box>
      <icon name="arrow-right" size="xs" color="tertiary"/>
      <box flex="1" background="#6366f1" radius="sm" align="center" padding={{y:2,x:1}}>
        <text size="2xs" color="#ffffff" weight="medium">Composite</text>
      </box>
    </row>
  </box>
  <caption>概念模型：符合合成条件时，某些 transform、opacity 动画可以避免逐帧 Layout 和 Paint。并非每次修改 transform 都必然只涉及合成。</caption>
</box>

现在我们逐层深入。

---

## 二、Style：浏览器如何知道哪些元素需要更新？

假设页面中有 1,000 个商品卡片：

```html
<div class="product-list">
  <div class="product-card">商品1</div>
  <div class="product-card">商品2</div>
  <!-- 更多商品卡片 -->
</div>
```

CSS：

```css
.product-card {
  background: white;
  padding: 16px;
}

.product-card.selected {
  background: #e8f2ff;
}
```

用户点击一个商品卡片后：

```js
card.classList.add("selected");
```

浏览器需要判断哪些样式规则受到影响。

这一过程通常涉及：

1. 将受影响元素的样式标记为需要更新。
2. 在需要时重新匹配或计算相关样式。
3. 比较新旧样式，判断是否需要后续布局、绘制或合成工作。

这里有一个常见误区：

**修改一个 class，不代表浏览器每次都必须重新计算页面上所有节点的样式。**

浏览器有样式失效追踪等优化机制，能够在许多情况下缩小影响范围。

不过，如果修改的是根元素或涉及大范围依赖的选择器，影响可能扩大。

例如：

```js
document.documentElement.classList.toggle("dark");
```

配合：

```css
.dark .product-card {
  background: #222;
  color: white;
}
```

这项操作可能影响页面中大量商品卡片。

#### 应该怎么优化？

不是完全避免修改 class，而是减少不必要的大范围样式失效。

例如只更新当前商品卡片：

```js
card.classList.add("selected");
```

通常比每次都重建整片商品列表更容易控制更新范围。

---

## 三、Layout / Reflow：为什么重排通常比较昂贵？

这是我们今天首先要深入理解的关键阶段。

### 1. Layout 到底在计算什么？

假设：

```html
<div class="container">
  <div class="left">商品图片</div>
  <div class="right">商品信息</div>
</div>
```

CSS：

```css
.container {
  display: flex;
  width: 800px;
}

.left {
  width: 300px;
}

.right {
  flex: 1;
}
```

浏览器不仅需要知道 `left` 的宽度是 300px，还需要计算：

- `right` 最终能获得多少空间。
- 两个子元素的位置。
- 子元素内容是否影响高度。
- 是否存在换行或溢出。
- 这些布局结果是否影响父级及其他元素。

因此 Layout 不是简单地读取几个 CSS 数值。

它需要解决元素之间的几何依赖关系。

### 2. 为什么改变宽度会触发重排？

例如：

```js
const left = document.querySelector(".left");

left.style.width = "400px";
```

这项变化可能影响：

```text
left 宽度变化
      ↓
right 剩余空间变化
      ↓
right 文字可能重新换行
      ↓
right 高度可能变化
      ↓
container 高度可能变化
      ↓
下面的元素位置可能变化
```

这就是为什么 Layout 有时会产生连锁影响。

### 3. 哪些 CSS 属性容易触发布局？

常见例子包括：

| 属性或操作 | 可能触发的主要工作 |
|---|---|
| `width`、`height` | Layout |
| `margin`、`padding` | Layout |
| `top`、`left`（定位元素） | Layout |
| `font-size` | Layout，通常还涉及 Paint |
| `display` | 可能改变布局树 |
| `background-color` | Paint，通常不需要 Layout |
| `box-shadow` | Paint，通常不需要 Layout |
| `opacity` | 常可通过合成优化 |
| `transform` | 常可通过合成优化 |

这里的分类是常见场景，不是绝对规则。具体成本依赖浏览器实现、元素状态、属性变化方式及合成条件。

### 4. Reflow 一定很慢吗？

不一定。

假设页面上只有一个独立的小元素，改变它的宽度，浏览器可能很快就完成了布局。

但如果是一个包含 5,000 个节点的复杂页面，并且这些元素之间存在大量布局依赖，计算成本可能高得多。

因此，Layout 的成本主要取决于：

**需要更新多少元素，以及这些元素的布局依赖有多复杂。**

官方布局优化指南也特别强调 DOM 规模、布局复杂度和更新范围对性能的影响。

---

## 四、Paint / Repaint：不需要重排，也可能很慢

接下来我们修改一个不会影响布局的属性。

```js
card.style.backgroundColor = "red";
```

这项操作通常不会改变元素的尺寸和位置。

浏览器不需要为此重新计算整个页面的几何布局，但可能需要重新绘制受影响的内容。

这就是 Paint。

### 1. Paint 包含哪些内容？

常见包括：

- 文本、颜色和背景。
- 边框及阴影。
- 图片和部分视觉效果。
- 需要重新绘制的图形内容。

例如：

```css
.product-card {
  box-shadow: 0 10px 30px rgba(0, 0, 0, .2);
}
```

如果大量卡片持续改变阴影，可能带来明显的绘制开销，即使没有发生 Layout。

### 2. Paint 的优化原则

第一，尽量减少无意义的重复绘制。

第二，限制视觉变化的影响范围。

第三，避免让大量复杂元素在每一帧都发生昂贵的绘制操作。

注意：不能简单认为重绘一定很慢或者一定比重排快。它们的实际耗时都需要测量。

---

## 五、Composite：为什么 transform 更适合做动画？

现在研究一个经典面试题：

**为什么动画推荐使用 `transform`，而不是 `left`？**

我们先看两种实现。

### 方式 A：通过 left 移动

```css
.box {
  position: relative;
  left: 0;
  transition: left 300ms;
}

.box.move {
  left: 200px;
}
```

改变 `left` 通常会涉及布局位置的更新。

对于动画来说，这项变化可能每一帧都要进行。

### 方式 B：通过 transform 移动

```css
.box {
  transform: translateX(0);
  transition: transform 300ms;
}

.box.move {
  transform: translateX(200px);
}
```

`transform` 改变的是元素的视觉变换，不会改变普通文档流中给其他元素预留的布局空间。

如果浏览器能够将该动画放到合成线程处理，就可能避免每一帧的主线程 Layout 和 Paint。

这通常更适合实现高频动画。

### 需要理解 Compositor Thread

现代 Chromium 浏览器有主线程和合成器相关线程。

简化理解：

<box border radius="lg" padding={3} gap={3}>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={3} gap={2}>
        **主线程**
        <text size="xs" color="secondary">JavaScript</text>
        <text size="xs" color="secondary">样式计算</text>
        <text size="xs" color="secondary">Layout</text>
        <text size="xs" color="secondary">Paint 相关工作</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="md" padding={3} gap={2}>
        **合成器相关线程**
        <text size="xs" color="secondary">图层变换</text>
        <text size="xs" color="secondary">图层组合</text>
        <text size="xs" color="secondary">部分动画与滚动</text>
        <text size="xs" color="secondary">提交显示</text>
      </box>
    </grid-item>
  </grid>
  <text size="sm" color="secondary">这只是概念性分工。真实 Chromium 还会利用栅格化线程、GPU 进程等组件，不是所有 CSS 动画都能离开主线程运行。</text>
</box>

这解释了一个非常有趣的现象：

有些页面 JavaScript 正在占用主线程，但页面的部分滚动或合成动画仍可能继续进行。

### transform 是否一定不触发重绘？

不是。

不要记成：

> 修改 transform 永远只触发 Composite。

更准确的说法是：

**某些 transform 和 opacity 动画在满足条件时，可以由合成器高效处理，避免逐帧布局与绘制。**

此外，`transform` 也不是完全没有成本。合成层会占用内存，元素在缩放或移动时也可能涉及栅格化、纹理管理等工作。

因此也不要滥用：

```css
* {
  will-change: transform;
}
```

这反而可能造成不必要的内存开销。

---

## 六、最重要的 JavaScript 性能陷阱：强制同步布局

现在进入这一课最关键、也是最容易出现实际性能问题的部分。

我们先研究一个问题：

**JavaScript 连续修改 100 次 DOM，浏览器会执行 100 次 Layout 吗？**

答案是：不一定。

### 1. 浏览器通常会批量处理样式更新

例如：

```js
const box = document.querySelector(".box");

box.style.width = "100px";
box.style.width = "200px";
box.style.width = "300px";
```

这段代码连续修改了三次宽度。

但浏览器通常不需要：

```text
修改为 100px → Layout
修改为 200px → Layout
修改为 300px → Layout
```

因为这些 JavaScript 代码在同一个同步任务中连续执行，浏览器可以先记录样式变化，等到适当的渲染时机再计算。

而最终真正需要显示的是 300px。

概念上：

```text
JS 修改 width = 100px
            ↓
JS 修改 width = 200px
            ↓
JS 修改 width = 300px
            ↓
JS 任务完成
            ↓
计算最终样式
            ↓
Layout
            ↓
Paint / Composite
```

这就是浏览器能够批量合并渲染更新的一个重要原因。

但接下来的代码会改变这一切。

### 2. 为什么 offsetWidth 可能触发强制同步布局？

看下面这段代码：

```js
const box = document.querySelector(".box");

box.style.width = "300px";

console.log(box.offsetWidth);
```

这里有两个步骤：

第一步：

```js
box.style.width = "300px";
```

浏览器知道元素宽度发生了变化，并可能将其布局标记为过期。

第二步：

```js
box.offsetWidth;
```

你要求浏览器立即返回元素当前的布局宽度。

问题来了。

如果浏览器尚未处理刚才的样式修改，它直接返回上一次布局的宽度，就可能得到不正确的结果。

因此，浏览器可能需要在 JavaScript 执行期间提前进行样式计算和布局。

这就是：

**Forced Synchronous Layout（强制同步布局），也称 Forced Reflow。**

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">正常更新与强制同步布局的区别</text>
  <box gap={1}>
    <text color="secondary" size="xs">正常情况：写入后等待渲染时机</text>
    <row align="center" gap={1}>
      <box flex="1" background="#64748b" radius="sm" padding={2} align="center">
        <text color="#ffffff" size="2xs">JS 写入</text>
      </box>
      <icon name="arrow-right" color="tertiary" size="xs"/>
      <box flex="1" background="#64748b" radius="sm" padding={2} align="center">
        <text color="#ffffff" size="2xs">JS 结束</text>
      </box>
      <icon name="arrow-right" color="tertiary" size="xs"/>
      <box flex="1" background="#0d9488" radius="sm" padding={2} align="center">
        <text color="#ffffff" size="2xs">Layout</text>
      </box>
    </row>
  </box>
  <box gap={1}>
    <text color="secondary" size="xs">强制同步布局：JS 执行期间提前计算</text>
    <row align="center" gap={1}>
      <box flex="1" background="#64748b" radius="sm" padding={2} align="center">
        <text color="#ffffff" size="2xs">JS 写入</text>
      </box>
      <icon name="arrow-right" color="tertiary" size="xs"/>
      <box flex="1" background="#d97706" radius="sm" padding={2} align="center">
        <text color="#ffffff" size="2xs">JS 读取</text>
      </box>
      <icon name="arrow-right" color="tertiary" size="xs"/>
      <box flex="1" background="#e07a5f" radius="sm" padding={2} align="center">
        <text color="#ffffff" size="2xs">被迫 Layout</text>
      </box>
    </row>
  </box>
</box>

注意：

强制同步布局不是说浏览器执行了某个绝对不应该执行的操作。

而是说，浏览器被 JavaScript 要求**在原本可能延后批量处理的地方，立即完成布局计算**。

一次必要的同步布局不一定是性能问题。

真正需要警惕的是在短时间内反复触发它。

### 3. Layout Thrashing：布局抖动

看这个例子：

```js
const boxes = document.querySelectorAll(".box");

boxes.forEach((box, index) => {
  // 写入：修改布局
  box.style.width = `${200 + index}px`;

  // 读取：要求获取最新布局
  const width = box.offsetWidth;

  console.log(width);
});
```

如果这些元素的布局持续被修改和失效，每次读取都可能要求浏览器刷新布局。

于是形成：

```text
Write → Read → Layout
Write → Read → Layout
Write → Read → Layout
Write → Read → Layout
...
```

这种反复的读写交替，就是典型的布局抖动风险。

假设某个页面发生了 50 次昂贵的同步布局，每次需要 4ms。

仅这些布局计算就可能耗费 200ms，明显影响交互响应。

这是用于解释问题的假设数字，具体浏览器可能只计算失效范围，也可能合并或优化部分读取。

### 4. 如何解决？读写分离

我们把代码改成：

```js
const boxes = [...document.querySelectorAll(".box")];

// 第一阶段：批量读取布局
const widths = boxes.map((box) => box.offsetWidth);

// 第二阶段：批量修改布局
boxes.forEach((box, index) => {
  box.style.width = `${widths[index] + 20}px`;
});
```

这样就避免了在循环中不断交替读取和写入布局。

逻辑变成：

```text
Read → Read → Read
          ↓
Write → Write → Write
          ↓
等待浏览器安排后续布局更新
```

这通常更容易让浏览器高效处理更新。

但“批量读写”不是万能保证。如果开始读取之前页面就有未完成的布局更新，第一次读取仍然可能触发强制布局。

#### 哪些 DOM API 需要警惕？

| API | 可能产生的影响 |
|---|---|
| `offsetWidth / offsetHeight` | 可能强制布局 |
| `offsetTop / offsetLeft` | 可能强制布局 |
| `getBoundingClientRect()` | 可能强制布局 |
| `scrollWidth / scrollHeight` | 可能强制布局 |
| `getComputedStyle()` | 可能强制样式计算，特定情况还可能需要布局 |
| `element.style.width = ...` | 通常使相关布局失效，本身不一定立即执行布局 |

重点不在于禁止使用这些 API，而是在于**避免布局失效后，反复要求浏览器提供最新的布局结果**。

---

## 七、requestAnimationFrame 到底有什么作用？

前面提到，浏览器会选择适当时机执行渲染。

而 `requestAnimationFrame`（简称 rAF）可以让开发者在浏览器准备进行下一次绘制之前执行回调。

它是与浏览器渲染节奏协作的重要工具。

### 1. 首先理解屏幕刷新率

假设屏幕刷新率为 60Hz。

那么两次屏幕刷新之间的理论间隔约为：

\[
\frac{1000}{60}\approx16.67ms
\]

不同刷新率的理论帧间隔如下：

| 刷新率 | 每帧间隔 |
|---|---:|
| 60Hz | 16.67ms |
| 90Hz | 11.11ms |
| 120Hz | 8.33ms |

这不是 JavaScript 可以独占的时间预算，因为浏览器还需要处理样式、布局、绘制及其他工作。

如果主线程任务太重，就可能错过某个呈现时机，导致动画不连续。

### 2. 为什么 setInterval 不是理想的动画调度方式？

例如：

```js
setInterval(() => {
  box.style.left = `${getNextPosition()}px`;
}, 16);
```

这段代码存在两个问题。

第一，定时器不是精确的。它的执行还要受到主线程忙碌程度、浏览器调度、后台节流等因素影响。

第二，它不保证与屏幕呈现节奏一致。

如果屏幕是 120Hz，使用固定的 16ms 调度也不能充分利用更高刷新率。

### 3. requestAnimationFrame 的正确用法

```js
const box = document.querySelector(".box");

let startTime;

function animate(timestamp) {
  if (startTime === undefined) {
    startTime = timestamp;
  }

  const elapsed = timestamp - startTime;

  const progress = Math.min(elapsed / 1000, 1);

  const x = progress * 200;

  box.style.transform = `translateX(${x}px)`;

  if (progress < 1) {
    requestAnimationFrame(animate);
  }
}

requestAnimationFrame(animate);
```

代码逻辑：

- 浏览器在合适的绘制前时机调用 `animate`。
- `timestamp` 用来计算已经过去的时间。
- 根据进度计算元素位置。
- 使用 `transform` 更新视觉位置。
- 如果动画未完成，就请求下一帧。

这样比固定每 16ms 增加若干像素更容易适配不同刷新率。

`requestAnimationFrame` 是一次性回调，需要自行再次注册；浏览器还可能在后台标签页暂停调用。

### 4. 一个非常容易误解的地方

**requestAnimationFrame 不会自动优化回调中的 JavaScript。**

例如：

```js
requestAnimationFrame(() => {
  const start = performance.now();

  while (performance.now() - start < 500) {
    // 模拟 500ms 的同步计算
  }

  box.style.transform = "translateX(200px)";
});
```

这段代码仍然会长时间占用主线程。

而且由于回调发生在绘制前，它甚至可能直接推迟下一帧呈现。

所以 rAF 主要解决的是：

**什么时候执行与下一帧有关的工作。**

它并不直接解决：

**这项工作本身是否过于昂贵。**

这一差别非常关键。

---

## 八、从事件循环理解 JavaScript 和渲染的关系

我们把上一课的事件循环知识和今天的渲染流水线串起来。

一个简化的浏览器主线程执行周期可以表示为：

<box border radius="lg" padding={3} gap={2}>
  <svg viewBox="0 0 340 322" width="100%">
    {#each [
      {y:5,t:"执行一个任务（Task）",s:"例如 click 回调、定时器任务"},
      {y:68,t:"微任务检查点（Microtasks）",s:"例如 Promise.then、queueMicrotask"},
      {y:131,t:"如果存在渲染机会",s:"浏览器决定是否更新渲染"},
      {y:194,t:"执行适用的 rAF 回调",s:"准备下一帧相关更新"},
      {y:257,t:"必要的 Style / Layout / Paint",s:"随后合成并呈现画面"}
    ] as n,i}
      <rect x="28" y={n.y} width="284" height="49" rx="8" stroke="#64748b" strokeOpacity=".4" fill="#64748b" fillOpacity=".09"/>
      <text x="170" y={n.y+20} textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">{n.t}</text>
      <text x="170" y={n.y+36} textAnchor="middle" fontSize="10" fill="currentColor" opacity=".68">{n.s}</text>
      {#if i<4}
        <path d={`M170 ${n.y+49} v12 m-4 -4 l4 4 4 -4`} stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" fill="none"/>
      {/if}
    {/each}
  </svg>
  <caption>简化执行模型，而不是每轮事件循环都必然执行的固定序列。真实渲染更新还包含其他步骤，且浏览器并非在每个任务结束后都绘制。</caption>
</box>

这里有两个关键知识点。

#### 1. 浏览器不一定在每个 JavaScript 任务结束后绘制

例如：

```js
box.style.width = "100px";
box.style.width = "200px";
box.style.width = "300px";
```

可能最终只显示 300px 的状态。

#### 2. 微任务也可能延迟渲染

例如：

```js
function work() {
  // 模拟持续安排微任务
  queueMicrotask(work);
}

work();
```

这段代码会持续安排微任务，可能让浏览器很长时间没有机会进入正常渲染流程。

所以：

**把耗时操作放进 Promise.then 或 queueMicrotask，不等于让出了主线程。**

它们依然在主线程上执行，而且微任务检查点通常会在进入下一次渲染之前处理队列中的微任务。

如果确实需要把昂贵任务拆开，让浏览器有机会处理中间的输入和渲染，就需要采用能真正让出执行机会的任务调度方式，或者将适合的计算转移至 Worker。

---

## 九、把这些原理应用到 INP 性能优化

现在我们终于能够从底层理解 INP 为什么变差。

回顾 INP 关注的一次交互延迟：

\[
T_{\text{交互}} =
T_{\text{Input Delay}}+
T_{\text{Processing}}+
T_{\text{Presentation Delay}}
\]

<box border radius="xl" padding={3} gap={3}>
  <text weight="medium" size="sm">一次慢交互的耗时分布（模拟案例）</text>
  <box direction="row" height="34px" radius="md" clip gap="1px">
    <box background="#64748b" flex={120} align="center" justify="center">
      <text color="#ffffff" size="xs" weight="medium">120ms</text>
    </box>
    <box background="#d97706" flex={80} align="center" justify="center">
      <text color="#ffffff" size="xs" weight="medium">80ms</text>
    </box>
    <box background="#0d9488" flex={180} align="center" justify="center">
      <text color="#ffffff" size="xs" weight="medium">180ms</text>
    </box>
  </box>
  <row justify="between" align="center">
    <text color="secondary" size="xs">总交互延迟</text>
    <title size="lg" color="danger" tabularNums>380ms</title>
  </row>
  <divider color="subtle"/>
  {#each [
    {name:"Input Delay",value:"120ms",description:"其他长任务让事件回调无法及时开始",color:"#64748b"},
    {name:"Processing Duration",value:"80ms",description:"事件回调执行 JavaScript 和同步布局",color:"#d97706"},
    {name:"Presentation Delay",value:"180ms",description:"事件处理后还要等待渲染和下一帧呈现",color:"#0d9488"}
  ] as x}
    <row align="start" gap={2}>
      <box size="10px" background={x.color} radius="sm"/>
      <box flex="1" gap="2px">
        <row align="center" justify="between">
          <text size="sm" weight="medium">{x.name}</text>
          <text size="sm" weight="medium" tabularNums>{x.value}</text>
        </row>
        <text color="secondary" size="xs">{x.description}</text>
      </box>
    </row>
  {/each}
</box>

这里需要特别注意最后一项：Presentation Delay。

很多开发者只关注 JavaScript 事件处理函数的执行时间，发现回调只执行了几毫秒，就认为性能没有问题。

但如果事件触发了复杂的 Layout 和 Paint，页面仍然可能很晚才把结果呈现出来。

Google 官方的 INP 分析指南正是按照这三个部分定位慢交互。

因此，优化交互应该同时考虑：

- 用户点击时，主线程是不是已经被其他任务占用？
- 事件处理过程中，有没有大量同步计算或强制布局？
- 事件处理完成后，浏览器还需要进行多少渲染工作？

---

## 十、Shopify 实战：为什么购物车抽屉容易卡顿？

我们结合你熟悉的 Shopify Theme 场景。

假设用户点击“加入购物车”。

典型流程是：

```text
用户点击加入购物车
        ↓
执行点击事件
        ↓
发起 Cart Ajax API 请求
        ↓
服务端更新购物车
        ↓
获取更新后的 Cart Drawer HTML
        ↓
浏览器解析返回的 HTML
        ↓
替换 Cart Drawer 中的 DOM
        ↓
Style / Layout / Paint / Composite
        ↓
抽屉内容显示
```

其中有网络请求、HTML 处理和浏览器渲染三个不同类型的成本。

一个很容易忽略的事实是：

**Section Rendering API 可以避免整个页面重新加载，但不代表使用它更新 DOM 就完全没有浏览器渲染成本。**

Shopify 官方也推荐使用 Section Rendering API 获取局部 HTML，并通过 Ajax 更新需要变化的 Section。

### 1. 一种可能存在性能问题的实现

```js
async function updateCart() {
  const response = await fetch("/?sections=cart-drawer");

  const sections = await response.json();

  const drawer = document.querySelector("#cart-drawer");

  drawer.innerHTML = sections["cart-drawer"];
}
```

这里假设页面存在自定义的 `#cart-drawer` 容器，代码仅用于解释更新流程。

可能出现的问题包括：

- 每次都替换整个购物车 DOM。
- DOM 结构较大，解析与插入成本较高。
- 更新影响布局，触发更多样式计算和 Layout。
- 原有节点上的事件监听器随着替换而丢失。
- 抽屉需要重新初始化、绑定交互或恢复焦点。

还要注意：返回的 Section HTML 通常包含 Section 外层包装，直接放进任意内部容器可能产生重复嵌套。实际项目应根据 Theme 的 DOM 结构选择正确的替换节点。

### 2. 优化方向一：只更新需要变化的区域

假设购物车抽屉分成：

```text
Cart Drawer
  ├── Header
  ├── Cart Items
  ├── Summary
  └── Checkout Button
```

当商品数量发生变化时，未必需要重新创建整个 Drawer 组件。

可以考虑保持外层容器稳定，只更新商品列表、总价和商品数量等确实变化的区域。

这样有机会缩小 DOM 更新范围，同时保留部分组件状态。

当然，是否采用局部节点更新，还是重新渲染某个 Section，要考虑 Theme 的复杂程度、维护成本和真实测量结果。

### 3. 优化方向二：不要让重复 DOM 初始化增加负担

例如，每次 Section 更新后都重新执行：

```js
document.querySelectorAll(".cart-remove").forEach((button) => {
  button.addEventListener("click", handleRemove);
});
```

如果页面通过动态 DOM 替换或重复初始化处理不当，可能出现监听器管理混乱、重复工作等问题。

对于合适的交互，可以考虑事件委托：

```js
document.addEventListener("click", (event) => {
  const button = event.target.closest(".cart-remove");

  if (!button) return;

  handleRemove(event, button);
});
```

这里的 `handleRemove` 代表已有的移除商品逻辑。

事件委托可以减少对每个动态按钮重复绑定监听器的需求，但仍要管理好事件作用范围，避免在多个组件中重复注册同一个委托监听器。

### 4. 优化方向三：尽早给用户反馈

假设 Cart API 需要 600ms 才返回。

如果用户点击按钮后什么都不显示，就会觉得按钮很迟钝。

更好的策略通常是立即更新按钮的 Loading 状态，然后异步完成请求。

在适合的情况下，还可以利用页面已经存在的商品信息提前显示购物车预览，再使用服务器返回的真实数据校正。

Shopify 官方也介绍了这种乐观购物车渲染策略。

但需要注意：

乐观更新主要改善的是**感知响应速度与交互体验**，不意味着服务器真的提前处理完成，也不保证一定改善 INP。最终库存、促销、价格和购物车状态仍要以服务端结果为准。

---

## 十一、如何在 Chrome DevTools 中识别 Layout 和 Paint 问题？

这一部分非常适合你实际动手操作。

### 1. 打开 Performance 面板

在 Chrome 中打开需要分析的页面：

1. 按 F12 打开开发者工具。
2. 进入 **Performance**。
3. 开始录制。
4. 操作一次页面，例如切换商品变体或打开购物车抽屉。
5. 停止录制。

现在观察主线程轨道（Main）以及交互、渲染相关记录。

### 2. 重点识别这些任务

| Performance 中的记录 | 说明 |
|---|---|
| `Function Call` / `Evaluate Script` | JavaScript 执行 |
| `Recalculate Style` | 重新计算样式 |
| `Layout` | 计算布局 |
| `Paint` | 绘制相关工作 |
| `Composite Layers` 等合成记录 | 合成相关工作 |
| `Animation Frame Fired` | 执行 rAF 回调 |

任务的具体命名和显示方式可能随 Chrome 版本及记录类型不同而变化。

### 3. 排查 Forced Reflow

Chrome 的 Performance → Insights 中提供了 **Forced reflow** 诊断，可以帮助定位导致同步布局的函数及相关调用栈。

例如看到：

```text
Function Call
  └── updateCards()
       ├── Recalculate Style
       ├── Layout
       ├── Recalculate Style
       ├── Layout
       └── ...
```

就值得检查：

- 有没有循环内读取 `offsetWidth`？
- 有没有修改 DOM 后立即执行 `getBoundingClientRect()`？
- 有没有在滚动事件中持续进行复杂布局测量？
- 是否因为大量节点变化造成布局范围过大？

而不是一看到 Layout 就认为有问题。

**Layout 是浏览器正常渲染不可缺少的环节，真正需要关注的是它为什么频繁发生、耗时多少、是否发生在交互关键路径上。**

---

## 十二、做一个简单的性能实验

我们来设计一个本地测试。

准备 1,000 个元素：

```html
<div id="container"></div>

<script>
  const container = document.querySelector("#container");

  container.innerHTML = Array.from(
    { length: 1000 },
    (_, i) => `<div class="item">Item ${i}</div>`
  ).join("");
</script>
```

添加一些简单样式：

```css
.item {
  display: inline-block;
  width: 100px;
  padding: 8px;
  border: 1px solid #ddd;
}
```

接下来比较两种更新方式。

#### 方案 A：读写交替

```js
const items = [...document.querySelectorAll(".item")];

console.time("interleaved");

items.forEach((item, index) => {
  item.style.width = `${100 + (index % 20)}px`;

  // 修改布局后立刻读取
  void item.offsetWidth;
});

console.timeEnd("interleaved");
```

#### 方案 B：先写入，再统一读取

```js
const items = [...document.querySelectorAll(".item")];

console.time("batched");

items.forEach((item, index) => {
  item.style.width = `${100 + (index % 20)}px`;
});

const widths = items.map((item) => item.offsetWidth);

console.timeEnd("batched");
```

建议你在 Performance 中分别录制两种方案，并重复多次测试。

你可以观察是否出现这样的趋势：

- 方案 A：在 JavaScript 执行期间出现反复 Layout。
- 方案 B：更容易合并布局失效，减少重复计算。

注意两段代码最终视觉结果基本一致，但执行时是否必须立即获得每个元素的宽度、浏览器的具体优化、之前的页面状态和设备性能，都会影响实际结果。

另外，`console.time` 只能衡量对应 JavaScript 执行区间的耗时，不能单独代表最终画面呈现时间。因此要结合 Performance 记录判断。

---

## 十三、本课最重要的结论

我们把今天的知识全部浓缩成一张表。

| 概念 | 本质 | 优化重点 |
|---|---|---|
| Style | 计算最终样式 | 缩小不必要的样式更新范围 |
| Layout / Reflow | 计算元素几何信息 | 避免反复或大范围布局 |
| Paint / Repaint | 绘制视觉内容 | 减少昂贵的重复绘制 |
| Composite | 合成画面 | 合理利用合成友好动画 |
| Forced Reflow | JS 迫使浏览器立即布局 | 避免写入后频繁读取布局 |
| Layout Thrashing | 反复读写导致重复布局 | 批量读、批量写 |
| requestAnimationFrame | 与渲染节奏协作 | 合理安排逐帧更新 |
| INP | 反映用户交互响应性 | 同时优化输入等待、事件执行和呈现延迟 |

这一课最核心的思想，可以归纳为三个层次：

**第一层：尽量减少浏览器需要做的工作。** 比如不要在点击按钮时无意义地重建整个商品区域。

**第二层：让浏览器有机会合并工作。** 比如减少 DOM 读写交替，不要频繁强制同步布局。

**第三层：把工作安排在合适的时机和线程。** 比如动画使用合适的合成属性、使用 rAF 协调逐帧更新，以及将合适的重计算放到 Worker。

真正高效的前端代码，并不只是 JavaScript 执行得快，而是能够让**JavaScript、样式计算、布局、绘制和合成协同高效运行**。

## 参考资料

- [Window: requestAnimationFrame() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [Window: requestAnimationFrame() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame?trk=article-ssr-frontend-pulse_little-text-block)
- [Avoid large, complex layouts and layout thrashing | web.dev](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)
- [Avoid large, complex layouts and layout thrashing | web.dev](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing?authuser=370)
- [Interaction to Next Paint (INP) | web.dev](https://web.dev/articles/inp)
- [Rendering performance | Articles | web.dev](https://web.dev/articles/rendering-performance/)
- [Avoid large, complex layouts and layout thrashing | web.dev](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing?authuser=384)
- [Measuring Interaction to Next Paint (INP) | web.dev](https://web.dev/codelabs/measuring-inp?hl=en)
- [Optimize Interaction to Next Paint | web.dev](https://web.dev/articles/optimize-inp)
- [Manually diagnose slow interactions in the lab | web.dev](https://web.dev/articles/manually-diagnose-slow-interactions-in-the-lab?authuser=10)
- [Understanding Interaction to Next Paint (INP) | web.dev](https://web.dev/codelabs/understanding-inp)
- [Rendering performance | Articles | web.dev](https://web.dev/articles/rendering-performance?authuser=383)
- [Performance insights: Get actionable insights on your website's performance | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance-insights/)
- [Performance insights: Get actionable insights on your website's performance | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance-insights)
- [Performance | Chrome for Developers](https://developer.chrome.com/docs/performance/insights/)
- [What's new in DevTools, Chrome 134 | Blog | Chrome for Developers](https://developer.chrome.com/blog/new-in-devtools-134)
- [What's new in DevTools, Chrome 134 | Blog | Chrome for Developers](https://developer.chrome.com/blog/new-in-devtools-134?authuser=68)
- [Performance insights: Get actionable insights on your website's performance | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/performance-insights?hl=en)
- [What's new in DevTools, Chrome 134 | Blog | Chrome for Developers](https://developer.chrome.com/blog/new-in-devtools-134?authuser=889162768)
- [Use the Section Rendering API for dynamic updates](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-section-rendering-api)
- [Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)
- [About the Shopify Ajax API](https://shopify.dev/docs/api/ajax)
- [Sections](https://shopify.dev/docs/storefronts/themes/architecture/sections)
- [Cart API reference](https://shopify.dev/docs/api/ajax/reference/cart)
- [Integrate sections and blocks with the theme editor](https://shopify.dev/docs/storefronts/themes/best-practices/editor/integrate-sections-and-blocks)
- [Sections API is sometimes returning null - Shopify App Store - Shopify Developer Community Forums](https://community.shopify.dev/t/sections-api-is-sometimes-returning-null/39219)
