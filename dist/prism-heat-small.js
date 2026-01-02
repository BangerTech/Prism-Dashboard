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
            width: 38px; 
            height: 38px; 
            min-width: 38px;
            border-radius: 50%;
            background: ${isHeating ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255,255,255,0.05)'}; 
            color: ${isHeating ? '#fb923c' : 'rgba(255,255,255,0.4)'};
            display: flex; 
            align-items: center; 
            justify-content: center;
            box-shadow: ${isHeating ? '0 0 15px rgba(249,115,22,0.3)' : 'none'};
            transition: all 0.5s ease;
            ${isHeating ? 'filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.6));' : ''}
        }
        .icon-box ha-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            --mdc-icon-size: 20px;
            line-height: 0;
        }
        
        .info { 
            display: flex; 
            flex-direction: column; 
            justify-content: center;
        }
        .title { 
            font-size: 15px; 
            font-weight: 700; 
            color: #e0e0e0; 
            line-height: 1.2; 
        }
        .subtitle { 
            font-size: 12px; 
            font-weight: 500; 
            color: #999; 
            margin-top: 2px; 
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
            background: linear-gradient(145deg, #2d3035, #1e2024);
            border: 1px solid rgba(255,255,255,0.08);
            border-top: 1px solid rgba(255,255,255,0.12);
            border-bottom: 1px solid rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; color: rgba(255,255,255,0.7);
            box-shadow: 
              4px 4px 10px rgba(0,0,0,0.5),
              -2px -2px 6px rgba(255,255,255,0.03),
              inset 0 1px 2px rgba(255,255,255,0.05);
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
              inset 1px 1px 3px rgba(0, 0, 0, 0.4),
              inset -1px -1px 2px rgba(255, 255, 255, 0.03);
            pointer-events: none;
        }
        .control-btn:active {
            background: linear-gradient(145deg, #1a1c1e, #222528);
            box-shadow: 
              inset 3px 3px 8px rgba(0,0,0,0.8), 
              inset -1px -1px 3px rgba(255,255,255,0.03);
            border-top: 1px solid rgba(0,0,0,0.4);
            border-bottom: 1px solid rgba(255,255,255,0.05);
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
