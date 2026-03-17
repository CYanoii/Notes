/**
 * 笔记管理器 - 负责笔记的 CRUD 操作
 */
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class NotesManager {
  constructor() {
    this.notesDir = path.join(app.getPath('userData'), 'notes');
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
  async createNote(title = '') {
    const noteId = Date.now().toString();
    const noteDir = path.join(this.notesDir, noteId);

    await fs.mkdir(noteDir, { recursive: true });
    await fs.mkdir(path.join(noteDir, 'assets'), { recursive: true });

    const metadata = {
      id: noteId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: []
    };

    await this.saveMetadata(noteId, metadata);
    await this.saveContent(noteId, ``);
    await this.addToIndex(metadata);

    return metadata;
  }

  // 删除笔记
  async deleteNote(noteId) {
    await this.removeFromIndex(noteId);
    const noteDir = path.join(this.notesDir, noteId);
    await fs.rm(noteDir, { recursive: true, force: true });
  }

  // 获取所有笔记
  async getAllNotes() {
    const index = await this.loadIndex();
    return index.notes.sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  // 获取最近编辑的笔记
  async getRecentNotes(limit = 10) {
    const allNotes = await this.getAllNotes();
    return allNotes.slice(0, limit);
  }

  // 搜索笔记
  async searchNotes(query) {
    const allNotes = await this.getAllNotes();
    const lowerQuery = query.toLowerCase();

    return allNotes.filter(note => {
      return note.title.toLowerCase().includes(lowerQuery);
    });
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
    const updatedMetadata = {
      ...metadata,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.saveMetadata(noteId, updatedMetadata);

    if (updates.content !== undefined) {
      await this.saveContent(noteId, updates.content);
    }

    await this.updateIndex(noteId, updatedMetadata);

    return updatedMetadata;
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
}

module.exports = NotesManager;
