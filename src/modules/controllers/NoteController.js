/**
 * 笔记控制器
 * 处理笔记增删改查的业务流程，协调视图层和数据层
 */
import { debounce } from '../utils/helpers.js';
import { EventTypes } from '../core/EventTypes.js';

export class NoteController {
    constructor(noteService, uiManager, eventBus, noteTagCoordinator) {
        this.noteService = noteService;
        this.uiManager = uiManager;
        this.eventBus = eventBus;
        this.noteTagCoordinator = noteTagCoordinator;

        // 已打开笔记缓存由 NoteService 维护

        // 标签筛选状态 {tagId: 'unselected' | 'selected' | 'blocked'}
        this.tagFilterStates = {};

        // 初始化事件监听
        this.initEventListeners();

        // 防抖保存函数，支持可选回调
        this.debouncedSave = debounce((noteId, callback) => {
            this.saveNote(noteId).then(() => {
                if (callback) callback();
            });
        }, 500);
    }

    /**
     * 初始化事件监听器（通过 EventBus 解耦）
     */
    initEventListeners() {
        // 应用生命周期事件
        this.eventBus.on(EventTypes.APP.INIT, () => this.appInit());

        // 笔记事件
        this.eventBus.on(EventTypes.NOTE.OPEN, (note) => this.openNote(note));
        this.eventBus.on(EventTypes.NOTE.CLOSE, (noteId) => this.closeNote(noteId));
        this.eventBus.on(EventTypes.NOTE.CREATE, () => this.createNewNote());
        this.eventBus.on(EventTypes.NOTE.DELETE, (noteId) => this.deleteNote(noteId));
        this.eventBus.on(EventTypes.NOTE.UPDATE.TITLE, (noteId, newTitle) => this.updateNoteTitle(noteId, newTitle));
        this.eventBus.on(EventTypes.NOTE.UPDATE.CONTENT, (noteId, newContent) => this.updateNoteContent(noteId, newContent));

        // 左侧边栏事件
        this.eventBus.on(EventTypes.SIDEBAR.NAV_CLICK, (panelId) => this.handleNavClick(panelId));
        this.eventBus.on(EventTypes.SIDEBAR.PANEL_CHANGE, (panelId) => this.handlePanelChange(panelId));
        this.eventBus.on(EventTypes.SIDEBAR.COLLAPSE_CHANGE, (isCollapsed) => this.handleCollapseChange(isCollapsed));
        this.eventBus.on(EventTypes.SIDEBAR.WIDTH_CHANGE, (width) => this.handleWidthChange(width));

        // 编辑区事件
        this.eventBus.on(EventTypes.EDITOR.TAB_SWITCH, (tabId) => {
            if (tabId === 'home') {
                this.switchToHome();
            } else {
                this.switchToNote(tabId);
            }
        });

        // 搜索事件
        this.eventBus.on(EventTypes.SEARCH.HOME_SEARCH, (query) => {
            this.handleHomeSearch(query);
        });

        // 回收站事件
        this.eventBus.on(EventTypes.TRASH.RESTORE, (noteId) => this.handleRestoreNote(noteId));
        this.eventBus.on(EventTypes.TRASH.DELETE_PERMANENT, (noteId) => this.handlePermanentDelete(noteId));

        // 笔记标签更新事件（原由 Coordinator 监听）（添加异步等待确保标签更新完成后再刷新列表）
        this.eventBus.on(EventTypes.NOTE.UPDATE.TAG, async (noteId) => {
            await this.noteTagCoordinator.updateNoteTag(noteId, this.getNoteById(noteId));
            this.loadAllNotes();
        });
        // 侧边栏搜索事件（原由 Coordinator 监听）
        this.eventBus.on(EventTypes.SEARCH.SIDEBAR_SEARCH_INPUT, (query) => {
            this.noteTagCoordinator.handleSidebarSearch(query);
        });

        // 标签筛选事件
        this.eventBus.on(EventTypes.TAG_FILTER.STATE_CHANGE, (tagId, newState) => {
            this.handleTagFilterStateChange(tagId, newState);
        });
        this.eventBus.on(EventTypes.TAG_FILTER.CLEAR, () => {
            this.handleTagFilterClear();
        });

        // 设置事件
        this.eventBus.on(EventTypes.SETTINGS.OPEN, () => {
            this.uiManager.modal_showSettingsPopover();
        });
    }

    async appInit() {
        // 加载标签筛选栏
        await this.refreshTagFilter();

        // 加载所有笔记
        await this.loadAllNotes();

        // 渲染初始侧边栏面板（默认 search 面板）
        const initialPanel = this.getInitialPanel();
        await this.handlePanelChange(initialPanel);
    }

    /**
     * 处理侧边栏导航项点击
     * @param {string} panelId 点击的面板ID
     */
    handleNavClick(panelId) {
        // 由控制器控制切换面板
        this.uiManager.leftSidebar_switchPanel(panelId);
    }

    /**
     * 处理侧边栏面板切换完成事件
     * 从数据层获取数据，调用视图层渲染面板内容
     * @param {string} panelId 面板ID
     */
    async handlePanelChange(panelId) {
        switch (panelId) {
            case 'search':
                // 搜索面板初始渲染（空结果，显示搜索框）
                if (this.currentNoteId) {
                    this.uiManager.leftSidebar_setActiveSearchResult(this.currentNoteId);
                }
                const lastQuery = this.noteTagCoordinator.lastSearchQuery;
                if (lastQuery) {
                    // 如果有上次搜索关键词，重新搜索获取最新结果
                    this.noteTagCoordinator.handleSidebarSearch(lastQuery);
                }
                this.uiManager.leftSidebar_renderPanelContent(panelId, { results: [], query: this.noteTagCoordinator.lastSearchQuery });
                break;
            case 'tags':
                try {
                    await this.noteTagCoordinator.refreshTagsList();
                } catch (error) {
                    console.error('加载标签列表失败:', error);
                    this.uiManager.toast_show('加载标签列表失败', 'error');
                    this.uiManager.leftSidebar_renderPanelContent(panelId);
                }
                break;
            case 'archive':
                try {
                    // 获取所有笔记并按创建日期分组（年-月）
                    const allNotes = await this.noteService.getAllNotes();
                    // 按创建日期降序排序
                    allNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    // 按年-月分组
                    const grouped = this.groupNotesByDate(allNotes);
                    this.uiManager.leftSidebar_renderPanelContent(panelId, grouped);
                } catch (error) {
                    console.error('加载归档笔记失败:', error);
                    this.uiManager.leftSidebar_renderPanelContent(panelId, { years: [] });
                }
                break;
            case 'recent':
                try {
                    // 获取所有笔记并按更新时间排序取最近 10 条
                    const allNotes = await this.noteService.getAllNotes();
                    const recentNotes = allNotes
                        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                        .slice(0, 10);
                    this.uiManager.leftSidebar_renderPanelContent(panelId, recentNotes);
                } catch (error) {
                    console.error('加载最近笔记失败:', error);
                    this.uiManager.leftSidebar_renderPanelContent(panelId, []);
                }
                break;
            case 'trash':
                try {
                    // 获取回收站笔记
                    const trashedNotes = await this.noteService.getTrashedNotes();
                    // 按移入日期降序排序（最新删除的在前）
                    trashedNotes.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
                    this.uiManager.leftSidebar_renderPanelContent(panelId, trashedNotes);
                } catch (error) {
                    console.error('加载回收站笔记失败:', error);
                    this.uiManager.toast_show('加载回收站失败', 'error');
                    this.uiManager.leftSidebar_renderPanelContent(panelId, []);
                }
                break;
            default:
                this.uiManager.leftSidebar_renderPanelContent(panelId);
        }
    }

    /**
     * 处理侧边栏折叠状态变化
     * @param {boolean} isCollapsed 是否折叠
     * @description 布局调整已通过 CSS .collapsed/.expanded 类处理，无需额外逻辑
     */
    handleCollapseChange(isCollapsed) {
        // CSS 已经自动处理布局变化，此处预留接口供后续扩展
        // console.log('侧边栏折叠状态变化:', isCollapsed);
    }

    /**
     * 处理侧边栏宽度变化
     * @param {number} width 当前宽度
     * @description 布局调整已通过 CSS flex 自动处理，LeftSidebar 已持久化宽度到 localStorage
     */
    handleWidthChange(width) {
        // CSS flex 自动适配主容器宽度，此处预留接口供后续扩展
        // console.log('侧边栏宽度变化:', width);
    }

    /**
     * 处理首页搜索
     * 1. 侧边栏收起时展开并跳转到搜索页
     * 2. 看向其它栏时转到搜索栏
     * 3. 就在搜索栏则重置搜索框文字
     * 4. 将内容填充至搜索页的搜索框
     * @param {string} query 搜索关键词
     */
    handleHomeSearch(query) {
        // 内容为空时直接返回，不进行跳转
        if (!query || query.trim() === '') {
            return;
        }

        const currentPanel = this.uiManager.leftSidebar_getActivePanelId();
        const isCollapsed = this.uiManager.leftSidebar_getIsCollapsed();

        if (isCollapsed) {
            // 收起时：展开并跳转到搜索页
            this.uiManager.leftSidebar_switchPanel('search');
        } else if (currentPanel !== 'search') {
            // 看向其它栏时：跳转到搜索页
            this.uiManager.leftSidebar_switchPanel('search');
        } else {
            // 就在搜索栏：重置搜索框文字（清空搜索结果）
            this.noteTagCoordinator.lastSearchQuery = '';
            this.uiManager.leftSidebar_updateSearchResults([], '');
        }

        // 填充搜索页的搜索框并触发搜索
        setTimeout(() => {
            const searchInput = document.querySelector('.sidebar-search-input');
            if (searchInput) {
                searchInput.value = query;
                // 触发搜索
                this.noteTagCoordinator.handleSidebarSearch(query);
            }
        }, 50);
    }

    /**
     * 加载所有笔记
     */
    async loadAllNotes() {
        try {
            let notes = await this.noteService.getAllNotes();
            // 应用标签筛选
            notes = this.applyTagFilter(notes);
            this.uiManager.noteList_renderNotes(notes);
        } catch (error) {
            console.error('加载所有笔记失败:', error);
            this.uiManager.toast_show('加载笔记失败', 'error');
        }
    }

    /**
     * 根据标签筛选状态过滤笔记
     * @param {Array} notes 原始笔记列表
     * @returns {Array} 过滤后的笔记列表
     */
    applyTagFilter(notes) {
        const selectedTags = [];
        const blockedTags = [];

        // 收集选中和屏蔽的标签
        for (const [tagId, state] of Object.entries(this.tagFilterStates)) {
            if (state === 'selected') {
                selectedTags.push(tagId);
            } else if (state === 'blocked') {
                blockedTags.push(tagId);
            }
        }

        // 如果没有筛选条件，返回所有笔记
        if (selectedTags.length === 0 && blockedTags.length === 0) {
            return notes;
        }

        return notes.filter(note => {
            const noteTags = note.tags || [];

            // 检查是否包含所有选中的标签（AND 逻辑）
            const hasAllSelected = selectedTags.every(tagId => noteTags.includes(tagId));

            // 检查是否不包含任何屏蔽的标签
            const hasNoBlocked = !blockedTags.some(tagId => noteTags.includes(tagId));

            return hasAllSelected && hasNoBlocked;
        });
    }

    /**
     * 刷新标签筛选栏显示
     */
    async refreshTagFilter() {
        try {
            const tags = await this.noteTagCoordinator.tagService.getAllTags();
            // 清理已删除标签的筛选状态
            const validTagIds = new Set(tags.map(t => t.id));
            for (const tagId of Object.keys(this.tagFilterStates)) {
                if (!validTagIds.has(tagId)) {
                    delete this.tagFilterStates[tagId];
                }
            }
            this.uiManager.tagFilter_render(tags, this.tagFilterStates);
        } catch (error) {
            console.error('刷新标签筛选栏失败:', error);
        }
    }

    /**
     * 处理标签筛选状态变化
     * @param {string} tagId 标签ID
     * @param {string} newState 新状态
     */
    async handleTagFilterStateChange(tagId, newState) {
        if (newState === 'unselected') {
            delete this.tagFilterStates[tagId];
        } else {
            this.tagFilterStates[tagId] = newState;
        }
        await this.refreshTagFilter();
        await this.loadAllNotes();
    }

    /**
     * 处理清除标签筛选
     */
    async handleTagFilterClear() {
        this.tagFilterStates = {};
        await this.refreshTagFilter();
        await this.loadAllNotes();
    }

    /**
     * 创建新笔记
     */
    async createNewNote() {
        try {
            const noteData = await this.noteService.createNote();
            this.addNoteToApp(noteData);
        } catch (error) {
            console.error('创建笔记失败:', error);
            this.uiManager.toast_show('创建笔记失败', 'error');
        }
    }

    /**
     * 打开笔记
     * @param {Object} noteData 笔记数据
     */
    async openNote(noteData) {
        // 如果笔记已经打开，直接切换到它
        if (this.noteService.getOpenNoteById(noteData.id)) {
            this.switchToNote(noteData.id);
            return;
        }

        try {
            // 加载完整的笔记内容（包含content）
            const fullNote = await this.noteService.getNote(noteData.id);
            this.addNoteToApp(fullNote);
        } catch (error) {
            console.error('打开笔记失败:', error);
            this.uiManager.toast_show('打开笔记失败', 'error');
        }
    }

    /**
     * 将笔记添加到应用中
     * @param {Object} noteData 笔记数据
     */
    addNoteToApp(noteData) {
        this.noteService.addOpenNote(noteData.id, noteData);
        this.uiManager.tabBar_createNoteTab(noteData);
        this.uiManager.editor_createNoteEditor(noteData);
        this.switchToNote(noteData.id);
        this.loadAllNotes(); // 刷新列表
        // 刷新标签显示
        setTimeout(() => this.noteTagCoordinator.refreshNoteTags(noteData.id, noteData), 0);
    }

    /**
     * 切换到指定笔记
     * @param {string|number} noteId 笔记ID
     */
    switchToNote(noteId) {
        this.uiManager.tabBar_switchToTab(noteId);
        this.uiManager.editor_switchToNoteEditor(noteId);
        this.noteService.setCurrentNoteId(noteId);

        // 更新侧边栏搜索结果选中状态
        this.uiManager.leftSidebar_setActiveSearchResult(noteId);
        this.uiManager.leftSidebar_refreshSearchResultSelection();
    }

    /**
     * 切换到首页
     */
    switchToHome() {
        this.uiManager.tabBar_switchToTab('home');
        this.uiManager.editor_switchToHomePage();
        this.noteService.setCurrentNoteId(null);

        // 清除搜索结果选中状态
        this.uiManager.leftSidebar_clearSearchResultSelection();
    }

    /**
     * 关闭笔记
     * @param {string|number} noteId 笔记ID
     */
    closeNote(noteId) {
        // 从Map中移除
        this.noteService.removeOpenNote(noteId);

        // 移除标签页和编辑器
        this.uiManager.tabBar_closeNoteTab(noteId);
        this.uiManager.editor_closeNoteEditor(noteId);

        // 如果关闭的是当前笔记，切换到首页
        if (this.noteService.getCurrentNoteId() === noteId) {
            this.switchToHome();
        }

        this.eventBus.emit('note:closed', noteId);
    }

    /**
     * 更新笔记标题
     * @param {string|number} noteId 笔记ID
     * @param {string} newTitle 新标题
     */
    updateNoteTitle(noteId, newTitle) {
        const note = this.noteService.getOpenNoteById(noteId);
        if (note) {
            note.title = newTitle;
            this.uiManager.tabBar_updateTabTitle(noteId, newTitle);
            this.uiManager.editor_updateEditorTitle(noteId, newTitle);
            // 保存完成后刷新搜索结果
            this.debouncedSave(noteId, () => {
                // 热更新：如果在搜索面板，刷新搜索结果
                this.noteTagCoordinator.refreshSearchResults();
            });
        }
    }

    /**
     * 更新笔记内容
     * @param {string|number} noteId 笔记ID
     * @param {string} newContent 新内容
     */
    updateNoteContent(noteId, newContent) {
        const note = this.noteService.getOpenNoteById(noteId);
        if (note) {
            note.content = newContent;
            // 保存完成后刷新搜索结果
            this.debouncedSave(noteId, () => {
                // 热更新：如果在搜索面板，刷新搜索结果
                this.noteTagCoordinator.refreshSearchResults();
            });
        }
    }

    /**
     * 保存笔记
     * @param {string|number} noteId 笔记ID
     */
    async saveNote(noteId) {
        const note = this.noteService.getOpenNoteById(noteId);
        if (note) {
            try {
                await this.noteService.updateNote(note.id, note);
                this.loadAllNotes(); // 刷新列表更新修改时间
            } catch (error) {
                console.error('保存笔记失败:', error);
                this.uiManager.toast_show('保存失败', 'error');
            }
        }
    }

    /**
     * 删除笔记（移入回收站）
     * @param {string|number} noteId 笔记ID
     */
    async deleteNote(noteId) {
        try {
            await this.noteService.deleteNote(noteId);

            // 如果笔记当前打开，先关闭它
            if (this.noteService.getOpenNoteById(noteId)) {
                this.closeNote(noteId);
            }

            // 刷新笔记列表
            await this.loadAllNotes();
            // 如果当前在回收站面板，刷新回收站内容
            const currentPanel = this.uiManager.leftSidebar_getActivePanelId();
            if (currentPanel === 'trash') {
                await this.handlePanelChange('trash');
            }
            this.uiManager.toast_show('已移入回收站', 'success');
        } catch (error) {
            console.error('移入回收站失败:', error);
            this.uiManager.toast_show('移入回收站失败', 'error');
        }
    }

    /**
     * 获取初始激活面板 ID
     * 用于应用启动时渲染初始面板内容
     */
    getInitialPanel() {
        return this.uiManager.leftSidebar_getActivePanelId();
    }

    // ===== 供协调器使用的辅助方法 =====

    /**
     * 根据ID获取笔记（供事件处理使用）
     * @param {string|number} noteId 笔记ID
     */
    getNoteById(noteId) {
        return this.noteService.getOpenNoteById(noteId);
    }

    /**
     * 获取所有打开的笔记 Map（供事件处理使用）
     */
    getAllOpenNotes() {
        return this.noteService.getAllOpenNotes();
    }


    /**
     * 按创建日期对笔记进行分组（年 -> 月）
     * @param {Array} notes 笔记列表
     * @returns {Object} 分组结果 { years: [{ year, months: [{ month, notes }] }
     */
    groupNotesByDate(notes) {
        const yearMap = new Map();

        notes.forEach(note => {
            const date = new Date(note.createdAt);
            const year = date.getFullYear();
            const month = date.getMonth() + 1; // 1-12

            // 按年分组
            if (!yearMap.has(year)) {
                yearMap.set(year, new Map());
            }
            const monthMap = yearMap.get(year);

            // 按月分组
            if (!monthMap.has(month)) {
                monthMap.set(month, []);
            }
            monthMap.get(month).push(note);
        });

        // 转换为数组并排序（降序，最新年份在前）
        const years = Array.from(yearMap.entries())
            .sort(([yearA], [yearB]) => yearB - yearA)
            .map(([year, monthMap]) => {
                const months = Array.from(monthMap.entries())
                    .sort(([monthA], [monthB]) => monthB - monthA)
                    .map(([month, notes]) => ({ month, notes }));
                // 计算该年份总笔记数
                const totalCount = months.reduce((sum, m) => sum + m.notes.length, 0);
                return { year, months, totalCount };
            });

        return { years };
    }

    /**
     * 从回收站恢复笔记
     * @param {string|number} noteId 笔记ID
     */
    async handleRestoreNote(noteId) {
        try {
            await this.noteService.restoreFromTrash(noteId);

            // 如果笔记当前打开，关闭它重新加载以恢复编辑
            if (this.noteService.getOpenNoteById(noteId)) {
                this.closeNote(noteId);
            }

            // 刷新笔记列表和回收站
            await this.loadAllNotes();
            // 如果当前在回收站面板，刷新回收站内容
            const currentPanel = this.uiManager.leftSidebar_getActivePanelId();
            if (currentPanel === 'trash') {
                await this.handlePanelChange('trash');
            }

            this.uiManager.toast_show('恢复成功', 'success');
        } catch (error) {
            console.error('恢复笔记失败:', error);
            this.uiManager.toast_show('恢复失败', 'error');
        }
    }

    /**
     * 永久删除笔记
     * @param {string|number} noteId 笔记ID
     */
    async handlePermanentDelete(noteId) {
        // 输出测试提示验证代码
        console.log('永久删除笔记:', noteId);

        const confirmed = await this.uiManager.showConfirm('确定要永久删除这篇笔记吗？删除后无法恢复。');
        if (!confirmed) return;

        try {
            await this.noteService.deletePermanently(noteId);

            // 如果笔记当前打开，先关闭它
            if (this.noteService.getOpenNoteById(noteId)) {
                this.closeNote(noteId);
            }

            // 刷新回收站面板
            const currentPanel = this.uiManager.leftSidebar_getActivePanelId();
            if (currentPanel === 'trash') {
                await this.handlePanelChange('trash');
            }

            this.uiManager.toast_show('已永久删除', 'success');
        } catch (error) {
            console.error('永久删除失败:', error);
            this.uiManager.toast_show('永久删除失败', 'error');
        }
    }

}
