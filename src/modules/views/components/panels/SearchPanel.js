/**
 * 搜索面板模块
 * 负责渲染搜索面板的 HTML 内容
 */
import { debounce } from '../../../utils/helpers.js';
import { EventTypes } from '../../../core/EventTypes.js';

export class SearchPanel {
    constructor() {
        // 搜索状态
        this.activeSearchResultId = null;
        this.lastSearchQuery = '';
        this.lastSearchResults = [];
    }

    /**
     * 渲染搜索面板
     */
    render(container, data = null) {
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
                        ${this.renderResults(results, query)}
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
    updateResults(container, results, query) {
        this.lastSearchQuery = query;
        this.lastSearchResults = results;

        const resultsContainer = container.querySelector('.search-results-container');
        if (resultsContainer) {
            resultsContainer.innerHTML = this.renderResults(results, query);
        }
    }

    /**
     * 设置当前激活的搜索结果
     */
    setActiveResult(noteId) {
        this.activeSearchResultId = noteId;
    }

    /**
     * 刷新搜索结果选中状态
     */
    refreshSelection(container) {
        const resultsContainer = container.querySelector('.search-results-container');
        if (!resultsContainer) return;

        resultsContainer.querySelectorAll('.search-result-card').forEach(card => {
            card.classList.toggle('active', card.dataset.noteId === this.activeSearchResultId);
        });
    }

    /**
     * 清除搜索结果选中状态
     */
    clearSelection(container) {
        this.activeSearchResultId = null;
        const resultsContainer = container.querySelector('.search-results-container');
        if (!resultsContainer) return;

        resultsContainer.querySelectorAll('.search-result-card').forEach(card => {
            card.classList.remove('active');
        });
    }

    /**
     * 渲染搜索结果列表
     */
    renderResults(results, query) {
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
                    const preview = this.generatePreview(note.content || '', query);
                    const tagsHtml = this.renderTags(note, query);

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
    renderTags(note, query) {
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
    generatePreview(content, query) {
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

    /**
     * HTML 转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}