# 笔记应用 (Notes)

一个基于 Electron 构建的桌面笔记应用程序，支持多页签、纯文本笔记、标签分类、本地存储。

## 功能特性

- **左侧边栏导航** - 最近笔记/标签分类/归档/回收站，清晰的功能分区
- **标签分类管理** - 支持为笔记添加标签，按标签筛选笔记
- **回收站** - 删除笔记移入回收站，支持恢复或永久删除，误删可找回
- **归档** - 按创建日期（年-月）分组归档展示笔记
- **多页签管理** - 支持同时打开多个笔记，通过页签快速切换
- **本地存储** - 笔记保存在本地文件系统，安全可控
- **笔记列表** - 首页显示所有笔记列表，支持筛选
- **实时自动保存** - 编辑时自动保存，无需手动操作
- **快速搜索** - 支持按标题、标签、内容全文搜索，搜索结果实时预览，标签高亮显示
- **Toast 消息提示** - 操作反馈友好

## 项目结构

```
Notes/
├── main.js                 # Electron 主进程入口（窗口管理）
├── preload.js              # 预加载脚本（安全桥接）
├── package.json            # 项目配置
├── core/                   # 主进程核心模块
│   ├── NotesManager.js     # 笔记管理核心逻辑（CRUD）
│   ├── TagsManager.js      # 标签管理核心逻辑
│   └── handlers.js         # IPC 处理器注册（桥接主进程和渲染进程）
└── src/
    ├── index.html          # 主页面 HTML
    ├── index.css           # 全局样式
    ├── renderer.js         # 渲染进程入口（启动应用）
    └── modules/            # 前端模块（分层架构，单一职责）
        ├── core/           # 核心模块
        │   ├── App.js      # 应用入口：依赖注入中心，初始化所有模块
        │   ├── EventBus.js # 全局事件总线，模块间通信
        │   └── EventTypes.js # 统一事件类型命名规范
        ├── services/       # 数据服务层（纯数据操作）
        │   ├── NoteService.js # 封装 Electron API，提供笔记数据访问
        │   └── TagService.js  # 封装 Electron API，提供标签数据访问
        ├── controllers/    # 控制器层（业务逻辑编排）
        │   ├── NoteController.js  # 编排笔记增删改查业务流程，协调视图与数据
        │   └── TagController.js  # 编排标签增删改查业务流程，协调视图与数据
        ├── coordinators/ 	# 协调器层（处理跨领域交叉业务）
        │   └── NoteTagCoordinator.js # 协调笔记与标签的交叉业务逻辑
        ├── views/          # 视图层（UI 渲染与交互）
        │   ├── UIManager.js       # UI 组件统一管理入口，统一绑定所有事件
        │   └── components/        # 可复用 UI 组件
        │       ├── LeftSidebar.js # 左侧边栏导航，处理菜单切换
        │       ├── NoteList.js   # 笔记列表渲染，处理卡片点击/删除事件
        │       ├── Editor.js     # 编辑器创建、切换、内容管理
        │       ├── TabBar.js     # 标签页栏创建、切换、关闭渲染
        │       ├── Modal.js      # 模态框组件（用于新建标签等操作）
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
| `core/NotesManager.js` | 笔记数据操作（创建、读取、更新、删除、列表获取、回收站、归档） |
| `core/TagsManager.js` | 标签数据操作（创建、删除、列表获取、关联笔记） |
| `core/handlers.js` | IPC 通信处理器，将主进程功能暴露给渲染进程 |

#### 前端模块（src/modules/）

**核心层 (core/)**
| 模块 | 职责 |
|------|------|
| `core/App.js` | 应用入口，依赖注入中心，创建并注入所有模块实例 |
| `core/EventBus.js` | 全局事件总线，实现模块间的松耦合通信 |
| `core/EventTypes.js` | 统一事件类型常量命名，避免硬编码拼写错误 |

**数据服务层 (services/)**
| 模块 | 职责 |
|------|------|
| `services/NoteService.js` | 封装所有与 Electron IPC 的数据交互，隔离业务层与原生 API。维护**已打开笔记内存缓存**和当前笔记ID状态 |
| `services/TagService.js` | 封装标签相关的 IPC 数据交互，提供标签数据访问 |

**控制器层 (controllers/)**
| 模块 | 职责 |
|------|------|
| `controllers/NoteController.js` | 接收 UI 事件，编排笔记增删改查、打开/关闭/切换业务流程，调用协调器处理交叉逻辑，协调视图层更新 |
| `controllers/TagController.js` | 接收 UI 事件，编排标签增删改查业务流程，调用协调器处理交叉逻辑，协调视图层更新 |

**协调器层 (coordinators/)**

| 模块 | 职责 |
|------|------|
| `coordinators/NoteTagCoordinator.js` | 仅依赖 Service 层，处理同时涉及笔记和标签的**交叉业务逻辑**（搜索、笔记绑定标签、批量移除标签、刷新标签计数等） |

**视图层 (views/)**
| 模块 | 职责 |
|------|------|
| `views/UIManager.js` | 整合管理所有 UI 组件，提供统一的全局 UI 接口。**所有事件监听统一在此绑定**。<br>代理方法使用 `组件_方法名` 命名规范（如 `editor_createNoteEditor`） |
| `views/components/LeftSidebar.js` | 左侧边栏导航，主页/标签切换，新建标签按钮，使用 `setCallbacks` 设置回调 |
| `views/components/NoteList.js` | 笔记列表渲染，卡片点击/删除事件，支持按标签筛选，使用 `setCallbacks` 设置回调 |
| `views/components/Editor.js` | 编辑器创建、切换、内容更新管理，使用 `setCallbacks` 设置回调 |
| `views/components/TabBar.js` | 标签页栏创建、切换、关闭渲染管理 |
| `views/components/Modal.js` | 通用模态框组件，支持输入提示、确认对话框、标签选择 |
| `views/components/Toast.js` | Toast 提示组件，显示操作反馈消息 |

**工具层 (utils/)**
| 模块 | 职责 |
|------|------|
| `utils/formatters.js` | 日期格式化工具 |
| `utils/validators.js` | 数据验证工具 |
| `utils/helpers.js` | HTML 转义（防XSS）、防抖等通用帮助函数 |

### 依赖规则与数据流

遵循**单向依赖**原则，消除循环依赖：

```
UI → EventBus → Controller → Coordinator → Service → IPC → Manager (主进程)
                           ← (返回结果) ←
```

**依赖规则：**

- ✅ **Coordinator 不依赖 Controller** → 仅依赖 Service 层
- ✅ **Controller 依赖 Coordinator** → Controller 调用 Coordinator
- ✅ **Controller 之间不相互调用**
- ✅ **事件仅在 UI → Controller 之间使用** → Coordinator 不监听 UI 事件

**数据流：**

1. UI 层通过 EventBus 发出业务事件
2. Controller 接收事件，从内存缓存获取状态，调用 Coordinator
3. Coordinator 编排 Service 层数据操作，完成交叉业务逻辑
4. Coordinator 返回结果给 Controller，Controller 更新 UI

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

1. ~~标签功能~~ ✅ 已完成
2. ~~回收站功能~~ ✅ 已完成
3. ~~归档功能~~ ✅ 已完成
4. ~~搜索功能~~ ✅ 已完成（支持标题/标签/内容全文搜索，关键词高亮，标签预览）
5. 记录关闭前页面状态
6. 支持 markdown
7. 页面状态记录