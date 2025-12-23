
class HeatingKnobCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._dragging = false;
    this._targetTemp = 20;
    this._currentTemp = 20;
    this._minTemp = 10;
    this._maxTemp = 30;
    this._state = 'off';
    this._lastInteraction = 0;
  }

  static getStubConfig() {
    return { entity: "climate.example", name: "Living Room" }
  }

  static getConfigElement() {
    return document.createElement("heating-knob-card-editor");
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    const entity = hass.states[this.config.entity];
    if (!entity) return;

    this._entity = entity;
    const newTarget = entity.attributes.temperature || 20;
    const newCurrent = entity.attributes.current_temperature || 20;
    const newState = entity.state || 'off';

    // Update state immediately if it changes
    if (this._state !== newState) {
        this._state = newState;
        this.render(); // Re-render for state change (color etc)
    }

    // Only update target temp if we are not dragging AND we haven't interacted recently (2s debounce)
    const now = Date.now();
    const isInteracting = this._dragging || (now - this._lastInteraction < 2000);

    if (!isInteracting && (this._targetTemp !== newTarget || this._currentTemp !== newCurrent)) {
      this._targetTemp = newTarget;
      this._currentTemp = newCurrent;
      this.render();
    }
  }

  getCardSize() {
    return 4;
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
    
    if(handle) handle.style.transform = `rotate(${rotation}deg)`;
    if(tempText) {
        tempText.style.transform = `rotate(${-rotation}deg)`;
    }
    if(tempVal) {
        tempVal.innerText = this._targetTemp.toFixed(1) + '°';
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
    console.log('HeatingKnobCard render v2');
    const isHeating = this._state === 'heat';
    const isAuto = this._state === 'auto';
    const isCooling = this._state === 'cool';
    const isOff = this._state === 'off';

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

        .title-area { flex: 1; }
        .title { font-size: 18px; font-weight: 500; color: #e0e0e0; line-height: 1.2; }
        .subtitle { font-size: 13px; color: #9ca3af; line-height: 1.2; margin-top: 2px; }

        .status-badge {
            padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase;
            background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.05);
        }
        .status-badge.heat { background: rgba(251, 146, 60, 0.1); color: #fb923c; }
        .status-badge.auto { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
        .status-badge.cool { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        
        .knob-container {
            position: relative; width: 100%; max-width: 250px; aspect-ratio: 1 / 1; margin: 0 auto 24px auto;
            display: flex; justify-content: center; align-items: center;
        }
        .inlet-track {
            position: absolute; inset: 6.4%; border-radius: 50%;
            background: rgba(20, 20, 20, 0.8);
            box-shadow: inset 3px 3px 6px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            border-top: 1px solid rgba(0,0,0,0.3);
        }
        svg {
            position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
            transform: rotate(135deg);
        }
        .knob-handle {
            position: absolute; width: 56%; height: 56%; border-radius: 50%;
            background: #25282e;
            box-shadow: 0 10px 20px rgba(0,0,0,0.5), inset 1px 1px 2px rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.05);
            display: flex; justify-content: center; align-items: center; cursor: pointer;
        }
        .indicator {
            position: absolute; top: 12px; width: 6px; height: 6px; border-radius: 50%;
            background: #fb923c; box-shadow: 0 0 8px rgba(251, 146, 60, 0.8);
        }
        .temp-display { text-align: center; }
        /* Explicitly set font size and avoid layout shift */
        .temp-val { font-size: 36px; font-weight: 700; color: white; line-height: 1; min-width: 80px; }
        .temp-label { font-size: 10px; text-transform: uppercase; color: rgba(255,255,255,0.4); letter-spacing: 1px; margin-top: 4px; }
        
        .controls {
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
        }
        .mode-btn {
            height: 48px; border-radius: 12px; background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.05);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s; color: rgba(255,255,255,0.6);
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
        .btn-label { font-size: 9px; font-weight: 700; text-transform: uppercase; margin-top: 2px; }

      </style>
      <div class="card">
        <div class="header">
            <div class="icon-box ${iconClass}">
                <ha-icon icon="mdi:heating-coil"></ha-icon>
            </div>
            <div class="title-area">
                <div class="title">${this.config.name || 'Heizung'}</div>
                <div class="subtitle">${currentModeText} · ${this._currentTemp.toFixed(1)} °C</div>
            </div>
        </div>
        
        <div class="knob-container" id="knob-container">
            <div class="inlet-track"></div>
            <svg viewBox="0 0 200 200">
                <defs>
                   <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" style="stop-color:#fb923c;stop-opacity:0.4" />
                     <stop offset="100%" style="stop-color:#fb923c;stop-opacity:1" />
                   </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="16" stroke-dasharray="${strokeDashArray}" stroke-linecap="round" />
                <circle id="active-arc" cx="100" cy="100" r="80" fill="none" stroke="url(#grad1)" stroke-width="16" 
                        stroke-dasharray="${strokeDashArray}" 
                        stroke-dashoffset="${dashOffset}" 
                        stroke-linecap="round" />
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

customElements.define('heating-knob-card', HeatingKnobCard);

class HeatingKnobCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this.render();
  }

  configChanged(newConfig) {
    const event = new Event("config-changed", {
      bubbles: true,
      composed: true,
    });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    if (!this._hass || !this._config) return;

    // Create structure if it doesn't exist
    if (!this.querySelector('ha-entity-picker')) {
        this.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">
            <ha-entity-picker
              label="Entity (Climate)"
              allow-custom-entity
            ></ha-entity-picker>
            <ha-textfield
              label="Name (Optional)"
            ></ha-textfield>
          </div>
        `;

        // Add listeners
        const picker = this.querySelector('ha-entity-picker');
        picker.addEventListener('value-changed', (e) => {
            const newConfig = { ...this._config, entity: e.detail.value };
            this.configChanged(newConfig);
        });

        const textField = this.querySelector('ha-textfield');
        textField.addEventListener('input', (e) => {
            const newConfig = { ...this._config, name: e.target.value };
            this.configChanged(newConfig);
        });
    }

    // Update properties
    const picker = this.querySelector('ha-entity-picker');
    if (picker) {
        picker.hass = this._hass;
        picker.value = this._config.entity;
        picker.includeDomains = ['climate'];
    }

    const textField = this.querySelector('ha-textfield');
    if (textField) {
        textField.value = this._config.name || '';
    }
  }
}

customElements.define("heating-knob-card-editor", HeatingKnobCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "heating-knob-card",
  name: "Heating Knob Card",
  preview: true,
  description: "A custom thermostat knob card"
});
