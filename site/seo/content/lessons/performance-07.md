# 深入 HTTP 缓存、强缓存、协商缓存与 CDN


这一课我们要解决一个很重要的问题：

**为什么同样一个网站，用户第一次打开可能需要 3 秒，第二次打开却只需要 1 秒？**

这其中一个重要原因就是缓存（Cache）。

但缓存机制比简单地“把文件保存在浏览器里”复杂得多。

比如：

- 为什么有些请求显示 `200 OK`，有些显示 `304 Not Modified`？
- 为什么 `Cache-Control: no-cache` 居然允许缓存？
- 为什么 `max-age=3600` 到期之后，浏览器不一定要重新下载完整文件？
- 为什么 Shopify Theme 更新了 CSS，部分用户还在看到旧样式？
- 浏览器缓存和 Shopify CDN 缓存，到底有什么区别？

这一课我们会从 HTTP 协议原理讲起，然后结合 Shopify Theme 的实际资源管理讲解。

---

## 一、首先理解：缓存到底在优化什么？

回顾第一课，从浏览器请求一个资源到最终使用它，可能需要：

```text
浏览器
   ↓
DNS 解析
   ↓
建立网络连接
   ↓
发送 HTTP 请求
   ↓
服务器处理
   ↓
网络传输响应
   ↓
浏览器接收资源
```

假设我们需要下载一份 `theme.js`：

```html
<script src="/assets/theme.js" defer></script>
```

文件大小 300KB。

第一次访问，浏览器可能需要通过网络获取完整文件。

但第二次访问时，这个文件很可能根本没有发生变化。

如果每次都重复下载，就会产生不必要的网络流量和等待。

缓存要解决的核心问题是：

**当资源没有变化时，尽可能避免重复获取；即使资源可能变化，也尽可能减少重新验证或传输的成本。**

缓存通常可以减少：

- 资源下载时间和传输字节数。
- 部分网络往返开销。
- 服务器和 CDN 上游请求量。
- 重复访问页面时的等待。

不过，缓存不是免费的，它会引入一个新问题：

**如何保证用户使用的是正确、足够新的资源？**

所以缓存机制始终是在性能与数据新鲜度之间进行权衡。

---

## 二、缓存到底存在哪里？先分清四个层次

在深入 HTTP 缓存之前，我们必须先区分几个不同概念。

<box border radius="xl" padding={3} gap={3}>
  <svg viewBox="0 0 340 312" width="100%">
    <rect x="35" y="5" width="270" height="48" rx="9" stroke="#3b82f6" strokeOpacity=".6" fill="#3b82f6" fillOpacity=".1"/>
    <text x="170" y="24" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">浏览器中的缓存</text>
    <text x="170" y="41" textAnchor="middle" fontSize="10" fill="currentColor" opacity=".7">Memory / Disk HTTP Cache</text>
    <path d="M170 53 V73 m-4 -5 4 5 4 -5" stroke="currentColor" strokeOpacity=".5" fill="none"/>
    <rect x="35" y="77" width="270" height="48" rx="9" stroke="#0d9488" strokeOpacity=".6" fill="#0d9488" fillOpacity=".1"/>
    <text x="170" y="96" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">CDN / 边缘共享缓存</text>
    <text x="170" y="113" textAnchor="middle" fontSize="10" fill="currentColor" opacity=".7">例如 Shopify CDN</text>
    <path d="M170 125 V145 m-4 -5 4 5 4 -5" stroke="currentColor" strokeOpacity=".5" fill="none"/>
    <rect x="35" y="149" width="270" height="48" rx="9" stroke="#d97706" strokeOpacity=".6" fill="#d97706" fillOpacity=".1"/>
    <text x="170" y="168" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">源站 / 应用服务</text>
    <text x="170" y="185" textAnchor="middle" fontSize="10" fill="currentColor" opacity=".7">生成 HTML、提供资源或数据</text>
    <rect x="20" y="225" width="300" height="61" rx="9" fill="#64748b" fillOpacity=".09" stroke="#94a3b8" strokeDasharray="4 3"/>
    <text x="170" y="244" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">另一套独立机制：Service Worker Cache</text>
    <text x="170" y="261" textAnchor="middle" fontSize="10" fill="currentColor" opacity=".7">由 Service Worker 使用 Cache API 管理</text>
    <text x="170" y="276" textAnchor="middle" fontSize="9.5" fill="currentColor" opacity=".65">不是 HTTP 缓存的简单别名</text>
    <text x="170" y="305" textAnchor="middle" fontSize="10" fill="currentColor" opacity=".65">逻辑分层示意，不代表所有请求都经过每一层</text>
  </svg>
</box>

### 1. 浏览器 HTTP Cache

浏览器可以将 HTTP 响应保存在本地。

你可能在 Chrome Network 面板中见过：

```text
(from memory cache)
(from disk cache)
```

一般可以理解为：

**Memory Cache：** 浏览器使用内存中保存的资源，访问可能非常快，但并不保证资源会长期保留。

**Disk Cache：** 浏览器使用磁盘中的缓存资源，可能跨页面或浏览器会话复用，但会受到容量、清理策略等限制。

需要注意，Memory Cache 与 Disk Cache 的具体实现属于浏览器内部机制，不应该把它们理解成开发者能通过 HTTP 头精确指定的两个固定存储位置。

开发者主要通过 HTTP 响应头告诉浏览器：

**资源是否允许缓存、何时过期、过期后如何验证。**

浏览器再决定具体存储方式。

### 2. CDN Cache

CDN 缓存并不在用户本地。

它位于网络中的边缘服务器。

例如：

```text
用户（北京）
     ↓
距离用户较近的 CDN 边缘节点
     ↓
Shopify 上游服务
```

如果 CDN 已经缓存了 `product.webp`，它可以直接返回资源，不需要每次都向上游重新获取。

这和浏览器缓存的区别非常关键：

- 浏览器缓存主要服务于某个浏览器环境。
- CDN 共享缓存可以服务来自不同用户的符合缓存条件的请求。

Shopify 的静态资源、商品图片等会利用平台的 CDN 提供高效分发，官方也建议通过 Liquid URL 过滤器使用平台生成的资源地址。

### 3. Service Worker Cache

假设你开发一个 PWA。

Service Worker 可以拦截受其控制范围内的请求，并通过 Cache API 管理资源。

例如：

```js
const cache = await caches.open("app-v1");

await cache.add("/offline.html");
```

它的缓存策略由应用代码控制，可以实现离线访问、缓存优先、网络优先等功能。

它和浏览器 HTTP Cache 是两套不同的机制。

这节课我们主要研究 **HTTP Cache 与 CDN Cache**，Service Worker 后面可以单独深入。

另外还有一个容易混淆的概念：**bfcache（Back/Forward Cache）**。它保存的是可恢复的页面状态，帮助浏览器前进或后退时快速恢复页面，并不是单纯的 CSS、JS、图片文件缓存。

---

## 三、HTTP 缓存最核心的两种机制

传统前端知识体系通常把 HTTP 缓存分成两大类：

**强缓存**和**协商缓存**。

它们不是两个彼此独立的存储系统，而是两种复用 HTTP 缓存响应的方式。

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 297" width="100%">
    <rect x="87" y="6" width="166" height="40" rx="8" fill="#64748b" fillOpacity=".11" stroke="#94a3b8"/>
    <text x="170" y="22" fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">浏览器需要某个资源</text>
    <text x="170" y="37" fontSize="10" textAnchor="middle" fill="currentColor">先检查可用缓存</text>
    <path d="M170 46 V61" stroke="currentColor" strokeOpacity=".5"/>
    <rect x="105" y="62" width="130" height="43" rx="8" fill="#d97706" fillOpacity=".1" stroke="#d97706"/>
    <text x="170" y="80" fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">缓存仍新鲜吗？</text>
    <text x="170" y="95" fontSize="10" textAnchor="middle" fill="currentColor">Fresh / Stale</text>
    <path d="M105 83 H40 V127 M235 83 H301 V127" stroke="currentColor" strokeOpacity=".45" fill="none"/>
    <text x="55" y="118" fontSize="10" fill="currentColor">是</text>
    <text x="272" y="118" fontSize="10" fill="currentColor">否</text>
    <rect x="4" y="127" width="135" height="53" rx="8" fill="#0d9488" fillOpacity=".12" stroke="#0d9488"/>
    <text x="71.5" y="147" fontSize="11.5" fontWeight="600" textAnchor="middle" fill="currentColor">强缓存命中</text>
    <text x="71.5" y="164" fontSize="10" textAnchor="middle" fill="currentColor">直接复用本地响应</text>
    <rect x="204" y="127" width="132" height="53" rx="8" fill="#3b82f6" fillOpacity=".1" stroke="#3b82f6"/>
    <text x="270" y="147" fontSize="11.5" fontWeight="600" textAnchor="middle" fill="currentColor">向服务器验证</text>
    <text x="270" y="164" fontSize="10" textAnchor="middle" fill="currentColor">条件请求</text>
    <path d="M270 180 V197" stroke="currentColor" strokeOpacity=".45"/>
    <rect x="204" y="198" width="132" height="38" rx="8" fill="#d97706" fillOpacity=".09" stroke="#d97706"/>
    <text x="270" y="221" fontSize="11" fontWeight="600" textAnchor="middle" fill="currentColor">资源是否发生变化？</text>
    <path d="M240 236 V251 H180 M300 236 V251 H322" stroke="currentColor" strokeOpacity=".4" fill="none"/>
    <text x="166" y="245" fontSize="9.5" fill="currentColor">未变</text>
    <text x="312" y="245" fontSize="9.5" fill="currentColor">已变</text>
    <rect x="103" y="257" width="112" height="34" rx="7" fill="#0d9488" fillOpacity=".1" stroke="#0d9488"/>
    <text x="159" y="278" fontSize="10.5" fontWeight="600" textAnchor="middle" fill="currentColor">304 复用缓存</text>
    <rect x="220" y="257" width="116" height="34" rx="7" fill="#3b82f6" fillOpacity=".1" stroke="#3b82f6"/>
    <text x="278" y="278" fontSize="10.5" fontWeight="600" textAnchor="middle" fill="currentColor">200 获取新资源</text>
  </svg>
  <caption>简化决策路径：假设已有缓存且允许验证。实际还有 no-store、共享缓存、stale-while-revalidate、请求缓存模式等特殊情况。</caption>
</box>

现在我们逐个理解。

### 1. 强缓存：不需要向服务器确认

假设服务器第一次返回：

```http
HTTP/1.1 200 OK
Content-Type: application/javascript
Cache-Control: public, max-age=3600
```

其中：

```http
Cache-Control: max-age=3600
```

表示这个 HTTP 响应在正常条件下可以保持新鲜约 3600 秒，即一小时。

假设浏览器第一次在 10:00 下载了这个 JS。

用户在 10:10 再次访问页面。

如果缓存还在，并且符合复用条件：

```text
10:00 第一次访问
       ↓
下载 theme.js
       ↓
保存到 HTTP Cache

10:10 第二次访问
       ↓
检查缓存
       ↓
缓存仍然新鲜
       ↓
直接使用
```

这时浏览器通常不需要为了这个 JS 再发送网络验证请求。

**这就是强缓存。**

它最大的优势是：避免对应资源的网络往返。

#### max-age 到期后，缓存会被删除吗？

不一定。

这是一个常见误区。

假设到了 11:30，距离第一次缓存已经过去 90 分钟。

`max-age=3600` 已经过期。

但这不代表缓存文件必然已经被浏览器删除。

它可能仍然保存在本地，只是从 Fresh（新鲜）变成了 Stale（过期）。

然后浏览器根据缓存策略，决定是否能够通过协商缓存继续使用它。

因此：

**缓存过期不等于缓存被删除，也不等于必须重新下载整个文件。**

---

### 2. 协商缓存：向服务器确认有没有变化

现在假设 `theme.js` 已经过期。

浏览器会问：

“我本地还有上次的文件，服务器上的文件有没有变？”

这时就可能使用协商缓存。

常见机制有两种：

- ETag / If-None-Match
- Last-Modified / If-Modified-Since

#### 方式 A：ETag

第一次服务器返回：

```http
HTTP/1.1 200 OK
Cache-Control: no-cache
ETag: "theme-v1"

[JavaScript 文件内容]
```

这里的 ETag 是服务器为当前资源版本提供的一个标识。

浏览器保存了文件和 ETag。

下次需要验证时，发送：

```http
GET /theme.js HTTP/1.1
If-None-Match: "theme-v1"
```

服务器检查当前资源的 ETag。

如果没有变化：

```http
HTTP/1.1 304 Not Modified
ETag: "theme-v1"
```

这个响应没有完整 JS 文件的响应体。

浏览器继续使用本地缓存里的 JS。

如果资源已经更新：

```http
HTTP/1.1 200 OK
ETag: "theme-v2"

[新的 JavaScript 文件内容]
```

浏览器就使用新文件，并更新缓存。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">ETag 协商缓存的完整过程</text>
  <svg viewBox="0 0 340 220" width="100%">
    <rect x="5" y="8" width="97" height="35" rx="7" fill="#64748b" fillOpacity=".12" stroke="#94a3b8"/>
    <rect x="238" y="8" width="97" height="35" rx="7" fill="#64748b" fillOpacity=".12" stroke="#94a3b8"/>
    <text x="53" y="30" fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">浏览器</text>
    <text x="286" y="30" fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">服务器</text>
    <g stroke="currentColor" strokeOpacity=".23" strokeDasharray="3 4">
      <path d="M53 43 V213 M286 43 V213"/>
    </g>
    <path d="M60 69 H279 l-6-4 m6 4 -6 4" fill="none" stroke="#3b82f6" strokeWidth="2"/>
    <text x="170" y="59" fontSize="11" textAnchor="middle" fill="currentColor">If-None-Match: "theme-v1"</text>
    <path d="M279 113 H60 l6-4 m-6 4 6 4" fill="none" stroke="#0d9488" strokeWidth="2"/>
    <text x="170" y="103" fontSize="11" fontWeight="600" textAnchor="middle" fill="currentColor">304 Not Modified</text>
    <rect x="12" y="135" width="135" height="57" rx="7" fill="#0d9488" fillOpacity=".1" stroke="#0d9488" strokeOpacity=".5"/>
    <text x="79.5" y="156" fontSize="11" fontWeight="600" textAnchor="middle" fill="currentColor">使用本地 theme.js</text>
    <text x="79.5" y="174" fontSize="10" textAnchor="middle" fill="currentColor">不重新下载完整内容</text>
    <rect x="194" y="135" width="134" height="57" rx="7" fill="#64748b" fillOpacity=".09" stroke="#94a3b8"/>
    <text x="261" y="156" fontSize="11" fontWeight="600" textAnchor="middle" fill="currentColor">服务器确认版本</text>
    <text x="261" y="174" fontSize="10" textAnchor="middle" fill="currentColor">资源未发生变化</text>
    <text x="170" y="211" fontSize="10" textAnchor="middle" fill="currentColor" opacity=".65">节省响应体传输，但仍需要网络请求</text>
  </svg>
</box>

#### 强缓存与协商缓存的根本区别

| 对比 | 强缓存 | 协商缓存 |
|---|---|---|
| 是否需要请求服务器 | 通常不需要 | 需要验证请求 |
| 是否重新下载完整文件 | 不需要 | 304 时不需要 |
| 是否存在网络 RTT | 可避免 | 通常仍有 |
| 主要依据 | `max-age` 等新鲜度规则 | `ETag`、`Last-Modified` 等验证器 |
| 性能表现 | 通常最快 | 比完整下载更省流量 |

这里还有一个容易忽略的事实：

即使返回 304，它仍然需要经历网络请求和服务器或 CDN 的验证响应。

因此，304 通常比重新下载完整文件更省流量，但不一定比强缓存更快。

MDN 对 HTTP 缓存的说明也明确区分了 Fresh、Stale 与 Revalidation。

---

## 四、Last-Modified：另一种协商缓存机制

ETag 是通过资源版本标识进行验证。

而 `Last-Modified` 是根据资源最后修改时间进行验证。

例如第一次响应：

```http
HTTP/1.1 200 OK
Cache-Control: max-age=3600
Last-Modified: Fri, 06 Nov 2026 01:00:00 GMT
```

当缓存过期后，浏览器可以发送：

```http
GET /theme.js HTTP/1.1
If-Modified-Since: Fri, 06 Nov 2026 01:00:00 GMT
```

服务器检查资源最后修改时间。

如果没有变化，就可以返回：

```http
HTTP/1.1 304 Not Modified
```

否则返回新的 `200 OK` 响应及资源内容。

### ETag 和 Last-Modified 哪个更好？

| 对比 | ETag | Last-Modified |
|---|---|---|
| 验证依据 | 服务器生成的资源标识 | 资源修改时间 |
| 是否能基于内容版本判断 | 可以，取决于生成策略 | 主要依赖时间 |
| 能否识别短时间内多次修改 | 取决于实现，通常更灵活 | 秒级时间精度可能不足 |
| 常见请求头 | `If-None-Match` | `If-Modified-Since` |

ETag 并不一定是文件内容的哈希值。

它可以是：

```http
ETag: "abc123"
```

也可以是一个由服务器自行定义的版本标识。

此外还有弱 ETag：

```http
ETag: W/"abc123"
```

它表达的是语义层面的等价，而不一定是字节完全相同。

如果服务器同时提供 ETag 和 Last-Modified，客户端可以在请求中同时发送条件头。对于适用的 GET/HEAD 条件请求，`If-None-Match` 的判断优先于 `If-Modified-Since`。

实际开发中，两种验证器可以配合使用，不需要强行二选一。

---

## 五、Cache-Control：真正决定缓存行为的核心

现在我们来学习 HTTP 缓存最重要的响应头：

```http
Cache-Control
```

理解它之后，HTTP 缓存的绝大部分常见问题就能解决。

### 1. 六个最重要的指令

| 指令 | 含义 |
|---|---|
| `max-age=3600` | 资源可保持新鲜约 3600 秒 |
| `no-cache` | 可以存储，但正常复用前必须验证 |
| `no-store` | 不允许 HTTP 缓存存储响应 |
| `public` | 允许符合条件的共享缓存存储 |
| `private` | 仅允许私有缓存存储完整响应 |
| `immutable` | 声明资源在新鲜期内不会发生变化，避免不必要的重新验证 |

其中最容易混淆的是：

**`no-cache` 和 `no-store`。**

### 2. no-cache 为什么不等于不缓存？

假设服务器返回：

```http
Cache-Control: no-cache
ETag: "v1"
```

它真正的意思是：

“你可以保存这个文件，但下一次正常使用之前，必须确认服务器上的版本有没有改变。”

所以它的工作流程：

```text
第一次访问
    ↓
下载资源
    ↓
保存在浏览器缓存
    ↓
第二次访问
    ↓
向服务器发起验证请求
    ↓
304 Not Modified
    ↓
继续使用本地文件
```

因此，`no-cache` 更适合被理解为：

**不允许未经验证地复用缓存。**

它不是禁止存储。

### 3. no-store 才是真正禁止 HTTP 缓存存储

例如：

```http
Cache-Control: no-store
```

这表示响应不能被 HTTP 缓存存储。

下次需要资源时，通常无法依靠此前保存的 HTTP 响应直接复用。

对于包含高度敏感信息的响应，例如某些账户、订单或支付数据，可能需要使用这种策略。

但不要因此给所有接口都设置 `no-store`。

因为这样会牺牲很多原本可以通过缓存减少网络请求的机会。

注意：`no-store` 主要约束 HTTP 缓存存储，并不等价于销毁页面内存中的 JS 数据，也不应被当作阻止所有浏览器历史恢复和敏感信息保留的唯一安全机制。

### 4. 一组交互实验：自己判断缓存行为

假设浏览器刚刚请求过 `theme.js`，现在又要访问完全相同的 URL。

改变下面的响应头，观察结果：

{@body const [cacheMode,setCacheMode]=DIL.useState("fresh")}
{@body const cacheExamples={
fresh:{header:"Cache-Control: public, max-age=3600",result:"通常直接命中强缓存",network:"不需要向服务器发送验证请求",reason:"假设只过去了 10 分钟，且缓存仍在、满足复用条件，则仍处于 1 小时新鲜期内。"},
expired:{header:'Cache-Control: max-age=3600\nETag: "v1"',result:"尝试协商缓存",network:'请求携带 If-None-Match: "v1"',reason:"假设已经过去 2 小时，缓存过期。服务器确认未修改则返回 304，修改了则返回新内容。"},
nocache:{header:'Cache-Control: no-cache\nETag: "v1"',result:"每次正常复用前进行验证",network:"发起条件请求，可能返回 304",reason:"响应允许存储，但不能直接在未经验证的情况下使用。"},
nostore:{header:"Cache-Control: no-store",result:"不能复用此前存储的 HTTP 响应",network:"通常重新发起网络请求",reason:"HTTP 缓存不应存储该响应。"}
}}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">选择 HTTP 响应头与访问条件</text>
  <radio-group direction="col" value={cacheMode} onChange={setCacheMode}>
    <radio value="fresh">max-age=3600，10 分钟后再次访问</radio>
    <radio value="expired">max-age=3600，2 小时后再次访问</radio>
    <radio value="nocache">no-cache，第二次访问</radio>
    <radio value="nostore">no-store，第二次访问</radio>
  </radio-group>
  <box background="surface-secondary" radius="md" padding={3}>
    <text size="sm" preserveWhitespace>{cacheExamples[cacheMode].header}</text>
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <text weight="medium">{cacheExamples[cacheMode].result}</text>
    <text size="sm">{cacheExamples[cacheMode].network}</text>
    <text color="secondary" size="sm">{cacheExamples[cacheMode].reason}</text>
  </box>
</box>

需要强调：这个实验描述的是正常 HTTP 缓存语义。浏览器强制刷新、开发者工具禁用缓存、已有 Service Worker、缓存淘汰等因素都可能改变实际结果。

---

## 六、public、private 和 s-maxage：浏览器缓存与 CDN 缓存的区别

前面讲过，浏览器缓存和 CDN 缓存是两层不同的缓存。

那么服务器能不能分别指定它们的策略？

可以。

这就是 `public`、`private`、`s-maxage` 等指令的重要用途。

### 1. public

```http
Cache-Control: public, max-age=3600
```

意味着只要满足其他缓存规则，浏览器私有缓存和 CDN 等共享缓存都可以存储这个响应。

它很适合不包含用户特定信息、可以安全共享的公开资源。

例如：

```text
theme.css
theme.js
公开商品图片
```

当然，是否实际缓存还取决于 CDN 配置、缓存键和其他规则。

### 2. private

```http
Cache-Control: private, max-age=300
```

表示完整响应可以在私有缓存中存储，但共享缓存不能存储。

假设有一个包含用户专属数据的页面：

```text
/account
```

如果将它作为普通公共响应缓存，可能造成不同用户之间的数据泄露。

因此，包含个人信息的 HTTP 响应必须正确处理共享缓存边界。

`private` 也不等于加密或访问控制，它只定义缓存存储规则。

### 3. s-maxage：专门控制共享缓存的新鲜期

例如：

```http
Cache-Control: public, max-age=60, s-maxage=600
```

在其他条件都允许缓存的前提下：

- 浏览器私有缓存通常使用 `max-age=60`，新鲜期为 60 秒。
- CDN 等共享缓存使用 `s-maxage=600`，新鲜期为 600 秒。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">同一个响应，两层缓存不同的 TTL</text>
  <box gap={1}>
    <row justify="between" align="center">
      <text weight="medium" size="sm">浏览器 HTTP Cache</text>
      <text color="secondary" size="sm" tabularNums>60 秒</text>
    </row>
    <box background="surface-tertiary" height="18px" radius="sm" clip>
      <box width="10%" height="100%" background="#3b82f6" radius="sm"/>
    </box>
  </box>
  <box gap={1}>
    <row justify="between" align="center">
      <text weight="medium" size="sm">CDN 共享 Cache</text>
      <text color="secondary" size="sm" tabularNums>600 秒</text>
    </row>
    <box background="#0d9488" height="18px" radius="sm"/>
  </box>
  <caption>概念示意。真实缓存中的当前剩余新鲜期还受到 Age、Date 和缓存时点等因素影响。</caption>
</box>

例如，用户第一次访问时，CDN 从源站获取了资源。

过了 5 分钟，另一位用户访问。

即使该用户自己的浏览器中没有缓存，CDN 仍然可能命中有效缓存，直接返回资源。

这就避免了再次访问源站。

#### 一个进阶问题：Age 是什么？

假设 CDN 返回：

```http
Cache-Control: public, max-age=600
Age: 300
```

这表示该响应已经具有约 300 秒的缓存年龄。

如果没有其他特殊情况，浏览器不能简单认为“收到资源之后仍然有完整的 600 秒新鲜期”。

它还要根据缓存年龄计算响应是否仍然新鲜。

这也是多层缓存中很容易被忽略的细节。

---

## 七、stale-while-revalidate：过期缓存也可以暂时使用

这是现代 HTTP 缓存里非常实用的一种策略。

假设：

```http
Cache-Control: max-age=60, stale-while-revalidate=300
```

它表达两段时间：

**前 60 秒：** 缓存处于新鲜状态，可以直接使用。

**之后的 300 秒：** 缓存已经过期，但在满足条件时，缓存可以先返回旧响应，同时在后台重新验证。

例如：

```text
10:00 获取商品推荐数据
     ↓
10:01 缓存新鲜期结束
     ↓
10:02 用户再次请求
     ↓
先返回允许的旧缓存
     ↓
后台向服务器重新验证
     ↓
缓存更新
```

这种方式可以改善某些对短时间数据延迟不敏感的内容的响应速度。

但它也有代价：

**用户可能暂时看到旧数据。**

因此，不是所有数据都适合使用。

例如：

| 数据类型 | 是否适合短时间使用旧缓存 |
|---|---|
| 网站公共说明文案 | 通常可以考虑 |
| 非关键推荐列表 | 视业务而定 |
| 商品库存 | 需要谨慎 |
| 商品实时促销价格 | 需要谨慎 |
| 用户购物车 | 不建议直接依赖共享旧缓存 |

`stale-while-revalidate` 并不保证每次都会触发一次可见的后台刷新，行为还取决于请求时机、缓存实现和具体规则。

在电商系统里，尤其要避免为了提升速度，让用户基于过期库存或过期价格做出错误判断。

---

## 八、最经典的缓存问题：代码发布后，用户为什么还在使用旧 JS？

这是前端开发中非常常见的问题，也是理解缓存机制最有价值的实际场景。

假设你开发了一个网站：

```html
<script src="/assets/theme.js"></script>
```

服务器给这个文件设置：

```http
Cache-Control: public, max-age=31536000
```

相当于允许浏览器在约一年内把这个响应视为新鲜。

假设：

**11 月 1 日：** 用户访问网站，下载了 `theme.js` 旧版本。

**11 月 6 日：** 你更新 `theme.js`，修复了一个购物车 Bug。

但用户再次打开页面，浏览器发现：

```text
theme.js
     ↓
本地缓存存在
     ↓
缓存仍然新鲜
     ↓
直接使用旧文件
```

这样用户可能仍然运行旧 JS。

问题是：**服务器已经更新了文件，但浏览器根本没有重新请求这个 URL。**

服务器甚至没有机会告诉浏览器文件已经改变。

### 1. 正确解决方案：Cache Busting（缓存失效版本控制）

现代前端项目通常采用版本化资源 URL。

例如：

```html
<script src="/assets/theme.a1b2c3.js"></script>
```

发布新版本时改成：

```html
<script src="/assets/theme.d4e5f6.js"></script>
```

因为 URL 发生了变化，所以浏览器不能简单把旧 URL 的缓存当作新 URL 的响应来使用。

也可以使用版本查询参数：

```html
<script src="/assets/theme.js?v=100"></script>
```

新版本：

```html
<script src="/assets/theme.js?v=101"></script>
```

关键原理是：

**当内容发生变化时，资源 URL 必须产生可靠的变化。**

于是我们就可以采用两种不同的缓存策略。

| 资源 | 常见策略 |
|---|---|
| HTML | 每次正常访问时验证是否更新 |
| 带版本号的 CSS / JS / 图片 | 可以设置较长的新鲜期 |
| 用户私有数据 | 根据敏感程度使用 private、no-cache 或 no-store |

例如，在自己可以控制 HTTP 响应头的普通网站中：

```http
# HTML
Cache-Control: no-cache
```

```http
# 内容不可变、URL 带版本的 JS
Cache-Control: public, max-age=31536000, immutable
```

这里的长期缓存成立有一个严格前提：

**同一个版本 URL 的资源内容不能被悄悄替换。**

只有做到这一点，才能放心让资源长时间缓存。

MDN 也将版本化 URL 配合长期缓存列为静态资源的常见最佳实践。

---

## 九、Shopify Theme 是如何管理缓存的？

现在回到你最关心的 Shopify 开发。

这里有几个非常重要的细节，而且 Shopify 在 2026 年对资源版本管理作过调整。

### 1. asset_url：Shopify 自动生成版本化 URL

假设 Theme 的 `assets` 文件夹中有：

```text
assets/
  theme.css
  theme.js
  logo.svg
```

在 Liquid 中使用：

```liquid
{{ 'theme.css' | asset_url | stylesheet_tag }}

<script
  src="{{ 'theme.js' | asset_url }}"
  defer
></script>
```

Shopify 会生成资源 URL，形如：

```text
/cdn/shop/t/.../assets/theme.css?v=1384022871
```

这里的 `v` 参数用于版本管理。

当你更新 Theme 资源内容时，Shopify 会更新对应的版本化 URL，使浏览器能够获取新资源。

这就解决了一个重要问题：

**既可以让静态资源充分利用缓存，又能够在更新文件后让浏览器识别新版本。**

#### Shopify 2026 年的一个重要变化

从 **2026 年 3 月 24 日** 起，Shopify 不再将以下这种没有参数名的查询字符串作为可靠的资源缓存失效方式：

```text
logo.png?123
```

应该使用 Shopify 官方 Liquid URL 过滤器，生成类似：

```text
logo.png?v=1384022871
```

的版本化地址。

因此，不建议在 Shopify Theme 中自己随意拼接时间戳或裸查询字符串做缓存失效。

### 2. 商品图片与 Theme assets 图片要区分

你之前学习过 Shopify 的产品数据模型。

商品图片：

```liquid
{{ product.featured_image | image_url: width: 800 }}
```

Theme 文件：

```liquid
{{ 'logo.svg' | asset_url }}
```

两者都可以利用 Shopify CDN，但使用的 Liquid 过滤器不同。

通常建议：

- 商品图片、商家上传的图片对象使用 `image_url`，必要时配合 `image_tag`。
- Theme `assets/` 目录中的静态文件使用 `asset_url`。
- Shopify Files 中普通文件可以通过适当的 `file_url` 引用。

尤其不要为商品图片、Theme 资源硬编码固定的 CDN URL，然后期望文件替换后地址一定自动失效。

#### 另一个 2026 年的变化

Shopify 在 **2026 年 4 月 7 日** 发布的变更说明指出：替换或删除 Shopify 托管的文件后，平台不再主动清除其旧 CDN URL 的缓存内容。

旧 URL 可能继续返回此前缓存的文件，直到缓存 TTL 到期。

因此 Shopify 更强调使用 `asset_url`、`file_url` 和 `image_url` 等过滤器，让页面获取当前正确的版本化 URL。

这对于你以后开发 Theme 或第三方 App 都很重要。

### 3. Shopify 的 HTML 页面也会被 CDN 缓存吗？

会。Shopify 的 Liquid Theme 店面 HTML 也可以利用 Shopify 平台管理的 CDN 缓存，但与静态资源的长期缓存不同。

Shopify 官方明确说明：Liquid Theme 的店面 HTML 缓存由平台管理，开发者通常不需要自行配置完整页面缓存。

但它不代表：

```text
所有 Shopify HTML 页面
     ↓
都缓存一年
     ↓
所有用户得到完全相同的 HTML
```

因为实际页面可能受到这些因素影响：

- 请求路径和查询参数。
- 市场、语言和货币上下文。
- 用户会话或其他个性化因素。
- 资源更新和平台失效策略。
- 请求是否满足平台缓存条件。

对于普通 Theme 开发，你的主要工作不是自行控制 Shopify 的全站 HTML CDN TTL，而是优化 Liquid 渲染、减少首屏资源阻塞，并正确使用平台资源 URL。

### 4. Cart Ajax API 是否适合缓存？

例如：

```js
fetch(window.Shopify.routes.root + "cart.js");
```

这会请求当前用户会话的购物车数据。

它不同于公开的 `theme.js` 或商品主图。

购物车数据具有用户会话相关性，而且发生加购、删购、修改数量等操作后，需要确保显示当前有效的数据。

因此：

**不要将购物车响应当作所有用户共享的公共静态资源缓存。**

如果你编写了自定义购物车状态管理，可以根据业务情况维护本地状态，但必须正确处理请求竞争、状态过期和服务器返回的结果。

对于需要明确绕开浏览器 HTTP 缓存读取的请求，可以考虑：

```js
const response = await fetch(
  window.Shopify.routes.root + "cart.js",
  {
    cache: "no-store"
  }
);

const cart = await response.json();
```

这里的 `cache: "no-store"` 控制的是该次 Fetch 使用浏览器 HTTP 缓存的方式，不是修改 Shopify 服务器的 `Cache-Control` 响应头，也不能据此推断 CDN 一定不会参与处理请求。

是否需要这样写，要结合 Shopify 实际响应头和业务状态管理来判断，而不是所有 Ajax 请求都统一设置 `no-store`。

---

## 十、Vary：同一个 URL 不一定代表相同内容

这是一个更深入的知识点。

假设服务器对同一个 URL：

```text
/product
```

根据请求中的某个 HTTP 头返回不同内容。

例如不同的语言版本。

此时缓存不能只根据 URL 就断言两份响应一定可以互换。

HTTP 提供了 `Vary` 响应头。

例如：

```http
Vary: Accept-Language
```

表示缓存匹配响应时，还应考虑请求中的 `Accept-Language` 等对应信息。

另一个常见例子：

```http
Vary: Accept-Encoding
```

它可以帮助正确区分不同内容编码的响应变体。

不过电商网站尤其需要注意：

`Vary` 不是访问控制机制，也不能代替对个人信息的私有缓存管理。

此外，具体 CDN 会使用怎样的缓存键、对哪些头进行区分，还取决于 CDN 配置。

对于 Shopify 来说，这些底层行为通常由平台管理。Theme 开发者不应该直接根据一个商品 URL 相同，就假定其 HTTP 响应在所有市场或用户上下文中完全一致。

---

## 十一、如何通过 Chrome DevTools 验证缓存？

现在做一次真正的缓存分析。

### 第一步：打开 Network

在 Chrome 中打开网站，按 F12，选择 **Network**。

这里有一个你以前做性能测试时可能忽略的重要选项：

**Disable cache。**

<box border radius="lg" padding={3} gap={2}>
  <row align="center" gap={2}>
    <icon name="info" color="secondary"/>
    **本课实验必须取消勾选 Disable cache。**
  </row>
  否则 DevTools 会禁用浏览器 HTTP 缓存，你就很难观察正常的重复访问缓存行为。
</box>

这项设置通常在 DevTools 打开期间生效。

### 第二步：第一次加载页面

打开一个之前没有缓存过的页面。

观察：

- `Status` 通常是 `200`。
- `Size` 显示实际传输信息。
- Response Headers 中是否包含 `Cache-Control`。
- 是否包含 `ETag` 或 `Last-Modified`。

### 第三步：正常刷新

使用普通刷新，而不是强制重新加载。

观察是否出现：

```text
(from memory cache)
```

或：

```text
(from disk cache)
```

也可能出现：

```http
304 Not Modified
```

但不要认为所有相同 URL 的资源都会以同样方式命中缓存，因为它们各自的响应头、请求条件和浏览器策略可能不同。

### 第四步：点击某个资源，查看 Headers

重点观察：

| Header | 需要关注什么 |
|---|---|
| `Cache-Control` | 允许缓存多久，是否要求验证 |
| `ETag` | 是否存在版本验证器 |
| `Last-Modified` | 是否存在修改时间验证器 |
| `Age` | 响应在缓存体系中的年龄 |
| `Vary` | 缓存匹配还需要考虑哪些请求头 |
| `If-None-Match` | 客户端是否发起 ETag 验证 |
| `If-Modified-Since` | 客户端是否发起修改时间验证 |

#### 一个重要问题：为什么 304 不代表请求很快？

因为 304 依然可能需要：

```text
浏览器
   ↓
网络请求
   ↓
CDN / 服务器进行验证
   ↓
返回 304
   ↓
浏览器读取本地内容
```

如果网络 RTT 较大，例如 150ms，那么协商验证本身就可能消耗明显时间。

而仍处于新鲜期的强缓存通常可以避免这个验证往返。

所以从网络性能角度，一般而言：

**强缓存命中 → 协商缓存返回 304 → 完整重新下载**

往往意味着从左到右可能承担更多网络成本，但具体速度仍然受文件大小、本地存储、网络与服务器行为影响。

---

## 十二、缓存优化的一套实际工程策略

假设你在开发一个普通电商前端，并且能控制自己的服务器响应头。

可以从下面的思路开始。

| 资源类型 | 策略方向 |
|---|---|
| HTML 文档 | 对需要及时更新的页面采用验证策略 |
| 版本化 CSS / JS | 较长的缓存时间，必要时 `immutable` |
| 版本化公开图片 | 长期缓存并使用版本化 URL |
| 公开且可短暂过期的数据 | 按业务设置短 TTL 或重新验证 |
| 个性化响应 | 限制共享缓存，根据敏感程度选择 private 或 no-store |
| 实时购物车与结算数据 | 以当前服务端状态为准，避免复用过期共享响应 |

对于 Shopify Theme，则更建议：

**第一，交给 Shopify 管理 CDN 与资源版本化。** 使用官方 Liquid URL 过滤器，不要在 Theme 中硬编码资源版本。

**第二，区分首屏性能与缓存性能。** 缓存对重复访问帮助很大，但首次访问仍然需要做好图片优化、资源优先级管理和浏览器渲染优化。

**第三，谨慎增加自建缓存层。** 如果在 Shopify 外面再套一层代理 CDN 或自行缓存 HTML，需要承担更多缓存失效与个性化正确性的风险。Shopify 官方也明确提醒，额外代理可能导致过期价格、库存或内容问题。

---

## 十三、本课总结

今天我们建立了一套完整的 HTTP 缓存知识体系。

| 概念 | 一句话理解 |
|---|---|
| 浏览器缓存 | 浏览器本地保存可复用的 HTTP 响应 |
| CDN 缓存 | 网络边缘的共享缓存 |
| 强缓存 | 响应仍新鲜，无需验证即可复用 |
| 协商缓存 | 通过服务器或缓存层验证资源是否改变 |
| `max-age` | 规定缓存新鲜期 |
| `no-cache` | 允许存储，但正常复用需要验证 |
| `no-store` | 禁止 HTTP 缓存存储 |
| `ETag` | 资源版本验证标识 |
| `Last-Modified` | 基于修改时间进行验证 |
| `304` | 内容未变，可复用已有缓存响应体 |
| `s-maxage` | 共享缓存的新鲜期 |
| `stale-while-revalidate` | 在允许范围内先用旧缓存并重新验证 |
| Cache Busting | 通过版本化 URL 保证资源更新后获取新版本 |

缓存设计的核心原则：

**缓存优化不是让所有资源都尽可能缓存得久，而是在保证资源正确性和新鲜度的前提下，最大限度减少重复请求、验证和数据传输。**

尤其是 Shopify Theme，很多缓存底层工作平台已经帮你实现了。你的工作是正确使用这些能力，而不是重新实现一套缓存系统。

## 参考资料

- [Cache-Control header - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [HTTP caching - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- [HTTP conditional requests - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests)
- [304 Not Modified - HTTP | MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304)
- [content/files/en-us/web/http/reference/headers/cache-control/index.md at main · mdn/content · GitHub](https://github.com/mdn/content/blob/main/files/en-us/web/http/reference/headers/cache-control/index.md?plain=1)
- [developer.chrome.com/site/en/docs/devtools/settings/preferences/index.md at main · GoogleChrome/developer.chrome.com · GitHub](https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/docs/devtools/settings/preferences/index.md)
- [Service worker caching and HTTP caching | Articles | web.dev](https://web.dev/articles/service-worker-caching-and-http-caching)
- [Bare query strings no longer bust the cache for assets - Shopify developer changelog](https://shopify.dev/changelog/posts/bare-query-strings-no-longer-bust-the-cache-for-assets)
- [The Shopify platform](https://shopify.dev/docs/storefronts/themes/best-practices/performance/platform)
- [Performance best practices for Shopify themes](https://shopify.dev/docs/storefronts/themes/best-practices/performance)
- [Replacing or deleting a Shopify-hosted file no longer purges its CDN URL - Shopify developer changelog](https://shopify.dev/changelog/posts/replacing-or-deleting-a-shopify-hosted-file-no-longer-purges-its-cdn-url)
- [Serve assets from Shopify CDN](https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-shopify-cdn)
- [Standardization of Asset URL Version Parameters - Shopify developer changelog](https://shopify.dev/changelog/posts/standardization-of-asset-url-version-parameters)
- [About the Shopify Ajax API](https://shopify.dev/docs/api/ajax)
- [Performance best practices for Hydrogen storefronts](https://shopify.dev/docs/storefronts/themes/best-practices/performance/hydrogen-performance)
- [Avoid request proxies](https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-request-proxies)
- [Network features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/network/reference/)
- [Preferences | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/settings/preferences?authuser=11)
- [Preferences | Chrome DevTools | Chrome for Developers](https://developer.chrome.com/docs/devtools/settings/preferences?authuser=2)
- [Network features reference | Chrome DevTools | Chrome for Developers](https://developer.chrome.google.cn/docs/devtools/network/reference?hl=en)
- [Sections API is sometimes returning null - Shopify App Store - Shopify Developer Community Forums](https://community.shopify.dev/t/sections-api-is-sometimes-returning-null/39219)
- [Cart items intermittently dropping after add-to-cart (custom theme / AJAX cart) - Online Store and Theme Development - Shopify Developer Community Forums](https://community.shopify.dev/t/cart-items-intermittently-dropping-after-add-to-cart-custom-theme-ajax-cart/23913)
- [Aggressive bot detection with 429 errors AJAX Cart API - #9 by Alberto_Breeze - Online Store and Theme Development - Shopify Developer Community Forums](https://community.shopify.dev/t/aggressive-bot-detection-with-429-errors-ajax-cart-api/28900/9)
- [Caching demystified: Inspect, clear, and disable caches #DevToolsTips - YouTube](https://www.youtube.com/watch?v=mSMb-aH6sUw)
