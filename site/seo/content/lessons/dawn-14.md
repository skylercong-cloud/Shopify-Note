# Header 与导航系统：Mega Menu、移动端多级菜单、Sticky Header


前面深入研究过 Dawn 的商品详情页、Variant、购物车、商品推荐、Collection 筛选以及搜索系统。

这节课开始研究一个几乎所有页面都需要使用、但实现起来并不简单的公共模块：**Header（网站头部）**。

今天有四个核心问题：

1. Shopify 后台配置的导航菜单，如何变成 Dawn 中的多级菜单？
2. 桌面端 Dropdown 和 Mega Menu 有什么区别，分别怎么实现？
3. 移动端抽屉菜单如何实现多级导航、动画和焦点管理？
4. Sticky Header 为什么能够根据滚动方向隐藏、显示或者缩小 Logo？

这次我们直接分析官方 Dawn `main` 分支的真实源码。

## 一、Header 的源码架构

首先认识几个文件。

| 文件 | 主要职责 |
|---|---|
| [sections/header.liquid](https://github.com/Shopify/dawn/blob/main/sections/header.liquid) | Header 入口、配置、Sticky Header |
| [snippets/header-dropdown-menu.liquid](https://github.com/Shopify/dawn/blob/main/snippets/header-dropdown-menu.liquid) | 桌面普通下拉菜单 |
| [snippets/header-mega-menu.liquid](https://github.com/Shopify/dawn/blob/main/snippets/header-mega-menu.liquid) | 桌面 Mega Menu |
| [snippets/header-drawer.liquid](https://github.com/Shopify/dawn/blob/main/snippets/header-drawer.liquid) | 移动端及 Drawer 导航 |
| [assets/details-disclosure.js](https://github.com/Shopify/dawn/blob/main/assets/details-disclosure.js) | 菜单展开、收起 |
| [assets/details-modal.js](https://github.com/Shopify/dawn/blob/main/assets/details-modal.js) | 搜索弹窗 |
| [assets/global.js](https://github.com/Shopify/dawn/blob/main/assets/global.js) | MenuDrawer、HeaderDrawer、焦点管理 |
| [assets/component-mega-menu.css](https://github.com/Shopify/dawn/blob/main/assets/component-mega-menu.css) | Mega Menu 样式 |
| [assets/component-menu-drawer.css](https://github.com/Shopify/dawn/blob/main/assets/component-menu-drawer.css) | Drawer 动画和布局 |

你会发现一个很有意思的现象：

Dawn 并没有把所有导航逻辑写进一个 `header.js` 文件。

而是将不同的功能分别交给多个组件：

<box border radius="lg" padding={3} gap={2}>
  <box background="surface-secondary" padding={3} radius="md" align="center">
    **header.liquid**
    <text color="secondary" size="xs">读取设置，决定渲染什么导航</text>
  </box>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <grid columns={2} gap={2}>
    <grid-item>
      <box border radius="md" padding={3} gap={1}>
        **Desktop**
        <text color="secondary" size="xs">Dropdown / Mega Menu</text>
        <divider color="subtle"/>
        <text size="xs">header-menu</text>
        <text size="xs">DetailsDisclosure</text>
      </box>
    </grid-item>
    <grid-item>
      <box border radius="md" padding={3} gap={1}>
        **Mobile / Drawer**
        <text color="secondary" size="xs">滑动式多级菜单</text>
        <divider color="subtle"/>
        <text size="xs">header-drawer</text>
        <text size="xs">MenuDrawer</text>
      </box>
    </grid-item>
  </grid>
  <box align="center"><icon name="arrow-down" color="secondary"/></box>
  <box background="surface-secondary" padding={3} radius="md" align="center">
    **StickyHeader**
    <text color="secondary" size="xs">根据页面滚动控制整个 Header</text>
  </box>
</box>

这里可以看出三层职责：

- **Liquid：** 决定 HTML 结构和配置。
- **Web Components：** 实现用户交互和组件生命周期。
- **CSS：** 实现不同布局、响应式和动画。

---

## 二、第一步：Header 的配置是从哪里来的？

打开 `sections/header.liquid`，找到 Schema：

```json
{
  "type": "link_list",
  "id": "menu",
  "default": "main-menu",
  "label": "..."
}
```

以及：

```json
{
  "type": "select",
  "id": "menu_type_desktop",
  "options": [
    { "value": "dropdown" },
    { "value": "mega" },
    { "value": "drawer" }
  ],
  "default": "dropdown"
}
```

这里分别控制：

1. Header 使用哪个导航菜单。
2. 桌面端使用哪种菜单展示方式。

这两个设置是独立的。

假设 Shopify 后台定义了菜单：

```text
Shop
├── Men
│   ├── T-Shirts
│   ├── Jackets
│   └── Jeans
├── Women
│   ├── Dresses
│   └── Shoes
└── Accessories

About Us
Contact
```

Theme Editor 中选择这个 Menu 后，Liquid 便可以读取：

```liquid
section.settings.menu
```

以及：

```liquid
section.settings.menu.links
```

### 1. Shopify 的 link 对象是什么？

例如：

```liquid
{% for link in section.settings.menu.links %}

  {{ link.title }}
  {{ link.url }}

{% endfor %}
```

每个 `link` 是 Shopify 的 Link 对象。

你需要重点认识以下属性：

| 属性 | 含义 |
|---|---|
| `link.title` | 菜单文字 |
| `link.url` | 目标 URL |
| `link.links` | 子菜单 |
| `link.levels` | 当前链接下的嵌套层级数 |
| `link.active` | 链接是否处于当前或相关活动状态 |
| `link.current` | 是否指向当前页面 |
| `link.child_active` | 子链接是否处于活动状态 |
| `link.handle` | 链接的 Handle |

例如：

```liquid
{% for link in section.settings.menu.links %}

  <div>
    {{ link.title }}

    {% for childlink in link.links %}

      <div>
        {{ childlink.title }}

        {% for grandchildlink in childlink.links %}
          {{ grandchildlink.title }}
        {% endfor %}

      </div>

    {% endfor %}
  </div>

{% endfor %}
```

这就能输出三级菜单。

这里有个很重要的概念：

**Shopify 维护菜单树的数据结构，Dawn 负责将菜单树渲染成不同形式的 UI。**

你不需要在 Dawn 的 Schema 中逐个定义 Men、Women、Accessories，也不需要为每个菜单项创建一个独立 Section Block。

### 2. Dawn 如何根据菜单类型选择 Snippet？

`header.liquid` 中：

```liquid
{% liquid
  if section.settings.menu != blank

    if section.settings.menu_type_desktop == 'dropdown'
      render 'header-dropdown-menu'

    elsif section.settings.menu_type_desktop != 'drawer'
      render 'header-mega-menu'

    endif

  endif
%}
```

这段代码很好理解：

```text
menu_type_desktop = dropdown
    ↓
header-dropdown-menu.liquid

menu_type_desktop = mega
    ↓
header-mega-menu.liquid

menu_type_desktop = drawer
    ↓
不渲染桌面横向菜单
使用 header-drawer
```

所以 Dropdown、Mega Menu 和 Drawer 并不是三套不同的导航数据。

**同一棵菜单树，可以通过不同 Snippet 生成不同的 HTML 结构。**

---

## 三、桌面 Dropdown：为什么 Dawn 大量使用 `<details>`？

打开：

[snippets/header-dropdown-menu.liquid](https://github.com/Shopify/dawn/blob/main/snippets/header-dropdown-menu.liquid)

先看简化后的结构：

```liquid
<nav class="header__inline-menu">

  <ul class="list-menu list-menu--inline">

    {% for link in section.settings.menu.links %}

      <li>

        {% if link.links != blank %}

          <header-menu>
            <details>

              <summary>
                {{ link.title | escape }}
              </summary>

              <ul class="header__submenu">

                {% for childlink in link.links %}
                  <li>
                    <a href="{{ childlink.url }}">
                      {{ childlink.title | escape }}
                    </a>
                  </li>
                {% endfor %}

              </ul>

            </details>
          </header-menu>

        {% else %}

          <a href="{{ link.url }}">
            {{ link.title | escape }}
          </a>

        {% endif %}

      </li>

    {% endfor %}

  </ul>

</nav>
```

这里最关键的不是 `<nav>` 或 `<ul>`，而是：

```html
<details>
  <summary>Shop</summary>
  <ul>
    <li>Men</li>
    <li>Women</li>
  </ul>
</details>
```

### 1. details/summary 本身就是浏览器原生的展开组件

不需要 JavaScript，浏览器就能实现基本的展开和收起。

例如：

```html
<details>
  <summary>Shop</summary>

  <a href="/collections/men">Men</a>
  <a href="/collections/women">Women</a>
</details>
```

当用户点击 `Shop` 时，浏览器会为 details 添加：

```html
<details open>
```

再次点击时，会移除 `open` 属性。

Dawn 在这个基础上增加了动画、焦点处理以及与 Sticky Header 的配合。

这也是一种非常值得借鉴的方式：

**优先使用浏览器已有的语义化能力，再通过 JavaScript 增强，而不是从零实现所有交互。**

### 2. 为什么外面还包一层 header-menu？

```html
<header-menu>
  <details>...</details>
</header-menu>
```

因为 Dawn 需要让桌面菜单拥有额外的行为。

它对应：

```js
class HeaderMenu extends DetailsDisclosure
```

这里使用了 JavaScript 类继承。

下一节我们就深入它的实现。

## 四、深入 details-disclosure.js：菜单打开和关闭时发生了什么？

打开：

[assets/details-disclosure.js](https://github.com/Shopify/dawn/blob/main/assets/details-disclosure.js)

首先看父类：

```js
class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle =
      this.querySelector('details');

    this.content =
      this.mainDetailsToggle
        .querySelector('summary')
        .nextElementSibling;

    this.mainDetailsToggle.addEventListener(
      'focusout',
      this.onFocusOut.bind(this)
    );

    this.mainDetailsToggle.addEventListener(
      'toggle',
      this.onToggle.bind(this)
    );
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) {
        this.close();
      }
    });
  }

  onToggle() {
    if (!this.animations) {
      this.animations = this.content.getAnimations();
    }

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach(animation => animation.play());
    } else {
      this.animations.forEach(animation => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');

    this.mainDetailsToggle
      .querySelector('summary')
      .setAttribute('aria-expanded', false);
  }
}
```

这里有三个值得重点理解的知识点。

### 1. focusout：为什么焦点离开菜单后要关闭？

假设用户使用键盘操作：

```text
Tab
 ↓
Shop 菜单
 ↓
打开 Dropdown
 ↓
Tab 进入 Men
 ↓
Tab 进入 Women
 ↓
Tab 离开整个 Dropdown
```

当焦点离开整个 `header-menu` 时，Dawn 会关闭菜单。

这里：

```js
setTimeout(() => {
  if (!this.contains(document.activeElement)) {
    this.close();
  }
});
```

为什么使用 `setTimeout`？

因为需要在焦点完成切换之后，再检查：

```js
document.activeElement
```

此时才能判断新的焦点是否仍然位于当前组件内部。

如果新焦点仍然是菜单中的链接，就不关闭。

如果焦点已经移动到另一个菜单或页面元素，就关闭。

### 2. toggle：原生 details 的状态事件

当 details 从关闭变成打开时：

```html
<details open>
```

浏览器会派发 `toggle` 事件。

当它从打开变成关闭时，同样会派发 `toggle`。

这与 `click` 不同：即使通过 JavaScript 修改 `details.open`，也能触发相应的状态事件。

Dawn 利用这个事件管理动画：

```js
this.content.getAnimations()
```

获取当前内容元素相关的动画，然后：

```js
animation.play()
```

或者：

```js
animation.cancel()
```

这里值得你记住的是：

**Dawn 通过 DOM 的原生状态事件和 CSS 动画配合，不需要用 JavaScript 手动计算每一帧动画的位置。**

### 3. HeaderMenu 如何扩展父类？

继续往下：

```js
class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();

    this.header =
      document.querySelector('.header-wrapper');
  }

  onToggle() {
    if (!this.header) return;

    this.header.preventHide =
      this.mainDetailsToggle.open;

    if (
      document.documentElement.style.getPropertyValue(
        '--header-bottom-position-desktop'
      ) !== ''
    ) return;

    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(
        this.header.getBoundingClientRect().bottom
      )}px`
    );
  }
}

customElements.define('header-menu', HeaderMenu);
```

它继承了 `DetailsDisclosure`，但重写了 `onToggle()`。

这个重写非常关键：

父类的 `onToggle()` 主要处理动画；子类的 `onToggle()` 主要处理 Header 状态和位置。

由于这里没有调用 `super.onToggle()`，所以不能认为父类的动画逻辑也一定会执行。

这是阅读继承结构时需要特别注意的地方。

另外，`preventHide` 是设置在 `.header-wrapper` 上的自定义 JavaScript 属性，不是 HTML attribute。

---

## 五、Mega Menu：为什么不需要复杂的 JavaScript 布局算法？

打开：

[snippets/header-mega-menu.liquid](https://github.com/Shopify/dawn/blob/main/snippets/header-mega-menu.liquid)

我们来看核心结构：

```liquid
<header-menu>
  <details class="mega-menu">

    <summary>
      {{ link.title | escape }}
    </summary>

    <div class="mega-menu__content">

      <ul class="mega-menu__list page-width">

        {% for childlink in link.links %}
          <li>

            <a href="{{ childlink.url }}">
              {{ childlink.title }}
            </a>

            {% if childlink.links != blank %}

              <ul>

                {% for grandchildlink in childlink.links %}
                  <li>
                    <a href="{{ grandchildlink.url }}">
                      {{ grandchildlink.title }}
                    </a>
                  </li>
                {% endfor %}

              </ul>

            {% endif %}

          </li>
        {% endfor %}

      </ul>

    </div>

  </details>
</header-menu>
```

你会发现它和普通 Dropdown 非常相似。

它仍然使用：

```html
<header-menu>
  <details>
    <summary>...</summary>
  </details>
</header-menu>
```

真正不同的是内部布局。

<box border radius="lg" padding={3} gap={3}>
  <text weight="medium">普通 Dropdown</text>
  <box background="surface-secondary" radius="md" padding={3} gap={1} maxWidth="220px">
    **Shop** <icon name="chevron-down" inline size="sm"/>
    <divider color="subtle"/>
    Men
    Women
    Accessories
  </box>
  <divider/>
  <text weight="medium">Mega Menu</text>
  <box background="surface-secondary" radius="md" padding={3} gap={3}>
    <row justify="between" align="center">
      **Shop**
      <icon name="chevron-down"/>
    </row>
    <divider color="subtle"/>
    <grid columns={3} gap={3}>
      <grid-item>
        **Men**
        <text color="secondary" size="xs">T-Shirts</text>
        <text color="secondary" size="xs">Jackets</text>
        <text color="secondary" size="xs">Jeans</text>
      </grid-item>
      <grid-item>
        **Women**
        <text color="secondary" size="xs">Dresses</text>
        <text color="secondary" size="xs">Tops</text>
        <text color="secondary" size="xs">Shoes</text>
      </grid-item>
      <grid-item>
        **Accessories**
        <text color="secondary" size="xs">Bags</text>
        <text color="secondary" size="xs">Belts</text>
        <text color="secondary" size="xs">Jewelry</text>
      </grid-item>
    </grid>
  </box>
  <caption>布局示意：官方 Dawn 的 Mega Menu 主要是多列文字导航，不是自动生成商品图片或营销 Banner 的大型菜单系统。</caption>
</box>

### 1. 核心布局由 CSS Grid 实现

打开 `assets/component-mega-menu.css`：

```css
.mega-menu {
  position: static;
}

.mega-menu__content {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  padding-top: 3rem;
  padding-bottom: 3rem;
}

.mega-menu__list {
  display: grid;
  gap: 1.8rem 4rem;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
```

这里特别值得注意：

```css
grid-template-columns: repeat(6, minmax(0, 1fr));
```

它将内容区域分为六列。

为什么不用 JavaScript 计算每列宽度？

因为 CSS Grid 本来就非常适合这种布局。

如果你之前已经学过 CSS Grid，那么这里应该很好理解：

```text
Mega Menu
├── 第 1 列
├── 第 2 列
├── 第 3 列
├── 第 4 列
├── 第 5 列
└── 第 6 列
```

每个子菜单作为一个 Grid Item。

菜单有多少个子项，就输出多少个列表项，浏览器根据 Grid 规则自动布局。

### 2. Mega Menu 为什么可以横跨整个 Header？

看：

```css
.mega-menu {
  position: static;
}

.mega-menu__content {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
}
```

这里的 `position: static` 很关键。

因为 Mega Menu 的浮层不希望局限在某一个菜单项的宽度内。

它需要相对于更外层的定位容器展开。

所以内容可以横向铺满 Header 所在的区域。

### 3. 动画是怎么实现的？

```css
.js .mega-menu__content {
  opacity: 0;
  transform: translateY(-1.5rem);
}

.mega-menu[open] .mega-menu__content {
  opacity: 1;
  transform: translateY(0);
}
```

它使用：

```css
opacity
transform
```

实现位移和淡入的视觉变化。

这里有两个性能知识：

`transform` 和 `opacity` 的动画通常比直接修改 `top`、`left`、`width` 等布局属性更容易利用合成优化。

但不代表一定完全没有 Paint 或合成开销，仍然应该通过 DevTools 验证。

另一个需要注意的地方是：**原生 Dawn 的 Mega Menu 主要通过 `<summary>` 的展开交互控制，不应默认理解为鼠标 Hover 就自动打开。** 如果你需要悬停展开、延迟关闭和防误触区域，就需要额外设计事件逻辑。

---

## 六、移动端 Drawer：为什么使用嵌套 details？

现在进入这一课最有技术含量的部分。

打开：

[snippets/header-drawer.liquid](https://github.com/Shopify/dawn/blob/main/snippets/header-drawer.liquid)

最外层：

```liquid
<header-drawer
  data-breakpoint="
    {% if section.settings.menu_type_desktop == 'drawer' %}
      desktop
    {% else %}
      tablet
    {% endif %}
  "
>
  <details
    id="Details-menu-drawer-container"
    class="menu-drawer-container"
  >

    <summary class="header__icon--menu">
      <!-- Hamburger 图标 -->
    </summary>

    <div id="menu-drawer" class="menu-drawer">
      <!-- 导航树 -->
    </div>

  </details>
</header-drawer>
```

先关注：

```html
<header-drawer>
```

对应 `global.js` 中：

```js
class HeaderDrawer extends MenuDrawer
```

而 `MenuDrawer` 又继承：

```js
HTMLElement
```

这意味着移动导航其实也是通过 Web Component 实现的。

### 1. 多级菜单结构是什么样的？

我们将 Liquid 简化一下。

```liquid
{% for link in section.settings.menu.links %}

  {% if link.links != blank %}

    <details>
      <summary>
        {{ link.title }}
      </summary>

      <div class="menu-drawer__submenu">

        <button class="menu-drawer__close-button">
          Back
        </button>

        {% for childlink in link.links %}

          {% if childlink.links != blank %}

            <details>
              <summary>
                {{ childlink.title }}
              </summary>

              <div class="menu-drawer__submenu">
                <!-- 第三级菜单 -->
              </div>

            </details>

          {% else %}

            <a href="{{ childlink.url }}">
              {{ childlink.title }}
            </a>

          {% endif %}

        {% endfor %}

      </div>
    </details>

  {% else %}

    <a href="{{ link.url }}">
      {{ link.title }}
    </a>

  {% endif %}

{% endfor %}
```

这里最值得注意的是：

**每一级可展开的菜单，本身都是一个独立的 `<details>`。**

这意味着它天然具有自己的展开状态：

```js
details.open
```

所以 Dawn 不需要维护一个复杂的 React 式状态对象：

```js
{
  activeLevel1: 'Shop',
  activeLevel2: 'Men',
  activeLevel3: null
}
```

它主要利用 DOM 中各个 details 的 `open` 状态，以及 CSS class 来管理菜单层级。

### 2. 为什么移动端不是简单的下拉效果？

因为移动端空间有限。

如果每次点击子菜单，都向下展开一段内容，那么三级菜单可能变得非常长。

Dawn 采用的是横向滑动的层级导航。

<box border radius="lg" padding={3} gap={3}>
  {@body const navData={title:"Menu",items:[{name:"Shop",children:[{name:"Men",children:[{name:"T-Shirts"},{name:"Jackets"},{name:"Jeans"}]},{name:"Women",children:[{name:"Dresses"},{name:"Shoes"}]},{name:"Accessories",children:[{name:"Bags"},{name:"Belts"}]}]},{name:"New Arrivals"},{name:"About Us"}]}}
  {@body const [path,setPath] = DIL.useState([])}
  {@body const levels=[navData]}
  {@body let curr=navData}
  {@body for(const ix of path){curr=curr.items[ix];levels.push({title:curr.name,items:curr.children||[]})}}
  {@body const active=levels[levels.length-1]}
  <row align="center" justify="between">
    **移动导航交互演示**
    <badge>Level {path.length+1}</badge>
  </row>
  <box border radius="lg" clip maxWidth="330px" width="100%">
    <box background="surface-secondary" padding={3}>
      <row gap={2} align="center">
        {#if path.length>0}
          <button color="secondary" variant="ghost" size="sm" onClick={()=>setPath(p=>p.slice(0,-1))}>
            <icon name="arrow-left"/>
          </button>
        {:else}
          <icon name="menu"/>
        {/if}
        **{active.title}**
        <spacer/>
        <button variant="ghost" color="secondary" size="xs" onClick={()=>setPath([])}>
          <icon name="house" size="sm"/>
        </button>
      </row>
    </box>
    <box padding={2} gap={1} minHeight="190px">
      {#each active.items as item,i}
        <pressable padding={3} radius="md" onClick={()=>{if(item.children)setPath(p=>[...p,i]);else setPath([])}}>
          <row justify="between" align="center">
            {item.name}
            {#if item.children}
              <icon name="chevron-right" color="secondary"/>
            {:else}
              <icon name="arrow-up-right" color="secondary" size="sm"/>
            {/if}
          </row>
        </pressable>
      {/each}
    </box>
  </box>
  <caption>点击 Shop → Men 查看三级导航；此示例模拟层级切换，真实 Dawn 通过 details 与 CSS transform 实现滑动动画。</caption>
</box>

---

## 七、MenuDrawer.js：点击子菜单后具体执行什么？

打开 `assets/global.js`，搜索：

```js
class MenuDrawer extends HTMLElement
```

先看构造函数：

```js
constructor() {
  super();

  this.mainDetailsToggle = this.querySelector('details');

  this.addEventListener(
    'keyup',
    this.onKeyUp.bind(this)
  );

  this.addEventListener(
    'focusout',
    this.onFocusOut.bind(this)
  );

  this.bindEvents();
}
```

注意：

它没有单独给每一个菜单节点维护一个 JavaScript 状态变量。

它主要依赖：

- DOM 的 `open` 属性。
- `menu-opening` class。
- `submenu-open` class。

### 1. 点击一级菜单

核心逻辑：

```js
onSummaryClick(event) {
  const summaryElement = event.currentTarget;

  const detailsElement = summaryElement.parentNode;

  const parentMenuElement =
    detailsElement.closest('.has-submenu');

  const isOpen =
    detailsElement.hasAttribute('open');

  if (detailsElement === this.mainDetailsToggle) {

    if (isOpen) event.preventDefault();

    isOpen
      ? this.closeMenuDrawer(event, summaryElement)
      : this.openMenuDrawer(summaryElement);

  } else {

    setTimeout(() => {
      detailsElement.classList.add('menu-opening');

      summaryElement.setAttribute(
        'aria-expanded',
        true
      );

      parentMenuElement?.classList.add(
        'submenu-open'
      );

      // 后续处理焦点
    }, 100);

  }
}
```

这里有两个不同分支。

**分支 A：点击整个 Drawer 的 Hamburger 按钮**

执行：

```js
openMenuDrawer()
```

或者：

```js
closeMenuDrawer()
```

**分支 B：点击内部子菜单**

添加：

```js
menu-opening
submenu-open
```

然后由 CSS 控制子菜单滑入。

### 2. CSS 是如何让子菜单滑入的？

打开：

`assets/component-menu-drawer.css`

先看初始状态：

```css
.js .menu-drawer__submenu {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 100%;

  transform: translateX(100%);
  visibility: hidden;
}
```

这里：

```css
translateX(100%)
```

表示将子菜单移动到容器的右侧。

点击菜单后：

```css
.js details[open].menu-opening
  > .menu-drawer__submenu {
  transform: translateX(0);
  visibility: visible;
}
```

子菜单就会从右侧滑入。

状态可以理解为：

```text
初始：

| 当前菜单 |      子菜单      |
           translateX(100%)

展开后：

|      子菜单      |
        translateX(0)
```

所以：

- JavaScript 负责添加 class。
- CSS 负责元素的位置和动画。
- 浏览器负责真正的渲染。

这是一种比较清晰的职责分离。

### 3. 为什么关闭时不立即移除 open 属性？

看：

```js
closeAnimation(detailsElement) {
  let animationStart;

  const handleAnimation = (time) => {
    if (animationStart === undefined) {
      animationStart = time;
    }

    const elapsedTime = time - animationStart;

    if (elapsedTime < 400) {
      window.requestAnimationFrame(handleAnimation);
    } else {
      detailsElement.removeAttribute('open');

      if (detailsElement.closest('details[open]')) {
        trapFocus(
          detailsElement.closest('details[open]'),
          detailsElement.querySelector('summary')
        );
      }
    }
  };

  window.requestAnimationFrame(handleAnimation);
}
```

这里的逻辑很值得学习。

如果用户点击返回后立即移除：

```js
detailsElement.removeAttribute('open');
```

浏览器可能马上隐藏该子菜单。

这样用户就看不到完整的退出动画。

所以 Dawn 先移除 `menu-opening`，让 CSS 执行滑出动画。

等约 400ms 后，再移除 `open`。

不过这里也有一个可改进点：

**400ms 是硬编码时间，不是根据真实 CSS transitionend 决定。**

如果以后调整动画时长，JavaScript 和 CSS 的时间就可能不一致。

实际项目中可以考虑使用 `transitionend` 或 Web Animations API 来同步动画完成时机。

---

## 八、HeaderDrawer：为什么它还要继承 MenuDrawer？

现在看：

```js
class HeaderDrawer extends MenuDrawer
```

它并没有重写所有的多级菜单逻辑。

它只扩展 Header 特有的需求。

重点看：

```js
openMenuDrawer(summaryElement) {
  this.header =
    this.header || document.querySelector('.section-header');

  document.documentElement.style.setProperty(
    '--header-bottom-position',
    `${
      parseInt(
        this.header.getBoundingClientRect().bottom
      )
    }px`
  );

  this.header.classList.add('menu-open');

  // ...
}
```

这里最关键的是：

```css
--header-bottom-position
```

为什么需要这个 CSS 变量？

因为 Header 的高度可能变化。

例如：

- Logo 大小不同。
- Header 有两行导航。
- 移动端和桌面端布局不同。
- 有些页面会启用 Sticky Header。

如果移动端抽屉的高度总是简单写：

```css
height: 100vh;
```

抽屉可能超出屏幕底部。

所以 Dawn 根据 Header 当前的实际位置动态计算 Drawer 的可用高度。

CSS：

```css
.js .menu-drawer {
  height: calc(
    var(--viewport-height, 100vh) -
    var(--header-bottom-position, 100%)
  );
}
```

这里实际上是：

\[
Drawer高度 = 视口高度 - Header底部位置
\]

这样菜单就可以从 Header 下方展开，并尽量填满剩余屏幕空间。

还有两个重要的操作：

```js
trapFocus(this.mainDetailsToggle, summaryElement);
```

将焦点限制在菜单内。

以及：

```js
document.body.classList.add(
  `overflow-hidden-${this.dataset.breakpoint}`
);
```

防止用户打开 Drawer 后继续滚动背后的页面。

其中 `data-breakpoint` 在 Liquid 中决定：

```text
tablet
desktop
```

这样不同布局模式下，可以使用不同的滚动锁定规则。

---

## 九、Sticky Header：为什么能够根据滚动方向显示和隐藏？

这是本课另一个核心部分。

打开 `sections/header.liquid`，找到：

```liquid
{% liquid
  assign header_tag = 'div'

  if section.settings.sticky_header_type != 'none'
    assign header_tag = 'sticky-header'
  endif
%}
```

然后：

```liquid
<{{ header_tag }}
  {% if header_tag == 'sticky-header' %}
    data-sticky-type="{{ section.settings.sticky_header_type }}"
  {% endif %}
  class="header-wrapper"
>
  ...
</{{ header_tag }}>
```

这意味着：

如果不启用 Sticky Header：

```html
<div class="header-wrapper">
```

如果启用：

```html
<sticky-header
  data-sticky-type="on-scroll-up"
  class="header-wrapper"
>
```

接下来就由 JavaScript 控制。

### 1. Dawn 支持四种 Header 滚动模式

| 配置 | 行为 |
|---|---|
| `none` | 不启用粘性 Header |
| `on-scroll-up` | 向下滚动隐藏，向上滚动重新显示 |
| `always` | 始终保持粘性 |
| `reduce-logo-size` | 保持粘性，滚动后缩小 Logo |

其中 `reduce-logo-size` 在 Dawn 中还配合：

```css
.scrolled-past-header .header__heading-logo-wrapper {
  width: 75%;
}
```

也就是缩小 Logo 的宽度。

它不是直接修改整个 Header 的 CSS `scale()`。

### 2. StickyHeader 如何初始化？

看：

```js
connectedCallback() {
  this.header =
    document.querySelector('.section-header');

  this.headerIsAlwaysSticky =
    this.getAttribute('data-sticky-type') === 'always' ||
    this.getAttribute('data-sticky-type') === 'reduce-logo-size';

  this.headerBounds = {};

  this.setHeaderHeight();

  if (this.headerIsAlwaysSticky) {
    this.header.classList.add(
      'shopify-section-header-sticky'
    );
  }

  this.currentScrollTop = 0;
  this.preventReveal = false;

  this.onScrollHandler = this.onScroll.bind(this);

  window.addEventListener(
    'scroll',
    this.onScrollHandler,
    false
  );

  this.createObserver();
}
```

核心属性：

```js
this.currentScrollTop
```

记录上一次滚动位置。

```js
this.headerBounds
```

记录 Header 初始位置边界。

```js
this.headerIsAlwaysSticky
```

判断是否始终保持 Sticky。

### 3. 如何判断用户是在向上滚动还是向下滚动？

这就是：

```js
onScroll() {
  const scrollTop =
    window.pageYOffset ||
    document.documentElement.scrollTop;

  if (
    scrollTop > this.currentScrollTop &&
    scrollTop > this.headerBounds.bottom
  ) {
    // 向下滚动
    requestAnimationFrame(this.hide.bind(this));

  } else if (
    scrollTop < this.currentScrollTop &&
    scrollTop > this.headerBounds.bottom
  ) {
    // 向上滚动
    requestAnimationFrame(this.reveal.bind(this));

  } else if (
    scrollTop <= this.headerBounds.top
  ) {
    // 回到页面顶部
    requestAnimationFrame(this.reset.bind(this));
  }

  this.currentScrollTop = scrollTop;
}
```

上面省略了源码中的菜单状态保护和防重复显示逻辑，重点保留滚动方向判断。

实际上就是比较：

```js
scrollTop
```

和：

```js
this.currentScrollTop
```

例如：

```text
上一次 scrollTop = 200
本次 scrollTop = 350

350 > 200
→ 向下滚动
```

反过来：

```text
上一次 scrollTop = 350
本次 scrollTop = 280

280 < 350
→ 向上滚动
```

这里还加了一个边界条件：

```js
scrollTop > this.headerBounds.bottom
```

避免页面刚开始滚动时就立即隐藏 Header。

### 4. 为什么使用 requestAnimationFrame？

```js
requestAnimationFrame(
  this.hide.bind(this)
);
```

因为修改 Header class 会影响视觉呈现。

将修改安排到浏览器下一次渲染机会，可以让状态更新与渲染节奏更好地配合。

但需要注意：

**requestAnimationFrame 不等于自动消除所有性能问题。**

如果每个滚动事件都安排一个昂贵的 DOM 操作，仍然可能影响性能。

例如可以进一步使用一个简单的 RAF 标志位，避免在同一帧重复安排任务。

### 5. hide、reveal、reset 分别做了什么？

源码：

```js
hide() {
  if (this.headerIsAlwaysSticky) return;

  this.header.classList.add(
    'shopify-section-header-hidden',
    'shopify-section-header-sticky'
  );

  this.closeMenuDisclosure();
  this.closeSearchModal();
}

reveal() {
  if (this.headerIsAlwaysSticky) return;

  this.header.classList.add(
    'shopify-section-header-sticky',
    'animate'
  );

  this.header.classList.remove(
    'shopify-section-header-hidden'
  );
}

reset() {
  if (this.headerIsAlwaysSticky) return;

  this.header.classList.remove(
    'shopify-section-header-hidden',
    'shopify-section-header-sticky',
    'animate'
  );
}
```

我们通过一个交互示例理解三种状态。

{@body const [mode,setMode]=DIL.useState("top")}
<box border radius="lg" padding={3} gap={3}>
  <title size="lg">Sticky Header 状态演示</title>
  <segmented-control block size="md" value={mode} onChange={setMode} options={[{"label":"顶部","value":"top"},{"label":"向下滚动","value":"down"},{"label":"向上滚动","value":"up"}]}/>
  <box border radius="lg" clip>
    <box background="surface-secondary" height="70px" padding={3} justify="center" gap={1}>
      {#if mode!=="down"}
        <row justify="between" align="center">
          **STORE**
          <row gap={3} align="center">
            <text size="sm">Shop</text>
            <text size="sm">About</text>
            <icon name="shopping-bag"/>
          </row>
        </row>
      {:else}
        <box align="center">
          <text size="xs" color="secondary">Header 隐藏</text>
          <icon name="arrow-up" color="secondary"/>
        </box>
      {/if}
    </box>
    <divider color="subtle"/>
    <box padding={3} minHeight="110px" gap={2}>
      <box background="surface-tertiary" height="16px" width="90%" radius="sm"/>
      <box background="surface-tertiary" height="16px" width="70%" radius="sm"/>
      <box background="surface-tertiary" height="16px" width="82%" radius="sm"/>
      <box background="surface-tertiary" height="16px" width="60%" radius="sm"/>
    </box>
  </box>
  <text color="secondary" size="sm">
    {mode==="top"?"顶部状态：Header 正常展示。":mode==="down"?"向下滚动超过 Header 边界后：on-scroll-up 模式隐藏 Header。":"向上滚动：Header 重新显示，方便用户导航。"}
  </text>
</box>

### 6. 为什么 Header 隐藏时还要关闭菜单和搜索？

你应该注意到了：

```js
this.closeMenuDisclosure();
this.closeSearchModal();
```

因为用户可能正打开 Mega Menu 或搜索弹窗。

如果 Header 突然隐藏，但菜单浮层继续保持打开，就会出现奇怪的 UI 状态。

因此 Dawn 在隐藏 Header 的同时，主动收起相关组件。

这里又体现了一个非常重要的工程原则：

**多个独立 UI 组件虽然要保持解耦，但当它们之间存在交互约束时，需要明确协调这些状态。**

---

## 十、Sticky Header 中为什么还会出现 IntersectionObserver？

在 `StickyHeader` 中：

```js
createObserver() {
  let observer = new IntersectionObserver(
    (entries, observer) => {
      this.headerBounds = entries[0].intersectionRect;

      observer.disconnect();
    }
  );

  observer.observe(this.header);
}
```

你之前已经学习过 IntersectionObserver，例如推荐商品懒加载。

但这里完全不是为了懒加载。

它是为了确定 Header 的初始边界位置。

你可以将两种用途对比一下：

| 场景 | IntersectionObserver 的目的 |
|---|---|
| Product Recommendations | 判断何时开始请求推荐商品 |
| Sticky Header | 初始化 Header 的位置边界 |

这说明：

IntersectionObserver 不只是一个懒加载 API。

它本质上是一个用于观察元素与指定区域相交情况的浏览器 API。

`entries[0].intersectionRect` 表示目标元素与观察区域相交部分的矩形。

Dawn 获取之后就调用：

```js
observer.disconnect();
```

因为这里不需要持续观察，只需要初始化边界。

---

## 十一、一个很值得学习的细节：Header 不只是菜单

实际上 `header.liquid` 还负责组织：

- Logo。
- 搜索。
- 购物车图标。
- 账户入口。
- 国家/地区选择器。
- 语言选择器。
- App Blocks。
- SEO 结构化数据。

这些功能并不全部直接写在 `header.liquid` 中。

例如搜索：

```liquid
{% render 'header-search' %}
```

购物车数量图标：

```liquid
<a
  href="{{ routes.cart_url }}"
  id="cart-icon-bubble"
>
  ...
</a>
```

账户入口在当前 Dawn 中可以使用：

```html
<shopify-account>
```

此外，`header.liquid` 中的 StickyHeader 还会检查预测搜索状态：

```js
if (
  [...this.predictiveSearches].some(
    predictiveSearch => predictiveSearch.isOpen
  )
) return;
```

也就是说：

**如果 Predictive Search 正在打开，StickyHeader 会跳过当前滚动处理，避免搜索面板打开时 Header 被隐藏。**

这里把我们第 11 课学习的 Predictive Search 和今天的 Header 机制真正串起来了。

---

## 十二、从前端工程角度评价这套实现

现在不只是理解源码，我们还需要知道这套设计有什么值得借鉴的地方。

| 设计方式 | 优点 | 需要注意 |
|---|---|---|
| Liquid Menu 对象 | 数据与展示分离 | 菜单层级深度有限 |
| `<details>` / `<summary>` | 原生交互和语义 | 动画与复杂键盘行为需额外处理 |
| Web Components | 功能拆分明确 | 生命周期和事件清理要谨慎 |
| CSS Grid | Mega Menu 布局简单 | 复杂营销菜单需要扩展 |
| Transform 动画 | 适合滑动式导航 | 仍需验证实际渲染性能 |
| Focus Trap | 改善键盘导航体验 | 焦点恢复和隐藏状态要处理完整 |
| StickyHeader | 滚动体验灵活 | 高频事件、状态协调复杂 |
| CSS 变量 | 可适应动态 Header 高度 | 需要及时更新尺寸 |

有三个源码细节特别值得你思考。

**第一：为什么不使用 JavaScript 维护整个菜单树状态？**

因为 `details.open` 已经提供了基础展开状态。能复用浏览器原生能力的地方，就没有必要再维护一份重复状态。

**第二：为什么 Drawer 打开时要计算 Header 的底部位置？**

因为菜单浮层的定位和高度，依赖真实的页面布局，而不是一个固定的设计稿高度。

**第三：为什么 StickyHeader 需要知道搜索菜单是否打开？**

因为这些组件虽然职责不同，但共享同一个 Header 视觉空间，必须防止状态互相冲突。

---

## 十三、建议你亲自做的四个调试实验

<box border radius="lg" padding={3} gap={3}>
  **实验 1：观察 Mega Menu 的原生状态**

  打开 DevTools → Elements。

  点击桌面菜单，观察：

  ```html
  <details class="mega-menu" open>
  ```

  再点击一次，观察 `open` 是否被移除。

  <divider color="subtle"/>
  **实验 2：观察移动端菜单的动画**

  切换 Chrome DevTools Device Toolbar，模拟手机视口。

  点击 Hamburger，再进入第二级菜单。

  观察：

  ```text
  details[open]
  .menu-opening
  .submenu-open
  ```

  然后检查 Computed 面板中的 `transform`。

  <divider color="subtle"/>
  **实验 3：观察 Sticky Header**

  在 `header.liquid` 的 `onScroll()` 中设置断点。

  向下滚动，再向上滚动。

  观察：

  ```js
  scrollTop
  this.currentScrollTop
  this.headerBounds
  this.headerIsAlwaysSticky
  ```

  以及：

  ```js
  document.querySelector('.section-header').className
  ```

  <divider color="subtle"/>
  **实验 4：测试键盘交互**

  不使用鼠标，只用键盘：

  Tab → Enter → Tab → Escape。

  检查能否打开菜单、进入子链接、返回上一级，以及关闭之后焦点是否恢复到正确的位置。
</box>

---

## 十四、本课知识检查

{@body const questions=[{q:"Dawn 如何根据 Shopify 后台的菜单配置输出不同的桌面导航？",opts:["JavaScript 动态生成所有导航项","Liquid 读取 section.settings.menu.links，并根据 menu_type_desktop 选择 Snippet","Shopify API 每次单独请求菜单 JSON"],a:1,why:"菜单数据来自 Shopify 的 Menu/Link 对象，Liquid 根据配置调用 Dropdown 或 Mega Menu Snippet。"},{"q":"为什么 Dawn 的菜单系统大量使用 details/summary？",opts:["因为它们提供浏览器原生的展开与收起能力","因为它们可以自动生成商品卡片","因为它们能自动实现 Sticky Header"],a:0,why:"details.open 是原生展开状态，Dawn 再通过 Web Components 和 CSS 增强交互。"},{"q":"移动端子菜单从右侧滑入，最核心的是哪个机制？",opts:["每次请求 Section Rendering","修改 CSS transform 并配合 details[open]、menu-opening 状态","使用 JavaScript 修改页面 scrollLeft"],a:1,why:"Dawn 通过 class 控制 CSS translateX(100%) 到 translateX(0) 的状态变化。"},{"q":"Sticky Header 是如何判断滚动方向的？",opts:["通过 IntersectionObserver 持续计算滚动速度","对比当前 scrollTop 与上次的 currentScrollTop","通过监听用户鼠标滚轮方向，不支持触摸"],a:1,why:"Dawn 比较前后 scrollTop，并结合 Header 边界与当前交互状态决定隐藏或展示。"}]}
{@body const [answers,setAnswers]=DIL.useState({})}
{@body const [done,setDone]=DIL.useState(false)}
<box border radius="lg" padding={3} gap={3}>
  <row justify="between" align="center">
    **第 14 课自测**
    <badge>{Object.keys(answers).length}/4 已回答</badge>
  </row>
  {#each questions as q,i}
    <box gap={2}>
      **{i+1}. {q.q}**
      <radio-group direction="col" value={answers[i]===undefined?"":String(answers[i])} disabled={done} onChange={v=>setAnswers(p=>({...p,[i]:Number(v)}))}>
        {#each q.opts as opt,j}
          <radio value={String(j)}>{opt}</radio>
        {/each}
      </radio-group>
      {#if done}
        <row align="start" gap={2}>
          <icon name={answers[i]===q.a?"check-circle":"x-circle"} color={answers[i]===q.a?"success":"danger"}/>
          <box flex="1" gap={1}>
            <text weight="medium" size="sm">{answers[i]===q.a?"回答正确":`正确答案：${q.opts[q.a]}`}</text>
            <text color="secondary" size="sm">{q.why}</text>
          </box>
        </row>
      {/if}
    </box>
    {#if i!==3}
      <divider color="subtle"/>
    {/if}
  {/each}
  {#if done}
    <title size="xl" tabularNums>{questions.filter((q,i)=>answers[i]===q.a).length}/4</title>
    <button block color="secondary" variant="outline" onClick={()=>{setAnswers({});setDone(false)}}>重新作答</button>
  {:else}
    <button block disabled={Object.keys(answers).length!==4} onClick={()=>setDone(true)}>提交答案</button>
  {/if}
</box>

## 参考资料

- [<details> HTML details disclosure element - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details)
- [<summary> HTML disclosure summary element - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/summary)
- [HTMLElement: toggle event - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/toggle_event)
- [HTMLDetailsElement - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDetailsElement)
- [<details>：详细信息展现元素 - HTML（超文本标记语言） | MDN](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/details)
- [HTML elements reference - HTML | MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements)
- [HTMLElement：toggle 事件 - Web API | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/toggle_event)
- [Liquid objects: link](https://shopify.dev/docs/api/liquid/objects/link)
