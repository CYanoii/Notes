<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  versions: {
    type: Array,
    default: () => []
  },
  currentVersion: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['close', 'preview', 'restore'])

// 格式化日期时间
function formatDateTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化相对时间
function formatRelativeTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 30) return `${diffDays} 天前`
  return formatDateTime(isoString)
}

function handlePreview(version) {
  emit('preview', version)
}

function handleRestore(version) {
  emit('restore', version)
}
</script>

<template>
  <div class="version-history-panel">
    <div class="panel-header">
      <h4 class="panel-title">
        <i class="fas fa-history"></i>
        版本历史
      </h4>
      <button class="close-btn" @click="$emit('close')">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="panel-body">
      <div v-if="versions.length === 0" class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>暂无历史版本</p>
      </div>

      <div v-else class="version-list">
        <div
          v-for="version in versions"
          :key="version.version"
          class="version-item"
          :class="{ current: version.version === currentVersion }"
        >
          <div class="version-info">
            <div class="version-header">
              <span class="version-badge">v{{ version.version }}</span>
              <span v-if="version.version === currentVersion" class="current-tag">当前版本</span>
            </div>
            <div class="version-time" :title="formatDateTime(version.publishedAt)">
              {{ formatRelativeTime(version.publishedAt) }}
            </div>
            <div v-if="version.versionNote" class="version-note">
              {{ version.versionNote }}
            </div>
          </div>
          <div class="version-actions">
            <button
              class="action-btn preview-btn"
              @click="handlePreview(version)"
              title="查看内容"
            >
              <i class="fas fa-eye"></i>
            </button>
            <button
              v-if="version.version !== currentVersion"
              class="action-btn restore-btn"
              @click="handleRestore(version)"
              title="回滚到此版本"
            >
              <i class="fas fa-undo"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.version-history-panel {
  position: fixed;
  bottom: 20px;
  right: 80px;
  width: 340px;
  max-height: 450px;
  background: var(--modal-bg);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--modal-border);
}

.panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--modal-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title i {
  color: var(--modal-text-secondary);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--modal-text-secondary);
  font-size: 14px;
}

.close-btn:hover {
  color: var(--modal-text);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--modal-text-secondary);
}

.empty-state i {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--tag-filter-item-bg);
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.version-item:hover {
  background: var(--tag-filter-item-hover-bg);
}

.version-item.current {
  border: 1px solid var(--accent);
}

.version-info {
  flex: 1;
  min-width: 0;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.version-badge {
  display: inline-block;
  background: var(--accent);
  color: white;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}

.current-tag {
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}

.version-time {
  font-size: 12px;
  color: var(--modal-text-secondary);
  margin-bottom: 2px;
}

.version-note {
  font-size: 13px;
  color: var(--modal-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.version-actions {
  display: flex;
  gap: 6px;
  margin-left: 10px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  font-size: 13px;
  transition: background-color 0.15s ease;
}

.preview-btn {
  color: var(--modal-text-secondary);
}

.preview-btn:hover {
  background: var(--modal-border);
  color: var(--modal-text);
}

.restore-btn {
  color: var(--accent);
}

.restore-btn:hover {
  background: var(--accent);
  color: white;
}
</style>
