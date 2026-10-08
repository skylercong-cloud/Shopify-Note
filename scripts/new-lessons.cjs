const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname,'../course-additions',name+'.md'),'utf8');
module.exports = {
 platform: {title:'从普通前端网站理解 Shopify',goal:'用已有前端经验理解后台、店面、主题和数据的分工。',exercise:'画出运营创建商品、顾客打开商品页、选择规格、加购、结账的过程。在每一步标明执行位置和数据来源。',body:read('platform')},
 workflow: {title:'开发环境、Shopify CLI 与发布工作流',goal:'连接开发店，初始化或拉取主题，预览、检查并上传未发布副本。',exercise:'在开发店完成一次修改 → 预览 → Theme Check → 未发布主题上传。记录店铺域名和主题 ID，并说明 push 与 publish 的区别。',body:read('workflow')},
 editor: {title:'主题编辑器、组件生命周期与调试',goal:'理解局部重渲染为何导致重复绑定或组件失效。',exercise:'在编辑器中连续添加、修改和删除同一个 Section 三次，检查是否出现重复监听、遗留定时器或重复请求。',body:read('editor')},
 project: {title:'阶段项目：交付一个可配置商品页',goal:'将数据、模板、交互和发布串成可以验收的 Theme 项目。',exercise:'按本课验收表逐项测试，提交项目说明、主题预览链接、文件职责表和问题记录。',body:read('project')}
};
