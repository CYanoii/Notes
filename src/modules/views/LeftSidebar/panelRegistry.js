/**
 * Panel Registry - Dynamic Panel Registration System
 *
 * Panels register themselves via registerPanel() with their metadata.
 * The sidebar discovers and renders registered panels dynamically.
 * Visibility settings are synced with config/settings.json.
 */
import { reactive } from 'vue'

// Default panel definitions
const DEFAULT_PANELS = {
  search: {
    id: 'search',
    label: '搜索',
    icon: 'fas fa-search',
    component: () => import('./panels/SearchPanel.vue'),
    defaultVisible: true,
    cannotHide: true
  },
  tags: {
    id: 'tags',
    label: '所有标签',
    icon: 'fas fa-tags',
    component: () => import('./panels/TagsPanel.vue'),
    defaultVisible: true,
    cannotHide: true
  },
  archive: {
    id: 'archive',
    label: '归档',
    icon: 'fas fa-archive',
    component: () => import('./panels/ArchivePanel.vue'),
    defaultVisible: true
  },
  recent: {
    id: 'recent',
    label: '最近文件',
    icon: 'fas fa-history',
    component: () => import('./panels/RecentPanel.vue'),
    defaultVisible: true
  },
  trash: {
    id: 'trash',
    label: '回收站',
    icon: 'fas fa-trash-alt',
    component: () => import('./panels/TrashPanel.vue'),
    defaultVisible: true,
    cannotHide: true
  }
}

// Module-level registry (singleton)
const panelRegistry = new Map()

// Visibility state (synced with settings) - 使用 Vue reactive 以支持响应式更新
const panelVisibility = reactive({})

// Initialize registry with default panels
function initializeRegistry() {
  for (const [id, definition] of Object.entries(DEFAULT_PANELS)) {
    panelRegistry.set(id, {
      ...definition,
      isRegistered: true
    })
  }
  // Set default visibility
  for (const id of Object.keys(DEFAULT_PANELS)) {
    panelVisibility[id] = DEFAULT_PANELS[id].defaultVisible
  }
}

/**
 * Register a panel
 * @param {Object} panelDefinition - Panel definition object
 */
function registerPanel(panelDefinition) {
  const { id } = panelDefinition
  if (!id) {
    console.warn('[PanelRegistry] Panel registration requires an id')
    return
  }

  panelRegistry.set(id, {
    ...panelDefinition,
    isRegistered: true
  })
}

/**
 * Unregister a panel
 * @param {string} panelId - Panel ID to unregister
 */
function unregisterPanel(panelId) {
  panelRegistry.delete(panelId)
  delete panelVisibility[panelId]
}

/**
 * Get all registered panels
 * @returns {Array} Array of panel definitions
 */
function getAllPanels() {
  return Array.from(panelRegistry.values())
}

/**
 * Get visible panels (for nav menu)
 * @returns {Array} Array of visible panel definitions
 */
function getVisiblePanels() {
  return getAllPanels().filter(panel => panelVisibility[panel.id] !== false)
}

/**
 * Get panel definition by ID
 * @param {string} panelId - Panel ID
 * @returns {Object|undefined} Panel definition
 */
function getPanel(panelId) {
  return panelRegistry.get(panelId)
}

/**
 * Check if panel is visible
 * @param {string} panelId - Panel ID
 * @returns {boolean} Visibility state
 */
function isPanelVisible(panelId) {
  return panelVisibility[panelId] !== false
}

/**
 * Set panel visibility
 * @param {string} panelId - Panel ID
 * @param {boolean} visible - Visibility state
 */
function setPanelVisibility(panelId, visible) {
  panelVisibility[panelId] = visible
}

/**
 * Get all visibility settings (for saving to config)
 * @returns {Object} Visibility settings object
 */
function getVisibilitySettings() {
  return { ...panelVisibility }
}

/**
 * Set visibility from config/settings
 * @param {Object} config - Settings object from ConfigManager
 */
function setVisibilityFromConfig(config) {
  if (config && config.sidebarPanels) {
    for (const [id, visible] of Object.entries(config.sidebarPanels)) {
      panelVisibility[id] = visible
    }
  }
}

/**
 * Check if a panel ID is registered
 * @param {string} panelId - Panel ID to check
 * @returns {boolean}
 */
function isPanelRegistered(panelId) {
  return panelRegistry.has(panelId)
}

// Initialize on module load
initializeRegistry()

export {
  panelRegistry,
  registerPanel,
  unregisterPanel,
  getAllPanels,
  getVisiblePanels,
  getPanel,
  isPanelVisible,
  isPanelRegistered,
  setPanelVisibility,
  getVisibilitySettings,
  setVisibilityFromConfig,
  DEFAULT_PANELS
}