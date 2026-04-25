/**
 * 首页标签筛选组件
 * 负责渲染和管理首页的标签筛选栏
 */
import { escapeHtml } from '../../utils/helpers.js';

export class TagFilter {
    constructor() {
        this.container = document.getElementById('tagFilterContainer');
        this.onTagStateChange = null;
        this.onClearFilter = null;
    }

    /**
     * 设置事件回调
     * @param {Function} onTagStateChange 标签状态变化回调 (tagId, newState)
     * @param {Function} onClearFilter 清除筛选回调
     */
    setCallbacks(onTagStateChange, onClearFilter) {
        this.onTagStateChange = onTagStateChange;
        this.onClearFilter = onClearFilter;
    }

    /**
     * 渲染标签筛选栏
     * @param {Array} tags 标签列表 [{id, name, color}]
     * @param {Object} tagStates 标签状态映射 {tagId: 'unselected'|'selected'|'blocked'}
     */
    renderTagFilter(tags, tagStates) {
        if (!this.container) return;

        this.container.innerHTML = '';

        if (!tags || tags.length === 0) {
            this.container.innerHTML = '<span class="tag-filter-empty">暂无标签</span>';
            return;
        }

        // 渲染标签项
        tags.forEach(tag => {
            const state = tagStates[tag.id] || 'unselected';
            const tagItem = this.createTagItem(tag, state);
            this.container.appendChild(tagItem);
        });

        // 检查是否有任何标签处于非未选中状态，如果有则显示清除按钮
        const hasActiveFilter = Object.values(tagStates).some(state => state !== 'unselected');
        if (hasActiveFilter) {
            const clearBtn = this.createClearButton();
            this.container.appendChild(clearBtn);
        }
    }

    /**
     * 创建单个标签项
     * @param {Object} tag 标签数据
     * @param {string} state 当前状态
     * @returns {HTMLElement}
     */
    createTagItem(tag, state) {
        const tagItem = document.createElement('div');
        tagItem.className = `tag-filter-item ${state}`;
        tagItem.dataset.tagId = tag.id;

        tagItem.innerHTML = `
            <span class="tag-filter-color" style="background-color: ${tag.color || '#718096'}"></span>
            <span class="tag-filter-name">${escapeHtml(tag.name)}</span>
        `;

        tagItem.addEventListener('click', () => {
            if (this.onTagStateChange) {
                const nextState = this.getNextState(state);
                this.onTagStateChange(tag.id, nextState);
            }
        });

        return tagItem;
    }

    /**
     * 创建清除筛选按钮
     * @returns {HTMLElement}
     */
    createClearButton() {
        const clearBtn = document.createElement('div');
        clearBtn.className = 'tag-filter-clear';
        clearBtn.innerHTML = '<i class="fas fa-times"></i> 清除筛选';
        clearBtn.addEventListener('click', () => {
            if (this.onClearFilter) {
                this.onClearFilter();
            }
        });
        return clearBtn;
    }

    /**
     * 获取下一个状态（循环切换）
     * @param {string} currentState 当前状态
     * @returns {string} 下一个状态
     */
    getNextState(currentState) {
        const stateOrder = ['unselected', 'selected', 'blocked'];
        const currentIndex = stateOrder.indexOf(currentState);
        const nextIndex = (currentIndex + 1) % stateOrder.length;
        return stateOrder[nextIndex];
    }
}