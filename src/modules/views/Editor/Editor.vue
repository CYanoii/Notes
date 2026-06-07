<script setup>
import { computed, watch, nextTick, onMounted } from 'vue'
import { useEditor } from './useEditor.js'
import { EventTypes } from '../../core/EventTypes.js'
import { escapeHtml } from '../../utils/helpers.js'

const {
  state,
  activeNoteId,
  isFocused,
  createNoteEditor,
  switchToNoteEditor,
  switchToHomePage,
  closeNoteEditor,
  updateEditorTitle,
  updateEditorContent,
  updateNoteTags,
  setVditor,
  setFocused,
  getActiveNoteId,
  getEditors
} = useEditor()

// 标题变化处理
function handleTitleInput(noteId, event) {
  const newTitle = event.target.value
  updateEditorTitle(noteId, newTitle)
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.UPDATE.TITLE, noteId, newTitle)
  }
}

// Title blur 处理 - 确保在失焦时也更新 noteData
function handleTitleBlur(noteId, event) {
  const newTitle = event.target.value
  const editor = state.editors.get(noteId)
  if (editor && editor.noteData) {
    editor.noteData.title = newTitle
  }
}

// 摘要变化处理
function handleExcerptInput(noteId, event) {
  const newExcerpt = event.target.value
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.UPDATE.EXCERPT, noteId, newExcerpt)
  }
}

// Excerpt blur 处理 - 确保在失焦时也保存
function handleExcerptBlur(noteId, event) {
  const newExcerpt = event.target.value
  const editor = state.editors.get(noteId)
  if (editor && editor.noteData) {
    editor.noteData.excerpt = newExcerpt
  }
}

// 标签点击处理
function handleTagClick(noteId) {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.UPDATE.TAG, noteId)
  }
}

// 获取标签显示数据
function getTagsDisplay(noteId) {
  const editor = state.editors.get(noteId)
  if (!editor) return { showAddBtn: false, tags: [] }

  const noteTags = editor.noteData?.tags || []
  const isTrashed = editor.noteData?.status === 'trashed'
  const hasTags = noteTags && noteTags.length > 0

  return {
    showAddBtn: !isTrashed && !hasTags,
    tags: noteTags.map(tagId => {
      const tag = editor.allTags?.find(t => t.id === tagId)
      return tag ? { id: tagId, name: tag.name, color: tag.color } : null
    }).filter(Boolean)
  }
}

// 渲染 Markdown 为 HTML
function renderMarkdown(content) {
  if (!content) return ''
  if (typeof window.marked !== 'undefined') {
    return window.marked.parse(content)
  }
  return escapeHtml(content)
}

// 初始化 Vditor
function initVditor(noteId, container, noteData) {
  if (noteData.status === 'trashed') {
    // 只读模式：渲染 Markdown HTML
    const readonlyEl = document.createElement('div')
    readonlyEl.className = 'vditor-readonly'
    readonlyEl.innerHTML = renderMarkdown(noteData.content || '')
    container.appendChild(readonlyEl)
    return null
  }

  const vditor = new Vditor(container, {
    placeholder: '开始记录你的想法...',
    value: noteData.content || '',
    cache: {
      enable: false
    },
    toolbar: [
      { name: 'emoji', tipPosition: 'se' },
      { name: 'headings', tipPosition: 'se' },
      { name: 'bold', tipPosition: 'se' },
      { name: 'italic', tipPosition: 'se' },
      { name: 'strike', tipPosition: 'se' },
      '|',
      { name: 'line', tipPosition: 's' },
      { name: 'quote', tipPosition: 's' },
      { name: 'list', tipPosition: 's' },
      { name: 'ordered-list', tipPosition: 's' },
      { name: 'check', tipPosition: 's' },
      { name: 'outdent', tipPosition: 's' },
      { name: 'indent', tipPosition: 's' },
      { name: 'code', tipPosition: 's' },
      { name: 'inline-code', tipPosition: 's' },
      { name: 'insert-after', tipPosition: 's' },
      { name: 'insert-before', tipPosition: 's' },
      '|',
      { name: 'undo', tipPosition: 's' },
      { name: 'redo', tipPosition: 's' },
      '|',
      { name: 'upload', tipPosition: 's' },
      { name: 'link', tipPosition: 's' },
      { name: 'table', tipPosition: 's' },
      '|',
      { name: 'edit-mode', tipPosition: 'sw' },
      { name: 'preview', tipPosition: 'sw' },
      { name: 'fullscreen', tipPosition: 'sw' },
      '|',
      {
        hotkey: '⇧⌘R',
        name: 'recovery',
        tipPosition: 'sw',
        tip: '恢复顶部栏 (⇧⌘R)',
        className: 'recover',
        icon: '<svg t="1717420000000" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M128 160 L896 160" stroke="#666666" stroke-width="96" stroke-linecap="round" fill="none" /><path d="M512 300 L512 896 M320 700 L512 896 L704 700" stroke="#666666" stroke-width="96" stroke-linecap="round" stroke-linejoin="round" fill="none" /></svg>',
        click() {
          const editorEl = document.getElementById(`note-${noteId}`)
          if (editorEl) {
            editorEl.classList.remove('editor-focused')
          }
        }
      }
    ],
    preview: {
      maxWidth: 1200
    },
    upload: {
      handler: async (files) => {
        for (const file of files) {
          try {
            const arrayBuffer = await file.arrayBuffer()
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            )
            const filePath = await window.electronAPI.saveAsset(noteId, file.name, base64)
            vditor.insertMD(`<img src="${filePath.replace(/\\/g, '/').replace(/ /g, '%20')}" alt="${file.name}" style="zoom:100%;" />`)
          } catch (error) {
            console.error('文件上传失败:', error)
          }
        }
      }
    },
    after: () => {
      // 点击 Vditor 编辑区域时隐藏顶部栏
      container.addEventListener('click', (e) => {
        if (e.target.closest('.vditor-content')) {
          setFocused(true)
          const editorEl = document.getElementById(`note-${noteId}`)
          if (editorEl) {
            editorEl.classList.add('editor-focused')
          }
        }
      })
      // 点击顶部区域（标题、摘要、标签）时显示顶部栏
      const editorEl = document.getElementById(`note-${noteId}`)
      if (editorEl) {
        editorEl.addEventListener('click', (e) => {
          if (e.target.closest('.note-title-input') ||
              e.target.closest('.note-excerpt-input') ||
              e.target.closest('.note-tags-bar')) {
            setFocused(false)
            editorEl.classList.remove('editor-focused')
          }
        })
      }
      // 监听键盘快捷键 ⇧⌘R 恢复顶部栏
      container.addEventListener('keydown', (e) => {
        if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key === 'r') {
          setFocused(false)
          const editorEl = document.getElementById(`note-${noteId}`)
          if (editorEl) {
            editorEl.classList.remove('editor-focused')
          }
        }
      })
    },
    input: (value) => {
      if (window.eventBus) {
        window.eventBus.emit(EventTypes.NOTE.UPDATE.CONTENT, noteId, value)
      }
    }
  })

  return vditor
}

// 初始化所有已存在的编辑器
function initializeExistingEditors() {
  nextTick(() => {
    state.editors.forEach((editor, noteId) => {
      const container = document.getElementById(`vditor-${noteId}`)
      if (container && !editor.vditor) {
        const vditor = initVditor(noteId, container, editor.noteData)
        if (vditor) {
          setVditor(noteId, vditor)
        }
      }
    })
  })
}

// 监听编辑器变化，初始化 Vditor
watch(
  () => state.editors.size,
  () => {
    nextTick(() => {
      state.editors.forEach((editor, noteId) => {
        if (!editor.vditor) {
          const container = document.getElementById(`vditor-${noteId}`)
          if (container) {
            const vditor = initVditor(noteId, container, editor.noteData)
            if (vditor) {
              setVditor(noteId, vditor)
            }
          }
        }
      })
    })
  }
)

// 组件挂载时初始化已存在的编辑器
onMounted(() => {
  initializeExistingEditors()
})

// 获取笔记列表
const editorList = computed(() => {
  return getEditors()
})

// 暴露方法给外部
defineExpose({
  createNoteEditor,
  switchToNoteEditor,
  switchToHomePage,
  closeNoteEditor,
  updateEditorTitle,
  updateEditorContent,
  updateNoteTags
})
</script>

<template>
  <!-- 动态笔记编辑器 -->
  <div
    v-for="editor in editorList"
    :key="editor.id"
    :id="`note-${editor.id}`"
    class="note-editor"
    :class="{
      active: activeNoteId === editor.id,
      'read-only': editor.noteData?.status === 'trashed',
      'editor-focused': isFocused && activeNoteId === editor.id
    }"
  >
    <!-- 标题输入 -->
    <input
      type="text"
      class="note-title-input"
      v-model="editor.noteData.title"
      placeholder="输入标题..."
      :disabled="editor.noteData?.status === 'trashed'"
      @input="handleTitleInput(editor.id, $event)"
      @blur="handleTitleBlur(editor.id, $event)"
    >

    <!-- 摘要输入 -->
    <input
      type="text"
      class="note-excerpt-input"
      v-model="editor.noteData.excerpt"
      placeholder="输入摘要（最多50字）..."
      maxlength="50"
      :disabled="editor.noteData?.status === 'trashed'"
      @input="handleExcerptInput(editor.id, $event)"
      @blur="handleExcerptBlur(editor.id, $event)"
    >

    <!-- 标签栏 -->
    <div
      class="note-tags-bar"
      :data-note-id="editor.id"
    >
      <button
        v-if="getTagsDisplay(editor.id).showAddBtn"
        class="btn-add-tag"
        @click="handleTagClick(editor.id)"
      >
        <i class="fas fa-plus"></i> 添加标签
      </button>
      <div class="note-tags-list">
        <span
          v-for="tag in getTagsDisplay(editor.id).tags"
          :key="tag.id"
          class="note-tag-item"
          :data-tag-id="tag.id"
          @click="handleTagClick(editor.id)"
        >
          <span
            class="note-tag-color"
            :style="{ backgroundColor: tag.color }"
          ></span>
          <span class="note-tag-name">{{ tag.name }}</span>
        </span>
      </div>
    </div>

    <!-- Vditor 容器 -->
    <div
      class="vditor-container"
      :id="`vditor-${editor.id}`"
    ></div>
  </div>
</template>

<style scoped>
.note-editor {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
    display: none;
}

.note-editor.active {
    display: flex;
    flex-direction: column;
}

/* 聚焦 Vditor 时隐藏标题/摘要/标签栏 */
.note-editor.editor-focused .note-title-input,
.note-editor.editor-focused .note-excerpt-input,
.note-editor.editor-focused .note-tags-bar {
    display: none;
}

.note-title-input {
    border: none;
    outline: none;
    font-size: 24px;
    font-weight: 600;
    color: #2d3748;
    padding-bottom: 5px;
    margin: 20px 20px 10px 20px;
    border-bottom: 2px solid #e2e8f0;
}

.note-title-input:focus {
    border-bottom-color: #4299e1;
}

.note-title-input:disabled {
    background-color: #f7fafc;
    color: #718096;
    cursor: not-allowed;
}

.note-excerpt-input {
    border: none;
    outline: none;
    font-size: 14px;
    color: #718096;
    background: transparent;
    padding-bottom: 5px;
    margin: 0 20px 10px 20px;
    border-bottom: 1px solid #e2e8f0;
}

.note-excerpt-input::placeholder {
    color: #a0aec0;
}

.note-excerpt-input:focus {
    border-bottom-color: #4299e1;
}

.note-excerpt-input:disabled {
    background-color: #f7fafc;
    color: #718096;
    cursor: not-allowed;
}

/* 笔记编辑器标签栏 */
.note-tags-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 20px 10px 20px;
    flex-wrap: wrap;
}

.note-tags-list {
    display: flex;
    flex: 1;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
}

.note-tag-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #f7fafc;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid #e2e8f0;
}

.note-tag-item:hover {
    background: #edf2f7;
    border-color: #cbd5e0;
}

.note-tag-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

.note-tag-name {
    font-size: 12px;
    color: #2d3748;
}

.btn-add-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px dashed #a0aec0;
    color: #718096;
    padding: 4px 12px;
    border-radius: 16px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-add-tag:hover {
    border-color: #4299e1;
    color: #4299e1;
    background: #f0f7ff;
}

/* 只读编辑器样式 */
.note-editor.read-only {
    position: relative;
}

.vditor-container {
    flex: 1;
    overflow: auto;
}

/* Vditor 只读模式样式 - 从 vditor.css 移入 */
:deep(.vditor) .vditor-toolbar {
    border-radius: 6px 6px 0 0;
}

:deep(.vditor) .vditor-content {
    border-radius: 0 0 6px 6px;
}

:deep(.vditor-readonly) {
    flex: 1;
    padding: 10px 35px;
    background: #f8fafc;
    border-radius: 8px;
    overflow-y: auto;
    height: calc(100vh - 220px);
    line-height: 1.7;
}

:deep(.vditor-readonly h1),
:deep(.vditor-readonly h2),
:deep(.vditor-readonly h3),
:deep(.vditor-readonly h4),
:deep(.vditor-readonly h5),
:deep(.vditor-readonly h6) {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
    color: #2d3748;
}

:deep(.vditor-readonly h1) { font-size: 2em; }
:deep(.vditor-readonly h2) { font-size: 1.5em; }
:deep(.vditor-readonly h3) { font-size: 1.25em; }
:deep(.vditor-readonly h4) { font-size: 1.1em; }

:deep(.vditor-readonly p) {
    margin-bottom: 1em;
}

:deep(.vditor-readonly pre) {
    background: #2d3748;
    color: #e2e8f0;
    padding: 12px 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1em 0;
}

:deep(.vditor-readonly code) {
    background: #e2e8f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
}

:deep(.vditor-readonly pre code) {
    background: transparent;
    padding: 0;
}

:deep(.vditor-readonly blockquote) {
    border-left: 4px solid #4299e1;
    padding-left: 16px;
    margin: 1em 0;
    color: #718096;
}

:deep(.vditor-readonly ul),
:deep(.vditor-readonly ol) {
    margin: 1em 0;
    padding-left: 2em;
}

:deep(.vditor-readonly li) {
    margin: 0.25em 0;
}

:deep(.vditor-readonly table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
}

:deep(.vditor-readonly th),
:deep(.vditor-readonly td) {
    border: 1px solid #e2e8f0;
    padding: 8px 12px;
    text-align: left;
}

:deep(.vditor-readonly th) {
    background: #f7fafc;
    font-weight: 600;
}

:deep(.vditor-readonly img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
}

:deep(.vditor-readonly a) {
    color: #4299e1;
    text-decoration: none;
}

:deep(.vditor-readonly a:hover) {
    text-decoration: underline;
}

:deep(.vditor-readonly hr) {
    border: none;
    border-top: 2px solid #e2e8f0;
    margin: 2em 0;
}
</style>