<script setup>
import { reactive, computed, watch, ref, onMounted, onUnmounted } from 'vue'
import { getAllPanels, getVisibilitySettings, isPanelVisible } from '../../LeftSidebar/panelRegistry.js'

const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'updatePath', 'selectFolder', 'clearPath'])

// 大纲导航
const outlineItems = [
  { id: 'theme', label: '主题' },
  { id: 'data-path', label: '数据目录' },
  { id: 'panels', label: '侧边栏面板' },
  { id: 'editor-style', label: '编辑器样式' }
]
const activeOutlineId = ref('theme')

function scrollToSection(sectionId) {
  const el = document.getElementById(`settings-${sectionId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeOutlineId.value = sectionId
  }
}

// 面板可见性临时设置 - 仅在点击应用后生效
const availablePanels = getAllPanels()
const tempPanelVisibility = reactive({ ...getVisibilitySettings() })

// 字体样式设置
const fontOptions = [
  { value: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', label: '系统默认' },
  { value: '"Source Han Sans SC", "Noto Sans SC", sans-serif', label: '思源黑体' },
  { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '微软雅黑' },
  { value: 'KaiTi, "楷体", serif', label: '楷体' },
  { value: '"Courier New", Consolas, monospace', label: '等宽字体' },
  { value: '"Noto Serif SC", Songti SC, serif', label: '思源宋体' }
]

const defaultEditorStyle = {
  fontFamily: fontOptions[0].value,
  fontSize: 16,
  lineHeight: 1.8,
  paragraphSpacing: 16
}

const tempEditorStyle = reactive({ ...defaultEditorStyle })

// 主题设置
const defaultTheme = 'light'
const tempTheme = ref(defaultTheme)

// 监听 config 加载完成，更新主题值
watch(() => props.modal.config, (config) => {
  if (config) {
    tempTheme.value = config.theme || defaultTheme
  }
}, { immediate: true })

// 监听 config 加载完成，更新编辑器样式值
watch(() => props.modal.config, (config) => {
  if (config) {
    const savedStyle = config.editorStyle || {}
    tempEditorStyle.fontFamily = savedStyle.fontFamily || defaultEditorStyle.fontFamily
    tempEditorStyle.fontSize = savedStyle.fontSize || defaultEditorStyle.fontSize
    tempEditorStyle.lineHeight = savedStyle.lineHeight || defaultEditorStyle.lineHeight
    tempEditorStyle.paragraphSpacing = savedStyle.paragraphSpacing || defaultEditorStyle.paragraphSpacing
  }
}, { immediate: true })

function handlePanelVisibilityChange(panelId, event, cannotHide) {
  if (cannotHide) {
    // 强制保持开启状态
    event.target.checked = true
    return
  }
  tempPanelVisibility[panelId] = event.target.checked
}

function handleCancel() {
  emit('close', props.modal.id)
}

async function handleApply() {
  // 依次保存所有设置，确保每个都完成后再执行下一个
  await window.electronAPI.setConfig('sidebarPanels', { ...tempPanelVisibility })
  await window.electronAPI.setConfig('editorStyle', { ...tempEditorStyle })
  await window.electronAPI.setConfig('theme', tempTheme.value)
  await window.electronAPI.applyConfigAndReload('dataRootPath', props.modal.tempDataRootPath)
  emit('close', props.modal.id)
  // 数据目录变更后需要重新加载以使用新路径
  window.location.reload()
}

function handleRestoreDefaults() {
  Object.assign(tempEditorStyle, defaultEditorStyle)
}

async function handleSelectFolder() {
  const folderPath = await window.electronAPI.selectFolder()
  if (folderPath) {
    emit('updatePath', props.modal.id, folderPath)
  }
}

function handleClearPath() {
  emit('updatePath', props.modal.id, '')
}

// 监听滚动更新激活的大纲项
function handleScroll() {
  const content = document.querySelector('.settings-content')
  if (!content) return

  const scrollTop = content.scrollTop
  const sections = ['theme', 'data-path', 'panels', 'editor-style']

  for (let i = sections.length - 1; i >= 0; i--) {
    const el = document.getElementById(`settings-${sections[i]}`)
    if (el && el.offsetTop <= scrollTop + 60) {
      activeOutlineId.value = sections[i]
      return
    }
  }
  activeOutlineId.value = sections[0]
}

onMounted(() => {
  const content = document.querySelector('.settings-content')
  if (content) {
    content.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  const content = document.querySelector('.settings-content')
  if (content) {
    content.removeEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <div class="settings-popover">
    <div class="settings-popover-header">
      <h3 class="settings-popover-title">设置</h3>
      <button class="settings-popover-close" @click="handleCancel">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="settings-popover-body">
      <!-- 左侧大纲导航 -->
      <nav class="settings-outline">
        <a
          v-for="item in outlineItems"
          :key="item.id"
          class="outline-item"
          :class="{ active: activeOutlineId === item.id }"
          :href="`#settings-${item.id}`"
          @click.prevent="scrollToSection(item.id)"
        >
          {{ item.label }}
        </a>
      </nav>

      <!-- 右侧设置内容 -->
      <div class="settings-content">
        <!-- 主题设置 -->
        <div id="settings-theme" class="settings-item settings-theme-item">
          <label class="settings-label">主题</label>
          <div class="theme-options">
            <label class="theme-option" :class="{ active: tempTheme === 'light' }">
              <input type="radio" v-model="tempTheme" value="light" />
              <div class="theme-preview theme-preview-light">
                <div class="preview-titlebar"></div>
                <div class="preview-sidebar"></div>
                <div class="preview-editor"></div>
              </div>
              <span class="theme-name">浅色主题</span>
            </label>
            <label class="theme-option" :class="{ active: tempTheme === 'dark' }">
              <input type="radio" v-model="tempTheme" value="dark" />
              <div class="theme-preview theme-preview-dark">
                <div class="preview-titlebar"></div>
                <div class="preview-sidebar"></div>
                <div class="preview-editor"></div>
              </div>
              <span class="theme-name">深色主题</span>
            </label>
          </div>
        </div>

        <!-- 数据目录设置 -->
        <div id="settings-data-path" class="settings-item" v-if="modal.config">
          <label class="settings-label">数据目录</label>
          <div class="settings-path-row">
            <input
              type="text"
              class="settings-path-input"
              :value="modal.tempDataRootPath"
              placeholder="留空使用默认路径"
              readonly
            >
            <button class="settings-select-btn" @click="handleSelectFolder">选择</button>
            <button class="settings-clear-btn" title="清除并使用默认路径" @click="handleClearPath">×</button>
          </div>
        </div>
        <div v-else class="settings-loading">加载中...</div>

        <!-- 侧边栏面板可见性设置 -->
        <div id="settings-panels" class="settings-item settings-panels-item">
          <label class="settings-label">侧边栏面板</label>
          <div class="settings-toggles">
                      <div
              v-for="panel in availablePanels"
              :key="panel.id"
              class="settings-toggle-row"
              :class="{ 'cannot-hide-row': panel.cannotHide }"
            >
              <span class="toggle-label">
                <i :class="panel.icon"></i>
                {{ panel.label }}
                <i v-if="panel.cannotHide" class="fas fa-lock lock-icon" title="无法隐藏"></i>
              </span>
              <label class="toggle-switch" :class="{ 'cannot-hide': panel.cannotHide }">
                <input
                  type="checkbox"
                  :checked="tempPanelVisibility[panel.id] !== false"
                  :disabled="panel.cannotHide"
                  @change="handlePanelVisibilityChange(panel.id, $event, panel.cannotHide)"
                >
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- 编辑器样式设置 -->
        <div id="settings-editor-style" class="settings-item settings-editor-style-item">
           <div class="style-settings">
            <div class="style-header">
              <span class="style-section-title">编辑器样式</span>
              <button class="btn btn-restore-small" @click="handleRestoreDefaults" title="恢复默认">
                <i class="fas fa-undo"></i> 恢复默认
              </button>
            </div>
            <!-- 字体选择 -->
            <div class="style-row">
              <span class="style-label">字体</span>
              <select v-model="tempEditorStyle.fontFamily" class="style-select" @click.stop>
                <option v-for="font in fontOptions" :key="font.value" :value="font.value">
                  {{ font.label }}
                </option>
              </select>
            </div>
            <!-- 字号 -->
            <div class="style-row">
              <span class="style-label">字号</span>
              <div class="style-range-group">
                <input
                  type="range"
                  v-model.number="tempEditorStyle.fontSize"
                  min="10"
                  max="30"
                  step="4"
                  class="style-range"
                >
                <span class="style-value">{{ tempEditorStyle.fontSize }}px</span>
              </div>
            </div>
            <!-- 行高 -->
            <div class="style-row">
              <span class="style-label">行高</span>
              <div class="style-range-group">
                <input
                  type="range"
                  v-model.number="tempEditorStyle.lineHeight"
                  min="1"
                  max="3"
                  step="0.4"
                  class="style-range"
                >
                <span class="style-value">{{ tempEditorStyle.lineHeight }}</span>
              </div>
            </div>
            <!-- 段落间距 -->
            <div class="style-row">
              <span class="style-label">段落间距</span>
              <div class="style-range-group">
                <input
                  type="range"
                  v-model.number="tempEditorStyle.paragraphSpacing"
                  min="10"
                  max="30"
                  step="4"
                  class="style-range"
                >
                 <span class="style-value">{{ tempEditorStyle.paragraphSpacing }}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="settings-popover-footer">
      <button class="btn btn-primary settings-apply-btn" @click="handleApply">应用</button>
    </div>
  </div>
</template>

<style scoped>
.settings-popover {
  position: relative;
  width: 800px;
  height: 600px;
  background: var(--modal-bg);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 10001;
  overflow: hidden;
  animation: popoverFadeIn 0.2s ease;
  display: flex;
  flex-direction: column;
}

@keyframes popoverFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.settings-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--modal-header-bg);
  border-bottom: 1px solid var(--modal-border);
}

.settings-popover-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--modal-text);
}

.settings-popover-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--modal-text-secondary);
}

.settings-popover-close:hover {
  color: var(--modal-text);
}

.settings-popover-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.settings-outline {
  width: 140px;
  flex-shrink: 0;
  padding: 16px 12px;
  border-right: 1px solid var(--modal-border);
  overflow-y: auto;
}

.outline-item {
  display: block;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--modal-text-muted);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.outline-item:hover {
  background: var(--tag-filter-item-hover-bg);
  color: var(--modal-text);
}

.outline-item.active {
  background: var(--tag-filter-selected-bg);
  color: var(--accent);
  font-weight: 500;
}

.settings-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.settings-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--modal-text-secondary);
  margin-bottom: 8px;
  display: block;
}

.settings-path-row {
  display: flex;
  gap: 8px;
}

.settings-path-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--modal-border);
  border-radius: 4px;
  font-size: 14px;
  color: var(--modal-text-secondary);
  background: var(--tag-filter-item-bg);
}

.settings-select-btn {
  padding: 8px 16px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--tag-filter-selected-bg);
  color: var(--accent);
  cursor: pointer;
  font-size: 14px;
}

.settings-select-btn:hover {
  background: var(--tag-filter-item-hover-bg);
}

.settings-clear-btn {
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--tag-filter-blocked-color);
  border-radius: 4px;
  background: var(--tag-filter-blocked-bg);
  color: var(--tag-filter-blocked-color);
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
}

.settings-clear-btn:hover {
  background: var(--tag-filter-blocked-bg);
}

.settings-popover-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--modal-border);
}

.settings-loading {
  text-align: center;
  padding: 20px;
  color: var(--modal-text-muted);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

/* 面板可见性设置样式 */
.settings-panels-item {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--modal-border);
}

.settings-toggles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--tag-filter-item-bg);
  border-radius: 6px;
}

.settings-toggle-row:hover {
  background: var(--tag-filter-item-hover-bg);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--modal-text-secondary);
}

.toggle-label i {
  width: 16px;
  color: var(--modal-text-muted);
}

.toggle-label .lock-icon {
  margin-left: 4px;
  color: var(--modal-text-muted);
  font-size: 12px;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--modal-text-muted);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--accent);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* 无法隐藏的面板样式 */
.toggle-switch.cannot-hide .toggle-slider {
  background-color: var(--accent);
  cursor: not-allowed;
}

.toggle-switch.cannot-hide .toggle-slider:before {
  background-color: var(--tag-filter-selected-bg);
}

.settings-toggle-row.cannot-hide-row {
  opacity: 0.7;
  background: var(--tag-filter-selected-bg);
}

/* 编辑器样式设置 */
.settings-editor-style-item {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--modal-border);
}

.style-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--tag-filter-bg);
  padding: 16px;
  border-radius: 8px;
}

.style-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.style-section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--modal-text-secondary);
}

.style-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.style-label {
  font-size: 14px;
  color: var(--modal-text-secondary);
  min-width: 80px;
}

.style-select {
  padding: 8px 12px;
  border: 1px solid var(--modal-border);
  border-radius: 4px;
  font-size: 14px;
  color: var(--modal-text);
  background: var(--modal-bg);
  min-width: 160px;
  cursor: pointer;
}

.style-select:focus {
  outline: none;
  border-color: var(--accent);
}

.style-range-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.style-range {
  width: 180px;
  height: 6px;
  border-radius: 3px;
  background: var(--modal-border);
  cursor: pointer;
  -webkit-appearance: none;
}

.style-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.style-value {
  font-size: 13px;
  color: var(--modal-text-muted);
  min-width: 45px;
  text-align: right;
}

.btn-restore-small {
  background: transparent;
  border: 1px solid var(--modal-border);
  color: var(--modal-text-muted);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-restore-small:hover {
  background: var(--tag-filter-item-hover-bg);
  border-color: var(--tag-filter-item-hover-border);
  color: var(--modal-text);
}

.btn-restore-small i {
  font-size: 11px;
}

/* 主题设置样式 */
.settings-theme-item {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--modal-border);
}

.theme-options {
  display: flex;
  gap: 16px;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.theme-option input {
  display: none;
}

.theme-preview {
  width: 120px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--modal-border);
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.theme-preview-light {
  background: #f7fafc;
}

.theme-preview-light .preview-titlebar {
  height: 10px;
  background: #e8ecf0;
  border-bottom: 1px solid #d0d7de;
}

.theme-preview-light .preview-sidebar {
  width: 30px;
  background: #edf2f7;
  flex: 1;
  border-right: 1px solid #d0d7de;
}

.theme-preview-light .preview-content {
  flex: 2;
  background: #ffffff;
}

.theme-preview-dark {
  background: #1e1e1e;
}

.theme-preview-dark .preview-titlebar {
  height: 10px;
  background: #323232;
  border-bottom: 1px solid #4a5568;
}

.theme-preview-dark .preview-sidebar {
  width: 30px;
  background: #222222;
  flex: 1;
  border-right: 1px solid #4a5568;
}

.theme-preview-dark .preview-content {
  flex: 2;
  background: #1e1e1e;
}

.theme-option.active .theme-preview {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.3);
}

.theme-name {
  font-size: 13px;
  color: var(--modal-text-secondary);
}

.theme-option.active .theme-name {
  color: var(--accent);
  font-weight: 500;
}
</style>