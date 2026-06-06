<script setup>
import { createApp, onMounted } from 'vue'
import ToastContainer from './Toast/ToastContainer.vue'
import ModalContainer from './Modal/ModalContainer.vue'
import TagFilter from './TagFilter/TagFilter.vue'
import NoteList from './NoteList/NoteList.vue'
import TabBar from './TabBar/TabBar.vue'
import Editor from './Editor/Editor.vue'
import LeftSidebar from './LeftSidebar/LeftSidebar.vue'
import { useLeftSidebar } from './LeftSidebar/useLeftSidebar.js'
import { useEditor } from './Editor/useEditor.js'
import { useTabBar } from './TabBar/useTabBar.js'
import { useTagFilter } from './TagFilter/useTagFilter.js'
import { useNoteList } from './NoteList/useNoteList.js'
import { useToast } from './Toast/useToast.js'
import { useModal } from './Modal/useModal.js'

// 立即暴露 composable 实例到 window（早于 UIManager 构造函数调用）
window.leftSidebarApi = useLeftSidebar()
window.editorApi = useEditor()
window.tabBarApi = useTabBar()
window.tagFilterApi = useTagFilter()
window.noteListApi = useNoteList()
window.toastApi = useToast()
window.modalApi = useModal()

onMounted(() => {
  // Toast 和 Modal 使用 <Teleport> 到 body，已在 app-entry.js 中创建容器
  const toastRoot = document.getElementById('vue-toast-root')
  if (toastRoot) {
    createApp(ToastContainer).mount(toastRoot)
  }

  const modalRoot = document.getElementById('vue-modal-root')
  if (modalRoot) {
    createApp(ModalContainer).mount(modalRoot)
  }

  // 其余组件挂载到各自 DOM 容器
  const containers = {
    leftSidebar: document.getElementById('leftSidebarContainer'),
    tabBar: document.getElementById('tabBar'),
    tagFilter: document.getElementById('tagFilterContainer'),
    notesGrid: document.getElementById('notesGrid'),
    notesContainer: document.getElementById('notesContainer')
  }

  if (containers.leftSidebar) {
    createApp(LeftSidebar).mount(containers.leftSidebar)
  }

  if (containers.tabBar) {
    createApp(TabBar).mount(containers.tabBar)
  }

  if (containers.tagFilter) {
    createApp(TagFilter).mount(containers.tagFilter)
  }

  if (containers.notesGrid) {
    createApp(NoteList).mount(containers.notesGrid)
  }

  if (containers.notesContainer) {
    createApp(Editor).mount(containers.notesContainer)
  }
})
</script>