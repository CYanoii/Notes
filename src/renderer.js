// src/renderer.js
import { createApp } from 'vue'
import App from './modules/views/App.vue'
import { App as AppClass } from './modules/core/App.js'

// 创建 Toast 容器到 DOM
const toastRoot = document.createElement('div')
toastRoot.id = 'vue-toast-root'
document.body.appendChild(toastRoot)

// 创建 Modal 容器到 DOM
const modalRoot = document.createElement('div')
modalRoot.id = 'vue-modal-root'
document.body.appendChild(modalRoot)

// 创建应用根容器（挂载 App组件，不会清除原有 DOM）
const appRoot = document.createElement('div')
appRoot.id = 'app-root'
appRoot.style.height = '100vh'
document.body.appendChild(appRoot)

// 挂载单一 Vue 应用到专用容器
const app = createApp(App)
app.mount(appRoot)

// 初始化应用（在 Vue 组件挂载完成后调用）
window.app = new AppClass()
window.app.init().catch(err => console.error('[App] init failed:', err))

console.log('[Vue] 应用已加载')