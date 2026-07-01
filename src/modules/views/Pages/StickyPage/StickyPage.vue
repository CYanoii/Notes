<script setup>
const props = defineProps({
  noteData: { type: Object, required: true }
})
</script>

<template>
  <div class="sticky-page">
    <div class="sticky-content">
      <!-- 便签页内容区域 - 目前为空白 -->
      <div class="sticky-placeholder">
        <i class="fas fa-sticky-note"></i>
        <p>便签页</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sticky-page {
  width: 100%;
  height: 100%;
  background: var(--editor-bg);
  display: flex;
  flex-direction: column;
}

.sticky-content {
  flex: 1;
  padding: 20px;
}

.sticky-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}

.sticky-placeholder i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.sticky-placeholder p {
  font-size: 14px;
}
</style>
