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
        // 应用初始化事件
        this.eventBus.on(EventTypes.APP.INIT, () => {
            this.restorePageState();
        });

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

        // 恢复已打开的标签页
        if (state.openTabs && state.openTabs.length > 0) {
            // 先收集所有有效笔记
            const validNotes = [];
            const validNoteIds = [];
            for (const noteId of state.openTabs) {
                const note = await window.electronAPI.getNote(noteId);
                if (note) {
                    validNotes.push(note);
                    validNoteIds.push(noteId);
                }
            }

            // 批量打开所有笔记（不触发状态保存）
            for (const note of validNotes) {
                this.eventBus.emit(EventTypes.NOTE.OPEN, note);
            }

            // 延迟执行排序和切换，确保所有标签页都已创建
            setTimeout(() => {
                this.reorderTabs(validNoteIds);

                // 切换到之前激活的标签页
                let targetTabId = state.activeTabId;
                // 如果是无效值或已被删除，则切换到home
                if (!targetTabId || !validNoteIds.includes(targetTabId)) {
                    targetTabId = 'home';
                }

                this.eventBus.emit(EventTypes.EDITOR.TAB_SWITCH, targetTabId);
                this.isRestoring = false;
                // 恢复完成后保存一次
                this.saveState();
            }, 100);
        } else {
            this.isRestoring = false;
            this.eventBus.emit(EventTypes.EDITOR.TAB_SWITCH, 'home');
        }
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