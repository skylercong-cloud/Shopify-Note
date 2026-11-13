# 深入浏览器事件循环、主线程调度与 JavaScript 长任务优化


这一课，我们要解决一个前端性能优化中的核心问题：

**为什么一段 JavaScript 即使没有操作 DOM，也可能导致页面卡顿、点击无响应、动画掉帧？**

上一课知道：

- 修改 DOM 可能触发 Style、Layout、Paint。
- 反复读取布局属性可能导致 Forced Reflow。
- `transform` 动画通常比 `left` 动画更容易优化。
- `requestAnimationFrame` 能与浏览器渲染时机协作。

但是还有一个问题没有解决：

假如 JavaScript 本身需要执行 500ms，既不读取 DOM，也不修改 CSS，浏览器为什么仍然可能卡住？

答案在于 **JavaScript 任务调度与浏览器主线程的工作机制**。

本课分为五个核心部分：

1. 浏览器主线程和事件循环究竟如何工作。
2. 宏任务、微任务与浏览器渲染之间的关系。
3. 长任务为什么导致交互延迟和掉帧。
4. 如何真正拆分长任务：`setTimeout`、`scheduler.yield()`、Web Worker。
5. Shopify 商品页和购物车中的实际应用。

---

## 一、先理解主线程为什么会阻塞

现代浏览器不是只有一个线程。

以 Chromium 为例，浏览器内部拥有负责网络、合成、栅格化等工作的不同线程和进程。

但对于一个典型的网页，**大量 JavaScript 代码、DOM 操作和主线程上的渲染工作，需要竞争同一个主线程的执行时间**。

假设有一段代码：

```js
function heavyTask() {
  const start = performance.now();

  while (performance.now() - start < 500) {
    // 模拟 500ms CPU 密集型任务
  }
}

heavyTask();
```

这段代码没有修改 DOM，也没有设置 CSS。

可是执行它的时候，页面仍然可能暂时失去响应。

原因是：

**同步 JavaScript 执行期间，主线程不能随意中断当前调用栈，转而执行其他普通 JS 回调。**

例如，用户在 `heavyTask()` 运行期间点击了按钮，事件回调通常不能抢占正在执行的同步函数。

必须先等待当前任务运行完毕。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">主线程被长任务占用（模拟时间线）</text>
  <svg viewBox="0 0 340 166" width="100%">
    <g fontSize="10" fill="currentColor" opacity=".65">
      <text x="8" y="15">0ms</text>
      <text x="130" y="15">200ms</text>
      <text x="260" y="15">500ms</text>
    </g>
    <rect x="8" y="30" width="258" height="35" rx="5" fill="#dc7954" fillOpacity=".85"/>
    <text x="137" y="51" textAnchor="middle" fontSize="12" fontWeight="600" fill="#fff">JavaScript 执行 500ms</text>
    <rect x="268" y="30" width="64" height="35" rx="5" fill="#0d9488"/>
    <text x="300" y="51" textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff">处理点击</text>
    <line x1="90" y1="22" x2="90" y2="96" stroke="#d97706" strokeWidth="1.5" strokeDasharray="4 3"/>
    <circle cx="90" cy="86" r="4" fill="#d97706"/>
    <text x="99" y="91" fontSize="10.5" fill="currentColor">用户此时点击</text>
    <path d="M94 105 H265" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3"/>
    <text x="181" y="119" textAnchor="middle" fontSize="10" fill="currentColor">事件必须等待长任务结束</text>
    <rect x="8" y="135" width="10" height="10" rx="2" fill="#dc7954"/>
    <text x="23" y="144" fontSize="10" fill="currentColor">长任务</text>
    <rect x="119" y="135" width="10" height="10" rx="2" fill="#0d9488"/>
    <text x="134" y="144" fontSize="10" fill="currentColor">交互处理</text>
  </svg>
  <caption>图中时间和任务长度是示意值。实际输入事件的排队和调度还受到浏览器内部机制影响。</caption>
</box>

在这个例子中：

- JavaScript 执行了 500ms。
- 用户可能在任务执行了 150ms 后点击。
- 点击回调要等剩余的任务执行完成才有机会运行。
- 如果还需要布局、绘制，反馈可能更晚出现。

这就是为什么**CPU 密集型 JavaScript 即使不修改页面，也会影响页面交互性能**。

---

## 二、浏览器事件循环到底是什么？

Event Loop（事件循环）不是简单的“JavaScript 执行队列”。

它是浏览器协调任务执行、微任务处理以及渲染更新的重要机制。

为了便于理解，我们先使用一个简化模型：

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 304" width="100%">
    {#each [
      {y:10,t:"1. 选择并执行一个 Task",s:"脚本执行、事件回调、定时器等",c:"#64748b"},
      {y:81,t:"2. 处理 Microtask 检查点",s:"Promise.then、queueMicrotask 等",c:"#d97706"},
      {y:152,t:"3. 判断是否存在渲染机会",s:"不是每轮事件循环都需要渲染",c:"#3b82f6"},
      {y:223,t:"4. 执行必要的渲染更新",s:"rAF、Style、Layout、Paint 等",c:"#0d9488"}
    ] as n,i}
      <rect x="29" y={n.y} width="282" height="53" rx="8" stroke={n.c} strokeOpacity=".5" fill={n.c} fillOpacity=".1"/>
      <text x="170" y={n.y+21} fontSize="12" fontWeight="600" fill="currentColor" textAnchor="middle">{n.t}</text>
      <text x="170" y={n.y+39} fontSize="10" textAnchor="middle" fill="currentColor" opacity=".7">{n.s}</text>
      {#if i<3}
        <path d={`M170 ${n.y+53} v15 m-4 -5 l4 5 4 -5`} stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" fill="none"/>
      {/if}
    {/each}
    <path d="M29 249 H11 V35 H29" stroke="currentColor" strokeOpacity=".35" fill="none" strokeDasharray="4 4"/>
    <text x="8" y="289" fontSize="9.5" fill="currentColor" opacity=".6">下一轮事件循环 →</text>
  </svg>
  <caption>简化模型：真实 HTML 事件循环涉及多种任务源与队列、任务优先级及渲染调度。不能理解成只有一个严格 FIFO 的宏任务队列。</caption>
</box>

这里要理解两个重要概念：

**Task（任务）** 和 **Microtask（微任务）**。

我们常说的“宏任务”，一般指这里的 Task，但在浏览器规范语境中，更准确的名称是 Task。

### 1. 什么是 Task？

常见的任务来源包括：

- 初始脚本执行。
- `setTimeout` 回调。
- `setInterval` 回调。
- 一些用户输入事件的回调。
- 消息通道（MessageChannel）产生的任务。

例如：

```js
console.log("A");

setTimeout(() => {
  console.log("B");
}, 0);

console.log("C");
```

输出顺序：

```text
A
C
B
```

原因是：

`setTimeout` 只是安排未来运行的任务，不会立即打断当前 JavaScript。

即使延迟写的是 0ms，也不意味着立刻执行。

只有当前任务及相关微任务处理结束后，定时器回调才可能被调度。

### 2. 什么是 Microtask？

常见的微任务包括：

- `Promise.then()` 中的回调。
- `queueMicrotask()`。
- `async/await` 的 Promise 恢复执行部分。
- MutationObserver 的通知回调。

例如：

```js
console.log("A");

setTimeout(() => {
  console.log("B");
}, 0);

Promise.resolve().then(() => {
  console.log("C");
});

queueMicrotask(() => {
  console.log("D");
});

console.log("E");
```

输出结果：

```text
A
E
C
D
B
```

为什么？

首先执行当前同步任务：

```text
A → E
```

然后执行微任务：

```text
C → D
```

之后才有机会执行定时器任务：

```text
B
```

MDN 对浏览器微任务机制有一个重要说明：当微任务检查点开始处理时，它会持续处理微任务，直到队列为空，即使执行中的微任务又添加了新的微任务。

这个特点直接关系到接下来要讲的主线程优化。

---

## 三、一个非常重要的陷阱：Promise 不能解决长任务

假设你有一个耗时 300ms 的计算。

```js
function calculate() {
  const start = performance.now();

  while (performance.now() - start < 300) {
    // 模拟耗时计算
  }
}
```

你可能会想到：

“既然 Promise 是异步的，那我把计算放进 Promise 不就可以避免阻塞了吗？”

我们验证一下。

### 错误写法一：Promise.then

```js
Promise.resolve().then(() => {
  calculate();
});
```

这段代码仍然会阻塞主线程约 300ms。

因为 Promise 回调运行在微任务中，而微任务中的 JavaScript 同样需要占用主线程。

它不是被转移到了另一个线程执行。

### 错误写法二：async/await

```js
async function run() {
  await Promise.resolve();

  calculate();
}

run();
```

同样没有解决问题。

`await Promise.resolve()` 会使后续代码通过微任务恢复执行，但不会真正给浏览器创造一个正常的任务边界，让其他待处理的交互和渲染工作有充分机会运行。

### 错误写法三：不断安排微任务

```js
function process() {
  doSomeWork();

  queueMicrotask(process);
}

process();
```

假设 `doSomeWork()` 每次需要 5ms。

即使单次只有 5ms，如果不断安排新微任务，浏览器也可能长时间无法离开微任务检查点。

结果依然可能是页面卡顿。

这被称为 **Microtask Starvation（微任务饥饿）**。

#### 本节最重要的结论

**异步语法不等于多线程，也不等于主动让出主线程。**

尤其要区分：

```js
await Promise.resolve(); // 微任务恢复，不是真正的任务级让出
```

与：

```js
await scheduler.yield(); // 在支持的浏览器中，让出当前任务
```

后者才是我们接下来要重点学习的长任务拆分工具。

---

## 四、Long Task：多长的任务才算长任务？

在浏览器性能分析中，通常把主线程连续执行超过 **50ms** 的任务称为 Long Task（长任务）。

假设一个任务耗时 180ms。

它不是因为超过 50ms 就会被浏览器强制终止。

这 50ms 只是一个性能诊断阈值，提醒开发者：这个任务可能长时间阻止浏览器处理其他重要工作。

<box border radius="lg" padding={3} gap={3}>
  <text weight="medium">三个任务对主线程的影响（模拟）</text>
  {#each [
    {label:"任务 A",ms:8,color:"#0d9488"},
    {label:"任务 B",ms:42,color:"#0d9488"},
    {label:"任务 C",ms:180,color:"#dc7954"}
  ] as t}
    <box gap={1}>
      <row align="center" justify="between">
        <text size="sm">{t.label}</text>
        <text size="sm" weight="medium" tabularNums>{t.ms}ms</text>
      </row>
      <box height="20px" background="surface-tertiary" radius="sm" clip>
        <box height="100%" width={`${t.ms/180*100}%`} background={t.color} radius="sm"/>
      </box>
    </box>
  {/each}
  <caption>绿色表示低于 50ms 的任务，红色为超过阈值的长任务。颜色是示意，不表示低于 50ms 一定不会影响交互。</caption>
</box>

那么是不是只要把每个任务控制在 49ms 内，网站就一定流畅？

不是。

有三个原因。

第一，任务完成后，浏览器可能还需要执行大量样式计算、Layout 和 Paint。

第二，即使单个任务不到 50ms，连续大量任务也可能让浏览器难以及时响应。

第三，120Hz 屏幕的理论帧间隔只有约 8.33ms；一个 40ms 的任务也足以跨越多个刷新时机。

因此：

**50ms 是识别长任务的阈值，不是保证动画流畅的性能预算。**

对于用户交互，Google 的 INP 指标关注从用户输入开始，直到下一帧呈现之间的时间。输入等待、事件处理和呈现延迟都会产生影响。

---

## 五、真正拆分长任务：四种常见方案

假设有 10,000 条商品数据，我们需要逐个计算推荐分数。

最直接的实现：

```js
function calculateRecommendations(products) {
  const results = [];

  for (const product of products) {
    results.push(calculateScore(product));
  }

  return results;
}
```

其中 `calculateScore()` 代表一项 CPU 密集型计算。

如果整个循环需要 300ms，就可能形成一个长任务。

我们的目标是：

**不是简单地让计算总耗时减少，而是避免主线程被连续占用 300ms，让浏览器有机会处理中间发生的用户输入和渲染工作。**

### 方案一：使用 setTimeout 拆分任务

先看一个经典方案。

```js
function processInBatches(items, batchSize = 100) {
  const results = [];
  let index = 0;

  return new Promise((resolve) => {
    function processBatch() {
      const end = Math.min(index + batchSize, items.length);

      for (; index < end; index++) {
        results.push(calculateScore(items[index]));
      }

      if (index < items.length) {
        setTimeout(processBatch, 0);
      } else {
        resolve(results);
      }
    }

    processBatch();
  });
}
```

这段代码的重要改变是：

原来所有工作都在同一个 Task 中。

现在每处理 100 条数据，就把剩余工作安排到后续任务。

假设每批计算需要约 10ms。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">单个长任务与多个短任务的对比</text>
  <box gap={1}>
    <text color="secondary" size="xs">原始：长时间连续占用主线程</text>
    <box direction="row" height="30px" radius="sm" clip>
      <box flex="1" background="#dc7954" align="center" justify="center">
        <text color="#ffffff" size="xs" weight="medium">JS 连续执行 300ms</text>
      </box>
    </box>
  </box>
  <box gap={1}>
    <text color="secondary" size="xs">优化：拆分任务，在中间让出执行机会</text>
    <row gap="3px" height="30px">
      {#each [0,1,2,3,4,5] as i}
        <box flex="1" direction="row" gap={0} radius="sm" clip>
          <box flex="3" background="#0d9488" align="center" justify="center">
            <text color="#ffffff" size="2xs">{i+1}</text>
          </box>
          <box flex="1" background="#cbd5e1"/>
        </box>
      {/each}
    </row>
    <row gap={3} align="center">
      <row gap={1} align="center">
        <box size="10px" background="#0d9488" radius="sm"/>
        <text color="secondary" size="xs">JS 工作</text>
      </row>
      <row gap={1} align="center">
        <box size="10px" background="#cbd5e1" radius="sm"/>
        <text color="secondary" size="xs">让出机会</text>
      </row>
    </row>
  </box>
  <caption>结构示意，不按实际比例。任务边界创造调度机会，但浏览器是否在每个间隔绘制、每次间隔有多长，并不固定。</caption>
</box>

这样，用户如果在某一批计算期间点击按钮，浏览器可能在后续批次开始之前处理点击。

但 `setTimeout` 有一些局限：

- 可能受到最小定时器延迟与后台节流的影响。
- 无法直接表达“这项工作应该以什么优先级继续”。
- `setTimeout(fn, 0)` 不保证下一次调度一定先于或后于某次用户输入。
- 固定 `batchSize=100` 不一定合理，因为不同商品的计算量可能不同。

所以它可以作为兼容方案，但不是唯一选择。

---

### 方案二：使用 scheduler.yield()（重点）

浏览器提供了专门用于主动让出执行机会的 API：

```js
await scheduler.yield();
```

它属于 Prioritized Task Scheduling API。

这个 API 的核心作用是：

**暂停当前 async 函数后续的执行，将剩余部分安排到未来的任务中继续，让浏览器有机会处理其他工作。**

例如：

```js
async function processProducts() {
  calculatePartA();

  await scheduler.yield();

  calculatePartB();

  await scheduler.yield();

  calculatePartC();
}
```

原本：

```text
Task A
  ├── calculatePartA
  ├── calculatePartB
  └── calculatePartC
```

现在变成：

```text
Task A
  └── calculatePartA

      ↓ 让出主线程

Task B
  └── calculatePartB

      ↓ 让出主线程

Task C
  └── calculatePartC
```

这里与 `await Promise.resolve()` 的区别非常重要。

`Promise.resolve()` 只会通过微任务恢复后续代码，而 `scheduler.yield()` 的后续执行会被安排到未来的任务中。

因此它能提供真正的任务边界。

#### scheduler.yield 为什么比 setTimeout 更适合部分场景？

它有一个很实用的机制：**延续任务具有调度优先级。**

当你执行：

```js
await scheduler.yield();
```

浏览器知道这是一项尚未完成的工作，需要在适当的时候继续。

在默认情况下，延续任务使用 `user-visible` 优先级，并在该优先级层级中获得相对普通新任务更靠前的调度位置；更高优先级的任务仍可能先运行。

这使它既能让出执行机会，又不必像某些定时器拆分方案那样把延续工作简单地放在较低优先程度的位置。

#### 需要注意浏览器兼容性

截至目前，`scheduler.yield()` 仍不能作为所有浏览器均支持的 Baseline API。

MDN 将其标记为 Limited availability。因此生产环境需要特性检测或后备方案。

可以封装一个通用方法：

```js
function yieldToMain() {
  if (globalThis.scheduler?.yield) {
    return globalThis.scheduler.yield();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
```

以后统一调用：

```js
await yieldToMain();
```

这样代码至少有了任务级让出的能力。

不过后备的 `setTimeout` 与原生 `scheduler.yield()` 并不具备完全相同的优先级语义。

#### 重要细节：让出不是强制绘制

这里需要纠正一个容易产生的误解。

`await scheduler.yield()` 的意思是“把执行机会还给调度器”，而不是“强制浏览器立刻完成一次 Paint”。

浏览器可以利用这个机会响应输入或更新渲染，但不保证每次让出之后都一定出现新画面。

---

## 六、生产级思路：按时间预算拆分工作

固定每 100 条数据拆分一次存在问题。

例如：

- 在一台性能较强的设备上，100 条可能只需 2ms。
- 在一台低端手机上，100 条可能需要 40ms。
- 某些商品的计算比其他商品复杂得多。

因此，更合理的思路是按照**已经消耗的执行时间**决定什么时候让出主线程。

例如：

```js
async function processProducts(
  products,
  calculateScore,
  budget = 8
) {
  const results = [];

  let sliceStart = performance.now();

  for (const product of products) {
    results.push(calculateScore(product));

    if (performance.now() - sliceStart >= budget) {
      await yieldToMain();

      sliceStart = performance.now();
    }
  }

  return results;
}
```

这里的 `budget = 8` 表示：

当一批工作持续执行大约 8ms，就尝试让出主线程。

为什么不是 50ms？

因为我们希望尽量为输入处理和浏览器渲染保留空间，而不仅仅是避免触发 Long Task 的 50ms 阈值。

当然，8ms 不是所有设备与任务都适用的标准。

实际开发中需要权衡：

- 每次让出任务都有一定调度开销。
- 让出太频繁可能让整体计算完成得更晚。
- 单项计算如果本身就需要 100ms，那么循环外层再频繁检查也无法中断这个计算。
- 8ms 只是当前 JS 分片的时间预算，不意味着剩余的浏览器帧时间必然足够。

因此，优化目标应该是：

**在计算吞吐量和交互响应速度之间取得平衡。**

### 一个很容易犯的错误：forEach + async

不要这样写：

```js
items.forEach(async (item) => {
  await yieldToMain();

  processItem(item);
});
```

因为 `forEach` 不会等待每个异步回调完成。

循环会快速安排多个异步回调，而不是按照预期依次处理并等待全部工作结束。

对于需要顺序执行和控制分片的任务，应该使用：

```js
for (const item of items) {
  processItem(item);

  await yieldToMain();
}
```

如果确实需要结果数组和时间预算，则使用前面完整的 `processProducts()` 实现。

---

## 七、方案三：requestAnimationFrame 适合长任务吗？

上一课讲过 `requestAnimationFrame`。

它通常适合：

- 动画位置更新。
- 与下一帧相关的视觉状态修改。
- 必须在绘制前执行的少量计算。

但它不应该被简单当成通用的任务让出工具。

例如：

```js
button.addEventListener("click", () => {
  button.textContent = "处理中...";

  requestAnimationFrame(() => {
    heavyCalculation();
  });
});
```

你可能以为：

“按钮先更新，再执行计算，这样用户就能先看到 Loading 状态了。”

但这段代码有问题。

`requestAnimationFrame` 回调是在浏览器下一次绘制前执行的。

如果 `heavyCalculation()` 需要 300ms，那么它可能直接阻塞那一帧，导致 Loading 状态依然无法及时呈现。

Google 在 INP 的实验教程中特别展示了：把一个耗时任务移到 rAF 回调中，并不会消除交互延迟，反而可能把耗时体现为 Presentation Delay。

所以需要区分：

| API | 主要用途 |
|---|---|
| `requestAnimationFrame` | 协调下一次绘制前的视觉更新 |
| `scheduler.yield()` | 主动让出当前任务，稍后继续 |
| `setTimeout` | 安排未来的定时器任务 |
| `queueMicrotask()` | 当前任务结束后尽快处理微任务 |
| Web Worker | 将适合的计算移动到独立工作线程 |

不要因为 API 名称里包含“异步”或“下一帧”，就认为它一定能降低主线程阻塞。

---

## 八、方案四：Web Worker，真正让计算离开主线程

到目前为止，`setTimeout` 和 `scheduler.yield()` 解决的是同一类问题：

**把长任务拆成多个任务，允许浏览器在任务之间处理其他工作。**

但这些计算本身仍然发生在主线程。

如果一项计算总共需要 500ms，即使分成 50 个任务，CPU 计算本身并不会因此消失，反而还会增加一定调度开销。

那么有没有办法让这 500ms 的计算不再占用主线程？

有。

使用 **Web Worker**。

### 1. Web Worker 的基本原理

Web Worker 允许网页创建独立的工作线程执行 JavaScript。

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 208" width="100%">
    <rect x="10" y="8" width="145" height="164" rx="10" stroke="#3b82f6" strokeOpacity=".6" fill="#3b82f6" fillOpacity=".08"/>
    <rect x="185" y="8" width="145" height="164" rx="10" stroke="#0d9488" strokeOpacity=".6" fill="#0d9488" fillOpacity=".08"/>
    <text x="82" y="29" fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">Main Thread</text>
    <text x="258" y="29" fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">Worker Thread</text>
    {#each [{y:48,t:"DOM / UI"},{y:82,t:"用户事件"},{y:116,t:"页面渲染"}] as n}
      <rect x="27" y={n.y} width="111" height="27" rx="5" fill="#3b82f6" fillOpacity=".16"/>
      <text x="82" y={n.y+17} textAnchor="middle" fontSize="11" fill="currentColor">{n.t}</text>
    {/each}
    {#each [{y:48,t:"数据处理"},{y:82,t:"复杂算法"},{y:116,t:"计算结果"}] as n}
      <rect x="202" y={n.y} width="111" height="27" rx="5" fill="#0d9488" fillOpacity=".16"/>
      <text x="257" y={n.y+17} textAnchor="middle" fontSize="11" fill="currentColor">{n.t}</text>
    {/each}
    <path d="M144 62 H196 l-6-4 m 6 4 -6 4" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
    <path d="M196 132 H144 l6-4 m-6 4 6 4" stroke="#0d9488" strokeWidth="1.5" fill="none"/>
    <text x="170" y="185" fontSize="10" textAnchor="middle" fill="currentColor">通过 postMessage 交换数据</text>
    <text x="170" y="199" fontSize="9.5" textAnchor="middle" fill="currentColor" opacity=".65">Worker 不能直接操作页面 DOM</text>
  </svg>
</box>

两者主要通过 `postMessage()` 交换数据。

Worker 可以进行独立计算，但无法直接使用 `document.querySelector()` 这样的 DOM API。

### 2. 一个实际代码案例

假设我们要给商品计算推荐分数。

创建两个文件。

**main.js**

```js
const worker = new Worker("./recommendation.worker.js");

worker.postMessage({
  products: [
    { id: 1, price: 100 },
    { id: 2, price: 200 },
    { id: 3, price: 150 }
  ]
});

worker.onmessage = (event) => {
  console.log("计算结果：", event.data);
};
```

**recommendation.worker.js**

```js
self.onmessage = (event) => {
  const { products } = event.data;

  const results = products.map((product) => ({
    ...product,
    score: Math.sqrt(product.price) * 10
  }));

  self.postMessage(results);
};
```

执行流程：

```text
主线程
  ↓
创建 Worker
  ↓
发送商品数据
  ↓
Worker 独立计算
  ↓
发送计算结果
  ↓
主线程更新 UI
```

这样，计算过程可以不再持续占用页面主线程。

不过要注意：

- 创建 Worker 本身存在开销。
- 大量数据的序列化和传输存在开销。
- Worker 不能直接修改 DOM。
- 大型数据可以考虑 transferable objects，降低不必要的复制成本。
- Worker 脚本需要满足浏览器的资源加载和安全限制。

所以 Web Worker 更适合**相对耗时、与 DOM 无关的计算密集型任务**，例如复杂商品排序、搜索索引计算或大量数据分析。

一个只有 2ms 的计算没有必要为了使用 Worker 而增加通信与维护成本。

---

## 九、把任务调度应用到 Shopify 商品变体切换

现在把今天的知识应用到一个完整的电商场景。

假设用户在商品详情页切换颜色或尺寸。

我们需要完成以下操作：

1. 更新商品价格。
2. 更新库存和购买按钮状态。
3. 更新商品图片。
4. 重新计算相关商品推荐。
5. 更新推荐区域。

其中前面三项通常是用户立即需要看到的结果。

第 4、5 项不一定必须在同一个同步任务中完成。

### 1. 一种不合理的实现

```js
function onVariantChange(variant) {
  updatePrice(variant);
  updateAvailability(variant);
  updateProductImage(variant);

  // 这里假设是 CPU 密集型计算
  const recommendations = calculateRecommendations(variant);

  updateRecommendations(recommendations);
}
```

假设：

- 前三项只需要 5ms。
- 推荐计算需要 250ms。
- 推荐 DOM 更新需要 20ms。

整个同步回调就可能持续约 275ms。

由于 JavaScript 长时间占用主线程，前面已经修改的价格和库存状态也可能无法及时绘制。

于是用户的感受变成：

“我已经点击了颜色，但页面过了很久才变化。”

实际上，价格的计算可能非常快。

拖慢它的是后面不相关的推荐计算。

### 2. 优化：先处理核心交互，再执行非关键工作

我们可以这样组织：

```js
let updateVersion = 0;

async function onVariantChange(variant) {
  const currentVersion = ++updateVersion;

  // 第一阶段：重要且轻量的 UI 更新
  updatePrice(variant);
  updateAvailability(variant);
  updateProductImage(variant);

  // 让出主线程
  await yieldToMain();

  // 检查用户是否又选择了其他变体
  if (currentVersion !== updateVersion) return;

  // 第二阶段：分片计算推荐内容
  const recommendations = await processProducts(
    recommendationProducts,
    (product) => calculateScore(product, variant),
    8
  );

  if (currentVersion !== updateVersion) return;

  // 第三阶段：更新推荐区域
  updateRecommendations(recommendations);
}
```

这里 `recommendationProducts` 是已准备好的候选商品数组，`calculateScore` 为业务评分函数，其余 UI 函数代表已有的 Theme 实现。

`processProducts()` 和 `yieldToMain()` 使用前面介绍的实现。

这段代码带来三个改善：

**第一，先完成关键状态更新。**

价格、库存、主图不必因为非关键推荐计算而一直等待。让出后，浏览器也获得了处理渲染的机会，但不保证必须先绘制。

**第二，推荐计算被拆成短任务。**

当用户继续操作页面时，浏览器可能在各个分片之间处理输入。

**第三，避免过期结果覆盖最新状态。**

假设用户连续选择：

```text
红色 → 蓝色 → 黑色
```

如果红色对应的推荐计算最后才完成，它不应该覆盖黑色变体的推荐结果。

`updateVersion` 就是用来避免旧结果提交到 UI。

但要注意，版本检查只会阻止旧结果更新页面，并不一定停止已经开始的计算。如果数据量很大，可以进一步在分片循环中使用 `AbortSignal` 检查取消状态，从而减少无效计算。

#### 这里还有一个更高级的架构思路

假如推荐计算本来就非常复杂，单纯在主线程中分片仍然消耗 CPU。

可以进一步升级：

```text
商品变体切换
      ↓
同步更新核心 UI
      ↓
发送推荐任务给 Worker
      ↓
主线程继续响应用户
      ↓
Worker 返回推荐结果
      ↓
只渲染最新变体的推荐内容
```

这就把**任务优先级、任务拆分、后台线程、过期任务管理**结合了起来。

对于复杂商品详情页，这是一种值得了解的设计模式。

不过，对一般的 Shopify Theme，优先检查是否真的需要客户端进行复杂推荐计算。能由服务端预先提供、缓存或避免计算的工作，通常不必为了使用 Worker 而专门移到浏览器执行。

Shopify 最新的 Theme 性能实践也重点强调减少无用 JS、延后非关键任务、按需加载交互代码以及审查第三方 App 对主线程的占用。

---

## 十、怎么证明长任务优化真的有效？

前面讲的优化手段，并不是做了就一定有效。

尤其是任务分片：

它可能降低输入等待时间，但不一定降低计算总耗时，甚至可能让全部结果完成得更晚。

所以我们必须分别衡量两个指标：

- **计算整体完成时间**：处理全部数据到底需要多久？
- **交互响应时间**：计算期间，用户输入能否被及时处理并呈现？

这两个目标不完全相同。

### 1. 使用 PerformanceObserver 观察长任务

Chrome 等支持 Long Tasks API 的浏览器可以使用：

```js
if (
  PerformanceObserver.supportedEntryTypes.includes("longtask")
) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log({
        start: entry.startTime.toFixed(2),
        duration: entry.duration.toFixed(2)
      });
    }
  });

  observer.observe({
    type: "longtask",
    buffered: true
  });
}
```

当观察到长任务时，你可以查看开始时间与持续时间。

但这个 API 的记录并不能直接告诉你究竟是哪一个 JavaScript 函数耗费了全部时间。

定位具体函数，通常需要结合 Chrome DevTools 的 Performance 面板。

### 2. Chrome Performance 面板应该看什么？

先录制一次交互。

重点关注：

| 检查内容 | 如何解读 |
|---|---|
| Main 轨道的长任务 | 哪段时间主线程连续被占用 |
| JavaScript 调用栈 | 哪些函数消耗 CPU |
| Interactions 轨道 | 用户输入是否被阻塞 |
| Input Delay | 是否等待其他任务完成 |
| Processing Duration | 事件处理本身是否过重 |
| Presentation Delay | 事件处理结束后是否迟迟无法绘制 |

Google 的实践教程也建议从交互的三个阶段出发，再定位到具体的长动画帧和调用栈。

### 3. 一个完整的优化前后对比

假设我们测得以下模拟结果：

| 指标 | 优化前 | 优化后 |
|---|---:|---:|
| 最大连续 JS 任务 | 280ms | 12ms |
| 全部计算完成 | 280ms | 330ms |
| 某次点击响应 | 240ms | 35ms |
| 页面交互体验 | 明显卡顿 | 更流畅 |

这组数据不是实测结果，而是用来说明一种重要现象：

**优化后的总计算时间反而增加了，但用户体验明显改善。**

原因是用户不在乎推荐计算有没有在 280ms 内一次性完成。

用户更在乎：

- 点击按钮是否立即有反馈。
- 商品变体能否及时切换。
- 页面滚动是否流畅。
- 购物车是否能正常操作。

从性能工程角度讲，这就是在优化任务的调度和响应性，而不仅仅是优化单个函数的执行时间。

---

## 十一、如何选择不同的任务调度方案？

经过这一课，现在可以建立一个选择模型：

| 场景 | 优先考虑 |
|---|---|
| 只需要在当前 JS 任务结束后执行一点逻辑 | `queueMicrotask` |
| 想让主线程有机会处理其他工作 | `scheduler.yield()` |
| 需要兼容性较好的任务级让出 | `setTimeout` 后备方案 |
| 需要在下一帧绘制前修改视觉状态 | `requestAnimationFrame` |
| 需要安排具有明确优先级的任务 | `scheduler.postTask()`（检查兼容性） |
| 大量复杂 CPU 计算 | Web Worker |
| 用户输入频繁，重复操作可合并 | debounce / throttle |
| 某项工作对当前视图没有必要 | 不执行、延后或按需加载 |

注意，有时候性能优化的最佳方案不是换一种 API，而是**根本不要执行不必要的任务**。

比如一个 Shopify 商品页为了初始化一个用户可能永远不会打开的评论弹窗，在首屏就下载、解析和执行几百 KB 的 JavaScript。

这时候，比起使用 `scheduler.yield()` 分片初始化，更合理的方案可能是：

只有当用户滚动到评论区域或触发相关交互时，才加载必要的代码。

而对于正在执行的昂贵交互逻辑，也不能盲目应用 debounce，否则可能引入额外等待。

---

## 十二、本课总结：真正理解 JavaScript 性能优化

我们今天把浏览器事件循环和主线程性能串起来了。

最重要的知识有六个：

1. **JavaScript 同步代码通常不会被普通用户事件直接抢占。** 当前任务越长，其他工作可能等待得越久。
2. **微任务并不是新线程。** `Promise.then()`、`queueMicrotask()` 不能代替任务级让出。
3. **Long Task 的 50ms 是诊断阈值，而不是流畅性的绝对标准。**
4. **`scheduler.yield()` 允许主动分片执行。** 它能改善响应机会，但不会自动减少总计算量，也不保证每次让出都会绘制。
5. **`requestAnimationFrame` 负责与渲染时机协作，不负责自动消除长任务。**
6. **Web Worker 可以把计算移出主线程。** 但需要考虑通信、内存和线程创建成本。

把前四课放在一起，你现在应该建立起一条相对完整的性能分析路径：

```text
页面慢
   │
   ├── 网络与资源获取？
   │       └── DNS、连接、请求、缓存
   │
   ├── 浏览器首次显示慢？
   │       └── HTML、CSS、JS 阻塞关系
   │
   ├── 渲染计算慢？
   │       └── Style、Layout、Paint、Composite
   │
   └── 用户操作卡顿？
           └── Task、Microtask、Long Task
                  ├── 减少工作
                  ├── 分片执行
                  ├── 调整优先级
                  └── Worker
```

## 参考资料

- [Measuring Interaction to Next Paint (INP) | web.dev](https://web.dev/codelabs/measuring-inp?hl=en)
- [Optimize Interaction to Next Paint | web.dev](https://web.dev/articles/optimize-inp)
- [Optimize long tasks | web.dev](https://web.dev/articles/optimize-long-tasks?hl=en)
- [Measuring Interaction to Next Paint (INP) | web.dev](https://web.dev/codelabs/measuring-inp)
- [Understanding Interaction to Next Paint (INP) | web.dev](https://web.dev/codelabs/understanding-inp?authuser=75&hl=en)
- [Interaction to Next Paint (INP) | web.dev](https://web.dev/articles/inp?authuser=6)
- [Understanding Interaction to Next Paint (INP) | web.dev](https://web.dev/codelabs/understanding-inp?authuser=1&hl=en)
- [Manually diagnose slow interactions in the lab | web.dev](https://web.dev/articles/manually-diagnose-slow-interactions-in-the-lab?authuser=10)
- [content/files/en-us/web/api/scheduler/yield/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/api/scheduler/yield/index.md?plain=1)
- [web.dev/src/site/content/en/how-to-optimize-inp/optimize-input-delay/index.md at main · GoogleChrome/web.dev · GitHub](https://github.com/GoogleChrome/web.dev/blob/main/src/site/content/en/how-to-optimize-inp/optimize-input-delay/index.md)
- [content/files/en-us/web/api/prioritized_task_scheduling_api/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/api/prioritized_task_scheduling_api/index.md?plain=1)
- [Scheduler: yield() method - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield?trk=public_post_comment-text)
- [Using microtasks in JavaScript with queueMicrotask() - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
- [In depth: Microtasks and the JavaScript runtime environment - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth)
- [Using Web Workers - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [Use scheduler.yield() to break up long tasks | Blog | Chrome for Developers](https://developer.chrome.com/blog/use-scheduler-yield?hl=en)
- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [Remove or optimize apps causing render-blocking issues](https://shopify.dev/docs/storefronts/themes/best-practices/performance/remove-render-blocking-apps)
- [Audit and remove third-party scripts](https://shopify.dev/docs/storefronts/themes/best-practices/performance/audit-remove-third-party-scripts)
- [Use defer and async on non-critical scripts](https://shopify.dev/docs/storefronts/themes/best-practices/performance/defer-scripts)
- [Debugging performance with metric gaps](https://shopify.dev/docs/storefronts/themes/best-practices/performance/performance-gaps)
- [The Shopify platform](https://shopify.dev/docs/storefronts/themes/best-practices/performance/platform)
- [Shopify Help Center | Improving your online store performance](https://help.shopify.com/en/manual/online-store/web-performance/improving-web-performance)
