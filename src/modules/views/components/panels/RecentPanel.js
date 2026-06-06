/**
 * 最近笔记面板模块
 * 负责渲染最近笔记面板的 HTML 内容
 */
export class RecentPanel {
    /**
     * 渲染最近笔记面板
     */
    render(container, recentNotes) {
        if (!recentNotes || recentNotes.length === 0) {
            container.innerHTML = `
                <div class="sidebar-panel">
                    <h3 class="panel-title"><i class="fas fa-history"></i> 最近文件</h3>
                    <div class="panel-content">
                        <p class="panel-empty">暂无最近笔记</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="sidebar-panel">
                <h3 class="panel-title"><i class="fas fa-history"></i> 最近文件</h3>
                <div class="panel-content">
                    <ul class="recent-notes-list">
                        ${recentNotes.map(note => `
                            <li class="recent-note-item" data-note-id="${note.id}">
                                <i class="fas fa-sticky-note"></i>
                                <span class="recent-note-title">${this.escapeHtml(note.title || '无标题')}</span>
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