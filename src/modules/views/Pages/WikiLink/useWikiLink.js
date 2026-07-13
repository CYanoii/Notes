/**
 * useWikiLink - Wiki Link 功能的组合式函数
 * 使用编辑器适配器模式，支持 Vditor 和 ContentEditable 等不同编辑器
 *
 * @param {Object} editorAdapter - 编辑器适配器
 * @param {Function} editorAdapter.insertMD - 插入 markdown 内容
 * @param {Function} editorAdapter.getElement - 获取编辑器 DOM 元素
 * @param {Object} callbacks - 回调函数
 * @param {Function} callbacks.getCurrentNoteId - 获取当前笔记 ID
 * @param {Function} callbacks.isEditorTrashed - 检查编辑器是否在回收站
 */
import { reactive } from 'vue'
import { escapeHtml } from '../../../utils/helpers.js'

// Wiki Link 正则：匹配 [[id|Title]] 或 [[id]]
const WIKI_LINK_REGEX = /\[\[(\d+)(?:\|([^\]]+))?\]\]/g

// Wiki Link 选择浮层状态
const notePicker = reactive({
  visible: false,
  notes: [],
  selectedIndex: 0,
  searchQuery: '',
  position: { top: 0, left: 0 },
  typingSpan: null,
  currentNoteId: null,
  existingSpan: null
})

// 缓存所有笔记数据
let allNotesCache = []

/** 当前是否已有打开的 picker */
let activePicker = false

/**
 * 将光标定位到 ]] 正后方
 * @param {{node: Text, offset: number}|null} typingSpan - [[ 的起始位置
 */
function positionCursorAfterWikiLink(typingSpan) {
  if (!typingSpan || !typingSpan.node || typingSpan.node.nodeType !== Node.TEXT_NODE) return

  const { node, offset } = typingSpan
  const text = node.textContent
  const MAX_WIKI_LINK_LENGTH = 50

  for (let i = offset; i < offset + MAX_WIKI_LINK_LENGTH && i < text.length - 1; i++) {
    if (text[i] === ']' && text[i + 1] === ']') {
      const sel = window.getSelection()
      if (!sel) return
      const range = document.createRange()
      range.setStart(node, i + 2)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
  }
}

/**
 * 将光标定位到 [[ 正前方
 * @param {{node: Text, offset: number}|null} typingSpan - [[ 的起始位置
 */
function positionCursorBeforeWikiLink(typingSpan) {
  if (!typingSpan || !typingSpan.node || typingSpan.node.nodeType !== Node.TEXT_NODE) return

  const { node, offset } = typingSpan
  const text = node.textContent
  const MAX_SEARCH = 30

  for (let i = offset - 1; i >= 0 && offset - i <= MAX_SEARCH; i--) {
    if (text[i] === '[' && text[i + 1] === '[') {
      const sel = window.getSelection()
      if (!sel) return
      const range = document.createRange()
      range.setStart(node, i)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
  }
}

/**
 * 保护闭合的 wiki link 不被 marked 转义
 */
function protectWikiLinks(text) {
  const links = []
  let index = 0
  const regex = new RegExp(WIKI_LINK_REGEX.source, 'g')
  const result = text.replace(regex, (match, id, alias) => {
    const placeholder = `\x00WKLK${index}\x00`
    links.push({ placeholder, id: id.trim(), alias: alias ? alias.trim() : null })
    index++
    return placeholder
  })
  return { protected: result, links }
}

/**
 * 将 wiki link 占位符还原为 HTML span
 */
function restoreWikiLinks(html, wikiLinks, noteMetadata = new Map()) {
  let result = html
  wikiLinks.forEach(({ placeholder, id, alias }) => {
    const meta = noteMetadata.get(id)
    const displayTitle = alias || (meta ? meta.title : `笔记 ${id}`)
    const fullText = `[[${id}|${displayTitle}]]`
    const linkHtml = `<span class="wiki-link" data-note-id="${escapeHtml(id)}" title="跳转到: ${escapeHtml(displayTitle)}">${escapeHtml(fullText)}</span>`
    result = result.replace(placeholder, linkHtml)
  })
  return result
}

/**
 * 渲染 Markdown（含 wiki link 转换）
 */
function renderMarkdown(content, noteMetadata = new Map()) {
  if (!content) return ''
  if (typeof window.marked !== 'undefined') {
    const { protected: protectedContent, links: wikiLinks } = protectWikiLinks(content)
    let html = window.marked.parse(protectedContent)
    html = restoreWikiLinks(html, wikiLinks, noteMetadata)
    return html
  }
  return escapeHtml(content)
}

/**
 * 判断光标是否处于 [[ 和 ]] 之间
 * 搜索范围：左右各最多 30 字符
 */
function getCursorWikiLinkInfo(range) {
  if (!range) return { isInside: false, span: null, noteId: null, isTypingNew: false, typingSpan: null }

  const node = range.startContainer
  const offset = range.startOffset

  // 情况1：光标在一个已渲染的 .wiki-link span 内
  const wikiLinkSpan = node.nodeType === Node.TEXT_NODE
    ? node.parentElement?.closest('.wiki-link')
    : node.closest?.('.wiki-link')

  if (wikiLinkSpan) {
    return {
      isInside: true,
      span: wikiLinkSpan,
      noteId: wikiLinkSpan.dataset.noteId || null,
      isTypingNew: false,
      typingSpan: null
    }
  }

  // 情况2：光标不在 span 内，基于 DOM 文本节点做左右扫描
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || ''
    const beforeCursor = text.substring(0, offset)
    const afterCursor = text.substring(offset)

    const MAX_SEARCH = 30

    // 左扫：找最近的 [[ 或 ]]
    let leftOpenPos = -1
    let leftTerminator = null
    for (let i = beforeCursor.length - 1; i >= 0 && beforeCursor.length - i <= MAX_SEARCH; i--) {
      if (beforeCursor[i] === '[' && beforeCursor[i + 1] === '[') {
        leftOpenPos = i
        leftTerminator = '[['
        break
      }
      if (beforeCursor[i] === ']' && beforeCursor[i + 1] === ']') {
        leftOpenPos = i
        leftTerminator = ']]'
        break
      }
    }

    // 右扫：找最近的 [[ 或 ]]
    let rightClosePos = -1
    let rightTerminator = null
    for (let i = 0; i < afterCursor.length && i < MAX_SEARCH; i++) {
      if (afterCursor[i] === ']' && afterCursor[i + 1] === ']') {
        rightClosePos = i
        rightTerminator = ']]'
        break
      }
      if (afterCursor[i] === '[' && afterCursor[i + 1] === '[') {
        rightClosePos = i
        rightTerminator = '[['
        break
      }
    }

    // 触发条件：左边先找到 [[ 且 右边先找到 ]]
    if (leftTerminator === '[[' && rightTerminator === ']]') {
      return {
        isInside: true,
        span: null,
        noteId: null,
        isTypingNew: true,
        typingSpan: { node, offset: leftOpenPos }
      }
    }
  }

  return { isInside: false, span: null, noteId: null, isTypingNew: false, typingSpan: null }
}

/**
 * 检测输入时是否在 wiki link 内部，触发笔记选择器
 */
function detectWikiLinkTrigger(getCurrentNoteId, isEditorTrashed) {
  const noteId = getCurrentNoteId()
  if (!noteId) return
  if (isEditorTrashed(noteId)) return
  if (activePicker) return

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)

  const { isInside, isTypingNew, typingSpan } = getCursorWikiLinkInfo(range)

  if (!isInside || !isTypingNew) return

  activePicker = true
  showNotePickerModal(noteId, typingSpan, range)
}

/**
 * 检测光标移动（点击、方向键）时是否在 wiki link 内部
 */
function checkCursorForWikiLink(getCurrentNoteId) {
  const noteId = getCurrentNoteId()
  if (!noteId) return

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)

  const { isInside, span, isTypingNew } = getCursorWikiLinkInfo(range)

  if (!isInside) return
  if (activePicker) return

  activePicker = true
  const typingSpan = isTypingNew
    ? { node: range.startContainer, offset: range.startOffset }
    : null
  showNotePickerModal(noteId, typingSpan, range, span)
}

/**
 * 使用指定的 range 检测光标是否在 wiki link 内部（用于 contenteditable 点击）
 */
function checkCursorForWikiLinkWithRange(range, getCurrentNoteId) {
  const noteId = getCurrentNoteId()
  if (!noteId) return

  if (!range) return

  const { isInside, span, isTypingNew } = getCursorWikiLinkInfo(range)

  if (!isInside) return
  if (activePicker) return

  activePicker = true
  const typingSpan = isTypingNew
    ? { node: range.startContainer, offset: range.startOffset }
    : null
  showNotePickerModal(noteId, typingSpan, range, span)
}

/**
 * 选择笔记后，替换 [[...]] 中间的内容
 */
async function resolveWikiLink(editorAdapter, selectedNoteId, typingSpan = null) {
  const note = await window.electronAPI.getNote(selectedNoteId)
  const displayTitle = note ? (note.title || '无标题笔记') : '笔记'

  if (!editorAdapter || typeof editorAdapter.insertMD !== 'function') return
  if (!typingSpan || !typingSpan.node || typingSpan.node.nodeType !== Node.TEXT_NODE) return

  const { node, offset } = typingSpan
  const text = node.textContent

  // 向前找 [[
  let openStart = -1
  for (let i = offset - 1; i >= 0 && offset - i <= 30; i--) {
    if (text[i] === '[' && text[i + 1] === '[') {
      openStart = i
      break
    }
  }
  if (openStart === -1) return

  // 向后找 ]]
  let closeEnd = -1
  for (let i = offset; i < text.length && i - offset <= 30; i++) {
    if (text[i] === ']' && text[i + 1] === ']') {
      closeEnd = i + 2
      break
    }
  }
  if (closeEnd === -1) return

  // 选中 [[...]] 全部（包括括号）
  const sel = window.getSelection()
  const range = document.createRange()
  range.setStart(node, openStart)
  range.setEnd(node, closeEnd)
  sel.removeAllRanges()
  sel.addRange(range)

  // 一次性插入带括号的完整 wiki link
  editorAdapter.insertMD(`[[${selectedNoteId}|${displayTitle}]]`)

  // 将光标定位到 ]] 正后方
  positionCursorAfterWikiLink(typingSpan)
}

/**
 * 显示笔记选择器
 */
async function showNotePickerModal(currentNoteId, typingSpan, range, existingSpan = null) {
  try {
    if (allNotesCache.length === 0) {
      const allNotes = await window.electronAPI.getAllNotes()
      allNotesCache = allNotes
    }

    const availableNotes = allNotesCache
      .filter(n => n.id !== currentNoteId)
      .map(n => ({ id: n.id, title: n.title, excerpt: n.excerpt || '' }))

    let top = 0, left = 0
    if (range) {
      const rect = range.getBoundingClientRect()
      top = rect.bottom + 8
      left = rect.left
    }

    notePicker.visible = true
    notePicker.notes = availableNotes
    notePicker.selectedIndex = 0
    notePicker.searchQuery = ''
    notePicker.position = { top, left }
    notePicker.typingSpan = typingSpan
    notePicker.currentNoteId = currentNoteId
    notePicker.existingSpan = existingSpan
  } catch (error) {
    console.error('[WikiLink] 显示笔记选择器失败:', error)
    activePicker = false
  }
}

/**
 * Wiki Link 选择器选择处理
 */
async function handleNotePickerSelect(editorAdapter, noteId) {
  if (!noteId) return

  const existingSpan = notePicker.existingSpan
  if (existingSpan) {
    const note = await window.electronAPI.getNote(noteId)
    const displayTitle = note ? (note.title || '无标题笔记') : '笔记'
    const currentNoteId = notePicker.currentNoteId
    existingSpan.textContent = `[[${noteId}|${displayTitle}]]`
    existingSpan.dataset.noteId = noteId
    existingSpan.title = `跳转到: ${displayTitle}`
    notePicker.existingSpan = null

    requestAnimationFrame(() => {
      const editorEl = document.getElementById(`note-${currentNoteId}`)
      const vditorContent = editorEl?.querySelector('.vditor-ir')
      if (vditorContent?.contains(existingSpan)) {
        vditorContent.focus()
        const sel = window.getSelection()
        if (sel) {
          const range = document.createRange()
          range.setStartAfter(existingSpan)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }
    })
  } else {
    if (editorAdapter) {
      resolveWikiLink(editorAdapter, noteId, notePicker.typingSpan)
    }
  }

  notePicker.visible = false
  notePicker.notes = []
  notePicker.typingSpan = null
  notePicker.currentNoteId = null
  activePicker = false
}

/**
 * 关闭笔记选择器
 */
function closeNotePicker(direction = null) {
  if (direction === 'left') {
    if (notePicker.typingSpan) {
      positionCursorBeforeWikiLink(notePicker.typingSpan)
    } else if (notePicker.existingSpan) {
      const sel = window.getSelection()
      if (sel) {
        const range = document.createRange()
        range.setStartBefore(notePicker.existingSpan)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  } else if (direction === 'right') {
    if (notePicker.typingSpan) {
      positionCursorAfterWikiLink(notePicker.typingSpan)
    } else if (notePicker.existingSpan) {
      const sel = window.getSelection()
      if (sel) {
        const range = document.createRange()
        range.setStartAfter(notePicker.existingSpan)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }
  notePicker.visible = false
  notePicker.notes = []
  notePicker.typingSpan = null
  notePicker.currentNoteId = null
  notePicker.existingSpan = null
  activePicker = false
}

/**
 * 更新笔记选择器搜索
 */
function updateNotePickerSearch(query) {
  notePicker.searchQuery = query
  const lowerQuery = query.toLowerCase()
  const availableNotes = allNotesCache
    .filter(n => n.id !== notePicker.currentNoteId)
    .filter(n =>
      n.title.toLowerCase().includes(lowerQuery) ||
      (n.excerpt && n.excerpt.toLowerCase().includes(lowerQuery))
    )
    .map(n => ({ id: n.id, title: n.title, excerpt: n.excerpt || '' }))
  notePicker.notes = availableNotes
  notePicker.selectedIndex = 0
}

/**
 * 统一的触发检测函数（供外部调用）
 */
function detectTrigger(getCurrentNoteId, isEditorTrashed) {
  detectWikiLinkTrigger(getCurrentNoteId, isEditorTrashed)
}

/**
 * 创建 Vditor 适配器
 */
function createVditorAdapter(vditor) {
  return {
    insertMD: (content) => vditor.insertMD(content),
    getValue: () => vditor.getValue(),
    getElement: () => vditor.getElement?.() || document.querySelector('.vditor-ir')
  }
}

/**
 * 创建 ContentEditable 适配器
 */
function createContentEditableAdapter(contentElement) {
  return {
    insertMD: (content) => {
      const selection = window.getSelection()
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(content))
        range.collapse(false)
      }
    },
    getValue: () => contentElement?.innerText || '',
    getElement: () => contentElement
  }
}

export function useWikiLink() {
  return {
    // 状态
    notePicker,

    // 检测函数
    detectTrigger,
    checkCursorForWikiLink,
    checkCursorForWikiLinkWithRange,
    getCursorWikiLinkInfo,

    // 选择器操作
    handleNotePickerSelect,
    closeNotePicker,
    updateNotePickerSearch,

    // 渲染辅助
    protectWikiLinks,
    restoreWikiLinks,
    renderMarkdown,

    // 适配器工厂
    createVditorAdapter,
    createContentEditableAdapter,

    // 适配器方法
    resolveWikiLink,

    // 常量
    WIKI_LINK_REGEX
  }
}

export { WIKI_LINK_REGEX, notePicker }
