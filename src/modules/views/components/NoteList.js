/**
 * 笔记列表组件
 * 负责笔记列表的渲染和事件绑定
 */
import { escapeHtml } from '../../utils/helpers.js';
import { formatDate } from '../../utils/formatters.js';

export class NoteList {
    constructor() {
        this.grid = document.getElementById('notesGrid');
        this.onNoteClick = null;
        this.onNoteDelete = null;
    }

    /**
     * 设置事件回调
     * @param {Function} onNoteClick 笔记点击回调
     * @param {Function} onNoteDelete 笔记删除回调
     */
    setCallbacks(onNoteClick, onNoteDelete) {
        this.onNoteClick = onNoteClick;
        this.onNoteDelete = onNoteDelete;
    }

    /**
     * 渲染笔记列表
     * @param {Array} notes 笔记列表
     */
    renderNotes(notes) {
        this.grid.innerHTML = '';

        notes.forEach(note => {
            const noteCard = this.createNoteCard(note);
            this.grid.appendChild(noteCard);
        });
    }

    /**
     * 创建单个笔记卡片
     * @param {Object} note 笔记数据
     * @returns {HTMLElement} 笔记卡片元素
     */
    createNoteCard(note) {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.innerHTML = `
            <button class="note-delete-btn" data-note-id="${note.id}">
                <i class="fas fa-trash"></i>
            </button>
            <h3>${escapeHtml(note.title) || '无标题'}</h3>
            <p>${escapeHtml(note.content?.substring(0, 100))}${note.content?.length > 100 ? '...' : ''}</p>
            <div class="note-meta">
                <span>${formatDate(note.updatedAt, 'YYYY-MM-DD HH:mm')}</span>
                <span><i class="fas fa-calendar-alt"></i> 最后修改</span>
            </div>
        `;

        // 点击卡片打开笔记
        noteCard.addEventListener('click', (e) => {
            if (!e.target.closest('.note-delete-btn') && this.onNoteClick) {
                this.onNoteClick(note);
            }
        });

        // 删除按钮事件
        const deleteBtn = noteCard.querySelector('.note-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onNoteDelete) {
                this.onNoteDelete(note.id);
            }
        });

        return noteCard;
    }

    /**
     * 清空笔记列表
     */
    clear() {
        this.grid.innerHTML = '';
    }
}
