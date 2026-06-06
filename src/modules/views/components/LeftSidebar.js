/**
 * 左侧边栏内容渲染组件
 * 注意：UI状态（宽度、折叠）由 Vue useLeftSidebar 管理
 * 本模块仅负责面板内容渲染
 */
import { debounce } from '../../utils/helpers.js';
import { EventTypes } from '../../core/EventTypes.js';

export class LeftSidebar {
    constructor() {
        this.activePanel = 'search';
        this.container = null;
        this.navContainer = null;
        this.contentContainer = null;
        this.resizeHandle = null;

        // 标签展开状态
        this.expandedTags = new Set();

        // 归档年份展开状态
        this.expandedArchiveYears = new Set();

        // 搜索状态
        this.activeSearchResultId = null;
        this.lastSearchQuery = '';
        this.lastSearchResults = [];

        // 回调函数
        this.onPanelChange = null;
        this.onTagNoteClick = null;
        this.onArchiveNoteClick = null;
    }

    /**
     * 初始化组件
     */
    init() {
        this.container = document.querySelector('.left-sidebar');
        this.navContainer = this.container.querySelector('.sidebar-nav');
        this.contentContainer = this.container.querySelector('.sidebar-content');
        this.resizeHandle = document.getElementById('resizeHandle');

        // UI状态由 Vue 管理，这里只设置默认值
        // 默认展开
        this.container.classList.add('expanded');
    }

    /**
     * 获取内容容器元素
     */
    getContentContainer() {
        return this.contentContainer;
    }

    /**
     * 获取当前激活的面板 ID
     */
    getActivePanelId() {
        if (window.leftSidebarApi?.getActivePanelId) {
            return window.leftSidebarApi.getActivePanelId();
        }
        return this.activePanel;
    }

    /**
     * 获取当前折叠状态
     */
    getIsCollapsed() {
        if (window.leftSidebarApi?.getIsCollapsed) {
            return window.leftSidebarApi.getIsCollapsed();
        }
        return false;
    }

    /**
     * 切换到指定面板
     */
    switchPanel(panelId) {
        if (window.leftSidebarApi?.switchPanel) {
            window.leftSidebarApi.switchPanel(panelId);
        }
    }

    /**
     * 渲染面板内容
     */
    getContentContainer() {
        return this.contentContainer;
    }

    /**
     * 渲染面板内容
     */
    renderPanelContent(panelId, data = null) {
        if (!this.contentContainer) return;

        this.contentContainer.innerHTML = '';

        switch (panelId) {
            case 'search':
                this.renderSearchPanel(this.contentContainer, data);
                break;
            case 'tags':
                this.renderTagsPanel(this.contentContainer, data);
                break;
            case 'archive':
                this.renderArchivePanel(this.contentContainer, data);
                break;
            case 'recent':
                this.renderRecentPanel(this.contentContainer, data);
                break;
            case 'trash':
                this.renderTrashPanel(this.contentContainer, data);
                break;
            default:
                this.contentContainer.innerHTML = `
                    <div class="sidebar-panel">
                        <h3 class="panel-title">${panelId}</h3>
                        <div class="panel-content">
                            <p class="panel-empty">面板未实现</p>
                        </div>
                    </div>
                `;
        }
    }

    /**
     * 渲染最近笔记面板
     */
    renderRecentPanel(container, recentNotes) {
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

    /**
     * 渲染标签面板
     */
    renderTagsPanel(container, tagsData) {
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
     * 切换标签展开状态
     */
    toggleTagExpanded(tagId) {
        if (this.expandedTags.has(tagId)) {
            this.expandedTags.delete(tagId);
        } else {
            this.expandedTags.add(tagId);
        }
    }

    /**
     * 设置标签笔记点击回调
     */
    setTagNoteClickCallback(callback) {
        this.onTagNoteClick = callback;
    }

    /**
     * 切换归档年份展开状态
     */
    toggleArchiveYearExpanded(year) {
        if (this.expandedArchiveYears.has(year)) {
            this.expandedArchiveYears.delete(year);
        } else {
            this.expandedArchiveYears.add(year);
        }
    }

    /**
     * 设置归档笔记点击回调
     */
    setArchiveNoteClickCallback(callback) {
        this.onArchiveNoteClick = callback;
    }

    /**
     * 渲染归档面板
     */
    renderArchivePanel(container, groupedNotes) {
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
                            const isExpanded = this.expandedArchiveYears.has(yearData.year);
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
     * 渲染回收站面板
     */
    renderTrashPanel(container, trashedNotes) {
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
     * 设置当前激活的搜索结果
     */
    setActiveSearchResult(noteId) {
        this.activeSearchResultId = noteId;
    }

    /**
     * 更新搜索结果选中状态
     */
    refreshSearchResultSelection(container) {
        const resultsContainer = container.querySelector('.search-results-container');
        if (!resultsContainer) return;

        resultsContainer.querySelectorAll('.search-result-card').forEach(card => {
            card.classList.toggle('active', card.dataset.noteId === this.activeSearchResultId);
        });
    }

    /**
     * 清除搜索结果选中状态
     */
    clearSearchResultSelection(container) {
        this.activeSearchResultId = null;
        const resultsContainer = container.querySelector('.search-results-container');
        if (!resultsContainer) return;

        resultsContainer.querySelectorAll('.search-result-card').forEach(card => {
            card.classList.remove('active');
        });
    }

    /**
     * 渲染搜索面板
     */
    renderSearchPanel(container, data) {
        let query = this.lastSearchQuery;
        let results = this.lastSearchResults;

        if (!this.lastSearchQuery && data && data.query !== undefined) {
            query = data.query || '';
            results = data.results || [];
            this.lastSearchQuery = query;
            this.lastSearchResults = results;
        }

        container.innerHTML = `
            <div class="sidebar-panel search-panel">
                <h3 class="panel-title"><i class="fas fa-search"></i> 快速搜索</h3>
                <div class="panel-content">
                    <div class="search-input-wrapper">
                        <input
                            type="text"
                            class="sidebar-search-input"
                            placeholder="输入关键词搜索..."
                            value="${this.escapeHtml(query)}"
                            autocomplete="off"
                        >
                        <i class="fas fa-search search-icon"></i>
                    </div>
                    <div class="search-results-container">
                        ${this.renderSearchResults(results, query)}
                    </div>
                </div>
            </div>
        `;

        const searchInput = container.querySelector('.sidebar-search-input');
        searchInput.focus();
        searchInput.addEventListener('input', debounce((e) => {
            const value = e.target.value.trim();
            window.eventBus.emit(EventTypes.SEARCH.SIDEBAR_SEARCH_INPUT, value);
        }, 200));
    }

    /**
     * 更新搜索结果
     */
    updateSearchResults(container, results, query) {
        this.lastSearchQuery = query;
        this.lastSearchResults = results;

        const resultsContainer = container.querySelector('.search-results-container');
        if (resultsContainer) {
            resultsContainer.innerHTML = this.renderSearchResults(results, query);
        }
    }

    /**
     * 渲染搜索结果列表
     */
    renderSearchResults(results, query) {
        if (results.length === 0) {
            if (!query) {
                return `<p class="panel-empty">输入关键词开始搜索</p>`;
            }
            return `<p class="panel-empty">未找到匹配的笔记</p>`;
        }

        return `
            <ul class="search-results-list">
                ${results.map(note => {
                    const isActive = note.id === this.activeSearchResultId;
                    const preview = this.generateSearchPreview(note.content || '', query);
                    const tagsHtml = this.renderNoteTags(note, query);

                    return `
                        <li class="search-result-card ${isActive ? 'active' : ''}" data-note-id="${note.id}">
                            <div class="search-result-title">
                                ${this.highlightMatch(this.escapeHtml(note.title || '无标题'), query)}
                            </div>
                            <div class="search-result-preview">${preview}</div>
                            ${tagsHtml}
                        </li>
                    `;
                }).join('')}
            </ul>
        `;
    }

    /**
     * 渲染笔记标签
     */
    renderNoteTags(note, query) {
        if (!note.tags || !note.tagsData || note.tags.length === 0) {
            return '';
        }

        const tagsHtml = note.tagsData.map(tag => {
            const tagName = this.escapeHtml(tag.name);
            const coloredName = query
                ? this.highlightMatch(tagName, query)
                : tagName;

            return `
                <span class="search-note-tag" style="border-color: ${tag.color}">
                    ${coloredName}
                </span>
            `;
        }).join('');

        return `<div class="search-note-tags">${tagsHtml}</div>`;
    }

    /**
     * 生成搜索预览片段
     */
    generateSearchPreview(content, query) {
        if (!content || !query) return '';

        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerContent.indexOf(lowerQuery);

        if (index === -1) {
            const snippet = content.replace(/\s+/g, ' ').trim().slice(0, 80);
            if (!snippet) return '';
            return this.escapeHtml(snippet) + (content.length > 80 ? '...' : '');
        }

        const start = Math.max(0, index - 20);
        const end = Math.min(content.length, index + query.length + 60);
        let snippet = content.slice(start, end);
        snippet = snippet.replace(/\s+/g, ' ').trim();

        return this.highlightMatch(this.escapeHtml(snippet), query);
    }

    /**
     * 高亮匹配的关键词
     */
    highlightMatch(text, query) {
        if (!query || !text) return text;

        const lowerQuery = query.toLowerCase();
        const lowerText = text.toLowerCase();
        let result = '';
        let lastIndex = 0;
        let index = lowerText.indexOf(lowerQuery);

        while (index !== -1) {
            result += text.slice(lastIndex, index);
            result += `<mark>${text.slice(index, index + query.length)}</mark>`;

            lastIndex = index + query.length;
            index = lowerText.indexOf(lowerQuery, lastIndex);
        }

        result += text.slice(lastIndex);

        return result;
    }
}
