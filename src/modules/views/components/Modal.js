/**
 * 可复用模态框组件
 * 提供背景虚化的弹窗，支持输入提示和确认对话框
 */
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
        <input type="text" class="modal-input" value="${this.escapeHtml(defaultValue)}" placeholder="请输入标签名称">
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
        <p class="modal-message">${this.escapeHtml(message)}</p>
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
   * HTML 转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
