
class PrismButtonCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartBrightness = 0;
    this._boundHandlers = null;
  }

  static getStubConfig() {
    return { 
      entity: "light.example_light", 
      name: "Example", 
      icon: "mdi:lightbulb", 
      layout: "horizontal", 
      active_color: "#ffc864",
      show_brightness_slider: true,
      show_state: true
    }
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: {} }
        },
        {
          name: "name",
          selector: { text: {} }
        },
        {
          name: "icon",
          selector: { icon: {} }
        },
        {
          name: "layout",
          selector: {
            select: {
              options: ["horizontal", "vertical"]
            }
          }
        },
        {
          name: "active_color",
          selector: { color_rgb: {} }
        },
        {
          name: "show_state",
          label: "Show State (on/off/% below name)",
          default: true,
          selector: { boolean: {} }
        },
        {
          name: "show_brightness_slider",
          label: "Show Brightness Slider (for lights)",
          default: true,
          selector: { boolean: {} }
        },
        {
          name: "slider_entity",
          label: "Slider Entity (optional, separate entity for brightness)",
          selector: { entity: { domain: "light" } }
        },
        {
          type: "expandable",
          name: "",
          title: "🪟 Popup Mode",
          schema: [
            {
              name: "use_as_popup",
              label: "Use as Popup Trigger (opens popup instead of toggle)",
              selector: { boolean: {} }
            },
            {
              name: "popup_icon",
              label: "Popup Icon",
              selector: { icon: {} }
            },
            {
              name: "popup_title",
              label: "Popup Title",
              selector: { text: {} }
            },
            {
              name: "status_entity",
              label: "Status Entity (show state of this entity on button)",
              selector: { entity: {} }
            },
            {
              name: "popup_cards",
              label: "Popup Cards (YAML config for cards inside popup)",
              selector: { object: {} }
            }
          ]
        }
      ]
    };
  }

  setConfig(config) {
    // Entity only required if NOT in popup mode
    if (!config.use_as_popup && !config.entity) {
      throw new Error('Please define an entity');
    }
    // Create a copy to avoid modifying read-only config object
    this._config = { ...config };
    if (!this._config.icon) {
      this._config.icon = "mdi:lightbulb";
    }
    if (!this._config.layout) {
      this._config.layout = "horizontal";
    }
    // Default show_brightness_slider to true for lights
    if (this._config.show_brightness_slider === undefined) {
      this._config.show_brightness_slider = true;
    }
    // Default show_state to true (backward compatibility)
    if (this._config.show_state === undefined) {
      this._config.show_state = true;
    }
    // Normalize active_color (convert RGB arrays to hex if needed)
    if (this._config.active_color) {
      this._config.active_color = this._normalizeColor(this._config.active_color);
    }
    // Popup configuration
    this._config.use_as_popup = config.use_as_popup || false;
    this._config.popup_icon = config.popup_icon || 'mdi:card-multiple-outline';
    this._config.popup_title = config.popup_title || '';
    this._config.status_entity = config.status_entity || null;
    this._config.popup_cards = config.popup_cards || null;
    this._updateCard();
  }

  _normalizeColor(color) {
    // If color is an array [r, g, b] from color_rgb selector, convert to hex
    if (Array.isArray(color) && color.length >= 3) {
      const r = color[0].toString(16).padStart(2, '0');
      const g = color[1].toString(16).padStart(2, '0');
      const b = color[2].toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    // If it's already a hex string, return as is
    return color;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config) {
      this._updateCard();
    }
  }

  getCardSize() {
    return 1;
  }

  connectedCallback() {
    if (this._config) {
      this._updateCard();
    }
  }

  disconnectedCallback() {
    // Cleanup event listeners when element is removed
    this._removeEventListeners();
  }

  _removeEventListeners() {
    if (this._boundHandlers && this._card) {
      this._card.removeEventListener('touchstart', this._boundHandlers.touchStart);
      this._card.removeEventListener('touchmove', this._boundHandlers.touchMove);
      this._card.removeEventListener('touchend', this._boundHandlers.touchEnd);
      this._card.removeEventListener('mousedown', this._boundHandlers.mouseDown);
      this._card.removeEventListener('mousemove', this._boundHandlers.mouseMove);
      this._card.removeEventListener('mouseup', this._boundHandlers.mouseUp);
      this._card.removeEventListener('mouseleave', this._boundHandlers.mouseLeave);
      this._card.removeEventListener('click', this._boundHandlers.click);
      this._card.removeEventListener('contextmenu', this._boundHandlers.contextMenu);
    }
    this._boundHandlers = null;
    this._card = null;
  }

  // Get the entity ID to use for status display
  _getDisplayEntityId() {
    // In popup mode with status_entity, use that for display
    if (this._config.use_as_popup && this._config.status_entity) {
      return this._config.status_entity;
    }
    return this._config.entity;
  }

  _isActive() {
    const entityId = this._getDisplayEntityId();
    if (!this._hass || !entityId) return false;
    const entity = this._hass.states[entityId];
    if (!entity) return false;
    
    const state = entity.state;
    if (entityId.startsWith('lock.')) {
      return state === 'locked';
    } else if (entityId.startsWith('climate.')) {
      return state === 'heat' || state === 'auto';
    } else if (entityId.startsWith('vacuum.')) {
      return state === 'cleaning' || state === 'returning';
    } else {
      return state === 'on' || state === 'open';
    }
  }

  _getIconColor() {
    const entityId = this._getDisplayEntityId();
    if (!this._hass || !entityId) return null;
    const entity = this._hass.states[entityId];
    if (!entity) return null;
    
    const state = entity.state;
    const isActive = this._isActive();
    const attr = entity.attributes;
    
    // For lights: PRIORITY 1 - use actual rgb_color from entity if available
    if (isActive && entityId.startsWith('light.')) {
      // Check for rgb_color attribute (set by color picker) - highest priority
      if (attr.rgb_color && Array.isArray(attr.rgb_color) && attr.rgb_color.length >= 3) {
        const [r, g, b] = attr.rgb_color;
        return { color: `rgb(${r}, ${g}, ${b})`, shadow: `rgba(${r}, ${g}, ${b}, 0.6)` };
      }
      // Check for hs_color and convert to RGB
      if (attr.hs_color && Array.isArray(attr.hs_color) && attr.hs_color.length >= 2) {
        const [h, s] = attr.hs_color;
        const rgb = this._hsToRgb(h, s, 100);
        return { color: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`, shadow: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.6)` };
      }
      // PRIORITY 2: Fallback to active_color from config
      if (this._config.active_color) {
        const hex = this._config.active_color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { color: `rgb(${r}, ${g}, ${b})`, shadow: `rgba(${r}, ${g}, ${b}, 0.6)` };
      }
      // Default warm white for lights without color
      return { color: 'rgb(255, 200, 100)', shadow: 'rgba(255, 200, 100, 0.6)' };
    }
    
    // For non-lights: use active_color if configured
    if (isActive && this._config.active_color) {
      const hex = this._config.active_color;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { color: `rgb(${r}, ${g}, ${b})`, shadow: `rgba(${r}, ${g}, ${b}, 0.6)` };
    }
    
    // Otherwise use default colors based on entity type
    if (entityId.startsWith('lock.')) {
      if (state === 'locked') {
        return { color: 'rgb(76, 175, 80)', shadow: 'rgba(76, 175, 80, 0.6)' };
      } else if (state === 'unlocked') {
        return { color: 'rgb(244, 67, 54)', shadow: 'rgba(244, 67, 54, 0.6)' };
      }
    } else if (entityId.startsWith('climate.')) {
      if (state === 'heat' || state === 'auto') {
        return { color: 'rgb(255, 152, 0)', shadow: 'rgba(255, 152, 0, 0.6)' };
      }
    } else if (entityId.startsWith('vacuum.')) {
      if (state === 'cleaning' || state === 'returning') {
        return { color: 'rgb(74, 222, 128)', shadow: 'rgba(74, 222, 128, 0.6)' };
      } else if (state === 'error') {
        return { color: 'rgb(248, 113, 113)', shadow: 'rgba(248, 113, 113, 0.6)' };
      }
    } else {
      if (state === 'on' || state === 'open') {
        return { color: 'rgb(255, 200, 100)', shadow: 'rgba(255, 200, 100, 0.6)' };
      }
    }
    return null;
  }
  
  // Helper: Convert HS color to RGB
  _hsToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  _hasBrightnessControl() {
    if (!this._hass || !this._config.entity) return false;
    if (!this._config.show_brightness_slider) return false;
    
    // Use slider_entity if configured, otherwise use main entity
    const entityId = this._config.slider_entity || this._config.entity;
    const entity = this._hass.states[entityId];
    if (!entity) return false;
    
    // Only lights have brightness control
    if (!entityId.startsWith('light.')) return false;
    
    // Check if brightness is supported
    const supportedModes = entity.attributes.supported_color_modes || [];
    return supportedModes.some(mode => 
      ['brightness', 'color_temp', 'hs', 'rgb', 'rgbw', 'rgbww', 'xy', 'white'].includes(mode)
    );
  }

  _getBrightness() {
    if (!this._hass || !this._config.entity) return 0;
    
    // Use slider_entity if configured, otherwise use main entity
    const entityId = this._config.slider_entity || this._config.entity;
    const entity = this._hass.states[entityId];
    if (!entity || entity.state !== 'on') return 0;
    if (!entity.attributes.brightness) return 100; // If on but no brightness attr, assume 100%
    // brightness is 0-255, convert to percentage
    return Math.round((entity.attributes.brightness / 255) * 100);
  }

  _setBrightness(percent) {
    if (!this._hass || !this._config.entity) return;
    
    // Use slider_entity if configured, otherwise use main entity
    const entityId = this._config.slider_entity || this._config.entity;
    percent = Math.max(1, Math.min(100, percent));
    const brightness = Math.round((percent / 100) * 255);
    this._hass.callService('light', 'turn_on', {
      entity_id: entityId,
      brightness: brightness
    });
  }

  _handleTap() {
    if (!this._hass) return;
    
    // POPUP MODE: Open popup instead of toggling (entity not required)
    if (this._config.use_as_popup && this._config.popup_cards) {
      this._openPrismPopup();
      return;
    }
    
    // For non-popup mode, entity is required
    if (!this._config.entity) return;
    
    const domain = this._config.entity.split('.')[0];
    const entity = this._hass.states[this._config.entity];
    const state = entity ? entity.state : 'off';
    
    // Handle different entity types
    if (domain === 'lock') {
      // Locks use lock/unlock services
      const service = state === 'locked' ? 'unlock' : 'lock';
      this._hass.callService('lock', service, {
        entity_id: this._config.entity
      });
    } else if (domain === 'cover') {
      // Covers use open_cover/close_cover or toggle
      const service = state === 'open' ? 'close_cover' : 'open_cover';
      this._hass.callService('cover', service, {
        entity_id: this._config.entity
      });
    } else if (domain === 'scene') {
      // Scenes use turn_on
      this._hass.callService('scene', 'turn_on', {
        entity_id: this._config.entity
      });
    } else if (domain === 'script') {
      // Scripts use turn_on
      this._hass.callService('script', 'turn_on', {
        entity_id: this._config.entity
      });
    } else {
      // Default: use toggle
      this._hass.callService(domain, 'toggle', {
        entity_id: this._config.entity
      });
    }
  }

  _handleHold() {
    // In popup mode with status_entity, show more-info for that entity
    const entityId = this._getDisplayEntityId();
    if (!this._hass || !entityId) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: entityId }
    });
    this.dispatchEvent(event);
  }

  // ==================== POPUP METHODS ====================
  
  _closePrismPopup() {
    const existingOverlay = document.getElementById('prism-button-popup-overlay');
    if (existingOverlay) {
      existingOverlay.style.animation = 'prismPopupFadeOut 0.2s ease forwards';
      setTimeout(() => {
        existingOverlay.remove();
      }, 200);
    }
  }

  _openPrismPopup() {
    // Close any existing popup first
    this._closePrismPopup();
    
    const title = this._config.popup_title || this._config.name || 'Popup';
    const icon = this._config.popup_icon || this._config.icon || 'mdi:card-multiple-outline';
    const iconColor = this._getIconColor();
    const accentColor = iconColor ? iconColor.color : 'rgb(255, 200, 100)';
    
    // Create popup overlay in document.body (outside shadow DOM for true modal)
    const overlay = document.createElement('div');
    overlay.id = 'prism-button-popup-overlay';
    overlay.innerHTML = `
      <style>
        #prism-button-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          animation: prismPopupFadeIn 0.2s ease;
          font-family: system-ui, -apple-system, sans-serif;
        }
        @keyframes prismPopupFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes prismPopupFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes prismPopupSlideIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .prism-popup {
          position: relative;
          min-width: 320px;
          max-width: 500px;
          width: 90vw;
          max-height: 85vh;
          background: linear-gradient(180deg, rgba(35, 38, 45, 0.98), rgba(25, 27, 32, 0.98));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 25px 80px rgba(0, 0, 0, 0.8),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          overflow: hidden;
          animation: prismPopupSlideIn 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .prism-popup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: linear-gradient(180deg, rgba(40, 43, 50, 0.9), rgba(30, 33, 38, 0.9));
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .prism-popup-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.95);
          font-size: 16px;
          font-weight: 600;
        }
        .prism-popup-title-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${accentColor};
          --mdc-icon-size: 18px;
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.4),
            -1px -1px 3px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-popup-title-icon ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
          filter: drop-shadow(0 0 4px ${accentColor.replace('rgb', 'rgba').replace(')', ', 0.5)')});
        }
        .prism-popup-close {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.4);
          --mdc-icon-size: 18px;
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.4),
            -1px -1px 3px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-popup-close ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
          transition: all 0.2s ease;
        }
        .prism-popup-close:hover {
          color: #f87171;
        }
        .prism-popup-close:hover ha-icon {
          filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.6));
        }
        .prism-popup-close:active {
          background: linear-gradient(145deg, #22252b, #2d3038);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.5),
            inset -1px -1px 3px rgba(255, 255, 255, 0.03);
        }
        .prism-popup-content {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .prism-popup-content::-webkit-scrollbar {
          width: 6px;
        }
        .prism-popup-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .prism-popup-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        .prism-popup-content::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        .prism-popup-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
        }
        .prism-popup-error {
          padding: 16px;
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.3);
          border-radius: 12px;
          color: #f87171;
          font-size: 13px;
        }

        /* Popup Responsive - Tablet/Mobile */
        @media (max-height: 700px) {
          .prism-popup {
            max-height: 90vh;
          }
          .prism-popup-content {
            max-height: calc(90vh - 80px);
            padding: 12px;
          }
          .prism-popup-header {
            padding: 12px 16px;
          }
        }

        @media (max-width: 768px) {
          .prism-popup {
            width: 95vw;
            max-width: 95vw;
            max-height: 85vh;
          }
          .prism-popup-content {
            max-height: calc(85vh - 80px);
          }
        }

        @media (max-width: 480px) {
          #prism-button-popup-overlay {
            padding: 10px;
          }
          .prism-popup {
            width: 98vw;
            max-width: 98vw;
            border-radius: 16px;
          }
          .prism-popup-header {
            padding: 12px 14px;
          }
          .prism-popup-title {
            font-size: 15px;
          }
          .prism-popup-content {
            padding: 10px;
          }
        }
      </style>
      <div class="prism-popup">
        <div class="prism-popup-header">
          <div class="prism-popup-title">
            <div class="prism-popup-title-icon">
              <ha-icon icon="${icon}"></ha-icon>
            </div>
            <span>${title}</span>
          </div>
          <button class="prism-popup-close">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="prism-popup-content">
          <div class="prism-popup-loading">Loading cards...</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Event listeners
    overlay.querySelector('.prism-popup-close').onclick = () => this._closePrismPopup();
    overlay.onclick = (e) => {
      if (e.target === overlay) this._closePrismPopup();
    };
    
    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this._closePrismPopup();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    // Render the cards
    this._renderPopupCards(overlay.querySelector('.prism-popup-content'));
  }

  async _renderPopupCards(container) {
    const cardsConfig = this._config.popup_cards;
    if (!cardsConfig) {
      container.innerHTML = '<div class="prism-popup-error">No popup_cards configured</div>';
      return;
    }
    
    // Clear loading message
    container.innerHTML = '';
    
    // Normalize to array
    let cardConfigs = [];
    if (Array.isArray(cardsConfig)) {
      cardConfigs = cardsConfig;
    } else if (cardsConfig.type === 'vertical-stack' || cardsConfig.type === 'horizontal-stack') {
      // Handle stack cards
      cardConfigs = cardsConfig.cards || [];
    } else {
      // Single card config
      cardConfigs = [cardsConfig];
    }
    
    // Try to get card helpers
    let helpers = null;
    try {
      helpers = await window.loadCardHelpers?.();
    } catch (e) {
      console.warn('Prism Button Popup: Could not load card helpers', e);
    }
    
    for (const cardConfig of cardConfigs) {
      try {
        let cardElement;
        
        if (helpers?.createCardElement) {
          // Method 1: Official card helpers (preferred)
          cardElement = await helpers.createCardElement(cardConfig);
        } else {
          // Method 2: Fallback - direct element creation
          const cardType = cardConfig.type || 'entity';
          let tag;
          
          if (cardType.startsWith('custom:')) {
            tag = cardType.replace('custom:', '');
          } else {
            tag = `hui-${cardType}-card`;
          }
          
          cardElement = document.createElement(tag);
          if (cardElement.setConfig) {
            cardElement.setConfig(cardConfig);
          }
        }
        
        // Set hass object
        if (cardElement) {
          cardElement.hass = this._hass;
          container.appendChild(cardElement);
        }
      } catch (e) {
        console.error('Prism Button Popup: Failed to create card', cardConfig, e);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'prism-popup-error';
        errorDiv.textContent = `Failed to load card: ${cardConfig.type || 'unknown'}`;
        container.appendChild(errorDiv);
      }
    }
    
    // If no cards were added, show message
    if (container.children.length === 0) {
      container.innerHTML = '<div class="prism-popup-error">No cards could be loaded</div>';
    }
  }

  // ==================== END POPUP METHODS ====================

  _updateCard() {
    // In popup mode, entity is not required
    const displayEntityId = this._getDisplayEntityId();
    if (!this._config || (!this._config.use_as_popup && !this._config.entity)) return;
    
    const entity = (this._hass && displayEntityId) ? this._hass.states[displayEntityId] : null;
    const isActive = this._isActive();
    const iconColor = this._getIconColor();
    const state = entity ? entity.state : 'off';
    
    // Determine display name: popup_title > name > entity friendly_name > entity_id
    let friendlyName;
    if (this._config.use_as_popup && this._config.popup_title) {
      friendlyName = this._config.popup_title;
    } else if (this._config.name) {
      friendlyName = this._config.name;
    } else if (entity) {
      friendlyName = entity.attributes.friendly_name || displayEntityId;
    } else {
      friendlyName = this._config.popup_title || 'Popup';
    }
    
    // Determine display icon: popup_icon (in popup mode) > icon > default
    const displayIcon = this._config.use_as_popup 
      ? (this._config.popup_icon || 'mdi:card-multiple-outline')
      : (this._config.icon || 'mdi:lightbulb');
    
    const layout = this._config.layout || 'horizontal';
    
    // Brightness slider logic
    const hasBrightness = this._hasBrightnessControl();
    const brightness = hasBrightness ? this._getBrightness() : 0;
    const showSlider = hasBrightness && isActive;
    
    // State display - show brightness percentage if available
    const stateDisplay = (isActive && hasBrightness && brightness > 0) ? `${brightness}%` : state;
    
    // Show state option (default: true)
    const showState = this._config.show_state !== false;
    
    // Get the color for the brightness slider - subtle but visible
    const sliderColor = iconColor ? iconColor.color : 'rgb(255, 200, 100)';
    const sliderOpacityStart = 0.08; // Dezent auf der linken Seite
    const sliderOpacityEnd = 0.22;   // Stärker auf der rechten Seite
    const sliderColorStart = sliderColor.replace('rgb', 'rgba').replace(')', `, ${sliderOpacityStart})`);
    const sliderColorEnd = sliderColor.replace('rgb', 'rgba').replace(')', `, ${sliderOpacityEnd})`);
    
    // Icon glow intensity based on brightness (0.1 to 0.5 range)
    const glowIntensity = showSlider ? (0.1 + (brightness / 100) * 0.4) : 0.35;
    const glowIntensityOuter = showSlider ? (0.05 + (brightness / 100) * 0.2) : 0.15;
    
    // Icon opacity based on brightness (0.6 to 1.0 range)
    const iconOpacity = showSlider ? (0.6 + (brightness / 100) * 0.4) : 1.0;
    const iconDropShadow = showSlider ? `drop-shadow(0 0 ${Math.round(4 + brightness * 0.08)}px ${iconColor ? iconColor.shadow.replace('0.6', String(glowIntensity * 1.2)) : 'rgba(255, 200, 100, 0.4)'})` : `drop-shadow(0 0 6px ${iconColor ? iconColor.shadow.replace('0.6', '0.4') : 'rgba(255, 200, 100, 0.4)'})`;

    // Remove old event listeners before re-rendering
    this._removeEventListeners();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          background: ${isActive ? 'rgba(20, 20, 20, 0.6)' : 'rgba(30, 32, 36, 0.6)'} !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border-radius: 16px !important;
          border: 1px solid rgba(255,255,255,0.05);
          border-top: ${isActive ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255, 255, 255, 0.15)'} !important;
          border-bottom: ${isActive ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0, 0, 0, 0.4)'} !important;
          box-shadow: ${isActive ? 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1)' : '0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3)'} !important;
          --primary-text-color: #e0e0e0;
          --secondary-text-color: #999;
          transition: all 0.2s ease-in-out;
          min-height: 60px !important;
          display: flex;
          flex-direction: column;
          justify-content: center;
          transform: ${isActive ? 'translateY(2px)' : 'none'};
          cursor: pointer;
        }
        ha-card:hover {
          box-shadow: ${isActive 
            ? 'inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1)' 
            : '0 12px 24px -5px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)'} !important;
        }
        ha-card:active {
          transform: scale(0.98) ${isActive ? 'translateY(2px)' : ''};
        }
        
        ha-card .card-content {
          display: flex;
          flex-direction: ${layout === 'vertical' ? 'column' : 'row'};
          align-items: center;
          padding: 16px;
          gap: 16px;
          position: relative;
        }
        
        /* Brightness slider background - subtle gradient from light to stronger */
        ha-card .brightness-slider {
          position: absolute;
          ${layout === 'vertical' ? `
            /* Vertical: von unten nach oben - mit weichen Rändern */
            bottom: 5px;
            left: 5px;
            right: 5px;
            height: ${showSlider ? brightness : 0}%;
            width: auto;
            background: linear-gradient(0deg, 
              ${sliderColorStart} 0%,
              ${sliderColorEnd} 100%);
            border-radius: 0 0 12px 12px;
            /* Weiche Ränder links, rechts und unten */
            mask-image: linear-gradient(to right, transparent 0%, black 12px, black calc(100% - 12px), transparent 100%),
                        linear-gradient(to top, transparent 0%, black 12px);
            mask-composite: intersect;
            -webkit-mask-image: linear-gradient(to right, transparent 0%, black 12px, black calc(100% - 12px), transparent 100%),
                               linear-gradient(to top, transparent 0%, black 12px);
            -webkit-mask-composite: source-in;
          ` : `
            /* Horizontal: von links nach rechts - MIT Icon-Ausschnitt und weichen Rändern */
            top: 5px;
            left: 5px;
            bottom: 5px;
            width: ${showSlider ? brightness : 0}%;
            background: linear-gradient(90deg, 
              ${sliderColorStart} 0%,
              ${sliderColorEnd} 100%);
            border-radius: 12px 0 0 12px;
            /* Weiche Ränder oben, unten, links + Icon-Ausschnitt */
            mask-image: radial-gradient(circle 25px at 31px center, transparent 0, transparent 25px, black 26px),
                        linear-gradient(to bottom, transparent 0%, black 10px, black calc(100% - 10px), transparent 100%),
                        linear-gradient(to right, transparent 0%, black 10px, black 100%);
            mask-composite: intersect;
            -webkit-mask-image: radial-gradient(circle 25px at 31px center, transparent 0, transparent 25px, black 26px),
                               linear-gradient(to bottom, transparent 0%, black 10px, black calc(100% - 10px), transparent 100%),
                               linear-gradient(to right, transparent 0%, black 10px, black 100%);
            -webkit-mask-composite: source-in;
          `}
          transition: ${layout === 'vertical' ? 'height' : 'width'} 0.15s ease-out;
          pointer-events: none;
          z-index: 0;
        }
        ha-card .icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
          z-index: 10;
        }
        /* Neumorphic icon circle - Dark Theme with Glassmorphism blend */
        ha-card .icon-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          z-index: 1;
          
          ${iconColor ? `
            /* ACTIVE STATE - Raised with brightness-based glow */
            background: linear-gradient(145deg, 
              ${iconColor.color.replace('rgb', 'rgba').replace(')', ', 0.2)')}, 
              ${iconColor.color.replace('rgb', 'rgba').replace(')', ', 0.1)')});
            box-shadow: 
              /* Subtle outer shadows */
              3px 3px 8px rgba(0, 0, 0, 0.3),
              -2px -2px 6px rgba(255, 255, 255, 0.04),
              /* Color glow - intensity based on brightness */
              0 0 ${showSlider ? Math.round(8 + brightness * 0.16) : 12}px ${iconColor.shadow.replace('0.6', String(glowIntensity))},
              0 0 ${showSlider ? Math.round(16 + brightness * 0.24) : 24}px ${iconColor.shadow.replace('0.6', String(glowIntensityOuter))},
              /* Inner highlight */
              inset 1px 1px 2px rgba(255, 255, 255, 0.1);
          ` : `
            /* INACTIVE STATE - Glassmorphism + stronger inset */
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 
              inset 3px 3px 8px rgba(0, 0, 0, 0.5),
              inset -2px -2px 6px rgba(255, 255, 255, 0.05),
              inset 1px 1px 3px rgba(0, 0, 0, 0.3);
          `}
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        ha-card .icon-wrapper {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        ha-card ha-icon {
          --mdc-icon-size: 22px;
          width: 22px;
          height: 22px;
          ${iconColor 
            ? `color: ${iconColor.color} !important; 
               opacity: ${iconOpacity};
               filter: ${iconDropShadow};` 
            : 'color: rgba(255, 255, 255, 0.4);'}
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        ha-card .info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          ${layout === 'vertical' ? 'text-align: center;' : ''}
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: center;
          ${layout === 'horizontal' ? 'height: 40px;' : ''}
        }
        ha-card .name {
          font-size: 1.125rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.2;
          ${showState ? 'margin-bottom: 2px;' : 'margin-bottom: 0;'}
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        ha-card .state {
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          text-transform: capitalize;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          ${!showState ? 'display: none;' : ''}
        }
        
        /* Responsive: Tablet */
        @media (max-width: 1024px) {
          ha-card .card-content {
            padding: 14px;
            gap: 14px;
          }
        }
        
        /* Responsive: Mobile */
        @media (max-width: 600px) {
          ha-card .card-content {
            padding: 12px;
            gap: 12px;
          }
        }
      </style>
      <ha-card>
        <div class="card-content">
          <div class="brightness-slider"></div>
          <div class="icon-container">
            <div class="icon-circle"></div>
            <div class="icon-wrapper">
              <ha-icon icon="${displayIcon}"></ha-icon>
            </div>
          </div>
          <div class="info">
            <div class="name">${friendlyName}</div>
            <div class="state">${stateDisplay}</div>
          </div>
        </div>
      </ha-card>
    `;

    // Add event listeners
    const card = this.shadowRoot.querySelector('ha-card');
    const slider = this.shadowRoot.querySelector('.brightness-slider');
    this._card = card;
    
    if (card) {
      let touchStart = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let hasMoved = false;
      let hasHandledInteraction = false;
      
      // Handle start of interaction
      const handleInteractionStart = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        touchStartX = clientX;
        touchStartY = clientY;
        touchStart = Date.now();
        hasMoved = false;
        hasHandledInteraction = false;
        this._isDragging = false;
        this._dragStartX = clientX;
        this._dragStartBrightness = brightness;
      };
      
      // Handle move during interaction (only for brightness slider)
      const handleInteractionMove = (e) => {
        if (!showSlider) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const deltaX = Math.abs(clientX - touchStartX);
        const deltaY = Math.abs(clientY - touchStartY);
        
        // Start dragging based on layout direction
        if (layout === 'vertical') {
          // Vertical: Start dragging if moved more than 10px vertically and more vertical than horizontal
          if (deltaY > 10 && deltaY > deltaX) {
            this._isDragging = true;
            hasMoved = true;
          }
        } else {
          // Horizontal: Start dragging if moved more than 10px horizontally and more horizontal than vertical
          if (deltaX > 10 && deltaX > deltaY) {
            this._isDragging = true;
            hasMoved = true;
          }
        }
        
        if (this._isDragging) {
          e.preventDefault();
          const rect = card.getBoundingClientRect();
          let newBrightness;
          
          if (layout === 'vertical') {
            // Vertical: Calculate from bottom (inverted Y-axis)
            const percent = Math.round(((rect.bottom - clientY) / rect.height) * 100);
            newBrightness = Math.max(1, Math.min(100, percent));
            // Update slider visually
            if (slider) {
              slider.style.height = newBrightness + '%';
            }
          } else {
            // Horizontal: Calculate from left
            const percent = Math.round(((clientX - rect.left) / rect.width) * 100);
            newBrightness = Math.max(1, Math.min(100, percent));
            // Update slider visually
            if (slider) {
              slider.style.width = newBrightness + '%';
            }
          }
          
          // Update state display
          const stateEl = this.shadowRoot.querySelector('.state');
          if (stateEl) {
            stateEl.textContent = newBrightness + '%';
          }
        }
      };
      
      // Handle end of interaction
      const handleInteractionEnd = (e) => {
        const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        
        // If we were dragging the brightness slider
        if (this._isDragging && showSlider) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const rect = card.getBoundingClientRect();
          let newBrightness;
          
          if (layout === 'vertical') {
            // Vertical: Calculate from bottom (inverted Y-axis)
            const percent = Math.round(((rect.bottom - clientY) / rect.height) * 100);
            newBrightness = Math.max(1, Math.min(100, percent));
          } else {
            // Horizontal: Calculate from left
            const percent = Math.round(((clientX - rect.left) / rect.width) * 100);
            newBrightness = Math.max(1, Math.min(100, percent));
          }
          
          this._setBrightness(newBrightness);
          this._isDragging = false;
          hasHandledInteraction = true;
          return;
        }
        
        this._isDragging = false;
        
        // Handle tap/hold for ALL entities (not just lights)
        const duration = Date.now() - touchStart;
        if (!hasMoved && duration < 500) {
          this._handleTap();
          hasHandledInteraction = true;
        } else if (!hasMoved && duration >= 500) {
          e.preventDefault();
          this._handleHold();
          hasHandledInteraction = true;
        }
      };
      
      // Create bound handlers for proper cleanup
      this._boundHandlers = {
        touchStart: (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleInteractionStart(e);
        },
        touchMove: (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleInteractionMove(e);
        },
        touchEnd: (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleInteractionEnd(e);
        },
        mouseDown: (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleInteractionStart(e);
        },
        mouseMove: (e) => {
          if (e.buttons === 1) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            handleInteractionMove(e);
          }
        },
        mouseUp: (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleInteractionEnd(e);
        },
        mouseLeave: () => {
          if (this._isDragging) {
            this._isDragging = false;
            this._updateCard(); // Reset to actual brightness
          }
        },
        click: (e) => {
          // CRITICAL: Stop propagation immediately to prevent other cards from receiving this event
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Only handle if we haven't already handled via mouseup/touchend
          if (!hasHandledInteraction && !hasMoved) {
            this._handleTap();
          }
          // Reset state for next interaction
          hasMoved = false;
          hasHandledInteraction = false;
          touchStart = 0;
        },
        contextMenu: (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this._handleHold();
        }
      };
      
      // Touch events - use capture phase for better isolation
      card.addEventListener('touchstart', this._boundHandlers.touchStart, { passive: true, capture: true });
      card.addEventListener('touchmove', this._boundHandlers.touchMove, { passive: false, capture: true });
      card.addEventListener('touchend', this._boundHandlers.touchEnd, { capture: true });
      
      // Mouse events
      card.addEventListener('mousedown', this._boundHandlers.mouseDown, { capture: true });
      card.addEventListener('mousemove', this._boundHandlers.mouseMove, { capture: true });
      card.addEventListener('mouseup', this._boundHandlers.mouseUp, { capture: true });
      card.addEventListener('mouseleave', this._boundHandlers.mouseLeave);
      
      // Click handler - use capture phase to catch events before they bubble
      card.addEventListener('click', this._boundHandlers.click, { capture: true });
      
      // Context menu for hold
      card.addEventListener('contextmenu', this._boundHandlers.contextMenu, { capture: true });
    }
  }
}

customElements.define('prism-button', PrismButtonCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-button",
  name: "Prism Button",
  preview: true,
  description: "A glassmorphism-styled entity card with neumorphism effects and glowing icon circle"
});
