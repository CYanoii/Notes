// src/vue/views/Modal/modal-entry.js
import { createApp } from 'vue'
import ModalContainer from './ModalContainer.vue'

// 挂载 Modal 容器到 DOM
const container = document.createElement('div')
container.id = 'vue-modal-root'
document.body.appendChild(container)

const app = createApp(ModalContainer)
app.mount('#vue-modal-root')

// 暴露全局 API（供 UIManager 调用）
import { useModal } from './useModal.js'
const { prompt, confirm, showTagSelection, showSettingsPopover } = useModal()
window.modalApi = { prompt, confirm, showTagSelection, showSettingsPopover }

console.log('[Vue] Modal 模块已加载')