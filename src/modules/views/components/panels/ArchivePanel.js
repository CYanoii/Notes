/**
 * 归档面板模块
 * 负责渲染归档面板的 HTML 内容
 */
export class ArchivePanel {
    constructor() {
        // 归档年份展开状态
        this.expandedYears = new Set();
    }

    /**
     * 切换归档年份展开状态
     */
    toggleYearExpanded(year) {
        if (this.expandedYears.has(year)) {
            this.expandedYears.delete(year);
        } else {
            this.expandedYears.add(year);
        }
    }

    /**
     * 渲染归档面板
     */
    render(container, groupedNotes) {
        if (!groupedNotes || !groupedNotes.years || groupedNotes.years.length === 0) {
            container.innerHTML = `
                <div class="sidebar-panel archive-panel">
                    <h3 class="panel-title"><i class="fas fa-archive"></i> 归档</h3>
                    <div class="panel-content">
                        <p class="panel-empty">暂无笔记</p>
                    </div>
                </div>
            `;
            return;
        }

        const { years } = groupedNotes;

        container.innerHTML = `
            <div class="sidebar-panel archive-panel">
                <h3 class="panel-title"><i class="fas fa-archive"></i> 归档</h3>
                <div class="panel-content">
                    <ul class="archive-list">
                        ${years.map(yearData => {
                            const isExpanded = this.expandedYears.has(yearData.year);
                            const expandIcon = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
                            return `
                            <li class="archive-year-item">
                                <div class="archive-year-header" data-year="${yearData.year}">
                                    <i class="fas ${expandIcon} archive-expand-icon"></i>
                                    <span class="archive-year-text">${yearData.year}年</span>
                                    <span class="archive-year-count">${yearData.totalCount}</span>
                                </div>
                                ${isExpanded ? `
                                <ul class="archive-months-list">
                                    ${yearData.months.map(monthData => {
                                        const monthName = this.getMonthName(monthData.month);
                                        return `
                                        <li class="archive-month-item">
                                            <div class="archive-month-header">
                                                <span class="archive-month-text">${monthName}</span>
                                                <span class="archive-month-count">${monthData.notes.length}</span>
                                            </div>
                                            <ul class="archive-notes-list">
                                                ${monthData.notes.map(note => `
                                                    <li class="archive-note-item" data-note-id="${note.id}">
                                                        <i class="fas fa-sticky-note"></i>
                                                        <span class="archive-note-title">${this.escapeHtml(note.title || '无标题')}</span>
                                                    </li>
                                                `).join('')}
                                            </ul>
                                        </li>
                                        `;
                                    }).join('')}
                                </ul>
                                ` : ''}
                            </li>
                            `;
                        }).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    /**
     * 获取月份名称
     */
    getMonthName(month) {
        return `${month}月`;
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