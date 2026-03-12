class NoteApp {
    constructor() {
        this.notes = new Map(); // 存储打开的笔记
        this.currentNoteId = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadAllNotes();
    }

    setupEventListeners() {
        // 新建笔记按钮
        document.getElementById('newNoteBtn').addEventListener('click', () => {
            this.createNewNote();
        });

        // 搜索框事件
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(searchInput.value);
            }
        });

        document.querySelector('.btn-search').addEventListener('click', () => {
            this.performSearch(searchInput.value);
        });

        // 标签页切换
        document.querySelector('.tab-bar').addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (tab) {
                const tabId = tab.dataset.tabId;
                if (tabId === 'search') {
                    this.switchToSearch();
                } else {
                    this.switchToNote(tabId);
                }
            }

            // 关闭按钮
            const closeBtn = e.target.closest('.tab-close');
            if (closeBtn) {
                const tab = closeBtn.closest('.tab');
                const noteId = tab.dataset.tabId;
                if (noteId !== 'search') {
                    this.closeNote(noteId);
                }
            }
        });
    }

    // 加载所有笔记
    async loadAllNotes() {
        try {
            const notes = await window.electronAPI.getAllNotes();
            console.log('加载的笔记:', notes);
            this.renderAllNotes(notes);
        } catch (error) {
            console.error('加载所有笔记失败:', error);
            this.showToast('加载笔记失败', 'error');
        }
    }

    // 渲染笔记列表
    renderAllNotes(notes) {
        const grid = document.getElementById('notesGrid');
        grid.innerHTML = '';

        notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            noteCard.innerHTML = `
                <button class="note-delete-btn" data-note-id="${note.id}">
                    <i class="fas fa-trash"></i>
                </button>
                <h3>${this.escapeHtml(note.title)}</h3>
                <p>${this.escapeHtml(note.content?.substring(0, 100))}${note.content?.length > 100 ? '...' : ''}</p>
                <div class="note-meta">
                    <span>${new Date(note.updatedAt).toLocaleString('zh-CN')}</span>
                    <span><i class="fas fa-calendar-alt"></i> 最后修改</span>
                </div>
            `;
            // 点击卡片打开笔记
            noteCard.addEventListener('click', (e) => {
                if (!e.target.closest('.note-delete-btn')) {
                    this.openNote(note);
                }
            });
            // 删除按钮事件
            const deleteBtn = noteCard.querySelector('.note-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNote(note.id);
            });
            grid.appendChild(noteCard);
        });
    }

    // 创建新笔记
    async createNewNote() {
        try {
            const noteData = await window.electronAPI.createNote();
            this.addNoteToApp(noteData);
        } catch (error) {
            console.error('创建笔记失败:', error);
        }
    }

    // 打开笔记
    async openNote(noteData) {
        // 如果笔记已经打开，直接切换到它
        if (this.notes.has(noteData.id)) {
            this.switchToNote(noteData.id);
            return;
        }

        try {
            // 加载完整的笔记内容（包含content）
            const fullNote = await window.electronAPI.getNote(noteData.id);
            // 添加到应用中
            this.addNoteToApp(fullNote);
        } catch (error) {
            console.error('打开笔记失败:', error);
            this.showToast('打开笔记失败', 'error');
        }
    }

    // 将笔记添加到应用中
    addNoteToApp(noteData) {
        this.notes.set(noteData.id, noteData);
        this.createNoteTab(noteData);
        this.createNoteEditor(noteData);
        this.switchToNote(noteData.id);
        this.updateAllNotes();
    }

    createNoteTab(noteData) {
        const tabBar = document.getElementById('tabBar');
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.tabId = noteData.id;
        tab.innerHTML = `
            <div class="tab-icon-title">
                <i class="fas fa-file-alt"></i>
                <span class="tab-title">${this.escapeHtml(noteData.title)}</span>
            </div>
            <span class="tab-close"><i class="fas fa-times"></i></span>
        `;

        // 插入到搜索标签页之后
        const searchTab = document.querySelector('.tab[data-tab-id="search"]');
        searchTab.parentNode.insertBefore(tab, searchTab.nextSibling);
    }

    createNoteEditor(noteData) {
        const container = document.getElementById('notesContainer');
        
        const editor = document.createElement('div');
        editor.className = 'note-editor';
        editor.id = `note-${noteData.id}`;
        editor.innerHTML = `
            <input type="text" 
                   class="note-title-input" 
                   value="${this.escapeHtml(noteData.title)}"
                   placeholder="输入标题...">
            <textarea class="note-content-textarea" 
                      placeholder="开始记录你的想法...">${this.escapeHtml(noteData.content)}</textarea>
        `;

        // 设置输入事件
        const titleInput = editor.querySelector('.note-title-input');
        const contentTextarea = editor.querySelector('.note-content-textarea');

        titleInput.addEventListener('input', () => {
            this.updateNoteTitle(noteData.id, titleInput.value);
        });

        contentTextarea.addEventListener('input', () => {
            this.updateNoteContent(noteData.id, contentTextarea.value);
        });

        container.appendChild(editor);
    }

    switchToNote(noteId) {
        // 更新标签页状态
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tabId === noteId.toString()) {
                tab.classList.add('active');
            }
        });

        // 显示对应的编辑器
        document.querySelectorAll('.note-editor').forEach(editor => {
            editor.classList.remove('active');
            if (editor.id === `note-${noteId}`) {
                editor.classList.add('active');
            }
        });

        // 隐藏搜索页面
        document.getElementById('tab-search').classList.remove('active');

        this.currentNoteId = noteId;
    }

    switchToSearch() {
        // 更新标签页状态
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tabId === 'search') {
                tab.classList.add('active');
            }
        });

        // 隐藏所有编辑器
        document.querySelectorAll('.note-editor').forEach(editor => {
            editor.classList.remove('active');
        });

        // 显示搜索页面
        document.getElementById('tab-search').classList.add('active');

        this.currentNoteId = null;
    }

    closeNote(noteId) {
        // 从Map中移除
        this.notes.delete(noteId);

        // 移除标签页
        const tab = document.querySelector(`.tab[data-tab-id="${noteId}"]`);
        if (tab) tab.remove();

        // 移除编辑器
        const editor = document.getElementById(`note-${noteId}`);
        if (editor) editor.remove();

        // 如果关闭的是当前笔记，切换到搜索页面
        if (this.currentNoteId === noteId) {
            this.switchToSearch();
        }
    }

    updateNoteTitle(noteId, newTitle) {
        const note = this.notes.get(noteId);
        if (note) {
            note.title = newTitle;
            // 更新标签页标题
            const tabTitle = document.querySelector(`.tab[data-tab-id="${noteId}"] .tab-title`);
            if (tabTitle) {
                tabTitle.textContent = newTitle || '无标题';
            }
            // 保存到后端
            this.debounceSave(noteId);
        }
    }

    updateNoteContent(noteId, newContent) {
        const note = this.notes.get(noteId);
        if (note) {
            note.content = newContent;
            // 保存到后端
            this.debounceSave(noteId);
        }
    }

    // 防抖保存，避免频繁写入
    debounceSave(noteId) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(async () => {
            const note = this.notes.get(noteId);
            if (note) {
                try {
                    await window.electronAPI.updateNote(note.id, note);
                    // 刷新笔记列表以更新最后修改时间
                    this.updateAllNotes();
                } catch (error) {
                    console.error('保存笔记失败:', error);
                    this.showToast('保存失败', 'error');
                }
            }
        }, 500);
    }

    async updateAllNotes() {
        // 刷新笔记列表
        await this.loadAllNotes();
    }

    async deleteNote(noteId) {
        if (!confirm('确定要删除这篇笔记吗？此操作不可恢复。')) {
            return;
        }

        try {
            await window.electronAPI.deleteNote(noteId);

            // 如果笔记当前打开，先关闭它
            if (this.notes.has(noteId)) {
                this.closeNote(noteId);
            }

            // 刷新笔记列表
            await this.updateAllNotes();
            this.showToast('笔记删除成功', 'success');
        } catch (error) {
            console.error('删除笔记失败:', error);
            this.showToast('删除笔记失败', 'error');
        }
    }

    performSearch(query) {
        // 实现搜索逻辑
        console.log('搜索:', query);
        alert(`搜索: ${query}\n搜索功能将在后续版本中完善`);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // 添加到页面
        document.body.appendChild(toast);

        // 显示动画
        setTimeout(() => toast.classList.add('show'), 10);

        // 3秒后自动消失
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new NoteApp();
});