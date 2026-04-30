/**
 * 页面状态控制器
 * 管理页面状态的加载、保存和恢复
 */
import { EventTypes } from '../core/EventTypes.js';
import { debounce } from '../utils/helpers.js';

export class PageStateController {
    constructor(pageStateService, uiManager, eventBus) {
        this.pageStateService = pageStateService;
        this.uiManager = uiManager;
        this.eventBus = eventBus;

        // 当前页面状态缓存
        this.currentState = {
            sidebar: {
                isCollapsed: false,
                width: 280
            },
            openTabs: [],
            activeTabId: 'home'
        };

        // 是否正在恢复状态
        this.isRestoring = false;

        // 防抖保存函数
        this.debouncedSave = debounce(() => {
            if (!this.isRestoring) {
                this.saveState();
            }
        }, 500);

        this.initEventListeners();
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 侧边栏折叠状态变化
        this.eventBus.on(EventTypes.SIDEBAR.COLLAPSE_CHANGE, (isCollapsed) => {
            this.currentState.sidebar.isCollapsed = isCollapsed;
            this.debouncedSave();
        });

        // 侧边栏宽度变化
        this.eventBus.on(EventTypes.SIDEBAR.WIDTH_CHANGE, (width) => {
            this.currentState.sidebar.width = width;
            this.debouncedSave();
        });

        // 打开笔记
        this.eventBus.on(EventTypes.NOTE.OPEN, (note) => {
            if (!this.currentState.openTabs.includes(note.id)) {
                this.currentState.openTabs.push(note.id);
            }
            // 恢复时不更新 activeTabId
            if (!this.isRestoring) {
                this.currentState.activeTabId = note.id;
                this.debouncedSave();
            }
        });

        // 关闭笔记
        this.eventBus.on(EventTypes.NOTE.CLOSE, (noteId) => {
            this.currentState.openTabs = this.currentState.openTabs.filter(id => id !== noteId);
            // 如果关闭的是当前激活的标签，切换到首页
            if (this.currentState.activeTabId === noteId) {
                this.currentState.activeTabId = 'home';
            }
            this.debouncedSave();
        });

        // 标签页切换
        this.eventBus.on(EventTypes.EDITOR.TAB_SWITCH, (tabId) => {
            this.currentState.activeTabId = tabId;
            this.debouncedSave();
        });

        // 标签页顺序变化
        this.eventBus.on(EventTypes.TAB_BAR.ORDER_CHANGE, (order) => {
            this.currentState.openTabs = order;
            this.debouncedSave();
        });
    }

    /**
     * 加载页面状态
     */
    async loadState() {
        const state = await this.pageStateService.load();
        this.currentState = state;
        return state;
    }

    /**
     * 保存页面状态
     */
    async saveState() {
        await this.pageStateService.save(this.currentState);
    }

    /**
     * 获取当前状态
     */
    getState() {
        return this.currentState;
    }

    /**
     * 恢复页面状态
     * @returns {Promise<{validNotes: Array, validNoteIds: Array, activeTabId: string}>}
     */
    async restorePageState() {
        const state = await this.loadState();

        // 开始恢复，禁用保存
        this.isRestoring = true;

        // 恢复侧边栏状态
        if (state.sidebar) {
            if (state.sidebar.isCollapsed) {
                this.uiManager.leftSidebar_collapse();
            } else {
                this.uiManager.leftSidebar_expand();
            }
            if (state.sidebar.width) {
                this.uiManager.leftSidebar_setWidth(state.sidebar.width);
            }
        }

        // 收集所有有效笔记
        const validNotes = [];
        const validNoteIds = [];
        if (state.openTabs && state.openTabs.length > 0) {
            for (const noteId of state.openTabs) {
                const note = await window.electronAPI.getNote(noteId);
                if (note) {
                    validNotes.push(note);
                    validNoteIds.push(noteId);
                }
            }
        }

        // 确定要切换到的标签页
        let activeTabId = state.activeTabId;
        if (!activeTabId || !validNoteIds.includes(activeTabId)) {
            activeTabId = 'home';
        }

        this.isRestoring = false;

        return { validNotes, validNoteIds, activeTabId };
    }

    /**
     * 按照指定顺序重新排列标签页
     */
    reorderTabs(order) {
        const tabBar = document.getElementById('tabBar');
        const homeTab = tabBar.querySelector('.tab[data-tab-id="home"]');

        // 从后往前插入，确保位置正确
        for (let i = order.length - 1; i >= 0; i--) {
            const noteId = order[i];
            const tab = tabBar.querySelector(`.tab[data-tab-id="${noteId}"]`);
            if (tab) {
                // 插入到home之后
                tabBar.insertBefore(tab, homeTab.nextSibling);
            }
        }
    }
}