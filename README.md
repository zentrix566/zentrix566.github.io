# zentrix566 个人主页

个人工具集合网站，基于 Vue 3 + Vite 构建。

✨ **在线体验：** [https://zentrix566.github.io/](https://zentrix566.github.io/)

## 功能模块

### 🏃 间歇训练

跑步间歇训练数据分析工具

- 📊 配速趋势图 - 按训练分组展示每次训练的配速变化
- 📈 评级分布 - 自动评级并统计分布情况
- 💾 数据持久化 - 本地存储训练数据，刷新不丢失
- 📤 数据导入/导出 - 支持 JSON 格式备份
- ➕ 添加新记录 - 快速录入训练数据
- 🗓️ 内置训练记录 - 已包含截至 2026 年 6 月 5 日的训练数据

**评级标准：**
- 非常快：1分50秒以内
- 比较快：1分50秒 - 1分55秒
- 有点快：1分55秒 - 1分57秒
- 优秀：1分59秒 - 2分01秒
- 良：1分57秒 - 1分59秒 / 2分01秒 - 2分03秒
- 一般：2分03秒 - 2分05秒
- 差：2分05秒 - 2分10秒
- 很差：2分10秒以外

### 🔧 工具
- 开发中...

### 📁 项目
- 开发中...

### ℹ️ 关于
- 开发中...

## 技术栈

- **框架**：Vue 3
- **构建工具**：Vite
- **路由**：Vue Router
- **图表**：Chart.js
- **部署**：GitHub Pages

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
zentrix566.github.io/
├── src/
│   ├── views/          # 页面组件
│   │   ├── Home.vue            # 首页
│   │   ├── IntervalTraining.vue # 间歇训练
│   │   ├── Tools.vue           # 工具
│   │   ├── Projects.vue        # 项目
│   │   └── About.vue           # 关于
│   ├── router/
│   │   └── index.js    # 路由配置
│   ├── App.vue         # 根组件
│   ├── main.js         # 入口文件
│   └── style.css       # 全局样式
├── index.html
├── package.json
├── vite.config.js
└── .github/workflows/  # GitHub Pages 部署配置
```

## 部署

项目配置了 GitHub Pages 自动部署，推送到 `main` 分支会自动构建并部署。

## 许可证

[MIT License](LICENSE) © zentrix566

---

Created with ❤️ by [zentrix566](https://github.com/zentrix566)
