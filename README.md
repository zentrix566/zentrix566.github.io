# 欢迎来到我的赛博空间 🚀

> 探索 DevOps & Cloud Native 的无限可能

## 📖 项目简介

基于 GitHub Pages 搭建的个人作品集网站，展示云原生 & DevOps 领域的开源项目与技术实践。

## ✨ 特性

- 🎨 清新明亮主题，现代化卡片布局
- � 完全响应式设计，适配手机/平板/桌面
- 🗂️ 分类展示项目，支持独立详情页
- ⚡ 纯静态 HTML/CSS/JavaScript，无需构建
- 🚀 GitHub Actions 自动部署

## 📁 项目结构

```
.
├── index.html              # 首页 - 项目列表
├── projects/
│   └── opsagentai.html    # OpsAgentAI 项目详情
├── css/
│   └── main.css           # 样式文件
├── js/
│   └── main.js            # 交互逻辑
└── .github/workflows/
    └── deploy.yml         # GitHub Actions 自动部署
```

## 🚀 项目展示

### [OpsAgentAI](https://github.com/zentrix566/OpsAgentAI) - 基于 RAG 架构与 Dify 编排的 DevOps 故障智能自愈平台

针对传统运维告警**"仅通知、不诊断"**的痛点，解决 CI/CD 流水线报错日志冗长、依赖人工排查导致的 MTTR（平均修复时间）过长问题。通过整合内部运维 SOP 手册与 LLM 能力，构建一套从告警捕获到修复建议推送的**自动化闭环系统**。

**核心特性：**
- 🏗️ 基于 Dify 进行 AI Agent 流程编排
- 🔍 混合检索（Hybrid Search）RAG 架构，准确率提升至 90%+
- 📩 深度集成飞书卡片消息，一键式交互闭环
- 🛡️ 日志预处理 + 人工审批，工程化落地保障

**项目收益：**
- ⚡ MTTR 从 30 分钟缩短至 10 分钟
- 💰 降低 60% 运维重复排查工作量
- 📚 激活内部闲置 SOP 文档，沉淀运维经验资产

👉 [阅读技术文章](https://mp.weixin.qq.com/s/4CTzMWUdcFEiLnP0YRAEXA) | [查看源码](https://github.com/zentrix566/OpsAgentAI)

## 👨‍💻 关于我

云原生 & DevOps 领域实践者，热衷于探索现代化软件工程实践。热爱开源，持续学习，不断构建更优雅的自动化工具。

- 🔧 专注方向：DevOps / CI/CD / Kubernetes / 可观测性 / AI 赋能运维
- 📧 联系方式：zentrix566@gmail.com
- 🐙 GitHub：[github.com/zentrix566](https://github.com/zentrix566)

## 🚀 本地运行

因为是纯静态页面，直接打开 `index.html` 就能查看：

```bash
# clone 项目
git clone https://github.com/zentrix566/zentrix566.github.io.git
cd zentrix566.github.io

# 使用 Python 启动本地服务器
python -m http.server 8000
# 访问 http://localhost:8000
```

## 📄 许可证

MIT License

---

*⭐ 如果这个项目对你有帮助，欢迎点个 Star 支持！*
