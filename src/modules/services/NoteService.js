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
        const notes = await window.electronAPI.getAllNotes();
        return notes.map(n => this.normalizeNote(n));
    }

    /**
     * 获取单个笔记详情
     * @param {string|number} noteId 笔记ID
     * @returns {Promise<Object>} 笔记详情
     */
    async getNote(noteId) {
        const note = await window.electronAPI.getNote(noteId);
        return note ? this.normalizeNote(note) : null;
    }

    /**
     * 创建新笔记
     * @param {string} pageType 页面类型 ('note' | 'sticky')
     * @returns {Promise<Object>} 新创建的笔记
     */
    async createNote(pageType = 'note') {
        const note = await window.electronAPI.createNote(pageType);
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
        // 更新内存缓存：如果 result 不包含 content，保留内存中已有的完整笔记
        if (this.openNotes.has(noteId)) {
            const existingNote = this.openNotes.get(noteId);
            if (result.content) {
                this.openNotes.set(noteId, result);
            } else {
                // API 返回不完整，保留现有 content
                this.openNotes.set(noteId, { ...result, content: existingNote.content });
            }
        }
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
        const notes = await window.electronAPI.getTrashedNotes();
        return notes.map(n => this.normalizeNote(n));
    }

    /**
     * 规范化笔记数据，为缺失的 pageType 字段补充默认值
     * @param {Object} note 笔记对象
     * @returns {Object} 规范化后的笔记对象
     */
    normalizeNote(note) {
        return {
            ...note,
            pageType: note.pageType || 'note'
        };
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

    /**
     * 从笔记内容中解析所有引用（wiki links）
     * @param {string} content 笔记内容
     * @returns {Array<{id: string, alias: string|null}>} 引用列表
     */
    parseReferences(content) {
        if (!content) return [];
        const references = [];
        const regex = /\[\[(\d+)(?:\|([^\]]+))?\]\]/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            references.push({
                id: match[1].trim(),
                alias: match[2] ? match[2].trim() : null
            });
        }
        return references;
    }

    /**
     * 根据引用ID列表获取引用笔记的详细信息
     * @param {Array<{id: string, alias: string|null}>} references 引用列表
     * @returns {Promise<Array>} 带有完整信息的引用列表
     */
    async getReferencesDetails(references) {
        if (!references || references.length === 0) return [];
        const result = [];
        for (const ref of references) {
            try {
                const note = await window.electronAPI.getNote(ref.id);
                if (note) {
                    result.push({
                        id: ref.id,
                        alias: ref.alias,
                        title: note.title || '无标题笔记',
                        excerpt: note.excerpt || ''
                    });
                }
            } catch (e) {
                // 引用目标不存在仍保留显示
                result.push({
                    id: ref.id,
                    alias: ref.alias,
                    title: ref.alias || `笔记 ${ref.id}`,
                    excerpt: '',
                    missing: true
                });
            }
        }
        return result;
    }
}
