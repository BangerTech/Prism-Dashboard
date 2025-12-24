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
    const title = attr.media_title || 'No Media';
    const artist = attr.media_artist || attr.media_series_title || 'Idle';
    const art = attr.entity_picture; // This usually returns e.g. /api/media_player_proxy/...
    const vol = (attr.volume_level || 0) * 100;
    const isPlaying = this._entity ? this._entity.state === 'playing' : false;
    const playingColor = this.config.playing_color || "#60a5fa";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          position: relative;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.8);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0,0,0,0.05);
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
        .title { font-size: 18px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1a1a1a; }
        .artist { font-size: 14px; color: rgba(0,0,0,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px; }
        
        .volume-container {
            margin-top: 12px; display: flex; align-items: center; gap: 12px;
        }
        .vol-icon { --mdc-icon-size: 20px; color: rgba(0,0,0,0.5); }
        
        .volume-slider {
            flex: 1; height: 16px; border-radius: 16px;
            background: rgba(240, 240, 240, 0.9);
            box-shadow: inset 2px 2px 5px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.1);
            border-bottom: 1px solid rgba(0,0,0,0.05);
            border-top: 1px solid rgba(255,255,255,0.6);
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
            background: rgba(0,0,0,0.03); 
            border: 1px solid rgba(0,0,0,0.05);
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
                <div class="artist">${artist}</div>
                
                <div class="volume-container">
                    <ha-icon class="vol-icon" icon="mdi:volume-high"></ha-icon>
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