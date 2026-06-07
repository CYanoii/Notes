/**
 * UI 管理器
 * 整合管理所有 UI 组件，提供统一的全局 UI 接口
 * 所有 eventBus 事件在此统一绑定
 */
import { EventTypes } from '../core/EventTypes.js';
import { useEditor } from './Editor/useEditor.js';
import { useTabBar } from './TabBar/useTabBar.js';
import { useTagFilter } from './TagFilter/useTagFilter.js';
import { useNoteList } from './NoteList/useNoteList.js';
import { useToast } from './Toast/useToast.js';
import { useModal } from './Modal/useModal.js';
import { useLeftSidebar } from './LeftSidebar/useLeftSidebar.js';

export class UIManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // 直接调用 composables（单例状态，跨所有 Vue 实例共享）
        this.editor = useEditor();
        this.tabBar = useTabBar();
        this.tagFilter = useTagFilter();
        this.noteList = useNoteList();
        this.toast = useToast();
        this.modal = useModal();
        this.leftSidebar = useLeftSidebar();
    }

    /**
     * 绑定所有 DOM 事件（需在 Vue 组件挂载后调用）
     */
    bindAll() {
        this.bindEvents();
    }

    /**
     * 绑定所有事件监听 - 统一在此管理
     */
    bindEvents() {
        // 绑定 DOM 全局事件监听
        // 新建笔记按钮
        document.getElementById('newNoteBtn').addEventListener('click', () => {
            this.eventBus.emit(EventTypes.NOTE.CREATE);
        });

        // 搜索框事件
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.querySelector('.btn-search');

        const updateSearchBtnState = () => {
            const value = searchInput.value.trim();
            if (value) {
                searchBtn.classList.remove('disabled');
                searchBtn.disabled = false;
            } else {
                searchBtn.classList.add('disabled');
                searchBtn.disabled = true;
            }
        };

        // 初始化按钮状态
        updateSearchBtnState();

        searchInput.addEventListener('input', updateSearchBtnState);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                this.eventBus.emit(EventTypes.SEARCH.HOME_SEARCH, searchInput.value.trim());
            }
        });

        searchBtn.addEventListener('click', () => {
            if (!searchBtn.disabled) {
                this.eventBus.emit(EventTypes.SEARCH.HOME_SEARCH, searchInput.value.trim());
            }
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

        // 笔记编辑器标签栏事件委托
        document.getElementById('notesContainer').addEventListener('click', (e) => {
            // 添加标签按钮
            const addBtn = e.target.closest('.btn-add-tag');
            if (addBtn) {
                const editor = addBtn.closest('.note-editor');
                // 如果是回收站只读笔记，不允许操作
                if (editor && editor.classList.contains('read-only')) {
                    return;
                }
                const tagsBar = addBtn.closest('.note-tags-bar');
                const noteId = tagsBar.dataset.noteId;
                this.eventBus.emit(EventTypes.NOTE.UPDATE.TAG, noteId);
                return;
            }

            // 已有标签点击 - 打开选择弹窗修改
            const tagItem = e.target.closest('.note-tag-item');
            if (tagItem) {
                const editor = tagItem.closest('.note-editor');
                // 如果是回收站只读笔记，不允许操作
                if (editor && editor.classList.contains('read-only')) {
                    return;
                }
                const tagsBar = e.target.closest('.note-tags-bar');
                const noteId = tagsBar.dataset.noteId;
                this.eventBus.emit(EventTypes.NOTE.UPDATE.TAG, noteId);
                return;
            }
        });

        // 左侧边栏内容容器事件委托（处理所有动态内容的点击事件）
        document.querySelector('.sidebar-content').addEventListener('click', (e) => {
            // 新建标签按钮（标签面板）
            const addBtn = e.target.closest('.tags-panel .tag-add-btn');
            if (addBtn) {
                e.stopPropagation();
                this.eventBus.emit(EventTypes.TAG.CREATE);
                return;
            }

            // 编辑标签按钮（标签面板）
            const editBtn = e.target.closest('.tag-main-item .edit-btn');
            if (editBtn) {
                e.stopPropagation();
                const tagItem = editBtn.closest('.tag-main-item');
                if (tagItem) {
                    const tagId = tagItem.dataset.tagId;
                    this.eventBus.emit(EventTypes.TAG.EDIT, tagId);
                }
                return;
            }

            // 删除标签按钮（标签面板）
            const deleteBtn = e.target.closest('.tag-main-item .delete-btn');
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
                    const currentPanel = this.leftSidebar.getActivePanelId();
                    if (currentPanel === 'archive') {
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

            // 回收站笔记项操作按钮点击
            const trashActionBtn = e.target.closest('.trash-action-btn');
            if (trashActionBtn) {
                e.stopPropagation();
                e.preventDefault();
                const trashItem = trashActionBtn.closest('.trash-note-item');
                if (trashItem && trashItem.dataset.noteId) {
                    const noteId = trashItem.dataset.noteId;
                    if (trashActionBtn.classList.contains('restore-btn')) {
                        this.eventBus.emit(EventTypes.TRASH.RESTORE, noteId);
                    } else if (trashActionBtn.classList.contains('delete-btn')) {
                        this.eventBus.emit(EventTypes.TRASH.DELETE_PERMANENT, noteId);
                    }
                }
                return;
            }

            // 回收站笔记项点击（打开查看）
            const trashNoteItem = e.target.closest('.trash-note-item');
            if (trashNoteItem) {
                const noteId = trashNoteItem.dataset.noteId;
                this.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId });
                return;
            }

            // 搜索结果项点击
            const searchResultItem = e.target.closest('.search-result-card');
            if (searchResultItem) {
                const noteId = searchResultItem.dataset.noteId;
                this.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId });
                return;
            }
        });
    }

    // ========== Editor 方法 ==========

    editor_createNoteEditor(noteData) {
        this.editor.createNoteEditor(noteData);
    }

    editor_switchToNoteEditor(noteId) {
        this.editor.switchToNoteEditor(noteId);
    }

    editor_switchToHomePage() {
        this.editor.switchToHomePage();
    }

    editor_closeNoteEditor(noteId) {
        this.editor.closeNoteEditor(noteId);
    }

    editor_updateEditorTitle(noteId, newTitle) {
        this.editor.updateEditorTitle(noteId, newTitle);
    }

    editor_updateNoteTags(noteId, allTags, noteTagIds) {
        this.editor.updateNoteTags(noteId, allTags, noteTagIds);
    }

    editor_updateEditorContent(noteId, newContent) {
        this.editor.updateEditorContent(noteId, newContent);
    }

    // ========== TabBar 方法 ==========

    tabBar_createNoteTab(noteData) {
        this.tabBar.createNoteTab(noteData);
    }

    tabBar_switchToTab(tabId) {
        this.tabBar.switchToTab(tabId);
    }

    tabBar_closeNoteTab(noteId) {
        this.tabBar.closeNoteTab(noteId);
    }

    tabBar_updateTabTitle(noteId, newTitle) {
        this.tabBar.updateTabTitle(noteId, newTitle);
    }

    tabBar_getTabOrder() {
        return this.tabBar.getTabOrder();
    }

    // ========== TagFilter 方法 ==========

    tagFilter_render(tags, tagStates) {
        this.tagFilter.updateTags(tags, tagStates);
    }

    // ========== NoteList 方法 ==========

    noteList_renderNotes(notes) {
        this.noteList.updateNotes(notes);
    }

    // ========== Toast 方法 ==========

    toast_show(message, type = 'info') {
        this.toast.show(message, type);
    }

    /**
     * 显示确认对话框
     * @param {string} message 确认信息
     * @returns {Promise<boolean>} 用户是否确认
     */
    showConfirm(message) {
        return this.modal.confirm(message);
    }

    // ========== LeftSidebar 方法 ==========

    leftSidebar_getIsCollapsed() {
        return this.leftSidebar.getIsCollapsed();
    }

    leftSidebar_getActivePanelId() {
        return this.leftSidebar.getActivePanelId();
    }

    leftSidebar_switchPanel(panelId) {
        this.leftSidebar.switchPanel(panelId);
    }

    leftSidebar_renderPanelContent(panelId, data) {
        //面板内容由 LeftSidebar 组件通过 defineExpose 暴露的方法渲染
        // UIManager 通过 window代理访问（临时方案，直到 App.vue 提供实例引用）
        if (window.leftSidebarApi?.renderPanelContent) {
            window.leftSidebarApi.renderPanelContent(panelId, data);
        }
    }

    leftSidebar_updateSearchResults(results, query) {
        if (window.leftSidebarApi?.updateSearchResults) {
            window.leftSidebarApi.updateSearchResults(results, query);
        }
    }

    leftSidebar_refreshSearchResultSelection() {
        if (window.leftSidebarApi?.refreshSearchResultSelection) {
            window.leftSidebarApi.refreshSearchResultSelection();
        }
    }

    leftSidebar_clearSearchResultSelection() {
        if (window.leftSidebarApi?.clearSearchResultSelection) {
            window.leftSidebarApi.clearSearchResultSelection();
        }
    }

    leftSidebar_toggleTagExpanded(tagId) {
        if (window.leftSidebarApi?.toggleTagExpanded) {
            window.leftSidebarApi.toggleTagExpanded(tagId);
        }
    }

    leftSidebar_toggleArchiveYearExpanded(year) {
        if (window.leftSidebarApi?.toggleArchiveYearExpanded) {
            window.leftSidebarApi.toggleArchiveYearExpanded(year);
        }
    }

    leftSidebar_setActiveSearchResult(noteId) {
        if (window.leftSidebarApi?.setActiveSearchResult) {
            window.leftSidebarApi.setActiveSearchResult(noteId);
        }
    }

    leftSidebar_collapse() {
        this.leftSidebar.collapse();
    }

    leftSidebar_expand() {
        this.leftSidebar.expand();
    }

    leftSidebar_setWidth(width) {
        this.leftSidebar.setWidth(width);
    }

    // ========== Modal 方法 ==========

    modal_prompt(title, defaultValue = '') {
        return this.modal.prompt(title, defaultValue);
    }

    modal_confirm(message) {
        return this.modal.confirm(message);
    }

    modal_showTagSelection(allTags, currentTagIds) {
        return this.modal.showTagSelection(allTags, currentTagIds);
    }

    modal_showSettingsPopover() {
        this.modal.showSettingsPopover();
    }
}