/**
 * 编辑器组件
 * 负责笔记编辑器的创建、切换和内容管理
 */
import { escapeHtml } from '../../utils/helpers.js';

export class Editor {
    constructor() {
        this.container = document.getElementById('notesContainer');
        this.searchPage = document.getElementById('tab-search');
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
        const editor = document.createElement('div');
        editor.className = 'note-editor';
        editor.id = `note-${noteData.id}`;
        editor.innerHTML = `
            <input type="text"
                   class="note-title-input"
                   value="${escapeHtml(noteData.title)}"
                   placeholder="输入标题...">
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

        this.container.appendChild(editor);
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

        // 隐藏搜索页面
        this.searchPage.classList.remove('active');
    }

    /**
     * 切换到搜索页面
     */
    switchToSearchPage() {
        // 隐藏所有编辑器
        this.container.querySelectorAll('.note-editor').forEach(editor => {
            editor.classList.remove('active');
        });

        // 显示搜索页面
        this.searchPage.classList.add('active');
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
