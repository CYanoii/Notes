/**
 * StickyManager - 便签墙数据管理器
 * 负责管理便签墙的便签数据，存储在 {notesDir}/{stickyPageId}/stickies.json
 */
const fs = require('fs').promises;
const path = require('path');

class StickyManager {
  constructor(notesDir) {
    this.notesDir = notesDir;
  }

  /**
   * 获取便签墙的数据目录
   * @param {string} stickyPageId 便签页 ID
   * @returns {string} 便签墙目录路径
   */
  getStickyPageDir(stickyPageId) {
    return path.join(this.notesDir, stickyPageId);
  }

  /**
   * 获取便签数据文件路径
   * @param {string} stickyPageId 便签页 ID
   * @returns {string} stickies.json 文件路径
   */
  getStickiesFilePath(stickyPageId) {
    return path.join(this.getStickyPageDir(stickyPageId), 'stickies.json');
  }

  /**
   * 初始化便签墙目录
   * @param {string} stickyPageId 便签页 ID
   */
  async initialize(stickyPageId) {
    const stickyPageDir = this.getStickyPageDir(stickyPageId);
    await fs.mkdir(stickyPageDir, { recursive: true });
  }

  /**
   * 获取便签墙的所有便签
   * @param {string} stickyPageId 便签页 ID
   * @returns {Promise<Array>} 便签数组
   */
  async getStickies(stickyPageId) {
    const stickiesFile = this.getStickiesFilePath(stickyPageId);
    try {
      const data = await fs.readFile(stickiesFile, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.stickies || [];
    } catch (error) {
      // 文件不存在时返回空数组
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * 保存便签数据
   * @param {string} stickyPageId 便签页 ID
   * @param {Array} stickies 便签数组
   */
  async saveStickies(stickyPageId, stickies) {
    const stickyPageDir = this.getStickyPageDir(stickyPageId);
    await fs.mkdir(stickyPageDir, { recursive: true });

    const stickiesFile = this.getStickiesFilePath(stickyPageId);
    await fs.writeFile(stickiesFile, JSON.stringify({ stickies }, null, 2), 'utf-8');
  }

  /**
   * 创建新便签
   * @param {string} stickyPageId 便签页 ID
   * @param {Object} data 便签数据 { x, y }
   * @returns {Promise<Object>} 创建的便签
   */
  async createSticky(stickyPageId, { x, y }) {
    const stickies = await this.getStickies(stickyPageId);

    // 计算新的 z-index
    const maxZIndex = stickies.length > 0
      ? Math.max(...stickies.map(s => s.zIndex || 0))
      : 0;

    const newSticky = {
      id: Date.now().toString(),
      x,
      y,
      zIndex: maxZIndex + 1,
      content: '',
      color: '#fff9c4',
      headerColor: '#fff176',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    stickies.push(newSticky);
    await this.saveStickies(stickyPageId, stickies);

    return newSticky;
  }

  /**
   * 更新便签
   * @param {string} stickyPageId 便签页 ID
   * @param {string} stickyId 便签 ID
   * @param {Object} updates 更新内容 { x?, y?, zIndex?, content?, color?, headerColor? }
   * @returns {Promise<Object>} 更新后的便签
   */
  async updateSticky(stickyPageId, stickyId, updates) {
    const stickies = await this.getStickies(stickyPageId);
    const index = stickies.findIndex(s => s.id === stickyId);

    if (index === -1) {
      throw new Error(`Sticky ${stickyId} not found`);
    }

    stickies[index] = {
      ...stickies[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.saveStickies(stickyPageId, stickies);

    return stickies[index];
  }

  /**
   * 删除便签
   * @param {string} stickyPageId 便签页 ID
   * @param {string} stickyId 便签 ID
   */
  async deleteSticky(stickyPageId, stickyId) {
    const stickies = await this.getStickies(stickyPageId);
    const filteredStickies = stickies.filter(s => s.id !== stickyId);

    await this.saveStickies(stickyPageId, filteredStickies);
  }

  /**
   * 将便签置于最顶层
   * @param {string} stickyPageId 便签页 ID
   * @param {string} stickyId 便签 ID
   * @returns {Promise<Object>} 更新后的便签
   */
  async bringToFront(stickyPageId, stickyId) {
    const stickies = await this.getStickies(stickyPageId);
    const maxZIndex = stickies.length > 0
      ? Math.max(...stickies.map(s => s.zIndex || 0))
      : 0;

    return await this.updateSticky(stickyPageId, stickyId, { zIndex: maxZIndex + 1 });
  }

  /**
   * 归档便签
   * @param {string} stickyPageId 便签页 ID
   * @param {string} stickyId 便签 ID
   * @returns {Promise<Object>} 更新后的便签
   */
  async archiveSticky(stickyPageId, stickyId) {
    return await this.updateSticky(stickyPageId, stickyId, { archivedAt: new Date().toISOString() });
  }

  /**
   * 取消归档便签
   * @param {string} stickyPageId 便签页 ID
   * @param {string} stickyId 便签 ID
   * @returns {Promise<Object>} 更新后的便签
   */
  async unarchiveSticky(stickyPageId, stickyId) {
    const stickies = await this.getStickies(stickyPageId);
    const sticky = stickies.find(s => s.id === stickyId);
    if (!sticky) {
      throw new Error(`Sticky ${stickyId} not found`);
    }

    // 取消归档时恢复zIndex到最大值
    const maxZIndex = stickies.length > 0
      ? Math.max(...stickies.map(s => s.zIndex || 0))
      : 0;

    const updates = { archivedAt: null, zIndex: maxZIndex + 1 };
    return await this.updateSticky(stickyPageId, stickyId, updates);
  }

  /**
   * 获取已归档便签（按归档时间从下到上排序，新的在上）
   * @param {string} stickyPageId 便签页 ID
   * @returns {Promise<Array>} 已归档便签数组
   */
  async getArchivedStickies(stickyPageId) {
    const stickies = await this.getStickies(stickyPageId);
    return stickies
      .filter(s => s.archivedAt)
      .sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
  }
}

module.exports = StickyManager;
