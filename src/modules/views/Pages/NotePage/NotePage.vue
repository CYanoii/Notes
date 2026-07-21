<script setup>
import { computed, watch, nextTick, onMounted, reactive, ref } from 'vue'
import { useNotePage } from './useNotePage.js'
import { useWikiLink } from '../WikiLink/useWikiLink.js'
import { useModal } from '../../Modal/useModal.js'
import { EventTypes } from '../../../core/EventTypes.js'
import { escapeHtml } from '../../../utils/helpers.js'
import NoteSuggestionPopup from '../WikiLink/NoteSuggestionPopup.vue'
import StickyPage from '../StickyPage/StickyPage.vue'
import VersionHistoryPanel from './components/VersionHistoryPanel.vue'

// 页面类型常量
const NOTE_PAGE = 'note'
const STICKY_PAGE = 'sticky'

// 检查是否为便签页
function isStickyPage(noteData) {
  return noteData?.pageType === STICKY_PAGE
}

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
} = useNotePage()

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

// Wiki Link 初始化
const wikiLink = useWikiLink()
const { notePicker } = wikiLink

// Modal 初始化
const { showPublishOrDiscard, confirm } = useModal()

// 版本历史相关状态
const showVersionHistory = ref(false)
const versionHistoryList = ref([])

// 检查笔记是否为发布态
function isPublished(noteData) {
  return noteData?.status !== 'trashed' && noteData?.editStatus === 'published'
}

// 检查笔记是否可编辑（编辑态且非回收站）
function isEditable(noteData) {
  return noteData?.status !== 'trashed' && noteData?.editStatus !== 'published'
}

// 获取当前笔记的版本号
function getCurrentVersion(noteData) {
  return noteData?.version || 0
}

// 是否有历史版本
function hasVersionHistory(noteData) {
  return getCurrentVersion(noteData) > 0
}

// 点击"发布/放弃编辑"按钮
async function handlePublishOrDiscard(noteId) {
  const editor = state.editors.get(noteId)
  if (!editor) return

  const noteData = editor.noteData
  const nextVersion = getCurrentVersion(noteData) + 1
  const hasHistory = hasVersionHistory(noteData)

  const result = await showPublishOrDiscard(noteData.title || '无标题笔记', nextVersion, hasHistory)

  if (!result) return

  if (result.action === 'publish') {
    // 发布笔记
    const versionNote = result.versionNote || ''
    try {
      const updated = await window.noteService.publishNote(noteId, versionNote)
      // 直接修改属性以确保响应式更新
      Object.assign(editor.noteData, updated)
      if (window.toastApi) {
        window.toastApi.show(`已发布版本 v${updated.version}`, 'success')
      }
    } catch (error) {
      console.error('发布失败:', error)
      if (window.toastApi) {
        window.toastApi.show('发布失败: ' + error.message, 'error')
      }
    }
  } else if (result.action === 'discard') {
    // 放弃编辑
    try {
      const updated = await window.noteService.abandonEdits(noteId)
      // 直接替换 noteData 以触发响应式更新
      editor.noteData = { ...editor.noteData, ...updated }
      updateEditorContent(noteId, updated.content)
      if (window.toastApi) {
        window.toastApi.show('已放弃编辑，恢复到最新发布版本', 'info')
      }
    } catch (error) {
      console.error('放弃编辑失败:', error)
      if (window.toastApi) {
        window.toastApi.show('放弃编辑失败: ' + error.message, 'error')
      }
    }
  }
}

// 点击"恢复编辑"按钮
async function handleRestoreToEditing(noteId) {
  const editor = state.editors.get(noteId)
  if (!editor) return

  try {
    const updated = await window.noteService.restoreToEditing(noteId)
    // 直接修改属性以确保响应式更新
    Object.assign(editor.noteData, updated)
    // 重新加载完整内容
    const fullNote = await window.noteService.getNote(noteId)
    if (fullNote) {
      editor.noteData.content = fullNote.content
      updateEditorContent(noteId, fullNote.content)
    }
    if (window.toastApi) {
      window.toastApi.show('已恢复编辑模式', 'info')
    }
  } catch (error) {
    console.error('恢复编辑失败:', error)
    if (window.toastApi) {
      window.toastApi.show('恢复编辑失败: ' + error.message, 'error')
    }
  }
}

// 点击历史版本按钮
async function handleShowVersionHistory(noteId) {
  const editor = state.editors.get(noteId)
  if (!editor) return

  try {
    const history = await window.noteService.getVersionHistory(noteId)
    versionHistoryList.value = history
    showVersionHistory.value = true
  } catch (error) {
    console.error('获取版本历史失败:', error)
    if (window.toastApi) {
      window.toastApi.show('获取版本历史失败', 'error')
    }
  }
}

// 关闭历史版本面板
function handleCloseVersionHistory() {
  showVersionHistory.value = false
}

// 预览历史版本 - 打开独立只读页面
function handlePreviewVersion(version) {
  // 关闭历史面板
  showVersionHistory.value = false
  // 通过事件总线打开历史版本页面
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.VERSION.OPEN, state.activeNoteId, version.version)
  }
}

// 回滚到指定版本
async function handleRestoreVersion(version) {
  const noteId = state.activeNoteId
  if (!noteId) return

  // 二次确认
  const confirmed = await confirm(`确定要回滚到 v${version.version} 吗？此操作将丢弃当前所有未发布内容及此版本之后的所有历史发布记录，不可撤销。`)

  if (!confirmed) return

  try {
    const updated = await window.noteService.rollback(noteId, version.version)
    // 关闭历史面板
    showVersionHistory.value = false
    // 更新编辑器数据
    const editor = state.editors.get(noteId)
    if (editor) {
      editor.noteData = { ...editor.noteData, ...updated }
      Object.assign(editor.noteData, updated)
      const fullNote = await window.noteService.getNote(noteId)
      if (fullNote) {
        editor.noteData.content = fullNote.content
        updateEditorContent(noteId, fullNote.content)
      }
    }
    if (window.toastApi) {
      window.toastApi.show(`已回滚到 v${version.version}`, 'success')
    }
  } catch (error) {
    console.error('回滚失败:', error)
    if (window.toastApi) {
      window.toastApi.show('回滚失败: ' + error.message, 'error')
    }
  }
}

// 创建当前笔记的 Vditor 适配器
function createVditorAdapterForCurrentNote() {
  const noteId = notePicker.currentNoteId
  if (!noteId) return null
  const vditor = state.editors.get(noteId)?.vditor
  if (!vditor) return null
  return wikiLink.createVditorAdapter(vditor)
}

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
    window.eventBus.emit(EventTypes.PAGE.UPDATE.TAG, noteId)
  }
}

// 获取标签显示数据
function getTagsDisplay(noteId) {
  const editor = state.editors.get(noteId)
  if (!editor) return { showAddBtn: false, tags: [] }

  const noteTags = Array.isArray(editor.noteData?.tags) ? editor.noteData.tags : []
  const isTrashed = editor.noteData?.status === 'trashed'
  const isPublished = editor.noteData?.editStatus === 'published'
  const hasTags = noteTags.length > 0

  return {
    showAddBtn: !isTrashed && !isPublished && !hasTags,
    tags: noteTags.map(tagId => {
      const tag = editor.allTags?.find(t => t.id === tagId)
      return tag ? { id: tagId, name: tag.name, color: tag.color } : null
    }).filter(Boolean)
  }
}

// 获取引用显示数据
function getReferencesDisplay(noteId) {
  const editor = state.editors.get(noteId)
  if (!editor) return { showAddBtn: false, references: [] }

  const noteRefs = editor.references || []
  const isTrashed = editor.noteData?.status === 'trashed'
  const isPublished = editor.noteData?.editStatus === 'published'
  const hasRefs = noteRefs.length > 0

  return {
    showAddBtn: !isTrashed && !isPublished && !hasRefs,
    references: noteRefs
  }
}

// 刷新引用列表
function handleReferencesRefresh(noteId) {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.UPDATE.REFERENCES, noteId);
  }
}

// 引用项点击 - 滚动到当前笔记中对应的 wiki link 位置
function handleReferenceClick(noteId, editorId) {
  const container = document.getElementById(`vditor-${editorId}`)
  if (!container) return

  // 查找对应的 wiki-link 元素
  const wikiLink = container.querySelector(`.wiki-link[data-note-id="${noteId}"]`)
  if (wikiLink) {
    wikiLink.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // 短暂高亮
    wikiLink.style.backgroundColor = 'var(--accent)'
    wikiLink.style.color = '#fff'
    setTimeout(() => {
      wikiLink.style.backgroundColor = ''
      wikiLink.style.color = ''
    }, 500)
  }
}

// 空引用占位点击 - 显示提示
function handleAddReferenceTip() {
  if (window.toastApi) {
    window.toastApi.show('在编辑区输入 [[]] ，选中其内部来创建引用', 'info')
  }
}

// ============================================================
// Wiki Link 功能已移至 useWikiLink.js composable
// ============================================================

// -- 点击跳转（readonly 渲染结果用）--

function handleWikiLinkClick(e) {
  const link = e.target.closest('.wiki-link')
  if (!link) return
  e.preventDefault()
  e.stopPropagation()
  const noteId = link.getAttribute('data-note-id')
  if (noteId && window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId })
  }
}

// 检测引用变化的函数
function detectReferenceChanges(noteId, oldRefs, newRefs) {
  const oldSet = new Set(oldRefs.map(r => r.id + '|' + (r.alias || '')))
  const newSet = new Set(newRefs.map(r => r.id + '|' + (r.alias || '')))

  const added = newRefs.filter(r => !oldSet.has(r.id + '|' + (r.alias || '')))
  const removed = oldRefs.filter(r => !newSet.has(r.id + '|' + (r.alias || '')))

  if (added.length > 0) {
  }
  if (removed.length > 0) {
  }
}

// ============================================================

// 获取当前主题
function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light'
}

// 初始化 Vditor
async function initVditor(noteId, container, noteData) {
  if (noteData.status === 'trashed' || noteData.editStatus === 'published') {
    // 只读模式：创建编辑器后点击预览按钮
    const vditor = new Vditor(container, {
      placeholder: '...',
      value: noteData.content || '',
      cache: {
        enable: false
      },
      theme: getCurrentTheme(),
      toolbar: [
        { name: 'emoji', tipPosition: 'se' },
        { name: 'headings', tipPosition: 'se' },
        { name: 'bold', tipPosition: 'se', hotkey: '⌘B' },
        { name: 'italic', tipPosition: 'se', hotkey: '⌘I' },
        { name: 'strike', tipPosition: 'se' },
        '|',
        { name: 'line', tipPosition: 's' },
        { name: 'quote', tipPosition: 's', hotkey: '⇧⌘Q' },
        { name: 'ordered-list', tipPosition: 's', hotkey: '⇧⌘{' },
        { name: 'list', tipPosition: 's', hotkey: '⇧⌘}' },
        { name: 'check', tipPosition: 's', hotkey: '⇧⌘J' },
        { name: 'outdent', tipPosition: 's', hotkey: '⌘[' },
        { name: 'indent', tipPosition: 's', hotkey: '⌘]' },
        { name: 'code', tipPosition: 's', hotkey: '⇧⌘K' },
        { name: 'inline-code', tipPosition: 's', hotkey: '⇧⌘~' },
        { name: 'insert-after', tipPosition: 's' },
        { name: 'insert-before', tipPosition: 's' },
        '|',
        { name: 'undo', tipPosition: 's', hotkey: '⌘Z' },
        { name: 'redo', tipPosition: 's', hotkey: '⌘Y' },
        '|',
        { name: 'upload', tipPosition: 's' },
        { name: 'link', tipPosition: 's', hotkey: '⌘K' },
        { name: 'table', tipPosition: 's', hotkey: '⌘T' },
        '|',
        { name: 'preview', tipPosition: 'sw' },
        { name: 'fullscreen', tipPosition: 'sw' },
        {
          hotkey: '⇧⌘R',
          name: 'recovery',
          tipPosition: 'sw',
          tip: '恢复顶部栏',
          className: 'recover',
          icon: '<svg t="1717420000000" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M128 160 L896 160" stroke="#666666" stroke-width="96" stroke-linecap="round" fill="none" /><path d="M512 300 L512 896 M320 700 L512 896 L704 700" stroke="#666666" stroke-width="96" stroke-linecap="round" stroke-linejoin="round" fill="none" /></svg>',
          click() {
            setFocused(false)
            const editorEl = document.getElementById(`note-${noteId}`)
            if (editorEl) {
              editorEl.classList.remove('editor-focused')
            }
          }
        }
      ],
      preview: {
        maxWidth: 1200,
        actions: []
      },
      after: () => {
        // 隐藏工具栏，只保留全屏和恢复顶部栏按钮
        const toolbar = container.querySelector('.vditor-toolbar')
        if (toolbar) {
          // 隐藏所有按钮
          toolbar.querySelectorAll('button').forEach((btn) => {
            const type = btn.getAttribute('data-type')
            if (type === 'fullscreen' || type === 'recovery') {
              return // 保留这两个按钮
            }
            btn.style.display = 'none'
          })
          // 点击预览按钮
          const previewBtn = toolbar.querySelector('button[data-type="preview"]')
          if (previewBtn) {
            previewBtn.click()
            previewBtn.style.display = 'none'
          }
          // 隐藏分隔线
          toolbar.querySelectorAll('.vditor-toolbar__divider').forEach((sep) => {
            sep.style.display = 'none'
          })
          // 隐藏上传按钮（图标按钮）
          toolbar.querySelectorAll('[data-type="upload"], [data-type="link"], [data-type="table"]').forEach((el) => {
            el.style.display = 'none'
          })
        }
        // 点击内容区域时隐藏顶部栏
        container.addEventListener('click', (e) => {
          if (e.target.closest('.vditor-content')) {
            setFocused(true)
            const editorEl = document.getElementById(`note-${noteId}`)
            if (editorEl) {
              editorEl.classList.add('editor-focused')
            }
          }
        })
        // 应用编辑器样式
        applyEditorStyleToVditor(container)
      }
    })
    return vditor
  }

  const vditor = new Vditor(container, {
    placeholder: '开始记录你的想法...',
    value: noteData.content || '',
    cache: {
      enable: false
    },
    theme: getCurrentTheme(),
    toolbar: [
      { name: 'emoji', tipPosition: 'se' },
      { name: 'headings', tipPosition: 'se' },
      { name: 'bold', tipPosition: 'se', hotkey: '⌘B' },
      { name: 'italic', tipPosition: 'se', hotkey: '⌘I' },
      { name: 'strike', tipPosition: 'se' },
      '|',
      { name: 'line', tipPosition: 's' },
      { name: 'quote', tipPosition: 's', hotkey: '⇧⌘Q' },
      { name: 'ordered-list', tipPosition: 's', hotkey: '⇧⌘{' },
      { name: 'list', tipPosition: 's', hotkey: '⇧⌘}' },
      { name: 'check', tipPosition: 's', hotkey: '⇧⌘J' },
      { name: 'outdent', tipPosition: 's', hotkey: '⌘[' },
      { name: 'indent', tipPosition: 's', hotkey: '⌘]' },
      { name: 'code', tipPosition: 's', hotkey: '⇧⌘K' },
      { name: 'inline-code', tipPosition: 's', hotkey: '⇧⌘~' },
      {
        hotkey: '⇧⌘M',
        name: 'math',
        tipPosition: 's',
        tip: '公式块',
        className: 'math-block',
        icon: '<svg t="1717420000000" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M680 160 L240 160 L560 512 L240 864 L680 864" stroke="#666666" stroke-width="96" stroke-linecap="round" stroke-linejoin="round" fill="none" /></svg>',
        click() {
          const selectedText = vditor.getSelection()
          if (selectedText) {
            vditor.insertMD(`$$${selectedText}$$`)
          } else {
            vditor.insertMD('$$\n$$')
          }
        }
      },
      { name: 'insert-after', tipPosition: 's' },
      { name: 'insert-before', tipPosition: 's' },
      '|',
      { name: 'undo', tipPosition: 's', hotkey: '⌘Z' },
      { name: 'redo', tipPosition: 's', hotkey: '⌘Y' },
      '|',
      { name: 'upload', tipPosition: 's' },
      { name: 'link', tipPosition: 's', hotkey: '⌘K' },
      { name: 'table', tipPosition: 's', hotkey: '⌘T' },
      '|',
      { name: 'preview', tipPosition: 'sw' },
      { name: 'fullscreen', tipPosition: 'sw' },
      {
        hotkey: '⇧⌘R',
        name: 'recovery',
        tipPosition: 'sw',
        tip: '恢复顶部栏',
        className: 'recover',
        icon: '<svg t="1717420000000" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M128 160 L896 160" stroke="#666666" stroke-width="96" stroke-linecap="round" fill="none" /><path d="M512 300 L512 896 M320 700 L512 896 L704 700" stroke="#666666" stroke-width="96" stroke-linecap="round" stroke-linejoin="round" fill="none" /></svg>',
        click() {
          setFocused(false)
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
      // 应用编辑器样式
      applyEditorStyleToVditor(container)

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

      // 监听光标移动（鼠标点击、方向键等），检测是否在 [[...]] 内部
      container.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) return  // Ctrl/Cmd+点击由导航处理
        wikiLink.checkCursorForWikiLink(() => noteId)
      })
      container.addEventListener('keyup', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
          wikiLink.checkCursorForWikiLink(() => noteId)
        }
      })

      // IR 模式下 wiki link 点击跳转（仅 Ctrl/Cmd+点击）
      container.addEventListener('click', (e) => {
        const wikiLink = e.target.closest('.wiki-link')
        if (wikiLink) {
          e.stopPropagation()
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const noteId = wikiLink.dataset.noteId
            if (noteId && window.eventBus) {
              window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId })
            }
          }
        }
      })

      // IR 模式下 [[wiki link]] 实时渲染为红色加粗
      const irContent = container.querySelector('.vditor-ir')
      if (irContent) {
        // 待延迟变换的节点（insertMD 后被 detach，需等光标定位完成后再处理）
        let pendingNode = null
        let pendingText = null

        const renderWikiLinkStyle = (textNode) => {
          // 如果是待处理的 pending 节点，跳过（将在 setTimeout 中处理）
          if (textNode === pendingNode) return

          const text = textNode.textContent
          if (!/\[\[[^\]]+\]\]/.test(text)) return

          const parent = textNode.parentNode
          if (!parent || parent.classList.contains('wiki-link')) return

          // 如果有活动的 typingSpan 且指向此节点，延迟处理
          if (notePicker.typingSpan?.node === textNode) {
            pendingNode = textNode
            pendingText = text
            return
          }

          replaceTextWithWikiLinks(parent, textNode, text)
        }

        // 处理延迟的 wiki link 变换（光标定位完成后执行）
        const flushPendingTransform = () => {
          if (!pendingNode || !pendingText) return
          const parent = pendingNode.parentNode
          if (!parent) return

          replaceTextWithWikiLinks(parent, pendingNode, pendingText)
          pendingNode = null
          pendingText = null
        }

        // 将文本中的 [[...]] 替换为 wiki-link span
        const replaceTextWithWikiLinks = (parent, textNode, text) => {
          const fragment = document.createDocumentFragment()
          let lastIndex = 0
          const regex = /\[\[([^\]]+)\]\]/g
          let match

          while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
              fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
            }
            fragment.appendChild(createWikiLinkSpan(match[0]))
            lastIndex = regex.lastIndex
          }
          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
          }

          parent.replaceChild(fragment, textNode)
        }

        // 创建 wiki-link span（复用逻辑）
        // 直接将 [[...]] 文本渲染为链接，保留原文本
        // 设置 contenteditable="false" 防止在 span 内输入
        const createWikiLinkSpan = (fullText) => {
          const span = document.createElement('span')
          span.className = 'wiki-link'
          span.textContent = fullText
          span.contentEditable = 'false'
          // 从 [[id|title]] 中提取 id
          const match = fullText.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/)
          if (match) {
            span.dataset.noteId = match[1]
          }
          return span
        }

        const walkTextNodes = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            renderWikiLinkStyle(node)
          } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('wiki-link')) {
            // 跳过已处理的节点和特殊标记节点
            if (!node.classList.contains('vditor-ir__marker') && node.getAttribute('data-type') !== 'html-inline') {
              node.childNodes.forEach(walkTextNodes)
            }
          }
        }

        const wikiLinkObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  if (node.classList && (node.classList.contains('vditor-ir__node') || node.classList.contains('vditor-ir__node--hidden'))) {
                    node.querySelectorAll(':scope > .vditor-ir__node--hidden').forEach(walkTextNodes)
                  } else {
                    walkTextNodes(node)
                  }
                } else if (node.nodeType === Node.TEXT_NODE) {
                  renderWikiLinkStyle(node)
                }
              })
              // 延迟变换：等光标定位完成后再替换 pending 节点
              setTimeout(flushPendingTransform, 0)
            } else if (mutation.type === 'characterData') {
              walkTextNodes(mutation.target)
            }
          })
        })

        wikiLinkObserver.observe(irContent, { childList: true, subtree: true, characterData: true })

        // 初始化时：遍历已有内容，将 [[...]] 文本替换为 wiki-link span
        walkTextNodes(irContent)
      }
    },
    input: (value) => {
      if (window.eventBus) {
        window.eventBus.emit(EventTypes.NOTE.UPDATE.CONTENT, noteId, value)
      }
      // 检测引用变化
      const editor = state.editors.get(noteId)
      if (editor) {
        const oldRefs = editor.references || []
        const WIKI_LINK_REGEX = /\[\[(\d+)(?:\|([^\]]+))?\]\]/g
        const newRefs = []
        let match
        while ((match = WIKI_LINK_REGEX.exec(value)) !== null) {
          newRefs.push({ id: match[1].trim(), alias: match[2] ? match[2].trim() : null })
        }
        detectReferenceChanges(noteId, oldRefs, newRefs)
        editor.references = newRefs
      }
      // 检测 [[ 触发
      wikiLink.detectTrigger(
        () => noteId,
        (id) => state.editors.get(id)?.noteData?.status === 'trashed'
      )
    }
  })

  return vditor
}

// 应用编辑器样式到 Vditor 实例
function applyEditorStyleToVditor(container) {
  const config = window.editorStyleConfig || {}

  const applyStyle = () => {
    // container 就是 vditor 根元素
    const vditorEl = container.classList.contains('vditor') ? container : container.querySelector('.vditor')
    if (!vditorEl) return false

    let styleEl = vditorEl.querySelector('.vditor-custom-style')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.className = 'vditor-custom-style'
      vditorEl.appendChild(styleEl)
    }

    styleEl.textContent = `
      .vditor-reset, .vditor-readonly, .vditor-preview {
        ${config.fontFamily ? `font-family: ${config.fontFamily} !important;` : ''}
        ${config.fontSize ? `font-size: ${config.fontSize}px !important;` : ''}
        ${config.lineHeight ? `line-height: ${config.lineHeight} !important;` : ''}
      }
      .vditor-reset p, .vditor-readonly p, .vditor-preview p {
        ${config.paragraphSpacing ? `margin-bottom: ${config.paragraphSpacing}px !important;` : ''}
      }
      .vditor-reset > p:last-child, .vditor-readonly > p:last-child, .vditor-preview > p:last-child {
        margin-bottom: 0 !important;
      }
    `
    return true
  }

  // 如果 vditor 还没创建完成，延迟重试
  if (!applyStyle()) {
    setTimeout(() => applyStyle(), 200)
  }
}

// 更新所有 Vditor 实例的主题
function updateVditorTheme() {
  const theme = getCurrentTheme()
  state.editors.forEach((editor, noteId) => {
    if (editor.vditor && editor.vditor.vditor) {
      editor.vditor.vditor.getElement().setAttribute('data-theme', theme)
    }
  })
}

// 监听主题变化
function observeThemeChanges() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        updateVditorTheme()
      }
    })
  })
  observer.observe(document.documentElement, { attributes: true })
}

// 初始化所有已存在的编辑器
async function initializeExistingEditors() {
  await nextTick()
  for (const [noteId, editor] of state.editors) {
    const container = document.getElementById(`vditor-${noteId}`)
    if (container && !editor.vditor) {
      const vditor = await initVditor(noteId, container, editor.noteData)
      if (vditor) {
        setVditor(noteId, vditor)
      }
    }
  }
}

// 监听编辑器变化，初始化 Vditor
watch(
  () => state.editors.size,
  async () => {
    await nextTick()
    for (const [noteId, editor] of state.editors) {
      if (!editor.vditor) {
        const container = document.getElementById(`vditor-${noteId}`)
        if (container) {
          const vditor = await initVditor(noteId, container, editor.noteData)
          if (vditor) {
            setVditor(noteId, vditor)
          }
        }
      }
    }
  }
)

// 监听当前激活笔记的 editStatus 变化，重新初始化编辑器
watch(
  () => {
    const editor = state.editors.get(state.activeNoteId)
    return editor?.noteData?.editStatus
  },
  async (newStatus, oldStatus) => {
    if (newStatus === oldStatus) return
    await nextTick()
    const noteId = state.activeNoteId
    if (!noteId) return

    const editor = state.editors.get(noteId)
    if (!editor) return

    // 销毁旧的 Vditor 实例
    if (editor.vditor) {
      editor.vditor.destroy()
      editor.vditor = null
      setVditor(noteId, null)
    }

    // 清空容器
    const container = document.getElementById(`vditor-${noteId}`)
    if (container) {
      container.innerHTML = ''
    }

    // 重新初始化编辑器
    await nextTick()
    if (container) {
      const vditor = await initVditor(noteId, container, editor.noteData)
      if (vditor) {
        setVditor(noteId, vditor)
      }
    }
  }
)

// 组件挂载时初始化已存在的编辑器
onMounted(() => {
  initializeExistingEditors()
  observeThemeChanges()
})
</script>

<template>
  <!-- 动态笔记编辑器容器 -->
  <div class="editor-root" v-bind="$attrs">
    <div
      v-for="editor in editorList"
      :key="editor.id"
      :id="`note-${editor.id}`"
      class="note-editor"
      :class="{
        active: activeNoteId === editor.id,
        'read-only': editor.noteData?.status === 'trashed' || editor.noteData?.editStatus === 'published',
        'editor-focused': isFocused && activeNoteId === editor.id && editor.noteData?.editStatus !== 'published'
      }"
    >
      <!-- 便签页 -->
      <StickyPage
        v-if="isStickyPage(editor.noteData)"
        :noteData="editor.noteData"
      />

      <!-- 笔记页 -->
      <template v-else>
        <!-- 标题输入 -->
        <input
          type="text"
          class="note-title-input"
          v-model="editor.noteData.title"
          placeholder="输入标题..."
          :disabled="editor.noteData?.status === 'trashed' || editor.noteData?.editStatus === 'published'"
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
          :disabled="editor.noteData?.status === 'trashed' || editor.noteData?.editStatus === 'published'"
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

      <!-- 引用列表 -->
      <div
        class="note-references-bar"
        :data-note-id="editor.id"
      >
        <button
          v-if="getReferencesDisplay(editor.id).showAddBtn"
          class="btn-add-reference"
          @click="handleAddReferenceTip"
        >
          <i class="fas fa-plus"></i> 创建引用
        </button>
        <div class="references-list">
          <span
            v-for="ref in getReferencesDisplay(editor.id).references"
            :key="ref.id"
            class="reference-item"
            :class="{ 'missing': ref.missing }"
            @click="handleReferenceClick(ref.id, editor.id)"
          >
            <i class="fas fa-link reference-icon"></i>
            <span class="reference-title">{{ ref.alias || ref.title }}</span>
          </span>
        </div>
      </div>

      <!-- Vditor 容器 -->
      <div
        class="vditor-container"
        :id="`vditor-${editor.id}`"
      ></div>
      </template>
    </div>
  </div>

  <!-- Wiki Link 笔记选择浮层 -->
  <NoteSuggestionPopup
    :visible="notePicker.visible"
    :notes="notePicker.notes"
    :selectedIndex="notePicker.selectedIndex"
    :searchQuery="notePicker.searchQuery"
    :position="notePicker.position"
    @update:searchQuery="wikiLink.updateNotePickerSearch"
    @update:selectedIndex="(idx) => notePicker.selectedIndex = idx"
    @select="(noteId) => wikiLink.handleNotePickerSelect(createVditorAdapterForCurrentNote(), noteId)"
    @close="wikiLink.closeNotePicker"
  />

  <!-- 功能按钮组（圆形图标，仅图标） -->
  <div class="action-buttons-group">
    <!-- 发布态：恢复编辑按钮 -->
    <div
      v-if="activeNoteId && isPublished(state.editors.get(activeNoteId)?.noteData)"
      class="action-btn restore-editing-btn"
      @click="handleRestoreToEditing(activeNoteId)"
      title="恢复编辑"
    >
      <i class="fas fa-edit"></i>
    </div>

    <!-- 编辑态：发布按钮 -->
    <div
      v-if="activeNoteId && isEditable(state.editors.get(activeNoteId)?.noteData)"
      class="action-btn publish-btn"
      @click="handlePublishOrDiscard(activeNoteId)"
      title="发布"
    >
      <i class="fas fa-upload"></i>
    </div>

    <!-- 历史版本按钮 -->
    <div
      v-if="activeNoteId && hasVersionHistory(state.editors.get(activeNoteId)?.noteData)"
      class="action-btn version-history-btn"
      @click="handleShowVersionHistory(activeNoteId)"
      title="版本历史"
    >
      <i class="fas fa-history"></i>
    </div>
  </div>

  <!-- 历史版本面板 -->
  <VersionHistoryPanel
    v-if="showVersionHistory && activeNoteId"
    :versions="versionHistoryList"
    :currentVersion="getCurrentVersion(state.editors.get(activeNoteId)?.noteData)"
    @close="handleCloseVersionHistory"
    @preview="handlePreviewVersion"
    @restore="handleRestoreVersion"
  />
</template>

<style scoped>
.editor-root {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.editor-root > * {
    pointer-events: auto;
}

.note-editor {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--editor-bg);
    display: none;
}

.note-editor.active {
    display: flex;
    flex-direction: column;
    z-index: 1;
}

/* 聚焦 Vditor 时隐藏标题/摘要/标签栏/引用列表 */
.note-editor.editor-focused .note-title-input,
.note-editor.editor-focused .note-excerpt-input,
.note-editor.editor-focused .note-tags-bar,
.note-editor.editor-focused .note-references-bar {
    display: none;
}

.note-title-input {
    border: none;
    outline: none;
    font-size: 24px;
    font-weight: 600;
    color: var(--editor-title-color);
    padding-bottom: 5px;
    margin: 20px 20px 10px 20px;
    border-bottom: 2px solid var(--editor-title-border);
    background: transparent;
}

.note-title-input:focus {
    border-bottom-color: var(--accent);
}

.note-title-input:disabled {
    background-color: var(--editor-tags-bg);
    color: var(--text-muted);
    cursor: not-allowed;
}

.note-excerpt-input {
    border: none;
    outline: none;
    font-size: 14px;
    color: var(--editor-excerpt-color);
    background: transparent;
    padding-bottom: 5px;
    margin: 0 20px 10px 20px;
    border-bottom: 1px solid var(--editor-title-border);
}

.note-excerpt-input::placeholder {
    color: var(--text-muted);
}

.note-excerpt-input:focus {
    border-bottom-color: var(--accent);
}

.note-excerpt-input:disabled {
    background-color: var(--editor-tags-bg);
    color: var(--text-muted);
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
    background: var(--editor-tags-bg);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid var(--editor-tags-border);
}

.note-tag-item:hover {
    background: var(--editor-tags-hover-bg);
    border-color: var(--text-muted);
}

.note-tag-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

.note-tag-name {
    font-size: 12px;
    color: var(--text-primary);
}

.btn-add-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px dashed var(--editor-add-tag-border);
    color: var(--editor-add-tag-color);
    padding: 4px 12px;
    border-radius: 16px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-add-tag:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--editor-tags-hover-bg);
}

/* 引用列表栏 - 模仿标签栏样式 */
.note-references-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 20px 10px 20px;
    flex-wrap: wrap;
}

.references-list {
    display: flex;
    flex: 1;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
}

.reference-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--editor-tags-bg);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid var(--editor-tags-border);
}

.reference-item:hover {
    background: var(--editor-tags-hover-bg);
    border-color: var(--text-muted);
}

.reference-item.missing {
    opacity: 0.5;
    cursor: not-allowed;
}

.reference-icon {
    font-size: 10px;
    color: var(--text-muted);
}

.reference-title {
    font-size: 12px;
    color: var(--text-primary);
}

.btn-add-reference {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px dashed var(--editor-add-tag-border);
    color: var(--editor-add-tag-color);
    padding: 4px 12px;
    border-radius: 16px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-add-reference:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--editor-tags-hover-bg);
}

.btn-add-reference:active {
    transform: scale(0.98);
}

/* 功能按钮组 */
.action-buttons-group {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 100;
}

.action-btn {
    width: 44px;
    height: 44px;
    background: var(--modal-bg);
    color: var(--modal-text-secondary);
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.15s ease;
}

.action-btn:hover {
    background: var(--accent);
    color: white;
}

.restore-editing-btn:hover,
.publish-btn:hover,
.version-history-btn:hover {
    background: var(--accent);
    color: white;
}

/* 只读编辑器样式 */
.note-editor.read-only {
    position: absolute;
}

.vditor-container {
    flex: 1;
    overflow: auto;
}

/* 移除 Vditor 最外层边框和圆角 */
:deep(.vditor) {
    border: none !important;
    border-radius: 0 !important;
}

/* 取消选中时背景加深效果 */
:deep(.vditor-container) {
    --textarea-background-color: var(--editor-bg) !important;
}

:deep(.vditor) .vditor-content {
    background: var(--editor-bg) !important;
}

/* Vditor 边框颜色一致 */
:deep(.vditor) {
    --border-color: var(--editor-title-border) !important;
    --textarea-bg-color: var(--editor-bg) !important;
    --textarea-color: var(--text-primary) !important;
}

/* toolbar 添加上方边框 */
:deep(.vditor) .vditor-toolbar {
    border-top: 1px solid var(--editor-title-border);
}

/* 修复深色模式下文字颜色和背景 */
:deep(.vditor) .vditor-content .vditor-reset {
    color: var(--text-primary) !important;
    background: var(--editor-bg) !important;
}

:deep(.vditor) .vditor-content .vditor-reset:focus {
    background: var(--editor-bg) !important;
}

:deep(.vditor) textarea {
    color: var(--text-primary) !important;
    background: var(--editor-bg) !important;
}

:deep(.vditor) .vditor-reset pre {
    background: var(--sidebar-content-bg) !important;
    color: var(--text-primary) !important;
}

/* Vditor 只读模式样式 - 从 vditor.css 移入 */
:deep(.vditor) .vditor-toolbar {
    border-radius: 0;
}

:deep(.vditor) .vditor-content {
    border-radius: 0;
}

:deep(.vditor-readonly) {
    flex: 1;
    padding: 10px 35px;
    background: var(--editor-bg);
    border-radius: 8px;
    overflow-y: auto;
    height: calc(100vh - 220px);
    line-height: 1.7;
    color: var(--text-primary);
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
    color: var(--text-primary);
}

:deep(.vditor-readonly h1) { font-size: 2em; }
:deep(.vditor-readonly h2) { font-size: 1.5em; }
:deep(.vditor-readonly h3) { font-size: 1.25em; }
:deep(.vditor-readonly h4) { font-size: 1.1em; }

:deep(.vditor-readonly p) {
    margin-bottom: 1em;
}

:deep(.vditor-readonly pre) {
    background: var(--sidebar-content-bg);
    color: var(--text-secondary);
    padding: 12px 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1em 0;
}

:deep(.vditor-readonly code) {
    background: var(--editor-tags-bg);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
}

:deep(.vditor-readonly pre code) {
    background: transparent;
    padding: 0;
}

:deep(.vditor-readonly blockquote) {
    border-left: 4px solid var(--accent);
    padding-left: 16px;
    margin: 1em 0;
    color: var(--text-muted);
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
    border: 1px solid var(--panel-border);
    padding: 8px 12px;
    text-align: left;
}

:deep(.vditor-readonly th) {
    background: var(--editor-tags-bg);
    font-weight: 600;
}

:deep(.vditor-readonly img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
}

:deep(.vditor-readonly a) {
    color: var(--accent);
    text-decoration: none;
}

:deep(.vditor-readonly a:hover) {
    text-decoration: underline;
}

:deep(.vditor-readonly .wiki-link) {
    color: var(--accent);
    cursor: pointer;
    text-decoration: none;
    border-bottom: 1px dashed var(--accent);
    transition: opacity 0.2s;
}

:deep(.vditor-readonly .wiki-link:hover) {
    opacity: 0.8;
    border-bottom-style: solid;
}

/* IR 模式下动态渲染的 wiki link（沿用只读样式） */
:deep(.vditor-ir .wiki-link) {
    color: var(--accent);
    cursor: pointer;
    text-decoration: none;
    border-bottom: 1px dashed var(--accent);
    transition: opacity 0.2s;
}

:deep(.vditor-ir .wiki-link:hover) {
    opacity: 0.8;
    border-bottom-style: solid;
}

:deep(.vditor-readonly hr) {
    border: none;
    border-top: 2px solid var(--panel-border);
    margin: 2em 0;
}
</style>