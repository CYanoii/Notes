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
        this.currentSelectedTagId = null; // 当前选中的标签

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
        this.eventBus.on(EventTypes.NOTE.UPDATE.TAG, (noteId) => this.updateNoteTag(noteId));
        this.eventBus.on(EventTypes.NOTE.GET.TAG_NOTES, (tagId) => this.handleTagClick(tagId));

        // 标签事件
        this.eventBus.on(EventTypes.TAG.CREATE, () => this.createTag());
        this.eventBus.on(EventTypes.TAG.EDIT, (tagId) => this.editTag(tagId));
        this.eventBus.on(EventTypes.TAG.DELETE, (tagId) => this.deleteTag(tagId));        

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
                    await this.refreshTagsList();
                } catch (error) {
                    console.error('加载标签列表失败:', error);
                    this.uiManager.toast_show('加载标签列表失败', 'error');
                    this.uiManager.leftSidebar_renderPanelContent(panelId);
                }
                break;
            case 'folders':
                // TODO: 数据层未实现，等待后续开发
                this.uiManager.leftSidebar_renderPanelContent(panelId);
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
        setTimeout(() => this.refreshNoteTags(noteData.id), 0);
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

    // ===== 标签相关方法 =====

    /**
     * 刷新标签列表
     */
    async refreshTagsList() {
        const tags = await this.tagService.getAllTags();
        const tagCounts = await this.tagService.getTagNoteCounts();
        // 获取每个标签对应的笔记列表
        const tagNotes = {};
        for (const tag of tags) {
            tagNotes[tag.id] = await this.tagService.getNotesByTag(tag.id);
        }
        this.uiManager.leftSidebar_renderPanelContent('tags', { tags, tagCounts, tagNotes });
    }

    /**
     * 处理标签点击 - 仅展开/折叠标签
     */
    async handleTagClick(tagId) {
        // 切换标签展开/折叠状态
        this.uiManager.leftSidebar_toggleTagExpanded(tagId);
        await this.refreshTagsList();
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
            await this.refreshTagsList();
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
            await this.refreshTagsList();
            // 热更新所有已打开笔记的标签显示
            for (const [noteId] of this.notes) {
                this.refreshNoteTags(noteId);
            }
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
                this.loadAllNotes();
                this.currentSelectedTagId = null;
            }

            await this.refreshTagsList();

            // 从所有已打开笔记的内存数据中移除被删除的标签ID，并更新显示
            for (const [noteId, note] of this.notes) {
                if (note.tags && note.tags.includes(tagId)) {
                    note.tags = note.tags.filter(t => t !== tagId);
                }
                this.refreshNoteTags(noteId);
            }

            // 如果当前选中的就是被删除的标签，清空列表
            if (this.currentSelectedTagId === tagId) {
                this.loadAllNotes();
                this.currentSelectedTagId = null;
            }

            this.uiManager.toast_show('标签删除成功', 'success');
        } catch (error) {
            console.error('删除标签失败:', error);
            this.uiManager.toast_show('删除标签失败', 'error');
        }
    }

    // ===== 笔记标签绑定相关方法 =====

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

            const note = this.notes.get(noteId);
            if (!note) {
                this.uiManager.toast_show('笔记不存在', 'error');
                return;
            }

            // 创建标签选择模态框
            const selectedTags = await this.showTagSelectionModal(allTags, note.tags || []);
            if (selectedTags === null) return;

            // 更新笔记标签
            note.tags = selectedTags;
            await this.saveNote(noteId);

            // 更新UI显示
            this.refreshNoteTags(noteId);

            // 如果左侧边栏当前已经显示标签面板，刷新标签列表热更新计数
            // 不会切换面板，只是更新已有面板内容
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
     * 显示标签选择模态框
     */
    async showTagSelectionModal(allTags, currentTagIds) {
        return new Promise(resolve => {
            this.createTagSelectionOverlay(allTags, currentTagIds, resolve);
        });
    }

    /**
     * 创建标签选择弹窗
     */
    createTagSelectionOverlay(allTags, currentTagIds, resolve) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const selected = new Set(currentTagIds);

        overlay.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">选择标签</h3>
                    <button class="modal-close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="tag-select-list">
                        ${allTags.map(tag => {
                            const isSelected = selected.has(tag.id);
                            return `
                                <div class="tag-select-item ${isSelected ? 'selected' : ''}" data-tag-id="${tag.id}">
                                    <div class="tag-select-check"></div>
                                    <span class="tag-select-color" style="background-color: ${tag.color}"></span>
                                    <span class="tag-select-name">${this.escapeHtml(tag.name)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">取消</button>
                    <button class="btn btn-primary modal-confirm">确定</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 绑定事件
        const close = () => {
            overlay.remove();
            resolve(null);
        };

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                close();
            }
        });

        overlay.querySelector('.modal-close-btn').addEventListener('click', close);
        overlay.querySelector('.modal-cancel').addEventListener('click', close);

        // 点击标签项切换选择
        overlay.querySelectorAll('.tag-select-item').forEach(item => {
            item.addEventListener('click', () => {
                const tagId = item.dataset.tagId;
                item.classList.toggle('selected');
                if (selected.has(tagId)) {
                    selected.delete(tagId);
                } else {
                    selected.add(tagId);
                }
            });
        });

        // 确定按钮
        overlay.querySelector('.modal-confirm').addEventListener('click', () => {
            overlay.remove();
            resolve(Array.from(selected));
        });

        // ESC 关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    /**
     * 刷新笔记标签显示
     */
    async refreshNoteTags(noteId) {
        const allTags = await this.tagService.getAllTags();
        const note = this.notes.get(noteId);
        const noteTagIds = note ? (note.tags || []) : [];
        this.uiManager.editor_updateNoteTags(noteId, allTags, noteTagIds);
    }

    /**
     * 处理点击已有标签 - 打开选择弹窗修改
     */
    handleNoteTagClick(noteId) {
        this.updateNoteTag(noteId);
    }

    /**
     * HTML 转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
