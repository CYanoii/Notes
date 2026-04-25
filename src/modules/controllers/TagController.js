/**
 * 标签控制器
 * 处理标签增删改查的业务流程，协调视图层和数据层
 */
import { EventTypes } from '../core/EventTypes.js';

export class TagController {
    constructor(tagService, uiManager, eventBus, noteTagCoordinator) {
        this.tagService = tagService;
        this.uiManager = uiManager;
        this.eventBus = eventBus;
        this.noteTagCoordinator = noteTagCoordinator;

        this.currentSelectedTagId = null; // 当前选中的标签

        // 初始化事件监听
        this.initEventListeners();
    }

    /**
     * 初始化事件监听器（通过 EventBus 解耦）
     */
    initEventListeners() {
        // 标签事件
        this.eventBus.on(EventTypes.TAG.CREATE, () => this.createTag());
        this.eventBus.on(EventTypes.TAG.EDIT, (tagId) => this.editTag(tagId));
        this.eventBus.on(EventTypes.TAG.DELETE, (tagId) => this.deleteTag(tagId));
        this.eventBus.on(EventTypes.NOTE.GET.TAG_NOTES, (tagId) => this.handleTagClick(tagId));
    }

    /**
     * 处理标签点击 - 展开/折叠标签并显示对应笔记
     */
    async handleTagClick(tagId) {
        // 切换标签展开/折叠状态
        this.uiManager.leftSidebar_toggleTagExpanded(tagId);
        await this.noteTagCoordinator.refreshTagsList();
    }

    /**
     * 处理创建标签
     */
    async createTag() {
        const name = await this.uiManager.modal_prompt('新建标签');
        if (!name) return;

        if (name.trim().length === 0) {
            this.uiManager.toast_show('标签名称不能为空', 'warning');
            return;
        }

        try {
            await this.tagService.createTag(name.trim());
            await this.noteTagCoordinator.refreshTagsList();
            await this.noteTagCoordinator.refreshTagRelatedHomeDisplay();
            this.uiManager.toast_show('标签创建成功', 'success');
        } catch (error) {
            console.error('创建标签失败:', error);
            this.uiManager.toast_show('创建标签失败', 'error');
        }
    }

    /**
     * 处理编辑标签
     */
    async editTag(tagId) {
        try {
            const tag = await this.tagService.getTag(tagId);
            if (!tag) {
                this.uiManager.toast_show('标签不存在', 'error');
                return;
            }

            const newName = await this.uiManager.modal_prompt('编辑标签', tag.name);
            if (newName === null) return;

            if (newName.trim().length === 0) {
                this.uiManager.toast_show('标签名称不能为空', 'warning');
                return;
            }

            await this.tagService.updateTag(tagId, { name: newName.trim() });
            await this.noteTagCoordinator.refreshTagsList();
            // 热更新所有已打开笔记的标签显示
            await this.noteTagCoordinator.refreshAllOpenNotesTags();
            await this.noteTagCoordinator.refreshTagRelatedHomeDisplay();
            this.uiManager.toast_show('标签更新成功', 'success');
        } catch (error) {
            console.error('编辑标签失败:', error);
            this.uiManager.toast_show('编辑标签失败', 'error');
        }
    }

    /**
     * 处理删除标签
     */
    async deleteTag(tagId) {
        const confirmed = await this.uiManager.modal_confirm('确定要删除这个标签吗？删除后标签会从所有笔记中移除。');
        if (!confirmed) return;

        try {
            await this.tagService.deleteTag(tagId);

            // 如果当前选中的就是被删除的标签，清空列表
            if (this.currentSelectedTagId === tagId) {
                this.currentSelectedTagId = null;
            }

            await this.noteTagCoordinator.refreshTagsList();

            // 从所有已打开笔记的内存数据中移除被删除的标签ID，并更新显示
            await this.noteTagCoordinator.removeTagFromAllOpenNotes(tagId);

            // 如果当前选中的就是被删除的标签，清空列表
            if (this.currentSelectedTagId === tagId) {
                this.currentSelectedTagId = null;
            }

            await this.noteTagCoordinator.refreshTagRelatedHomeDisplay();
            this.uiManager.toast_show('标签删除成功', 'success');
        } catch (error) {
            console.error('删除标签失败:', error);
            this.uiManager.toast_show('删除标签失败', 'error');
        }
    }
}
