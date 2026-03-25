/**
 * 笔记数据服务
 * 封装所有与 Electron API 的交互，实现数据层与业务层分离
 */
export class NoteService {
    constructor() {
        this.openNotes = new Map(); // 存储已打开的笔记（内存缓存）
        this.currentNoteId = null;  // 当前打开的笔记ID
    }

    /**
     * 获取所有已打开的笔记
     * @returns {Map} 已打开笔记 Map
     */
    getAllOpenNotes() {
        return this.openNotes;
    }

    /**
     * 获取当前笔记 ID
     * @returns {string|number|null} 当前笔记 ID
     */
    getCurrentNoteId() {
        return this.currentNoteId;
    }

    /**
     * 获取指定打开的笔记
     * @param {string|number} noteId 笔记 ID
     * @returns {Object|undefined} 笔记对象
     */
    getOpenNoteById(noteId) {
        return this.openNotes.get(noteId);
    }

    /**
     * 设置当前笔记 ID
     * @param {string|number|null} noteId 笔记 ID
     */
    setCurrentNoteId(noteId) {
        this.currentNoteId = noteId;
    }

    /**
     * 添加打开的笔记到缓存
     * @param {string|number} noteId 笔记 ID
     * @param {Object} noteData 笔记数据
     */
    addOpenNote(noteId, noteData) {
        this.openNotes.set(noteId, noteData);
    }

    /**
     * 从缓存移除关闭的笔记
     * @param {string|number} noteId 笔记 ID
     */
    removeOpenNote(noteId) {
        this.openNotes.delete(noteId);
    }

    /**
     * 获取所有笔记列表
     * @returns {Promise<Array>} 笔记列表
     */
    async getAllNotes() {
        return await window.electronAPI.getAllNotes();
    }

    /**
     * 获取单个笔记详情
     * @param {string|number} noteId 笔记ID
     * @returns {Promise<Object>} 笔记详情
     */
    async getNote(noteId) {
        return await window.electronAPI.getNote(noteId);
    }

    /**
     * 创建新笔记
     * @returns {Promise<Object>} 新创建的笔记
     */
    async createNote() {
        const note = await window.electronAPI.createNote();
        return note;
    }

    /**
     * 更新笔记
     * @param {string|number} noteId 笔记ID
     * @param {Object} noteData 要更新的笔记数据
     * @returns {Promise<Object>} 更新后的笔记
     */
    async updateNote(noteId, noteData) {
        const result = await window.electronAPI.updateNote(noteId, noteData);
        return result;
    }

    /**
     * 删除笔记
     * @param {string|number} noteId 笔记ID
     * @returns {Promise<void>}
     */
    async deleteNote(noteId) {
        await window.electronAPI.deleteNote(noteId);
    }

    /**
     * 搜索笔记
     * @param {string} query 搜索关键词
     * @returns {Promise<Array>} 匹配的笔记列表
     */
    async searchNotes(query) {
        return await window.electronAPI.searchNotes(query);
    }

    /**
     * 获取回收站中的所有笔记
     * @returns {Promise<Array>} 回收站笔记列表
     */
    async getTrashedNotes() {
        return await window.electronAPI.getTrashedNotes();
    }

    /**
     * 将笔记移入回收站
     * @param {string|number} noteId 笔记ID
     * @returns {Promise<void>}
     */
    async moveToTrash(noteId) {
        await window.electronAPI.moveToTrash(noteId);
    }

    /**
     * 从回收站恢复笔记
     * @param {string|number} noteId 笔记ID
     * @returns {Promise<void>}
     */
    async restoreFromTrash(noteId) {
        await window.electronAPI.restoreFromTrash(noteId);
    }

    /**
     * 永久删除笔记
     * @param {string|number} noteId 笔记ID
     * @returns {Promise<void>}
     */
    async deletePermanently(noteId) {
        await window.electronAPI.deletePermanently(noteId);
    }
}
