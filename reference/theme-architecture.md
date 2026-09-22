# Shopify 主题开发速查表

## 一张图理解渲染链路

请求 URL → 页面类型 → 模板（通常是 JSON）→ Section → Block/snippet → Liquid 输出 HTML → CSS/JavaScript 增强交互。

## 主题目录

| 目录 | 作用 |
|---|---|
| `layout/` | 全站外壳，通常是 `theme.liquid` |
| `templates/` | 页面类型与页面结构，Online Store 2.0 常用 JSON |
| `sections/` | 可被商家添加、删除、排序和配置的模块 |
| `snippets/` | 可复用的小片段，通过 `render` 使用 |
| `assets/` | CSS、JavaScript、图片等静态资源 |
| `config/` | 主题设置定义与当前值 |
| `locales/` | 多语言翻译 |

## 核心区别

- **JSON template**：描述有哪些 Section 以及顺序；内容放在 Section 文件中；适合 Theme Editor。
- **Liquid template**：直接写 HTML/Liquid；灵活但不能使用 Section 组合能力。
- **Section**：有自己的 Liquid 标记和 `{% schema %}` 配置；可以包含 blocks。
- **Block**：Section 内可重复、可排序的内容单元。
- **Snippet**：复用代码片段，不直接出现在 Theme Editor 的 Section 列表中。

## 常见命令

```bash
shopify theme init
shopify theme dev
shopify theme check
shopify theme pull
shopify theme push
```

## 记忆口诀

模板决定“页面由哪些模块组成”，Section 决定“模块如何渲染和配置”，Block 决定“模块内部可重复的内容”，Snippet 决定“代码如何复用”。
