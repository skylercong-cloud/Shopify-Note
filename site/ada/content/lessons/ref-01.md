# REF-01 有哪些 HTML 元素自带无障碍能力？

> **本课目标：** 按操作目的选择具有原生语义和键盘行为的 HTML 元素。

## 看动作选元素

| 场景 | 首选 HTML | 浏览器提供什么 |
| --- | --- | --- |
| 去商品详情页 | `<a href="…">` | 链接角色、焦点、Enter 跳转。 |
| 打开或关闭配件弹窗、加购 | `<button>` | 按钮角色、焦点、Enter 和 Space 激活。 |
| 选规格或勾配件 | `<input type="radio">`、`<input type="checkbox">`、`<select>` | 原生选中状态、数值和操作。 |
| 输入邮箱、数量或说明 | `<input>`、`<textarea>` 配可见 `<label>` | 输入行为，标签关联后的名称。 |
| 展开配送说明 | `<details>` + `<summary>` | 展开、收起、键盘操作。 |
| 打开模态弹窗 | `<dialog>` + `showModal()` | 原生弹窗语义和模态背景隔离。 |
| 查找页面区块 | `<main>`、`<nav>`、`<h1>` 至 `<h6>` | 地标或标题导航。 |
| 对比商品参数 | `<table>`、`<caption>`、`<th>`、`<td>` | 表格结构和导航，表头关联由标记提供。 |

```html
<a href="/products/a2">查看 Dreame A2</a>
<button type="button">查看配件</button>
```

两者可以共用外观。用户要跳转时给出真实链接，用户要执行当前页动作时用按钮。新组件再检查名称是否清楚、焦点是否可见、业务动作能否完成。[W3C 原生语义与 ARIA](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/) · [HTML 交互元素](https://html.spec.whatwg.org/multipage/interactive-elements.html)
