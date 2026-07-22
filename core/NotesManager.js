/**
 * 笔记管理器 - 负责笔记的 CRUD 操作
 */
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class NotesManager {
  constructor(dataRootPath) {
    // 如果传入了自定义路径，使用自定义路径；否则使用默认路径
    if (dataRootPath) {
      this.notesDir = dataRootPath;
    } else {
      this.notesDir = path.join(app.getPath('userData'), 'notes');
    }
    this.indexFile = path.join(this.notesDir, 'notes-index.json');
  }

  // 初始化 - 确保笔记目录和索引文件存在
  async initialize() {
    await fs.mkdir(this.notesDir, { recursive: true });
    if (!await this.exists(this.indexFile)) {
      await this.saveIndex({ notes: [], lastUpdated: new Date().toISOString() });
    }
  }

  // 创建新笔记
  async createNote(title = '', pageType = 'note') {
    const noteId = Date.now().toString();
    const noteDir = path.join(this.notesDir, noteId);

    await fs.mkdir(noteDir, { recursive: true });
    await fs.mkdir(path.join(noteDir, 'assets'), { recursive: true });

    const metadata = {
      id: noteId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      status: 'active',
      pageType: pageType,
      editStatus: 'editing',
      version: 0,
      versionNote: '',
      publishedAt: null
    };

    await this.saveMetadata(noteId, metadata);
    await this.saveContent(noteId, ``);
    await this.addToIndex(metadata);

    return metadata;
  }

  // 删除笔记（移入回收站，不立即删除）
  async deleteNote(noteId) {
    await this.moveToTrash(noteId);
  }

  // 将笔记移入回收站
  async moveToTrash(noteId) {
    const metaFile = path.join(this.notesDir, noteId, 'metadata.json');
    if (!await this.exists(metaFile)) {
      throw new Error(`笔记不存在: ${noteId}`);
    }

    const metadata = JSON.parse(await fs.readFile(metaFile, 'utf-8'));
    const updatedMetadata = {
      ...metadata,
      status: 'trashed',
      deletedAt: new Date().toISOString()
    };

    await this.saveMetadata(noteId, updatedMetadata);
    await this.updateIndex(noteId, updatedMetadata);
  }

  // 从回收站恢复笔记
  async restoreFromTrash(noteId) {
    const metaFile = path.join(this.notesDir, noteId, 'metadata.json');
    if (!await this.exists(metaFile)) {
      throw new Error(`笔记不存在: ${noteId}`);
    }

    const metadata = JSON.parse(await fs.readFile(metaFile, 'utf-8'));
    const { status, deletedAt, ...rest } = metadata;
    const updatedMetadata = {
      ...rest,
      status: 'active'
    };

    await this.saveMetadata(noteId, updatedMetadata);
    await this.updateIndex(noteId, updatedMetadata);
  }

  // 永久删除笔记（真正删除）
  async deletePermanently(noteId) {
    await this.removeFromIndex(noteId);
    const noteDir = path.join(this.notesDir, noteId);
    await fs.rm(noteDir, { recursive: true, force: true });
  }

  // 获取所有笔记（只返回活跃状态，排除回收站）
  async getAllNotes() {
    const index = await this.loadIndex();
    return index.notes
      .filter(note => note.status !== 'trashed')
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  // 获取所有回收站中的笔记
  async getTrashedNotes() {
    const index = await this.loadIndex();
    return index.notes
      .filter(note => note.status === 'trashed')
      .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
  }

  // 获取最近编辑的笔记
  async getRecentNotes(limit = 10) {
    const allNotes = await this.getAllNotes();
    return allNotes.slice(0, limit);
  }

  // 获取笔记内容
  async getNoteContent(noteId) {
    const noteFile = path.join(this.notesDir, noteId, 'note.md');
    if (!await this.exists(noteFile)) {
      return '';
    }
    return await fs.readFile(noteFile, 'utf-8');
  }

  // 搜索笔记 - 搜索标题和内容
  async searchNotes(query) {
    const allNotes = await this.getAllNotes();
    const lowerQuery = query.toLowerCase();

    const matchingNotes = [];

    for (const note of allNotes) {
      let matches = false;

      // 检查标题
      const titleMatches = note.title.toLowerCase().includes(lowerQuery);

      // 检查内容
      let contentMatches = false;
      if (!titleMatches) {
        // 只有标题不匹配，才需要读取内容检查
        const content = await this.getNoteContent(note.id);
        contentMatches = content.toLowerCase().includes(lowerQuery);
      }

      matches = titleMatches || contentMatches;

      if (matches) {
        // 返回完整笔记对象（包含内容用于前端预览）
        const fullNote = await this.getNote(note.id);
        matchingNotes.push(fullNote);
      }
    }

    // 按更新时间降序排序，最新的排在前面
    return matchingNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  // 获取单个笔记
  async getNote(noteId) {
    const metaFile = path.join(this.notesDir, noteId, 'metadata.json');
    const noteFile = path.join(this.notesDir, noteId, 'note.md');

    if (!await this.exists(metaFile)) {
      return null;
    }

    const metadata = JSON.parse(await fs.readFile(metaFile, 'utf-8'));
    const content = await fs.readFile(noteFile, 'utf-8');

    return { ...metadata, content };
  }

  // 更新笔记
  async updateNote(noteId, updates) {
    const metaFile = path.join(this.notesDir, noteId, 'metadata.json');

    if (!await this.exists(metaFile)) {
      return null;
    }

    const metadata = JSON.parse(await fs.readFile(metaFile, 'utf-8'));
    const { content, ...metadataUpdates } = updates;
    const updatedMetadata = {
      ...metadata,
      ...metadataUpdates,
      updatedAt: new Date().toISOString()
    };

    await this.saveMetadata(noteId, updatedMetadata);

    if (content !== undefined) {
      await this.saveContent(noteId, content);
    }

    await this.updateIndex(noteId, updatedMetadata);

    return updatedMetadata;
  }

  // 保存资源文件到笔记的 assets 文件夹
  async saveAsset(noteId, fileName, fileData) {
    const assetsDir = path.join(this.notesDir, noteId, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    // 将 base64 数据转换为 Buffer 并保存
    const buffer = Buffer.from(fileData, 'base64');
    const filePath = path.join(assetsDir, fileName);
    await fs.writeFile(filePath, buffer);

    // 返回文件路径
    return filePath;
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

  // 保存笔记内容
  async saveContent(noteId, content) {
    const noteFile = path.join(this.notesDir, noteId, 'note.md');
    await fs.writeFile(noteFile, content, 'utf-8');
  }

  // 保存元数据
  async saveMetadata(noteId, metadata) {
    const metaFile = path.join(this.notesDir, noteId, 'metadata.json');
    await fs.writeFile(metaFile, JSON.stringify(metadata, null, 2), 'utf-8');
  }


  // 加入索引
  async addToIndex(noteMetadata) {
    const index = await this.loadIndex();
    // 这里引入了全部的元数据使索引文件和笔记元数据文件结构完全一样，可以考虑只保留索引需要的字段
    index.notes.push(noteMetadata);
    index.lastUpdated = new Date().toISOString();
    await this.saveIndex(index);
  }

  // 从索引中移除
  async removeFromIndex(noteId) {
    const index = await this.loadIndex();
    index.notes = index.notes.filter(n => n.id !== noteId);
    index.lastUpdated = new Date().toISOString();
    await this.saveIndex(index);
  }

  // 更新索引中的信息
  async updateIndex(noteId, metadata) {
    const index = await this.loadIndex();
    const noteIndex = index.notes.findIndex(n => n.id === noteId);
    if (noteIndex !== -1) {
      // 这里引入了全部的元数据使索引文件和笔记元数据文件结构完全一样，可以考虑只保留索引需要的字段
      index.notes[noteIndex] = metadata;
      index.lastUpdated = new Date().toISOString();
      await this.saveIndex(index);
    }
  }

  // 加载索引
  async loadIndex() {
    const data = await fs.readFile(this.indexFile, 'utf-8');
    return JSON.parse(data);
  }

  // 保存索引
  async saveIndex(index) {
    await fs.writeFile(this.indexFile, JSON.stringify(index, null, 2), 'utf-8');
  }

  // 迁移旧笔记的 pageType 字段
  async migratePageTypes() {
    const index = await this.loadIndex();
    let migrated = 0;
    for (const note of index.notes) {
      if (!note.pageType) {
        note.pageType = 'note';
        await this.saveMetadata(note.id, note);
        migrated++;
      }
    }
    if (migrated > 0) {
      await this.saveIndex(index);
    }
    return migrated;
  }

  // ==================== 版本管理方法 ====================

  /**
   * 获取笔记元数据（不含内容）
   */
  async getNoteMetadata(noteId) {
    const metaFile = path.join(this.notesDir, noteId, 'metadata.json');
    if (!await this.exists(metaFile)) {
      return null;
    }
    return JSON.parse(await fs.readFile(metaFile, 'utf-8'));
  }

  /**
   * 复制资源文件夹到目标目录
   */
  async copyAssetsToDir(noteId, destDir) {
    const assetsSrc = path.join(this.notesDir, noteId, 'assets');
    if (!await this.exists(assetsSrc)) {
      return;
    }
    await fs.mkdir(destDir, { recursive: true });
    const files = await fs.readdir(assetsSrc);
    for (const file of files) {
      const srcFile = path.join(assetsSrc, file);
      const destFile = path.join(destDir, file);
      await fs.copyFile(srcFile, destFile);
    }
  }

  /**
   * 从版本目录复制资源到笔记的 assets 目录
   */
  async copyAssetsFromVersionDir(noteId, versionDir) {
    const versionAssetsDir = path.join(versionDir, 'assets');
    const assetsDest = path.join(this.notesDir, noteId, 'assets');
    if (!await this.exists(versionAssetsDir)) {
      return;
    }
    // 清空现有 assets
    await fs.rm(assetsDest, { recursive: true, force: true });
    await fs.mkdir(assetsDest, { recursive: true });
    const files = await fs.readdir(versionAssetsDir);
    for (const file of files) {
      const srcFile = path.join(versionAssetsDir, file);
      const destFile = path.join(assetsDest, file);
      await fs.copyFile(srcFile, destFile);
    }
  }

  /**
   * 获取版本快照的元数据
   */
  async getVersionSnapshotMetadata(noteId, version) {
    const versionDir = path.join(this.notesDir, noteId, 'versions', `v${version}`);
    const metaFile = path.join(versionDir, 'metadata.json');
    if (!await this.exists(metaFile)) {
      return null;
    }
    return JSON.parse(await fs.readFile(metaFile, 'utf-8'));
  }

  /**
   * 发布笔记 - 创建新版本快照
   */
  async publishNote(noteId, versionNote = '') {
    const metadata = await this.getNoteMetadata(noteId);
    if (!metadata) {
      throw new Error(`笔记不存在: ${noteId}`);
    }

    const noteIdDir = path.join(this.notesDir, noteId);
    const content = await this.getNoteContent(noteId);
    const assetsSrc = path.join(noteIdDir, 'assets');

    // 递增版本号
    const newVersion = (metadata.version || 0) + 1;

    // 创建版本快照目录
    const versionDir = path.join(noteIdDir, 'versions', `v${newVersion}`);
    await fs.mkdir(path.join(versionDir, 'assets'), { recursive: true });

    // 保存版本快照内容
    await this.saveContentToPath(path.join(versionDir, 'note.md'), content);
    await this.copyAssetsToDir(noteId, path.join(versionDir, 'assets'));

    // 统计资源文件数量
    let assetCount = 0;
    if (await this.exists(assetsSrc)) {
      const files = await fs.readdir(assetsSrc);
      assetCount = files.length;
    }

    // 保存版本快照元数据（包含 title、excerpt）
    const snapshotMetadata = {
      version: newVersion,
      versionNote,
      publishedAt: new Date().toISOString(),
      title: metadata.title || '',
      excerpt: metadata.excerpt || '',
      contentSize: content.length,
      assetCount
    };
    await this.saveMetadataToPath(path.join(versionDir, 'metadata.json'), snapshotMetadata);

    // 更新主元数据
    const updatedMetadata = {
      ...metadata,
      editStatus: 'published',
      publishedAt: new Date().toISOString(),
      version: newVersion,
      versionNote
    };
    await this.saveMetadata(noteId, updatedMetadata);
    await this.updateIndex(noteId, updatedMetadata);

    return updatedMetadata;
  }

  /**
   * 放弃编辑 - 丢弃当前修改，恢复到最新发布版本
   */
  async abandonEdits(noteId) {
    const metadata = await this.getNoteMetadata(noteId);
    if (!metadata) {
      throw new Error(`笔记不存在: ${noteId}`);
    }

    const currentVersion = metadata.version;
    if (!currentVersion || currentVersion < 1) {
      throw new Error('没有可用的历史版本');
    }

    // 获取最新版本快照
    const versionDir = path.join(this.notesDir, noteId, 'versions', `v${currentVersion}`);
    const snapshotMetadata = await this.getVersionSnapshotMetadata(noteId, currentVersion);
    if (!snapshotMetadata) {
      throw new Error(`版本快照不存在: v${currentVersion}`);
    }

    // 恢复到快照内容
    const snapshotContent = await fs.readFile(path.join(versionDir, 'note.md'), 'utf-8');
    await this.saveContent(noteId, snapshotContent);
    await this.copyAssetsFromVersionDir(noteId, versionDir);

    // 恢复 title 和 excerpt
    const updatedMetadata = {
      ...metadata,
      title: snapshotMetadata.title || metadata.title,
      excerpt: snapshotMetadata.excerpt || metadata.excerpt,
      editStatus: 'published'  // 明确设置为 published
    };
    await this.saveMetadata(noteId, updatedMetadata);
    await this.updateIndex(noteId, updatedMetadata);

    // 返回包含 content 的完整数据
    return { ...updatedMetadata, content: snapshotContent };
  }

  /**
   * 恢复编辑 - 进入编辑态，加载发布版内容作为起点
   */
  async restoreToEditing(noteId) {
    const metadata = await this.getNoteMetadata(noteId);
    if (!metadata) {
      throw new Error(`笔记不存在: ${noteId}`);
    }

    if (metadata.editStatus !== 'published') {
      throw new Error('笔记不在已发布状态');
    }

    const currentVersion = metadata.version;
    if (!currentVersion || currentVersion < 1) {
      throw new Error('没有可用的历史版本');
    }

    // 获取最新版本快照
    const versionDir = path.join(this.notesDir, noteId, 'versions', `v${currentVersion}`);
    const snapshotMetadata = await this.getVersionSnapshotMetadata(noteId, currentVersion);
    if (!snapshotMetadata) {
      throw new Error(`版本快照不存在: v${currentVersion}`);
    }

    // 加载快照内容到草稿区
    const snapshotContent = await fs.readFile(path.join(versionDir, 'note.md'), 'utf-8');
    await this.saveContent(noteId, snapshotContent);
    await this.copyAssetsFromVersionDir(noteId, versionDir);

    // 恢复 title 和 excerpt 到草稿
    const updatedMetadata = {
      ...metadata,
      title: snapshotMetadata.title || metadata.title,
      excerpt: snapshotMetadata.excerpt || metadata.excerpt,
      editStatus: 'editing'
    };
    await this.saveMetadata(noteId, updatedMetadata);
    await this.updateIndex(noteId, updatedMetadata);

    return updatedMetadata;
  }

  /**
   * 回滚到指定版本
   */
  async rollbackToVersion(noteId, targetVersion) {
    const metadata = await this.getNoteMetadata(noteId);
    if (!metadata) {
      throw new Error(`笔记不存在: ${noteId}`);
    }

    const currentVersion = metadata.version;
    if (!currentVersion || currentVersion < 1) {
      throw new Error('没有可用的历史版本');
    }

    if (targetVersion < 1 || targetVersion > currentVersion) {
      throw new Error(`无效的版本号: ${targetVersion}`);
    }

    // 获取目标版本快照
    const versionDir = path.join(this.notesDir, noteId, 'versions', `v${targetVersion}`);
    const snapshotMetadata = await this.getVersionSnapshotMetadata(noteId, targetVersion);
    if (!snapshotMetadata) {
      throw new Error(`版本快照不存在: v${targetVersion}`);
    }

    // 恢复到目标版本内容
    const snapshotContent = await fs.readFile(path.join(versionDir, 'note.md'), 'utf-8');
    await this.saveContent(noteId, snapshotContent);
    await this.copyAssetsFromVersionDir(noteId, versionDir);

    // 更新元数据
    // 回滚到 vX 意味着回滚到 v(X-1) 的编辑态，但使用 vX 的内容
    const updatedMetadata = {
      ...metadata,
      title: snapshotMetadata.title || metadata.title,
      excerpt: snapshotMetadata.excerpt || metadata.excerpt,
      version: targetVersion - 1,
      publishedAt: snapshotMetadata.publishedAt,
      editStatus: 'editing'
    };
    await this.saveMetadata(noteId, updatedMetadata);
    await this.updateIndex(noteId, updatedMetadata);

    // 删除目标版本及之后的所有版本
    for (let v = targetVersion; v <= currentVersion; v++) {
      const versionDirToDelete = path.join(this.notesDir, noteId, 'versions', `v${v}`);
      if (await this.exists(versionDirToDelete)) {
        await fs.rm(versionDirToDelete, { recursive: true, force: true });
      }
    }

    return updatedMetadata;
  }

  /**
   * 获取版本历史列表
   */
  async getVersionHistory(noteId) {
    const metadata = await this.getNoteMetadata(noteId);
    if (!metadata) {
      throw new Error(`笔记不存在: ${noteId}`);
    }

    const versionsDir = path.join(this.notesDir, noteId, 'versions');
    if (!await this.exists(versionsDir)) {
      return [];
    }

    const entries = await fs.readdir(versionsDir);
    const versions = [];

    for (const entry of entries) {
      if (entry.startsWith('v') && entry.length > 1) {
        const versionNum = parseInt(entry.substring(1), 10);
        if (!isNaN(versionNum)) {
          const snapshotMeta = await this.getVersionSnapshotMetadata(noteId, versionNum);
          if (snapshotMeta) {
            versions.push(snapshotMeta);
          }
        }
      }
    }

    // 按版本号降序排序
    return versions.sort((a, b) => b.version - a.version);
  }

  /**
   * 获取指定版本的内容
   */
  async getVersion(noteId, version) {
    const metadata = await this.getNoteMetadata(noteId);
    if (!metadata) {
      throw new Error(`笔记不存在: ${noteId}`);
    }

    const versionDir = path.join(this.notesDir, noteId, 'versions', `v${version}`);
    const noteFile = path.join(versionDir, 'note.md');
    if (!await this.exists(noteFile)) {
      return null;
    }

    const content = await fs.readFile(noteFile, 'utf-8');
    const snapshotMetadata = await this.getVersionSnapshotMetadata(noteId, version);

    // 返回版本内容及元数据
    return {
      version,
      content,
      title: snapshotMetadata?.title || '',
      excerpt: snapshotMetadata?.excerpt || '',
      versionNote: snapshotMetadata?.versionNote || '',
      publishedAt: snapshotMetadata?.publishedAt || '',
      assetCount: snapshotMetadata?.assetCount || 0
    };
  }

  /**
   * 保存内容到指定路径
   */
  async saveContentToPath(filePath, content) {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * 保存元数据到指定路径
   */
  async saveMetadataToPath(filePath, metadata) {
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
  }
}

module.exports = NotesManager;
