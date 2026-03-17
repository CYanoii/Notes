/**
 * 笔记控制器
 * 处理笔记增删改查的业务流程，协调视图层和数据层
 */
import { debounce } from '../utils/helpers.js';

export class NoteController {
    constructor(noteService, uiManager, eventBus) {
        this.noteService = noteService;
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
        // 笔记列表事件
        this.eventBus.on('note:click', (note) => this.openNote(note));
        this.eventBus.on('note:delete', (noteId) => this.deleteNote(noteId));

        // 编辑器事件
        this.eventBus.on('editor:titleChange', (noteId, newTitle) => this.updateNoteTitle(noteId, newTitle));
        this.eventBus.on('editor:contentChange', (noteId, newContent) => this.updateNoteContent(noteId, newContent));

        // UI交互事件（来自App的DOM事件）
        this.eventBus.on('app:createNewNote', () => this.createNewNote());
        this.eventBus.on('app:switchTab', (tabId) => {
            if (tabId === 'search') {
                this.switchToSearch();
            } else {
                this.switchToNote(tabId);
            }
        });
        this.eventBus.on('app:closeNote', (noteId) => this.closeNote(noteId));
        this.eventBus.on('app:search', (query) => {
            // 搜索功能后续实现
            console.log('搜索:', query);
            this.uiManager.toast_show(`搜索功能将在后续版本中完善，搜索关键词：${query}`, 'info');
        });
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
     * 切换到搜索页面
     */
    switchToSearch() {
        this.uiManager.tabBar_switchToTab('search');
        this.uiManager.editor_switchToSearchPage();
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

        // 如果关闭的是当前笔记，切换到搜索页面
        if (this.currentNoteId === noteId) {
            this.switchToSearch();
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
}
