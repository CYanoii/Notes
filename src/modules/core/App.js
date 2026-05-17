/**
 * 主应用入口 - 依赖注入中心
 * 负责创建所有模块实例并注入依赖，然后启动应用
 */
import { EventBus } from './EventBus.js';
import { NoteController } from '../controllers/NoteController.js';
import { TagController } from '../controllers/TagController.js';
import { PageStateController } from '../controllers/PageStateController.js';
import { NoteService } from '../services/NoteService.js';
import { TagService } from '../services/TagService.js';
import { PageStateService } from '../services/PageStateService.js';
import { NoteTagCoordinator } from '../coordinators/NoteTagCoordinator.js';
import { UIManager } from '../views/UIManager.js';

export class App {
    constructor() {
        // 1. 创建核心实例（唯一）
        this.eventBus = new EventBus();

        // 2. 创建数据服务层
        this.noteService = new NoteService();
        this.tagService = new TagService();
        this.pageStateService = new PageStateService();

        // 3. 创建 UI 管理器，由它统一创建和管理所有 UI 组件
        this.uiManager = new UIManager(this.eventBus);

        // 4. 创建协调器层（仅依赖服务层，不依赖控制器，消除循环依赖）
        this.noteTagCoordinator = new NoteTagCoordinator(
            this.noteService,
            this.tagService,
            this.uiManager
        );

        // 5. 创建控制器层（依赖下层模块 + 协调器）
        this.noteController = new NoteController(
            this.noteService,
            this.uiManager,
            this.eventBus,
            this.noteTagCoordinator
        );

        this.tagController = new TagController(
            this.tagService,
            this.uiManager,
            this.eventBus,
            this.noteTagCoordinator
        );

        this.pageStateController = new PageStateController(
            this.pageStateService,
            this.uiManager,
            this.eventBus
        );

        // 暴露到全局方便调试
        this.exposeToGlobal();

        console.log('App initialized with all modules');
    }

    /**
     * 初始化应用
     */
    async init() {
        // 0. 初始化标题栏
        this.initTitleBar();

        // 1. 基础初始化：加载标签筛选栏、笔记列表、渲染初始面板
        // 加载标签筛选栏
        await this.noteController.refreshTagFilter();
        // 加载所有笔记
        await this.noteController.loadAllNotes();
        // 渲染初始侧边栏面板（默认 search 面板）
        const initialPanel = this.noteController.getInitialPanel();
        await this.noteController.handlePanelChange(initialPanel);

        // 2. 恢复页面状态：侧边栏状态 + 获取要恢复的笔记和标签页信息
        const { validNotes, validNoteIds, activeTabId } = await this.pageStateController.restorePageState();

        // 3. 打开恢复的笔记
        for (const note of validNotes) {
            await this.noteController.openNote(note);
        }

        // 4. 恢复标签页顺序
        if (validNoteIds.length > 0) {
            this.pageStateController.reorderTabs(validNoteIds);
        }

        // 5. 切换到之前激活的标签页
        if (activeTabId && activeTabId !== 'home') {
            this.noteController.switchToNote(activeTabId);
        } else {
            this.noteController.switchToHome();
        }

        console.log('App started');
    }

    /**
     * 初始化标题栏
     */
    async initTitleBar() {
        // 设置初始标题（软件名 - 文件夹名）
        const folderName = await window.electronAPI.getFolderName();
        document.getElementById('titlebarTitle').textContent = `CYanote - ${folderName}`;

        const minimizeBtn = document.getElementById('titlebarMinimize');
        const maximizeBtn = document.getElementById('titlebarMaximize');
        const closeBtn = document.getElementById('titlebarClose');

        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });

        maximizeBtn.addEventListener('click', async () => {
            await window.electronAPI.maximizeWindow();
            this.updateMaximizeButton();
        });

        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });

        // 初始化最大化按钮状态
        this.updateMaximizeButton();

        // 监听窗口大小变化（如双击标题栏最大化）
        window.addEventListener('resize', () => {
            this.updateMaximizeButton();
        });
    }

    /**
     * 更新最大化按钮图标
     */
    async updateMaximizeButton() {
        const maximizeBtn = document.getElementById('titlebarMaximize');
        const isMaximized = await window.electronAPI.isWindowMaximized();
        const icon = maximizeBtn.querySelector('i');
        if (isMaximized) {
            icon.className = 'far fa-clone';
        } else {
            icon.className = 'far fa-square';
        }
    }

    /**
     * 暴露到全局，方便调试
     */
    exposeToGlobal() {
        window.app = this;
        window.eventBus = this.eventBus;
    }
}
