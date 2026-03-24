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
import { Modal } from './components/Modal.js';
import { EventTypes } from '../core/EventTypes.js';

export class UIManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // 统一创建所有 UI 组件实例
        this.toast = new Toast();
        this.editor = new Editor();
        this.noteList = new NoteList();
        this.tabBar = new TabBar();
        this.leftSidebar = new LeftSidebar();
        this.modal = new Modal();

        this.bindEvents();
    }

    /**
     * 绑定所有事件监听 - 统一在此管理
     */
    bindEvents() {
        // NoteList 组件事件回调 - 将组件回调转发到 eventBus
        this.noteList.setCallbacks(
            (note) => this.eventBus.emit(EventTypes.NOTE.OPEN, note),
            (noteId) => this.eventBus.emit(EventTypes.NOTE.DELETE, noteId)
        );

        // Editor 组件事件回调 - 将编辑器输入事件转发到 eventBus
        this.editor.setCallbacks(
            (noteId, title) => this.eventBus.emit(EventTypes.NOTE.UPDATE.TITLE, noteId, title),
            (noteId, content) => this.eventBus.emit(EventTypes.NOTE.UPDATE.CONTENT, noteId, content)
        );

        // 绑定 DOM 全局事件监听
        // 新建笔记按钮
        document.getElementById('newNoteBtn').addEventListener('click', () => {
            this.eventBus.emit(EventTypes.NOTE.CREATE);
        });

        // 搜索框事件
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.eventBus.emit(EventTypes.SEARCH.HOME_SEARCH, searchInput.value.trim());
            }
        });

        document.querySelector('.btn-search').addEventListener('click', () => {
            this.eventBus.emit(EventTypes.SEARCH.HOME_SEARCH, searchInput.value.trim());
        });

        // 标签栏事件委托（处理标签切换和关闭）
        document.querySelector('.tab-bar').addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (tab) {
                const tabId = tab.dataset.tabId;
                this.eventBus.emit(EventTypes.EDITOR.TAB_SWITCH, tabId);
            }

            // 关闭按钮
            const closeBtn = e.target.closest('.tab-close');
            if (closeBtn) {
                const tab = closeBtn.closest('.tab');
                const noteId = tab.dataset.tabId;
                if (noteId !== 'home') {
                    this.eventBus.emit(EventTypes.NOTE.CLOSE, noteId);
                }
            }
        });

        // 左侧边栏导航点击事件（DOM 事件在 UIManager 绑定，转发到 EventBus）
        const navContainer = this.leftSidebar.getNavContainer();
        navContainer.addEventListener('click', (e) => {
            const navItem = e.target.closest('.sidebar-nav-item');
            if (navItem) {
                const panelId = navItem.dataset.panelId;
                this.eventBus.emit(EventTypes.SIDEBAR.NAV_CLICK, panelId);
            }
        });

        // 左侧边栏面板切换后回调，转发到 EventBus
        this.leftSidebar.setPanelChangeCallback((panelId) => {
            this.eventBus.emit(EventTypes.SIDEBAR.PANEL_CHANGE, panelId);
        });

        // 左侧边栏折叠状态变化事件
        this.leftSidebar.setCollapseChangeCallback((isCollapsed) => {
            this.eventBus.emit(EventTypes.SIDEBAR.COLLAPSE_CHANGE, isCollapsed);
        });

        // 左侧边栏宽度变化事件
        this.leftSidebar.setWidthChangeCallback((width) => {
            this.eventBus.emit(EventTypes.SIDEBAR.WIDTH_CHANGE, width);
        });

        // 笔记编辑器标签栏事件委托
        document.getElementById('notesContainer').addEventListener('click', (e) => {
            // 添加标签按钮
            const addBtn = e.target.closest('.btn-add-tag');
            if (addBtn) {
                const tagsBar = addBtn.closest('.note-tags-bar');
                const noteId = tagsBar.dataset.noteId;
                this.eventBus.emit(EventTypes.NOTE.UPDATE.TAG, noteId);
                return;
            }

            // 已有标签点击 - 打开选择弹窗修改
            const tagItem = e.target.closest('.note-tag-item');
            if (tagItem) {
                const tagsBar = e.target.closest('.note-tags-bar');
                const noteId = tagsBar.dataset.noteId;
                this.eventBus.emit(EventTypes.NOTE.UPDATE.TAG, noteId);
                return;
            }
        });

        // 左侧边栏内容容器事件委托（处理所有动态内容的点击事件）
        this.leftSidebar.getContentContainer().addEventListener('click', (e) => {
            // 新建标签按钮
            const addBtn = e.target.closest('.tag-add-btn');
            if (addBtn) {
                e.stopPropagation();
                this.eventBus.emit(EventTypes.TAG.CREATE);
                return;
            }

            // 编辑标签按钮
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                e.stopPropagation();
                const tagItem = editBtn.closest('.tag-main-item');
                if (tagItem) {
                    const tagId = tagItem.dataset.tagId;
                    this.eventBus.emit(EventTypes.TAG.EDIT, tagId);
                }
                return;
            }

            // 删除标签按钮
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                e.stopPropagation();
                const tagItem = deleteBtn.closest('.tag-main-item');
                if (tagItem) {
                    const tagId = tagItem.dataset.tagId;
                    this.eventBus.emit(EventTypes.TAG.DELETE, tagId);
                }
                return;
            }

            // 标签主项点击（筛选该标签下的笔记）
            const tagMainItem = e.target.closest('.tag-main-item');
            if (tagMainItem) {
                // 如果点击的是操作按钮，不处理
                if (e.target.closest('.tag-actions button')) {
                    return;
                }
                const tagId = tagMainItem.dataset.tagId;
                this.eventBus.emit(EventTypes.NOTE.GET.TAG_NOTES, tagId);
                return;
            }

            // 标签下的笔记项点击
            const tagNoteItem = e.target.closest('.tag-note-item');
            if (tagNoteItem) {
                const noteId = tagNoteItem.dataset.noteId;
                this.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId });
                return;
            }

            // 最近笔记项点击
            const recentNoteItem = e.target.closest('.recent-note-item');
            if (recentNoteItem) {
                const noteId = recentNoteItem.dataset.noteId;
                this.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId });
                return;
            }

            // 归档年份标题点击（展开/折叠）
            const archiveYearHeader = e.target.closest('.archive-year-header');
            if (archiveYearHeader) {
                const year = archiveYearHeader.dataset.year;
                // 如果点击的是展开图标，不阻止冒泡
                if (!e.target.closest('.archive-expand-icon')) {
                    this.leftSidebar.toggleArchiveYearExpanded(parseInt(year));
                    // 重新渲染，保持数据不变
                    const currentPanel = this.leftSidebar.getActivePanelId();
                    if (currentPanel === 'archive') {
                        // 数据需要重新获取，NoteController 会处理
                        this.eventBus.emit(EventTypes.SIDEBAR.PANEL_CHANGE, 'archive');
                    }
                }
                return;
            }

            // 归档展开图标点击（展开/折叠）
            const archiveExpandIcon = e.target.closest('.archive-expand-icon');
            if (archiveExpandIcon) {
                const yearHeader = archiveExpandIcon.closest('.archive-year-header');
                const year = yearHeader.dataset.year;
                this.leftSidebar.toggleArchiveYearExpanded(parseInt(year));
                // 重新渲染，保持数据不变
                const currentPanel = this.leftSidebar.getActivePanelId();
                if (currentPanel === 'archive') {
                    this.eventBus.emit(EventTypes.SIDEBAR.PANEL_CHANGE, 'archive');
                }
                return;
            }

            // 归档笔记项点击
            const archiveNoteItem = e.target.closest('.archive-note-item');
            if (archiveNoteItem) {
                const noteId = archiveNoteItem.dataset.noteId;
                this.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId });
                return;
            }
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
     * 更新笔记标签显示
     */
    editor_updateNoteTags(noteId, allTags, noteTagIds) {
        this.editor.updateNoteTags(noteId, allTags, noteTagIds);
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

    // ========== NoteList 代理方法 ==========

    /**
     * 渲染笔记列表
     */
    noteList_renderNotes(notes) {
        this.noteList.renderNotes(notes);
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
     * 获取当前激活的面板 ID
     */
    leftSidebar_getActivePanelId() {
        return this.leftSidebar.getActivePanelId();
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

    /**
     * 切换标签展开状态
     */
    leftSidebar_toggleTagExpanded(tagId) {
        this.leftSidebar.toggleTagExpanded(tagId);
    }

    /**
     * 切换归档年份展开状态
     */
    leftSidebar_toggleArchiveYearExpanded(year) {
        this.leftSidebar.toggleArchiveYearExpanded(year);
    }

    // ========== Modal 代理方法 ==========

    /**
     * 显示输入提示模态框
     */
    modal_prompt(title, defaultValue = '') {
        return this.modal.prompt(title, defaultValue);
    }

    /**
     * 显示确认对话框
     */
    modal_confirm(message) {
        return this.modal.confirm(message);
    }

    /**
     * 显示标签选择模态框
     */
    modal_showTagSelection(allTags, currentTagIds) {
        return this.modal.showTagSelection(allTags, currentTagIds);
    }
}
