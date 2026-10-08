## 先从你熟悉的普通网站出发

假设你用 React 做过一个商品页。页面需要商品接口、价格和库存、购物车接口、登录、支付、订单后台，还需要服务器和部署。前端 UI 只是其中一部分。

Shopify 提供托管的电商平台，负责许多商业数据与交易能力。你开发 Shopify 网站时，通常是在平台已有的数据、渲染和扩展机制上构建界面与业务功能。

| 你熟悉的工作 | Shopify 中常见的对应位置 |
| --- | --- |
| 商品管理后台 | Shopify Admin |
| 顾客访问的网站 | Storefront |
| 网站页面外观与店面交互 | Theme 或自定义 Storefront |
| 扩展后台工具、对接外部系统 | App |
| 商品、订单等持久化数据 | Shopify 管理的商业资源；App 也可能有自己的数据库 |

这些只是帮助入门的对应关系。Theme 不是完整的后端应用，App 也不一定拥有全部店面页面。

## Store、Theme、App 分别是什么

**Store：店铺这个业务空间。** 商品、集合、顾客、订单、市场等围绕店铺组织。它不等于一个 HTML 站点目录。

**Theme：Online Store 的页面与交互代码。** 它决定如何展示 Shopify 提供的数据，以及商家能在编辑器里配置什么。一个店铺可以拥有多个主题，正式访问使用当前发布的主题；开发者也可以预览其他主题。

**App：通过授权与平台扩展点增加功能的应用。** 例如 ERP 同步、评论管理、营销工具。App 可以有后台服务和数据库，也可以通过 Theme App Extension 在店面中增加模块。

判断实例：换主题不意味着把店铺商品重新录入；卸载评论 App 也不等于删除 Shopify 店铺。修改哪个系统的数据，要看资源归属与操作权限。

## Admin 与 Storefront 各自在做什么

Admin 面向商家与工作人员：管理商品、内容、订单、配置、主题和应用。

Storefront 面向顾客：浏览商品、选择规格、搜索、加入购物车并进入结账。

把 Admin 想成“运营工作台”，把 Storefront 想成“顾客店面”。两者关联到同一个业务空间，但用户、权限和可操作范围不同。

## 网站数据从哪里来

| 数据 | 常见来源 | 例子 |
| --- | --- | --- |
| 商业资源 | Admin 管理的 Shopify 数据 | 商品标题、Variant、Collection |
| 主题配置 | Theme Editor 与配置文件 | Banner 文案、颜色、模块顺序 |
| 扩展字段 | Metafield / Metaobject | 材质、设计师介绍 |
| 当前请求上下文 | URL、语言、市场等 | 当前商品、搜索词、分页 |
| 浏览器交互状态 | JavaScript 内存、表单、URL | 抽屉是否打开、当前输入内容 |
| App 自有数据 | App 后端或外部系统 | 评价、ERP 同步记录 |

特别容易混淆：商品价格通常不应该变成一个主题配置字段；“购物车抽屉是否打开”也不应当存为商品 Metafield。先判断数据归谁管理，再选存储位置。

## 一个 Theme 网站如何跑起来

以商品页为例：

1. 运营在 Admin 创建商品、规格、价格和媒体，并使其能在目标销售渠道中展示。
2. 顾客请求商品 URL。
3. Shopify 按请求与模板配置选择页面结构，提供相关 Liquid 对象。
4. 服务端执行 Liquid，生成 HTML；浏览器接收 HTML、CSS、JavaScript。
5. 浏览器展示首屏，JavaScript 为规格选择、抽屉等增加交互。
6. 顾客加购时提交 Variant 与数量，Shopify 更新购物车。
7. 顾客进入 Checkout，平台处理交易流程；成功完成后进入订单生命周期。

这里有两次不同的“运行”：Liquid 在服务端生成内容，JavaScript 在浏览器处理交互。点击按钮不会让已经结束的 Liquid 模板自动重新执行；需要新的页面请求或 Section Rendering 等机制获得新的服务端结果。

## Theme 路线与 Headless 路线

Theme 路线使用 Shopify 的主题架构和 Liquid 渲染，适合先掌握平台提供的店面开发方式。

Headless 路线由你负责更多的店面路由、数据加载和部署，通过 Storefront API 等连接平台。已有 React 经验会帮助你理解它，但它增加了工程责任，应在掌握商品与购物车等基本模型后学习。

本教程先完成 Theme，再进入 App 和 Headless。下一课会用具体需求练习判断实现位置。

官方资料：[Theme architecture](https://shopify.dev/docs/storefronts/themes/architecture)、[Storefronts](https://shopify.dev/docs/storefronts)。
