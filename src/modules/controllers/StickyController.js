/**
 * StickyController - 便签控制器
 * 处理便签增删改查的业务流程，协调视图层和数据层
 */
import { EventTypes } from '../core/EventTypes.js';

export class StickyController {
    constructor(stickyService, eventBus) {
        this.stickyService = stickyService;
        this.eventBus = eventBus;

        // 初始化事件监听
        this.initEventListeners();
    }

    /**
     * 初始化事件监听器（通过 EventBus 解耦）
     */
    initEventListeners() {
        // 便签事件
        this.eventBus.on(EventTypes.STICKY.LOAD, (stickyPageId) => this.loadStickies(stickyPageId));
        this.eventBus.on(EventTypes.STICKY.CREATE, (stickyPageId, position) => this.createSticky(stickyPageId, position));
        this.eventBus.on(EventTypes.STICKY.UPDATE, ({ stickyPageId, stickyId, updates }) => this.updateSticky(stickyPageId, stickyId, updates));
        this.eventBus.on(EventTypes.STICKY.DELETE, ({ stickyPageId, stickyId }) => this.deleteSticky(stickyPageId, stickyId));
        this.eventBus.on(EventTypes.STICKY.BRING_TO_FRONT, ({ stickyPageId, stickyId }) => this.bringToFront(stickyPageId, stickyId));
    }

    /**
     * 加载便签
     * @param {string} stickyPageId 便签页 ID
     * @returns {Promise<Array>} 便签数组
     */
    async loadStickies(stickyPageId) {
        try {
            return await this.stickyService.getStickies(stickyPageId);
        } catch (error) {
            console.error('加载便签失败:', error);
            return [];
        }
    }

    /**
     * 创建便签
     * @param {string} stickyPageId 便签页 ID
     * @param {Object} position 位置 { x, y }
     * @returns {Promise<Object>} 创建的便签
     */
    async createSticky(stickyPageId, position) {
        try {
            return await this.stickyService.createSticky(stickyPageId, position);
        } catch (error) {
            console.error('创建便签失败:', error);
            return null;
        }
    }

    /**
     * 更新便签
     * @param {string} stickyPageId 便签页 ID
     * @param {string} stickyId 便签 ID
     * @param {Object} updates 更新内容
     * @returns {Promise<Object>} 更新后的便签
     */
    async updateSticky(stickyPageId, stickyId, updates) {
        try {
            return await this.stickyService.updateSticky(stickyPageId, stickyId, updates);
        } catch (error) {
            // 忽略 "not found" 错误
            if (!error.message.includes('not found')) {
                console.error('更新便签失败:', error);
            }
            return null;
        }
    }

    /**
     * 删除便签
     * @param {string} stickyPageId 便签页 ID
     * @param {string} stickyId 便签 ID
     */
    async deleteSticky(stickyPageId, stickyId) {
        try {
            await this.stickyService.deleteSticky(stickyPageId, stickyId);
        } catch (error) {
            console.error('删除便签失败:', error);
        }
    }

    /**
     * 将便签置于顶层
     * @param {string} stickyPageId 便签页 ID
     * @param {string} stickyId 便签 ID
     * @returns {Promise<Object>} 更新后的便签
     */
    async bringToFront(stickyPageId, stickyId) {
        try {
            return await this.stickyService.bringToFront(stickyPageId, stickyId);
        } catch (error) {
            console.error('置顶便签失败:', error);
            return null;
        }
    }
}
