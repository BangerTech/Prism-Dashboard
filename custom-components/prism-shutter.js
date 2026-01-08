
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
        },
        {
          name: "hide_slider",
          label: "Slider-Linie ausblenden",
          selector: { boolean: {} }
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
    // Wenn Slider ausgeblendet ist, wird die Karte kleiner
    return this.config && this.config.hide_slider ? 1.5 : 2;
  }

  // Translation helper - English default, German if HA is set to German
  _t(key) {
    const lang = this._hass?.language || this._hass?.locale?.language || 'en';
    const isGerman = lang.startsWith('de');
    
    const translations = {
      'closed': isGerman ? 'Geschlossen' : 'Closed',
      'open': isGerman ? 'Offen' : 'Open',
      'open_percent': isGerman ? '% Offen' : '% Open',
      'shutter': isGerman ? 'Rollladen' : 'Shutter'
    };
    
    return translations[key] || key;
  }

  connectedCallback() {
    if (this.config) {
      this.render();
      this.setupListeners();
    }
  }

  // Open More-Info Dialog on long-press / right-click
  _handleHold() {
    if (!this._hass || !this.config.entity) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this.config.entity }
    });
    this.dispatchEvent(event);
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

    // Long-press / Right-click for More Info on header
    const header = this.shadowRoot.querySelector('.header');
    if (header) {
      let longPressTimer = null;
      let touchMoved = false;

      // Touch: Long-press detection
      header.addEventListener('touchstart', (e) => {
        touchMoved = false;
        longPressTimer = setTimeout(() => {
          if (!touchMoved) {
            e.preventDefault();
            this._handleHold();
          }
        }, 500);
      }, { passive: true });

      header.addEventListener('touchmove', () => {
        touchMoved = true;
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }, { passive: true });

      header.addEventListener('touchend', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }, { passive: true });

      // Mouse: Right-click (contextmenu)
      header.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._handleHold();
      });
    }
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
    const hideSlider = this.config.hide_slider || false;
    
    // Status Text
    let statusText = this._t('closed');
    if (pos === 100) statusText = this._t('open');
    else if (pos > 0) statusText = `${pos}${this._t('open_percent')}`;
    
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
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3);
          padding: 16px;
          color: white;
          user-select: none;
        }
        
        .header {
            display: flex; gap: 16px; align-items: center; margin-bottom: 16px;
        }
        .icon-box {
            width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
            background: ${isOpen 
                ? 'linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1))' 
                : 'linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1))'};
            color: ${isOpen ? '#60a5fa' : 'rgba(255,255,255,0.4)'};
            display: flex; align-items: center; justify-content: center;
            box-shadow: ${isOpen 
                ? 'inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 4px rgba(255, 255, 255, 0.03)' 
                : '4px 4px 10px rgba(0, 0, 0, 0.5), -2px -2px 6px rgba(255, 255, 255, 0.03), inset 0 1px 2px rgba(255, 255, 255, 0.05)'};
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease;
        }
        .icon-box ha-icon {
            width: 22px; height: 22px; --mdc-icon-size: 22px;
            ${isOpen ? 'filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.6));' : ''}
        }
        .info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 40px;
        }
        .title { font-size: 1.125rem; font-weight: 700; color: rgba(255, 255, 255, 0.9); line-height: 1; }
        .subtitle { font-size: 0.75rem; font-weight: 500; color: rgba(255, 255, 255, 0.6); text-transform: capitalize; margin-top: 2px; line-height: 1.2; }
        
        /* Inlet Slider Display (Interactive) */
        .slider-track {
            height: 12px; border-radius: 12px; 
            margin-bottom: ${hideSlider ? '0' : '16px'};
            background: rgba(20, 20, 20, 0.8);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            border-top: 1px solid rgba(0,0,0,0.4);
            position: relative; overflow: hidden;
            cursor: pointer; touch-action: none;
            display: ${hideSlider ? 'none' : 'block'};
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

        /* Responsive: Tablet (768px - 1400px) - includes iPad Pro */
        @media (max-width: 1400px) {
          .card {
            padding: 14px;
          }
          .header {
            margin-bottom: 14px;
          }
          .slider-track {
            height: 10px;
            margin-bottom: ${hideSlider ? '0' : '14px'};
          }
          .controls {
            gap: 10px;
          }
          .control-btn {
            height: 34px;
            border-radius: 10px;
          }
          .control-btn ha-icon {
            --mdc-icon-size: 18px;
          }
        }

        /* Responsive: Mobile (< 768px) */
        @media (max-width: 768px) {
          .card {
            padding: 12px;
            border-radius: 16px;
          }
          .header {
            margin-bottom: 12px;
          }
          .slider-track {
            height: 8px;
            margin-bottom: ${hideSlider ? '0' : '12px'};
            border-radius: 8px;
          }
          .slider-fill {
            border-radius: 8px;
          }
          .controls {
            gap: 8px;
          }
          .control-btn {
            height: 32px;
            border-radius: 8px;
          }
          .control-btn ha-icon {
            --mdc-icon-size: 16px;
          }
        }

      </style>
      <div class="card">
        <div class="header">
            <div class="icon-box">
                <ha-icon icon="mdi:window-shutter"></ha-icon>
            </div>
            <div class="info">
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
