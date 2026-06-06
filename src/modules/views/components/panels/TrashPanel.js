/**
 * 回收站面板模块
 * 负责渲染回收站面板的 HTML 内容
 */
export class TrashPanel {
    /**
     * 渲染回收站面板
     */
    render(container, trashedNotes) {
        if (!trashedNotes || trashedNotes.length === 0) {
            container.innerHTML = `
                <div class="sidebar-panel trash-panel">
                    <h3 class="panel-title"><i class="fas fa-trash-alt"></i> 回收站</h3>
                    <div class="panel-content">
                        <p class="panel-empty">回收站为空</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="sidebar-panel trash-panel">
                <h3 class="panel-title"><i class="fas fa-trash-alt"></i> 回收站</h3>
                <div class="panel-content">
                    <ul class="trash-notes-list">
                        ${trashedNotes.map(note => `
                            <li class="trash-note-item" data-note-id="${note.id}">
                                <div class="trash-note-info">
                                    <i class="fas fa-sticky-note"></i>
                                    <span class="trash-note-title">${this.escapeHtml(note.title || '无标题')}</span>
                                </div>
                                <div class="trash-note-actions">
                                    <button class="trash-action-btn restore-btn" title="恢复">
                                        <i class="fas fa-undo"></i>
                                    </button>
                                    <button class="trash-action-btn delete-btn" title="永久删除">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
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