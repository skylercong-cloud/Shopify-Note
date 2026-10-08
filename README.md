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

## 内容组织

- `site/content/course.json`：Level 0–6 与开发参考的目录。
- `site/content/lessons/`：每课独立 Markdown，直接修改对应文件即可。
- `site/content/assets/`：课程图片。
- `course-additions/`：本次新增课程的迁移输入。
- `archive/tutorial-2026-09.md`：原稿备份，用于核对，不作为新的主线课程。
- `COURSE-MIGRATION.md`：新课与旧稿的对应记录。

网站使用 `?lesson=l0-01` 这样的地址，不需要服务器配置深层路由，适用于 GitHub Pages 与 Netlify。正文图片链接以网站根目录为基准。

`node scripts/migrate-course.cjs` 用于重新执行本次迁移，会覆盖生成的课程文件；日常内容更新请直接编辑 `site/content/lessons/`，不要在手工修订后无意重跑迁移。

## 本次整理

主线按 Level 0–6 编排，历史 Part 17 的逐步推导并入对应课程。旧参考章节单独放在开发参考，避免重复必读。每课加入目标与练习，新增平台入门、CLI 工作流、编辑器生命周期和阶段项目验收。

学习进度保存在当前浏览器，不跨设备同步。全文搜索会按需读取课程正文。API 示例包含概念和教学骨架，尚未全部在开发店运行验证。
