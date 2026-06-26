<script setup>
import { computed, watch, nextTick, onMounted, reactive, ref } from 'vue'
import { useEditor } from './useEditor.js'
import { EventTypes } from '../../core/EventTypes.js'
import { escapeHtml } from '../../utils/helpers.js'
import NoteSuggestionPopup from './components/NoteSuggestionPopup.vue'

// Wiki Link 正则：匹配 [[id|Title]] 或 [[id]]
const WIKI_LINK_REGEX = /\[\[(\d+)(?:\|([^\]]+))?\]\]/g;

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

// Wiki Link 选择浮层状态
const notePicker = reactive({
  visible: false,
  notes: [],
  selectedIndex: 0,
  searchQuery: '',
  position: { top: 0, left: 0 },
  typingSpan: null,
  currentNoteId: null
})

// 缓存所有笔记数据
let allNotesCache = []

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

  const noteTags = Array.isArray(editor.noteData?.tags) ? editor.noteData.tags : []
  const isTrashed = editor.noteData?.status === 'trashed'
  const hasTags = noteTags.length > 0

  return {
    showAddBtn: !isTrashed && !hasTags,
    tags: noteTags.map(tagId => {
      const tag = editor.allTags?.find(t => t.id === tagId)
      return tag ? { id: tagId, name: tag.name, color: tag.color } : null
    }).filter(Boolean)
  }
}

// 获取引用显示数据
function getReferencesDisplay(noteId) {
  const editor = state.editors.get(noteId)
  if (!editor) return { references: [] }
  return {
    references: editor.references || []
  }
}

// 刷新引用列表
function handleReferencesRefresh(noteId) {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.UPDATE.REFERENCES, noteId);
  }
}

// 引用项点击跳转
function handleReferenceClick(noteId) {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.NOTE.OPEN, { id: noteId })
  }
}

// ============================================================
// Wiki Link 工具
// 规则：
//  1. 渲染时：只有闭合的 [[id|Title]] 或 [[id]] 才渲染为可点击链接
//  2. 输入时：光标在 [[...]] 内部时（无论中间是否有内容），弹出笔记选择器
//  3. 选择后：清空括号中的现存内容，覆盖为 [[id|Title]]
//  4. 其它任何时候不触发
// ============================================================

/**
 * 将光标定位到 ]] 正后方
 * @param {{node: Text, offset: number}|null} typingSpan - [[ 的起始位置
 */
function positionCursorAfterWikiLink(typingSpan) {
  if (!typingSpan || !typingSpan.node || typingSpan.node.nodeType !== Node.TEXT_NODE) return

  const { node, offset } = typingSpan
  const text = node.textContent
  const MAX_WIKI_LINK_LENGTH = 50

  // 从 offset 位置开始向前查找 ]]（因为插入后 text 已变化）
  // 搜索范围：[offset, offset + MAX_WIKI_LINK_LENGTH)
  for (let i = offset; i < offset + MAX_WIKI_LINK_LENGTH && i < text.length - 1; i++) {
    if (text[i] === ']' && text[i + 1] === ']') {
      // 定位到 ]] 正后方
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

  // 向前找 [[ 的位置
  for (let i = offset - 1; i >= 0 && offset - i <= MAX_SEARCH; i--) {
    if (text[i] === '[' && text[i + 1] === '[') {
      // 定位到 [[ 正前方
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

// -- 渲染（readonly/trash 模式用）--

/**
 * 保护闭合的 wiki link 不被 marked 转义
 * 只匹配 [[id|Title]] 和 [[id]]（有闭合 ]]）
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

// -- 触发检测（编辑模式用）--

/** 当前是否已有打开的 picker */
let activePicker = false

/**
 * 判断光标是否处于 [[ 和 ]] 之间
 * 搜索范围：左右各最多 50 字符
 *
 * 核心策略：
 * - 左扫：找最近的 [[ 或 ]]
 *   - 如果先找到 [[ → 说明左边有引用开始
 *   - 如果先找到 ]] → 说明左边有其它引用结束，当前光标在引用外部
 * - 右扫：找最近的 [[ 或 ]]
 *   - 如果先找到 ]] → 说明右边有引用结束
 *   - 如果先找到 [[ → 说明右边有其它引用开始，当前光标在引用外部
 * - 触发条件：左边先找到 [[ 且 右边先找到 ]]
 *
 * @returns {object} {
 *   isInside: boolean,       // 光标是否在 [[...]] 内部
 *   leftOpenPos: number,    // 左边 [[ 的位置（未找到为 -1）
 *   rightClosePos: number,  // 右边 ]] 的位置（未找到为 -1）
 * }
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
    const beforeCursor = text.substring(0, offset)  // 光标左侧文本
    const afterCursor = text.substring(offset)     // 光标右侧文本

    const MAX_SEARCH = 30

    // 左扫：找最近的 [[ 或 ]]
    let leftOpenPos = -1
    let leftTerminator = null  // '[[' 或 ']]'
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
    let rightTerminator = null  // '[[' 或 ']]'
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
 * 使用 DOM 而非纯文本位置判断
 */
function detectWikiLinkTrigger(vditor, noteId) {
  const editor = state.editors.get(noteId)
  if (editor && editor.noteData && editor.noteData.status === 'trashed') return
  if (activePicker) return

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)

  const { isInside, isTypingNew, typingSpan } = getCursorWikiLinkInfo(range)

  // 只在输入新 [[ 时触发；已在已有 span 内不重复触发
  if (!isInside || !isTypingNew) return

  activePicker = true
  showNotePickerModal(noteId, typingSpan, range)
}

/**
 * 检测光标移动（点击、方向键）时是否在 wiki link 内部
 * 使用 DOM 而非纯文本位置判断
 */
function checkCursorForWikiLink(vditor, noteId) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)

  const { isInside, span, isTypingNew } = getCursorWikiLinkInfo(range)

  if (!isInside) return
  if (activePicker) return

  // 正在输入新 [[ 时，或点击已渲染的 wiki-link span 时，都弹出 picker
  activePicker = true
  const typingSpan = isTypingNew
    ? { node: range.startContainer, offset: range.startOffset }
    : null
  showNotePickerModal(noteId, typingSpan, range, span)
}

/**
 * 选择笔记后，替换 [[...]] 中间的内容
 * @param {object} vditor - Vditor 实例
 * @param {string} selectedNoteId - 选中的笔记 ID
 * @param {{node: Text, offset: number}|null} typingSpan - [[ 的起始位置
 */
async function resolveWikiLink(vditor, selectedNoteId, typingSpan = null) {
  const note = await window.electronAPI.getNote(selectedNoteId)
  const displayTitle = note ? (note.title || '无标题笔记') : '笔记'

  if (!vditor || typeof vditor.insertMD !== 'function') return
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
  range.setStart(node, openStart)      // [[ 起始
  range.setEnd(node, closeEnd)         // ]] 结束
  sel.removeAllRanges()
  sel.addRange(range)

  // 一次性插入带括号的完整 wiki link
  vditor.insertMD(`[[${selectedNoteId}|${displayTitle}]]`)

  // 将光标定位到 ]] 正后方
  positionCursorAfterWikiLink(typingSpan)
}

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

// -- 选择器调用 --

async function showNotePickerModal(currentNoteId, typingSpan, range, existingSpan = null) {
  try {
    // 获取/刷新笔记缓存
    if (allNotesCache.length === 0) {
      const allNotes = await window.electronAPI.getAllNotes()
      allNotesCache = allNotes
    }

    // 过滤掉当前笔记
    const availableNotes = allNotesCache
      .filter(n => n.id !== currentNoteId)
      .map(n => ({ id: n.id, title: n.title, excerpt: n.excerpt || '' }))

    // 获取光标屏幕坐标
    let top = 0, left = 0
    if (range) {
      const rect = range.getBoundingClientRect()
      top = rect.bottom + 8
      left = rect.left
    }

    // 设置浮层状态
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

// Wiki Link 选择器事件处理
async function handleNotePickerSelect(noteId) {
  if (!noteId) return

  // 如果点击的是已渲染的 wiki-link span，直接更新 span 内容
  const existingSpan = notePicker.existingSpan
  if (existingSpan) {
    const note = await window.electronAPI.getNote(noteId)
    const displayTitle = note ? (note.title || '无标题笔记') : '笔记'
    const currentNoteId = notePicker.currentNoteId
    existingSpan.textContent = `[[${noteId}|${displayTitle}]]`
    existingSpan.dataset.noteId = noteId
    existingSpan.title = `跳转到: ${displayTitle}`
    notePicker.existingSpan = null

    // 光标定位到 span 后方（延迟到下一帧，确保 DOM 更新完成）
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
    const vditor = state.editors.get(notePicker.currentNoteId)?.vditor
    if (vditor) {
      resolveWikiLink(vditor, noteId, notePicker.typingSpan)
    }
  }

  // Reset picker 状态（不调用 closeNotePicker，避免 positionCursorAfterWikiLink 重复执行）
  notePicker.visible = false
  notePicker.notes = []
  notePicker.typingSpan = null
  notePicker.currentNoteId = null
  activePicker = false
}

// 检测引用变化的函数
function detectReferenceChanges(noteId, oldRefs, newRefs) {
  const oldSet = new Set(oldRefs.map(r => r.id + '|' + (r.alias || '')))
  const newSet = new Set(newRefs.map(r => r.id + '|' + (r.alias || '')))

  const added = newRefs.filter(r => !oldSet.has(r.id + '|' + (r.alias || '')))
  const removed = oldRefs.filter(r => !newSet.has(r.id + '|' + (r.alias || '')))

  if (added.length > 0) {
    console.log('[Wiki Link 检测] 新增引用:', added.map(r => `[[${r.id}${r.alias ? '|' + r.alias : ''}]]`).join(', '))
  }
  if (removed.length > 0) {
    console.log('[Wiki Link 检测] 移除引用:', removed.map(r => `[[${r.id}${r.alias ? '|' + r.alias : ''}]]`).join(', '))
  }
}

function closeNotePicker(direction = null) {
  if (direction === 'left') {
    if (notePicker.typingSpan) {
      positionCursorBeforeWikiLink(notePicker.typingSpan)
    } else if (notePicker.existingSpan) {
      // 已渲染 span 模式下，恢复光标到 span 前方
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
      // 已渲染 span 模式下，恢复光标到 span 后方
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

function handleNotePickerClose(direction) {
  closeNotePicker(direction)
}

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

// ============================================================

// 获取当前主题
function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light'
}

// 初始化 Vditor
async function initVditor(noteId, container, noteData) {
  if (noteData.status === 'trashed') {
    // 只读模式：渲染 Markdown HTML
    const readonlyEl = document.createElement('div')
    readonlyEl.className = 'vditor-readonly'
    // 获取所有笔记元数据用于 wiki link 标题查找
    const allNotes = await window.electronAPI.getAllNotes()
    const noteMetadata = new Map(allNotes.map(n => [n.id, { title: n.title }]))
    readonlyEl.innerHTML = renderMarkdown(noteData.content || '', noteMetadata)
    container.appendChild(readonlyEl)
    // 笔记间跳转：wiki link 点击处理（事件代理到 container）
    container.addEventListener('click', handleWikiLinkClick)
    return null
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
        checkCursorForWikiLink(vditor, noteId)
      })
      container.addEventListener('keyup', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
          checkCursorForWikiLink(vditor, noteId)
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
        const createWikiLinkSpan = (fullText) => {
          const span = document.createElement('span')
          span.className = 'wiki-link'
          span.textContent = fullText
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
      detectWikiLinkTrigger(vditor, noteId)
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
      .vditor-reset {
        ${config.fontFamily ? `font-family: ${config.fontFamily} !important;` : ''}
        ${config.fontSize ? `font-size: ${config.fontSize}px !important;` : ''}
        ${config.lineHeight ? `line-height: ${config.lineHeight} !important;` : ''}
      }
      .vditor-reset p {
        ${config.paragraphSpacing ? `margin-bottom: ${config.paragraphSpacing}px !important;` : ''}
      }
      .vditor-reset > p:last-child {
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

// 组件挂载时初始化已存在的编辑器
onMounted(() => {
  initializeExistingEditors()
  observeThemeChanges()
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
  <div class="editor-root" v-bind="$attrs">
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

    <!-- 引用列表 -->
    <div
      class="note-references-bar"
      :data-note-id="editor.id"
      v-if="getReferencesDisplay(editor.id).references.length > 0 || true"
    >
      <div class="references-header">
        <span class="references-title">引用 ({{ getReferencesDisplay(editor.id).references.length }})</span>
        <button
          class="btn-refresh-references"
          @click="handleReferencesRefresh(editor.id)"
          title="刷新引用列表"
        >
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
      <div class="references-list">
        <span
          v-for="ref in getReferencesDisplay(editor.id).references"
          :key="ref.id"
          class="reference-item"
          :class="{ 'missing': ref.missing }"
          @click="handleReferenceClick(ref.id)"
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
    </div>
  </div>

  <!-- Wiki Link 笔记选择浮层 -->
  <NoteSuggestionPopup
    :visible="notePicker.visible"
    :notes="notePicker.notes"
    :selectedIndex="notePicker.selectedIndex"
    :searchQuery="notePicker.searchQuery"
    :position="notePicker.position"
    @update:searchQuery="updateNotePickerSearch"
    @update:selectedIndex="(idx) => notePicker.selectedIndex = idx"
    @select="handleNotePickerSelect"
    @close="handleNotePickerClose"
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

/* 引用列表栏 */
.note-references-bar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0 20px 10px 20px;
    padding: 8px 12px;
    background: var(--editor-tags-bg);
    border-radius: 8px;
    border: 1px solid var(--editor-tags-border);
}

.references-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.references-title {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
}

.btn-refresh-references {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
}

.btn-refresh-references:hover {
    color: var(--accent);
    background: var(--editor-tags-hover-bg);
}

.btn-refresh-references:active {
    transform: rotate(180deg);
}

.references-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.reference-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--sidebar-content-bg);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid var(--panel-border);
}

.reference-item:hover {
    border-color: var(--accent);
    background: var(--editor-tags-hover-bg);
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
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    background: var(--editor-readonly-bg);
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