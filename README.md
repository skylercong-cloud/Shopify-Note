# Shopify 网站开发系统教程

这是一个面向前端工程师的 Shopify 平台开发教程网站。

## 本地预览

```bash
npx serve site
```

然后打开命令输出的地址（通常是 `http://localhost:3000`）。也可以使用 VS Code Live Server。不要直接双击 `index.html`，因为浏览器会阻止 `fetch()` 读取本地 Markdown 文件。

## GitHub Pages

1. 将仓库推送到 GitHub。
2. 在仓库 Settings → Pages 中选择 GitHub Actions。
3. 工作流会发布 `site/`，访问生成的 Pages 地址。

站点内容源文件在 `site/content/tutorial.md`，图片在 `site/content/assets/`。更新教程时先修改 Markdown，再刷新网站。
