// core/EventTypes.js
export const EventTypes = {
  // 应用生命周期
  APP: {
    INIT: 'app:init'  // 应用初始化
  },

  // 笔记事件
  NOTE: {
    OPEN: 'note:open',
    CLOSE: 'note:close',
    CREATE: 'note:create',
    DELETE: 'note:delete',
    UPDATE: {
      TITLE: 'note:update:title',
      EXCERPT: 'note:update:excerpt',
      CONTENT: 'note:update:content',
      TAG: 'note:update:tag',
      REFERENCES: 'note:update:references'
    },
    GET: {
      TAG_NOTES: 'note:get:tagNotes'
    }
  },

  // 标签事件
  TAG: {
    CREATE: 'tag:create',
    EDIT: 'tag:edit',
    DELETE: 'tag:delete'
  },

  // 编辑区事件
  EDITOR: {
    SWITCH_TAB: 'editor:switchTab',
    SCROLL_TO: 'editor:scrollTo'
  },

  // 侧边栏事件
  SIDEBAR: {
    NAV_CLICK: 'sidebar:navClick',
    PANEL_CHANGE: 'sidebar:panelChange',
    COLLAPSE_CHANGE: 'sidebar:collapseChange',
    WIDTH_CHANGE: 'sidebar:widthChange'
  },
  
  // 搜索事件
  SEARCH: {
    HOME_SEARCH: 'search:homeSearch',
    SIDEBAR_SEARCH_INPUT: 'search:sidebarSearchInput'
  },

  // 回收站事件
  TRASH: {
    RESTORE: 'trash:restore',
    DELETE_PERMANENT: 'trash:deletePermanent'
  },

  // 标签筛选事件
  TAG_FILTER: {
    STATE_CHANGE: 'tagFilter:stateChange',
    CLEAR: 'tagFilter:clear'
  },

  // 设置事件
  SETTINGS: {
    OPEN: 'settings:open'
  },

  // 标签栏事件
  TAB_BAR: {
    ORDER_CHANGE: 'tabBar:orderChange',
    SWITCH_HOME: 'tabBar:switchHome',
    SWITCH_TAB: 'tabBar:switchTab'
  },

  // 页面事件（通用）
  PAGE: {
    UPDATE: {
      TAG: 'page:update:tag'
    }
  },

  // 便签事件
  STICKY: {
    LOAD: 'sticky:load',
    CREATE: 'sticky:create',
    UPDATE: 'sticky:update',
    DELETE: 'sticky:delete',
    BRING_TO_FRONT: 'sticky:bringToFront'
  }

}
