/**
 * 页面状态服务
 * 负责页面状态的持久化存储
 */
export class PageStateService {
    constructor() {
        this.defaultState = {
            sidebar: {
                isCollapsed: false,
                width: 280
            },
            openTabs: [],
            activeTabId: 'home'
        };
    }

    /**
     * 加载页面状态
     */
    async load() {
        try {
            const state = await window.electronAPI.loadPageState();
            return state || this.defaultState;
        } catch (error) {
            console.error('加载页面状态失败:', error);
            return this.defaultState;
        }
    }

    /**
     * 保存页面状态
     */
    async save(state) {
        try {
            await window.electronAPI.savePageState(state);
        } catch (error) {
            console.error('保存页面状态失败:', error);
        }
    }
}