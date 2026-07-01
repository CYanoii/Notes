/**
 * 页面-标签协调器
 * 处理页面（笔记/便签）和标签的交叉业务逻辑
 */
export class PageTagCoordinator {
    constructor(noteService, tagService, uiManager) {
        this.noteService = noteService;
        this.tagService = tagService;
        this.uiManager = uiManager;
    }

    /**
     * 处理点击添加标签按钮 - 弹出标签选择弹窗
     * @param {string|number} pageId 页面ID
     * @param {Object} currentPage 当前页面对象（从Service的内存缓存获取）
     */
    async updatePageTag(pageId, currentPage) {
        try {
            const allTags = await this.tagService.getAllTags();
            if (allTags.length === 0) {
                this.uiManager.toast_show('暂无标签，请先创建标签', 'warning');
                return;
            }

            if (!currentPage) {
                this.uiManager.toast_show('页面不存在', 'error');
                return;
            }

            // 调用UI层显示标签选择模态框
            const currentTagIds = Array.isArray(currentPage.tags) ? currentPage.tags : [];
            const selectedTags = await this.uiManager.modal_showTagSelection(allTags, currentTagIds);
            // ModalContainer.handleConfirm 会对结果进行包装 { value, color }，这里进行解包
            const resolvedTags = selectedTags?.value ?? selectedTags;
            if (!resolvedTags || !Array.isArray(resolvedTags)) return;

            // 更新页面标签
            const updatedPage = { ...currentPage, tags: resolvedTags };
            await this.noteService.updateNote(pageId, updatedPage);

            // 更新UI显示
            this.refreshPageTags(pageId, updatedPage);

            // 如果左侧边栏当前已经显示标签面板，刷新标签列表热更新计数
            const currentPanel = this.uiManager.leftSidebar_getActivePanelId();
            if (currentPanel === 'tags') {
                await this.refreshTagsList();
            }

            this.uiManager.toast_show('标签更新成功', 'success');
        } catch (error) {
            console.error('更新页面标签失败:', error);
            this.uiManager.toast_show('更新页面标签失败', 'error');
        }
    }

    /**
     * 刷新页面标签显示
     * @param {string|number} pageId 页面ID
     * @param {Object} page 页面对象（包含tags）
     */
    async refreshPageTags(pageId, page) {
        const allTags = await this.tagService.getAllTags();
        const pageTagIds = page ? (page.tags || []) : [];
        this.uiManager.editor_updateNoteTags(pageId, allTags, pageTagIds);
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
                Array.isArray(note.tags) && note.tags.includes(tag.id)
            );
            tagCounts[tag.id] = tagNotes[tag.id].length;
        }

        this.uiManager.leftSidebar_renderPanelContent('tags', { tags, tagCounts, tagNotes });
    }
}
