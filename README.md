# 笔记应用 (Notes)

一个基于 Electron 构建的桌面笔记应用程序，支持多页签、纯文本笔记、本地存储。

## 功能特性

- **多页签管理** - 支持同时打开多个笔记，通过页签快速切换
- **本地存储** - 笔记保存在本地文件系统，安全可控
- **笔记列表** - 首页显示所有笔记列表
- **实时自动保存** - 编辑时自动保存，无需手动操作
- **搜索功能** - 支持搜索笔记标题和内容（暂未实现）
- **Toast 消息提示** - 操作反馈友好

## 项目结构

```
Notes/
├── main.js                 # Electron 主进程入口（窗口管理）
├── preload.js              # 预加载脚本（安全桥接）
├── package.json            # 项目配置
├── core/                   # 主进程核心模块
│   ├── manager.js          # 笔记管理核心逻辑（CRUD）
│   └── handlers.js         # IPC 处理器注册（桥接主进程和渲染进程）
└── src/
    ├── index.html          # 主页面 HTML
    ├── index.css           # 全局样式
    ├── renderer.js         # 渲染进程入口（启动应用）
    └── modules/            # 前端模块（分层架构，单一职责）
        ├── core/           # 核心模块
        │   ├── App.js      # 应用入口：依赖注入中心，初始化所有模块
        │   └── EventBus.js # 全局事件总线，模块间通信
        ├── services/       # 数据服务层（纯数据操作）
        │   └── NoteService.js # 封装 Electron API，提供笔记数据访问
        ├── controllers/    # 控制器层（业务逻辑编排）
        │   └── NoteController.js  # 编排笔记增删改查业务流程，协调视图与数据
        ├── views/          # 视图层（UI 渲染与交互）
        │   ├── UIManager.js       # UI 组件统一管理入口，统一绑定所有事件
        │   └── components/        # 可复用 UI 组件
        │       ├── NoteList.js   # 笔记列表渲染，处理卡片点击/删除事件
        │       ├── Editor.js     # 编辑器创建、切换、内容管理
        │       ├── TabBar.js     # 标签栏创建、切换、关闭渲染
        │       └── Toast.js      # Toast 提示组件，显示轻量级消息
        └── utils/          # 工具函数（按功能拆分）
            ├── formatters.js    # 日期格式化
            ├── validators.js    # 数据验证
            └── helpers.js       # 防抖、HTML 转义（防XSS）等通用函数
```

### 架构设计

采用**分层架构 + 依赖注入 + 事件总线**，遵循单一职责原则：

#### 主进程模块

| 文件 | 职责 |
|------|------|
| `main.js` | 应用入口，负责窗口创建和生命周期管理 |
| `preload.js` | 安全桥接，通过 `contextBridge` 暴露 API 给渲染进程 |
| `core/manager.js` | 笔记数据操作（创建、读取、更新、删除、列表获取） |
| `core/handlers.js` | IPC 通信处理器，将主进程功能暴露给渲染进程 |

#### 前端模块（src/modules/）

**核心层 (core/)**
| 模块 | 职责 |
|------|------|
| `core/App.js` | 应用入口，依赖注入中心，创建并注入所有模块实例 |
| `core/EventBus.js` | 全局事件总线，实现模块间的松耦合通信 |

**数据服务层 (services/)**
| 模块 | 职责 |
|------|------|
| `services/NoteService.js` | 封装所有与 Electron IPC 的数据交互，隔离业务层与原生 API |

**控制器层 (controllers/)**
| 模块 | 职责 |
|------|------|
| `controllers/NoteController.js` | 编排笔记增删改查、打开/关闭/切换业务流程，协调视图层与数据服务 |

**视图层 (views/)**
| 模块 | 职责 |
|------|------|
| `views/UIManager.js` | 整合管理所有 UI 组件，提供统一的全局 UI 接口。**所有事件监听统一在此绑定**。<br>代理方法使用 `组件_方法名` 命名规范（如 `editor_createNoteEditor`） |
| `views/components/NoteList.js` | 笔记列表渲染，卡片点击/删除事件，使用 `setCallbacks` 设置回调 |
| `views/components/Editor.js` | 编辑器创建、切换、内容更新管理，使用 `setCallbacks` 设置回调 |
| `views/components/TabBar.js` | 标签栏创建、切换、关闭渲染管理 |
| `views/components/Toast.js` | Toast 提示组件，显示操作反馈消息 |

**工具层 (utils/)**
| 模块 | 职责 |
|------|------|
| `utils/formatters.js` | 日期格式化工具 |
| `utils/validators.js` | 数据验证工具 |
| `utils/helpers.js` | HTML 转义（防XSS）、防抖等通用帮助函数 |

### 编码规范

- **组件回调统一使用 `setCallbacks` 模式**：所有 UI 组件通过 `setCallbacks` 方法设置回调，保持代码风格一致
- **UIManager 代理方法命名规范**：`组件名_方法名`，例如 `editor_createNoteEditor`、`tabBar_switchToTab`，清晰标识代理的是哪个组件的哪个方法
- **事件总线命名规范**：`模块:事件`，例如 `editor:titleChange`、`note:click`
- **依赖注入**：App 作为依赖注入中心，所有模块统一创建并注入依赖

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