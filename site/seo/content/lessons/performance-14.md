# 大型页面与列表性能优化：分页、无限滚动、虚拟列表与 Shopify 集合页


今天我们要解决一个非常典型的电商问题：

**假设一个 Shopify Collection 有 1000 个商品，每个商品卡片包含图片、标题、价格、颜色选项、促销标签及交互按钮，怎样设计才能同时保证加载速度、滚动流畅和筛选排序性能？**

前面学习了 DOM、Layout、Paint、JavaScript、图片懒加载和 CSS `content-visibility`。

这节课将把它们组合起来，并引入三个重要概念：

- **Pagination（分页）：** 控制每次从服务端获取多少商品。
- **Infinite Scroll（无限滚动）：** 用户向下滚动时，逐步获取后续商品。
- **Virtualization（虚拟列表）：** 无论用户滚动到哪里，都尽量只保留当前需要展示的一小部分 DOM。

你需要先记住一个核心区别：

**减少数据获取量、减少 DOM 节点数量、减少浏览器渲染工作，是三种不同的性能优化。**

---

## 一、1000 个商品为什么可能让浏览器变慢？

假设每个商品卡片对应下面的 HTML：

```html
<article class="product-card">
  <a href="/products/shoes">
    <img src="shoes.webp" alt="运动跑鞋">
    <h3>运动跑鞋</h3>
  </a>

  <div class="price">
    <span>¥399</span>
    <del>¥499</del>
  </div>

  <div class="colors">
    <button>白色</button>
    <button>黑色</button>
  </div>

  <button class="add-to-cart">
    加入购物车
  </button>
</article>
```

一个看起来简单的商品卡片，实际可能有二十多个 DOM 节点。

如果页面一次输出 1000 个卡片：

\[
1000\times20=20000
\]

仅商品卡片就可能带来约 20,000 个 DOM 节点，还不包括筛选器、Header、Footer、营销组件等。

这会在多个阶段增加工作。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">大型列表的性能成本来自哪里？</text>
  <box gap={2}>
    {#each [
      {name:"服务端",desc:"获取商品数据、Liquid 循环、生成 HTML"},
      {name:"网络",desc:"传输大量 HTML、图片及其他资源"},
      {name:"DOM",desc:"解析并维护大量节点"},
      {name:"Style / Layout",desc:"计算网格、图片、标题和价格的布局"},
      {name:"JavaScript",desc:"初始化组件、监听事件和更新状态"},
      {name:"内存",desc:"维护 DOM、JS 对象、图片资源与渲染数据"}
    ] as item,i}
      <row align="center" gap={3}>
        <box background="surface-secondary" radius="md" size="31px" align="center" justify="center">
          <text weight="medium" size="xs">{i+1}</text>
        </box>
        <box flex="1" gap="2px">
          <text weight="medium" size="sm">{item.name}</text>
          <text color="secondary" size="xs">{item.desc}</text>
        </box>
      </row>
    {/each}
  </box>
</box>

这里特别需要纠正一个常见误解：

**DOM 节点多，不意味着浏览器每一帧都会重新计算全部 DOM。**

浏览器有样式失效追踪、布局范围限制、屏幕外绘制优化等机制。

一个包含 20,000 个节点但很少变化的页面，不一定比一个只有 1000 个节点、却持续触发强制同步布局的页面更卡。

所以 DOM 数量是重要线索，但不是唯一决定因素。

对于大型列表，我们要具体区分三种情况：

| 问题 | 可能的主要原因 |
|---|---|
| 首次打开很慢 | HTML、图片、JS、初始 DOM 和布局成本 |
| 滚动时掉帧 | 绘制、复杂布局、主线程任务、图片解码 |
| 筛选排序卡顿 | 处理大量数据、重建 DOM、同步布局 |

不同的问题需要不同的解决方案。

---

## 二、第一种方案：Pagination（分页）

对于 Shopify Collection，**我首先推荐考虑原生分页，而不是直接实现虚拟列表。**

假设集合中有 1000 个商品。

每页显示 24 个：

\[
\left\lceil\frac{1000}{24}\right\rceil=42
\]

我们只需要让浏览器在第一页处理 24 个商品卡片，而不是全部 1000 个。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">一次输出全部商品 vs 分页</text>
  <grid columns={2} gap={3}>
    <grid-item>
      <box gap={2}>
        <text size="sm" weight="medium" textAlign="center">一次输出 1000 个</text>
        <grid columns={8} gap="2px">
          {#each Array.from({length:80},(_,i)=>i) as i}
            <grid-item>
              <box height="10px" radius="2xs" background="#d97706"/>
            </grid-item>
          {/each}
        </grid>
        <text size="xs" color="secondary" textAlign="center">全部商品对应的 HTML 和 DOM 一次进入页面</text>
      </box>
    </grid-item>
    <grid-item>
      <box gap={2}>
        <text size="sm" weight="medium" textAlign="center">每页只输出 24 个</text>
        <grid columns={8} gap="2px">
          {#each Array.from({length:80},(_,i)=>i) as i}
            <grid-item>
              <box height="10px" radius="2xs" background={i<24?"#0d9488":"surface-tertiary"}/>
            </grid-item>
          {/each}
        </grid>
        <text size="xs" color="secondary" textAlign="center">首屏只需要当前页的商品，后续页面单独获取</text>
      </box>
    </grid-item>
  </grid>
  <caption>示意图中的每个小方块代表一个商品，未按实际节点数量绘制。</caption>
</box>

### 1. Shopify Liquid 原生分页

最基本的代码：

```liquid
{% paginate collection.products by 24 %}

  <div class="product-grid">
    {% for product in collection.products %}
      {% render 'product-card', product: product %}
    {% endfor %}
  </div>

  {{ paginate | default_pagination }}

{% endpaginate %}
```

这是一个非常重要的 Shopify 特性：

**`paginate` 不只是把已经全部获取的商品在浏览器中分成几组，它参与 Shopify 服务端的数据分页。**

相比先获取完整集合数据、再让浏览器执行 `slice()`，它能够控制当前请求需要处理的商品范围。

Shopify 当前 `paginate` 支持每页 1～250 项，但官方对大集合的性能建议是通常使用 12～24 个商品，50 个可以作为较常见的较高页大小，而不是因为允许 250 就必须设置到 250。

### 2. 为什么不使用 JavaScript 分页？

例如：

```js
const allProducts = await fetchAllProducts();

const currentPageProducts = allProducts.slice(0, 24);
```

这种做法可能只是减少了页面当前渲染的商品数量。

但如果 `fetchAllProducts()` 已经获取了全部 1000 个商品，那么：

- 网络仍然需要传输大量数据。
- JavaScript 仍然需要解析全部数据。
- 浏览器仍然需要保存完整商品对象集合。
- 你还可能需要自行解决产品数据分页、库存和价格等正确性问题。

因此对 Shopify 的普通集合页，通常应优先使用服务端分页。

### 3. 每页 24 个是不是绝对最佳？

不是。

商品卡片的复杂度不同，最佳页大小也不同。

例如：

- 只有主图、标题、价格的卡片比较轻。
- 带多图画廊、多个变体选择器、视频和复杂交互的卡片比较重。

对于前者，一页 36 个商品可能没有明显问题。

对于后者，一页 12～24 个可能更容易控制性能。

需要通过 DevTools 测量，而不是机械照搬固定数字。

---

## 三、第二种方案：Infinite Scroll（无限滚动）

分页能够有效控制初始商品数量。

但有些电商网站希望用户不用点击“下一页”，只要往下滚动，就能继续加载商品。

于是就有了无限滚动。

它的核心流程是：

```text
进入集合页
    ↓
加载第一页 24 个商品
    ↓
用户向下滚动
    ↓
接近页面底部
    ↓
请求第二页
    ↓
把第二页商品追加到原网格
    ↓
继续滚动
    ↓
请求第三页……
```

### 1. 无限滚动解决了什么？

它主要解决：

**不必在首次加载时获取和渲染全部商品，同时能够连续浏览后续内容。**

例如用户最终只看前 30 个商品，那么可能只需要加载前两页。

不会为了这一次访问下载全部 1000 个。

### 2. 但无限滚动并不等于虚拟列表

假设：

第一页：

```text
24 个商品节点
```

第二页：

```text
48 个商品节点
```

第十页：

```text
240 个商品节点
```

第四十页：

```text
960 个商品节点
```

因为传统无限滚动通常采用：

```js
grid.append(...newProductElements);
```

已经加载的商品 DOM 不会自动被删除。

所以 DOM 数量仍然会随着用户滚动而增加。

Google 的长列表优化指南也特别区分：无限滚动减少的是初始加载，而不一定能长期控制 DOM 数量。

这是今天最重要的区别之一。

---

## 四、IntersectionObserver：怎样判断应该加载下一页？

早期的无限滚动经常这样实现：

```js
window.addEventListener("scroll", () => {
  const distance =
    document.documentElement.scrollHeight -
    window.scrollY -
    window.innerHeight;

  if (distance < 300) {
    loadNextPage();
  }
});
```

它确实能够实现功能。

但 `scroll` 事件可能频繁触发，而且如果每次都读取布局相关属性、进行复杂计算，可能增加主线程工作量。

更推荐使用 `IntersectionObserver` 来观察一个页面底部的哨兵元素（Sentinel）。

HTML：

```html
<div class="product-grid">
  <!-- 当前页商品 -->
</div>

<div id="load-more-sentinel"></div>
```

JS：

```js
const sentinel = document.querySelector(
  "#load-more-sentinel"
);

const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      loadNextPage();
    }
  },
  {
    rootMargin: "400px 0px"
  }
);

observer.observe(sentinel);
```

浏览器会在哨兵元素进入观察范围时调用回调。

这里的：

```js
rootMargin: "400px 0px"
```

表示在垂直方向上将观察区域向外扩展 400px。

所以用户不必真正滚动到底部才开始加载，可以提前准备下一页。

这是一种基于浏览器可见区域观察机制的实现，比在每个滚动事件中反复测量位置更适合很多无限滚动场景。

不过，这段代码只是基本原理，不能直接用于生产。

因为 `IntersectionObserver` 可能多次触发。

如果没有控制请求状态，可能同时请求第二页很多次。

生产实现还需要：

- 防止重复加载。
- 正确判断是否还有下一页。
- 处理请求失败和重试。
- 筛选条件变化时重置列表。
- 处理浏览器历史及滚动位置。

我们后面把它与 Shopify Section Rendering API 结合起来。

---

## 五、第三种方案：Virtualization（虚拟列表）

现在我们进入本课最有技术深度的部分。

假设用户需要在一个包含 10,000 条记录的管理后台中持续滚动。

即使使用无限滚动，用户看过的节点仍然可能逐渐累积。

那有没有办法使 DOM 数量始终保持在一个较小的范围内？

有，就是虚拟列表。

### 1. 虚拟列表到底是什么？

它的原理是：

**数据可以有很多条，但真正存在于 DOM 中的，只保留当前可见区域及其附近的少量元素。**

例如一共有 1000 条记录，但视口一次只能显示 6 条。

我们可以只渲染 10～14 条，包括视口外的少量缓冲元素。

当用户滚动时，更新 DOM 中对应的内容。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">完整列表与虚拟列表</text>
  <grid columns={2} gap={3}>
    <grid-item>
      <box gap={2}>
        <text weight="medium" size="sm" textAlign="center">传统列表</text>
        <box border radius="lg" padding={2} gap="3px">
          {#each Array.from({length:15},(_,i)=>i) as i}
            <box background={i>=5&&i<=9?"#64748b":"surface-tertiary"} height="15px" radius="2xs" align="center"/>
          {/each}
        </box>
        <text color="secondary" size="xs" textAlign="center">所有已加载项长期保留 DOM</text>
      </box>
    </grid-item>
    <grid-item>
      <box gap={2}>
        <text weight="medium" size="sm" textAlign="center">虚拟列表</text>
        <box border radius="lg" padding={2} gap="3px">
          <box height="60px" border={{size:1,color:"subtle",style:"dashed"}} radius="sm" align="center" justify="center">
            <text size="xs" color="secondary">顶部占位</text>
          </box>
          {#each Array.from({length:5},(_,i)=>i) as i}
            <box background="#0d9488" height="20px" radius="2xs"/>
          {/each}
          <box height="60px" border={{size:1,color:"subtle",style:"dashed"}} radius="sm" align="center" justify="center">
            <text size="xs" color="secondary">底部占位</text>
          </box>
        </box>
        <text color="secondary" size="xs" textAlign="center">只保留可见窗口及缓冲区</text>
      </box>
    </grid-item>
  </grid>
  <caption>概念示意。实际虚拟列表通常使用占位容器或绝对定位保持正确滚动高度。</caption>
</box>

### 2. 虚拟列表为什么需要占位元素？

假设有 1000 条记录，每条高度 100px。

理论总高度：

\[
1000\times100=100000px
\]

如果只把可见的 10 条记录渲染到 DOM：

```text
10 × 100px = 1000px
```

浏览器就会认为整个列表只有约 1000px 高。

用户无法滚动到原本第 1000 条记录的位置。

所以虚拟列表通常要通过顶部、底部占位空间或整体绝对定位容器，维持完整的滚动范围。

例如：

```text
顶部占位：45000px
当前真实 DOM：1000px
底部占位：54000px
```

加起来仍然是：

```text
100000px
```

于是浏览器能够保留正确的滚动条范围，同时只需要维护少量实际列表项。

---

## 六、虚拟列表的核心算法

我们以一个**固定高度的单列列表**为例。

假设：

```js
const total = 1000;       // 总数据量
const itemHeight = 100;   // 单项高度
const viewportHeight = 600;
const overscan = 2;       // 上下额外渲染 2 项
```

如果页面当前滚动距离为：

```js
const scrollTop = 2000;
```

可以计算当前最先可见的项：

```js
const visibleStart = Math.floor(
  scrollTop / itemHeight
);
```

得到：

```text
20
```

再考虑上方缓冲两项：

```js
const startIndex = Math.max(
  0,
  visibleStart - overscan
);
```

得到：

```text
18
```

下方则按照当前可见高度和缓冲大小计算结束位置：

```js
const endIndex = Math.min(
  total,
  Math.ceil(
    (scrollTop + viewportHeight) / itemHeight
  ) + overscan
);
```

于是：

```text
startIndex = 18
endIndex = 28
```

真实 DOM 只需要展示索引 18～27 对应的十条记录。

这就是固定高度虚拟列表最核心的数学原理。

### 交互实验：滚动位置如何决定需要渲染哪些节点？

{@body const [scrollY,setScrollY] = DIL.useState(0)}
{@body const totalRows = 1000}
{@body const itemHeight = 100}
{@body const viewHeight = 600}
{@body const overscan = 2}
{@body const firstVisible = Math.floor(scrollY/itemHeight)}
{@body const startIndex = Math.max(0,firstVisible-overscan)}
{@body const endIndex = Math.min(totalRows,Math.ceil((scrollY+viewHeight)/itemHeight)+overscan)}
{@body const renderedCount = endIndex-startIndex}
<box border radius="xl" padding={3} gap={3}>
  <row justify="between" align="center">
    <text weight="medium">虚拟列表渲染范围模拟器</text>
    <text size="xs" color="secondary">1000 条数据</text>
  </row>
  <box gap={1}>
    <row align="center" justify="between">
      <label>模拟 scrollTop</label>
      <title size="md" tabularNums>{scrollY.toLocaleString()}px</title>
    </row>
    <slider min={0} max={99400} step={100} value={scrollY} onChange={setScrollY}/>
    <row justify="between">
      <text size="xs" color="secondary">列表顶部</text>
      <text size="xs" color="secondary">列表底部</text>
    </row>
  </box>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={1}>
        <text color="secondary" size="xs">数据总量</text>
        <title size="xl" tabularNums>1000</title>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={1}>
        <text color="secondary" size="xs">实际渲染项数</text>
        <title size="xl" color="success" tabularNums>{renderedCount}</title>
      </box>
    </grid-item>
  </grid>
  <box gap={1}>
    <row justify="between" align="center">
      <text size="sm">当前渲染范围（从 1 开始）</text>
      <text weight="medium" size="sm" tabularNums>{startIndex+1} ～ {endIndex}</text>
    </row>
    <box border radius="lg" padding={2} gap={1}>
      {#each Array.from({length:renderedCount},(_,i)=>startIndex+i) as i}
        <row key={i} gap={2} align="center" background={i>=firstVisible&&i<firstVisible+6?"rgba(13,148,136,.1)":"surface-secondary"} radius="sm" padding={2}>
          <box background={i>=firstVisible&&i<firstVisible+6?"#0d9488":"#94a3b8"} size="10px" radius="sm"/>
          <text size="xs">Item #{i+1}</text>
          <spacer/>
          <text size="2xs" color="secondary">{i>=firstVisible&&i<firstVisible+6?"可见区域":"缓冲区域"}</text>
        </row>
      {/each}
    </box>
  </box>
  <text color="secondary" size="xs">假设每项 100px、视口 600px、上下各缓冲 2 项。拖动滑块可以观察：数据总量不变，但需要的 DOM 范围不断改变。</text>
</box>

这种方案可以让主线程处理的 DOM 节点数量更加稳定。

Google 的虚拟列表指南把这种模式称为 *windowing*，重点就是让真正渲染的元素数量与可见窗口规模相关，而不是与整个数据集规模同步增长。

### 3. Overscan 为什么重要？

如果用户快速向下滚动，只渲染严格可见的 6 条记录，浏览器可能来不及更新下一批内容，产生短暂空白。

因此虚拟列表通常在视口上下额外渲染几项。

例如：

```text
上方缓冲：2 条
可见区域：6 条
下方缓冲：2 条
```

这称为 Overscan。

但 Overscan 也不是越大越好。

如果为了避免空白，额外渲染 500 条记录，就失去了虚拟列表控制 DOM 数量的意义。

---

## 七、Shopify 商品网格适合直接使用虚拟列表吗？

到这里，你可能已经想把 Shopify 集合页的 1000 个商品全部改成虚拟列表。

但我反而建议你先不要这样做。

原因是：**普通 Shopify 商品网格与管理后台的大型数据表格，有一些重要区别。**

### 1. 商品卡片高度可能不同

例如：

```text
商品 A：标题一行
商品 B：标题两行
商品 C：促销标签占一行
商品 D：带颜色选项
```

这些卡片可能具有不同高度。

如果每一项的高度固定，虚拟列表算法比较简单。

但如果高度动态变化，就需要额外处理高度测量、缓存和滚动位置修正。

对于多列商品网格，还要考虑：

- 一行有几列。
- 移动端列数变化。
- 每一行实际高度是多少。
- 商品图片加载后是否改变尺寸。
- 重新排序后元素的位置如何更新。

这会明显增加实现复杂度。

### 2. 虚拟列表会移除屏幕外 DOM

这在技术上是优势，但也可能改变网页行为。

例如：

- 使用浏览器页面查找时，屏幕外商品可能根本不在 DOM 中。
- 键盘 Tab 导航可能遇到节点被回收的问题。
- 焦点和弹窗状态需要额外管理。
- 锚点链接和滚动恢复可能变复杂。
- 对依赖实际 HTML 内容的搜索引擎和辅助技术，需要专门设计可访问与可索引的替代路径。

对于电商集合页，服务器渲染的产品链接、标准分页和完整导航语义往往比较重要。

因此，**Shopify 集合页应该优先使用服务端分页，并在确有必要时考虑无限滚动或局部渲染优化，而不是默认上虚拟列表。**

虚拟列表尤其适合后台管理系统、巨大表格、日志查看器、聊天记录等真正需要长期展示大量项目的场景。

---

## 八、content-visibility 与虚拟列表到底有什么区别？

这是我们第 10 课与今天内容的交叉点。

假设页面有 1000 个商品卡片。

现在比较三种方案：

| 方案 | DOM 节点数量 | 屏幕外渲染工作 | 数据获取范围 |
|---|---|---|---|
| 全量渲染 | 很多 | 浏览器按常规优化 | 全部数据 |
| `content-visibility: auto` | 仍然很多 | 可以跳过部分内部渲染 | 不自动减少 |
| 虚拟列表 | 保持相对较少 | 只渲染当前窗口 | 可以配合按需获取 |

例如：

```css
.product-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 320px;
}
```

这并不会将前面 900 个商品卡片从 DOM 中移除。

它们仍然是 DOM 树的一部分。

只是浏览器在满足条件时，可以跳过这些元素内部暂时不必要的样式、布局等渲染工作。

而虚拟列表会直接控制哪些商品卡片元素真实存在于 DOM 中。

因此两者解决的问题并不一样。

**`content-visibility` 是渲染优化；Virtualization 是 DOM 窗口化管理。**

它们可以在合适场景中结合，但对普通 24 商品分页来说，往往不需要采用如此复杂的组合。

---

## 九、最重要的 Shopify 问题：筛选和排序到底应该在哪里执行？

现在进入本课的核心实战。

假设集合中有 1000 个商品。

当前页面只加载前 24 个。

用户选择：

```text
颜色：黑色
价格：¥200～¥500
排序：价格从低到高
```

你认为浏览器应该：

**方案 A：** 从当前 24 个商品中筛选、排序？

还是：

**方案 B：** 让 Shopify 根据整个集合的商品数据筛选、排序，然后返回匹配结果的第一页？

正确答案通常是 **B**。

为什么？

假设整个集合有 200 个黑色商品，但当前 24 个商品只有 3 个黑色商品。

如果你这样写：

```js
const filteredProducts = currentPageProducts.filter(
  (product) => product.color === "Black"
);
```

你只能得到当前 24 个商品中的 3 个。

但用户期望的是从整个集合中筛选。

这里涉及一个关键的设计问题：

**筛选和排序应该作用于完整的数据结果集，然后再分页。**

概念上：

```text
1000 个商品
      ↓
应用颜色、价格等筛选条件
      ↓
得到符合条件的 150 个商品
      ↓
按价格升序排列
      ↓
获取第一页 24 个商品
      ↓
Liquid 渲染商品卡片 HTML
      ↓
浏览器显示
```

这并不是要求 Shopify 必须在数据库里严格按照这几个物理步骤执行，而是描述用户期望的逻辑结果。

### 1. Shopify 原生已经支持这种能力

Shopify 的 Storefront Filtering 可以根据这些属性筛选：

| 类型 | 示例 |
|---|---|
| 可售状态 | 有货、缺货 |
| 价格 | 最低价、最高价 |
| 商品 Vendor / Type | 品牌、产品类型 |
| Variant Options | 颜色、尺寸 |
| Product / Variant Metafields | 材质、产地等自定义字段 |
| 商品标签及分类 | 新品、产品分类等 |

这些筛选项需要商家先在 Shopify 后台配置，并在 Theme 中实现筛选 UI。

对于支持的集合，Shopify 会通过 `collection.filters` 暴露当前适用的筛选项。

这里还有一个重要限制：

**Shopify 当前的原生集合页筛选在集合包含超过 5000 个商品时不显示筛选项。**

也就是说，1000 个商品可以讨论原生筛选，但不能假设一个 10 万商品的单一 Collection 仍然可以原样使用所有原生筛选功能。对于超大商品目录，需要重新规划集合结构、搜索体验或数据访问方案。

### 2. Shopify 的筛选条件怎样传给服务器？

通过 URL 查询参数。

例如：

```text
/collections/shoes
  ?filter.v.option.color=Black
  &filter.v.price.gte=200
  &filter.v.price.lte=500
  &sort_by=price-ascending
```

这些参数表达的含义是：

- `filter.v.option.color=Black`：按颜色选项筛选。
- `filter.v.price.gte=200`：最低价格。
- `filter.v.price.lte=500`：最高价格。
- `sort_by=price-ascending`：按价格从低到高排序。

这是为了方便阅读而换行的示例，实际 URL 会连在一起。

更重要的是，不建议在 Theme 中硬编码所有筛选参数名称。

Shopify Liquid 提供了：

```liquid
{{ filter.param_name }}
```

以及：

```liquid
{{ value.param_name }}
{{ value.value }}
```

用来输出当前筛选项对应的真实参数。

因为不同筛选类型的参数名称可能不同。

另外，跨筛选条件通常组合使用 AND 逻辑，但同一筛选条件内部不同选项的组合由筛选类型和 `filter.operator` 决定，并非所有筛选组都固定采用 OR。

### 3. 排序也是 Shopify 服务端处理

例如：

```text
?sort_by=price-ascending
```

Shopify 会根据当前集合和排序参数返回对应的商品顺序。

Liquid 提供：

```liquid
collection.sort_options
collection.sort_by
collection.default_sort_by
```

你可以根据这些对象生成排序下拉框。

例如：

```liquid
{% assign current_sort = collection.sort_by
  | default: collection.default_sort_by
%}

<select name="sort_by">
  {% for option in collection.sort_options %}
    <option
      value="{{ option.value }}"
      {% if option.value == current_sort %}
        selected
      {% endif %}
    >
      {{ option.name }}
    </option>
  {% endfor %}
</select>
```

这里还涉及一个关键问题：

**Shopify 原生集合排序只支持平台提供的排序规则，不会因为你创建了一个产品 Metafield，就自动允许按照该 Metafield 做任意全集合排序。**

例如按照自定义评分排序，如果不属于 Shopify 原生 `sort_options`，就不能仅靠：

```liquid
{{ collection.products | sort: 'rating' }}
```

实现整个大集合的正确分页排序。

因为这只能操作 Liquid 当前可用的数据范围，不能自动让 Shopify 后台按照你定义的字段重新排序完整集合。

Shopify 官方列出的集合排序方式包括手动排序、畅销、价格、标题、创建时间等规则。

---

## 十、构建一个具有原生筛选、排序、分页的 Shopify Collection

现在我们真正写一份集合页 Section。

我们先采用最可靠的方案：

**Liquid 服务端渲染 + HTML GET Form + 原生分页。**

它不依赖 JavaScript 也能够完成基本功能。

假设文件：

```text
sections/main-collection-products.liquid
```

核心代码如下：

```liquid
{% paginate collection.products by 24 %}

<section
  data-collection-root
  data-section-id="{{ section.id }}"
>

  <header>
    <h1>{{ collection.title | escape }}</h1>
  </header>

  <form
    action="{{ collection.url }}"
    method="get"
    data-collection-filter-form
  >

    {% for filter in collection.filters %}

      {% if filter.type == 'list' or filter.type == 'boolean' %}

        <fieldset>
          <legend>{{ filter.label | escape }}</legend>

          {% for value in filter.values %}
            <label>
              <input
                type="checkbox"
                name="{{ value.param_name }}"
                value="{{ value.value | escape }}"
                {% if value.active %}checked{% endif %}
              >

              {{ value.label | escape }}
              ({{ value.count }})
            </label>
          {% endfor %}
        </fieldset>

      {% endif %}

    {% endfor %}

    {% assign current_sort = collection.sort_by
      | default: collection.default_sort_by
    %}

    <label for="CollectionSort">
      排序
    </label>

    <select
      id="CollectionSort"
      name="sort_by"
    >
      {% for option in collection.sort_options %}
        <option
          value="{{ option.value }}"
          {% if option.value == current_sort %}selected{% endif %}
        >
          {{ option.name | escape }}
        </option>
      {% endfor %}
    </select>

    <button type="submit">
      应用筛选与排序
    </button>

  </form>

  <p data-results-count>
    {{ collection.products_count }} 件商品
  </p>

  <div class="product-grid" data-product-grid>

    {% for product in collection.products %}

      <article class="product-card">
        <a href="{{ product.url }}">

          {% if product.featured_image %}
            {% liquid
              assign image_loading = 'lazy'
              if forloop.index <= 4
                assign image_loading = 'eager'
              endif
            %}

            {{
              product.featured_image
              | image_url: width: 800
              | image_tag:
                loading: image_loading,
                widths: '200, 300, 400, 600, 800',
                sizes: '(min-width: 1200px) 25vw, 50vw'
            }}
          {% endif %}

          <h3>{{ product.title | escape }}</h3>

        </a>

        <p>{{ product.price | money }}</p>
      </article>

    {% endfor %}

  </div>

  <nav aria-label="商品分页" data-pagination>
    {{ paginate | default_pagination }}
  </nav>

</section>

{% endpaginate %}
```

这里的示例实现了列表和布尔筛选项；价格区间需要另外输出 `filter.min_value.param_name`、`filter.max_value.param_name` 对应的输入框。

另外，`sizes` 只是一个简单的网格示例，实际项目还要根据容器宽度和列间距调整。

#### 这段代码为什么有性能优势？

首先，每次请求由 Shopify 根据筛选和排序条件确定当前商品结果。

其次，Liquid 只输出当前分页中的 24 个商品。

再次，图片通过响应式候选尺寸和合理的懒加载策略减少不必要的资源负担。

最后，即使 JavaScript 加载失败，用户仍然可以通过 HTML 表单和标准分页链接使用集合页。

这称为 **Progressive Enhancement（渐进增强）**。

---

## 十一、使用 Section Rendering API 实现无刷新筛选和排序

现在我们继续升级。

上一节的方案有一个特点：

提交表单会进行完整页面导航。

但我们希望用户选择筛选条件后，只更新商品集合区域。

我们可以使用：

**Shopify Section Rendering API。**

重要原则：

> 筛选和排序仍然由 Shopify 完成。JavaScript 只负责提交条件、获取服务器渲染好的 HTML，再更新 DOM。

它不是把 1000 个商品全部下载到浏览器后自行筛选。

### 1. Section Rendering API 请求是什么样？

假设 URL：

```text
/collections/shoes
  ?filter.v.option.color=Black
  &sort_by=price-ascending
```

再添加：

```text
&sections=template--123456__main
```

Shopify 就会在对应集合页面上下文中，返回指定 Section 的渲染结果。

`template--123456__main` 是举例用的 Section ID，真实 ID 应从：

```liquid
{{ section.id }}
```

读取。

尤其需要注意：

**JSON 模板中的 Section ID 通常是动态 ID，不能简单认为 Section 文件名就是 Section ID。**

### 2. JavaScript 实现

由于我们在上一节已经写了：

```html
<section
  data-collection-root
  data-section-id="..."
>
```

以及：

```html
<form data-collection-filter-form>
```

所以可以直接使用这些标记。

下面的代码包括：

- 提交筛选和排序。
- 保留 Shopify 集合上下文。
- 请求最新 Section HTML。
- 防止快速连续筛选产生竞态条件。
- 同步浏览器历史 URL。
- 支持浏览器后退和前进。
- 请求失败后回退到正常页面导航。

```js
// assets/collection-filters.js

let activeController = null;
let requestVersion = 0;

async function renderCollection(url, updateHistory) {
  const root = document.querySelector(
    "[data-collection-root]"
  );

  if (!root) return;

  const sectionId = root.dataset.sectionId;

  const currentSection = document.getElementById(
    `shopify-section-${sectionId}`
  );

  if (!currentSection) return;

  // 取消上一个尚未完成的请求
  activeController?.abort();

  const controller = new AbortController();

  activeController = controller;

  const version = ++requestVersion;

  root.setAttribute("aria-busy", "true");

  const requestUrl = new URL(url);

  requestUrl.searchParams.set(
    "sections",
    sectionId
  );

  try {
    const response = await fetch(requestUrl, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("Section 请求失败");
    }

    const sections = await response.json();
    const html = sections[sectionId];

    if (!html) {
      throw new Error("Section HTML 缺失");
    }

    const doc = new DOMParser().parseFromString(
      html,
      "text/html"
    );

    const nextSection = doc.getElementById(
      `shopify-section-${sectionId}`
    );

    if (!nextSection) {
      throw new Error("找不到新的 Section");
    }

    // 只允许最新请求更新页面
    if (version !== requestVersion) return;

    currentSection.replaceWith(nextSection);

    if (updateHistory) {
      history.pushState({}, "", url);
    }

  } catch (error) {
    if (error.name === "AbortError") return;

    // 旧请求失败时，不影响最新请求
    if (version !== requestVersion) return;

    console.error(error);

    // 保持无 JS 方案的功能正确性
    if (updateHistory) {
      window.location.assign(url.href);
    } else {
      window.location.reload();
    }

  } finally {
    if (root.isConnected) {
      root.removeAttribute("aria-busy");
    }
  }
}

// 事件委托：Section 替换后仍然生效
document.addEventListener("submit", (event) => {
  const form = event.target;

  if (
    !(form instanceof HTMLFormElement) ||
    !form.matches("[data-collection-filter-form]")
  ) {
    return;
  }

  event.preventDefault();

  const url = new URL(form.action);

  url.search = new URLSearchParams(
    new FormData(form)
  ).toString();

  // 筛选变化后从第一页开始
  url.searchParams.delete("page");

  void renderCollection(url, true);
});

// 浏览器后退/前进时恢复集合内容
window.addEventListener("popstate", () => {
  void renderCollection(
    new URL(window.location.href),
    false
  );
});
```

上面是一套教学用的核心实现，并非 Dawn 主题的完整替代品。真实项目还需要进一步处理焦点、加载状态提示、复杂筛选 UI、动态 Section 生命周期以及其他查询参数的保留策略。

#### 为什么这里使用 AbortController？

假设用户连续操作：

```text
点击黑色
    ↓
请求 A 开始
    ↓
马上点击 200～500 元
    ↓
请求 B 开始
```

可能出现：

```text
请求 B 先返回
请求 A 后返回
```

如果没有控制，页面可能最终显示请求 A 的旧筛选结果。

所以我们通过：

```js
activeController?.abort();
```

取消旧请求，并通过：

```js
if (version !== requestVersion) return;
```

防止过期响应更新页面。

这两种机制配合，可以降低竞态条件风险。

### 3. 为什么替换整个 Section，而不是只替换商品网格？

你可能会问：

“不是应该尽量减少 DOM 更新吗？为什么这里替换整个 Section？”

这是有意选择的教学实现。

因为筛选变化后，可能不仅仅商品网格发生变化：

- 筛选项的可选值和数量可能变化。
- 当前筛选条件可能变化。
- 商品结果数量可能变化。
- 排序状态可能变化。
- 分页链接需要更新。

如果只替换网格，你还要分别同步其他组件。

另外，Shopify 目前的 `{% stylesheet %}` 自动 CSS 子集化会在动态 Section HTML 中提供对应的样式内容。

**替换完整的 Section 可以避免不小心丢弃返回 HTML 中的 `<style data-section-stylesheet>`。**

当然，在一个复杂商店中，如果筛选器位于独立 Section 或具有需要保留的状态，你仍然可以针对具体组件进行局部更新。

只是那时要承担更多的状态同步、样式和生命周期管理工作。

Shopify 官方也建议在 Section Rendering API 更新后，通过事件委托或 Custom Element 生命周期管理交互逻辑，因为返回 HTML 中的脚本不会因 DOM 插入而自动执行。

---

## 十二、将无限滚动与 Shopify Section Rendering 结合

前面实现了无刷新筛选、排序。

现在再来实现无限滚动。

这次的核心需求与筛选不同：

**筛选时：替换已有商品结果。**

**加载下一页时：追加商品结果。**

二者不能混为一谈。

### 1. Liquid 提供下一页地址

在前面 `{% paginate collection.products by 24 %}` 的范围内，添加：

```liquid
{% if paginate.next %}
  <a
    href="{{ paginate.next.url }}"
    data-next-page-link
  >
    加载更多商品
  </a>

  <div
    data-next-sentinel
    aria-hidden="true"
  ></div>
{% endif %}
```

这里最重要的是：

```liquid
{{ paginate.next.url }}
```

Shopify 会生成下一页的 URL。

它比自己写：

```js
page = page + 1;
```

更可靠，因为我们不需要假设分页参数始终叫 `page`，也不必手动拼接已有筛选条件。

Shopify 的 `paginate.next` 对象返回下一页的分页信息，其 `url` 由平台生成。

### 2. JavaScript 实现

下面代码使用 `IntersectionObserver` 提前获取下一页，并追加商品卡片。

```js
function initInfiniteScroll() {
  const root = document.querySelector(
    "[data-collection-root]"
  );

  if (!root) return;

  const sectionId = root.dataset.sectionId;

  const grid = root.querySelector(
    "[data-product-grid]"
  );

  const nextLink = root.querySelector(
    "[data-next-page-link]"
  );

  const sentinel = root.querySelector(
    "[data-next-sentinel]"
  );

  if (!grid || !nextLink || !sentinel) return;

  let loading = false;

  const observer = new IntersectionObserver(
    async (entries) => {
      if (!entries[0].isIntersecting || loading) {
        return;
      }

      loading = true;

      try {
        const url = new URL(nextLink.href);

        url.searchParams.set(
          "sections",
          sectionId
        );

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("下一页加载失败");
        }

        const sections = await response.json();
        const html = sections[sectionId];

        if (!html) {
          throw new Error("缺少 Section HTML");
        }

        const doc = new DOMParser().parseFromString(
          html,
          "text/html"
        );

        const nextRoot = doc.querySelector(
          "[data-collection-root]"
        );

        const nextGrid = nextRoot?.querySelector(
          "[data-product-grid]"
        );

        if (!nextGrid) {
          throw new Error("缺少商品列表");
        }

        // 将下一页的商品节点追加到当前列表
        for (const card of [...nextGrid.children]) {
          grid.appendChild(
            document.importNode(card, true)
          );
        }

        const followingLink = nextRoot.querySelector(
          "[data-next-page-link]"
        );

        if (followingLink) {
          nextLink.href = followingLink.href;
        } else {
          // 已到最后一页
          observer.disconnect();
          nextLink.remove();
          sentinel.remove();
        }

      } catch (error) {
        console.error(error);

        // 保留链接，允许用户正常跳转重试
        observer.disconnect();

      } finally {
        loading = false;
      }
    },
    {
      rootMargin: "500px 0px"
    }
  );

  observer.observe(sentinel);
}

initInfiniteScroll();
```

这段代码可以解释核心机制，但生产环境仍需要进一步处理重复初始化、组件销毁、加载状态、浏览器历史、无障碍通知以及用户返回页面时的滚动恢复。

尤其注意：

**如果你把它与上一节的筛选 AJAX 结合，筛选导致整个 Collection Section 被替换后，必须对新 Section 重新执行 `initInfiniteScroll()`。**

因为旧 Observer 正在观察的哨兵节点已经被移除。

同时还应该断开旧 Observer，取消旧分页请求，避免旧筛选条件下的商品被错误追加到新列表中。

这也是为什么真实 Shopify Theme 往往会采用 Custom Element 或具有明确初始化与销毁过程的组件设计，而不是把所有逻辑都放在一次性的 `DOMContentLoaded` 回调里。

### 3. 无限滚动的实际 UX 问题

无限滚动虽然方便，但有一些需要认真处理的细节。

比如用户连续向下滚动 20 页，然后点击某个商品。

进入商品页后，再按浏览器后退。

这时候应该回到哪里？

理想状态是原来滚动的位置，并且尽可能恢复之前加载的商品内容。

如果只简单追加节点，却不管理 URL、历史记录和滚动恢复，用户可能返回到第一页顶部。

此外，还有 Footer 不容易到达、辅助技术难以理解加载状态、用户难以定位第几页等问题。

因此对于普通电商网站，我更建议先实现**标准分页**，再将无限滚动作为渐进增强，而不是彻底删除可访问的分页导航。

---

## 十三、除了分页，还有哪些商品卡片优化值得做？

假设我们已经将每页商品数量控制在 24 个。

是不是就不需要优化了？

当然不是。

因为每张商品卡片本身也可能非常复杂。

### 1. 不要为每个卡片重复注册大量监听器

例如：

```js
document.querySelectorAll(".product-card").forEach(
  (card) => {
    card.querySelector(".quick-add").addEventListener(
      "click",
      handleQuickAdd
    );
  }
);
```

24 个卡片通常不会因为这点监听器就造成明显问题。

但如果页面动态加载了数百个商品，并且每次加载后都重复初始化，有可能带来额外成本和监听器管理问题。

可以考虑事件委托：

```js
document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const button = target.closest(
    ".product-card .quick-add"
  );

  if (!button) return;

  const card = button.closest(".product-card");

  if (!card) return;

  handleQuickAdd(event, card);
});
```

这样，后续 AJAX 追加的新商品卡片也可以复用监听器。

不过事件委托不是所有场景都比独立监听器快，主要价值之一是减少动态 DOM 的初始化和清理复杂度。

### 2. 商品图片使用合理尺寸

假设桌面端商品卡片宽度约 260 CSS px，DPR = 2。

通常没有必要为它下载宽度 2400px 的主图资源。

可以通过我们第 11 课学习的 `srcset` 和 `sizes` 让浏览器选择合适的图片。

同时保留正确的纵横比，避免图片下载后引发卡片高度变化。

### 3. 不要一次初始化所有复杂交互

例如一个商品卡片可能包含：

```text
Product Card
  ├── 主图
  ├── 第二张 Hover 图片
  ├── 视频预览
  ├── 颜色选择器
  ├── 快速加购
  └── Quick View Modal
```

这里真正需要在首次显示时准备的，可能只有标题、价格、商品链接和主图。

Quick View 的复杂逻辑可以按需加载。

视频也未必需要在用户滚动到卡片前就下载。

**不要因为卡片上包含一个功能，就认为这项功能的所有 JS 和媒体都必须立即加载。**

---

## 十四、如何诊断大型列表到底慢在哪里？

现在回到 Chrome DevTools。

假设用户反馈：

“集合页滑动很卡。”

不要直接上虚拟列表。

我们先测量。

### 1. 检查 DOM 数量

在 Chrome 控制台执行：

```js
console.log(
  document.getElementsByTagName("*").length
);
```

这能得到当前文档中的元素节点数量。

它只是一个粗略指标，并不包含所有类型的 DOM 节点。

同时检查商品卡片数量：

```js
console.log(
  document.querySelectorAll(".product-card").length
);
```

假设结果：

```text
页面元素：18000
商品卡片：600
```

这说明页面规模比较大，值得进一步调查。

但它本身还不能证明卡顿一定来自 DOM 数量。

### 2. 用 Performance 录制滚动

重点看：

| 观察内容 | 可能的优化方向 |
|---|---|
| Recalculate Style 很长 | 排查大范围样式失效和选择器匹配 |
| Layout 很长 | 检查复杂网格、尺寸变化、强制布局 |
| Paint 很长 | 检查大范围重绘、阴影、复杂视觉效果 |
| JavaScript 长任务 | 检查滚动事件、DOM 更新、数据计算 |
| 图片解码或栅格化负担 | 减少过大的图片和不必要的可见资源 |

对于有复杂交互的页面，还应该单独录制筛选和排序。

因为滚动流畅，并不代表筛选时不会出现 300ms 的长任务。

### 3. 比较不同页大小

你可以做一个受控实验。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">页面大小与潜在 DOM 成本（理论示例）</text>
  <Chart content={{"chartType":"bar","meta":{"description":"假设每个商品卡片约 20 个元素节点，仅展示数量级关系，不是实测性能数据。"},"xKey":"products","series":[{"dataKey":"nodes","label":"商品卡片元素节点"}],"yAxisMin":0,"data":[{"products":"12 商品","nodes":240},{"products":"24 商品","nodes":480},{"products":"50 商品","nodes":1000},{"products":"100 商品","nodes":2000},{"products":"250 商品","nodes":5000}]}}/>
  <caption>节点数增加不等于渲染耗时按相同比例增加。具体性能需要在真实页面上测量。</caption>
</box>

用相同设备与网络条件分别测试每页 12、24、50 个商品。

比较 HTML 传输、DOM 节点数量、Layout 时间、首次绘制和真实滚动体验。

如果 24 个与 50 个差异很小，那么就不必为了追求极少 DOM 而牺牲用户浏览体验。

如果 50 个明显造成卡顿，就可以考虑减小页大小，或者先优化每张商品卡片的复杂度。

---

## 十五、Shopify 大型集合页还有一个服务端限制

我们前面讨论的是 1000 个商品。

但如果集合增长到 30,000 个、100,000 个呢？

这时不能简单认为只要增加分页就能解决所有问题。

Shopify 当前官方性能指南明确指出，Liquid 分页支持访问的数据深度最多为前 25,000 项，并建议大型目录避免极深分页，改为通过分类、筛选和搜索帮助用户缩小结果范围。

另外，前面提到，原生 Storefront Filtering 对超过 5000 个商品的集合也存在限制。

所以面对非常大的商品目录，需要从信息架构层面解决问题。

例如将商品按用途、品牌、分类等拆成更有意义的集合，配合搜索与筛选。

而不是做一个 10 万商品的 Collection，然后让用户点到第 3000 页。

这是一个重要的工程思维：

**性能问题有时候不能只靠代码解决，还需要重新设计数据组织方式和用户查找商品的路径。**

---

## 十六、最终怎么选择？一张决策表

经过这一课，我们可以把分页、无限滚动、虚拟列表和 `content-visibility` 放在一起比较。

| 方案 | 主要解决的问题 | 适合的场景 |
|---|---|---|
| **Pagination** | 控制单次获取和渲染的数据量 | Shopify 集合页、搜索结果 |
| **Infinite Scroll** | 让用户连续浏览后续页面 | 内容流、部分商品集合 |
| **Virtualization** | 长时间控制 DOM 数量 | 大型表格、日志、聊天列表 |
| **content-visibility** | 跳过部分屏幕外渲染工作 | 长页面中的独立内容区域 |
| **图片 Lazy Loading** | 减少不必要的初始图片获取 | 屏幕外商品图片 |
| **Section Rendering API** | 局部获取并更新服务端 HTML | Shopify 筛选、排序、分页 |

普通 Shopify 集合页可以采用以下架构：

```text
Shopify Collection（1000 个商品）
             │
             ▼
原生 Storefront Filtering / Sorting
             │
             ▼
Shopify Liquid Pagination（24 个 / 页）
             │
             ▼
Liquid 输出商品卡片 HTML
             │
             ▼
浏览器加载当前页
       ├── 首屏图片正常加载
       ├── 屏幕外图片懒加载
       ├── 关键 JS 尽早准备
       └── 非关键 JS 按需加载
             │
             ▼
用户筛选 / 排序
             │
             ▼
Section Rendering API
             │
             ▼
替换商品区域及相关状态
             │
             ▼
可选：无限滚动追加下一页
```

这套方案有一个非常大的优势：

**将 Shopify 擅长的数据筛选、排序和 HTML 生成留在服务端，让浏览器集中处理显示、交互和局部更新。**

对于一个已经能够正常通过服务端分页展示商品的 Theme，通常不必额外引入 React 等框架，仅仅为了重新实现整套商品列表渲染。

---

## 十七、本课总结

今天我们已经将大型页面性能问题拆解为三个独立层次。

**第一层：控制数据量。**

通过 Shopify 原生分页和筛选，只获取当前用户需要的商品结果。

**第二层：控制 DOM 数量。**

分页限制初始节点数量；无限滚动逐步追加；虚拟列表则能让长期存在的 DOM 数量保持在相对固定的范围。

**第三层：控制渲染成本。**

利用响应式图片、懒加载、合理的组件初始化方式、局部 DOM 更新，以及必要时的 `content-visibility`，减少浏览器不必要的工作。

最需要记住的四个区别：

| 技术 | 不应该误解成 |
|---|---|
| 分页 | 浏览器已经获得全部商品，只是用 CSS 隐藏其他商品 |
| 无限滚动 | 自动保持 DOM 数量不变 |
| 虚拟列表 | 自动减少后端需要获取的数据 |
| `content-visibility` | 自动删除 DOM 或阻止所有资源下载 |

如果只能记住一句话：

**大型列表优化的关键是同时考虑数据获取、DOM 规模、浏览器渲染和交互正确性，而不是单纯减少图片数量或者套用虚拟列表。**

## 参考资料

- [Storefront filtering](https://shopify.dev/docs/storefronts/themes/navigation-search/filtering/storefront-filtering)
- [Use the Section Rendering API for dynamic updates](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-section-rendering-api)
- [Render essential content in Liquid and HTML, not JavaScript](https://shopify.dev/docs/storefronts/themes/best-practices/performance/render-essential-content-server-side)
- [Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)
- [Liquid filters: sort_by](https://shopify.dev/docs/api/liquid/filters/sort_by)
- [collection](https://shopify.dev/docs/storefronts/themes/architecture/templates/collection)
- [Collection URL parameters](https://shopify.dev/docs/api/hydrogen/latest/collections/collection-url-parameters)
- [Liquid objects: filter](https://shopify.dev/docs/api/liquid/objects/filter)
- [Sections](https://shopify.dev/docs/storefronts/themes/architecture/sections)
- [Support storefront filtering](https://shopify.dev/docs/storefronts/themes/navigation-search/filtering/storefront-filtering/support-storefront-filtering)
- [Liquid objects: collection](https://shopify.dev/docs/api/liquid/objects/collection)
- [JSON templates](https://shopify.dev/docs/storefronts/themes/architecture/templates/json-templates)
- [Filter - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/filter)
- [Liquid objects: filter_value](https://shopify.dev/docs/api/liquid/objects/filter_value)
- [Limit pagination depth to improve query performance](https://shopify.dev/docs/storefronts/themes/best-practices/performance/limit-pagination-depth)
- [Liquid tags: paginate](https://shopify.dev/docs/api/liquid/tags/paginate)
- [Limit how many items a Liquid array fetches](https://shopify.dev/docs/storefronts/themes/best-practices/performance/limit-product-queries-with-pagination)
- [Stylesheet content subsetting](https://shopify.dev/docs/storefronts/themes/best-practices/performance/stylesheet-subsetting)
- [Filtering](https://shopify.dev/docs/storefronts/themes/navigation-search/filtering)
- [Liquid objects: paginate](https://shopify.dev/docs/api/liquid/objects/paginate)
- [Liquid objects: sort_option](https://shopify.dev/docs/api/liquid/objects/sort_option)
- [Collection store](https://shopify.dev/docs/api/hydrogen/latest/collections/create-collection-store)
- [Collection](https://shopify.dev/docs/api/admin-rest/latest/resources/collection)
- [Collection provider](https://shopify.dev/docs/api/hydrogen/latest/collections/collection-provider)
- [Make paginated requests to the REST Admin API](https://shopify.dev/docs/api/admin-rest/usage/pagination)
- [Liquid objects: part](https://shopify.dev/docs/api/liquid/objects/part)
- [IntersectionObserver: IntersectionObserver() constructor - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver)
- [Intersection Observer API - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [IntersectionObserver: scrollMargin property - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/scrollMargin)
- [IntersectionObserver: rootMargin property - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/rootMargin)
- [IntersectionObserver - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver)
- [Intersection Observer API - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API?source=post_page---------------------------)
- [交叉观察器 API - Web API | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API)
- [The CSS content-visibility property is now Baseline Newly available | Articles | web.dev](https://web.dev/blog/css-content-visibility-baseline?hl=en)
- [Virtualize large lists with react-window | Articles | web.dev](https://web.dev/articles/virtualize-long-lists-react-window?authuser=80)
- [Virtualize large lists with react-window | Articles | web.dev](https://web.dev/articles/virtualize-long-lists-react-window?authuser=68)
- [使用 React-window 虚拟化大型列表 | Articles | web.dev](https://web.dev/articles/virtualize-long-lists-react-window?hl=zh-cn)
