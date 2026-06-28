<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'
import { EventTypes } from '../../core/EventTypes.js'

const props = defineProps({
  notes: {
    type: Array,
    default: () => []
  }
})

const svgRef = ref(null)
let simulation = null

// 构建图数据
function buildGraphData(notes) {
  const nodes = []
  const nodeMap = new Map()

  // 构建节点
  for (const note of notes) {
    const node = {
      id: note.id,
      title: note.title || '无标题笔记',
      references: note.references || [],
      refCount: (note.references || []).length
    }
    nodes.push(node)
    nodeMap.set(note.id, node)
  }

  // 构建边 (A引用B 则 A -> B)
  const links = []
  const linkMap = new Map() // key: "sourceId-targetId", value: weight

  for (const note of notes) {
    const refs = note.references || []
    for (const ref of refs) {
      // 确保目标节点存在
      if (nodeMap.has(ref.id)) {
        const key = `${note.id}-${ref.id}`
        if (linkMap.has(key)) {
          linkMap.set(key, linkMap.get(key) + 1)
        } else {
          linkMap.set(key, 1)
        }
      }
    }
  }

  for (const [key, weight] of linkMap.entries()) {
    const [source, target] = key.split('-')
    links.push({
      source,
      target,
      weight
    })
  }

  return { nodes, links }
}

// 渲染图
function renderGraph() {
  if (!svgRef.value || !props.notes.length) return

  // 清除旧内容
  d3.select(svgRef.value).selectAll('*').remove()

  const svg = d3.select(svgRef.value)
  const width = svgRef.value.clientWidth
  const height = svgRef.value.clientHeight

  const { nodes, links } = buildGraphData(props.notes)

  if (nodes.length === 0) return

  // 创建缩放行为（禁用缩放，只允许拖拽查看）
  const zoom = d3.zoom()
    .scaleExtent([1, 1])
    .on('zoom', (event) => {
      container.attr('transform', event.transform)
    })

  svg.call(zoom)

  const container = svg.append('g')

  // 箭头标记
  svg.append('defs').selectAll('marker')
    .data(['arrow'])
    .join('marker')
    .attr('id', d => d)
    .attr('viewBox', '0 -4 8 8')
    .attr('refX', 22)
    .attr('refY', 0)
    .attr('markerWidth', 5)
    .attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path')
    .attr('fill', 'var(--text-muted)')
    .attr('d', 'M0,-4L8,0L0,4')

  // 创建力模拟
  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-50))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(15))
    .force('x', d3.forceX(width / 2).strength(0.008))
    .force('y', d3.forceY(height / 2).strength(0.008))

  // 绘制边
  const link = container.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', 'var(--text-muted)')
    .attr('stroke-opacity', d => Math.min(0.3 + d.weight * 0.2, 1))
    .attr('stroke-width', d => Math.min(0.5 + d.weight * 0.5, 2))
    .attr('marker-end', 'url(#arrow)')

  // 绘制节点
  const node = container.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))
    .on('click', (event, d) => {
      event.stopPropagation()
      if (window.eventBus) {
        window.eventBus.emit(EventTypes.NOTE.OPEN, { id: d.id })
      }
    })

  // 节点圆形
  node.append('circle')
    .attr('r', d => Math.min(5 + d.refCount, 12))
    .attr('fill', 'var(--accent)')
    .attr('stroke', 'var(--text-muted)')
    .attr('stroke-width', 1)

  // 节点标签
  node.append('text')
    .text(d => d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title)
    .attr('x', 0)
    .attr('y', d => Math.min(5 + d.refCount, 12) + 12)
    .attr('text-anchor', 'middle')
    .attr('font-size', '13px')
    .attr('fill', 'var(--text-primary)')
    .attr('pointer-events', 'none')

  // 悬浮事件 - 显示完整标题
  node.on('mouseover', function(event, d) {
      const tooltip = document.getElementById('graph-tooltip')
      if (tooltip) {
        tooltip.textContent = d.title
        tooltip.style.display = 'block'
        tooltip.style.left = event.pageX + 10 + 'px'
        tooltip.style.top = event.pageY + 10 + 'px'
      }
    })
    .on('mousemove', function(event) {
      const tooltip = document.getElementById('graph-tooltip')
      if (tooltip) {
        tooltip.style.left = event.pageX + 10 + 'px'
        tooltip.style.top = event.pageY + 10 + 'px'
      }
    })
    .on('mouseout', function() {
      const tooltip = document.getElementById('graph-tooltip')
      if (tooltip) {
        tooltip.style.display = 'none'
      }
    })

  // 力模拟更新
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    node.attr('transform', d => `translate(${d.x},${d.y})`)
  })

  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.1).restart()
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
  }

  function dragged(event) {
    event.subject.fx = event.x
    event.subject.fy = event.y
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0)
    event.subject.fx = null
    event.subject.fy = null
  }
}

// 监听 notes 变化
watch(() => props.notes, () => {
  renderGraph()
}, { deep: true })

onMounted(() => {
  renderGraph()
  window.addEventListener('resize', renderGraph)
})

onUnmounted(() => {
  window.removeEventListener('resize', renderGraph)
  if (simulation) {
    simulation.stop()
  }
})
</script>

<template>
  <div class="reference-graph-panel">
    <div class="graph-header">
      <span class="graph-title">引用图谱</span>
    </div>
    <svg ref="svgRef" class="graph-svg"></svg>
    <div v-if="!notes.length || notes.every(n => !n.references || n.references.length === 0)" class="graph-empty">
      暂无引用数据
    </div>
    <div id="graph-tooltip" class="graph-tooltip"></div>
  </div>
</template>

<style scoped>
.reference-graph-panel {
  width: 100%;
  aspect-ratio: 3 / 2;
  min-height: 300px;
  margin-top: 20px;
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--editor-bg);
  position: relative;
}

.graph-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--panel-border);
  background: var(--sidebar-content-bg);
}

.graph-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.graph-svg {
  width: 100%;
  height: calc(100% - 36px);
}

.graph-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-muted);
  font-size: 13px;
  pointer-events: none;
}

:deep(.node) {
  cursor: pointer;
}

:deep(.node:hover circle) {
  stroke: #000;
  filter: brightness(1.1);
}

:deep(.links line) {
  pointer-events: none;
}

.graph-tooltip {
  position: fixed;
  display: none;
  padding: 6px 10px;
  background: var(--sidebar-content-bg);
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-primary);
  pointer-events: none;
  z-index: 1000;
  max-width: 300px;
  word-break: break-all;
}
</style>
