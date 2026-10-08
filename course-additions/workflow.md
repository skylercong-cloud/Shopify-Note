## 先准备什么

你需要一个可以操作主题的店铺账户、开发店或测试环境、店铺的 `myshopify.com` 域名、Git、Node.js 和 Shopify CLI。开发店的账号资格与普通商家店铺的协作者权限存在区别，连接失败时应按官方权限说明核对。

Node.js 最低版本要求会变化，安装前查看 [CLI 安装文档](https://shopify.dev/docs/api/shopify-cli)。不要直接照抄旧教程中的版本号。

在终端执行：

```powershell
npm install -g @shopify/cli@latest
shopify version
git --version
```

`npm install -g` 安装命令行程序，不是在当前项目安装一个 React 依赖。如果提示找不到 `shopify`，重开终端并检查 npm 全局命令目录是否在 PATH 中。

## 路径 A：创建新的学习主题

在准备存放代码的目录执行：

```powershell
shopify theme init
```

按提示输入名称，例如 `learning-theme`，然后进入生成的目录：

```powershell
cd learning-theme
shopify theme dev --store your-store.myshopify.com
```

将 `your-store.myshopify.com` 替换为你的店铺域名。首次访问店铺时 CLI 会引导登录。登录的是有该店铺权限的 Shopify 账号。

当前官方创建教程使用 Skeleton 作为起点；`init` 也支持指定 Git 仓库。不要把所有旧教程中的默认起始主题名称当成固定规则。

## 路径 B：修改已有主题

公司项目常见情况是已经有正式主题。先复制一个用于开发的未发布副本，记录其主题 ID，然后在独立目录拉取它：

```powershell
mkdir existing-theme
cd existing-theme
shopify theme list --store your-store.myshopify.com
shopify theme pull --store your-store.myshopify.com --theme 123456789
```

`123456789` 是占位符，必须换成开发副本的实际 ID。`pull` 会把远端文件写到本地；已有未提交修改时，先提交或备份再执行，避免覆盖。

两条路径选一条即可。新建主题与拉取已有主题不是必须连续执行的两个步骤。

## 为什么本地预览仍然需要 Shopify

`theme dev` 会将代码关联到店铺的开发主题，让页面使用店铺数据渲染。它不是单纯把 `.liquid` 当作静态 HTML 文件打开。

打开 CLI 输出的预览地址。不要手动双击 Liquid 文件，也不要假设任何普通静态服务器都可以执行 Shopify Liquid。

执行以下命令核对当前环境：

```powershell
shopify theme info
```

开发时依次验证：修改普通文本 → 修改 CSS → 修改编辑器设置。三者分别帮助你确认代码同步、资源加载和配置渲染是否正常。

## 一次完整开发循环

```text
确认店铺和开发主题
  → 提交当前基线
  → 修改文件
  → theme dev 预览
  → 页面与编辑器测试
  → theme check
  → Git 提交
  → 上传未发布主题
  → 业务验收
  → 发布确认
```

检查主题：

```powershell
shopify theme check
```

Theme Check 检查静态代码问题；它不能代替售罄、断网、键盘操作等交互测试。

创建可交给同事验收的未发布主题：

```powershell
shopify theme push --store your-store.myshopify.com --unpublished
```

后续更新指定副本时，显式给出实际主题 ID：

```powershell
shopify theme push --store your-store.myshopify.com --theme 123456789
```

`push` 是上传代码，`publish` 才是让该主题成为正式主题。在学习店完成验收后，可以交互式选择要发布的主题：

```powershell
shopify theme publish --store your-store.myshopify.com
```

公司正式店铺应遵守团队发布流程，发布前核对店铺、主题 ID、配置、预览结果与回退方案。

## 配置为什么也会冲突

运营在 Theme Editor 修改的模块顺序和设置，会影响相关 JSON 配置。开发者从旧副本整体推送，可能覆盖同事的新配置。

因此要约定：谁编辑哪个主题、哪一份代码是基线、什么时候拉取配置、哪些配置允许覆盖。提交前检查 `templates/*.json`、section group 和 `config/settings_data.json` 的差异，不要只查看 JS/CSS。

遇到发布错误，应先判断是代码问题还是配置问题。恢复 Git 提交不等于恢复商品数据、App 数据或所有运营设置；发布前保留原主题副本和必要配置备份。

## 常见问题怎么查

| 症状 | 优先检查 |
| --- | --- |
| 登录成功却无法访问店铺 | 店铺域名、账号归属、主题权限、开发店账号资格 |
| 找不到主题文件 | 当前目录是否是实际 Theme 根目录 |
| 修改没有生效 | 打开的是正式页面还是当前预览；是否编辑了正在使用的 Section |
| 编辑器设置消失 | 推送前后的 JSON 差异，以及是否覆盖了远端配置 |
| CLI 网络超时 | 代理、DNS、证书和 Shopify 服务连接；不要把网络错误当成 Liquid 错误 |

官方参考：[创建主题](https://shopify.dev/docs/storefronts/themes/getting-started/create)、[Theme CLI](https://shopify.dev/docs/storefronts/themes/tools/cli)、[命令索引](https://shopify.dev/docs/api/shopify-cli/theme)、[theme pull](https://shopify.dev/docs/api/shopify-cli/theme/theme-pull)、[theme push](https://shopify.dev/docs/api/shopify-cli/theme/theme-push)、[theme publish](https://shopify.dev/docs/api/shopify-cli/theme/theme-publish)。
