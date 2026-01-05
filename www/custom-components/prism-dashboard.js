/**
 * Prism Dashboard - Custom Cards Collection
 * https://github.com/BangerTech/Prism-Dashboard
 * 
 * Version: 1.0.0
 * Build Date: 2026-01-05T08:02:09.777Z
 * 
 * This file contains all Prism custom cards bundled together.
 * Just add this single file as a resource in Lovelace:
 * /hacsfiles/Prism-Dashboard/prism-dashboard.js
 */

console.info(
  '%c PRISM-DASHBOARD %c v1.0.0 ',
  'color: white; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
  'color: #667eea; background: #e8e8e8; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;'
);


// ============================================
// prism-button.js
// ============================================
(function() {

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
            /* Icon links in der Mitte ausschneiden - 36px von links (16px padding + 20px half icon), center vertical */
            mask-image: radial-gradient(circle 25px at 36px center, transparent 0, transparent 25px, black 26px);
            -webkit-mask-image: radial-gradient(circle 25px at 36px center, transparent 0, transparent 25px, black 26px);
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
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
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
        .info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          ${layout === 'vertical' ? 'text-align: center;' : ''}
          position: relative;
          z-index: 10;
        }
        .name {
          font-size: 1.125rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .state {
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
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

})();

// ============================================
// prism-button-light.js
// ============================================
(function() {

class PrismButtonLightCard extends HTMLElement {
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

    this.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        /* ============================================
           GLASSMORPHISM LIGHT THEME
           Transparent glass with blur + neumorphic icons
           ============================================ */
        
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
            /* Icon links in der Mitte ausschneiden - 36px von links (16px padding + 20px half icon), center vertical */
            mask-image: radial-gradient(circle 25px at 36px center, transparent 0, transparent 25px, black 26px);
            -webkit-mask-image: radial-gradient(circle 25px at 36px center, transparent 0, transparent 25px, black 26px);
          `}
          transition: ${layout === 'vertical' ? 'height' : 'width'} 0.15s ease-out;
          pointer-events: none;
          z-index: 0;
        }
        
        .card-content {
          display: flex;
          flex-direction: ${layout === 'vertical' ? 'column' : 'row'};
          align-items: center;
          padding: 16px;
          gap: 16px;
          position: relative;
        }
        
        .icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          width: 40px;
          height: 40px;
        }
        
        /* Glassmorphic icon circle with glow */
        .icon-circle {
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
        
        .icon-wrapper {
          position: relative;
          z-index: 2; /* Ensure icon is above its circle */
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        ha-icon {
          --mdc-icon-size: 24px;
          ${iconColor 
            ? `color: ${iconColor.color.replace(')', `, ${iconOpacity})`)} !important; 
               filter: drop-shadow(0 0 ${glowRadius1 * 0.5}px ${iconColor.shadow.replace('0.6', glowOpacity * 0.9).replace(')', '')});` 
            : 'color: rgba(0, 0, 0, 0.35);'}
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        .info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          ${layout === 'vertical' ? 'text-align: center;' : ''}
        }
        
        .name {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: 0.2px;
        }
        
        .state {
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
          // Short tap - toggle entity
          this._handleTap();
        } else if (duration >= 500) {
          // Long press - show more-info
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

customElements.define('prism-button-light', PrismButtonLightCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-button-light",
  name: "Prism Button Light",
  preview: true,
  description: "A glassmorphism-styled entity card with transparency, blur and glowing icons"
});

})();

// ============================================
// prism-heat.js
// ============================================
(function() {

class PrismHeatCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._dragging = false;
    this._targetTemp = 20;
    this._currentTemp = 20;
    this._humidity = null;
    this._minTemp = 10;
    this._maxTemp = 30;
    this._state = 'off';
    this._lastInteraction = 0;
  }

  static getStubConfig() {
    return { entity: "climate.example", name: "Living Room", icon: "mdi:heating-coil", color: "#fb923c" }
  }

  // Use getConfigForm for automatic form generation - more reliable than custom editor
  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "climate" } }
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
          name: "color",
          selector: { color_rgb: {} }
        },
        {
          name: "compact_mode",
          selector: { boolean: {} }
        },
        {
          name: "temperature_entity",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "humidity_entity",
          selector: { entity: { domain: "sensor" } }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    // Create a copy to avoid modifying read-only config object
    this.config = { ...config };
    // Set default icon
    if (!this.config.icon) {
      this.config.icon = "mdi:heating-coil";
    }
    // Normalize color (convert RGB arrays to hex if needed)
    if (this.config.color) {
      this.config.color = this._normalizeColor(this.config.color);
    } else {
      this.config.color = "#fb923c";
    }
    // Set default for compact_mode
    if (this.config.compact_mode === undefined) {
      this.config.compact_mode = false;
    }
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
    const entity = hass.states[this.config.entity];
    if (!entity) return;

    this._entity = entity;
    const newTarget = entity.attributes.temperature || 20;
    const newState = entity.state || 'off';
    
    // Get current temperature - from external entity if configured, otherwise from climate entity
    let newCurrent = entity.attributes.current_temperature || 20;
    if (this.config.temperature_entity) {
      const tempEntity = hass.states[this.config.temperature_entity];
      if (tempEntity && tempEntity.state && !isNaN(parseFloat(tempEntity.state))) {
        newCurrent = parseFloat(tempEntity.state);
      }
    }
    
    // Get humidity if configured
    let newHumidity = null;
    if (this.config.humidity_entity) {
      const humidityEntity = hass.states[this.config.humidity_entity];
      if (humidityEntity && humidityEntity.state && !isNaN(parseFloat(humidityEntity.state))) {
        newHumidity = parseFloat(humidityEntity.state);
      }
    }

    // Update state immediately if it changes
    if (this._state !== newState) {
        this._state = newState;
        this.render(); // Re-render for state change (color etc)
    }

    // Only update target temp if we are not dragging AND we haven't interacted recently (2s debounce)
    const now = Date.now();
    const isInteracting = this._dragging || (now - this._lastInteraction < 2000);

    if (!isInteracting && (this._targetTemp !== newTarget || this._currentTemp !== newCurrent || this._humidity !== newHumidity)) {
      this._targetTemp = newTarget;
      this._currentTemp = newCurrent;
      this._humidity = newHumidity;
      this.render();
    }
  }

  getCardSize() {
    return this.config?.compact_mode ? 3 : 4;
  }

  connectedCallback() {
    this.render();
    this.setupListeners();
  }

  setupListeners() {
    const knob = this.shadowRoot.querySelector('#knob-container');
    if (!knob) return;

    knob.addEventListener('mousedown', this.startDrag.bind(this));
    knob.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
    
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));
    
    document.addEventListener('touchmove', this.onDrag.bind(this), { passive: false });
    document.addEventListener('touchend', this.stopDrag.bind(this));

    // Mode buttons
    this.shadowRoot.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.setMode(mode);
      });
    });
  }

  startDrag(e) {
    this._dragging = true;
    this.onDrag(e);
  }

  stopDrag() {
    if (!this._dragging) return;
    this._dragging = false;
    this._lastInteraction = Date.now();
    
    // Send new temp to HA
    if (this._hass && this.config.entity) {
      this._hass.callService('climate', 'set_temperature', {
        entity_id: this.config.entity,
        temperature: this._targetTemp
      });
    } else {
      // Fallback to event dispatch if hass object not ready (unlikely)
      this.dispatchEvent(new CustomEvent('hass-service-called', {
        detail: {
          domain: 'climate',
          service: 'set_temperature',
          data: {
            entity_id: this.config.entity,
            temperature: this._targetTemp
          }
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  onDrag(e) {
    if (!this._dragging) return;
    e.preventDefault();

    const knob = this.shadowRoot.querySelector('#knob-container');
    const rect = knob.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    // Calculate angle (standard math)
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Map to our system: Top (-90) -> 0
    let effectiveAngle = angle + 90;
    if (effectiveAngle > 180) effectiveAngle -= 360;

    // Clamp between -135 and 135
    if (effectiveAngle > 135 && effectiveAngle < 180) effectiveAngle = 135;
    if (effectiveAngle < -135 && effectiveAngle > -180) effectiveAngle = -135;
    
    effectiveAngle = Math.max(-135, Math.min(135, effectiveAngle));

    // Update temp
    const percentage = (effectiveAngle - (-135)) / (135 - (-135));
    const newTemp = this._minTemp + (percentage * (this._maxTemp - this._minTemp));
    this._targetTemp = Math.round(newTemp * 2) / 2;

    this.updateKnobVisuals(effectiveAngle);
  }

  updateKnobVisuals(rotation) {
    const handle = this.shadowRoot.querySelector('#knob-handle');
    const activeArc = this.shadowRoot.querySelector('#active-arc');
    const tempText = this.shadowRoot.querySelector('#temp-text');
    const tempVal = this.shadowRoot.querySelector('.temp-val');
    const currentTempEl = this.shadowRoot.querySelector('.current-temp');
    
    if(handle) handle.style.transform = `rotate(${rotation}deg)`;
    if(tempText) {
        tempText.style.transform = `rotate(${-rotation}deg)`;
    }
    if(tempVal) {
        tempVal.innerText = this._targetTemp.toFixed(1) + '°';
    }
    if(currentTempEl) {
        currentTempEl.innerText = this._currentTemp.toFixed(1) + '°C';
    }

    if(activeArc) {
        const percentage = (rotation - (-135)) / 270;
        const c = 2 * Math.PI * 80;
        const arcLength = c * 0.75; 
        const dashOffset = arcLength * (1 - percentage);
        activeArc.style.strokeDashoffset = dashOffset;
    }
  }

  setMode(mode) {
    if (this._hass && this.config.entity) {
      this._hass.callService('climate', 'set_hvac_mode', {
        entity_id: this.config.entity,
        hvac_mode: mode
      });
    } else {
      this.dispatchEvent(new CustomEvent('hass-service-called', {
        detail: {
          domain: 'climate',
          service: 'set_hvac_mode',
          data: {
            entity_id: this.config.entity,
            hvac_mode: mode
          }
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  render() {
    console.log('PrismHeatCard render v2');
    const isHeating = this._state === 'heat';
    const isAuto = this._state === 'auto';
    const isCooling = this._state === 'cool';
    const isOff = this._state === 'off';
    const isCompact = this.config.compact_mode;

    const percentage = Math.min(Math.max((this._targetTemp - this._minTemp) / (this._maxTemp - this._minTemp), 0), 1);
    const rotation = -135 + (percentage * 270);
    
    const r = 80;
    const c = 2 * Math.PI * r;
    const arcLength = c * 0.75;
    const strokeDashArray = `${arcLength} ${c}`;
    const dashOffset = arcLength * (1 - percentage);

    let currentModeText = 'Aus';
    let iconClass = '';
    
    if(this._state === 'heat') {
        currentModeText = 'Manuell';
        iconClass = 'active heat';
    }
    if(this._state === 'auto') {
        currentModeText = 'Auto';
        iconClass = 'active auto';
    }
    if(this._state === 'cool') {
        currentModeText = 'Cool';
        iconClass = 'active cool';
    }
    if(this._state === 'off') {
        iconClass = 'active off';
    }

    // Compact Mode: Only render the knob without card wrapper
    if (isCompact) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .compact-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 8px;
          }
          .knob-container {
              position: relative; width: 100%; max-width: 250px; min-width: 0; aspect-ratio: 1 / 1;
              display: flex; justify-content: center; align-items: center;
              overflow: hidden;
          }
          .inlet-track {
              position: absolute; inset: 6.4%; border-radius: 50%;
              background: linear-gradient(145deg, #1a1c1e, #222528);
              box-shadow: 
                inset 4px 4px 10px rgba(0, 0, 0, 0.8),
                inset -3px -3px 8px rgba(255, 255, 255, 0.04),
                inset 0 0 20px rgba(0, 0, 0, 0.4);
              border: none;
          }
          svg {
              position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
              transform: rotate(135deg);
          }
          .knob-handle {
              position: absolute; width: 56%; height: 56%; border-radius: 50%;
              background: linear-gradient(145deg, #2d3035, #1e2024);
              box-shadow: 
                8px 8px 20px rgba(0, 0, 0, 0.6),
                -4px -4px 12px rgba(255, 255, 255, 0.03),
                0 4px 15px rgba(0, 0, 0, 0.4),
                inset 0 2px 4px rgba(255, 255, 255, 0.08),
                inset 0 -2px 4px rgba(0, 0, 0, 0.4),
                inset 0 0 20px rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-top: 1px solid rgba(255, 255, 255, 0.12);
              border-bottom: 1px solid rgba(0, 0, 0, 0.3);
              display: flex; justify-content: center; align-items: center; cursor: pointer;
              overflow: hidden;
          }
          /* Dünne erhabene Linie am Knob-Rand */
          .knob-handle::before {
              content: '';
              position: absolute;
              inset: 4%;
              border-radius: 50%;
              background: transparent;
              box-shadow: 
                inset 2px 2px 4px rgba(0, 0, 0, 0.4),
                inset -1px -1px 3px rgba(255, 255, 255, 0.03);
              pointer-events: none;
          }
          .indicator {
              position: absolute; top: 12px; width: 8px; height: 8px; border-radius: 50%;
              background: linear-gradient(145deg, ${this.config.color}DD, ${this.config.color});
              box-shadow: 
                inset 1px 1px 2px rgba(255, 255, 255, 0.3),
                inset -1px -1px 2px rgba(0, 0, 0, 0.3),
                0 0 6px ${this.config.color}88;
          }
          .temp-display { text-align: center; overflow: hidden; width: 100%; position: relative; z-index: 2; }
          .temp-val { font-size: 28px; font-weight: 700; color: white; line-height: 1; min-width: 0; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
          .temp-label { font-size: 9px; text-transform: uppercase; color: rgba(255,255,255,0.4); letter-spacing: 1px; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .sensor-row { display: flex; justify-content: center; gap: 8px; margin-top: 4px; font-size: 11px; color: rgba(255,255,255,0.6); }
          .indicator { z-index: 3; }
        </style>
        <div class="compact-wrapper">
          <div class="knob-container" id="knob-container">
              <div class="inlet-track"></div>
              <svg viewBox="0 0 200 200">
                  <defs>
                     <linearGradient id="grad1-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="0%">
                       <stop offset="0%" style="stop-color:${this.config.color};stop-opacity:0.5" />
                       <stop offset="100%" style="stop-color:${this.config.color};stop-opacity:1" />
                     </linearGradient>
                     <!-- Inset/Vertieft Filter für die orange Linie -->
                     <filter id="inset-arc-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')}" x="-20%" y="-20%" width="140%" height="140%">
                       <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/>
                       <feOffset in="blur" dx="1" dy="1" result="offsetBlur"/>
                       <feFlood flood-color="rgba(0,0,0,0.6)" result="color"/>
                       <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
                       <feComposite in="shadow" in2="SourceAlpha" operator="in" result="innerShadow"/>
                       <feMerge>
                         <feMergeNode in="SourceGraphic"/>
                         <feMergeNode in="innerShadow"/>
                       </feMerge>
                     </filter>
                  </defs>
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="16" stroke-dasharray="${strokeDashArray}" stroke-linecap="round" />
                  <circle id="active-arc" cx="100" cy="100" r="80" fill="none" stroke="url(#grad1-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')})" stroke-width="14" 
                          stroke-dasharray="${strokeDashArray}" 
                          stroke-dashoffset="${dashOffset}" 
                          stroke-linecap="round"
                          filter="url(#inset-arc-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')})" />
              </svg>
              <div class="knob-handle" id="knob-handle" style="transform: rotate(${rotation}deg)">
                  <div class="indicator"></div>
                  <div class="temp-display" id="temp-text" style="transform: rotate(${-rotation}deg)">
                      <div class="temp-val">${this._targetTemp.toFixed(1)}°</div>
                      <div class="temp-label">TARGET</div>
                      <div class="sensor-row">
                          <span>${this._currentTemp.toFixed(1)}°C</span>
                          ${this._humidity !== null ? `<span>${this._humidity.toFixed(0)}%</span>` : ''}
                      </div>
                  </div>
              </div>
          </div>
        </div>
      `;
      
      this.setupListeners();
      return;
    }

    // Normal Mode with card wrapper
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          background: rgba(30, 32, 36, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3);
          padding: 20px;
          color: white;
          user-select: none;
          overflow: hidden;
          box-sizing: border-box;
        }
        .header {
            display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
        }
        .icon-box {
            width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
            background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
            color: rgba(255, 255, 255, 0.4);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 
                4px 4px 10px rgba(0, 0, 0, 0.5),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                inset 0 1px 2px rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.05);
            flex-shrink: 0;
            transition: all 0.3s ease;
        }
        .icon-box ha-icon {
            width: 22px;
            height: 22px;
            --mdc-icon-size: 22px;
        }
        .icon-box.active.heat {
            background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
            box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03);
            color: #fb923c;
        }
        .icon-box.active.heat ha-icon {
            filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.6));
        }
        .icon-box.active.auto {
            background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
            box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03);
            color: #4ade80;
        }
        .icon-box.active.auto ha-icon {
            filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.6));
        }
        .icon-box.active.cool {
            background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
            box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03);
            color: #60a5fa;
        }
        .icon-box.active.cool ha-icon {
            filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.6));
        }
        .icon-box.active.off {
            background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
            box-shadow: 
                4px 4px 10px rgba(0, 0, 0, 0.5),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                inset 0 1px 2px rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.4);
        }

        .title-area { flex: 1; min-width: 0; overflow: hidden; }
        .title { font-size: 1.125rem; font-weight: 700; color: rgba(255, 255, 255, 0.9); line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .subtitle { font-size: 0.75rem; font-weight: 500; color: rgba(255, 255, 255, 0.6); line-height: 1.2; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .status-badge {
            padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase;
            background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.05);
        }
        .status-badge.heat { background: rgba(251, 146, 60, 0.1); color: #fb923c; }
        .status-badge.auto { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
        .status-badge.cool { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        
        .knob-container {
            position: relative; width: 100%; max-width: 250px; min-width: 0; aspect-ratio: 1 / 1; margin: 0 auto 24px auto;
            display: flex; justify-content: center; align-items: center;
            overflow: hidden;
        }
        .inlet-track {
            position: absolute; inset: 6.4%; border-radius: 50%;
            background: linear-gradient(145deg, #1a1c1e, #222528);
            box-shadow: 
              /* Neumorphic inset - eingedrückt */
              inset 4px 4px 10px rgba(0, 0, 0, 0.8),
              inset -3px -3px 8px rgba(255, 255, 255, 0.04),
              inset 0 0 20px rgba(0, 0, 0, 0.4);
            border: none;
        }
        svg {
            position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
            transform: rotate(135deg);
        }
        .knob-handle {
            position: absolute; width: 56%; height: 56%; border-radius: 50%;
            background: linear-gradient(145deg, #2d3035, #1e2024);
            box-shadow: 
              /* Äußerer Schatten für Erhebung */
              8px 8px 20px rgba(0, 0, 0, 0.6),
              -4px -4px 12px rgba(255, 255, 255, 0.03),
              /* Mittlerer Glow */
              0 4px 15px rgba(0, 0, 0, 0.4),
              /* Innerer Ring-Effekt (Bevel) */
              inset 0 2px 4px rgba(255, 255, 255, 0.08),
              inset 0 -2px 4px rgba(0, 0, 0, 0.4),
              /* Subtiler innerer Schatten für Tiefe */
              inset 0 0 20px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-top: 1px solid rgba(255, 255, 255, 0.12);
            border-bottom: 1px solid rgba(0, 0, 0, 0.3);
            display: flex; justify-content: center; align-items: center; cursor: pointer;
            overflow: hidden;
        }
        /* Dünne erhabene Linie am Knob-Rand */
        .knob-handle::before {
            content: '';
            position: absolute;
            inset: 4%;
            border-radius: 50%;
            background: transparent;
            box-shadow: 
              inset 2px 2px 4px rgba(0, 0, 0, 0.4),
              inset -1px -1px 3px rgba(255, 255, 255, 0.03);
            pointer-events: none;
        }
        .indicator {
            position: absolute; top: 12px; width: 8px; height: 8px; border-radius: 50%;
            background: linear-gradient(145deg, ${this.config.color}DD, ${this.config.color});
            box-shadow: 
              inset 1px 1px 2px rgba(255, 255, 255, 0.3),
              inset -1px -1px 2px rgba(0, 0, 0, 0.3),
              0 0 6px ${this.config.color}88;
        }
        .temp-display { text-align: center; overflow: hidden; width: 100%; position: relative; z-index: 2; }
        /* Explicitly set font size and avoid layout shift */
        .temp-val { font-size: 36px; font-weight: 700; color: white; line-height: 1; min-width: 0; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .temp-label { font-size: 10px; text-transform: uppercase; color: rgba(255,255,255,0.4); letter-spacing: 1px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .indicator { z-index: 3; }
        
        .controls {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
        }
        .mode-btn {
            height: 48px; border-radius: 12px;
            background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
            border: 1px solid rgba(255,255,255,0.05);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; color: rgba(255,255,255,0.6);
            overflow: hidden; min-width: 0;
            box-shadow: 
                4px 4px 10px rgba(0, 0, 0, 0.5),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                inset 0 1px 2px rgba(255, 255, 255, 0.05);
        }
        .mode-btn:hover:not(.active) {
            background: linear-gradient(145deg, rgba(40, 43, 50, 1), rgba(32, 34, 40, 1));
        }
        .mode-btn:active, .mode-btn.active {
            background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
            box-shadow: inset 3px 3px 8px rgba(0,0,0,0.7), inset -2px -2px 4px rgba(255,255,255,0.03);
            border-top: 1px solid rgba(0,0,0,0.4);
            transform: scale(0.98);
        }
        .mode-btn.active.heat { color: #fb923c; }
        .mode-btn.active.heat ha-icon { filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.6)); }
        .mode-btn.active.auto { color: #4ade80; }
        .mode-btn.active.auto ha-icon { filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.6)); }
        .mode-btn.active.off { color: #ef5350; }
        .mode-btn.active.off ha-icon { filter: drop-shadow(0 0 6px rgba(239, 83, 80, 0.6)); }
        
        ha-icon { --mdc-icon-size: 20px; }
        .btn-label { font-size: 9px; font-weight: 700; text-transform: uppercase; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }

      </style>
      <div class="card">
        <div class="header">
            <div class="icon-box ${iconClass}">
                <ha-icon icon="${this.config.icon}"></ha-icon>
            </div>
            <div class="title-area">
                <div class="title">${this.config.name || 'Heizung'}</div>
                <div class="subtitle">${this._currentTemp.toFixed(1)} °C${this._humidity !== null ? ` · ${this._humidity.toFixed(0)}%` : ''}</div>
            </div>
        </div>
        
        <div class="knob-container" id="knob-container">
            <div class="inlet-track"></div>
            <svg viewBox="0 0 200 200">
                <defs>
                   <linearGradient id="grad1-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" style="stop-color:${this.config.color};stop-opacity:0.5" />
                     <stop offset="100%" style="stop-color:${this.config.color};stop-opacity:1" />
                   </linearGradient>
                   <!-- Inset/Vertieft Filter für die orange Linie -->
                   <filter id="inset-arc-n-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')}" x="-20%" y="-20%" width="140%" height="140%">
                     <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/>
                     <feOffset in="blur" dx="1" dy="1" result="offsetBlur"/>
                     <feFlood flood-color="rgba(0,0,0,0.6)" result="color"/>
                     <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
                     <feComposite in="shadow" in2="SourceAlpha" operator="in" result="innerShadow"/>
                     <feMerge>
                       <feMergeNode in="SourceGraphic"/>
                       <feMergeNode in="innerShadow"/>
                     </feMerge>
                   </filter>
                </defs>
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="16" stroke-dasharray="${strokeDashArray}" stroke-linecap="round" />
                <circle id="active-arc" cx="100" cy="100" r="80" fill="none" stroke="url(#grad1-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')})" stroke-width="14" 
                        stroke-dasharray="${strokeDashArray}" 
                        stroke-dashoffset="${dashOffset}" 
                        stroke-linecap="round"
                        filter="url(#inset-arc-n-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')})" />
            </svg>
            <div class="knob-handle" id="knob-handle" style="transform: rotate(${rotation}deg)">
                <div class="indicator"></div>
                <div class="temp-display" id="temp-text" style="transform: rotate(${-rotation}deg)">
                    <div class="temp-val">${this._targetTemp.toFixed(1)}°</div>
                    <div class="temp-label">TARGET</div>
                </div>
            </div>
        </div>

        <div class="controls">
            <div class="mode-btn ${this._state === 'off' ? 'active off' : ''}" data-mode="off">
                <ha-icon icon="mdi:power"></ha-icon>
                <span class="btn-label">Off</span>
            </div>
            <div class="mode-btn ${this._state === 'heat' ? 'active heat' : ''}" data-mode="heat">
                <ha-icon icon="mdi:fire"></ha-icon>
                <span class="btn-label">Manuell</span>
            </div>
            <div class="mode-btn ${this._state === 'auto' ? 'active auto' : ''}" data-mode="auto">
                <ha-icon icon="mdi:calendar-sync"></ha-icon>
                <span class="btn-label">Auto</span>
            </div>
        </div>
      </div>
    `;
    
    // Re-attach listeners after render because innerHTML wiped them
    this.setupListeners();
  }
}

// Define Editor FIRST so it's available when getConfigElement() is called
class PrismHeatCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    console.log('[PrismHeatCardEditor] setConfig() called with:', config);
    const oldConfig = this._config;
    // Create a copy to avoid modifying read-only config object
    this._config = { ...(config || {}) };
    
    // Only render if structure doesn't exist yet, otherwise just update values
    if (this._hass) {
      if (!this.querySelector('ha-entity-picker')) {
        this.render();
      } else {
        this.updateValues();
      }
    }
  }

  configChanged(newConfig) {
    const event = new CustomEvent("config-changed", {
      bubbles: true,
      composed: true,
      cancelable: false,
      detail: { config: newConfig }
    });
    this.dispatchEvent(event);
  }

  set hass(hass) {
    console.log('[PrismHeatCardEditor] hass set');
    this._hass = hass;
    if (this._config && !this.querySelector('ha-entity-picker')) {
      this.render();
    } else if (this._hass && this.querySelector('ha-entity-picker')) {
      // Update hass on existing elements
      const picker = this.querySelector('ha-entity-picker');
      if (picker) {
        picker.hass = this._hass;
      }
    }
  }

  connectedCallback() {
    console.log('[PrismHeatCardEditor] connectedCallback() called');
    if (!this._config) {
      this._config = {};
    }
    // Render immediately when connected if not already rendered
    if (this._hass && !this.querySelector('ha-entity-picker')) {
      this.render();
    }
  }

  updateValues() {
    // Update values without re-rendering the entire structure
    const picker = this.querySelector('ha-entity-picker');
    if (picker && picker.value !== (this._config?.entity || '')) {
      picker.value = this._config?.entity || '';
    }

    const nameField = this.querySelector('ha-textfield[label="Name (Optional)"]');
    if (nameField && nameField.value !== (this._config?.name || '')) {
      nameField.value = this._config?.name || '';
    }

    const colorField = this.querySelector('ha-textfield[label="Ring Color (Hex, e.g. #fb923c)"]');
    const colorPicker = this.querySelector('input[type="color"]');
    if (colorField && colorPicker) {
      const currentColor = this._config?.color || '#fb923c';
      if (colorField.value !== currentColor) {
        colorField.value = currentColor;
      }
      if (colorPicker.value !== currentColor) {
        colorPicker.value = currentColor;
      }
    }
  }

  render() {
    if (!this._hass) {
      console.log('[PrismHeatCardEditor] render() called but no hass yet');
      return;
    }

    console.log('[PrismHeatCardEditor] render() called with config:', this._config);

    // Always recreate to ensure proper initialization
    this.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px;">
        <ha-entity-picker
          label="Entity (Climate)"
          allow-custom-entity
          style="display: block; width: 100%;"
        ></ha-entity-picker>
        <ha-textfield
          label="Name (Optional)"
          style="display: block; width: 100%;"
        ></ha-textfield>
        <div style="display: flex; align-items: center; gap: 12px;">
          <ha-textfield
            label="Ring Color (Hex, e.g. #fb923c)"
            style="flex: 1; display: block;"
          ></ha-textfield>
          <input
            type="color"
            style="width: 60px; height: 56px; border-radius: 4px; border: 1px solid var(--divider-color); cursor: pointer; flex-shrink: 0;"
          />
        </div>
      </div>
    `;

    // Set properties and add listeners after DOM is ready
    // Use setTimeout instead of requestAnimationFrame for better compatibility
    setTimeout(() => {
      const picker = this.querySelector('ha-entity-picker');
      if (picker) {
        console.log('[PrismHeatCardEditor] Setting up entity picker');
        console.log('[PrismHeatCardEditor] Picker element:', picker);
        console.log('[PrismHeatCardEditor] Picker computed style:', window.getComputedStyle(picker));
        
        // Set hass first, then other properties
        picker.hass = this._hass;
        picker.includeDomains = ['climate'];
        picker.value = this._config?.entity || '';
        
        // Make sure it's visible
        picker.style.display = 'block';
        picker.style.width = '100%';
        picker.style.visibility = 'visible';
        picker.style.opacity = '1';
        
        // Force update
        if (picker.requestUpdate) {
          picker.requestUpdate();
        }
        if (picker.updateComplete) {
          picker.updateComplete.then(() => {
            console.log('[PrismHeatCardEditor] Entity picker update complete');
          });
        }
        
        // Remove old listener if exists
        if (this._pickerHandler) {
          picker.removeEventListener('value-changed', this._pickerHandler);
        }
        this._pickerHandler = (e) => {
          console.log('[PrismHeatCardEditor] Entity changed:', e.detail.value);
          const newConfig = { ...this._config, entity: e.detail.value };
          this._config = newConfig; // Update local config
          this.configChanged(newConfig);
        };
        picker.addEventListener('value-changed', this._pickerHandler);
        console.log('[PrismHeatCardEditor] Entity picker initialized with value:', picker.value);
        console.log('[PrismHeatCardEditor] Entity picker parent:', picker.parentElement);
      } else {
        console.error('[PrismHeatCardEditor] Entity picker not found in DOM!');
      }

      const nameField = this.querySelector('ha-textfield[label="Name (Optional)"]');
      if (nameField) {
        console.log('[PrismHeatCardEditor] Setting up name field');
        nameField.value = this._config?.name || '';
        // Remove old listener if exists
        if (this._nameFieldHandler) {
          nameField.removeEventListener('input', this._nameFieldHandler);
        }
        this._nameFieldHandler = (e) => {
          console.log('[PrismHeatCardEditor] Name changed:', e.target.value);
          const newConfig = { ...this._config, name: e.target.value };
          this._config = newConfig; // Update local config
          this.configChanged(newConfig);
        };
        nameField.addEventListener('input', this._nameFieldHandler);
      } else {
        console.error('[PrismHeatCardEditor] Name field not found!');
      }

      const colorField = this.querySelector('ha-textfield[label="Ring Color (Hex, e.g. #fb923c)"]');
      const colorPicker = this.querySelector('input[type="color"]');
      if (colorField && colorPicker) {
        console.log('[PrismHeatCardEditor] Setting up color fields');
        const currentColor = this._config?.color || '#fb923c';
        colorField.value = currentColor;
        colorPicker.value = currentColor;
        
        // Sync color picker to text field
        if (this._colorFieldHandler) {
          colorField.removeEventListener('input', this._colorFieldHandler);
        }
        this._colorFieldHandler = (e) => {
          const newColor = e.target.value;
          console.log('[PrismHeatCardEditor] Color changed (text):', newColor);
          colorPicker.value = newColor;
          const newConfig = { ...this._config, color: newColor };
          this._config = newConfig; // Update local config
          this.configChanged(newConfig);
        };
        colorField.addEventListener('input', this._colorFieldHandler);
        
        // Sync text field to color picker
        if (this._colorPickerHandler) {
          colorPicker.removeEventListener('input', this._colorPickerHandler);
        }
        this._colorPickerHandler = (e) => {
          const newColor = e.target.value;
          console.log('[PrismHeatCardEditor] Color changed (picker):', newColor);
          colorField.value = newColor;
          const newConfig = { ...this._config, color: newColor };
          this._config = newConfig; // Update local config
          this.configChanged(newConfig);
        };
        colorPicker.addEventListener('input', this._colorPickerHandler);
      } else {
        console.error('[PrismHeatCardEditor] Color fields not found!');
      }
    }, 0);
  }
}

// Register Editor first
customElements.define("prism-heat-editor", PrismHeatCardEditor);

// Then register the card
customElements.define('prism-heat', PrismHeatCard);

// Register with customCards
window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-heat",
  name: "Prism Heat",
  preview: true,
  description: "A custom thermostat knob card"
});

})();

// ============================================
// prism-heat-light.js
// ============================================
(function() {

class PrismHeatLightCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._dragging = false;
    this._targetTemp = 20;
    this._currentTemp = 20;
    this._humidity = null;
    this._minTemp = 10;
    this._maxTemp = 30;
    this._state = 'off';
    this._lastInteraction = 0;
  }

  static getStubConfig() {
    return { entity: "climate.example", name: "Living Room", icon: "mdi:heating-coil", color: "#fb923c" }
  }

  // Use getConfigForm for automatic form generation - more reliable than custom editor
  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "climate" } }
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
          name: "color",
          selector: { color_rgb: {} }
        },
        {
          name: "compact_mode",
          selector: { boolean: {} }
        },
        {
          name: "temperature_entity",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "humidity_entity",
          selector: { entity: { domain: "sensor" } }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    // Create a copy to avoid modifying read-only config object
    this.config = { ...config };
    // Set default icon
    if (!this.config.icon) {
      this.config.icon = "mdi:heating-coil";
    }
    // Normalize color (convert RGB arrays to hex if needed)
    if (this.config.color) {
      this.config.color = this._normalizeColor(this.config.color);
    } else {
      this.config.color = "#fb923c";
    }
    // Set default for compact_mode
    if (this.config.compact_mode === undefined) {
      this.config.compact_mode = false;
    }
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
    const entity = hass.states[this.config.entity];
    if (!entity) return;

    this._entity = entity;
    const newTarget = entity.attributes.temperature || 20;
    const newState = entity.state || 'off';
    
    // Get current temperature - from external entity if configured, otherwise from climate entity
    let newCurrent = entity.attributes.current_temperature || 20;
    if (this.config.temperature_entity) {
      const tempEntity = hass.states[this.config.temperature_entity];
      if (tempEntity && tempEntity.state && !isNaN(parseFloat(tempEntity.state))) {
        newCurrent = parseFloat(tempEntity.state);
      }
    }
    
    // Get humidity if configured
    let newHumidity = null;
    if (this.config.humidity_entity) {
      const humidityEntity = hass.states[this.config.humidity_entity];
      if (humidityEntity && humidityEntity.state && !isNaN(parseFloat(humidityEntity.state))) {
        newHumidity = parseFloat(humidityEntity.state);
      }
    }

    // Update state immediately if it changes
    if (this._state !== newState) {
        this._state = newState;
        this.render(); // Re-render for state change (color etc)
    }

    // Only update target temp if we are not dragging AND we haven't interacted recently (2s debounce)
    const now = Date.now();
    const isInteracting = this._dragging || (now - this._lastInteraction < 2000);

    if (!isInteracting && (this._targetTemp !== newTarget || this._currentTemp !== newCurrent || this._humidity !== newHumidity)) {
      this._targetTemp = newTarget;
      this._currentTemp = newCurrent;
      this._humidity = newHumidity;
      this.render();
    }
  }

  getCardSize() {
    return this.config?.compact_mode ? 3 : 4;
  }

  connectedCallback() {
    this.render();
    this.setupListeners();
  }

  setupListeners() {
    const knob = this.shadowRoot.querySelector('#knob-container');
    if (!knob) return;

    knob.addEventListener('mousedown', this.startDrag.bind(this));
    knob.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
    
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));
    
    document.addEventListener('touchmove', this.onDrag.bind(this), { passive: false });
    document.addEventListener('touchend', this.stopDrag.bind(this));

    // Mode buttons
    this.shadowRoot.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.setMode(mode);
      });
    });
  }

  startDrag(e) {
    this._dragging = true;
    this.onDrag(e);
  }

  stopDrag() {
    if (!this._dragging) return;
    this._dragging = false;
    this._lastInteraction = Date.now();
    
    // Send new temp to HA
    if (this._hass && this.config.entity) {
      this._hass.callService('climate', 'set_temperature', {
        entity_id: this.config.entity,
        temperature: this._targetTemp
      });
    } else {
      // Fallback to event dispatch if hass object not ready (unlikely)
      this.dispatchEvent(new CustomEvent('hass-service-called', {
        detail: {
          domain: 'climate',
          service: 'set_temperature',
          data: {
            entity_id: this.config.entity,
            temperature: this._targetTemp
          }
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  onDrag(e) {
    if (!this._dragging) return;
    e.preventDefault();

    const knob = this.shadowRoot.querySelector('#knob-container');
    const rect = knob.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    // Calculate angle (standard math)
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Map to our system: Top (-90) -> 0
    let effectiveAngle = angle + 90;
    if (effectiveAngle > 180) effectiveAngle -= 360;

    // Clamp between -135 and 135
    if (effectiveAngle > 135 && effectiveAngle < 180) effectiveAngle = 135;
    if (effectiveAngle < -135 && effectiveAngle > -180) effectiveAngle = -135;
    
    effectiveAngle = Math.max(-135, Math.min(135, effectiveAngle));

    // Update temp
    const percentage = (effectiveAngle - (-135)) / (135 - (-135));
    const newTemp = this._minTemp + (percentage * (this._maxTemp - this._minTemp));
    this._targetTemp = Math.round(newTemp * 2) / 2;

    this.updateKnobVisuals(effectiveAngle);
  }

  updateKnobVisuals(rotation) {
    const handle = this.shadowRoot.querySelector('#knob-handle');
    const activeArc = this.shadowRoot.querySelector('#active-arc');
    const tempText = this.shadowRoot.querySelector('#temp-text');
    const tempVal = this.shadowRoot.querySelector('.temp-val');
    const currentTempEl = this.shadowRoot.querySelector('.current-temp');
    
    if(handle) handle.style.transform = `rotate(${rotation}deg)`;
    if(tempText) {
        tempText.style.transform = `rotate(${-rotation}deg)`;
    }
    if(tempVal) {
        tempVal.innerText = this._targetTemp.toFixed(1) + '°';
    }
    if(currentTempEl) {
        currentTempEl.innerText = this._currentTemp.toFixed(1) + '°C';
    }

    if(activeArc) {
        const percentage = (rotation - (-135)) / 270;
        const c = 2 * Math.PI * 80;
        const arcLength = c * 0.75; 
        const dashOffset = arcLength * (1 - percentage);
        activeArc.style.strokeDashoffset = dashOffset;
    }
  }

  setMode(mode) {
    if (this._hass && this.config.entity) {
      this._hass.callService('climate', 'set_hvac_mode', {
        entity_id: this.config.entity,
        hvac_mode: mode
      });
    } else {
      this.dispatchEvent(new CustomEvent('hass-service-called', {
        detail: {
          domain: 'climate',
          service: 'set_hvac_mode',
          data: {
            entity_id: this.config.entity,
            hvac_mode: mode
          }
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  render() {
    console.log('PrismHeatCard render v2');
    const isHeating = this._state === 'heat';
    const isAuto = this._state === 'auto';
    const isCooling = this._state === 'cool';
    const isOff = this._state === 'off';
    const isCompact = this.config.compact_mode;

    const percentage = Math.min(Math.max((this._targetTemp - this._minTemp) / (this._maxTemp - this._minTemp), 0), 1);
    const rotation = -135 + (percentage * 270);
    
    const r = 80;
    const c = 2 * Math.PI * r;
    const arcLength = c * 0.75;
    const strokeDashArray = `${arcLength} ${c}`;
    const dashOffset = arcLength * (1 - percentage);

    let currentModeText = 'Aus';
    let iconClass = '';
    
    if(this._state === 'heat') {
        currentModeText = 'Manuell';
        iconClass = 'active heat';
    }
    if(this._state === 'auto') {
        currentModeText = 'Auto';
        iconClass = 'active auto';
    }
    if(this._state === 'cool') {
        currentModeText = 'Cool';
        iconClass = 'active cool';
    }
    if(this._state === 'off') {
        iconClass = 'active off';
    }

    // Compact Mode: Only render the knob without card wrapper
    if (isCompact) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .compact-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 8px;
          }
          .knob-container {
              position: relative; width: 100%; max-width: 250px; min-width: 0; aspect-ratio: 1 / 1;
              display: flex; justify-content: center; align-items: center;
              overflow: hidden;
          }
          .inlet-track {
              position: absolute; inset: 6.4%; border-radius: 50%;
              background: linear-gradient(145deg, #e6e6e6, #f8f8f8);
              box-shadow: 
                inset 4px 4px 10px rgba(0,0,0,0.15),
                inset -4px -4px 10px rgba(255,255,255,0.9),
                inset 1px 1px 3px rgba(0,0,0,0.1);
              border: 1px solid rgba(0,0,0,0.05);
          }
          svg {
              position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
              transform: rotate(135deg);
          }
          .knob-handle {
              position: absolute; width: 56%; height: 56%; border-radius: 50%;
              background: linear-gradient(145deg, #ffffff, #e8e8e8);
              box-shadow: 
                8px 8px 20px rgba(0,0,0,0.12),
                -6px -6px 16px rgba(255,255,255,0.9),
                inset 1px 1px 2px rgba(255,255,255,0.8),
                inset -1px -1px 2px rgba(0,0,0,0.05);
              border: 1px solid rgba(255,255,255,0.8);
              display: flex; justify-content: center; align-items: center; cursor: pointer;
              overflow: hidden;
          }
          /* Dünne erhabene Linie am Knob-Rand */
          .knob-handle::before {
              content: '';
              position: absolute;
              inset: 4%;
              border-radius: 50%;
              background: transparent;
              box-shadow: 
                inset 2px 2px 4px rgba(0, 0, 0, 0.08),
                inset -1px -1px 3px rgba(255, 255, 255, 0.9);
              pointer-events: none;
          }
          .indicator {
              position: absolute; top: 12px; width: 8px; height: 8px; border-radius: 50%;
              background: linear-gradient(145deg, ${this.config.color}DD, ${this.config.color});
              box-shadow: 
                inset 1px 1px 2px rgba(255, 255, 255, 0.4),
                inset -1px -1px 2px rgba(0, 0, 0, 0.2),
                0 0 6px ${this.config.color}88;
          }
          .temp-display { text-align: center; overflow: hidden; width: 100%; position: relative; z-index: 2; }
          .temp-val { font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1; min-width: 0; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .temp-label { font-size: 9px; text-transform: uppercase; color: rgba(0,0,0,0.4); letter-spacing: 1px; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .sensor-row { display: flex; justify-content: center; gap: 8px; margin-top: 4px; font-size: 11px; color: rgba(0,0,0,0.5); }
          .indicator { z-index: 3; }
        </style>
        <div class="compact-wrapper">
          <div class="knob-container" id="knob-container">
              <div class="inlet-track"></div>
              <svg viewBox="0 0 200 200">
                  <defs>
                     <linearGradient id="grad1-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="0%">
                       <stop offset="0%" style="stop-color:${this.config.color};stop-opacity:0.5" />
                       <stop offset="100%" style="stop-color:${this.config.color};stop-opacity:1" />
                     </linearGradient>
                     <!-- Inset/Vertieft Filter für die orange Linie -->
                     <filter id="inset-arc-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')}" x="-20%" y="-20%" width="140%" height="140%">
                       <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/>
                       <feOffset in="blur" dx="1" dy="1" result="offsetBlur"/>
                       <feFlood flood-color="rgba(0,0,0,0.4)" result="color"/>
                       <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
                       <feComposite in="shadow" in2="SourceAlpha" operator="in" result="innerShadow"/>
                       <feMerge>
                         <feMergeNode in="SourceGraphic"/>
                         <feMergeNode in="innerShadow"/>
                       </feMerge>
                     </filter>
                  </defs>
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="16" stroke-dasharray="${strokeDashArray}" stroke-linecap="round" />
                  <circle id="active-arc" cx="100" cy="100" r="80" fill="none" stroke="url(#grad1-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')})" stroke-width="14" 
                          stroke-dasharray="${strokeDashArray}" 
                          stroke-dashoffset="${dashOffset}" 
                          stroke-linecap="round"
                          filter="url(#inset-arc-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')})" />
              </svg>
              <div class="knob-handle" id="knob-handle" style="transform: rotate(${rotation}deg)">
                  <div class="indicator"></div>
                  <div class="temp-display" id="temp-text" style="transform: rotate(${-rotation}deg)">
                      <div class="temp-val">${this._targetTemp.toFixed(1)}°</div>
                      <div class="temp-label">TARGET</div>
                      <div class="sensor-row">
                          <span>${this._currentTemp.toFixed(1)}°C</span>
                          ${this._humidity !== null ? `<span>${this._humidity.toFixed(0)}%</span>` : ''}
                      </div>
                  </div>
              </div>
          </div>
        </div>
      `;
      
      this.setupListeners();
      return;
    }

    // Normal Mode with card wrapper
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.6);
          border-top: 1px solid rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid rgba(0, 0, 0, 0.15);
          box-shadow: 
            0 10px 30px -5px rgba(0, 0, 0, 0.15),
            0 4px 10px rgba(0,0,0,0.08),
            inset 0 1px 1px rgba(255,255,255,0.9);
          padding: 20px;
          color: #1a1a1a;
          user-select: none;
          overflow: hidden;
          box-sizing: border-box;
        }
        .header {
            display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
        }
        .icon-box {
            width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
            background: rgba(0, 0, 0, 0.05); color: rgba(0, 0, 0, 0.4);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            flex-shrink: 0;
            transition: all 0.3s ease;
        }
        .icon-box ha-icon {
            width: 22px; height: 22px; --mdc-icon-size: 22px;
        }
        .icon-box.active.heat {
            background: rgba(251, 146, 60, 0.15); color: #fb923c;
            filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.4));
        }
        .icon-box.active.auto {
            background: rgba(74, 222, 128, 0.15); color: #4ade80;
            filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.4));
        }
        .icon-box.active.cool {
            background: rgba(96, 165, 250, 0.15); color: #60a5fa;
            filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.4));
        }
        .icon-box.active.off {
            background: rgba(0, 0, 0, 0.05); color: rgba(0, 0, 0, 0.4);
            filter: none;
        }

        .title-area { flex: 1; min-width: 0; overflow: hidden; }
        .title { font-size: 1.125rem; font-weight: 700; color: #1a1a1a; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .subtitle { font-size: 0.75rem; font-weight: 500; color: #666; line-height: 1.2; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .status-badge {
            padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase;
            background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.05);
        }
        .status-badge.heat { background: rgba(251, 146, 60, 0.1); color: #fb923c; }
        .status-badge.auto { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
        .status-badge.cool { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        
        .knob-container {
            position: relative; width: 100%; max-width: 250px; min-width: 0; aspect-ratio: 1 / 1; margin: 0 auto 24px auto;
            display: flex; justify-content: center; align-items: center;
            overflow: hidden;
        }
        .inlet-track {
            position: absolute; inset: 6.4%; border-radius: 50%;
            background: linear-gradient(145deg, #e6e6e6, #f8f8f8);
            box-shadow: 
              inset 4px 4px 10px rgba(0,0,0,0.15),
              inset -4px -4px 10px rgba(255,255,255,0.9),
              inset 1px 1px 3px rgba(0,0,0,0.1);
            border: 1px solid rgba(0,0,0,0.05);
        }
        svg {
            position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
            transform: rotate(135deg);
        }
        .knob-handle {
            position: absolute; width: 56%; height: 56%; border-radius: 50%;
            background: linear-gradient(145deg, #ffffff, #e8e8e8);
            box-shadow: 
              8px 8px 20px rgba(0,0,0,0.12),
              -6px -6px 16px rgba(255,255,255,0.9),
              inset 1px 1px 2px rgba(255,255,255,0.8),
              inset -1px -1px 2px rgba(0,0,0,0.05);
            border: 1px solid rgba(255,255,255,0.8);
            display: flex; justify-content: center; align-items: center; cursor: pointer;
            overflow: hidden;
        }
        /* Dünne erhabene Linie am Knob-Rand */
        .knob-handle::before {
            content: '';
            position: absolute;
            inset: 4%;
            border-radius: 50%;
            background: transparent;
            box-shadow: 
              inset 2px 2px 4px rgba(0, 0, 0, 0.08),
              inset -1px -1px 3px rgba(255, 255, 255, 0.9);
            pointer-events: none;
        }
        .indicator {
            position: absolute; top: 12px; width: 8px; height: 8px; border-radius: 50%;
            background: linear-gradient(145deg, ${this.config.color}DD, ${this.config.color});
            box-shadow: 
              inset 1px 1px 2px rgba(255, 255, 255, 0.4),
              inset -1px -1px 2px rgba(0, 0, 0, 0.2),
              0 0 6px ${this.config.color}88;
        }
        .temp-display { text-align: center; overflow: hidden; width: 100%; }
        /* Explicitly set font size and avoid layout shift */
        .temp-val { font-size: 36px; font-weight: 700; color: #1a1a1a; line-height: 1; min-width: 0; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .temp-label { font-size: 10px; text-transform: uppercase; color: rgba(0,0,0,0.4); letter-spacing: 1px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .current-temp { font-size: 12px; color: rgba(0,0,0,0.5); margin-top: 2px; }
        
        .controls {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
        }
        .mode-btn {
            height: 48px; border-radius: 12px; 
            background: linear-gradient(145deg, #f0f0f0, #ffffff);
            border: 1px solid rgba(255,255,255,0.8);
            box-shadow: 
              3px 3px 8px rgba(0,0,0,0.08),
              -3px -3px 8px rgba(255,255,255,0.9);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; color: rgba(0,0,0,0.6);
            overflow: hidden; min-width: 0;
        }
        .mode-btn:active, .mode-btn.active {
            background: linear-gradient(145deg, #e6e6e6, #f0f0f0);
            box-shadow: 
              inset 3px 3px 8px rgba(0,0,0,0.12),
              inset -2px -2px 6px rgba(255,255,255,0.8);
            border: 1px solid rgba(0,0,0,0.08);
            transform: scale(0.98);
        }
        .mode-btn.active.heat { color: #fb923c; }
        .mode-btn.active.auto { color: #4ade80; }
        .mode-btn.active.off { color: #ef5350; }
        
        ha-icon { --mdc-icon-size: 20px; }
        .btn-label { font-size: 9px; font-weight: 700; text-transform: uppercase; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }

      </style>
      <div class="card">
        <div class="header">
            <div class="icon-box ${iconClass}">
                <ha-icon icon="${this.config.icon}"></ha-icon>
            </div>
            <div class="title-area">
                <div class="title">${this.config.name || 'Heizung'}</div>
                <div class="subtitle">${this._currentTemp.toFixed(1)} °C${this._humidity !== null ? ` · ${this._humidity.toFixed(0)}%` : ''}</div>
            </div>
        </div>
        
        <div class="knob-container" id="knob-container">
            <div class="inlet-track"></div>
            <svg viewBox="0 0 200 200">
                <defs>
                   <linearGradient id="grad1-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" style="stop-color:${this.config.color};stop-opacity:0.5" />
                     <stop offset="100%" style="stop-color:${this.config.color};stop-opacity:1" />
                   </linearGradient>
                   <!-- Inset/Vertieft Filter für die orange Linie -->
                   <filter id="inset-arc-n-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')}" x="-20%" y="-20%" width="140%" height="140%">
                     <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/>
                     <feOffset in="blur" dx="1" dy="1" result="offsetBlur"/>
                     <feFlood flood-color="rgba(0,0,0,0.4)" result="color"/>
                     <feComposite in="color" in2="offsetBlur" operator="in" result="shadow"/>
                     <feComposite in="shadow" in2="SourceAlpha" operator="in" result="innerShadow"/>
                     <feMerge>
                       <feMergeNode in="SourceGraphic"/>
                       <feMergeNode in="innerShadow"/>
                     </feMerge>
                   </filter>
                </defs>
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="16" stroke-dasharray="${strokeDashArray}" stroke-linecap="round" />
                <circle id="active-arc" cx="100" cy="100" r="80" fill="none" stroke="url(#grad1-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')})" stroke-width="14" 
                        stroke-dasharray="${strokeDashArray}" 
                        stroke-dashoffset="${dashOffset}" 
                        stroke-linecap="round"
                        filter="url(#inset-arc-n-${this.config.entity.replace(/[^a-zA-Z0-9]/g, '')})" />
            </svg>
            <div class="knob-handle" id="knob-handle" style="transform: rotate(${rotation}deg)">
                <div class="indicator"></div>
                <div class="temp-display" id="temp-text" style="transform: rotate(${-rotation}deg)">
                    <div class="temp-val">${this._targetTemp.toFixed(1)}°</div>
                    <div class="temp-label">TARGET</div>
                </div>
            </div>
        </div>

        <div class="controls">
            <div class="mode-btn ${this._state === 'off' ? 'active off' : ''}" data-mode="off">
                <ha-icon icon="mdi:power"></ha-icon>
                <span class="btn-label">Off</span>
            </div>
            <div class="mode-btn ${this._state === 'heat' ? 'active heat' : ''}" data-mode="heat">
                <ha-icon icon="mdi:fire"></ha-icon>
                <span class="btn-label">Manuell</span>
            </div>
            <div class="mode-btn ${this._state === 'auto' ? 'active auto' : ''}" data-mode="auto">
                <ha-icon icon="mdi:calendar-sync"></ha-icon>
                <span class="btn-label">Auto</span>
            </div>
        </div>
      </div>
    `;
    
    // Re-attach listeners after render because innerHTML wiped them
    this.setupListeners();
  }
}

// Define Editor FIRST so it's available when getConfigElement() is called
class PrismHeatLightCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    console.log('[PrismHeatCardEditor] setConfig() called with:', config);
    const oldConfig = this._config;
    // Create a copy to avoid modifying read-only config object
    this._config = { ...(config || {}) };
    
    // Only render if structure doesn't exist yet, otherwise just update values
    if (this._hass) {
      if (!this.querySelector('ha-entity-picker')) {
        this.render();
      } else {
        this.updateValues();
      }
    }
  }

  configChanged(newConfig) {
    const event = new CustomEvent("config-changed", {
      bubbles: true,
      composed: true,
      cancelable: false,
      detail: { config: newConfig }
    });
    this.dispatchEvent(event);
  }

  set hass(hass) {
    console.log('[PrismHeatCardEditor] hass set');
    this._hass = hass;
    if (this._config && !this.querySelector('ha-entity-picker')) {
      this.render();
    } else if (this._hass && this.querySelector('ha-entity-picker')) {
      // Update hass on existing elements
      const picker = this.querySelector('ha-entity-picker');
      if (picker) {
        picker.hass = this._hass;
      }
    }
  }

  connectedCallback() {
    console.log('[PrismHeatCardEditor] connectedCallback() called');
    if (!this._config) {
      this._config = {};
    }
    // Render immediately when connected if not already rendered
    if (this._hass && !this.querySelector('ha-entity-picker')) {
      this.render();
    }
  }

  updateValues() {
    // Update values without re-rendering the entire structure
    const picker = this.querySelector('ha-entity-picker');
    if (picker && picker.value !== (this._config?.entity || '')) {
      picker.value = this._config?.entity || '';
    }

    const nameField = this.querySelector('ha-textfield[label="Name (Optional)"]');
    if (nameField && nameField.value !== (this._config?.name || '')) {
      nameField.value = this._config?.name || '';
    }

    const colorField = this.querySelector('ha-textfield[label="Ring Color (Hex, e.g. #fb923c)"]');
    const colorPicker = this.querySelector('input[type="color"]');
    if (colorField && colorPicker) {
      const currentColor = this._config?.color || '#fb923c';
      if (colorField.value !== currentColor) {
        colorField.value = currentColor;
      }
      if (colorPicker.value !== currentColor) {
        colorPicker.value = currentColor;
      }
    }
  }

  render() {
    if (!this._hass) {
      console.log('[PrismHeatCardEditor] render() called but no hass yet');
      return;
    }

    console.log('[PrismHeatCardEditor] render() called with config:', this._config);

    // Always recreate to ensure proper initialization
    this.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px;">
        <ha-entity-picker
          label="Entity (Climate)"
          allow-custom-entity
          style="display: block; width: 100%;"
        ></ha-entity-picker>
        <ha-textfield
          label="Name (Optional)"
          style="display: block; width: 100%;"
        ></ha-textfield>
        <div style="display: flex; align-items: center; gap: 12px;">
          <ha-textfield
            label="Ring Color (Hex, e.g. #fb923c)"
            style="flex: 1; display: block;"
          ></ha-textfield>
          <input
            type="color"
            style="width: 60px; height: 56px; border-radius: 4px; border: 1px solid var(--divider-color); cursor: pointer; flex-shrink: 0;"
          />
        </div>
      </div>
    `;

    // Set properties and add listeners after DOM is ready
    // Use setTimeout instead of requestAnimationFrame for better compatibility
    setTimeout(() => {
      const picker = this.querySelector('ha-entity-picker');
      if (picker) {
        console.log('[PrismHeatCardEditor] Setting up entity picker');
        console.log('[PrismHeatCardEditor] Picker element:', picker);
        console.log('[PrismHeatCardEditor] Picker computed style:', window.getComputedStyle(picker));
        
        // Set hass first, then other properties
        picker.hass = this._hass;
        picker.includeDomains = ['climate'];
        picker.value = this._config?.entity || '';
        
        // Make sure it's visible
        picker.style.display = 'block';
        picker.style.width = '100%';
        picker.style.visibility = 'visible';
        picker.style.opacity = '1';
        
        // Force update
        if (picker.requestUpdate) {
          picker.requestUpdate();
        }
        if (picker.updateComplete) {
          picker.updateComplete.then(() => {
            console.log('[PrismHeatCardEditor] Entity picker update complete');
          });
        }
        
        // Remove old listener if exists
        if (this._pickerHandler) {
          picker.removeEventListener('value-changed', this._pickerHandler);
        }
        this._pickerHandler = (e) => {
          console.log('[PrismHeatCardEditor] Entity changed:', e.detail.value);
          const newConfig = { ...this._config, entity: e.detail.value };
          this._config = newConfig; // Update local config
          this.configChanged(newConfig);
        };
        picker.addEventListener('value-changed', this._pickerHandler);
        console.log('[PrismHeatCardEditor] Entity picker initialized with value:', picker.value);
        console.log('[PrismHeatCardEditor] Entity picker parent:', picker.parentElement);
      } else {
        console.error('[PrismHeatCardEditor] Entity picker not found in DOM!');
      }

      const nameField = this.querySelector('ha-textfield[label="Name (Optional)"]');
      if (nameField) {
        console.log('[PrismHeatCardEditor] Setting up name field');
        nameField.value = this._config?.name || '';
        // Remove old listener if exists
        if (this._nameFieldHandler) {
          nameField.removeEventListener('input', this._nameFieldHandler);
        }
        this._nameFieldHandler = (e) => {
          console.log('[PrismHeatCardEditor] Name changed:', e.target.value);
          const newConfig = { ...this._config, name: e.target.value };
          this._config = newConfig; // Update local config
          this.configChanged(newConfig);
        };
        nameField.addEventListener('input', this._nameFieldHandler);
      } else {
        console.error('[PrismHeatCardEditor] Name field not found!');
      }

      const colorField = this.querySelector('ha-textfield[label="Ring Color (Hex, e.g. #fb923c)"]');
      const colorPicker = this.querySelector('input[type="color"]');
      if (colorField && colorPicker) {
        console.log('[PrismHeatCardEditor] Setting up color fields');
        const currentColor = this._config?.color || '#fb923c';
        colorField.value = currentColor;
        colorPicker.value = currentColor;
        
        // Sync color picker to text field
        if (this._colorFieldHandler) {
          colorField.removeEventListener('input', this._colorFieldHandler);
        }
        this._colorFieldHandler = (e) => {
          const newColor = e.target.value;
          console.log('[PrismHeatCardEditor] Color changed (text):', newColor);
          colorPicker.value = newColor;
          const newConfig = { ...this._config, color: newColor };
          this._config = newConfig; // Update local config
          this.configChanged(newConfig);
        };
        colorField.addEventListener('input', this._colorFieldHandler);
        
        // Sync text field to color picker
        if (this._colorPickerHandler) {
          colorPicker.removeEventListener('input', this._colorPickerHandler);
        }
        this._colorPickerHandler = (e) => {
          const newColor = e.target.value;
          console.log('[PrismHeatCardEditor] Color changed (picker):', newColor);
          colorField.value = newColor;
          const newConfig = { ...this._config, color: newColor };
          this._config = newConfig; // Update local config
          this.configChanged(newConfig);
        };
        colorPicker.addEventListener('input', this._colorPickerHandler);
      } else {
        console.error('[PrismHeatCardEditor] Color fields not found!');
      }
    }, 0);
  }
}

// Register Editor first
customElements.define("prism-heat-light-editor", PrismHeatLightCardEditor);

// Then register the card
customElements.define('prism-heat-light', PrismHeatLightCard);

// Register with customCards
window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-heat-light",
  name: "Prism Heat Light",
  preview: true,
  description: "A custom thermostat knob card (light theme)"
});

})();

// ============================================
// prism-heat-small.js
// ============================================
(function() {
class PrismHeatSmallCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static getStubConfig() {
    return { entity: "climate.example", name: "Heizung", icon: "mdi:fire" }
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "climate" } }
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
          name: "temperature_entity",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "humidity_entity",
          selector: { entity: { domain: "sensor" } }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    this.config = { ...config };
    // Set default icon
    if (!this.config.icon) {
      this.config.icon = "mdi:fire";
    }
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config && this.config.entity) {
      const entity = hass.states[this.config.entity];
      this._entity = entity || null;
      
      // Get temperature from external entity if configured, with fallback to 20
      this._currentTemp = (entity && entity.attributes && entity.attributes.current_temperature !== undefined) 
        ? entity.attributes.current_temperature 
        : 20;
      if (this.config.temperature_entity) {
        const tempEntity = hass.states[this.config.temperature_entity];
        if (tempEntity && tempEntity.state && !isNaN(parseFloat(tempEntity.state))) {
          this._currentTemp = parseFloat(tempEntity.state);
        }
      }
      
      // Get humidity if configured
      this._humidity = null;
      if (this.config.humidity_entity) {
        const humidityEntity = hass.states[this.config.humidity_entity];
        if (humidityEntity && humidityEntity.state && !isNaN(parseFloat(humidityEntity.state))) {
          this._humidity = parseFloat(humidityEntity.state);
        }
      }
      
      this.render();
    }
  }

  getCardSize() {
    return 2;
  }

  connectedCallback() {
    if (this.config) {
      this.render();
      this.setupListeners();
    }
  }

  setupListeners() {
    this.shadowRoot.querySelectorAll('.control-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.changeTemp(action);
      });
    });
  }

  changeTemp(action) {
    if (!this._hass || !this.config.entity) return;
    
    const currentTarget = this._entity ? (this._entity.attributes.temperature || 20) : 20;
    const step = 0.5;
    let newTemp = currentTarget;

    if (action === 'plus') newTemp += step;
    if (action === 'minus') newTemp -= step;

    // Service call
    this._hass.callService('climate', 'set_temperature', {
      entity_id: this.config.entity,
      temperature: newTemp
    });
  }

  formatTemp(temp) {
      return temp.toFixed(1).replace('.', ',');
  }

  render() {
    if (!this.config || !this.config.entity) return;
    
    const attr = this._entity ? this._entity.attributes : {};
    const state = this._entity ? this._entity.state : 'off';
    const targetTemp = attr.temperature !== undefined ? attr.temperature : 20;
    const currentTemp = this._currentTemp !== undefined ? this._currentTemp : (attr.current_temperature !== undefined ? attr.current_temperature : 20);
    const name = this.config.name || (this._entity ? attr.friendly_name : null) || 'Heizung';
    
    const isHeating = state === 'heat' || state === 'heating';
    const hvacMode = state === 'off' ? 'Aus' : (state === 'auto' ? 'Auto' : 'Heizen');
    
    // Status Text with optional humidity
    const humidityText = (this._humidity !== null && this._humidity !== undefined) ? ` · ${this._humidity.toFixed(0)}%` : '';
    const statusText = `${this.formatTemp(currentTemp)} °C${humidityText}`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          background: rgba(30, 32, 36, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3);
          padding: 16px;
          color: white;
          user-select: none;
          box-sizing: border-box;
        }
        
        /* Header */
        .header {
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 16px;
        }
        .header-left { 
            display: flex; 
            align-items: center; 
            gap: 12px; 
        }
        
        .icon-box {
            width: 40px; 
            height: 40px; 
            min-width: 40px;
            min-height: 40px;
            border-radius: 50%;
            background: ${isHeating 
                ? 'linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1))' 
                : 'linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1))'}; 
            color: ${isHeating ? '#fb923c' : 'rgba(255,255,255,0.4)'};
            display: flex; 
            align-items: center; 
            justify-content: center;
            box-shadow: ${isHeating 
                ? 'inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03)' 
                : '4px 4px 10px rgba(0, 0, 0, 0.5), -2px -2px 6px rgba(255, 255, 255, 0.03), inset 0 1px 2px rgba(255, 255, 255, 0.05)'};
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.5s ease;
        }
        .icon-box ha-icon {
            width: 22px;
            height: 22px;
            --mdc-icon-size: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 0;
            ${isHeating ? 'filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.6));' : ''}
        }
        
        .info { 
            display: flex; 
            flex-direction: column; 
            justify-content: center;
        }
        .title { 
            font-size: 1.125rem; 
            font-weight: 700; 
            color: rgba(255, 255, 255, 0.9); 
            line-height: 1; 
        }
        .subtitle { 
            font-size: 0.75rem; 
            font-weight: 500; 
            color: rgba(255, 255, 255, 0.6); 
            margin-top: 4px; 
            display: flex; 
            gap: 6px;
        }
        
        /* Chip */
        .chip {
            padding: 6px 10px; 
            border-radius: 20px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.05);
            display: flex; 
            align-items: center; 
            justify-content: center;
            gap: 6px;
            height: 28px;
            box-sizing: border-box;
        }
        .chip ha-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            --mdc-icon-size: 12px;
            line-height: 0;
            color: #fb923c;
        }
        .chip-text { 
            font-size: 10px; 
            font-weight: 600; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            color: rgba(255,255,255,0.7); 
            line-height: 1;
        }
        
        /* Controls */
        .controls {
            display: flex; align-items: center; gap: 12px;
        }
        
        .control-btn {
            position: relative;
            height: 38px; width: 50px; border-radius: 12px;
            background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
            border: 1px solid rgba(255,255,255,0.05);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; color: rgba(255,255,255,0.7);
            box-shadow: 
              4px 4px 10px rgba(0,0,0,0.5),
              -2px -2px 6px rgba(255,255,255,0.03),
              inset 0 1px 2px rgba(255,255,255,0.05);
            overflow: hidden;
        }
        .control-btn:hover {
            background: linear-gradient(145deg, rgba(40, 43, 50, 1), rgba(32, 34, 40, 1));
            color: #fb923c;
        }
        .control-btn:hover ha-icon {
            filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.5));
        }
        .control-btn:active {
            background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
            box-shadow: 
              inset 3px 3px 8px rgba(0,0,0,0.7), 
              inset -2px -2px 4px rgba(255,255,255,0.03);
            transform: scale(0.97);
        }
        .control-btn ha-icon {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            --mdc-icon-size: 20px;
            line-height: 0;
        }
        
        .inlet-display {
            flex: 1; height: 38px; border-radius: 12px;
            background: rgba(20, 20, 20, 0.8);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            border-top: 1px solid rgba(0,0,0,0.4);
            display: flex; align-items: center; justify-content: center;
        }
        .temp-value {
            font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.9); font-family: monospace; letter-spacing: 1px;
        }

      </style>
      <div class="card">
        
        <div class="header">
            <div class="header-left">
                <div class="icon-box">
                    <ha-icon icon="${this.config.icon}"></ha-icon>
                </div>
                <div class="info">
                    <div class="title">${name}</div>
                    <div class="subtitle">${statusText}</div>
                </div>
            </div>
            
            <div class="chip">
                <ha-icon icon="mdi:thermometer"></ha-icon>
                <div class="chip-text">${hvacMode}</div>
            </div>
        </div>
        
        <div class="controls">
            <div class="control-btn" data-action="minus">
                <ha-icon icon="mdi:minus"></ha-icon>
            </div>
            
            <div class="inlet-display">
                <div class="temp-value">${this.formatTemp(targetTemp)}</div>
            </div>
            
            <div class="control-btn" data-action="plus">
                <ha-icon icon="mdi:plus"></ha-icon>
            </div>
        </div>

      </div>
    `;
    
    this.setupListeners();
  }
}

customElements.define('prism-heat-small', PrismHeatSmallCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-heat-small",
  name: "Prism Heat Small",
  preview: true,
  description: "A compact heating card with inlet controls"
});

})();

// ============================================
// prism-heat-small-light.js
// ============================================
(function() {
class PrismHeatSmallLightCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static getStubConfig() {
    return { entity: "climate.example", name: "Heizung", icon: "mdi:fire" }
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "climate" } }
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
          name: "temperature_entity",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "humidity_entity",
          selector: { entity: { domain: "sensor" } }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    this.config = { ...config };
    // Set default icon
    if (!this.config.icon) {
      this.config.icon = "mdi:fire";
    }
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config && this.config.entity) {
      const entity = hass.states[this.config.entity];
      this._entity = entity || null;
      
      // Get temperature from external entity if configured, with fallback to 20
      this._currentTemp = (entity && entity.attributes && entity.attributes.current_temperature !== undefined) 
        ? entity.attributes.current_temperature 
        : 20;
      if (this.config.temperature_entity) {
        const tempEntity = hass.states[this.config.temperature_entity];
        if (tempEntity && tempEntity.state && !isNaN(parseFloat(tempEntity.state))) {
          this._currentTemp = parseFloat(tempEntity.state);
        }
      }
      
      // Get humidity if configured
      this._humidity = null;
      if (this.config.humidity_entity) {
        const humidityEntity = hass.states[this.config.humidity_entity];
        if (humidityEntity && humidityEntity.state && !isNaN(parseFloat(humidityEntity.state))) {
          this._humidity = parseFloat(humidityEntity.state);
        }
      }
      
      this.render();
    }
  }

  getCardSize() {
    return 2;
  }

  connectedCallback() {
    if (this.config) {
      this.render();
      this.setupListeners();
    }
  }

  setupListeners() {
    this.shadowRoot.querySelectorAll('.control-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.changeTemp(action);
      });
    });
  }

  changeTemp(action) {
    if (!this._hass || !this.config.entity) return;
    
    const currentTarget = this._entity ? (this._entity.attributes.temperature || 20) : 20;
    const step = 0.5;
    let newTemp = currentTarget;

    if (action === 'plus') newTemp += step;
    if (action === 'minus') newTemp -= step;

    // Service call
    this._hass.callService('climate', 'set_temperature', {
      entity_id: this.config.entity,
      temperature: newTemp
    });
  }

  formatTemp(temp) {
      return temp.toFixed(1).replace('.', ',');
  }

  render() {
    if (!this.config || !this.config.entity) return;
    
    const attr = this._entity ? this._entity.attributes : {};
    const state = this._entity ? this._entity.state : 'off';
    const targetTemp = attr.temperature !== undefined ? attr.temperature : 20;
    const currentTemp = this._currentTemp !== undefined ? this._currentTemp : (attr.current_temperature !== undefined ? attr.current_temperature : 20);
    const name = this.config.name || (this._entity ? attr.friendly_name : null) || 'Heizung';
    
    const isHeating = state === 'heat' || state === 'heating';
    const hvacMode = state === 'off' ? 'Aus' : (state === 'auto' ? 'Auto' : 'Heizen');
    
    // Status Text with optional humidity
    const humidityText = (this._humidity !== null && this._humidity !== undefined) ? ` · ${this._humidity.toFixed(0)}%` : '';
    const statusText = `${this.formatTemp(currentTemp)} °C${humidityText}`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.6);
          border-top: 1px solid rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid rgba(0, 0, 0, 0.15);
          box-shadow: 
            0 10px 30px -5px rgba(0, 0, 0, 0.15),
            0 4px 10px rgba(0,0,0,0.08),
            inset 0 1px 1px rgba(255,255,255,0.9);
          padding: 16px;
          color: #1a1a1a;
          user-select: none;
          box-sizing: border-box;
        }
        
        /* Header */
        .header {
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 16px;
        }
        .header-left { 
            display: flex; 
            align-items: center; 
            gap: 12px; 
        }
        
        .icon-box {
            width: 40px; 
            height: 40px; 
            min-width: 40px;
            min-height: 40px;
            border-radius: 50%;
            background: ${isHeating ? 'rgba(249, 115, 22, 0.15)' : 'rgba(0,0,0,0.05)'}; 
            color: ${isHeating ? '#fb923c' : 'rgba(0,0,0,0.4)'};
            display: flex; 
            align-items: center; 
            justify-content: center;
            box-shadow: ${isHeating ? '0 0 15px rgba(249,115,22,0.2)' : 'none'};
            transition: all 0.5s ease;
            ${isHeating ? 'filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.4));' : ''}
        }
        .icon-box ha-icon {
            width: 22px;
            height: 22px;
            --mdc-icon-size: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 0;
        }
        
        .info { 
            display: flex; 
            flex-direction: column; 
            justify-content: center;
        }
        .title { 
            font-size: 1.125rem; 
            font-weight: 700; 
            color: #1a1a1a; 
            line-height: 1; 
        }
        .subtitle { 
            font-size: 0.75rem; 
            font-weight: 500; 
            color: #666; 
            margin-top: 4px; 
            display: flex; 
            gap: 6px;
        }
        
        /* Chip */
        .chip {
            padding: 6px 10px; 
            border-radius: 20px;
            background: linear-gradient(145deg, #f0f0f0, #ffffff);
            border: 1px solid rgba(255,255,255,0.8);
            box-shadow: 
              2px 2px 5px rgba(0,0,0,0.08),
              -2px -2px 5px rgba(255,255,255,0.9);
            display: flex; 
            align-items: center; 
            justify-content: center;
            gap: 6px;
            height: 28px;
            box-sizing: border-box;
        }
        .chip ha-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            --mdc-icon-size: 12px;
            line-height: 0;
            color: #fb923c;
        }
        .chip-text { 
            font-size: 10px; 
            font-weight: 600; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            color: rgba(0,0,0,0.7); 
            line-height: 1;
        }
        
        /* Controls */
        .controls {
            display: flex; align-items: center; gap: 12px;
        }
        
        .control-btn {
            position: relative;
            height: 38px; width: 50px; border-radius: 12px;
            background: linear-gradient(145deg, #ffffff, #e8e8e8);
            border: 1px solid rgba(255,255,255,0.9);
            border-top: 1px solid rgba(255,255,255,1);
            border-bottom: 1px solid rgba(0,0,0,0.08);
            box-shadow: 
              4px 4px 10px rgba(0,0,0,0.1),
              -3px -3px 8px rgba(255,255,255,0.95),
              inset 0 1px 2px rgba(255,255,255,0.9);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; color: rgba(0,0,0,0.7);
            overflow: hidden;
        }
        /* Erhabene 3D Linie */
        .control-btn::before {
            content: '';
            position: absolute;
            inset: 3px;
            border-radius: 9px;
            background: transparent;
            box-shadow: 
              inset 1px 1px 3px rgba(0, 0, 0, 0.06),
              inset -1px -1px 2px rgba(255, 255, 255, 0.9);
            pointer-events: none;
        }
        .control-btn:active {
            background: linear-gradient(145deg, #e6e6e6, #f0f0f0);
            box-shadow: 
              inset 3px 3px 8px rgba(0,0,0,0.12),
              inset -2px -2px 6px rgba(255,255,255,0.8);
            border: 1px solid rgba(0,0,0,0.08);
            transform: scale(0.97);
        }
        .control-btn:active::before {
            box-shadow: none;
        }
        .control-btn ha-icon {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            --mdc-icon-size: 20px;
            line-height: 0;
        }
        
        .inlet-display {
            flex: 1; height: 38px; border-radius: 12px;
            background: linear-gradient(145deg, #e6e6e6, #f8f8f8);
            box-shadow: 
              inset 3px 3px 8px rgba(0,0,0,0.12),
              inset -3px -3px 8px rgba(255,255,255,0.9);
            border: 1px solid rgba(0,0,0,0.05);
            display: flex; align-items: center; justify-content: center;
        }
        .temp-value {
            font-size: 20px; font-weight: 700; color: rgba(0,0,0,0.9); font-family: monospace; letter-spacing: 1px;
        }

      </style>
      <div class="card">
        
        <div class="header">
            <div class="header-left">
                <div class="icon-box">
                    <ha-icon icon="${this.config.icon}"></ha-icon>
                </div>
                <div class="info">
                    <div class="title">${name}</div>
                    <div class="subtitle">${statusText}</div>
                </div>
            </div>
            
            <div class="chip">
                <ha-icon icon="mdi:thermometer"></ha-icon>
                <div class="chip-text">${hvacMode}</div>
            </div>
        </div>
        
        <div class="controls">
            <div class="control-btn" data-action="minus">
                <ha-icon icon="mdi:minus"></ha-icon>
            </div>
            
            <div class="inlet-display">
                <div class="temp-value">${this.formatTemp(targetTemp)}</div>
            </div>
            
            <div class="control-btn" data-action="plus">
                <ha-icon icon="mdi:plus"></ha-icon>
            </div>
        </div>

      </div>
    `;
    
    this.setupListeners();
  }
}

customElements.define('prism-heat-small-light', PrismHeatSmallLightCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-heat-small-light",
  name: "Prism Heat Small Light",
  preview: true,
  description: "A compact heating card with inlet controls (light theme)"
});

})();

// ============================================
// prism-media.js
// ============================================
(function() {
class PrismMediaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._dragging = false;
  }

  static getStubConfig() {
    return { entity: "media_player.example", playing_color: "#60a5fa" }
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "media_player" } }
        },
        {
          name: "playing_color",
          selector: { color_rgb: {} }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    // Create a copy to avoid modifying read-only config object
    this.config = { ...config };
    // Normalize playing_color (convert RGB arrays to hex if needed)
    if (this.config.playing_color) {
      this.config.playing_color = this._normalizeColor(this.config.playing_color);
    } else {
      this.config.playing_color = "#60a5fa";
    }
    this.render();
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
    if (this.config && this.config.entity) {
      const entity = hass.states[this.config.entity];
      this._entity = entity || null;
      this.render();
    }
  }

  getCardSize() {
    return 2;
  }

  connectedCallback() {
    if (this.config) {
      this.render();
      this.setupListeners();
    }
  }

  setupListeners() {
    const slider = this.shadowRoot.querySelector('#volume-slider');
    if (slider) {
        slider.addEventListener('mousedown', this.startDrag.bind(this));
        slider.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
    }
    
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));
    
    document.addEventListener('touchmove', this.onDrag.bind(this), { passive: false });
    document.addEventListener('touchend', this.stopDrag.bind(this));

    // Controls
    this.shadowRoot.querySelectorAll('.media-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.controlMedia(action);
      });
    });
  }

  startDrag(e) {
    this._dragging = true;
    this.onDrag(e);
  }

  stopDrag() {
    this._dragging = false;
  }

  onDrag(e) {
    if (!this._dragging) return;
    e.preventDefault();

    const slider = this.shadowRoot.querySelector('#volume-slider');
    const rect = slider.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let percentage = (clientX - rect.left) / rect.width;
    percentage = Math.min(Math.max(percentage, 0), 1);
    
    // Optimistic update
    const fill = this.shadowRoot.querySelector('#volume-fill');
    if(fill) fill.style.width = `${percentage * 100}%`;

    // Debounce actual service call ideally, but simpler here:
    this.setVolume(percentage);
  }

  setVolume(vol) {
    if (this._hass && this.config.entity) {
      this._hass.callService('media_player', 'volume_set', {
        entity_id: this.config.entity,
        volume_level: vol
      });
    } else {
      this.dispatchEvent(new CustomEvent('hass-service-called', {
        detail: {
          domain: 'media_player',
          service: 'volume_set',
          data: {
            entity_id: this.config.entity,
            volume_level: vol
          }
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  controlMedia(action) {
    if (!this._hass || !this.config.entity) return;
    
    let service = '';
    if (action === 'prev') service = 'media_previous_track';
    if (action === 'next') service = 'media_next_track';
    if (action === 'play_pause') service = 'media_play_pause';
    
    this._hass.callService('media_player', service, {
      entity_id: this.config.entity
    });
  }

  render() {
    // Render preview even if entity doesn't exist
    if (!this.config || !this.config.entity) return;
    
    const attr = this._entity ? this._entity.attributes : {};
    const state = this._entity ? this._entity.state : 'idle';
    
    // Title: try various attributes
    const title = attr.media_title || attr.media_album_name || 'No Media';
    
    // Subtitle: try artist, series, app name, channel, or show state
    let subtitle = '';
    if (attr.media_artist) {
      subtitle = attr.media_artist;
    } else if (attr.media_series_title) {
      subtitle = attr.media_series_title;
      // Add episode info if available
      if (attr.media_season && attr.media_episode) {
        subtitle += ` S${attr.media_season}E${attr.media_episode}`;
      }
    } else if (attr.media_channel) {
      subtitle = attr.media_channel;
    } else if (attr.app_name) {
      // Apple TV and similar devices
      subtitle = attr.app_name;
    } else if (attr.source) {
      subtitle = attr.source;
    } else {
      // Fallback to translated state
      const stateMap = {
        'playing': 'Wiedergabe',
        'paused': 'Pausiert', 
        'idle': 'Bereit',
        'off': 'Aus',
        'standby': 'Standby',
        'buffering': 'Puffern...',
        'on': 'An',
        'unavailable': 'Nicht verfügbar'
      };
      subtitle = stateMap[state] || state;
    }
    
    const art = attr.entity_picture; // This usually returns e.g. /api/media_player_proxy/...
    
    // Volume: handle undefined, null, or 0
    const volLevel = attr.volume_level;
    const vol = (volLevel !== undefined && volLevel !== null) ? volLevel * 100 : 0;
    const hasVolume = volLevel !== undefined && volLevel !== null;
    const isMuted = attr.is_volume_muted === true;
    
    const isPlaying = state === 'playing';
    const isPaused = state === 'paused';
    const isActive = isPlaying || isPaused;
    const playingColor = this.config.playing_color || "#60a5fa";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          position: relative;
          background: rgba(30, 32, 36, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3);
          overflow: hidden;
          color: white;
          user-select: none;
        }
        /* Background Art Blur */
        .bg-art {
            position: absolute; inset: 0; background-size: cover; background-position: center;
            filter: blur(20px); opacity: 0.2; z-index: 0; pointer-events: none;
        }
        
        .content {
            position: relative; z-index: 1; padding: 20px;
            display: flex; gap: 16px; align-items: center;
        }
        
        .art-cover {
            width: 80px; height: 80px; border-radius: 12px; background: rgba(0,0,0,0.3);
            background-size: cover; background-position: center;
            box-shadow: 0 8px 16px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
            flex-shrink: 0;
        }
        
        .info { flex: 1; min-width: 0; }
        .title { font-size: 1.125rem; font-weight: 700; color: rgba(255, 255, 255, 0.9); line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .subtitle-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .subtitle { font-size: 0.75rem; font-weight: 500; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .state-dot {
            width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
            background: ${isPlaying ? playingColor : isPaused ? '#f59e0b' : 'rgba(255,255,255,0.3)'};
            ${isPlaying ? `box-shadow: 0 0 6px ${playingColor};` : ''}
            ${isPlaying ? 'animation: pulse 2s infinite;' : ''}
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .volume-container {
            margin-top: 12px; display: flex; align-items: center; gap: 12px;
        }
        .vol-icon { --mdc-icon-size: 20px; color: rgba(255,255,255,0.5); }
        
        .volume-slider {
            flex: 1; height: 16px; border-radius: 16px;
            background: rgba(20, 20, 20, 0.6);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            border-top: 1px solid rgba(0,0,0,0.4);
            position: relative; overflow: hidden; cursor: pointer;
        }
        .volume-fill {
            position: absolute; top: 0; left: 0; bottom: 0;
            background: rgba(255, 255, 255, 0.8);
            box-shadow: 2px 0 5px rgba(255, 255, 255, 0.4);
            border-radius: 12px; pointer-events: none;
        }
        
        .controls {
            display: flex; align-items: center; justify-content: center; gap: 24px;
            padding: 16px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05);
        }

        .media-btn {
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s;
        }
        
        /* Circle Buttons (Next/Prev) */
        .media-btn.circle {
            width: 42px; height: 42px; border-radius: 50%;
            background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1)); 
            border: 1px solid rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.7);
            box-shadow: 
                4px 4px 10px rgba(0, 0, 0, 0.5),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                inset 0 1px 2px rgba(255, 255, 255, 0.05);
        }
        .media-btn.circle:hover {
            background: linear-gradient(145deg, rgba(40, 43, 50, 1), rgba(32, 34, 40, 1));
            color: #60a5fa;
        }
        .media-btn.circle:hover ha-icon {
            filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.5));
        }
        .media-btn.circle:active {
            background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
            box-shadow: inset 3px 3px 8px rgba(0,0,0,0.7), inset -2px -2px 4px rgba(255,255,255,0.03);
            color: white; transform: scale(0.95);
        }
        
        /* Play Button (Pill) */
        .media-btn.play {
            width: 80px; height: 42px;
            border-radius: 21px; 
            gap: 4px;
            font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
        }
        
        .media-btn.play:not(.playing) {
            background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
            color: rgba(255,255,255,0.8);
            border: 1px solid rgba(255,255,255,0.05);
            box-shadow: 
                4px 4px 10px rgba(0, 0, 0, 0.5),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                inset 0 1px 2px rgba(255, 255, 255, 0.05);
        }
        .media-btn.play:not(.playing):hover {
            background: linear-gradient(145deg, rgba(40, 43, 50, 1), rgba(32, 34, 40, 1));
        }
        
        .media-btn.play.playing {
            background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
            box-shadow: inset 3px 3px 8px rgba(0,0,0,0.7), inset -2px -2px 4px rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .media-btn.play.playing ha-icon {
            filter: drop-shadow(0 0 6px currentColor);
        }

        ha-icon { pointer-events: none; }
        .play ha-icon { --mdc-icon-size: 18px; }

      </style>
      <div class="card">
        ${art ? `<div class="bg-art" style="background-image: url('${art}');"></div>` : ''}
        
        <div class="content">
            <div class="art-cover" style="background-image: url('${art || ''}');"></div>
            <div class="info">
                <div class="title">${title}</div>
                <div class="subtitle-row">
                    <div class="state-dot"></div>
                    <div class="subtitle">${subtitle}</div>
                </div>
                
                <div class="volume-container">
                    <ha-icon class="vol-icon" icon="${isMuted ? 'mdi:volume-off' : vol > 50 ? 'mdi:volume-high' : vol > 0 ? 'mdi:volume-medium' : 'mdi:volume-low'}"></ha-icon>
                    <div class="volume-slider" id="volume-slider">
                        <div class="volume-fill" id="volume-fill" style="width: ${vol}%"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="controls">
             <div class="media-btn circle" data-action="prev"><ha-icon icon="mdi:skip-previous"></ha-icon></div>
             
             <div class="media-btn play ${isPlaying ? 'playing' : ''}" data-action="play_pause" style="${isPlaying ? `color: ${playingColor};` : ''}">
                <ha-icon icon="${isPlaying ? 'mdi:pause' : 'mdi:play'}"></ha-icon>
                <span>${isPlaying ? 'Pause' : 'Play'}</span>
             </div>
             
             <div class="media-btn circle" data-action="next"><ha-icon icon="mdi:skip-next"></ha-icon></div>
        </div>
      </div>
    `;
    
    this.setupListeners();
  }
}

customElements.define('prism-media', PrismMediaCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-media",
  name: "Prism Media",
  preview: true,
  description: "A custom media player card with inlet controls"
});
})();

// ============================================
// prism-media-light.js
// ============================================
(function() {
class PrismMediaLightCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._dragging = false;
  }

  static getStubConfig() {
    return { entity: "media_player.example", playing_color: "#60a5fa" }
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "media_player" } }
        },
        {
          name: "playing_color",
          selector: { color_rgb: {} }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    // Create a copy to avoid modifying read-only config object
    this.config = { ...config };
    // Normalize playing_color (convert RGB arrays to hex if needed)
    if (this.config.playing_color) {
      this.config.playing_color = this._normalizeColor(this.config.playing_color);
    } else {
      this.config.playing_color = "#60a5fa";
    }
    this.render();
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
    if (this.config && this.config.entity) {
      const entity = hass.states[this.config.entity];
      this._entity = entity || null;
      this.render();
    }
  }

  getCardSize() {
    return 2;
  }

  connectedCallback() {
    if (this.config) {
      this.render();
      this.setupListeners();
    }
  }

  setupListeners() {
    const slider = this.shadowRoot.querySelector('#volume-slider');
    if (slider) {
        slider.addEventListener('mousedown', this.startDrag.bind(this));
        slider.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
    }
    
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));
    
    document.addEventListener('touchmove', this.onDrag.bind(this), { passive: false });
    document.addEventListener('touchend', this.stopDrag.bind(this));

    // Controls
    this.shadowRoot.querySelectorAll('.media-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.controlMedia(action);
      });
    });
  }

  startDrag(e) {
    this._dragging = true;
    this.onDrag(e);
  }

  stopDrag() {
    this._dragging = false;
  }

  onDrag(e) {
    if (!this._dragging) return;
    e.preventDefault();

    const slider = this.shadowRoot.querySelector('#volume-slider');
    const rect = slider.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let percentage = (clientX - rect.left) / rect.width;
    percentage = Math.min(Math.max(percentage, 0), 1);
    
    // Optimistic update
    const fill = this.shadowRoot.querySelector('#volume-fill');
    if(fill) fill.style.width = `${percentage * 100}%`;

    // Debounce actual service call ideally, but simpler here:
    this.setVolume(percentage);
  }

  setVolume(vol) {
    if (this._hass && this.config.entity) {
      this._hass.callService('media_player', 'volume_set', {
        entity_id: this.config.entity,
        volume_level: vol
      });
    } else {
      this.dispatchEvent(new CustomEvent('hass-service-called', {
        detail: {
          domain: 'media_player',
          service: 'volume_set',
          data: {
            entity_id: this.config.entity,
            volume_level: vol
          }
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  controlMedia(action) {
    if (!this._hass || !this.config.entity) return;
    
    let service = '';
    if (action === 'prev') service = 'media_previous_track';
    if (action === 'next') service = 'media_next_track';
    if (action === 'play_pause') service = 'media_play_pause';
    
    this._hass.callService('media_player', service, {
      entity_id: this.config.entity
    });
  }

  render() {
    // Render preview even if entity doesn't exist
    if (!this.config || !this.config.entity) return;
    
    const attr = this._entity ? this._entity.attributes : {};
    const state = this._entity ? this._entity.state : 'idle';
    
    // Title: try various attributes
    const title = attr.media_title || attr.media_album_name || 'No Media';
    
    // Subtitle: try artist, series, app name, channel, or show state
    let subtitle = '';
    if (attr.media_artist) {
      subtitle = attr.media_artist;
    } else if (attr.media_series_title) {
      subtitle = attr.media_series_title;
      // Add episode info if available
      if (attr.media_season && attr.media_episode) {
        subtitle += ` S${attr.media_season}E${attr.media_episode}`;
      }
    } else if (attr.media_channel) {
      subtitle = attr.media_channel;
    } else if (attr.app_name) {
      // Apple TV and similar devices
      subtitle = attr.app_name;
    } else if (attr.source) {
      subtitle = attr.source;
    } else {
      // Fallback to translated state
      const stateMap = {
        'playing': 'Wiedergabe',
        'paused': 'Pausiert', 
        'idle': 'Bereit',
        'off': 'Aus',
        'standby': 'Standby',
        'buffering': 'Puffern...',
        'on': 'An',
        'unavailable': 'Nicht verfügbar'
      };
      subtitle = stateMap[state] || state;
    }
    
    const art = attr.entity_picture; // This usually returns e.g. /api/media_player_proxy/...
    
    // Volume: handle undefined, null, or 0
    const volLevel = attr.volume_level;
    const vol = (volLevel !== undefined && volLevel !== null) ? volLevel * 100 : 0;
    const hasVolume = volLevel !== undefined && volLevel !== null;
    const isMuted = attr.is_volume_muted === true;
    
    const isPlaying = state === 'playing';
    const isPaused = state === 'paused';
    const isActive = isPlaying || isPaused;
    const playingColor = this.config.playing_color || "#2563eb";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          position: relative;
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.6);
          border-top: 1px solid rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid rgba(0, 0, 0, 0.15);
          box-shadow: 
            0 10px 30px -5px rgba(0, 0, 0, 0.15),
            0 4px 10px rgba(0,0,0,0.08),
            inset 0 1px 1px rgba(255,255,255,0.9);
          overflow: hidden;
          color: #1a1a1a;
          user-select: none;
        }
        /* Background Art Blur */
        .bg-art {
            position: absolute; inset: 0; background-size: cover; background-position: center;
            filter: blur(20px); opacity: 0.2; z-index: 0; pointer-events: none;
        }
        
        .content {
            position: relative; z-index: 1; padding: 20px;
            display: flex; gap: 16px; align-items: center;
        }
        
        .art-cover {
            width: 80px; height: 80px; border-radius: 12px; background: rgba(0,0,0,0.3);
            background-size: cover; background-position: center;
            box-shadow: 0 8px 16px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
            flex-shrink: 0;
        }
        
        .info { flex: 1; min-width: 0; }
        .title { font-size: 1.125rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1a1a1a; line-height: 1; }
        .subtitle-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .subtitle { font-size: 0.75rem; color: rgba(0,0,0,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .state-dot {
            width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
            background: ${isPlaying ? playingColor : isPaused ? '#d97706' : 'rgba(0,0,0,0.2)'};
            ${isPlaying ? `box-shadow: 0 0 6px ${playingColor};` : ''}
            ${isPlaying ? 'animation: pulse 2s infinite;' : ''}
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .volume-container {
            margin-top: 12px; display: flex; align-items: center; gap: 12px;
        }
        .vol-icon { --mdc-icon-size: 20px; color: rgba(0,0,0,0.5); }
        
        .volume-slider {
            flex: 1; height: 16px; border-radius: 16px;
            background: linear-gradient(145deg, #e6e6e6, #f8f8f8);
            box-shadow: 
              inset 3px 3px 8px rgba(0,0,0,0.12),
              inset -3px -3px 8px rgba(255,255,255,0.9);
            border: 1px solid rgba(0,0,0,0.05);
            position: relative; overflow: hidden; cursor: pointer;
        }
        .volume-fill {
            position: absolute; top: 0; left: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
            border-radius: 12px; pointer-events: none;
        }
        
        .controls {
            display: flex; align-items: center; justify-content: center; gap: 24px;
            padding: 16px; background: rgba(255,255,255,0.3); border-top: 1px solid rgba(0,0,0,0.05);
        }

        .media-btn {
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s;
        }
        
        /* Circle Buttons (Next/Prev) */
        .media-btn.circle {
            width: 42px; height: 42px; border-radius: 50%;
            background: linear-gradient(145deg, #f0f0f0, #ffffff);
            border: 1px solid rgba(255,255,255,0.8);
            box-shadow: 
              3px 3px 8px rgba(0,0,0,0.08),
              -3px -3px 8px rgba(255,255,255,0.9);
            color: rgba(0,0,0,0.8);
            box-shadow: 0 4px 10px -2px rgba(0,0,0,0.1);
        }
        .media-btn.circle:active {
            background: rgba(255, 255, 255, 0.9);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1), inset -1px -1px 2px rgba(255,255,255,0.8);
            color: #1a1a1a; transform: scale(0.95);
            border-top: 1px solid rgba(255,255,255,0.6);
        }
        
        /* Play Button (Pill) */
        .media-btn.play {
            width: 80px; height: 42px;
            border-radius: 21px; 
            gap: 4px;
            font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
        }
        
        .media-btn.play:not(.playing) {
             background: rgba(0,0,0,0.03); color: rgba(0,0,0,0.8);
             border: 1px solid rgba(0,0,0,0.05);
             box-shadow: 0 4px 10px -2px rgba(0,0,0,0.1);
        }
        
        .media-btn.play.playing {
            background: rgba(255, 255, 255, 0.9);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1), inset -1px -1px 2px rgba(255,255,255,0.8);
            border-top: 1px solid rgba(255,255,255,0.6);
        }

        ha-icon { pointer-events: none; }
        .play ha-icon { --mdc-icon-size: 18px; }

      </style>
      <div class="card">
        ${art ? `<div class="bg-art" style="background-image: url('${art}');"></div>` : ''}
        
        <div class="content">
            <div class="art-cover" style="background-image: url('${art || ''}');"></div>
            <div class="info">
                <div class="title">${title}</div>
                <div class="subtitle-row">
                    <div class="state-dot"></div>
                    <div class="subtitle">${subtitle}</div>
                </div>
                
                <div class="volume-container">
                    <ha-icon class="vol-icon" icon="${isMuted ? 'mdi:volume-off' : vol > 50 ? 'mdi:volume-high' : vol > 0 ? 'mdi:volume-medium' : 'mdi:volume-low'}"></ha-icon>
                    <div class="volume-slider" id="volume-slider">
                        <div class="volume-fill" id="volume-fill" style="width: ${vol}%"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="controls">
             <div class="media-btn circle" data-action="prev"><ha-icon icon="mdi:skip-previous"></ha-icon></div>
             
             <div class="media-btn play ${isPlaying ? 'playing' : ''}" data-action="play_pause" style="${isPlaying ? `color: ${playingColor};` : ''}">
                <ha-icon icon="${isPlaying ? 'mdi:pause' : 'mdi:play'}"></ha-icon>
                <span>${isPlaying ? 'Pause' : 'Play'}</span>
             </div>
             
             <div class="media-btn circle" data-action="next"><ha-icon icon="mdi:skip-next"></ha-icon></div>
        </div>
      </div>
    `;
    
    this.setupListeners();
  }
}

customElements.define('prism-media-light', PrismMediaLightCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-media-light",
  name: "Prism Media Light",
  preview: true,
  description: "A custom media player card with inlet controls"
});
})();

// ============================================
// prism-calendar.js
// ============================================
(function() {

class PrismCalendarCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._events = [];
    this._loading = false;
    this._lastFetch = 0;
  }

  static getStubConfig() {
    return { 
      entity: "calendar.example", 
      max_events: 3,
      icon_color: "#f87171",
      dot_color: "#f87171"
    }
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "calendar" } }
        },
        {
          name: "max_events",
          selector: { number: { min: 1, max: 10, step: 1, mode: "box" } }
        },
        {
          name: "icon_color",
          selector: { color_rgb: {} }
        },
        {
          name: "dot_color",
          selector: { color_rgb: {} }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    // Create a copy to avoid modifying read-only config object
    this.config = { ...config };
    // Set defaults
    if (!this.config.max_events) {
      this.config.max_events = 3;
    }
    // Normalize colors (convert RGB arrays to hex if needed)
    if (this.config.icon_color) {
      this.config.icon_color = this._normalizeColor(this.config.icon_color);
    } else {
      this.config.icon_color = "#f87171";
    }
    if (this.config.dot_color) {
      this.config.dot_color = this._normalizeColor(this.config.dot_color);
    } else {
      this.config.dot_color = "#f87171";
    }
    this._events = [];
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config && this.config.entity) {
      const entity = hass.states[this.config.entity];
      this._entity = entity || null;
      
      // Fetch calendar events every 60 seconds or on first load
      const now = Date.now();
      if (now - this._lastFetch > 60000 || this._events.length === 0) {
        this._fetchCalendarEvents();
      } else {
        this.render();
      }
    }
  }

  async _fetchCalendarEvents() {
    if (!this._hass || !this.config.entity || this._loading) return;
    
    this._loading = true;
    this._lastFetch = Date.now();
    
    try {
      // Calculate date range: now to 30 days in the future
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Use REST API (works with Google Calendar Integration)
      const authToken = this._hass.auth.data.access_token || this._hass.auth.accessToken;
      const response = await fetch(
        `/api/calendars/${this.config.entity}?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const eventsArray = await response.json();
      
      // Process events - REST API returns array directly
      if (Array.isArray(eventsArray) && eventsArray.length > 0) {
        this._events = eventsArray
          .map(event => {
            // REST API returns: { start: { dateTime: "..." } or { date: "..." }, end: {...}, summary: "...", ... }
            const title = event.summary || event.title || event.message || 'Unbenannt';
            // Handle both dateTime (timed) and date (all-day) formats
            const start = event.start?.dateTime || event.start?.date || event.start;
            const end = event.end?.dateTime || event.end?.date || event.end;
            
            return { title, start, end };
          })
          .filter(event => event.start)
          .sort((a, b) => {
            const dateA = new Date(a.start);
            const dateB = new Date(b.start);
            return dateA - dateB;
          })
          .slice(0, this.config.max_events || 3);
      } else {
        // Fallback to entity attributes if REST API returns empty
        if (this._entity && this._entity.attributes) {
          const attr = this._entity.attributes;
          if (attr.message && attr.start_time) {
            this._events = [{
              title: attr.message,
              start: attr.start_time,
              end: attr.end_time || attr.start_time
            }];
          } else {
            this._events = [];
          }
        } else {
          this._events = [];
        }
      }
      
    } catch (error) {
      console.warn('Prism Calendar: Could not fetch calendar events:', error);
      // Fallback to entity attributes
      if (this._entity && this._entity.attributes) {
        const attr = this._entity.attributes;
        if (attr.message && attr.start_time) {
          this._events = [{
            title: attr.message,
            start: attr.start_time,
            end: attr.end_time || attr.start_time
          }];
        } else {
          this._events = [];
        }
      } else {
        this._events = [];
      }
    }
    
    this._loading = false;
    this.render();
  }

  getCardSize() {
    return 3;
  }

  connectedCallback() {
    if (this.config) {
      this.render();
    }
  }

  render() {
    if (!this.config || !this.config.entity) return;
    
    const maxEvents = this.config.max_events || 3;
    const iconColor = this._normalizeColor(this.config.icon_color || "#f87171");
    const dotColor = this._normalizeColor(this.config.dot_color || "#f87171");
    
    // Use fetched events
    const events = this._events.slice(0, maxEvents);
    
    // Generate event items
    let eventItems = '';
    if (events.length === 0) {
      // No events or still loading
      eventItems = `
        <div class="event-item" style="opacity: 0.6;">
          <div class="timeline">
            <div class="dot"></div>
          </div>
          <div class="event-info">
            <div class="event-title">${this._loading ? 'Lade Termine...' : 'Keine kommenden Termine'}</div>
            <div class="event-time">
              <ha-icon icon="mdi:clock-outline" style="--mdc-icon-size: 12px;"></ha-icon>
              -
            </div>
          </div>
        </div>
      `;
    } else {
      events.forEach((event, i) => {
        const isActive = i === 0;
        let timeStr = 'Ganztägig';
        
        if (event.start) {
          try {
            const date = new Date(event.start);
            if (!isNaN(date.getTime())) {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              
              // Check if it's an all-day event (no time component or midnight)
              const isAllDay = event.start.length === 10 || (date.getHours() === 0 && date.getMinutes() === 0);
              
              if (eventDate.getTime() === today.getTime()) {
                // Today
                timeStr = isAllDay ? 'Heute (ganztägig)' : `Heute, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              } else {
                // Future date
                const daysDiff = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
                if (daysDiff === 1) {
                  timeStr = isAllDay ? 'Morgen (ganztägig)' : `Morgen, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                } else if (daysDiff > 1 && daysDiff <= 7) {
                  timeStr = isAllDay 
                    ? date.toLocaleDateString('de-DE', { weekday: 'long' }) + ' (ganztägig)'
                    : date.toLocaleDateString('de-DE', { weekday: 'short' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                  timeStr = isAllDay
                    ? date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' (ganztägig)'
                    : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              }
            }
          } catch (e) {
            // If date parsing fails, keep default "Ganztägig"
          }
        }
        
        eventItems += `
          <div class="event-item" style="opacity: ${isActive ? '1' : '0.8'};">
            <div class="timeline">
              <div class="dot ${isActive ? 'active' : ''}" style="${isActive ? `background: ${dotColor}; box-shadow: 0 0 8px ${dotColor}99;` : ''}"></div>
            </div>
            <div class="event-info">
              <div class="event-title">${event.title}</div>
              <div class="event-time">
                <ha-icon icon="mdi:clock-outline" style="--mdc-icon-size: 12px;"></ha-icon>
                ${timeStr}
              </div>
            </div>
          </div>
        `;
      });
      
      // Fill remaining slots with placeholders if needed
      for (let i = events.length; i < maxEvents; i++) {
        eventItems += `
          <div class="event-item" style="opacity: 0.4;">
            <div class="timeline">
              <div class="dot"></div>
            </div>
            <div class="event-info">
              <div class="event-title">Keine weiteren Termine</div>
              <div class="event-time">
                <ha-icon icon="mdi:clock-outline" style="--mdc-icon-size: 12px;"></ha-icon>
                -
              </div>
            </div>
          </div>
        `;
      }
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          background: rgba(30, 32, 36, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3);
          padding: 20px;
          color: white;
        }
        
        .header {
            display: flex; gap: 12px; align-items: center; margin-bottom: 24px;
        }
        .icon-box {
            width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
            box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            flex-shrink: 0;
        }
        .icon-box ha-icon {
            width: 22px; height: 22px; --mdc-icon-size: 22px;
            filter: drop-shadow(0 0 6px currentColor);
        }
        .title { font-size: 1.125rem; font-weight: 700; color: rgba(255, 255, 255, 0.9); line-height: 1; }
        .subtitle { font-size: 0.75rem; font-weight: 500; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-top: 4px; letter-spacing: 0.05em; }
        
        .event-list {
            display: flex; flex-direction: column; gap: 12px;
        }
        .event-item {
            display: flex; gap: 16px; align-items: center;
            background: rgba(20, 20, 20, 0.4);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 12px 16px;
            border: 1px solid rgba(255,255,255,0.02);
        }
        .timeline {
            display: flex; flex-direction: column; align-items: center; justify-content: center; width: 42px; flex-shrink: 0;
            margin-left: 1px; /* Precise alignment adjustment */
        }
        /* Visual alignment helper: The header icon is 42px wide. We want these dots centered relative to that column */
        
        .dot {
            width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.2);
        }
        .dot.active {
            /* Color set inline */
        }
        
        .event-info {
            flex: 1;
        }
        .event-title { font-size: 15px; font-weight: 500; color: white; margin-bottom: 4px; }
        .event-time { font-size: 12px; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 6px; }
        
      </style>
      <div class="card">
        <div class="header">
            <div class="icon-box" style="background: ${this._hexToRgba(iconColor, 0.15)}; color: ${iconColor};">
                <ha-icon icon="mdi:calendar"></ha-icon>
            </div>
            <div>
                <div class="title">Kalender</div>
                <div class="subtitle">${events.length > 0 ? `${events.length} Termine` : 'Nächstes Event'}</div>
            </div>
        </div>
        
        <div class="event-list">
            ${eventItems}
        </div>
      </div>
    `;
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

  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

customElements.define('prism-calendar', PrismCalendarCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-calendar",
  name: "Prism Calendar",
  preview: true,
  description: "A custom calendar card with configurable events and colors"
});

})();

// ============================================
// prism-calendar-light.js
// ============================================
(function() {

class PrismCalendarLightCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._events = [];
    this._loading = false;
    this._lastFetch = 0;
  }

  static getStubConfig() {
    return { 
      entity: "calendar.example", 
      max_events: 3,
      icon_color: "#f87171",
      dot_color: "#f87171"
    }
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "calendar" } }
        },
        {
          name: "max_events",
          selector: { number: { min: 1, max: 10, step: 1, mode: "box" } }
        },
        {
          name: "icon_color",
          selector: { color_rgb: {} }
        },
        {
          name: "dot_color",
          selector: { color_rgb: {} }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    // Create a copy to avoid modifying read-only config object
    this.config = { ...config };
    // Set defaults
    if (!this.config.max_events) {
      this.config.max_events = 3;
    }
    // Normalize colors (convert RGB arrays to hex if needed)
    if (this.config.icon_color) {
      this.config.icon_color = this._normalizeColor(this.config.icon_color);
    } else {
      this.config.icon_color = "#f87171";
    }
    if (this.config.dot_color) {
      this.config.dot_color = this._normalizeColor(this.config.dot_color);
    } else {
      this.config.dot_color = "#f87171";
    }
    this._events = [];
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config && this.config.entity) {
      const entity = hass.states[this.config.entity];
      this._entity = entity || null;
      
      // Fetch calendar events every 60 seconds or on first load
      const now = Date.now();
      if (now - this._lastFetch > 60000 || this._events.length === 0) {
        this._fetchCalendarEvents();
      } else {
        this.render();
      }
    }
  }

  async _fetchCalendarEvents() {
    if (!this._hass || !this.config.entity || this._loading) return;
    
    this._loading = true;
    this._lastFetch = Date.now();
    
    try {
      // Calculate date range: now to 30 days in the future
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Use REST API (works with Google Calendar Integration)
      const authToken = this._hass.auth.data.access_token || this._hass.auth.accessToken;
      const response = await fetch(
        `/api/calendars/${this.config.entity}?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const eventsArray = await response.json();
      
      // Process events - REST API returns array directly
      if (Array.isArray(eventsArray) && eventsArray.length > 0) {
        this._events = eventsArray
          .map(event => {
            // REST API returns: { start: { dateTime: "..." } or { date: "..." }, end: {...}, summary: "...", ... }
            const title = event.summary || event.title || event.message || 'Unbenannt';
            // Handle both dateTime (timed) and date (all-day) formats
            const start = event.start?.dateTime || event.start?.date || event.start;
            const end = event.end?.dateTime || event.end?.date || event.end;
            
            return { title, start, end };
          })
          .filter(event => event.start)
          .sort((a, b) => {
            const dateA = new Date(a.start);
            const dateB = new Date(b.start);
            return dateA - dateB;
          })
          .slice(0, this.config.max_events || 3);
      } else {
        // Fallback to entity attributes if REST API returns empty
        if (this._entity && this._entity.attributes) {
          const attr = this._entity.attributes;
          if (attr.message && attr.start_time) {
            this._events = [{
              title: attr.message,
              start: attr.start_time,
              end: attr.end_time || attr.start_time
            }];
          } else {
            this._events = [];
          }
        } else {
          this._events = [];
        }
      }
      
    } catch (error) {
      console.warn('Prism Calendar Light: Could not fetch calendar events:', error);
      // Fallback to entity attributes
      if (this._entity && this._entity.attributes) {
        const attr = this._entity.attributes;
        if (attr.message && attr.start_time) {
          this._events = [{
            title: attr.message,
            start: attr.start_time,
            end: attr.end_time || attr.start_time
          }];
        } else {
          this._events = [];
        }
      } else {
        this._events = [];
      }
    }
    
    this._loading = false;
    this.render();
  }

  getCardSize() {
    return 3;
  }

  connectedCallback() {
    if (this.config) {
      this.render();
    }
  }

  render() {
    if (!this.config || !this.config.entity) return;
    
    const maxEvents = this.config.max_events || 3;
    const iconColor = this._normalizeColor(this.config.icon_color || "#f87171");
    const dotColor = this._normalizeColor(this.config.dot_color || "#f87171");
    
    // Use fetched events
    const events = this._events.slice(0, maxEvents);
    
    // Generate event items
    let eventItems = '';
    if (events.length === 0) {
      // No events or still loading
      eventItems = `
        <div class="event-item" style="opacity: 0.6;">
          <div class="timeline">
            <div class="dot"></div>
          </div>
          <div class="event-info">
            <div class="event-title">${this._loading ? 'Lade Termine...' : 'Keine kommenden Termine'}</div>
            <div class="event-time">
              <ha-icon icon="mdi:clock-outline" style="--mdc-icon-size: 12px;"></ha-icon>
              -
            </div>
          </div>
        </div>
      `;
    } else {
      events.forEach((event, i) => {
        const isActive = i === 0;
        let timeStr = 'Ganztägig';
        
        if (event.start) {
          try {
            const date = new Date(event.start);
            if (!isNaN(date.getTime())) {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              
              // Check if it's an all-day event (no time component or midnight)
              const isAllDay = event.start.length === 10 || (date.getHours() === 0 && date.getMinutes() === 0);
              
              if (eventDate.getTime() === today.getTime()) {
                // Today
                timeStr = isAllDay ? 'Heute (ganztägig)' : `Heute, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              } else {
                // Future date
                const daysDiff = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
                if (daysDiff === 1) {
                  timeStr = isAllDay ? 'Morgen (ganztägig)' : `Morgen, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                } else if (daysDiff > 1 && daysDiff <= 7) {
                  timeStr = isAllDay 
                    ? date.toLocaleDateString('de-DE', { weekday: 'long' }) + ' (ganztägig)'
                    : date.toLocaleDateString('de-DE', { weekday: 'short' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                  timeStr = isAllDay
                    ? date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' (ganztägig)'
                    : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              }
            }
          } catch (e) {
            // If date parsing fails, keep default "Ganztägig"
          }
        }
        
        eventItems += `
          <div class="event-item" style="opacity: ${isActive ? '1' : '0.8'};">
            <div class="timeline">
              <div class="dot ${isActive ? 'active' : ''}" style="${isActive ? `background: ${dotColor}; box-shadow: 0 0 8px ${dotColor}99;` : ''}"></div>
            </div>
            <div class="event-info">
              <div class="event-title">${event.title}</div>
              <div class="event-time">
                <ha-icon icon="mdi:clock-outline" style="--mdc-icon-size: 12px;"></ha-icon>
                ${timeStr}
              </div>
            </div>
          </div>
        `;
      });
      
      // Fill remaining slots with placeholders if needed
      for (let i = events.length; i < maxEvents; i++) {
        eventItems += `
          <div class="event-item" style="opacity: 0.4;">
            <div class="timeline">
              <div class="dot"></div>
            </div>
            <div class="event-info">
              <div class="event-title">Keine weiteren Termine</div>
              <div class="event-time">
                <ha-icon icon="mdi:clock-outline" style="--mdc-icon-size: 12px;"></ha-icon>
                -
              </div>
            </div>
          </div>
        `;
      }
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.6);
          border-top: 1px solid rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid rgba(0, 0, 0, 0.15);
          box-shadow: 
            0 10px 30px -5px rgba(0, 0, 0, 0.15),
            0 4px 10px rgba(0,0,0,0.08),
            inset 0 1px 1px rgba(255,255,255,0.9);
          padding: 20px;
          color: #1a1a1a;
        }
        
        .header {
            display: flex; gap: 12px; align-items: center; margin-bottom: 24px; padding-left: 8px;
        }
        .icon-box {
            width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            flex-shrink: 0;
        }
        .icon-box ha-icon {
            width: 22px; height: 22px; --mdc-icon-size: 22px;
        }
        .title { font-size: 1.125rem; font-weight: 700; color: #1a1a1a; line-height: 1; }
        .subtitle { font-size: 0.75rem; font-weight: 500; color: #666; text-transform: uppercase; margin-top: 4px; }
        
        .event-list {
            display: flex; flex-direction: column; gap: 12px;
        }
        .event-item {
            display: flex; gap: 16px; align-items: center;
            background: rgba(255, 255, 255, 0.5);
            box-shadow: inset 2px 2px 5px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.1);
            border-radius: 12px;
            padding: 12px 16px;
            border: 1px solid rgba(0,0,0,0.03);
        }
        .timeline {
            display: flex; flex-direction: column; align-items: center; justify-content: center; width: 42px; flex-shrink: 0;
            margin-left: 1px; /* Precise alignment adjustment */
        }
        /* Visual alignment helper: The header icon is 42px wide. We want these dots centered relative to that column */
        
        .dot {
            width: 8px; height: 8px; border-radius: 50%; background: rgba(0,0,0,0.2);
        }
        .dot.active {
            /* Color set inline */
        }
        
        .event-info {
            flex: 1;
        }
        .event-title { font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 4px; }
        .event-time { font-size: 12px; color: rgba(0,0,0,0.5); display: flex; align-items: center; gap: 6px; }
        
      </style>
      <div class="card">
        <div class="header">
            <div class="icon-box" style="background: ${this._hexToRgba(iconColor, 0.15)}; color: ${iconColor};">
                <ha-icon icon="mdi:calendar"></ha-icon>
            </div>
            <div>
                <div class="title">Kalender</div>
                <div class="subtitle">${events.length > 0 ? `${events.length} Termine` : 'Nächstes Event'}</div>
            </div>
        </div>
        
        <div class="event-list">
            ${eventItems}
        </div>
      </div>
    `;
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

  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

customElements.define('prism-calendar-light', PrismCalendarLightCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-calendar-light",
  name: "Prism Calendar Light",
  preview: true,
  description: "A custom calendar card with configurable events and colors"
});

})();

// ============================================
// prism-shutter.js
// ============================================
(function() {

class PrismShutterCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._dragging = false;
  }

  static getStubConfig() {
    return { entity: "cover.example_shutter", name: "Shutter" }
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "cover" } }
        },
        {
          name: "name",
          selector: { text: {} }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    this.config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config && this.config.entity) {
      const entity = hass.states[this.config.entity];
      this._entity = entity || null;
      this.render();
    }
  }

  getCardSize() {
    return 2;
  }

  connectedCallback() {
    if (this.config) {
      this.render();
      this.setupListeners();
    }
  }

  setupListeners() {
    // Buttons
    this.shadowRoot.querySelectorAll('.control-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.controlCover(action);
      });
    });
    
    // Slider Dragging
    const slider = this.shadowRoot.querySelector('.slider-track');
    if (slider) {
        slider.addEventListener('mousedown', this.startDrag.bind(this));
        slider.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
    }
    
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));
    
    document.addEventListener('touchmove', this.onDrag.bind(this), { passive: false });
    document.addEventListener('touchend', this.stopDrag.bind(this));
  }
  
  startDrag(e) {
    this._dragging = true;
    const fill = this.shadowRoot.querySelector('.slider-fill');
    if(fill) fill.style.transition = 'none'; // Disable transition for direct follow
    this.onDrag(e);
  }

  stopDrag() {
    if(this._dragging) {
        this._dragging = false;
        const fill = this.shadowRoot.querySelector('.slider-fill');
        if(fill) {
            fill.style.transition = 'width 0.5s ease-out';
            // Get current visual % from style
            const styleW = fill.style.width;
            const percent = parseInt(styleW);
            this.setCoverPosition(percent);
        }
    }
  }

  onDrag(e) {
    if (!this._dragging) return;
    e.preventDefault();

    const track = this.shadowRoot.querySelector('.slider-track');
    const rect = track.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let percentage = (clientX - rect.left) / rect.width;
    percentage = Math.min(Math.max(percentage, 0), 1);
    
    // Optimistic update
    const fill = this.shadowRoot.querySelector('.slider-fill');
    if(fill) fill.style.width = `${percentage * 100}%`;
    
    // Update label (optional, requires selecting title/subtitle elements which might be tricky if not stored)
    // For simplicity, we just update the bar visually for now
  }
  
  setCoverPosition(pos) {
    if (this._hass && this.config.entity) {
      this._hass.callService('cover', 'set_cover_position', {
        entity_id: this.config.entity,
        position: pos
      });
    } else {
      this.dispatchEvent(new CustomEvent('hass-service-called', {
        detail: {
          domain: 'cover',
          service: 'set_cover_position',
          data: {
            entity_id: this.config.entity,
            position: pos
          }
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  controlCover(action) {
    if (!this._hass || !this.config.entity) return;
    
    let service = '';
    if (action === 'up') service = 'open_cover';
    if (action === 'stop') service = 'stop_cover';
    if (action === 'down') service = 'close_cover';
    
    this._hass.callService('cover', service, {
      entity_id: this.config.entity
    });
  }

  render() {
    if (!this.config || !this.config.entity) return;
    
    const attr = this._entity ? this._entity.attributes : {};
    const pos = attr.current_position !== undefined ? attr.current_position : 0;
    const state = this._entity ? this._entity.state : 'closed';
    const isOpen = pos > 0;
    
    // Status Text
    let statusText = 'Closed';
    if (pos === 100) statusText = 'Open';
    else if (pos > 0) statusText = `${pos}% Open`;
    
    // Determine active buttons
    const isOpening = state === 'opening';
    const isClosing = state === 'closing';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          background: rgba(30, 32, 36, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3);
          padding: 20px;
          color: white;
          user-select: none;
        }
        
        .header {
            display: flex; gap: 12px; align-items: center; margin-bottom: 24px;
        }
        .icon-box {
            width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
            background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
            color: #60a5fa;
            display: flex; align-items: center; justify-content: center;
            box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .icon-box ha-icon {
            width: 22px; height: 22px; --mdc-icon-size: 22px;
            filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.6));
        }
        .title { font-size: 1.125rem; font-weight: 700; color: rgba(255, 255, 255, 0.9); line-height: 1; }
        .subtitle { font-size: 0.75rem; font-weight: 500; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-top: 4px; letter-spacing: 0.05em; }
        
        /* Inlet Slider Display (Interactive) */
        .slider-track {
            height: 12px; border-radius: 12px; margin-bottom: 24px;
            background: rgba(20, 20, 20, 0.8);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            border-top: 1px solid rgba(0,0,0,0.4);
            position: relative; overflow: hidden;
            cursor: pointer; touch-action: none;
        }
        .slider-fill {
            position: absolute; top: 0; left: 0; bottom: 0;
            background: #3b82f6;
            box-shadow: 2px 0 5px rgba(59, 130, 246, 0.4);
            border-radius: 12px; transition: width 0.5s ease-out;
        }
        
        .controls {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
        }
        .control-btn {
            height: 40px; border-radius: 12px;
            background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
            border: 1px solid rgba(255,255,255,0.05);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; color: rgba(255,255,255,0.6);
            box-shadow: 
                4px 4px 10px rgba(0, 0, 0, 0.5),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                inset 0 1px 2px rgba(255, 255, 255, 0.05);
        }
        .control-btn:hover:not(.active) {
            background: linear-gradient(145deg, rgba(40, 43, 50, 1), rgba(32, 34, 40, 1));
            color: #60a5fa;
        }
        .control-btn:hover:not(.active) ha-icon {
            filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.5));
        }
        /* Active/Pressed State (Inlet) */
        .control-btn:active, .control-btn.active {
            background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
            box-shadow: inset 3px 3px 8px rgba(0,0,0,0.7), inset -2px -2px 4px rgba(255,255,255,0.03);
            border-top: 1px solid rgba(0,0,0,0.4);
            transform: scale(0.98);
            color: #3b82f6;
        }
        .control-btn.active ha-icon {
            filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.6));
        }

      </style>
      <div class="card">
        <div class="header">
            <div class="icon-box">
                <ha-icon icon="mdi:window-shutter"></ha-icon>
            </div>
            <div>
                <div class="title">${this.config.name || 'Shutter'}</div>
                <div class="subtitle">${statusText}</div>
            </div>
        </div>
        
        <div class="slider-track">
            <div class="slider-fill" style="width: ${pos}%"></div>
        </div>
        
        <div class="controls">
            <div class="control-btn ${isOpening ? 'active' : ''}" data-action="up">
                <ha-icon icon="mdi:arrow-up"></ha-icon>
            </div>
            <div class="control-btn" data-action="stop">
                <ha-icon icon="mdi:pause"></ha-icon>
            </div>
            <div class="control-btn ${isClosing ? 'active' : ''}" data-action="down">
                <ha-icon icon="mdi:arrow-down"></ha-icon>
            </div>
        </div>
      </div>
    `;
    
    this.setupListeners();
  }
}

customElements.define('prism-shutter', PrismShutterCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-shutter",
  name: "Prism Shutter",
  preview: true,
  description: "A custom shutter card with inlet styling"
});

})();

// ============================================
// prism-shutter-light.js
// ============================================
(function() {

class PrismShutterLightCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._dragging = false;
  }

  static getStubConfig() {
    return { entity: "cover.example_shutter", name: "Shutter" }
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "cover" } }
        },
        {
          name: "name",
          selector: { text: {} }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    this.config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config && this.config.entity) {
      const entity = hass.states[this.config.entity];
      this._entity = entity || null;
      this.render();
    }
  }

  getCardSize() {
    return 2;
  }

  connectedCallback() {
    if (this.config) {
      this.render();
      this.setupListeners();
    }
  }

  setupListeners() {
    // Buttons
    this.shadowRoot.querySelectorAll('.control-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.controlCover(action);
      });
    });
    
    // Slider Dragging
    const slider = this.shadowRoot.querySelector('.slider-track');
    if (slider) {
        slider.addEventListener('mousedown', this.startDrag.bind(this));
        slider.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
    }
    
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));
    
    document.addEventListener('touchmove', this.onDrag.bind(this), { passive: false });
    document.addEventListener('touchend', this.stopDrag.bind(this));
  }
  
  startDrag(e) {
    this._dragging = true;
    const fill = this.shadowRoot.querySelector('.slider-fill');
    if(fill) fill.style.transition = 'none'; // Disable transition for direct follow
    this.onDrag(e);
  }

  stopDrag() {
    if(this._dragging) {
        this._dragging = false;
        const fill = this.shadowRoot.querySelector('.slider-fill');
        if(fill) {
            fill.style.transition = 'width 0.5s ease-out';
            // Get current visual % from style
            const styleW = fill.style.width;
            const percent = parseInt(styleW);
            this.setCoverPosition(percent);
        }
    }
  }

  onDrag(e) {
    if (!this._dragging) return;
    e.preventDefault();

    const track = this.shadowRoot.querySelector('.slider-track');
    const rect = track.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let percentage = (clientX - rect.left) / rect.width;
    percentage = Math.min(Math.max(percentage, 0), 1);
    
    // Optimistic update
    const fill = this.shadowRoot.querySelector('.slider-fill');
    if(fill) fill.style.width = `${percentage * 100}%`;
    
    // Update label (optional, requires selecting title/subtitle elements which might be tricky if not stored)
    // For simplicity, we just update the bar visually for now
  }
  
  setCoverPosition(pos) {
    if (this._hass && this.config.entity) {
      this._hass.callService('cover', 'set_cover_position', {
        entity_id: this.config.entity,
        position: pos
      });
    } else {
      this.dispatchEvent(new CustomEvent('hass-service-called', {
        detail: {
          domain: 'cover',
          service: 'set_cover_position',
          data: {
            entity_id: this.config.entity,
            position: pos
          }
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  controlCover(action) {
    if (!this._hass || !this.config.entity) return;
    
    let service = '';
    if (action === 'up') service = 'open_cover';
    if (action === 'stop') service = 'stop_cover';
    if (action === 'down') service = 'close_cover';
    
    this._hass.callService('cover', service, {
      entity_id: this.config.entity
    });
  }

  render() {
    if (!this.config || !this.config.entity) return;
    
    const attr = this._entity ? this._entity.attributes : {};
    const pos = attr.current_position !== undefined ? attr.current_position : 0;
    const state = this._entity ? this._entity.state : 'closed';
    const isOpen = pos > 0;
    
    // Status Text
    let statusText = 'Closed';
    if (pos === 100) statusText = 'Open';
    else if (pos > 0) statusText = `${pos}% Open`;
    
    // Determine active buttons
    const isOpening = state === 'opening';
    const isClosing = state === 'closing';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.6);
          border-top: 1px solid rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid rgba(0, 0, 0, 0.15);
          box-shadow: 
            0 10px 30px -5px rgba(0, 0, 0, 0.15),
            0 4px 10px rgba(0,0,0,0.08),
            inset 0 1px 1px rgba(255,255,255,0.9);
          padding: 20px;
          color: #1a1a1a;
          user-select: none;
        }
        
        .header {
            display: flex; gap: 12px; align-items: center; margin-bottom: 24px;
        }
        .icon-box {
            width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
            background: rgba(59, 130, 246, 0.2); color: #60a5fa;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .icon-box ha-icon {
            width: 22px; height: 22px; --mdc-icon-size: 22px;
        }
        .title { font-size: 1.125rem; font-weight: 700; color: #1a1a1a; line-height: 1; }
        .subtitle { font-size: 0.75rem; font-weight: 500; color: #666; text-transform: uppercase; margin-top: 4px; }
        
        /* Inlet Slider Display (Interactive) */
        .slider-track {
            height: 12px; border-radius: 12px; margin-bottom: 24px;
            background: linear-gradient(145deg, #e6e6e6, #f8f8f8);
            box-shadow: 
              inset 3px 3px 8px rgba(0,0,0,0.12),
              inset -3px -3px 8px rgba(255,255,255,0.9);
            border: 1px solid rgba(0,0,0,0.05);
            position: relative; overflow: hidden;
            cursor: pointer; touch-action: none;
        }
        .slider-fill {
            position: absolute; top: 0; left: 0; bottom: 0;
            background: #3b82f6;
            box-shadow: 2px 0 5px rgba(59, 130, 246, 0.4);
            border-radius: 12px; transition: width 0.5s ease-out;
        }
        
        .controls {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
        }
        .control-btn {
            height: 40px; border-radius: 12px;
            background: linear-gradient(145deg, #f0f0f0, #ffffff);
            border: 1px solid rgba(255,255,255,0.8);
            box-shadow: 
              3px 3px 8px rgba(0,0,0,0.08),
              -3px -3px 8px rgba(255,255,255,0.9);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; color: rgba(0,0,0,0.6);
        }
        /* Active/Pressed State (Inlet) */
        .control-btn:active, .control-btn.active {
            background: linear-gradient(145deg, #e6e6e6, #f0f0f0);
            box-shadow: 
              inset 3px 3px 8px rgba(0,0,0,0.12),
              inset -2px -2px 6px rgba(255,255,255,0.8);
            border: 1px solid rgba(0,0,0,0.08);
            transform: scale(0.98);
            color: #3b82f6;
        }

      </style>
      <div class="card">
        <div class="header">
            <div class="icon-box">
                <ha-icon icon="mdi:window-shutter"></ha-icon>
            </div>
            <div>
                <div class="title">${this.config.name || 'Shutter'}</div>
                <div class="subtitle">${statusText}</div>
            </div>
        </div>
        
        <div class="slider-track">
            <div class="slider-fill" style="width: ${pos}%"></div>
        </div>
        
        <div class="controls">
            <div class="control-btn ${isOpening ? 'active' : ''}" data-action="up">
                <ha-icon icon="mdi:arrow-up"></ha-icon>
            </div>
            <div class="control-btn" data-action="stop">
                <ha-icon icon="mdi:pause"></ha-icon>
            </div>
            <div class="control-btn ${isClosing ? 'active' : ''}" data-action="down">
                <ha-icon icon="mdi:arrow-down"></ha-icon>
            </div>
        </div>
      </div>
    `;
    
    this.setupListeners();
  }
}

customElements.define('prism-shutter-light', PrismShutterLightCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-shutter-light",
  name: "Prism Shutter Light",
  preview: true,
  description: "A custom shutter card with inlet styling"
});

})();

// ============================================
// prism-shutter-vertical.js
// ============================================
(function() {
class PrismShutterVerticalCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._dragging = false;
    }

    static getStubConfig() {
      return { entity: "cover.example_shutter", name: "Shutter" }
    }

    static getConfigForm() {
      return {
        schema: [
          {
            name: "entity",
            required: true,
            selector: { entity: { domain: "cover" } }
          },
          {
            name: "name",
            selector: { text: {} }
          }
        ]
      };
    }
  
    setConfig(config) {
      if (!config.entity) {
        throw new Error('Please define an entity');
      }
      this.config = config;
      this.render();
    }
  
    set hass(hass) {
      this._hass = hass;
      if (this.config && this.config.entity) {
        const entity = hass.states[this.config.entity];
        this._entity = entity || null;
        this.render();
      }
    }
  
    getCardSize() {
      return 4;
    }
  
    connectedCallback() {
      if (this.config) {
        this.render();
        this.setupListeners();
      }
    }
  
  setupListeners() {
    const upBtn = this.shadowRoot.querySelector('.btn-up');
    const downBtn = this.shadowRoot.querySelector('.btn-down');
    const stopBtn = this.shadowRoot.querySelector('.btn-stop');
    const track = this.shadowRoot.querySelector('.track-container');

    if (upBtn) upBtn.addEventListener('click', () => this.controlCover('open_cover'));
    if (downBtn) downBtn.addEventListener('click', () => this.controlCover('close_cover'));
    if (stopBtn) stopBtn.addEventListener('click', () => this.controlCover('stop_cover'));
    
    if (track) {
        track.addEventListener('mousedown', this.startDrag.bind(this));
        track.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
    }
    
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));
    
    document.addEventListener('touchmove', this.onDrag.bind(this), { passive: false });
    document.addEventListener('touchend', this.stopDrag.bind(this));
  }
  
  startDrag(e) {
    this._dragging = true;
    const fill = this.shadowRoot.querySelector('.fill');
    if(fill) fill.classList.add('dragging');
    this.onDrag(e);
  }

  stopDrag() {
    if(this._dragging) {
        this._dragging = false;
        const fill = this.shadowRoot.querySelector('.fill');
        if(fill) {
            fill.classList.remove('dragging');
            // Get current visual % from style
            const styleH = fill.style.height;
            const percent = parseInt(styleH);
            this.setCoverPosition(percent);
        }
    }
  }

  onDrag(e) {
    if (!this._dragging) return;
    e.preventDefault();

    const track = this.shadowRoot.querySelector('.track-container');
    const rect = track.getBoundingClientRect();
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Calculate relative Y from bottom (since 0% is bottom, 100% is top visually)
    // clientY is from top.
    // relativeY from bottom = rect.bottom - clientY
    let relativeY = rect.bottom - clientY;
    let percentage = relativeY / rect.height;
    percentage = Math.min(Math.max(percentage, 0), 1);
    
    // Optimistic update
    const fill = this.shadowRoot.querySelector('.fill');
    if(fill) fill.style.height = `${percentage * 100}%`;
    
    // Update label
    const status = this.shadowRoot.querySelector('.status');
    if(status) status.innerText = `${Math.round(percentage * 100)}%`;
  }
  
  setCoverPosition(pos) {
    if (this._hass && this.config.entity) {
      this._hass.callService('cover', 'set_cover_position', {
        entity_id: this.config.entity,
        position: pos
      });
    } else {
      this.dispatchEvent(new CustomEvent('hass-service-called', {
        detail: {
          domain: 'cover',
          service: 'set_cover_position',
          data: {
            entity_id: this.config.entity,
            position: pos
          }
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  controlCover(service) {
    if (!this._hass || !this.config.entity) return;
    
    this._hass.callService('cover', service, {
      entity_id: this.config.entity
    });
  }
  
    render() {
      if (!this.config || !this.config.entity) return;
      
      const attr = this._entity ? this._entity.attributes : {};
      const pos = attr.current_position !== undefined ? attr.current_position : 0;
      // 100% means open (window clear), 0% means closed (shutter down)
      
      const isOpen = pos > 0;
      const name = this.config.name || (this._entity ? attr.friendly_name : null) || 'Shutter';
      
      // Calculate heights
      // pos 100 -> shutter height 0%
      // pos 0 -> shutter height 100%
      const shutterHeight = 100 - pos;
  
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .card {
            position: relative;
            width: 140px;
            height: 340px;
            border-radius: 24px;
            background: rgba(30, 32, 36, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.05);
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            border-bottom: 1px solid rgba(0, 0, 0, 0.4);
            box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: row;
            padding: 12px;
            gap: 12px;
            user-select: none;
            overflow: hidden;
            box-sizing: border-box;
          }
          
          /* Left Column: Track */
          .track-container {
              width: 48px; height: 100%; position: relative; z-index: 1;
              cursor: pointer; touch-action: none;
          }
          .track {
              position: absolute; inset: 0;
              border-radius: 24px;
              background: rgba(20, 20, 20, 0.8);
              box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1);
              border-bottom: 1px solid rgba(255,255,255,0.05);
              border-top: 1px solid rgba(0,0,0,0.4);
              overflow: hidden;
          }
          .fill {
              position: absolute; bottom: 0; left: 0; right: 0;
              height: ${pos}%;
              background: #3b82f6;
              box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
              border-radius: 24px;
              /* Remove transition when dragging for responsiveness */
              transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .fill.dragging { transition: none; }
          
          /* Right Column: Info & Controls */
          .right-col {
              flex: 1; display: flex; flex-direction: column; justify-content: space-between;
              z-index: 2; height: 100%;
          }
          
          .header {
              display: flex; flex-direction: column; align-items: center; gap: 8px;
              width: 100%;
          }
          .icon-box {
              width: 36px; height: 36px; border-radius: 50%;
              background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
              color: #60a5fa;
              display: flex; align-items: center; justify-content: center;
              box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .icon-box ha-icon {
              width: 18px; height: 18px; --mdc-icon-size: 18px;
              filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.6));
          }
          .info {
              text-align: center; width: 100%;
          }
          .title {
              font-size: 11px; font-weight: 700; color: #e0e0e0;
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              line-height: 1.2; width: 100%;
          }
          .status {
              font-size: 9px; font-weight: 500; color: #999; 
              text-transform: uppercase; letter-spacing: 0.5px;
              margin-top: 2px;
          }
          
          /* Controls */
          .controls {
              display: flex; flex-direction: column; gap: 8px; width: 100%;
          }
          
          .control-btn {
              width: 100%; border-radius: 8px;
              background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
              border: 1px solid rgba(255,255,255,0.05);
              display: flex; align-items: center; justify-content: center;
              color: rgba(255,255,255,0.5);
              cursor: pointer;
              box-shadow: 
                  3px 3px 6px rgba(0, 0, 0, 0.4),
                  -2px -2px 4px rgba(255, 255, 255, 0.02),
                  inset 0 1px 1px rgba(255, 255, 255, 0.05);
              transition: all 0.2s;
          }
          .control-btn ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
          }
          .control-btn.btn-up, .control-btn.btn-down { height: 32px; }
          .control-btn.btn-up ha-icon, .control-btn.btn-down ha-icon { 
              width: 18px; height: 18px; --mdc-icon-size: 18px; 
          }
          .control-btn.btn-stop { height: 28px; }
          .control-btn.btn-stop ha-icon { 
              width: 14px; height: 14px; --mdc-icon-size: 14px; 
          }
          
          .control-btn:hover {
              background: linear-gradient(145deg, rgba(40, 43, 50, 1), rgba(32, 34, 40, 1));
              color: #60a5fa;
          }
          .control-btn:hover ha-icon {
              filter: drop-shadow(0 0 4px rgba(96, 165, 250, 0.5));
          }
          .control-btn:active {
              background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
              box-shadow: inset 3px 3px 6px rgba(0,0,0,0.6), inset -2px -2px 4px rgba(255,255,255,0.02);
              color: #3b82f6;
              transform: scale(0.97);
          }
          .control-btn:active ha-icon {
              filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.6));
          }
  
        </style>
        <div class="card">
          
          <div class="track-container">
              <div class="track">
                  <div class="fill"></div>
              </div>
          </div>
          
          <div class="right-col">
              <div class="header">
                  <div class="icon-box">
                      <ha-icon icon="mdi:window-shutter"></ha-icon>
                  </div>
                  <div class="info">
                      <div class="title">${name}</div>
                      <div class="status">${pos}%</div>
                  </div>
              </div>
              
              <div class="controls">
                  <div class="control-btn btn-up">
                      <ha-icon icon="mdi:arrow-up"></ha-icon>
                  </div>
                  <div class="control-btn btn-stop">
                      <ha-icon icon="mdi:pause"></ha-icon>
                  </div>
                  <div class="control-btn btn-down">
                      <ha-icon icon="mdi:arrow-down"></ha-icon>
                  </div>
              </div>
          </div>

        </div>
      `;
      
      this.setupListeners();
    }
  }
  
customElements.define('prism-shutter-vertical', PrismShutterVerticalCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-shutter-vertical",
  name: "Prism Shutter Vertical",
  preview: true,
  description: "A narrow vertical shutter card with inlet styling"
});
})();

// ============================================
// prism-shutter-vertical-light.js
// ============================================
(function() {
class PrismShutterVerticalLightCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._dragging = false;
    }

    static getStubConfig() {
      return { entity: "cover.example_shutter", name: "Shutter" }
    }

    static getConfigForm() {
      return {
        schema: [
          {
            name: "entity",
            required: true,
            selector: { entity: { domain: "cover" } }
          },
          {
            name: "name",
            selector: { text: {} }
          }
        ]
      };
    }
  
    setConfig(config) {
      if (!config.entity) {
        throw new Error('Please define an entity');
      }
      this.config = config;
      this.render();
    }
  
    set hass(hass) {
      this._hass = hass;
      if (this.config && this.config.entity) {
        const entity = hass.states[this.config.entity];
        this._entity = entity || null;
        this.render();
      }
    }
  
    getCardSize() {
      return 4;
    }
  
    connectedCallback() {
      if (this.config) {
        this.render();
        this.setupListeners();
      }
    }
  
  setupListeners() {
    const upBtn = this.shadowRoot.querySelector('.btn-up');
    const downBtn = this.shadowRoot.querySelector('.btn-down');
    const stopBtn = this.shadowRoot.querySelector('.btn-stop');
    const track = this.shadowRoot.querySelector('.track-container');

    if (upBtn) upBtn.addEventListener('click', () => this.controlCover('open_cover'));
    if (downBtn) downBtn.addEventListener('click', () => this.controlCover('close_cover'));
    if (stopBtn) stopBtn.addEventListener('click', () => this.controlCover('stop_cover'));
    
    if (track) {
        track.addEventListener('mousedown', this.startDrag.bind(this));
        track.addEventListener('touchstart', this.startDrag.bind(this), { passive: false });
    }
    
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));
    
    document.addEventListener('touchmove', this.onDrag.bind(this), { passive: false });
    document.addEventListener('touchend', this.stopDrag.bind(this));
  }
  
  startDrag(e) {
    this._dragging = true;
    const fill = this.shadowRoot.querySelector('.fill');
    if(fill) fill.classList.add('dragging');
    this.onDrag(e);
  }

  stopDrag() {
    if(this._dragging) {
        this._dragging = false;
        const fill = this.shadowRoot.querySelector('.fill');
        if(fill) {
            fill.classList.remove('dragging');
            // Get current visual % from style
            const styleH = fill.style.height;
            const percent = parseInt(styleH);
            this.setCoverPosition(percent);
        }
    }
  }

  onDrag(e) {
    if (!this._dragging) return;
    e.preventDefault();

    const track = this.shadowRoot.querySelector('.track-container');
    const rect = track.getBoundingClientRect();
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Calculate relative Y from bottom (since 0% is bottom, 100% is top visually)
    // clientY is from top.
    // relativeY from bottom = rect.bottom - clientY
    let relativeY = rect.bottom - clientY;
    let percentage = relativeY / rect.height;
    percentage = Math.min(Math.max(percentage, 0), 1);
    
    // Optimistic update
    const fill = this.shadowRoot.querySelector('.fill');
    if(fill) fill.style.height = `${percentage * 100}%`;
    
    // Update label
    const status = this.shadowRoot.querySelector('.status');
    if(status) status.innerText = `${Math.round(percentage * 100)}%`;
  }
  
  setCoverPosition(pos) {
    if (this._hass && this.config.entity) {
      this._hass.callService('cover', 'set_cover_position', {
        entity_id: this.config.entity,
        position: pos
      });
    } else {
      this.dispatchEvent(new CustomEvent('hass-service-called', {
        detail: {
          domain: 'cover',
          service: 'set_cover_position',
          data: {
            entity_id: this.config.entity,
            position: pos
          }
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  controlCover(service) {
    if (!this._hass || !this.config.entity) return;
    
    this._hass.callService('cover', service, {
      entity_id: this.config.entity
    });
  }
  
    render() {
      if (!this.config || !this.config.entity) return;
      
      const attr = this._entity ? this._entity.attributes : {};
      const pos = attr.current_position !== undefined ? attr.current_position : 0;
      // 100% means open (window clear), 0% means closed (shutter down)
      
      const isOpen = pos > 0;
      const name = this.config.name || (this._entity ? attr.friendly_name : null) || 'Shutter';
      
      // Calculate heights
      // pos 100 -> shutter height 0%
      // pos 0 -> shutter height 100%
      const shutterHeight = 100 - pos;
  
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .card {
            position: relative;
            width: 140px;
            height: 340px;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.6);
            border-top: 1px solid rgba(255, 255, 255, 0.9);
            border-bottom: 1px solid rgba(0, 0, 0, 0.15);
            box-shadow: 
              0 10px 30px -5px rgba(0, 0, 0, 0.15),
              0 4px 10px rgba(0,0,0,0.08),
              inset 0 1px 1px rgba(255,255,255,0.9);
            display: flex;
            flex-direction: row;
            padding: 12px;
            gap: 12px;
            user-select: none;
            overflow: hidden;
            box-sizing: border-box;
          }
          
          /* Left Column: Track */
          .track-container {
              width: 48px; height: 100%; position: relative; z-index: 1;
              cursor: pointer; touch-action: none;
          }
          .track {
              position: absolute; inset: 0;
              border-radius: 24px;
              background: rgba(240, 240, 240, 0.9);
              box-shadow: inset 2px 2px 5px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.1);
              border-bottom: 1px solid rgba(0,0,0,0.05);
              border-top: 1px solid rgba(255,255,255,0.6);
              overflow: hidden;
          }
          .fill {
              position: absolute; bottom: 0; left: 0; right: 0;
              height: ${pos}%;
              background: #3b82f6;
              box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
              border-radius: 24px;
              /* Remove transition when dragging for responsiveness */
              transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .fill.dragging { transition: none; }
          
          /* Right Column: Info & Controls */
          .right-col {
              flex: 1; display: flex; flex-direction: column; justify-content: space-between;
              z-index: 2; height: 100%;
          }
          
          .header {
              display: flex; flex-direction: column; align-items: center; gap: 8px;
              width: 100%;
          }
          .icon-box {
              width: 36px; height: 36px; border-radius: 50%;
              background: rgba(59, 130, 246, 0.2); color: #60a5fa;
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }
          .icon-box ha-icon {
              width: 18px; height: 18px; --mdc-icon-size: 18px;
          }
          .info {
              text-align: center; width: 100%;
          }
          .title {
              font-size: 11px; font-weight: 700; color: #1a1a1a;
              white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
              line-height: 1.2; width: 100%;
          }
          .status {
              font-size: 9px; font-weight: 500; color: #666; 
              text-transform: uppercase; letter-spacing: 0.5px;
              margin-top: 2px;
          }
          
          /* Controls */
          .controls {
              display: flex; flex-direction: column; gap: 8px; width: 100%;
          }
          
          .control-btn {
              width: 100%; border-radius: 8px;
              background: linear-gradient(145deg, #f0f0f0, #ffffff);
              border: 1px solid rgba(255,255,255,0.8);
              box-shadow: 
                2px 2px 6px rgba(0,0,0,0.08),
                -2px -2px 6px rgba(255,255,255,0.9);
              display: flex; align-items: center; justify-content: center;
              color: rgba(0,0,0,0.7);
              cursor: pointer;
              box-shadow: 0 2px 4px -1px rgba(0,0,0,0.1);
              transition: all 0.2s;
              position: relative;
          }
          .control-btn ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
          }
          .control-btn.btn-up, .control-btn.btn-down { height: 32px; }
          .control-btn.btn-up ha-icon, .control-btn.btn-down ha-icon { 
              width: 18px; height: 18px; --mdc-icon-size: 18px; 
          }
          .control-btn.btn-stop { height: 28px; }
          .control-btn.btn-stop ha-icon { 
              width: 14px; height: 14px; --mdc-icon-size: 14px; 
          }
          
          .control-btn:active {
              background: linear-gradient(145deg, #e6e6e6, #f0f0f0);
              box-shadow: 
                inset 3px 3px 6px rgba(0,0,0,0.12),
                inset -2px -2px 4px rgba(255,255,255,0.8);
              color: #1a1a1a; 
              border: 1px solid rgba(0,0,0,0.08);
          }
  
        </style>
        <div class="card">
          
          <div class="track-container">
              <div class="track">
                  <div class="fill"></div>
              </div>
          </div>
          
          <div class="right-col">
              <div class="header">
                  <div class="icon-box">
                      <ha-icon icon="mdi:window-shutter" style="width: 16px; height: 16px;"></ha-icon>
                  </div>
                  <div class="info">
                      <div class="title">${name}</div>
                      <div class="status">${pos}%</div>
                  </div>
              </div>
              
              <div class="controls">
                  <div class="control-btn btn-up">
                      <ha-icon icon="mdi:arrow-up" style="width: 20px; height: 20px;"></ha-icon>
                  </div>
                  <div class="control-btn btn-stop">
                      <ha-icon icon="mdi:pause" style="width: 14px; height: 14px;"></ha-icon>
                  </div>
                  <div class="control-btn btn-down">
                      <ha-icon icon="mdi:arrow-down" style="width: 20px; height: 20px;"></ha-icon>
                  </div>
              </div>
          </div>

        </div>
      `;
      
      this.setupListeners();
    }
  }
  
customElements.define('prism-shutter-vertical-light', PrismShutterVerticalLightCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-shutter-vertical-light",
  name: "Prism Shutter Vertical Light",
  preview: true,
  description: "A narrow vertical shutter card with inlet styling"
});
})();

// ============================================
// prism-vacuum.js
// ============================================
(function() {
class PrismVacuumCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._mapRefreshInterval = null;
    }

    static getStubConfig() {
      return { 
        entity: "vacuum.example", 
        name: "Staubsauger"
      }
    }

    static getConfigForm() {
      return {
        schema: [
          {
            name: "entity",
            required: true,
            selector: { entity: { domain: "vacuum" } }
          },
          {
            name: "name",
            selector: { text: {} }
          },
          {
            name: "map_camera",
            selector: { entity: { domain: ["camera", "image"] } }
          },
          {
            name: "show_status",
            selector: { boolean: {} }
          }
        ]
      };
    }
  
    setConfig(config) {
      if (!config.entity) {
        throw new Error('Please define an entity');
      }
      this.config = {
        show_status: true,
        ...config
      };
    }
  
    set hass(hass) {
      this._hass = hass;
      if (this.config && this.config.entity) {
        const entity = hass.states[this.config.entity];
        this._entity = entity || null;
        
        // Get map camera entity if configured
        if (this.config.map_camera) {
          this._mapEntity = hass.states[this.config.map_camera] || null;
        }
        
        this.render();
      }
    }
  
    getCardSize() {
      return 3;
    }
  
    connectedCallback() {
      this.render();
      this.setupListeners();
    }
    
    disconnectedCallback() {
      if (this._mapRefreshInterval) {
        clearInterval(this._mapRefreshInterval);
      }
    }
  
    setupListeners() {
        const root = this.shadowRoot;
        
        // Play/Pause
        const playBtn = root.querySelector('#play-btn');
        if(playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction('toggle');
            });
        }

        // Home
        const homeBtn = root.querySelector('#home-btn');
        if(homeBtn) {
            homeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction('home');
            });
        }
        
        // Locate - click on vacuum inlet/robot to find it
        const inlet = root.querySelector('.vacuum-inlet');
        if(inlet) {
            inlet.addEventListener('click', () => {
                this.handleAction('locate');
            });
        }

        // Fan Speed
        root.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = e.currentTarget.dataset.speed;
                this.handleAction('set_speed', speed);
            });
        });
    }
  
    handleAction(action, value) {
      if (!this._hass || !this.config.entity) return;
      
      let service = '';
      let data = { entity_id: this.config.entity };
  
      if (action === 'toggle') {
        const state = this._entity ? this._entity.state : 'idle';
        if (state === 'cleaning') {
          service = 'stop';
        } else if (state === 'paused') {
          service = 'start';
        } else if (state === 'docked' || state === 'idle') {
          service = 'start';
        } else {
          service = 'start';
        }
      } else if (action === 'home') {
        service = 'return_to_base';
      } else if (action === 'locate') {
        service = 'locate';
      } else if (action === 'set_speed') {
        service = 'set_fan_speed';
        data.fan_speed = value;
      }
  
      if (service && this._hass) {
        this._hass.callService('vacuum', service, data);
      } else if (service) {
        // Fallback for preview mode
        this.dispatchEvent(new CustomEvent('hass-service-called', {
            detail: {
              domain: 'vacuum',
              service: service,
              data: data
            },
            bubbles: true,
            composed: true,
          }));
      }
    }
    
    // Get fan speeds from entity or use defaults
    getFanSpeeds() {
      const attr = this._entity ? this._entity.attributes : {};
      
      // Try to get fan_speed_list from entity attributes (most integrations provide this)
      if (attr.fan_speed_list && Array.isArray(attr.fan_speed_list) && attr.fan_speed_list.length > 0) {
        return attr.fan_speed_list;
      }
      
      // Fallback defaults that work with most integrations
      // Order: lowest to highest suction power
      const defaultSpeeds = ["Silent", "Standard", "Medium", "Turbo"];
      return defaultSpeeds;
    }
    
    // Get display label for speed (shorter labels for UI)
    getSpeedLabel(speed) {
      const labels = {
        // Roborock / Xiaomi
        'silent': 'Silent',
        'quiet': 'Silent',
        'balanced': 'Std',
        'standard': 'Std',
        'medium': 'Med',
        'turbo': 'Turbo',
        'max': 'Max',
        'max+': 'Max+',
        'off': 'Off',
        // Dreame
        'quiet': 'Silent',
        'strong': 'Strong',
        // Valetudo
        'min': 'Min',
        'low': 'Low',
        'high': 'High',
        // Generic
        'auto': 'Auto',
        'gentle': 'Gentle',
        'normal': 'Normal',
        'power': 'Power',
        'mop': 'Mop'
      };
      
      const lowerSpeed = speed.toLowerCase();
      return labels[lowerSpeed] || speed.charAt(0).toUpperCase() + speed.slice(1).substring(0, 5);
    }
    
    // Get battery icon based on level
    getBatteryIcon(level) {
      if (level >= 95) return 'mdi:battery';
      if (level >= 85) return 'mdi:battery-90';
      if (level >= 75) return 'mdi:battery-80';
      if (level >= 65) return 'mdi:battery-70';
      if (level >= 55) return 'mdi:battery-60';
      if (level >= 45) return 'mdi:battery-50';
      if (level >= 35) return 'mdi:battery-40';
      if (level >= 25) return 'mdi:battery-30';
      if (level >= 15) return 'mdi:battery-20';
      if (level >= 5) return 'mdi:battery-10';
      return 'mdi:battery-outline';
    }
    
    // Get battery color based on level
    getBatteryColor(level, isCharging) {
      if (isCharging) return '#facc15'; // Yellow when charging
      if (level >= 50) return '#4ade80'; // Green
      if (level >= 20) return '#fb923c'; // Orange
      return '#ef4444'; // Red
    }
    
    // Get status text
    getStatusText(state) {
      const statusMap = {
        'cleaning': 'Reinigt',
        'docked': 'Angedockt',
        'idle': 'Bereit',
        'paused': 'Pausiert',
        'returning': 'Fährt zurück',
        'error': 'Fehler',
        'off': 'Aus',
        'unavailable': 'Nicht verfügbar'
      };
      return statusMap[state] || state;
    }
    
    // Get map image URL
    getMapUrl() {
      if (!this._mapEntity || !this._hass) return null;
      
      const entityId = this.config.map_camera;
      const domain = entityId.split('.')[0];
      
      // First try entity_picture attribute - this is a pre-signed URL that works for both camera and image entities
      if (this._mapEntity.attributes.entity_picture) {
        const entityPicture = this._mapEntity.attributes.entity_picture;
        // Add cache-busting timestamp if not already present
        const separator = entityPicture.includes('?') ? '&' : '?';
        return `${entityPicture}${separator}_ts=${Date.now()}`;
      }
      
      // Fallback for camera entities
      if (domain === 'camera') {
        const token = this._mapEntity.attributes.access_token || '';
        return `/api/camera_proxy/${entityId}?token=${token}&t=${Date.now()}`;
      }
      
      return null;
    }
  
    render() {
      if (!this.config || !this.config.entity) return;
      
      // Render preview even if entity doesn't exist
      const attr = this._entity ? this._entity.attributes : {};
      const state = this._entity ? this._entity.state : 'idle';
      const battery = attr.battery_level !== undefined ? attr.battery_level : 85; // Default for preview
      const name = this.config.name || (this._entity ? attr.friendly_name : null) || 'Vacuum';
      const fanSpeed = attr.fan_speed || 'Standard';
      const isCharging = attr.status === 'charging' || state === 'docked';
      
      // Handle different vacuum integration states
      // Some integrations use 'cleaning', others 'on', 'running', etc.
      const cleaningStates = ['cleaning', 'on', 'running', 'auto', 'spot', 'edge', 'single_room', 'mop', 'sweeping', 'mopping', 'vacuuming'];
      const returningStates = ['returning', 'returning_home', 'going_home', 'return_to_base'];
      const dockedStates = ['docked', 'charging', 'charged', 'idle'];
      const pausedStates = ['paused', 'pause', 'stopped'];
      const errorStates = ['error', 'stuck', 'offline', 'unavailable'];
      
      const isCleaning = cleaningStates.includes(state);
      const isReturning = returningStates.includes(state);
      const isDocked = dockedStates.includes(state) && !isCleaning;
      const isPaused = pausedStates.includes(state);
      const hasError = errorStates.includes(state);
      const isActive = isCleaning || isReturning;

      // Get fan speeds from entity or defaults
      const speeds = this.getFanSpeeds();
      const currentSpeedIndex = speeds.findIndex(s => s.toLowerCase() === fanSpeed.toLowerCase());
      
      // Map URL if configured
      const mapUrl = this.getMapUrl();
      const showMap = this.config.map_camera && mapUrl;
  
      // Battery icon and color
      const batteryIcon = isCharging ? 'mdi:battery-charging' : this.getBatteryIcon(battery);
      const batteryColor = this.getBatteryColor(battery, isCharging);
      
      // Status color
      const getStatusColor = () => {
        if (hasError) return '#ef4444';
        if (isCleaning) return '#3b82f6';
        if (isReturning) return '#f59e0b';
        if (isPaused) return '#f59e0b';
        if (isDocked) return '#4ade80';
        return 'rgba(255,255,255,0.4)';
      };

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .card {
            background: rgba(30, 32, 36, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.05);
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            border-bottom: 1px solid rgba(0, 0, 0, 0.4);
            box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3);
            padding: 20px;
            color: white;
            user-select: none;
            box-sizing: border-box;
            display: flex; flex-direction: column; gap: 20px;
            overflow: hidden;
            position: relative;
          }

          /* Noise texture */
          .noise {
            position: absolute; inset: 0; opacity: 0.03; pointer-events: none;
            background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E');
            mix-blend-mode: overlay;
          }
          
          /* Header */
          .header {
              display: flex; justify-content: space-between; align-items: center; z-index: 2;
              gap: 12px;
          }
          .header-left { 
              display: flex; align-items: center; gap: 12px;
              flex: 1;
              min-width: 0;
              overflow: hidden;
          }
          
          .icon-box {
              width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
              background: ${isActive || hasError 
                  ? 'linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1))' 
                  : 'linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1))'}; 
              color: ${isActive ? '#60a5fa' : hasError ? '#ef4444' : 'rgba(255,255,255,0.4)'};
              display: flex; align-items: center; justify-content: center;
              transition: all 0.5s ease;
              flex-shrink: 0;
              box-shadow: ${isActive || hasError 
                  ? 'inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03)' 
                  : '4px 4px 10px rgba(0, 0, 0, 0.5), -2px -2px 6px rgba(255, 255, 255, 0.03), inset 0 1px 2px rgba(255, 255, 255, 0.05)'};
              border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .icon-box ha-icon {
              width: 22px;
              height: 22px;
              --mdc-icon-size: 22px;
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 0;
              ${isActive ? 'filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.6));' : ''}
              ${hasError ? 'filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.6));' : ''}
          }
          .icon-spin {
              animation: ${isActive ? 'spin 3s linear infinite' : 'none'};
          }
          @keyframes spin { 100% { transform: rotate(360deg); } }
          
          .info { 
              display: flex; flex-direction: column;
              min-width: 0;
              overflow: hidden;
          }
          .title { 
              font-size: 1.125rem; font-weight: 700; color: rgba(255, 255, 255, 0.9); line-height: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
          }
          .subtitle { 
              font-size: 0.75rem; font-weight: 500; color: rgba(255, 255, 255, 0.6); margin-top: 4px;
              display: flex; align-items: center; gap: 8px;
              flex-wrap: wrap;
              overflow: hidden;
          }
          .subtitle ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 0;
              flex-shrink: 0;
          }
          .subtitle span {
              line-height: 1;
          }
          .battery-info {
              display: flex;
              align-items: center;
              gap: 4px;
          }
          .status-badge {
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 2px 6px;
              border-radius: 8px;
              background: rgba(255,255,255,0.05);
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
          }
          .status-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: ${getStatusColor()};
              ${isActive ? 'animation: pulse 2s infinite;' : ''}
          }
          @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
          }
          
          .header-right {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-shrink: 0;
          }
          
          .action-btn {
              width: 36px; height: 36px; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              transition: all 0.2s; cursor: pointer;
              border: 1px solid rgba(255,255,255,0.05);
              background: rgba(255,255,255,0.05);
              color: rgba(255,255,255,0.4);
          }
          .action-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
          .action-btn ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 0;
          }
          
          .play-btn {
              width: 40px; height: 40px; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              transition: all 0.2s; cursor: pointer;
              border: 1px solid rgba(255,255,255,0.05);
          }
          .play-btn ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 0;
          }
          .play-btn.active {
              background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
              color: #3b82f6;
              box-shadow: inset 3px 3px 8px rgba(0,0,0,0.7), inset -2px -2px 4px rgba(255,255,255,0.03);
          }
          .play-btn.active ha-icon {
              filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.6));
          }
          .play-btn.inactive {
              background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
              color: rgba(255,255,255,0.4);
              box-shadow: 
                  4px 4px 10px rgba(0, 0, 0, 0.5),
                  -2px -2px 6px rgba(255, 255, 255, 0.03),
                  inset 0 1px 2px rgba(255, 255, 255, 0.05);
          }
          .play-btn.inactive:hover { 
              background: linear-gradient(145deg, rgba(40, 43, 50, 1), rgba(32, 34, 40, 1));
              color: #4ade80;
          }
          .play-btn.inactive:hover ha-icon {
              filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.5));
          }
          
          /* Visual Inlet - click to locate robot */
          .vacuum-inlet {
              width: 100%; height: 160px; border-radius: 16px;
              background: rgba(20, 20, 20, 0.8);
              box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
              border-bottom: 1px solid rgba(255,255,255,0.05);
              border-top: 1px solid rgba(0,0,0,0.4);
              position: relative; overflow: hidden;
              cursor: pointer;
              transition: all 0.2s ease;
          }
          .vacuum-inlet:hover {
              background: rgba(25, 25, 25, 0.9);
          }
          .vacuum-inlet:active {
              transform: scale(0.995);
          }
          
          /* Map display */
          .map-container {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
          }
          .map-image {
              width: 100%;
              height: 100%;
              object-fit: contain;
              opacity: 0.9;
          }
          .map-overlay {
              position: absolute;
              inset: 0;
              background: linear-gradient(to bottom, rgba(20,20,20,0.3), transparent, rgba(20,20,20,0.5));
              pointer-events: none;
          }
          
          .floor-grid {
              position: absolute; inset: 0; opacity: 0.03;
              background-image: linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px);
              background-size: 30px 30px;
          }
          
          .vacuum-body {
             position: absolute; width: 96px; height: 96px;
             left: 50%; top: 50%;
             transform: translate(-50%, -50%);
             z-index: 10;
          }
          
          .vacuum-visual {
              width: 100%; height: 100%; border-radius: 50%;
              background: linear-gradient(135deg, #353842, #2a2d35, #1a1c21);
              box-shadow: 0 10px 20px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);
              border: 1px solid rgba(255,255,255,0.1);
              position: relative;
          }
          
          .lidar {
              position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
              width: 36px; height: 36px; border-radius: 50%;
              background: linear-gradient(#25282e, #15171a);
              border: 1px solid rgba(255,255,255,0.05);
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 4px 8px rgba(0,0,0,0.4);
          }
          .lidar-dot {
              width: 8px; height: 8px; border-radius: 50%;
              background: ${hasError ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.5)'};
              box-shadow: 0 0 5px ${hasError ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.5)'};
          }
          
          .led {
              position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
              width: 20px; height: 6px; border-radius: 10px;
              background: ${isCleaning ? '#3b82f6' : hasError ? '#ef4444' : 'rgba(255,255,255,0.1)'};
              box-shadow: ${isCleaning ? '0 0 8px #3b82f6' : hasError ? '0 0 8px #ef4444' : 'none'};
              transition: all 0.3s;
          }
          
          /* Animation */
          .vacuum-body.animating {
             animation: movePath 12s linear infinite;
          }
          
          @keyframes movePath {
              0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); }
              15% { transform: translate(-50%, -50%) translate(100px, 25px) rotate(15deg); }
              35% { transform: translate(-50%, -50%) translate(100px, -25px) rotate(-15deg); }
              50% { transform: translate(-50%, -50%) translate(-100px, -25px) rotate(10deg); }
              65% { transform: translate(-50%, -50%) translate(-100px, 25px) rotate(-10deg); }
              100% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); }
          }
          
          /* Controls Row */
          .controls-row {
              display: flex; flex-direction: column; gap: 12px; z-index: 2;
          }
          
          .controls-header {
              display: flex; justify-content: space-between; align-items: center; padding: 0 4px;
          }
          .controls-label {
              display: flex; align-items: center; gap: 6px;
              font-size: 11px; color: #999;
          }
          .controls-label ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
          }
          .controls-label span { font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; }
          
          .home-btn {
              display: flex; align-items: center; gap: 6px;
              padding: 4px 10px; border-radius: 20px;
              border: 1px solid transparent;
              cursor: pointer; transition: all 0.2s;
          }
          .home-btn ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
          }
          .home-btn.active {
              background: #141414; color: #3b82f6;
              box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.05); border-top-color: rgba(0,0,0,0.2);
          }
          .home-btn.inactive {
              background: transparent; color: rgba(255,255,255,0.4);
          }
          .home-btn.inactive:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }
          .home-text { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

          /* Fan Speed Bars */
          .speed-controls {
              display: flex; gap: 8px; width: 100%;
          }
          .speed-btn {
              flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;
              min-width: 0;
          }
          .speed-bar {
              width: 100%; height: 40px; border-radius: 12px; position: relative; overflow: hidden;
              background: rgba(20,20,20,0.4);
              border: 1px solid rgba(255,255,255,0.05);
              transition: all 0.3s;
          }
          .speed-bar.active {
              background: #141414;
              box-shadow: inset 1px 1px 2px rgba(0,0,0,0.8), 0 0 10px rgba(59,130,246,0.15);
          }
          .speed-fill {
              position: absolute; bottom: 0; left: 0; right: 0;
              transition: height 0.3s ease-out;
              background: rgba(59, 130, 246, 0.2);
              height: 0;
          }
          .speed-line {
              position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
              transition: all 0.3s;
              background: transparent;
          }
          .speed-text {
              font-size: 8px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.3px;
              color: rgba(255,255,255,0.2); transition: color 0.3s;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
          }
          
          /* Active states for bars */
          .speed-btn.active .speed-fill { height: 100%; }
          .speed-btn.active .speed-line { background: #3b82f6; box-shadow: 0 0 8px #3b82f6; }
          .speed-btn.active .speed-text { color: rgba(255,255,255,0.8); }

        </style>
        
        <div class="card">
          <div class="noise"></div>
          
          <div class="header">
              <div class="header-left">
                  <div class="icon-box">
                      <ha-icon icon="${hasError ? 'mdi:alert-circle' : 'mdi:robot-vacuum'}" class="${isActive ? 'icon-spin' : ''}" style="width: 24px; height: 24px;"></ha-icon>
                  </div>
                  <div class="info">
                      <div class="title">${name}</div>
                      <div class="subtitle">
                          <div class="battery-info">
                              <ha-icon icon="${batteryIcon}" style="width: 14px; height: 14px; color: ${batteryColor};"></ha-icon>
                              <span>${battery}%</span>
                          </div>
                          ${this.config.show_status ? `
                          <div class="status-badge">
                              <div class="status-dot"></div>
                              <span>${this.getStatusText(state)}</span>
                          </div>
                          ` : ''}
                      </div>
                  </div>
              </div>
              
              <div class="header-right">
                  <div id="play-btn" class="play-btn ${isCleaning ? 'active' : 'inactive'}">
                      <ha-icon icon="${isCleaning ? 'mdi:pause' : 'mdi:play'}" style="width: 20px; height: 20px;"></ha-icon>
                  </div>
              </div>
          </div>
          
          <div class="vacuum-inlet">
              ${showMap ? `
              <div class="map-container">
                  <img class="map-image" src="${mapUrl}" alt="Vacuum Map" />
                  <div class="map-overlay"></div>
              </div>
              ` : `
              <div class="floor-grid"></div>
              <div class="vacuum-body ${isCleaning ? 'animating' : ''}">
                  <div class="vacuum-visual">
                      <div class="lidar">
                          <div class="lidar-dot"></div>
                      </div>
                      <div class="led"></div>
                  </div>
              </div>
              `}
          </div>
          
          <div class="controls-row">
             <div class="controls-header">
                 <div class="controls-label">
                     <ha-icon icon="mdi:fan" style="width: 14px; height: 14px; color: rgba(255,255,255,0.4);"></ha-icon>
                     <span>Fan Speed</span>
                 </div>
                 
                 <div id="home-btn" class="home-btn ${isReturning || isDocked ? 'active' : 'inactive'}">
                     <ha-icon icon="mdi:home" style="width: 14px; height: 14px;"></ha-icon>
                     <span class="home-text">Home</span>
                 </div>
             </div>
             
             <div class="speed-controls">
                 ${speeds.map((s, idx) => `
                    <div class="speed-btn ${idx <= currentSpeedIndex ? 'active' : ''}" data-speed="${s}">
                        <div class="speed-bar ${idx <= currentSpeedIndex ? 'active' : ''}">
                            <div class="speed-fill"></div>
                            <div class="speed-line"></div>
                        </div>
                        <span class="speed-text">${this.getSpeedLabel(s)}</span>
                    </div>
                 `).join('')}
             </div>
          </div>
  
        </div>
      `;
      
      this.setupListeners();
    }
  }
  
  customElements.define('prism-vacuum', PrismVacuumCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "prism-vacuum",
    name: "Prism Vacuum",
    preview: true,
    description: "A robot vacuum card with inlet styling and animation"
  });

})();

// ============================================
// prism-vacuum-light.js
// ============================================
(function() {
class PrismVacuumLightCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._mapRefreshInterval = null;
    }

    static getStubConfig() {
      return { 
        entity: "vacuum.example", 
        name: "Staubsauger"
      }
    }

    static getConfigForm() {
      return {
        schema: [
          {
            name: "entity",
            required: true,
            selector: { entity: { domain: "vacuum" } }
          },
          {
            name: "name",
            selector: { text: {} }
          },
          {
            name: "map_camera",
            selector: { entity: { domain: ["camera", "image"] } }
          },
          {
            name: "show_status",
            selector: { boolean: {} }
          }
        ]
      };
    }
  
    setConfig(config) {
      if (!config.entity) {
        throw new Error('Please define an entity');
      }
      this.config = {
        show_status: true,
        ...config
      };
    }
  
    set hass(hass) {
      this._hass = hass;
      if (this.config && this.config.entity) {
        const entity = hass.states[this.config.entity];
        this._entity = entity || null;
        
        // Get map camera entity if configured
        if (this.config.map_camera) {
          this._mapEntity = hass.states[this.config.map_camera] || null;
        }
        
        this.render();
      }
    }
  
    getCardSize() {
      return 3;
    }
  
    connectedCallback() {
      this.render();
      this.setupListeners();
    }
    
    disconnectedCallback() {
      if (this._mapRefreshInterval) {
        clearInterval(this._mapRefreshInterval);
      }
    }
  
    setupListeners() {
        const root = this.shadowRoot;
        
        // Play/Pause
        const playBtn = root.querySelector('#play-btn');
        if(playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction('toggle');
            });
        }

        // Home
        const homeBtn = root.querySelector('#home-btn');
        if(homeBtn) {
            homeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction('home');
            });
        }
        
        // Locate - click on vacuum inlet/robot to find it
        const inlet = root.querySelector('.vacuum-inlet');
        if(inlet) {
            inlet.addEventListener('click', () => {
                this.handleAction('locate');
            });
        }

        // Fan Speed
        root.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = e.currentTarget.dataset.speed;
                this.handleAction('set_speed', speed);
            });
        });
    }
  
    handleAction(action, value) {
      if (!this._hass || !this.config.entity) return;
      
      let service = '';
      let data = { entity_id: this.config.entity };
  
      if (action === 'toggle') {
        const state = this._entity ? this._entity.state : 'idle';
        if (state === 'cleaning') {
          service = 'stop';
        } else if (state === 'paused') {
          service = 'start';
        } else if (state === 'docked' || state === 'idle') {
          service = 'start';
        } else {
          service = 'start';
        }
      } else if (action === 'home') {
        service = 'return_to_base';
      } else if (action === 'locate') {
        service = 'locate';
      } else if (action === 'set_speed') {
        service = 'set_fan_speed';
        data.fan_speed = value;
      }
  
      if (service && this._hass) {
        this._hass.callService('vacuum', service, data);
      } else if (service) {
        // Fallback for preview mode
        this.dispatchEvent(new CustomEvent('hass-service-called', {
            detail: {
              domain: 'vacuum',
              service: service,
              data: data
            },
            bubbles: true,
            composed: true,
          }));
      }
    }
    
    // Get fan speeds from entity or use defaults
    getFanSpeeds() {
      const attr = this._entity ? this._entity.attributes : {};
      
      // Try to get fan_speed_list from entity attributes (most integrations provide this)
      if (attr.fan_speed_list && Array.isArray(attr.fan_speed_list) && attr.fan_speed_list.length > 0) {
        return attr.fan_speed_list;
      }
      
      // Fallback defaults that work with most integrations
      const defaultSpeeds = ["Silent", "Standard", "Medium", "Turbo"];
      return defaultSpeeds;
    }
    
    // Get display label for speed (shorter labels for UI)
    getSpeedLabel(speed) {
      const labels = {
        'silent': 'Silent',
        'quiet': 'Silent',
        'balanced': 'Std',
        'standard': 'Std',
        'medium': 'Med',
        'turbo': 'Turbo',
        'max': 'Max',
        'max+': 'Max+',
        'off': 'Off',
        'strong': 'Strong',
        'min': 'Min',
        'low': 'Low',
        'high': 'High',
        'auto': 'Auto',
        'gentle': 'Gentle',
        'normal': 'Normal',
        'power': 'Power',
        'mop': 'Mop'
      };
      
      const lowerSpeed = speed.toLowerCase();
      return labels[lowerSpeed] || speed.charAt(0).toUpperCase() + speed.slice(1).substring(0, 5);
    }
    
    // Get battery icon based on level
    getBatteryIcon(level) {
      if (level >= 95) return 'mdi:battery';
      if (level >= 85) return 'mdi:battery-90';
      if (level >= 75) return 'mdi:battery-80';
      if (level >= 65) return 'mdi:battery-70';
      if (level >= 55) return 'mdi:battery-60';
      if (level >= 45) return 'mdi:battery-50';
      if (level >= 35) return 'mdi:battery-40';
      if (level >= 25) return 'mdi:battery-30';
      if (level >= 15) return 'mdi:battery-20';
      if (level >= 5) return 'mdi:battery-10';
      return 'mdi:battery-outline';
    }
    
    // Get battery color based on level
    getBatteryColor(level, isCharging) {
      if (isCharging) return '#ca8a04'; // Darker yellow for light theme
      if (level >= 50) return '#16a34a'; // Green
      if (level >= 20) return '#ea580c'; // Orange
      return '#dc2626'; // Red
    }
    
    // Get status text
    getStatusText(state) {
      const statusMap = {
        'cleaning': 'Reinigt',
        'docked': 'Angedockt',
        'idle': 'Bereit',
        'paused': 'Pausiert',
        'returning': 'Fährt zurück',
        'error': 'Fehler',
        'off': 'Aus',
        'unavailable': 'Nicht verfügbar'
      };
      return statusMap[state] || state;
    }
    
    // Get map image URL
    getMapUrl() {
      if (!this._mapEntity || !this._hass) return null;
      
      const entityId = this.config.map_camera;
      const domain = entityId.split('.')[0];
      
      // First try entity_picture attribute - this is a pre-signed URL that works for both camera and image entities
      if (this._mapEntity.attributes.entity_picture) {
        const entityPicture = this._mapEntity.attributes.entity_picture;
        // Add cache-busting timestamp if not already present
        const separator = entityPicture.includes('?') ? '&' : '?';
        return `${entityPicture}${separator}_ts=${Date.now()}`;
      }
      
      // Fallback for camera entities
      if (domain === 'camera') {
        const token = this._mapEntity.attributes.access_token || '';
        return `/api/camera_proxy/${entityId}?token=${token}&t=${Date.now()}`;
      }
      
      return null;
    }
  
    render() {
      if (!this.config || !this.config.entity) return;
      
      const attr = this._entity ? this._entity.attributes : {};
      const state = this._entity ? this._entity.state : 'idle';
      const battery = attr.battery_level !== undefined ? attr.battery_level : 85;
      const name = this.config.name || (this._entity ? attr.friendly_name : null) || 'Vacuum';
      const fanSpeed = attr.fan_speed || 'Standard';
      const isCharging = attr.status === 'charging' || state === 'docked';
      
      // Handle different vacuum integration states
      // Some integrations use 'cleaning', others 'on', 'running', etc.
      const cleaningStates = ['cleaning', 'on', 'running', 'auto', 'spot', 'edge', 'single_room', 'mop', 'sweeping', 'mopping', 'vacuuming'];
      const returningStates = ['returning', 'returning_home', 'going_home', 'return_to_base'];
      const dockedStates = ['docked', 'charging', 'charged', 'idle'];
      const pausedStates = ['paused', 'pause', 'stopped'];
      const errorStates = ['error', 'stuck', 'offline', 'unavailable'];
      
      const isCleaning = cleaningStates.includes(state);
      const isReturning = returningStates.includes(state);
      const isDocked = dockedStates.includes(state) && !isCleaning;
      const isPaused = pausedStates.includes(state);
      const hasError = errorStates.includes(state);
      const isActive = isCleaning || isReturning;

      const speeds = this.getFanSpeeds();
      const currentSpeedIndex = speeds.findIndex(s => s.toLowerCase() === fanSpeed.toLowerCase());
      
      const mapUrl = this.getMapUrl();
      const showMap = this.config.map_camera && mapUrl;
  
      const batteryIcon = isCharging ? 'mdi:battery-charging' : this.getBatteryIcon(battery);
      const batteryColor = this.getBatteryColor(battery, isCharging);
      
      const getStatusColor = () => {
        if (hasError) return '#dc2626';
        if (isCleaning) return '#2563eb';
        if (isReturning) return '#d97706';
        if (isPaused) return '#d97706';
        if (isDocked) return '#16a34a';
        return 'rgba(0,0,0,0.4)';
      };

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .card {
            background: rgba(255, 255, 255, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.6);
            border-top: 1px solid rgba(255, 255, 255, 0.9);
            border-bottom: 1px solid rgba(0, 0, 0, 0.15);
            box-shadow: 
              0 10px 30px -5px rgba(0, 0, 0, 0.15),
              0 4px 10px rgba(0,0,0,0.08),
              inset 0 1px 1px rgba(255,255,255,0.9);
            padding: 20px;
            color: #1a1a1a;
            user-select: none;
            box-sizing: border-box;
            display: flex; flex-direction: column; gap: 20px;
            overflow: hidden;
            position: relative;
          }

          .noise {
            position: absolute; inset: 0; opacity: 0.02; pointer-events: none;
            background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E');
            mix-blend-mode: overlay;
          }
          
          .header {
              display: flex; justify-content: space-between; align-items: center; z-index: 2;
              gap: 12px;
          }
          .header-left { 
              display: flex; align-items: center; gap: 12px;
              flex: 1;
              min-width: 0;
              overflow: hidden;
          }
          
          .icon-box {
              width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
              background: ${isActive ? 'rgba(59, 130, 246, 0.15)' : hasError ? 'rgba(220, 38, 38, 0.15)' : 'rgba(0,0,0,0.05)'}; 
              color: ${isActive ? '#2563eb' : hasError ? '#dc2626' : 'rgba(0,0,0,0.4)'};
              display: flex; align-items: center; justify-content: center;
              transition: all 0.5s ease;
              flex-shrink: 0;
              ${isActive ? 'filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.4));' : ''}
              ${hasError ? 'filter: drop-shadow(0 0 6px rgba(220, 38, 38, 0.4));' : ''}
          }
          .icon-box ha-icon {
              width: 22px;
              height: 22px;
              --mdc-icon-size: 22px;
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 0;
          }
          .icon-spin {
              animation: ${isActive ? 'spin 3s linear infinite' : 'none'};
          }
          @keyframes spin { 100% { transform: rotate(360deg); } }
          
          .info { 
              display: flex; flex-direction: column;
              min-width: 0;
              overflow: hidden;
          }
          .title { 
              font-size: 1.125rem; font-weight: 700; color: #1a1a1a; line-height: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
          }
          .subtitle { 
              font-size: 0.75rem; font-weight: 500; color: #666; margin-top: 4px;
              display: flex; align-items: center; gap: 8px;
              flex-wrap: wrap;
              overflow: hidden;
          }
          .subtitle ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 0;
              flex-shrink: 0;
          }
          .subtitle span {
              line-height: 1;
          }
          .battery-info {
              display: flex;
              align-items: center;
              gap: 4px;
          }
          .status-badge {
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 2px 6px;
              border-radius: 8px;
              background: rgba(0,0,0,0.05);
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
          }
          .status-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: ${getStatusColor()};
              ${isActive ? 'animation: pulse 2s infinite;' : ''}
          }
          @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
          }
          
          .header-right {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-shrink: 0;
          }
          
          .action-btn {
              width: 36px; height: 36px; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              transition: all 0.2s; cursor: pointer;
              border: 1px solid rgba(255,255,255,0.8);
              background: linear-gradient(145deg, #f0f0f0, #ffffff);
              box-shadow: 
                2px 2px 6px rgba(0,0,0,0.08),
                -2px -2px 6px rgba(255,255,255,0.9);
              color: rgba(0,0,0,0.4);
          }
          .action-btn:hover { 
              background: linear-gradient(145deg, #e8e8e8, #f8f8f8); 
              color: rgba(0,0,0,0.7); 
          }
          .action-btn:active {
              background: linear-gradient(145deg, #e2e2e2, #f0f0f0);
              box-shadow: 
                inset 2px 2px 4px rgba(0,0,0,0.1),
                inset -1px -1px 3px rgba(255,255,255,0.8);
          }
          .action-btn ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 0;
          }
          
          .play-btn {
              width: 40px; height: 40px; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              transition: all 0.2s; cursor: pointer;
              border: 1px solid rgba(0,0,0,0.05);
          }
          .play-btn ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              line-height: 0;
          }
          .play-btn.active {
              background: rgba(255,255,255,0.9);
              color: #2563eb;
              box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1), inset -1px -1px 2px rgba(255,255,255,0.8);
              border-top: 1px solid rgba(255,255,255,0.6);
          }
          .play-btn.inactive {
              background: rgba(0,0,0,0.03);
              color: rgba(0,0,0,0.4);
          }
          .play-btn.inactive:hover { background: rgba(0,0,0,0.08); }
          
          /* Visual Inlet - click to locate robot */
          .vacuum-inlet {
              width: 100%; height: 160px; border-radius: 16px;
              background: linear-gradient(145deg, #e6e6e6, #f8f8f8);
              box-shadow: 
                inset 4px 4px 10px rgba(0,0,0,0.12),
                inset -4px -4px 10px rgba(255,255,255,0.9);
              border: 1px solid rgba(0,0,0,0.05);
              position: relative; overflow: hidden;
              cursor: pointer;
              transition: all 0.2s ease;
          }
          .vacuum-inlet:hover {
              background: linear-gradient(145deg, #e0e0e0, #f5f5f5);
          }
          .vacuum-inlet:active {
              transform: scale(0.995);
          }
          
          .map-container {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
          }
          .map-image {
              width: 100%;
              height: 100%;
              object-fit: contain;
              opacity: 0.9;
          }
          .map-overlay {
              position: absolute;
              inset: 0;
              background: linear-gradient(to bottom, rgba(240,240,240,0.3), transparent, rgba(240,240,240,0.5));
              pointer-events: none;
          }
          
          .floor-grid {
              position: absolute; inset: 0; opacity: 0.03;
              background-image: linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px);
              background-size: 30px 30px;
          }
          
          .vacuum-body {
             position: absolute; width: 96px; height: 96px;
             left: 50%; top: 50%;
             transform: translate(-50%, -50%);
             z-index: 10;
          }
          
          .vacuum-visual {
              width: 100%; height: 100%; border-radius: 50%;
              background: linear-gradient(135deg, #e5e7eb, #d1d5db, #f3f4f6);
              box-shadow: 0 10px 20px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.8), inset -1px -1px 1px rgba(0,0,0,0.1);
              border: 1px solid rgba(0,0,0,0.1);
              position: relative;
          }
          
          .lidar {
              position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
              width: 36px; height: 36px; border-radius: 50%;
              background: linear-gradient(#f5f5f5, #e0e0e0);
              border: 1px solid rgba(0,0,0,0.05);
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
          .lidar-dot {
              width: 8px; height: 8px; border-radius: 50%;
              background: ${hasError ? 'rgba(220, 38, 38, 0.8)' : 'rgba(59, 130, 246, 0.6)'};
              box-shadow: 0 0 5px ${hasError ? 'rgba(220, 38, 38, 0.6)' : 'rgba(59, 130, 246, 0.4)'};
          }
          
          .led {
              position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
              width: 20px; height: 6px; border-radius: 10px;
              background: ${isCleaning ? '#2563eb' : hasError ? '#dc2626' : 'rgba(0,0,0,0.1)'};
              box-shadow: ${isCleaning ? '0 0 8px rgba(37, 99, 235, 0.6)' : hasError ? '0 0 8px rgba(220, 38, 38, 0.6)' : 'none'};
              transition: all 0.3s;
          }
          
          .vacuum-body.animating {
             animation: movePath 12s linear infinite;
          }
          
          @keyframes movePath {
              0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); }
              15% { transform: translate(-50%, -50%) translate(100px, 25px) rotate(15deg); }
              35% { transform: translate(-50%, -50%) translate(100px, -25px) rotate(-15deg); }
              50% { transform: translate(-50%, -50%) translate(-100px, -25px) rotate(10deg); }
              65% { transform: translate(-50%, -50%) translate(-100px, 25px) rotate(-10deg); }
              100% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); }
          }
          
          .controls-row {
              display: flex; flex-direction: column; gap: 12px; z-index: 2;
          }
          
          .controls-header {
              display: flex; justify-content: space-between; align-items: center; padding: 0 4px;
          }
          .controls-label {
              display: flex; align-items: center; gap: 6px;
              font-size: 11px; color: #666;
          }
          .controls-label ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
          }
          .controls-label span { font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; }
          
          .home-btn {
              display: flex; align-items: center; gap: 6px;
              padding: 4px 10px; border-radius: 20px;
              border: 1px solid transparent;
              cursor: pointer; transition: all 0.2s;
          }
          .home-btn ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
          }
          .home-btn.active {
              background: rgba(255,255,255,0.9); color: #2563eb;
              box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1), inset -1px -1px 2px rgba(255,255,255,0.8);
              border: 1px solid rgba(0,0,0,0.05); border-top-color: rgba(255,255,255,0.6);
          }
          .home-btn.inactive {
              background: transparent; color: rgba(0,0,0,0.4);
          }
          .home-btn.inactive:hover { background: rgba(0,0,0,0.05); color: rgba(0,0,0,0.7); }
          .home-text { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

          .speed-controls {
              display: flex; gap: 8px; width: 100%;
          }
          .speed-btn {
              flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;
              min-width: 0;
          }
          .speed-bar {
              width: 100%; height: 40px; border-radius: 12px; position: relative; overflow: hidden;
              background: rgba(240,240,240,0.6);
              border: 1px solid rgba(0,0,0,0.05);
              transition: all 0.3s;
          }
          .speed-bar.active {
              background: rgba(255,255,255,0.9);
              box-shadow: inset 1px 1px 2px rgba(0,0,0,0.1), 0 0 10px rgba(59,130,246,0.1);
          }
          .speed-fill {
              position: absolute; bottom: 0; left: 0; right: 0;
              transition: height 0.3s ease-out;
              background: rgba(59, 130, 246, 0.15);
              height: 0;
          }
          .speed-line {
              position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
              transition: all 0.3s;
              background: transparent;
          }
          .speed-text {
              font-size: 8px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.3px;
              color: rgba(0,0,0,0.2); transition: color 0.3s;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
          }
          
          .speed-btn.active .speed-fill { height: 100%; }
          .speed-btn.active .speed-line { background: #2563eb; box-shadow: 0 0 8px rgba(37,99,235,0.5); }
          .speed-btn.active .speed-text { color: rgba(0,0,0,0.8); }

        </style>
        
        <div class="card">
          <div class="noise"></div>
          
          <div class="header">
              <div class="header-left">
                  <div class="icon-box">
                      <ha-icon icon="${hasError ? 'mdi:alert-circle' : 'mdi:robot-vacuum'}" class="${isActive ? 'icon-spin' : ''}" style="width: 24px; height: 24px;"></ha-icon>
                  </div>
                  <div class="info">
                      <div class="title">${name}</div>
                      <div class="subtitle">
                          <div class="battery-info">
                              <ha-icon icon="${batteryIcon}" style="width: 14px; height: 14px; color: ${batteryColor};"></ha-icon>
                              <span>${battery}%</span>
                          </div>
                          ${this.config.show_status ? `
                          <div class="status-badge">
                              <div class="status-dot"></div>
                              <span>${this.getStatusText(state)}</span>
                          </div>
                          ` : ''}
                      </div>
                  </div>
              </div>
              
              <div class="header-right">
                  <div id="play-btn" class="play-btn ${isCleaning ? 'active' : 'inactive'}">
                      <ha-icon icon="${isCleaning ? 'mdi:pause' : 'mdi:play'}" style="width: 20px; height: 20px;"></ha-icon>
                  </div>
              </div>
          </div>
          
          <div class="vacuum-inlet">
              ${showMap ? `
              <div class="map-container">
                  <img class="map-image" src="${mapUrl}" alt="Vacuum Map" />
                  <div class="map-overlay"></div>
              </div>
              ` : `
              <div class="floor-grid"></div>
              <div class="vacuum-body ${isCleaning ? 'animating' : ''}">
                  <div class="vacuum-visual">
                      <div class="lidar">
                          <div class="lidar-dot"></div>
                      </div>
                      <div class="led"></div>
                  </div>
              </div>
              `}
          </div>
          
          <div class="controls-row">
             <div class="controls-header">
                 <div class="controls-label">
                     <ha-icon icon="mdi:fan" style="width: 14px; height: 14px; color: rgba(0,0,0,0.4);"></ha-icon>
                     <span>Fan Speed</span>
                 </div>
                 
                 <div id="home-btn" class="home-btn ${isReturning || isDocked ? 'active' : 'inactive'}">
                     <ha-icon icon="mdi:home" style="width: 14px; height: 14px;"></ha-icon>
                     <span class="home-text">Home</span>
                 </div>
             </div>
             
             <div class="speed-controls">
                 ${speeds.map((s, idx) => `
                    <div class="speed-btn ${idx <= currentSpeedIndex ? 'active' : ''}" data-speed="${s}">
                        <div class="speed-bar ${idx <= currentSpeedIndex ? 'active' : ''}">
                            <div class="speed-fill"></div>
                            <div class="speed-line"></div>
                        </div>
                        <span class="speed-text">${this.getSpeedLabel(s)}</span>
                    </div>
                 `).join('')}
             </div>
          </div>
  
        </div>
      `;
      
      this.setupListeners();
    }
  }
  
  customElements.define('prism-vacuum-light', PrismVacuumLightCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "prism-vacuum-light",
    name: "Prism Vacuum Light",
    preview: true,
    description: "A robot vacuum card with inlet styling and animation (light theme)"
  });

})();

// ============================================
// prism-led.js
// ============================================
(function() {
class PrismLedCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.isDragging = false;
      this.mode = 'color'; // 'color' or 'white'
      this.localBrightness = 0;
      this.localColor = '#ffffff';
      this.localTemp = 50; // 0-100
      this.userModeChange = false; // Track if user manually changed mode
      this.hasRendered = false;
    }

    static getStubConfig() {
      return { 
        entity: "light.example", 
        name: "LED"
      }
    }

    static getConfigForm() {
      return {
        schema: [
          {
            name: "entity",
            required: true,
            selector: { entity: { domain: "light" } }
          },
          {
            name: "name",
            selector: { text: {} }
          }
        ]
      };
    }
  
    setConfig(config) {
      // Allow preview mode without entity (for dashboard editor)
      this.config = { ...config };
      if (!this.config.entity) {
        // Set a default for preview
        this.config.entity = "light.example";
      }
      // Initialize preview values
      if (!this._hass) {
        this.localBrightness = 50;
        this.localColor = '#ff9500';
        this.mode = 'color';
        if (!this.hasRendered) {
          this.render();
          this.hasRendered = true;
          this.setupListeners();
        }
      }
    }
  
    set hass(hass) {
      this._hass = hass;
      if (this.config && this.config.entity) {
        const entity = hass.states[this.config.entity];
        this._entity = entity || null;
      
      // Update local state if not dragging
      if (!this.isDragging && this._entity) {
          const attr = this._entity.attributes;
          if (attr.brightness !== undefined) {
              this.localBrightness = Math.round((attr.brightness / 255) * 100);
          }
          // Only auto-update mode if user hasn't manually changed it
          if (!this.userModeChange) {
              // Try to determine mode and color from attributes
              if (attr.color_mode === 'color_temp') {
                  this.mode = 'white';
                  if (attr.color_temp !== undefined) {
                      // Map mireds to 0-100 (rough approximation: 154-500 mireds -> 0-100%)
                      const mireds = attr.color_temp;
                      const minMireds = 154; // ~6500K (cold)
                      const maxMireds = 500; // ~2000K (warm)
                      this.localTemp = Math.max(0, Math.min(100, ((mireds - minMireds) / (maxMireds - minMireds)) * 100));
                  }
              } else {
                  this.mode = 'color';
                  if (attr.rgb_color && Array.isArray(attr.rgb_color) && attr.rgb_color.length >= 3) {
                      const [r, g, b] = attr.rgb_color;
                      this.localColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                  }
              }
          }
      }
      }
      
      if (!this.hasRendered) {
        this.render();
        this.hasRendered = true;
        this.setupListeners();
      } else {
        this.render();
      }
    }
  
    getCardSize() {
      return 3;
    }
  
    connectedCallback() {
      // Always render if config exists, even without hass (for preview)
      if (this.config) {
        if (!this.hasRendered) {
          this.render();
          this.hasRendered = true;
          this.setupListeners();
        }
      } else if (this.shadowRoot && !this.shadowRoot.innerHTML) {
        // Render stub config for preview
        this.config = PrismLedCard.getStubConfig();
        this.render();
        this.hasRendered = true;
        this.setupListeners();
      }
    }
  
    setupListeners() {
        const root = this.shadowRoot;
        
        // Power Toggle
        const powerBtn = root.querySelector('#power-btn');
        if(powerBtn) {
            powerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction('toggle');
            });
        }

        // Mode Switcher
        root.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.mode = e.currentTarget.dataset.mode;
                this.userModeChange = true; // Mark that user manually changed mode
                this.render();
            });
        });

        // Wheel Interaction
        const wheel = root.querySelector('#color-wheel');
        if(wheel) {
            const handleMove = (e) => {
                if(!this.isDragging) return;
                e.preventDefault(); // Prevent scrolling
                this.handleWheelInteraction(e, wheel);
            };

            wheel.addEventListener('pointerdown', (e) => {
                this.isDragging = true;
                wheel.setPointerCapture(e.pointerId);
                this.handleWheelInteraction(e, wheel);
            });
            
            wheel.addEventListener('pointermove', handleMove);
            
            wheel.addEventListener('pointerup', (e) => {
                this.isDragging = false;
                wheel.releasePointerCapture(e.pointerId);
                // Finalize value (call service)
                this.dispatchLightUpdate();
            });
        }

        // Brightness Slider
        const range = root.querySelector('#brightness-range');
        if (range) {
            range.addEventListener('input', (e) => {
                this.localBrightness = parseInt(e.target.value);
                this.updateBrightnessVisuals();
            });
            range.addEventListener('change', (e) => {
                // Final commit
                this.handleAction('set_brightness', this.localBrightness);
            });
        }
    }

    handleWheelInteraction(e, wheel) {
        const rect = wheel.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        
        // Calculate angle (0 is Top)
        let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        if (this.mode === 'color') {
            this.localColor = this.hslToHex(angle, 100, 50);
        } else {
            // Symmetric Temp Mapping
            const distFromTop = angle > 180 ? 360 - angle : angle;
            const temp = 100 - (distFromTop / 180 * 100);
            this.localTemp = Math.max(0, Math.min(100, temp));
        }
        
        // Update visual parts of the wheel only (not full re-render to keep it fast)
        this.updateWheelVisuals();
    }

    dispatchLightUpdate() {
        if (!this._hass || !this.config.entity) return;
        
        if (this.mode === 'color') {
            // Convert hex to RGB and call light.turn_on
            const rgb = this.hexToRgb(this.localColor);
            this._hass.callService('light', 'turn_on', {
                entity_id: this.config.entity,
                rgb_color: rgb,
                brightness_pct: this.localBrightness
            });
        } else {
            // Map 0-100 temp to mireds (154-500 mireds range)
            const minMireds = 154; // ~6500K (cold)
            const maxMireds = 500; // ~2000K (warm)
            const mireds = Math.round(minMireds + ((100 - this.localTemp) / 100) * (maxMireds - minMireds));
            this._hass.callService('light', 'turn_on', {
                entity_id: this.config.entity,
                color_temp: mireds,
                brightness_pct: this.localBrightness
            });
        }
    }
  
    handleAction(action, value) {
      if (!this._hass || !this.config.entity) return;
      
      if (action === 'toggle') {
        this._hass.callService('light', 'toggle', {
          entity_id: this.config.entity
        });
      } else if (action === 'set_brightness') {
        this._hass.callService('light', 'turn_on', {
          entity_id: this.config.entity,
          brightness_pct: value
        });
      }
    }

    // Helpers
    hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = (n) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    hexToRgb(hex) {
        const bigint = parseInt(hex.substring(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return [r, g, b];
    }

    interpolateColor(color1, color2, factor) {
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
    
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
    
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));
    
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    getDisplayColor() {
        if (this.mode === 'color') return this.localColor;
        return this.interpolateColor('#ffb14e', '#cceeff', this.localTemp / 100);
    }

    updateWheelVisuals() {
        const center = this.shadowRoot.querySelector('#wheel-center-color');
        const text = this.shadowRoot.querySelector('#wheel-text');
        const iconColor = this.shadowRoot.querySelector('#wheel-icon');
        const color = this.getDisplayColor();
        
        if(center) center.style.backgroundColor = color;
        if(text) text.textContent = this.mode === 'color' ? this.localColor : (this.localTemp > 50 ? 'KALT' : 'WARM');
        if(text && this.mode === 'white') text.style.color = color;
        else if(text) text.style.color = '';
        
        // Also update power button and header icon live
        this.updateGlobalColors(color);
    }

    updateBrightnessVisuals() {
        const fill = this.shadowRoot.querySelector('#brightness-fill');
        const tip = this.shadowRoot.querySelector('#brightness-tip');
        const headerSub = this.shadowRoot.querySelector('#header-subtitle');
        
        if(fill) fill.style.width = `${this.localBrightness}%`;
        if(tip) tip.style.left = `${this.localBrightness}%`;
        if(headerSub) headerSub.textContent = `${this.localBrightness}% • ${this.mode === 'color' ? 'Farbe' : 'Weiß'}`;
        
        // Opacity updates
        const color = this.getDisplayColor();
        this.updateGlobalColors(color);
    }

    updateGlobalColors(color) {
        const powerBtn = this.shadowRoot.querySelector('#power-btn');
        const headerIcon = this.shadowRoot.querySelector('#header-icon-box');
        const opacity = 0.5 + (this.localBrightness / 200);
        
        if(powerBtn && this._entity && this._entity.state === 'on') {
            powerBtn.style.color = color;
            powerBtn.style.opacity = 0.6 + (this.localBrightness / 250);
        }
        const headerIconHaIcon = headerIcon ? headerIcon.querySelector('ha-icon') : null;
        if(headerIcon && this._entity && this._entity.state === 'on') {
            // Keep Neumorphism pressed style + add color glow
            headerIcon.style.background = 'linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1))';
            headerIcon.style.color = color;
            headerIcon.style.boxShadow = `inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03), 0 0 12px ${color}50`;
            if(headerIconHaIcon) headerIconHaIcon.style.filter = `drop-shadow(0 0 6px ${color})`;
        } else if(headerIcon) {
            // Reset to raised state when off
            headerIcon.style.background = 'linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1))';
            headerIcon.style.color = 'rgba(255,255,255,0.4)';
            headerIcon.style.boxShadow = '4px 4px 10px rgba(0, 0, 0, 0.5), -2px -2px 6px rgba(255, 255, 255, 0.03), inset 0 1px 2px rgba(255, 255, 255, 0.05)';
            if(headerIconHaIcon) headerIconHaIcon.style.filter = 'none';
        }
    }
  
    render() {
      if (!this.config) return;
      
      // Render preview even if entity doesn't exist
      const state = this._entity ? this._entity.state : 'off';
      const isOn = state === 'on';
      const name = this.config.name || (this._entity ? this._entity.attributes.friendly_name : null) || 'LED';
      const color = this.getDisplayColor();
      
      // Set defaults for preview
      if (!this._entity) {
        this.localBrightness = 50;
        this.localColor = '#ff9500';
        this.mode = 'color';
      }
      
      const wheelGradient = this.mode === 'color' 
        ? 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
        : 'conic-gradient(from 0deg, #aaddff, #cceeff, #ffffff, #ffdcb4, #ffb14e, #ffdcb4, #ffffff, #cceeff, #aaddff)';

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .card {
            background: rgba(30, 32, 36, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.05);
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            border-bottom: 1px solid rgba(0, 0, 0, 0.4);
            box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3);
            padding: 20px;
            color: white;
            user-select: none;
            box-sizing: border-box;
            display: flex; flex-direction: column; gap: 20px;
          }
          
          /* Header */
          .header {
              display: flex; justify-content: space-between; align-items: center;
          }
          .header-left { display: flex; align-items: center; gap: 12px; }
          
          .icon-box {
              width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
              background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1)); 
              color: rgba(255,255,255,0.4);
              display: flex; align-items: center; justify-content: center;
              transition: all 0.5s ease;
              box-shadow: 
                  4px 4px 10px rgba(0, 0, 0, 0.5),
                  -2px -2px 6px rgba(255, 255, 255, 0.03),
                  inset 0 1px 2px rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .icon-box ha-icon {
              width: 22px; height: 22px; --mdc-icon-size: 22px;
          }
          .icon-box.active {
              background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
              box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03);
          }
          .icon-box.active ha-icon {
              filter: drop-shadow(0 0 6px currentColor);
          }
          
          .info { display: flex; flex-direction: column; }
          .title { font-size: 1.125rem; font-weight: 700; color: rgba(255, 255, 255, 0.9); line-height: 1; }
          .subtitle { font-size: 0.75rem; font-weight: 500; color: rgba(255, 255, 255, 0.6); margin-top: 4px; }
          
          .power-btn {
              width: 48px; height: 48px; border-radius: 16px;
              display: flex; align-items: center; justify-content: center;
              transition: all 0.2s; cursor: pointer;
              background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
              color: rgba(255,255,255,0.4);
              border: 1px solid rgba(255,255,255,0.05);
              box-shadow: 
                  4px 4px 10px rgba(0, 0, 0, 0.5),
                  -2px -2px 6px rgba(255, 255, 255, 0.03),
                  inset 0 1px 2px rgba(255, 255, 255, 0.05);
          }
          .power-btn ha-icon {
              width: 22px;
              height: 22px;
              --mdc-icon-size: 22px;
              display: flex;
              align-items: center;
              justify-content: center;
          }
          .power-btn.active {
              background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
              box-shadow: inset 3px 3px 8px rgba(0,0,0,0.7), inset -2px -2px 4px rgba(255,255,255,0.03);
          }
          .power-btn.active ha-icon {
              filter: drop-shadow(0 0 6px currentColor);
          }
          .power-btn:hover:not(.active) { 
              background: linear-gradient(145deg, rgba(40, 43, 50, 1), rgba(32, 34, 40, 1));
          }
          
          /* Mode Switcher */
          .mode-switch {
              display: flex; padding: 4px; 
              background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
              box-shadow: inset 3px 3px 8px rgba(0,0,0,0.7), inset -2px -2px 4px rgba(255,255,255,0.03);
              border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);
              position: relative;
          }
          .mode-btn {
              flex: 1; padding: 6px; border-radius: 8px; text-align: center;
              font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
              cursor: pointer; transition: all 0.2s; color: rgba(255,255,255,0.4);
              background: transparent;
          }
          .mode-btn:hover:not(.active) {
              color: rgba(255,255,255,0.7);
          }
          .mode-btn.active {
              background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
              box-shadow: 
                  2px 2px 6px rgba(0, 0, 0, 0.4),
                  -1px -1px 3px rgba(255, 255, 255, 0.02);
              color: white;
          }
          
          /* Wheel - Neumorphism Recessed Design */
          .wheel-container {
              width: 200px;
              height: 200px;
              margin: 0 auto;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              touch-action: none;
              /* Deep Neumorphism Inlet */
              background: linear-gradient(145deg, rgba(18, 20, 24, 1), rgba(26, 28, 32, 1));
              border-radius: 50%;
              box-shadow: 
                  inset 8px 8px 20px rgba(0, 0, 0, 0.9),
                  inset -6px -6px 16px rgba(255, 255, 255, 0.03),
                  0 4px 8px rgba(0, 0, 0, 0.4);
              border: 1px solid rgba(0, 0, 0, 0.3);
          }
          
          /* Color Ring - Thin outer ring */
          .wheel-ring {
              position: absolute;
              inset: 10px;
              border-radius: 50%;
              transition: all 0.5s;
              background: ${wheelGradient};
              ${!isOn ? 'opacity: 0.15; filter: grayscale(1);' : ''}
              /* Create ring effect with mask */
              -webkit-mask: radial-gradient(transparent 62%, black 63%);
              mask: radial-gradient(transparent 62%, black 63%);
          }
          
          /* Subtle shine overlay */
          .wheel-shine {
              position: absolute;
              inset: 10px;
              border-radius: 50%;
              background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%);
              pointer-events: none;
              -webkit-mask: radial-gradient(transparent 62%, black 63%);
              mask: radial-gradient(transparent 62%, black 63%);
          }
          
          /* Center - Large color preview with Neumorphism */
          .wheel-center {
              position: absolute;
              width: 120px;
              height: 120px;
              border-radius: 50%;
              background: linear-gradient(145deg, rgba(28, 30, 36, 1), rgba(22, 24, 28, 1));
              box-shadow: 
                  6px 6px 14px rgba(0, 0, 0, 0.6),
                  -4px -4px 10px rgba(255, 255, 255, 0.025),
                  inset 0 1px 1px rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.04);
              z-index: 10;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 6px;
              overflow: hidden;
          }
          
          /* Color preview background glow */
          .wheel-center-bg {
              position: absolute;
              inset: -20px;
              border-radius: 50%;
              transition: all 0.4s ease;
              opacity: 0;
              filter: blur(25px);
              ${isOn ? 'opacity: 0.35;' : ''}
              background-color: ${color};
          }
          
          /* Inner color indicator ring */
          .wheel-center::after {
              content: '';
              position: absolute;
              inset: 6px;
              border-radius: 50%;
              border: 2px solid ${isOn ? color : 'rgba(255,255,255,0.1)'};
              opacity: ${isOn ? '0.6' : '0.2'};
              transition: all 0.4s ease;
              ${isOn ? `box-shadow: 0 0 15px ${color}40, inset 0 0 10px ${color}20;` : ''}
          }
          
          .wheel-icon {
              color: ${isOn ? color : 'rgba(255,255,255,0.4)'};
              width: 28px;
              height: 28px;
              z-index: 2;
              transition: all 0.3s ease;
              ${isOn ? `filter: drop-shadow(0 0 8px ${color}80);` : ''}
          }
          
          .wheel-text {
              font-size: 11px;
              font-family: 'SF Mono', 'Roboto Mono', monospace;
              color: ${isOn ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)'};
              text-transform: uppercase;
              letter-spacing: 1px;
              z-index: 2;
              transition: all 0.3s ease;
          }
          
          /* Brightness */
          .brightness-container {
              display: flex; align-items: center; gap: 12px;
          }
          .slider {
              flex: 1; height: 32px; border-radius: 12px;
              background: rgba(20, 20, 20, 0.8);
              box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
              border-top: 1px solid rgba(0,0,0,0.2);
              position: relative; overflow: hidden; cursor: pointer;
          }
          .slider-fill {
              position: absolute; top: 0; bottom: 0; left: 0;
              background: rgba(255,255,255,0.1); width: ${this.localBrightness}%;
          }
          .slider-tip {
              position: absolute; top: 0; bottom: 0; width: 2px;
              background: rgba(255,255,255,0.5); 
              box-shadow: 0 0 10px rgba(255,255,255,0.5);
              left: ${this.localBrightness}%;
          }
          .range-input {
              position: absolute; inset: 0; width: 100%; height: 100%;
              opacity: 0; cursor: pointer;
          }

        </style>
        
        <div class="card">
          
          <div class="header">
              <div class="header-left">
                  <div class="icon-box" id="header-icon-box">
                      <ha-icon icon="mdi:lightbulb"></ha-icon>
                  </div>
                  <div class="info">
                      <div class="title">${name}</div>
                      <div class="subtitle" id="header-subtitle">${isOn ? `${this.localBrightness}% • ${this.mode === 'color' ? 'Farbe' : 'Weiß'}` : "Ausgeschaltet"}</div>
                  </div>
              </div>
              
              <div id="power-btn" class="power-btn ${isOn ? 'active' : ''}">
                  <ha-icon icon="mdi:power"></ha-icon>
              </div>
          </div>
          
          <div class="mode-switch">
              <div class="mode-btn ${this.mode === 'color' ? 'active' : ''}" data-mode="color">Farbe</div>
              <div class="mode-btn ${this.mode === 'white' ? 'active' : ''}" data-mode="white">Weiß</div>
          </div>
          
          <div class="wheel-container" id="color-wheel">
              <div class="wheel-ring"></div>
              <div class="wheel-shine"></div>
              
              <div class="wheel-center">
                  <div class="wheel-center-bg" id="wheel-center-color"></div>
                  <ha-icon icon="${this.mode === 'color' ? 'mdi:palette' : 'mdi:thermometer'}" class="wheel-icon" id="wheel-icon"></ha-icon>
                  ${isOn ? `<span class="wheel-text" id="wheel-text">${this.mode === 'color' ? this.localColor : (this.localTemp > 50 ? 'KALT' : 'WARM')}</span>` : ''}
              </div>
          </div>
          
          <div class="brightness-container">
              <ha-icon icon="mdi:weather-sunny" style="width: 16px; height: 16px; color: rgba(255,255,255,0.4);"></ha-icon>
              <div class="slider">
                  <div class="slider-fill" id="brightness-fill"></div>
                  <div class="slider-tip" id="brightness-tip"></div>
                  <input type="range" min="0" max="100" value="${this.localBrightness}" class="range-input" id="brightness-range">
              </div>
          </div>
  
        </div>
      `;
      
      this.setupListeners();
      // Apply initial dynamic colors
      this.updateGlobalColors(color);
      this.updateWheelVisuals();
    }
  }
  
  customElements.define('prism-led', PrismLedCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "prism-led",
    name: "Prism LED",
    preview: true,
    description: "A glassmorphism light card with color wheel and inlet controls"
  });

})();

// ============================================
// prism-led-light.js
// ============================================
(function() {
class PrismLedLightCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.isDragging = false;
      this.mode = 'color'; // 'color' or 'white'
      this.localBrightness = 0;
      this.localColor = '#ffffff';
      this.localTemp = 50; // 0-100
      this.userModeChange = false; // Track if user manually changed mode
      this.hasRendered = false;
    }

    static getStubConfig() {
      return { 
        entity: "light.example", 
        name: "LED"
      }
    }

    static getConfigForm() {
      return {
        schema: [
          {
            name: "entity",
            required: true,
            selector: { entity: { domain: "light" } }
          },
          {
            name: "name",
            selector: { text: {} }
          }
        ]
      };
    }
  
    setConfig(config) {
      // Allow preview mode without entity (for dashboard editor)
      this.config = { ...config };
      if (!this.config.entity) {
        // Set a default for preview
        this.config.entity = "light.example";
      }
      // Initialize preview values
      if (!this._hass) {
        this.localBrightness = 50;
        this.localColor = '#ff9500';
        this.mode = 'color';
        if (!this.hasRendered) {
          this.render();
          this.hasRendered = true;
          this.setupListeners();
        }
      }
    }
  
    set hass(hass) {
      this._hass = hass;
      if (this.config && this.config.entity) {
        const entity = hass.states[this.config.entity];
        this._entity = entity || null;
      
      // Update local state if not dragging
      if (!this.isDragging && this._entity) {
          const attr = this._entity.attributes;
          if (attr.brightness !== undefined) {
              this.localBrightness = Math.round((attr.brightness / 255) * 100);
          }
          // Only auto-update mode if user hasn't manually changed it
          if (!this.userModeChange) {
              // Try to determine mode and color from attributes
              if (attr.color_mode === 'color_temp') {
                  this.mode = 'white';
                  if (attr.color_temp !== undefined) {
                      // Map mireds to 0-100 (rough approximation: 154-500 mireds -> 0-100%)
                      const mireds = attr.color_temp;
                      const minMireds = 154; // ~6500K (cold)
                      const maxMireds = 500; // ~2000K (warm)
                      this.localTemp = Math.max(0, Math.min(100, ((mireds - minMireds) / (maxMireds - minMireds)) * 100));
                  }
              } else {
                  this.mode = 'color';
                  if (attr.rgb_color && Array.isArray(attr.rgb_color) && attr.rgb_color.length >= 3) {
                      const [r, g, b] = attr.rgb_color;
                      this.localColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                  }
              }
          }
      }
      }
      
      if (!this.hasRendered) {
        this.render();
        this.hasRendered = true;
        this.setupListeners();
      } else {
        this.render();
      }
    }
  
    getCardSize() {
      return 3;
    }
  
    connectedCallback() {
      // Always render if config exists, even without hass (for preview)
      if (this.config) {
        if (!this.hasRendered) {
          this.render();
          this.hasRendered = true;
          this.setupListeners();
        }
      } else if (this.shadowRoot && !this.shadowRoot.innerHTML) {
        // Render stub config for preview
        this.config = PrismLedLightCard.getStubConfig();
        this.render();
        this.hasRendered = true;
        this.setupListeners();
      }
    }
  
    setupListeners() {
        const root = this.shadowRoot;
        
        // Power Toggle
        const powerBtn = root.querySelector('#power-btn');
        if(powerBtn) {
            powerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleAction('toggle');
            });
        }

        // Mode Switcher
        root.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.mode = e.currentTarget.dataset.mode;
                this.userModeChange = true; // Mark that user manually changed mode
                this.render();
            });
        });

        // Wheel Interaction
        const wheel = root.querySelector('#color-wheel');
        if(wheel) {
            const handleMove = (e) => {
                if(!this.isDragging) return;
                e.preventDefault(); // Prevent scrolling
                this.handleWheelInteraction(e, wheel);
            };

            wheel.addEventListener('pointerdown', (e) => {
                this.isDragging = true;
                wheel.setPointerCapture(e.pointerId);
                this.handleWheelInteraction(e, wheel);
            });
            
            wheel.addEventListener('pointermove', handleMove);
            
            wheel.addEventListener('pointerup', (e) => {
                this.isDragging = false;
                wheel.releasePointerCapture(e.pointerId);
                // Finalize value (call service)
                this.dispatchLightUpdate();
            });
        }

        // Brightness Slider
        const range = root.querySelector('#brightness-range');
        if (range) {
            range.addEventListener('input', (e) => {
                this.localBrightness = parseInt(e.target.value);
                this.updateBrightnessVisuals();
            });
            range.addEventListener('change', (e) => {
                // Final commit
                this.handleAction('set_brightness', this.localBrightness);
            });
        }
    }

    handleWheelInteraction(e, wheel) {
        const rect = wheel.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        
        // Calculate angle (0 is Top)
        let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        if (this.mode === 'color') {
            this.localColor = this.hslToHex(angle, 100, 50);
        } else {
            // Symmetric Temp Mapping
            const distFromTop = angle > 180 ? 360 - angle : angle;
            const temp = 100 - (distFromTop / 180 * 100);
            this.localTemp = Math.max(0, Math.min(100, temp));
        }
        
        // Update visual parts of the wheel only (not full re-render to keep it fast)
        this.updateWheelVisuals();
    }

    dispatchLightUpdate() {
        if (!this._hass || !this.config.entity) return;
        
        if (this.mode === 'color') {
            // Convert hex to RGB and call light.turn_on
            const rgb = this.hexToRgb(this.localColor);
            this._hass.callService('light', 'turn_on', {
                entity_id: this.config.entity,
                rgb_color: rgb,
                brightness_pct: this.localBrightness
            });
        } else {
            // Map 0-100 temp to mireds (154-500 mireds range)
            const minMireds = 154; // ~6500K (cold)
            const maxMireds = 500; // ~2000K (warm)
            const mireds = Math.round(minMireds + ((100 - this.localTemp) / 100) * (maxMireds - minMireds));
            this._hass.callService('light', 'turn_on', {
                entity_id: this.config.entity,
                color_temp: mireds,
                brightness_pct: this.localBrightness
            });
        }
    }
  
    handleAction(action, value) {
      if (!this._hass || !this.config.entity) return;
      
      if (action === 'toggle') {
        this._hass.callService('light', 'toggle', {
          entity_id: this.config.entity
        });
      } else if (action === 'set_brightness') {
        this._hass.callService('light', 'turn_on', {
          entity_id: this.config.entity,
          brightness_pct: value
        });
      }
    }

    // Helpers
    hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = (n) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    hexToRgb(hex) {
        const bigint = parseInt(hex.substring(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return [r, g, b];
    }

    interpolateColor(color1, color2, factor) {
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
    
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
    
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));
    
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    getDisplayColor() {
        if (this.mode === 'color') return this.localColor;
        return this.interpolateColor('#ffb14e', '#cceeff', this.localTemp / 100);
    }

    updateWheelVisuals() {
        const center = this.shadowRoot.querySelector('#wheel-center-color');
        const text = this.shadowRoot.querySelector('#wheel-text');
        const iconColor = this.shadowRoot.querySelector('#wheel-icon');
        const color = this.getDisplayColor();
        
        if(center) center.style.backgroundColor = color;
        if(text) text.textContent = this.mode === 'color' ? this.localColor : (this.localTemp > 50 ? 'KALT' : 'WARM');
        if(text && this.mode === 'white') text.style.color = color;
        else if(text) text.style.color = '';
        
        // Also update power button and header icon live
        this.updateGlobalColors(color);
    }

    updateBrightnessVisuals() {
        const fill = this.shadowRoot.querySelector('#brightness-fill');
        const tip = this.shadowRoot.querySelector('#brightness-tip');
        const headerSub = this.shadowRoot.querySelector('#header-subtitle');
        
        if(fill) fill.style.width = `${this.localBrightness}%`;
        if(tip) tip.style.left = `${this.localBrightness}%`;
        if(headerSub) headerSub.textContent = `${this.localBrightness}% • ${this.mode === 'color' ? 'Farbe' : 'Weiß'}`;
        
        // Opacity updates
        const color = this.getDisplayColor();
        this.updateGlobalColors(color);
    }

    updateGlobalColors(color) {
        const powerBtn = this.shadowRoot.querySelector('#power-btn');
        const headerIcon = this.shadowRoot.querySelector('#header-icon-box');
        const opacity = 0.5 + (this.localBrightness / 200);
        
        if(powerBtn && this._entity && this._entity.state === 'on') {
            powerBtn.style.color = color;
            powerBtn.style.opacity = 0.6 + (this.localBrightness / 250);
        }
        if(headerIcon && this._entity && this._entity.state === 'on') {
            headerIcon.style.backgroundColor = `${color}33`;
            headerIcon.style.color = color;
            headerIcon.style.boxShadow = `0 0 15px ${color}66`;
            headerIcon.style.opacity = opacity;
        }
    }
  
    render() {
      if (!this.config) return;
      
      // Render preview even if entity doesn't exist
      const state = this._entity ? this._entity.state : 'off';
      const isOn = state === 'on';
      const name = this.config.name || (this._entity ? this._entity.attributes.friendly_name : null) || 'LED';
      const color = this.getDisplayColor();
      
      // Set defaults for preview
      if (!this._entity) {
        this.localBrightness = 50;
        this.localColor = '#ff9500';
        this.mode = 'color';
      }
      
      const wheelGradient = this.mode === 'color' 
        ? 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
        : 'conic-gradient(from 0deg, #aaddff, #cceeff, #ffffff, #ffdcb4, #ffb14e, #ffdcb4, #ffffff, #cceeff, #aaddff)';

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .card {
            background: rgba(255, 255, 255, 0.65);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.6);
            border-top: 1px solid rgba(255, 255, 255, 0.9);
            border-bottom: 1px solid rgba(0, 0, 0, 0.15);
            box-shadow: 
              0 10px 30px -5px rgba(0, 0, 0, 0.15),
              0 4px 10px rgba(0,0,0,0.08),
              inset 0 1px 1px rgba(255,255,255,0.9);
            padding: 20px;
            color: #1a1a1a;
            user-select: none;
            box-sizing: border-box;
            display: flex; flex-direction: column; gap: 20px;
          }
          
          /* Header */
          .header {
              display: flex; justify-content: space-between; align-items: flex-start;
          }
          .header-left { display: flex; align-items: center; gap: 12px; }
          
          .icon-box {
              width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
              background: rgba(0,0,0,0.05); 
              color: rgba(0,0,0,0.4);
              display: flex; align-items: center; justify-content: center;
              transition: all 0.5s ease;
          }
          .icon-box ha-icon {
              width: 22px; height: 22px; --mdc-icon-size: 22px;
          }
          
          .info { display: flex; flex-direction: column; }
          .title { font-size: 1.125rem; font-weight: 700; color: #1a1a1a; line-height: 1; }
          .subtitle { font-size: 0.75rem; font-weight: 500; color: #666; margin-top: 4px; }
          
          .power-btn {
              width: 48px; height: 48px; border-radius: 16px;
              display: flex; align-items: center; justify-content: center;
              transition: all 0.2s; cursor: pointer;
              background: rgba(0,0,0,0.03);
              color: rgba(0,0,0,0.4);
              border: 1px solid rgba(0,0,0,0.05);
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          }
          .power-btn ha-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
          }
          .power-btn.active {
              background: rgba(255, 255, 255, 0.9);
              box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1), inset -1px -1px 2px rgba(255,255,255,0.8);
              border-top: 1px solid rgba(255,255,255,0.6);
          }
          .power-btn:hover:not(.active) { background: rgba(0,0,0,0.05); }
          
          /* Mode Switcher */
          .mode-switch {
              display: flex; padding: 4px; background: rgba(240, 240, 240, 0.9);
              box-shadow: inset 2px 2px 5px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.1);
              border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);
              border-top: 1px solid rgba(255,255,255,0.6);
              position: relative;
          }
          .mode-btn {
              flex: 1; padding: 6px; border-radius: 8px; text-align: center;
              font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
              cursor: pointer; transition: all 0.2s; color: rgba(0,0,0,0.4);
              background: transparent;
          }
          .mode-btn.active {
              background: linear-gradient(145deg, #e6e6e6, #f0f0f0);
              box-shadow: 
                inset 3px 3px 6px rgba(0,0,0,0.1),
                inset -2px -2px 4px rgba(255,255,255,0.9);
              border: 1px solid rgba(0,0,0,0.05);
              color: #1a1a1a;
          }
          
          /* Wheel */
          .wheel-container {
              width: 100%; aspect-ratio: 1; max-height: 180px; margin: 0 auto;
              position: relative; display: flex; align-items: center; justify-content: center;
              cursor: pointer; touch-action: none;
          }
          .wheel-ring {
              position: absolute; inset: 0; border-radius: 50%;
              transition: all 0.5s;
              background: ${wheelGradient};
              ${!isOn ? 'opacity: 0.2; filter: grayscale(1);' : ''}
              box-shadow: ${isOn ? '0 10px 30px -5px rgba(0,0,0,0.6), 0 0 20px -5px rgba(0,0,0,0.3)' : 'none'};
          }
          .wheel-shine {
              position: absolute; inset: 0; border-radius: 50%;
              background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
              pointer-events: none;
          }
          .wheel-center {
              position: absolute; width: 50%; height: 50%; border-radius: 50%;
              background: #f5f5f5;
              box-shadow: 0 5px 15px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.8), inset 0 1px 1px rgba(0,0,0,0.1);
              border: 1px solid rgba(0,0,0,0.05);
              z-index: 10;
              display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
          }
          .wheel-center-bg {
              position: absolute; inset: 0; border-radius: 50%;
              transition: all 0.3s; opacity: 0; filter: blur(12px);
              ${isOn ? 'opacity: 0.2;' : ''}
              background-color: ${color};
          }
          .wheel-icon {
              color: rgba(0,0,0,0.7); width: 24px; height: 24px; z-index: 2;
          }
          .wheel-text {
              font-size: 10px; font-family: monospace; color: rgba(0,0,0,0.4); text-transform: uppercase; z-index: 2;
          }
          
          /* Brightness */
          .brightness-container {
              display: flex; align-items: center; gap: 12px;
          }
          .slider {
              flex: 1; height: 32px; border-radius: 12px;
              background: rgba(240, 240, 240, 0.9);
              box-shadow: inset 2px 2px 5px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.1);
              border-top: 1px solid rgba(255,255,255,0.6);
              position: relative; overflow: hidden; cursor: pointer;
          }
          .slider-fill {
              position: absolute; top: 0; bottom: 0; left: 0;
              background: rgba(0,0,0,0.1); width: ${this.localBrightness}%;
          }
          .slider-tip {
              position: absolute; top: 0; bottom: 0; width: 2px;
              background: rgba(0,0,0,0.5); 
              box-shadow: 0 0 10px rgba(0,0,0,0.3);
              left: ${this.localBrightness}%;
          }
          .range-input {
              position: absolute; inset: 0; width: 100%; height: 100%;
              opacity: 0; cursor: pointer;
          }

        </style>
        
        <div class="card">
          
          <div class="header">
              <div class="header-left">
                  <div class="icon-box" id="header-icon-box">
                      <ha-icon icon="mdi:lightbulb" style="width: 20px; height: 20px;"></ha-icon>
                  </div>
                  <div class="info">
                      <div class="title">${name}</div>
                      <div class="subtitle" id="header-subtitle">${isOn ? `${this.localBrightness}% • ${this.mode === 'color' ? 'Farbe' : 'Weiß'}` : "Ausgeschaltet"}</div>
                  </div>
              </div>
              
              <div id="power-btn" class="power-btn ${isOn ? 'active' : ''}">
                  <ha-icon icon="mdi:power" style="width: 20px; height: 20px;"></ha-icon>
              </div>
          </div>
          
          <div class="mode-switch">
              <div class="mode-btn ${this.mode === 'color' ? 'active' : ''}" data-mode="color">Farbe</div>
              <div class="mode-btn ${this.mode === 'white' ? 'active' : ''}" data-mode="white">Weiß</div>
          </div>
          
          <div class="wheel-container" id="color-wheel">
              <div class="wheel-ring"></div>
              <div class="wheel-shine"></div>
              
              <div class="wheel-center">
                  <div class="wheel-center-bg" id="wheel-center-color"></div>
                  <ha-icon icon="${this.mode === 'color' ? 'mdi:palette' : 'mdi:thermometer'}" class="wheel-icon" id="wheel-icon"></ha-icon>
                  ${isOn ? `<span class="wheel-text" id="wheel-text">${this.mode === 'color' ? this.localColor : (this.localTemp > 50 ? 'KALT' : 'WARM')}</span>` : ''}
              </div>
          </div>
          
          <div class="brightness-container">
              <ha-icon icon="mdi:weather-sunny" style="width: 16px; height: 16px; color: rgba(0,0,0,0.4);"></ha-icon>
              <div class="slider">
                  <div class="slider-fill" id="brightness-fill"></div>
                  <div class="slider-tip" id="brightness-tip"></div>
                  <input type="range" min="0" max="100" value="${this.localBrightness}" class="range-input" id="brightness-range">
              </div>
          </div>
  
        </div>
      `;
      
      this.setupListeners();
      // Apply initial dynamic colors
      this.updateGlobalColors(color);
      this.updateWheelVisuals();
    }
  }
  
  customElements.define('prism-led-light', PrismLedLightCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "prism-led-light",
    name: "Prism LED Light",
    preview: true,
    description: "A glassmorphism light card with color wheel and inlet controls (light theme)"
  });

})();

// ============================================
// prism-sidebar.js
// ============================================
(function() {
class PrismSidebarCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.timer = null;
        this.cameraTimer = null;
        this.hasRendered = false;
        this.currentCameraIndex = 0;
        this.cameraEntities = [];
        this.temperatureHistory = [];
        this.temperatureHistoryWithTime = []; // Store data with timestamps
        this.historyLoading = false;
        this.forecastSubscriber = null; // For weather forecast subscription
    }

    static getStubConfig() {
        return {
            camera_entity: "camera.example",
            camera_entity_2: "",
            camera_entity_3: "",
            rotation_interval: 10,
            temperature_entity: "sensor.outdoor_temperature",
            weather_entity: "weather.example",
            forecast_days: 3,
            grid_entity: "sensor.example",
            solar_entity: "sensor.example",
            home_entity: "sensor.example",
            calendar_entity: "calendar.example"
        };
    }

    static getConfigForm() {
        return {
            schema: [
                {
                    name: "camera_entity",
                    label: "Camera entity",
                    selector: { entity: { domain: "camera" } }
                },
                {
                    name: "camera_entity_2",
                    label: "Camera entity 2",
                    selector: { entity: { domain: "camera" } }
                },
                {
                    name: "camera_entity_3",
                    label: "Camera entity 3",
                    selector: { entity: { domain: "camera" } }
                },
                {
                    name: "rotation_interval",
                    label: "Rotation interval",
                    selector: { number: { min: 3, max: 60, step: 1, unit_of_measurement: "Sekunden" } },
                    default: 10
                },
                {
                    name: "temperature_entity",
                    label: "Temperature entity",
                    selector: { entity: { domain: "sensor" } }
                },
                {
                    name: "weather_entity",
                    label: "Weather entity",
                    selector: { entity: { domain: "weather" } }
                },
                {
                    name: "forecast_days",
                    label: "Forecast days",
                    selector: { number: { min: 1, max: 7, step: 1, unit_of_measurement: "Tage" } },
                    default: 3
                },
                {
                    name: "grid_entity",
                    label: "Grid entity",
                    selector: { entity: {} }
                },
                {
                    name: "solar_entity",
                    label: "Solar entity",
                    selector: { entity: {} }
                },
                {
                    name: "home_entity",
                    label: "Home entity",
                    selector: { entity: {} }
                },
                {
                    name: "calendar_entity",
                    label: "Calendar entity",
                    selector: { entity: { domain: "calendar" } }
                }
            ]
        };
    }

    setConfig(config) {
        // Store previous config values to detect changes
        const prevWeatherEntity = this.weatherEntity;
        const prevForecastDays = this.forecastDays;
        const prevTemperatureEntity = this.temperatureEntity;
        
        this.config = { ...config };
        // Default entities if not provided
        this.temperatureEntity = this.config.temperature_entity || 'sensor.outdoor_temperature';
        this.weatherEntity = this.config.weather_entity || 'weather.example';
        this.gridEntity = this.config.grid_entity || 'sensor.example';
        this.solarEntity = this.config.solar_entity || 'sensor.example';
        this.homeEntity = this.config.home_entity || 'sensor.example';
        this.calendarEntity = this.config.calendar_entity || 'calendar.example';
        
        // Build camera entities array (only include non-empty entities)
        this.cameraEntities = [];
        if (this.config.camera_entity) {
            this.cameraEntities.push(this.config.camera_entity);
        }
        if (this.config.camera_entity_2) {
            this.cameraEntities.push(this.config.camera_entity_2);
        }
        if (this.config.camera_entity_3) {
            this.cameraEntities.push(this.config.camera_entity_3);
        }
        // Fallback to default if no cameras configured
        if (this.cameraEntities.length === 0) {
            this.cameraEntities.push('camera.example');
        }
        
        // Get rotation interval (default 10 seconds)
        this.rotationInterval = (this.config.rotation_interval && this.config.rotation_interval >= 3) 
            ? this.config.rotation_interval * 1000 
            : 10000; // Default 10 seconds
        
        // Get forecast days (default 3)
        this.forecastDays = this.config.forecast_days || 3;
        
        // Reset camera index
        this.currentCameraIndex = 0;
        
        // Stop existing camera rotation timer
        if (this.cameraTimer) {
            clearInterval(this.cameraTimer);
            this.cameraTimer = null;
        }
        
        // Check if important config changed that requires full re-render
        const needsRerender = prevWeatherEntity !== this.weatherEntity || 
                             prevForecastDays !== this.forecastDays ||
                             prevTemperatureEntity !== this.temperatureEntity;
        
        // Force re-render when config changes (important for forecast_days or entity changes)
        if (this.hasRendered && needsRerender) {
            // Reset temperature history if entity changed
            if (prevTemperatureEntity !== this.temperatureEntity) {
                this.temperatureHistory = [];
                this.historyLoading = false;
            }
            this.hasRendered = false;
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
            if (this._hass) {
                // Fetch new temperature history if entity changed
                if (prevTemperatureEntity !== this.temperatureEntity) {
                    this.fetchTemperatureHistory();
                }
                this.updateValues();
            }
        } else if (this.hasRendered) {
            // Minor changes, just update values
            this.startCameraRotation();
            if (this._hass) {
                this.updateValues();
            }
        } else if (!this._hass) {
        // Initialize preview values
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
        }
    }

    set hass(hass) {
        this._hass = hass;
        if (!this.hasRendered) {
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
            this.fetchTemperatureHistory();
            // Initial forecast update
            setTimeout(() => this.updateForecastGrid(), 100);
        } else {
            this.updateValues();
        }
    }

    connectedCallback() {
        if (this.config && !this.hasRendered) {
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
        }
    }

    disconnectedCallback() {
        if (this.timer) clearInterval(this.timer);
        if (this.cameraTimer) clearInterval(this.cameraTimer);
        // Unsubscribe from forecast
        if (this.forecastSubscriber) {
            this.forecastSubscriber().catch(() => {});
            this.forecastSubscriber = null;
        }
    }

    startClock() {
        if (this.timer) clearInterval(this.timer);
        this.updateClock(); // Initial
        this.timer = setInterval(() => this.updateClock(), 1000);
    }

    startCameraRotation() {
        // Only rotate if we have more than one camera
        if (this.cameraEntities.length > 1) {
            if (this.cameraTimer) clearInterval(this.cameraTimer);
            this.cameraTimer = setInterval(() => {
                this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameraEntities.length;
                this.updateCamera();
            }, this.rotationInterval);
        }
    }

    getCurrentCameraEntity() {
        if (this.cameraEntities.length === 0) return 'camera.example';
        return this.cameraEntities[this.currentCameraIndex];
    }

    updateCamera() {
        if (!this._hass) return;
        
        const cameraEntity = this.getCurrentCameraEntity();
        const cameraState = this._hass.states[cameraEntity];
        
        const camImgEl = this.shadowRoot?.querySelector('.camera-img');
        const camNameEl = this.shadowRoot?.getElementById('cam-name');
        const cameraBox = this.shadowRoot?.getElementById('camera-box');
        
        if (camImgEl && cameraState) {
            const entityPicture = cameraState.attributes.entity_picture;
            if (entityPicture) {
                camImgEl.src = entityPicture;
            }
        } else if (camImgEl) {
            // Fallback to default image
            camImgEl.src = 'https://images.unsplash.com/photo-1558435186-d31d1eb6fa3c?q=80&w=600&auto=format&fit=crop';
        }

        if (camNameEl && cameraState) {
            camNameEl.textContent = cameraState.attributes.friendly_name || cameraEntity.split('.')[1];
        } else if (camNameEl) {
            camNameEl.textContent = cameraEntity.split('.')[1] || 'Camera';
        }

        // Update click handler
        if (cameraBox) {
            // Remove old listener and add new one
            const newBox = cameraBox.cloneNode(true);
            cameraBox.parentNode.replaceChild(newBox, cameraBox);
            newBox.addEventListener('click', () => this._handleCameraClick());
        }
    }

    updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' });
        
        const timeEl = this.shadowRoot?.getElementById('clock-time');
        const dateEl = this.shadowRoot?.getElementById('clock-date');
        
        if (timeEl) timeEl.textContent = timeStr;
        if (dateEl) dateEl.textContent = dateStr;
    }

    async updateValues() {
        if (!this._hass) return;
        
        // Update Grid/Solar/Home values if entities exist
        const gridState = this._hass.states[this.gridEntity];
        const solarState = this._hass.states[this.solarEntity];
        const homeState = this._hass.states[this.homeEntity];
        const weatherState = this._hass.states[this.weatherEntity];
        const cameraEntity = this.getCurrentCameraEntity();
        const cameraState = this._hass.states[cameraEntity];
        const calendarState = this._hass.states[this.calendarEntity];

        const gridEl = this.shadowRoot?.getElementById('val-grid');
        const solarEl = this.shadowRoot?.getElementById('val-solar');
        const homeEl = this.shadowRoot?.getElementById('val-home');
        const tempEl = this.shadowRoot?.getElementById('val-temp');
        const camNameEl = this.shadowRoot?.getElementById('cam-name');
        const camImgEl = this.shadowRoot?.querySelector('.camera-img');
        const calTitleEl = this.shadowRoot?.getElementById('cal-title');
        const calSubEl = this.shadowRoot?.getElementById('cal-sub');
        const calIconEl = this.shadowRoot?.getElementById('cal-icon');

        if (gridEl && gridState) {
            gridEl.textContent = `${gridState.state} ${gridState.attributes.unit_of_measurement || 'kW'}`;
        }
        if (solarEl && solarState) {
            solarEl.textContent = `${solarState.state} ${solarState.attributes.unit_of_measurement || 'kW'}`;
        }
        if (homeEl && homeState) {
            homeEl.textContent = `${homeState.state} ${homeState.attributes.unit_of_measurement || 'kW'}`;
        }
        
        // Get temperature from the configured temperature entity, not weather
        const temperatureState = this._hass.states[this.temperatureEntity];
        if (tempEl && temperatureState) {
            tempEl.textContent = temperatureState.state || '0';
        }

        if (camImgEl && cameraState) {
            const entityPicture = cameraState.attributes.entity_picture;
            if (entityPicture) {
                camImgEl.src = entityPicture;
            }
        }

        if (camNameEl && cameraState) {
            camNameEl.textContent = cameraState.attributes.friendly_name || cameraEntity.split('.')[1];
        }

        // Update calendar
        if (calendarState && calendarState.attributes) {
            const attr = calendarState.attributes;
            if (calTitleEl && attr.message) {
                calTitleEl.textContent = attr.message;
            }
            if (calSubEl) {
                let subText = '';
                if (attr.all_day) {
                    subText = 'Ganztägig';
                } else if (attr.start_time) {
                    const date = new Date(attr.start_time);
                    subText = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                }
                if (attr.location) {
                    subText += subText ? ` • ${attr.location}` : attr.location;
                }
                calSubEl.textContent = subText || 'Kein Termin';
            }
            if (calIconEl && attr.start_time) {
                const date = new Date(attr.start_time);
                calIconEl.textContent = date.getDate().toString();
            }
        }

        // Update weather forecast - rebuild entire forecast grid
        this.updateForecastGrid();
    }

    // Check if weather entity supports forecast features (like clock-weather-card does)
    isLegacyWeather() {
        if (!this._hass || !this.weatherEntity) return true;
        const weatherState = this._hass.states[this.weatherEntity];
        if (!weatherState || !weatherState.attributes) return true;
        
        // WeatherEntityFeature.FORECAST_DAILY = 1, FORECAST_HOURLY = 2
        const supportedFeatures = weatherState.attributes.supported_features || 0;
        const supportsDaily = (supportedFeatures & 1) !== 0;
        const supportsHourly = (supportedFeatures & 2) !== 0;
        
        return !supportsDaily && !supportsHourly;
    }

    async updateForecastGrid() {
        if (!this._hass) return;
        
        const weatherState = this._hass.states[this.weatherEntity];
        const forecastGridEl = this.shadowRoot?.querySelector('.forecast-grid');
        
        if (!forecastGridEl || !weatherState) {
            console.warn('Prism Sidebar: Missing forecast grid or weather entity:', this.weatherEntity);
            return;
        }
        
        let forecast = [];
        
        // Check if legacy weather (has forecast in attributes) - like clock-weather-card does
        if (this.isLegacyWeather()) {
            // Legacy: Get forecast from attributes
            if (weatherState.attributes.forecast && weatherState.attributes.forecast.length > 0) {
                forecast = weatherState.attributes.forecast;
                console.log('Prism Sidebar: Using forecast from attributes (legacy)');
            }
        } else {
            // Modern: Use subscribeMessage (like clock-weather-card does)
            // Based on: https://github.com/pkissling/clock-weather-card
            try {
                console.log('Prism Sidebar: Subscribing to forecast via subscribeMessage for', this.weatherEntity);
                
                // Unsubscribe from previous subscription
                if (this.forecastSubscriber) {
                    try {
                        await this.forecastSubscriber();
                    } catch (e) {
                        // Ignore errors when unsubscribing
                    }
                    this.forecastSubscriber = null;
                }
                
                // Subscribe to forecast updates
                const callback = (event) => {
                    if (event && event.forecast && Array.isArray(event.forecast)) {
                        forecast = event.forecast;
                        this.renderForecastGrid(forecast, forecastGridEl);
                    }
                };
                
                const message = {
                    type: 'weather/subscribe_forecast',
                    forecast_type: 'daily',
                    entity_id: this.weatherEntity
                };
                
                this.forecastSubscriber = await this._hass.connection.subscribeMessage(callback, message, { resubscribe: false });
                console.log('Prism Sidebar: Successfully subscribed to forecast');
                
                // Wait a bit for the first callback
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error('Prism Sidebar: Error subscribing to forecast:', error);
                // Fallback to attributes if subscription fails
                if (weatherState.attributes.forecast && weatherState.attributes.forecast.length > 0) {
                    forecast = weatherState.attributes.forecast;
                    console.log('Prism Sidebar: Fallback to attributes after subscription error');
                }
            }
        }
        
        // Render forecast (either from attributes or from subscription)
        if (forecast && forecast.length > 0) {
            this.renderForecastGrid(forecast, forecastGridEl);
        } else {
            // Show helpful message if no forecast available
            console.warn('Prism Sidebar: No forecast data available for', this.weatherEntity);
            console.log('Prism Sidebar: Available weather attributes:', Object.keys(weatherState.attributes));
            console.log('Prism Sidebar: Supported features:', weatherState.attributes.supported_features);
            
            if (forecastGridEl) {
                forecastGridEl.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">
                        <div style="font-size: 12px; margin-bottom: 8px;">Forecast nicht verfügbar</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.3);">
                            ${this.weatherEntity}<br>
                            <small>Bitte verwende eine Weather-Integration, die Forecast unterstützt<br>
                            (z.B. Open-Meteo, Met.no, oder aktualisiere OpenWeatherMap)</small>
                        </div>
                    </div>
                `;
            }
        }
    }

    renderForecastGrid(forecast, forecastGridEl) {
        if (!forecast || !forecastGridEl) return;
        
        const forecastCount = this.forecastDays || 3;
        const forecastSlice = forecast.slice(0, forecastCount);
        
        console.log(`Prism Sidebar: Rendering forecast with ${forecastSlice.length} days`);
        
        // Rebuild the entire forecast grid
        forecastGridEl.innerHTML = forecastSlice.map((day, i) => {
            const date = day.datetime ? new Date(day.datetime) : new Date();
            const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
                    const iconMap = {
                        'sunny': 'mdi:weather-sunny',
                        'partlycloudy': 'mdi:weather-partly-cloudy',
                        'cloudy': 'mdi:cloud',
                        'rainy': 'mdi:weather-rainy',
                'snowy': 'mdi:weather-snowy',
                'pouring': 'mdi:weather-pouring',
                'lightning': 'mdi:weather-lightning',
                'fog': 'mdi:weather-fog',
                'windy': 'mdi:weather-windy',
                'clear-night': 'mdi:weather-night'
                    };
            const icon = iconMap[day.condition?.toLowerCase()] || 'mdi:weather-cloudy';
            const temp = day.temperature !== undefined ? day.temperature : (day.templow !== undefined ? day.templow : '0');
            const low = day.templow !== undefined ? day.templow : (day.temperature !== undefined ? day.temperature : '0');
            
            return `
                <div class="forecast-item">
                    <span class="day-name">${dayName}</span>
                    <ha-icon icon="${icon}" style="color: ${icon === 'mdi:weather-sunny' ? '#f59e0b' : 'rgba(255,255,255,0.8)'}; width: 20px;"></ha-icon>
                    <span class="day-temp">${temp}°</span>
                    <span class="day-low">${low}°</span>
                </div>
            `;
        }).join('');
    }

    convertHourlyToDaily(hourlyForecast) {
        if (!hourlyForecast || hourlyForecast.length === 0) return [];
        
        const dailyMap = new Map();
        
        hourlyForecast.forEach(hour => {
            if (!hour.datetime) return;
            const date = new Date(hour.datetime);
            const dayKey = date.toDateString(); // Group by day
            
            if (!dailyMap.has(dayKey)) {
                dailyMap.set(dayKey, {
                    datetime: hour.datetime,
                    condition: hour.condition,
                    temperature: hour.temperature,
                    templow: hour.temperature,
                    temps: [hour.temperature]
                });
            } else {
                const day = dailyMap.get(dayKey);
                day.temps.push(hour.temperature);
                day.temperature = Math.max(...day.temps); // High temp
                day.templow = Math.min(...day.temps); // Low temp
                // Use most common condition or latest
                if (hour.condition) {
                    day.condition = hour.condition;
                }
            }
        });
        
        return Array.from(dailyMap.values()).sort((a, b) => 
            new Date(a.datetime) - new Date(b.datetime)
        );
    }


    render() {
        // Use temperature history data for graph
        let graphData = [1.2, 1.5, 2.1, 2.8, 2.5, 1.9, 1.4, 1.0, 0.8]; // Default
        if (this.temperatureHistory && this.temperatureHistory.length > 0) {
            graphData = this.temperatureHistory;
        }
        const graphPaths = this.generateGraphPath(graphData, 280, 60);
        const graphFillPath = graphPaths.fill || '';
        const graphLinePath = graphPaths.line || '';

        // Get entity states for preview/display
        const cameraEntity = this.getCurrentCameraEntity();
        const cameraState = this._hass?.states[cameraEntity];
        const temperatureState = this._hass?.states[this.temperatureEntity];
        const weatherState = this._hass?.states[this.weatherEntity];
        const calendarState = this._hass?.states[this.calendarEntity];
        const gridState = this._hass?.states[this.gridEntity];
        const solarState = this._hass?.states[this.solarEntity];
        const homeState = this._hass?.states[this.homeEntity];

        const cameraImage = cameraState?.attributes?.entity_picture || 'https://images.unsplash.com/photo-1558435186-d31d1eb6fa3c?q=80&w=600&auto=format&fit=crop';
        const cameraName = cameraState?.attributes?.friendly_name || cameraEntity.split('.')[1] || 'Camera';
        const currentTemp = temperatureState?.state || '0';
        const calendarTitle = calendarState?.attributes?.message || 'Keine Termine';
        const calendarSub = calendarState?.attributes?.all_day ? 'Ganztägig' : 
                           (calendarState?.attributes?.start_time ? 
                            new Date(calendarState.attributes.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 
                            '');
        const calendarDate = calendarState?.attributes?.start_time ? 
                            new Date(calendarState.attributes.start_time).getDate() : 
                            new Date().getDate();
        const gridValue = gridState ? `${gridState.state} ${gridState.attributes.unit_of_measurement || 'kW'}` : '0 kW';
        const solarValue = solarState ? `${solarState.state} ${solarState.attributes.unit_of_measurement || 'kW'}` : '0 kW';
        const homeValue = homeState ? `${homeState.state} ${homeState.attributes.unit_of_measurement || 'kW'}` : '0 kW';

        // Get forecast (daily forecast for display)
        const forecastDays = this.forecastDays || 3;
        const forecast = weatherState?.attributes?.forecast?.slice(0, forecastDays) || [];

        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: system-ui, -apple-system, sans-serif;
                height: 100%;
                box-sizing: border-box;
            }
            .sidebar {
                width: 100%;
                height: 100%;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                padding: 24px;
                box-sizing: border-box;
                background: rgba(30, 32, 36, 0.8);
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                border-right: 1px solid rgba(255, 255, 255, 0.05);
                box-shadow: 10px 0 30px rgba(0,0,0,0.3);
                overflow-y: auto;
                overflow-x: hidden;
                color: white;
            }

            /* Camera */
            .camera-box {
                position: relative;
                width: 100%;
                aspect-ratio: 16/9;
                border-radius: 16px;
                overflow: hidden;
                margin-bottom: 32px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
                cursor: pointer;
                transition: transform 0.3s;
            }
            .camera-box:hover { transform: scale(1.02); }
            .camera-img {
                width: 100%; height: 100%; object-fit: cover;
            }
            .camera-overlay {
                position: absolute; inset: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.6), transparent, transparent);
            }
            .live-badge {
                position: absolute; top: 12px; left: 12px;
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(8px);
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 10px; font-weight: bold;
                color: white;
                display: flex; align-items: center; gap: 6px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .pulse {
                width: 6px; height: 6px; border-radius: 50%;
                background: #ef4444;
                box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
                animation: pulse 2s infinite;
            }
            .cam-name {
                position: absolute; bottom: 12px; right: 12px;
                font-size: 10px; font-family: monospace;
                color: rgba(255, 255, 255, 0.8);
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(8px);
                padding: 4px 8px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            /* Clock */
            .clock-box {
                display: flex; flex-direction: column; align-items: center;
                margin-bottom: 32px;
                position: relative;
            }
            .clock-glow {
                position: absolute; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 120px; height: 120px;
                background: rgba(255, 255, 255, 0.05);
                filter: blur(50px);
                border-radius: 50%;
                pointer-events: none;
            }
            .clock-time {
                font-size: 72px;
                font-weight: 700;
                letter-spacing: -4px;
                color: #e0e0e0;
                text-shadow: 2px 4px 8px rgba(0,0,0,0.5), -1px -1px 1px rgba(255,255,255,0.2);
                line-height: 1;
            }
            .clock-date {
                font-size: 14px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.6);
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-top: 8px;
            }

            /* Calendar Inlet */
            .calendar-inlet {
                position: relative;
                margin-bottom: 32px;
                padding: 16px;
                border-radius: 16px;
                background: rgba(20, 20, 20, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.05);
                box-shadow: inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.05);
                display: flex; align-items: center; gap: 16px;
                cursor: pointer;
                transition: background 0.3s;
            }
            .calendar-inlet:hover { background: rgba(20, 20, 20, 0.6); }
            .cal-icon {
                width: 40px; height: 40px; border-radius: 12px;
                background: #1e2024;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                border: 1px solid rgba(255, 255, 255, 0.05);
                display: flex; align-items: center; justify-content: center;
                font-weight: bold; font-size: 18px; color: #3b82f6;
            }
            .cal-info { display: flex; flex-direction: column; }
            .cal-title { font-weight: 500; color: white; line-height: 1.2; }
            .cal-sub { font-size: 12px; color: rgba(255, 255, 255, 0.4); margin-top: 2px; }

            /* Weather - Clean */
            .weather-box {
                display: flex; flex-direction: column;
                margin-bottom: auto; /* Push footer down */
            }
            .section-title {
                font-size: 12px; font-weight: 700; color: rgba(255, 255, 255, 0.3);
                text-transform: uppercase; letter-spacing: 2px;
                margin-bottom: 8px;
            }
            .current-temp-box {
                display: flex; align-items: center; justify-content: center;
                margin-bottom: 8px;
            }
            .temp-val { font-size: 48px; font-weight: 300; color: white; }
            .temp-unit { font-size: 20px; color: rgba(255, 255, 255, 0.4); margin-top: -10px; margin-left: 4px; }
            
            .graph-container {
                height: 80px; 
                width: 100%; 
                margin-bottom: 24px; 
                position: relative;
                padding: 12px 0;
                overflow: hidden;
                border-radius: 12px;
                background: rgba(20, 20, 20, 0.3);
                border: 1px solid rgba(59, 130, 246, 0.1);
            }
            .graph-container svg {
                display: block;
                width: 100%;
                height: 100%;
                overflow: visible;
            }
            .graph-container svg path {
                vector-effect: non-scaling-stroke;
                transition: all 0.3s ease;
            }
            .graph-tooltip {
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 1000;
                white-space: nowrap;
                border: 1px solid rgba(59, 130, 246, 0.5);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            .graph-tooltip.visible {
                opacity: 1;
            }
            .graph-tooltip-time {
                font-size: 10px;
                opacity: 0.7;
                margin-top: 2px;
            }
            .graph-point {
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .graph-point.visible {
                opacity: 1;
            }
            .forecast-grid {
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); 
                gap: 8px;
            }
            .forecast-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
            .day-name { font-size: 12px; color: rgba(255, 255, 255, 0.4); }
            .day-temp { font-size: 14px; font-weight: 700; color: white; }
            .day-low { font-size: 12px; color: rgba(255, 255, 255, 0.3); }

            /* Energy Footer */
            .energy-grid {
                display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
                margin-top: 24px;
            }
            .energy-pill {
                height: 64px;
                border-radius: 16px;
                background: rgba(20, 20, 20, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.05);
                box-shadow: inset 2px 2px 4px rgba(0,0,0,0.3);
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                cursor: pointer; transition: background 0.3s;
                padding-top: 8px;
                gap: 4px;
            }
            .energy-pill:hover { background: rgba(20, 20, 20, 0.6); }
            .pill-val { font-size: 12px; font-family: monospace; font-weight: bold; color: rgba(255, 255, 255, 0.9); }
            .pill-label { font-size: 9px; text-transform: uppercase; color: rgba(255, 255, 255, 0.3); margin-top: 2px; }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        </style>

        <div class="sidebar">
            
            <!-- Camera -->
            <div class="camera-box" id="camera-box">
                <img src="${cameraImage}" class="camera-img" />
                <div class="camera-overlay"></div>
                <div class="live-badge">
                    <div class="pulse"></div> LIVE
                </div>
                <div class="cam-name" id="cam-name">${cameraName}</div>
            </div>

            <!-- Clock -->
            <div class="clock-box">
                <div class="clock-glow"></div>
                <div class="clock-time" id="clock-time">08:12</div>
                <div class="clock-date" id="clock-date">Wednesday, 24. Dec</div>
            </div>

            <!-- Calendar Inlet -->
            <div class="calendar-inlet" id="calendar-inlet">
                <div class="cal-icon" id="cal-icon">${calendarDate}</div>
                <div class="cal-info">
                    <div class="cal-title" id="cal-title">${calendarTitle}</div>
                    <div class="cal-sub" id="cal-sub">${calendarSub}</div>
                </div>
            </div>

            <!-- Weather -->
            <div class="weather-box">
                <div class="section-title">Outdoor</div>
                <div class="current-temp-box">
                    <span class="temp-val" id="val-temp">${currentTemp}</span>
                    <span class="temp-unit">°C</span>
                </div>
                
                <div class="graph-container">
                    <svg width="100%" height="100%" viewBox="0 0 280 60" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="grad-sidebar-${Date.now()}" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.5" />
                                <stop offset="40%" style="stop-color:#3b82f6;stop-opacity:0.25" />
                                <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
                            </linearGradient>
                            <filter id="shadow-sidebar-${Date.now()}">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                                <feOffset dx="0" dy="1" result="offsetblur"/>
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.3"/>
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <!-- Fill area (closed path) -->
                        <path d="${graphFillPath}" 
                              fill="url(#grad-sidebar-${Date.now()})" 
                              stroke="none" 
                              opacity="0.9" />
                        <!-- Line only (no fill, just the curve) -->
                        <path d="${graphLinePath}" 
                              fill="none" 
                              stroke="#3b82f6" 
                              stroke-width="2.5" 
                              stroke-linecap="round" 
                              stroke-linejoin="round" 
                              filter="url(#shadow-sidebar-${Date.now()})" />
                        <!-- Hover point indicator -->
                        <circle class="graph-point" 
                                id="graph-hover-point" 
                                r="4" 
                                fill="#3b82f6" 
                                stroke="white" 
                                stroke-width="2" 
                                cx="0" 
                                cy="0" />
                        <!-- Transparent overlay for mouse events -->
                        <rect id="graph-overlay" 
                              width="280" 
                              height="60" 
                              fill="transparent" 
                              style="cursor: crosshair;" />
                    </svg>
                    <!-- Tooltip -->
                    <div class="graph-tooltip" id="graph-tooltip">
                        <div class="graph-tooltip-temp"></div>
                        <div class="graph-tooltip-time"></div>
                    </div>
                </div>

                <div class="forecast-grid">
                    ${forecast.map((day, i) => {
                        const date = day.datetime ? new Date(day.datetime) : new Date();
                        const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
                        const iconMap = {
                            'sunny': 'mdi:weather-sunny',
                            'partlycloudy': 'mdi:weather-partly-cloudy',
                            'cloudy': 'mdi:cloud',
                            'rainy': 'mdi:weather-rainy',
                            'snowy': 'mdi:weather-snowy'
                        };
                        const icon = iconMap[day.condition?.toLowerCase()] || 'mdi:weather-cloudy';
                        return `
                            <div class="forecast-item">
                                <span class="day-name" id="day-name-${i}">${dayName}</span>
                                <ha-icon icon="${icon}" id="day-icon-${i}" style="color: ${icon === 'mdi:weather-sunny' ? '#f59e0b' : 'rgba(255,255,255,0.8)'}; width: 20px;"></ha-icon>
                                <span class="day-temp" id="day-temp-${i}">${day.temperature !== undefined ? day.temperature : (day.templow !== undefined ? day.templow : '0')}°</span>
                                <span class="day-low" id="day-low-${i}">${day.templow !== undefined ? day.templow : (day.temperature !== undefined ? day.temperature : '0')}°</span>
                            </div>
                        `;
                    }).join('') || `
                        <div class="forecast-item">
                            <span class="day-name">Mi</span>
                            <ha-icon icon="mdi:weather-rainy" style="color: rgba(255,255,255,0.8); width: 20px;"></ha-icon>
                            <span class="day-temp">0,4°</span>
                            <span class="day-low">-1,4°</span>
                        </div>
                        <div class="forecast-item">
                            <span class="day-name">Do</span>
                            <ha-icon icon="mdi:cloud" style="color: rgba(255,255,255,0.8); width: 20px;"></ha-icon>
                            <span class="day-temp">2,6°</span>
                            <span class="day-low">-1,6°</span>
                        </div>
                        <div class="forecast-item">
                            <span class="day-name">Fr</span>
                            <ha-icon icon="mdi:weather-sunny" style="color: #f59e0b; width: 20px;"></ha-icon>
                            <span class="day-temp">4,1°</span>
                            <span class="day-low">-1,7°</span>
                        </div>
                    `}
                </div>
            </div>

            <!-- Energy Footer -->
            <div class="energy-grid">
                <div class="energy-pill" id="energy-grid">
                    <ha-icon icon="mdi:flash" style="width: 16px; height: 16px; color: rgba(255,255,255,0.3);"></ha-icon>
                    <span class="pill-val" id="val-grid">${gridValue}</span>
                    <span class="pill-label">Grid</span>
                </div>
                <div class="energy-pill" id="energy-solar">
                    <ha-icon icon="mdi:solar-power" style="width: 16px; height: 16px; color: rgba(255,255,255,0.3);"></ha-icon>
                    <span class="pill-val" id="val-solar">${solarValue}</span>
                    <span class="pill-label">Solar</span>
                </div>
                <div class="energy-pill" id="energy-home">
                    <ha-icon icon="mdi:home" style="width: 16px; height: 16px; color: rgba(255,255,255,0.3);"></ha-icon>
                    <span class="pill-val" id="val-home">${homeValue}</span>
                    <span class="pill-label">Home</span>
                </div>
            </div>

        </div>
        `;

        // Setup event listeners
        this.setupListeners();
    }

    setupListeners() {
        const cameraBox = this.shadowRoot?.getElementById('camera-box');
        const calendarInlet = this.shadowRoot?.getElementById('calendar-inlet');
        const energyGrid = this.shadowRoot?.getElementById('energy-grid');
        const energySolar = this.shadowRoot?.getElementById('energy-solar');
        const energyHome = this.shadowRoot?.getElementById('energy-home');
        const graphOverlay = this.shadowRoot?.getElementById('graph-overlay');

        if (cameraBox) {
            cameraBox.addEventListener('click', () => this._handleCameraClick());
        }
        if (calendarInlet) {
            calendarInlet.addEventListener('click', () => this._handleCalendarClick());
        }
        if (energyGrid) {
            energyGrid.addEventListener('click', () => this._handleEnergyClick(this.gridEntity));
        }
        if (energySolar) {
            energySolar.addEventListener('click', () => this._handleEnergyClick(this.solarEntity));
        }
        if (energyHome) {
            energyHome.addEventListener('click', () => this._handleEnergyClick(this.homeEntity));
        }
        
        // Graph hover events
        if (graphOverlay) {
            graphOverlay.addEventListener('mousemove', (e) => this._handleGraphHover(e));
            graphOverlay.addEventListener('mouseleave', () => this._handleGraphLeave());
        }
    }

    _handleCameraClick() {
        if (!this._hass) return;
        const cameraEntity = this.getCurrentCameraEntity();
        if (!cameraEntity) return;
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: cameraEntity }
        });
        this.dispatchEvent(event);
    }

    _handleCalendarClick() {
        if (!this._hass || !this.calendarEntity) return;
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: this.calendarEntity }
        });
        this.dispatchEvent(event);
    }

    _handleEnergyClick(entityId) {
        if (!this._hass || !entityId) return;
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: entityId }
        });
        this.dispatchEvent(event);
    }

    _handleGraphHover(e) {
        if (!this.temperatureHistoryWithTime || this.temperatureHistoryWithTime.length === 0) return;
        
        const svg = e.currentTarget.ownerSVGElement;
        if (!svg) return;
        
        // Get mouse position relative to SVG
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const svgWidth = 280;
        
        // Calculate which data point is closest
        const dataLength = this.temperatureHistoryWithTime.length;
        const stepX = dataLength > 1 ? svgWidth / (dataLength - 1) : 0;
        const index = Math.round(x / stepX);
        const clampedIndex = Math.max(0, Math.min(dataLength - 1, index));
        
        const dataPoint = this.temperatureHistoryWithTime[clampedIndex];
        if (!dataPoint) return;
        
        // Calculate Y position for the point (same logic as generateGraphPath)
        const graphData = this.temperatureHistory;
        const dataMax = Math.max(...graphData);
        const dataMin = Math.min(...graphData);
        const dataRange = dataMax - dataMin;
        const padding = Math.max(dataRange * 0.2, 2);
        const max = dataMax + padding;
        const min = dataMin - padding;
        const range = max - min;
        
        const normalized = (dataPoint.temp - min) / range;
        const margin = 60 * 0.05;
        const y = margin + (60 - 2 * margin) * (1 - normalized);
        const pointX = clampedIndex * stepX;
        
        // Update point position
        const point = this.shadowRoot?.getElementById('graph-hover-point');
        if (point) {
            point.setAttribute('cx', pointX);
            point.setAttribute('cy', y);
            point.classList.add('visible');
        }
        
        // Update tooltip
        const tooltip = this.shadowRoot?.getElementById('graph-tooltip');
        const tooltipTemp = tooltip?.querySelector('.graph-tooltip-temp');
        const tooltipTime = tooltip?.querySelector('.graph-tooltip-time');
        
        if (tooltip && tooltipTemp && tooltipTime) {
            tooltipTemp.textContent = `${dataPoint.temp.toFixed(1)}°C`;
            tooltipTime.textContent = dataPoint.time.toLocaleString('de-DE', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Position tooltip
            const tooltipRect = tooltip.getBoundingClientRect();
            let tooltipX = e.clientX - rect.left + 10;
            let tooltipY = e.clientY - rect.top - tooltipRect.height - 10;
            
            // Keep tooltip in bounds
            if (tooltipX + tooltipRect.width > rect.width) {
                tooltipX = e.clientX - rect.left - tooltipRect.width - 10;
            }
            if (tooltipY < 0) {
                tooltipY = e.clientY - rect.top + 10;
            }
            
            tooltip.style.left = `${tooltipX}px`;
            tooltip.style.top = `${tooltipY}px`;
            tooltip.classList.add('visible');
        }
    }

    _handleGraphLeave() {
        const point = this.shadowRoot?.getElementById('graph-hover-point');
        const tooltip = this.shadowRoot?.getElementById('graph-tooltip');
        
        if (point) {
            point.classList.remove('visible');
        }
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }

    // Fetch temperature history data from Home Assistant
    async fetchTemperatureHistory() {
        if (this.historyLoading || !this._hass || !this.temperatureEntity) return;
        
        this.historyLoading = true;
        
        try {
            // Calculate timestamps (last 7 days = 168 hours)
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - (168 * 60 * 60 * 1000)); // 168 hours ago
            
            // Format timestamps for Home Assistant API
            const startISO = startTime.toISOString();
            const endISO = endTime.toISOString();
            
            // Call Home Assistant History API
            const response = await this._hass.callWS({
                type: 'history/history_during_period',
                start_time: startISO,
                end_time: endISO,
                entity_ids: [this.temperatureEntity],
                minimal_response: true,
                no_attributes: true,
                significant_changes_only: true
            });
            
            if (response && response.length > 0 && response[0].length > 0) {
                // Extract temperature values with timestamps
                const historyData = response[0];
                // Sample data points (e.g., one per hour) to avoid too many points
                const sampleRate = Math.max(1, Math.floor(historyData.length / 168));
                const sampledDataWithTime = historyData
                    .filter((_, index) => index % sampleRate === 0)
                    .map(entry => ({
                        temp: parseFloat(entry.s),
                        time: entry.lu ? new Date(entry.lu * 1000) : new Date()
                    }))
                    .filter(item => !isNaN(item.temp));
                
                if (sampledDataWithTime.length > 0) {
                    this.temperatureHistoryWithTime = sampledDataWithTime;
                    this.temperatureHistory = sampledDataWithTime.map(item => item.temp);
                    // Re-render to update the graph
                    this.render();
                }
            }
        } catch (error) {
            console.error('Error fetching temperature history:', error);
            // Fallback: use current temperature state if available
            if (this._hass.states[this.temperatureEntity]) {
                const currentTemp = parseFloat(this._hass.states[this.temperatureEntity].state);
                if (!isNaN(currentTemp)) {
                    this.temperatureHistory = [currentTemp, currentTemp, currentTemp, currentTemp, currentTemp];
                }
            }
        } finally {
            this.historyLoading = false;
        }
    }

    // Helper to create smooth SVG path from data points with curved lines
    generateGraphPath(data, width, height) {
        if (!data || data.length === 0) return { line: '', fill: '' };
        
        // Calculate range with padding for better visualization
        const dataMax = Math.max(...data);
        const dataMin = Math.min(...data);
        const dataRange = dataMax - dataMin;
        
        // Add padding: 20% of range, minimum 2 units
        const padding = Math.max(dataRange * 0.2, 2);
        const max = dataMax + padding;
        const min = dataMin - padding;
        const range = max - min;
        
        // Ensure we have a valid range
        if (range <= 0) {
            const midY = height / 2;
            return { 
                line: `M 0,${midY} L ${width},${midY}`,
                fill: `M 0,${midY} L ${width},${midY} L ${width},${height} L 0,${height} Z`
            };
        }
        
        const stepX = data.length > 1 ? width / (data.length - 1) : 0;
        
        // Build line points with proper Y scaling (inverted: higher values = lower Y)
        const points = data.map((val, i) => {
            const x = i * stepX;
            // Calculate Y: higher temp = lower Y position (closer to top)
            const normalized = (val - min) / range;
            // Add small margin at top and bottom (5% of height)
            const margin = height * 0.05;
            const y = margin + (height - 2 * margin) * (1 - normalized);
            return [x, y];
        });

        if (points.length === 0) return { line: '', fill: '' };
        
        // Create smooth curve using Catmull-Rom spline
        const [firstX, firstY] = points[0];
        let linePath = `M ${firstX},${firstY} `;
        
        if (points.length === 1) {
            // Single point - just draw horizontal line
            linePath += `L ${width},${firstY}`;
        } else if (points.length === 2) {
            // Two points - straight line
            const [x, y] = points[1];
            linePath += `L ${x},${y}`;
        } else {
            // Multiple points - use smooth curves
            for (let i = 0; i < points.length - 1; i++) {
                const [x0, y0] = points[i];
                const [x1, y1] = points[i + 1];
                
                // Control points for smooth bezier curve
                const tension = 0.3; // Smoothness factor (0 = sharp, 1 = very smooth)
                const d = Math.abs(x1 - x0) * tension;
                
                linePath += `C ${x0 + d},${y0} ${x1 - d},${y1} ${x1},${y1} `;
            }
        }
        
        // Create fill path (closed area under the curve)
        const [lastX, lastY] = points[points.length - 1];
        let fillPath = linePath; // Start with the same curve
        fillPath += ` L ${lastX},${height} L ${firstX},${height} Z`; // Close at bottom
        
        return { line: linePath.trim(), fill: fillPath.trim() };
    }

    getCardSize() {
        return 10; // Tall card
    }
}

customElements.define('prism-sidebar', PrismSidebarCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "prism-sidebar",
    name: "Prism Sidebar",
    preview: true,
    description: "Full height sidebar with clock, camera, weather and energy stats"
});


})();

// ============================================
// prism-sidebar-light.js
// ============================================
(function() {
class PrismSidebarLightCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.timer = null;
        this.cameraTimer = null;
        this.hasRendered = false;
        this.currentCameraIndex = 0;
        this.cameraEntities = [];
        this.temperatureHistory = [];
        this.temperatureHistoryWithTime = []; // Store data with timestamps
        this.historyLoading = false;
        this.forecastSubscriber = null; // For weather forecast subscription
    }

    static getStubConfig() {
        return {
            camera_entity: "camera.example",
            camera_entity_2: "",
            camera_entity_3: "",
            rotation_interval: 10,
            temperature_entity: "sensor.outdoor_temperature",
            weather_entity: "weather.example",
            forecast_days: 3,
            grid_entity: "sensor.example",
            solar_entity: "sensor.example",
            home_entity: "sensor.example",
            calendar_entity: "calendar.example"
        };
    }

    static getConfigForm() {
        return {
            schema: [
                {
                    name: "camera_entity",
                    label: "Camera entity",
                    selector: { entity: { domain: "camera" } }
                },
                {
                    name: "camera_entity_2",
                    label: "Camera entity 2",
                    selector: { entity: { domain: "camera" } }
                },
                {
                    name: "camera_entity_3",
                    label: "Camera entity 3",
                    selector: { entity: { domain: "camera" } }
                },
                {
                    name: "rotation_interval",
                    label: "Rotation interval",
                    selector: { number: { min: 3, max: 60, step: 1, unit_of_measurement: "Sekunden" } },
                    default: 10
                },
                {
                    name: "temperature_entity",
                    label: "Temperature entity",
                    selector: { entity: { domain: "sensor" } }
                },
                {
                    name: "weather_entity",
                    label: "Weather entity",
                    selector: { entity: { domain: "weather" } }
                },
                {
                    name: "forecast_days",
                    label: "Forecast days",
                    selector: { number: { min: 1, max: 7, step: 1, unit_of_measurement: "Tage" } },
                    default: 3
                },
                {
                    name: "grid_entity",
                    label: "Grid entity",
                    selector: { entity: {} }
                },
                {
                    name: "solar_entity",
                    label: "Solar entity",
                    selector: { entity: {} }
                },
                {
                    name: "home_entity",
                    label: "Home entity",
                    selector: { entity: {} }
                },
                {
                    name: "calendar_entity",
                    label: "Calendar entity",
                    selector: { entity: { domain: "calendar" } }
                }
            ]
        };
    }

    setConfig(config) {
        // Store previous config values to detect changes
        const prevWeatherEntity = this.weatherEntity;
        const prevForecastDays = this.forecastDays;
        const prevTemperatureEntity = this.temperatureEntity;
        
        this.config = { ...config };
        // Default entities if not provided
        this.temperatureEntity = this.config.temperature_entity || 'sensor.outdoor_temperature';
        this.weatherEntity = this.config.weather_entity || 'weather.example';
        this.gridEntity = this.config.grid_entity || 'sensor.example';
        this.solarEntity = this.config.solar_entity || 'sensor.example';
        this.homeEntity = this.config.home_entity || 'sensor.example';
        this.calendarEntity = this.config.calendar_entity || 'calendar.example';
        
        // Build camera entities array (only include non-empty entities)
        this.cameraEntities = [];
        if (this.config.camera_entity) {
            this.cameraEntities.push(this.config.camera_entity);
        }
        if (this.config.camera_entity_2) {
            this.cameraEntities.push(this.config.camera_entity_2);
        }
        if (this.config.camera_entity_3) {
            this.cameraEntities.push(this.config.camera_entity_3);
        }
        // Fallback to default if no cameras configured
        if (this.cameraEntities.length === 0) {
            this.cameraEntities.push('camera.example');
        }
        
        // Get rotation interval (default 10 seconds)
        this.rotationInterval = (this.config.rotation_interval && this.config.rotation_interval >= 3) 
            ? this.config.rotation_interval * 1000 
            : 10000; // Default 10 seconds
        
        // Get forecast days (default 3)
        this.forecastDays = this.config.forecast_days || 3;
        
        // Reset camera index
        this.currentCameraIndex = 0;
        
        // Stop existing camera rotation timer
        if (this.cameraTimer) {
            clearInterval(this.cameraTimer);
            this.cameraTimer = null;
        }
        
        // Check if important config changed that requires full re-render
        const needsRerender = prevWeatherEntity !== this.weatherEntity || 
                             prevForecastDays !== this.forecastDays ||
                             prevTemperatureEntity !== this.temperatureEntity;
        
        // Force re-render when config changes (important for forecast_days or entity changes)
        if (this.hasRendered && needsRerender) {
            // Reset temperature history if entity changed
            if (prevTemperatureEntity !== this.temperatureEntity) {
                this.temperatureHistory = [];
                this.historyLoading = false;
            }
            this.hasRendered = false;
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
            if (this._hass) {
                // Fetch new temperature history if entity changed
                if (prevTemperatureEntity !== this.temperatureEntity) {
                    this.fetchTemperatureHistory();
                }
                this.updateValues();
            }
        } else if (this.hasRendered) {
            // Minor changes, just update values
            this.startCameraRotation();
            if (this._hass) {
                this.updateValues();
            }
        } else if (!this._hass) {
        // Initialize preview values
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
        }
    }

    set hass(hass) {
        this._hass = hass;
        if (!this.hasRendered) {
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
            this.fetchTemperatureHistory();
            // Initial forecast update
            setTimeout(() => this.updateForecastGrid(), 100);
        } else {
            this.updateValues();
        }
    }

    connectedCallback() {
        if (this.config && !this.hasRendered) {
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
        }
    }

    disconnectedCallback() {
        if (this.timer) clearInterval(this.timer);
        if (this.cameraTimer) clearInterval(this.cameraTimer);
        // Unsubscribe from forecast
        if (this.forecastSubscriber) {
            this.forecastSubscriber().catch(() => {});
            this.forecastSubscriber = null;
        }
    }

    startClock() {
        if (this.timer) clearInterval(this.timer);
        this.updateClock(); // Initial
        this.timer = setInterval(() => this.updateClock(), 1000);
    }

    startCameraRotation() {
        // Only rotate if we have more than one camera
        if (this.cameraEntities.length > 1) {
            if (this.cameraTimer) clearInterval(this.cameraTimer);
            this.cameraTimer = setInterval(() => {
                this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameraEntities.length;
                this.updateCamera();
            }, this.rotationInterval);
        }
    }

    getCurrentCameraEntity() {
        if (this.cameraEntities.length === 0) return 'camera.example';
        return this.cameraEntities[this.currentCameraIndex];
    }

    updateCamera() {
        if (!this._hass) return;
        
        const cameraEntity = this.getCurrentCameraEntity();
        const cameraState = this._hass.states[cameraEntity];
        
        const camImgEl = this.shadowRoot?.querySelector('.camera-img');
        const camNameEl = this.shadowRoot?.getElementById('cam-name');
        const cameraBox = this.shadowRoot?.getElementById('camera-box');
        
        if (camImgEl && cameraState) {
            const entityPicture = cameraState.attributes.entity_picture;
            if (entityPicture) {
                camImgEl.src = entityPicture;
            }
        } else if (camImgEl) {
            // Fallback to default image
            camImgEl.src = 'https://images.unsplash.com/photo-1558435186-d31d1eb6fa3c?q=80&w=600&auto=format&fit=crop';
        }

        if (camNameEl && cameraState) {
            camNameEl.textContent = cameraState.attributes.friendly_name || cameraEntity.split('.')[1];
        } else if (camNameEl) {
            camNameEl.textContent = cameraEntity.split('.')[1] || 'Camera';
        }

        // Update click handler
        if (cameraBox) {
            // Remove old listener and add new one
            const newBox = cameraBox.cloneNode(true);
            cameraBox.parentNode.replaceChild(newBox, cameraBox);
            newBox.addEventListener('click', () => this._handleCameraClick());
        }
    }

    updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' });
        
        const timeEl = this.shadowRoot?.getElementById('clock-time');
        const dateEl = this.shadowRoot?.getElementById('clock-date');
        
        if (timeEl) timeEl.textContent = timeStr;
        if (dateEl) dateEl.textContent = dateStr;
    }

    async updateValues() {
        if (!this._hass) return;
        
        // Update Grid/Solar/Home values if entities exist
        const gridState = this._hass.states[this.gridEntity];
        const solarState = this._hass.states[this.solarEntity];
        const homeState = this._hass.states[this.homeEntity];
        const weatherState = this._hass.states[this.weatherEntity];
        const cameraEntity = this.getCurrentCameraEntity();
        const cameraState = this._hass.states[cameraEntity];
        const calendarState = this._hass.states[this.calendarEntity];

        const gridEl = this.shadowRoot?.getElementById('val-grid');
        const solarEl = this.shadowRoot?.getElementById('val-solar');
        const homeEl = this.shadowRoot?.getElementById('val-home');
        const tempEl = this.shadowRoot?.getElementById('val-temp');
        const camNameEl = this.shadowRoot?.getElementById('cam-name');
        const camImgEl = this.shadowRoot?.querySelector('.camera-img');
        const calTitleEl = this.shadowRoot?.getElementById('cal-title');
        const calSubEl = this.shadowRoot?.getElementById('cal-sub');
        const calIconEl = this.shadowRoot?.getElementById('cal-icon');

        if (gridEl && gridState) {
            gridEl.textContent = `${gridState.state} ${gridState.attributes.unit_of_measurement || 'kW'}`;
        }
        if (solarEl && solarState) {
            solarEl.textContent = `${solarState.state} ${solarState.attributes.unit_of_measurement || 'kW'}`;
        }
        if (homeEl && homeState) {
            homeEl.textContent = `${homeState.state} ${homeState.attributes.unit_of_measurement || 'kW'}`;
        }
        
        // Get temperature from the configured temperature entity, not weather
        const temperatureState = this._hass.states[this.temperatureEntity];
        if (tempEl && temperatureState) {
            tempEl.textContent = temperatureState.state || '0';
        }

        if (camImgEl && cameraState) {
            const entityPicture = cameraState.attributes.entity_picture;
            if (entityPicture) {
                camImgEl.src = entityPicture;
            }
        }

        if (camNameEl && cameraState) {
            camNameEl.textContent = cameraState.attributes.friendly_name || cameraEntity.split('.')[1];
        }

        // Update calendar
        if (calendarState && calendarState.attributes) {
            const attr = calendarState.attributes;
            if (calTitleEl && attr.message) {
                calTitleEl.textContent = attr.message;
            }
            if (calSubEl) {
                let subText = '';
                if (attr.all_day) {
                    subText = 'Ganztägig';
                } else if (attr.start_time) {
                    const date = new Date(attr.start_time);
                    subText = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                }
                if (attr.location) {
                    subText += subText ? ` • ${attr.location}` : attr.location;
                }
                calSubEl.textContent = subText || 'Kein Termin';
            }
            if (calIconEl && attr.start_time) {
                const date = new Date(attr.start_time);
                calIconEl.textContent = date.getDate().toString();
            }
        }

        // Update weather forecast - rebuild entire forecast grid
        this.updateForecastGrid();
    }

    // Check if weather entity supports forecast features (like clock-weather-card does)
    isLegacyWeather() {
        if (!this._hass || !this.weatherEntity) return true;
        const weatherState = this._hass.states[this.weatherEntity];
        if (!weatherState || !weatherState.attributes) return true;
        
        // WeatherEntityFeature.FORECAST_DAILY = 1, FORECAST_HOURLY = 2
        const supportedFeatures = weatherState.attributes.supported_features || 0;
        const supportsDaily = (supportedFeatures & 1) !== 0;
        const supportsHourly = (supportedFeatures & 2) !== 0;
        
        return !supportsDaily && !supportsHourly;
    }

    async updateForecastGrid() {
        if (!this._hass) return;
        
        const weatherState = this._hass.states[this.weatherEntity];
        const forecastGridEl = this.shadowRoot?.querySelector('.forecast-grid');
        
        if (!forecastGridEl || !weatherState) {
            console.warn('Prism Sidebar Light: Missing forecast grid or weather entity:', this.weatherEntity);
            return;
        }
        
        let forecast = [];
        
        // Check if legacy weather (has forecast in attributes) - like clock-weather-card does
        if (this.isLegacyWeather()) {
            // Legacy: Get forecast from attributes
            if (weatherState.attributes.forecast && weatherState.attributes.forecast.length > 0) {
                forecast = weatherState.attributes.forecast;
                console.log('Prism Sidebar Light: Using forecast from attributes (legacy)');
            }
        } else {
            // Modern: Use subscribeMessage (like clock-weather-card does)
            // Based on: https://github.com/pkissling/clock-weather-card
            try {
                console.log('Prism Sidebar Light: Subscribing to forecast via subscribeMessage for', this.weatherEntity);
                
                // Unsubscribe from previous subscription
                if (this.forecastSubscriber) {
                    try {
                        await this.forecastSubscriber();
                    } catch (e) {
                        // Ignore errors when unsubscribing
                    }
                    this.forecastSubscriber = null;
                }
                
                // Subscribe to forecast updates
                const callback = (event) => {
                    if (event && event.forecast && Array.isArray(event.forecast)) {
                        forecast = event.forecast;
                        this.renderForecastGrid(forecast, forecastGridEl);
                    }
                };
                
                const message = {
                    type: 'weather/subscribe_forecast',
                    forecast_type: 'daily',
                    entity_id: this.weatherEntity
                };
                
                this.forecastSubscriber = await this._hass.connection.subscribeMessage(callback, message, { resubscribe: false });
                console.log('Prism Sidebar Light: Successfully subscribed to forecast');
                
                // Wait a bit for the first callback
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error('Prism Sidebar Light: Error subscribing to forecast:', error);
                // Fallback to attributes if subscription fails
                if (weatherState.attributes.forecast && weatherState.attributes.forecast.length > 0) {
                    forecast = weatherState.attributes.forecast;
                    console.log('Prism Sidebar Light: Fallback to attributes after subscription error');
                }
            }
        }
        
        // Render forecast (either from attributes or from subscription)
        if (forecast && forecast.length > 0) {
            this.renderForecastGrid(forecast, forecastGridEl);
        } else {
            // Show helpful message if no forecast available
            console.warn('Prism Sidebar Light: No forecast data available for', this.weatherEntity);
            console.log('Prism Sidebar Light: Available weather attributes:', Object.keys(weatherState.attributes));
            console.log('Prism Sidebar Light: Supported features:', weatherState.attributes.supported_features);
            
            if (forecastGridEl) {
                forecastGridEl.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; color: rgba(0,0,0,0.5); padding: 20px;">
                        <div style="font-size: 12px; margin-bottom: 8px;">Forecast nicht verfügbar</div>
                        <div style="font-size: 10px; color: rgba(0,0,0,0.3);">
                            ${this.weatherEntity}<br>
                            <small>Bitte verwende eine Weather-Integration, die Forecast unterstützt<br>
                            (z.B. Open-Meteo, Met.no, oder aktualisiere OpenWeatherMap)</small>
                        </div>
                    </div>
                `;
            }
        }
    }

    renderForecastGrid(forecast, forecastGridEl) {
        if (!forecast || !forecastGridEl) return;
        
        const forecastCount = this.forecastDays || 3;
        const forecastSlice = forecast.slice(0, forecastCount);
        
        console.log(`Prism Sidebar Light: Rendering forecast with ${forecastSlice.length} days`);
        
        // Rebuild the entire forecast grid
        forecastGridEl.innerHTML = forecastSlice.map((day, i) => {
            const date = day.datetime ? new Date(day.datetime) : new Date();
            const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
                    const iconMap = {
                        'sunny': 'mdi:weather-sunny',
                        'partlycloudy': 'mdi:weather-partly-cloudy',
                        'cloudy': 'mdi:cloud',
                        'rainy': 'mdi:weather-rainy',
                'snowy': 'mdi:weather-snowy',
                'pouring': 'mdi:weather-pouring',
                'lightning': 'mdi:weather-lightning',
                'fog': 'mdi:weather-fog',
                'windy': 'mdi:weather-windy',
                'clear-night': 'mdi:weather-night'
                    };
            const icon = iconMap[day.condition?.toLowerCase()] || 'mdi:weather-cloudy';
            const temp = day.temperature !== undefined ? day.temperature : (day.templow !== undefined ? day.templow : '0');
            const low = day.templow !== undefined ? day.templow : (day.temperature !== undefined ? day.temperature : '0');
            
            return `
                <div class="forecast-item">
                    <span class="day-name">${dayName}</span>
                    <ha-icon icon="${icon}" style="color: ${icon === 'mdi:weather-sunny' ? '#f59e0b' : 'rgba(0,0,0,0.8)'}; width: 20px;"></ha-icon>
                    <span class="day-temp">${temp}°</span>
                    <span class="day-low">${low}°</span>
                </div>
            `;
        }).join('');
    }

    convertHourlyToDaily(hourlyForecast) {
        if (!hourlyForecast || hourlyForecast.length === 0) return [];
        
        const dailyMap = new Map();
        
        hourlyForecast.forEach(hour => {
            if (!hour.datetime) return;
            const date = new Date(hour.datetime);
            const dayKey = date.toDateString(); // Group by day
            
            if (!dailyMap.has(dayKey)) {
                dailyMap.set(dayKey, {
                    datetime: hour.datetime,
                    condition: hour.condition,
                    temperature: hour.temperature,
                    templow: hour.temperature,
                    temps: [hour.temperature]
                });
            } else {
                const day = dailyMap.get(dayKey);
                day.temps.push(hour.temperature);
                day.temperature = Math.max(...day.temps); // High temp
                day.templow = Math.min(...day.temps); // Low temp
                // Use most common condition or latest
                if (hour.condition) {
                    day.condition = hour.condition;
                }
            }
        });
        
        return Array.from(dailyMap.values()).sort((a, b) => 
            new Date(a.datetime) - new Date(b.datetime)
        );
    }


    render() {
        // Use temperature history data for graph
        let graphData = [1.2, 1.5, 2.1, 2.8, 2.5, 1.9, 1.4, 1.0, 0.8]; // Default
        if (this.temperatureHistory && this.temperatureHistory.length > 0) {
            graphData = this.temperatureHistory;
        }
        const graphPaths = this.generateGraphPath(graphData, 280, 60);
        const graphFillPath = graphPaths.fill || '';
        const graphLinePath = graphPaths.line || '';

        // Get entity states for preview/display
        const cameraEntity = this.getCurrentCameraEntity();
        const cameraState = this._hass?.states[cameraEntity];
        const temperatureState = this._hass?.states[this.temperatureEntity];
        const weatherState = this._hass?.states[this.weatherEntity];
        const calendarState = this._hass?.states[this.calendarEntity];
        const gridState = this._hass?.states[this.gridEntity];
        const solarState = this._hass?.states[this.solarEntity];
        const homeState = this._hass?.states[this.homeEntity];

        const cameraImage = cameraState?.attributes?.entity_picture || 'https://images.unsplash.com/photo-1558435186-d31d1eb6fa3c?q=80&w=600&auto=format&fit=crop';
        const cameraName = cameraState?.attributes?.friendly_name || cameraEntity.split('.')[1] || 'Camera';
        const currentTemp = temperatureState?.state || '0';
        const calendarTitle = calendarState?.attributes?.message || 'Keine Termine';
        const calendarSub = calendarState?.attributes?.all_day ? 'Ganztägig' : 
                           (calendarState?.attributes?.start_time ? 
                            new Date(calendarState.attributes.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 
                            '');
        const calendarDate = calendarState?.attributes?.start_time ? 
                            new Date(calendarState.attributes.start_time).getDate() : 
                            new Date().getDate();
        const gridValue = gridState ? `${gridState.state} ${gridState.attributes.unit_of_measurement || 'kW'}` : '0 kW';
        const solarValue = solarState ? `${solarState.state} ${solarState.attributes.unit_of_measurement || 'kW'}` : '0 kW';
        const homeValue = homeState ? `${homeState.state} ${homeState.attributes.unit_of_measurement || 'kW'}` : '0 kW';

        // Get forecast (daily forecast for display)
        const forecastDays = this.forecastDays || 3;
        const forecast = weatherState?.attributes?.forecast?.slice(0, forecastDays) || [];

        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: system-ui, -apple-system, sans-serif;
                height: 100%;
                box-sizing: border-box;
            }
            .sidebar {
                width: 100%;
                height: 100%;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                padding: 24px;
                box-sizing: border-box;
                background: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                border-right: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: 10px 0 30px rgba(0,0,0,0.1);
                overflow-y: auto;
                overflow-x: hidden;
                color: #1a1a1a;
            }

            /* Camera */
            .camera-box {
                position: relative;
                width: 100%;
                aspect-ratio: 16/9;
                border-radius: 16px;
                overflow: hidden;
                margin-bottom: 32px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1);
                cursor: pointer;
                transition: transform 0.3s;
            }
            .camera-box:hover { transform: scale(1.02); }
            .camera-img {
                width: 100%; height: 100%; object-fit: cover;
            }
            .camera-overlay {
                position: absolute; inset: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.6), transparent, transparent);
            }
            .live-badge {
                position: absolute; top: 12px; left: 12px;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(8px);
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 10px; font-weight: bold;
                color: #1a1a1a;
                display: flex; align-items: center; gap: 6px;
                border: 1px solid rgba(0, 0, 0, 0.1);
            }
            .pulse {
                width: 6px; height: 6px; border-radius: 50%;
                background: #ef4444;
                box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
                animation: pulse 2s infinite;
            }
            .cam-name {
                position: absolute; bottom: 12px; right: 12px;
                font-size: 10px; font-family: monospace;
                color: rgba(255, 255, 255, 0.8);
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(8px);
                padding: 4px 8px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            /* Clock */
            .clock-box {
                display: flex; flex-direction: column; align-items: center;
                margin-bottom: 32px;
                position: relative;
            }
            .clock-glow {
                position: absolute; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 120px; height: 120px;
                background: rgba(0, 0, 0, 0.05);
                filter: blur(50px);
                border-radius: 50%;
                pointer-events: none;
            }
            .clock-time {
                font-size: 72px;
                font-weight: 700;
                letter-spacing: -4px;
                color: #1a1a1a;
                text-shadow: 2px 4px 8px rgba(0,0,0,0.1), -1px -1px 1px rgba(255,255,255,0.8);
                line-height: 1;
            }
            .clock-date {
                font-size: 14px;
                font-weight: 500;
                color: rgba(0, 0, 0, 0.6);
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-top: 8px;
            }

            /* Calendar Inlet */
            .calendar-inlet {
                position: relative;
                margin-bottom: 32px;
                padding: 16px;
                border-radius: 16px;
                background: linear-gradient(145deg, #e8e8e8, #f5f5f5);
                border: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: 
                    inset 3px 3px 8px rgba(0,0,0,0.1),
                    inset -3px -3px 8px rgba(255,255,255,0.9);
                display: flex; align-items: center; gap: 16px;
                cursor: pointer;
                transition: background 0.3s;
            }
            .calendar-inlet:hover { background: rgba(240, 240, 240, 0.8); }
            .cal-icon {
                width: 40px; height: 40px; border-radius: 12px;
                background: rgba(255, 255, 255, 0.9);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                border: 1px solid rgba(0, 0, 0, 0.05);
                display: flex; align-items: center; justify-content: center;
                font-weight: bold; font-size: 18px; color: #3b82f6;
            }
            .cal-info { display: flex; flex-direction: column; }
            .cal-title { font-weight: 500; color: #1a1a1a; line-height: 1.2; }
            .cal-sub { font-size: 12px; color: rgba(0, 0, 0, 0.4); margin-top: 2px; }

            /* Weather - Clean */
            .weather-box {
                display: flex; flex-direction: column;
                margin-bottom: auto; /* Push footer down */
            }
            .section-title {
                font-size: 12px; font-weight: 700; color: rgba(0, 0, 0, 0.3);
                text-transform: uppercase; letter-spacing: 2px;
                margin-bottom: 8px;
            }
            .current-temp-box {
                display: flex; align-items: center; justify-content: center;
                margin-bottom: 8px;
            }
            .temp-val { font-size: 48px; font-weight: 300; color: #1a1a1a; }
            .temp-unit { font-size: 20px; color: rgba(0, 0, 0, 0.4); margin-top: -10px; margin-left: 4px; }
            
            .graph-container {
                height: 80px; 
                width: 100%; 
                margin-bottom: 24px; 
                position: relative;
                padding: 12px 0;
                overflow: hidden;
                border-radius: 12px;
                background: rgba(240, 240, 240, 0.5);
                border: 1px solid rgba(59, 130, 246, 0.15);
            }
            .graph-container svg {
                display: block;
                width: 100%;
                height: 100%;
                overflow: visible;
            }
            .graph-container svg path {
                vector-effect: non-scaling-stroke;
                transition: all 0.3s ease;
            }
            .graph-tooltip {
                position: absolute;
                background: rgba(255, 255, 255, 0.95);
                color: #1a1a1a;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 1000;
                white-space: nowrap;
                border: 1px solid rgba(59, 130, 246, 0.3);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .graph-tooltip.visible {
                opacity: 1;
            }
            .graph-tooltip-time {
                font-size: 10px;
                opacity: 0.6;
                margin-top: 2px;
            }
            .graph-point {
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .graph-point.visible {
                opacity: 1;
            }
            .forecast-grid {
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); 
                gap: 8px;
            }
            .forecast-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
            .day-name { font-size: 12px; color: rgba(0, 0, 0, 0.4); }
            .day-temp { font-size: 14px; font-weight: 700; color: #1a1a1a; }
            .day-low { font-size: 12px; color: rgba(0, 0, 0, 0.3); }

            /* Energy Footer */
            .energy-grid {
                display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
                margin-top: 24px;
            }
            .energy-pill {
                height: 64px;
                border-radius: 16px;
                background: linear-gradient(145deg, #e8e8e8, #f5f5f5);
                border: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: 
                    inset 3px 3px 8px rgba(0,0,0,0.1),
                    inset -3px -3px 8px rgba(255,255,255,0.9);
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                cursor: pointer; transition: background 0.3s;
                padding-top: 8px;
                gap: 4px;
            }
            .energy-pill:hover { background: rgba(240, 240, 240, 0.8); }
            .pill-val { font-size: 12px; font-family: monospace; font-weight: bold; color: rgba(0, 0, 0, 0.9); }
            .pill-label { font-size: 9px; text-transform: uppercase; color: rgba(0, 0, 0, 0.3); margin-top: 2px; }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        </style>

        <div class="sidebar">
            
            <!-- Camera -->
            <div class="camera-box" id="camera-box">
                <img src="${cameraImage}" class="camera-img" />
                <div class="camera-overlay"></div>
                <div class="live-badge">
                    <div class="pulse"></div> LIVE
                </div>
                <div class="cam-name" id="cam-name">${cameraName}</div>
            </div>

            <!-- Clock -->
            <div class="clock-box">
                <div class="clock-glow"></div>
                <div class="clock-time" id="clock-time">08:12</div>
                <div class="clock-date" id="clock-date">Wednesday, 24. Dec</div>
            </div>

            <!-- Calendar Inlet -->
            <div class="calendar-inlet" id="calendar-inlet">
                <div class="cal-icon" id="cal-icon">${calendarDate}</div>
                <div class="cal-info">
                    <div class="cal-title" id="cal-title">${calendarTitle}</div>
                    <div class="cal-sub" id="cal-sub">${calendarSub}</div>
                </div>
            </div>

            <!-- Weather -->
            <div class="weather-box">
                <div class="section-title">Outdoor</div>
                <div class="current-temp-box">
                    <span class="temp-val" id="val-temp">${currentTemp}</span>
                    <span class="temp-unit">°C</span>
                </div>
                
                <div class="graph-container">
                    <svg width="100%" height="100%" viewBox="0 0 280 60" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="grad-sidebar-light-${Date.now()}" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.5" />
                                <stop offset="40%" style="stop-color:#3b82f6;stop-opacity:0.25" />
                                <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
                            </linearGradient>
                            <filter id="shadow-sidebar-light-${Date.now()}">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                                <feOffset dx="0" dy="1" result="offsetblur"/>
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.3"/>
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <!-- Fill area (closed path) -->
                        <path d="${graphFillPath}" 
                              fill="url(#grad-sidebar-light-${Date.now()})" 
                              stroke="none" 
                              opacity="0.9" />
                        <!-- Line only (no fill, just the curve) -->
                        <path d="${graphLinePath}" 
                              fill="none" 
                              stroke="#3b82f6" 
                              stroke-width="2.5" 
                              stroke-linecap="round" 
                              stroke-linejoin="round" 
                              filter="url(#shadow-sidebar-light-${Date.now()})" />
                        <!-- Hover point indicator -->
                        <circle class="graph-point" 
                                id="graph-hover-point" 
                                r="4" 
                                fill="#3b82f6" 
                                stroke="white" 
                                stroke-width="2" 
                                cx="0" 
                                cy="0" />
                        <!-- Transparent overlay for mouse events -->
                        <rect id="graph-overlay" 
                              width="280" 
                              height="60" 
                              fill="transparent" 
                              style="cursor: crosshair;" />
                    </svg>
                    <!-- Tooltip -->
                    <div class="graph-tooltip" id="graph-tooltip">
                        <div class="graph-tooltip-temp"></div>
                        <div class="graph-tooltip-time"></div>
                    </div>
                </div>

                <div class="forecast-grid">
                    ${forecast.map((day, i) => {
                        const date = day.datetime ? new Date(day.datetime) : new Date();
                        const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
                        const iconMap = {
                            'sunny': 'mdi:weather-sunny',
                            'partlycloudy': 'mdi:weather-partly-cloudy',
                            'cloudy': 'mdi:cloud',
                            'rainy': 'mdi:weather-rainy',
                            'snowy': 'mdi:weather-snowy'
                        };
                        const icon = iconMap[day.condition?.toLowerCase()] || 'mdi:weather-cloudy';
                        return `
                            <div class="forecast-item">
                                <span class="day-name" id="day-name-${i}">${dayName}</span>
                                <ha-icon icon="${icon}" id="day-icon-${i}" style="color: ${icon === 'mdi:weather-sunny' ? '#f59e0b' : 'rgba(0,0,0,0.6)'}; width: 20px;"></ha-icon>
                                <span class="day-temp" id="day-temp-${i}">${day.temperature !== undefined ? day.temperature : (day.templow !== undefined ? day.templow : '0')}°</span>
                                <span class="day-low" id="day-low-${i}">${day.templow !== undefined ? day.templow : (day.temperature !== undefined ? day.temperature : '0')}°</span>
                            </div>
                        `;
                    }).join('') || `
                        <div class="forecast-item">
                            <span class="day-name">Mi</span>
                            <ha-icon icon="mdi:weather-rainy" style="color: rgba(0,0,0,0.6); width: 20px;"></ha-icon>
                            <span class="day-temp">0,4°</span>
                            <span class="day-low">-1,4°</span>
                        </div>
                        <div class="forecast-item">
                            <span class="day-name">Do</span>
                            <ha-icon icon="mdi:cloud" style="color: rgba(0,0,0,0.6); width: 20px;"></ha-icon>
                            <span class="day-temp">2,6°</span>
                            <span class="day-low">-1,6°</span>
                        </div>
                        <div class="forecast-item">
                            <span class="day-name">Fr</span>
                            <ha-icon icon="mdi:weather-sunny" style="color: #f59e0b; width: 20px;"></ha-icon>
                            <span class="day-temp">4,1°</span>
                            <span class="day-low">-1,7°</span>
                        </div>
                    `}
                </div>
            </div>

            <!-- Energy Footer -->
            <div class="energy-grid">
                <div class="energy-pill" id="energy-grid">
                    <ha-icon icon="mdi:flash" style="width: 16px; height: 16px; color: rgba(0,0,0,0.3);"></ha-icon>
                    <span class="pill-val" id="val-grid">${gridValue}</span>
                    <span class="pill-label">Grid</span>
                </div>
                <div class="energy-pill" id="energy-solar">
                    <ha-icon icon="mdi:solar-power" style="width: 16px; height: 16px; color: rgba(0,0,0,0.3);"></ha-icon>
                    <span class="pill-val" id="val-solar">${solarValue}</span>
                    <span class="pill-label">Solar</span>
                </div>
                <div class="energy-pill" id="energy-home">
                    <ha-icon icon="mdi:home" style="width: 16px; height: 16px; color: rgba(0,0,0,0.3);"></ha-icon>
                    <span class="pill-val" id="val-home">${homeValue}</span>
                    <span class="pill-label">Home</span>
                </div>
            </div>

        </div>
        `;

        // Setup event listeners
        this.setupListeners();
    }

    setupListeners() {
        const cameraBox = this.shadowRoot?.getElementById('camera-box');
        const calendarInlet = this.shadowRoot?.getElementById('calendar-inlet');
        const energyGrid = this.shadowRoot?.getElementById('energy-grid');
        const energySolar = this.shadowRoot?.getElementById('energy-solar');
        const energyHome = this.shadowRoot?.getElementById('energy-home');
        const graphOverlay = this.shadowRoot?.getElementById('graph-overlay');

        if (cameraBox) {
            cameraBox.addEventListener('click', () => this._handleCameraClick());
        }
        if (calendarInlet) {
            calendarInlet.addEventListener('click', () => this._handleCalendarClick());
        }
        if (energyGrid) {
            energyGrid.addEventListener('click', () => this._handleEnergyClick(this.gridEntity));
        }
        if (energySolar) {
            energySolar.addEventListener('click', () => this._handleEnergyClick(this.solarEntity));
        }
        if (energyHome) {
            energyHome.addEventListener('click', () => this._handleEnergyClick(this.homeEntity));
        }
        
        // Graph hover events
        if (graphOverlay) {
            graphOverlay.addEventListener('mousemove', (e) => this._handleGraphHover(e));
            graphOverlay.addEventListener('mouseleave', () => this._handleGraphLeave());
        }
    }

    _handleCameraClick() {
        if (!this._hass) return;
        const cameraEntity = this.getCurrentCameraEntity();
        if (!cameraEntity) return;
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: cameraEntity }
        });
        this.dispatchEvent(event);
    }

    _handleCalendarClick() {
        if (!this._hass || !this.calendarEntity) return;
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: this.calendarEntity }
        });
        this.dispatchEvent(event);
    }

    _handleEnergyClick(entityId) {
        if (!this._hass || !entityId) return;
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: entityId }
        });
        this.dispatchEvent(event);
    }

    _handleGraphHover(e) {
        if (!this.temperatureHistoryWithTime || this.temperatureHistoryWithTime.length === 0) return;
        
        const svg = e.currentTarget.ownerSVGElement;
        if (!svg) return;
        
        // Get mouse position relative to SVG
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const svgWidth = 280;
        
        // Calculate which data point is closest
        const dataLength = this.temperatureHistoryWithTime.length;
        const stepX = dataLength > 1 ? svgWidth / (dataLength - 1) : 0;
        const index = Math.round(x / stepX);
        const clampedIndex = Math.max(0, Math.min(dataLength - 1, index));
        
        const dataPoint = this.temperatureHistoryWithTime[clampedIndex];
        if (!dataPoint) return;
        
        // Calculate Y position for the point (same logic as generateGraphPath)
        const graphData = this.temperatureHistory;
        const dataMax = Math.max(...graphData);
        const dataMin = Math.min(...graphData);
        const dataRange = dataMax - dataMin;
        const padding = Math.max(dataRange * 0.2, 2);
        const max = dataMax + padding;
        const min = dataMin - padding;
        const range = max - min;
        
        const normalized = (dataPoint.temp - min) / range;
        const margin = 60 * 0.05;
        const y = margin + (60 - 2 * margin) * (1 - normalized);
        const pointX = clampedIndex * stepX;
        
        // Update point position
        const point = this.shadowRoot?.getElementById('graph-hover-point');
        if (point) {
            point.setAttribute('cx', pointX);
            point.setAttribute('cy', y);
            point.classList.add('visible');
        }
        
        // Update tooltip
        const tooltip = this.shadowRoot?.getElementById('graph-tooltip');
        const tooltipTemp = tooltip?.querySelector('.graph-tooltip-temp');
        const tooltipTime = tooltip?.querySelector('.graph-tooltip-time');
        
        if (tooltip && tooltipTemp && tooltipTime) {
            tooltipTemp.textContent = `${dataPoint.temp.toFixed(1)}°C`;
            tooltipTime.textContent = dataPoint.time.toLocaleString('de-DE', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Position tooltip
            const tooltipRect = tooltip.getBoundingClientRect();
            let tooltipX = e.clientX - rect.left + 10;
            let tooltipY = e.clientY - rect.top - tooltipRect.height - 10;
            
            // Keep tooltip in bounds
            if (tooltipX + tooltipRect.width > rect.width) {
                tooltipX = e.clientX - rect.left - tooltipRect.width - 10;
            }
            if (tooltipY < 0) {
                tooltipY = e.clientY - rect.top + 10;
            }
            
            tooltip.style.left = `${tooltipX}px`;
            tooltip.style.top = `${tooltipY}px`;
            tooltip.classList.add('visible');
        }
    }

    _handleGraphLeave() {
        const point = this.shadowRoot?.getElementById('graph-hover-point');
        const tooltip = this.shadowRoot?.getElementById('graph-tooltip');
        
        if (point) {
            point.classList.remove('visible');
        }
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }

    // Fetch temperature history data from Home Assistant
    async fetchTemperatureHistory() {
        if (this.historyLoading || !this._hass || !this.temperatureEntity) return;
        
        this.historyLoading = true;
        
        try {
            // Calculate timestamps (last 7 days = 168 hours)
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - (168 * 60 * 60 * 1000)); // 168 hours ago
            
            // Format timestamps for Home Assistant API
            const startISO = startTime.toISOString();
            const endISO = endTime.toISOString();
            
            // Call Home Assistant History API
            const response = await this._hass.callWS({
                type: 'history/history_during_period',
                start_time: startISO,
                end_time: endISO,
                entity_ids: [this.temperatureEntity],
                minimal_response: true,
                no_attributes: true,
                significant_changes_only: true
            });
            
            if (response && response.length > 0 && response[0].length > 0) {
                // Extract temperature values with timestamps
                const historyData = response[0];
                // Sample data points (e.g., one per hour) to avoid too many points
                const sampleRate = Math.max(1, Math.floor(historyData.length / 168));
                const sampledDataWithTime = historyData
                    .filter((_, index) => index % sampleRate === 0)
                    .map(entry => ({
                        temp: parseFloat(entry.s),
                        time: entry.lu ? new Date(entry.lu * 1000) : new Date()
                    }))
                    .filter(item => !isNaN(item.temp));
                
                if (sampledDataWithTime.length > 0) {
                    this.temperatureHistoryWithTime = sampledDataWithTime;
                    this.temperatureHistory = sampledDataWithTime.map(item => item.temp);
                    // Re-render to update the graph
                    this.render();
                }
            }
        } catch (error) {
            console.error('Error fetching temperature history:', error);
            // Fallback: use current temperature state if available
            if (this._hass.states[this.temperatureEntity]) {
                const currentTemp = parseFloat(this._hass.states[this.temperatureEntity].state);
                if (!isNaN(currentTemp)) {
                    this.temperatureHistory = [currentTemp, currentTemp, currentTemp, currentTemp, currentTemp];
                }
            }
        } finally {
            this.historyLoading = false;
        }
    }

    // Helper to create smooth SVG path from data points with curved lines
    generateGraphPath(data, width, height) {
        if (!data || data.length === 0) return { line: '', fill: '' };
        
        // Calculate range with padding for better visualization
        const dataMax = Math.max(...data);
        const dataMin = Math.min(...data);
        const dataRange = dataMax - dataMin;
        
        // Add padding: 20% of range, minimum 2 units
        const padding = Math.max(dataRange * 0.2, 2);
        const max = dataMax + padding;
        const min = dataMin - padding;
        const range = max - min;
        
        // Ensure we have a valid range
        if (range <= 0) {
            const midY = height / 2;
            return { 
                line: `M 0,${midY} L ${width},${midY}`,
                fill: `M 0,${midY} L ${width},${midY} L ${width},${height} L 0,${height} Z`
            };
        }
        
        const stepX = data.length > 1 ? width / (data.length - 1) : 0;
        
        // Build line points with proper Y scaling (inverted: higher values = lower Y)
        const points = data.map((val, i) => {
            const x = i * stepX;
            // Calculate Y: higher temp = lower Y position (closer to top)
            const normalized = (val - min) / range;
            // Add small margin at top and bottom (5% of height)
            const margin = height * 0.05;
            const y = margin + (height - 2 * margin) * (1 - normalized);
            return [x, y];
        });

        if (points.length === 0) return { line: '', fill: '' };
        
        // Create smooth curve using Catmull-Rom spline
        const [firstX, firstY] = points[0];
        let linePath = `M ${firstX},${firstY} `;
        
        if (points.length === 1) {
            // Single point - just draw horizontal line
            linePath += `L ${width},${firstY}`;
        } else if (points.length === 2) {
            // Two points - straight line
            const [x, y] = points[1];
            linePath += `L ${x},${y}`;
        } else {
            // Multiple points - use smooth curves
            for (let i = 0; i < points.length - 1; i++) {
                const [x0, y0] = points[i];
                const [x1, y1] = points[i + 1];
                
                // Control points for smooth bezier curve
                const tension = 0.3; // Smoothness factor (0 = sharp, 1 = very smooth)
                const d = Math.abs(x1 - x0) * tension;
                
                linePath += `C ${x0 + d},${y0} ${x1 - d},${y1} ${x1},${y1} `;
            }
        }
        
        // Create fill path (closed area under the curve)
        const [lastX, lastY] = points[points.length - 1];
        let fillPath = linePath; // Start with the same curve
        fillPath += ` L ${lastX},${height} L ${firstX},${height} Z`; // Close at bottom
        
        return { line: linePath.trim(), fill: fillPath.trim() };
    }

    getCardSize() {
        return 10; // Tall card
    }
}

customElements.define('prism-sidebar-light', PrismSidebarLightCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "prism-sidebar-light",
    name: "Prism Sidebar Light",
    preview: true,
    description: "Full height sidebar with clock, camera, weather and energy stats (light theme)"
});


})();

// ============================================
// prism-energy.js
// ============================================
(function() {
/**
 * Prism Energy Card
 * A glassmorphism energy flow card for Home Assistant
 * Designed for OpenEMS/Fenecon integration
 * 
 * Features:
 * - Animated energy flow visualization
 * - Weather effects (rain, snow, fog, sun, moon, stars)
 * - Day/Night transitions with house dimming
 * - Sunrise/Sunset effects
 * 
 * @version 1.2.5
 * @author BangerTech
 */

class PrismEnergyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._animationFrame = null;
  }

  static getStubConfig() {
    return {
      name: "Energy Monitor",
      show_header_icon: true,
      header_icon: "mdi:solar-power-variant",
      solar_power: "",
      grid_power: "",
      battery_soc: "",
      battery_power: "",
      home_consumption: "",
      ev_power: "",
      autarky: "",
      image: "/local/community/Prism-Dashboard/images/prism-energy-home.png",
      max_solar_power: 10000,
      max_grid_power: 10000,
      max_consumption: 10000,
      // Weather effects (optional)
      enable_weather_effects: false,
      weather_entity: "",
      cloud_coverage_entity: "",
      // Solar modules (optional)
      solar_module1: "",
      solar_module1_name: "",
      solar_module2: "",
      solar_module2_name: "",
      solar_module3: "",
      solar_module3_name: "",
      solar_module4: "",
      solar_module4_name: "",
      // Pill positions (optional - in percent)
      solar_pill_top: 22,
      solar_pill_left: 52,
      solar_pill_scale: 1.0,
      grid_pill_top: 32,
      grid_pill_left: 18,
      grid_pill_scale: 1.0,
      home_pill_top: 54,
      home_pill_left: 55,
      home_pill_scale: 1.0,
      battery_pill_top: 60,
      battery_pill_left: 88,
      battery_pill_scale: 1.0,
      ev_pill_top: 72,
      ev_pill_left: 22,
      ev_pill_scale: 1.0
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "name",
          label: "Card Name",
          selector: { text: {} }
        },
        {
          type: "grid",
          name: "",
          schema: [
            {
              name: "show_header_icon",
              label: "Show header icon",
              default: true,
              selector: { boolean: {} }
            },
            {
              name: "header_icon",
              label: "Header icon",
              selector: { icon: {} }
            }
          ]
        },
        {
          name: "image",
          label: "Image URL (default: prism-energy-home.png)",
          selector: { text: {} }
        },
        {
          name: "show_details",
          label: "Show details section at bottom",
          default: true,
          selector: { boolean: {} }
        },
        {
          name: "",
          type: "divider"
        },
        {
          name: "solar_power",
          label: "Solar Power (Total)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "grid_power",
          label: "Grid Power (positive=import, negative=export)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "battery_soc",
          label: "Battery SOC %",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "battery_power",
          label: "Battery Power (positive=discharge, negative=charge)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "home_consumption",
          label: "Home Consumption",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "ev_power",
          label: "EV Charging Power (optional)",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "autarky",
          label: "Autarky % (optional)",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "",
          type: "divider"
        },
        {
          type: "expandable",
          name: "",
          title: "🌤️ Weather & Day/Night Animation",
          schema: [
            {
              name: "enable_weather_effects",
              label: "Enable weather effects",
              selector: { boolean: {} }
            },
            {
              name: "weather_entity",
              label: "Weather Entity (e.g. weather.home)",
              selector: { entity: { domain: "weather" } }
            },
            {
              name: "cloud_coverage_entity",
              label: "Cloud Coverage Sensor (optional, e.g. sensor.openweathermap_cloud_coverage)",
              selector: { entity: { domain: "sensor" } }
            }
          ]
        },
        {
          type: "expandable",
          name: "",
          title: "📊 Maximum Values for Progress Bars",
          schema: [
            {
              name: "max_solar_power",
              label: "Max Solar Power (Watts) - e.g. 10000 for 10kW",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            },
            {
              name: "max_grid_power",
              label: "Max Grid Power (Watts)",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            },
            {
              name: "max_consumption",
              label: "Max Consumption (Watts)",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            }
          ]
        },
        {
          type: "expandable",
          name: "",
          title: "☀️ Solar Modules (optional - for individual display)",
          schema: [
            {
              name: "solar_module1",
              label: "Solar Module 1 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module1_name",
              label: "Module 1 Name (e.g. Roof East)",
              selector: { text: {} }
            },
            {
              name: "solar_module2",
              label: "Solar Module 2 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module2_name",
              label: "Module 2 Name (e.g. Roof West)",
              selector: { text: {} }
            },
            {
              name: "solar_module3",
              label: "Solar Module 3 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module3_name",
              label: "Module 3 Name (e.g. Garage)",
              selector: { text: {} }
            },
            {
              name: "solar_module4",
              label: "Solar Module 4 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module4_name",
              label: "Module 4 Name",
              selector: { text: {} }
            }
          ]
        },
        {
          type: "expandable",
          name: "",
          title: "📍 Pill Positions & Size (optional)",
          schema: [
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "solar_pill_top",
                  label: "Solar pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "solar_pill_left",
                  label: "Solar pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "solar_pill_scale",
                  label: "Solar pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "grid_pill_top",
                  label: "Grid pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "grid_pill_left",
                  label: "Grid pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "grid_pill_scale",
                  label: "Grid pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "home_pill_top",
                  label: "Home pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "home_pill_left",
                  label: "Home pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "home_pill_scale",
                  label: "Home pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "battery_pill_top",
                  label: "Battery pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "battery_pill_left",
                  label: "Battery pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "battery_pill_scale",
                  label: "Battery pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "ev_pill_top",
                  label: "Ev pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "ev_pill_left",
                  label: "Ev pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "ev_pill_scale",
                  label: "Ev pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            }
          ]
        }
      ]
    };
  }

  setConfig(config) {
    this._config = {
      name: config.name || "Energy Monitor",
      show_header_icon: config.show_header_icon !== false,
      header_icon: config.header_icon || "mdi:solar-power-variant",
      solar_power: config.solar_power || "",
      grid_power: config.grid_power || "",
      battery_soc: config.battery_soc || "",
      battery_power: config.battery_power || "",
      home_consumption: config.home_consumption || "",
      ev_power: config.ev_power || "",
      autarky: config.autarky || "",
      image: config.image || "/local/community/Prism-Dashboard/images/prism-energy-home.png",
      show_details: config.show_details !== false,
      // Max values for progress bars (in Watts)
      max_solar_power: config.max_solar_power || 10000,
      max_grid_power: config.max_grid_power || 10000,
      max_consumption: config.max_consumption || 10000,
      // Weather effects
      enable_weather_effects: config.enable_weather_effects || false,
      weather_entity: config.weather_entity || "",
      cloud_coverage_entity: config.cloud_coverage_entity || "",
      // Solar modules
      solar_module1: config.solar_module1 || "",
      solar_module1_name: config.solar_module1_name || "Module 1",
      solar_module2: config.solar_module2 || "",
      solar_module2_name: config.solar_module2_name || "Module 2",
      solar_module3: config.solar_module3 || "",
      solar_module3_name: config.solar_module3_name || "Module 3",
      solar_module4: config.solar_module4 || "",
      solar_module4_name: config.solar_module4_name || "Module 4",
      // Pill positions (in percent) - default values match current layout
      solar_pill_top: config.solar_pill_top ?? 22,
      solar_pill_left: config.solar_pill_left ?? 52,
      solar_pill_scale: config.solar_pill_scale ?? 1.0,
      grid_pill_top: config.grid_pill_top ?? 32,
      grid_pill_left: config.grid_pill_left ?? 18,
      grid_pill_scale: config.grid_pill_scale ?? 1.0,
      home_pill_top: config.home_pill_top ?? 54,
      home_pill_left: config.home_pill_left ?? 55,
      home_pill_scale: config.home_pill_scale ?? 1.0,
      battery_pill_top: config.battery_pill_top ?? 60,
      battery_pill_left: config.battery_pill_left ?? 88,
      battery_pill_scale: config.battery_pill_scale ?? 1.0,
      ev_pill_top: config.ev_pill_top ?? 72,
      ev_pill_left: config.ev_pill_left ?? 22,
      ev_pill_scale: config.ev_pill_scale ?? 1.0
    };
  }

  set hass(hass) {
    this._hass = hass;
    // Only do full render on first load, then just update values
    if (!this._initialized) {
      this.render();
      this._initialized = true;
      // Update details after render to ensure DOM is ready
      requestAnimationFrame(() => {
        this._updateDetails();
      });
    } else {
      this._updateValues();
      this._updateWeatherIfChanged();
    }
  }

  // Check if weather conditions changed and update only weather elements
  _updateWeatherIfChanged() {
    if (!this._config.enable_weather_effects || !this._config.weather_entity) return;
    
    const weatherData = this._getWeatherData();
    // Include cloud coverage in key (rounded to 10% steps to avoid too frequent updates)
    const cloudKey = weatherData.cloudCoverage !== null ? Math.round(weatherData.cloudCoverage / 10) * 10 : 'none';
    const weatherKey = `${weatherData.weatherType}-${weatherData.isNight}-${weatherData.isSunrise}-${weatherData.isSunset}-${cloudKey}`;
    
    // Only update if weather state changed
    if (this._lastWeatherKey === weatherKey) return;
    this._lastWeatherKey = weatherKey;
    
    // Update weather container
    const weatherContainer = this.shadowRoot.querySelector('.weather-container');
    if (weatherContainer) {
      weatherContainer.remove();
    }
    
    const visualContainer = this.shadowRoot.querySelector('.visual-container');
    if (visualContainer) {
      visualContainer.insertAdjacentHTML('afterbegin', this._renderWeatherEffects(weatherData));
      
      // Update night-mode classes
      const houseImg = this.shadowRoot.querySelector('.house-img');
      if (houseImg) {
        houseImg.classList.toggle('night-mode', weatherData.isNight);
      }
      visualContainer.classList.toggle('night-mode', weatherData.isNight);
    }
    
    // Update weather label in header
    const weatherStatus = this.shadowRoot.querySelector('.weather-status');
    if (weatherStatus) {
      const dayNightLabel = this._getDayNightLabel(weatherData.isNight);
      const weatherTypeLabel = this._getWeatherLabel(weatherData);
      weatherStatus.textContent = `${dayNightLabel} • ${weatherTypeLabel}`;
    }
  }

  // Update only the dynamic values without re-rendering (preserves animations)
  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;

    // Use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0); // SOC is percentage, not power
    const batteryPower = this._getStateInWatts(this._config.battery_power, 0);
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);
    const evPower = this._getStateInWatts(this._config.ev_power, 0);
    const autarky = this._getState(this._config.autarky, 0); // Autarky is percentage

    // Update pill values
    this._updateElement('.pill-solar .pill-val', this._formatPower(solarPower));
    this._updateElement('.pill-grid .pill-val', this._formatPower(gridPower));
    this._updateElement('.pill-home .pill-val', this._formatPower(homeConsumption));
    this._updateElement('.pill-battery .pill-val', `${Math.round(batterySoc)}%`);
    
    if (this._config.ev_power) {
      const isEvCharging = evPower > 50;
      this._updateElement('.pill-ev .pill-val', isEvCharging ? this._formatPower(evPower) : this._t('idle'));
    }
    
    if (this._config.autarky) {
      this._updateElement('.autarkie-text', `${Math.round(autarky)}%`);
    }

    // Update flow visibility
    this._updateFlows();
    
    // Update details section values
    this._updateDetails();
  }
  
  // Update detail section values dynamically
  _updateDetails() {
    if (!this.shadowRoot || !this._hass || !this._config.show_details) return;
    
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0);
    const batteryPower = this._getStateInWatts(this._config.battery_power, 0);
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);
    const evPower = this._getStateInWatts(this._config.ev_power, 0);
    
    const isGridExport = gridPower < -50;
    const isEvCharging = evPower > 50;
    const hasEV = !!this._config.ev_power;
    
    const colors = {
      solar: '#F59E0B',
      grid: '#3B82F6',
      battery: '#10B981',
      home: '#8B5CF6',
      ev: '#EC4899'
    };
    
    // Update Solar module values if configured
    const solarContent = this.shadowRoot.querySelector('.details-grid .detail-col:nth-child(1) .detail-content');
    if (solarContent) {
      solarContent.innerHTML = this._renderSolarDetails(solarPower, colors.solar);
    }
    
    // Update Solar bar
    const solarBar = this.shadowRoot.querySelector('.details-grid .detail-col:nth-child(1) .detail-bar');
    if (solarBar) {
      solarBar.innerHTML = this._renderSolarBar(solarPower, colors.solar);
    }
    
    // Update Grid values
    const gridLabel = this.shadowRoot.querySelector('.details-grid .detail-col:nth-child(2) .detail-label');
    const gridVal = this.shadowRoot.querySelector('.details-grid .detail-col:nth-child(2) .detail-val');
    const gridFill = this.shadowRoot.querySelector('.details-grid .detail-col:nth-child(2) .detail-fill');
    if (gridLabel) gridLabel.textContent = isGridExport ? this._t('export') : this._t('import');
    if (gridVal) {
      gridVal.textContent = this._formatPower(gridPower);
      gridVal.style.color = isGridExport ? colors.battery : '#ef4444';
    }
    if (gridFill) {
      gridFill.style.width = `${Math.min(100, (Math.abs(gridPower) / this._config.max_grid_power) * 100)}%`;
      gridFill.style.background = isGridExport ? colors.battery : '#ef4444';
    }
    
    // Update Consumption values
    const consumptionRows = this.shadowRoot.querySelectorAll('.details-grid .detail-col:nth-child(3) .detail-row');
    if (consumptionRows[0]) {
      const valEl = consumptionRows[0].querySelector('.detail-val');
      if (valEl) valEl.textContent = this._formatPower(homeConsumption);
    }
    if (consumptionRows[1] && hasEV) {
      const valEl = consumptionRows[1].querySelector('.detail-val');
      if (valEl) {
        valEl.textContent = isEvCharging ? this._formatPower(evPower) : this._t('idle');
        valEl.style.color = isEvCharging ? colors.ev : 'rgba(255,255,255,0.4)';
      }
    }
    
    // Update Consumption bar
    const consumptionBar = this.shadowRoot.querySelector('.details-grid .detail-col:nth-child(3) .detail-bar');
    if (consumptionBar) {
      if (hasEV && isEvCharging) {
        const totalConsumption = homeConsumption + evPower;
        const totalPercent = Math.min(100, (totalConsumption / this._config.max_consumption) * 100);
        const homeWidth = totalPercent * (homeConsumption / totalConsumption);
        const evWidth = totalPercent * (evPower / totalConsumption);
        // Use flex-basis and no whitespace between segments
        consumptionBar.innerHTML = `<div class="detail-fill-stack"><div class="detail-fill-segment" style="flex-basis:${homeWidth}%;background:${colors.home}"></div><div class="detail-fill-segment" style="flex-basis:${evWidth}%;background:${colors.ev}"></div></div>`;
      } else {
        consumptionBar.innerHTML = `<div class="detail-fill" style="width: ${Math.min(100, (homeConsumption / this._config.max_consumption) * 100)}%; background: ${colors.home};"></div>`;
      }
    }
    
    // Update Storage values
    const storageRows = this.shadowRoot.querySelectorAll('.details-grid .detail-col:nth-child(4) .detail-row');
    if (storageRows[0]) {
      const valEl = storageRows[0].querySelector('.detail-val');
      if (valEl) valEl.textContent = this._formatPower(Math.abs(batteryPower));
    }
    if (storageRows[1]) {
      const valEl = storageRows[1].querySelector('.detail-val');
      if (valEl) valEl.textContent = `${Math.round(batterySoc)}%`;
    }
    
    // Update Storage bar
    const storageFill = this.shadowRoot.querySelector('.details-grid .detail-col:nth-child(4) .detail-fill');
    if (storageFill) {
      storageFill.style.width = `${batterySoc}%`;
    }
  }

  _updateElement(selector, value) {
    const el = this.shadowRoot.querySelector(selector);
    if (el && el.textContent !== value) {
      el.textContent = value;
    }
  }

  _updateFlows() {
    // Use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batteryPower = this._getStateInWatts(this._config.battery_power, 0);
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);
    const evPower = this._getStateInWatts(this._config.ev_power, 0);

    const isSolarActive = solarPower > 50;
    const isGridImport = gridPower > 50;
    const isGridExport = gridPower < -50;
    const isBatteryCharging = batteryPower < -50;
    const isBatteryDischarging = batteryPower > 50;
    const isEvCharging = evPower > 50;
    const hasEV = !!this._config.ev_power;

    // Show/hide flow groups based on state
    this._setFlowVisibility('flow-solar-home', isSolarActive && homeConsumption > 0);
    this._setFlowVisibility('flow-solar-battery', isSolarActive && isBatteryCharging);
    this._setFlowVisibility('flow-solar-grid', isSolarActive && isGridExport);
    this._setFlowVisibility('flow-grid-home', isGridImport);
    this._setFlowVisibility('flow-grid-battery', isGridImport && isBatteryCharging);
    this._setFlowVisibility('flow-battery-home', isBatteryDischarging);
    this._setFlowVisibility('flow-battery-grid', isBatteryDischarging && isGridExport);
    
    if (hasEV) {
      // EV is treated as sub-load of home - only one line from home to EV
      this._setFlowVisibility('flow-home-ev', isEvCharging);
    }
  }

  _setFlowVisibility(className, visible) {
    const el = this.shadowRoot.querySelector(`.${className}`);
    if (el) {
      el.style.display = visible ? 'block' : 'none';
    }
  }

  getCardSize() {
    return 6;
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
  }

  disconnectedCallback() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  // Open more-info dialog for an entity (shows history)
  _openMoreInfo(entityId) {
    if (!entityId || !this._hass) return;
    
    const event = new Event('hass-more-info', {
      bubbles: true,
      composed: true
    });
    event.detail = { entityId: entityId };
    this.dispatchEvent(event);
  }

  // Setup click event listeners for pills
  _setupEventListeners() {
    if (!this.shadowRoot) return;
    
    // Add click listeners to all pills with data-entity attribute
    this.shadowRoot.querySelectorAll('.pill[data-entity]').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = pill.getAttribute('data-entity');
        if (entityId) {
          this._openMoreInfo(entityId);
        }
      });
    });

    // Add click listener to autarkie badge (opens autarky history)
    const autarkieBadge = this.shadowRoot.querySelector('.autarkie-badge[data-entity]');
    if (autarkieBadge) {
      autarkieBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = autarkieBadge.getAttribute('data-entity');
        if (entityId) {
          this._openMoreInfo(entityId);
        }
      });
    }

    // Add click listener to house image (opens home consumption history)
    const houseImg = this.shadowRoot.querySelector('.house-img');
    if (houseImg && this._config.home_consumption) {
      houseImg.addEventListener('click', () => {
        this._openMoreInfo(this._config.home_consumption);
      });
    }
  }

  // Helper to get entity state
  _getState(entityId, defaultVal = 0) {
    if (!entityId || !this._hass) return defaultVal;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return defaultVal;
    const val = parseFloat(stateObj.state);
    return isNaN(val) ? defaultVal : val;
  }

  // Helper to get power entity state normalized to Watts
  // Handles entities that report in kW (like evcc) and converts them to W
  _getStateInWatts(entityId, defaultVal = 0) {
    if (!entityId || !this._hass) return defaultVal;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return defaultVal;
    const val = parseFloat(stateObj.state);
    if (isNaN(val)) return defaultVal;
    
    // Check unit of measurement and convert kW to W if needed
    const unit = stateObj.attributes?.unit_of_measurement?.toLowerCase() || '';
    if (unit === 'kw') {
      return val * 1000; // Convert kW to W
    }
    return val;
  }

  // Helper to format power values
  _formatPower(watts) {
    const absWatts = Math.abs(watts);
    if (absWatts >= 1000) {
      return `${(absWatts / 1000).toFixed(1)} kW`;
    }
    return `${Math.round(absWatts)} W`;
  }

  // Helper to render solar details (modules or total) - just the rows, bar is added externally
  _renderSolarDetails(totalPower, color) {
    // Check if any solar modules are configured
    const modules = [];
    if (this._config.solar_module1) {
      modules.push({
        entity: this._config.solar_module1,
        name: this._config.solar_module1_name || "Module 1"
      });
    }
    if (this._config.solar_module2) {
      modules.push({
        entity: this._config.solar_module2,
        name: this._config.solar_module2_name || "Module 2"
      });
    }
    if (this._config.solar_module3) {
      modules.push({
        entity: this._config.solar_module3,
        name: this._config.solar_module3_name || "Module 3"
      });
    }
    if (this._config.solar_module4) {
      modules.push({
        entity: this._config.solar_module4,
        name: this._config.solar_module4_name || "Module 4"
      });
    }

    // If modules are configured, show individual values
    if (modules.length > 0) {
      let html = '';
      modules.forEach(mod => {
        const power = this._getStateInWatts(mod.entity, 0);
        html += `
          <div class="detail-row">
            <span class="detail-label">${mod.name}</span>
            <span class="detail-val" style="color: ${color};">${this._formatPower(power)}</span>
          </div>
        `;
      });
      return html;
    }

    // Default: show total power only
    return `
      <div class="detail-row">
        <span class="detail-label">${this._t('power')}</span>
        <span class="detail-val" style="color: ${color};">${this._formatPower(totalPower)}</span>
      </div>
    `;
  }

  // Helper to render solar bar with module segments (same color, different opacities)
  _renderSolarBar(totalPower, color) {
    const modules = [];
    if (this._config.solar_module1) modules.push(this._config.solar_module1);
    if (this._config.solar_module2) modules.push(this._config.solar_module2);
    if (this._config.solar_module3) modules.push(this._config.solar_module3);
    if (this._config.solar_module4) modules.push(this._config.solar_module4);

    // If no modules configured, show simple bar
    if (modules.length === 0) {
      return `<div class="detail-fill" style="width: ${Math.min(100, (totalPower / this._config.max_solar_power) * 100)}%; background: ${color};"></div>`;
    }

    // Calculate total power and percentage, then distribute proportionally
    const maxPower = this._config.max_solar_power;
    let modulePowers = modules.map(entityId => this._getStateInWatts(entityId, 0));
    let totalModulePower = modulePowers.reduce((a, b) => a + b, 0);
    let totalPercent = Math.min(100, (totalModulePower / maxPower) * 100);
    
    // Build segments without whitespace (important for flex!)
    let html = '<div class="detail-fill-stack">';
    modulePowers.forEach((power, index) => {
      const segmentWidth = totalModulePower > 0 ? totalPercent * (power / totalModulePower) : 0;
      // Alternate opacity for visual separation (1.0, 0.65, 1.0, 0.65)
      const opacity = index % 2 === 0 ? 1 : 0.65;
      html += `<div class="detail-fill-segment" style="flex-basis:${segmentWidth}%;background:${color};opacity:${opacity}"></div>`;
    });
    html += '</div>';
    return html;
  }

  // Generate animated flow path with real SVG filter glow (CodePen style)
  _renderFlow(path, color, active, reverse = false, className = '') {
    const direction = reverse ? 'reverse' : '';
    const display = active ? 'block' : 'none';
    // Create unique filter ID based on color
    const filterId = `glow-${color.replace('#', '').replace(/[^a-zA-Z0-9]/g, '')}`;
    
    return `
      <g class="flow-group ${className}" style="display: ${display};">
        <!-- Background track (pulsing, async) -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="0.5" stroke-linecap="round" class="flow-track" />
        
        <!-- Glowing animated beam with SVG filter -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="1.2" stroke-opacity="0.9" stroke-linecap="round" 
              class="flow-beam ${direction}" filter="url(#strokeGlow)" />
        
        <!-- Bright core with soft edges -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="0.5" stroke-opacity="0.85" stroke-linecap="round" 
              class="flow-beam ${direction}" filter="url(#softEdge)" />
      </g>
    `;
  }

  // Get weather icon based on conditions
  _getWeatherIcon(weatherData) {
    if (!weatherData.enabled) return 'mdi:weather-sunny';
    
    const { weatherType, isNight } = weatherData;
    
    if (isNight) {
      if (weatherType === 'cloudy') return 'mdi:weather-night-partly-cloudy';
      if (weatherType === 'rainy') return 'mdi:weather-rainy';
      if (weatherType === 'snowy') return 'mdi:weather-snowy';
      if (weatherType === 'foggy') return 'mdi:weather-fog';
      if (weatherType === 'stormy') return 'mdi:weather-lightning';
      return 'mdi:weather-night';
    } else {
      if (weatherType === 'cloudy') return 'mdi:weather-partly-cloudy';
      if (weatherType === 'rainy') return 'mdi:weather-rainy';
      if (weatherType === 'snowy') return 'mdi:weather-snowy';
      if (weatherType === 'foggy') return 'mdi:weather-fog';
      if (weatherType === 'stormy') return 'mdi:weather-lightning';
      if (weatherType === 'windy') return 'mdi:weather-windy';
      return 'mdi:weather-sunny';
    }
  }

  // Get weather label for display (supports EN/DE based on HA language)
  _getWeatherLabel(weatherData) {
    if (!weatherData.enabled) return '';
    
    // Check Home Assistant language
    const lang = this._hass?.language || this._hass?.locale?.language || 'de';
    const isEnglish = lang.startsWith('en');
    
    const labels = isEnglish ? {
      'sunny': 'Sunny',
      'clear': 'Clear',
      'cloudy': 'Cloudy',
      'rainy': 'Rain',
      'snowy': 'Snow',
      'foggy': 'Fog',
      'stormy': 'Storm',
      'windy': 'Windy'
    } : {
      'sunny': 'Sonnig',
      'clear': 'Klar',
      'cloudy': 'Bewölkt',
      'rainy': 'Regen',
      'snowy': 'Schnee',
      'foggy': 'Nebel',
      'stormy': 'Gewitter',
      'windy': 'Windig'
    };
    
    return labels[weatherData.weatherType] || weatherData.weatherType;
  }

  // Get day/night label based on HA language
  _getDayNightLabel(isNight) {
    const lang = this._hass?.language || this._hass?.locale?.language || 'de';
    const isEnglish = lang.startsWith('en');
    
    if (isEnglish) {
      return isNight ? 'Night' : 'Day';
    }
    return isNight ? 'Nacht' : 'Tag';
  }

  // Translate UI labels based on HA language (card display only, not editor)
  _t(key) {
    const lang = this._hass?.language || this._hass?.locale?.language || 'de';
    const isEnglish = lang.startsWith('en');
    
    const translations = {
      // Pill labels
      'production': isEnglish ? 'Production' : 'Erzeugung',
      'inactive': isEnglish ? 'Inactive' : 'Inaktiv',
      'export': isEnglish ? 'Export' : 'Einspeisung',
      'import': isEnglish ? 'Import' : 'Bezug',
      'neutral': isEnglish ? 'Neutral' : 'Neutral',
      'consumption': isEnglish ? 'Consumption' : 'Verbrauch',
      'charging': isEnglish ? 'Charging' : 'Ladung',
      'discharging': isEnglish ? 'Discharging' : 'Entladung',
      'standby': isEnglish ? 'Standby' : 'Standby',
      'idle': isEnglish ? 'Idle' : 'Inaktiv',
      // Detail headers
      'grid': isEnglish ? 'Grid' : 'Netz',
      'storage': isEnglish ? 'Storage' : 'Speicher',
      'current': isEnglish ? 'Current' : 'Aktuell',
      // Detail labels
      'power': isEnglish ? 'Power' : 'Leistung',
      'autarky': isEnglish ? 'Autarky' : 'Autarkie',
      // Module defaults
      'module': isEnglish ? 'Module' : 'Modul',
      // Live indicator
      'live': isEnglish ? 'LIVE' : 'LIVE'
    };
    
    return translations[key] || key;
  }

  // Get weather data from Home Assistant
  _getWeatherData() {
    if (!this._config.enable_weather_effects || !this._config.weather_entity || !this._hass) {
      return { enabled: false };
    }

    // Get weather state
    const weatherState = this._hass.states[this._config.weather_entity];
    const weatherCondition = (weatherState?.state || 'clear').toLowerCase();

    // Get sun state for day/night
    const sunState = this._hass.states['sun.sun'];
    const isNight = sunState?.state === 'below_horizon';
    
    // Get sun elevation for sunrise/sunset effects
    const sunElevation = sunState?.attributes?.elevation || 0;
    const isSunrise = sunElevation > -10 && sunElevation < 10 && !isNight;
    const isSunset = sunElevation > -10 && sunElevation < 10 && isNight;

    // Map HA weather states to animation types
    let weatherType = 'clear';
    if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle') || weatherCondition.includes('shower')) {
      weatherType = 'rainy';
    } else if (weatherCondition.includes('snow') || weatherCondition.includes('sleet') || weatherCondition.includes('hail')) {
      weatherType = 'snowy';
    } else if (weatherCondition.includes('fog') || weatherCondition.includes('mist') || weatherCondition.includes('haze')) {
      weatherType = 'foggy';
    } else if (weatherCondition.includes('cloud') || weatherCondition.includes('overcast')) {
      weatherType = 'cloudy';
    } else if (weatherCondition.includes('clear') || weatherCondition.includes('sunny')) {
      weatherType = 'sunny';
    } else if (weatherCondition.includes('thunder') || weatherCondition.includes('lightning')) {
      weatherType = 'stormy';
    } else if (weatherCondition.includes('wind')) {
      weatherType = 'windy';
    }

    // Get cloud coverage from optional sensor (0-100%)
    let cloudCoverage = null;
    if (this._config.cloud_coverage_entity) {
      const cloudState = this._hass.states[this._config.cloud_coverage_entity];
      if (cloudState) {
        cloudCoverage = parseFloat(cloudState.state) || 0;
      }
    }

    return {
      enabled: true,
      weatherType,
      isNight,
      isSunrise,
      isSunset,
      condition: weatherCondition,
      cloudCoverage
    };
  }

  // Render weather effects HTML
  _renderWeatherEffects(weatherData) {
    if (!weatherData.enabled) return '';

    let html = '<div class="weather-container">';
    const { weatherType, isNight, isSunrise, isSunset } = weatherData;

    // Rain effect (optimized for mobile performance)
    if (weatherType === 'rainy' || weatherType === 'stormy') {
      const dropCount = weatherType === 'stormy' ? 25 : 15;
      for (let i = 0; i < dropCount; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 0.6 + Math.random() * 0.4;
        html += `<div class="rain-drop" style="left: ${left}%; animation-delay: ${delay}s; animation-duration: ${duration}s;"></div>`;
      }
    }

    // Snow effect (optimized for mobile performance)
    if (weatherType === 'snowy') {
      for (let i = 0; i < 25; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 6;
        const duration = 5 + Math.random() * 5;
        const size = 3 + Math.random() * 3;
        html += `<div class="snow-flake" style="left: ${left}%; animation-delay: ${delay}s; animation-duration: ${duration}s; width: ${size}px; height: ${size}px;"></div>`;
      }
    }

    // Fog effect
    if (weatherType === 'foggy') {
      html += `<div class="fog-layer fog-1"></div>`;
      html += `<div class="fog-layer fog-2"></div>`;
      html += `<div class="fog-layer fog-3"></div>`;
    }

    // Lightning effect for storms
    if (weatherType === 'stormy') {
      html += `<div class="lightning"></div>`;
    }

    // Night effects: stars and moon
    if (isNight) {
      // Stars - only in top 15-20% of the card
      html += '<div class="stars-container">';
      for (let i = 0; i < 20; i++) {
        const left = Math.random() * 100;
        const top = Math.random() * 18; // Only top 18%
        const size = 1 + Math.random() * 1.5;
        const delay = Math.random() * 3;
        const brightness = 0.2 + Math.random() * 0.3; // More transparent (0.2-0.5)
        html += `<div class="star" style="left: ${left}%; top: ${top}%; width: ${size}px; height: ${size}px; animation-delay: ${delay}s; opacity: ${brightness};"></div>`;
      }
      html += '</div>';

      // Moon (only if not completely cloudy) - more subtle
      if (weatherType !== 'foggy' && weatherType !== 'stormy') {
        html += `
          <div class="moon">
            <div class="moon-crater c1"></div>
            <div class="moon-crater c2"></div>
            <div class="moon-crater c3"></div>
          </div>
        `;
      }
    } else {
      // Day effects: sun glow - more subtle
      if (weatherType === 'sunny' || weatherType === 'clear') {
        html += '<div class="sun-glow"></div>';
      }
    }

    // Sunrise/Sunset gradient overlay
    if (isSunrise) {
      html += '<div class="sunrise-overlay"></div>';
    } else if (isSunset) {
      html += '<div class="sunset-overlay"></div>';
    }

    // Clouds based on cloud coverage or weather type
    const cloudCoverage = weatherData.cloudCoverage;
    const showClouds = (weatherType === 'cloudy' || (cloudCoverage !== null && cloudCoverage > 0)) && 
                       weatherType !== 'foggy' && !isNight;
    
    if (showClouds) {
      // Determine cloud count based on coverage (if available) or default to all
      let staticCount = 3;
      let movingCount = 4;
      
      if (cloudCoverage !== null) {
        // Scale clouds based on coverage percentage
        if (cloudCoverage <= 20) {
          staticCount = 0; movingCount = 1;
        } else if (cloudCoverage <= 40) {
          staticCount = 1; movingCount = 1;
        } else if (cloudCoverage <= 55) {
          staticCount = 2; movingCount = 2;
        } else if (cloudCoverage <= 70) {
          staticCount = 2; movingCount = 3;
        } else if (cloudCoverage <= 85) {
          staticCount = 3; movingCount = 3;
        } else {
          staticCount = 3; movingCount = 4;
        }
      }
      
      html += '<!-- Clouds based on coverage -->';
      // Static clouds
      if (staticCount >= 1) html += '<div class="cloud cloud-static cloud-static-1"></div>';
      if (staticCount >= 2) html += '<div class="cloud cloud-static cloud-static-2"></div>';
      if (staticCount >= 3) html += '<div class="cloud cloud-static cloud-static-3"></div>';
      // Moving clouds
      if (movingCount >= 1) html += '<div class="cloud cloud-moving cloud-1"></div>';
      if (movingCount >= 2) html += '<div class="cloud cloud-moving cloud-2"></div>';
      if (movingCount >= 3) html += '<div class="cloud cloud-moving cloud-3"></div>';
      if (movingCount >= 4) html += '<div class="cloud cloud-moving cloud-4"></div>';
    }

    html += '</div>';
    return html;
  }

  // Get weather-related CSS styles
  _getWeatherStyles() {
    return `
      /* Weather Container - between house image and UI elements */
      .weather-container {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
        border-radius: 24px;
      }

      /* Rain Animation (optimized for mobile performance) */
      .rain-drop {
        position: absolute;
        width: 2px;
        height: 20px;
        background: linear-gradient(to bottom, transparent, rgba(174, 194, 224, 0.6), rgba(174, 194, 224, 0.8));
        top: 0;
        border-radius: 0 0 2px 2px;
        opacity: 0;
        /* GPU acceleration */
        will-change: transform, opacity;
        contain: layout style paint;
        animation: rain-fall linear infinite;
      }
      @keyframes rain-fall {
        0% { transform: translateY(-30px); opacity: 0; }
        5% { opacity: 0.7; }
        95% { opacity: 0.7; }
        100% { transform: translateY(100vh); opacity: 0; }
      }

      /* Snow Animation (optimized for mobile performance) */
      .snow-flake {
        position: absolute;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        top: 0;
        opacity: 0;
        /* GPU acceleration */
        will-change: transform, opacity;
        contain: layout style paint;
        animation: snow-fall linear infinite;
        /* Glow effect kept for visual appeal */
        box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
      }
      @keyframes snow-fall {
        0% { 
          transform: translateY(-10px) translateX(0); 
          opacity: 0; 
        }
        5% { opacity: 0.7; }
        50% { transform: translateY(50vh) translateX(20px); }
        95% { opacity: 0.7; }
        100% { 
          transform: translateY(100vh) translateX(-20px); 
          opacity: 0; 
        }
      }

      /* Fog Animation */
      .fog-layer {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg, 
          transparent 0%, 
          rgba(200, 210, 220, 0.15) 20%, 
          rgba(200, 210, 220, 0.25) 50%, 
          rgba(200, 210, 220, 0.15) 80%, 
          transparent 100%
        );
        animation: fog-drift linear infinite;
        filter: blur(30px);
      }
      .fog-1 { animation-duration: 25s; }
      .fog-2 { animation-duration: 35s; animation-direction: reverse; opacity: 0.7; }
      .fog-3 { animation-duration: 45s; animation-delay: -10s; opacity: 0.5; top: 30%; }
      @keyframes fog-drift {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      /* Stars Animation - subtle, only in top area */
      .stars-container {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
      }
      .star {
        position: absolute;
        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.8), rgba(170, 204, 255, 0.5));
        border-radius: 50%;
        animation: star-twinkle 4s ease-in-out infinite;
        box-shadow: 0 0 3px rgba(255, 255, 255, 0.3);
      }
      @keyframes star-twinkle {
        0%, 100% { opacity: 0.2; transform: scale(0.9); }
        50% { opacity: 0.5; transform: scale(1.1); }
      }

      /* Moon - subtle and transparent, positioned below autarky badge */
      .moon {
        position: absolute;
        top: 50px;
        right: 60px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(245, 245, 245, 0.5) 0%, rgba(232, 232, 232, 0.4) 50%, rgba(208, 208, 208, 0.3) 100%);
        box-shadow: 
          0 0 15px rgba(255, 255, 255, 0.15),
          0 0 30px rgba(255, 255, 255, 0.08);
        z-index: 0;
        opacity: 0.6;
      }
      .moon-crater {
        position: absolute;
        background: radial-gradient(circle at 60% 40%, rgba(180, 180, 180, 0.3), rgba(160, 160, 160, 0.4));
        border-radius: 50%;
        box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.15);
      }
      .moon-crater.c1 { width: 10px; height: 10px; top: 6px; right: 8px; }
      .moon-crater.c2 { width: 6px; height: 6px; bottom: 10px; left: 10px; }
      .moon-crater.c3 { width: 5px; height: 5px; top: 16px; left: 6px; }

      /* Sun Glow - subtle, positioned in top area */
      .sun-glow {
        position: absolute;
        top: 50px;
        right: 100px;
        width: 150px;
        height: 150px;
        background: radial-gradient(
          circle at center,
          rgba(255, 200, 50, 0.2) 0%,
          rgba(255, 180, 50, 0.1) 30%,
          rgba(255, 160, 50, 0.05) 50%,
          transparent 70%
        );
        filter: blur(25px);
        z-index: 0;
        animation: sun-pulse 10s ease-in-out infinite;
      }
      @keyframes sun-pulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }

      /* Sunrise/Sunset Overlays - subtle gradients, below UI */
      .sunrise-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to top,
          rgba(255, 150, 80, 0.08) 0%,
          rgba(255, 180, 100, 0.05) 20%,
          transparent 50%
        );
        z-index: 0;
        pointer-events: none;
      }
      .sunset-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to top,
          rgba(255, 100, 50, 0.1) 0%,
          rgba(255, 80, 80, 0.08) 15%,
          rgba(180, 80, 120, 0.05) 35%,
          transparent 60%
        );
        z-index: 0;
        pointer-events: none;
      }

      /* Lightning Effect - below UI elements */
      .lightning {
        position: absolute;
        inset: 0;
        background: rgba(255, 255, 255, 0);
        animation: lightning-flash 8s infinite;
        z-index: 0;
        pointer-events: none;
      }
      @keyframes lightning-flash {
        0%, 89%, 91%, 93%, 100% { background: rgba(255, 255, 255, 0); }
        90%, 92% { background: rgba(255, 255, 255, 0.3); }
      }

      /* Clouds - subtle, only in top area, below UI */
      .cloud {
        position: absolute;
        background: linear-gradient(
          to bottom,
          rgba(255, 255, 255, 0.3) 0%,
          rgba(220, 220, 230, 0.2) 100%
        );
        border-radius: 50px;
        filter: blur(3px);
        z-index: 0;
      }
      .cloud::before, .cloud::after {
        content: '';
        position: absolute;
        background: inherit;
        border-radius: 50%;
      }
      .cloud-1 {
        width: 60px; height: 22px;
        top: 8%; left: -80px;
        animation-duration: 50s;
        opacity: 0.4;
      }
      .cloud-1::before { width: 30px; height: 30px; top: -15px; left: 12px; }
      .cloud-1::after { width: 35px; height: 35px; top: -18px; left: 28px; }
      .cloud-2 {
        width: 45px; height: 18px;
        top: 12%; left: -60px;
        animation-duration: 65s;
        animation-delay: -20s;
        opacity: 0.3;
      }
      .cloud-2::before { width: 22px; height: 22px; top: -12px; left: 8px; }
      .cloud-2::after { width: 28px; height: 28px; top: -14px; left: 20px; }
      .cloud-3 {
        width: 70px; height: 25px;
        top: 5%; left: -90px;
        animation-duration: 80s;
        animation-delay: -35s;
        opacity: 0.25;
      }
      .cloud-3::before { width: 35px; height: 35px; top: -18px; left: 15px; }
      .cloud-3::after { width: 42px; height: 42px; top: -22px; left: 35px; }
      .cloud-4 {
        width: 50px; height: 18px;
        top: 16%; left: -70px;
        animation-duration: 60s;
        animation-delay: -15s;
        opacity: 0.32;
      }
      .cloud-4::before { width: 25px; height: 25px; top: -12px; left: 10px; }
      .cloud-4::after { width: 30px; height: 30px; top: -15px; left: 24px; }
      
      /* Static clouds - gently float in place */
      .cloud-static {
        animation: cloud-float 8s ease-in-out infinite;
      }
      .cloud-static-1 {
        width: 55px; height: 20px;
        top: 15%; left: 25%;
        opacity: 0.35;
      }
      .cloud-static-1::before { width: 28px; height: 28px; top: -14px; left: 10px; }
      .cloud-static-1::after { width: 32px; height: 32px; top: -16px; left: 25px; }
      .cloud-static-2 {
        width: 48px; height: 18px;
        top: 11%; left: 60%;
        opacity: 0.3;
        animation-delay: -3s;
      }
      .cloud-static-2::before { width: 24px; height: 24px; top: -12px; left: 8px; }
      .cloud-static-2::after { width: 28px; height: 28px; top: -14px; left: 22px; }
      .cloud-static-3 {
        width: 42px; height: 16px;
        top: 18%; left: 45%;
        opacity: 0.28;
        animation-delay: -5s;
      }
      .cloud-static-3::before { width: 20px; height: 20px; top: -10px; left: 7px; }
      .cloud-static-3::after { width: 24px; height: 24px; top: -12px; left: 18px; }
      
      /* Moving clouds - use individual properties to not override duration/delay */
      .cloud-moving {
        animation-name: cloud-drift;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      
      @keyframes cloud-drift {
        0% { transform: translateX(0); }
        100% { transform: translateX(calc(100vw + 200px)); }
      }
      @keyframes cloud-float {
        0%, 100% { transform: translateX(0) translateY(0); }
        25% { transform: translateX(5px) translateY(-3px); }
        50% { transform: translateX(0) translateY(-5px); }
        75% { transform: translateX(-5px) translateY(-2px); }
      }

      /* Night mode house dimming */
      .house-img.night-mode {
        filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5)) brightness(0.55) saturate(0.85);
        transition: filter 1s ease;
      }
      
      /* Night background adjustment - subtle darkening at top */
      .visual-container.night-mode {
        background: linear-gradient(
          to bottom,
          rgba(15, 23, 42, 0.2) 0%,
          transparent 40%
        );
      }
    `;
  }

  render() {
    if (!this.shadowRoot) return;

    // Get current values - use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0); // SOC is percentage, not power
    const batteryPower = this._getStateInWatts(this._config.battery_power, 0);
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);
    const evPower = this._getStateInWatts(this._config.ev_power, 0);
    const autarky = this._getState(this._config.autarky, 0); // Autarky is percentage
    
    const hasEV = !!this._config.ev_power;
    const hasAutarky = !!this._config.autarky;
    const houseImg = this._config.image;
    
    // Get weather data
    const weatherData = this._getWeatherData();

    // Determine flow states
    // OpenEMS: GridActivePower positive = import, negative = export
    // OpenEMS: EssDischargePower positive = discharge, negative = charge
    const isSolarActive = solarPower > 50;
    const isGridImport = gridPower > 50;
    const isGridExport = gridPower < -50;
    const isBatteryCharging = batteryPower < -50;
    const isBatteryDischarging = batteryPower > 50;
    const isEvCharging = evPower > 50;

    // Battery icon based on SOC
    let batteryIcon = "mdi:battery";
    if (batterySoc >= 90) batteryIcon = "mdi:battery";
    else if (batterySoc >= 70) batteryIcon = "mdi:battery-80";
    else if (batterySoc >= 50) batteryIcon = "mdi:battery-60";
    else if (batterySoc >= 30) batteryIcon = "mdi:battery-40";
    else if (batterySoc >= 10) batteryIcon = "mdi:battery-20";
    else batteryIcon = "mdi:battery-outline";
    
    if (isBatteryCharging) batteryIcon = "mdi:battery-charging";

    // Get pill positions and scale from config (with defaults)
    const pillPos = {
      solar: { x: this._config.solar_pill_left, y: this._config.solar_pill_top, scale: this._config.solar_pill_scale },
      grid: { x: this._config.grid_pill_left, y: this._config.grid_pill_top, scale: this._config.grid_pill_scale },
      home: { x: this._config.home_pill_left, y: this._config.home_pill_top, scale: this._config.home_pill_scale },
      battery: { x: this._config.battery_pill_left, y: this._config.battery_pill_top, scale: this._config.battery_pill_scale },
      ev: { x: this._config.ev_pill_left, y: this._config.ev_pill_top, scale: this._config.ev_pill_scale }
    };

    // Helper to calculate control point for smooth curves
    const midPoint = (p1, p2) => ({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    });

    // SVG Paths for energy flows (dynamically calculated based on pill positions)
    const paths = {
      // Solar flows from top (roof area)
      solarToHome: `M ${pillPos.solar.x} ${pillPos.solar.y} Q ${midPoint(pillPos.solar, pillPos.home).x + 1} ${midPoint(pillPos.solar, pillPos.home).y} ${pillPos.home.x} ${pillPos.home.y}`,
      solarToBattery: `M ${pillPos.solar.x} ${pillPos.solar.y} Q ${midPoint(pillPos.solar, pillPos.battery).x} ${midPoint(pillPos.solar, pillPos.battery).y} ${pillPos.battery.x} ${pillPos.battery.y}`,
      solarToGrid: `M ${pillPos.solar.x} ${pillPos.solar.y} Q ${midPoint(pillPos.solar, pillPos.grid).x} ${midPoint(pillPos.solar, pillPos.grid).y} ${pillPos.grid.x} ${pillPos.grid.y}`,
      
      // Grid flows from left (power pole)
      gridToHome: `M ${pillPos.grid.x} ${pillPos.grid.y} Q ${midPoint(pillPos.grid, pillPos.home).x} ${midPoint(pillPos.grid, pillPos.home).y} ${pillPos.home.x} ${pillPos.home.y}`,
      gridToBattery: `M ${pillPos.grid.x} ${pillPos.grid.y} Q ${midPoint(pillPos.grid, pillPos.battery).x} ${midPoint(pillPos.grid, pillPos.battery).y} ${pillPos.battery.x} ${pillPos.battery.y}`,
      
      // Battery flows from right (battery storage)
      batteryToHome: `M ${pillPos.battery.x} ${pillPos.battery.y} Q ${midPoint(pillPos.battery, pillPos.home).x} ${midPoint(pillPos.battery, pillPos.home).y} ${pillPos.home.x} ${pillPos.home.y}`,
      batteryToGrid: `M ${pillPos.battery.x} ${pillPos.battery.y} Q ${midPoint(pillPos.battery, pillPos.grid).x} ${midPoint(pillPos.battery, pillPos.grid).y} ${pillPos.grid.x} ${pillPos.grid.y}`,
      
      // EV flow from home (EV is sub-load of home)
      homeToEv: `M ${pillPos.home.x} ${pillPos.home.y} Q ${midPoint(pillPos.home, pillPos.ev).x} ${midPoint(pillPos.home, pillPos.ev).y} ${pillPos.ev.x} ${pillPos.ev.y}`
    };

    // Colors
    const colors = {
      solar: '#F59E0B',
      grid: '#3B82F6',
      battery: '#10B981',
      home: '#8B5CF6',
      ev: '#EC4899'
    };

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .card {
          position: relative;
          width: 100%;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: rgba(30, 32, 36, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.3);
          color: white;
          box-sizing: border-box;
          user-select: none;
        }
        
        .noise {
          position: absolute;
          inset: 0;
          opacity: 0.02;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }

        /* Header - must be above weather animations */
        .header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 50;
          background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .icon-circle {
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colors.solar};
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .icon-circle ha-icon {
          width: 22px;
          height: 22px;
          --mdc-icon-size: 22px;
          filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.6));
        }
        
        .title-group h2 {
          font-size: 1.125rem;
          font-weight: 700;
          line-height: 1;
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }
        
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 8px #22c55e;
        }
        
        .live-text {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #4ade80;
        }
        
        .weather-separator {
          margin: 0 6px;
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.65rem;
        }
        
        .weather-status {
          font-size: 0.65rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
        }
        
        .autarkie-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
        }
        
        .autarkie-text {
          font-size: 0.8rem;
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
        }

        /* Main Visual */
        .visual-container {
          position: relative;
          width: 100%;
          min-height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          padding-top: 20px;
        }
        
        .house-img {
          width: 110%;
          max-width: none;
          object-fit: contain;
          margin-left: -1.5rem;
          margin-top: 1rem;
          z-index: 0;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.4));
        }
        
        .bottom-gradient {
          position: absolute;
          inset: auto 0 0 0;
          height: 8rem;
          background: linear-gradient(to top, rgba(30, 32, 36, 1), transparent);
          pointer-events: none;
          z-index: 5;
        }

        /* SVG Overlay */
        .svg-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        
        /* 
         * Smooth flow animation - simple dash moving along path
         * Like reference: https://www.mediaevent.de/wp-content/uploads/2021/06/schach-dashline-lineart.svg
         */
        @keyframes flow-animation {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes flow-animation-reverse {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 100;
          }
        }
        
        @keyframes track-pulse {
          0%, 100% {
            stroke-opacity: 0.18;
          }
          50% {
            stroke-opacity: 0.06;
          }
        }
        
        .flow-track {
          animation: track-pulse 2.2s ease-in-out infinite;
        }
        
        .flow-beam {
          stroke-dasharray: 25 75;
          animation: flow-animation 3s linear infinite;
        }
        
        .flow-beam.reverse {
          stroke-dasharray: 25 75;
          animation: flow-animation-reverse 3s linear infinite;
        }

        /* Data Pills - Inlet Style */
        .pill {
          --pill-scale: 1;
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(20, 20, 20, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 999px;
          padding: 6px 10px 6px 6px;
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.6),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03),
            0 4px 8px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 20;
          transform: translate(-50%, -50%) scale(var(--pill-scale));
          white-space: nowrap;
          transition: all 0.3s ease;
        }
        
        .pill:hover {
          transform: translate(-50%, -50%) scale(calc(var(--pill-scale) * 1.03));
        }
        
        .pill[data-entity] {
          cursor: pointer;
        }
        
        .pill[data-entity]:active {
          transform: translate(-50%, -50%) scale(calc(var(--pill-scale) * 0.97));
        }
        
        .house-img {
          cursor: pointer;
          transition: filter 0.2s ease;
        }
        
        .house-img:hover {
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.4)) brightness(1.05);
        }
        
        .pill-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .pill-icon ha-icon {
          --mdc-icon-size: 16px;
        }
        
        .pill-content {
          display: flex;
          flex-direction: column;
          line-height: 1;
          gap: 1px;
        }
        
        .pill-val {
          font-size: 0.8rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .pill-label {
          font-size: 0.5rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
        }

        /* Pill Icon Colors */
        .bg-solar {
          background: rgba(245, 158, 11, 0.15);
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
        }
        .color-solar { color: ${colors.solar}; }
        
        .bg-grid {
          background: rgba(59, 130, 246, 0.15);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
        }
        .color-grid { color: ${colors.grid}; }
        
        .bg-battery {
          background: rgba(16, 185, 129, 0.15);
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
        }
        .color-battery { color: ${colors.battery}; }
        
        .bg-home {
          background: rgba(139, 92, 246, 0.15);
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
        }
        .color-home { color: ${colors.home}; }
        
        .bg-ev {
          background: rgba(236, 72, 153, 0.15);
          box-shadow: 0 0 8px rgba(236, 72, 153, 0.3);
        }
        .color-ev { color: ${colors.ev}; }
        
        .bg-inactive {
          background: rgba(255, 255, 255, 0.03);
          box-shadow: none;
        }
        .color-inactive { color: rgba(255, 255, 255, 0.35); }

        /* Bottom Details */
        .details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 20px 24px;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        @media (max-width: 600px) {
          .details-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .detail-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 90px;
        }
        
        .detail-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        
        .detail-header {
          /* Neumorphic Raised Chip */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 12px;
          margin-bottom: 10px;
          
          background: linear-gradient(145deg, #2d3038, #22252b);
          border-radius: 20px;
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
          
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.08em;
          white-space: nowrap;
          
          transition: all 0.2s ease;
        }
        
        .detail-header:hover {
          box-shadow: 
            4px 4px 8px rgba(0, 0, 0, 0.5),
            -3px -3px 6px rgba(255, 255, 255, 0.04),
            inset 1px 1px 2px rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.8);
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          gap: 8px;
          white-space: nowrap;
        }
        
        .detail-label {
          color: rgba(255, 255, 255, 0.6);
          flex-shrink: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .detail-val {
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          flex-shrink: 0;
          white-space: nowrap;
        }
        
        /* Inlet-style progress bar - aligned at bottom */
        .detail-bar {
          height: 6px;
          width: 100%;
          border-radius: 999px;
          overflow: hidden;
          margin-top: auto;
          background: rgba(0, 0, 0, 0.4);
          box-shadow: 
            inset 1px 1px 3px rgba(0, 0, 0, 0.5),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.3);
        }
        
        .detail-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s ease;
          box-shadow: 0 0 6px currentColor;
        }
        
        /* Stacked/segmented progress bar - using flex-basis instead of width */
        .detail-fill-stack {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          align-items: stretch !important;
          width: 100%;
          height: 100%;
          border-radius: 999px;
          overflow: hidden;
        }
        
        .detail-fill-segment {
          display: block !important;
          height: 100%;
          min-width: 1px;
          flex-grow: 0;
          flex-shrink: 0;
          transition: flex-basis 0.5s ease;
        }
        
        .detail-fill-segment:first-child {
          border-radius: 4px 0 0 4px;
        }
        
        .detail-fill-segment:last-child {
          border-radius: 0 4px 4px 0;
        }
        
        .detail-fill-segment:only-child {
          border-radius: 999px;
        }

        ha-icon {
          --mdc-icon-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        ${this._getWeatherStyles()}
      </style>

      <div class="card">
        <div class="noise"></div>
        
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            ${this._config.show_header_icon ? `
            <div class="icon-circle">
              <ha-icon icon="${this._config.header_icon}"></ha-icon>
            </div>
            ` : ''}
            <div class="title-group">
              <h2>${this._config.name}</h2>
              <div class="live-indicator">
                <div class="dot"></div>
                <span class="live-text">Live</span>
                ${weatherData.enabled ? `
                <span class="weather-separator">|</span>
                <span class="weather-status">${this._getDayNightLabel(weatherData.isNight)} • ${this._getWeatherLabel(weatherData)}</span>
                ` : ''}
              </div>
            </div>
          </div>
          ${hasAutarky ? `
          <div class="autarkie-badge" data-entity="${this._config.autarky}">
            <ha-icon icon="mdi:leaf" style="color: #4ade80; --mdc-icon-size: 16px;"></ha-icon>
            <span class="autarkie-text">${Math.round(autarky)}%</span>
          </div>
          ` : ''}
        </div>

        <!-- Main Visual -->
        <div class="visual-container ${weatherData.enabled && weatherData.isNight ? 'night-mode' : ''}">
          ${weatherData.enabled ? this._renderWeatherEffects(weatherData) : ''}
          <img src="${houseImg}" class="house-img ${weatherData.enabled && weatherData.isNight ? 'night-mode' : ''}" alt="Energy Home" />
          <div class="bottom-gradient"></div>

          <!-- SVG Flows -->
          <svg class="svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
            <!-- Glow filter definition -->
            <defs>
              <!-- Stroke Glow Filter (soft edges) -->
              <filter id="strokeGlow" x="-100%" y="-100%" width="300%" height="300%" filterUnits="userSpaceOnUse">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur2" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="softCore" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="softCore" />
                </feMerge>
              </filter>
              <!-- Soft Core Filter (minimal blur for smooth edges) -->
              <filter id="softEdge" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" />
              </filter>
            </defs>
            
            <!-- Solar Flows -->
            ${this._renderFlow(paths.solarToHome, colors.solar, isSolarActive && homeConsumption > 0, false, 'flow-solar-home')}
            ${this._renderFlow(paths.solarToBattery, colors.solar, isSolarActive && isBatteryCharging, false, 'flow-solar-battery')}
            ${this._renderFlow(paths.solarToGrid, colors.solar, isSolarActive && isGridExport, false, 'flow-solar-grid')}

            <!-- Grid Flows -->
            ${this._renderFlow(paths.gridToHome, colors.grid, isGridImport, false, 'flow-grid-home')}
            ${this._renderFlow(paths.gridToBattery, colors.grid, isGridImport && isBatteryCharging, false, 'flow-grid-battery')}

            <!-- Battery Flows -->
            ${this._renderFlow(paths.batteryToHome, colors.battery, isBatteryDischarging, false, 'flow-battery-home')}
            ${this._renderFlow(paths.batteryToGrid, colors.battery, isBatteryDischarging && isGridExport, false, 'flow-battery-grid')}

            <!-- EV Flow (sub-load of home) -->
            ${hasEV ? this._renderFlow(paths.homeToEv, colors.ev, isEvCharging, false, 'flow-home-ev') : ''}
          </svg>

          <!-- Solar Pill (Top - Roof) - Clickable for history -->
          <div class="pill pill-solar" style="top: ${pillPos.solar.y}%; left: ${pillPos.solar.x}%; --pill-scale: ${pillPos.solar.scale};" data-entity="${this._config.solar_power}">
            <div class="pill-icon ${isSolarActive ? 'bg-solar' : 'bg-inactive'}">
              <ha-icon icon="mdi:solar-power" class="${isSolarActive ? 'color-solar' : 'color-inactive'}"></ha-icon>
            </div>
            <div class="pill-content">
              <span class="pill-val">${this._formatPower(solarPower)}</span>
              <span class="pill-label">${isSolarActive ? this._t('production') : this._t('inactive')}</span>
            </div>
          </div>

          <!-- Grid Pill (Left - Power Pole) - Clickable for history -->
          <div class="pill pill-grid" style="top: ${pillPos.grid.y}%; left: ${pillPos.grid.x}%; --pill-scale: ${pillPos.grid.scale};" data-entity="${this._config.grid_power}">
            <div class="pill-icon ${isGridImport || isGridExport ? 'bg-grid' : 'bg-inactive'}">
              <ha-icon icon="mdi:transmission-tower" class="${isGridImport || isGridExport ? 'color-grid' : 'color-inactive'}"></ha-icon>
            </div>
            <div class="pill-content">
              <span class="pill-val">${this._formatPower(gridPower)}</span>
              <span class="pill-label">${isGridExport ? this._t('export') : isGridImport ? this._t('import') : this._t('neutral')}</span>
            </div>
          </div>

          <!-- Home Pill (Center - House) - Clickable for history -->
          <div class="pill pill-home" style="top: ${pillPos.home.y}%; left: ${pillPos.home.x}%; --pill-scale: ${pillPos.home.scale};" data-entity="${this._config.home_consumption}">
            <div class="pill-icon bg-home">
              <ha-icon icon="mdi:home-lightning-bolt" class="color-home"></ha-icon>
            </div>
            <div class="pill-content">
              <span class="pill-val">${this._formatPower(homeConsumption)}</span>
              <span class="pill-label">${this._t('consumption')}</span>
            </div>
          </div>

          <!-- Battery Pill (Right - Battery Storage) - Clickable for history -->
          <div class="pill pill-battery" style="top: ${pillPos.battery.y}%; left: ${pillPos.battery.x}%; --pill-scale: ${pillPos.battery.scale};" data-entity="${this._config.battery_soc}">
            <div class="pill-icon ${isBatteryCharging || isBatteryDischarging ? 'bg-battery' : 'bg-inactive'}">
              <ha-icon icon="${batteryIcon}" class="${isBatteryCharging || isBatteryDischarging ? 'color-battery' : 'color-inactive'}"></ha-icon>
            </div>
            <div class="pill-content">
              <span class="pill-val">${Math.round(batterySoc)}%</span>
              <span class="pill-label">${isBatteryCharging ? this._t('charging') : isBatteryDischarging ? this._t('discharging') : this._t('standby')}</span>
            </div>
          </div>

          <!-- EV Pill (Bottom Left - Carport) - Clickable for history -->
          ${hasEV ? `
          <div class="pill pill-ev" style="top: ${pillPos.ev.y}%; left: ${pillPos.ev.x}%; --pill-scale: ${pillPos.ev.scale};" data-entity="${this._config.ev_power}">
            <div class="pill-icon ${isEvCharging ? 'bg-ev' : 'bg-inactive'}">
              <ha-icon icon="mdi:car-electric" class="${isEvCharging ? 'color-ev' : 'color-inactive'}"></ha-icon>
            </div>
            <div class="pill-content">
              <span class="pill-val">${isEvCharging ? this._formatPower(evPower) : this._t('idle')}</span>
              <span class="pill-label">EV</span>
            </div>
          </div>
          ` : ''}
        </div>

        <!-- Bottom Details -->
        ${this._config.show_details ? `
        <div class="details-grid">
          <!-- Solar -->
          <div class="detail-col">
            <div class="detail-header">Solar</div>
            <div class="detail-content">
              ${this._renderSolarDetails(solarPower, colors.solar)}
            </div>
            <div class="detail-bar">
              ${this._renderSolarBar(solarPower, colors.solar)}
            </div>
          </div>

          <!-- Grid -->
          <div class="detail-col">
            <div class="detail-header">${this._t('grid')}</div>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">${isGridExport ? this._t('export') : this._t('import')}</span>
                <span class="detail-val" style="color: ${isGridExport ? colors.battery : '#ef4444'};">${this._formatPower(gridPower)}</span>
              </div>
            </div>
            <div class="detail-bar">
              <div class="detail-fill" style="width: ${Math.min(100, (Math.abs(gridPower) / this._config.max_grid_power) * 100)}%; background: ${isGridExport ? colors.battery : '#ef4444'};"></div>
            </div>
          </div>

          <!-- Consumption (including EV if configured) -->
          <div class="detail-col">
            <div class="detail-header">${this._t('consumption')}</div>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">${this._t('current')}</span>
                <span class="detail-val">${this._formatPower(homeConsumption)}</span>
              </div>
              ${hasEV ? `
              <div class="detail-row">
                <span class="detail-label">E-Auto</span>
                <span class="detail-val" style="color: ${isEvCharging ? colors.ev : 'rgba(255,255,255,0.4)'};">${isEvCharging ? this._formatPower(evPower) : this._t('idle')}</span>
              </div>
              ` : ''}
            </div>
            <div class="detail-bar">
              ${hasEV && isEvCharging ? (() => {
                const totalConsumption = homeConsumption + evPower;
                const totalPercent = Math.min(100, (totalConsumption / this._config.max_consumption) * 100);
                const homeWidth = totalPercent * (homeConsumption / totalConsumption);
                const evWidth = totalPercent * (evPower / totalConsumption);
                return `<div class="detail-fill-stack"><div class="detail-fill-segment" style="flex-basis:${homeWidth}%;background:${colors.home}"></div><div class="detail-fill-segment" style="flex-basis:${evWidth}%;background:${colors.ev}"></div></div>`;
              })() : `
              <div class="detail-fill" style="width: ${Math.min(100, (homeConsumption / this._config.max_consumption) * 100)}%; background: ${colors.home};"></div>
              `}
            </div>
          </div>

          <!-- Storage -->
          <div class="detail-col">
            <div class="detail-header">${this._t('storage')}</div>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">${this._t('power')}</span>
                <span class="detail-val">${this._formatPower(Math.abs(batteryPower))}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">SOC</span>
                <span class="detail-val" style="color: ${colors.battery};">${Math.round(batterySoc)}%</span>
              </div>
            </div>
            <div class="detail-bar">
              <div class="detail-fill" style="width: ${batterySoc}%; background: ${colors.battery};"></div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
    
    // Setup click event listeners after rendering
    this._setupEventListeners();
  }
}

// Register card component
customElements.define('prism-energy', PrismEnergyCard);

// Register with HACS / HA card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-energy",
  name: "Prism Energy",
  preview: true,
  description: "A glassmorphism energy flow card for OpenEMS/Fenecon systems"
});

console.info(
  `%c PRISM-ENERGY %c v1.2.5 %c Weather Performance Optimized `,
  'background: #F59E0B; color: black; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'background: #1e2024; color: white; font-weight: bold; padding: 2px 6px;',
  'background: #3B82F6; color: white; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;'
);


})();

// ============================================
// prism-energy-horizontal.js
// ============================================
(function() {
/**
 * Prism Energy Horizontal Card
 * A glassmorphism energy flow card for Home Assistant
 * Horizontal layout optimized for tablets with side panel details
 * 
 * Features:
 * - Animated energy flow visualization
 * - Weather effects (rain, snow, fog, sun, moon, stars)
 * - Day/Night transitions with house dimming
 * 
 * @version 1.2.3
 * @author BangerTech
 */

class PrismEnergyHorizontalCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._animationFrame = null;
  }

  static getStubConfig() {
    return {
      name: "Energy Monitor",
      solar_power: "",
      grid_power: "",
      battery_soc: "",
      battery_power: "",
      home_consumption: "",
      ev_power: "",
      autarky: "",
      image: "/local/community/Prism-Dashboard/images/prism-energy-home.png",
      max_solar_power: 10000,
      max_grid_power: 10000,
      max_consumption: 10000,
      show_details: true,
      // Weather effects (optional)
      enable_weather_effects: false,
      weather_entity: "",
      cloud_coverage_entity: "",
      // Solar modules (optional)
      solar_module1: "",
      solar_module1_name: "",
      solar_module2: "",
      solar_module2_name: "",
      solar_module3: "",
      solar_module3_name: "",
      solar_module4: "",
      solar_module4_name: "",
      // Pill positions (optional - in percent)
      solar_pill_top: 21,
      solar_pill_left: 55,
      solar_pill_scale: 1.0,
      grid_pill_top: 34,
      grid_pill_left: 18,
      grid_pill_scale: 1.0,
      home_pill_top: 50,
      home_pill_left: 52,
      home_pill_scale: 1.0,
      battery_pill_top: 62,
      battery_pill_left: 88,
      battery_pill_scale: 1.0,
      ev_pill_top: 70,
      ev_pill_left: 20,
      ev_pill_scale: 1.0
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "name",
          label: "Card Name",
          selector: { text: {} }
        },
        {
          name: "image",
          label: "Image URL (default: prism-energy-home.png)",
          selector: { text: {} }
        },
        {
          name: "show_details",
          label: "Show details panel by default",
          selector: { boolean: {} }
        },
        {
          name: "",
          type: "divider"
        },
        {
          name: "solar_power",
          label: "Solar Power (Total)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "grid_power",
          label: "Grid Power (positive=import, negative=export)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "battery_soc",
          label: "Battery SOC %",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "battery_power",
          label: "Battery Power (positive=discharge, negative=charge)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "home_consumption",
          label: "Home Consumption",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "ev_power",
          label: "EV Charging Power (optional)",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "autarky",
          label: "Autarky % (optional)",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "",
          type: "divider"
        },
        {
          type: "expandable",
          name: "",
          title: "🌤️ Weather & Day/Night Animation",
          schema: [
            {
              name: "enable_weather_effects",
              label: "Enable weather effects",
              selector: { boolean: {} }
            },
            {
              name: "weather_entity",
              label: "Weather Entity (e.g. weather.home)",
              selector: { entity: { domain: "weather" } }
            },
            {
              name: "cloud_coverage_entity",
              label: "Cloud Coverage Sensor (optional, e.g. sensor.openweathermap_cloud_coverage)",
              selector: { entity: { domain: "sensor" } }
            }
          ]
        },
        {
          type: "expandable",
          name: "",
          title: "📊 Maximum Values for Gauges",
          schema: [
            {
              name: "max_solar_power",
              label: "Max Solar Power (Watts) - e.g. 10000 for 10kW",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            },
            {
              name: "max_grid_power",
              label: "Max Grid Power (Watts)",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            },
            {
              name: "max_consumption",
              label: "Max Consumption (Watts)",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            }
          ]
        },
        {
          type: "expandable",
          name: "",
          title: "☀️ Solar Modules (optional - for individual display)",
          schema: [
            {
              name: "solar_module1",
              label: "Solar Module 1 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module1_name",
              label: "Module 1 Name (e.g. Roof East)",
              selector: { text: {} }
            },
            {
              name: "solar_module2",
              label: "Solar Module 2 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module2_name",
              label: "Module 2 Name (e.g. Roof West)",
              selector: { text: {} }
            },
            {
              name: "solar_module3",
              label: "Solar Module 3 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module3_name",
              label: "Module 3 Name (e.g. Garage)",
              selector: { text: {} }
            },
            {
              name: "solar_module4",
              label: "Solar Module 4 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module4_name",
              label: "Module 4 Name",
              selector: { text: {} }
            }
          ]
        },
        {
          type: "expandable",
          name: "",
          title: "📍 Pill Positions & Size (optional)",
          schema: [
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "solar_pill_top",
                  label: "Solar pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "solar_pill_left",
                  label: "Solar pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "solar_pill_scale",
                  label: "Solar pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "grid_pill_top",
                  label: "Grid pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "grid_pill_left",
                  label: "Grid pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "grid_pill_scale",
                  label: "Grid pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "home_pill_top",
                  label: "Home pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "home_pill_left",
                  label: "Home pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "home_pill_scale",
                  label: "Home pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "battery_pill_top",
                  label: "Battery pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "battery_pill_left",
                  label: "Battery pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "battery_pill_scale",
                  label: "Battery pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "ev_pill_top",
                  label: "Ev pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "ev_pill_left",
                  label: "Ev pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "ev_pill_scale",
                  label: "Ev pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            }
          ]
        }
      ]
    };
  }

  setConfig(config) {
    this._config = {
      name: config.name || "Energy Monitor",
      solar_power: config.solar_power || "",
      grid_power: config.grid_power || "",
      battery_soc: config.battery_soc || "",
      battery_power: config.battery_power || "",
      home_consumption: config.home_consumption || "",
      ev_power: config.ev_power || "",
      autarky: config.autarky || "",
      image: config.image || "/local/community/Prism-Dashboard/images/prism-energy-home.png",
      show_details: config.show_details !== false,
      // Max values for gauges (in Watts)
      max_solar_power: config.max_solar_power || 10000,
      max_grid_power: config.max_grid_power || 10000,
      max_consumption: config.max_consumption || 10000,
      // Weather effects
      enable_weather_effects: config.enable_weather_effects || false,
      weather_entity: config.weather_entity || "",
      cloud_coverage_entity: config.cloud_coverage_entity || "",
      // Solar modules
      solar_module1: config.solar_module1 || "",
      solar_module1_name: config.solar_module1_name || "Module 1",
      solar_module2: config.solar_module2 || "",
      solar_module2_name: config.solar_module2_name || "Module 2",
      solar_module3: config.solar_module3 || "",
      solar_module3_name: config.solar_module3_name || "Module 3",
      solar_module4: config.solar_module4 || "",
      solar_module4_name: config.solar_module4_name || "Module 4",
      // Pill positions (in percent) - default values match current layout
      solar_pill_top: config.solar_pill_top ?? 21,
      solar_pill_left: config.solar_pill_left ?? 55,
      solar_pill_scale: config.solar_pill_scale ?? 1.0,
      grid_pill_top: config.grid_pill_top ?? 34,
      grid_pill_left: config.grid_pill_left ?? 18,
      grid_pill_scale: config.grid_pill_scale ?? 1.0,
      home_pill_top: config.home_pill_top ?? 50,
      home_pill_left: config.home_pill_left ?? 52,
      home_pill_scale: config.home_pill_scale ?? 1.0,
      battery_pill_top: config.battery_pill_top ?? 62,
      battery_pill_left: config.battery_pill_left ?? 88,
      battery_pill_scale: config.battery_pill_scale ?? 1.0,
      ev_pill_top: config.ev_pill_top ?? 70,
      ev_pill_left: config.ev_pill_left ?? 20,
      ev_pill_scale: config.ev_pill_scale ?? 1.0
    };
  }

  set hass(hass) {
    this._hass = hass;
    // Only do full render on first load, then just update values
    if (!this._initialized) {
      this.render();
      this._initialized = true;
    } else {
      this._updateValues();
      this._updateWeatherIfChanged();
    }
  }

  // Check if weather conditions changed and update only weather elements
  _updateWeatherIfChanged() {
    if (!this._config.enable_weather_effects || !this._config.weather_entity) return;
    
    const weatherData = this._getWeatherData();
    // Include cloud coverage in key (rounded to 10% steps to avoid too frequent updates)
    const cloudKey = weatherData.cloudCoverage !== null ? Math.round(weatherData.cloudCoverage / 10) * 10 : 'none';
    const weatherKey = `${weatherData.weatherType}-${weatherData.isNight}-${weatherData.isSunrise}-${weatherData.isSunset}-${cloudKey}`;
    
    // Only update if weather state changed
    if (this._lastWeatherKey === weatherKey) return;
    this._lastWeatherKey = weatherKey;
    
    // Update weather container
    const weatherContainer = this.shadowRoot.querySelector('.weather-container');
    if (weatherContainer) {
      weatherContainer.remove();
    }
    
    const visualContainer = this.shadowRoot.querySelector('.visual-container');
    if (visualContainer) {
      visualContainer.insertAdjacentHTML('afterbegin', this._renderWeatherEffects(weatherData));
      
      // Update night-mode classes
      const houseImg = this.shadowRoot.querySelector('.house-img');
      if (houseImg) {
        houseImg.classList.toggle('night-mode', weatherData.isNight);
      }
      visualContainer.classList.toggle('night-mode', weatherData.isNight);
    }
    
    // Update weather label in header
    const weatherStatus = this.shadowRoot.querySelector('.weather-status');
    if (weatherStatus) {
      const dayNightLabel = this._getDayNightLabel(weatherData.isNight);
      const weatherTypeLabel = this._getWeatherLabel(weatherData);
      weatherStatus.textContent = `${dayNightLabel} • ${weatherTypeLabel}`;
    }
  }

  // Update only the dynamic values without re-rendering (preserves animations)
  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;

    // Use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0); // SOC is percentage, not power
    const batteryPower = this._getStateInWatts(this._config.battery_power, 0);
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);
    const evPower = this._getStateInWatts(this._config.ev_power, 0);
    const autarky = this._getState(this._config.autarky, 0); // Autarky is percentage

    // Update pill values
    this._updateElement('.pill-solar .pill-val', this._formatPower(solarPower));
    this._updateElement('.pill-grid .pill-val', this._formatPower(gridPower));
    this._updateElement('.pill-home .pill-val', this._formatPower(homeConsumption));
    this._updateElement('.pill-battery .pill-val', `${Math.round(batterySoc)}%`);
    
    if (this._config.ev_power) {
      const isEvCharging = evPower > 50;
      this._updateElement('.pill-ev .pill-val', isEvCharging ? this._formatPower(evPower) : this._t('idle'));
    }
    
    if (this._config.autarky) {
      this._updateElement('.autarkie-value', `${Math.round(autarky)}%`);
    }

    // Update gauge values
    this._updateGauges();

    // Update flow visibility
    this._updateFlows();
  }

  _updateElement(selector, value) {
    const el = this.shadowRoot.querySelector(selector);
    if (el && el.textContent !== value) {
      el.textContent = value;
    }
  }

  _updateGauges() {
    // Use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0); // SOC is percentage, not power
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);

    // Update inlet gauge arcs
    this._updateGaugeArc('solar-gauge-arc', solarPower / this._config.max_solar_power);
    this._updateGaugeArc('grid-gauge-arc', Math.abs(gridPower) / this._config.max_grid_power);
    this._updateGaugeArc('consumption-gauge-arc', homeConsumption / this._config.max_consumption);

    // Update inlet gauge values
    this._updateElement('.inlet-gauge-solar .inlet-value', this._formatPower(solarPower));
    this._updateElement('.inlet-gauge-grid .inlet-value', this._formatPower(gridPower));
    this._updateElement('.inlet-gauge-consumption .inlet-value', this._formatPower(homeConsumption));
    
    // Update battery display
    this._updateElement('.battery-soc', `${Math.round(batterySoc)}%`);
  }

  _updateGaugeArc(id, percentage) {
    const arc = this.shadowRoot.querySelector(`#${id}`);
    if (arc) {
      const clampedPercentage = Math.min(Math.max(percentage, 0), 1);
      const r = 40;
      const c = 2 * Math.PI * r;
      const arcLength = c * 0.75; // 270 degrees
      const dashOffset = arcLength * (1 - clampedPercentage);
      arc.style.strokeDashoffset = dashOffset;
    }
  }

  _updateFlows() {
    // Use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batteryPower = this._getStateInWatts(this._config.battery_power, 0);
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);
    const evPower = this._getStateInWatts(this._config.ev_power, 0);

    const isSolarActive = solarPower > 50;
    const isGridImport = gridPower > 50;
    const isGridExport = gridPower < -50;
    const isBatteryCharging = batteryPower < -50;
    const isBatteryDischarging = batteryPower > 50;
    const isEvCharging = evPower > 50;
    const hasEV = !!this._config.ev_power;

    // Show/hide flow groups based on state
    this._setFlowVisibility('flow-solar-home', isSolarActive && homeConsumption > 0);
    this._setFlowVisibility('flow-solar-battery', isSolarActive && isBatteryCharging);
    this._setFlowVisibility('flow-solar-grid', isSolarActive && isGridExport);
    this._setFlowVisibility('flow-grid-home', isGridImport);
    this._setFlowVisibility('flow-grid-battery', isGridImport && isBatteryCharging);
    this._setFlowVisibility('flow-battery-home', isBatteryDischarging);
    this._setFlowVisibility('flow-battery-grid', isBatteryDischarging && isGridExport);
    
    if (hasEV) {
      // EV is treated as sub-load of home - only one line from home to EV
      this._setFlowVisibility('flow-home-ev', isEvCharging);
    }
  }

  _setFlowVisibility(className, visible) {
    const el = this.shadowRoot.querySelector(`.${className}`);
    if (el) {
      el.style.display = visible ? 'block' : 'none';
    }
  }

  getCardSize() {
    return 5;
  }

  // Tell HA this card prefers full width
  getLayoutOptions() {
    return {
      grid_columns: 4,
      grid_min_columns: 3,
      grid_rows: 'auto'
    };
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
  }

  disconnectedCallback() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  // Open more-info dialog for an entity (shows history)
  _openMoreInfo(entityId) {
    if (!entityId || !this._hass) return;
    
    const event = new Event('hass-more-info', {
      bubbles: true,
      composed: true
    });
    event.detail = { entityId: entityId };
    this.dispatchEvent(event);
  }

  // Setup click event listeners for pills
  _setupEventListeners() {
    if (!this.shadowRoot) return;
    
    // Add click listeners to all pills with data-entity attribute
    this.shadowRoot.querySelectorAll('.pill[data-entity]').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = pill.getAttribute('data-entity');
        if (entityId) {
          this._openMoreInfo(entityId);
        }
      });
    });

    // Add click listener to house image (opens home consumption history)
    const houseImg = this.shadowRoot.querySelector('.house-img');
    if (houseImg && this._config.home_consumption) {
      houseImg.addEventListener('click', () => {
        this._openMoreInfo(this._config.home_consumption);
      });
    }

    // Add click listeners to gauges
    this.shadowRoot.querySelectorAll('.gauge[data-entity]').forEach(gauge => {
      gauge.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = gauge.getAttribute('data-entity');
        if (entityId) {
          this._openMoreInfo(entityId);
        }
      });
    });

    // Add click listener to autarkie badge (opens autarky history)
    const autarkieBadge = this.shadowRoot.querySelector('.autarkie-badge[data-entity]');
    if (autarkieBadge) {
      autarkieBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = autarkieBadge.getAttribute('data-entity');
        if (entityId) {
          this._openMoreInfo(entityId);
        }
      });
    }
  }

  // Helper to get entity state
  _getState(entityId, defaultVal = 0) {
    if (!entityId || !this._hass) return defaultVal;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return defaultVal;
    const val = parseFloat(stateObj.state);
    return isNaN(val) ? defaultVal : val;
  }

  // Helper to get power entity state normalized to Watts
  // Handles entities that report in kW (like evcc) and converts them to W
  _getStateInWatts(entityId, defaultVal = 0) {
    if (!entityId || !this._hass) return defaultVal;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return defaultVal;
    const val = parseFloat(stateObj.state);
    if (isNaN(val)) return defaultVal;
    
    // Check unit of measurement and convert kW to W if needed
    const unit = stateObj.attributes?.unit_of_measurement?.toLowerCase() || '';
    if (unit === 'kw') {
      return val * 1000; // Convert kW to W
    }
    return val;
  }

  // Helper to format power values
  _formatPower(watts) {
    const absWatts = Math.abs(watts);
    if (absWatts >= 1000) {
      return `${(absWatts / 1000).toFixed(1)} kW`;
    }
    return `${Math.round(absWatts)} W`;
  }

  // Render a circular gauge with inlet style (like prism-heat)
  _renderInletGauge(id, label, value, percentage, color, entityId = '') {
    const r = 36;
    const c = 2 * Math.PI * r;
    const arcLength = c * 0.75; // 270 degrees
    const strokeDashArray = `${arcLength} ${c}`;
    const clampedPercentage = Math.min(Math.max(percentage, 0), 1);
    const dashOffset = arcLength * (1 - clampedPercentage);

    return `
      <div class="inlet-gauge inlet-gauge-${id}" data-entity="${entityId}" title="Klicken für Historie">
        <div class="inlet-track"></div>
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="inlet-grad-${id}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:0.4" />
              <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
            </linearGradient>
          </defs>
          <!-- Background track -->
          <circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8" 
                  stroke-dasharray="${strokeDashArray}" stroke-linecap="round" 
                  transform="rotate(135, 50, 50)" />
          <!-- Active arc -->
          <circle id="${id}-gauge-arc" cx="50" cy="50" r="${r}" fill="none" stroke="url(#inlet-grad-${id})" stroke-width="8" 
                  stroke-dasharray="${strokeDashArray}" 
                  stroke-dashoffset="${dashOffset}" 
                  stroke-linecap="round"
                  transform="rotate(135, 50, 50)"
                  style="transition: stroke-dashoffset 0.5s ease;" />
        </svg>
        <div class="inlet-content">
          <div class="inlet-value">${value}</div>
          <div class="inlet-label">${label}</div>
        </div>
      </div>
    `;
  }

  // Generate animated flow path with real SVG filter glow (CodePen style)
  _renderFlow(path, color, active, reverse = false, className = '') {
    const direction = reverse ? 'reverse' : '';
    const display = active ? 'block' : 'none';
    
    return `
      <g class="flow-group ${className}" style="display: ${display};">
        <!-- Background track (pulsing, async) -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="0.4" stroke-linecap="round" class="flow-track" />
        
        <!-- Glowing animated beam with SVG filter -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="1.0" stroke-opacity="0.9" stroke-linecap="round" 
              class="flow-beam ${direction}" filter="url(#strokeGlow)" />
        
        <!-- Bright core with soft edges -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="0.4" stroke-opacity="0.85" stroke-linecap="round" 
              class="flow-beam ${direction}" filter="url(#softEdge)" />
      </g>
    `;
  }

  // Get weather icon based on conditions
  _getWeatherIcon(weatherData) {
    if (!weatherData.enabled) return 'mdi:weather-sunny';
    const { weatherType, isNight } = weatherData;
    if (isNight) {
      if (weatherType === 'cloudy') return 'mdi:weather-night-partly-cloudy';
      if (weatherType === 'rainy') return 'mdi:weather-rainy';
      if (weatherType === 'snowy') return 'mdi:weather-snowy';
      if (weatherType === 'foggy') return 'mdi:weather-fog';
      if (weatherType === 'stormy') return 'mdi:weather-lightning';
      return 'mdi:weather-night';
    } else {
      if (weatherType === 'cloudy') return 'mdi:weather-partly-cloudy';
      if (weatherType === 'rainy') return 'mdi:weather-rainy';
      if (weatherType === 'snowy') return 'mdi:weather-snowy';
      if (weatherType === 'foggy') return 'mdi:weather-fog';
      if (weatherType === 'stormy') return 'mdi:weather-lightning';
      if (weatherType === 'windy') return 'mdi:weather-windy';
      return 'mdi:weather-sunny';
    }
  }

  // Get weather label for display (supports EN/DE)
  _getWeatherLabel(weatherData) {
    if (!weatherData.enabled) return '';
    const lang = this._hass?.language || this._hass?.locale?.language || 'de';
    const isEnglish = lang.startsWith('en');
    const labels = isEnglish ? {
      'sunny': 'Sunny', 'clear': 'Clear', 'cloudy': 'Cloudy', 'rainy': 'Rain',
      'snowy': 'Snow', 'foggy': 'Fog', 'stormy': 'Storm', 'windy': 'Windy'
    } : {
      'sunny': 'Sonnig', 'clear': 'Klar', 'cloudy': 'Bewölkt', 'rainy': 'Regen',
      'snowy': 'Schnee', 'foggy': 'Nebel', 'stormy': 'Gewitter', 'windy': 'Windig'
    };
    return labels[weatherData.weatherType] || weatherData.weatherType;
  }

  // Get day/night label based on HA language
  _getDayNightLabel(isNight) {
    const lang = this._hass?.language || this._hass?.locale?.language || 'de';
    const isEnglish = lang.startsWith('en');
    return isEnglish ? (isNight ? 'Night' : 'Day') : (isNight ? 'Nacht' : 'Tag');
  }

  // Translate UI labels based on HA language (card display only, not editor)
  _t(key) {
    const lang = this._hass?.language || this._hass?.locale?.language || 'de';
    const isEnglish = lang.startsWith('en');
    
    const translations = {
      // Pill labels
      'production': isEnglish ? 'Production' : 'Erzeugung',
      'inactive': isEnglish ? 'Inactive' : 'Inaktiv',
      'export': isEnglish ? 'Export' : 'Einspeisung',
      'import': isEnglish ? 'Import' : 'Bezug',
      'neutral': isEnglish ? 'Neutral' : 'Neutral',
      'consumption': isEnglish ? 'Consumption' : 'Verbrauch',
      'charging': isEnglish ? 'Charging' : 'Ladung',
      'discharging': isEnglish ? 'Discharging' : 'Entladung',
      'standby': isEnglish ? 'Standby' : 'Standby',
      'idle': isEnglish ? 'Idle' : 'Inaktiv',
      // Detail headers
      'grid': isEnglish ? 'Grid' : 'Netz',
      'storage': isEnglish ? 'Storage' : 'Speicher',
      'current': isEnglish ? 'Current' : 'Aktuell',
      // Detail labels
      'power': isEnglish ? 'Power' : 'Leistung',
      'autarky': isEnglish ? 'Autarky' : 'Autarkie',
      // Module defaults
      'module': isEnglish ? 'Module' : 'Modul',
      // Live indicator
      'live': isEnglish ? 'LIVE' : 'LIVE'
    };
    
    return translations[key] || key;
  }

  // Get weather data from Home Assistant
  _getWeatherData() {
    if (!this._config.enable_weather_effects || !this._config.weather_entity || !this._hass) {
      return { enabled: false };
    }
    const weatherState = this._hass.states[this._config.weather_entity];
    const weatherCondition = (weatherState?.state || 'clear').toLowerCase();
    const sunState = this._hass.states['sun.sun'];
    const isNight = sunState?.state === 'below_horizon';
    const sunElevation = sunState?.attributes?.elevation || 0;
    const isSunrise = sunElevation > -10 && sunElevation < 10 && !isNight;
    const isSunset = sunElevation > -10 && sunElevation < 10 && isNight;

    let weatherType = 'clear';
    if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle') || weatherCondition.includes('shower')) weatherType = 'rainy';
    else if (weatherCondition.includes('snow') || weatherCondition.includes('sleet') || weatherCondition.includes('hail')) weatherType = 'snowy';
    else if (weatherCondition.includes('fog') || weatherCondition.includes('mist') || weatherCondition.includes('haze')) weatherType = 'foggy';
    else if (weatherCondition.includes('cloud') || weatherCondition.includes('overcast')) weatherType = 'cloudy';
    else if (weatherCondition.includes('clear') || weatherCondition.includes('sunny')) weatherType = 'sunny';
    else if (weatherCondition.includes('thunder') || weatherCondition.includes('lightning')) weatherType = 'stormy';
    else if (weatherCondition.includes('wind')) weatherType = 'windy';

    // Get cloud coverage from optional sensor (0-100%)
    let cloudCoverage = null;
    if (this._config.cloud_coverage_entity) {
      const cloudState = this._hass.states[this._config.cloud_coverage_entity];
      if (cloudState) {
        cloudCoverage = parseFloat(cloudState.state) || 0;
      }
    }

    return { enabled: true, weatherType, isNight, isSunrise, isSunset, condition: weatherCondition, cloudCoverage };
  }

  // Render weather effects HTML
  _renderWeatherEffects(weatherData) {
    if (!weatherData.enabled) return '';
    let html = '<div class="weather-container">';
    const { weatherType, isNight, isSunrise, isSunset } = weatherData;

    // Rain (optimized for mobile performance)
    if (weatherType === 'rainy' || weatherType === 'stormy') {
      const dropCount = weatherType === 'stormy' ? 25 : 15;
      for (let i = 0; i < dropCount; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 0.6 + Math.random() * 0.4;
        html += `<div class="rain-drop" style="left: ${left}%; animation-delay: ${delay}s; animation-duration: ${duration}s;"></div>`;
      }
    }

    // Snow (optimized for mobile performance)
    if (weatherType === 'snowy') {
      for (let i = 0; i < 25; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 6;
        const duration = 5 + Math.random() * 5;
        const size = 3 + Math.random() * 3;
        html += `<div class="snow-flake" style="left: ${left}%; animation-delay: ${delay}s; animation-duration: ${duration}s; width: ${size}px; height: ${size}px;"></div>`;
      }
    }

    // Fog
    if (weatherType === 'foggy') {
      html += `<div class="fog-layer fog-1"></div><div class="fog-layer fog-2"></div>`;
    }

    // Lightning
    if (weatherType === 'stormy') {
      html += `<div class="lightning"></div>`;
    }

    // Night: stars and moon
    if (isNight) {
      html += '<div class="stars-container">';
      for (let i = 0; i < 20; i++) {
        const left = Math.random() * 100;
        const top = Math.random() * 18;
        const size = 1 + Math.random() * 1.5;
        const delay = Math.random() * 3;
        const brightness = 0.2 + Math.random() * 0.3;
        html += `<div class="star" style="left: ${left}%; top: ${top}%; width: ${size}px; height: ${size}px; animation-delay: ${delay}s; opacity: ${brightness};"></div>`;
      }
      html += '</div>';
      if (weatherType !== 'foggy' && weatherType !== 'stormy') {
        html += `<div class="moon"><div class="moon-crater c1"></div><div class="moon-crater c2"></div><div class="moon-crater c3"></div></div>`;
      }
    } else if (weatherType === 'sunny' || weatherType === 'clear') {
      html += '<div class="sun-glow"></div>';
    }

    // Sunrise/Sunset gradient overlay
    if (isSunrise) {
      html += '<div class="sunrise-overlay"></div>';
    } else if (isSunset) {
      html += '<div class="sunset-overlay"></div>';
    }

    // Clouds based on cloud coverage or weather type
    const cloudCoverage = weatherData.cloudCoverage;
    const showClouds = (weatherType === 'cloudy' || (cloudCoverage !== null && cloudCoverage > 0)) && 
                       weatherType !== 'foggy' && !isNight;
    
    if (showClouds) {
      // Determine cloud count based on coverage (if available) or default to all
      let staticCount = 3;
      let movingCount = 4;
      
      if (cloudCoverage !== null) {
        if (cloudCoverage <= 20) { staticCount = 0; movingCount = 1; }
        else if (cloudCoverage <= 40) { staticCount = 1; movingCount = 1; }
        else if (cloudCoverage <= 55) { staticCount = 2; movingCount = 2; }
        else if (cloudCoverage <= 70) { staticCount = 2; movingCount = 3; }
        else if (cloudCoverage <= 85) { staticCount = 3; movingCount = 3; }
        else { staticCount = 3; movingCount = 4; }
      }
      
      // Static clouds
      if (staticCount >= 1) html += '<div class="cloud cloud-static cloud-static-1"></div>';
      if (staticCount >= 2) html += '<div class="cloud cloud-static cloud-static-2"></div>';
      if (staticCount >= 3) html += '<div class="cloud cloud-static cloud-static-3"></div>';
      // Moving clouds
      if (movingCount >= 1) html += '<div class="cloud cloud-moving cloud-1"></div>';
      if (movingCount >= 2) html += '<div class="cloud cloud-moving cloud-2"></div>';
      if (movingCount >= 3) html += '<div class="cloud cloud-moving cloud-3"></div>';
      if (movingCount >= 4) html += '<div class="cloud cloud-moving cloud-4"></div>';
    }

    html += '</div>';
    return html;
  }

  // Weather CSS styles
  _getWeatherStyles() {
    return `
      .weather-container { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; border-radius: 28px; }
      /* Rain Animation (optimized for mobile performance) */
      .rain-drop { position: absolute; width: 2px; height: 20px; background: linear-gradient(to bottom, transparent, rgba(174, 194, 224, 0.6)); top: 0; border-radius: 0 0 2px 2px; opacity: 0; will-change: transform, opacity; contain: layout style paint; animation: rain-fall linear infinite; }
      @keyframes rain-fall { 0% { transform: translateY(-30px); opacity: 0; } 5% { opacity: 0.7; } 95% { opacity: 0.7; } 100% { transform: translateY(100vh); opacity: 0; } }
      /* Snow Animation (optimized for mobile performance) */
      .snow-flake { position: absolute; background: rgba(255, 255, 255, 0.9); border-radius: 50%; top: 0; opacity: 0; will-change: transform, opacity; contain: layout style paint; animation: snow-fall linear infinite; box-shadow: 0 0 4px rgba(255, 255, 255, 0.5); }
      @keyframes snow-fall { 0% { transform: translateY(-10px) translateX(0); opacity: 0; } 5% { opacity: 0.7; } 50% { transform: translateY(50vh) translateX(20px); } 95% { opacity: 0.7; } 100% { transform: translateY(100vh) translateX(-20px); opacity: 0; } }
      .fog-layer { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(200, 210, 220, 0.15), transparent); animation: fog-drift linear infinite; filter: blur(30px); }
      .fog-1 { animation-duration: 25s; } .fog-2 { animation-duration: 35s; animation-direction: reverse; opacity: 0.5; }
      @keyframes fog-drift { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      .stars-container { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
      .star { position: absolute; background: radial-gradient(circle at center, rgba(255, 255, 255, 0.8), rgba(170, 204, 255, 0.5)); border-radius: 50%; animation: star-twinkle 4s ease-in-out infinite; box-shadow: 0 0 3px rgba(255, 255, 255, 0.3); }
      @keyframes star-twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.9); } 50% { opacity: 0.5; transform: scale(1.1); } }
      .moon { position: absolute; top: 60px; left: 75%; width: 55px; height: 55px; border-radius: 50%; background: linear-gradient(135deg, rgba(245, 245, 245, 0.5) 0%, rgba(232, 232, 232, 0.4) 50%, rgba(208, 208, 208, 0.3) 100%); box-shadow: 0 0 20px rgba(255, 255, 255, 0.2); z-index: 0; opacity: 0.65; }
      .moon-crater { position: absolute; background: radial-gradient(circle at 60% 40%, rgba(180, 180, 180, 0.3), rgba(160, 160, 160, 0.4)); border-radius: 50%; }
      .moon-crater.c1 { width: 14px; height: 14px; top: 8px; right: 10px; } .moon-crater.c2 { width: 8px; height: 8px; bottom: 12px; left: 12px; } .moon-crater.c3 { width: 7px; height: 7px; top: 20px; left: 8px; }
      .sun-glow { position: absolute; top: 30px; left: 35%; width: 150px; height: 150px; background: radial-gradient(circle at center, rgba(255, 200, 50, 0.2) 0%, rgba(255, 180, 50, 0.1) 30%, transparent 70%); filter: blur(25px); z-index: 0; animation: sun-pulse 10s ease-in-out infinite; }
      @keyframes sun-pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.05); opacity: 0.8; } }
      .lightning { position: absolute; inset: 0; background: rgba(255, 255, 255, 0); animation: lightning-flash 8s infinite; z-index: 0; pointer-events: none; }
      @keyframes lightning-flash { 0%, 89%, 91%, 93%, 100% { background: rgba(255, 255, 255, 0); } 90%, 92% { background: rgba(255, 255, 255, 0.3); } }
      .cloud { position: absolute; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 0%, rgba(220, 220, 230, 0.2) 100%); border-radius: 50px; filter: blur(3px); z-index: 0; }
      .cloud::before, .cloud::after { content: ''; position: absolute; background: inherit; border-radius: 50%; }
      .cloud-moving { animation: cloud-drift linear infinite; }
      .cloud-1 { width: 90px; height: 32px; top: 8%; left: -100px; animation-duration: 55s; opacity: 0.4; }
      .cloud-1::before { width: 45px; height: 45px; top: -22px; left: 18px; } .cloud-1::after { width: 52px; height: 52px; top: -26px; left: 42px; }
      .cloud-2 { width: 70px; height: 26px; top: 14%; left: -80px; animation-duration: 70s; animation-delay: -25s; opacity: 0.35; }
      .cloud-2::before { width: 35px; height: 35px; top: -17px; left: 12px; } .cloud-2::after { width: 42px; height: 42px; top: -21px; left: 32px; }
      .cloud-static { animation: cloud-float 8s ease-in-out infinite; }
      .cloud-static-1 { width: 75px; height: 28px; top: 12%; left: 30%; opacity: 0.35; }
      .cloud-static-1::before { width: 38px; height: 38px; top: -18px; left: 12px; } .cloud-static-1::after { width: 44px; height: 44px; top: -22px; left: 34px; }
      .cloud-static-2 { width: 60px; height: 22px; top: 7%; left: 55%; opacity: 0.3; animation-delay: -3s; }
      .cloud-static-2::before { width: 30px; height: 30px; top: -14px; left: 10px; } .cloud-static-2::after { width: 36px; height: 36px; top: -18px; left: 28px; }
      .cloud-static-3 { width: 52px; height: 18px; top: 16%; left: 42%; opacity: 0.28; animation-delay: -5s; }
      .cloud-static-3::before { width: 26px; height: 26px; top: -12px; left: 9px; } .cloud-static-3::after { width: 30px; height: 30px; top: -15px; left: 24px; }
      .cloud-3 { width: 80px; height: 28px; top: 5%; left: -95px; animation-duration: 75s; animation-delay: -30s; opacity: 0.3; }
      .cloud-3::before { width: 40px; height: 40px; top: -20px; left: 16px; } .cloud-3::after { width: 48px; height: 48px; top: -24px; left: 38px; }
      .cloud-4 { width: 65px; height: 24px; top: 18%; left: -85px; animation-duration: 62s; animation-delay: -18s; opacity: 0.32; }
      .cloud-4::before { width: 32px; height: 32px; top: -16px; left: 12px; } .cloud-4::after { width: 38px; height: 38px; top: -19px; left: 30px; }
      @keyframes cloud-drift { 0% { transform: translateX(0); } 100% { transform: translateX(calc(100vw + 200px)); } }
      @keyframes cloud-float { 0%, 100% { transform: translateX(0) translateY(0); } 25% { transform: translateX(5px) translateY(-3px); } 50% { transform: translateX(0) translateY(-5px); } 75% { transform: translateX(-5px) translateY(-2px); } }
      .house-img.night-mode { filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5)) brightness(0.55) saturate(0.85); transition: filter 1s ease; }
      .visual-container.night-mode { background: linear-gradient(to bottom, rgba(15, 23, 42, 0.2) 0%, transparent 40%); }
      /* Sunrise/Sunset Overlays */
      .sunrise-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(255, 150, 80, 0.08) 0%, rgba(255, 180, 100, 0.04) 30%, transparent 60%); pointer-events: none; z-index: 0; border-radius: 28px; }
      .sunset-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(255, 100, 50, 0.1) 0%, rgba(255, 80, 80, 0.05) 30%, transparent 60%); pointer-events: none; z-index: 0; border-radius: 28px; }
    `;
  }

  render() {
    if (!this.shadowRoot) return;

    // Get current values - use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0); // SOC is percentage, not power
    const batteryPower = this._getStateInWatts(this._config.battery_power, 0);
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);
    const evPower = this._getStateInWatts(this._config.ev_power, 0);
    const autarky = this._getState(this._config.autarky, 0); // Autarky is percentage
    
    const hasEV = !!this._config.ev_power;
    const hasAutarky = !!this._config.autarky;
    const houseImg = this._config.image;
    
    // Get weather data
    const weatherData = this._getWeatherData();

    // Determine flow states
    const isSolarActive = solarPower > 50;
    const isGridImport = gridPower > 50;
    const isGridExport = gridPower < -50;
    const isBatteryCharging = batteryPower < -50;
    const isBatteryDischarging = batteryPower > 50;
    const isEvCharging = evPower > 50;

    // Battery icon based on SOC
    let batteryIcon = "mdi:battery";
    if (batterySoc >= 90) batteryIcon = "mdi:battery";
    else if (batterySoc >= 70) batteryIcon = "mdi:battery-80";
    else if (batterySoc >= 50) batteryIcon = "mdi:battery-60";
    else if (batterySoc >= 30) batteryIcon = "mdi:battery-40";
    else if (batterySoc >= 10) batteryIcon = "mdi:battery-20";
    else batteryIcon = "mdi:battery-outline";
    
    if (isBatteryCharging) batteryIcon = "mdi:battery-charging";

    // Get pill positions and scale from config (with defaults)
    const pillPos = {
      solar: { x: this._config.solar_pill_left, y: this._config.solar_pill_top, scale: this._config.solar_pill_scale },
      grid: { x: this._config.grid_pill_left, y: this._config.grid_pill_top, scale: this._config.grid_pill_scale },
      home: { x: this._config.home_pill_left, y: this._config.home_pill_top, scale: this._config.home_pill_scale },
      battery: { x: this._config.battery_pill_left, y: this._config.battery_pill_top, scale: this._config.battery_pill_scale },
      ev: { x: this._config.ev_pill_left, y: this._config.ev_pill_top, scale: this._config.ev_pill_scale }
    };

    // Helper to calculate control point for smooth curves
    const midPoint = (p1, p2) => ({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    });

    // SVG Paths for energy flows (dynamically calculated based on pill positions)
    const paths = {
      solarToHome: `M ${pillPos.solar.x} ${pillPos.solar.y} Q ${midPoint(pillPos.solar, pillPos.home).x} ${midPoint(pillPos.solar, pillPos.home).y} ${pillPos.home.x} ${pillPos.home.y}`,
      solarToBattery: `M ${pillPos.solar.x} ${pillPos.solar.y} Q ${midPoint(pillPos.solar, pillPos.battery).x} ${midPoint(pillPos.solar, pillPos.battery).y} ${pillPos.battery.x} ${pillPos.battery.y}`,
      solarToGrid: `M ${pillPos.solar.x} ${pillPos.solar.y} Q ${midPoint(pillPos.solar, pillPos.grid).x} ${midPoint(pillPos.solar, pillPos.grid).y} ${pillPos.grid.x} ${pillPos.grid.y}`,
      
      gridToHome: `M ${pillPos.grid.x} ${pillPos.grid.y} Q ${midPoint(pillPos.grid, pillPos.home).x} ${midPoint(pillPos.grid, pillPos.home).y} ${pillPos.home.x} ${pillPos.home.y}`,
      gridToBattery: `M ${pillPos.grid.x} ${pillPos.grid.y} Q ${midPoint(pillPos.grid, pillPos.battery).x} ${midPoint(pillPos.grid, pillPos.battery).y} ${pillPos.battery.x} ${pillPos.battery.y}`,
      
      batteryToHome: `M ${pillPos.battery.x} ${pillPos.battery.y} Q ${midPoint(pillPos.battery, pillPos.home).x} ${midPoint(pillPos.battery, pillPos.home).y} ${pillPos.home.x} ${pillPos.home.y}`,
      batteryToGrid: `M ${pillPos.battery.x} ${pillPos.battery.y} Q ${midPoint(pillPos.battery, pillPos.grid).x} ${midPoint(pillPos.battery, pillPos.grid).y} ${pillPos.grid.x} ${pillPos.grid.y}`,
      
      // EV flow from home (EV is sub-load of home)
      homeToEv: `M ${pillPos.home.x} ${pillPos.home.y} Q ${midPoint(pillPos.home, pillPos.ev).x} ${midPoint(pillPos.home, pillPos.ev).y} ${pillPos.ev.x} ${pillPos.ev.y}`
    };

    // Colors
    const colors = {
      solar: '#F59E0B',
      grid: '#3B82F6',
      battery: '#10B981',
      home: '#8B5CF6',
      ev: '#EC4899'
    };

    this.shadowRoot.innerHTML = `
      <style>
        .card {
          position: relative;
          width: 100%;
          min-width: 600px;
          border-radius: 28px;
          display: flex;
          flex-direction: row;
          overflow: hidden;
          background: rgba(30, 32, 36, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.3);
          color: white;
          box-sizing: border-box;
          user-select: none;
          height: calc(100vh - 80px);
          max-height: 850px;
          min-height: 350px;
        }
        
        :host {
          display: block;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          /* Force card to use full width in dashboard */
          --ha-card-border-radius: 28px;
        }
        
        .noise {
          position: absolute;
          inset: 0;
          opacity: 0.02;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }

        /* Main Content (House Area) */
        .main-content {
          position: relative;
          flex: 1;
          min-width: 380px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Header - above weather animations */
        .header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 24px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 50;
          background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        
        .icon-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colors.solar};
          border: 1px solid rgba(245, 158, 11, 0.25);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.2), inset 0 0 10px rgba(245, 158, 11, 0.1);
        }
        
        .icon-circle ha-icon {
          --mdc-icon-size: 26px;
        }
        
        .title-group h2 {
          font-size: 1.3rem;
          font-weight: 600;
          line-height: 1.2;
          margin: 0;
          color: rgba(255, 255, 255, 0.95);
        }
        
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }
        
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 8px #22c55e;
        }
        
        .live-text {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #4ade80;
        }
        
        .autarkie-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px 10px 10px;
          border-radius: 999px;
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.6),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03),
            0 6px 12px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
        }
        
        .autarkie-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(74, 222, 128, 0.15);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.4),
            inset -1px -1px 2px rgba(255, 255, 255, 0.05),
            0 0 15px rgba(74, 222, 128, 0.3);
        }
        
        .autarkie-icon ha-icon {
          --mdc-icon-size: 20px;
          color: #4ade80;
        }
        
        .autarkie-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .autarkie-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          line-height: 1;
        }
        
        .autarkie-label {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.5);
        }
        

        /* Visual Container - Larger House */
        .visual-container {
          position: relative;
          width: 100%;
          height: 100%;
          flex: 1;
          min-width: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          padding: 60px 0 0 0;
          box-sizing: border-box;
        }
        
        /* Wrapper for image and pills - pills are positioned relative to this */
        .house-wrapper {
          position: relative;
          width: 120%;
          max-width: 900px;
          margin-left: -10%;
        }
        
        /* When no details panel - house can be larger */
        .card:not(:has(.details-panel)) .house-wrapper {
          width: 100%;
          max-width: 1100px;
          margin-left: 0;
        }
        
        .card:not(:has(.details-panel)) .main-content {
          align-items: center;
          justify-content: center;
        }
        
        .card:not(:has(.details-panel)) .visual-container {
          max-width: 1000px;
        }
        
        .house-img {
          width: 100%;
          height: auto;
          display: block;
          z-index: 0;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5));
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.3s ease;
        }
        
        .house-img:hover {
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5)) brightness(1.05);
        }
        
        .bottom-gradient {
          position: absolute;
          inset: auto 0 0 0;
          height: 4rem;
          background: linear-gradient(to top, rgba(30, 32, 36, 1), transparent);
          pointer-events: none;
          z-index: 5;
        }

        /* SVG Overlay */
        .svg-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        
        @keyframes flow-animation {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes flow-animation-reverse {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 100; }
        }
        
        @keyframes track-pulse {
          0%, 100% { stroke-opacity: 0.18; }
          50% { stroke-opacity: 0.06; }
        }
        
        .flow-track {
          animation: track-pulse 2.2s ease-in-out infinite;
        }
        
        .flow-beam {
          stroke-dasharray: 25 75;
          animation: flow-animation 3s linear infinite;
        }
        
        .flow-beam.reverse {
          stroke-dasharray: 25 75;
          animation: flow-animation-reverse 3s linear infinite;
        }

        /* Data Pills - Fixed to image positions */
        .pill {
          --pill-scale: 1;
          position: absolute;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 999px;
          padding: 10px 16px 10px 10px;
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.6),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03),
            0 6px 12px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 20;
          transform: translate(-50%, -50%) scale(var(--pill-scale));
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        
        .pill:hover {
          transform: translate(-50%, -50%) scale(calc(var(--pill-scale) * 1.05));
        }
        
        .pill[data-entity] {
          cursor: pointer;
        }
        
        .pill[data-entity]:active {
          transform: translate(-50%, -50%) scale(calc(var(--pill-scale) * 0.97));
        }
        
        .pill-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .pill-icon ha-icon {
          --mdc-icon-size: 22px;
        }
        
        .pill-content {
          display: flex;
          flex-direction: column;
          line-height: 1;
          gap: 3px;
        }
        
        .pill-val {
          font-size: 1.1rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .pill-label {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
        }

        /* Pill Icon Colors */
        .bg-solar {
          background: rgba(245, 158, 11, 0.15);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
        }
        .color-solar { color: ${colors.solar}; }
        
        .bg-grid {
          background: rgba(59, 130, 246, 0.15);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
        }
        .color-grid { color: ${colors.grid}; }
        
        .bg-battery {
          background: rgba(16, 185, 129, 0.15);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }
        .color-battery { color: ${colors.battery}; }
        
        .bg-home {
          background: rgba(139, 92, 246, 0.15);
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .color-home { color: ${colors.home}; }
        
        .bg-ev {
          background: rgba(236, 72, 153, 0.15);
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.3);
        }
        .color-ev { color: ${colors.ev}; }
        
        .bg-inactive {
          background: rgba(255, 255, 255, 0.03);
          box-shadow: none;
        }
        .color-inactive { color: rgba(255, 255, 255, 0.35); }

        /* Details Panel (Right Side) - Responsive */
        .details-panel {
          width: clamp(280px, 25vw, 400px);
          min-width: 280px;
          flex-shrink: 0;
          background: rgba(0, 0, 0, 0.35);
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          padding: clamp(12px, 1.5vw, 20px);
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 1vw, 14px);
          overflow-y: auto;
        }
        
        .details-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        
        .details-title {
          /* Neumorphic Raised Chip */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          align-self: center;
          padding: 5px 12px;
          margin-bottom: 8px;
          
          background: linear-gradient(145deg, #2d3038, #22252b);
          border-radius: 20px;
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
          
          font-size: clamp(0.55rem, 0.7vw, 0.65rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
          
          transition: all 0.2s ease;
        }
        
        .details-title:hover {
          box-shadow: 
            4px 4px 8px rgba(0, 0, 0, 0.5),
            -3px -3px 6px rgba(255, 255, 255, 0.04),
            inset 1px 1px 2px rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.8);
        }

        /* Inlet Gauge Styles (like prism-heat) - Responsive */
        .inlet-gauge {
          position: relative;
          width: clamp(100px, 12vw, 160px);
          height: clamp(100px, 12vw, 160px);
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        .inlet-gauge:hover {
          transform: scale(1.05);
        }
        
        .inlet-gauge:active {
          transform: scale(0.98);
        }
        
        .inlet-gauge .inlet-track {
          position: absolute;
          inset: 8%;
          border-radius: 50%;
          background: rgba(20, 20, 20, 0.8);
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.7), inset -1px -1px 2px rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          border-top: 1px solid rgba(0,0,0,0.3);
        }
        
        .inlet-gauge svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform: rotate(0deg);
        }
        
        .inlet-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          width: 65%;
          z-index: 2;
        }
        
        .inlet-value {
          font-size: clamp(0.9rem, 1.2vw, 1.3rem);
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          line-height: 1.1;
        }
        
        .inlet-label {
          font-size: clamp(0.55rem, 0.7vw, 0.75rem);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
        }
        
        /* Two gauges side by side */
        .gauges-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          width: 100%;
        }
        
        /* Solar Modules List */
        .modules-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        
        .module-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: clamp(8px, 1vw, 12px) clamp(10px, 1.2vw, 16px);
          background: rgba(20, 20, 20, 0.6);
          border-radius: 12px;
          box-shadow: inset 1px 1px 3px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.03);
          border: 1px solid rgba(0,0,0,0.2);
        }
        
        .module-name {
          font-size: clamp(0.7rem, 0.85vw, 0.9rem);
          color: rgba(255, 255, 255, 0.5);
        }
        
        .module-value {
          font-size: clamp(0.8rem, 0.95vw, 1rem);
          font-weight: 700;
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          color: ${colors.solar};
        }

        /* Battery Display */
        .battery-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 16px;
          background: rgba(20, 20, 20, 0.6);
          border-radius: 16px;
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.03);
          border: 1px solid rgba(0,0,0,0.2);
          width: 100%;
          box-sizing: border-box;
        }
        
        .battery-icon-container {
          position: relative;
          width: clamp(50px, 5vw, 70px);
          height: clamp(70px, 7vw, 95px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .battery-icon-container ha-icon {
          --mdc-icon-size: clamp(48px, 5vw, 72px);
          color: ${colors.battery};
          filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.4));
        }
        
        .battery-soc {
          font-size: clamp(1.2rem, 1.5vw, 1.8rem);
          font-weight: 700;
          color: ${colors.battery};
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .battery-info {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 0.5vw, 8px);
          width: 100%;
        }
        
        .battery-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: clamp(0.75rem, 0.9vw, 0.95rem);
        }
        
        .battery-label {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .battery-value {
          font-weight: 600;
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .battery-value.charging { color: ${colors.battery}; }
        .battery-value.discharging { color: #ef4444; }
        .battery-value.standby { color: rgba(255, 255, 255, 0.6); }

        ha-icon {
          --mdc-icon-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Responsive Media Queries */
        @media (max-width: 1200px) {
          .card {
            min-width: 550px;
          }
          .house-wrapper {
            width: 115%;
            margin-left: -7%;
          }
        }

        @media (max-width: 900px) {
          .card {
            flex-direction: column;
            min-width: unset;
            height: auto;
            max-height: unset;
          }
          .main-content {
            min-width: unset;
            height: 60vh;
            min-height: 400px;
          }
          .house-wrapper {
            width: 100%;
            margin-left: 0;
          }
          .details-panel {
            width: 100%;
            min-width: unset;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
          }
          .gauges-row {
            justify-content: center;
          }
        }

        @media (max-height: 600px) {
          .card {
            height: calc(100vh - 40px);
            min-height: 300px;
          }
          .inlet-gauge {
            width: 90px;
            height: 90px;
          }
        }
        
        /* Weather status text in header */
        .weather-separator {
          margin: 0 6px;
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.65rem;
        }
        .weather-status {
          font-size: 0.65rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
        }
        
        ${this._getWeatherStyles()}
      </style>

      <div class="card">
        <div class="noise"></div>
        
        <!-- Main Content (House Visualization) -->
        <div class="main-content">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="icon-circle">
                <ha-icon icon="mdi:solar-power-variant"></ha-icon>
              </div>
              <div class="title-group">
                <h2>${this._config.name}</h2>
                <div class="live-indicator">
                  <div class="dot"></div>
                  <span class="live-text">Live</span>
                  ${weatherData.enabled ? `
                  <span class="weather-separator">|</span>
                  <span class="weather-status">${this._getDayNightLabel(weatherData.isNight)} • ${this._getWeatherLabel(weatherData)}</span>
                  ` : ''}
                </div>
              </div>
            </div>
            ${hasAutarky ? `
            <div class="autarkie-badge" data-entity="${this._config.autarky}" title="Klicken für Historie">
              <div class="autarkie-icon">
                <ha-icon icon="mdi:leaf"></ha-icon>
              </div>
              <div class="autarkie-content">
                <span class="autarkie-value">${Math.round(autarky)}%</span>
                <span class="autarkie-label">${this._t('autarky')}</span>
              </div>
            </div>
            ` : ''}
          </div>

          <!-- Visual Container -->
          <div class="visual-container ${weatherData.enabled && weatherData.isNight ? 'night-mode' : ''}">
            ${weatherData.enabled ? this._renderWeatherEffects(weatherData) : ''}
            <!-- House Wrapper - Pills are positioned relative to this -->
            <div class="house-wrapper">
              <img src="${houseImg}" class="house-img ${weatherData.enabled && weatherData.isNight ? 'night-mode' : ''}" alt="Energy Home" />

              <!-- SVG Flows -->
              <svg class="svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <!-- Stroke Glow Filter (soft edges) -->
                  <filter id="strokeGlow" x="-100%" y="-100%" width="300%" height="300%" filterUnits="userSpaceOnUse">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur2" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.35" result="softCore" />
                    <feMerge>
                      <feMergeNode in="blur1" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="blur2" />
                      <feMergeNode in="softCore" />
                    </feMerge>
                  </filter>
                  <!-- Soft Core Filter (minimal blur for smooth edges) -->
                  <filter id="softEdge" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.25" />
                  </filter>
                </defs>
                
                <!-- Solar Flows -->
                ${this._renderFlow(paths.solarToHome, colors.solar, isSolarActive && homeConsumption > 0, false, 'flow-solar-home')}
                ${this._renderFlow(paths.solarToBattery, colors.solar, isSolarActive && isBatteryCharging, false, 'flow-solar-battery')}
                ${this._renderFlow(paths.solarToGrid, colors.solar, isSolarActive && isGridExport, false, 'flow-solar-grid')}

                <!-- Grid Flows -->
                ${this._renderFlow(paths.gridToHome, colors.grid, isGridImport, false, 'flow-grid-home')}
                ${this._renderFlow(paths.gridToBattery, colors.grid, isGridImport && isBatteryCharging, false, 'flow-grid-battery')}

                <!-- Battery Flows -->
                ${this._renderFlow(paths.batteryToHome, colors.battery, isBatteryDischarging, false, 'flow-battery-home')}
                ${this._renderFlow(paths.batteryToGrid, colors.battery, isBatteryDischarging && isGridExport, false, 'flow-battery-grid')}

                <!-- EV Flow (sub-load of home) -->
                ${hasEV ? this._renderFlow(paths.homeToEv, colors.ev, isEvCharging, false, 'flow-home-ev') : ''}
              </svg>

              <!-- Solar Pill (Top - over roof) -->
              <div class="pill pill-solar" style="top: ${pillPos.solar.y}%; left: ${pillPos.solar.x}%; --pill-scale: ${pillPos.solar.scale};" data-entity="${this._config.solar_power}">
                <div class="pill-icon ${isSolarActive ? 'bg-solar' : 'bg-inactive'}">
                  <ha-icon icon="mdi:solar-power" class="${isSolarActive ? 'color-solar' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${this._formatPower(solarPower)}</span>
                  <span class="pill-label">${isSolarActive ? this._t('production') : this._t('inactive')}</span>
                </div>
              </div>

              <!-- Grid Pill (on power pole) -->
              <div class="pill pill-grid" style="top: ${pillPos.grid.y}%; left: ${pillPos.grid.x}%; --pill-scale: ${pillPos.grid.scale};" data-entity="${this._config.grid_power}">
                <div class="pill-icon ${isGridImport || isGridExport ? 'bg-grid' : 'bg-inactive'}">
                  <ha-icon icon="mdi:transmission-tower" class="${isGridImport || isGridExport ? 'color-grid' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${this._formatPower(gridPower)}</span>
                  <span class="pill-label">${isGridExport ? this._t('export') : isGridImport ? this._t('import') : this._t('neutral')}</span>
                </div>
              </div>

              <!-- Home Pill (Center-right - on house) -->
              <div class="pill pill-home" style="top: ${pillPos.home.y}%; left: ${pillPos.home.x}%; --pill-scale: ${pillPos.home.scale};" data-entity="${this._config.home_consumption}">
                <div class="pill-icon bg-home">
                  <ha-icon icon="mdi:home-lightning-bolt" class="color-home"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${this._formatPower(homeConsumption)}</span>
                  <span class="pill-label">${this._t('consumption')}</span>
                </div>
              </div>

              <!-- Battery Pill (Right - battery storage) -->
              <div class="pill pill-battery" style="top: ${pillPos.battery.y}%; left: ${pillPos.battery.x}%; --pill-scale: ${pillPos.battery.scale};" data-entity="${this._config.battery_soc}">
                <div class="pill-icon ${isBatteryCharging || isBatteryDischarging ? 'bg-battery' : 'bg-inactive'}">
                  <ha-icon icon="${batteryIcon}" class="${isBatteryCharging || isBatteryDischarging ? 'color-battery' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${Math.round(batterySoc)}%</span>
                  <span class="pill-label">${isBatteryCharging ? this._t('charging') : isBatteryDischarging ? this._t('discharging') : this._t('standby')}</span>
                </div>
              </div>

              <!-- EV Pill (Bottom Left - carport) -->
              ${hasEV ? `
              <div class="pill pill-ev" style="top: ${pillPos.ev.y}%; left: ${pillPos.ev.x}%; --pill-scale: ${pillPos.ev.scale};" data-entity="${this._config.ev_power}">
                <div class="pill-icon ${isEvCharging ? 'bg-ev' : 'bg-inactive'}">
                  <ha-icon icon="mdi:car-electric" class="${isEvCharging ? 'color-ev' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${isEvCharging ? this._formatPower(evPower) : this._t('idle')}</span>
                  <span class="pill-label">EV</span>
                </div>
              </div>
              ` : ''}
            </div>
            <div class="bottom-gradient"></div>
          </div>
        </div>

        <!-- Details Panel (Right Side) - shown based on config -->
        ${this._config.show_details ? `
        <div class="details-panel">
          <!-- Solar Section -->
          <div class="details-section">
            <div class="details-title">Solar</div>
            ${this._renderInletGauge('solar', this._t('production'), this._formatPower(solarPower), solarPower / this._config.max_solar_power, colors.solar, this._config.solar_power)}
          </div>
          
          <!-- Solar Modules (if configured) -->
          ${this._renderSolarModules()}
          
          <!-- Grid & Consumption Row -->
          <div class="gauges-row">
            ${this._renderInletGauge('grid', isGridExport ? this._t('export') : this._t('import'), this._formatPower(gridPower), Math.abs(gridPower) / this._config.max_grid_power, isGridExport ? colors.battery : '#ef4444', this._config.grid_power)}
            ${this._renderInletGauge('consumption', this._t('consumption'), this._formatPower(homeConsumption), homeConsumption / this._config.max_consumption, colors.home, this._config.home_consumption)}
          </div>
          
          <!-- Battery Section with Icon -->
          <div class="details-section">
            <div class="details-title">${this._t('storage')}</div>
            <div class="battery-display" data-entity="${this._config.battery_soc}">
              <div class="battery-icon-container">
                <ha-icon icon="${batteryIcon}"></ha-icon>
              </div>
              <div class="battery-soc">${Math.round(batterySoc)}%</div>
              <div class="battery-info">
                <div class="battery-row">
                  <span class="battery-label">${this._t('power')}</span>
                  <span class="battery-value ${isBatteryCharging ? 'charging' : isBatteryDischarging ? 'discharging' : 'standby'}">
                    ${isBatteryCharging ? '↓ ' : isBatteryDischarging ? '↑ ' : ''}${this._formatPower(Math.abs(batteryPower))}
                  </span>
                </div>
                <div class="battery-row">
                  <span class="battery-label">Status</span>
                  <span class="battery-value ${isBatteryCharging ? 'charging' : isBatteryDischarging ? 'discharging' : 'standby'}">
                    ${isBatteryCharging ? this._t('charging') : isBatteryDischarging ? this._t('discharging') : this._t('standby')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          ${hasEV ? `
          <!-- EV Section -->
          <div class="details-section">
            <div class="details-title">E-Auto</div>
            <div class="battery-display" data-entity="${this._config.ev_power}" style="cursor: pointer;">
              <div class="battery-icon-container">
                <ha-icon icon="mdi:car-electric" style="--mdc-icon-size: clamp(40px, 4vw, 56px); color: ${isEvCharging ? colors.ev : 'rgba(255,255,255,0.3)'}; filter: ${isEvCharging ? 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.4))' : 'none'};"></ha-icon>
              </div>
              <div class="battery-soc" style="color: ${isEvCharging ? colors.ev : 'rgba(255,255,255,0.5)'};">${isEvCharging ? this._formatPower(evPower) : '—'}</div>
              <div class="battery-info">
                <div class="battery-row">
                  <span class="battery-label">Status</span>
                  <span class="battery-value" style="color: ${isEvCharging ? colors.ev : 'rgba(255,255,255,0.5)'};">
                    ${isEvCharging ? this._t('charging') : this._t('idle')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    `;
    
    // Setup click event listeners after rendering
    this._setupEventListeners();
  }

  // Render solar modules if configured
  _renderSolarModules() {
    const modules = [];
    if (this._config.solar_module1) {
      modules.push({
        entity: this._config.solar_module1,
        name: this._config.solar_module1_name || "Module 1"
      });
    }
    if (this._config.solar_module2) {
      modules.push({
        entity: this._config.solar_module2,
        name: this._config.solar_module2_name || "Module 2"
      });
    }
    if (this._config.solar_module3) {
      modules.push({
        entity: this._config.solar_module3,
        name: this._config.solar_module3_name || "Module 3"
      });
    }
    if (this._config.solar_module4) {
      modules.push({
        entity: this._config.solar_module4,
        name: this._config.solar_module4_name || "Module 4"
      });
    }

    if (modules.length === 0) return '';

    let html = `<div class="modules-list">`;

    modules.forEach(mod => {
      const power = this._getStateInWatts(mod.entity, 0);
      html += `
        <div class="module-item">
          <span class="module-name">${mod.name}</span>
          <span class="module-value">${this._formatPower(power)}</span>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }
}

// Register card component
customElements.define('prism-energy-horizontal', PrismEnergyHorizontalCard);

// Register with HACS / HA card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-energy-horizontal",
  name: "Prism Energy Horizontal",
  preview: true,
  description: "A glassmorphism energy flow card optimized for tablets with side panel details"
});

console.info(
  `%c PRISM-ENERGY-HORIZONTAL %c v1.2.3 %c Weather Performance Optimized `,
  'background: #F59E0B; color: black; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'background: #1e2024; color: white; font-weight: bold; padding: 2px 6px;',
  'background: #3B82F6; color: white; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;'
);

})();

// ============================================
// prism-3dprinter.js
// ============================================
(function() {
class Prism3DPrinterCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.showCamera = false;
    this._hasRendered = false;
  }

  static getStubConfig() {
    return {
      entity: "sensor.3d_printer",
      name: "3D Printer",
      camera_entity: "camera.3d_printer",
      image: "/local/community/Prism-Dashboard/images/printer-blank.jpg",
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: {} },
        },
        {
          name: "name",
          selector: { text: {} },
        },
        {
          name: "camera_entity",
          selector: { entity: { domain: "camera" } },
        },
        {
          name: "image",
          selector: { text: {} },
        },
      ],
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define an entity");
    }
    // Shallow copy to avoid read-only issues
    this.config = { ...config };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._hasRendered) {
      this.render();
      this._hasRendered = true;
      this._setupListeners();
    } else {
      this.render();
      this._setupListeners();
    }
  }

  getCardSize() {
    return 6;
  }

  connectedCallback() {
    if (!this._hasRendered) {
      this.render();
      this._hasRendered = true;
      this._setupListeners();
    }
  }

  _getPrinterState() {
    const hass = this._hass;
    const cfg = this.config || {};

    const entityId = cfg.entity;
    const stateObj = hass && entityId ? hass.states[entityId] : null;
    const stateStr = stateObj ? stateObj.state : "unavailable";
    const attr = stateObj ? stateObj.attributes : {};

    const progress = attr.progress ?? 0;
    const printTimeLeft = attr.print_time_left ?? "0h 0m";
    const nozzleTemp = attr.nozzle_temp ?? 0;
    const targetNozzleTemp = attr.target_nozzle_temp ?? 0;
    const bedTemp = attr.bed_temp ?? 0;
    const targetBedTemp = attr.target_bed_temp ?? 0;
    const fanSpeed = attr.fan_speed ?? 0;
    const currentLayer = attr.current_layer ?? 0;
    const totalLayers = attr.total_layers ?? 0;
    const name = cfg.name || attr.friendly_name || "3D Printer";

    const cameraEntity = cfg.camera_entity;
    const cameraState =
      hass && cameraEntity ? hass.states[cameraEntity] : null;
    const cameraImage =
      cameraState?.attributes?.entity_picture ||
      cfg.image ||
      "/local/community/Prism-Dashboard/images/printer-blank.jpg";

    const isLightOn = attr.light === "on" || true; // keep bright look by default

    return {
      stateStr,
      progress,
      printTimeLeft,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      fanSpeed,
      currentLayer,
      totalLayers,
      name,
      cameraEntity,
      cameraImage,
      isLightOn,
    };
  }

  render() {
    const {
      stateStr,
      progress,
      printTimeLeft,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      fanSpeed,
      currentLayer,
      totalLayers,
      name,
      cameraEntity,
      cameraImage,
      isLightOn,
    } = this._getPrinterState();

    const layerInfo =
      totalLayers && currentLayer
        ? `Layer ${currentLayer}/${totalLayers}`
        : "";

    const wrapper = `
      <style>
        .card {
          position: relative;
          width: 100%;
          min-height: 400px;
          border-radius: 32px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease-in-out;
          overflow: hidden;
          background-color: rgba(30, 32, 36, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5);
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: white;
          box-sizing: border-box;
        }
        .noise {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          pointer-events: none;
          background-image: url("https://grainy-gradients.vercel.app/noise.svg");
          mix-blend-mode: overlay;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          z-index: 20;
          margin-bottom: 8px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .icon-container {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
          transition: all 0.3s;
        }
        .icon-printing {
          background-color: rgba(34, 197, 94, 0.2);
          color: rgb(74, 222, 128);
          filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.6));
        }
        .icon-paused {
          background-color: rgba(234, 179, 8, 0.2);
          color: rgb(250, 204, 21);
          filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.6));
        }
        .icon-idle {
          background-color: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.4);
        }
        .title {
          color: rgba(255, 255, 255, 0.9);
          font-weight: 700;
          font-size: 1.125rem;
          line-height: 1.25;
          margin: 0;
        }
        .subtitle-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }
        .status-badge {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: currentColor;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .layer-badge {
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 4px;
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .main-visual {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 12px;
        }
        .image-container {
          position: relative;
          width: 100%;
          max-width: 280px;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .printer-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 20px 30px rgba(0,0,0,0.5));
          z-index: 10;
          transition: filter 0.5s ease;
        }
        .light-on {
          filter: drop-shadow(0 0 15px rgba(59,130,246,0.3)) brightness(1.1);
        }
        .light-off {
          filter: drop-shadow(0 20px 30px rgba(0,0,0,0.5)) brightness(0.7);
        }
        .progress-section {
          width: 100%;
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
        }
        .progress-track {
          width: 100%;
          background-color: rgba(20, 20, 20, 0.8);
          height: 12px;
          border-radius: 9999px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.2);
        }
        .progress-bar {
          height: 100%;
          background-color: rgb(59, 130, 246);
          border-radius: 9999px;
          position: relative;
          box-shadow: 2px 0 5px rgba(59,130,246,0.4);
          width: ${progress}%;
          transition: width 0.5s ease-out;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin: 16px 0;
          z-index: 10;
        }
        .stat-card {
          background-color: rgba(20, 20, 20, 0.8);
          border-radius: 12px;
          padding: 8px;
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .stat-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.625rem;
          text-transform: uppercase;
        }
        .stat-label ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-value {
          font-size: 0.875rem;
          font-weight: 700;
          color: white;
          font-family: monospace;
        }
        .stat-target {
          font-size: 0.625rem;
          color: rgba(255, 255, 255, 0.3);
        }
        .controls-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          z-index: 10;
        }
        .btn {
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          outline: none;
          font-family: inherit;
        }
        .btn ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-pause {
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 10px -2px rgba(0,0,0,0.3);
        }
        .btn-stop {
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 10px -2px rgba(0,0,0,0.3);
        }
        .btn-light {
          background-color: rgba(20, 20, 20, 0.8);
          color: white;
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.2);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      </style>

      <div class="card">
        <div class="noise"></div>

        <div class="header">
          <div class="header-left">
            <div class="icon-container ${
              stateStr === "printing"
                ? "icon-printing"
                : stateStr === "paused"
                ? "icon-paused"
                : "icon-idle"
            }">
              <ha-icon icon="mdi:printer-3d-nozzle"></ha-icon>
            </div>
            <div>
              <h3 class="title">${name}</h3>
              <div class="subtitle-row">
                <span class="status-badge" style="color: ${
                  stateStr === "printing"
                    ? "#4ade80"
                    : stateStr === "paused"
                    ? "#facc15"
                    : "rgba(255,255,255,0.6)"
                }">
                  <span class="status-dot"></span>
                  ${stateStr}
                </span>
                ${
                  layerInfo
                    ? `<span class="layer-badge">${layerInfo}</span>`
                    : ""
                }
              </div>
            </div>
          </div>
        </div>

        <div class="main-visual">
          <div class="image-container" id="image-toggle">
            <img src="${
              this.showCamera && cameraEntity ? cameraImage : cameraImage
            }" class="printer-img ${
      isLightOn ? "light-on" : "light-off"
    }" alt="Printer" />
          </div>

          <div class="progress-section">
            <div class="progress-label">
              <span>Progress</span>
              <span style="font-family: monospace; color: white;">${progress}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar"></div>
            </div>
            <div class="progress-label" style="justify-content: flex-end; font-family: monospace; font-size: 0.625rem; opacity: 0.6; margin-top: 4px;">
              -${printTimeLeft} remaining
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">
              <ha-icon icon="mdi:thermometer" style="width: 12px; height: 12px;"></ha-icon> Nozzle
            </div>
            <span class="stat-value">${nozzleTemp}°</span>
            <span class="stat-target">${targetNozzleTemp}°</span>
          </div>
          <div class="stat-card">
            <div class="stat-label">
              <ha-icon icon="mdi:radiator" style="width: 12px; height: 12px;"></ha-icon> Bed
            </div>
            <span class="stat-value">${bedTemp}°</span>
            <span class="stat-target">${targetBedTemp}°</span>
          </div>
          <div class="stat-card">
            <div class="stat-label">
              <ha-icon icon="mdi:fan" style="width: 12px; height: 12px;"></ha-icon> Fan
            </div>
            <span class="stat-value">${fanSpeed}%</span>
            <span class="stat-target">${layerInfo || "-"}</span>
          </div>
        </div>

        <div class="controls-grid">
          <button class="btn btn-pause" id="pause-btn">
            <ha-icon icon="${
              stateStr === "printing" ? "mdi:pause" : "mdi:play"
            }" style="width: 16px; height: 16px;"></ha-icon>
            <span style="font-size: 0.75rem; font-weight: 700;">${
              stateStr === "printing" ? "Pause" : "Resume"
            }</span>
          </button>

          <button class="btn btn-stop" id="stop-btn">
            <ha-icon icon="mdi:stop" style="width: 16px; height: 16px;"></ha-icon>
            <span style="font-size: 0.75rem; font-weight: 700;">Stop</span>
          </button>

          <button class="btn btn-light" id="light-btn">
            <ha-icon icon="mdi:lightbulb" style="width: 16px; height: 16px;"></ha-icon>
          </button>
        </div>
      </div>
    `;

    this.shadowRoot.innerHTML = wrapper;
  }

  _setupListeners() {
    const root = this.shadowRoot;
    if (!root) return;

    const imgToggle = root.getElementById("image-toggle");
    if (imgToggle) {
      imgToggle.onclick = () => {
        this.showCamera = !this.showCamera;
        this.render();
        this._setupListeners();
      };
    }

    const pauseBtn = root.getElementById("pause-btn");
    if (pauseBtn) {
      pauseBtn.onclick = (e) => {
        e.stopPropagation();
        // Placeholder: user can hook to printer services here if needed
        console.debug("prism-3dprinter: pause/resume clicked");
      };
    }

    const stopBtn = root.getElementById("stop-btn");
    if (stopBtn) {
      stopBtn.onclick = (e) => {
        e.stopPropagation();
        console.debug("prism-3dprinter: stop clicked");
      };
    }

    const lightBtn = root.getElementById("light-btn");
    if (lightBtn) {
      lightBtn.onclick = (e) => {
        e.stopPropagation();
        console.debug("prism-3dprinter: light toggle clicked");
      };
    }
  }
}

customElements.define("prism-3dprinter", Prism3DPrinterCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-3dprinter",
  name: "Prism 3D Printer",
  preview: true,
  description:
    "3D printer status card with glassmorphism styling for temperature, progress and layers",
});



})();

// ============================================
// prism-bambu.js
// ============================================
(function() {
// Bambu Lab Manufacturer and Models for device filtering
// Synchronized with ha-bambulab-cards repository (https://github.com/greghesp/ha-bambulab-cards)
const BAMBU_MANUFACTURER = 'Bambu Lab';
const BAMBU_PRINTER_MODELS = [
  // A-Series
  'A1', 'A1 MINI', 'A1 Mini', 'A1MINI', 'A1Mini', 'A1mini',
  // H-Series (newer desktop printers)
  'H2C', 'H2D', 'H2DPRO', 'H2S',
  // P-Series
  'P1P', 'P1S', 'P2S',
  // X-Series (professional)
  'X1', 'X1C', 'X1E'
];

// AMS Models - synchronized with ha-bambulab-cards
const BAMBU_AMS_MODELS = [
  'AMS',           // Original AMS (4 slots)
  'AMS Lite',      // AMS Lite (4 slots, for A1)
  'AMS 2 Pro',     // AMS 2 Pro (newer, for H2D etc.)
  'AMS HT',        // AMS High Temperature
  'External Spool' // External spool holder
];

// Entity keys to look for (based on translation_key from ha-bambulab)
const ENTITY_KEYS = [
  'aux_fan_speed', 'bed_temp', 'chamber_fan_speed', 'chamber_light', 'chamber_temp',
  'cooling_fan_speed', 'cover_image', 'current_layer', 'door_open', 'humidity',
  'heatbreak_fan_speed', 'nozzle_temp', 'power', 'print_progress', 'print_status', 'remaining_time',
  'speed_profile', 'stage', 'target_bed_temp', 'target_bed_temperature',
  'target_nozzle_temp', 'target_nozzle_temperature', 'total_layers', 'camera',
  'titelbild' // German translation key for cover image
];

class PrismBambuCard extends HTMLElement {
  // Set to true for debugging output (should be false in production)
  static DEBUG = false;
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.showCamera = false;
    this.hasRendered = false;
    this._deviceEntities = {}; // Cache for device entities
    this._lastStatus = null; // Track status for re-render decisions
    this._updateThrottleTimer = null; // Throttle updates to prevent excessive re-renders
    this._snapshotInterval = null; // Interval for snapshot mode camera updates
  }
  
  // Debug logging helper - only logs if DEBUG is enabled
  static log(...args) {
    if (PrismBambuCard.DEBUG) {
      console.log('Prism Bambu:', ...args);
    }
  }

  static getStubConfig() {
    return {
      printer: '',
      name: 'Bambu Lab Printer',
      camera_entity: '',
      image: '/local/community/Prism-Dashboard/images/printer-blank.jpg'
    };
  }

  static getConfigForm() {
    // Build filter for printer device selector
    const printerFilterCombinations = BAMBU_PRINTER_MODELS.map(model => ({
      manufacturer: BAMBU_MANUFACTURER,
      model: model
    }));
    
    // Build filter for AMS device selector
    const amsFilterCombinations = BAMBU_AMS_MODELS.map(model => ({
      manufacturer: BAMBU_MANUFACTURER,
      model: model
    }));

    return {
      schema: [
        {
          name: 'printer',
          label: 'Bambu Lab Printer (select your printer device)',
          required: true,
          selector: { device: { filter: printerFilterCombinations } }
        },
        {
          name: 'ams_device',
          label: 'AMS Device (optional - select your AMS)',
          selector: { device: { filter: amsFilterCombinations } }
        },
        {
          name: 'name',
          label: 'Printer name (optional)',
          selector: { text: {} }
        },
        {
          name: 'camera_entity',
          label: 'Camera entity (optional - auto-detected if not set)',
          selector: { entity: { domain: 'camera' } }
        },
        {
          name: 'camera_live_stream',
          label: 'Use live stream (off = snapshot every 2 sec)',
          selector: { boolean: {} }
        },
        {
          name: 'image',
          label: 'Printer image path (optional, supports .png and .jpg)',
          selector: { text: {} }
        },
        {
          name: 'show_cover_image',
          label: 'Show 3D model preview (Titelbild) with print progress',
          selector: { boolean: {} }
        },
        {
          name: 'cover_image_entity',
          label: 'Cover image entity (optional - auto-detected if not set)',
          selector: { entity: { domain: 'image' } }
        },
        // Custom entities section
        {
          type: 'expandable',
          name: '',
          title: 'Custom Entities',
          schema: [
            {
              name: 'power_switch',
              label: 'Power switch entity',
              selector: { entity: { domain: 'switch' } }
            },
            {
              name: 'power_switch_icon',
              label: 'Power switch icon (default: mdi:power)',
              selector: { icon: {} }
            },
            {
              name: 'custom_light',
              label: 'Custom light entity (overrides auto-detected)',
              selector: { entity: { domain: 'light' } }
            },
            {
              name: 'custom_light_name',
              label: 'Custom light label (default: "Light")',
              selector: { text: {} }
            },
            {
              name: 'custom_humidity',
              label: 'Custom humidity sensor',
              selector: { entity: { domain: 'sensor', device_class: 'humidity' } }
            },
            {
              name: 'custom_humidity_name',
              label: 'Custom humidity label (default: "Humid")',
              selector: { text: {} }
            },
            {
              name: 'custom_temperature',
              label: 'Custom temperature sensor',
              selector: { entity: { domain: 'sensor', device_class: 'temperature' } }
            },
            {
              name: 'custom_temperature_name',
              label: 'Custom temperature label (default: "Custom")',
              selector: { text: {} }
            },
            {
              name: 'custom_fan',
              label: 'Custom fan sensor',
              selector: { entity: { domain: 'sensor' } }
            },
            {
              name: 'custom_fan_name',
              label: 'Custom fan label (default: "Custom")',
              selector: { text: {} }
            }
          ]
        },
        // Visibility toggles section
        {
          type: 'expandable',
          name: '',
          title: 'Display Options',
          schema: [
            {
              name: 'show_part_fan',
              label: 'Show Part Fan',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_aux_fan',
              label: 'Show Aux Fan',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_chamber_fan',
              label: 'Show Chamber Fan (if available)',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_heatbreak_fan',
              label: 'Show Heatbreak Fan (if available)',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_nozzle_temp',
              label: 'Show Nozzle Temperature',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_bed_temp',
              label: 'Show Bed Temperature',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_chamber_temp',
              label: 'Show Chamber Temperature',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_humidity',
              label: 'Show Humidity (if configured)',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_custom_temp',
              label: 'Show Custom Temperature (if configured)',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_custom_fan',
              label: 'Show Custom Fan (if configured)',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_ams_info',
              label: 'Show AMS Temperature & Humidity (if available)',
              default: true,
              selector: { boolean: {} }
            }
          ]
        },
        // Multi-Printer View section
        {
          type: 'expandable',
          name: '',
          title: 'Multi-Printer Camera View',
          schema: [
            {
              name: 'multi_printer_enabled',
              label: 'Enable Multi-Printer View (show multiple printers in camera popup)',
              selector: { boolean: {} }
            },
            {
              name: 'multi_printer_2',
              label: 'Printer 2 (optional)',
              selector: { device: { filter: printerFilterCombinations } }
            },
            {
              name: 'multi_camera_2',
              label: 'Printer 2 Camera (auto-detected if not set)',
              selector: { entity: { domain: 'camera' } }
            },
            {
              name: 'multi_name_2',
              label: 'Printer 2 Name (optional)',
              selector: { text: {} }
            },
            {
              name: 'multi_printer_3',
              label: 'Printer 3 (optional)',
              selector: { device: { filter: printerFilterCombinations } }
            },
            {
              name: 'multi_camera_3',
              label: 'Printer 3 Camera (auto-detected if not set)',
              selector: { entity: { domain: 'camera' } }
            },
            {
              name: 'multi_name_3',
              label: 'Printer 3 Name (optional)',
              selector: { text: {} }
            },
            {
              name: 'multi_printer_4',
              label: 'Printer 4 (optional)',
              selector: { device: { filter: printerFilterCombinations } }
            },
            {
              name: 'multi_camera_4',
              label: 'Printer 4 Camera (auto-detected if not set)',
              selector: { entity: { domain: 'camera' } }
            },
            {
              name: 'multi_name_4',
              label: 'Printer 4 Name (optional)',
              selector: { text: {} }
            }
          ]
        }
      ]
    };
  }

  // Find all entities belonging to this device (like ha-bambulab-cards does)
  getBambuDeviceEntities() {
    if (!this._hass || !this.config?.printer) return {};
    
    const deviceId = this.config.printer;
    const result = {};
    
    // Loop through all hass entities and find those belonging to our device
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      
      if (entityInfo.device_id === deviceId) {
        // Check if this entity matches one of our known keys
        if (entityInfo.platform === 'bambu_lab') {
          const translationKey = entityInfo.translation_key;
          if (ENTITY_KEYS.includes(translationKey)) {
            result[translationKey] = {
              entity_id: entityId,
              ...entityInfo
            };
          }
          // Also store by simple name for easier access
          result[entityId] = entityInfo;
        }
      }
    }
    
    return result;
  }

  // Get entity state by translation key
  getEntityState(key) {
    const entityInfo = this._deviceEntities[key];
    if (!entityInfo?.entity_id) return null;
    const state = this._hass.states[entityInfo.entity_id];
    return state?.state ?? null;
  }

  // Get entity numeric value
  getEntityValue(key) {
    const state = this.getEntityState(key);
    return state ? parseFloat(state) || 0 : 0;
  }

  // Get device entities for any printer (by device ID) - for multi-printer view
  getDeviceEntitiesForPrinter(deviceId) {
    if (!this._hass || !deviceId) return {};
    
    const result = {};
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      
      if (entityInfo.device_id === deviceId) {
        if (entityInfo.platform === 'bambu_lab') {
          const translationKey = entityInfo.translation_key;
          if (ENTITY_KEYS.includes(translationKey)) {
            result[translationKey] = {
              entity_id: entityId,
              ...entityInfo
            };
          }
          result[entityId] = entityInfo;
        }
      }
    }
    return result;
  }

  // Get entity state for a specific device's entities
  getEntityStateForDevice(deviceEntities, key) {
    const entityInfo = deviceEntities[key];
    if (!entityInfo?.entity_id) return null;
    const state = this._hass.states[entityInfo.entity_id];
    return state?.state ?? null;
  }

  // Get entity value for a specific device
  getEntityValueForDevice(deviceEntities, key) {
    const state = this.getEntityStateForDevice(deviceEntities, key);
    return state ? parseFloat(state) || 0 : 0;
  }

  // Get printer data for any device (by device ID) - for multi-printer view
  getPrinterDataForDevice(deviceId, customCameraEntity, customName) {
    if (!this._hass || !deviceId) {
      return {
        name: customName || 'Unknown Printer',
        progress: 0,
        stateStr: 'unavailable',
        isPrinting: false,
        isPaused: false,
        isIdle: true,
        printTimeLeft: '--',
        currentLayer: 0,
        totalLayers: 0,
        nozzleTemp: 0,
        targetNozzleTemp: 0,
        bedTemp: 0,
        targetBedTemp: 0,
        chamberTemp: 0,
        cameraEntity: null
      };
    }

    const deviceEntities = this.getDeviceEntitiesForPrinter(deviceId);
    if (Object.keys(deviceEntities).length === 0) {
      return {
        name: customName || 'Unknown Printer',
        progress: 0,
        stateStr: 'unavailable',
        isPrinting: false,
        isPaused: false,
        isIdle: true,
        printTimeLeft: '--',
        currentLayer: 0,
        totalLayers: 0,
        nozzleTemp: 0,
        targetNozzleTemp: 0,
        bedTemp: 0,
        targetBedTemp: 0,
        chamberTemp: 0,
        cameraEntity: null
      };
    }

    const progress = this.getEntityValueForDevice(deviceEntities, 'print_progress');
    const stateStr = this.getEntityStateForDevice(deviceEntities, 'print_status') || 
                     this.getEntityStateForDevice(deviceEntities, 'stage') || 'unavailable';
    
    const statusLower = stateStr.toLowerCase();
    const isPrinting = ['printing', 'prepare', 'running', 'druckt', 'vorbereiten'].includes(statusLower);
    const isPaused = ['paused', 'pause', 'pausiert'].includes(statusLower);
    const isIdle = !isPrinting && !isPaused;

    // Remaining time
    const remainingTimeEntity = deviceEntities['remaining_time'];
    let printTimeLeft = '--';
    if (remainingTimeEntity?.entity_id && (isPrinting || isPaused)) {
      const state = this._hass.states[remainingTimeEntity.entity_id];
      if (state) {
        const minutes = parseFloat(state.state) || 0;
        if (minutes > 0) {
          const hours = Math.floor(minutes / 60);
          const mins = Math.round(minutes % 60);
          printTimeLeft = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
      }
    }

    // Temperatures
    const nozzleTemp = this.getEntityValueForDevice(deviceEntities, 'nozzle_temp');
    const targetNozzleTemp = this.getEntityValueForDevice(deviceEntities, 'target_nozzle_temp') || 
                             this.getEntityValueForDevice(deviceEntities, 'target_nozzle_temperature');
    const bedTemp = this.getEntityValueForDevice(deviceEntities, 'bed_temp');
    const targetBedTemp = this.getEntityValueForDevice(deviceEntities, 'target_bed_temp') || 
                          this.getEntityValueForDevice(deviceEntities, 'target_bed_temperature');
    const chamberTemp = this.getEntityValueForDevice(deviceEntities, 'chamber_temp');

    // Layer info
    let currentLayer = 0;
    let totalLayers = 0;
    if (isPrinting || isPaused) {
      currentLayer = parseInt(this.getEntityStateForDevice(deviceEntities, 'current_layer')) || 0;
      totalLayers = parseInt(this.getEntityStateForDevice(deviceEntities, 'total_layers')) || 0;
    }

    // Camera entity
    let cameraEntity = customCameraEntity;
    if (!cameraEntity) {
      const cameraEntityInfo = deviceEntities['camera'];
      if (cameraEntityInfo?.entity_id?.startsWith('camera.')) {
        cameraEntity = cameraEntityInfo.entity_id;
      } else {
        for (const key in deviceEntities) {
          const info = deviceEntities[key];
          if (info?.entity_id?.startsWith('camera.')) {
            cameraEntity = info.entity_id;
            break;
          }
        }
      }
    }
    if (cameraEntity && !cameraEntity.startsWith('camera.')) {
      cameraEntity = null;
    }

    // Device name
    const device = this._hass.devices?.[deviceId];
    const name = customName || device?.name || 'Bambu Lab Printer';

    return {
      deviceId,
      name,
      progress: isIdle ? 0 : progress,
      stateStr,
      isPrinting,
      isPaused,
      isIdle,
      printTimeLeft: isIdle ? '--' : printTimeLeft,
      currentLayer: isIdle ? 0 : currentLayer,
      totalLayers: isIdle ? 0 : totalLayers,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      chamberTemp,
      cameraEntity
    };
  }

  // Get all configured printers for multi-view
  getMultiPrinterConfigs() {
    const printers = [];
    
    // Primary printer (always included)
    if (this.config.printer) {
      printers.push({
        deviceId: this.config.printer,
        cameraEntity: this.config.camera_entity,
        name: this.config.name,
        index: 1
      });
    }
    
    // Additional printers (only if multi-printer is enabled)
    if (this.config.multi_printer_enabled) {
      if (this.config.multi_printer_2) {
        printers.push({
          deviceId: this.config.multi_printer_2,
          cameraEntity: this.config.multi_camera_2,
          name: this.config.multi_name_2,
          index: 2
        });
      }
      if (this.config.multi_printer_3) {
        printers.push({
          deviceId: this.config.multi_printer_3,
          cameraEntity: this.config.multi_camera_3,
          name: this.config.multi_name_3,
          index: 3
        });
      }
      if (this.config.multi_printer_4) {
        printers.push({
          deviceId: this.config.multi_printer_4,
          cameraEntity: this.config.multi_camera_4,
          name: this.config.multi_name_4,
          index: 4
        });
      }
    }
    
    return printers;
  }

  setConfig(config) {
    // Don't throw error if printer is empty - show preview instead
    this.config = { ...config };
    this._deviceEntities = {}; // Reset cache
    if (!this.hasRendered) {
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    }
  }

  set hass(hass) {
    const firstTime = hass && !this._hass;
    const oldStatus = this._lastStatus;
    this._hass = hass;
    
    // Cache device entities on first hass assignment or if empty (only if printer is configured)
    if (this.config?.printer && (firstTime || Object.keys(this._deviceEntities).length === 0)) {
      this._deviceEntities = this.getBambuDeviceEntities();
      PrismBambuCard.log('Found device entities:', Object.keys(this._deviceEntities));
    }
    
    // Throttle updates to prevent excessive re-renders (max once per 100ms)
    // This prevents OOM issues when many state changes happen rapidly
    if (this._updateThrottleTimer) {
      return;
    }
    
    this._updateThrottleTimer = setTimeout(() => {
      this._updateThrottleTimer = null;
      this._performUpdate(firstTime, oldStatus);
    }, 100);
    
    // For first render, do it immediately
    if (!this.hasRendered || firstTime) {
      clearTimeout(this._updateThrottleTimer);
      this._updateThrottleTimer = null;
      this._performUpdate(firstTime, oldStatus);
    }
  }
  
  _performUpdate(firstTime, oldStatus) {
    // Get current status to detect changes
    const data = this.getPrinterData();
    const newStatus = `${data.isIdle}-${data.isPrinting}-${data.isPaused}-${!!data.chamberLightEntity}-${!!data.cameraEntity}-${!!data.powerSwitch}-${data.isPowerOn}`;
    
    // Re-render if: first time, status changed, or never rendered
    if (!this.hasRendered || firstTime || oldStatus !== newStatus) {
      this._lastStatus = newStatus;
      this.render();
      this.hasRendered = true;
      // Note: setupListeners() is already called by render(), no need to call it again
    } else {
      // Only update dynamic values
      this.updateValues();
    }
  }

  // Update only the values that change, without re-rendering the entire card
  updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    
    const data = this.getPrinterData();
    
    // Update text values
    const updateText = (selector, value) => {
      const el = this.shadowRoot.querySelector(selector);
      if (el && el.textContent !== String(value)) {
        el.textContent = value;
      }
    };
    
    // Update progress bar
    const progressBar = this.shadowRoot.querySelector('.progress-bar-fill');
    if (progressBar) {
      progressBar.style.width = `${data.progress}%`;
    }
    
    const progressText = this.shadowRoot.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = `${Math.round(data.progress)}%`;
    }
    
    // Update title
    updateText('.title', data.name);
    
    // Update status
    updateText('.status-text', data.stateStr);
    
    // Update time left
    const statVals = this.shadowRoot.querySelectorAll('.stats-row .stat-val');
    if (statVals.length >= 1) {
      statVals[0].textContent = data.printTimeLeft;
    }
    
    // Update layer
    if (statVals.length >= 2) {
      statVals[1].innerHTML = `${data.isIdle ? '--' : data.currentLayer} <span style="font-size: 0.875rem; opacity: 0.4;">/ ${data.isIdle ? '--' : data.totalLayers}</span>`;
    }
    
    // Update fans via data-pill attributes
    const updatePill = (selector, value) => {
      const pill = this.shadowRoot.querySelector(`[data-pill="${selector}"] .pill-value`);
      if (pill) pill.textContent = value;
    };
    
    updatePill('part-fan', `${data.partFanSpeed}%`);
    updatePill('aux-fan', `${data.auxFanSpeed}%`);
    if (data.chamberFanSpeed !== null && data.chamberFanSpeed !== undefined) {
      updatePill('chamber-fan', `${data.chamberFanSpeed}%`);
    }
    if (data.heatbreakFanSpeed !== null && data.heatbreakFanSpeed !== undefined) {
      updatePill('heatbreak-fan', `${data.heatbreakFanSpeed}%`);
    }
    if (data.humidity !== null) {
      updatePill('humidity', `${Math.round(data.humidity)}%`);
    }
    if (data.customFanSpeed !== null) {
      updatePill('custom-fan', `${Math.round(data.customFanSpeed)}%`);
    }
    
    // Update AMS info pills
    if (data.amsTemperature !== null) {
      const amsTempPill = this.shadowRoot.querySelector('[data-pill="ams-temp"] .ams-pill-content .ams-pill-value');
      if (amsTempPill) amsTempPill.textContent = `${Math.round(data.amsTemperature)}°C`;
    }
    if (data.amsHumidity !== null) {
      const amsHumidPill = this.shadowRoot.querySelector('[data-pill="ams-humidity"] .ams-pill-content .ams-pill-value');
      if (amsHumidPill) amsHumidPill.textContent = `${Math.round(data.amsHumidity)}%`;
    }
    
    // Update temperatures
    updatePill('nozzle-temp', `${Math.round(data.nozzleTemp)}°`);
    updatePill('bed-temp', `${Math.round(data.bedTemp)}°`);
    updatePill('chamber-temp', `${Math.round(data.chamberTemp)}°`);
    if (data.customTemp !== null) {
      updatePill('custom-temp', `${Math.round(data.customTemp)}°`);
    }
    
    // Update target temps
    const updateLabel = (selector, value) => {
      const label = this.shadowRoot.querySelector(`[data-pill="${selector}"] .pill-label`);
      if (label) label.textContent = value;
    };
    
    updateLabel('nozzle-temp', `/${Math.round(data.targetNozzleTemp)}°`);
    updateLabel('bed-temp', `/${Math.round(data.targetBedTemp)}°`);
    
    // Update camera stream hass if it exists
    const cameraStream = this.shadowRoot.querySelector('ha-camera-stream');
    if (cameraStream && this._hass) {
      cameraStream.hass = this._hass;
      if (data.cameraEntity) {
        cameraStream.stateObj = this._hass.states[data.cameraEntity];
      }
    }
    
    // Update light button state from actual HA state
    if (data.chamberLightEntity) {
      const lightBtn = this.shadowRoot.querySelector('.btn-light');
      if (lightBtn) {
        if (data.isLightOn) {
          lightBtn.classList.add('active');
        } else {
          lightBtn.classList.remove('active');
        }
      }
    }
    
    // Update power button state from actual HA state
    if (data.powerSwitch) {
      const powerBtn = this.shadowRoot.querySelector('.btn-power');
      if (powerBtn) {
        if (data.isPowerOn) {
          powerBtn.classList.remove('off');
          powerBtn.classList.add('on');
          powerBtn.title = 'Power Off';
        } else {
          powerBtn.classList.remove('on');
          powerBtn.classList.add('off');
          powerBtn.title = 'Power On';
        }
      }
    }
    
    // Update cover image progress
    const coverProgress = this.shadowRoot.querySelector('.cover-image-progress');
    if (coverProgress) {
      coverProgress.style.setProperty('--progress-height', `${data.progress}%`);
    }
    
    const coverBadge = this.shadowRoot.querySelector('.cover-progress-badge');
    if (coverBadge) {
      coverBadge.textContent = `${Math.round(data.progress)}%`;
    }
    
    // Update cover image wrapper classes for state changes
    const coverWrapper = this.shadowRoot.querySelector('.cover-image-wrapper');
    if (coverWrapper) {
      coverWrapper.classList.toggle('printing', data.isPrinting);
      coverWrapper.classList.toggle('paused', data.isPaused);
      coverWrapper.classList.toggle('idle', data.isIdle);
    }
    
    // Update printer icon state
    const printerIcon = this.shadowRoot.querySelector('.printer-icon');
    if (printerIcon) {
      const isOfflineOrUnavailable = ['offline', 'unavailable'].includes(data.stateStr.toLowerCase());
      const isPowerOff = data.powerSwitch && !data.isPowerOn;
      
      printerIcon.classList.remove('offline', 'printing', 'paused');
      if (isOfflineOrUnavailable || isPowerOff) {
        printerIcon.classList.add('offline');
      } else if (data.isPrinting) {
        printerIcon.classList.add('printing');
      } else if (data.isPaused) {
        printerIcon.classList.add('paused');
      }
    }
    
    // Update cover image URL if it changed
    const coverImage = this.shadowRoot.querySelector('.cover-image');
    if (coverImage && data.coverImageUrl && coverImage.src !== data.coverImageUrl) {
      coverImage.src = data.coverImageUrl;
    }
  }

  connectedCallback() {
    if (this.config && !this.hasRendered) {
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    }
  }

  disconnectedCallback() {
    // Cleanup timers to prevent memory leaks
    if (this._updateThrottleTimer) {
      clearTimeout(this._updateThrottleTimer);
      this._updateThrottleTimer = null;
    }
    if (this._snapshotInterval) {
      clearInterval(this._snapshotInterval);
      this._snapshotInterval = null;
    }
    if (this._cameraPopupInterval) {
      clearInterval(this._cameraPopupInterval);
      this._cameraPopupInterval = null;
    }
    if (this._cameraPopupUpdateInterval) {
      clearInterval(this._cameraPopupUpdateInterval);
      this._cameraPopupUpdateInterval = null;
    }
    if (this._cameraPopupEscHandler) {
      document.removeEventListener('keydown', this._cameraPopupEscHandler);
      this._cameraPopupEscHandler = null;
    }
    // Close camera popup if open
    this.closeCameraPopup();
    this._powerToggleDebounce = false;
  }

  setupListeners() {
    // Helper for touch + click support (tablets/mobile)
    const addTapListener = (element, callback) => {
      if (!element) return;
      let touchMoved = false;
      let touchStartTime = 0;
      
      element.addEventListener('touchstart', (e) => { 
        touchMoved = false; 
        touchStartTime = Date.now();
      }, { passive: true });
      
      element.addEventListener('touchmove', () => { 
        touchMoved = true; 
      }, { passive: true });
      
      element.addEventListener('touchend', (e) => {
        // Only trigger if it was a tap (not a swipe) and quick enough
        if (!touchMoved && (Date.now() - touchStartTime) < 500) {
          e.preventDefault();
          e.stopPropagation();
          callback(e);
        }
      });
      
      // Also keep click for desktop
      element.onclick = (e) => {
        e.stopPropagation();
        callback(e);
      };
    };
    
    // Use onclick to avoid duplicate event listeners when re-rendering
    const viewToggle = this.shadowRoot?.querySelector('.view-toggle');
    if (viewToggle) {
      viewToggle.onclick = () => this.toggleView();
    }

    const pauseBtn = this.shadowRoot?.querySelector('.btn-pause');
    if (pauseBtn) {
      pauseBtn.onclick = () => this.handlePause();
    }

    const stopBtn = this.shadowRoot?.querySelector('.btn-stop');
    if (stopBtn) {
      stopBtn.onclick = () => this.handleStop();
    }

    const speedBtn = this.shadowRoot?.querySelector('.btn-speed');
    if (speedBtn) {
      speedBtn.onclick = () => this.handleSpeed();
    }
    
    // Header light button - toggle chamber light
    const lightBtn = this.shadowRoot?.querySelector('.btn-light');
    if (lightBtn) {
      lightBtn.onclick = (e) => {
        e.stopPropagation();
        this.handleLightToggle();
      };
    }
    
    // Header camera button - toggle camera view (separate from light!)
    const cameraBtn = this.shadowRoot?.querySelector('.btn-camera');
    if (cameraBtn) {
      cameraBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleView();
      };
    }
    
    // Camera container - create camera view (live stream or snapshot)
    const cameraContainer = this.shadowRoot?.querySelector('.camera-container');
    if (cameraContainer && this._hass) {
      const entityId = cameraContainer.dataset.entity;
      const stateObj = this._hass.states[entityId];
      
      if (stateObj) {
        // Check config for live stream mode (default: true)
        const useLiveStream = this.config.camera_live_stream !== false;
        
        // Clear any existing snapshot interval
        if (this._snapshotInterval) {
          clearInterval(this._snapshotInterval);
          this._snapshotInterval = null;
        }
        
        if (useLiveStream) {
          // LIVE STREAM MODE - use ha-camera-stream element
          const cameraStream = document.createElement('ha-camera-stream');
          cameraStream.hass = this._hass;
          cameraStream.stateObj = stateObj;
          cameraStream.className = 'camera-feed';
          cameraStream.style.cursor = 'pointer';
          
          // Enable live stream with muted audio for autoplay
          cameraStream.muted = true;
          cameraStream.controls = true;
          cameraStream.allowExoPlayer = true;
          
          // Set attributes for live streaming
          cameraStream.setAttribute('muted', '');
          cameraStream.setAttribute('controls', '');
          cameraStream.setAttribute('autoplay', '');
          
          PrismBambuCard.log('Camera live stream created:', entityId);
          
          // Clear container and add stream
          cameraContainer.innerHTML = '';
          cameraContainer.appendChild(cameraStream);
          
          // Tap/Click to open popup with full stream (works on tablets too)
          addTapListener(cameraStream, () => {
            this.openCameraPopup();
          });
        } else {
          // SNAPSHOT MODE - use img element with periodic refresh
          const snapshotImg = document.createElement('img');
          snapshotImg.className = 'camera-feed camera-snapshot';
          snapshotImg.style.cursor = 'pointer';
          snapshotImg.alt = 'Camera Snapshot';
          
          // Function to update snapshot
          const updateSnapshot = () => {
            if (this._hass && entityId) {
              const currentState = this._hass.states[entityId];
              if (currentState?.attributes?.entity_picture) {
                // Add timestamp to prevent caching
                const baseUrl = currentState.attributes.entity_picture;
                const separator = baseUrl.includes('?') ? '&' : '?';
                snapshotImg.src = `${baseUrl}${separator}_ts=${Date.now()}`;
              }
            }
          };
          
          // Initial snapshot
          updateSnapshot();
          
          // Refresh snapshot every 2 seconds
          this._snapshotInterval = setInterval(updateSnapshot, 2000);
          
          PrismBambuCard.log('Camera snapshot mode created:', entityId, 'Refresh: 2s');
          
          // Clear container and add snapshot image
          cameraContainer.innerHTML = '';
          cameraContainer.appendChild(snapshotImg);
          
          // Tap/Click to open popup with full stream (works on tablets too)
          addTapListener(snapshotImg, () => {
            this.openCameraPopup();
          });
        }
      }
    }
    
    // Power button click handler
    const powerBtn = this.shadowRoot?.querySelector('.btn-power');
    if (powerBtn) {
      powerBtn.onclick = (e) => {
        e.stopPropagation();
        this.handlePowerToggle();
      };
    }
    
    // Filament slot click handlers - open popup with details
    const filamentSlots = this.shadowRoot?.querySelectorAll('.ams-slot.clickable');
    if (filamentSlots) {
      filamentSlots.forEach(slot => {
        slot.onclick = (e) => {
          e.stopPropagation();
          this.openFilamentPopup(slot);
        };
      });
    }
    
    // Filament popup close handlers
    const popupOverlay = this.shadowRoot?.querySelector('.filament-popup-overlay');
    const popupClose = this.shadowRoot?.querySelector('.filament-popup-close');
    
    if (popupOverlay) {
      popupOverlay.onclick = (e) => {
        if (e.target === popupOverlay) {
          this.closeFilamentPopup();
        }
      };
    }
    
    if (popupClose) {
      popupClose.onclick = (e) => {
        e.stopPropagation();
        this.closeFilamentPopup();
      };
    }
  }
  
  openFilamentPopup(slotElement) {
    const overlay = this.shadowRoot?.querySelector('.filament-popup-overlay');
    if (!overlay) return;
    
    // Get data from slot element
    const slotId = slotElement.dataset.slotId;
    const fullName = slotElement.dataset.fullName || '';
    const type = slotElement.dataset.type || 'Unknown';
    const color = slotElement.dataset.color || '#666666';
    const remaining = slotElement.dataset.remaining;
    const brand = slotElement.dataset.brand || '';
    const tempMin = slotElement.dataset.tempMin;
    const tempMax = slotElement.dataset.tempMax;
    
    // Update popup content
    const colorEl = overlay.querySelector('.filament-popup-color');
    if (colorEl) colorEl.style.backgroundColor = color;
    
    const setValue = (field, value) => {
      const el = overlay.querySelector(`[data-field="${field}"]`);
      if (el) el.textContent = value;
    };
    
    setValue('slot', `Slot ${slotId}`);
    setValue('name', fullName || type);
    setValue('type', type);
    setValue('brand', brand || '-');
    setValue('remaining', remaining < 0 ? 'Unknown' : `${remaining}%`);
    
    // Handle temperature range
    const tempRow = overlay.querySelector('[data-field-row="temp"]');
    const brandRow = overlay.querySelector('[data-field-row="brand"]');
    
    if (tempMin && tempMax) {
      setValue('temp', `${tempMin}° - ${tempMax}°`);
      if (tempRow) tempRow.style.display = 'flex';
    } else {
      if (tempRow) tempRow.style.display = 'none';
    }
    
    // Hide brand row if no brand
    if (brandRow) {
      brandRow.style.display = brand ? 'flex' : 'none';
    }
    
    // Show popup
    overlay.style.display = 'flex';
  }
  
  closeFilamentPopup() {
    const overlay = this.shadowRoot?.querySelector('.filament-popup-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
  
  handlePowerToggle() {
    if (!this._hass || !this.config.power_switch) return;
    
    // Debounce: Prevent multiple rapid clicks (wait 1 second between toggles)
    if (this._powerToggleDebounce) {
      PrismBambuCard.log('Power toggle debounced - too fast');
      return;
    }
    this._powerToggleDebounce = true;
    setTimeout(() => { this._powerToggleDebounce = false; }, 1000);
    
    const entityId = this.config.power_switch;
    
    // Verify the entity exists before calling service
    const entityState = this._hass.states[entityId];
    if (!entityState) {
      console.warn('Prism Bambu: Power switch entity not found:', entityId);
      return;
    }
    
    // Call the service
    this._hass.callService('switch', 'toggle', { entity_id: entityId });
    PrismBambuCard.log('Power toggle called for:', entityId);
    
    // Optimistically update UI immediately (don't wait for HA state update)
    const powerBtn = this.shadowRoot?.querySelector('.btn-power');
    const currentState = entityState.state;
    const newState = currentState === 'on' ? 'off' : 'on';
    
    if (powerBtn) {
      if (newState === 'on') {
        powerBtn.classList.remove('off');
        powerBtn.classList.add('on');
        powerBtn.title = 'Power Off';
      } else {
        powerBtn.classList.remove('on');
        powerBtn.classList.add('off');
        powerBtn.title = 'Power On';
      }
    }
  }

  toggleView() {
    this.showCamera = !this.showCamera;
    
    // Stop snapshot interval when closing camera view
    if (!this.showCamera && this._snapshotInterval) {
      clearInterval(this._snapshotInterval);
      this._snapshotInterval = null;
    }
    
    this.render();
  }

  handlePause() {
    if (!this._hass || !this._deviceEntities['print_status']) return;
    // Open more-info for the print status entity
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this._deviceEntities['print_status'].entity_id }
    });
    this.dispatchEvent(event);
  }

  handleStop() {
    if (!this._hass || !this._deviceEntities['print_status']) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this._deviceEntities['print_status'].entity_id }
    });
    this.dispatchEvent(event);
  }

  handleSpeed() {
    if (!this._hass || !this._deviceEntities['speed_profile']) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this._deviceEntities['speed_profile'].entity_id }
    });
    this.dispatchEvent(event);
  }
  
  handleLightToggle() {
    if (!this._hass || !this._deviceEntities['chamber_light']) return;
    const entityId = this._deviceEntities['chamber_light'].entity_id;
    
    // Call the service
    this._hass.callService('light', 'toggle', { entity_id: entityId });
    
    // Optimistically update UI immediately (don't wait for HA state update)
    const lightBtn = this.shadowRoot?.querySelector('.btn-light');
    const currentState = this._hass.states[entityId]?.state;
    const newState = currentState === 'on' ? 'off' : 'on';
    
    if (lightBtn) {
      // Toggle active class
      if (newState === 'on') {
        lightBtn.classList.add('active');
        lightBtn.innerHTML = '<ha-icon icon="mdi:lightbulb"></ha-icon>';
      } else {
        lightBtn.classList.remove('active');
        lightBtn.innerHTML = '<ha-icon icon="mdi:lightbulb-outline"></ha-icon>';
      }
    }
    
    // Also update printer image dimming
    const printerImg = this.shadowRoot?.querySelector('.printer-img');
    if (printerImg) {
      if (newState === 'on') {
        printerImg.classList.remove('dimmed');
      } else {
        printerImg.classList.add('dimmed');
      }
    }
  }
  
  openCameraPopup() {
    if (!this._hass) return;
    
    // Check if multi-printer mode is enabled
    const isMultiPrinter = this.config.multi_printer_enabled && (
      this.config.multi_printer_2 || this.config.multi_printer_3 || this.config.multi_printer_4
    );
    
    if (isMultiPrinter) {
      this.openMultiCameraPopup();
      return;
    }
    
    // Single printer mode - original behavior
    // Get camera entity - prefer config, then auto-detected
    let entityId = this.config.camera_entity;
    if (!entityId) {
      // Find camera entity from device entities (must be camera domain)
      for (const key in this._deviceEntities) {
        const info = this._deviceEntities[key];
        if (info?.entity_id?.startsWith('camera.')) {
          entityId = info.entity_id;
          break;
        }
      }
    }
    
    if (!entityId) return;
    
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return;
    
    // Remove existing popup if any
    this.closeCameraPopup();
    
    // Get printer name for title
    const deviceId = this.config.printer;
    const device = this._hass.devices?.[deviceId];
    const printerName = this.config.name || device?.name || 'Bambu Lab Printer';
    
    // Get printer data for info panel
    const data = this.getPrinterData();
    
    // Create popup in document.body (outside shadow DOM for true fullscreen modal)
    const overlay = document.createElement('div');
    overlay.id = 'prism-camera-popup-overlay';
    overlay.innerHTML = `
      <style>
        #prism-camera-popup-overlay {
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
          padding: 40px;
          box-sizing: border-box;
          animation: prismCameraFadeIn 0.2s ease;
          font-family: system-ui, -apple-system, sans-serif;
        }
        @keyframes prismCameraFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .prism-camera-popup {
          position: relative;
          min-width: 500px;
          min-height: 400px;
          /* Calculate width based on 16:9 aspect ratio of video area (height minus header + footer bar ~90px) */
          width: calc((75vh - 110px) * 16 / 9);
          height: 75vh;
          max-width: 95vw;
          max-height: 90vh;
          background: transparent;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.1);
          animation: prismCameraSlideIn 0.3s ease;
          display: flex;
          flex-direction: column;
          /* resize via custom handle */
        }
        @keyframes prismCameraSlideIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .prism-camera-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: linear-gradient(180deg, rgba(30,32,36,0.95), rgba(25,27,30,0.95));
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: move;
          user-select: none;
        }
        .prism-camera-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.95);
          font-size: 14px;
          font-weight: 600;
        }
        /* Popup Title Icon - Neumorphism */
        .prism-camera-title-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00AE42;
          --mdc-icon-size: 16px;
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.4),
            -1px -1px 3px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-camera-title-icon ha-icon {
          display: flex;
          --mdc-icon-size: 16px;
          filter: drop-shadow(0 0 4px rgba(0, 174, 66, 0.5));
        }
        /* Popup Close Button - Neumorphism */
        .prism-camera-close {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.4);
          --mdc-icon-size: 16px;
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.4),
            -1px -1px 3px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-camera-close ha-icon {
          display: flex;
          --mdc-icon-size: 16px;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .prism-camera-close:hover {
          color: #f87171;
        }
        .prism-camera-close:hover ha-icon {
          filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.6));
        }
        .prism-camera-close:active {
          background: linear-gradient(145deg, #22252b, #2d3038);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.5),
            inset -1px -1px 3px rgba(255, 255, 255, 0.03);
        }
        .prism-camera-body {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }
        .prism-camera-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #000;
          position: relative;
        }
        .prism-camera-content ha-camera-stream {
          width: 100%;
          height: 100%;
          --video-max-height: 100%;
        }
        .prism-camera-content ha-camera-stream video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .prism-camera-content .prism-camera-snapshot {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        /* Info Panel Overlay - Compact & Transparent */
        .prism-camera-info {
          position: absolute;
          right: 12px;
          top: 12px;
          width: 160px;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .prism-info-header {
          padding: 10px 12px;
          background: rgba(0,0,0,0.2);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        /* Info Header Icon - Neumorphism */
        .prism-info-header-icon {
          width: 22px;
          height: 22px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00AE42;
          --mdc-icon-size: 12px;
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.3),
            -1px -1px 2px rgba(255, 255, 255, 0.02),
            inset 1px 1px 1px rgba(255, 255, 255, 0.05);
        }
        .prism-info-header-icon ha-icon {
          display: flex;
          --mdc-icon-size: 12px;
          filter: drop-shadow(0 0 3px rgba(0, 174, 66, 0.5));
        }
        .prism-info-header-text {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .prism-info-content {
          flex: 1;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
        }
        
        /* Progress Section */
        .prism-info-progress {
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.04);
        }
        .prism-info-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .prism-info-progress-label {
          font-size: 8px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .prism-info-progress-value {
          font-size: 16px;
          font-weight: 700;
          color: #4ade80;
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-info-progress-bar {
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .prism-info-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00AE42, #4ade80);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        
        /* Stat Items */
        .prism-info-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: rgba(0,0,0,0.15);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.03);
        }
        /* Stat Icons - Neumorphism */
        .prism-info-stat-icon {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(145deg, #2a2d33, #1f2226);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.4),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03);
        }
        .prism-info-stat-icon ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .prism-info-stat-icon.time { color: #60a5fa; }
        .prism-info-stat-icon.time ha-icon { filter: drop-shadow(0 0 3px rgba(96, 165, 250, 0.5)); }
        .prism-info-stat-icon.layer { color: #a78bfa; }
        .prism-info-stat-icon.layer ha-icon { filter: drop-shadow(0 0 3px rgba(167, 139, 250, 0.5)); }
        .prism-info-stat-icon.nozzle { color: #f87171; }
        .prism-info-stat-icon.nozzle ha-icon { filter: drop-shadow(0 0 3px rgba(248, 113, 113, 0.5)); }
        .prism-info-stat-icon.bed { color: #fb923c; }
        .prism-info-stat-icon.bed ha-icon { filter: drop-shadow(0 0 3px rgba(251, 146, 60, 0.5)); }
        .prism-info-stat-icon.chamber { color: #4ade80; }
        .prism-info-stat-icon.chamber ha-icon { filter: drop-shadow(0 0 3px rgba(74, 222, 128, 0.5)); }
        .prism-info-stat-data {
          flex: 1;
          min-width: 0;
        }
        .prism-info-stat-label {
          font-size: 8px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .prism-info-stat-value {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-info-stat-value .target {
          font-size: 9px;
          color: rgba(255,255,255,0.35);
          font-weight: 500;
        }
        
        /* Status Badge */
        .prism-info-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          background: ${data.isPrinting ? 'rgba(74, 222, 128, 0.08)' : data.isPaused ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255,255,255,0.03)'};
          border: 1px solid ${data.isPrinting ? 'rgba(74, 222, 128, 0.2)' : data.isPaused ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.06)'};
          border-radius: 8px;
          margin-top: auto;
        }
        .prism-info-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${data.isPrinting ? '#4ade80' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.3)'};
          ${data.isPrinting ? 'animation: statusPulse 2s infinite;' : ''}
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        .prism-info-status-text {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: ${data.isPrinting ? '#4ade80' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.4)'};
        }
        
        .prism-camera-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 16px;
          background: rgba(15,15,15,0.9);
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 10px;
          color: rgba(255,255,255,0.35);
        }
        .prism-camera-footer-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .prism-camera-entity {
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 9px;
          background: rgba(255,255,255,0.06);
          padding: 3px 8px;
          border-radius: 4px;
        }
        .prism-camera-toggle-info,
        .prism-camera-toggle-light {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 9px;
          font-family: inherit;
          --mdc-icon-size: 10px;
        }
        .prism-camera-toggle-info ha-icon,
        .prism-camera-toggle-light ha-icon {
          display: flex;
          --mdc-icon-size: 10px;
        }
        .prism-camera-toggle-info:hover,
        .prism-camera-toggle-light:hover {
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8);
        }
        .prism-camera-toggle-info.active {
          background: rgba(0, 174, 66, 0.15);
          color: #4ade80;
        }
        .prism-camera-toggle-light.active {
          background: rgba(255, 200, 100, 0.2);
          color: #ffc864;
        }
        .prism-camera-resize-hint {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-right: 30px;
        }
        /* Stop Button - Neumorphism */
        .prism-info-stop-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 12px;
          margin-top: 8px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          border-radius: 8px;
          color: #f87171;
          font-size: 10px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.02),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-info-stop-btn ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 3px rgba(248, 113, 113, 0.4));
          transition: all 0.2s ease;
        }
        .prism-info-stop-btn:hover {
          color: #fca5a5;
        }
        .prism-info-stop-btn:hover ha-icon {
          filter: drop-shadow(0 0 5px rgba(248, 113, 113, 0.6));
        }
        .prism-info-stop-btn:active {
          background: linear-gradient(145deg, #22252b, #2d3038);
          box-shadow: 
            inset 3px 3px 6px rgba(0, 0, 0, 0.5),
            inset -2px -2px 4px rgba(255, 255, 255, 0.02);
        }
        .prism-camera-info.hidden {
          display: none;
        }
        /* Custom Resize Handle */
        .prism-camera-resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          cursor: nwse-resize;
          z-index: 100;
        }
        .prism-camera-resize-handle::before {
          content: '';
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 12px;
          height: 12px;
          border-right: 2px solid rgba(255,255,255,0.3);
          border-bottom: 2px solid rgba(255,255,255,0.3);
          transition: all 0.2s;
        }
        .prism-camera-resize-handle:hover::before {
          background: 
            linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.2) 38%, transparent 38%),
            linear-gradient(135deg, transparent 48%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0.2) 56%, transparent 56%),
            linear-gradient(135deg, transparent 66%, rgba(255,255,255,0.3) 66%);
        }
        .prism-camera-resize-handle:active::before {
          background: 
            linear-gradient(135deg, transparent 30%, rgba(0,174,66,0.3) 30%, rgba(0,174,66,0.3) 38%, transparent 38%),
            linear-gradient(135deg, transparent 48%, rgba(0,174,66,0.3) 48%, rgba(0,174,66,0.3) 56%, transparent 56%),
            linear-gradient(135deg, transparent 66%, rgba(0,174,66,0.4) 66%);
        }
      </style>
      <div class="prism-camera-popup">
        <div class="prism-camera-header">
          <div class="prism-camera-title">
            <div class="prism-camera-title-icon">
              <ha-icon icon="mdi:camera"></ha-icon>
            </div>
            <span>${printerName}</span>
          </div>
          <button class="prism-camera-close">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="prism-camera-body">
          <div class="prism-camera-content"></div>
          <div class="prism-camera-info">
            <div class="prism-info-header">
              <div class="prism-info-header-icon">
                <ha-icon icon="mdi:printer-3d-nozzle" style="width:12px;height:12px;"></ha-icon>
              </div>
              <span class="prism-info-header-text">Print Info</span>
            </div>
            <div class="prism-info-content">
              <div class="prism-info-progress">
                <div class="prism-info-progress-header">
                  <span class="prism-info-progress-label">Progress</span>
                  <span class="prism-info-progress-value" data-field="progress">${Math.round(data.progress)}%</span>
                </div>
                <div class="prism-info-progress-bar">
                  <div class="prism-info-progress-fill" style="width: ${data.progress}%"></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon time">
                  <ha-icon icon="mdi:clock-outline" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Time Left</div>
                  <div class="prism-info-stat-value" data-field="time">${data.printTimeLeft}</div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon layer">
                  <ha-icon icon="mdi:layers-triple" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Layer</div>
                  <div class="prism-info-stat-value" data-field="layer">${data.currentLayer} <span class="target">/ ${data.totalLayers}</span></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon nozzle">
                  <ha-icon icon="mdi:printer-3d-nozzle-heat" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Nozzle</div>
                  <div class="prism-info-stat-value" data-field="nozzle">${Math.round(data.nozzleTemp)}° <span class="target">/ ${Math.round(data.targetNozzleTemp)}°</span></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon bed">
                  <ha-icon icon="mdi:radiator" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Bed</div>
                  <div class="prism-info-stat-value" data-field="bed">${Math.round(data.bedTemp)}° <span class="target">/ ${Math.round(data.targetBedTemp)}°</span></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon chamber">
                  <ha-icon icon="mdi:thermometer" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Chamber</div>
                  <div class="prism-info-stat-value" data-field="chamber">${Math.round(data.chamberTemp)}°</div>
                </div>
              </div>
              
              <div class="prism-info-status">
                <div class="prism-info-status-dot"></div>
                <span class="prism-info-status-text" data-field="status">${data.stateStr}</span>
              </div>
              
              <button class="prism-info-stop-btn" title="Stop Print">
                <ha-icon icon="mdi:stop-circle" style="width:16px;height:16px;"></ha-icon>
                <span>Stop Print</span>
              </button>
            </div>
          </div>
        </div>
        <div class="prism-camera-footer">
          <div class="prism-camera-footer-left">
            <div class="prism-camera-entity">${entityId}</div>
            <button class="prism-camera-toggle-light">
              <ha-icon icon="mdi:lightbulb-outline"></ha-icon>
              <span>Light</span>
            </button>
            <button class="prism-camera-toggle-info active">
              <ha-icon icon="mdi:information"></ha-icon>
              <span>Info</span>
            </button>
          </div>
          <div class="prism-camera-resize-hint">
            <span>Resize</span>
          </div>
        </div>
        <div class="prism-camera-resize-handle"></div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this._cameraPopupOverlay = overlay;
    
    // Get content container
    const content = overlay.querySelector('.prism-camera-content');
    
    // Check config for live stream mode (default: true)
    const useLiveStream = this.config.camera_live_stream !== false;
    
    if (useLiveStream) {
      // LIVE STREAM MODE - use ha-camera-stream element
      const cameraStream = document.createElement('ha-camera-stream');
      cameraStream.hass = this._hass;
      cameraStream.stateObj = stateObj;
      cameraStream.muted = true;
      cameraStream.controls = true;
      cameraStream.allowExoPlayer = true;
      cameraStream.setAttribute('muted', '');
      cameraStream.setAttribute('controls', '');
      cameraStream.setAttribute('autoplay', '');
      content.appendChild(cameraStream);
    } else {
      // SNAPSHOT MODE - use img element
      const snapshotImg = document.createElement('img');
      snapshotImg.className = 'prism-camera-snapshot';
      snapshotImg.alt = 'Camera';
      
      if (stateObj.attributes?.entity_picture) {
        const baseUrl = stateObj.attributes.entity_picture;
        const separator = baseUrl.includes('?') ? '&' : '?';
        snapshotImg.src = `${baseUrl}${separator}_ts=${Date.now()}`;
      }
      content.appendChild(snapshotImg);
      
      // Start interval for snapshot refresh
      this._cameraPopupInterval = setInterval(() => {
        const currentState = this._hass?.states[entityId];
        if (currentState?.attributes?.entity_picture) {
          const baseUrl = currentState.attributes.entity_picture;
          const separator = baseUrl.includes('?') ? '&' : '?';
          snapshotImg.src = `${baseUrl}${separator}_ts=${Date.now()}`;
        }
      }, 2000);
    }
    
    // Close button handler
    overlay.querySelector('.prism-camera-close').onclick = () => this.closeCameraPopup();
    
    // Toggle info panel handler
    const toggleInfoBtn = overlay.querySelector('.prism-camera-toggle-info');
    const infoPanel = overlay.querySelector('.prism-camera-info');
    toggleInfoBtn.onclick = () => {
      infoPanel.classList.toggle('hidden');
      toggleInfoBtn.classList.toggle('active');
    };
    
    // Light toggle handler
    const toggleLightBtn = overlay.querySelector('.prism-camera-toggle-light');
    const lightEntity = this.config.custom_light || this._deviceEntities['chamber_light']?.entity_id;
    if (toggleLightBtn && lightEntity) {
      const updateLightState = () => {
        const state = this._hass.states[lightEntity]?.state;
        if (state === 'on') {
          toggleLightBtn.classList.add('active');
          toggleLightBtn.querySelector('ha-icon').setAttribute('icon', 'mdi:lightbulb');
        } else {
          toggleLightBtn.classList.remove('active');
          toggleLightBtn.querySelector('ha-icon').setAttribute('icon', 'mdi:lightbulb-outline');
        }
      };
      updateLightState();
      
      toggleLightBtn.onclick = () => {
        this._hass.callService('light', 'toggle', { entity_id: lightEntity });
        setTimeout(updateLightState, 100);
      };
    } else if (toggleLightBtn) {
      toggleLightBtn.style.display = 'none';
    }
    
    // Stop print button handler
    const stopBtn = overlay.querySelector('.prism-info-stop-btn');
    stopBtn.onclick = async () => {
      // Find the print stop button entity
      const deviceId = this.config.printer;
      let stopEntity = null;
      
      // Look for button.xxx_stop_print or similar
      for (const entityId in this._hass.entities) {
        const entityInfo = this._hass.entities[entityId];
        if (entityInfo.device_id === deviceId && 
            entityInfo.platform === 'bambu_lab' &&
            (entityId.includes('stop') || entityInfo.translation_key === 'stop')) {
          stopEntity = entityId;
          break;
        }
      }
      
      if (stopEntity) {
        // Confirm before stopping
        if (confirm('Are you sure you want to stop the print?')) {
          try {
            await this._hass.callService('button', 'press', {
              entity_id: stopEntity
            });
          } catch (e) {
            console.error('Failed to stop print:', e);
          }
        }
      } else {
        // Alternative: try to find any stop-related entity or use event
        alert('Stop entity not found. Please check your Bambu Lab integration.');
      }
    };
    
    // Click on overlay background closes popup
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeCameraPopup();
      }
    };
    
    // Escape key handler
    this._cameraPopupEscHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeCameraPopup();
      }
    };
    document.addEventListener('keydown', this._cameraPopupEscHandler);
    
    // Make popup draggable by header (mouse + touch support)
    const popup = overlay.querySelector('.prism-camera-popup');
    const header = overlay.querySelector('.prism-camera-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    const getEventCoords = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };
    
    const startDrag = (e) => {
      if (e.target.closest('.prism-camera-close')) return;
      isDragging = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      startX = coords.x;
      startY = coords.y;
      startLeft = rect.left;
      startTop = rect.top;
      popup.style.position = 'fixed';
      popup.style.margin = '0';
      popup.style.left = startLeft + 'px';
      popup.style.top = startTop + 'px';
      if (e.cancelable) e.preventDefault();
    };
    
    header.onmousedown = startDrag;
    header.ontouchstart = startDrag;
    
    this._cameraPopupDragHandler = (e) => {
      if (!isDragging) return;
      const coords = getEventCoords(e);
      const dx = coords.x - startX;
      const dy = coords.y - startY;
      popup.style.left = (startLeft + dx) + 'px';
      popup.style.top = (startTop + dy) + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupDragHandler);
    document.addEventListener('touchmove', this._cameraPopupDragHandler, { passive: true });
    
    this._cameraPopupDragEndHandler = () => {
      isDragging = false;
    };
    document.addEventListener('mouseup', this._cameraPopupDragEndHandler);
    document.addEventListener('touchend', this._cameraPopupDragEndHandler);
    
    // Custom resize handle (mouse + touch support)
    const resizeHandle = overlay.querySelector('.prism-camera-resize-handle');
    let isResizing = false;
    let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;
    
    const startResize = (e) => {
      isResizing = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      resizeStartX = coords.x;
      resizeStartY = coords.y;
      resizeStartWidth = rect.width;
      resizeStartHeight = rect.height;
      
      // Ensure popup has fixed positioning for resize
      if (popup.style.position !== 'fixed') {
        popup.style.position = 'fixed';
        popup.style.margin = '0';
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.top + 'px';
      }
      
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    
    resizeHandle.onmousedown = startResize;
    resizeHandle.ontouchstart = startResize;
    
    this._cameraPopupResizeHandler = (e) => {
      if (!isResizing) return;
      const coords = getEventCoords(e);
      const dx = coords.x - resizeStartX;
      const dy = coords.y - resizeStartY;
      const newWidth = Math.max(400, Math.min(resizeStartWidth + dx, window.innerWidth * 0.95));
      const newHeight = Math.max(300, Math.min(resizeStartHeight + dy, window.innerHeight * 0.95));
      popup.style.width = newWidth + 'px';
      popup.style.height = newHeight + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupResizeHandler);
    document.addEventListener('touchmove', this._cameraPopupResizeHandler, { passive: true });
    
    this._cameraPopupResizeEndHandler = () => {
      isResizing = false;
    };
    document.addEventListener('mouseup', this._cameraPopupResizeEndHandler);
    document.addEventListener('touchend', this._cameraPopupResizeEndHandler);
    
    // Update info panel data periodically
    this._cameraPopupUpdateInterval = setInterval(() => {
      if (!this._cameraPopupOverlay) return;
      const newData = this.getPrinterData();
      
      // Update progress
      const progressValue = overlay.querySelector('[data-field="progress"]');
      const progressFill = overlay.querySelector('.prism-info-progress-fill');
      if (progressValue) progressValue.textContent = `${Math.round(newData.progress)}%`;
      if (progressFill) progressFill.style.width = `${newData.progress}%`;
      
      // Update time
      const timeValue = overlay.querySelector('[data-field="time"]');
      if (timeValue) timeValue.textContent = newData.printTimeLeft;
      
      // Update layer
      const layerValue = overlay.querySelector('[data-field="layer"]');
      if (layerValue) layerValue.innerHTML = `${newData.currentLayer} <span class="target">/ ${newData.totalLayers}</span>`;
      
      // Update temperatures
      const nozzleValue = overlay.querySelector('[data-field="nozzle"]');
      if (nozzleValue) nozzleValue.innerHTML = `${Math.round(newData.nozzleTemp)}° <span class="target">/ ${Math.round(newData.targetNozzleTemp)}°</span>`;
      
      const bedValue = overlay.querySelector('[data-field="bed"]');
      if (bedValue) bedValue.innerHTML = `${Math.round(newData.bedTemp)}° <span class="target">/ ${Math.round(newData.targetBedTemp)}°</span>`;
      
      const chamberValue = overlay.querySelector('[data-field="chamber"]');
      if (chamberValue) chamberValue.textContent = `${Math.round(newData.chamberTemp)}°`;
      
      // Update status
      const statusText = overlay.querySelector('[data-field="status"]');
      if (statusText) statusText.textContent = newData.stateStr;
    }, 2000);
    
    PrismBambuCard.log('Camera popup opened:', entityId);
  }
  
  closeCameraPopup() {
    // Remove popup from document.body
    if (this._cameraPopupOverlay) {
      this._cameraPopupOverlay.remove();
      this._cameraPopupOverlay = null;
    }
    
    // Also check for any orphaned popups
    const existingPopup = document.getElementById('prism-camera-popup-overlay');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // Clear snapshot interval if running
    if (this._cameraPopupInterval) {
      clearInterval(this._cameraPopupInterval);
      this._cameraPopupInterval = null;
    }
    
    // Clear info update interval
    if (this._cameraPopupUpdateInterval) {
      clearInterval(this._cameraPopupUpdateInterval);
      this._cameraPopupUpdateInterval = null;
    }
    
    // Remove escape key listener
    if (this._cameraPopupEscHandler) {
      document.removeEventListener('keydown', this._cameraPopupEscHandler);
      this._cameraPopupEscHandler = null;
    }
    
    // Refresh the camera stream in the card (it may have paused while popup was open)
    this._refreshCardCameraStream();
    
    // Remove drag listeners (mouse + touch)
    if (this._cameraPopupDragHandler) {
      document.removeEventListener('mousemove', this._cameraPopupDragHandler);
      document.removeEventListener('touchmove', this._cameraPopupDragHandler);
      this._cameraPopupDragHandler = null;
    }
    if (this._cameraPopupDragEndHandler) {
      document.removeEventListener('mouseup', this._cameraPopupDragEndHandler);
      document.removeEventListener('touchend', this._cameraPopupDragEndHandler);
      this._cameraPopupDragEndHandler = null;
    }
    
    // Remove resize listeners (mouse + touch)
    if (this._cameraPopupResizeHandler) {
      document.removeEventListener('mousemove', this._cameraPopupResizeHandler);
      document.removeEventListener('touchmove', this._cameraPopupResizeHandler);
      this._cameraPopupResizeHandler = null;
    }
    if (this._cameraPopupResizeEndHandler) {
      document.removeEventListener('mouseup', this._cameraPopupResizeEndHandler);
      document.removeEventListener('touchend', this._cameraPopupResizeEndHandler);
      this._cameraPopupResizeEndHandler = null;
    }
    
    PrismBambuCard.log('Camera popup closed');
  }
  
  // Refresh the camera stream in the card after popup closes
  _refreshCardCameraStream() {
    if (!this.shadowRoot || !this._hass || !this.showCamera) return;
    
    const cameraContainer = this.shadowRoot.querySelector('.camera-container');
    if (!cameraContainer) return;
    
    const entityId = cameraContainer.dataset.entity;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return;
    
    // Check if using live stream mode
    const useLiveStream = this.config.camera_live_stream !== false;
    if (!useLiveStream) return; // Snapshot mode doesn't need refresh
    
    // Find existing camera stream
    const existingStream = cameraContainer.querySelector('ha-camera-stream');
    if (!existingStream) return;
    
    // Small delay to let popup fully close, then recreate stream
    setTimeout(() => {
      // Remove old stream
      existingStream.remove();
      
      // Create fresh camera stream
      const cameraStream = document.createElement('ha-camera-stream');
      cameraStream.hass = this._hass;
      cameraStream.stateObj = stateObj;
      cameraStream.className = 'camera-feed';
      cameraStream.style.cursor = 'pointer';
      cameraStream.muted = true;
      cameraStream.controls = true;
      cameraStream.allowExoPlayer = true;
      cameraStream.setAttribute('muted', '');
      cameraStream.setAttribute('controls', '');
      cameraStream.setAttribute('autoplay', '');
      
      cameraContainer.appendChild(cameraStream);
      
      // Re-add tap listener
      let touchMoved = false;
      let touchStartTime = 0;
      
      cameraStream.addEventListener('touchstart', () => { 
        touchMoved = false; 
        touchStartTime = Date.now();
      }, { passive: true });
      
      cameraStream.addEventListener('touchmove', () => { 
        touchMoved = true; 
      }, { passive: true });
      
      cameraStream.addEventListener('touchend', (e) => {
        if (!touchMoved && (Date.now() - touchStartTime) < 500) {
          e.preventDefault();
          e.stopPropagation();
          this.openCameraPopup();
        }
      });
      
      cameraStream.onclick = (e) => {
        e.stopPropagation();
        this.openCameraPopup();
      };
      
      PrismBambuCard.log('Camera stream refreshed after popup close');
    }, 100);
  }

  // Multi-Printer Camera Popup - shows grid of all configured printers
  openMultiCameraPopup() {
    if (!this._hass) return;
    
    // Remove existing popup if any
    this.closeCameraPopup();
    
    // Get all configured printers
    const printerConfigs = this.getMultiPrinterConfigs();
    if (printerConfigs.length === 0) return;
    
    // Get data for all printers
    const printersData = printerConfigs.map(pc => 
      this.getPrinterDataForDevice(pc.deviceId, pc.cameraEntity, pc.name)
    );
    
    // Filter to only printers with valid camera entities
    const validPrinters = printersData.filter(p => p.cameraEntity);
    if (validPrinters.length === 0) return;
    
    const printerCount = validPrinters.length;
    
    // Determine grid layout
    let gridCols = 1, gridRows = 1;
    if (printerCount === 2) { gridCols = 2; gridRows = 1; }
    else if (printerCount === 3) { gridCols = 2; gridRows = 2; }
    else if (printerCount >= 4) { gridCols = 2; gridRows = 2; }
    
    // Create popup in document.body
    const overlay = document.createElement('div');
    overlay.id = 'prism-camera-popup-overlay';
    overlay.innerHTML = `
      <style>
        #prism-camera-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          animation: prismMultiFadeIn 0.2s ease;
          font-family: system-ui, -apple-system, sans-serif;
        }
        @keyframes prismMultiFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .prism-multi-popup {
          position: relative;
          width: 90vw;
          height: 90vh;
          max-width: 1800px;
          background: #0a0a0a;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.1);
          animation: prismMultiSlideIn 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        @keyframes prismMultiSlideIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .prism-multi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: linear-gradient(180deg, rgba(30,32,36,0.98), rgba(20,22,25,0.98));
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: move;
          user-select: none;
        }
        .prism-multi-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.95);
          font-size: 15px;
          font-weight: 600;
        }
        /* Multi-Printer Title Icon - Neumorphism */
        .prism-multi-title-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00AE42;
          --mdc-icon-size: 18px;
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-multi-title-icon ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
          filter: drop-shadow(0 0 4px rgba(0, 174, 66, 0.5));
        }
        .prism-multi-badge {
          background: linear-gradient(145deg, #1c1e24, #25282e);
          color: #4ade80;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.3),
            inset -1px -1px 2px rgba(255, 255, 255, 0.02);
        }
        /* Multi-Printer Close Button - Neumorphism */
        .prism-multi-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.4);
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          --mdc-icon-size: 18px;
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-multi-close ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
          transition: all 0.2s ease;
        }
        .prism-multi-close:hover {
          color: #f87171;
        }
        .prism-multi-close:hover ha-icon {
          filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.6));
        }
        .prism-multi-close:active {
          background: linear-gradient(145deg, #22252b, #2d3038);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.5),
            inset -1px -1px 3px rgba(255, 255, 255, 0.03);
        }
        .prism-multi-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(${gridCols}, 1fr);
          grid-template-rows: repeat(${gridRows}, 1fr);
          gap: 2px;
          background: rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .prism-multi-cell {
          position: relative;
          background: #000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .prism-multi-cell-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 8px 12px;
          background: linear-gradient(180deg, rgba(0,0,0,0.7), transparent);
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
        }
        .prism-multi-cell-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
        }
        .prism-multi-cell-name-icon {
          width: 22px;
          height: 22px;
          background: rgba(0, 174, 66, 0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00AE42;
          --mdc-icon-size: 12px;
        }
        .prism-multi-cell-name-icon ha-icon {
          display: flex;
          --mdc-icon-size: 12px;
        }
        .prism-multi-cell-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .prism-multi-light-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.5);
          transition: all 0.2s;
          --mdc-icon-size: 14px;
        }
        .prism-multi-light-btn ha-icon {
          display: flex;
          --mdc-icon-size: 14px;
        }
        .prism-multi-light-btn:hover {
          background: rgba(255,200,100,0.2);
          color: #ffc864;
        }
        .prism-multi-light-btn.active {
          background: rgba(255,200,100,0.25);
          border-color: rgba(255,200,100,0.4);
          color: #ffc864;
        }
        .prism-multi-cell-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(0,0,0,0.5);
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
        }
        .prism-multi-cell-status.printing {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
        }
        .prism-multi-cell-status.paused {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }
        .prism-multi-cell-status.idle {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
        }
        .prism-multi-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .prism-multi-cell-status.printing .prism-multi-status-dot {
          animation: statusPulse 2s infinite;
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .prism-multi-camera {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .prism-multi-camera ha-camera-stream,
        .prism-multi-camera img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .prism-multi-camera ha-camera-stream video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .prism-multi-info-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px 12px;
          background: linear-gradient(0deg, rgba(0,0,0,0.85), rgba(0,0,0,0.6), transparent);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 16px;
          z-index: 10;
        }
        .prism-multi-progress-section {
          flex: 0 0 auto;
          min-width: 140px;
        }
        .prism-multi-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .prism-multi-progress-label {
          font-size: 9px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .prism-multi-progress-value {
          font-size: 14px;
          font-weight: 700;
          color: #4ade80;
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-multi-progress-bar {
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .prism-multi-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00AE42, #4ade80);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        .prism-multi-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .prism-multi-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .prism-multi-stat-label {
          font-size: 8px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .prism-multi-stat-value {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-multi-stat-value .target {
          font-size: 9px;
          color: rgba(255,255,255,0.35);
          font-weight: 500;
        }
        .prism-multi-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 20px;
          background: rgba(15,15,15,0.95);
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 10px;
          color: rgba(255,255,255,0.35);
        }
        .prism-multi-footer-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .prism-multi-toggle-info {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.06);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 10px;
          font-family: inherit;
          --mdc-icon-size: 12px;
        }
        .prism-multi-toggle-info ha-icon {
          display: flex;
          --mdc-icon-size: 12px;
        }
        .prism-multi-toggle-info:hover {
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8);
        }
        .prism-multi-toggle-info.active {
          background: rgba(0, 174, 66, 0.15);
          color: #4ade80;
        }
        .prism-multi-info-hidden .prism-multi-info-panel {
          display: none;
        }
        .prism-multi-resize-hint {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-right: 30px;
          --mdc-icon-size: 12px;
        }
        .prism-multi-resize-hint ha-icon {
          display: flex;
          --mdc-icon-size: 12px;
        }
        .prism-multi-resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          cursor: nwse-resize;
          z-index: 100;
        }
        .prism-multi-resize-handle::before {
          content: '';
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 12px;
          height: 12px;
          border-right: 2px solid rgba(255,255,255,0.3);
          border-bottom: 2px solid rgba(255,255,255,0.3);
          transition: all 0.2s;
        }
        .prism-multi-resize-handle:hover::before {
          border-color: rgba(255,255,255,0.5);
        }
      </style>
      <div class="prism-multi-popup">
        <div class="prism-multi-header">
          <div class="prism-multi-title">
            <div class="prism-multi-title-icon">
              <ha-icon icon="mdi:view-grid"></ha-icon>
            </div>
            <span>Multi-Printer View</span>
            <span class="prism-multi-badge">${printerCount} Printers</span>
          </div>
          <button class="prism-multi-close">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="prism-multi-grid">
          ${validPrinters.map((printer, idx) => `
            <div class="prism-multi-cell" data-printer-idx="${idx}" data-device-id="${printer.deviceId}">
              <div class="prism-multi-cell-header">
                <div class="prism-multi-cell-name">
                  <div class="prism-multi-cell-name-icon">
                    <ha-icon icon="mdi:printer-3d-nozzle"></ha-icon>
                  </div>
                  <span>${printer.name}</span>
                </div>
                <div class="prism-multi-cell-actions">
                  <button class="prism-multi-light-btn" data-light-idx="${idx}" data-device-id="${printer.deviceId}" title="Toggle Light">
                    <ha-icon icon="mdi:lightbulb-outline"></ha-icon>
                  </button>
                  <div class="prism-multi-cell-status ${printer.isPrinting ? 'printing' : printer.isPaused ? 'paused' : 'idle'}">
                    <div class="prism-multi-status-dot"></div>
                    <span data-field="status-${idx}">${printer.stateStr}</span>
                  </div>
                </div>
              </div>
              <div class="prism-multi-camera" data-camera-idx="${idx}"></div>
              <div class="prism-multi-info-panel">
                <div class="prism-multi-progress-section">
                  <div class="prism-multi-progress-header">
                    <span class="prism-multi-progress-label">Progress</span>
                    <span class="prism-multi-progress-value" data-field="progress-${idx}">${Math.round(printer.progress)}%</span>
                  </div>
                  <div class="prism-multi-progress-bar">
                    <div class="prism-multi-progress-fill" data-field="progress-fill-${idx}" style="width: ${printer.progress}%"></div>
                  </div>
                </div>
                <div class="prism-multi-stats">
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Time Left</span>
                    <span class="prism-multi-stat-value" data-field="time-${idx}">${printer.printTimeLeft}</span>
                  </div>
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Layer</span>
                    <span class="prism-multi-stat-value" data-field="layer-${idx}">${printer.currentLayer} <span class="target">/ ${printer.totalLayers}</span></span>
                  </div>
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Nozzle</span>
                    <span class="prism-multi-stat-value" data-field="nozzle-${idx}">${Math.round(printer.nozzleTemp)}° <span class="target">/ ${Math.round(printer.targetNozzleTemp)}°</span></span>
                  </div>
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Bed</span>
                    <span class="prism-multi-stat-value" data-field="bed-${idx}">${Math.round(printer.bedTemp)}° <span class="target">/ ${Math.round(printer.targetBedTemp)}°</span></span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="prism-multi-footer">
          <div class="prism-multi-footer-left">
            <button class="prism-multi-toggle-info active">
              <ha-icon icon="mdi:information"></ha-icon>
              <span>Info</span>
            </button>
          </div>
          <div class="prism-multi-resize-hint">
            <span>Drag corner to resize</span>
          </div>
        </div>
        <div class="prism-multi-resize-handle"></div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this._cameraPopupOverlay = overlay;
    
    // Store printer configs for updates
    this._multiPrinterConfigs = printerConfigs;
    
    // Setup camera feeds
    const useLiveStream = this.config.camera_live_stream !== false;
    validPrinters.forEach((printer, idx) => {
      const cameraContainer = overlay.querySelector(`[data-camera-idx="${idx}"]`);
      if (!cameraContainer || !printer.cameraEntity) return;
      
      const stateObj = this._hass.states[printer.cameraEntity];
      if (!stateObj) return;
      
      if (useLiveStream) {
        const cameraStream = document.createElement('ha-camera-stream');
        cameraStream.hass = this._hass;
        cameraStream.stateObj = stateObj;
        cameraStream.muted = true;
        cameraStream.controls = true;
        cameraStream.allowExoPlayer = true;
        cameraStream.setAttribute('muted', '');
        cameraStream.setAttribute('controls', '');
        cameraStream.setAttribute('autoplay', '');
        cameraContainer.appendChild(cameraStream);
      } else {
        const snapshotImg = document.createElement('img');
        snapshotImg.className = 'prism-multi-snapshot';
        snapshotImg.alt = printer.name;
        snapshotImg.dataset.entityId = printer.cameraEntity;
        
        if (stateObj.attributes?.entity_picture) {
          const baseUrl = stateObj.attributes.entity_picture;
          const separator = baseUrl.includes('?') ? '&' : '?';
          snapshotImg.src = `${baseUrl}${separator}_ts=${Date.now()}`;
        }
        cameraContainer.appendChild(snapshotImg);
      }
    });
    
    // Snapshot refresh interval (if not live stream)
    if (!useLiveStream) {
      this._cameraPopupInterval = setInterval(() => {
        overlay.querySelectorAll('.prism-multi-snapshot').forEach(img => {
          const entityId = img.dataset.entityId;
          const currentState = this._hass?.states[entityId];
          if (currentState?.attributes?.entity_picture) {
            const baseUrl = currentState.attributes.entity_picture;
            const separator = baseUrl.includes('?') ? '&' : '?';
            img.src = `${baseUrl}${separator}_ts=${Date.now()}`;
          }
        });
      }, 2000);
    }
    
    // Close button handler
    overlay.querySelector('.prism-multi-close').onclick = () => this.closeCameraPopup();
    
    // Click on overlay background closes popup
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeCameraPopup();
      }
    };
    
    // Toggle info panels
    const toggleInfoBtn = overlay.querySelector('.prism-multi-toggle-info');
    const grid = overlay.querySelector('.prism-multi-grid');
    toggleInfoBtn.onclick = () => {
      grid.classList.toggle('prism-multi-info-hidden');
      toggleInfoBtn.classList.toggle('active');
    };
    
    // Light button handlers for each printer
    overlay.querySelectorAll('.prism-multi-light-btn').forEach(btn => {
      const deviceId = btn.dataset.deviceId;
      
      // Find light entity for this device
      let lightEntity = null;
      for (const entityId in this._hass.entities) {
        const entityInfo = this._hass.entities[entityId];
        if (entityInfo.device_id === deviceId && 
            entityInfo.platform === 'bambu_lab' &&
            (entityInfo.translation_key === 'chamber_light' || entityId.includes('light'))) {
          if (entityId.startsWith('light.')) {
            lightEntity = entityId;
            break;
          }
        }
      }
      
      // Update button state based on current light state
      if (lightEntity) {
        const updateLightBtn = () => {
          const state = this._hass.states[lightEntity]?.state;
          if (state === 'on') {
            btn.classList.add('active');
            btn.querySelector('ha-icon').setAttribute('icon', 'mdi:lightbulb');
          } else {
            btn.classList.remove('active');
            btn.querySelector('ha-icon').setAttribute('icon', 'mdi:lightbulb-outline');
          }
        };
        updateLightBtn();
        
        btn.onclick = (e) => {
          e.stopPropagation();
          this._hass.callService('light', 'toggle', { entity_id: lightEntity });
          // Optimistic update
          setTimeout(updateLightBtn, 100);
        };
      } else {
        btn.style.display = 'none';
      }
    });
    
    // Escape key handler
    this._cameraPopupEscHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeCameraPopup();
      }
    };
    document.addEventListener('keydown', this._cameraPopupEscHandler);
    
    // Make popup draggable by header (mouse + touch support)
    const popup = overlay.querySelector('.prism-multi-popup');
    const header = overlay.querySelector('.prism-multi-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    const getEventCoords = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };
    
    const startDrag = (e) => {
      if (e.target.closest('.prism-multi-close')) return;
      isDragging = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      startX = coords.x;
      startY = coords.y;
      startLeft = rect.left;
      startTop = rect.top;
      popup.style.position = 'fixed';
      popup.style.margin = '0';
      popup.style.left = startLeft + 'px';
      popup.style.top = startTop + 'px';
      if (e.cancelable) e.preventDefault();
    };
    
    header.onmousedown = startDrag;
    header.ontouchstart = startDrag;
    
    this._cameraPopupDragHandler = (e) => {
      if (!isDragging) return;
      const coords = getEventCoords(e);
      const dx = coords.x - startX;
      const dy = coords.y - startY;
      popup.style.left = (startLeft + dx) + 'px';
      popup.style.top = (startTop + dy) + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupDragHandler);
    document.addEventListener('touchmove', this._cameraPopupDragHandler, { passive: true });
    
    this._cameraPopupDragEndHandler = () => {
      isDragging = false;
    };
    document.addEventListener('mouseup', this._cameraPopupDragEndHandler);
    document.addEventListener('touchend', this._cameraPopupDragEndHandler);
    
    // Custom resize handle (mouse + touch support)
    const resizeHandle = overlay.querySelector('.prism-multi-resize-handle');
    let isResizing = false;
    let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;
    
    const startResize = (e) => {
      isResizing = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      resizeStartX = coords.x;
      resizeStartY = coords.y;
      resizeStartWidth = rect.width;
      resizeStartHeight = rect.height;
      
      if (popup.style.position !== 'fixed') {
        popup.style.position = 'fixed';
        popup.style.margin = '0';
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.top + 'px';
      }
      
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    
    resizeHandle.onmousedown = startResize;
    resizeHandle.ontouchstart = startResize;
    
    this._cameraPopupResizeHandler = (e) => {
      if (!isResizing) return;
      const coords = getEventCoords(e);
      const dx = coords.x - resizeStartX;
      const dy = coords.y - resizeStartY;
      const newWidth = Math.max(600, Math.min(resizeStartWidth + dx, window.innerWidth * 0.98));
      const newHeight = Math.max(400, Math.min(resizeStartHeight + dy, window.innerHeight * 0.98));
      popup.style.width = newWidth + 'px';
      popup.style.height = newHeight + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupResizeHandler);
    document.addEventListener('touchmove', this._cameraPopupResizeHandler, { passive: true });
    
    this._cameraPopupResizeEndHandler = () => {
      isResizing = false;
    };
    document.addEventListener('mouseup', this._cameraPopupResizeEndHandler);
    document.addEventListener('touchend', this._cameraPopupResizeEndHandler);
    
    // Update info panel data periodically
    this._cameraPopupUpdateInterval = setInterval(() => {
      if (!this._cameraPopupOverlay || !this._multiPrinterConfigs) return;
      
      this._multiPrinterConfigs.forEach((pc, idx) => {
        const newData = this.getPrinterDataForDevice(pc.deviceId, pc.cameraEntity, pc.name);
        
        // Update progress
        const progressValue = overlay.querySelector(`[data-field="progress-${idx}"]`);
        const progressFill = overlay.querySelector(`[data-field="progress-fill-${idx}"]`);
        if (progressValue) progressValue.textContent = `${Math.round(newData.progress)}%`;
        if (progressFill) progressFill.style.width = `${newData.progress}%`;
        
        // Update time
        const timeValue = overlay.querySelector(`[data-field="time-${idx}"]`);
        if (timeValue) timeValue.textContent = newData.printTimeLeft;
        
        // Update layer
        const layerValue = overlay.querySelector(`[data-field="layer-${idx}"]`);
        if (layerValue) layerValue.innerHTML = `${newData.currentLayer} <span class="target">/ ${newData.totalLayers}</span>`;
        
        // Update temperatures
        const nozzleValue = overlay.querySelector(`[data-field="nozzle-${idx}"]`);
        if (nozzleValue) nozzleValue.innerHTML = `${Math.round(newData.nozzleTemp)}° <span class="target">/ ${Math.round(newData.targetNozzleTemp)}°</span>`;
        
        const bedValue = overlay.querySelector(`[data-field="bed-${idx}"]`);
        if (bedValue) bedValue.innerHTML = `${Math.round(newData.bedTemp)}° <span class="target">/ ${Math.round(newData.targetBedTemp)}°</span>`;
        
        // Update status
        const statusText = overlay.querySelector(`[data-field="status-${idx}"]`);
        if (statusText) statusText.textContent = newData.stateStr;
        
        // Update status badge class
        const cell = overlay.querySelector(`[data-printer-idx="${idx}"]`);
        if (cell) {
          const statusBadge = cell.querySelector('.prism-multi-cell-status');
          if (statusBadge) {
            statusBadge.classList.remove('printing', 'paused', 'idle');
            statusBadge.classList.add(newData.isPrinting ? 'printing' : newData.isPaused ? 'paused' : 'idle');
          }
        }
      });
    }, 2000);
    
    PrismBambuCard.log('Multi-camera popup opened with', printerCount, 'printers');
  }

  getPrinterData() {
    if (!this._hass || !this.config) {
      return this.getPreviewData();
    }

    // If no printer selected, show preview
    if (!this.config.printer) {
      return this.getPreviewData();
    }

    // If no device entities found, show preview
    if (Object.keys(this._deviceEntities).length === 0) {
      console.warn('Prism Bambu: No device entities found for device:', this.config.printer);
      return this.getPreviewData();
    }
    
    // Read values using translation keys (how ha-bambulab organizes entities)
    const progress = this.getEntityValue('print_progress');
    const stateStr = this.getEntityState('print_status') || this.getEntityState('stage') || 'unavailable';
    
    // Debug: Log the current status
    PrismBambuCard.log('Current status:', stateStr, 'Progress:', progress);
    
    // Determine if printer is actively printing (support German status names too)
    const statusLower = stateStr.toLowerCase();
    const isPrinting = ['printing', 'prepare', 'running', 'druckt', 'vorbereiten'].includes(statusLower);
    const isPaused = ['paused', 'pause', 'pausiert'].includes(statusLower);
    const isIdle = !isPrinting && !isPaused; // Everything else is idle
    
    // Get remaining time - format it nicely (only if printing)
    const remainingTimeEntity = this._deviceEntities['remaining_time'];
    let printTimeLeft = '--';
    let printEndTime = '--:--';
    if (remainingTimeEntity?.entity_id && (isPrinting || isPaused)) {
      const state = this._hass.states[remainingTimeEntity.entity_id];
      if (state) {
        const minutes = parseFloat(state.state) || 0;
        if (minutes > 0) {
          const hours = Math.floor(minutes / 60);
          const mins = Math.round(minutes % 60);
          if (hours > 0) {
            printTimeLeft = `${hours}h ${mins}m`;
          } else {
            printTimeLeft = `${mins}m`;
          }
          // Calculate end time
          const endTime = new Date(Date.now() + minutes * 60 * 1000);
          printEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
    }
    
    // Temperatures
    const nozzleTemp = this.getEntityValue('nozzle_temp');
    const targetNozzleTemp = this.getEntityValue('target_nozzle_temp') || this.getEntityValue('target_nozzle_temperature');
    const bedTemp = this.getEntityValue('bed_temp');
    const targetBedTemp = this.getEntityValue('target_bed_temp') || this.getEntityValue('target_bed_temperature');
    const chamberTemp = this.getEntityValue('chamber_temp');
    
    // Fans
    const partFanSpeed = this.getEntityValue('cooling_fan_speed');
    const auxFanSpeed = this.getEntityValue('aux_fan_speed');
    const chamberFanSpeed = this.getEntityValue('chamber_fan_speed');
    const heatbreakFanSpeed = this.getEntityValue('heatbreak_fan_speed');
    
    // Layer info (only show when printing)
    let currentLayer = 0;
    let totalLayers = 0;
    if (isPrinting || isPaused) {
      currentLayer = parseInt(this.getEntityState('current_layer')) || 0;
      totalLayers = parseInt(this.getEntityState('total_layers')) || 0;
    }
    
    // Chamber light state - use custom light if configured, otherwise auto-detected
    let chamberLightEntityId = this.config.custom_light || this._deviceEntities['chamber_light']?.entity_id;
    const chamberLightState = chamberLightEntityId ? 
      this._hass.states[chamberLightEntityId]?.state : null;
    const isLightOn = chamberLightState === 'on';
    
    // Custom sensors
    const customHumidity = this.config.custom_humidity;
    const customHumidityState = customHumidity ? this._hass.states[customHumidity] : null;
    const humidity = customHumidityState ? parseFloat(customHumidityState.state) || 0 : null;
    const humidityName = this.config.custom_humidity_name || 'Humid';
    
    const customTemperature = this.config.custom_temperature;
    const customTemperatureState = customTemperature ? this._hass.states[customTemperature] : null;
    const customTemp = customTemperatureState ? parseFloat(customTemperatureState.state) || 0 : null;
    const customTempName = this.config.custom_temperature_name || 'Custom';
    
    const powerSwitch = this.config.power_switch;
    const powerSwitchState = powerSwitch ? this._hass.states[powerSwitch] : null;
    const isPowerOn = powerSwitchState?.state === 'on';
    const powerSwitchIcon = this.config.power_switch_icon || 'mdi:power';
    
    // Custom fan
    const customFan = this.config.custom_fan;
    const customFanState = customFan ? this._hass.states[customFan] : null;
    const customFanSpeed = customFanState ? parseFloat(customFanState.state) || 0 : null;
    const customFanName = this.config.custom_fan_name || 'Custom';
    
    // Custom light name
    const customLightName = this.config.custom_light_name || 'Light';
    
    // Debug: Log light entity
    PrismBambuCard.log('Chamber light entity:', chamberLightEntityId, 'State:', chamberLightState);
    
    // Get printer name from device
    const deviceId = this.config.printer;
    const device = this._hass.devices?.[deviceId];
    const name = this.config.name || device?.name || 'Bambu Lab Printer';
    
    // Camera - auto-detect from device entities or use config
    // IMPORTANT: Only use entities from the 'camera' domain, not switches!
    let cameraEntity = this.config.camera_entity;
    if (!cameraEntity) {
      // Try to find camera entity from device entities
      const cameraEntityInfo = this._deviceEntities['camera'];
      if (cameraEntityInfo?.entity_id?.startsWith('camera.')) {
        cameraEntity = cameraEntityInfo.entity_id;
      } else {
        // Fallback: Search all device entities for one starting with 'camera.'
        for (const key in this._deviceEntities) {
          const info = this._deviceEntities[key];
          if (info?.entity_id?.startsWith('camera.')) {
            cameraEntity = info.entity_id;
            break;
          }
        }
      }
    }
    // Verify the camera entity is actually from camera domain
    if (cameraEntity && !cameraEntity.startsWith('camera.')) {
      console.warn('Prism Bambu: Configured camera_entity is not from camera domain:', cameraEntity);
      cameraEntity = null;
    }
    const cameraState = cameraEntity ? this._hass.states[cameraEntity] : null;
    const cameraImage = cameraState?.attributes?.entity_picture || null;
    
    // Debug: Log camera entity
    PrismBambuCard.log('Camera entity:', cameraEntity, 'Has image:', !!cameraImage);
    
    // Cover image (Titelbild / 3D model preview) - auto-detect or use config
    let coverImageEntity = this.config.cover_image_entity;
    if (!coverImageEntity) {
      // Try to find cover_image entity from device entities
      const coverImageInfo = this._deviceEntities['cover_image'] || this._deviceEntities['titelbild'];
      if (coverImageInfo?.entity_id?.startsWith('image.')) {
        coverImageEntity = coverImageInfo.entity_id;
      } else {
        // Fallback: Search all device entities for one starting with 'image.' and containing titelbild/cover
        for (const key in this._deviceEntities) {
          const info = this._deviceEntities[key];
          if (info?.entity_id?.startsWith('image.') && 
              (info.entity_id.toLowerCase().includes('titelbild') || 
               info.entity_id.toLowerCase().includes('cover'))) {
            coverImageEntity = info.entity_id;
            break;
          }
        }
      }
    }
    // Verify the cover image entity is from image domain
    if (coverImageEntity && !coverImageEntity.startsWith('image.')) {
      console.warn('Prism Bambu: Cover image entity is not from image domain:', coverImageEntity);
      coverImageEntity = null;
    }
    
    // Get cover image URL from entity state
    let coverImageUrl = null;
    if (coverImageEntity && this.config.show_cover_image) {
      const coverState = this._hass.states[coverImageEntity];
      // Image entities have entity_picture attribute with the actual image URL
      coverImageUrl = coverState?.attributes?.entity_picture || null;
      // Sometimes the URL needs the HA base URL prepended
      if (coverImageUrl && !coverImageUrl.startsWith('http') && !coverImageUrl.startsWith('/')) {
        coverImageUrl = '/' + coverImageUrl;
      }
    }
    
    // Debug: Log cover image entity
    PrismBambuCard.log('Cover image entity:', coverImageEntity, 'URL:', coverImageUrl);
    
    // Image path - use configured image or default
    // Supports both .png and .jpg formats
    const printerImg = this.config.image || '/local/community/Prism-Dashboard/images/printer-blank.jpg';

    // AMS Data - ONLY use manually configured AMS device (no auto-detect)
    let amsData = [];
    let foundAnyAms = false;
    const trayEntities = [];
    let isExternalSpool = false;
    
    // Helper function to check if entity is a tray/slot entity
    const isTrayEntity = (entityInfo, entityId) => {
      // Check translation_key for tray_1, tray_2, etc. (ha-bambulab style)
      if (entityInfo.translation_key && /^tray_\d+$/.test(entityInfo.translation_key)) {
        return true;
      }
      // Check entity_id for slot or tray (some integrations use slot instead of tray)
      if (entityId.includes('_slot_') || entityId.includes('_tray_')) {
        return true;
      }
      return false;
    };
    
    // ONLY look for AMS if explicitly configured
    if (this.config.ams_device) {
      const amsDeviceId = this.config.ams_device;
      const amsDevice = this._hass.devices?.[amsDeviceId];
      const amsModel = amsDevice?.model || '';
      const amsName = amsDevice?.name || '';
      
      // Check if this is an External Spool device
      isExternalSpool = amsModel.toLowerCase().includes('external spool') || 
                        amsName.toLowerCase().includes('externalspool');
      
      PrismBambuCard.log('AMS device:', amsName, 'model:', amsModel, 'isExternalSpool:', isExternalSpool);
      
      if (isExternalSpool) {
        // External Spool: The device itself contains filament info
        // Look for sensor entities on this device that have filament attributes
        for (const entityId in this._hass.entities) {
          const entityInfo = this._hass.entities[entityId];
          if (entityInfo.device_id === amsDeviceId) {
            // Check if this entity has filament-related attributes
            const state = this._hass.states[entityId];
            const attr = state?.attributes || {};
            
            // External Spool sensor typically has color, type, name attributes
            if (attr.color || attr.type || attr.name || entityId.includes('sensor.')) {
              // This looks like a filament entity
              if (!trayEntities.find(e => e.entityId === entityId)) {
                trayEntities.push({
                  entityId,
                  translationKey: entityInfo.translation_key || 'external_spool',
                  ...entityInfo
                });
                PrismBambuCard.log('Found External Spool entity:', entityId);
                break; // External spool has only one sensor per device
              }
            }
          }
        }
      } else {
        // Regular AMS: Look for tray entities
        for (const entityId in this._hass.entities) {
          const entityInfo = this._hass.entities[entityId];
          if (entityInfo.device_id === amsDeviceId && isTrayEntity(entityInfo, entityId)) {
            trayEntities.push({
              entityId,
              translationKey: entityInfo.translation_key || entityId,
              ...entityInfo
            });
          }
        }
      }
      
      // Sort tray entities by their slot/tray number
      trayEntities.sort((a, b) => {
        const getNum = (e) => {
          const tkMatch = e.translationKey?.match(/(\d+)$/);
          if (tkMatch) return parseInt(tkMatch[1]);
          const idMatch = e.entityId?.match(/slot_(\d+)|tray_(\d+)|spool(\d*)/i);
          if (idMatch) return parseInt(idMatch[1] || idMatch[2] || idMatch[3] || 1);
          return 1;
        };
        return getNum(a) - getNum(b);
      });
    }
    
    // Debug: Log found entities
    if (trayEntities.length > 0) {
      PrismBambuCard.log('Found tray/spool entities:', trayEntities.map(e => e.entityId));
      const firstState = this._hass.states[trayEntities[0].entityId];
      PrismBambuCard.log('First entity full state:', firstState);
    } else if (this.config.ams_device) {
      PrismBambuCard.log('No tray entities found for AMS device');
    }
    
    // Build AMS data from found tray entities
    // For External Spool: only show actual slots found (1 or 2)
    // For full AMS: show 4 slots (fill with empty if needed)
    const targetSlots = isExternalSpool ? Math.max(1, trayEntities.length) : (trayEntities.length > 0 ? Math.max(4, trayEntities.length) : 0);
    
    for (let i = 0; i < targetSlots; i++) {
      const trayEntity = trayEntities[i];
      
      if (trayEntity) {
        foundAnyAms = true;
        const trayState = this._hass.states[trayEntity.entityId];
        const attr = trayState?.attributes || {};
        
        // Debug slot attributes
        if (i === 0) {
          PrismBambuCard.log('Slot 1 attributes:', JSON.stringify(attr));
        }
        PrismBambuCard.log(`Slot ${i + 1} - name: "${attr.name}", type: "${attr.type}", state: "${trayState?.state}"`);
        
        // ha-bambulab-cards uses attr.name for display (e.g. "Bambu PCTG Basic", "Bambu TPU for AMS")
        // We need to extract the filament type from name first, then type, then state
        const nameStr = attr.name || '';
        const typeStr = attr.type || '';
        const stateStr = trayState?.state || '';
        
        // Combine all sources to search for known filament types
        const searchStr = `${nameStr} ${typeStr} ${stateStr}`;
        
        // Extract short type name - support common filament types
        // Order matters: check specific types before generic ones
        const typeMatch = searchStr.match(/\b(PCTG|PETG|PLA|ABS|TPU|ASA|PA-CF|PA|PC|PVA|HIPS|PP|SUPPORT)\b/i);
        let type = '';
        if (typeMatch) {
          type = typeMatch[1].toUpperCase();
        } else if (typeStr && typeStr !== 'Generic' && typeStr.length <= 8) {
          // Use type if it's short and not "Generic"
          type = typeStr.toUpperCase();
        } else if (nameStr && nameStr !== 'Generic' && nameStr.length <= 8) {
          // Use name if short
          type = nameStr.toUpperCase();
        } else if (nameStr) {
          // Shorten long names
          type = nameStr.substring(0, 6).toUpperCase();
        } else {
          type = typeStr || stateStr || '';
        }
        
        // Get color - may be 8 chars with alpha (#RRGGBBAA), convert to 6 (#RRGGBB)
        let color = attr.color || attr.tray_color || '#666666';
        if (color && typeof color === 'string') {
          // Add # if missing
          if (!color.startsWith('#') && !color.startsWith('rgb')) {
            color = '#' + color;
          }
          // Remove alpha channel if present (8 char -> 6 char)
          if (color.length === 9) {
            color = color.substring(0, 7);
          }
        }
        
        // Get remaining percentage
        // remain_enabled indicates if RFID tracking is active
        const remainEnabled = attr.remain_enabled === true;
        const remainValue = parseFloat(attr.remain ?? attr.remaining ?? 0);
        // If remain_enabled is false or not set, show "?" instead of potentially wrong 0%
        const remaining = remainEnabled ? remainValue : (remainValue > 0 ? remainValue : -1); // -1 = unknown
        
        // Check if active
        const active = attr.active === true || attr.in_use === true;
        
        // Check if empty
        const isEmpty = attr.empty === true || 
                       !trayState?.state || 
                       trayState?.state.toLowerCase() === 'empty' || 
                       trayState?.state === 'unavailable' || 
                       trayState?.state === 'unknown';
        
        amsData.push({
          id: i + 1,
          type: isEmpty ? '' : type,
          color: isEmpty ? '#666666' : color,
          remaining: isEmpty ? 0 : Math.round(remaining),
          remainEnabled: remainEnabled,
          active,
          empty: isEmpty,
          // Full filament info for popup
          fullName: attr.name || '',
          brand: attr.brand || attr.manufacturer || '',
          nozzleTempMin: attr.nozzle_temp_min || attr.min_nozzle_temp || null,
          nozzleTempMax: attr.nozzle_temp_max || attr.max_nozzle_temp || null,
          entityId: trayEntity.entityId
        });
      } else if (!isExternalSpool && i < 4) {
        // Fill empty slots up to 4 only for full AMS (not external spool)
        amsData.push({
          id: i + 1,
          type: '',
          color: '#666666',
          remaining: 0,
          active: false,
          empty: true,
          fullName: '',
          brand: '',
          nozzleTempMin: null,
          nozzleTempMax: null,
          entityId: null
        });
      }
    }
    
    // Debug: Log final AMS data
    PrismBambuCard.log('Final AMS data:', amsData, 'isExternalSpool:', isExternalSpool, 'ams_device configured:', !!this.config.ams_device);
    
    // If no AMS device configured OR no entities found, hide section
    if (!this.config.ams_device || amsData.length === 0) {
      PrismBambuCard.log('No AMS configured or no data, hiding AMS section');
      amsData = []; // Empty = hide section
    }
    
    // Get AMS temperature and humidity (from AMS device entities)
    let amsTemperature = null;
    let amsHumidity = null;
    
    if (this.config.ams_device) {
      const amsDeviceId = this.config.ams_device;
      
      // Look for temperature and humidity sensors belonging to the AMS device
      for (const entityId in this._hass.entities) {
        const entityInfo = this._hass.entities[entityId];
        if (entityInfo.device_id === amsDeviceId) {
          const state = this._hass.states[entityId];
          const entityIdLower = entityId.toLowerCase();
          const translationKey = entityInfo.translation_key?.toLowerCase() || '';
          
          // Check for temperature sensor
          if ((entityIdLower.includes('temperature') || translationKey.includes('temperature') || 
               entityIdLower.includes('temp') || translationKey.includes('temp')) &&
              !entityIdLower.includes('nozzle') && !entityIdLower.includes('bed')) {
            const tempValue = parseFloat(state?.state);
            if (!isNaN(tempValue) && state?.state !== 'unavailable' && state?.state !== 'unknown') {
              amsTemperature = tempValue;
              PrismBambuCard.log('Found AMS temperature:', amsTemperature, 'from', entityId);
            }
          }
          
          // Check for humidity sensor
          if (entityIdLower.includes('humidity') || translationKey.includes('humidity')) {
            const humValue = parseFloat(state?.state);
            if (!isNaN(humValue) && state?.state !== 'unavailable' && state?.state !== 'unknown') {
              amsHumidity = humValue;
              PrismBambuCard.log('Found AMS humidity:', amsHumidity, 'from', entityId);
            }
          }
        }
      }
    }

    const returnData = {
      stateStr,
      progress: isIdle ? 0 : progress,
      printTimeLeft,
      printEndTime,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      chamberTemp,
      partFanSpeed,
      auxFanSpeed,
      chamberFanSpeed,
      heatbreakFanSpeed,
      currentLayer,
      totalLayers,
      name,
      cameraEntity,
      cameraImage,
      printerImg,
      coverImageEntity,
      coverImageUrl,
      showCoverImage: this.config.show_cover_image && coverImageUrl,
      amsData,
      isExternalSpool,
      isPrinting,
      isPaused,
      isIdle,
      isLightOn,
      chamberLightEntity: chamberLightEntityId,
      // Custom sensors
      humidity,
      humidityName,
      customTemp,
      customTempName,
      customFanSpeed,
      customFanName,
      customLightName,
      powerSwitch,
      isPowerOn,
      powerSwitchIcon,
      // AMS sensors
      amsTemperature,
      amsHumidity,
      // Visibility settings (default to true if not set)
      showPartFan: this.config.show_part_fan !== false,
      showAuxFan: this.config.show_aux_fan !== false,
      showChamberFan: this.config.show_chamber_fan !== false,
      showHeatbreakFan: this.config.show_heatbreak_fan !== false,
      showNozzleTemp: this.config.show_nozzle_temp !== false,
      showBedTemp: this.config.show_bed_temp !== false,
      showChamberTemp: this.config.show_chamber_temp !== false,
      showHumidity: this.config.show_humidity !== false,
      showCustomTemp: this.config.show_custom_temp !== false,
      showCustomFan: this.config.show_custom_fan !== false,
      showAmsInfo: this.config.show_ams_info !== false
    };
    
    // Debug: Log key data for icons and status
    PrismBambuCard.log('Icons - Light:', chamberLightEntityId, 'Camera:', cameraEntity);
    PrismBambuCard.log('Status - isPrinting:', isPrinting, 'isPaused:', isPaused, 'isIdle:', isIdle);
    
    return returnData;
  }

  getPreviewData() {
    return {
      stateStr: 'printing',
      progress: 45,
      printTimeLeft: '2h 15m',
      printEndTime: '14:30',
      nozzleTemp: 220,
      targetNozzleTemp: 220,
      bedTemp: 60,
      targetBedTemp: 60,
      chamberTemp: 35,
      partFanSpeed: 50,
      auxFanSpeed: 30,
      chamberFanSpeed: 65,
      heatbreakFanSpeed: 80,
      currentLayer: 12,
      totalLayers: 28,
      name: this.config?.name || 'Bambu Lab Printer',
      cameraEntity: null,
      cameraImage: null,
      printerImg: this.config?.image || '/local/community/Prism-Dashboard/images/printer-blank.jpg',
      coverImageEntity: null,
      coverImageUrl: null,
      showCoverImage: false,
      amsData: [
        { id: 1, type: 'PLA', color: '#FF4444', remaining: 85, active: false },
        { id: 2, type: 'PETG', color: '#4488FF', remaining: 42, active: true },
        { id: 3, type: 'ABS', color: '#111111', remaining: 12, active: false },
        { id: 4, type: 'TPU', color: '#FFFFFF', remaining: 0, active: false, empty: true }
      ],
      isExternalSpool: false,
      isPrinting: true,
      isPaused: false,
      isIdle: false,
      isLightOn: true,
      chamberLightEntity: null,
      // Custom sensors
      humidity: null,
      humidityName: 'Humid',
      customTemp: null,
      customTempName: 'Custom',
      customFanSpeed: null,
      customFanName: 'Custom',
      customLightName: 'Light',
      powerSwitch: null,
      isPowerOn: true,
      powerSwitchIcon: 'mdi:power',
      // AMS sensors
      amsTemperature: 25,
      amsHumidity: 45,
      // Visibility settings (all true for preview)
      showPartFan: true,
      showAuxFan: true,
      showChamberFan: true,
      showHeatbreakFan: true,
      showNozzleTemp: true,
      showBedTemp: true,
      showChamberTemp: true,
      showHumidity: true,
      showCustomTemp: true,
      showCustomFan: true,
      showAmsInfo: true
    };
  }

  render() {
    const data = this.getPrinterData();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
            position: relative;
            width: 100%;
            min-height: 600px;
            border-radius: 32px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background-color: rgba(30, 32, 36, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 20px 40px -10px rgba(0,0,0,0.6);
            color: white;
            box-sizing: border-box;
            user-select: none;
        }
        .noise {
            position: absolute;
            inset: 0;
            opacity: 0.03;
            pointer-events: none;
            background-image: url('https://grainy-gradients.vercel.app/noise.svg');
            mix-blend-mode: overlay;
        }
        
        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 20;
            margin-bottom: 24px;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        /* Printer Icon - Neumorphism Style */
        .printer-icon {
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
            border-radius: 50%;
            background: linear-gradient(145deg, #2d3038, #22252b);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00AE42;
            border: none;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
            flex-shrink: 0;
            transition: all 0.3s ease;
        }
        .printer-icon ha-icon {
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            filter: drop-shadow(0 0 4px rgba(0, 174, 66, 0.5));
        }
        /* Offline/Unavailable/Power Off - Inset/pressed look */
        .printer-icon.offline {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            color: rgba(255, 255, 255, 0.25);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .printer-icon.offline ha-icon {
            filter: none;
        }
        /* Printing - Green with glow, slightly pressed */
        .printer-icon.printing {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            box-shadow: 
                inset 2px 2px 4px rgba(0, 0, 0, 0.4),
                inset -1px -1px 3px rgba(255, 255, 255, 0.03);
            animation: printerIconGlow 2s ease-in-out infinite;
        }
        .printer-icon.printing ha-icon {
            filter: drop-shadow(0 0 6px rgba(0, 174, 66, 0.7));
        }
        @keyframes printerIconGlow {
            0%, 100% { 
                color: #00AE42;
            }
            50% { 
                color: #2ed573;
            }
        }
        /* Paused - Yellow/Orange */
        .printer-icon.paused {
            background: linear-gradient(145deg, #2d3038, #22252b);
            color: #fbbf24;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .printer-icon.paused ha-icon {
            filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
        }
        .title {
            font-size: 1.125rem;
            font-weight: 700;
            line-height: 1;
            margin: 0;
            color: rgba(255, 255, 255, 0.9);
        }
        .status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;
        }
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${data.isPrinting ? '#22c55e' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.2)'};
            animation: ${data.isPrinting ? 'pulse 2s infinite' : 'none'};
        }
        .status-text {
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: ${data.isPrinting ? '#4ade80' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.6)'};
        }
        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        /* Header Icon Buttons - Neumorphism Style */
        .header-icon-btn {
            width: 36px;
            height: 36px;
            min-width: 36px;
            min-height: 36px;
            border-radius: 50%;
            background: linear-gradient(145deg, #2d3038, #22252b);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.35);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
            flex-shrink: 0;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .header-icon-btn:hover {
            color: rgba(255, 255, 255, 0.7);
        }
        .header-icon-btn:active {
            transform: scale(0.95);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        /* Active state - pressed in with colored icon */
        .header-icon-btn.active {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            color: #fbbf24;
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .header-icon-btn.active ha-icon {
            filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.6));
        }
        .header-icon-btn ha-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        /* AMS Grid */
        .ams-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
            z-index: 20;
        }
        /* For fewer slots, keep same slot size as 4-slot layout */
        .ams-grid.slots-1 {
            grid-template-columns: repeat(4, 1fr);
            /* Only first slot is visible, others are empty space */
        }
        .ams-grid.slots-1 .ams-slot {
            grid-column: 2 / 3; /* Center the single slot */
        }
        .ams-grid.slots-2 {
            grid-template-columns: repeat(4, 1fr);
        }
        .ams-grid.slots-2 .ams-slot:nth-child(1) {
            grid-column: 2;
        }
        .ams-grid.slots-2 .ams-slot:nth-child(2) {
            grid-column: 3;
        }
        .ams-grid.slots-3 {
            grid-template-columns: repeat(4, 1fr);
        }
        .ams-grid.slots-3 .ams-slot:nth-child(1) {
            grid-column: 1;
        }
        .ams-grid.slots-3 .ams-slot:nth-child(2) {
            grid-column: 2;
        }
        .ams-grid.slots-3 .ams-slot:nth-child(3) {
            grid-column: 3;
        }
        .ams-grid.hidden {
            display: none;
        }
        
        /* AMS Info Pills (Temperature & Humidity) - same style as overlay-pills */
        .ams-info-bar {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 20px;
            margin-top: -8px;
        }
        .ams-info-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 999px;
            padding: 6px 12px 6px 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .ams-info-pill .ams-pill-icon {
            width: 24px;
            height: 24px;
            min-width: 24px;
            min-height: 24px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .ams-info-pill .ams-pill-icon ha-icon {
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ams-info-pill .ams-pill-content {
            display: flex;
            flex-direction: column;
            line-height: 1;
        }
        .ams-info-pill .ams-pill-value {
            font-size: 14px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.95);
        }
        .ams-info-pill .ams-pill-label {
            font-size: 9px;
            color: rgba(255, 255, 255, 0.5);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .ams-info-pill.temp .ams-pill-icon ha-icon {
            color: #fb923c;
        }
        .ams-info-pill.humidity .ams-pill-icon ha-icon {
            color: #60a5fa;
        }
        
        .ams-slot {
            position: relative;
            aspect-ratio: 3/4;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            background-color: rgba(20, 20, 20, 0.8);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(0, 0, 0, 0.2);
            opacity: 0.6;
            filter: grayscale(0.3);
            transition: all 0.2s;
        }
        .ams-slot.active {
            background-color: #1A1A1A;
            border-bottom: 2px solid #00AE42;
            border-top: none;
            box-shadow: 0 0 15px rgba(0, 174, 66, 0.1);
            opacity: 1;
            filter: none;
            transform: scale(1.02);
            z-index: 10;
        }
        .spool-visual {
            position: relative;
            width: 100%;
            aspect-ratio: 1;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(0, 0, 0, 0.4);
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }
        .filament {
            width: 70%;
            height: 70%;
            border-radius: 50%;
            position: relative;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }
        .spool-center {
            position: absolute;
            width: 20%;
            height: 20%;
            border-radius: 50%;
            background-color: #2a2a2a;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 2px 5px rgba(0,0,0,0.5);
            z-index: 5;
        }
        .remaining-badge {
            position: absolute;
            bottom: -4px;
            background-color: rgba(0, 0, 0, 0.8);
            font-size: 9px;
            font-family: monospace;
            color: white;
            padding: 2px 6px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 10;
        }
        .ams-info {
            text-align: center;
            width: 100%;
        }
        .ams-type {
            font-size: 10px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.9);
        }
        .ams-slot.clickable {
            cursor: pointer;
        }
        .ams-slot.clickable:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }
        
        /* Filament Popup */
        .filament-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .filament-popup {
            background: linear-gradient(145deg, #1a1a1a, #252525);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            width: 90%;
            max-width: 320px;
            overflow: hidden;
            animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .filament-popup-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            background: rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .filament-popup-color {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .filament-popup-title {
            flex: 1;
            font-size: 16px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
        }
        .filament-popup-close {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.6);
            transition: all 0.2s;
        }
        .filament-popup-close:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }
        .filament-popup-content {
            padding: 16px 20px;
        }
        .filament-popup-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .filament-popup-row:last-child {
            border-bottom: none;
        }
        .filament-popup-label {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.5);
        }
        .filament-popup-value {
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            text-align: right;
            max-width: 60%;
            word-break: break-word;
        }
        
        /* Main Visual */
        .main-visual {
            position: relative;
            flex: 1;
            border-radius: 24px;
            background-color: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
            overflow: visible;
            margin-bottom: 24px;
            min-height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .main-visual-inner {
            position: relative;
            width: 100%;
            height: 100%;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Power Button - Neumorphism Style */
        .power-btn-container {
            position: absolute;
            top: -16px;
            right: -16px;
            z-index: 50;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .power-corner-btn {
            position: relative;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
            /* Outer ring - neumorphic inset */
            background: linear-gradient(145deg, #2a2d35, #1e2027);
            box-shadow: 
                /* Outer shadows for depth */
                5px 5px 10px rgba(0, 0, 0, 0.5),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                /* Inner ring shadow */
                inset 0 0 0 3px rgba(30, 32, 38, 1),
                inset 2px 2px 4px rgba(0, 0, 0, 0.3),
                inset -1px -1px 3px rgba(255, 255, 255, 0.02);
        }
        /* Inner circle - default (OFF) state: raised/normal */
        .power-corner-btn::before {
            content: '';
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(145deg, #2d3038, #22252b);
            box-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.4),
                -1px -1px 3px rgba(255, 255, 255, 0.05),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
            transition: all 0.2s ease;
        }
        /* ON state - inner circle pressed/inset */
        .power-corner-btn.on::before {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.6),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .power-corner-btn .power-icon {
            position: relative;
            z-index: 2;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .power-corner-btn .power-icon ha-icon {
            --mdc-icon-size: 20px;
            width: 20px;
            height: 20px;
        }
        /* Off state - icon is dim, button raised */
        .power-corner-btn.off .power-icon {
            color: rgba(255, 255, 255, 0.25);
        }
        /* On state - green icon with glow, button pressed */
        .power-corner-btn.on .power-icon {
            color: #4ade80;
            filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.6));
        }
        /* Hover states */
        .power-corner-btn.on:hover .power-icon {
            color: #f87171;
            filter: drop-shadow(0 0 8px rgba(248, 113, 113, 0.7));
        }
        .power-corner-btn.off:hover .power-icon {
            color: #4ade80;
            filter: drop-shadow(0 0 8px rgba(74, 222, 128, 0.7));
        }
        /* Click/tap feedback - extra press effect */
        .power-corner-btn:active {
            transform: scale(0.97);
        }
        .power-corner-btn:active::before {
            box-shadow: 
                inset 4px 4px 8px rgba(0, 0, 0, 0.7),
                inset -2px -2px 4px rgba(255, 255, 255, 0.02);
        }
        /* Responsive: smaller on tablets */
        @media (max-width: 768px) {
            .power-btn-container {
                top: -14px;
                right: -14px;
            }
            .power-corner-btn {
                width: 38px;
                height: 38px;
            }
            .power-corner-btn::before {
                width: 28px;
                height: 28px;
            }
            .power-corner-btn .power-icon {
                width: 16px;
                height: 16px;
            }
            .power-corner-btn .power-icon ha-icon {
                --mdc-icon-size: 16px;
                width: 16px;
                height: 16px;
            }
        }
        /* Even smaller on phones */
        @media (max-width: 480px) {
            .power-btn-container {
                top: -12px;
                right: -12px;
            }
            .power-corner-btn {
                width: 34px;
                height: 34px;
            }
            .power-corner-btn::before {
                width: 24px;
                height: 24px;
            }
            .power-corner-btn .power-icon {
                width: 14px;
                height: 14px;
            }
            .power-corner-btn .power-icon ha-icon {
                --mdc-icon-size: 14px;
                width: 14px;
                height: 14px;
            }
        }
        .view-toggle {
            position: absolute;
            top: 16px;
            right: 16px;
            z-index: 40;
            width: 32px;
            height: 32px;
            min-width: 32px;
            min-height: 32px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
            transition: background 0.2s;
            flex-shrink: 0;
        }
        .view-toggle ha-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .view-toggle:hover {
            background-color: rgba(0, 0, 0, 0.8);
        }
        .printer-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 0 30px rgba(59,130,246,0.15)) brightness(1.05);
            z-index: 10;
            padding: 16px;
            box-sizing: border-box;
            transition: filter 0.3s ease;
        }
        .printer-img.dimmed {
            filter: drop-shadow(0 0 10px rgba(0,0,0,0.3)) brightness(0.4);
        }
        .printer-fallback-icon {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,255,255,0.2);
        }
        .printer-fallback-icon ha-icon {
            width: 80px;
            height: 80px;
        }
        .camera-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            border-radius: 12px;
        }
        .camera-feed {
            width: 100%;
            height: 100%;
            object-fit: cover;
            cursor: pointer;
            transition: opacity 0.2s;
            --video-max-height: 100%;
        }
        .camera-feed video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .camera-container ha-camera-stream {
            width: 100%;
            height: 100%;
        }
        .camera-feed:hover {
            opacity: 0.9;
        }
        .camera-snapshot {
            object-fit: cover;
            background: rgba(0,0,0,0.5);
        }
        
        /* Cover Image (3D Model Preview) - positioned on print bed */
        .cover-image-container {
            position: absolute;
            /* Position on the print bed area - adjust based on printer image */
            bottom: 29%;
            left: 50%;
            transform: translateX(-50%);
            width: 38%;
            max-width: 150px;
            z-index: 15;
            pointer-events: none;
        }
        .cover-image-wrapper {
            position: relative;
            width: 100%;
            padding-bottom: 100%; /* Square aspect ratio */
            border-radius: 8px;
            overflow: visible;
            background: transparent;
        }
        .cover-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            /* Subtle shadow to make it "sit" on the bed */
            filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) 
                    drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))
                    brightness(1.0) contrast(1.1);
            transition: filter 0.3s ease, transform 0.3s ease;
        }
        /* Reflection/shadow on the bed */
        .cover-image-wrapper::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 10%;
            right: 10%;
            height: 8px;
            background: radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%);
            border-radius: 50%;
            filter: blur(4px);
        }
        /* Progress overlay - fills from bottom to top with green tint */
        .cover-image-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: var(--progress-height, 0%);
            background: linear-gradient(
                to top,
                rgba(74, 222, 128, 0.6) 0%,
                rgba(34, 197, 94, 0.4) 40%,
                rgba(34, 197, 94, 0.15) 100%
            );
            mix-blend-mode: hard-light;
            pointer-events: none;
            transition: height 0.5s ease-out;
            border-radius: 4px;
        }
        /* Glow effect when printing - affects the image directly */
        .cover-image-wrapper.printing .cover-image {
            filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) 
                    drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))
                    drop-shadow(0 0 20px rgba(74, 222, 128, 0.4))
                    brightness(1.1) contrast(1.1);
            animation: modelGlow 2s ease-in-out infinite;
        }
        @keyframes modelGlow {
            0%, 100% { 
                filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) 
                        drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))
                        drop-shadow(0 0 15px rgba(74, 222, 128, 0.3))
                        brightness(1.05) contrast(1.1);
            }
            50% { 
                filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) 
                        drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))
                        drop-shadow(0 0 30px rgba(74, 222, 128, 0.5))
                        brightness(1.15) contrast(1.1);
            }
        }
        /* Idle state - dim and grayscale */
        .cover-image-wrapper.idle .cover-image {
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) 
                    brightness(0.5) contrast(0.9) grayscale(0.6);
        }
        .cover-image-wrapper.idle::after {
            opacity: 0.3;
        }
        /* Paused state - yellow tint */
        .cover-image-wrapper.paused .cover-image-progress {
            background: linear-gradient(
                to top,
                rgba(251, 191, 36, 0.6) 0%,
                rgba(245, 158, 11, 0.4) 40%,
                rgba(245, 158, 11, 0.15) 100%
            );
        }
        .cover-image-wrapper.paused .cover-image {
            filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) 
                    drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))
                    drop-shadow(0 0 15px rgba(251, 191, 36, 0.4))
                    brightness(1.0) contrast(1.1);
        }
        /* Progress percentage badge - positioned below model */
        .cover-progress-badge {
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.85), rgba(20, 20, 20, 0.9));
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 700;
            font-family: monospace;
            color: #4ade80;
            border: 1px solid rgba(74, 222, 128, 0.4);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
            z-index: 20;
            backdrop-filter: blur(4px);
        }
        .cover-image-wrapper.paused .cover-progress-badge {
            color: #fbbf24;
            border-color: rgba(251, 191, 36, 0.4);
        }
        .cover-image-wrapper.idle .cover-progress-badge {
            color: rgba(255, 255, 255, 0.4);
            border-color: rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.6);
        }
        
        /* Overlays */
        .overlay-left {
            position: absolute;
            left: 12px;
            top: 12px;
            bottom: 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 8px;
            z-index: 20;
        }
        .overlay-right {
            position: absolute;
            right: 12px;
            top: 12px;
            bottom: 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 8px;
            z-index: 20;
        }
        .overlay-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 999px;
            padding: 6px 12px 6px 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .overlay-pill.right {
            flex-direction: row-reverse;
            padding: 6px 8px 6px 12px;
            text-align: right;
        }
        .pill-icon-container {
            width: 24px;
            height: 24px;
            min-width: 24px;
            min-height: 24px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .pill-icon-container ha-icon {
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .pill-content {
            display: flex;
            flex-direction: column;
            line-height: 1;
        }
        .pill-value {
            font-size: 12px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.9);
        }
        .pill-label {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.4);
        }
        
        /* Bottom */
        .stats-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 8px;
            margin-bottom: 8px;
        }
        .stat-group {
            display: flex;
            flex-direction: column;
        }
        .stat-label {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.4);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 700;
        }
        .stat-val {
            font-size: 1.25rem;
            font-family: monospace;
            color: white;
            font-weight: 700;
        }
        
        .progress-bar-container {
            width: 100%;
            height: 16px;
            background-color: rgba(0, 0, 0, 0.4);
            border-radius: 999px;
            overflow: hidden;
            position: relative;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
            border: 1px solid rgba(255, 255, 255, 0.05);
            margin-bottom: 16px;
        }
        .progress-bar-fill {
            height: 100%;
            width: ${data.progress}%;
            background: linear-gradient(to right, #00AE42, #4ade80);
            position: relative;
            transition: width 0.3s ease;
        }
        .progress-text {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            pointer-events: none;
        }
        
        .controls {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }
        /* Buttons - Neumorphism Style */
        .btn {
            height: 48px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
            font-weight: 700;
            font-size: 14px;
            background: linear-gradient(145deg, #2d3038, #22252b);
            color: rgba(255, 255, 255, 0.5);
            box-shadow: 
                4px 4px 8px rgba(0, 0, 0, 0.4),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .btn ha-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .btn:hover:not(:disabled) {
            color: rgba(255, 255, 255, 0.8);
        }
        .btn:active:not(:disabled) {
            transform: scale(0.97);
            background: linear-gradient(145deg, #22252b, #2d3038);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        /* Secondary buttons (Home, Stop) */
        .btn-secondary {
            color: rgba(255, 255, 255, 0.5);
        }
        .btn-secondary:hover:not(:disabled) {
            color: rgba(255, 255, 255, 0.8);
        }
        /* Stop button - red on hover */
        .btn-stop:hover:not(:disabled) {
            color: #f87171;
        }
        .btn-stop:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.5));
        }
        /* Home button - green on hover (Bambu green) */
        .btn-home:hover:not(:disabled) {
            color: #00AE42;
        }
        .btn-home:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 4px rgba(0, 174, 66, 0.5));
        }
        /* Primary button (Pause/Resume) - always slightly pressed */
        .btn-primary {
            grid-column: span 2;
            background: linear-gradient(145deg, #1c1e24, #25282e);
            color: #00AE42;
            gap: 8px;
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .btn-primary ha-icon {
            filter: drop-shadow(0 0 4px rgba(0, 174, 66, 0.5));
        }
        .btn-primary:hover:not(:disabled) {
            color: #2ed573;
        }
        .btn-primary:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 6px rgba(0, 174, 66, 0.7));
        }
        .btn-primary:active:not(:disabled) {
            transform: scale(0.97);
            box-shadow: 
                inset 4px 4px 8px rgba(0, 0, 0, 0.6),
                inset -2px -2px 4px rgba(255, 255, 255, 0.02);
        }
        .btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
      </style>
      
      <div class="card">
        <div class="noise"></div>
        
        <div class="header">
            <div class="header-left">
                <div class="printer-icon ${(['offline', 'unavailable'].includes(data.stateStr.toLowerCase()) || (data.powerSwitch && !data.isPowerOn)) ? 'offline' : data.isPrinting ? 'printing' : data.isPaused ? 'paused' : ''}">
                    <ha-icon icon="mdi:printer-3d-nozzle"></ha-icon>
                </div>
                <div>
                    <h2 class="title">${data.name}</h2>
                    <div class="status-row">
                        <div class="status-dot"></div>
                        <span class="status-text">${data.stateStr}</span>
                    </div>
                </div>
            </div>
            <div class="header-right">
                ${data.chamberLightEntity ? `
                <button class="header-icon-btn btn-light ${data.isLightOn ? 'active' : ''}" title="Chamber Light">
                    <ha-icon icon="mdi:lightbulb${data.isLightOn ? '' : '-outline'}"></ha-icon>
                </button>
                ` : ''}
                ${data.cameraEntity ? `
                <button class="header-icon-btn btn-camera ${this.showCamera ? 'active' : ''}" title="Toggle Camera">
                    <ha-icon icon="mdi:camera${this.showCamera ? '' : '-outline'}"></ha-icon>
                </button>
                ` : ''}
            </div>
        </div>

        ${data.amsData.length > 0 ? `
        <div class="ams-grid ${data.amsData.length <= 3 ? 'slots-' + data.amsData.length : ''}">
            ${data.amsData.map(slot => `
                <div class="ams-slot ${slot.active ? 'active' : ''} ${!slot.empty ? 'clickable' : ''}"
                     ${!slot.empty ? `data-slot-id="${slot.id}"
                     data-full-name="${(slot.fullName || '').replace(/"/g, '&quot;')}"
                     data-type="${slot.type}"
                     data-color="${slot.color}"
                     data-remaining="${slot.remaining}"
                     data-brand="${(slot.brand || '').replace(/"/g, '&quot;')}"
                     data-temp-min="${slot.nozzleTempMin || ''}"
                     data-temp-max="${slot.nozzleTempMax || ''}"
                     data-entity-id="${slot.entityId || ''}"` : ''}>
                    <div class="spool-visual">
                        ${!slot.empty ? `
                            <div class="filament" style="background-color: ${slot.color}"></div>
                            <div class="remaining-badge">${slot.remaining < 0 ? '?' : slot.remaining + '%'}</div>
                        ` : ''}
                        <div class="spool-center"></div>
                    </div>
                    <div class="ams-info">
                        <div class="ams-type">${slot.empty ? 'Empty' : slot.type}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${data.showAmsInfo && (data.amsTemperature !== null || data.amsHumidity !== null) ? `
        <div class="ams-info-bar">
            ${data.amsTemperature !== null ? `
            <div class="ams-info-pill temp" data-pill="ams-temp">
                <div class="ams-pill-icon"><ha-icon icon="mdi:thermometer"></ha-icon></div>
                <div class="ams-pill-content">
                    <span class="ams-pill-value">${Math.round(data.amsTemperature)}°C</span>
                    <span class="ams-pill-label">AMS</span>
                </div>
            </div>
            ` : ''}
            ${data.amsHumidity !== null ? `
            <div class="ams-info-pill humidity" data-pill="ams-humidity">
                <div class="ams-pill-icon"><ha-icon icon="mdi:water-percent"></ha-icon></div>
                <div class="ams-pill-content">
                    <span class="ams-pill-value">${Math.round(data.amsHumidity)}%</span>
                    <span class="ams-pill-label">AMS</span>
                </div>
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        <!-- Filament Info Popup -->
        <div class="filament-popup-overlay" style="display: none;">
            <div class="filament-popup">
                <div class="filament-popup-header">
                    <div class="filament-popup-color"></div>
                    <div class="filament-popup-title">Filament Details</div>
                    <button class="filament-popup-close"><ha-icon icon="mdi:close"></ha-icon></button>
                </div>
                <div class="filament-popup-content">
                    <div class="filament-popup-row">
                        <span class="filament-popup-label">Slot</span>
                        <span class="filament-popup-value" data-field="slot"></span>
                    </div>
                    <div class="filament-popup-row">
                        <span class="filament-popup-label">Name</span>
                        <span class="filament-popup-value" data-field="name"></span>
                    </div>
                    <div class="filament-popup-row">
                        <span class="filament-popup-label">Type</span>
                        <span class="filament-popup-value" data-field="type"></span>
                    </div>
                    <div class="filament-popup-row" data-field-row="brand">
                        <span class="filament-popup-label">Brand</span>
                        <span class="filament-popup-value" data-field="brand"></span>
                    </div>
                    <div class="filament-popup-row">
                        <span class="filament-popup-label">Remaining</span>
                        <span class="filament-popup-value" data-field="remaining"></span>
                    </div>
                    <div class="filament-popup-row" data-field-row="temp">
                        <span class="filament-popup-label">Nozzle Temp</span>
                        <span class="filament-popup-value" data-field="temp"></span>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="main-visual ${!data.isLightOn ? 'light-off' : ''}">
            ${data.powerSwitch ? `
            <div class="power-btn-container">
                <button class="power-corner-btn btn-power ${data.isPowerOn ? 'on' : 'off'}" title="Power ${data.isPowerOn ? 'Off' : 'On'}">
                    <span class="power-icon"><ha-icon icon="${data.powerSwitchIcon}"></ha-icon></span>
                </button>
            </div>
            ` : ''}
            <div class="main-visual-inner">
            ${data.cameraEntity && this.showCamera ? `
                <div class="camera-container" data-entity="${data.cameraEntity}"></div>
            ` : `
                <img src="${data.printerImg}" class="printer-img ${!data.isLightOn ? 'dimmed' : ''}" />
                <div class="printer-fallback-icon" style="display: none;">
                  <ha-icon icon="mdi:printer-3d"></ha-icon>
                </div>
                
                ${data.showCoverImage ? `
                <div class="cover-image-container">
                    <div class="cover-image-wrapper ${data.isPrinting ? 'printing' : ''} ${data.isPaused ? 'paused' : ''} ${data.isIdle ? 'idle' : ''}">
                        <img src="${data.coverImageUrl}" class="cover-image" alt="3D Model" />
                        <div class="cover-image-progress" style="--progress-height: ${data.progress}%;"></div>
                        <div class="cover-progress-badge">${Math.round(data.progress)}%</div>
                    </div>
                </div>
                ` : ''}
                
                <div class="overlay-left">
                    ${data.showPartFan ? `
                    <div class="overlay-pill" data-pill="part-fan">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.partFanSpeed}%</span>
                            <span class="pill-label">Part</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showAuxFan ? `
                    <div class="overlay-pill" data-pill="aux-fan">
                        <div class="pill-icon-container"><ha-icon icon="mdi:weather-windy"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.auxFanSpeed}%</span>
                            <span class="pill-label">Aux</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showChamberFan && data.chamberFanSpeed !== null && data.chamberFanSpeed !== undefined ? `
                    <div class="overlay-pill" data-pill="chamber-fan">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan-chevron-up" style="color: #22d3ee;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.chamberFanSpeed}%</span>
                            <span class="pill-label">Chamber</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showHeatbreakFan && data.heatbreakFanSpeed !== null && data.heatbreakFanSpeed !== undefined ? `
                    <div class="overlay-pill" data-pill="heatbreak-fan">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan-alert" style="color: #f472b6;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.heatbreakFanSpeed}%</span>
                            <span class="pill-label">Heatbrk</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showHumidity && data.humidity !== null ? `
                    <div class="overlay-pill" data-pill="humidity">
                        <div class="pill-icon-container"><ha-icon icon="mdi:water-percent" style="color: #60a5fa;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${Math.round(data.humidity)}%</span>
                            <span class="pill-label">${data.humidityName}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showCustomFan && data.customFanSpeed !== null ? `
                    <div class="overlay-pill" data-pill="custom-fan">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan-auto" style="color: #fbbf24;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${Math.round(data.customFanSpeed)}%</span>
                            <span class="pill-label">${data.customFanName}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="overlay-right">
                    ${data.showNozzleTemp ? `
                    <div class="overlay-pill right" data-pill="nozzle-temp">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer" style="color: #F87171;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.nozzleTemp}°</span>
                            <span class="pill-label">/${data.targetNozzleTemp}°</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showBedTemp ? `
                    <div class="overlay-pill right" data-pill="bed-temp">
                        <div class="pill-icon-container"><ha-icon icon="mdi:radiator" style="color: #FB923C;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.bedTemp}°</span>
                            <span class="pill-label">/${data.targetBedTemp}°</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showChamberTemp ? `
                    <div class="overlay-pill right" data-pill="chamber-temp">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer" style="color: #4ade80;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.chamberTemp}°</span>
                            <span class="pill-label">Cham</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showCustomTemp && data.customTemp !== null ? `
                    <div class="overlay-pill right" data-pill="custom-temp">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer-lines" style="color: #a78bfa;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${Math.round(data.customTemp)}°</span>
                            <span class="pill-label">${data.customTempName}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `}
            </div>
        </div>

        <div class="stats-row">
            <div class="stat-group">
                <span class="stat-label">Time Left</span>
                <span class="stat-val">${data.printTimeLeft}</span>
            </div>
            <div class="stat-group" style="align-items: flex-end;">
                <span class="stat-label">Layer</span>
                <span class="stat-val">${data.isIdle ? '--' : data.currentLayer} <span style="font-size: 0.875rem; opacity: 0.4;">/ ${data.isIdle ? '--' : data.totalLayers}</span></span>
            </div>
        </div>

        <div class="progress-bar-container">
            <div class="progress-bar-fill"></div>
            <div class="progress-text">${data.progress}%</div>
        </div>

        <div class="controls">
            <button class="btn btn-secondary btn-speed" ${data.isIdle ? 'disabled' : ''}>
                <ha-icon icon="mdi:speedometer"></ha-icon>
            </button>
            <button class="btn btn-secondary btn-stop" ${data.isIdle ? 'disabled' : ''}>
                <ha-icon icon="mdi:stop"></ha-icon>
            </button>
            <button class="btn btn-primary btn-pause" ${data.isIdle ? 'disabled' : ''}>
                <ha-icon icon="${data.isPaused ? 'mdi:play' : 'mdi:pause'}"></ha-icon>
                ${data.isPaused ? 'Resume Print' : data.isPrinting ? 'Pause Print' : 'Control'}
            </button>
        </div>

      </div>
    `;

    this.setupListeners();
  }

  getCardSize() {
    return 8;
  }
}

customElements.define('prism-bambu', PrismBambuCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'prism-bambu',
  name: 'Prism Bambu',
  preview: true,
  description: 'Bambu Lab 3D Printer card with AMS support'
});


})();

// ============================================
// prism-creality.js
// ============================================
(function() {
// Creality Manufacturer and Models for device filtering
// Based on Creality-Control integration (https://github.com/SiloCityLabs/Creality-Control)
const CREALITY_MANUFACTURER = 'Creality';
const CREALITY_PRINTER_MODELS = [
  // K-Series (FDM)
  'K1', 'K1C', 'K1 Max', 'K1 SE', 'K1SE', 'K1 MAX',
  'K2 Plus', 'K2 Pro', 'K2_PLUS', 'K2_PRO',
  // Halot Series (Resin)
  'Halot', 'Halot One', 'Halot Max', 'Halot Sky',
  // Generic
  'Creality Printer', 'Creality'
];

// Entity keys to look for (based on Creality-Control sensor.py)
const ENTITY_KEYS = [
  // Print Status
  'state', 'deviceState', 'printProgress', 'layer', 'TotalLayer', 
  'printLeftTime', 'printJobTime', 'printFileName', 'printId',
  // Temperatures
  'nozzleTemp', 'targetNozzleTemp', 'bedTemp0', 'targetBedTemp0', 'boxTemp',
  // Fans
  'fan', 'fanAuxiliary', 'fanCase', 'auxiliaryFanPct', 'caseFanPct', 'modelFanPct',
  // Position & Speed
  'curPosition', 'realTimeSpeed', 'realTimeFlow', 'curFeedratePct', 'curFlowratePct',
  // Material
  'usedMaterialLength', 'materialDetect', 'materialStatus',
  // System
  'model', 'hostname', 'modelVersion', 'connect', 'tfCard', 'video',
  // Light
  'lightSw',
  // AI Features
  'aiDetection', 'aiFirstFloor', 'aiPausePrint', 'aiSw',
  // Error
  'err', 'powerLoss'
];

class PrismCrealityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.showCamera = false;
    this.hasRendered = false;
    this._deviceEntities = {}; // Cache for device entities
    this._lastStatus = null; // Track status for re-render decisions
  }

  static getStubConfig() {
    return {
      printer: '',
      name: 'Creality Printer',
      camera_entity: '',
      image: '/local/community/Prism-Dashboard/images/printer-blank.jpg'
    };
  }

  static getConfigForm() {
    // Build filter for printer device selector
    const printerFilterCombinations = CREALITY_PRINTER_MODELS.map(model => ({
      manufacturer: CREALITY_MANUFACTURER,
      model: model
    }));

    return {
      schema: [
        {
          name: 'printer',
          label: 'Creality Printer (select your printer device)',
          required: true,
          selector: { device: { filter: printerFilterCombinations } }
        },
        {
          name: 'name',
          label: 'Printer name (optional)',
          selector: { text: {} }
        },
        {
          name: 'camera_entity',
          label: 'Camera entity (e.g. camera.creality_k1_se_camera)',
          selector: { entity: { domain: 'camera' } }
        },
        {
          name: 'light_switch',
          label: 'Light switch entity (e.g. switch.creality_light)',
          selector: { entity: { domain: ['light', 'switch'] } }
        },
        {
          name: 'image',
          label: 'Printer image path (optional, supports .png, .jpg, .webp)',
          selector: { text: {} }
        },
        {
          name: 'custom_humidity',
          label: 'Custom humidity sensor (optional)',
          selector: { entity: { domain: 'sensor', device_class: 'humidity' } }
        },
        {
          name: 'custom_temperature',
          label: 'Custom temperature sensor (optional)',
          selector: { entity: { domain: 'sensor', device_class: 'temperature' } }
        },
        {
          name: 'power_switch',
          label: 'Power switch (optional)',
          selector: { entity: { domain: 'switch' } }
        },
        {
          name: 'power_switch_icon',
          label: 'Power switch icon (default: mdi:power)',
          selector: { icon: {} }
        },
        // Multi-Printer View section
        {
          type: 'expandable',
          name: '',
          title: 'Multi-Printer Camera View',
          schema: [
            {
              name: 'multi_printer_enabled',
              label: 'Enable Multi-Printer View (show multiple printers in camera popup)',
              selector: { boolean: {} }
            },
            {
              name: 'multi_printer_2',
              label: 'Printer 2 (optional)',
              selector: { device: { filter: printerFilterCombinations } }
            },
            {
              name: 'multi_camera_2',
              label: 'Printer 2 Camera (auto-detected if not set)',
              selector: { entity: { domain: 'camera' } }
            },
            {
              name: 'multi_name_2',
              label: 'Printer 2 Name (optional)',
              selector: { text: {} }
            },
            {
              name: 'multi_printer_3',
              label: 'Printer 3 (optional)',
              selector: { device: { filter: printerFilterCombinations } }
            },
            {
              name: 'multi_camera_3',
              label: 'Printer 3 Camera (auto-detected if not set)',
              selector: { entity: { domain: 'camera' } }
            },
            {
              name: 'multi_name_3',
              label: 'Printer 3 Name (optional)',
              selector: { text: {} }
            },
            {
              name: 'multi_printer_4',
              label: 'Printer 4 (optional)',
              selector: { device: { filter: printerFilterCombinations } }
            },
            {
              name: 'multi_camera_4',
              label: 'Printer 4 Camera (auto-detected if not set)',
              selector: { entity: { domain: 'camera' } }
            },
            {
              name: 'multi_name_4',
              label: 'Printer 4 Name (optional)',
              selector: { text: {} }
            }
          ]
        }
      ]
    };
  }

  // Find all entities belonging to this device
  getCrealityDeviceEntities() {
    if (!this._hass || !this.config?.printer) return {};
    
    const deviceId = this.config.printer;
    const result = {};
    
    // Loop through all hass entities and find those belonging to our device
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      
      if (entityInfo.device_id === deviceId) {
        // Check if this entity matches one of our known keys or is from creality_control
        if (entityInfo.platform === 'creality_control') {
          const translationKey = entityInfo.translation_key;
          if (translationKey && ENTITY_KEYS.includes(translationKey)) {
            result[translationKey] = {
              entity_id: entityId,
              ...entityInfo
            };
          }
          // Also store by simple name for easier access
          result[entityId] = entityInfo;
        }
      }
    }
    
    return result;
  }

  // Get entity by name pattern (searches entity_id)
  // First tries device-bound entities, then falls back to platform-based search
  findEntityByPattern(pattern, domain = null) {
    if (!this._hass) return null;
    
    const deviceId = this.config?.printer;
    
    // First pass: Look for entities bound to our device
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      if (entityInfo.device_id === deviceId && entityId.toLowerCase().includes(pattern.toLowerCase())) {
        if (domain) {
          const entityDomain = entityId.split('.')[0];
          if (entityDomain === domain) {
            return entityId;
          }
        } else {
          return entityId;
        }
      }
    }
    
    // Second pass: Look for creality_control platform entities (they may not be bound to device)
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      // Check if it's from creality_control platform and matches pattern
      if (entityInfo.platform === 'creality_control' && entityId.toLowerCase().includes(pattern.toLowerCase())) {
        if (domain) {
          const entityDomain = entityId.split('.')[0];
          if (entityDomain === domain) {
            return entityId;
          }
        } else {
          return entityId;
        }
      }
    }
    
    // Third pass: Look for any entity with "creality" in name and matching pattern
    for (const entityId in this._hass.entities) {
      if (entityId.toLowerCase().includes('creality') && entityId.toLowerCase().includes(pattern.toLowerCase())) {
        if (domain) {
          const entityDomain = entityId.split('.')[0];
          if (entityDomain === domain) {
            return entityId;
          }
        } else {
          return entityId;
        }
      }
    }
    
    return null;
  }

  // Find entity by pattern with specific domain preference (tries domain first, then falls back)
  findEntityByPatternPreferDomain(pattern, preferredDomain) {
    // First try with the preferred domain
    const withDomain = this.findEntityByPattern(pattern, preferredDomain);
    if (withDomain) return withDomain;
    
    // Fall back to any matching entity
    return this.findEntityByPattern(pattern);
  }

  // Get entity state by entity_id
  getEntityStateById(entityId) {
    if (!entityId || !this._hass) return null;
    const state = this._hass.states[entityId];
    return state?.state ?? null;
  }

  // Get entity numeric value by entity_id
  getEntityValueById(entityId) {
    const state = this.getEntityStateById(entityId);
    return state ? parseFloat(state) || 0 : 0;
  }

  // Get entity state by translation key
  getEntityState(key) {
    const entityInfo = this._deviceEntities[key];
    if (!entityInfo?.entity_id) return null;
    const state = this._hass.states[entityInfo.entity_id];
    return state?.state ?? null;
  }

  // Get entity numeric value
  getEntityValue(key) {
    const state = this.getEntityState(key);
    return state ? parseFloat(state) || 0 : 0;
  }

  // Get device entities for any printer (by device ID) - for multi-printer view
  getDeviceEntitiesForPrinter(deviceId) {
    if (!this._hass || !deviceId) return {};
    
    const result = {};
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      
      if (entityInfo.device_id === deviceId) {
        if (entityInfo.platform === 'creality_control') {
          const translationKey = entityInfo.translation_key;
          if (translationKey && ENTITY_KEYS.includes(translationKey)) {
            result[translationKey] = {
              entity_id: entityId,
              ...entityInfo
            };
          }
          result[entityId] = entityInfo;
        }
      }
    }
    return result;
  }

  // Get entity state for a specific device's entities
  getEntityStateForDevice(deviceEntities, key) {
    const entityInfo = deviceEntities[key];
    if (!entityInfo?.entity_id) return null;
    const state = this._hass.states[entityInfo.entity_id];
    return state?.state ?? null;
  }

  // Get entity value for a specific device
  getEntityValueForDevice(deviceEntities, key) {
    const state = this.getEntityStateForDevice(deviceEntities, key);
    return state ? parseFloat(state) || 0 : 0;
  }

  // Find entity by pattern for a specific device
  findEntityByPatternForDevice(deviceId, pattern, domain = null) {
    if (!this._hass || !deviceId) return null;
    
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      if (entityInfo.device_id === deviceId && entityId.toLowerCase().includes(pattern.toLowerCase())) {
        if (domain) {
          const entityDomain = entityId.split('.')[0];
          if (entityDomain === domain) return entityId;
        } else {
          return entityId;
        }
      }
    }
    return null;
  }

  // Get printer data for any device (by device ID) - for multi-printer view
  getPrinterDataForDevice(deviceId, customCameraEntity, customName) {
    if (!this._hass || !deviceId) {
      return {
        name: customName || 'Unknown Printer',
        progress: 0,
        stateStr: 'unavailable',
        isPrinting: false,
        isPaused: false,
        isIdle: true,
        printTimeLeft: '--',
        currentLayer: 0,
        totalLayers: 0,
        nozzleTemp: 0,
        targetNozzleTemp: 0,
        bedTemp: 0,
        targetBedTemp: 0,
        chamberTemp: 0,
        cameraEntity: null
      };
    }

    const deviceEntities = this.getDeviceEntitiesForPrinter(deviceId);
    
    // Get print status - Creality uses 'deviceState', 'print_state', or 'state'
    // Priority order: devicestate > print_state > printer_state > state (most specific first)
    let stateStr = 'Idle';
    const stateEntity = this.findEntityByPatternForDevice(deviceId, 'devicestate', 'sensor') ||
                        this.findEntityByPatternForDevice(deviceId, 'print_state', 'sensor') ||
                        this.findEntityByPatternForDevice(deviceId, 'printer_state', 'sensor') ||
                        this.findEntityByPatternForDevice(deviceId, '_state', 'sensor');
    
    if (stateEntity) {
      const rawState = this._hass.states[stateEntity]?.state || 'unavailable';
      // If state is purely numeric (like "0", "1"), convert to readable status
      if (/^\d+$/.test(rawState)) {
        // Common Creality numeric states: 0 = Idle, 1 = Printing, 2 = Paused, etc.
        const numericStateMap = {
          '0': 'Idle',
          '1': 'Printing',
          '2': 'Paused',
          '3': 'Finished',
          '4': 'Stopped'
        };
        stateStr = numericStateMap[rawState] || 'Idle';
      } else {
        stateStr = rawState;
      }
    }
    
    const statusLower = stateStr.toLowerCase();
    const isPrinting = ['printing', 'prepare', 'running', 'druckt', '1'].includes(statusLower);
    const isPaused = ['paused', 'pause', 'pausiert', '2'].includes(statusLower);
    const isIdle = !isPrinting && !isPaused;

    // Progress
    let progress = 0;
    const progressEntity = this.findEntityByPatternForDevice(deviceId, 'printprogress', 'sensor') ||
                          this.findEntityByPatternForDevice(deviceId, 'progress', 'sensor');
    if (progressEntity) {
      progress = parseFloat(this._hass.states[progressEntity]?.state) || 0;
    }

    // Remaining time
    let printTimeLeft = '--';
    const timeEntity = this.findEntityByPatternForDevice(deviceId, 'printlefttime', 'sensor') ||
                       this.findEntityByPatternForDevice(deviceId, 'lefttime', 'sensor');
    if (timeEntity && (isPrinting || isPaused)) {
      const minutes = parseFloat(this._hass.states[timeEntity]?.state) || 0;
      if (minutes > 0) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        printTimeLeft = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
    }

    // Layer info
    let currentLayer = 0;
    let totalLayers = 0;
    if (isPrinting || isPaused) {
      const layerEntity = this.findEntityByPatternForDevice(deviceId, '_layer', 'sensor');
      const totalLayerEntity = this.findEntityByPatternForDevice(deviceId, 'totallayer', 'sensor');
      if (layerEntity) currentLayer = parseInt(this._hass.states[layerEntity]?.state) || 0;
      if (totalLayerEntity) totalLayers = parseInt(this._hass.states[totalLayerEntity]?.state) || 0;
    }

    // Temperatures
    let nozzleTemp = 0, targetNozzleTemp = 0, bedTemp = 0, targetBedTemp = 0, chamberTemp = 0;
    
    const nozzleTempEntity = this.findEntityByPatternForDevice(deviceId, 'nozzletemp', 'sensor');
    const targetNozzleEntity = this.findEntityByPatternForDevice(deviceId, 'targetnozzle', 'sensor');
    const bedTempEntity = this.findEntityByPatternForDevice(deviceId, 'bedtemp', 'sensor');
    const targetBedEntity = this.findEntityByPatternForDevice(deviceId, 'targetbed', 'sensor');
    const boxTempEntity = this.findEntityByPatternForDevice(deviceId, 'boxtemp', 'sensor');
    
    if (nozzleTempEntity) nozzleTemp = parseFloat(this._hass.states[nozzleTempEntity]?.state) || 0;
    if (targetNozzleEntity) targetNozzleTemp = parseFloat(this._hass.states[targetNozzleEntity]?.state) || 0;
    if (bedTempEntity) bedTemp = parseFloat(this._hass.states[bedTempEntity]?.state) || 0;
    if (targetBedEntity) targetBedTemp = parseFloat(this._hass.states[targetBedEntity]?.state) || 0;
    if (boxTempEntity) chamberTemp = parseFloat(this._hass.states[boxTempEntity]?.state) || 0;

    // Camera entity
    let cameraEntity = customCameraEntity;
    if (!cameraEntity) {
      cameraEntity = this.findEntityByPatternForDevice(deviceId, 'camera', 'camera');
    }
    if (cameraEntity && !cameraEntity.startsWith('camera.')) {
      cameraEntity = null;
    }

    // Device name
    const device = this._hass.devices?.[deviceId];
    const name = customName || device?.name || 'Creality Printer';

    return {
      deviceId,
      name,
      progress: isIdle ? 0 : progress,
      stateStr,
      isPrinting,
      isPaused,
      isIdle,
      printTimeLeft: isIdle ? '--' : printTimeLeft,
      currentLayer: isIdle ? 0 : currentLayer,
      totalLayers: isIdle ? 0 : totalLayers,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      chamberTemp,
      cameraEntity
    };
  }

  // Get all configured printers for multi-view
  getMultiPrinterConfigs() {
    const printers = [];
    
    // Primary printer (always included)
    if (this.config.printer) {
      printers.push({
        deviceId: this.config.printer,
        cameraEntity: this.config.camera_entity,
        name: this.config.name,
        index: 1
      });
    }
    
    // Additional printers (only if multi-printer is enabled)
    if (this.config.multi_printer_enabled) {
      if (this.config.multi_printer_2) {
        printers.push({
          deviceId: this.config.multi_printer_2,
          cameraEntity: this.config.multi_camera_2,
          name: this.config.multi_name_2,
          index: 2
        });
      }
      if (this.config.multi_printer_3) {
        printers.push({
          deviceId: this.config.multi_printer_3,
          cameraEntity: this.config.multi_camera_3,
          name: this.config.multi_name_3,
          index: 3
        });
      }
      if (this.config.multi_printer_4) {
        printers.push({
          deviceId: this.config.multi_printer_4,
          cameraEntity: this.config.multi_camera_4,
          name: this.config.multi_name_4,
          index: 4
        });
      }
    }
    
    return printers;
  }

  setConfig(config) {
    // Don't throw error if printer is empty - show preview instead
    this.config = { ...config };
    this._deviceEntities = {}; // Reset cache
    if (!this.hasRendered) {
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    }
  }

  set hass(hass) {
    const firstTime = hass && !this._hass;
    const oldStatus = this._lastStatus;
    this._hass = hass;
    
    // Cache device entities on first hass assignment or if empty (only if printer is configured)
    if (this.config?.printer && (firstTime || Object.keys(this._deviceEntities).length === 0)) {
      this._deviceEntities = this.getCrealityDeviceEntities();
      console.log('Prism Creality: Found device entities:', Object.keys(this._deviceEntities));
    }
    
    // Get current status to detect changes
    const data = this.getPrinterData();
    const newStatus = `${data.isIdle}-${data.isPrinting}-${data.isPaused}-${!!data.lightEntity}-${!!data.cameraEntity}-${!!data.powerSwitch}-${data.isPowerOn}`;
    
    // Re-render if: first time, status changed, or never rendered
    if (!this.hasRendered || firstTime || oldStatus !== newStatus) {
      this._lastStatus = newStatus;
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    } else {
      // Only update dynamic values
      this.updateValues();
    }
  }

  // Update only the values that change, without re-rendering the entire card
  updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    
    const data = this.getPrinterData();
    
    // Update text values
    const updateText = (selector, value) => {
      const el = this.shadowRoot.querySelector(selector);
      if (el && el.textContent !== String(value)) {
        el.textContent = value;
      }
    };
    
    // Update progress bar
    const progressBar = this.shadowRoot.querySelector('.progress-bar-fill');
    if (progressBar) {
      progressBar.style.width = `${data.progress}%`;
    }
    
    const progressText = this.shadowRoot.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = `${Math.round(data.progress)}%`;
    }
    
    // Update title
    updateText('.title', data.name);
    
    // Update status
    updateText('.status-text', data.stateStr);
    
    // Update printer icon state
    const printerIcon = this.shadowRoot.querySelector('.printer-icon');
    if (printerIcon) {
      const isOfflineOrUnavailable = ['offline', 'unavailable'].includes(data.stateStr.toLowerCase());
      const isPowerOff = data.powerSwitch && !data.isPowerOn;
      
      printerIcon.classList.remove('offline', 'printing', 'paused');
      if (isOfflineOrUnavailable || isPowerOff) {
        printerIcon.classList.add('offline');
      } else if (data.isPrinting) {
        printerIcon.classList.add('printing');
      } else if (data.isPaused) {
        printerIcon.classList.add('paused');
      }
    }
    
    // Update time left
    const statVals = this.shadowRoot.querySelectorAll('.stats-row .stat-val');
    if (statVals.length >= 1) {
      statVals[0].textContent = data.printTimeLeft;
    }
    
    // Update layer
    if (statVals.length >= 2) {
      statVals[1].innerHTML = `${data.isIdle ? '--' : data.currentLayer} <span style="font-size: 0.875rem; opacity: 0.4;">/ ${data.isIdle ? '--' : data.totalLayers}</span>`;
    }
    
    // Update temperatures and fans via pill values
    const pillValues = this.shadowRoot.querySelectorAll('.pill-value');
    if (pillValues.length >= 5) {
      pillValues[0].textContent = `${data.modelFanSpeed}%`;
      pillValues[1].textContent = `${data.auxFanSpeed}%`;
      pillValues[2].textContent = `${Math.round(data.nozzleTemp)}°`;
      pillValues[3].textContent = `${Math.round(data.bedTemp)}°`;
      pillValues[4].textContent = `${Math.round(data.chamberTemp)}°`;
    }
    
    // Update target temps
    const pillLabels = this.shadowRoot.querySelectorAll('.overlay-right .pill-label');
    if (pillLabels.length >= 2) {
      pillLabels[0].textContent = `/${Math.round(data.targetNozzleTemp)}°`;
      pillLabels[1].textContent = `/${Math.round(data.targetBedTemp)}°`;
    }
    
    // Update camera stream hass if it exists
    const cameraStream = this.shadowRoot.querySelector('ha-camera-stream');
    if (cameraStream && this._hass) {
      cameraStream.hass = this._hass;
      if (data.cameraEntity) {
        cameraStream.stateObj = this._hass.states[data.cameraEntity];
      }
    }
    
    // Update light button state from actual HA state
    if (data.lightEntity) {
      const lightBtn = this.shadowRoot.querySelector('.btn-light');
      if (lightBtn) {
        if (data.isLightOn) {
          lightBtn.classList.add('active');
        } else {
          lightBtn.classList.remove('active');
        }
      }
    }
    
    // Update power button state from actual HA state
    if (data.powerSwitch) {
      const powerBtn = this.shadowRoot.querySelector('.btn-power');
      if (powerBtn) {
        if (data.isPowerOn) {
          powerBtn.classList.remove('off');
          powerBtn.classList.add('on');
          powerBtn.title = 'Power Off';
        } else {
          powerBtn.classList.remove('on');
          powerBtn.classList.add('off');
          powerBtn.title = 'Power On';
        }
      }
    }
  }

  connectedCallback() {
    if (this.config && !this.hasRendered) {
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    }
  }

  disconnectedCallback() {
    // Cleanup camera popup
    if (this._cameraPopupEscHandler) {
      document.removeEventListener('keydown', this._cameraPopupEscHandler);
      this._cameraPopupEscHandler = null;
    }
    if (this._cameraPopupUpdateInterval) {
      clearInterval(this._cameraPopupUpdateInterval);
      this._cameraPopupUpdateInterval = null;
    }
    // Close camera popup if open
    this.closeCameraPopup();
  }

  setupListeners() {
    // Helper for touch + click support (tablets/mobile)
    const addTapListener = (element, callback) => {
      if (!element) return;
      let touchMoved = false;
      let touchStartTime = 0;
      
      element.addEventListener('touchstart', (e) => { 
        touchMoved = false; 
        touchStartTime = Date.now();
      }, { passive: true });
      
      element.addEventListener('touchmove', () => { 
        touchMoved = true; 
      }, { passive: true });
      
      element.addEventListener('touchend', (e) => {
        // Only trigger if it was a tap (not a swipe) and quick enough
        if (!touchMoved && (Date.now() - touchStartTime) < 500) {
          e.preventDefault();
          e.stopPropagation();
          callback(e);
        }
      });
      
      // Also keep click for desktop
      element.onclick = (e) => {
        e.stopPropagation();
        callback(e);
      };
    };
    
    // Use onclick to avoid duplicate event listeners when re-rendering
    const viewToggle = this.shadowRoot?.querySelector('.view-toggle');
    if (viewToggle) {
      viewToggle.onclick = () => this.toggleView();
    }

    const pauseBtn = this.shadowRoot?.querySelector('.btn-pause');
    if (pauseBtn) {
      pauseBtn.onclick = () => this.handlePause();
    }

    const stopBtn = this.shadowRoot?.querySelector('.btn-stop');
    if (stopBtn) {
      stopBtn.onclick = () => this.handleStop();
    }

    const homeBtn = this.shadowRoot?.querySelector('.btn-home');
    if (homeBtn) {
      homeBtn.onclick = () => this.handleHome();
    }
    
    // Header light button - toggle light
    const lightBtn = this.shadowRoot?.querySelector('.btn-light');
    if (lightBtn) {
      lightBtn.onclick = (e) => {
        e.stopPropagation();
        this.handleLightToggle();
      };
    }
    
    // Header camera button - toggle camera view
    const cameraBtn = this.shadowRoot?.querySelector('.btn-camera');
    if (cameraBtn) {
      cameraBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleView();
      };
    }
    
    // Camera container - create ha-camera-stream element programmatically
    const cameraContainer = this.shadowRoot?.querySelector('.camera-container');
    if (cameraContainer && this._hass) {
      const entityId = cameraContainer.dataset.entity;
      const stateObj = this._hass.states[entityId];
      
      if (stateObj) {
        // Create the camera stream element
        const cameraStream = document.createElement('ha-camera-stream');
        cameraStream.hass = this._hass;
        cameraStream.stateObj = stateObj;
        cameraStream.className = 'camera-feed';
        cameraStream.style.cursor = 'pointer';
        
        // Clear container and add stream
        cameraContainer.innerHTML = '';
        cameraContainer.appendChild(cameraStream);
        
        // Tap/Click to open popup (works on tablets too)
        addTapListener(cameraStream, () => {
          this.openCameraPopup();
        });
      }
    }
    
    // Power button click handler
    const powerBtn = this.shadowRoot?.querySelector('.btn-power');
    if (powerBtn) {
      powerBtn.onclick = (e) => {
        e.stopPropagation();
        this.handlePowerToggle();
      };
    }
  }
  
  handlePowerToggle() {
    if (!this._hass || !this.config.power_switch) return;
    const entityId = this.config.power_switch;
    
    // Call the service
    this._hass.callService('switch', 'toggle', { entity_id: entityId });
    
    // Optimistically update UI immediately
    const powerBtn = this.shadowRoot?.querySelector('.btn-power');
    const currentState = this._hass.states[entityId]?.state;
    const newState = currentState === 'on' ? 'off' : 'on';
    
    if (powerBtn) {
      if (newState === 'on') {
        powerBtn.classList.remove('off');
        powerBtn.classList.add('on');
        powerBtn.title = 'Power Off';
      } else {
        powerBtn.classList.remove('on');
        powerBtn.classList.add('off');
        powerBtn.title = 'Power On';
      }
    }
  }

  toggleView() {
    this.showCamera = !this.showCamera;
    this.render();
  }

  handlePause() {
    if (!this._hass) return;
    // Find pause/resume button entity
    const pauseBtn = this.findEntityByPattern('pause_resume') || this.findEntityByPattern('pause');
    if (pauseBtn) {
      this._hass.callService('button', 'press', { entity_id: pauseBtn });
    } else {
      // Open more-info for the print status entity
      const stateEntity = this.findEntityByPattern('print_state') || this.findEntityByPattern('state');
      if (stateEntity) {
        const event = new CustomEvent('hass-more-info', {
          bubbles: true,
          composed: true,
          detail: { entityId: stateEntity }
        });
        this.dispatchEvent(event);
      }
    }
  }

  handleStop() {
    if (!this._hass) return;
    // Find stop button entity
    const stopBtn = this.findEntityByPattern('stop_print') || this.findEntityByPattern('stop');
    if (stopBtn) {
      this._hass.callService('button', 'press', { entity_id: stopBtn });
    }
  }

  handleHome() {
    if (!this._hass) return;
    // Find home button entity
    const homeBtn = this.findEntityByPattern('home_all') || this.findEntityByPattern('home');
    if (homeBtn) {
      this._hass.callService('button', 'press', { entity_id: homeBtn });
    }
  }
  
  handleLightToggle() {
    if (!this._hass) return;
    
    // Use configured light_switch or auto-detect switch domain
    let entityId = this.config.light_switch;
    
    // Otherwise find the light switch (must be switch domain for control)
    if (!entityId) {
      entityId = this.findEntityByPattern('light', 'switch');
    }
    
    if (!entityId) {
      console.warn('Prism Creality: No light switch entity found. Please configure light_switch in card settings.');
      return;
    }
    
    // Determine domain from entity_id
    const domain = entityId.startsWith('light.') ? 'light' : 'switch';
    
    // Call the service
    this._hass.callService(domain, 'toggle', { entity_id: entityId });
    
    // Optimistically update UI immediately
    const lightBtn = this.shadowRoot?.querySelector('.btn-light');
    const currentState = this._hass.states[entityId]?.state;
    const newState = currentState === 'on' ? 'off' : 'on';
    
    if (lightBtn) {
      if (newState === 'on') {
        lightBtn.classList.add('active');
        lightBtn.innerHTML = '<ha-icon icon="mdi:lightbulb"></ha-icon>';
      } else {
        lightBtn.classList.remove('active');
        lightBtn.innerHTML = '<ha-icon icon="mdi:lightbulb-outline"></ha-icon>';
      }
    }
    
    // Also update printer image dimming
    const printerImg = this.shadowRoot?.querySelector('.printer-img');
    if (printerImg) {
      if (newState === 'on') {
        printerImg.classList.remove('dimmed');
      } else {
        printerImg.classList.add('dimmed');
      }
    }
  }
  
  openCameraPopup() {
    if (!this._hass) return;
    
    // Check if multi-printer mode is enabled
    const isMultiPrinter = this.config.multi_printer_enabled && (
      this.config.multi_printer_2 || this.config.multi_printer_3 || this.config.multi_printer_4
    );
    
    if (isMultiPrinter) {
      this.openMultiCameraPopup();
      return;
    }
    
    // Single printer mode - original behavior
    // Get camera entity (must be camera domain)
    let entityId = this.config.camera_entity;
    if (!entityId) {
      entityId = this.findEntityByPattern('camera', 'camera');
    }
    
    if (!entityId || !entityId.startsWith('camera.')) {
      console.warn('Prism Creality: No valid camera entity found. Please configure camera_entity in card settings.');
      return;
    }
    
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return;
    
    // Remove existing popup if any
    this.closeCameraPopup();
    
    // Get printer name for title
    const deviceId = this.config.printer;
    const device = this._hass.devices?.[deviceId];
    const printerName = this.config.name || device?.name || 'Creality Printer';
    
    // Get printer data for info panel
    const data = this.getPrinterData();
    
    // Create popup in document.body (outside shadow DOM for true fullscreen modal)
    const overlay = document.createElement('div');
    overlay.id = 'prism-camera-popup-overlay';
    overlay.innerHTML = `
      <style>
        #prism-camera-popup-overlay {
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
          padding: 40px;
          box-sizing: border-box;
          animation: prismCameraFadeIn 0.2s ease;
          font-family: system-ui, -apple-system, sans-serif;
        }
        @keyframes prismCameraFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .prism-camera-popup {
          position: relative;
          min-width: 500px;
          min-height: 400px;
          /* Calculate width based on 16:9 aspect ratio of video area (height minus header + footer bar ~110px) */
          width: calc((75vh - 110px) * 16 / 9);
          height: 75vh;
          max-width: 95vw;
          max-height: 90vh;
          background: transparent;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.1);
          animation: prismCameraSlideIn 0.3s ease;
          display: flex;
          flex-direction: column;
          /* resize via custom handle */
        }
        @keyframes prismCameraSlideIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .prism-camera-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: linear-gradient(180deg, rgba(30,32,36,0.95), rgba(25,27,30,0.95));
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: move;
          user-select: none;
        }
        .prism-camera-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.95);
          font-size: 14px;
          font-weight: 600;
        }
        /* Popup Title Icon - Neumorphism */
        .prism-camera-title-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0096FF;
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.4),
            -1px -1px 3px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-camera-title-icon ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.5));
        }
        /* Popup Close Button - Neumorphism */
        .prism-camera-close {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.4);
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.4),
            -1px -1px 3px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-camera-close ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .prism-camera-close:hover {
          color: #f87171;
        }
        .prism-camera-close:hover ha-icon {
          filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.6));
        }
        .prism-camera-close:active {
          background: linear-gradient(145deg, #22252b, #2d3038);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.5),
            inset -1px -1px 3px rgba(255, 255, 255, 0.03);
        }
        .prism-camera-body {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }
        .prism-camera-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #000;
          position: relative;
        }
        .prism-camera-content ha-camera-stream {
          width: 100%;
          height: 100%;
          --video-max-height: 100%;
        }
        .prism-camera-content ha-camera-stream video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .prism-camera-content .prism-camera-snapshot {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        /* Info Panel Overlay - Compact & Transparent */
        .prism-camera-info {
          position: absolute;
          right: 12px;
          top: 12px;
          width: 160px;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .prism-info-header {
          padding: 10px 12px;
          background: rgba(0,0,0,0.2);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        /* Info Header Icon - Neumorphism */
        .prism-info-header-icon {
          width: 22px;
          height: 22px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0096FF;
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.3),
            -1px -1px 2px rgba(255, 255, 255, 0.02),
            inset 1px 1px 1px rgba(255, 255, 255, 0.05);
        }
        .prism-info-header-icon ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 3px rgba(0, 150, 255, 0.5));
        }
        .prism-info-header-text {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .prism-info-content {
          flex: 1;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
        }
        
        /* Progress Section */
        .prism-info-progress {
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.04);
        }
        .prism-info-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .prism-info-progress-label {
          font-size: 8px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .prism-info-progress-value {
          font-size: 16px;
          font-weight: 700;
          color: #00C8FF;
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-info-progress-bar {
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .prism-info-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #0096FF, #00C8FF);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        
        /* Stat Items */
        .prism-info-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: rgba(0,0,0,0.15);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.03);
        }
        /* Stat Icons - Neumorphism */
        .prism-info-stat-icon {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(145deg, #2a2d33, #1f2226);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.4),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03);
        }
        .prism-info-stat-icon ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .prism-info-stat-icon.time { color: #60a5fa; }
        .prism-info-stat-icon.time ha-icon { filter: drop-shadow(0 0 3px rgba(96, 165, 250, 0.5)); }
        .prism-info-stat-icon.layer { color: #a78bfa; }
        .prism-info-stat-icon.layer ha-icon { filter: drop-shadow(0 0 3px rgba(167, 139, 250, 0.5)); }
        .prism-info-stat-icon.nozzle { color: #f87171; }
        .prism-info-stat-icon.nozzle ha-icon { filter: drop-shadow(0 0 3px rgba(248, 113, 113, 0.5)); }
        .prism-info-stat-icon.bed { color: #fb923c; }
        .prism-info-stat-icon.bed ha-icon { filter: drop-shadow(0 0 3px rgba(251, 146, 60, 0.5)); }
        .prism-info-stat-icon.chamber { color: #4ade80; }
        .prism-info-stat-icon.chamber ha-icon { filter: drop-shadow(0 0 3px rgba(74, 222, 128, 0.5)); }
        .prism-info-stat-data {
          flex: 1;
          min-width: 0;
        }
        .prism-info-stat-label {
          font-size: 8px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .prism-info-stat-value {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-info-stat-value .target {
          font-size: 9px;
          color: rgba(255,255,255,0.35);
          font-weight: 500;
        }
        
        /* Status Badge */
        .prism-info-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          background: ${data.isPrinting ? 'rgba(0, 200, 255, 0.08)' : data.isPaused ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255,255,255,0.03)'};
          border: 1px solid ${data.isPrinting ? 'rgba(0, 200, 255, 0.2)' : data.isPaused ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.06)'};
          border-radius: 8px;
          margin-top: auto;
        }
        .prism-info-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${data.isPrinting ? '#00C8FF' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.3)'};
          ${data.isPrinting ? 'animation: statusPulse 2s infinite;' : ''}
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        .prism-info-status-text {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: ${data.isPrinting ? '#00C8FF' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.4)'};
        }
        
        .prism-camera-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 16px;
          background: rgba(15,15,15,0.9);
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 10px;
          color: rgba(255,255,255,0.35);
        }
        .prism-camera-footer-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .prism-camera-entity {
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 9px;
          background: rgba(255,255,255,0.06);
          padding: 3px 8px;
          border-radius: 4px;
        }
        .prism-camera-toggle-info {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 9px;
          font-family: inherit;
        }
        .prism-camera-toggle-info:hover {
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8);
        }
        .prism-camera-toggle-info.active {
          background: rgba(0, 150, 255, 0.15);
          color: #00C8FF;
        }
        .prism-camera-toggle-info ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prism-camera-resize-hint {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-right: 30px;
        }
        .prism-camera-resize-hint ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        /* Stop Button - Neumorphism */
        .prism-info-stop-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 12px;
          margin-top: 8px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          border-radius: 8px;
          color: #f87171;
          font-size: 10px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.02),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-info-stop-btn ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 3px rgba(248, 113, 113, 0.4));
          transition: all 0.2s ease;
        }
        .prism-info-stop-btn:hover {
          color: #fca5a5;
        }
        .prism-info-stop-btn:hover ha-icon {
          filter: drop-shadow(0 0 5px rgba(248, 113, 113, 0.6));
        }
        .prism-info-stop-btn:active {
          background: linear-gradient(145deg, #22252b, #2d3038);
          box-shadow: 
            inset 3px 3px 6px rgba(0, 0, 0, 0.5),
            inset -2px -2px 4px rgba(255, 255, 255, 0.02);
        }
        .prism-camera-info.hidden {
          display: none;
        }
        /* Custom Resize Handle - larger grab area */
        .prism-camera-resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 40px;
          height: 40px;
          cursor: nwse-resize;
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 8px;
        }
        .prism-camera-resize-handle::before {
          content: '';
          width: 20px;
          height: 20px;
          background: 
            linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.12) 38%, transparent 38%),
            linear-gradient(135deg, transparent 48%, rgba(255,255,255,0.12) 48%, rgba(255,255,255,0.12) 56%, transparent 56%),
            linear-gradient(135deg, transparent 66%, rgba(255,255,255,0.18) 66%);
          border-radius: 0 0 12px 0;
          transition: all 0.2s;
        }
        .prism-camera-resize-handle:hover::before {
          background: 
            linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.2) 38%, transparent 38%),
            linear-gradient(135deg, transparent 48%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0.2) 56%, transparent 56%),
            linear-gradient(135deg, transparent 66%, rgba(255,255,255,0.3) 66%);
        }
        .prism-camera-resize-handle:active::before {
          background: 
            linear-gradient(135deg, transparent 30%, rgba(0,150,255,0.3) 30%, rgba(0,150,255,0.3) 38%, transparent 38%),
            linear-gradient(135deg, transparent 48%, rgba(0,150,255,0.3) 48%, rgba(0,150,255,0.3) 56%, transparent 56%),
            linear-gradient(135deg, transparent 66%, rgba(0,150,255,0.4) 66%);
        }
      </style>
      <div class="prism-camera-popup">
        <div class="prism-camera-header">
          <div class="prism-camera-title">
            <div class="prism-camera-title-icon">
              <ha-icon icon="mdi:camera" style="width:16px;height:16px;"></ha-icon>
            </div>
            <span>${printerName}</span>
          </div>
          <button class="prism-camera-close">
            <ha-icon icon="mdi:close" style="width:16px;height:16px;"></ha-icon>
          </button>
        </div>
        <div class="prism-camera-body">
          <div class="prism-camera-content"></div>
          <div class="prism-camera-info">
            <div class="prism-info-header">
              <div class="prism-info-header-icon">
                <ha-icon icon="mdi:printer-3d-nozzle" style="width:12px;height:12px;"></ha-icon>
              </div>
              <span class="prism-info-header-text">Print Info</span>
            </div>
            <div class="prism-info-content">
              <div class="prism-info-progress">
                <div class="prism-info-progress-header">
                  <span class="prism-info-progress-label">Progress</span>
                  <span class="prism-info-progress-value" data-field="progress">${Math.round(data.progress)}%</span>
                </div>
                <div class="prism-info-progress-bar">
                  <div class="prism-info-progress-fill" style="width: ${data.progress}%"></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon time">
                  <ha-icon icon="mdi:clock-outline" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Time Left</div>
                  <div class="prism-info-stat-value" data-field="time">${data.printTimeLeft}</div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon layer">
                  <ha-icon icon="mdi:layers-triple" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Layer</div>
                  <div class="prism-info-stat-value" data-field="layer">${data.currentLayer} <span class="target">/ ${data.totalLayers}</span></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon nozzle">
                  <ha-icon icon="mdi:printer-3d-nozzle-heat" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Nozzle</div>
                  <div class="prism-info-stat-value" data-field="nozzle">${Math.round(data.nozzleTemp)}° <span class="target">/ ${Math.round(data.targetNozzleTemp)}°</span></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon bed">
                  <ha-icon icon="mdi:radiator" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Bed</div>
                  <div class="prism-info-stat-value" data-field="bed">${Math.round(data.bedTemp)}° <span class="target">/ ${Math.round(data.targetBedTemp)}°</span></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon chamber">
                  <ha-icon icon="mdi:thermometer" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Chamber</div>
                  <div class="prism-info-stat-value" data-field="chamber">${Math.round(data.chamberTemp)}°</div>
                </div>
              </div>
              
              <div class="prism-info-status">
                <div class="prism-info-status-dot"></div>
                <span class="prism-info-status-text" data-field="status">${data.stateStr}</span>
              </div>
              
              <button class="prism-info-stop-btn" title="Stop Print">
                <ha-icon icon="mdi:stop-circle" style="width:16px;height:16px;"></ha-icon>
                <span>Stop Print</span>
              </button>
            </div>
          </div>
        </div>
        <div class="prism-camera-footer">
          <div class="prism-camera-footer-left">
            <div class="prism-camera-entity">${entityId}</div>
            <button class="prism-camera-toggle-info active">
              <ha-icon icon="mdi:information" style="width:10px;height:10px;"></ha-icon>
              <span>Info</span>
            </button>
          </div>
          <div class="prism-camera-resize-hint">
            <ha-icon icon="mdi:resize-bottom-right" style="width:12px;height:12px;"></ha-icon>
            <span>Resize</span>
          </div>
        </div>
        <div class="prism-camera-resize-handle"></div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this._cameraPopupOverlay = overlay;
    
    // Get content container
    const content = overlay.querySelector('.prism-camera-content');
    
    // Use ha-camera-stream element for live stream
    const cameraStream = document.createElement('ha-camera-stream');
    cameraStream.hass = this._hass;
    cameraStream.stateObj = stateObj;
    cameraStream.muted = true;
    cameraStream.controls = true;
    cameraStream.allowExoPlayer = true;
    cameraStream.setAttribute('muted', '');
    cameraStream.setAttribute('controls', '');
    cameraStream.setAttribute('autoplay', '');
    content.appendChild(cameraStream);
    
    // Close button handler
    overlay.querySelector('.prism-camera-close').onclick = () => this.closeCameraPopup();
    
    // Toggle info panel handler
    const toggleInfoBtn = overlay.querySelector('.prism-camera-toggle-info');
    const infoPanel = overlay.querySelector('.prism-camera-info');
    toggleInfoBtn.onclick = () => {
      infoPanel.classList.toggle('hidden');
      toggleInfoBtn.classList.toggle('active');
    };
    
    // Stop print button handler
    const stopBtn = overlay.querySelector('.prism-info-stop-btn');
    stopBtn.onclick = async () => {
      // For Creality, we look for stop-related entities
      const deviceId = this.config.printer;
      let stopEntity = null;
      
      // Look for button.xxx_stop or similar Creality entities
      for (const entityId in this._hass.entities) {
        const entityInfo = this._hass.entities[entityId];
        if (entityInfo.device_id === deviceId && 
            (entityId.includes('stop') || 
             (entityInfo.translation_key && entityInfo.translation_key.includes('stop')))) {
          stopEntity = entityId;
          break;
        }
      }
      
      if (stopEntity) {
        // Confirm before stopping
        if (confirm('Are you sure you want to stop the print?')) {
          try {
            // Determine the domain from entity_id
            const domain = stopEntity.split('.')[0];
            if (domain === 'button') {
              await this._hass.callService('button', 'press', {
                entity_id: stopEntity
              });
            } else if (domain === 'switch') {
              await this._hass.callService('switch', 'turn_off', {
                entity_id: stopEntity
              });
            }
          } catch (e) {
            console.error('Failed to stop print:', e);
          }
        }
      } else {
        alert('Stop entity not found. Please check your Creality integration.');
      }
    };
    
    // Click on overlay background closes popup
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeCameraPopup();
      }
    };
    
    // Escape key handler
    this._cameraPopupEscHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeCameraPopup();
      }
    };
    document.addEventListener('keydown', this._cameraPopupEscHandler);
    
    // Make popup draggable by header (mouse + touch support)
    const popup = overlay.querySelector('.prism-camera-popup');
    const header = overlay.querySelector('.prism-camera-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    const getEventCoords = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };
    
    const startDrag = (e) => {
      if (e.target.closest('.prism-camera-close')) return;
      isDragging = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      startX = coords.x;
      startY = coords.y;
      startLeft = rect.left;
      startTop = rect.top;
      popup.style.position = 'fixed';
      popup.style.margin = '0';
      popup.style.left = startLeft + 'px';
      popup.style.top = startTop + 'px';
      if (e.cancelable) e.preventDefault();
    };
    
    header.onmousedown = startDrag;
    header.ontouchstart = startDrag;
    
    this._cameraPopupDragHandler = (e) => {
      if (!isDragging) return;
      const coords = getEventCoords(e);
      const dx = coords.x - startX;
      const dy = coords.y - startY;
      popup.style.left = (startLeft + dx) + 'px';
      popup.style.top = (startTop + dy) + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupDragHandler);
    document.addEventListener('touchmove', this._cameraPopupDragHandler, { passive: true });
    
    this._cameraPopupDragEndHandler = () => {
      isDragging = false;
    };
    document.addEventListener('mouseup', this._cameraPopupDragEndHandler);
    document.addEventListener('touchend', this._cameraPopupDragEndHandler);
    
    // Custom resize handle (mouse + touch support)
    const resizeHandle = overlay.querySelector('.prism-camera-resize-handle');
    let isResizing = false;
    let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;
    
    const startResize = (e) => {
      isResizing = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      resizeStartX = coords.x;
      resizeStartY = coords.y;
      resizeStartWidth = rect.width;
      resizeStartHeight = rect.height;
      
      // Ensure popup has fixed positioning for resize
      if (popup.style.position !== 'fixed') {
        popup.style.position = 'fixed';
        popup.style.margin = '0';
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.top + 'px';
      }
      
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    
    resizeHandle.onmousedown = startResize;
    resizeHandle.ontouchstart = startResize;
    
    this._cameraPopupResizeHandler = (e) => {
      if (!isResizing) return;
      const coords = getEventCoords(e);
      const dx = coords.x - resizeStartX;
      const dy = coords.y - resizeStartY;
      const newWidth = Math.max(400, Math.min(resizeStartWidth + dx, window.innerWidth * 0.95));
      const newHeight = Math.max(300, Math.min(resizeStartHeight + dy, window.innerHeight * 0.95));
      popup.style.width = newWidth + 'px';
      popup.style.height = newHeight + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupResizeHandler);
    document.addEventListener('touchmove', this._cameraPopupResizeHandler, { passive: true });
    
    this._cameraPopupResizeEndHandler = () => {
      isResizing = false;
    };
    document.addEventListener('mouseup', this._cameraPopupResizeEndHandler);
    document.addEventListener('touchend', this._cameraPopupResizeEndHandler);
    
    // Update info panel data periodically
    this._cameraPopupUpdateInterval = setInterval(() => {
      if (!this._cameraPopupOverlay) return;
      const newData = this.getPrinterData();
      
      // Update progress
      const progressValue = overlay.querySelector('[data-field="progress"]');
      const progressFill = overlay.querySelector('.prism-info-progress-fill');
      if (progressValue) progressValue.textContent = `${Math.round(newData.progress)}%`;
      if (progressFill) progressFill.style.width = `${newData.progress}%`;
      
      // Update time
      const timeValue = overlay.querySelector('[data-field="time"]');
      if (timeValue) timeValue.textContent = newData.printTimeLeft;
      
      // Update layer
      const layerValue = overlay.querySelector('[data-field="layer"]');
      if (layerValue) layerValue.innerHTML = `${newData.currentLayer} <span class="target">/ ${newData.totalLayers}</span>`;
      
      // Update temperatures
      const nozzleValue = overlay.querySelector('[data-field="nozzle"]');
      if (nozzleValue) nozzleValue.innerHTML = `${Math.round(newData.nozzleTemp)}° <span class="target">/ ${Math.round(newData.targetNozzleTemp)}°</span>`;
      
      const bedValue = overlay.querySelector('[data-field="bed"]');
      if (bedValue) bedValue.innerHTML = `${Math.round(newData.bedTemp)}° <span class="target">/ ${Math.round(newData.targetBedTemp)}°</span>`;
      
      const chamberValue = overlay.querySelector('[data-field="chamber"]');
      if (chamberValue) chamberValue.textContent = `${Math.round(newData.chamberTemp)}°`;
      
      // Update status
      const statusText = overlay.querySelector('[data-field="status"]');
      if (statusText) statusText.textContent = newData.stateStr;
    }, 2000);
    
    console.log('Prism Creality: Camera popup opened:', entityId);
  }
  
  closeCameraPopup() {
    // Remove popup from document.body
    if (this._cameraPopupOverlay) {
      this._cameraPopupOverlay.remove();
      this._cameraPopupOverlay = null;
    }
    
    // Also check for any orphaned popups
    const existingPopup = document.getElementById('prism-camera-popup-overlay');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // Clear info update interval
    if (this._cameraPopupUpdateInterval) {
      clearInterval(this._cameraPopupUpdateInterval);
      this._cameraPopupUpdateInterval = null;
    }
    
    // Remove escape key listener
    if (this._cameraPopupEscHandler) {
      document.removeEventListener('keydown', this._cameraPopupEscHandler);
      this._cameraPopupEscHandler = null;
    }
    
    // Remove drag listeners (mouse + touch)
    if (this._cameraPopupDragHandler) {
      document.removeEventListener('mousemove', this._cameraPopupDragHandler);
      document.removeEventListener('touchmove', this._cameraPopupDragHandler);
      this._cameraPopupDragHandler = null;
    }
    if (this._cameraPopupDragEndHandler) {
      document.removeEventListener('mouseup', this._cameraPopupDragEndHandler);
      document.removeEventListener('touchend', this._cameraPopupDragEndHandler);
      this._cameraPopupDragEndHandler = null;
    }
    
    // Remove resize listeners (mouse + touch)
    if (this._cameraPopupResizeHandler) {
      document.removeEventListener('mousemove', this._cameraPopupResizeHandler);
      document.removeEventListener('touchmove', this._cameraPopupResizeHandler);
      this._cameraPopupResizeHandler = null;
    }
    if (this._cameraPopupResizeEndHandler) {
      document.removeEventListener('mouseup', this._cameraPopupResizeEndHandler);
      document.removeEventListener('touchend', this._cameraPopupResizeEndHandler);
      this._cameraPopupResizeEndHandler = null;
    }
    
    // Refresh the camera stream in the card (it may have paused while popup was open)
    this._refreshCardCameraStream();
    
    console.log('Prism Creality: Camera popup closed');
  }
  
  // Refresh the camera stream in the card after popup closes
  _refreshCardCameraStream() {
    if (!this.shadowRoot || !this._hass || !this.showCamera) return;
    
    const cameraContainer = this.shadowRoot.querySelector('.camera-container');
    if (!cameraContainer) return;
    
    const entityId = cameraContainer.dataset.entity;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return;
    
    // Find existing camera stream
    const existingStream = cameraContainer.querySelector('ha-camera-stream');
    if (!existingStream) return;
    
    // Small delay to let popup fully close, then recreate stream
    setTimeout(() => {
      // Remove old stream
      existingStream.remove();
      
      // Create fresh camera stream
      const cameraStream = document.createElement('ha-camera-stream');
      cameraStream.hass = this._hass;
      cameraStream.stateObj = stateObj;
      cameraStream.className = 'camera-feed';
      cameraStream.style.cursor = 'pointer';
      cameraStream.muted = true;
      cameraStream.controls = true;
      cameraStream.allowExoPlayer = true;
      cameraStream.setAttribute('muted', '');
      cameraStream.setAttribute('controls', '');
      cameraStream.setAttribute('autoplay', '');
      
      cameraContainer.appendChild(cameraStream);
      
      // Re-add tap listener
      let touchMoved = false;
      let touchStartTime = 0;
      
      cameraStream.addEventListener('touchstart', () => { 
        touchMoved = false; 
        touchStartTime = Date.now();
      }, { passive: true });
      
      cameraStream.addEventListener('touchmove', () => { 
        touchMoved = true; 
      }, { passive: true });
      
      cameraStream.addEventListener('touchend', (e) => {
        if (!touchMoved && (Date.now() - touchStartTime) < 500) {
          e.preventDefault();
          e.stopPropagation();
          this.openCameraPopup();
        }
      });
      
      cameraStream.onclick = (e) => {
        e.stopPropagation();
        this.openCameraPopup();
      };
      
      console.log('Prism Creality: Camera stream refreshed after popup close');
    }, 100);
  }

  // Multi-Printer Camera Popup - shows grid of all configured printers
  openMultiCameraPopup() {
    if (!this._hass) return;
    
    // Remove existing popup if any
    this.closeCameraPopup();
    
    // Get all configured printers
    const printerConfigs = this.getMultiPrinterConfigs();
    if (printerConfigs.length === 0) return;
    
    // Get data for all printers
    const printersData = printerConfigs.map(pc => 
      this.getPrinterDataForDevice(pc.deviceId, pc.cameraEntity, pc.name)
    );
    
    // Filter to only printers with valid camera entities
    const validPrinters = printersData.filter(p => p.cameraEntity);
    if (validPrinters.length === 0) return;
    
    const printerCount = validPrinters.length;
    
    // Determine grid layout
    let gridCols = 1, gridRows = 1;
    if (printerCount === 2) { gridCols = 2; gridRows = 1; }
    else if (printerCount === 3) { gridCols = 2; gridRows = 2; }
    else if (printerCount >= 4) { gridCols = 2; gridRows = 2; }
    
    // Create popup in document.body
    const overlay = document.createElement('div');
    overlay.id = 'prism-camera-popup-overlay';
    overlay.innerHTML = `
      <style>
        #prism-camera-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          animation: prismMultiFadeIn 0.2s ease;
          font-family: system-ui, -apple-system, sans-serif;
        }
        @keyframes prismMultiFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .prism-multi-popup {
          position: relative;
          width: 90vw;
          height: 90vh;
          max-width: 1800px;
          background: #0a0a0a;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.1);
          animation: prismMultiSlideIn 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        @keyframes prismMultiSlideIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .prism-multi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: linear-gradient(180deg, rgba(30,32,36,0.98), rgba(20,22,25,0.98));
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: move;
          user-select: none;
        }
        .prism-multi-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.95);
          font-size: 15px;
          font-weight: 600;
        }
        /* Multi-Printer Title Icon - Neumorphism */
        .prism-multi-title-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0096FF;
          --mdc-icon-size: 18px;
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-multi-title-icon ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
          filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.5));
        }
        .prism-multi-badge {
          background: linear-gradient(145deg, #1c1e24, #25282e);
          color: #60a5fa;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.3),
            inset -1px -1px 2px rgba(255, 255, 255, 0.02);
        }
        /* Multi-Printer Close Button - Neumorphism */
        .prism-multi-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.4);
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          --mdc-icon-size: 18px;
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-multi-close ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
          transition: all 0.2s ease;
        }
        .prism-multi-close:hover {
          color: #f87171;
        }
        .prism-multi-close:hover ha-icon {
          filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.6));
        }
        .prism-multi-close:active {
          background: linear-gradient(145deg, #22252b, #2d3038);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.5),
            inset -1px -1px 3px rgba(255, 255, 255, 0.03);
        }
        .prism-multi-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(${gridCols}, 1fr);
          grid-template-rows: repeat(${gridRows}, 1fr);
          gap: 2px;
          background: rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .prism-multi-cell {
          position: relative;
          background: #000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .prism-multi-cell-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 8px 12px;
          background: linear-gradient(180deg, rgba(0,0,0,0.7), transparent);
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
        }
        .prism-multi-cell-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
        }
        .prism-multi-cell-name-icon {
          width: 22px;
          height: 22px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3B82F6;
          --mdc-icon-size: 12px;
        }
        .prism-multi-cell-name-icon ha-icon {
          display: flex;
          --mdc-icon-size: 12px;
        }
        .prism-multi-cell-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .prism-multi-light-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.5);
          transition: all 0.2s;
          --mdc-icon-size: 14px;
        }
        .prism-multi-light-btn ha-icon {
          display: flex;
          --mdc-icon-size: 14px;
        }
        .prism-multi-light-btn:hover {
          background: rgba(255,200,100,0.2);
          color: #ffc864;
        }
        .prism-multi-light-btn.active {
          background: rgba(255,200,100,0.25);
          border-color: rgba(255,200,100,0.4);
          color: #ffc864;
        }
        .prism-multi-cell-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(0,0,0,0.5);
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
        }
        .prism-multi-cell-status.printing {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }
        .prism-multi-cell-status.paused {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }
        .prism-multi-cell-status.idle {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
        }
        .prism-multi-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .prism-multi-cell-status.printing .prism-multi-status-dot {
          animation: statusPulse 2s infinite;
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .prism-multi-camera {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .prism-multi-camera ha-camera-stream,
        .prism-multi-camera img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .prism-multi-camera ha-camera-stream video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .prism-multi-info-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px 12px;
          background: linear-gradient(0deg, rgba(0,0,0,0.85), rgba(0,0,0,0.6), transparent);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 16px;
          z-index: 10;
        }
        .prism-multi-progress-section {
          flex: 0 0 auto;
          min-width: 140px;
        }
        .prism-multi-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .prism-multi-progress-label {
          font-size: 9px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .prism-multi-progress-value {
          font-size: 14px;
          font-weight: 700;
          color: #60a5fa;
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-multi-progress-bar {
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .prism-multi-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3B82F6, #60a5fa);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        .prism-multi-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .prism-multi-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .prism-multi-stat-label {
          font-size: 8px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .prism-multi-stat-value {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-multi-stat-value .target {
          font-size: 9px;
          color: rgba(255,255,255,0.35);
          font-weight: 500;
        }
        .prism-multi-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 20px;
          background: rgba(15,15,15,0.95);
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 10px;
          color: rgba(255,255,255,0.35);
        }
        .prism-multi-footer-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .prism-multi-toggle-info {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.06);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 10px;
          font-family: inherit;
          --mdc-icon-size: 12px;
        }
        .prism-multi-toggle-info ha-icon {
          display: flex;
          --mdc-icon-size: 12px;
        }
        .prism-multi-toggle-info:hover {
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8);
        }
        .prism-multi-toggle-info.active {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }
        .prism-multi-info-hidden .prism-multi-info-panel {
          display: none;
        }
        .prism-multi-resize-hint {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-right: 30px;
        }
        .prism-multi-resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          cursor: nwse-resize;
          z-index: 100;
        }
        .prism-multi-resize-handle::before {
          content: '';
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 12px;
          height: 12px;
          border-right: 2px solid rgba(255,255,255,0.3);
          border-bottom: 2px solid rgba(255,255,255,0.3);
          transition: all 0.2s;
        }
        .prism-multi-resize-handle:hover::before {
          border-color: rgba(255,255,255,0.5);
        }
      </style>
      <div class="prism-multi-popup">
        <div class="prism-multi-header">
          <div class="prism-multi-title">
            <div class="prism-multi-title-icon">
              <ha-icon icon="mdi:view-grid"></ha-icon>
            </div>
            <span>Multi-Printer View</span>
            <span class="prism-multi-badge">${printerCount} Printers</span>
          </div>
          <button class="prism-multi-close">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="prism-multi-grid">
          ${validPrinters.map((printer, idx) => `
            <div class="prism-multi-cell" data-printer-idx="${idx}" data-device-id="${printer.deviceId}">
              <div class="prism-multi-cell-header">
                <div class="prism-multi-cell-name">
                  <div class="prism-multi-cell-name-icon">
                    <ha-icon icon="mdi:printer-3d-nozzle"></ha-icon>
                  </div>
                  <span>${printer.name}</span>
                </div>
                <div class="prism-multi-cell-actions">
                  <button class="prism-multi-light-btn" data-light-idx="${idx}" data-device-id="${printer.deviceId}" title="Toggle Light">
                    <ha-icon icon="mdi:lightbulb-outline"></ha-icon>
                  </button>
                  <div class="prism-multi-cell-status ${printer.isPrinting ? 'printing' : printer.isPaused ? 'paused' : 'idle'}">
                    <div class="prism-multi-status-dot"></div>
                    <span data-field="status-${idx}">${printer.stateStr}</span>
                  </div>
                </div>
              </div>
              <div class="prism-multi-camera" data-camera-idx="${idx}"></div>
              <div class="prism-multi-info-panel">
                <div class="prism-multi-progress-section">
                  <div class="prism-multi-progress-header">
                    <span class="prism-multi-progress-label">Progress</span>
                    <span class="prism-multi-progress-value" data-field="progress-${idx}">${Math.round(printer.progress)}%</span>
                  </div>
                  <div class="prism-multi-progress-bar">
                    <div class="prism-multi-progress-fill" data-field="progress-fill-${idx}" style="width: ${printer.progress}%"></div>
                  </div>
                </div>
                <div class="prism-multi-stats">
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Time Left</span>
                    <span class="prism-multi-stat-value" data-field="time-${idx}">${printer.printTimeLeft}</span>
                  </div>
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Layer</span>
                    <span class="prism-multi-stat-value" data-field="layer-${idx}">${printer.currentLayer} <span class="target">/ ${printer.totalLayers}</span></span>
                  </div>
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Nozzle</span>
                    <span class="prism-multi-stat-value" data-field="nozzle-${idx}">${Math.round(printer.nozzleTemp)}° <span class="target">/ ${Math.round(printer.targetNozzleTemp)}°</span></span>
                  </div>
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Bed</span>
                    <span class="prism-multi-stat-value" data-field="bed-${idx}">${Math.round(printer.bedTemp)}° <span class="target">/ ${Math.round(printer.targetBedTemp)}°</span></span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="prism-multi-footer">
          <div class="prism-multi-footer-left">
            <button class="prism-multi-toggle-info active">
              <ha-icon icon="mdi:information"></ha-icon>
              <span>Info</span>
            </button>
          </div>
          <div class="prism-multi-resize-hint">
            <span>Drag corner to resize</span>
          </div>
        </div>
        <div class="prism-multi-resize-handle"></div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this._cameraPopupOverlay = overlay;
    
    // Store printer configs for updates
    this._multiPrinterConfigs = printerConfigs;
    
    // Setup camera feeds (Creality uses ha-camera-stream)
    validPrinters.forEach((printer, idx) => {
      const cameraContainer = overlay.querySelector(`[data-camera-idx="${idx}"]`);
      if (!cameraContainer || !printer.cameraEntity) return;
      
      const stateObj = this._hass.states[printer.cameraEntity];
      if (!stateObj) return;
      
      const cameraStream = document.createElement('ha-camera-stream');
      cameraStream.hass = this._hass;
      cameraStream.stateObj = stateObj;
      cameraStream.muted = true;
      cameraStream.controls = true;
      cameraStream.allowExoPlayer = true;
      cameraStream.setAttribute('muted', '');
      cameraStream.setAttribute('controls', '');
      cameraStream.setAttribute('autoplay', '');
      cameraContainer.appendChild(cameraStream);
    });
    
    // Close button handler
    overlay.querySelector('.prism-multi-close').onclick = () => this.closeCameraPopup();
    
    // Click on overlay background closes popup
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeCameraPopup();
      }
    };
    
    // Toggle info panels
    const toggleInfoBtn = overlay.querySelector('.prism-multi-toggle-info');
    const grid = overlay.querySelector('.prism-multi-grid');
    toggleInfoBtn.onclick = () => {
      grid.classList.toggle('prism-multi-info-hidden');
      toggleInfoBtn.classList.toggle('active');
    };
    
    // Light button handlers for each printer
    overlay.querySelectorAll('.prism-multi-light-btn').forEach(btn => {
      const deviceId = btn.dataset.deviceId;
      
      // Find light entity for this device (Creality uses switch or light domain)
      let lightEntity = null;
      for (const entityId in this._hass.entities) {
        const entityInfo = this._hass.entities[entityId];
        if (entityInfo.device_id === deviceId && 
            (entityId.includes('light') || entityInfo.translation_key === 'lightSw')) {
          if (entityId.startsWith('light.') || entityId.startsWith('switch.')) {
            lightEntity = entityId;
            break;
          }
        }
      }
      
      // Update button state based on current light state
      if (lightEntity) {
        const domain = lightEntity.split('.')[0];
        const updateLightBtn = () => {
          const state = this._hass.states[lightEntity]?.state;
          if (state === 'on') {
            btn.classList.add('active');
            btn.querySelector('ha-icon').setAttribute('icon', 'mdi:lightbulb');
          } else {
            btn.classList.remove('active');
            btn.querySelector('ha-icon').setAttribute('icon', 'mdi:lightbulb-outline');
          }
        };
        updateLightBtn();
        
        btn.onclick = (e) => {
          e.stopPropagation();
          this._hass.callService(domain, 'toggle', { entity_id: lightEntity });
          setTimeout(updateLightBtn, 100);
        };
      } else {
        btn.style.display = 'none';
      }
    });
    
    // Escape key handler
    this._cameraPopupEscHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeCameraPopup();
      }
    };
    document.addEventListener('keydown', this._cameraPopupEscHandler);
    
    // Make popup draggable by header (mouse + touch support)
    const popup = overlay.querySelector('.prism-multi-popup');
    const header = overlay.querySelector('.prism-multi-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    const getEventCoords = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };
    
    const startDrag = (e) => {
      if (e.target.closest('.prism-multi-close')) return;
      isDragging = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      startX = coords.x;
      startY = coords.y;
      startLeft = rect.left;
      startTop = rect.top;
      popup.style.position = 'fixed';
      popup.style.margin = '0';
      popup.style.left = startLeft + 'px';
      popup.style.top = startTop + 'px';
      if (e.cancelable) e.preventDefault();
    };
    
    header.onmousedown = startDrag;
    header.ontouchstart = startDrag;
    
    this._cameraPopupDragHandler = (e) => {
      if (!isDragging) return;
      const coords = getEventCoords(e);
      const dx = coords.x - startX;
      const dy = coords.y - startY;
      popup.style.left = (startLeft + dx) + 'px';
      popup.style.top = (startTop + dy) + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupDragHandler);
    document.addEventListener('touchmove', this._cameraPopupDragHandler, { passive: true });
    
    this._cameraPopupDragEndHandler = () => {
      isDragging = false;
    };
    document.addEventListener('mouseup', this._cameraPopupDragEndHandler);
    document.addEventListener('touchend', this._cameraPopupDragEndHandler);
    
    // Custom resize handle (mouse + touch support)
    const resizeHandle = overlay.querySelector('.prism-multi-resize-handle');
    let isResizing = false;
    let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;
    
    const startResize = (e) => {
      isResizing = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      resizeStartX = coords.x;
      resizeStartY = coords.y;
      resizeStartWidth = rect.width;
      resizeStartHeight = rect.height;
      
      if (popup.style.position !== 'fixed') {
        popup.style.position = 'fixed';
        popup.style.margin = '0';
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.top + 'px';
      }
      
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    
    resizeHandle.onmousedown = startResize;
    resizeHandle.ontouchstart = startResize;
    
    this._cameraPopupResizeHandler = (e) => {
      if (!isResizing) return;
      const coords = getEventCoords(e);
      const dx = coords.x - resizeStartX;
      const dy = coords.y - resizeStartY;
      const newWidth = Math.max(600, Math.min(resizeStartWidth + dx, window.innerWidth * 0.98));
      const newHeight = Math.max(400, Math.min(resizeStartHeight + dy, window.innerHeight * 0.98));
      popup.style.width = newWidth + 'px';
      popup.style.height = newHeight + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupResizeHandler);
    document.addEventListener('touchmove', this._cameraPopupResizeHandler, { passive: true });
    
    this._cameraPopupResizeEndHandler = () => {
      isResizing = false;
    };
    document.addEventListener('mouseup', this._cameraPopupResizeEndHandler);
    document.addEventListener('touchend', this._cameraPopupResizeEndHandler);
    
    // Update info panel data periodically
    this._cameraPopupUpdateInterval = setInterval(() => {
      if (!this._cameraPopupOverlay || !this._multiPrinterConfigs) return;
      
      this._multiPrinterConfigs.forEach((pc, idx) => {
        const newData = this.getPrinterDataForDevice(pc.deviceId, pc.cameraEntity, pc.name);
        
        // Update progress
        const progressValue = overlay.querySelector(`[data-field="progress-${idx}"]`);
        const progressFill = overlay.querySelector(`[data-field="progress-fill-${idx}"]`);
        if (progressValue) progressValue.textContent = `${Math.round(newData.progress)}%`;
        if (progressFill) progressFill.style.width = `${newData.progress}%`;
        
        // Update time
        const timeValue = overlay.querySelector(`[data-field="time-${idx}"]`);
        if (timeValue) timeValue.textContent = newData.printTimeLeft;
        
        // Update layer
        const layerValue = overlay.querySelector(`[data-field="layer-${idx}"]`);
        if (layerValue) layerValue.innerHTML = `${newData.currentLayer} <span class="target">/ ${newData.totalLayers}</span>`;
        
        // Update temperatures
        const nozzleValue = overlay.querySelector(`[data-field="nozzle-${idx}"]`);
        if (nozzleValue) nozzleValue.innerHTML = `${Math.round(newData.nozzleTemp)}° <span class="target">/ ${Math.round(newData.targetNozzleTemp)}°</span>`;
        
        const bedValue = overlay.querySelector(`[data-field="bed-${idx}"]`);
        if (bedValue) bedValue.innerHTML = `${Math.round(newData.bedTemp)}° <span class="target">/ ${Math.round(newData.targetBedTemp)}°</span>`;
        
        // Update status
        const statusText = overlay.querySelector(`[data-field="status-${idx}"]`);
        if (statusText) statusText.textContent = newData.stateStr;
        
        // Update status badge class
        const cell = overlay.querySelector(`[data-printer-idx="${idx}"]`);
        if (cell) {
          const statusBadge = cell.querySelector('.prism-multi-cell-status');
          if (statusBadge) {
            statusBadge.classList.remove('printing', 'paused', 'idle');
            statusBadge.classList.add(newData.isPrinting ? 'printing' : newData.isPaused ? 'paused' : 'idle');
          }
        }
      });
    }, 2000);
    
    console.log('Prism Creality: Multi-camera popup opened with', printerCount, 'printers');
  }

  getPrinterData() {
    if (!this._hass || !this.config) {
      return this.getPreviewData();
    }

    // If no printer selected, show preview
    if (!this.config.printer) {
      return this.getPreviewData();
    }

    // If no device entities found, show preview
    if (Object.keys(this._deviceEntities).length === 0) {
      console.warn('Prism Creality: No device entities found for device:', this.config.printer);
      return this.getPreviewData();
    }
    
    // Find entities by searching entity_ids (Creality uses different naming pattern)
    const progressEntity = this.findEntityByPattern('print_progress');
    const stateEntity = this.findEntityByPattern('print_state') || this.findEntityByPattern('device_state');
    const layerEntity = this.findEntityByPattern('current_layer');
    const totalLayerEntity = this.findEntityByPattern('total_layer');
    const timeLeftEntity = this.findEntityByPattern('time_left');
    const nozzleTempEntity = this.findEntityByPattern('nozzle_temp');
    const targetNozzleTempEntity = this.findEntityByPattern('target_nozzle');
    const bedTempEntity = this.findEntityByPattern('bed_temp');
    const targetBedTempEntity = this.findEntityByPattern('target_bed');
    const boxTempEntity = this.findEntityByPattern('box_temp');
    const modelFanEntity = this.findEntityByPattern('model_fan');
    const auxFanEntity = this.findEntityByPattern('auxiliary_fan');
    const caseFanEntity = this.findEntityByPattern('case_fan');
    // Light: prefer switch domain for control, sensor for status
    const lightSwitchEntity = this.findEntityByPattern('light', 'switch');
    const lightSensorEntity = this.findEntityByPattern('light', 'sensor');
    // Camera: must be camera domain
    const cameraEntityAuto = this.findEntityByPattern('camera', 'camera');
    const fileNameEntity = this.findEntityByPattern('filename') || this.findEntityByPattern('print_filename');
    
    // Read values
    const progress = this.getEntityValueById(progressEntity);
    let stateStr = this.getEntityStateById(stateEntity) || 'Idle';
    
    // If state is purely numeric (like "0", "1"), convert to readable status
    if (/^\d+$/.test(stateStr)) {
      // Common Creality numeric states: 0 = Idle, 1 = Printing, 2 = Paused, etc.
      const numericStateMap = {
        '0': 'Idle',
        '1': 'Printing',
        '2': 'Paused',
        '3': 'Finished',
        '4': 'Stopped'
      };
      stateStr = numericStateMap[stateStr] || 'Idle';
    }
    
    // Determine if printer is actively printing
    const statusLower = stateStr.toLowerCase();
    const isPrinting = ['printing', 'prepare', 'running', 'druckt', 'vorbereiten', 'busy', '1'].includes(statusLower);
    const isPaused = ['paused', 'pause', 'pausiert', '2'].includes(statusLower);
    const isIdle = !isPrinting && !isPaused;
    
    // Get remaining time - format it nicely
    let printTimeLeft = '--';
    let printEndTime = '--:--';
    if (timeLeftEntity && (isPrinting || isPaused)) {
      const state = this._hass.states[timeLeftEntity];
      if (state) {
        // Creality returns time as HH:MM:SS string or seconds
        const timeValue = state.state;
        if (timeValue && timeValue !== 'Unknown') {
          if (timeValue.includes(':')) {
            // Already formatted as HH:MM:SS
            const parts = timeValue.split(':');
            if (parts.length >= 2) {
              const hours = parseInt(parts[0]) || 0;
              const mins = parseInt(parts[1]) || 0;
              if (hours > 0) {
                printTimeLeft = `${hours}h ${mins}m`;
              } else {
                printTimeLeft = `${mins}m`;
              }
              // Calculate end time
              const totalMinutes = hours * 60 + mins;
              const endTime = new Date(Date.now() + totalMinutes * 60 * 1000);
              printEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          } else {
            // Seconds value
            const seconds = parseInt(timeValue) || 0;
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (hours > 0) {
              printTimeLeft = `${hours}h ${mins}m`;
            } else {
              printTimeLeft = `${mins}m`;
            }
            const endTime = new Date(Date.now() + seconds * 1000);
            printEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        }
      }
    }
    
    // Temperatures
    const nozzleTemp = this.getEntityValueById(nozzleTempEntity);
    const targetNozzleTemp = this.getEntityValueById(targetNozzleTempEntity);
    const bedTemp = this.getEntityValueById(bedTempEntity);
    const targetBedTemp = this.getEntityValueById(targetBedTempEntity);
    const chamberTemp = this.getEntityValueById(boxTempEntity);
    
    // Fans
    const modelFanSpeed = this.getEntityValueById(modelFanEntity);
    const auxFanSpeed = this.getEntityValueById(auxFanEntity);
    const caseFanSpeed = this.getEntityValueById(caseFanEntity);
    
    // Layer info
    let currentLayer = 0;
    let totalLayers = 0;
    if (isPrinting || isPaused) {
      currentLayer = parseInt(this.getEntityStateById(layerEntity)) || 0;
      totalLayers = parseInt(this.getEntityStateById(totalLayerEntity)) || 0;
    }
    
    // Light: Use configured light_switch, or auto-detected switch, or sensor for status
    let lightEntityId = this.config.light_switch || lightSwitchEntity;
    let lightState = null;
    
    if (lightEntityId) {
      // Use the switch state directly
      lightState = this._hass.states[lightEntityId]?.state;
    } else if (lightSensorEntity) {
      // Fall back to sensor for status display (but won't be controllable)
      lightState = this._hass.states[lightSensorEntity]?.state;
      // Sensor uses "1" for on, "0" for off
      lightState = lightState === '1' ? 'on' : lightState === '0' ? 'off' : lightState;
    }
    
    const isLightOn = lightState === 'on' || lightState === '1';
    
    // Custom sensors
    const customHumidity = this.config.custom_humidity;
    const customHumidityState = customHumidity ? this._hass.states[customHumidity] : null;
    const humidity = customHumidityState ? parseFloat(customHumidityState.state) || 0 : null;
    
    const customTemperature = this.config.custom_temperature;
    const customTemperatureState = customTemperature ? this._hass.states[customTemperature] : null;
    const customTemp = customTemperatureState ? parseFloat(customTemperatureState.state) || 0 : null;
    
    const powerSwitch = this.config.power_switch;
    const powerSwitchState = powerSwitch ? this._hass.states[powerSwitch] : null;
    const isPowerOn = powerSwitchState?.state === 'on';
    const powerSwitchIcon = this.config.power_switch_icon || 'mdi:power';
    
    // Debug: Log light entity details
    console.log('Prism Creality: Light - configured:', this.config.light_switch, 'auto-switch:', lightSwitchEntity, 'auto-sensor:', lightSensorEntity);
    console.log('Prism Creality: Light entity used:', lightEntityId, 'State:', lightState, 'isLightOn:', isLightOn);
    
    // Get printer name from device
    const deviceId = this.config.printer;
    const device = this._hass.devices?.[deviceId];
    const name = this.config.name || device?.name || 'Creality Printer';
    
    // Camera: Use configured camera_entity or auto-detected from camera domain
    let resolvedCameraEntity = this.config.camera_entity || cameraEntityAuto;
    if (resolvedCameraEntity && !resolvedCameraEntity.startsWith('camera.')) {
      console.warn('Prism Creality: Camera entity is not from camera domain:', resolvedCameraEntity);
      resolvedCameraEntity = null;
    }
    const cameraState = resolvedCameraEntity ? this._hass.states[resolvedCameraEntity] : null;
    const cameraImage = cameraState?.attributes?.entity_picture || null;
    
    // Debug: Log camera entity
    console.log('Prism Creality: Camera entity:', resolvedCameraEntity, 'Has image:', !!cameraImage, 'Auto-detected:', cameraEntityAuto);
    
    // Image path
    const printerImg = this.config.image || '/local/community/Prism-Dashboard/images/printer-blank.jpg';
    
    // Get print filename
    const fileName = this.getEntityStateById(fileNameEntity) || '';

    const returnData = {
      stateStr,
      progress: isIdle ? 0 : progress,
      printTimeLeft,
      printEndTime,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      chamberTemp,
      modelFanSpeed,
      auxFanSpeed,
      caseFanSpeed,
      currentLayer,
      totalLayers,
      name,
      cameraEntity: resolvedCameraEntity,
      cameraImage,
      printerImg,
      fileName,
      isPrinting,
      isPaused,
      isIdle,
      isLightOn,
      lightEntity: lightEntityId,
      // Custom sensors
      humidity,
      customTemp,
      powerSwitch,
      isPowerOn,
      powerSwitchIcon
    };
    
    // Debug: Log key data
    console.log('Prism Creality: Icons - Light:', lightEntityId, 'Camera:', resolvedCameraEntity);
    console.log('Prism Creality: Status - isPrinting:', isPrinting, 'isPaused:', isPaused, 'isIdle:', isIdle);
    
    return returnData;
  }

  getPreviewData() {
    return {
      stateStr: 'printing',
      progress: 45,
      printTimeLeft: '2h 15m',
      printEndTime: '14:30',
      nozzleTemp: 220,
      targetNozzleTemp: 220,
      bedTemp: 60,
      targetBedTemp: 60,
      chamberTemp: 35,
      modelFanSpeed: 50,
      auxFanSpeed: 30,
      caseFanSpeed: 40,
      currentLayer: 12,
      totalLayers: 28,
      name: this.config?.name || 'Creality Printer',
      cameraEntity: null,
      cameraImage: null,
      printerImg: this.config?.image || '/local/community/Prism-Dashboard/images/printer-blank.jpg',
      fileName: 'benchy.gcode',
      isPrinting: true,
      isPaused: false,
      isIdle: false,
      isLightOn: true,
      lightEntity: null,
      humidity: null,
      customTemp: null,
      powerSwitch: null,
      isPowerOn: true,
      powerSwitchIcon: 'mdi:power'
    };
  }

  render() {
    const data = this.getPrinterData();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
            position: relative;
            width: 100%;
            min-height: 550px;
            border-radius: 32px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background-color: rgba(30, 32, 36, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 20px 40px -10px rgba(0,0,0,0.6);
            color: white;
            box-sizing: border-box;
            user-select: none;
        }
        .noise {
            position: absolute;
            inset: 0;
            opacity: 0.03;
            pointer-events: none;
            background-image: url('https://grainy-gradients.vercel.app/noise.svg');
            mix-blend-mode: overlay;
        }
        
        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 20;
            margin-bottom: 24px;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        /* Printer Icon - Neumorphism Style */
        .printer-icon {
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
            border-radius: 50%;
            background: linear-gradient(145deg, #2d3038, #22252b);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0096FF;
            border: none;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
            flex-shrink: 0;
            transition: all 0.3s ease;
        }
        .printer-icon ha-icon {
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.5));
        }
        /* Offline/Unavailable/Power Off - Inset/pressed look */
        .printer-icon.offline {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            color: rgba(255, 255, 255, 0.25);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .printer-icon.offline ha-icon {
            filter: none;
        }
        /* Printing - Blue with glow, slightly pressed */
        .printer-icon.printing {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            box-shadow: 
                inset 2px 2px 4px rgba(0, 0, 0, 0.4),
                inset -1px -1px 3px rgba(255, 255, 255, 0.03);
            animation: printerIconGlow 2s ease-in-out infinite;
        }
        .printer-icon.printing ha-icon {
            filter: drop-shadow(0 0 6px rgba(0, 150, 255, 0.7));
        }
        @keyframes printerIconGlow {
            0%, 100% { 
                color: #0096FF;
            }
            50% { 
                color: #4db8ff;
            }
        }
        /* Paused - Yellow/Orange */
        .printer-icon.paused {
            background: linear-gradient(145deg, #2d3038, #22252b);
            color: #fbbf24;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .printer-icon.paused ha-icon {
            filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
        }
        .title {
            font-size: 1.125rem;
            font-weight: 700;
            line-height: 1;
            margin: 0;
            color: rgba(255, 255, 255, 0.9);
        }
        .status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;
        }
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${data.isPrinting ? '#22c55e' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.2)'};
            animation: ${data.isPrinting ? 'pulse 2s infinite' : 'none'};
        }
        .status-text {
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: ${data.isPrinting ? '#4ade80' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.6)'};
        }
        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        /* Header Icon Buttons - Neumorphism Style */
        .header-icon-btn {
            width: 36px;
            height: 36px;
            min-width: 36px;
            min-height: 36px;
            border-radius: 50%;
            background: linear-gradient(145deg, #2d3038, #22252b);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.35);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
            flex-shrink: 0;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .header-icon-btn:hover {
            color: rgba(255, 255, 255, 0.7);
        }
        .header-icon-btn:active {
            transform: scale(0.95);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        /* Active state - pressed in with colored icon */
        .header-icon-btn.active {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            color: #fbbf24;
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .header-icon-btn.active ha-icon {
            filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.6));
        }
        .header-icon-btn ha-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        /* Main Visual */
        .main-visual {
            position: relative;
            flex: 1;
            border-radius: 24px;
            background-color: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
            overflow: visible;
            margin-bottom: 24px;
            min-height: 280px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .main-visual-inner {
            position: relative;
            width: 100%;
            height: 100%;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Power Button - Neumorphism Style */
        .power-btn-container {
            position: absolute;
            top: -16px;
            right: -16px;
            z-index: 50;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .power-corner-btn {
            position: relative;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
            /* Outer ring - neumorphic inset */
            background: linear-gradient(145deg, #2a2d35, #1e2027);
            box-shadow: 
                /* Outer shadows for depth */
                5px 5px 10px rgba(0, 0, 0, 0.5),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                /* Inner ring shadow */
                inset 0 0 0 3px rgba(30, 32, 38, 1),
                inset 2px 2px 4px rgba(0, 0, 0, 0.3),
                inset -1px -1px 3px rgba(255, 255, 255, 0.02);
        }
        /* Inner circle - default (OFF) state: raised/normal */
        .power-corner-btn::before {
            content: '';
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(145deg, #2d3038, #22252b);
            box-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.4),
                -1px -1px 3px rgba(255, 255, 255, 0.05),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
            transition: all 0.2s ease;
        }
        /* ON state - inner circle pressed/inset */
        .power-corner-btn.on::before {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.6),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .power-corner-btn .power-icon {
            position: relative;
            z-index: 2;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .power-corner-btn .power-icon ha-icon {
            --mdc-icon-size: 20px;
            width: 20px;
            height: 20px;
        }
        /* Off state - icon is dim, button raised */
        .power-corner-btn.off .power-icon {
            color: rgba(255, 255, 255, 0.25);
        }
        /* On state - green icon with glow, button pressed */
        .power-corner-btn.on .power-icon {
            color: #4ade80;
            filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.6));
        }
        /* Hover states */
        .power-corner-btn.on:hover .power-icon {
            color: #f87171;
            filter: drop-shadow(0 0 8px rgba(248, 113, 113, 0.7));
        }
        .power-corner-btn.off:hover .power-icon {
            color: #4ade80;
            filter: drop-shadow(0 0 8px rgba(74, 222, 128, 0.7));
        }
        /* Click/tap feedback - extra press effect */
        .power-corner-btn:active {
            transform: scale(0.97);
        }
        .power-corner-btn:active::before {
            box-shadow: 
                inset 4px 4px 8px rgba(0, 0, 0, 0.7),
                inset -2px -2px 4px rgba(255, 255, 255, 0.02);
        }
        /* Responsive: smaller on tablets */
        @media (max-width: 768px) {
            .power-btn-container {
                top: -14px;
                right: -14px;
            }
            .power-corner-btn {
                width: 38px;
                height: 38px;
            }
            .power-corner-btn::before {
                width: 28px;
                height: 28px;
            }
            .power-corner-btn .power-icon {
                width: 16px;
                height: 16px;
            }
            .power-corner-btn .power-icon ha-icon {
                --mdc-icon-size: 16px;
                width: 16px;
                height: 16px;
            }
        }
        /* Even smaller on phones */
        @media (max-width: 480px) {
            .power-btn-container {
                top: -12px;
                right: -12px;
            }
            .power-corner-btn {
                width: 34px;
                height: 34px;
            }
            .power-corner-btn::before {
                width: 24px;
                height: 24px;
            }
            .power-corner-btn .power-icon {
                width: 14px;
                height: 14px;
            }
            .power-corner-btn .power-icon ha-icon {
                --mdc-icon-size: 14px;
                width: 14px;
                height: 14px;
            }
        }
        .view-toggle {
            position: absolute;
            top: 16px;
            right: 16px;
            z-index: 40;
            width: 32px;
            height: 32px;
            min-width: 32px;
            min-height: 32px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
            transition: background 0.2s;
            flex-shrink: 0;
        }
        .view-toggle ha-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .view-toggle:hover {
            background-color: rgba(0, 0, 0, 0.8);
        }
        .printer-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 0 30px rgba(0,150,255,0.15)) brightness(1.05);
            z-index: 10;
            padding: 16px;
            box-sizing: border-box;
            transition: filter 0.3s ease;
        }
        .printer-img.dimmed {
            filter: drop-shadow(0 0 10px rgba(0,0,0,0.3)) brightness(0.4);
        }
        .printer-fallback-icon {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,255,255,0.2);
        }
        .printer-fallback-icon ha-icon {
            width: 80px;
            height: 80px;
        }
        .camera-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .camera-feed {
            width: 100%;
            height: 100%;
            object-fit: cover;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .camera-feed:hover {
            opacity: 0.9;
        }
        
        /* Overlays */
        .overlay-left {
            position: absolute;
            left: 12px;
            top: 12px;
            bottom: 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 8px;
            z-index: 20;
        }
        .overlay-right {
            position: absolute;
            right: 12px;
            top: 12px;
            bottom: 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 8px;
            z-index: 20;
        }
        .overlay-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 999px;
            padding: 6px 12px 6px 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .overlay-pill.right {
            flex-direction: row-reverse;
            padding: 6px 8px 6px 12px;
            text-align: right;
        }
        .pill-icon-container {
            width: 24px;
            height: 24px;
            min-width: 24px;
            min-height: 24px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .pill-icon-container ha-icon {
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .pill-content {
            display: flex;
            flex-direction: column;
            line-height: 1;
        }
        .pill-value {
            font-size: 12px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.9);
        }
        .pill-label {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.4);
        }
        
        /* Bottom */
        .stats-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 8px;
            margin-bottom: 8px;
        }
        .stat-group {
            display: flex;
            flex-direction: column;
        }
        .stat-label {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.4);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 700;
        }
        .stat-val {
            font-size: 1.25rem;
            font-family: monospace;
            color: white;
            font-weight: 700;
        }
        
        .progress-bar-container {
            width: 100%;
            height: 16px;
            background-color: rgba(0, 0, 0, 0.4);
            border-radius: 999px;
            overflow: hidden;
            position: relative;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
            border: 1px solid rgba(255, 255, 255, 0.05);
            margin-bottom: 16px;
        }
        .progress-bar-fill {
            height: 100%;
            width: ${data.progress}%;
            background: linear-gradient(to right, #0096FF, #00C8FF);
            position: relative;
            transition: width 0.3s ease;
        }
        .progress-text {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            pointer-events: none;
        }
        
        .controls {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }
        /* Buttons - Neumorphism Style */
        .btn {
            height: 48px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
            font-weight: 700;
            font-size: 14px;
            background: linear-gradient(145deg, #2d3038, #22252b);
            color: rgba(255, 255, 255, 0.5);
            box-shadow: 
                4px 4px 8px rgba(0, 0, 0, 0.4),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .btn ha-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .btn:hover:not(:disabled) {
            color: rgba(255, 255, 255, 0.8);
        }
        .btn:active:not(:disabled) {
            transform: scale(0.97);
            background: linear-gradient(145deg, #22252b, #2d3038);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        /* Secondary buttons (Home, Stop) */
        .btn-secondary {
            color: rgba(255, 255, 255, 0.5);
        }
        .btn-secondary:hover:not(:disabled) {
            color: rgba(255, 255, 255, 0.8);
        }
        /* Stop button - red on hover */
        .btn-stop:hover:not(:disabled) {
            color: #f87171;
        }
        .btn-stop:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.5));
        }
        /* Home button - blue on hover */
        .btn-home:hover:not(:disabled) {
            color: #0096FF;
        }
        .btn-home:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.5));
        }
        /* Primary button (Pause/Resume) - always slightly pressed */
        .btn-primary {
            grid-column: span 2;
            background: linear-gradient(145deg, #1c1e24, #25282e);
            color: #0096FF;
            gap: 8px;
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .btn-primary ha-icon {
            filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.5));
        }
        .btn-primary:hover:not(:disabled) {
            color: #4db8ff;
        }
        .btn-primary:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 6px rgba(0, 150, 255, 0.7));
        }
        .btn-primary:active:not(:disabled) {
            transform: scale(0.97);
            box-shadow: 
                inset 4px 4px 8px rgba(0, 0, 0, 0.6),
                inset -2px -2px 4px rgba(255, 255, 255, 0.02);
        }
        .btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
      </style>
      
      <div class="card">
        <div class="noise"></div>
        
        <div class="header">
            <div class="header-left">
                <div class="printer-icon ${(['offline', 'unavailable'].includes(data.stateStr.toLowerCase()) || (data.powerSwitch && !data.isPowerOn)) ? 'offline' : data.isPrinting ? 'printing' : data.isPaused ? 'paused' : ''}">
                    <ha-icon icon="mdi:printer-3d-nozzle"></ha-icon>
                </div>
                <div>
                    <h2 class="title">${data.name}</h2>
                    <div class="status-row">
                        <div class="status-dot"></div>
                        <span class="status-text">${data.stateStr}</span>
                    </div>
                </div>
            </div>
            <div class="header-right">
                ${data.lightEntity ? `
                <button class="header-icon-btn btn-light ${data.isLightOn ? 'active' : ''}" title="Light">
                    <ha-icon icon="mdi:lightbulb${data.isLightOn ? '' : '-outline'}"></ha-icon>
                </button>
                ` : ''}
                ${data.cameraEntity ? `
                <button class="header-icon-btn btn-camera ${this.showCamera ? 'active' : ''}" title="Toggle Camera">
                    <ha-icon icon="mdi:camera${this.showCamera ? '' : '-outline'}"></ha-icon>
                </button>
                ` : ''}
            </div>
        </div>

        <div class="main-visual ${!data.isLightOn ? 'light-off' : ''}">
            ${data.powerSwitch ? `
            <div class="power-btn-container">
                <button class="power-corner-btn btn-power ${data.isPowerOn ? 'on' : 'off'}" title="Power ${data.isPowerOn ? 'Off' : 'On'}">
                    <span class="power-icon"><ha-icon icon="${data.powerSwitchIcon}"></ha-icon></span>
                </button>
            </div>
            ` : ''}
            <div class="main-visual-inner">
            ${data.cameraEntity && this.showCamera ? `
                <div class="camera-container" data-entity="${data.cameraEntity}"></div>
            ` : `
                <img src="${data.printerImg}" class="printer-img ${!data.isLightOn ? 'dimmed' : ''}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="printer-fallback-icon" style="display: none;">
                  <ha-icon icon="mdi:printer-3d"></ha-icon>
                </div>
                
                <div class="overlay-left">
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.modelFanSpeed}%</span>
                            <span class="pill-label">Model</span>
                        </div>
                    </div>
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:weather-windy"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.auxFanSpeed}%</span>
                            <span class="pill-label">Aux</span>
                        </div>
                    </div>
                    ${data.humidity !== null ? `
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:water-percent" style="color: #60a5fa;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${Math.round(data.humidity)}%</span>
                            <span class="pill-label">Humid</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="overlay-right">
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer" style="color: #F87171;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.nozzleTemp}°</span>
                            <span class="pill-label">/${data.targetNozzleTemp}°</span>
                        </div>
                    </div>
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:radiator" style="color: #FB923C;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.bedTemp}°</span>
                            <span class="pill-label">/${data.targetBedTemp}°</span>
                        </div>
                    </div>
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer" style="color: #4ade80;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.chamberTemp}°</span>
                            <span class="pill-label">Box</span>
                        </div>
                    </div>
                    ${data.customTemp !== null ? `
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer-lines" style="color: #a78bfa;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${Math.round(data.customTemp)}°</span>
                            <span class="pill-label">Custom</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `}
            </div>
        </div>

        <div class="stats-row">
            <div class="stat-group">
                <span class="stat-label">Time Left</span>
                <span class="stat-val">${data.printTimeLeft}</span>
            </div>
            <div class="stat-group" style="align-items: flex-end;">
                <span class="stat-label">Layer</span>
                <span class="stat-val">${data.isIdle ? '--' : data.currentLayer} <span style="font-size: 0.875rem; opacity: 0.4;">/ ${data.isIdle ? '--' : data.totalLayers}</span></span>
            </div>
        </div>

        <div class="progress-bar-container">
            <div class="progress-bar-fill"></div>
            <div class="progress-text">${data.progress}%</div>
        </div>

        <div class="controls">
            <button class="btn btn-secondary btn-home" ${data.isIdle ? '' : 'disabled'} title="Home All Axes">
                <ha-icon icon="mdi:home"></ha-icon>
            </button>
            <button class="btn btn-secondary btn-stop" ${data.isIdle ? 'disabled' : ''} title="Stop Print">
                <ha-icon icon="mdi:stop"></ha-icon>
            </button>
            <button class="btn btn-primary btn-pause" ${data.isIdle ? 'disabled' : ''}>
                <ha-icon icon="${data.isPaused ? 'mdi:play' : 'mdi:pause'}"></ha-icon>
                ${data.isPaused ? 'Resume Print' : data.isPrinting ? 'Pause Print' : 'Control'}
            </button>
        </div>

      </div>
    `;

    this.setupListeners();
  }

  getCardSize() {
    return 7;
  }
}

customElements.define('prism-creality', PrismCrealityCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'prism-creality',
  name: 'Prism Creality',
  preview: true,
  description: 'Creality 3D Printer card for K1, K1C, K1 Max, K1 SE and more'
});


})();
