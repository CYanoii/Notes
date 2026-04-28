/**
 * 左侧边栏组件
 * 分为图标导航区和内容展示区，支持切换不同功能面板
 * 再次点击已选中项可折叠/展开内容区
 */
import { debounce } from '../../utils/helpers.js';
import { EventTypes } from '../../core/EventTypes.js';

export class LeftSidebar {
    constructor() {
        // 当前激活的面板
        this.activePanel = 'search';

        // 内容区是否折叠
        this.isCollapsed = false;

        // 收起时记录的上一次激活面板（用于恢复）
        this.lastActivePanel = null;

        // 定义菜单项
        this.menuItems = [
            { id: 'search', icon: 'fas fa-search', label: '搜索' },
            { id: 'tags', icon: 'fas fa-tags', label: '所有标签' },
            { id: 'archive', icon: 'fas fa-archive', label: '归档' },
            { id: 'recent', icon: 'fas fa-history', label: '最近文件' },
            { id: 'trash', icon: 'fas fa-trash-alt', label: '回收站' }
        ];

        // 底部功能按钮
        this.bottomItems = [
            { id: 'settings', icon: 'fas fa-cog', label: '设置' }
        ];

        // 拉伸配置
        this.minExpandedWidth = 180;     // 展开状态最小宽度（包含导航栏）
        this.collapseThreshold = 90;     // 超过最小宽度多少像素才触发收起
        this.defaultWidth = 280;         // 默认宽度
        this.maxWidth = 450;             // 最大宽度

        // 拖拽状态
        this.isResizing = false;
        this.startX = 0;
        this.startWidth = 0;

        // 标签展开状态
        this.expandedTags = new Set();  // 存储展开的标签ID

        // 归档年份展开状态
        this.expandedArchiveYears = new Set();  // 存储展开的年份

        // 搜索状态
        this.activeSearchResultId = null;  // 当前选中的搜索结果ID
        this.lastSearchQuery = '';         // 上一次搜索关键词
        this.lastSearchResults = [];       // 上一次搜索结果

        // 回调函数
        this.onPanelChange = null;
        this.onCollapseChange = null;
        this.onWidthChange = null;
        this.onTagNoteClick = null;
        this.onArchiveNoteClick = null;
        this.onSettingsClick = null;

        // DOM 元素引用
        this.container = null;
        this.navContainer = null;
        this.contentContainer = null;
        this.resizeHandle = null;

        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.container = document.querySelector('.left-sidebar');
        this.navContainer = this.container.querySelector('.sidebar-nav');
        this.contentContainer = this.container.querySelector('.sidebar-content');
        this.resizeHandle = document.getElementById('resizeHandle');

        // 从localStorage恢复宽度
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth && !this.isCollapsed) {
            this.setWidth(parseInt(savedWidth));
        } else {
            this.setWidth(this.defaultWidth);
        }

        // 默认展开
        this.container.classList.add('expanded');

        this.renderNav();
        this.bindResizeEvents();
    }

    /**
     * 渲染导航图标列表
     */
    renderNav() {
        this.navContainer.innerHTML = '';

        this.menuItems.forEach(item => {
            const navItem = document.createElement('div');
            navItem.className = `sidebar-nav-item ${item.id === this.activePanel ? 'active' : ''}`;
            navItem.dataset.panelId = item.id;
            navItem.title = item.label;

            navItem.innerHTML = `<i class="${item.icon}"></i>`;

            this.navContainer.appendChild(navItem);
        });

        // 渲染底部功能按钮
        this.bottomItems.forEach(item => {
            const navItem = document.createElement('div');
            navItem.className = 'sidebar-nav-item sidebar-nav-bottom';
            navItem.dataset.actionId = item.id;
            navItem.title = item.label;

            navItem.innerHTML = `<i class="${item.icon}"></i>`;

            this.navContainer.appendChild(navItem);
        });
    }

    /**
     * 获取导航容器元素（用于外部绑定事件）
     */
    getNavContainer() {
        return this.navContainer;
    }

    /**
     * 绑定拖拽调整大小事件
     * 封装所有拖拽事件绑定到组件内部
     */
    bindResizeEvents() {
        if (!this.resizeHandle) return;

        this.resizeHandle.addEventListener('mousedown', (e) => {
            this.startResize(e);
        });
        document.addEventListener('mousemove', (e) => {
            this.onResize(e);
        });
        document.addEventListener('mouseup', () => {
            this.endResize();
        });
    }

    /**
     * 开始拖拽
     */
    startResize(e) {
        this.isResizing = true;
        this.startX = e.clientX;

        // 如果当前是收起状态，准备拖拽拉出
        if (this.isCollapsed) {
            this.startWidth = 50; // 收起状态宽度是50px
            // 不在这里展开，只在拖拽超过临界值后才展开
        } else {
            this.startWidth = this.container.getBoundingClientRect().width;
        }

        // 拖拽开始前移除过渡效果，实现即时响应
        this.container.style.transition = 'none';
        if (this.contentContainer) {
            this.contentContainer.style.transition = 'none';
        }

        this.resizeHandle.classList.add('resizing');
        document.body.classList.add('resizing');
        e.preventDefault();
    }

    /**
     * 拖拽中
     */
    onResize(e) {
        if (!this.isResizing) return;

        const dx = e.clientX - this.startX;
        let newWidth = this.startWidth + dx;

        // 限制最大宽度
        newWidth = Math.min(newWidth, this.maxWidth);

        // 计算触发收起/展开的临界值
        const collapseWidth = this.minExpandedWidth - this.collapseThreshold;
        const expandWidth = this.minExpandedWidth - this.collapseThreshold;

        // 如果已经展开
        if (!this.isCollapsed) {
            // 如果宽度大于等于最小宽度，正常设置
            if (newWidth >= this.minExpandedWidth) {
                this.setWidth(newWidth);
            }
            // 如果在临界值和最小宽度之间，保持卡在最小宽度
            else if (newWidth >= collapseWidth) {
                this.setWidth(this.minExpandedWidth);
            }
            // 如果小于临界值，触发收起
            else if (newWidth < collapseWidth) {
                this.collapseByDrag();
            }
        }
        // 如果已经收起，正在拖拽拉出
        else {
            // 如果拉过了临界值，才真正展开
            if (newWidth > expandWidth) {
                // 展开并卡在最小宽度
                this.expandByDrag();
                this.setWidth(Math.max(newWidth, this.minExpandedWidth));
            }
            // 还没到临界值，保持收起，更新宽度显示拖拽过程
            else {
                this.setWidth(newWidth);
            }
        }
    }

    /**
     * 结束拖拽
     */
    endResize() {
        if (!this.isResizing) return;

        const currentWidth = this.getWidth();

        // 如果是收起状态但拖拽宽度没超过临界值，恢复到收起宽度
        if (this.isCollapsed && currentWidth <= (this.minExpandedWidth - this.collapseThreshold)) {
            this.setWidth(50);
        }

        // 保存宽度到localStorage
        if (!this.isCollapsed) {
            localStorage.setItem('sidebarWidth', currentWidth.toString());

            // 触发宽度变化回调
            if (this.onWidthChange) {
                this.onWidthChange(currentWidth);
            }
        }

        // 恢复过渡效果
        this.container.style.transition = '';
        if (this.contentContainer) {
            this.contentContainer.style.transition = '';
        }

        this.isResizing = false;
        this.resizeHandle.classList.remove('resizing');
        document.body.classList.remove('resizing');
    }

    /**
     * 通过拖拽收起，处理选中状态
     */
    collapseByDrag() {
        if (this.isCollapsed) return;

        // 记录当前激活面板
        this.lastActivePanel = this.activePanel;

        // 取消所有选中
        this.activePanel = null;
        this.navContainer.querySelectorAll('.sidebar-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // 收起
        this.isCollapsed = true;
        this.container.classList.add('collapsed');
        this.container.classList.remove('expanded');

        if (this.onCollapseChange) {
            this.onCollapseChange(this.isCollapsed);
        }
    }

    /**
     * 通过拖拽拉出，恢复选中状态
     */
    expandByDrag() {
        if (!this.isCollapsed) return;

        // 展开
        this.isCollapsed = false;
        this.container.classList.remove('collapsed');
        this.container.classList.add('expanded');

        // 恢复之前记录的激活面板
        if (this.lastActivePanel) {
            this.activePanel = this.lastActivePanel;
            this.lastActivePanel = null;
            this.navContainer.querySelectorAll('.sidebar-nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.panelId === this.activePanel);
            });
        } else {
            // 没有记录，默认选中搜索
            this.activePanel = 'search';
            this.navContainer.querySelectorAll('.sidebar-nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.panelId === 'search');
            });
        }

        if (this.onCollapseChange) {
            this.onCollapseChange(this.isCollapsed);
        }
    }

    /**
     * 设置侧边栏宽度
     */
    setWidth(width) {
        this.container.style.width = `${width}px`;
    }

    /**
     * 获取当前侧边栏宽度
     */
    getWidth() {
        return this.container.getBoundingClientRect().width;
    }

    /**
     * 切换到指定面板
     * 如果点击的是当前已激活面板，则切换折叠/展开状态
     */
    switchPanel(panelId) {
        // 如果点击的是当前激活的面板且内容未折叠，点击后折叠内容并清除高亮
        if (panelId === this.activePanel && !this.isCollapsed) {
            this.toggleCollapse();
            // 折叠时清除激活面板，移除高亮
            this.lastActivePanel = this.activePanel;
            this.activePanel = null;
            this.navContainer.querySelectorAll('.sidebar-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            return;
        }

        // 如果当前是折叠状态且点击的就是之前记录的面板，展开它并恢复高亮
        if (this.isCollapsed && panelId === this.lastActivePanel) {
            this.toggleCollapse();
            // 展开时恢复激活状态
            this.activePanel = this.lastActivePanel;
            this.lastActivePanel = null;
            this.navContainer.querySelectorAll('.sidebar-nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.panelId === this.activePanel);
            });
            // 触发面板变化回调
            if (this.onPanelChange && this.activePanel) {
                this.onPanelChange(this.activePanel);
            }
            return;
        }

        // 切换到新面板
        this.activePanel = panelId;

        // 确保内容区展开
        if (this.isCollapsed) {
            this.toggleCollapse();
        }

        // 更新导航项样式
        this.navContainer.querySelectorAll('.sidebar-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.panelId === panelId);
        });

        // 触发回调
        if (this.onPanelChange) {
            this.onPanelChange(panelId);
        }
    }

    /**
     * 切换折叠/展开状态
     */
    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.container.classList.toggle('collapsed', this.isCollapsed);
        this.container.classList.toggle('expanded', !this.isCollapsed);

        // 展开时恢复上次保存的宽度
        if (!this.isCollapsed) {
            const savedWidth = localStorage.getItem('sidebarWidth');
            if (savedWidth) {
                this.setWidth(parseInt(savedWidth));
            } else {
                this.setWidth(this.defaultWidth);
            }
        }

        if (this.onCollapseChange) {
            this.onCollapseChange(this.isCollapsed);
        }
    }

    /**
     * 获取当前折叠状态
     */
    getIsCollapsed() {
        return this.isCollapsed;
    }

    /**
     * 设置面板切换回调
     */
    setPanelChangeCallback(callback) {
        this.onPanelChange = callback;
    }

    /**
     * 设置折叠状态变化回调
     */
    setCollapseChangeCallback(callback) {
        this.onCollapseChange = callback;
    }

    /**
     * 设置宽度变化回调
     */
    setWidthChangeCallback(callback) {
        this.onWidthChange = callback;
    }

    /**
     * 获取当前激活的面板 ID
     */
    getActivePanelId() {
        return this.activePanel;
    }

    /**
     * 获取内容容器元素
     * 用于后续渲染具体内容
     */
    getContentContainer() {
        return this.contentContainer;
    }

    /**
     * 获取当前宽度
     */
    getCurrentWidth() {
        return this.getWidth();
    }

    /**
     * 渲染面板内容
     * @param {string} panelId 面板ID
     * @param {any} data 面板需要的数据
     */
    renderPanelContent(panelId, data = null) {
        const container = this.getContentContainer();
        if (!container) return;

        container.innerHTML = '';

        switch (panelId) {
            case 'search':
                this.renderSearchPanel(container, data);
                break;
            case 'tags':
                this.renderTagsPanel(container, data);
                break;
            case 'archive':
                this.renderArchivePanel(container, data);
                break;
            case 'recent':
                this.renderRecentPanel(container, data);
                break;
            case 'trash':
                this.renderTrashPanel(container, data);
                break;
            default:
                container.innerHTML = `
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
     * HTML 转义工具
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
     * 设置设置按钮点击回调
     */
    setSettingsClickCallback(callback) {
        this.onSettingsClick = callback;
    }

    /**
     * 渲染归档面板（按创建日期年-月分组）
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
     * @param {string} noteId 笔记ID
     */
    setActiveSearchResult(noteId) {
        this.activeSearchResultId = noteId;
    }

    /**
     * 更新搜索结果选中状态（重新渲染高亮）
     */
    refreshSearchResultSelection(container) {
        const resultsContainer = container.querySelector('.search-results-container');
        if (!resultsContainer) return;

        // 移除所有active类
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
        // 如果有保存的搜索状态，使用它（切换面板回来时恢复状态）
        let query = this.lastSearchQuery;
        let results = this.lastSearchResults;

        // 如果没有保存的状态，才使用传入的数据
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

        // 绑定输入事件实现动态搜索
        const searchInput = container.querySelector('.sidebar-search-input');
        // 聚焦但不选中光标，保持用户之前的输入位置
        searchInput.focus();
        searchInput.addEventListener('input', debounce((e) => {
            const value = e.target.value.trim();
            window.eventBus.emit(EventTypes.SEARCH.SIDEBAR_SEARCH_INPUT, value);
        }, 200));
    }

    /**
     * 更新搜索结果（不重新渲染输入框，避免光标位置丢失）
     */
    updateSearchResults(container, results, query) {
        // 保存搜索状态
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
     * 生成搜索预览片段，包含匹配关键词的上下文
     */
    generateSearchPreview(content, query) {
        if (!content || !query) return '';

        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerContent.indexOf(lowerQuery);

        if (index === -1) {
            // 内容中没有匹配，可能匹配在标题或标签，取前80字符
            const snippet = content.replace(/\s+/g, ' ').trim().slice(0, 80);
            if (!snippet) return '';
            return this.escapeHtml(snippet) + (content.length > 80 ? '...' : '');
        }

        // 提取匹配位置周围的上下文：约25字符前，65字符后
        const start = Math.max(0, index - 20);
        const end = Math.min(content.length, index + query.length + 60);
        let snippet = content.slice(start, end);

        // 清理多余空白
        snippet = snippet.replace(/\s+/g, ' ').trim();

        // 转义并高亮
        return this.highlightMatch(this.escapeHtml(snippet), query);
    }

    /**
     * 高亮匹配的关键词
     * 将所有匹配位置用<mark>标签包裹
     */
    highlightMatch(text, query) {
        if (!query || !text) return text;

        const lowerQuery = query.toLowerCase();
        const lowerText = text.toLowerCase();
        let result = '';
        let lastIndex = 0;
        let index = lowerText.indexOf(lowerQuery);

        while (index !== -1) {
            // 添加匹配前的文本
            result += text.slice(lastIndex, index);
            // 添加高亮的匹配部分
            result += `<mark>${text.slice(index, index + query.length)}</mark>`;

            lastIndex = index + query.length;
            index = lowerText.indexOf(lowerQuery, lastIndex);
        }

        // 添加剩余文本
        result += text.slice(lastIndex);

        return result;
    }
}
