# 开发知识笔记

首页提供三个知识区。Shopify 笔记是面向前端工程师的 Shopify 平台开发教程。SEO 学习收录网站性能优化、Dawn 源码与结构化数据课程。ADA 无障碍提供 6 课企业培训，覆盖 Web 无障碍基础、UI 组件、Shopify 整改与验收。

## 本地预览

```bash
node scripts/serve.cjs
```

打开 `http://127.0.0.1:8771/`。也可以使用 VS Code Live Server 预览 `site/`。请通过静态服务器访问，让浏览器能够读取 Shopify 课程的 Markdown 文件。

## GitHub Pages

1. 将仓库推送到 GitHub。
2. 在仓库 Settings → Pages 中选择 GitHub Actions。
3. 工作流会发布 `site/`，访问生成的 Pages 地址。

## 内容组织

- `site/index.html`：知识分类首页。
- `site/shopify/content/course.json`：Shopify Level 0–6 与开发参考的目录。
- `site/shopify/content/lessons/`：Shopify 课程 Markdown。
- `site/shopify/content/assets/`：Shopify 课程图片。
- `site/seo/content/lessons/`：SEO 课程与补充笔记，整理自 [SEO 源仓库](https://github.com/skylercong-cloud/SEO/tree/ea03246b8f738ae91286f0a5eb1b7a74b655c775)。
- `site/ada/content/`：ADA 无障碍企业培训课程、3 份附录及演示资源。
- `site/reader/`：知识区共用的阅读界面、目录、主题和站内全文搜索。
- `course-additions/`：本次新增课程的迁移输入。
- `archive/tutorial-2026-09.md`：原稿备份，用于核对，不作为新的主线课程。
- `COURSE-MIGRATION.md`：新课与旧稿的对应记录。

Shopify 课节使用 `shopify/?lesson=l0-01`，旧的首页课节链接会转到对应的新地址。SEO 课节使用 `seo/?lesson=performance-01`，旧的 `seo/#turn-1` 链接会转到对应文章。ADA 课节使用 `ada/?lesson=training-01`。正文图片相对于各知识区目录加载。

`node scripts/migrate-course.cjs` 会从旧稿重新生成 Shopify 课程文件。日常内容更新请直接编辑 `site/shopify/content/lessons/`，以保留手工修订。

## 本次整理

主线按 Level 0–6 编排，历史 Part 17 的逐步推导并入对应课程。旧参考章节单独放在开发参考，避免重复必读。每课加入目标与练习，新增平台入门、CLI 工作流、编辑器生命周期和阶段项目验收。

学习进度保存在当前浏览器，不跨设备同步。全文搜索会按需读取课程正文。API 示例包含概念和教学骨架，尚未全部在开发店运行验证。
