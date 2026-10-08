# 参考 1 核心对象与后台入口速查

> **本课目标：** 快速定位对象入口与获取方式。

本课 不是替代前面的解释，而是开发时快速翻阅。

## Product

**Admin：** `Products → Add product`

**创建最小信息：** Title + Price 即可起步，然后再补 Media / Inventory / Variant / Metafield / Publishing。

**Theme：** Product template 中的 `product`。

**常用：** `title`、`url`、`handle`、`description`、`vendor`、`available`、`price_*`、`options_with_values`、`variants`、`media`、`metafields`。

**官方：** [Liquid Product](https://shopify.dev/docs/api/liquid/objects/product) · [Admin Product](https://shopify.dev/docs/api/admin-graphql/latest/objects/Product)

---

## Variant

**Admin：** `Products → Product → Variants`

**创建：** 添加 Option + values 自动产生组合，或按后台提供的 Add variant / bulk 工具管理。

**Theme：** `product.variants` / `selected_or_first_available_variant`。

**最关键：** `variant.id` 是 Product Form / Ajax Cart 加购时提交的 purchasable Variant ID。

**官方：** [Liquid Variant](https://shopify.dev/docs/api/liquid/objects/variant) · [Adding variants](https://help.shopify.com/en/manual/products/variants/add-variants)

---

## Collection

**Admin：** `Products → Collections`

**创建：** 视你当前 Admin rollout，可以手工/条件/来源的方式添加 Product / Variant。

**Theme：** `collection`。

**常用：** `title`、`description`、`image`、`products`、`filters`、`sort_options`、`sort_by`、`default_sort_by`。

**官方：** [Liquid Collection](https://shopify.dev/docs/api/liquid/objects/collection) · [Create collections](https://help.shopify.com/en/manual/products/collections/create-collection)

---

## Cart

**Admin：** 没有一个与 Product/Orders 相同的普通资源编辑页面；主要存在于 Storefront 购物生命周期。

**Theme：** `cart` Liquid object + `/cart` template + Ajax Cart API。

**常用：** `items`、`item_count`、`total_price`、`note`、`attributes`、discount applications。

**官方：** [Liquid Cart](https://shopify.dev/docs/api/liquid/objects/cart) · [Ajax Cart API](https://shopify.dev/docs/api/ajax/reference/cart)

---

## Metafield

**Admin：** `Settings → Metafields and metaobjects`；值也可在对应 Product/Customer/Order 等资源页面填写。

**创建：** Owner → Name → namespace/key → type → validations → value。

**Theme：** `resource.metafields.namespace.key.value`。

**官方：** [Liquid Metafield](https://shopify.dev/docs/api/liquid/objects/metafield) · [About metafields](https://shopify.dev/docs/apps/build/metafields)

---

## Metaobject

**Admin：** Definition 在 Custom data 设置；Entries 在 `Content → Metaobjects`。

**创建：** Definition → fields → entries → 可选用 reference metafield 关联到 Product 等资源。

**Theme：** `metaobjects.type.handle` 或通过 reference Metafield 得到 entry。

**官方：** [Liquid Metaobject](https://shopify.dev/docs/api/liquid/objects/metaobject) · [Building a metaobject](https://help.shopify.com/en/manual/custom-data/metaobjects/building-a-metaobject)

---

## Inventory / Location

**Admin：** `Products → Inventory`；Location 在 `Settings → Locations`。

**数据模型：** Variant → InventoryItem → InventoryLevel ↔ Location。

**主要开发面：** 后台集成通常走 Admin GraphQL，而不是 Theme Liquid。

**官方：** [Manage inventory states](https://shopify.dev/docs/apps/build/orders-fulfillment/inventory-management-apps/manage-quantities-states) · [Locations](https://help.shopify.com/en/manual/fulfillment/setup/locations/setup)

---

## Customer

**Admin：** `Customers`。

**Theme：** 登录上下文可使用 `customer` Liquid object。

**常用：** `name`、`email`、`addresses`、`orders`、`tags`、`metafields`、`has_account`。

**官方：** [Liquid Customer](https://shopify.dev/docs/api/liquid/objects/customer) · [Customers Help](https://help.shopify.com/en/manual/customers)

---

## Order / Fulfillment

**Admin：** `Orders`。

**Order：** 成交后的商业记录；**Fulfillment：** 哪些 line items 从哪里、如何被履约。

**App：** OMS/WMS/3PL 通常使用 Admin GraphQL 的 Order / Fulfillment Orders / Fulfillment 模型。

**官方：** [Managing orders](https://help.shopify.com/en/manual/fulfillment/managing-orders) · [Build fulfillment solutions](https://shopify.dev/docs/apps/build/orders-fulfillment/order-management-apps/build-fulfillment-solutions)

---

---

## 使用提示

遇到具体问题时查阅。

