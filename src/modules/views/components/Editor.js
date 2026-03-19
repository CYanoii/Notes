/**
 * 编辑器组件
 * 负责笔记编辑器的创建、切换和内容管理
 */
import { escapeHtml } from '../../utils/helpers.js';

export class Editor {
    constructor() {
        this.container = document.getElementById('notesContainer');
        this.homePage = document.getElementById('tab-home');
        this.onTitleChange = null;
        this.onContentChange = null;
    }

    /**
     * 设置事件回调
     * @param {Function} onTitleChange 标题变化回调
     * @param {Function} onContentChange 内容变化回调
     */
    setCallbacks(onTitleChange, onContentChange) {
        this.onTitleChange = onTitleChange;
        this.onContentChange = onContentChange;
    }

    /**
     * 创建笔记编辑器
     * @param {Object} noteData 笔记数据
     */
    createNoteEditor(noteData) {
        const noteTags = noteData.tags || [];

        const editor = document.createElement('div');
        editor.className = 'note-editor';
        editor.id = `note-${noteData.id}`;
        const hasTags = noteTags && noteTags.length > 0;
        editor.innerHTML = `
            <input type="text"
                   class="note-title-input"
                   value="${escapeHtml(noteData.title)}"
                   placeholder="输入标题...">
            <div class="note-tags-bar" data-note-id="${noteData.id}">
                ${!hasTags ? `<button class="btn-add-tag"><i class="fas fa-plus"></i> 添加标签</button>` : ''}
                <div class="note-tags-list">
                    ${this.renderNoteTags(noteTags)}
                </div>
            </div>
            <textarea class="note-content-textarea"
                      placeholder="开始记录你的想法...">${escapeHtml(noteData.content)}</textarea>
        `;

        // 设置输入事件
        const titleInput = editor.querySelector('.note-title-input');
        const contentTextarea = editor.querySelector('.note-content-textarea');

        titleInput.addEventListener('input', () => {
            if (this.onTitleChange) {
                this.onTitleChange(noteData.id, titleInput.value);
            }
        });

        contentTextarea.addEventListener('input', () => {
            if (this.onContentChange) {
                this.onContentChange(noteData.id, contentTextarea.value);
            }
        });

        // 标签点击事件会在外部委托绑定
        this.container.appendChild(editor);
    }

    /**
     * 渲染笔记标签列表
     */
    renderNoteTags(tagIds) {
        if (!tagIds || tagIds.length === 0) {
            return '';
        }
        // 这里只渲染占位，实际标签信息由控制器填充
        return tagIds.map(tagId => `
            <span class="note-tag-item" data-tag-id="${tagId}">
                <span class="note-tag-color" data-tag-id="${tagId}"></span>
                <span class="note-tag-name" data-tag-id="${tagId}"></span>
            </span>
        `).join('');
    }

    /**
     * 更新笔记标签显示
     */
    updateNoteTags(noteId, allTags, noteTagIds) {
        const barContainer = document.querySelector(`#note-${noteId} .note-tags-bar`);
        if (!barContainer) return;

        // 检查是否真的没有标签
        const hasNoTags = !noteTagIds || (Array.isArray(noteTagIds) && noteTagIds.length === 0);

        if (hasNoTags) {
            // 没有标签，只显示添加按钮
            barContainer.innerHTML = `
                <button class="btn-add-tag">
                    <i class="fas fa-plus"></i> 添加标签
                </button>
                <div class="note-tags-list"></div>
            `;
        } else {
            // 有标签，只显示标签列表（没有添加按钮）
            barContainer.innerHTML = `
                <div class="note-tags-list">
                    ${noteTagIds
                        .map(tagId => {
                            const tag = allTags.find(t => t.id === tagId);
                            if (!tag) return '';
                            return `
                                <span class="note-tag-item" data-tag-id="${tagId}">
                                    <span class="note-tag-color" style="background-color: ${tag.color}" data-tag-id="${tagId}"></span>
                                    <span class="note-tag-name" data-tag-id="${tagId}">${escapeHtml(tag.name)}</span>
                                </span>
                            `;
                        })
                        .filter(Boolean)
                        .join('')}
                </div>
            `;
        }
    }


    /**
     * 切换到指定笔记编辑器
     * @param {string|number} noteId 笔记ID
     */
    switchToNoteEditor(noteId) {
        // 隐藏所有编辑器
        this.container.querySelectorAll('.note-editor').forEach(editor => {
            editor.classList.remove('active');
            if (editor.id === `note-${noteId}`) {
                editor.classList.add('active');
            }
        });

        // 隐藏首页
        this.homePage.classList.remove('active');
    }

    /**
     * 切换到首页
     */
    switchToHomePage() {
        // 隐藏所有编辑器
        this.container.querySelectorAll('.note-editor').forEach(editor => {
            editor.classList.remove('active');
        });

        // 显示首页
        this.homePage.classList.add('active');
    }

    /**
     * 关闭笔记编辑器
     * @param {string|number} noteId 笔记ID
     */
    closeNoteEditor(noteId) {
        const editor = document.getElementById(`note-${noteId}`);
        if (editor) {
            editor.remove();
        }
    }

    /**
     * 更新编辑器标题
     * @param {string|number} noteId 笔记ID
     * @param {string} newTitle 新标题
     */
    updateEditorTitle(noteId, newTitle) {
        const titleInput = document.querySelector(`#note-${noteId} .note-title-input`);
        if (titleInput && titleInput.value !== newTitle) {
            titleInput.value = newTitle;
        }
    }

    /**
     * 更新编辑器内容
     * @param {string|number} noteId 笔记ID
     * @param {string} newContent 新内容
     */
    updateEditorContent(noteId, newContent) {
        const contentTextarea = document.querySelector(`#note-${noteId} .note-content-textarea`);
        if (contentTextarea && contentTextarea.value !== newContent) {
            contentTextarea.value = newContent;
        }
    }
}
