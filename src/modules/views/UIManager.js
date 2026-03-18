/**
 * UI 管理器
 * 整合管理所有 UI 组件，提供统一的全局 UI 接口
 * 所有 eventBus 事件在此统一绑定
 */
import { Toast } from './components/Toast.js';
import { Editor } from './components/Editor.js';
import { NoteList } from './components/NoteList.js';
import { TabBar } from './components/TabBar.js';
import { LeftSidebar } from './components/LeftSidebar.js';

export class UIManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // 统一创建所有 UI 组件实例
        this.toast = new Toast();
        this.editor = new Editor();
        this.noteList = new NoteList();
        this.tabBar = new TabBar();
        this.leftSidebar = new LeftSidebar();

        this.bindEvents();
    }

    /**
     * 绑定所有事件监听 - 统一在此管理
     */
    bindEvents() {
        // Toast 相关事件
        this.eventBus.on('ui:toast', (message, type) => this.toast_show(message, type));

        // NoteList 组件事件回调 - 将组件回调转发到 eventBus
        this.noteList.setCallbacks(
            (note) => this.eventBus.emit('note:click', note),
            (noteId) => this.eventBus.emit('note:delete', noteId)
        );

        // Editor 组件事件回调 - 将编辑器输入事件转发到 eventBus
        this.editor.setCallbacks(
            (noteId, title) => this.eventBus.emit('editor:titleChange', noteId, title),
            (noteId, content) => this.eventBus.emit('editor:contentChange', noteId, content)
        );

        // 绑定 DOM 全局事件监听
        // 新建笔记按钮
        document.getElementById('newNoteBtn').addEventListener('click', () => {
            this.eventBus.emit('app:createNewNote');
        });

        // 搜索框事件
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.eventBus.emit('app:homeSearch', searchInput.value.trim());
            }
        });

        document.querySelector('.btn-search').addEventListener('click', () => {
            this.eventBus.emit('app:homeSearch', searchInput.value.trim());
        });

        // 标签栏事件委托（处理标签切换和关闭）
        document.querySelector('.tab-bar').addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (tab) {
                const tabId = tab.dataset.tabId;
                this.eventBus.emit('app:switchTab', tabId);
            }

            // 关闭按钮
            const closeBtn = e.target.closest('.tab-close');
            if (closeBtn) {
                const tab = closeBtn.closest('.tab');
                const noteId = tab.dataset.tabId;
                if (noteId !== 'home') {
                    this.eventBus.emit('app:closeNote', noteId);
                }
            }
        });

        // 左侧边栏导航点击事件（DOM 事件在 UIManager 绑定，转发到 EventBus）
        const navContainer = this.leftSidebar.getNavContainer();
        navContainer.addEventListener('click', (e) => {
            const navItem = e.target.closest('.sidebar-nav-item');
            if (navItem) {
                const panelId = navItem.dataset.panelId;
                this.eventBus.emit('sidebar:navClick', panelId);
            }
        });

        // 左侧边栏面板切换后回调，转发到 EventBus
        this.leftSidebar.setPanelChangeCallback((panelId) => {
            this.eventBus.emit('sidebar:panelChange', panelId);
        });

        // 左侧边栏折叠状态变化事件
        this.leftSidebar.setCollapseChangeCallback((isCollapsed) => {
            this.eventBus.emit('sidebar:collapseChange', isCollapsed);
        });

        // 左侧边栏宽度变化事件
        this.leftSidebar.setWidthChangeCallback((width) => {
            this.eventBus.emit('sidebar:widthChange', width);
        });
    }

    // ========== Editor 代理方法 ==========

    /**
     * 创建笔记编辑器（代理到 Editor 并绑定回调）
     */
    editor_createNoteEditor(noteData) {
        this.editor.createNoteEditor(noteData);
    }

    /**
     * 切换到指定笔记编辑器
     */
    editor_switchToNoteEditor(noteId) {
        this.editor.switchToNoteEditor(noteId);
    }

    /**
     * 切换到首页
     */
    editor_switchToHomePage() {
        this.editor.switchToHomePage();
    }

    /**
     * 关闭笔记编辑器
     */
    editor_closeNoteEditor(noteId) {
        this.editor.closeNoteEditor(noteId);
    }

    /**
     * 更新编辑器标题
     */
    editor_updateEditorTitle(noteId, newTitle) {
        this.editor.updateEditorTitle(noteId, newTitle);
    }

    /**
     * 更新编辑器内容
     */
    editor_updateEditorContent(noteId, newContent) {
        this.editor.updateEditorContent(noteId, newContent);
    }

    // ========== TabBar 代理方法 ==========

    /**
     * 创建笔记标签页
     */
    tabBar_createNoteTab(noteData) {
        this.tabBar.createNoteTab(noteData);
    }

    /**
     * 切换到指定标签页
     * @param {string|number} tabId 标签页ID，可以是笔记ID或'home'等特殊ID
     */
    tabBar_switchToTab(tabId) {
        this.tabBar.switchToTab(tabId);
    }

    /**
     * 关闭指定标签页
     */
    tabBar_closeNoteTab(noteId) {
        this.tabBar.closeNoteTab(noteId);
    }

    /**
     * 更新标签页标题
     */
    tabBar_updateTabTitle(noteId, newTitle) {
        this.tabBar.updateTabTitle(noteId, newTitle);
    }

    /**
     * 获取当前激活的标签页ID
     */
    tabBar_getActiveTabId() {
        return this.tabBar.getActiveTabId();
    }

    // ========== NoteList 代理方法 ==========

    /**
     * 渲染笔记列表
     */
    noteList_renderNotes(notes) {
        this.noteList.renderNotes(notes);
    }

    /**
     * 清空笔记列表
     */
    noteList_clearNoteList() {
        this.noteList.clear();
    }

    // ========== Toast 代理方法 ==========

    /**
     * 显示Toast提示
     * @param {string} message 提示内容
     * @param {string} type 提示类型：info/success/error/warning
     */
    toast_show(message, type = 'info') {
        this.toast.show(message, type);
    }

    /**
     * 显示确认对话框
     * @param {string} message 确认信息
     * @returns {Promise<boolean>} 用户是否确认
     */
    showConfirm(message) {
        return Promise.resolve(confirm(message));
    }

    // ========== LeftSidebar 代理方法 ==========

    /**
     * 获取侧边栏内容容器
     * 用于渲染具体面板内容
     */
    leftSidebar_getContentContainer() {
        return this.leftSidebar.getContentContainer();
    }

    /**
     * 获取当前激活的面板 ID
     */
    leftSidebar_getActivePanelId() {
        return this.leftSidebar.getActivePanelId();
    }

    /**
     * 获取当前折叠状态
     */
    leftSidebar_getIsCollapsed() {
        return this.leftSidebar.getIsCollapsed();
    }

    /**
     * 获取当前侧边栏宽度
     */
    leftSidebar_getCurrentWidth() {
        return this.leftSidebar.getCurrentWidth();
    }

    /**
     * 获取侧边栏导航容器
     * 用于外部绑定事件
     */
    leftSidebar_getNavContainer() {
        return this.leftSidebar.getNavContainer();
    }

    /**
     * 切换到指定面板
     */
    leftSidebar_switchPanel(panelId) {
        this.leftSidebar.switchPanel(panelId);
    }

    /**
     * 渲染侧边栏面板内容
     */
    leftSidebar_renderPanelContent(panelId, data) {
        this.leftSidebar.renderPanelContent(panelId, data);
    }
}
