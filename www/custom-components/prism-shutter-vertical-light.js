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