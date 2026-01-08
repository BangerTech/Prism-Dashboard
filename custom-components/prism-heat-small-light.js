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

  // Translation helper - English default, German if HA is set to German
  _t(key) {
    const lang = this._hass?.language || this._hass?.locale?.language || 'en';
    const isGerman = lang.startsWith('de');
    
    const translations = {
      'off': isGerman ? 'Aus' : 'Off',
      'auto': isGerman ? 'Auto' : 'Auto',
      'heating': isGerman ? 'Heizen' : 'Heating',
      'cooling': isGerman ? 'Kühlen' : 'Cooling',
      'dry': isGerman ? 'Entfeuchten' : 'Dry',
      'fan': isGerman ? 'Lüfter' : 'Fan',
      'thermostat': isGerman ? 'Heizung' : 'Thermostat'
    };
    
    return translations[key] || key;
  }

  // Get state color based on HVAC mode
  _getStateColor(state) {
    const colors = {
      heat: '#fb923c',
      heating: '#fb923c',
      cool: '#60a5fa',
      cooling: '#60a5fa',
      dry: '#22d3ee',
      fan_only: '#64748b',
      heat_cool: '#a78bfa',
      auto: '#4ade80'
    };
    return colors[state] || 'rgba(0,0,0,0.4)';
  }

  // Get state background color (lighter version for light theme)
  _getStateBgColor(state) {
    const colors = {
      heat: 'rgba(249, 115, 22, 0.15)',
      heating: 'rgba(249, 115, 22, 0.15)',
      cool: 'rgba(96, 165, 250, 0.15)',
      cooling: 'rgba(96, 165, 250, 0.15)',
      dry: 'rgba(34, 211, 238, 0.15)',
      fan_only: 'rgba(100, 116, 139, 0.15)',
      heat_cool: 'rgba(167, 139, 250, 0.15)',
      auto: 'rgba(74, 222, 128, 0.15)'
    };
    return colors[state] || 'rgba(0,0,0,0.05)';
  }

  // Check if HVAC is actively doing something
  _isActive(state) {
    return ['heat', 'heating', 'cool', 'cooling', 'dry', 'fan_only', 'heat_cool', 'auto'].includes(state);
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
    this.shadowRoot.querySelectorAll('.control-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.changeTemp(action);
      });
    });

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
    const name = this.config.name || (this._entity ? attr.friendly_name : null) || this._t('thermostat');
    
    const isHeating = state === 'heat' || state === 'heating';
    const isCooling = state === 'cool' || state === 'cooling';
    const isDry = state === 'dry';
    const isFanOnly = state === 'fan_only';
    const isHeatCool = state === 'heat_cool';
    const isAuto = state === 'auto';
    const isActive = this._isActive(state);
    const stateColor = this._getStateColor(state);
    const stateBgColor = this._getStateBgColor(state);
    
    // Determine HVAC mode text
    let hvacMode = this._t('off');
    if (isHeating) hvacMode = this._t('heating');
    else if (isCooling) hvacMode = this._t('cooling');
    else if (isDry) hvacMode = this._t('dry');
    else if (isFanOnly) hvacMode = this._t('fan');
    else if (isHeatCool || isAuto) hvacMode = this._t('auto');
    
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
            align-items: flex-start; 
            margin-bottom: 16px;
        }
        .header-left { 
            display: flex; 
            align-items: center; 
            gap: 16px; 
        }
        
        .icon-box {
            width: 40px; 
            height: 40px; 
            min-width: 40px;
            min-height: 40px;
            border-radius: 50%;
            background: ${isActive ? stateBgColor : 'rgba(0,0,0,0.05)'}; 
            color: ${isActive ? stateColor : 'rgba(0,0,0,0.4)'};
            display: flex; 
            align-items: center; 
            justify-content: center;
            box-shadow: ${isActive ? `0 0 15px ${stateColor}33` : 'none'};
            transition: all 0.5s ease;
            ${isActive ? `filter: drop-shadow(0 0 6px ${stateColor}66);` : ''}
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
            height: 40px;
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
            padding: 4px 8px; 
            border-radius: 14px;
            background: linear-gradient(145deg, #f0f0f0, #ffffff);
            border: 1px solid rgba(255,255,255,0.8);
            box-shadow: 
              2px 2px 5px rgba(0,0,0,0.08),
              -2px -2px 5px rgba(255,255,255,0.9);
            display: flex; 
            align-items: center; 
            justify-content: center;
            gap: 4px;
            height: 22px;
            box-sizing: border-box;
            flex-shrink: 0;
        }
        .chip ha-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            --mdc-icon-size: 10px;
            line-height: 0;
            color: ${isActive ? stateColor : 'rgba(0,0,0,0.4)'};
        }
        .chip-text { 
            font-size: 9px; 
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

        /* Responsive: Tablet (768px - 1400px) - includes iPad Pro */
        @media (max-width: 1400px) {
          .card {
            padding: 14px;
          }
          .header {
            margin-bottom: 14px;
          }
          /* Chip kleiner machen */
          .chip {
            padding: 3px 6px;
            height: 18px;
            gap: 3px;
            border-radius: 12px;
          }
          .chip ha-icon {
            --mdc-icon-size: 9px;
          }
          .chip-text {
            font-size: 7px;
          }
          /* Controls anpassen */
          .controls {
            gap: 10px;
          }
          .control-btn {
            height: 34px;
            width: 44px;
            border-radius: 10px;
          }
          .control-btn::before {
            inset: 2px;
            border-radius: 8px;
          }
          .control-btn ha-icon {
            --mdc-icon-size: 18px;
          }
          .inlet-display {
            height: 34px;
            border-radius: 10px;
          }
          .temp-value {
            font-size: 18px;
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
          /* Chip noch kleiner auf Mobile */
          .chip {
            padding: 2px 5px;
            height: 16px;
            gap: 2px;
            border-radius: 10px;
          }
          .chip ha-icon {
            --mdc-icon-size: 8px;
          }
          .chip-text {
            font-size: 6px;
          }
          /* Controls anpassen */
          .controls {
            gap: 8px;
          }
          .control-btn {
            height: 32px;
            width: 40px;
            border-radius: 8px;
          }
          .control-btn::before {
            inset: 2px;
            border-radius: 6px;
          }
          .control-btn ha-icon {
            --mdc-icon-size: 16px;
          }
          .inlet-display {
            height: 32px;
            border-radius: 8px;
          }
          .temp-value {
            font-size: 16px;
          }
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
