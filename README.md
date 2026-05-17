# CYanote

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
- **系统托盘** - 支持最小化到托盘，托盘菜单包含显示窗口/退出选项

## 项目结构

```
CYanote/
├── main.js                 # Electron 主进程入口（窗口管理、系统托盘）
├── preload.js              # 预加载脚本（安全桥接）
├── package.json            # 项目配置
├── core/                   # 主进程核心模块
│   ├── NotesManager.js     # 笔记管理核心逻辑（CRUD、索引、回收站）
│   ├── TagsManager.js      # 标签管理核心逻辑
│   ├── ConfigManager.js    # 配置管理（数据路径、设置持久化）
│   └── handlers.js         # IPC 处理器注册（桥接主进程和渲染进程）
└── src/
    ├── index.html          # 主页面 HTML
    ├── index.css           # 全局样式
    ├── renderer.js         # 渲染进程入口（启动应用）
    └── modules/            # 前端模块（分层架构，单一职责）
        ├── core/           # 核心模块
        │   ├── App.js           # 应用入口：依赖注入中心，初始化所有模块
        │   ├── EventBus.js      # 全局事件总线，模块间通信
        │   └── EventTypes.js    # 统一事件类型命名规范
        ├── services/       # 数据服务层（纯数据操作，封装 IPC 调用）
        │   ├── NoteService.js      # 笔记数据访问 + 内存缓存管理
        │   ├── TagService.js       # 标签数据访问
        │   └── PageStateService.js # 页面状态（侧边栏/标签页）持久化
        ├── controllers/    # 控制器层（业务逻辑编排，接收 UI 事件）
        │   ├── NoteController.js      # 笔记增删改查业务流程编排
        │   ├── TagController.js       # 标签增删改查业务流程编排
        │   └── PageStateController.js # 页面状态恢复编排
        ├── coordinators/  # 协调器层（处理跨领域交叉业务）
        │   └── NoteTagCoordinator.js # 笔记与标签的交叉逻辑（搜索、绑定、批量操作）
        ├── views/          # 视图层（UI 渲染与交互）
        │   ├── UIManager.js       # UI 组件统一管理入口，所有事件统一绑定
        │   └── components/        # 可复用 UI 组件
        │       ├── LeftSidebar.js # 左侧边栏导航（面板切换、折叠、宽度调整）
        │       ├── NoteList.js    # 笔记列表渲染（卡片、删除）
        │       ├── Editor.js      # 编辑器创建、切换、内容管理
        │       ├── TabBar.js       # 标签页栏（拖拽排序）
        │       ├── TagFilter.js    # 标签筛选栏
        │       ├── Modal.js        # 模态框组件（输入/确认/标签选择/设置）
        │       └── Toast.js        # Toast 提示组件
        └── utils/          # 工具函数
            ├── formatters.js    # 日期格式化
            ├── validators.js    # 数据验证
            └── helpers.js       # 防抖、HTML 转义（防XSS）
```

### 架构设计

采用**分层架构 + 依赖注入 + 事件总线**，遵循单一职责原则。

#### 主进程模块

| 文件 | 职责 |
|------|------|
| `main.js` | 应用入口，窗口创建/托盘管理/生命周期管理 |
| `preload.js` | 安全桥接，通过 `contextBridge` 暴露 Electron API |
| `core/NotesManager.js` | 笔记数据操作（创建/读取/更新/删除/回收站/归档/搜索） |
| `core/TagsManager.js` | 标签数据操作（创建/删除/列表/关联笔记/使用计数） |
| `core/ConfigManager.js` | 配置管理（数据存储路径、设置持久化） |
| `core/handlers.js` | IPC 通信处理器，暴露主进程功能给渲染进程 |

#### 前端模块（src/modules/）

**核心层 (core/)**

| 模块 | 职责 |
|------|------|
| `core/App.js` | 应用入口，依赖注入中心，创建并注入所有模块实例 |
| `core/EventBus.js` | 全局事件总线，实现模块间的松耦合通信 |
| `core/EventTypes.js` | 统一事件类型常量，避免硬编码拼写错误 |

**数据服务层 (services/)**

| 模块 | 职责 |
|------|------|
| `services/NoteService.js` | 封装笔记 IPC 调用 + **内存缓存已打开笔记** + 当前笔记ID状态 |
| `services/TagService.js` | 封装标签 IPC 调用 |
| `services/PageStateService.js` | 页面状态持久化（侧边栏折叠/宽度、打开的标签页顺序） |

**控制器层 (controllers/)**

| 模块 | 职责 |
|------|------|
| `controllers/NoteController.js` | 接收 UI 事件，编排笔记增删改查、打开/关闭/切换业务流程 |
| `controllers/TagController.js` | 接收 UI 事件，编排标签增删改查业务流程 |
| `controllers/PageStateController.js` | 编排页面状态恢复流程（恢复侧边栏/标签页/激活状态） |

**协调器层 (coordinators/)**

| 模块 | 职责 |
|------|------|
| `coordinators/NoteTagCoordinator.js` | 仅依赖 Service 层，处理笔记+标签**交叉业务**（搜索、绑定标签、批量移除、刷新计数） |

**视图层 (views/)**

| 模块 | 职责 |
|------|------|
| `views/UIManager.js` | 整合管理所有 UI 组件，所有事件监听**统一在此绑定**，代理方法用 `组件_方法名` 命名 |
| `views/components/LeftSidebar.js` | 左侧边栏（导航面板切换、折叠、宽度拖拽调整） |
| `views/components/NoteList.js` | 笔记列表（卡片渲染、点击/删除） |
| `views/components/Editor.js` | 编辑器（创建/切换/内容管理，使用 Vditor） |
| `views/components/TabBar.js` | 标签页栏（创建/切换/关闭/拖拽排序） |
| `views/components/TagFilter.js` | 标签筛选栏（多选筛选） |
| `views/components/Modal.js` | 通用模态框（输入提示/确认对话框/标签选择/设置浮出） |
| `views/components/Toast.js` | Toast 提示（info/success/error/warning） |

**工具层 (utils/)**

| 模块 | 职责 |
|------|------|
| `utils/formatters.js` | 日期格式化 |
| `utils/validators.js` | 数据验证 |
| `utils/helpers.js` | HTML 转义（防XSS）、防抖 |

### 依赖规则与数据流

遵循**单向依赖**原则，消除循环依赖：

```
UI → EventBus → Controller → Coordinator → Service → IPC → Manager (主进程)
                           ← (返回结果) ←
```

**依赖规则：**
- ✅ Coordinator 仅依赖 Service 层，不依赖 Controller
- ✅ Controller 依赖 Coordinator
- ✅ Controller 之间不相互调用
- ✅ 事件仅在 UI → Controller 之间使用，Coordinator 不监听 UI 事件

**数据流：**
1. UI 通过 EventBus 发出业务事件
2. Controller 接收事件，调用 Coordinator
3. Coordinator 编排 Service 层数据操作
4. Coordinator 返回结果给 Controller，Controller 更新 UI

### 编码规范

- **组件回调统一使用 `setCallbacks` 模式**
- **UIManager 代理方法命名**：`组件名_方法名`（如 `editor_createNoteEditor`）
- **事件总线命名**：`模块:事件`（如 `editor:titleChange`）
- **依赖注入**：App 作为依赖注入中心

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动应用

```bash
npm run start
```

### 打包构建

```bash
npm run dist
```

## 技术栈

- **Electron 40.0.0** - 桌面应用框架
- **Vditor 3.11.2** - Markdown 编辑器
- **原生 HTML/CSS/JS** - 前端技术
- **文件系统 API** - 笔记本地存储
