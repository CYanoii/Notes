/**
 * 标签管理器 - 负责标签的 CRUD 操作
 */
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

// 默认颜色预设
const DEFAULT_COLORS = [
  '#4299e1', // 蓝色
  '#48bb78', // 绿色
  '#ed8936', // 橙色
  '#f56565', // 红色
  '#9f7aea', // 紫色
  '#ed64a6', // 粉色
  '#ecc94b', // 黄色
  '#805ad5', // 深紫
];

class TagsManager {
  constructor() {
    this.notesDir = path.join(app.getPath('userData'), 'notes');
    this.tagsIndexFile = path.join(this.notesDir, 'tags-index.json');
  }

  // 初始化 - 确保标签目录和索引文件存在
  async initialize() {
    await fs.mkdir(this.notesDir, { recursive: true });
    if (!await this.exists(this.tagsIndexFile)) {
      await this.saveTagsIndex({ tags: [], lastUpdated: new Date().toISOString() });
    }
  }

  // 创建新标签
  async createTag(name, color = null) {
    // 如果没有提供颜色，随机选一个默认颜色
    if (!color) {
      color = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
    }

    const tagId = Date.now().toString();
    const tag = {
      id: tagId,
      name: name.trim(),
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const index = await this.loadTagsIndex();
    index.tags.push(tag);
    index.lastUpdated = new Date().toISOString();
    await this.saveTagsIndex(index);

    return tag;
  }

  // 获取所有标签，按名称排序
  async getAllTags() {
    const index = await this.loadTagsIndex();
    return index.tags.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }

  // 获取单个标签
  async getTag(tagId) {
    const index = await this.loadTagsIndex();
    return index.tags.find(tag => tag.id === tagId);
  }

  // 更新标签
  async updateTag(tagId, updates) {
    const index = await this.loadTagsIndex();
    const tagIndex = index.tags.findIndex(tag => tag.id === tagId);

    if (tagIndex === -1) {
      return null;
    }

    const updatedTag = {
      ...index.tags[tagIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    index.tags[tagIndex] = updatedTag;
    index.lastUpdated = new Date().toISOString();
    await this.saveTagsIndex(index);

    return updatedTag;
  }

  // 删除标签（仅从标签索引中删除）
  async deleteTag(tagId) {
    // 从标签索引中删除
    const index = await this.loadTagsIndex();
    index.tags = index.tags.filter(tag => tag.id !== tagId);
    index.lastUpdated = new Date().toISOString();
    await this.saveTagsIndex(index);

    return true;
  }

  // 根据ID批量获取标签详情
  async getTagsByIds(tagIds) {
    const allTags = await this.getAllTags();
    return tagIds
      .map(tagId => allTags.find(tag => tag.id === tagId))
      .filter(tag => tag !== undefined);
  }

  // 检查文件是否存在
  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // 加载标签索引
  async loadTagsIndex() {
    const data = await fs.readFile(this.tagsIndexFile, 'utf-8');
    return JSON.parse(data);
  }

  // 保存标签索引
  async saveTagsIndex(index) {
    await fs.writeFile(this.tagsIndexFile, JSON.stringify(index, null, 2), 'utf-8');
  }
}

module.exports = TagsManager;
