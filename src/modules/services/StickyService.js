/**
 * StickyService - 便签服务
 * 封装与 Electron API 的交互，管理便签墙数据
 */
export class StickyService {
  constructor() {}

  /**
   * 获取便签墙的所有便签
   * @param {string} stickyPageId 便签页 ID
   * @returns {Promise<Array>} 便签数组
   */
  async getStickies(stickyPageId) {
    return await window.electronAPI.getStickies(stickyPageId);
  }

  /**
   * 创建新便签
   * @param {string} stickyPageId 便签页 ID
   * @param {Object} position 便签位置 { x, y }
   * @returns {Promise<Object>} 创建的便签
   */
  async createSticky(stickyPageId, position) {
    return await window.electronAPI.createSticky(stickyPageId, position);
  }

  /**
   * 更新便签
   * @param {string} stickyPageId 便签页 ID
   * @param {string} stickyId 便签 ID
   * @param {Object} updates 更新内容 { x?, y?, zIndex?, content? }
   * @returns {Promise<Object>} 更新后的便签
   */
  async updateSticky(stickyPageId, stickyId, updates) {
    return await window.electronAPI.updateSticky(stickyPageId, stickyId, updates);
  }

  /**
   * 删除便签
   * @param {string} stickyPageId 便签页 ID
   * @param {string} stickyId 便签 ID
   */
  async deleteSticky(stickyPageId, stickyId) {
    await window.electronAPI.deleteSticky(stickyPageId, stickyId);
  }

  /**
   * 将便签置于最顶层
   * @param {string} stickyPageId 便签页 ID
   * @param {string} stickyId 便签 ID
   * @returns {Promise<Object>} 更新后的便签
   */
  async bringToFront(stickyPageId, stickyId) {
    return await window.electronAPI.bringStickyToFront(stickyPageId, stickyId);
  }

  /**
   * 归档便签
   * @param {string} stickyPageId 便签页 ID
   * @param {string} stickyId 便签 ID
   * @returns {Promise<Object>} 更新后的便签
   */
  async archiveSticky(stickyPageId, stickyId) {
    return await window.electronAPI.archiveSticky(stickyPageId, stickyId);
  }

  /**
   * 取消归档便签
   * @param {string} stickyPageId 便签页 ID
   * @param {string} stickyId 便签 ID
   * @returns {Promise<Object>} 更新后的便签
   */
  async unarchiveSticky(stickyPageId, stickyId) {
    return await window.electronAPI.unarchiveSticky(stickyPageId, stickyId);
  }

  /**
   * 获取已归档便签
   * @param {string} stickyPageId 便签页 ID
   * @returns {Promise<Array>} 已归档便签数组
   */
  async getArchivedStickies(stickyPageId) {
    return await window.electronAPI.getArchivedStickies(stickyPageId);
  }
}

// 导出单例
export const stickyService = new StickyService();
