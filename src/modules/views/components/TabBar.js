/**
 * 标签栏组件
 * 负责标签页的创建、切换、关闭渲染
 */
import { escapeHtml } from '../../utils/helpers.js';

export class TabBar {
    constructor() {
        this.tabBar = document.getElementById('tabBar');
        this.draggedTab = null;
        this.init();
    }

    /**
     * 初始化组件
     */
    init() {
        this.bindDragEvents();
    }

    /**
     * 绑定拖拽事件
     */
    bindDragEvents() {
        this.tabBar.addEventListener('dragstart', (e) => this.onDragStart(e));
        this.tabBar.addEventListener('dragend', (e) => this.onDragEnd(e));
        this.tabBar.addEventListener('dragover', (e) => this.onDragOver(e));
        this.tabBar.addEventListener('drop', (e) => this.onDrop(e));
        this.tabBar.addEventListener('dragleave', (e) => this.onDragLeave(e));
    }

    /**
     * 创建笔记标签页
     * @param {Object} noteData 笔记数据
     */
    createNoteTab(noteData) {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.tabId = noteData.id;
        tab.draggable = true;
        tab.innerHTML = `
            <div class="tab-icon-title">
                <i class="fas fa-file-alt"></i>
                <span class="tab-title">${escapeHtml(noteData.title) || '无标题'}</span>
            </div>
            <span class="tab-close"><i class="fas fa-times"></i></span>
        `;

        // 插入到主页标签页之后
        const homeTab = this.tabBar.querySelector('.tab[data-tab-id="home"]');
        homeTab.parentNode.insertBefore(tab, homeTab.nextSibling);
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

    /**
     * 开始拖拽
     */
    onDragStart(e) {
        const tab = e.target.closest('.tab');
        if (!tab || tab.dataset.tabId === 'home') {
            e.preventDefault();
            return;
        }
        this.draggedTab = tab;
        tab.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tab.dataset.tabId);
    }

    /**
     * 结束拖拽
     */
    onDragEnd(e) {
        const tab = e.target.closest('.tab');
        if (tab) {
            tab.classList.remove('dragging');
        }
        this.draggedTab = null;
        this.tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'));
    }

    /**
     * 拖拽经过其他标签
     */
    onDragOver(e) {
        e.preventDefault();
        const tab = e.target.closest('.tab');
        if (!tab || tab === this.draggedTab || tab.dataset.tabId === 'home') {
            return;
        }
        e.dataTransfer.dropEffect = 'move';
        this.tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'));
        tab.classList.add('drag-over');
    }

    /**
     * 放置标签
     */
    onDrop(e) {
        e.preventDefault();
        const targetTab = e.target.closest('.tab');
        if (!targetTab || !this.draggedTab || targetTab === this.draggedTab || targetTab.dataset.tabId === 'home') {
            return;
        }

        // 交换位置
        const parent = this.draggedTab.parentNode;
        const draggedIndex = Array.from(parent.children).indexOf(this.draggedTab);
        const targetIndex = Array.from(parent.children).indexOf(targetTab);

        if (draggedIndex < targetIndex) {
            parent.insertBefore(this.draggedTab, targetTab.nextSibling);
        } else {
            parent.insertBefore(this.draggedTab, targetTab);
        }

        this.onDragEnd(e);
    }

    /**
     * 拖拽离开
     */
    onDragLeave(e) {
        const tab = e.target.closest('.tab');
        if (tab && !tab.contains(e.relatedTarget)) {
            tab.classList.remove('drag-over');
        }
    }
}
