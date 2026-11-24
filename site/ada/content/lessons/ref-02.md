# REF-02 常用 HTML 与 ARIA 属性速查

> **使用目标：** 写商品卡片、折叠区、Tab 和弹窗时，能按用途查到常用值，并知道还要实现什么。

优先用实际表达含义的 HTML 元素。例如跳转用 `<a href="…">`，操作用 `<button>`，表单用 `<label>` 关联输入框。ARIA 用来表达原生元素尚未提供的名称、关系或状态。控件的显示、按键与业务逻辑仍由 HTML、CSS 和 JavaScript 实现。[原生 HTML 速查](?lesson=ref-01) · [W3C ARIA 使用原则](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)

## 焦点与禁用

| 属性或方法 | 常用值 | 什么时候用 |
| --- | --- | --- |
| `tabindex` | 省略、`0`、`-1` | 原生按钮通常省略。`0` 加入常规 Tab 顺序。`-1` 能接收程序化焦点，常规 Tab 时跳过，例如弹窗标题。正数 `1`、`2` 会改变顺序，日常布局优先调整 DOM。 |
| `autofocus` | 写上属性 | 指定自动聚焦目标，原生弹窗显示时也适用。用在静态标题上时，配 `tabindex="-1"` 让标题能接收焦点。每个弹窗指定一个初始焦点。 |
| `element.focus()` | 调用方法 | 立即尝试移动焦点，例如打开自定义弹窗或关闭后回到触发按钮。目标必须可以接收焦点。 |
| `disabled` | 写上属性 | 原生表单控件真正被禁用。比如不可购买状态里的原生加购按钮。 |
| `aria-disabled` | `true`、`false` | 表达控件当前不可用。若有意让它仍可被发现，组件要自行阻止鼠标和键盘激活，并提供可辨认的状态。能使用原生 `disabled` 时优先考虑它。 |

[焦点顺序与 tabindex](?lesson=l2-02) · [弹窗与 autofocus](?lesson=l3-01) · [HTML 焦点规则](https://html.spec.whatwg.org/multipage/interaction.html#focus) · [WAI-ARIA aria-disabled](https://www.w3.org/TR/wai-aria-1.2/#aria-disabled)

## 名称、说明和关联

| 属性 | 常用值 | 什么时候用 |
| --- | --- | --- |
| `aria-label` | 文本，如 `"关闭配件详情"` | 给只有图标的按钮提供名称。已有可见文字时优先用原生文字，补充名称时保留可见标签里的文字。 |
| `aria-labelledby` | 一个或多个元素 ID，如 `"link-text product-title"` | 引用页面上已有的文字作为名称，例如弹窗引用其标题。多个 ID 用空格分隔，浏览器按顺序组合。 |
| `aria-describedby` | 一个或多个元素 ID，如 `"quantity-hint"` | 关联额外说明，例如数量限制或错误提示。字段的名称仍由 `label` 等提供。 |
| `aria-controls` | 被控制元素的 ID，如 `"shipping-panel"` | 知道按钮控制哪块内容，例如配送折叠区。组件负责实际开合。 |

Shopify Section 或商品卡片可能重复渲染。给实例生成唯一 ID，并确认引用方能找到正确的目标。缺少目标 ID 的效果可以对照 [L1-02 的对比表案例](?lesson=l1-02)。[可访问名称课](?lesson=l1-01) · [W3C 可访问名称与描述](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)

## 展开、选中和开关

| 属性 | 常用值 | 看这个问题来选择 |
| --- | --- | --- |
| `aria-expanded` | `true`、`false` | 「内容展开了吗？」用在折叠区、下拉菜单等适用的控制元素上。打开面板与更新状态一起做。 |
| `aria-selected` | `true`、`false` | 「这一组当前选中了哪项？」用在 `tab`、`option` 等支持它的角色。Tab 切换时一起更新选中项、可见面板和视觉标记。 |
| `aria-pressed` | `true`、`false` | 「这个按钮控制的功能开着吗？」例如「仅看有货」切换按钮。名称保持稳定，真实筛选和按钮状态同时改变。 |
| `aria-current` | `page`、`step`、`true` | 「我现在在哪一页、哪一步？」例如给导航中代表当前页面的链接设置 `aria-current="page"`。 |
| `aria-invalid` | `true`、`false` | 「输入当前有效吗？」校验失败后标明字段，并关联具体错误文字。 |

复选框、单选框用原生控件时，浏览器已提供勾选或选择状态。页面视觉、数据和读屏状态都要跟着同一次操作更新。[组件状态课](?lesson=l3-02) · [W3C 组件模式](https://www.w3.org/WAI/ARIA/apg/patterns/) · [WAI-ARIA 状态和属性](https://www.w3.org/TR/wai-aria-1.2/#state_prop_def)

## 隐藏、模态和操作反馈

| 属性 | 常用值 | 什么时候用 |
| --- | --- | --- |
| `aria-hidden` | `true`、`false` | `true` 从无障碍树隐藏元素及其后代，例如具名按钮内的装饰图标。它不改变布局，也不能单独阻止焦点。避免把仍可操作的控件藏在 `aria-hidden="true"` 的祖先下面。 |
| `hidden` | 写上或移除属性 | 折叠内容暂时从页面、常规 Tab 和辅助技术中移除。由 JavaScript 同时更新 `hidden` 和触发按钮的 `aria-expanded`。 |
| `inert` | 写上或移除属性 | 保留画面但暂时隔离一整块内容的交互、焦点和辅助技术访问，例如自定义模态弹窗的背景。模态本体需要留在可操作区域。 |
| `aria-modal` | `true`、`false` | 表达自定义弹窗是否模态。只有实际实现了模态行为时才声明 `true`。原生 `dialog.showModal()` 提供模态行为。 |
| `role` | `status`、`alert` | 普通加购结果用 `status`，确实需要及时提醒的重要错误可考虑 `alert`。先有容器，再更新有意义的消息。 |
| `aria-live` | `polite`、`assertive` | 设置动态区域的播报优先级。`polite` 等合适的时机，`assertive` 用于高优先级提醒。`role="status"` 默认已是 `polite`。 |
| `aria-atomic` | `true`、`false` | 用 `true` 表示更新时呈现整条消息，例如「已加入购物车，共 2 件」，而非只读变化的数字。 |

`aria-hidden` 只回答辅助技术能否访问，`hidden` 和 `inert` 会影响浏览器的实际交互。祖先元素设置了 `aria-hidden="true"` 时，给后代设置 `aria-hidden="false"` 也无法把它重新暴露出来。折叠面板或关闭弹窗后，分别用 Tab 和读屏验证。加购反馈用真实成功、失败数据复测。[HTML hidden 与 inert](https://html.spec.whatwg.org/multipage/interaction.html#the-inert-attribute) · [WAI-ARIA aria-hidden](https://www.w3.org/TR/wai-aria-1.2/#aria-hidden) · [加购状态消息课](?lesson=l3-03)

## 看一个折叠按钮怎么组合

```html
<button type="button" aria-expanded="false" aria-controls="shipping-panel">
  <span aria-hidden="true">▸</span>
  配送说明
</button>
<div id="shipping-panel" hidden>
  <p>可以在结账时查看预计送达时间。</p>
</div>
```

打开时，同一个处理函数显示面板并把 `aria-expanded` 改为 `true`。关闭时，隐藏面板并改回 `false`。用 Enter 和 Space 验证操作，用读屏检查按钮名称和开合状态。[W3C 折叠控件模式](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
