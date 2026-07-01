import NotePage from './NotePage/NotePage.vue'
import StickyPage from './StickyPage/StickyPage.vue'

// 页面类型常量
export const NOTE_PAGE = 'note'
export const STICKY_PAGE = 'sticky'

/**
 * Page Factory - Creates page components based on page type
 * @param {string} pageType - The type of page to create
 * @param {Object} options - Additional props to pass to the page component
 * @returns {Object} - { component: VueComponent, props: Object }
 */
export function createPage(pageType, options = {}) {
  const pages = {
    [NOTE_PAGE]: {
      component: NotePage,
      defaultProps: {}
    },
    [STICKY_PAGE]: {
      component: StickyPage,
      defaultProps: {}
    }
  }

  const config = pages[pageType]
  if (!config) {
    console.warn(`[PageFactory] Unknown page type: ${pageType}, defaulting to NOTE`)
    return createPage(NOTE_PAGE, options)
  }

  return {
    component: config.component,
    props: {
      ...config.defaultProps,
      ...options
    }
  }
}

/**
 * Check if a page type is valid/known
 * @param {string} pageType
 * @returns {boolean}
 */
export function isValidPageType(pageType) {
  return pageType === NOTE_PAGE || pageType === STICKY_PAGE
}
