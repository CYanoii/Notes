// src/vue/toast-entry.js
import { createApp } from 'vue'
import ToastContainer from './components/ToastContainer.vue'

// 挂载 Toast 容器到 DOM
const container = document.createElement('div')
container.id = 'vue-toast-root'
document.body.appendChild(container)

const app = createApp(ToastContainer)
app.mount('#vue-toast-root')

// 暴露全局 API（供 UIManager 调用）
import { useToast } from './composables/useToast.js'
const { show } = useToast()
window.toastApi = { show }

console.log('[Vue] Toast 模块已加载')