/**
 * 标签栏组件
 * 负责标签页的创建、切换、关闭渲染
 */
import { escapeHtml } from '../../utils/helpers.js';

export class TabBar {
    constructor() {
        this.tabBar = document.getElementById('tabBar');
    }

    /**
     * 创建笔记标签页
     * @param {Object} noteData 笔记数据
     */
    createNoteTab(noteData) {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.tabId = noteData.id;
        tab.innerHTML = `
            <div class="tab-icon-title">
                <i class="fas fa-file-alt"></i>
                <span class="tab-title">${escapeHtml(noteData.title) || '无标题'}</span>
            </div>
            <span class="tab-close"><i class="fas fa-times"></i></span>
        `;

        // 插入到搜索标签页之后
        const searchTab = this.tabBar.querySelector('.tab[data-tab-id="search"]');
        searchTab.parentNode.insertBefore(tab, searchTab.nextSibling);
    }

    /**
     * 切换到指定标签页
     * @param {string|number} tabId 标签页ID
     */
    switchToTab(tabId) {
        // 更新标签页状态
        this.tabBar.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tabId === tabId.toString()) {
                tab.classList.add('active');
            }
        });
    }

    /**
     * 关闭指定标签页
     * @param {string|number} noteId 笔记ID
     */
    closeNoteTab(noteId) {
        const tab = this.tabBar.querySelector(`.tab[data-tab-id="${noteId}"]`);
        if (tab) {
            tab.remove();
        }
    }

    /**
     * 更新标签页标题
     * @param {string|number} noteId 笔记ID
     * @param {string} newTitle 新标题
     */
    updateTabTitle(noteId, newTitle) {
        const tabTitle = this.tabBar.querySelector(`.tab[data-tab-id="${noteId}"] .tab-title`);
        if (tabTitle) {
            tabTitle.textContent = newTitle || '无标题';
        }
    }

    /**
     * 获取当前激活的标签页ID
     * @returns {string|null} 激活的标签页ID
     */
    getActiveTabId() {
        const activeTab = this.tabBar.querySelector('.tab.active');
        return activeTab ? activeTab.dataset.tabId : null;
    }
}
