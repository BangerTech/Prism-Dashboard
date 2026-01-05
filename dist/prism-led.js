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
