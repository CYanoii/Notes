/**
 * 笔记-标签协调器
 * 处理同时涉及笔记和标签的交叉业务逻辑
 */

export class NoteTagCoordinator {
    constructor(noteService, tagService, uiManager) {
        this.noteService = noteService;
        this.tagService = tagService;
        this.uiManager = uiManager;
        this.lastSearchQuery = ''; // 保存最近一次搜索关键词用于热更新
    }

    /**
     * 处理侧边栏搜索输入
     * @param {string} query 搜索关键词
     */
    async handleSidebarSearch(query) {
        this.lastSearchQuery = query.trim();

        if (!this.lastSearchQuery) {
            // 空查询，清空搜索结果（不重新渲染输入框）
            this.uiManager.leftSidebar_updateSearchResults([], '');
            return;
        }

        try {
            // 第一步：从服务端获取标题和内容匹配的结果
            const baseResults = await this.noteService.searchNotes(this.lastSearchQuery);
            const lowerQuery = this.lastSearchQuery.toLowerCase();

            // 第二步：获取所有标签用于标签名称匹配
            const allTags = await this.tagService.getAllTags();
            const tagMap = new Map(allTags.map(tag => [tag.id, tag]));

            // 第三步：补充标签名称匹配
            const allNotes = await this.noteService.getAllNotes();
            const tagMatchingNotes = [];

            for (const note of allNotes) {
                if (note.tags && note.tags.length > 0) {
                    const tagMatches = note.tags.some(tagId => {
                        const tag = tagMap.get(tagId);
                        return tag && tag.name.toLowerCase().includes(lowerQuery);
                    });
                    if (tagMatches && !baseResults.find(r => r.id === note.id)) {
                        const fullNote = await this.noteService.getNote(note.id);
                        tagMatchingNotes.push(fullNote);
                    }
                }
            }

            // 第四步：合并结果并添加完整标签数据（名称+颜色）
            const allResults = [...baseResults, ...tagMatchingNotes];
            for (const note of allResults) {
                if (note.tags && note.tags.length > 0) {
                    note.tagsData = note.tags
                        .map(tagId => tagMap.get(tagId))
                        .filter(tag => tag !== undefined);
                }
            }

            // 按更新时间降序排序
            const sortedResults = allResults.sort((a, b) =>
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );

            // 如果有当前打开的笔记，设置为激活状态
            const currentNoteId = this.noteService.getCurrentNoteId();
            if (currentNoteId) {
                this.uiManager.leftSidebar_setActiveSearchResult(currentNoteId);
            }
            // 只更新搜索结果，不重新渲染整个面板（保留输入框光标位置）
            this.uiManager.leftSidebar_updateSearchResults(sortedResults, this.lastSearchQuery);
        } catch (error) {
            console.error('搜索失败:', error);
            this.uiManager.toast_show('搜索失败', 'error');
            this.uiManager.leftSidebar_updateSearchResults([], this.lastSearchQuery);
        }
    }

    /**
     * 刷新搜索结果（用于热更新，内容修改后）
     */
    async refreshSearchResults() {
        const currentPanel = this.uiManager.leftSidebar_getActivePanelId();
        if (currentPanel === 'search' && this.lastSearchQuery) {
            await this.handleSidebarSearch(this.lastSearchQuery);
        }
    }

    /**
     * 处理点击添加标签按钮 - 弹出标签选择弹窗
     * @param {string|number} noteId 笔记ID
     * @param {Object} currentNote 当前笔记对象（从Controller的内存缓存获取）
     */
    async updateNoteTag(noteId, currentNote) {
        try {
            const allTags = await this.tagService.getAllTags();
            if (allTags.length === 0) {
                this.uiManager.toast_show('暂无标签，请先创建标签', 'warning');
                return;
            }

            if (!currentNote) {
                this.uiManager.toast_show('笔记不存在', 'error');
                return;
            }

            // 调用UI层显示标签选择模态框
            const selectedTags = await this.uiManager.modal_showTagSelection(allTags, currentNote.tags || []);
            if (selectedTags === null) return;

            // 更新笔记标签
            const updatedNote = { ...currentNote, tags: selectedTags };
            await this.noteService.updateNote(noteId, updatedNote);

            // 更新UI显示
            this.refreshNoteTags(noteId, updatedNote);

            // 如果左侧边栏当前已经显示标签面板，刷新标签列表热更新计数
            const currentPanel = this.uiManager.leftSidebar_getActivePanelId();
            if (currentPanel === 'tags') {
                await this.refreshTagsList();
            }

            this.uiManager.toast_show('标签更新成功', 'success');
        } catch (error) {
            console.error('更新笔记标签失败:', error);
            this.uiManager.toast_show('更新笔记标签失败', 'error');
        }
    }

    /**
     * 刷新笔记标签显示
     * @param {string|number} noteId 笔记ID
     * @param {Object} note 笔记对象（包含tags）
     */
    async refreshNoteTags(noteId, note) {
        const allTags = await this.tagService.getAllTags();
        const noteTagIds = note ? (note.tags || []) : [];
        this.uiManager.editor_updateNoteTags(noteId, allTags, noteTagIds);
    }

    /**
     * 从所有笔记（包括已打开和已保存的）中移除被删除的标签ID，并更新显示
     * @param {string|number} tagId 标签ID
     */
    async removeTagFromAllOpenNotes(tagId) {
        // 处理已打开的笔记（内存中 - 从NoteService获取）
        const openNotes = this.noteService.getAllOpenNotes();
        for (const [noteId, note] of openNotes) {
            if (note.tags && note.tags.includes(tagId)) {
                note.tags = note.tags.filter(t => t !== tagId);
            }
            this.refreshNoteTags(noteId, note);
        }

        // 处理所有持久化笔记（从存储中更新）
        try {
            const allNotes = await this.noteService.getAllNotes();
            for (const note of allNotes) {
                if (note.tags && note.tags.includes(tagId)) {
                    const updatedTags = note.tags.filter(t => t !== tagId);
                    await this.noteService.updateNote(note.id, { tags: updatedTags });
                }
            }
        } catch (error) {
            console.error('从持久化笔记移除标签失败:', error);
            this.uiManager.toast_show('从部分笔记移除标签失败', 'error');
        }
    }

    /**
     * 刷新所有已打开笔记的标签显示
     */
    async refreshAllOpenNotesTags() {
        const openNotes = this.noteService.getAllOpenNotes();
        for (const [noteId, note] of openNotes) {
            this.refreshNoteTags(noteId, note);
        }
    }

    /**
     * 处理笔记中标签点击，打开选择弹窗
     */
    handleNoteTagClick(noteId) {
        const currentNote = this.noteService.getOpenNoteById(noteId);
        this.updateNoteTag(noteId, currentNote);
    }

    /**
     * 刷新标签列表（计算每个标签对应的笔记数量）
     */
    async refreshTagsList() {
        const tags = await this.tagService.getAllTags();
        const allNotes = await this.noteService.getAllNotes();

        // 在渲染层计算每个标签对应的笔记数量和笔记列表
        const tagCounts = {};
        const tagNotes = {};
        for (const tag of tags) {
            tagNotes[tag.id] = allNotes.filter(note =>
                note.tags && note.tags.includes(tag.id)
            );
            tagCounts[tag.id] = tagNotes[tag.id].length;
        }

        this.uiManager.leftSidebar_renderPanelContent('tags', { tags, tagCounts, tagNotes });
    }

    /**
     * 刷新首页标签筛选栏
     * @param {Object} tagStates 可选的标签筛选状态映射
     */
    async refreshHomeTagFilter(tagStates = {}) {
        const tags = await this.tagService.getAllTags();
        this.uiManager.tagFilter_render(tags, tagStates);
    }

    /**
     * 刷新首页笔记列表
     */
    async refreshHomeNotes() {
        const notes = await this.noteService.getAllNotes();
        this.uiManager.noteList_renderNotes(notes);
    }

    /**
     * 刷新标签相关首页显示（标签筛选栏和笔记列表）
     * @param {Object} tagStates 可选的标签筛选状态映射，用于保留筛选状态
     */
    async refreshTagRelatedHomeDisplay(tagStates = {}) {
        await this.refreshHomeTagFilter(tagStates);
        await this.refreshHomeNotes();
    }
}
