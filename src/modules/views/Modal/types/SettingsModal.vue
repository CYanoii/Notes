<script setup>
import { reactive } from 'vue'
import { getAllPanels, getVisibilitySettings, isPanelVisible } from '../../LeftSidebar/panelRegistry.js'

const props = defineProps({
  modal: { type: Object, required: true }
})

const emit = defineEmits(['close', 'updatePath', 'selectFolder', 'clearPath'])

// 面板可见性临时设置 - 仅在点击应用后生效
const availablePanels = getAllPanels()
const tempPanelVisibility = reactive({ ...getVisibilitySettings() })

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

function handleApply() {
  // 保存面板可见性设置到配置
  window.electronAPI.setConfig('sidebarPanels', { ...tempPanelVisibility })
  // 应用数据目录更改
  window.electronAPI.applyConfigAndReload('dataRootPath', props.modal.tempDataRootPath)
  emit('close', props.modal.id)
  window.location.reload()
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
      <!-- 数据目录设置 -->
      <div class="settings-item" v-if="modal.config">
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
      <div class="settings-item settings-panels-item">
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
  background: white;
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
  border-bottom: 1px solid #eee;
}

.settings-popover-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.settings-popover-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #666;
}

.settings-popover-close:hover {
  color: #333;
}

.settings-popover-body {
  padding: 20px;
  flex: 1;
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
  color: #4a5568;
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
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  color: #4a5568;
  background: #f7fafc;
}

.settings-select-btn {
  padding: 8px 16px;
  border: 1px solid #4299e1;
  border-radius: 4px;
  background: #ebf8ff;
  color: #2b6cb0;
  cursor: pointer;
  font-size: 14px;
}

.settings-select-btn:hover {
  background: #bee3f8;
}

.settings-clear-btn {
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e53e3e;
  border-radius: 4px;
  background: white;
  color: #e53e3e;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
}

.settings-clear-btn:hover {
  background: #fff5f5;
}

.settings-popover-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.settings-loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: #4299e1;
  color: white;
}

.btn-primary:hover {
  background: #3182ce;
}

/* 面板可见性设置样式 */
.settings-panels-item {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
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
  background: #f7fafc;
  border-radius: 6px;
}

.settings-toggle-row:hover {
  background: #edf2f7;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #4a5568;
}

.toggle-label i {
  width: 16px;
  color: #718096;
}

.toggle-label .lock-icon {
  margin-left: 4px;
  color: #a0aec0;
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
  background-color: #ccc;
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
  background-color: #4299e1;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* 无法隐藏的面板样式 */
.toggle-switch.cannot-hide .toggle-slider {
  background-color: #4299e1;
  cursor: not-allowed;
}

.toggle-switch.cannot-hide .toggle-slider:before {
  background-color: #bee3f8;
}

.settings-toggle-row.cannot-hide-row {
  opacity: 0.7;
  background: #f0f7ff;
}
</style>