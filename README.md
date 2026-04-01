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

### [企业级全场景 CI/CD 平台架构优化](projects/cicd-architecture.html) - 构建覆盖传统到云原生的标准化持续交付体系

针对研发流程中代码交付质量参差不齐、发布模式不统一、新服务接入慢及运维观测滞后等痛点，从零构建了一套覆盖**"传统架构"**与**"云原生架构"**的标准化持续集成/持续部署体系。通过脚手架自动化、流水线模板化、质量门禁强制化、发布策略多样化，系统性提升了企业级研发交付效率与系统稳定性。

**核心特性：**
- 🚀 **研发标准化脚手架** - 统一服务初始化工具，预集成健康检查、日志规范、容器化配置，新业务开箱即用
- 📋 **声明式流水线模板化** - 基于 Jenkins Shared Libraries 与 GitHub Actions 抽象通用模板，参数化配置自动生成全生命周期流水线
- 🚪 **多维代码质量门禁** - JUnit + JaCoCo 深度集成，覆盖率不达标自动阻断 MR 合并，保障主干分支质量
- 🚢 **全场景发布策略** - K8s 环境支持蓝绿部署/灰度发布，兼容 Jar 包直投、文件替换等传统非标模式，打通异构环境
- 🔌 **Jenkins 插件化扩展** - 自研自定义触发器插件，解决微服务多模块联动构建复杂需求

**项目成果：**
- ⚡ **交付效率提升** - 新服务接入 DevOps 体系从数小时缩短至 **5 分钟以内**
- ✅ **质量稳定性** - 生产环境变更事故率下降约 **30%**，核心业务覆盖率全面达标

**技术文章：**
- [深度实践：从 GitHub Action 到飞书机器人回调，构建生产级 DevOps 看板](https://mp.weixin.qq.com/s/kaD_NAsMxAYP9C_e1ZhtWQ)
- [手把手教你用 GitHub Actions 玩转 K8s 四大发布模式](https://mp.weixin.qq.com/s/K9PlPRmVwrdO1XqioTmsNQ)
- [从传统部署到云原生：标准与非标准 CI/CD 全场景实战指南](https://mp.weixin.qq.com/s/uRiGNWdht1gbIIyFWiRe5A)
- [微服务架构下的 Jenkins 自动化：自定义批量构建插件指南](https://mp.weixin.qq.com/s/3CiheVat3XGjRhCE1Mve5Q)

**项目 Demo：**
- [my-devops-core](https://github.com/zentrix566/my-devops-core) - DevOps 核心库与流水线模板
- [devops](https://github.com/zentrix566/devops) - 企业级 CI/CD 配置示例与实践
- [test-jenkins-plugin](https://github.com/zentrix566/test-jenkins-plugin) - Jenkins 自定义触发器插件 Demo

👉 [查看详情](projects/cicd-architecture.html)

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
