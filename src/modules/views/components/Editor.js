/**
 * 编辑器组件
 * 负责笔记编辑器的创建、切换和内容管理
 * 使用 Vditor 提供 Markdown 编辑支持
 */
import { escapeHtml } from '../../utils/helpers.js';

export class Editor {
    constructor() {
        this.container = document.getElementById('notesContainer');
        this.homePage = document.getElementById('tab-home');
        this.onTitleChange = null;
        this.onExcerptChange = null;
        this.onContentChange = null;
        this.vditors = new Map(); // 存储每个笔记的 Vditor 实例
    }

    /**
     * 设置事件回调
     * @param {Function} onTitleChange 标题变化回调
     * @param {Function} onExcerptChange 摘要变化回调
     * @param {Function} onContentChange 内容变化回调
     */
    setCallbacks(onTitleChange, onExcerptChange, onContentChange) {
        this.onTitleChange = onTitleChange;
        this.onExcerptChange = onExcerptChange;
        this.onContentChange = onContentChange;
    }

    /**
     * 渲染 Markdown 为 HTML
     * @param {string} content Markdown 内容
     * @returns {string} HTML 字符串
     */
    renderMarkdown(content) {
        if (!content) return '';
        if (typeof window.marked !== 'undefined') {
            return window.marked.parse(content);
        }
        // Fallback: 简单转义 HTML
        return escapeHtml(content);
    }

    /**
     * 创建笔记编辑器
     * @param {Object} noteData 笔记数据
     */
    createNoteEditor(noteData) {
        const noteTags = noteData.tags || [];
        const isTrashed = noteData.status === 'trashed';
        const hasTags = noteTags && noteTags.length > 0;

        const editor = document.createElement('div');
        editor.className = `note-editor ${isTrashed ? 'read-only' : ''}`;
        editor.id = `note-${noteData.id}`;

        // 只读模式属性
        const titleDisabled = isTrashed ? 'disabled' : '';
        const showAddTagBtn = !isTrashed && !hasTags;

        editor.innerHTML = `
            <input type="text"
                   class="note-title-input"
                   value="${escapeHtml(noteData.title)}"
                   placeholder="输入标题..."
                   ${titleDisabled}>
            <input type="text"
                   class="note-excerpt-input"
                   value="${escapeHtml(noteData.excerpt || '')}"
                   placeholder="输入摘要（最多50字）..."
                   maxlength="50"
                   ${titleDisabled}>
            <div class="note-tags-bar" data-note-id="${noteData.id}">
                ${showAddTagBtn ? `<button class="btn-add-tag"><i class="fas fa-plus"></i> 添加标签</button>` : ''}
                <div class="note-tags-list">
                    ${this.renderNoteTags(noteTags)}
                </div>
            </div>
            <div class="vditor-container" id="vditor-${noteData.id}"></div>
        `;

        // 只在非回收站时绑定标题输入事件
        const titleInput = editor.querySelector('.note-title-input');

        if (!isTrashed) {
            titleInput.addEventListener('input', () => {
                if (this.onTitleChange) {
                    this.onTitleChange(noteData.id, titleInput.value);
                }
            });

            // 绑定摘要输入事件
            const excerptInput = editor.querySelector('.note-excerpt-input');
            excerptInput.addEventListener('input', () => {
                if (this.onExcerptChange) {
                    this.onExcerptChange(noteData.id, excerptInput.value);
                }
            });

            // 初始化 Vditor 编辑器
            const vditorContainer = editor.querySelector('.vditor-container');
            // 当前正在编辑的笔记ID
            const currentNoteId = noteData.id;

            const vditor = new Vditor(vditorContainer, {
                placeholder: '开始记录你的想法...',
                value: noteData.content || '',
                cache: {
                    enable: false
                },
                toolbar: [
                    { name: 'emoji', tipPosition: 'se' },
                    { name: 'headings', tipPosition: 'se' },
                    { name: 'bold', tipPosition: 'se' },
                    { name: 'italic', tipPosition: 'se' },
                    { name: 'strike', tipPosition: 'se' },
                    '|',
                    { name: 'line', tipPosition: 's' },
                    { name: 'quote', tipPosition: 's' },
                    { name: 'list', tipPosition: 's' },
                    { name: 'ordered-list', tipPosition: 's' },
                    { name: 'check', tipPosition: 's' },
                    { name: 'outdent', tipPosition: 's' },
                    { name: 'indent', tipPosition: 's' },
                    { name: 'code', tipPosition: 's' },
                    { name: 'inline-code', tipPosition: 's' },
                    { name: 'insert-after', tipPosition: 's' },
                    { name: 'insert-before', tipPosition: 's' },
                    '|',
                    { name: 'undo', tipPosition: 's' },
                    { name: 'redo', tipPosition: 's' },
                    '|',
                    { name: 'upload', tipPosition: 's' },
                    { name: 'link', tipPosition: 's' },
                    { name: 'table', tipPosition: 's' },
                    '|',
                    { name: 'edit-mode', tipPosition: 'sw' },
                    { name: 'preview', tipPosition: 'sw' },
                    { name: 'fullscreen', tipPosition: 'sw' },
                    '|',
                    {
                        hotkey: '⇧⌘R',
                        name: 'recovery',
                        tipPosition: 'sw',
                        tip: '恢复顶部栏 (⇧⌘R)',
                        className: 'recover',
                        icon: '<svg t="1717420000000" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M128 160 L896 160" stroke="#666666" stroke-width="96" stroke-linecap="round" fill="none" /><path d="M512 300 L512 896 M320 700 L512 896 L704 700" stroke="#666666" stroke-width="96" stroke-linecap="round" stroke-linejoin="round" fill="none" /></svg>',
                        click () {
                            editor.classList.remove('editor-focused');
                        }
                    }
                ],
                preview: {
                    maxWidth: 1200
                },
                upload: {
                    handler: async (files) => {
                        for (const file of files) {
                            try {
                                // 读取文件为 base64
                                const arrayBuffer = await file.arrayBuffer();
                                const base64 = btoa(
                                    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                                );

                                // 保存到笔记的 assets 文件夹
                                const filePath = await window.electronAPI.saveAsset(currentNoteId, file.name, base64);
                                // 插入图片
                                // vditor.insertValue(`![${file.name}](${filePath.replace(/\\/g, '/').replace(/ /g, '%20')})`);
                                vditor.insertMD(`<img src="${filePath.replace(/\\/g, '/').replace(/ /g, '%20')}" alt="${file.name}" style="zoom:100%;" />`);
                            } catch (error) {
                                console.error('文件上传失败:', error);
                            }
                        }
                    }
                },
                after: () => {
                    // 点击 Vditor 编辑区域时隐藏顶部栏
                    vditorContainer.addEventListener('click', (e) => {
                        // .vditor-content 是 Vditor 的内容编辑区
                        if (e.target.closest('.vditor-content')) {
                            editor.classList.add('editor-focused');
                        }
                    });
                    // 点击顶部区域（标题、摘要、标签）时显示顶部栏
                    editor.addEventListener('click', (e) => {
                        if (e.target.closest('.note-title-input') ||
                            e.target.closest('.note-excerpt-input') ||
                            e.target.closest('.note-tags-bar')) {
                            editor.classList.remove('editor-focused');
                        }
                    });
                    // 监听键盘快捷键 ⇧⌘R 恢复顶部栏
                    vditorContainer.addEventListener('keydown', (e) => {
                        if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key === 'r') {
                            editor.classList.remove('editor-focused');
                        }
                    });
                },
                input: (value) => {
                    if (this.onContentChange) {
                        this.onContentChange(noteData.id, value);
                    }
                }
            });

            // 存储 Vditor 实例
            this.vditors.set(noteData.id, vditor);
        } else {
            // 只读模式：直接渲染 HTML 不显示编辑器
            const vditorContainer = editor.querySelector('.vditor-container');
            vditorContainer.innerHTML = `<div class="vditor-readonly">${this.renderMarkdown(noteData.content || '')}</div>`;
        }

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
        // 销毁 Vditor 实例
        const vditor = this.vditors.get(noteId);
        if (vditor) {
            vditor.destroy();
            this.vditors.delete(noteId);
        }

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
        const vditor = this.vditors.get(noteId);
        if (vditor) {
            const currentValue = vditor.getValue();
            if (currentValue !== newContent) {
                vditor.setValue(newContent);
            }
        } else {
            // 只读模式下更新预览
            const container = document.querySelector(`#note-${noteId} .vditor-readonly`);
            if (container) {
                container.innerHTML = this.renderMarkdown(newContent || '');
            }
        }
    }
}
