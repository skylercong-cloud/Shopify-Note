# 参考 9 Product Media 补充参考

> **本课目标：** 按需查询属性、接口和原始案例。

## Media 在 Admin 的位置

进入：`Products → 打开 Product → Media`。商家可以给 Product 添加图片、视频、3D model 等媒体。

Theme 不应该把 `product.media` 当成“图片数组”。一个媒体项可能是：

```text
image
video
external_video
model
```

官方：

- [Support product media](https://shopify.dev/docs/storefronts/themes/product-merchandising/media/support-media)
- [Product media – Help Center](https://help.shopify.com/en/manual/products/product-media)


## Image 是 Media 的一种

Product 不只有 Images。

```text
Product Media
├── Image
├── Video
├── External Video
└── 3D Model
```

官方： [Product media](https://shopify.dev/docs/storefronts/themes/product-merchandising/media)

Theme 应优先围绕 `product.media` 建立 Gallery，而不是把 Product Media 简化成“图片数组”。

---

## 基础 Media 渲染

### 按 `media_type` 分发渲染

```liquid
{% case media.media_type %}
  {% when 'image' %}
    {{ media | image_url: width: 1600 | image_tag: loading: 'lazy' }}

  {% when 'video' %}
    {{ media | video_tag: controls: true }}

  {% when 'external_video' %}
    {{ media | external_video_tag }}

  {% when 'model' %}
    {{ media | model_viewer_tag }}
{% endcase %}
```

这比：

```liquid
<img src="{{ media }}">
```

更符合 Shopify Media 数据模型，也能让 Theme 支持未来商品内容扩展。


```liquid
{% for media in product.media %}
  {% case media.media_type %}

    {% when 'image' %}
      {{
        media
        | image_url: width: 1000
        | image_tag: alt: media.alt
      }}

    {% when 'video' %}
      ...

    {% when 'external_video' %}
      ...

    {% when 'model' %}
      ...

  {% endcase %}
{% endfor %}
```

官方实现指南： [Support product media](https://shopify.dev/docs/storefronts/themes/product-merchandising/media/support-media)

---

## Variant 与 Media

### Variant 切换通常为什么需要 JS？

Liquid 初始渲染只能根据当前请求知道“页面打开时”的 Variant 状态。用户在浏览器里点另一个 Color 后：

```text
Option click
 ↓
JS 找到新 Variant
 ↓
更新 variant URL / hidden input
 ↓
读取 Variant 关联 media
 ↓
切换 Gallery active media
```

这正是典型的“Liquid 初始 SSR + JavaScript progressive enhancement”。


一个 Color Variant 可以关联对应 Media。

```text
Black Variant
→ Black Image

White Variant
→ White Image
```

用户切换 Variant 后：

```text
JS 匹配 Variant
→ 找对应 Media
→ Gallery 切换
```

这是典型的：

```text
Liquid 提供初始数据和 DOM
+
JavaScript 提供运行时交互
```

---

---

## 使用提示

此页与主线对应课程存在概念交集；需要查具体接口时再使用，无需顺序重复阅读。

