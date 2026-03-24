/**
 * 笔记-标签协调器
 * 处理同时涉及笔记和标签的交叉业务逻辑
 */
import { EventTypes } from '../core/EventTypes.js';

export class NoteTagCoordinator {
    constructor(noteService, tagService, uiManager, eventBus, noteController, tagController) {
        this.noteService = noteService;
        this.tagService = tagService;
        this.uiManager = uiManager;
        this.eventBus = eventBus;
        this.noteController = noteController;
        this.tagController = tagController;

        // 初始化事件监听
        this.initEventListeners();
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 笔记获取标签对应笔记事件（标签点击）
        this.eventBus.on(EventTypes.NOTE.GET.TAG_NOTES, (tagId) => this.tagController.handleTagClick(tagId));
        // 笔记更新标签事件
        this.eventBus.on(EventTypes.NOTE.UPDATE.TAG, (noteId) => this.updateNoteTag(noteId));
    }

    /**
     * 处理点击添加标签按钮 - 弹出标签选择弹窗
     */
    async updateNoteTag(noteId) {
        try {
            const allTags = await this.tagService.getAllTags();
            if (allTags.length === 0) {
                this.uiManager.toast_show('暂无标签，请先创建标签', 'warning');
                return;
            }

            const note = this.noteController.getNoteById(noteId);
            if (!note) {
                this.uiManager.toast_show('笔记不存在', 'error');
                return;
            }

            // 调用UI层显示标签选择模态框
            const selectedTags = await this.uiManager.modal_showTagSelection(allTags, note.tags || []);
            if (selectedTags === null) return;

            // 更新笔记标签
            note.tags = selectedTags;
            await this.noteController.saveNote(noteId);

            // 更新UI显示
            this.refreshNoteTags(noteId);

            // 如果左侧边栏当前已经显示标签面板，刷新标签列表热更新计数
            const currentPanel = this.uiManager.leftSidebar_getActivePanelId();
            if (currentPanel === 'tags') {
                await this.tagController.refreshTagsList();
            }

            this.uiManager.toast_show('标签更新成功', 'success');
        } catch (error) {
            console.error('更新笔记标签失败:', error);
            this.uiManager.toast_show('更新笔记标签失败', 'error');
        }
    }

    /**
     * 刷新笔记标签显示
     */
    async refreshNoteTags(noteId) {
        const allTags = await this.tagService.getAllTags();
        const note = this.noteController.getNoteById(noteId);
        const noteTagIds = note ? (note.tags || []) : [];
        this.uiManager.editor_updateNoteTags(noteId, allTags, noteTagIds);
    }

    /**
     * 从所有已打开笔记中移除被删除的标签ID，并更新显示
     */
    async removeTagFromAllOpenNotes(tagId) {
        const openNotes = this.noteController.getAllOpenNotes();
        for (const [noteId, note] of openNotes) {
            if (note.tags && note.tags.includes(tagId)) {
                note.tags = note.tags.filter(t => t !== tagId);
            }
            this.refreshNoteTags(noteId);
        }
    }

    /**
     * 刷新所有已打开笔记的标签显示
     */
    async refreshAllOpenNotesTags() {
        const openNotes = this.noteController.getAllOpenNotes();
        for (const [noteId] of openNotes) {
            this.refreshNoteTags(noteId);
        }
    }

    /**
     * 处理笔记中标签点击，打开选择弹窗
     */
    handleNoteTagClick(noteId) {
        this.updateNoteTag(noteId);
    }
}
