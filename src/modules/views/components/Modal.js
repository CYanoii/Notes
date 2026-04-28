/**
 * 可复用模态框组件
 * 提供背景虚化的弹窗，支持输入提示和确认对话框
 */
import { escapeHtml } from '../../utils/helpers.js';

export class Modal {
  constructor() {
    this.overlay = null;
    this.resolve = null;
  }

  /**
   * 显示输入提示模态框
   * @param {string} title 模态框标题
   * @param {string} defaultValue 默认值
   * @returns {Promise<string|null>} 用户输入，取消返回 null
   */
  prompt(title, defaultValue = '') {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.createPromptModal(title, defaultValue);
    });
  }

  /**
   * 显示确认对话框
   * @param {string} message 确认信息
   * @returns {Promise<boolean>} 用户是否确认
   */
  confirm(message) {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.createConfirmModal(message);
    });
  }

  /**
   * 创建输入提示模态框
   */
  createPromptModal(title, defaultValue) {
    this.createOverlay();

    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <input type="text" class="modal-input" value="${escapeHtml(defaultValue)}" placeholder="请输入标签名称">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">取消</button>
        <button class="btn btn-primary modal-confirm">确定</button>
      </div>
    `;

    this.overlay.appendChild(modal);
    this.bindCommonEvents(modal);

    // 确定按钮
    modal.querySelector('.modal-confirm').addEventListener('click', () => {
      const input = modal.querySelector('.modal-input');
      const value = input.value.trim();
      this.close(value || null);
    });

    // 自动聚焦
    setTimeout(() => {
      const input = modal.querySelector('.modal-input');
      input.focus();
      input.select();
    }, 100);
  }

  /**
   * 创建确认对话框
   */
  createConfirmModal(message) {
    this.createOverlay();

    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">确认删除</h3>
        <button class="modal-close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p class="modal-message">${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">取消</button>
        <button class="btn btn-danger modal-confirm">确定删除</button>
      </div>
    `;

    this.overlay.appendChild(modal);
    this.bindCommonEvents(modal);

    // 确定按钮
    modal.querySelector('.modal-confirm').addEventListener('click', () => {
      this.close(true);
    });
  }

  /**
   * 创建遮罩层
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    document.body.appendChild(this.overlay);

    // 点击遮罩层关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close(null);
      }
    });
  }

  /**
   * 绑定通用事件
   */
  bindCommonEvents(modal) {
    // 关闭按钮
    modal.querySelector('.modal-close-btn').addEventListener('click', () => {
      this.close(null);
    });

    // 取消按钮
    modal.querySelector('.modal-cancel').addEventListener('click', () => {
      this.close(null);
    });

    // 阻止冒泡，防止点击容器关闭
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // ESC 键关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        this.close(null);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }

  /**
   * 关闭模态框并返回结果
   */
  close(result) {
    if (this.resolve) {
      this.resolve(result);
      this.resolve = null;
    }

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  /**
   * 显示标签选择模态框
   * @param {Array} allTags - 所有标签列表
   * @param {Array} currentTagIds - 当前已选中的标签ID列表
   * @returns {Promise<Array|null>} 选中的标签ID数组，取消返回null
   */
  showTagSelection(allTags, currentTagIds) {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.createTagSelectionModal(allTags, currentTagIds);
    });
  }

  /**
   * 显示设置浮出窗口
   */
  async showSettingsPopover() {
    this.createOverlay();

    // 加载当前配置
    const config = await window.electronAPI.getConfig();

    const popover = document.createElement('div');
    popover.className = 'settings-popover';
    popover.innerHTML = `
      <div class="settings-popover-header">
        <h3 class="settings-popover-title">设置</h3>
        <button class="settings-popover-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="settings-popover-body">
        <div class="settings-item">
          <label class="settings-label">数据目录</label>
          <div class="settings-path-row">
            <input type="text" class="settings-path-input" value="${config.dataRootPath || ''}" placeholder="留空使用默认路径">
            <button class="settings-select-btn">选择</button>
            <button class="settings-clear-btn" title="清除并使用默认路径">×</button>
          </div>
        </div>
      </div>
      <div class="settings-popover-footer">
        <button class="btn btn-primary settings-apply-btn">应用</button>
      </div>
    `;

    this.overlay.appendChild(popover);

    // 存储临时路径值
    let tempDataRootPath = config.dataRootPath || '';

    // 选择按钮点击
    popover.querySelector('.settings-select-btn').addEventListener('click', async () => {
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        tempDataRootPath = folderPath;
        popover.querySelector('.settings-path-input').value = folderPath;
      }
    });

    // 清除按钮点击
    popover.querySelector('.settings-clear-btn').addEventListener('click', () => {
      tempDataRootPath = '';
      popover.querySelector('.settings-path-input').value = '';
    });

    // 输入框变化跟踪
    popover.querySelector('.settings-path-input').addEventListener('input', (e) => {
      tempDataRootPath = e.target.value;
    });

    // 应用按钮点击
    popover.querySelector('.settings-apply-btn').addEventListener('click', async () => {
      // 应用配置并重新加载数据管理器
      await window.electronAPI.applyConfigAndReload('dataRootPath', tempDataRootPath);
      this.close();
      // 刷新页面以重新加载数据
      window.location.reload();
    });

    // 关闭按钮
    popover.querySelector('.settings-popover-close').addEventListener('click', () => {
      this.close();
    });

    // 点击遮罩关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // ESC 键关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    // 阻止冒泡
    popover.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * 创建标签选择模态框
   */
  createTagSelectionModal(allTags, currentTagIds) {
    this.createOverlay();

    const selected = new Set(currentTagIds);
    const modal = document.createElement('div');
    modal.className = 'modal-container';

    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">选择标签</h3>
        <button class="modal-close-btn">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="tag-select-list">
          ${allTags.map(tag => {
            const isSelected = selected.has(tag.id);
            return `
              <div class="tag-select-item ${isSelected ? 'selected' : ''}" data-tag-id="${tag.id}">
                <div class="tag-select-check"></div>
                <span class="tag-select-color" style="background-color: ${tag.color}"></span>
                <span class="tag-select-name">${escapeHtml(tag.name)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">取消</button>
        <button class="btn btn-primary modal-confirm">确定</button>
      </div>
    `;

    this.overlay.appendChild(modal);
    this.bindCommonEvents(modal);

    // 点击标签项切换选择
    modal.querySelectorAll('.tag-select-item').forEach(item => {
      item.addEventListener('click', () => {
        const tagId = item.dataset.tagId;
        item.classList.toggle('selected');
        if (selected.has(tagId)) {
          selected.delete(tagId);
        } else {
          selected.add(tagId);
        }
      });
    });

    // 确定按钮
    modal.querySelector('.modal-confirm').addEventListener('click', () => {
      this.close(Array.from(selected));
    });
  }

}
