
class PrismButtonCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartBrightness = 0;
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
    
    // If active_color is configured and entity is active, use it
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
    this._hass.callService(domain, 'toggle', {
      entity_id: this._config.entity
    });
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
    const stateDisplay = (isActive && hasBrightness && brightness > 0) ? `${brightness}%` : state;
    
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

    this.innerHTML = `
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
        
        .card-content {
          display: flex;
          flex-direction: ${layout === 'vertical' ? 'column' : 'row'};
          align-items: center;
          padding: 16px;
          gap: 16px;
          position: relative;
        }
        
        /* Brightness slider background - subtle gradient from light to stronger */
        .brightness-slider {
          position: absolute;
          ${layout === 'vertical' ? `
            /* Vertical: von unten nach oben - OHNE Ausschnitt */
            bottom: 0;
            left: 0;
            right: 0;
            height: ${showSlider ? brightness : 0}%;
            width: auto;
            background: linear-gradient(0deg, 
              ${sliderColorStart} 0%,
              ${sliderColorEnd} 100%);
            border-radius: 0 0 16px 16px;
          ` : `
            /* Horizontal: von links nach rechts - MIT Icon-Ausschnitt */
            top: 0;
            left: 0;
            bottom: 0;
            width: ${showSlider ? brightness : 0}%;
            background: linear-gradient(90deg, 
              ${sliderColorStart} 0%,
              ${sliderColorEnd} 100%);
            border-radius: 16px 0 0 16px;
            /* Icon links in der Mitte ausschneiden - 40px von links, center vertical */
            mask-image: radial-gradient(circle 29px at 40px center, transparent 0, transparent 29px, black 30px);
            -webkit-mask-image: radial-gradient(circle 29px at 40px center, transparent 0, transparent 29px, black 30px);
          `}
          transition: ${layout === 'vertical' ? 'height' : 'width'} 0.15s ease-out;
          pointer-events: none;
          z-index: 0;
        }
        .icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          width: 48px;
          height: 48px;
          z-index: 10;
        }
        /* Neumorphic icon circle - Dark Theme with Glassmorphism blend */
        .icon-circle {
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
        .icon-wrapper {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        ha-icon {
          --mdc-icon-size: 24px;
          ${iconColor 
            ? `color: ${iconColor.color} !important; 
               opacity: ${iconOpacity};
               filter: ${iconDropShadow};` 
            : 'color: rgba(255, 255, 255, 0.4);'}
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          ${layout === 'vertical' ? 'text-align: center;' : ''}
          position: relative;
          z-index: 10;
        }
        .name {
          font-size: 16px;
          font-weight: 500;
          color: #e0e0e0;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .state {
          font-size: 14px;
          color: #999;
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
    const card = this.querySelector('ha-card');
    const slider = this.querySelector('.brightness-slider');
    
    if (card) {
      let touchStart = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let hasMoved = false;
      
      // Handle start of interaction
      const handleInteractionStart = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        touchStartX = clientX;
        touchStartY = clientY;
        touchStart = Date.now();
        hasMoved = false;
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
          const stateEl = this.querySelector('.state');
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
          return;
        }
        
        this._isDragging = false;
        
        // Handle tap/hold for ALL entities (not just lights)
        const duration = Date.now() - touchStart;
        if (!hasMoved && duration < 500) {
          this._handleTap();
        } else if (!hasMoved && duration >= 500) {
          e.preventDefault();
          this._handleHold();
        }
      };
      
      // Touch events
      card.addEventListener('touchstart', handleInteractionStart, { passive: true });
      card.addEventListener('touchmove', handleInteractionMove, { passive: false });
      card.addEventListener('touchend', handleInteractionEnd);
      
      // Mouse events
      card.addEventListener('mousedown', handleInteractionStart);
      card.addEventListener('mousemove', (e) => {
        if (e.buttons === 1) handleInteractionMove(e);
      });
      card.addEventListener('mouseup', handleInteractionEnd);
      card.addEventListener('mouseleave', () => {
        if (this._isDragging) {
          this._isDragging = false;
          this._updateCard(); // Reset to actual brightness
        }
      });
      
      // Click handler as fallback (for desktop without mousedown/up)
      card.addEventListener('click', (e) => {
        // Only handle if we didn't already handle via mouseup
        if (!hasMoved && touchStart === 0) {
          this._handleTap();
        }
        hasMoved = false;
      });
      
      // Context menu for hold
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._handleHold();
      });
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
