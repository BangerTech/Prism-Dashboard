class PrismBambuCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.showCamera = false;
    this.hasRendered = false;
  }

  static getStubConfig() {
    return {
      entity: 'sensor.x1c_1',
      name: 'Bambu Lab Printer',
      camera_entity: 'camera.x1c_1',
      image: '/local/custom-components/images/prism-bambu-pic.png'
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: 'entity',
          label: 'Printer entity (e.g. sensor.x1c_1)',
          required: true,
          selector: { entity: {} }
        },
        {
          name: 'name',
          label: 'Printer name',
          selector: { text: {} }
        },
        {
          name: 'camera_entity',
          label: 'Camera entity (optional)',
          selector: { entity: { domain: 'camera' } }
        },
        {
          name: 'ams_entity',
          label: 'AMS entity (optional - if AMS data not in main entity)',
          selector: { entity: {} }
        },
        {
          name: 'temperature_sensor',
          label: 'Custom temperature sensor (optional)',
          selector: { entity: { domain: 'sensor' } }
        },
        {
          name: 'humidity_sensor',
          label: 'Custom humidity sensor (optional)',
          selector: { entity: { domain: 'sensor' } }
        },
        {
          name: 'image',
          label: 'Printer image path (optional)',
          selector: { text: {} }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    this.config = { ...config };
    if (!this.hasRendered) {
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.hasRendered) {
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    } else {
      this.render();
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
    // Cleanup if needed
  }

  setupListeners() {
    const viewToggle = this.shadowRoot?.querySelector('.view-toggle');
    if (viewToggle) {
      viewToggle.addEventListener('click', () => this.toggleView());
    }

    const pauseBtn = this.shadowRoot?.querySelector('.btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.handlePause());
    }

    const stopBtn = this.shadowRoot?.querySelector('.btn-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.handleStop());
    }

    const speedBtn = this.shadowRoot?.querySelector('.btn-speed');
    if (speedBtn) {
      speedBtn.addEventListener('click', () => this.handleSpeed());
    }
  }

  toggleView() {
    this.showCamera = !this.showCamera;
    this.render();
  }

  handlePause() {
    if (!this._hass || !this.config.entity) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this.config.entity }
    });
    this.dispatchEvent(event);
  }

  handleStop() {
    if (!this._hass || !this.config.entity) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this.config.entity }
    });
    this.dispatchEvent(event);
  }

  handleSpeed() {
    if (!this._hass || !this.config.entity) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this.config.entity }
    });
    this.dispatchEvent(event);
  }

  getPrinterData() {
    if (!this._hass || !this.config) {
      return this.getPreviewData();
    }

    const entityId = this.config.entity;
    const state = this._hass.states[entityId];
    const stateStr = state ? state.state : 'unavailable';
    const attributes = state ? state.attributes : {};
    
    // Read ALL data from printer entity attributes (like official bambu-lab cards)
    // Entity name format: X1C_1, bambu_lab_printer, etc.
    
    const progress = parseFloat(attributes.print_progress || attributes.progress) || 0;
    const printTimeLeft = attributes.remaining_time || attributes.print_time_left || '0m';
    const printEndTime = attributes.end_time || attributes.print_end_time || '--:--';
    
    // Temperatures - try main entity first, then custom sensor if configured
    let nozzleTemp, targetNozzleTemp, bedTemp, targetBedTemp, chamberTemp;
    
    if (this.config.temperature_sensor) {
      // Use custom temperature sensor if configured
      const tempSensor = this._hass.states[this.config.temperature_sensor];
      nozzleTemp = tempSensor ? parseFloat(tempSensor.state) || 0 : 0;
      targetNozzleTemp = tempSensor?.attributes?.target || 0;
    } else {
      // Use main entity attributes
      nozzleTemp = parseFloat(attributes.nozzle_temp || attributes.nozzle) || 0;
      targetNozzleTemp = parseFloat(attributes.target_nozzle_temp || attributes.target_nozzle) || 0;
    }
    
    bedTemp = parseFloat(attributes.bed_temp || attributes.bed) || 0;
    targetBedTemp = parseFloat(attributes.target_bed_temp || attributes.target_bed) || 0;
    chamberTemp = parseFloat(attributes.chamber_temp || attributes.chamber) || 0;
    
    // Fans
    const partFanSpeed = parseFloat(attributes.cooling_fan_speed || attributes.cooling || attributes.fan_speed) || 0;
    const auxFanSpeed = parseFloat(attributes.aux_fan_speed || attributes.aux) || 0;
    
    // Layer
    const currentLayer = parseInt(attributes.current_layer) || 0;
    const totalLayers = parseInt(attributes.total_layer_count || attributes.total_layers) || 0;
    
    const name = this.config.name || (state ? state.attributes.friendly_name : null) || 'Bambu Lab Printer';
    
    // Camera
    const cameraEntity = this.config.camera_entity;
    const cameraState = cameraEntity ? this._hass.states[cameraEntity] : null;
    const cameraImage = cameraState?.attributes?.entity_picture || null;
    
    // Image path - support both .png and .jpg
    let printerImg = this.config.image;
    if (!printerImg) {
      // Try .png first, will have fallback in HTML to try .jpg if .png fails
      printerImg = '/local/custom-components/images/prism-bambu-pic.png';
    }

    // AMS Data - Read from printer entity attributes OR separate AMS entity
    let amsData = [];
    
    // Try different attribute names for AMS data
    let amsSource = attributes.ams || attributes.ams_data || attributes.ams_slots || [];
    
    // If no AMS data in main entity, try separate AMS entity if configured
    if ((!Array.isArray(amsSource) || amsSource.length === 0) && this.config.ams_entity) {
      const amsState = this._hass.states[this.config.ams_entity];
      if (amsState && amsState.attributes) {
        amsSource = amsState.attributes.ams || amsState.attributes.ams_data || amsState.attributes.ams_slots || [];
      }
    }
    
    if (Array.isArray(amsSource) && amsSource.length > 0) {
      amsData = amsSource.map((slot, index) => {
        // Support different attribute formats
        const type = slot.type || slot.filament_type || slot.name || '';
        const color = slot.color || slot.filament_color || '#666666';
        const remaining = parseFloat(slot.remaining || slot.remaining_filament || slot.remain) || 0;
        const active = slot.active || slot.is_active || slot.tray_active || false;
        const empty = slot.empty || (!type);
        
        return {
          id: index + 1,
          type,
          color,
          remaining,
          active,
          empty
        };
      });
    }
    
    // If no AMS data found or all empty, use preview data
    if (amsData.length === 0 || amsData.every(slot => slot.empty)) {
      amsData = [
        { id: 1, type: 'PLA', color: '#FF4444', remaining: 85, active: false },
        { id: 2, type: 'PETG', color: '#4488FF', remaining: 42, active: true },
        { id: 3, type: 'ABS', color: '#111111', remaining: 12, active: false },
        { id: 4, type: 'TPU', color: '#FFFFFF', remaining: 0, active: false, empty: true }
      ];
    }

    // Ensure we have exactly 4 AMS slots
    while (amsData.length < 4) {
      amsData.push({ 
        id: amsData.length + 1, 
        type: '', 
        color: '#666666', 
        remaining: 0, 
        active: false, 
        empty: true 
      });
    }
    amsData = amsData.slice(0, 4); // Max 4 slots

    return {
      stateStr,
      progress,
      printTimeLeft,
      printEndTime,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      chamberTemp,
      partFanSpeed,
      auxFanSpeed,
      currentLayer,
      totalLayers,
      name,
      cameraEntity,
      cameraImage,
      printerImg,
      amsData
    };
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
      currentLayer: 12,
      totalLayers: 28,
      name: this.config?.name || 'Bambu Lab Printer',
      cameraEntity: null,
      cameraImage: null,
      printerImg: this.config?.image || '/local/custom-components/images/prism-bambu-pic.png',
      amsData: [
        { id: 1, type: 'PLA', color: '#FF4444', remaining: 85, active: false },
        { id: 2, type: 'PETG', color: '#4488FF', remaining: 42, active: true },
        { id: 3, type: 'ABS', color: '#111111', remaining: 12, active: false },
        { id: 4, type: 'TPU', color: '#FFFFFF', remaining: 0, active: false, empty: true }
      ]
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
        .printer-icon {
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
            border-radius: 50%;
            background-color: rgba(0, 174, 66, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00AE42;
            border: 1px solid rgba(0, 174, 66, 0.2);
            box-shadow: inset 0 0 10px rgba(0, 174, 66, 0.1);
            flex-shrink: 0;
        }
        .printer-icon ha-icon {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
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
            background-color: ${data.stateStr === 'printing' ? '#22c55e' : 'rgba(255,255,255,0.2)'};
            animation: ${data.stateStr === 'printing' ? 'pulse 2s infinite' : 'none'};
        }
        .status-text {
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: ${data.stateStr === 'printing' ? '#4ade80' : 'rgba(255,255,255,0.6)'};
        }
        
        /* AMS Grid */
        .ams-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
            z-index: 20;
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
        
        /* Main Visual */
        .main-visual {
            position: relative;
            flex: 1;
            border-radius: 24px;
            background-color: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
            overflow: hidden;
            margin-bottom: 24px;
            min-height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
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
            padding: 32px;
            box-sizing: border-box;
        }
        .camera-feed {
            width: 100%;
            height: 100%;
            object-fit: cover;
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
        .btn {
            height: 48px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 700;
            font-size: 14px;
        }
        .btn ha-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .btn-secondary {
            background-color: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.6);
        }
        .btn-secondary:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        .btn-primary {
            grid-column: span 2;
            background-color: rgba(20, 20, 20, 0.8);
            color: #00AE42;
            gap: 8px;
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(0, 0, 0, 0.2);
        }
        .btn-primary:hover {
            color: #00c94d;
            background-color: rgba(20, 20, 20, 0.9);
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
                <div class="printer-icon">
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
        </div>

        <div class="ams-grid">
            ${data.amsData.map(slot => `
                <div class="ams-slot ${slot.active ? 'active' : ''}">
                    <div class="spool-visual">
                        ${!slot.empty ? `
                            <div class="filament" style="background-color: ${slot.color}"></div>
                            <div class="remaining-badge">${slot.remaining}%</div>
                        ` : ''}
                        <div class="spool-center"></div>
                    </div>
                    <div class="ams-info">
                        <div class="ams-type">${slot.empty ? 'Empty' : slot.type}</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="main-visual">
            ${data.cameraEntity && this.showCamera ? `
                <div class="view-toggle">
                    <ha-icon icon="mdi:image"></ha-icon>
                </div>
                ${data.cameraImage ? `
                    <img src="${data.cameraImage}" class="camera-feed" />
                ` : `
                    <ha-camera-stream
                        .hass=${this._hass}
                        .stateObj=${this._hass?.states[data.cameraEntity]}
                        class="camera-feed"
                    ></ha-camera-stream>
                `}
            ` : `
                <div class="view-toggle">
                    <ha-icon icon="${data.cameraEntity ? 'mdi:video' : 'mdi:image'}"></ha-icon>
                </div>
                <img src="${data.printerImg}" class="printer-img" onerror="this.onerror=null; if(this.src.endsWith('.png')) { this.src=this.src.replace('.png', '.jpg'); } else if(this.src.endsWith('.jpg')) { this.src=this.src.replace('.jpg', '.png'); } else { this.style.display='none'; this.nextElementSibling.style.display='flex'; }" />
                <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 14px;">
                  <ha-icon icon="mdi:printer-3d" style="width: 64px; height: 64px;"></ha-icon>
                </div>
                
                <div class="overlay-left">
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.partFanSpeed}%</span>
                            <span class="pill-label">Part</span>
                        </div>
                    </div>
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:weather-windy"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.auxFanSpeed}%</span>
                            <span class="pill-label">Aux</span>
                        </div>
                    </div>
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
                            <span class="pill-label">Cham</span>
                        </div>
                    </div>
                </div>
            `}
        </div>

        <div class="stats-row">
            <div class="stat-group">
                <span class="stat-label">Time Left</span>
                <span class="stat-val">${data.printTimeLeft}</span>
            </div>
            <div class="stat-group" style="align-items: flex-end;">
                <span class="stat-label">Layer</span>
                <span class="stat-val">${data.currentLayer} <span style="font-size: 0.875rem; opacity: 0.4;">/ ${data.totalLayers}</span></span>
            </div>
        </div>

        <div class="progress-bar-container">
            <div class="progress-bar-fill"></div>
            <div class="progress-text">${data.progress}%</div>
        </div>

        <div class="controls">
            <button class="btn btn-secondary btn-speed">
                <ha-icon icon="mdi:speedometer"></ha-icon>
            </button>
            <button class="btn btn-secondary btn-stop">
                <ha-icon icon="mdi:stop"></ha-icon>
            </button>
            <button class="btn btn-primary btn-pause">
                <ha-icon icon="mdi:pause"></ha-icon>
                Pause Print
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

