<script setup>
import { computed } from 'vue'
import { EventTypes } from '../../../core/EventTypes.js'

const props = defineProps({
  panelId: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: () => ({ content: '' })
  },
  activeNoteId: {
    type: String,
    default: null
  }
})

// Markdown heading regex
const HEADING_REGEX = /^#{1,6}\s+(.+)$/gm

/**
 * Extract headings from markdown content
 */
function extractHeadings(content) {
  if (!content) return []

  const headings = []
  let match

  while ((match = HEADING_REGEX.exec(content)) !== null) {
    const fullMatch = match[0]
    const text = match[1].trim()
    const level = fullMatch.indexOf(' ')

    headings.push({
      level,
      text,
      offset: match.index,
      line: content.substring(0, match.index).split('\n').length
    })
  }

  return headings
}

/**
 * Build hierarchical tree from flat heading list
 */
function buildHeadingTree(headings) {
  if (!headings || headings.length === 0) return []

  const result = []
  const stack = []

  for (const heading of headings) {
    const node = {
      level: heading.level,
      text: heading.text,
      offset: heading.offset,
      line: heading.line,
      children: []
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      result.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }

    stack.push(node)
  }

  return result
}

/**
 * Flatten tree with vertical line information
 */
function flattenTreeWithLines(nodes) {
  const flat = []
  flattenToArray(nodes, flat)

  for (let i = 0; i < flat.length; i++) {
    const lines = []
    for (let lvl = 1; lvl <= flat[i].level; lvl++) {
      if (lvl === 1) {
        lines.push(false)
      } else {
        lines.push(true)
      }
    }
    flat[i].lines = lines
  }

  return flat
}

function flattenToArray(nodes, result) {
  for (const node of nodes) {
    result.push({
      level: node.level,
      text: node.text,
      offset: node.offset,
      line: node.line,
      indent: node.level - 1
    })
    if (node.children.length > 0) {
      flattenToArray(node.children, result)
    }
  }
}

// Clean markdown formatting from heading text
function cleanMarkdownText(text) {
  if (!text) return ''
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim()
}

// Process headings from content
const processedHeadings = computed(() => {
  const content = props.data?.content || ''
  if (!content) return []

  const headings = extractHeadings(content)
  const tree = buildHeadingTree(headings)
  return flattenTreeWithLines(tree)
})

// Flat list for display with line indicators
const flatHeadings = computed(() => {
  return processedHeadings.value.map((h, index) => ({
    level: h.level,
    text: cleanMarkdownText(h.text),
    offset: h.offset,
    line: h.line,
    index,
    indent: h.level - 1,
    lines: h.lines || []
  }))
})

// Handle heading click - scroll to position in note
function handleHeadingClick(heading) {
  if (window.eventBus) {
    window.eventBus.emit(EventTypes.EDITOR.SCROLL_TO, {
      noteId: props.activeNoteId,
      index: heading.index
    })
  }
}
</script>

<template>
  <div class="sidebar-panel outline-panel">
    <h3 class="panel-title">
      <span><i class="fas fa-list"></i> 大纲</span>
    </h3>
    <div class="panel-content">
      <div v-if="flatHeadings.length > 0" class="outline-list">
        <div
          v-for="(heading, index) in flatHeadings"
          :key="index"
          class="outline-item"
          :class="'level-' + heading.level"
          :style="{ paddingLeft: (heading.indent * 16 + 8) + 'px' }"
          @click="handleHeadingClick(heading)"
        >
          <!-- 层级竖线 -->
          <span class="indent-lines">
            <span
              v-for="(showLine, lineIndex) in heading.lines"
              :key="lineIndex"
              class="indent-line"
              :class="{ 'has-line': showLine }"
            ></span>
          </span>
          <span class="heading-text">{{ heading.text }}</span>
        </div>
      </div>
      <p v-else class="panel-empty">
        当前笔记无标题
      </p>
    </div>
  </div>
</template>

<style scoped>
.outline-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: var(--sidebar-content-text);
  margin-bottom: 12px;
  padding: 8px 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.panel-title span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title i {
  color: var(--accent);
}

.panel-content {
  flex: 1;
  min-height: 0;
}

.outline-list {
  display: flex;
  flex-direction: column;
  padding-left: 8px;
}

.outline-item {
  display: flex;
  align-items: center;
  padding-top: 6px;
  padding-bottom: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--sidebar-content-text);
  transition: background-color 0.15s;
  position: relative;
}

.outline-item:hover {
  background: var(--sidebar-hover-bg);
}

.outline-item.level-1 {
  font-weight: 600;
}

.outline-item.level-2 {
  font-weight: 500;
}

.outline-item.level-3,
.outline-item.level-4,
.outline-item.level-5,
.outline-item.level-6 {
  font-size: 12px;
  color: var(--sidebar-content-text-muted);
}

/* 缩进线条容器 */
.indent-lines {
  display: flex;
  align-items: stretch;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}

.indent-line {
  width: 16px;
  height: 100%;
  position: relative;
}

.indent-line::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0px;
  width: 1px;
  background: transparent;
}

.indent-line.has-line::before {
  background: var(--sidebar-content-text-muted);
  opacity: 0.3;
}

.outline-item.level-1 .indent-line.has-line::before {
  opacity: 0.5;
}

.heading-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 8px;
}

.panel-empty {
  text-align: center;
  color: var(--sidebar-content-text-muted);
  font-size: 13px;
  padding: 20px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
