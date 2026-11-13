# 参考 15 自定义数据补充参考

> **本课目标：** 按需查询属性、接口和原始案例。

![Metafield 与 Metaobject](content/assets/08-metafield-metaobject.png)

本课 不再把 Metaobject 只作为“下一课预告”，而是把它完整展开。


## 从数据库角度理解 Metafield

### Standard / Custom / Unstructured / App-owned

| 类型 | 谁定义 | 是否有 Definition | 使用建议 |
|---|---|---:|---|
| Standard metafield | Shopify 标准模型 | 是 | 有合适标准定义时优先 |
| Custom metafield | 商家/开发者 | 是 | 店铺特有业务字段 |
| Unstructured metafield | 历史/自由写入 | 否 | 兼容旧数据；新项目一般不优先 |
| App-owned metafield | App | 是/由 App 管理 | App 私有/业务扩展数据 |

官方 Help Center 对这几类 Custom Data 有完整解释：
[Overview of custom data](https://help.shopify.com/en/manual/custom-data/overview)


关系数据库：

```text
products table
+ 新增 material column
```

Shopify：

```text
Product Resource
+ Product Metafield Definition
```

官方的数据建模文档甚至直接用数据库类比说明：

- Resource ≈ Built-in Table
- Metafield Definition ≈ 新增 Column
- Metaobject Definition ≈ 自定义 Table

官方： [Data modeling with metafields and metaobjects](https://shopify.dev/docs/apps/build/metaobjects/data-modeling-with-metafields-and-metaobjects)

---

## Metafield 可以挂在不同 Owner 上

### Owner type 影响“字段属于谁”

例如都叫 `custom.internal_note`：

```text
Product metafield
→ 描述商品内部备注

Customer metafield
→ 描述顾客内部备注

Order metafield
→ 描述订单业务备注
```

即使 namespace/key 看起来相同，它们的 owner type 不同，语义也不同。设计前先问：**这个信息的生命周期跟谁走？**


不只 Product：

```text
Product
Variant
Collection
Customer
Order
Shop
Location
...
```

所以：

```text
Product Metafield
```

与：

```text
Variant Metafield
```

不是同一个字段实例。

例如：

```text
Product
custom.material = Mesh

Variant Black / 9
custom.package_weight = 0.8kg
```

---

## Metafield、Tag、Option 的区别

### 再补一个 Category Metafield

现代 Shopify 还有 **Category metafield**：它来自 Shopify Standard Product Taxonomy，与特定 Product Category 关联。例如某类服装可能获得 Color、Fabric、Size 等标准属性。

它与随意创建一个 `custom.color` 的意义不同：标准分类属性更有利于跨 Shopify / sales channels 的结构一致性。

官方：[Shopify's Standard Product Taxonomy](https://help.shopify.com/en/manual/products/details/product-category)


### Option

```text
Color / Size
```

通常参与生成 Variant。

### Metafield

```text
Material / Origin / Warranty
```

通常描述业务属性。

### Tag

```text
sale / summer / vip
```

更接近轻量标签或分组标识。

不要用 Tags 代替所有结构化业务数据。

---

---

## 使用提示

此页与主线对应课程存在概念交集；需要查具体接口时再使用，无需顺序重复阅读。

