# 性格测试项目

项目：在线 MBTI 16型人格性格测试网站

## 技术栈

- 纯 HTML + CSS + JavaScript
- 无需框架，无需构建工具
- 静态网站，部署在 GitHub Pages

## 文件结构

```
.
├── index.html      # 主页面
├── style.css       # 样式
├── script.js       # 逻辑和题目数据
├── favicon.svg     # 图标
├── README.md       # 项目说明
├── LICENSE         # 许可证
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Pages 部署配置
```

## 功能

- 欢迎页面 -> 答题 -> 加载 -> 结果页面四步流程
- 20道题目，覆盖四个维度
- 计算出16种人格类型中的一种
- 显示性格描述和优势分析
- 支持分享结果

## 开发规则

- 保持纯静态，不引入复杂依赖
- 代码保持简洁可维护
- 确保移动端适配
- 所有链接要正确
