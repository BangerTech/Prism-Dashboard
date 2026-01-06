
class PrismButtonLightCard extends HTMLElement {
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
    return { entity: "light.example_light", name: "Example", icon: "mdi:lightbulb", layout: "horizontal", active_color: "#ffc864" }
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
          name: "show_brightness_slider",
          selector: { boolean: {} }
        },
        {
          name: "slider_entity",
          selector: { entity: {} }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
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
    // Normalize active_color (convert RGB arrays to hex if needed)
    if (this._config.active_color) {
      this._config.active_color = this._normalizeColor(this._config.active_color);
    }
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

  _isActive() {
    if (!this._hass || !this._config.entity) return false;
    const entity = this._hass.states[this._config.entity];
    if (!entity) return false;
    
    const state = entity.state;
    if (this._config.entity.startsWith('lock.')) {
      return state === 'locked';
    } else if (this._config.entity.startsWith('climate.')) {
      return state === 'heat' || state === 'auto';
    } else {
      return state === 'on' || state === 'open';
    }
  }

  _getIconColor() {
    if (!this._hass || !this._config.entity) return null;
    const entity = this._hass.states[this._config.entity];
    if (!entity) return null;
    
    const state = entity.state;
    const isActive = this._isActive();
    const attr = entity.attributes;
    
    // For lights: PRIORITY 1 - use actual rgb_color from entity if available
    if (isActive && this._config.entity.startsWith('light.')) {
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
    if (this._config.entity.startsWith('lock.')) {
      if (state === 'locked') {
        return { color: 'rgb(76, 175, 80)', shadow: 'rgba(76, 175, 80, 0.6)' };
      } else if (state === 'unlocked') {
        return { color: 'rgb(244, 67, 54)', shadow: 'rgba(244, 67, 54, 0.6)' };
      }
    } else if (this._config.entity.startsWith('climate.')) {
      if (state === 'heat' || state === 'auto') {
        return { color: 'rgb(255, 152, 0)', shadow: 'rgba(255, 152, 0, 0.6)' };
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
    if (!this._hass || !this._config.entity) return;
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
    if (!this._hass || !this._config.entity) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this._config.entity }
    });
    this.dispatchEvent(event);
  }

  _updateCard() {
    if (!this._config || !this._config.entity) return;
    
    const entity = this._hass ? this._hass.states[this._config.entity] : null;
    const isActive = entity ? this._isActive() : false;
    const iconColor = entity ? this._getIconColor() : null;
    const state = entity ? entity.state : 'off';
    const friendlyName = this._config.name || (entity ? entity.attributes.friendly_name : null) || this._config.entity;
    const layout = this._config.layout || 'horizontal';
    
    // Brightness slider logic
    const hasBrightness = this._hasBrightnessControl();
    const brightness = hasBrightness ? this._getBrightness() : 0;
    const showSlider = hasBrightness && isActive;
    
    // State display - show brightness percentage if available
    const stateDisplay = (showSlider && brightness > 0) ? `${brightness}%` : state;
    
    // Get the color for the brightness slider - very subtle opacity
    const sliderColor = iconColor ? iconColor.color : 'rgb(255, 200, 100)';
    const sliderOpacityStart = 0.08; // Dezent auf der linken Seite
    const sliderOpacityEnd = 0.22;   // Stärker auf der rechten Seite
    const sliderColorStart = sliderColor.replace('rgb', 'rgba').replace(')', `, ${sliderOpacityStart})`);
    const sliderColorEnd = sliderColor.replace('rgb', 'rgba').replace(')', `, ${sliderOpacityEnd})`);

    // Calculate icon glow intensity based on brightness (only when active)
    const glowOpacity = (isActive && brightness > 0) ? Math.max(0.1, Math.min(0.5, brightness / 100 * 0.5)) : 0;
    const glowRadius1 = (isActive && brightness > 0) ? Math.max(6, Math.min(12, brightness / 100 * 12)) : 0;
    const glowRadius2 = (isActive && brightness > 0) ? Math.max(12, Math.min(24, brightness / 100 * 24)) : 0;
    const iconOpacity = (isActive && brightness > 0) ? Math.max(0.64, Math.min(1.0, brightness / 100)) : 0.4; // Min 40% when off, min 64% when on

    // Remove old event listeners before re-rendering
    this._removeEventListeners();

    this.shadowRoot.innerHTML = `
      <style>
        /* ============================================
           GLASSMORPHISM LIGHT THEME
           Transparent glass with blur + neumorphic icons
           ============================================ */
        
        :host {
          display: block;
        }
        ha-card {
          /* Glassmorphism background - more transparent like dark version */
          background: ${isActive 
            ? 'rgba(240, 242, 245, 0.5)' 
            : 'rgba(255, 255, 255, 0.6)'} !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          
          border-radius: 16px !important;
          
          /* Subtle glass borders for 3D depth */
          border: 1px solid rgba(255, 255, 255, 0.5) !important;
          border-top: ${isActive 
            ? '1px solid rgba(0, 0, 0, 0.08)' 
            : '1px solid rgba(255, 255, 255, 0.8)'} !important;
          border-bottom: ${isActive 
            ? '1px solid rgba(255, 255, 255, 0.5)' 
            : '1px solid rgba(0, 0, 0, 0.15)'} !important;
          
          /* Shadows - stronger inset for pressed state */
          box-shadow: ${isActive 
            ? `/* PRESSED STATE - strong inset like dark version */
               inset 2px 2px 6px rgba(0, 0, 0, 0.15),
               inset -1px -1px 3px rgba(255, 255, 255, 0.7),
               inset 1px 1px 3px rgba(0, 0, 0, 0.1)` 
            : `/* RAISED STATE */
               0 10px 20px -5px rgba(0, 0, 0, 0.15),
               0 2px 4px rgba(0, 0, 0, 0.08)`} !important;
          
          --primary-text-color: #1a1a1a;
          --secondary-text-color: #666;
          
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
            ? `inset 2px 2px 6px rgba(0, 0, 0, 0.15),
               inset -1px -1px 3px rgba(255, 255, 255, 0.7),
               inset 1px 1px 3px rgba(0, 0, 0, 0.1)` 
            : `0 12px 24px -5px rgba(0, 0, 0, 0.18),
               0 4px 8px rgba(0, 0, 0, 0.1),
               0 0 0 1px rgba(0, 0, 0, 0.03)`} !important;
        }
        
        ha-card:active {
          transform: scale(0.98) ${isActive ? 'translateY(2px)' : ''};
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
        
        ha-card .card-content {
          display: flex;
          flex-direction: ${layout === 'vertical' ? 'column' : 'row'};
          align-items: center;
          padding: 16px;
          gap: 16px;
          position: relative;
        }
        
        ha-card .icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          width: 40px;
          height: 40px;
        }
        
        /* Glassmorphic icon circle with glow */
        ha-card .icon-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          z-index: 1;
          
          ${iconColor ? `
            /* ACTIVE STATE - with color glow based on brightness */
            background: linear-gradient(145deg, 
              ${iconColor.color.replace('rgb', 'rgba').replace(')', ', 0.2)')}, 
              ${iconColor.color.replace('rgb', 'rgba').replace(')', ', 0.1)')});
            box-shadow: 
              /* Subtle outer shadows */
              3px 3px 8px rgba(0, 0, 0, 0.1),
              -2px -2px 6px rgba(255, 255, 255, 0.5),
              /* Color glow - intensity based on brightness */
              0 0 ${glowRadius1}px ${iconColor.shadow.replace('0.6', glowOpacity * 0.8).replace(')', '')}),
              0 0 ${glowRadius2}px ${iconColor.shadow.replace('0.6', glowOpacity * 0.4).replace(')', '')}),
              /* Inner highlight */
              inset 1px 1px 2px rgba(255, 255, 255, 0.4);
          ` : `
            /* INACTIVE STATE - stronger inset for depth */
            background: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 
              inset 3px 3px 8px rgba(0, 0, 0, 0.12),
              inset -2px -2px 6px rgba(255, 255, 255, 0.6),
              inset 1px 1px 3px rgba(0, 0, 0, 0.06);
          `}
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        ha-card .icon-wrapper {
          position: relative;
          z-index: 2; /* Ensure icon is above its circle */
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        ha-card ha-icon {
          --mdc-icon-size: 24px;
          ${iconColor 
            ? `color: ${iconColor.color.replace(')', `, ${iconOpacity})`)} !important; 
               filter: drop-shadow(0 0 ${glowRadius1 * 0.5}px ${iconColor.shadow.replace('0.6', glowOpacity * 0.9).replace(')', '')});` 
            : 'color: rgba(0, 0, 0, 0.35);'}
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        ha-card .info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          ${layout === 'vertical' ? 'text-align: center;' : ''}
        }
        
        ha-card .name {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: 0.2px;
        }
        
        ha-card .state {
          font-size: 12px;
          font-weight: 500;
          color: #666;
          text-transform: capitalize;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      </style>
      <ha-card>
        <div class="card-content">
          <div class="brightness-slider"></div>
          <div class="icon-container">
            <div class="icon-circle"></div>
            <div class="icon-wrapper">
              <ha-icon icon="${this._config.icon}"></ha-icon>
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
          if (deltaY > 10 && deltaY > deltaX) {
            this._isDragging = true;
            hasMoved = true;
          }
        } else {
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
            const percent = Math.round(((rect.bottom - clientY) / rect.height) * 100);
            newBrightness = Math.max(1, Math.min(100, percent));
            if (slider) {
              slider.style.height = newBrightness + '%';
            }
          } else {
            const percent = Math.round(((clientX - rect.left) / rect.width) * 100);
            newBrightness = Math.max(1, Math.min(100, percent));
            if (slider) {
              slider.style.width = newBrightness + '%';
            }
          }
          
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
        
        if (this._isDragging && showSlider) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const rect = card.getBoundingClientRect();
          let newBrightness;
          
          if (layout === 'vertical') {
            const percent = Math.round(((rect.bottom - clientY) / rect.height) * 100);
            newBrightness = Math.max(1, Math.min(100, percent));
          } else {
            const percent = Math.round(((clientX - rect.left) / rect.width) * 100);
            newBrightness = Math.max(1, Math.min(100, percent));
          }
          
          this._setBrightness(newBrightness);
          this._isDragging = false;
          hasHandledInteraction = true;
          return;
        }
        
        this._isDragging = false;
        
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
            this._updateCard();
          }
        },
        click: (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          if (!hasHandledInteraction && !hasMoved) {
            this._handleTap();
          }
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
      
      // Click handler - use capture phase
      card.addEventListener('click', this._boundHandlers.click, { capture: true });
      
      // Context menu for hold
      card.addEventListener('contextmenu', this._boundHandlers.contextMenu, { capture: true });
    }
  }
}

customElements.define('prism-button-light', PrismButtonLightCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-button-light",
  name: "Prism Button Light",
  preview: true,
  description: "A glassmorphism-styled entity card with transparency, blur and glowing icons"
});
