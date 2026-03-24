/**
 * 笔记控制器
 * 处理笔记增删改查的业务流程，协调视图层和数据层
 */
import { debounce } from '../utils/helpers.js';
import { EventTypes } from '../core/EventTypes.js';

export class NoteController {
    constructor(noteService, tagService, uiManager, eventBus) {
        this.noteService = noteService;
        this.tagService = tagService;
        this.uiManager = uiManager;
        this.eventBus = eventBus;

        this.notes = new Map(); // 存储打开的笔记
        this.currentNoteId = null;

        // 初始化事件监听
        this.initEventListeners();

        // 防抖保存函数
        this.debouncedSave = debounce((noteId) => this.saveNote(noteId), 500);
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
            // 搜索功能后续实现
            console.log('搜索:', query);
            this.uiManager.toast_show(`搜索功能将在后续版本中完善，搜索关键词：${query}`, 'info');
        });
    }

    async appInit() {
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
                // 搜索面板不需要额外数据
                this.uiManager.leftSidebar_renderPanelContent(panelId);
                break;
            case 'tags':
                try {
                    await this.tagController.refreshTagsList();
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
     * 加载所有笔记
     */
    async loadAllNotes() {
        try {
            const notes = await this.noteService.getAllNotes();
            this.uiManager.noteList_renderNotes(notes);
        } catch (error) {
            console.error('加载所有笔记失败:', error);
            this.uiManager.toast_show('加载笔记失败', 'error');
        }
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
        if (this.notes.has(noteData.id)) {
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
        this.notes.set(noteData.id, noteData);
        this.uiManager.tabBar_createNoteTab(noteData);
        this.uiManager.editor_createNoteEditor(noteData);
        this.switchToNote(noteData.id);
        this.loadAllNotes(); // 刷新列表
        // 刷新标签显示
        setTimeout(() => this.noteTagCoordinator.refreshNoteTags(noteData.id), 0);
    }

    /**
     * 切换到指定笔记
     * @param {string|number} noteId 笔记ID
     */
    switchToNote(noteId) {
        this.uiManager.tabBar_switchToTab(noteId);
        this.uiManager.editor_switchToNoteEditor(noteId);
        this.currentNoteId = noteId;
    }

    /**
     * 切换到首页
     */
    switchToHome() {
        this.uiManager.tabBar_switchToTab('home');
        this.uiManager.editor_switchToHomePage();
        this.currentNoteId = null;
    }

    /**
     * 关闭笔记
     * @param {string|number} noteId 笔记ID
     */
    closeNote(noteId) {
        // 从Map中移除
        this.notes.delete(noteId);

        // 移除标签页和编辑器
        this.uiManager.tabBar_closeNoteTab(noteId);
        this.uiManager.editor_closeNoteEditor(noteId);

        // 如果关闭的是当前笔记，切换到首页
        if (this.currentNoteId === noteId) {
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
        const note = this.notes.get(noteId);
        if (note) {
            note.title = newTitle;
            this.uiManager.tabBar_updateTabTitle(noteId, newTitle);
            this.uiManager.editor_updateEditorTitle(noteId, newTitle);
            this.debouncedSave(noteId);
        }
    }

    /**
     * 更新笔记内容
     * @param {string|number} noteId 笔记ID
     * @param {string} newContent 新内容
     */
    updateNoteContent(noteId, newContent) {
        const note = this.notes.get(noteId);
        if (note) {
            note.content = newContent;
            this.debouncedSave(noteId);
        }
    }

    /**
     * 保存笔记
     * @param {string|number} noteId 笔记ID
     */
    async saveNote(noteId) {
        const note = this.notes.get(noteId);
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
     * 删除笔记
     * @param {string|number} noteId 笔记ID
     */
    async deleteNote(noteId) {
        const confirmed = await this.uiManager.showConfirm('确定要删除这篇笔记吗？此操作不可恢复。');
        if (!confirmed) return;

        try {
            await this.noteService.deleteNote(noteId);

            // 如果笔记当前打开，先关闭它
            if (this.notes.has(noteId)) {
                this.closeNote(noteId);
            }

            // 刷新笔记列表
            await this.loadAllNotes();
            this.uiManager.toast_show('笔记删除成功', 'success');
        } catch (error) {
            console.error('删除笔记失败:', error);
            this.uiManager.toast_show('删除笔记失败', 'error');
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
     * 根据ID获取笔记（供协调器使用）
     * @param {string|number} noteId 笔记ID
     */
    getNoteById(noteId) {
        return this.notes.get(noteId);
    }

    /**
     * 获取所有打开的笔记 Map（供协调器使用）
     */
    getAllOpenNotes() {
        return this.notes;
    }

    /**
     * 设置 TagController 引用（供依赖注入使用）
     */
    setTagController(tagController) {
        this.tagController = tagController;
    }

    /**
     * 设置 NoteTagCoordinator 引用（供依赖注入使用）
     */
    setNoteTagCoordinator(noteTagCoordinator) {
        this.noteTagCoordinator = noteTagCoordinator;
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
}
