/**
 * 配置管理器 - 负责应用配置的持久化存储
 */
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class ConfigManager {
  constructor() {
    this.configFile = path.join(app.getPath('userData'), 'settings.json');
    this.config = {};
    this.initialized = false;
  }

  // 初始化 - 加载配置文件
  async initialize() {
    try {
      const data = await fs.readFile(this.configFile, 'utf-8');
      this.config = JSON.parse(data);
    } catch (error) {
      // 文件不存在或解析失败，使用默认配置
      this.config = {
        dataRootPath: '',
        version: 1
      };
      await this.save();
    }
    this.initialized = true;
  }

  // 保存配置到文件
  async save() {
    await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  // 获取配置值
  get(key) {
    return this.config[key];
  }

  // 获取所有配置
  getAll() {
    return { ...this.config };
  }

  // 设置配置值
  async set(key, value) {
    this.config[key] = value;
    await this.save();
  }

  // 设置多个配置值
  async setMultiple(updates) {
    for (const [key, value] of Object.entries(updates)) {
      this.config[key] = value;
    }
    await this.save();
  }

  // 获取数据根目录
  getDataRootPath() {
    const customPath = this.config.dataRootPath;
    if (customPath && customPath.trim()) {
      // 用户选择的路径直接作为数据根目录
      return customPath;
    }
    // 默认路径
    return path.join(app.getPath('userData'), 'notes');
  }
}

module.exports = ConfigManager;