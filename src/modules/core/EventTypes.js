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
      CONTENT: 'note:update:content',
      TAG: 'note:update:tag'
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
  }

}
