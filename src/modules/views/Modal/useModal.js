/**
 * useModal - 模态框的组合式函数
 * 管理所有模态框状态：prompt、confirm、tagSelection、settings
 */
import { reactive, watch } from 'vue'

const state = reactive({
  modals: [],
  modalId: 0
})

export function useModal() {
  function removeModal(id) {
    const index = state.modals.findIndex(m => m.id === id)
    if (index !== -1) state.modals.splice(index, 1)
  }

  function close(id, result = null) {
    const modal = state.modals.find(m => m.id === id)
    if (modal && modal.resolve) {
      modal.resolve(result)
      modal.resolve = null
    }
    setTimeout(() => removeModal(id), 0)
  }

  /**
   * 显示输入提示模态框
   * @param {string} title 标题
   * @param {string} defaultValue 默认值
   * @param {Object} options 选项 { defaultColor: string|null }
   */
  function prompt(title, defaultValue = '', options = {}) {
    const { defaultColor = null } = options
    return new Promise(resolve => {
      const id = ++state.modalId
      state.modals.push({
        id,
        type: 'prompt',
        title,
        defaultValue,
        defaultColor,
        resolve,
        show: true
      })
    })
  }

  /**
   * 显示确认对话框
   */
  function confirm(message) {
    return new Promise(resolve => {
      const id = ++state.modalId
      state.modals.push({
        id,
        type: 'confirm',
        message,
        resolve,
        show: true
      })
    })
  }

  /**
   * 显示标签选择模态框
   */
  function showTagSelection(allTags, currentTagIds) {
    return new Promise(resolve => {
      const id = ++state.modalId
      const selected = new Set(currentTagIds)
      state.modals.push({
        id,
        type: 'tagSelection',
        allTags,
        selected: Array.from(selected),
        resolve,
        show: true
      })
    })
  }

  /**
   * 显示页面类型选择模态框
   */
  function showPageTypeSelection() {
    return new Promise(resolve => {
      const id = ++state.modalId
      state.modals.push({
        id,
        type: 'pageTypeSelection',
        resolve,
        show: true
      })
    })
  }

  /**
   * 显示设置浮出窗口
   */
  async function showSettingsPopover() {
    const id = ++state.modalId
    // 获取配置需要异步，所以先创建一个等待状态的 modal
    state.modals.push({
      id,
      type: 'settings',
      config: null,
      tempDataRootPath: '',
      resolve: null,
      show: true
    })
    // 异步加载配置
    const config = await window.electronAPI.getConfig()
    const modal = state.modals.find(m => m.id === id)
    if (modal) {
      modal.config = config
      modal.tempDataRootPath = config.dataRootPath || ''
    }
  }

  /**
   * 更新标签选择状态
   */
  function toggleTagSelection(id, tagId) {
    const modal = state.modals.find(m => m.id === id)
    if (modal && modal.type === 'tagSelection') {
      const selected = new Set(modal.selected)
      if (selected.has(tagId)) {
        selected.delete(tagId)
      } else {
        selected.add(tagId)
      }
      modal.selected = Array.from(selected)
    }
  }

  /**
   * 更新设置临时路径
   */
  function updateSettingsPath(id, path) {
    const modal = state.modals.find(m => m.id === id)
    if (modal && modal.type === 'settings') {
      modal.tempDataRootPath = path
    }
  }

  return {
    modals: state.modals,
    prompt,
    confirm,
    showTagSelection,
    showPageTypeSelection,
    showSettingsPopover,
    toggleTagSelection,
    updateSettingsPath,
    close
  }
}