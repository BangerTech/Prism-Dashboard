
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
            display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
        }
        .icon-box {
            width: 42px; height: 42px; border-radius: 50%;
            background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.4);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            flex-shrink: 0;
            transition: all 0.3s ease;
        }
        .icon-box.active.heat {
            background: rgba(251, 146, 60, 0.2); color: #fb923c;
            filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.6));
        }
        .icon-box.active.auto {
            background: rgba(74, 222, 128, 0.2); color: #4ade80;
            filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.6));
        }
        .icon-box.active.cool {
            background: rgba(96, 165, 250, 0.2); color: #60a5fa;
            filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.6));
        }
        .icon-box.active.off {
            background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.4);
            filter: none;
        }

        .title-area { flex: 1; min-width: 0; overflow: hidden; }
        .title { font-size: 18px; font-weight: 500; color: #e0e0e0; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .subtitle { font-size: 13px; color: #9ca3af; line-height: 1.2; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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
            height: 48px; border-radius: 12px; background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.05);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; color: rgba(255,255,255,0.6);
            overflow: hidden; min-width: 0;
        }
        .mode-btn:active, .mode-btn.active {
            background: rgba(20, 20, 20, 0.8);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
            border-top: 1px solid rgba(0,0,0,0.4);
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
