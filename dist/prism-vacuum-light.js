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
