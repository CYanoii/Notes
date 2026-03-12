# 笔记应用 (Notes)

一个基于 Electron 构建的桌面笔记应用程序，支持多页签、Markdown 格式、本地存储。

## 功能特性

- **多页签管理** - 支持同时打开多个笔记，通过页签快速切换
- **Markdown 支持** - 使用 Markdown 格式编写笔记
- **本地存储** - 笔记保存在本地文件系统，安全可控
- **最近笔记** - 首页显示最近打开的笔记列表
- **搜索功能** - 支持搜索笔记标题和内容（开发中）

## 项目结构

```
Notes/
├── main.js           # Electron 主进程入口（窗口管理）
├── preload.js        # 预加载脚本（安全桥接）
├── package.json      # 项目配置
├── core/
│   ├── manager.js    # 笔记管理核心逻辑（CRUD）
│   └── handlers.js   # IPC 处理器注册
└── src/
    ├── index.html    # 主页面
    ├── renderer.js   # 渲染进程脚本
    └── index.css     # 样式文件
```

### 模块说明

| 文件 | 职责 |
|------|------|
| `main.js` | 应用入口，负责窗口创建和生命周期管理 |
| `preload.js` | 安全桥接，暴露 API 给渲染进程 |
| `core/manager.js` | 笔记数据操作（创建、读取、更新、删除、搜索） |
| `core/handlers.js` | IPC 通信处理，将主进程功能映射到前端 |
| `src/renderer.js` | 前端业务逻辑 |

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动应用

```bash
npm run start
```

## 技术栈

- **Electron 40.0.0** - 桌面应用框架
- **原生 HTML/CSS/JS** - 前端技术
- **文件系统 API** - 笔记存储

# TODO

1. 回收站功能
2. 记录关闭前页面状态
3. 搜索功能
4. 支持 markdown