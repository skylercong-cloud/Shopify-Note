# Shopify Markets 的定价、翻译与国际化 URL

本文聚焦 Shopify Markets 的定价、主题翻译、国际化链接和调试。

## 多货币价格：Dawn 到底是怎么显示不同货币的？



假设有一个商品：

```text
Product: Running Shoes

美国市场：$100 USD
加拿大市场：$145 CAD
日本市场：¥15,800 JPY
```

当用户切换国家以后，Dawn 为什么能够显示不同的商品价格？

首先要理解：

**Dawn 并不负责汇率换算，Shopify 负责根据当前 Market 确定商品价格。**

### 1. 先看 price.liquid

打开：

[snippets/price.liquid](https://github.com/Shopify/dawn/blob/main/snippets/price.liquid)

核心代码：

```liquid
{% liquid
  if use_variant
    assign target = product.selected_or_first_available_variant
  elsif placeholder
    assign target = null
  else
    assign target = product
  endif

  assign price = target.price | default: 1999

  assign money_price = price | money

  if settings.currency_code_enabled
    assign money_price = price | money_with_currency
  endif
%}
```

这里最重要的是：

```liquid
assign price = target.price
```

以及：

```liquid
assign money_price = price | money
```

你可能会疑惑：

为什么这里没有：

```liquid
price * exchange_rate
```

也没有：

```liquid
if country == 'JP'
```

原因是 Shopify 已经根据当前市场上下文，返回了相应的商品价格数据。

Dawn 只负责格式化和展示。

### 2. money 与 money_with_currency 有什么区别？

Shopify 提供了两种常用的价格过滤器。

```liquid
{{ product.price | money }}
```

和：

```liquid
{{ product.price | money_with_currency }}
```

例如加拿大货币：

| 过滤器 | 可能的结果 |
|---|---|
| `money` | `$145.00` |
| `money_with_currency` | `$145.00 CAD` |

具体格式取决于商家设置的货币格式。

这里非常值得注意：

`money_with_currency` 不是把 USD 转换成 CAD。

它只是在当前货币上下文中，将金额格式化为带货币信息的字符串。

### 3. 为什么跨境店铺推荐使用货币代码？

因为很多国家使用相同的货币符号。

例如：

```text
USD：$
CAD：$
AUD：$
```

如果只显示：

```text
$100
```

用户可能不知道具体是哪种货币。

因此，对于多市场电商网站，明确展示：

```text
$100.00 USD
$145.00 CAD
$155.00 AUD
```

往往更容易理解。

Shopify 官方也提供了 Explicit Currency Formatting 的专门开发指导。

### 4. 价格换算究竟发生在哪一层？

我们画一下流程：

<box border radius="lg" padding={3} gap={2}>
  <box background="surface-secondary" padding={3} radius="md" align="center">
    **商品基础定价**
    <text color="secondary" size="xs">例如店铺基础价格：100 USD</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box border radius="md" padding={3} align="center">
    **Shopify Markets**
    <text color="secondary" size="xs">根据 Market 应用对应的 Catalog、定价和货币规则</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box background="surface-secondary" padding={3} radius="md" align="center">
    **Liquid Product / Variant**
    <text color="secondary" size="xs">提供当前市场的商品价格</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box border radius="md" padding={3} align="center">
    **price.liquid**
    <text color="secondary" size="xs">使用 money 或 money_with_currency 格式化</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box background="surface-secondary" padding={3} radius="md" align="center">
    **浏览器展示价格**
  </box>
</box>

这里还有一个重要细节：Markets 的定价不一定只是汇率换算。

Shopify 支持根据市场配置自动或手动汇率，也可以通过 Catalog 设置对应商品的价格。

因此，**不能假设加拿大商品价格永远等于美国价格乘上实时汇率。**

---

## Locales：Dawn 是如何实现多语言文案的？

现在进入第二个核心模块。

打开 Dawn：

```text
locales/
  en.default.json
  en.default.schema.json
  ...
```

这里要区分两种不同类型的翻译文件。

### 1. Storefront Locale：前台页面的翻译

例如：

`locales/en.default.json`

源码里包含：

```json
{
  "general": {
    "continue_shopping": "Continue shopping",
    "search": {
      "search": "Search",
      "reset": "Clear search term"
    }
  }
}
```

当我们在 Liquid 中写：

```liquid
{{ 'general.continue_shopping' | t }}
```

Shopify 会根据当前语言，从对应翻译中读取文案。

假设：

英语：

```json
{
  "general": {
    "continue_shopping": "Continue shopping"
  }
}
```

法语：

```json
{
  "general": {
    "continue_shopping": "Continuer vos achats"
  }
}
```

同一段 Liquid：

```liquid
{{ 'general.continue_shopping' | t }}
```

在不同语言环境下会输出相应的文案。

这里的：

```liquid
| t
```

就是 Shopify 的 `translate` 过滤器。

### 2. 为什么不要在 Liquid 中直接写英文？

假设你开发一个自定义 Section：

```liquid
<button>Add to cart</button>
```

如果站点切换为日语，这段文字仍然是英文。

正确做法是将通用 UI 文案放进 Locale 文件：

```json
{
  "custom": {
    "add_to_cart": "Add to cart"
  }
}
```

Liquid：

```liquid
<button>
  {{ 'custom.add_to_cart' | t }}
</button>
```

这样后续增加语言时，只需要提供对应翻译。

这也是为什么 Dawn 许多文件里会大量出现：

```liquid
{{ 'products.product.add_to_cart' | t }}
```

或者：

```liquid
{{ 'sections.cart.checkout' | t }}
```

### 3. 翻译还可以带参数

例如 Dawn 的分页文案：

```json
{
  "general": {
    "pagination": {
      "page": "Page {{ number }}"
    }
  }
}
```

Liquid：

```liquid
{{ 'general.pagination.page' | t: number: 3 }}
```

结果：

```text
Page 3
```

这是翻译字符串插值。

相比直接拼接：

```liquid
Page {{ paginate.current_page }}
```

它允许不同语言调整文字和数字的组合顺序。

此外，Shopify 的翻译系统还支持复数等本地化能力。

### 4. Schema Locale：翻译 Theme Editor，而不是商店前台

另一个文件：

```text
locales/en.default.schema.json
```

它的用途不同。

假设你在 Section Schema 中写：

```json
{
  "type": "text",
  "id": "heading",
  "label": "Heading"
}
```

那么 Theme Editor 的设置面板中就会出现 Heading。

如果希望这个标签支持多语言，就可以在 Schema 中写：

```json
{
  "type": "text",
  "id": "heading",
  "label": "t:sections.custom.heading.label"
}
```

然后在：

`locales/en.default.schema.json`

添加：

```json
{
  "sections": {
    "custom": {
      "heading": {
        "label": "Heading"
      }
    }
  }
}
```

注意，这里：

```text
t:sections.custom.heading.label
```

是 Schema 中引用翻译的方式，不是 Liquid 的 `| t` 过滤器。

所以两种翻译文件的区别是：

| 文件 | 翻译对象 |
|---|---|
| `en.default.json` | 消费者看到的前台文案 |
| `en.default.schema.json` | 商家在 Theme Editor 中看到的配置文字 |



### 5. 一个容易混淆的问题：Locale 文件能翻译商品标题吗？

不能直接这样理解。

例如 Product 的标题：

```liquid
{{ product.title }}
```

并不是从：

```text
locales/en.default.json
```

读取的。

商品标题、描述、Collection 内容等属于商店内容数据。

通常需要通过 Shopify 的翻译能力或 Translate & Adapt 等工具提供对应语言的内容。

而 `locales/*.json` 主要负责 Theme 界面文案。

Shopify 也支持针对不同市场调整内容，而不只是做语言翻译。

---

## 国际化 URL：为什么不能在 Theme 中写死 /cart、/search？

这部分很重要，而且和我们之前研究过的 Dawn 购物车、搜索系统直接相关。

假设店铺使用不同的语言和市场 URL：

```text
美国：
example.com/products/t-shirt

法国：
example.com/fr-fr/products/t-shirt

加拿大法语：
example.com/fr-ca/products/t-shirt
```

<text color="secondary" size="xs">这里是常见的 URL 配置示例，实际路径由 Markets 的域名和语言配置决定。</text>

如果你在代码里写死：

```js
fetch('/cart/add.js')
```

或者：

```html
<a href="/search">
```

就可能绕过当前市场或语言前缀。

### 1. Dawn 如何解决？

核心就是 Shopify 的：

```liquid
routes
```

例如：

```liquid
{{ routes.root_url }}

{{ routes.cart_url }}

{{ routes.search_url }}

{{ routes.product_recommendations_url }}
```

这些 URL 会根据当前商店上下文生成。

官方文档也建议在 Theme 中使用 `routes` 对象，而不是硬编码固定路径。

### 2. Ajax API 应该如何处理？

在 Dawn 中，你之前已经见过：

```js
fetch(routes.cart_add_url, config);
```

而不是：

```js
fetch('/cart/add.js', config);
```

为什么？

因为：

```js
routes.cart_add_url
```

来自 Liquid 注入的本地化路由。

因此可以保留当前市场或语言上下文。

假设用户处于：

```text
/fr-ca/
```

正确的请求路径可能需要包含对应本地化前缀。

如果你写死根路径，就可能导致请求与当前本地化上下文不一致。

### 3. 自己开发新功能时的推荐写法

如果使用 Dawn 已经定义的全局路由：

```js
fetch(routes.cart_add_url, config);
```

如果你开发一个新的 Theme 组件，也可以使用：

```js
const root = window.Shopify.routes.root;
const url = `${root}cart.js`;

fetch(url)
  .then(response => response.json())
  .then(cart => console.log(cart));
```

注意这里：

```js
window.Shopify.routes.root
```

是 Shopify 提供的本地化根路径。

这与 Liquid 的：

```liquid
routes.root_url
```

是相通的思路。

开发 Theme 时要尽量避免：

```js
'/cart'
'/search'
'/products/...'
```

这种未经本地化处理的固定路径拼接。

---

## Markets 与 SEO：不同语言页面为什么要有不同 URL？

假设你有英语和法语两个版本：

```text
example.com/products/t-shirt
example.com/fr-fr/products/t-shirt
```

两个页面展示的是同一个商品，但面向不同语言和地区。

搜索引擎需要知道它们之间的对应关系。

这就涉及：

```html
<link rel="alternate" hreflang="en" href="...">
<link rel="alternate" hreflang="fr-FR" href="...">
```

通常称为 `hreflang`。

Shopify 会根据 Markets 的域名和语言配置生成相关语言版本的 SEO 标记。

这与我们计划在第 17 课学习的：

```liquid
{{ canonical_url }}
```

以及：

```liquid
{{ content_for_header }}
```

有直接关系。

但今天需要先记住两个原则。

**第一：不要把所有语言版本强行设置为同一个 URL。**

否则用户分享和搜索引擎索引时，可能无法正确识别对应语言。

**第二：不要在 Theme 中随意硬编码所有国家的 hreflang。**

因为 Markets 的语言和域名配置可能随时调整。

如果你自己手动写死：

```text
/fr
/de
/jp
```

但商家后来把市场 URL 改成：

```text
/fr-fr
/de-de
/ja-jp
```

就会导致 SEO 配置与实际 URL 不一致。

正确做法是尽量使用 Shopify 提供的市场、语言和 URL 能力。

---

## 一个非常实际的问题：切换国家后，购物车会怎样？

这里我们结合之前的 Cart 课程，讨论一个真实业务问题。

假设用户在美国市场把商品加入购物车：

```text
T-Shirt × 2
Price: $30 USD / 件
```

接着他将 Country 切换为 Canada。

此时如果加拿大市场的价格不同，购物车应该以哪个价格为准？

**不能简单地继续使用之前保存在前端的 USD 商品价格。**

切换上下文后，Shopify 会按照当前购物车、市场和定价规则处理适用的货币与价格。

具体结果还取决于商品是否在新市场可售、Markets Catalog、折扣和支付配置等因素。

这也是为什么我之前一直强调：

**Theme 中显示的价格不是成交价格的权威数据来源，最终仍以 Shopify 的购物车和 Checkout 计算为准。**

### 1. 不要在浏览器中自己换算 Cart Total

错误设计：

```js
const cadTotal = usdTotal * 1.35;

document.querySelector('.cart-total').textContent =
  `CA$${cadTotal}`;
```

这里有几个潜在问题：

- Markets 可能使用固定价格，不是实时汇率。
- 可能有价格调整或舍入规则。
- 不同市场可能有不同税费展示规则。
- 商品目录可能存在差异。
- 折扣的计算可能受到市场上下文影响。

因此，改变市场后应该让 Shopify 返回当前上下文的购物车结果，再更新显示。

### 2. Dawn 为什么使用 Localization Form 整页导航？

现在我们再回过头看：

```js
form.submit();
```

是不是更容易理解了？

因为切换国家可能影响整个页面：

```text
Country
  ↓
Market
  ↓
Product data / pricing
  ↓
Cart and checkout context
  ↓
Page URL / language
```

直接由 Shopify 完成本地化切换与页面重新渲染，可以避免开发者手动同步一大批不同组件状态。

---

## 源码中的一个值得改进的地方

我们现在不仅仅是学习 Dawn，还要练习源码审查。

回到：

`assets/localization-form.js`

Dawn 实现了国家搜索：

```js
normalizeString(str) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
```

这段代码非常有意思。

它将字符串分解，并去除附加音标，以便实现更宽松的国家名称搜索。

例如：

```text
Côte d'Ivoire
```

通过规范化以后，搜索时更容易匹配不输入重音符号的文本。

接下来是：

```js
filterCountries() {
  const searchValue =
    this.normalizeString(this.elements.search.value);

  const allCountries = this.querySelectorAll('a');

  // 根据国家名称过滤显示
}
```

它使用前端字符串搜索，而不是每输入一个字符就请求服务器。

这很合理，因为国家列表的数据量通常比较小，而且所有可选国家已经在初始 HTML 中。

但是有一个需要注意的细节：

当前源码中的计数逻辑将：

```js
let visibleCountries = allCountries.length;
```

作为初始值，后续对匹配的国家还执行：

```js
visibleCountries++;
```

而不匹配时执行：

```js
visibleCountries--;
```

这意味着计数存在潜在的逻辑问题。

如果目标是统计实际可见国家数量，更直接的方式是：

```js
let visibleCountries = 0;

allCountries.forEach((item) => {
  const countryName = this.normalizeString(
    item.querySelector('.country').textContent
  );

  const matches = countryName.includes(searchValue);

  item.parentElement.classList.toggle(
    'hidden',
    !matches
  );

  if (matches) {
    visibleCountries++;
  }
});
```

不过要注意 Dawn 中还包含热门国家列表，某些国家可能同时出现在热门列表与完整列表中。

如果 UI 要展示“唯一国家数量”，还需要去重，而不是仅仅统计可见链接数量。

这就是源码研读的另一个价值：**能够发现实现背后的数据结构假设，以及可能存在的边界问题。**

---

## 建议你亲自做的四个实验

这节课非常适合在支持多个市场和语言的测试店铺中验证。

<box border radius="lg" padding={3} gap={3}>
  **实验 1：查看当前 Localization 对象**

  在任意 Liquid Section 中临时输出：

  ```liquid
  <pre>
    Country: {{ localization.country.iso_code }}
    Language: {{ localization.language.iso_code }}
    Currency: {{ localization.country.currency.iso_code }}
    Market: {{ localization.market.handle }}
  </pre>
  ```

  切换不同国家和语言，观察数据变化。Market 的具体字段是否可用应以当前 Liquid 对象文档为准。

  <divider color="subtle"/>
  **实验 2：观察 Localization Form 请求**

  打开 DevTools → Network，选择国家 Japan。

  观察表单请求：

  ```text
  /localization
  ```

  检查提交内容中的：

  ```text
  country_code
  ```

  然后观察浏览器最终导航到哪个 URL。

  <divider color="subtle"/>
  **实验 3：观察不同货币下的商品价格**

  在商品详情页临时输出：

  ```liquid
  <p>Raw: {{ product.price }}</p>
  <p>Money: {{ product.price | money }}</p>
  <p>With currency: {{ product.price | money_with_currency }}</p>
  ```

  然后切换 Market，比较三个值。

  重点验证 Raw Price 是否随着市场价格发生变化，而不是仅仅货币符号变化。

  <divider color="subtle"/>
  **实验 4：验证本地化 Ajax Cart 路由**

  进入某个非默认语言或市场页面。

  在 Console 执行：

  ```js
  console.log(window.Shopify.routes.root);

  fetch(`${window.Shopify.routes.root}cart.js`)
    .then(res => res.json())
    .then(console.log);
  ```

  观察请求 URL 是否保留当前本地化路径，并检查购物车返回的数据。
</box>

---

## 本课完整知识总结

现在第 16 课的知识点可以串起来了。

| 模块 | Shopify 提供什么 | Dawn 负责什么 |
|---|---|---|
| Markets | 市场规则、Catalog、定价与货币配置 | 根据当前上下文展示页面 |
| Localization | 当前国家和语言、可用选项 | 渲染国家和语言选择器 |
| Localization Form | 处理国家和语言切换 | 收集选择并提交表单 |
| Locales | 翻译数据及翻译解析 | 使用 `t` 过滤器输出文案 |
| Prices | 当前市场的商品价格 | 通过 Money Filters 格式化 |
| URLs | 本地化域名与路由 | 使用 `routes` 生成正确路径 |
| Cart / Checkout | 购物车和成交价格计算 | 显示服务器返回的数据 |

本课有四个最值得记住的结论。

1. **切换国家不等于单纯切换货币。** 它可能改变整个 Shopify Market 上下文。
2. **Dawn 不负责汇率换算。** 它展示 Shopify 返回的市场价格。
3. **Locale 文件主要用于 Theme 界面文案。** 商品标题和描述等内容翻译需要商店内容翻译机制。
4. **国际化 URL 必须使用 Shopify 提供的路由能力。** 不要在 Theme 或 Ajax 请求中随意写死 `/cart`、`/search` 等路径。

### 本课自测

{@body const qs=[{q:"Dawn 中 product.price | money_with_currency 的作用是什么？",opts:["使用最新汇率换算商品价格","格式化当前货币价格，并包含货币信息","强制所有商品使用 USD"],a:1,why:"Shopify 决定当前市场价格，money_with_currency 负责展示格式，并不执行市场定价。"},{"q":"商品详情的 Add to Cart 文案与商品标题分别应如何翻译？",opts:["都放进 locales JSON","界面文案使用 locales 和 t，商品标题使用商店内容翻译","都必须通过 JavaScript 替换"],a:1,why:"Theme 通用文案和 Product 内容属于不同的数据来源。"},{"q":"跨市场 Theme 的 Ajax Cart URL 推荐怎么生成？",opts:["始终写死 /cart.js","使用 routes 或 Shopify.routes.root 等本地化路由","使用浏览器语言手动拼接国家代码"],a:1,why:"路由对象能够避免忽略市场/语言路径前缀。"},{"q":"用户切换 Canada 后，Theme 应该自己用美元价格乘汇率更新购物车吗？",opts:["应该，前端计算最快","不应该，应使用 Shopify 当前市场下的购物车与定价结果","只有商品有 Variant 时才需要"],a:1,why:"Markets 还可能包含固定价格、Catalog 和其他定价规则，不能只根据汇率计算。"}]}
{@body const [answers,setAnswers]=DIL.useState({})}
{@body const [submitted,setSubmitted]=DIL.useState(false)}
<box border radius="lg" padding={3} gap={3}>
  <row justify="between" align="center">
    **第 16 课知识检查**
    <text color="secondary" size="xs">{Object.keys(answers).length}/4 已作答</text>
  </row>
  {#each qs as q,i}
    <box gap={2}>
      **{i+1}. {q.q}**
      <radio-group direction="col" value={answers[i]===undefined?"":String(answers[i])} disabled={submitted} onChange={v=>setAnswers(a=>({...a,[i]:Number(v)}))}>
        {#each q.opts as opt,j}
          <radio value={String(j)}>{opt}</radio>
        {/each}
      </radio-group>
      {#if submitted}
        <row align="start" gap={2}>
          <icon name={answers[i]===q.a?"check-circle":"x-circle"} color={answers[i]===q.a?"success":"danger"}/>
          <box flex="1" gap={1}>
            **{answers[i]===q.a?"正确":`正确答案：${q.opts[q.a]}`}**
            <text color="secondary" size="sm">{q.why}</text>
          </box>
        </row>
      {/if}
    </box>
    {#if i!==3}
      <divider color="subtle"/>
    {/if}
  {/each}
  {#if submitted}
    **得分：{qs.filter((q,i)=>answers[i]===q.a).length}/4**
    <button block variant="outline" color="secondary" onClick={()=>{setAnswers({});setSubmitted(false)}}>重新作答</button>
  {:else}
    <button block disabled={Object.keys(answers).length!==4} onClick={()=>setSubmitted(true)}>提交答案</button>
  {/if}
</box>

## 参考资料

- [Shopify Help Center | Assigning domains and languages to markets](https://help.shopify.com/en/manual/markets/customizations/domains-and-languages?utm_source=chatgpt.com)
- [Shopify Help Center | Creating and activating markets](https://help.shopify.com/en/manual/markets/getting-started/set-up-markets?utm_source=chatgpt.com)
- [Shopify Help Center | Markets](https://help.shopify.com/en/manual/markets/?utm_source=chatgpt.com)
- [Shopify Help Center | International domains](https://help.shopify.com/en/manual/international/managing-international-domains?utm_source=chatgpt.com)
- [Shopify Help Center | Managing and editing markets](https://help.shopify.com/en/manual/markets/getting-started/managing-markets?utm_source=chatgpt.com)
- [Shopify Help Center | Customizing markets](https://help.shopify.com/en/manual/markets/customizations?utm_source=chatgpt.com)
- [Shopify Help Center | Setting up localization for markets](https://help.shopify.com/en/manual/markets/getting-started/localization?utm_source=chatgpt.com)
- [Shopify Help Center | International domains](https://help.shopify.com/en/manual/international/international-domains/setting-up-unique-urls/choosing-seo-strategy?utm_source=chatgpt.com)
- [Shopify Help Center | Overview of markets features and concepts](https://help.shopify.com/en/manual/markets/getting-started/overview?utm_source=chatgpt.com)
- [Shopify Help Center | Setting up currencies for markets](https://help.shopify.com/en/manual/markets/customizations/local-currencies?utm_source=chatgpt.com)
- [Shopify Help Center | Managing your store's languages](https://help.shopify.com/en/manual/international/languages/manage-languages?pcampaignid=%7Bcampaignid%7D&utm_source=chatgpt.com)
- [Shopify Help Center | Managing your store's languages](https://help.shopify.com/en/manual/international/languages/manage-languages?utm_source=chatgpt.com)
- [Storefront locale files](https://shopify.dev/docs/storefronts/themes/architecture/locales/storefront-locale-files?utm_source=chatgpt.com)
- [Schema locale files](https://shopify.dev/docs/storefronts/themes/architecture/locales/schema-locale-files?utm_source=chatgpt.com)
- [Locales](https://shopify.dev/docs/storefronts/themes/architecture/locales?utm_source=chatgpt.com)
- [Liquid filters: translate](https://shopify.dev/docs/api/liquid/filters/translate?utm_source=chatgpt.com)
- [ValidSchemaTranslations](https://shopify.dev/docs/storefronts/themes/tools/theme-check/checks/valid-schema-translations?utm_source=chatgpt.com)
- [Liquid tags: form](https://shopify.dev/docs/api/liquid/tags/form?utm_source=chatgpt.com)
- [Limitations for the theme settings locale - Online Store and Theme Development - Shopify Developer Community Forums](https://community.shopify.dev/t/limitations-for-the-theme-settings-locale/12758?utm_source=chatgpt.com)
- [MatchingSchemaTranslations](https://shopify.dev/docs/storefronts/themes/tools/theme-check/checks/matching-schema-translations?utm_source=chatgpt.com)
- [Langauge.root_url returns wrong value - Markets - Shopify Developer Community Forums](https://community.shopify.dev/t/langauge-root-url-returns-wrong-value/28350?utm_source=chatgpt.com)
- [theme - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/2026-07/queries/theme?utm_source=chatgpt.com)
- [themes - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/2026-07/queries/themes?utm_source=chatgpt.com)
- [theme - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/unstable/queries/theme?utm_source=chatgpt.com)
- [Checks reference](https://shopify.dev/docs/storefronts/themes/tools/theme-check/checks?utm_source=chatgpt.com)
- [Section schema](https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema?utm_source=chatgpt.com)
- [Support multiple currencies and languages](https://shopify.dev/docs/storefronts/themes/markets/multiple-currencies-languages?utm_source=chatgpt.com)
- [Country switcher stops working when ?country= is present in URL - Extensions - Shopify Developer Community Forums](https://community.shopify.dev/t/country-switcher-stops-working-when-country-is-present-in-url/33030?utm_source=chatgpt.com)
- [Localization - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/Localization?utm_source=chatgpt.com)
- [Localization - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/localization?utm_source=chatgpt.com)
- [Detect and set a visitor’s optimal localization](https://shopify.dev/docs/storefronts/themes/markets/localization-discovery?utm_source=chatgpt.com)
- [Liquid objects: localization](https://shopify.dev/docs/api/liquid/objects/localization?utm_source=chatgpt.com)
- [Localization - Storefront API](https://shopify.dev/docs/api/storefront/2027-01/objects/Localization?utm_source=chatgpt.com)
- [Localization - Storefront API](https://shopify.dev/docs/api/storefront/2025-10/objects/localization?utm_source=chatgpt.com)
- [Market - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/market?utm_source=chatgpt.com)
- [Market - Customer API](https://shopify.dev/docs/api/customer/latest/objects/market?utm_source=chatgpt.com)
- [Country - Storefront API](https://shopify.dev/docs/api/storefront/2025-10/objects/country?utm_source=chatgpt.com)
- [Country - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/country?utm_source=chatgpt.com)
- [Country - Storefront API](https://shopify.dev/docs/api/storefront/latest/objects/Country?utm_source=chatgpt.com)
- [Market - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/unstable/objects/Market?utm_source=chatgpt.com)
- [Country - Storefront API](https://shopify.dev/docs/api/storefront/2027-01/objects/Country?utm_source=chatgpt.com)
- [Liquid filters: currency_selector](https://shopify.dev/docs/api/liquid/filters/currency_selector?utm_source=chatgpt.com)
- [Shopify Markets](https://shopify.dev/docs/storefronts/themes/markets?utm_source=chatgpt.com)
- [Liquid objects: form_errors](https://shopify.dev/docs/api/liquid/objects/form_errors?utm_source=chatgpt.com)
- [Input settings](https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings?utm_source=chatgpt.com)
- [Liquid objects: country](https://shopify.dev/docs/api/liquid/objects/country?utm_source=chatgpt.com)
- [LanguageCode - Storefront API](https://shopify.dev/docs/api/storefront/latest/enums/LanguageCode?utm_source=chatgpt.com)
- [Liquid filters: money_with_currency](https://shopify.dev/docs/api/liquid/filters/money_with_currency?utm_source=chatgpt.com)
- [Liquid objects: routes](https://shopify.dev/docs/api/liquid/objects/routes?utm_source=chatgpt.com)
- [Liquid objects: money](https://shopify.dev/docs/api/liquid/objects/money?utm_source=chatgpt.com)
- [Liquid filters: money](https://shopify.dev/docs/api/liquid/filters/money?utm_source=chatgpt.com)
- [Liquid objects: line_item](https://shopify.dev/docs/api/liquid/objects/line_item?utm_source=chatgpt.com)
- [Explicit currency formatting](https://shopify.dev/docs/storefronts/themes/pricing-payments/currency-formatting?utm_source=chatgpt.com)
- [Liquid objects: shop_locale](https://shopify.dev/docs/api/liquid/objects/shop_locale?utm_source=chatgpt.com)
- [Theme store requirements](https://shopify.dev/docs/storefronts/themes/store/requirements?utm_source=chatgpt.com)
- [Liquid objects: transaction](https://shopify.dev/docs/api/liquid/objects/transaction?utm_source=chatgpt.com)
- [Liquid objects: product](https://shopify.dev/docs/api/liquid/objects/product?utm_source=chatgpt.com)
- [Liquid objects: store_credit_account](https://shopify.dev/docs/api/liquid/objects/store_credit_account?utm_source=chatgpt.com)
- [Liquid objects: shipping_method](https://shopify.dev/docs/api/liquid/objects/shipping_method?utm_source=chatgpt.com)
- [Liquid objects: checkout](https://shopify.dev/docs/api/liquid/objects/checkout?utm_source=chatgpt.com)
- [Liquid objects: variant](https://shopify.dev/docs/api/liquid/objects/variant?utm_source=chatgpt.com)
- [Liquid objects: cart](https://shopify.dev/docs/api/liquid/objects/cart?utm_source=chatgpt.com)
- [Langauge.root_url returns wrong value - #8 by Paige-Shopify - Markets - Shopify Developer Community Forums](https://community.shopify.dev/t/langauge-root-url-returns-wrong-value/28350/8?utm_source=chatgpt.com)
- [Liquid tags: break](https://shopify.dev/docs/api/liquid/tags/theme-break?utm_source=chatgpt.com)
- [Liquid objects: url](https://shopify.dev/docs/api/liquid/objects/url?utm_source=chatgpt.com)
- [Liquid objects: shop](https://shopify.dev/docs/api/liquid/objects/shop?utm_source=chatgpt.com)
- [Localizing Dawn - Online Store and Theme Development - Shopify Developer Community Forums](https://community.shopify.dev/t/localizing-dawn/23776?utm_source=chatgpt.com)
- [Translation - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/unstable/objects/translation?utm_source=chatgpt.com)
- [Translation - GraphQL Admin](https://shopify.dev/docs/api/admin-graphql/2026-01/objects/Translation?utm_source=chatgpt.com)
- [Manage translations of merchant-provided content](https://shopify.dev/docs/apps/build/markets/manage-translated-content?utm_source=chatgpt.com)
- [Confused how translations are stored - Theme Store - Shopify Developer Community Forums](https://community.shopify.dev/t/confused-how-translations-are-stored/36377?utm_source=chatgpt.com)
