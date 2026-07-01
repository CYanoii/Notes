/**
 * 主应用入口 - 依赖注入中心
 * 负责创建所有模块实例并注入依赖，然后启动应用
 */
import { EventBus } from './EventBus.js';
import { NoteController } from '../controllers/NoteController.js';
import { TagController } from '../controllers/TagController.js';
import { PageStateController } from '../controllers/PageStateController.js';
import { StickyController } from '../controllers/StickyController.js';
import { NoteService } from '../services/NoteService.js';
import { TagService } from '../services/TagService.js';
import { PageStateService } from '../services/PageStateService.js';
import { StickyService } from '../services/StickyService.js';
import { NoteTagCoordinator } from '../coordinators/NoteTagCoordinator.js';
import { PageTagCoordinator } from '../coordinators/PageTagCoordinator.js';
import { UIManager } from '../views/UIManager.js';

export class App {
    constructor() {
        // 1. 创建核心实例（唯一）
        this.eventBus = new EventBus();

        // 2. 创建数据服务层
        this.noteService = new NoteService();
        this.tagService = new TagService();
        this.pageStateService = new PageStateService();
        this.stickyService = new StickyService();

        // 3. 创建 UI 管理器，由它统一创建和管理所有 UI 组件
        this.uiManager = new UIManager(this.eventBus);

        // 4. 创建协调器层（仅依赖服务层，不依赖控制器，消除循环依赖）
        this.noteTagCoordinator = new NoteTagCoordinator(
            this.noteService,
            this.tagService,
            this.uiManager
        );
        this.pageTagCoordinator = new PageTagCoordinator(
            this.noteService,
            this.tagService,
            this.uiManager
        );

        // 5. 创建控制器层（依赖下层模块 + 协调器）
        this.noteController = new NoteController(
            this.noteService,
            this.uiManager,
            this.eventBus,
            this.noteTagCoordinator,
            this.pageTagCoordinator
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

        this.stickyController = new StickyController(
            this.stickyService,
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
               // 0. 从配置加载面板可见性设置和编辑器样式
        try {
            const config = await window.electronAPI.getConfig();
            if (config) {
                if (config.sidebarPanels) {
                    this.noteTagCoordinator.setVisibilityFromConfig(config);
                }
                if (config.editorStyle) {
                    //暴露到 window 以供 Editor.vue访问
                    window.editorStyleConfig = config.editorStyle;
                    this.applyEditorStyle(config.editorStyle);
                }
                if (config.theme) {
                    this.applyTheme(config.theme);
                }
            }
        } catch (err) {
            console.warn('[App] Failed to load config:', err);
        }

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
     * 暴露到全局，方便调试
     */
    exposeToGlobal() {
        window.app = this;
        window.eventBus = this.eventBus;
        window.stickyController = this.stickyController;
    }

    /**
     * 应用编辑器样式设置
     * @param {Object} style - 样式配置对象
     */
    applyEditorStyle(style) {
        if (!style) return;

        const root = document.documentElement;
        if (style.fontFamily) {
            root.style.setProperty('--editor-font-family', style.fontFamily);
        }
        if (style.fontSize) {
            root.style.setProperty('--editor-font-size', style.fontSize + 'px');
        }
        if (style.lineHeight) {
            root.style.setProperty('--editor-line-height', style.lineHeight);
        }
        if (style.paragraphSpacing) {
            root.style.setProperty('--editor-paragraph-spacing', style.paragraphSpacing + 'px');
        }

        // 直接应用到已有的 Vditor 实例
        this.applyStyleToVditors(style);

        // 监听新的 Vditor 创建
        this.observeVditorCreation(style);
    }

    /**
     * 应用样式到已有的 Vditor 实例
     */
    applyStyleToVditors(style) {
        const vditors = document.querySelectorAll('div.vditor');
        vditors.forEach(vditor => {
            const content = vditor.querySelector('.vditor-reset');
            if (content) {
                if (style.fontFamily) {
                    content.style.fontFamily = style.fontFamily;
                }
                if (style.fontSize) {
                    content.style.fontSize = style.fontSize + 'px';
                }
                if (style.lineHeight) {
                    content.style.lineHeight = style.lineHeight;
                }
            }
            // 段落间距
            const paragraphs = vditor.querySelectorAll('.vditor-reset p');
            paragraphs.forEach(p => {
                if (style.paragraphSpacing) {
                    p.style.marginBottom = style.paragraphSpacing + 'px';
                }
            });
        });
    }

    /**
     * 监听 Vditor 创建以应用样式
     */
    observeVditorCreation(style) {
        // 清除之前的观察者
        if (this.vditorObserver) {
            this.vditorObserver.disconnect();
        }

        const applyToNewVditor = (mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList && node.classList.contains('vditor')) {
                        setTimeout(() => {
                            const content = node.querySelector('.vditor-reset');
                            if (content) {
                                if (style.fontFamily) content.style.fontFamily = style.fontFamily;
                                if (style.fontSize) content.style.fontSize = style.fontSize + 'px';
                                if (style.lineHeight) content.style.lineHeight = style.lineHeight;
                            }
                            const paragraphs = node.querySelectorAll('.vditor-reset p');
                            paragraphs.forEach(p => {
                                if (style.paragraphSpacing) {
                                    p.style.marginBottom = style.paragraphSpacing + 'px';
                                }
                            });
                        }, 100);
                    }
                });
            });
        };

        this.vditorObserver = new MutationObserver(applyToNewVditor);
        this.vditorObserver.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * 应用主题设置
     * @param {string} theme -主题名称 ('light' 或 'dark')
     */
    applyTheme(theme) {
        if (!theme) return;
        document.documentElement.setAttribute('data-theme', theme);
    }
}
