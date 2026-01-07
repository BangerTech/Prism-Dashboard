/**
 * Prism Navigation Card
 * A centered navigation bar for dashboard views with glassmorphism styling
 * Uses external DOM injection to avoid grid layout issues
 */

class PrismNavigationCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._currentPath = '';
    this._externalNav = null;
    this._navId = 'prism-nav-' + Math.random().toString(36).substr(2, 9);
  }

  static getStubConfig() {
    return {
      tab_1_name: "Home",
      tab_1_path: "home",
      tab_1_icon: "mdi:home",
      tab_2_name: "Rooms",
      tab_2_path: "rooms",
      tab_2_icon: "",
      active_color: "#2196f3",
      show_icons: true,
      sticky_position: true,
      top_offset: 16,
      sidebar_width: 280,
      sidebar_gap: 16,
      sidebar_breakpoint: 900
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "sticky_position",
          label: "Fixed position at top (recommended for grid layouts)",
          selector: { boolean: {} }
        },
        {
          name: "top_offset",
          label: "Top Offset (px) - Distance from top when sticky",
          selector: { number: { min: 0, max: 200, step: 1, unit_of_measurement: "px", mode: "slider" } }
        },
        {
          name: "sidebar_width",
          label: "Sidebar Width (px) - Navigation centers in remaining space",
          selector: { number: { min: 0, max: 500, step: 10, unit_of_measurement: "px", mode: "slider" } }
        },
        {
          name: "sidebar_gap",
          label: "Sidebar Gap (px) - Grid gap between sidebar and content",
          selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: "px", mode: "slider" } }
        },
        {
          name: "sidebar_breakpoint",
          label: "Sidebar Breakpoint (px) - Screen width where sidebar disappears",
          selector: { number: { min: 0, max: 1600, step: 50, unit_of_measurement: "px", mode: "slider" } }
        },
        {
          name: "active_color",
          label: "Active Tab Color",
          selector: { color_rgb: {} }
        },
        {
          name: "show_icons",
          label: "Show Icons next to Text",
          selector: { boolean: {} }
        },
        {
          name: "icon_only",
          label: "Icon Only Mode (hide text, show only icons)",
          selector: { boolean: {} }
        },
        // Tab 1
        {
          type: 'expandable',
          name: '',
          title: '📍 Tab 1',
          schema: [
            { name: "tab_1_name", label: "Name (displayed text)", selector: { text: {} } },
            { name: "tab_1_path", label: "Path (view path, e.g. 'erdgeschoss')", selector: { text: {} } },
            { name: "tab_1_icon", label: "Icon (optional, e.g. mdi:home)", selector: { icon: {} } }
          ]
        },
        // Tab 2
        {
          type: 'expandable',
          name: '',
          title: '📍 Tab 2',
          schema: [
            { name: "tab_2_name", label: "Name", selector: { text: {} } },
            { name: "tab_2_path", label: "Path", selector: { text: {} } },
            { name: "tab_2_icon", label: "Icon", selector: { icon: {} } }
          ]
        },
        // Tab 3
        {
          type: 'expandable',
          name: '',
          title: '📍 Tab 3',
          schema: [
            { name: "tab_3_name", label: "Name", selector: { text: {} } },
            { name: "tab_3_path", label: "Path", selector: { text: {} } },
            { name: "tab_3_icon", label: "Icon", selector: { icon: {} } }
          ]
        },
        // Tab 4
        {
          type: 'expandable',
          name: '',
          title: '📍 Tab 4',
          schema: [
            { name: "tab_4_name", label: "Name", selector: { text: {} } },
            { name: "tab_4_path", label: "Path", selector: { text: {} } },
            { name: "tab_4_icon", label: "Icon", selector: { icon: {} } }
          ]
        },
        // Tab 5
        {
          type: 'expandable',
          name: '',
          title: '📍 Tab 5',
          schema: [
            { name: "tab_5_name", label: "Name", selector: { text: {} } },
            { name: "tab_5_path", label: "Path", selector: { text: {} } },
            { name: "tab_5_icon", label: "Icon", selector: { icon: {} } }
          ]
        },
        // Tab 6
        {
          type: 'expandable',
          name: '',
          title: '📍 Tab 6',
          schema: [
            { name: "tab_6_name", label: "Name", selector: { text: {} } },
            { name: "tab_6_path", label: "Path", selector: { text: {} } },
            { name: "tab_6_icon", label: "Icon", selector: { icon: {} } }
          ]
        },
        // Tab 7
        {
          type: 'expandable',
          name: '',
          title: '📍 Tab 7',
          schema: [
            { name: "tab_7_name", label: "Name", selector: { text: {} } },
            { name: "tab_7_path", label: "Path", selector: { text: {} } },
            { name: "tab_7_icon", label: "Icon", selector: { icon: {} } }
          ]
        },
        // Tab 8
        {
          type: 'expandable',
          name: '',
          title: '📍 Tab 8',
          schema: [
            { name: "tab_8_name", label: "Name", selector: { text: {} } },
            { name: "tab_8_path", label: "Path", selector: { text: {} } },
            { name: "tab_8_icon", label: "Icon", selector: { icon: {} } }
          ]
        }
      ]
    };
  }

  setConfig(config) {
    // Build tabs array from individual tab_X fields OR from tabs array
    let tabs = [];
    
    if (config.tabs && Array.isArray(config.tabs)) {
      tabs = config.tabs;
    } else {
      for (let i = 1; i <= 8; i++) {
        const name = config[`tab_${i}_name`];
        const path = config[`tab_${i}_path`];
        const icon = config[`tab_${i}_icon`];
        
        if (name || path) {
          tabs.push({
            name: name || path || `Tab ${i}`,
            path: path || name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || `tab-${i}`,
            icon: icon || ''
          });
        }
      }
    }
    
    if (tabs.length === 0) {
      throw new Error('Please define at least one tab (set Tab 1 Name and Path)');
    }
    
    this._config = { 
      ...config,
      tabs: tabs,
      active_color: this._normalizeColor(config.active_color) || '#2196f3',
      show_icons: config.show_icons || false,
      icon_only: config.icon_only || false,
      sticky_position: config.sticky_position !== false,
      top_offset: config.top_offset !== undefined ? config.top_offset : 16,
      sidebar_width: config.sidebar_width !== undefined ? config.sidebar_width : 0,
      sidebar_gap: config.sidebar_gap !== undefined ? config.sidebar_gap : 0,
      sidebar_breakpoint: config.sidebar_breakpoint !== undefined ? config.sidebar_breakpoint : 900
    };
    
    this._updateCard();
  }

  _normalizeColor(color) {
    if (Array.isArray(color) && color.length >= 3) {
      const r = color[0].toString(16).padStart(2, '0');
      const g = color[1].toString(16).padStart(2, '0');
      const b = color[2].toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return color;
  }

  set hass(hass) {
    this._hass = hass;
    this._currentPath = this._getCurrentPath();
    if (this._config) {
      this._updateCard();
    }
  }

  _getCurrentPath() {
    const path = window.location.pathname;
    const segments = path.split('/').filter(s => s);
    
    // Debug: Log path for troubleshooting (can be removed later)
    // console.log('[Prism Nav] URL path:', path, 'Segments:', segments);
    
    // Common Home Assistant URL patterns:
    // /lovelace/view-name
    // /lovelace-dashboard/view-name  
    // /dashboard-name/view-name
    // /lovelace/0 (numeric index)
    
    // Get the last segment as view identifier
    if (segments.length >= 1) {
      const lastSegment = segments[segments.length - 1];
      
      // If it's a numeric index (0, 1, 2...), return it for index-based matching
      if (/^\d+$/.test(lastSegment)) {
        return lastSegment;
      }
      
      // Return the view name
      return lastSegment;
    }
    
    // Check hash-based routing
    const hash = window.location.hash;
    if (hash) {
      const hashMatch = hash.match(/#([^\/]+)/);
      if (hashMatch) return hashMatch[1];
    }
    
    // Default: return empty (will match first tab or index 0)
    return '';
  }

  getCardSize() {
    // Return 0 when sticky to not take up grid space
    return this._config?.sticky_position ? 0 : 1;
  }

  connectedCallback() {
    if (this._config) {
      this._updateCard();
      
      // Delayed update for sticky detection
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (this._config) {
            this._updateCard();
          }
        }, 150);
      });
    }
    
    // Listen for URL changes
    this._boundPathChange = () => this._handlePathChange();
    window.addEventListener('popstate', this._boundPathChange);
    window.addEventListener('location-changed', this._boundPathChange);
    
    // Setup dialog observer to hide navigation when dialogs are open
    this._setupDialogObserver();
  }

  disconnectedCallback() {
    // Remove external navigation when card is disconnected
    this._removeExternalNav();
    
    if (this._boundPathChange) {
      window.removeEventListener('popstate', this._boundPathChange);
      window.removeEventListener('location-changed', this._boundPathChange);
    }
    
    // Cleanup dialog observer
    if (this._dialogObserver) {
      this._dialogObserver.disconnect();
      this._dialogObserver = null;
    }
    if (this._dialogCheckTimeout) {
      clearTimeout(this._dialogCheckTimeout);
    }
  }
  
  _setupDialogObserver() {
    // Simple and reliable: just check if more-info-dialog has 'open' attribute
    const checkDialogs = () => {
      if (!this._externalNav) return;
      
      let dialogVisible = false;
      
      // Primary check: Look for ha-more-info-dialog with 'open' attribute
      try {
        const haRoot = document.querySelector('home-assistant');
        if (haRoot?.shadowRoot) {
          const moreInfoDialog = haRoot.shadowRoot.querySelector('ha-more-info-dialog');
          if (moreInfoDialog && moreInfoDialog.hasAttribute('open')) {
            dialogVisible = true;
          }
          
          // Also check for ha-dialog with open attribute
          const haDialogs = haRoot.shadowRoot.querySelectorAll('ha-dialog[open]');
          if (haDialogs.length > 0) {
            dialogVisible = true;
          }
        }
      } catch (e) {
        // Ignore errors
      }
      
      // Secondary check: mdc-dialog--open class in body
      if (!dialogVisible) {
        const mdcDialogOpen = document.querySelector('.mdc-dialog--open');
        if (mdcDialogOpen) {
          dialogVisible = true;
        }
      }
      
      // Apply visibility change only if state actually changed
      const currentlyHidden = this._externalNav.style.visibility === 'hidden';
      
      if (dialogVisible && !currentlyHidden) {
        this._externalNav.style.visibility = 'hidden';
        this._externalNav.style.opacity = '0';
      } else if (!dialogVisible && currentlyHidden) {
        this._externalNav.style.visibility = 'visible';
        this._externalNav.style.opacity = '1';
      }
    };
    
    // Create MutationObserver - only watch for 'open' attribute changes
    this._dialogObserver = new MutationObserver(() => {
      // Debounce to avoid flicker
      clearTimeout(this._dialogCheckTimeout);
      this._dialogCheckTimeout = setTimeout(checkDialogs, 100);
    });
    
    // Observe home-assistant shadow root for dialog changes
    const setupObserver = () => {
      try {
        const haRoot = document.querySelector('home-assistant');
        if (haRoot?.shadowRoot) {
          this._dialogObserver.observe(haRoot.shadowRoot, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['open']
          });
        }
      } catch (e) {
        // Ignore errors
      }
    };
    
    // Setup observer with delay to ensure HA is loaded
    setTimeout(setupObserver, 500);
  }

  _removeExternalNav() {
    if (this._externalNav && this._externalNav.parentNode) {
      this._externalNav.parentNode.removeChild(this._externalNav);
      this._externalNav = null;
    }
    // Also try to find and remove by ID
    const existing = document.getElementById(this._navId);
    if (existing) {
      existing.remove();
    }
    // Remove style from head
    const styleEl = document.getElementById(this._navId + '-style');
    if (styleEl) {
      styleEl.remove();
    }
  }

  _handlePathChange() {
    const newPath = this._getCurrentPath();
    if (newPath !== this._currentPath) {
      this._currentPath = newPath;
      this._updateCard();
    }
  }

  _isTabActive(tab, tabIndex) {
    if (!tab.path) return false;
    
    const currentPath = this._currentPath;
    const tabs = this._config?.tabs || [];
    
    // If current path is empty or just "lovelace", activate first tab
    if (!currentPath || currentPath === 'lovelace' || currentPath === '') {
      return tabIndex === 0;
    }
    
    // If current path is a number (index-based URL like /lovelace/0)
    if (/^\d+$/.test(currentPath)) {
      const pathIndex = parseInt(currentPath, 10);
      return tabIndex === pathIndex;
    }
    
    // Normalize and compare path names
    const tabPath = tab.path.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
    const normalizedCurrent = currentPath.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
    
    return tabPath === normalizedCurrent;
  }

  _handleTabClick(tab) {
    if (!tab.path) return;
    
    const event = new CustomEvent('hass-navigate', {
      bubbles: true,
      composed: true,
      detail: { path: tab.path }
    });
    this.dispatchEvent(event);
    
    const currentUrl = window.location.pathname;
    const basePath = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
    const newPath = `${basePath}/${tab.path}`;
    
    history.pushState(null, '', newPath);
    window.dispatchEvent(new Event('location-changed'));
    
    this._currentPath = tab.path;
    this._updateCard();
  }

  _isInEditMode() {
    // Check if dashboard is in edit mode
    // Method 1: Check URL for edit parameter
    if (window.location.search.includes('edit=1')) {
      return true;
    }
    
    // Method 2: Check for edit mode indicators in DOM
    const editToolbar = document.querySelector('hui-editor, hui-card-options, .edit-mode');
    if (editToolbar) {
      return true;
    }
    
    // Method 3: Check for edit button being active
    const root = document.querySelector('home-assistant');
    if (root && root.shadowRoot) {
      const panel = root.shadowRoot.querySelector('ha-panel-lovelace');
      if (panel && panel.shadowRoot) {
        const huiRoot = panel.shadowRoot.querySelector('hui-root');
        if (huiRoot && huiRoot.shadowRoot) {
          const editMode = huiRoot.shadowRoot.querySelector('.edit-mode');
          if (editMode) return true;
        }
      }
    }
    
    return false;
  }

  _isInDashboardView() {
    // Check if we're in a real dashboard view (not editor/preview)
    let current = this;
    let depth = 0;
    const maxDepth = 50;
    
    while (current && depth < maxDepth) {
      const tagName = current.tagName?.toLowerCase() || '';
      const className = typeof current.className === 'string' ? current.className : '';
      
      // Editor/preview contexts
      if (tagName.includes('dialog') || 
          tagName.includes('picker') ||
          tagName.includes('editor') ||
          tagName === 'hui-card-preview' ||
          tagName === 'hui-card-element-editor' ||
          className.includes('preview') ||
          className.includes('element-preview') ||
          className.includes('card-picker')) {
        return false;
      }
      
      // Dashboard view contexts
      if (tagName === 'hui-view' || 
          tagName === 'hui-panel-view' ||
          tagName === 'hui-root' ||
          tagName === 'home-assistant' ||
          tagName === 'hui-masonry-view' ||
          tagName === 'hui-sections-view' ||
          tagName.includes('grid-layout')) {
        return true;
      }
      
      if (current.parentElement) {
        current = current.parentElement;
      } else if (current.getRootNode && current.getRootNode() instanceof ShadowRoot) {
        current = current.getRootNode().host;
      } else {
        break;
      }
      
      depth++;
    }
    
    if (current === document.body || current === document.documentElement || current === document) {
      return true;
    }
    
    return false;
  }

  _getNavStyles(topOffset, activeColor, sidebarWidth = 0, sidebarGap = 0, sidebarBreakpoint = 900) {
    // Use fixed pixel offset for sidebar width + gap
    const totalOffset = sidebarWidth + sidebarGap;
    const leftOffset = totalOffset > 0 ? `${totalOffset}px` : '0';
    
    return `
      #${this._navId} {
        position: fixed;
        top: ${topOffset}px;
        left: ${leftOffset};
        right: 0;
        z-index: 3;
        display: flex;
        justify-content: center;
        pointer-events: none;
        font-family: system-ui, -apple-system, sans-serif;
        transition: opacity 0.15s ease, visibility 0.15s ease;
      }
      
      #${this._navId} .nav-container {
        pointer-events: auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        padding: 8px 16px;
        border-radius: 50px;
        background: rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-shadow: 
          inset 2px 2px 5px rgba(0, 0, 0, 0.5),
          inset -1px -1px 3px rgba(255, 255, 255, 0.08),
          0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      #${this._navId} .nav-tab {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 20px;
        margin: 0 4px;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.5);
        font-family: inherit;
        font-size: 13px;
        font-weight: 400;
        letter-spacing: 2px;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 25px;
        white-space: nowrap;
        outline: none;
        -webkit-tap-highlight-color: transparent;
      }
      
      #${this._navId} .nav-tab:hover {
        color: rgba(255, 255, 255, 0.85);
        background: rgba(255, 255, 255, 0.05);
      }
      
      #${this._navId} .nav-tab.active {
        color: ${activeColor};
        font-weight: 600;
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      #${this._navId} .nav-tab.active::after {
        content: '';
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 2px;
        background: ${activeColor};
        border-radius: 1px;
        box-shadow: 0 0 8px ${activeColor};
      }
      
      #${this._navId} .nav-tab:active {
        transform: scale(0.96);
      }
      
      #${this._navId} .nav-tab ha-icon {
        --mdc-icon-size: 18px;
        transition: all 0.25s ease;
      }
      
      #${this._navId} .nav-tab.active ha-icon {
        filter: drop-shadow(0 0 4px ${activeColor});
      }
      
      #${this._navId} .nav-tab-text {
        line-height: 1;
      }
      
      #${this._navId} .nav-tab.icon-only {
        padding: 12px 16px;
      }
      
      #${this._navId} .nav-tab.icon-only .nav-tab-text {
        display: none;
      }
      
      /* Tablet landscape / small desktop */
      @media (max-width: 1200px) {
        #${this._navId} .nav-container {
          padding: 6px 12px;
        }
        #${this._navId} .nav-tab {
          padding: 8px 14px;
          font-size: 11px;
          letter-spacing: 1.5px;
          margin: 0 2px;
        }
        #${this._navId} .nav-tab ha-icon {
          --mdc-icon-size: 16px;
        }
      }
      
      @media (max-width: ${sidebarBreakpoint}px) {
        #${this._navId} {
          left: 0;
        }
      }
      
      /* Tablet portrait / large phone */
      @media (max-width: 768px) {
        #${this._navId} .nav-container {
          padding: 5px 10px;
        }
        #${this._navId} .nav-tab {
          padding: 6px 10px;
          font-size: 10px;
          letter-spacing: 1px;
          margin: 0 1px;
        }
        #${this._navId} .nav-tab ha-icon {
          --mdc-icon-size: 14px;
        }
      }
      
      /* Phone */
      @media (max-width: 480px) {
        #${this._navId} .nav-tab {
          padding: 6px 8px;
          font-size: 9px;
          letter-spacing: 0.5px;
          margin: 0;
        }
        #${this._navId} .nav-tab ha-icon {
          --mdc-icon-size: 14px;
        }
        #${this._navId} .nav-tab.icon-only {
          padding: 8px 10px;
        }
      }
    `;
  }

  _createExternalNav() {
    if (!this._config) return;
    
    const tabs = this._config.tabs || [];
    const activeColor = this._config.active_color || '#2196f3';
    const showIcons = this._config.show_icons;
    const iconOnly = this._config.icon_only;
    const topOffset = this._config.top_offset || 16;
    const sidebarWidth = this._config.sidebar_width || 0;
    const sidebarGap = this._config.sidebar_gap || 0;
    const sidebarBreakpoint = this._config.sidebar_breakpoint || 900;
    
    // Remove existing
    this._removeExternalNav();
    
    // Create style element for nav
    let styleEl = document.getElementById(this._navId + '-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = this._navId + '-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = this._getNavStyles(topOffset, activeColor, sidebarWidth, sidebarGap, sidebarBreakpoint);
    
    // Create nav element
    this._externalNav = document.createElement('div');
    this._externalNav.id = this._navId;
    
    const tabsHTML = tabs.map((tab, index) => {
      const isActive = this._isTabActive(tab, index);
      const hasIcon = showIcons && tab.icon;
      const isIconOnly = iconOnly && tab.icon;
      
      return `
        <button class="nav-tab ${isActive ? 'active' : ''} ${isIconOnly ? 'icon-only' : ''}" 
                data-path="${tab.path || ''}">
          ${hasIcon || isIconOnly ? `<ha-icon icon="${tab.icon}"></ha-icon>` : ''}
          <span class="nav-tab-text">${tab.name || ''}</span>
        </button>
      `;
    }).join('');
    
    this._externalNav.innerHTML = `<div class="nav-container">${tabsHTML}</div>`;
    
    // Append to body
    document.body.appendChild(this._externalNav);
    
    // Add event listeners to external nav
    const tabButtons = this._externalNav.querySelectorAll('.nav-tab');
    tabButtons.forEach(tabElement => {
      tabElement.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const path = tabElement.dataset.path;
        const tab = this._config.tabs.find(t => t.path === path);
        if (tab) {
          this._handleTabClick(tab);
        }
      });
    });
  }

  _updateCard() {
    if (!this._config) return;
    
    const isInDashboard = this._isInDashboardView();
    const isEditMode = this._isInEditMode();
    const stickyPosition = this._config.sticky_position && isInDashboard && !isEditMode;
    
    this._currentPath = this._getCurrentPath();
    
    // In edit mode, show a visible placeholder so user can click to edit
    if (isEditMode && this._config.sticky_position && isInDashboard) {
      // Remove external nav in edit mode
      this._removeExternalNav();
      
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block !important;
            width: 100%;
          }
          .edit-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 16px 24px;
            background: rgba(33, 150, 243, 0.15);
            border: 2px dashed rgba(33, 150, 243, 0.5);
            border-radius: 12px;
            color: rgba(255, 255, 255, 0.8);
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
          }
          .edit-placeholder ha-icon {
            --mdc-icon-size: 24px;
            color: #2196f3;
          }
          .edit-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .edit-title {
            font-weight: 600;
            color: #2196f3;
          }
          .edit-subtitle {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
          }
        </style>
        <div class="edit-placeholder">
          <ha-icon icon="mdi:navigation"></ha-icon>
          <div class="edit-info">
            <span class="edit-title">Prism Navigation</span>
            <span class="edit-subtitle">Klicke hier zum Bearbeiten • ${this._config.tabs?.length || 0} Tabs konfiguriert</span>
          </div>
        </div>
      `;
      return;
    }
    
    if (stickyPosition) {
      // Use external navigation (injected into body)
      this._createExternalNav();
      
      // Hide the card itself completely
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: none !important;
          }
        </style>
      `;
    } else {
      // Remove any external nav
      this._removeExternalNav();
      
      // Render inline (for editor preview or non-sticky mode)
      const tabs = this._config.tabs || [];
      const activeColor = this._config.active_color || '#2196f3';
      const showIcons = this._config.show_icons;
      const iconOnly = this._config.icon_only;
      
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: flex;
            justify-content: center;
            width: 100%;
            box-sizing: border-box;
          }
          
          .nav-wrapper {
            display: flex;
            justify-content: center;
            width: 100%;
          }
          
          .nav-container {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0;
            padding: 8px 16px;
            border-radius: 50px;
            background: rgba(0, 0, 0, 0.25);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            box-shadow: 
              inset 2px 2px 5px rgba(0, 0, 0, 0.5),
              inset -1px -1px 3px rgba(255, 255, 255, 0.08),
              0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          
          .nav-tab {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 20px;
            margin: 0 4px;
            border: none;
            background: transparent;
            color: rgba(255, 255, 255, 0.5);
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 13px;
            font-weight: 400;
            letter-spacing: 2px;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 25px;
            white-space: nowrap;
            outline: none;
          }
          
          .nav-tab:hover {
            color: rgba(255, 255, 255, 0.85);
            background: rgba(255, 255, 255, 0.05);
          }
          
          .nav-tab.active {
            color: ${activeColor};
            font-weight: 600;
            background: rgba(255, 255, 255, 0.08);
          }
          
          .nav-tab ha-icon {
            --mdc-icon-size: 18px;
          }
          
          .nav-tab-text {
            line-height: 1;
          }
          
          .nav-tab.icon-only .nav-tab-text {
            display: none;
          }
        </style>
        
        <div class="nav-wrapper">
          <div class="nav-container">
            ${tabs.map((tab, index) => {
              const isActive = this._isTabActive(tab, index);
              const hasIcon = showIcons && tab.icon;
              const isIconOnly = iconOnly && tab.icon;
              
              return `
                <button class="nav-tab ${isActive ? 'active' : ''} ${isIconOnly ? 'icon-only' : ''}" 
                        data-path="${tab.path || ''}">
                  ${hasIcon || isIconOnly ? `<ha-icon icon="${tab.icon}"></ha-icon>` : ''}
                  <span class="nav-tab-text">${tab.name || ''}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
      
      // Add event listeners
      const tabButtons = this.shadowRoot.querySelectorAll('.nav-tab');
      tabButtons.forEach(tabElement => {
        tabElement.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const path = tabElement.dataset.path;
          const tab = this._config.tabs.find(t => t.path === path);
          if (tab) {
            this._handleTabClick(tab);
          }
        });
      });
    }
  }
}

customElements.define('prism-navigation', PrismNavigationCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-navigation",
  name: "Prism Navigation",
  preview: true,
  description: "A centered navigation bar for switching between dashboard views with glassmorphism styling"
});
