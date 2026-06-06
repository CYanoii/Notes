/**
 * UI 管理器
 * 整合管理所有 UI 组件，提供统一的全局 UI 接口
 * 所有 eventBus 事件在此统一绑定
 */
import { Editor } from './components/Editor.js';
import { LeftSidebar } from './components/LeftSidebar.js';
import { EventTypes } from '../core/EventTypes.js';

export class UIManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // 统一创建所有 UI 组件实例
        this.editor = new Editor();
        this.leftSidebar = new LeftSidebar();
        this.leftSidebar.init(); // 显式初始化，Vue 挂载后执行

        this.bindEvents();
    }

    /**
     * 绑定所有事件监听 - 统一在此管理
     */
    bindEvents() {
        // Editor 组件事件回调 - 将编辑器输入事件转发到 eventBus
        this.editor.setCallbacks(
            (noteId, title) => this.eventBus.emit(EventTypes.NOTE.UPDATE.TITLE, noteId, title),
            (noteId, excerpt) => this.eventBus.emit(EventTypes.NOTE.UPDATE.EXCERPT, noteId, excerpt),
            (noteId, content) => this.eventBus.emit(EventTypes.NOTE.UPDATE.CONTENT, noteId, content)
        );

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

        // 左侧边栏面板切换由 Vue useLeftSidebar 管理

        // 左侧边栏折叠状态变化事件
        // 左侧边栏折叠/宽度变化由 Vue useLeftSidebar 管理

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
        this.leftSidebar.getContentContainer().addEventListener('click', (e) => {
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
                // 如果已经点击了操作按钮，上面已经处理，这里不会执行到
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
        if (window.tabBarApi?.createNoteTab) {
            window.tabBarApi.createNoteTab(noteData);
        }
    }

    /**
     * 切换到指定标签页
     */
    tabBar_switchToTab(tabId) {
        if (window.tabBarApi?.switchToTab) {
            window.tabBarApi.switchToTab(tabId);
        }
    }

    /**
     * 关闭指定标签页
     */
    tabBar_closeNoteTab(noteId) {
        if (window.tabBarApi?.closeNoteTab) {
            window.tabBarApi.closeNoteTab(noteId);
        }
    }

    /**
     * 更新标签页标题
     */
    tabBar_updateTabTitle(noteId, newTitle) {
        if (window.tabBarApi?.updateTabTitle) {
            window.tabBarApi.updateTabTitle(noteId, newTitle);
        }
    }

    /**
     * 获取标签页顺序
     */
    tabBar_getTabOrder() {
        if (window.tabBarApi?.getTabOrder) {
            return window.tabBarApi.getTabOrder();
        }
        return [];
    }

    // ========== TagFilter 代理方法 ==========

    /**
     * 渲染标签筛选栏
     */
    tagFilter_render(tags, tagStates) {
        if (window.tagFilterApi?.updateTags) {
            window.tagFilterApi.updateTags(tags, tagStates);
        }
    }

    // ========== NoteList 代理方法 ==========

    /**
     * 渲染笔记列表
     */
    noteList_renderNotes(notes) {
        if (window.noteListApi?.updateNotes) {
            window.noteListApi.updateNotes(notes);
        }
    }

    // ========== Toast 代理方法 ==========

    /**
     * 显示Toast提示
     * @param {string} message 提示内容
     * @param {string} type 提示类型：info/success/error/warning
     */
    toast_show(message, type = 'info') {
        if (window.toastApi?.show) {
            window.toastApi.show(message, type);
        } else {
            console.warn('[Toast] Vue Toast 未加载，消息：', message, type);
        }
    }

    /**
     * 显示确认对话框
     * @param {string} message 确认信息
     * @returns {Promise<boolean>} 用户是否确认
     */
    showConfirm(message) {
        return this.modal_confirm(message);
    }

    // ========== LeftSidebar 代理方法 ==========

    /**
     * 获取当前折叠状态
     */
    leftSidebar_getIsCollapsed() {
        if (window.leftSidebarApi?.getIsCollapsed) {
            return window.leftSidebarApi.getIsCollapsed();
        }
        return this.leftSidebar.getIsCollapsed();
    }

    /**
     * 获取当前激活的面板 ID
     */
    leftSidebar_getActivePanelId() {
        if (window.leftSidebarApi?.getActivePanelId) {
            return window.leftSidebarApi.getActivePanelId();
        }
        return this.leftSidebar.getActivePanelId();
    }

    /**
     * 切换到指定面板
     */
    leftSidebar_switchPanel(panelId) {
        if (window.leftSidebarApi?.switchPanel) {
            window.leftSidebarApi.switchPanel(panelId);
        } else {
            this.leftSidebar.switchPanel(panelId);
        }
    }

    /**
     * 渲染侧边栏面板内容
     */
    leftSidebar_renderPanelContent(panelId, data) {
        this.leftSidebar.renderPanelContent(panelId, data);
    }

    /**
     * 更新搜索结果（不重新渲染输入框）
     */
    leftSidebar_updateSearchResults(results, query) {
        const container = this.leftSidebar.getContentContainer();
        this.leftSidebar.updateSearchResults(container, results, query);
    }

    /**
     * 刷新搜索结果选中状态
     */
    leftSidebar_refreshSearchResultSelection() {
        const container = this.leftSidebar.getContentContainer();
        this.leftSidebar.refreshSearchResultSelection(container);
    }

    /**
     * 清除搜索结果选中状态
     */
    leftSidebar_clearSearchResultSelection() {
        const container = this.leftSidebar.getContentContainer();
        this.leftSidebar.clearSearchResultSelection(container);
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

    /**
     * 设置当前激活的搜索结果
     */
    leftSidebar_setActiveSearchResult(noteId) {
        this.leftSidebar.setActiveSearchResult(noteId);
    }

    /**
     * 折叠侧边栏
     */
    leftSidebar_collapse() {
        if (window.leftSidebarApi?.collapse) {
            window.leftSidebarApi.collapse();
        }
    }

    /**
     * 展开侧边栏
     */
    leftSidebar_expand() {
        if (window.leftSidebarApi?.expand) {
            window.leftSidebarApi.expand();
        }
    }

    /**
     * 设置侧边栏宽度
     */
    leftSidebar_setWidth(width) {
        if (window.leftSidebarApi?.setWidth) {
            window.leftSidebarApi.setWidth(width);
        }
    }

    // ========== Modal 代理方法 ==========

    /**
     * 显示输入提示模态框
     */
    modal_prompt(title, defaultValue = '') {
        if (window.modalApi?.prompt) {
            return window.modalApi.prompt(title, defaultValue)
        }
        console.warn('[Modal] Vue Modal 未加载')
        return Promise.resolve(null)
    }

    /**
     * 显示确认对话框
     */
    modal_confirm(message) {
        if (window.modalApi?.confirm) {
            return window.modalApi.confirm(message)
        }
        console.warn('[Modal] Vue Modal 未加载')
        return Promise.resolve(false)
    }

    /**
     * 显示标签选择模态框
     */
    modal_showTagSelection(allTags, currentTagIds) {
        if (window.modalApi?.showTagSelection) {
            return window.modalApi.showTagSelection(allTags, currentTagIds)
        }
        console.warn('[Modal] Vue Modal 未加载')
        return Promise.resolve(null)
    }

    /**
     * 显示设置浮出窗口
     */
    modal_showSettingsPopover() {
        if (window.modalApi?.showSettingsPopover) {
            window.modalApi.showSettingsPopover()
        } else {
            console.warn('[Modal] Vue Modal 未加载')
        }
    }
}
