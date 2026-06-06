/**
 * 标签面板模块
 * 负责渲染标签面板的 HTML 内容
 */
export class TagsPanel {
    constructor() {
        // 标签展开状态
        this.expandedTags = new Set();
    }

    /**
     * 切换标签展开状态
     */
    toggleExpanded(tagId) {
        if (this.expandedTags.has(tagId)) {
            this.expandedTags.delete(tagId);
        } else {
            this.expandedTags.add(tagId);
        }
    }

    /**
     * 渲染标签面板
     */
    render(container, tagsData) {
        if (!tagsData || !tagsData.tags || tagsData.tags.length === 0) {
            container.innerHTML = `
                <div class="sidebar-panel tags-panel">
                    <h3 class="panel-title">
                        <span><i class="fas fa-tags"></i> 所有标签</span>
                        <button class="tag-add-btn" title="新建标签">
                            <i class="fas fa-plus"></i>
                        </button>
                    </h3>
                    <div class="panel-content">
                        <p class="panel-empty">暂无标签</p>
                    </div>
                </div>
            `;
            return;
        }

        const { tags, tagCounts, tagNotes } = tagsData;

        container.innerHTML = `
            <div class="sidebar-panel tags-panel">
                <h3 class="panel-title">
                    <span><i class="fas fa-tags"></i> 所有标签</span>
                    <button class="tag-add-btn" title="新建标签">
                        <i class="fas fa-plus"></i>
                    </button>
                </h3>
                <div class="panel-content">
                    <ul class="tags-list">
                        ${tags.map(tag => {
                            const isExpanded = this.expandedTags.has(tag.id);
                            const notes = tagNotes && tagNotes[tag.id] ? tagNotes[tag.id] : [];
                            const expandIcon = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
                            return `
                            <li class="tag-main-item" data-tag-id="${tag.id}">
                                <i class="fas ${expandIcon} tag-expand-icon"></i>
                                <span class="tag-color" style="background-color: ${tag.color}"></span>
                                <span class="tag-name">${this.escapeHtml(tag.name)}</span>
                                <span class="tag-count">${tagCounts[tag.id] || 0}</span>
                                <div class="tag-actions">
                                    <button class="tag-action-btn edit-btn" title="编辑">
                                        <i class="fas fa-pencil-alt"></i>
                                    </button>
                                    <button class="tag-action-btn delete-btn" title="删除">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </li>
                            ${isExpanded && notes.length > 0 ? `
                            <ul class="tag-notes-list">
                                ${notes.map(note => `
                                <li class="tag-note-item" data-note-id="${note.id}" data-tag-id="${tag.id}">
                                    <i class="fas fa-sticky-note"></i>
                                    <span class="tag-note-title">${this.escapeHtml(note.title || '无标题')}</span>
                                </li>
                                `).join('')}
                            </ul>
                            ` : ''}
                        `;
                        }).join('')}
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