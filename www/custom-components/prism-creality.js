// Creality Manufacturer and Models for device filtering
// Based on Creality-Control integration (https://github.com/SiloCityLabs/Creality-Control)
const CREALITY_MANUFACTURER = 'Creality';
const CREALITY_PRINTER_MODELS = [
  // K-Series (FDM)
  'K1', 'K1C', 'K1 Max', 'K1 SE', 'K1SE', 'K1 MAX',
  'K2 Plus', 'K2 Pro', 'K2_PLUS', 'K2_PRO',
  // Halot Series (Resin)
  'Halot', 'Halot One', 'Halot Max', 'Halot Sky',
  // Generic
  'Creality Printer', 'Creality'
];

// Entity keys to look for (based on Creality-Control sensor.py)
const ENTITY_KEYS = [
  // Print Status
  'state', 'deviceState', 'printProgress', 'layer', 'TotalLayer', 
  'printLeftTime', 'printJobTime', 'printFileName', 'printId',
  // Temperatures
  'nozzleTemp', 'targetNozzleTemp', 'bedTemp0', 'targetBedTemp0', 'boxTemp',
  // Fans
  'fan', 'fanAuxiliary', 'fanCase', 'auxiliaryFanPct', 'caseFanPct', 'modelFanPct',
  // Position & Speed
  'curPosition', 'realTimeSpeed', 'realTimeFlow', 'curFeedratePct', 'curFlowratePct',
  // Material
  'usedMaterialLength', 'materialDetect', 'materialStatus',
  // System
  'model', 'hostname', 'modelVersion', 'connect', 'tfCard', 'video',
  // Light
  'lightSw',
  // AI Features
  'aiDetection', 'aiFirstFloor', 'aiPausePrint', 'aiSw',
  // Error
  'err', 'powerLoss'
];

class PrismCrealityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.showCamera = false;
    this.hasRendered = false;
    this._deviceEntities = {}; // Cache for device entities
    this._lastStatus = null; // Track status for re-render decisions
  }

  static getStubConfig() {
    return {
      printer: '',
      name: 'Creality Printer',
      camera_entity: '',
      image: '/local/community/Prism-Dashboard/images/printer-blank.jpg'
    };
  }

  static getConfigForm() {
    // Build filter for printer device selector
    const printerFilterCombinations = CREALITY_PRINTER_MODELS.map(model => ({
      manufacturer: CREALITY_MANUFACTURER,
      model: model
    }));

    return {
      schema: [
        {
          name: 'printer',
          label: 'Creality Printer (select your printer device)',
          required: true,
          selector: { device: { filter: printerFilterCombinations } }
        },
        {
          name: 'name',
          label: 'Printer name (optional)',
          selector: { text: {} }
        },
        {
          name: 'camera_entity',
          label: 'Camera entity (e.g. camera.creality_k1_se_camera)',
          selector: { entity: { domain: 'camera' } }
        },
        {
          name: 'light_switch',
          label: 'Light switch entity (e.g. switch.creality_light)',
          selector: { entity: { domain: ['light', 'switch'] } }
        },
        {
          name: 'image',
          label: 'Printer image path (optional, supports .png, .jpg, .webp)',
          selector: { text: {} }
        },
        {
          name: 'custom_humidity',
          label: 'Custom humidity sensor (optional)',
          selector: { entity: { domain: 'sensor', device_class: 'humidity' } }
        },
        {
          name: 'custom_temperature',
          label: 'Custom temperature sensor (optional)',
          selector: { entity: { domain: 'sensor', device_class: 'temperature' } }
        },
        {
          name: 'power_switch',
          label: 'Power switch (optional)',
          selector: { entity: { domain: 'switch' } }
        },
        {
          name: 'power_switch_icon',
          label: 'Power switch icon (default: mdi:power)',
          selector: { icon: {} }
        },
        // Multi-Printer View section
        {
          type: 'expandable',
          name: '',
          title: 'Multi-Printer Camera View',
          schema: [
            {
              name: 'multi_printer_enabled',
              label: 'Enable Multi-Printer View (show multiple printers in camera popup)',
              selector: { boolean: {} }
            },
            {
              name: 'multi_printer_2',
              label: 'Printer 2 (optional)',
              selector: { device: { filter: printerFilterCombinations } }
            },
            {
              name: 'multi_camera_2',
              label: 'Printer 2 Camera (auto-detected if not set)',
              selector: { entity: { domain: 'camera' } }
            },
            {
              name: 'multi_name_2',
              label: 'Printer 2 Name (optional)',
              selector: { text: {} }
            },
            {
              name: 'multi_printer_3',
              label: 'Printer 3 (optional)',
              selector: { device: { filter: printerFilterCombinations } }
            },
            {
              name: 'multi_camera_3',
              label: 'Printer 3 Camera (auto-detected if not set)',
              selector: { entity: { domain: 'camera' } }
            },
            {
              name: 'multi_name_3',
              label: 'Printer 3 Name (optional)',
              selector: { text: {} }
            },
            {
              name: 'multi_printer_4',
              label: 'Printer 4 (optional)',
              selector: { device: { filter: printerFilterCombinations } }
            },
            {
              name: 'multi_camera_4',
              label: 'Printer 4 Camera (auto-detected if not set)',
              selector: { entity: { domain: 'camera' } }
            },
            {
              name: 'multi_name_4',
              label: 'Printer 4 Name (optional)',
              selector: { text: {} }
            }
          ]
        }
      ]
    };
  }

  // Find all entities belonging to this device
  getCrealityDeviceEntities() {
    if (!this._hass || !this.config?.printer) return {};
    
    const deviceId = this.config.printer;
    const result = {};
    
    // Loop through all hass entities and find those belonging to our device
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      
      if (entityInfo.device_id === deviceId) {
        // Check if this entity matches one of our known keys or is from creality_control
        if (entityInfo.platform === 'creality_control') {
          const translationKey = entityInfo.translation_key;
          if (translationKey && ENTITY_KEYS.includes(translationKey)) {
            result[translationKey] = {
              entity_id: entityId,
              ...entityInfo
            };
          }
          // Also store by simple name for easier access
          result[entityId] = entityInfo;
        }
      }
    }
    
    return result;
  }

  // Get entity by name pattern (searches entity_id)
  // First tries device-bound entities, then falls back to platform-based search
  findEntityByPattern(pattern, domain = null) {
    if (!this._hass) return null;
    
    const deviceId = this.config?.printer;
    
    // First pass: Look for entities bound to our device
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      if (entityInfo.device_id === deviceId && entityId.toLowerCase().includes(pattern.toLowerCase())) {
        if (domain) {
          const entityDomain = entityId.split('.')[0];
          if (entityDomain === domain) {
            return entityId;
          }
        } else {
          return entityId;
        }
      }
    }
    
    // Second pass: Look for creality_control platform entities (they may not be bound to device)
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      // Check if it's from creality_control platform and matches pattern
      if (entityInfo.platform === 'creality_control' && entityId.toLowerCase().includes(pattern.toLowerCase())) {
        if (domain) {
          const entityDomain = entityId.split('.')[0];
          if (entityDomain === domain) {
            return entityId;
          }
        } else {
          return entityId;
        }
      }
    }
    
    // Third pass: Look for any entity with "creality" in name and matching pattern
    for (const entityId in this._hass.entities) {
      if (entityId.toLowerCase().includes('creality') && entityId.toLowerCase().includes(pattern.toLowerCase())) {
        if (domain) {
          const entityDomain = entityId.split('.')[0];
          if (entityDomain === domain) {
            return entityId;
          }
        } else {
          return entityId;
        }
      }
    }
    
    return null;
  }

  // Find entity by pattern with specific domain preference (tries domain first, then falls back)
  findEntityByPatternPreferDomain(pattern, preferredDomain) {
    // First try with the preferred domain
    const withDomain = this.findEntityByPattern(pattern, preferredDomain);
    if (withDomain) return withDomain;
    
    // Fall back to any matching entity
    return this.findEntityByPattern(pattern);
  }

  // Get entity state by entity_id
  getEntityStateById(entityId) {
    if (!entityId || !this._hass) return null;
    const state = this._hass.states[entityId];
    return state?.state ?? null;
  }

  // Get entity numeric value by entity_id
  getEntityValueById(entityId) {
    const state = this.getEntityStateById(entityId);
    return state ? parseFloat(state) || 0 : 0;
  }

  // Get entity state by translation key
  getEntityState(key) {
    const entityInfo = this._deviceEntities[key];
    if (!entityInfo?.entity_id) return null;
    const state = this._hass.states[entityInfo.entity_id];
    return state?.state ?? null;
  }

  // Get entity numeric value
  getEntityValue(key) {
    const state = this.getEntityState(key);
    return state ? parseFloat(state) || 0 : 0;
  }

  // Get device entities for any printer (by device ID) - for multi-printer view
  getDeviceEntitiesForPrinter(deviceId) {
    if (!this._hass || !deviceId) return {};
    
    const result = {};
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      
      if (entityInfo.device_id === deviceId) {
        if (entityInfo.platform === 'creality_control') {
          const translationKey = entityInfo.translation_key;
          if (translationKey && ENTITY_KEYS.includes(translationKey)) {
            result[translationKey] = {
              entity_id: entityId,
              ...entityInfo
            };
          }
          result[entityId] = entityInfo;
        }
      }
    }
    return result;
  }

  // Get entity state for a specific device's entities
  getEntityStateForDevice(deviceEntities, key) {
    const entityInfo = deviceEntities[key];
    if (!entityInfo?.entity_id) return null;
    const state = this._hass.states[entityInfo.entity_id];
    return state?.state ?? null;
  }

  // Get entity value for a specific device
  getEntityValueForDevice(deviceEntities, key) {
    const state = this.getEntityStateForDevice(deviceEntities, key);
    return state ? parseFloat(state) || 0 : 0;
  }

  // Find entity by pattern for a specific device
  findEntityByPatternForDevice(deviceId, pattern, domain = null) {
    if (!this._hass || !deviceId) return null;
    
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      if (entityInfo.device_id === deviceId && entityId.toLowerCase().includes(pattern.toLowerCase())) {
        if (domain) {
          const entityDomain = entityId.split('.')[0];
          if (entityDomain === domain) return entityId;
        } else {
          return entityId;
        }
      }
    }
    return null;
  }

  // Get printer data for any device (by device ID) - for multi-printer view
  getPrinterDataForDevice(deviceId, customCameraEntity, customName) {
    if (!this._hass || !deviceId) {
      return {
        name: customName || 'Unknown Printer',
        progress: 0,
        stateStr: 'unavailable',
        isPrinting: false,
        isPaused: false,
        isIdle: true,
        printTimeLeft: '--',
        currentLayer: 0,
        totalLayers: 0,
        nozzleTemp: 0,
        targetNozzleTemp: 0,
        bedTemp: 0,
        targetBedTemp: 0,
        chamberTemp: 0,
        cameraEntity: null
      };
    }

    const deviceEntities = this.getDeviceEntitiesForPrinter(deviceId);
    
    // Get print status - Creality uses 'state' or 'deviceState'
    let stateStr = 'unavailable';
    const stateEntity = this.findEntityByPatternForDevice(deviceId, 'state', 'sensor');
    if (stateEntity) {
      stateStr = this._hass.states[stateEntity]?.state || 'unavailable';
    }
    
    const statusLower = stateStr.toLowerCase();
    const isPrinting = ['printing', 'prepare', 'running', 'druckt'].includes(statusLower);
    const isPaused = ['paused', 'pause', 'pausiert'].includes(statusLower);
    const isIdle = !isPrinting && !isPaused;

    // Progress
    let progress = 0;
    const progressEntity = this.findEntityByPatternForDevice(deviceId, 'printprogress', 'sensor') ||
                          this.findEntityByPatternForDevice(deviceId, 'progress', 'sensor');
    if (progressEntity) {
      progress = parseFloat(this._hass.states[progressEntity]?.state) || 0;
    }

    // Remaining time
    let printTimeLeft = '--';
    const timeEntity = this.findEntityByPatternForDevice(deviceId, 'printlefttime', 'sensor') ||
                       this.findEntityByPatternForDevice(deviceId, 'lefttime', 'sensor');
    if (timeEntity && (isPrinting || isPaused)) {
      const minutes = parseFloat(this._hass.states[timeEntity]?.state) || 0;
      if (minutes > 0) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        printTimeLeft = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
    }

    // Layer info
    let currentLayer = 0;
    let totalLayers = 0;
    if (isPrinting || isPaused) {
      const layerEntity = this.findEntityByPatternForDevice(deviceId, '_layer', 'sensor');
      const totalLayerEntity = this.findEntityByPatternForDevice(deviceId, 'totallayer', 'sensor');
      if (layerEntity) currentLayer = parseInt(this._hass.states[layerEntity]?.state) || 0;
      if (totalLayerEntity) totalLayers = parseInt(this._hass.states[totalLayerEntity]?.state) || 0;
    }

    // Temperatures
    let nozzleTemp = 0, targetNozzleTemp = 0, bedTemp = 0, targetBedTemp = 0, chamberTemp = 0;
    
    const nozzleTempEntity = this.findEntityByPatternForDevice(deviceId, 'nozzletemp', 'sensor');
    const targetNozzleEntity = this.findEntityByPatternForDevice(deviceId, 'targetnozzle', 'sensor');
    const bedTempEntity = this.findEntityByPatternForDevice(deviceId, 'bedtemp', 'sensor');
    const targetBedEntity = this.findEntityByPatternForDevice(deviceId, 'targetbed', 'sensor');
    const boxTempEntity = this.findEntityByPatternForDevice(deviceId, 'boxtemp', 'sensor');
    
    if (nozzleTempEntity) nozzleTemp = parseFloat(this._hass.states[nozzleTempEntity]?.state) || 0;
    if (targetNozzleEntity) targetNozzleTemp = parseFloat(this._hass.states[targetNozzleEntity]?.state) || 0;
    if (bedTempEntity) bedTemp = parseFloat(this._hass.states[bedTempEntity]?.state) || 0;
    if (targetBedEntity) targetBedTemp = parseFloat(this._hass.states[targetBedEntity]?.state) || 0;
    if (boxTempEntity) chamberTemp = parseFloat(this._hass.states[boxTempEntity]?.state) || 0;

    // Camera entity
    let cameraEntity = customCameraEntity;
    if (!cameraEntity) {
      cameraEntity = this.findEntityByPatternForDevice(deviceId, 'camera', 'camera');
    }
    if (cameraEntity && !cameraEntity.startsWith('camera.')) {
      cameraEntity = null;
    }

    // Device name
    const device = this._hass.devices?.[deviceId];
    const name = customName || device?.name || 'Creality Printer';

    return {
      deviceId,
      name,
      progress,
      stateStr,
      isPrinting,
      isPaused,
      isIdle,
      printTimeLeft,
      currentLayer,
      totalLayers,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      chamberTemp,
      cameraEntity
    };
  }

  // Get all configured printers for multi-view
  getMultiPrinterConfigs() {
    const printers = [];
    
    // Primary printer (always included)
    if (this.config.printer) {
      printers.push({
        deviceId: this.config.printer,
        cameraEntity: this.config.camera_entity,
        name: this.config.name,
        index: 1
      });
    }
    
    // Additional printers (only if multi-printer is enabled)
    if (this.config.multi_printer_enabled) {
      if (this.config.multi_printer_2) {
        printers.push({
          deviceId: this.config.multi_printer_2,
          cameraEntity: this.config.multi_camera_2,
          name: this.config.multi_name_2,
          index: 2
        });
      }
      if (this.config.multi_printer_3) {
        printers.push({
          deviceId: this.config.multi_printer_3,
          cameraEntity: this.config.multi_camera_3,
          name: this.config.multi_name_3,
          index: 3
        });
      }
      if (this.config.multi_printer_4) {
        printers.push({
          deviceId: this.config.multi_printer_4,
          cameraEntity: this.config.multi_camera_4,
          name: this.config.multi_name_4,
          index: 4
        });
      }
    }
    
    return printers;
  }

  setConfig(config) {
    // Don't throw error if printer is empty - show preview instead
    this.config = { ...config };
    this._deviceEntities = {}; // Reset cache
    if (!this.hasRendered) {
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    }
  }

  set hass(hass) {
    const firstTime = hass && !this._hass;
    const oldStatus = this._lastStatus;
    this._hass = hass;
    
    // Cache device entities on first hass assignment or if empty (only if printer is configured)
    if (this.config?.printer && (firstTime || Object.keys(this._deviceEntities).length === 0)) {
      this._deviceEntities = this.getCrealityDeviceEntities();
      console.log('Prism Creality: Found device entities:', Object.keys(this._deviceEntities));
    }
    
    // Get current status to detect changes
    const data = this.getPrinterData();
    const newStatus = `${data.isIdle}-${data.isPrinting}-${data.isPaused}-${!!data.lightEntity}-${!!data.cameraEntity}-${!!data.powerSwitch}-${data.isPowerOn}`;
    
    // Re-render if: first time, status changed, or never rendered
    if (!this.hasRendered || firstTime || oldStatus !== newStatus) {
      this._lastStatus = newStatus;
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    } else {
      // Only update dynamic values
      this.updateValues();
    }
  }

  // Update only the values that change, without re-rendering the entire card
  updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    
    const data = this.getPrinterData();
    
    // Update text values
    const updateText = (selector, value) => {
      const el = this.shadowRoot.querySelector(selector);
      if (el && el.textContent !== String(value)) {
        el.textContent = value;
      }
    };
    
    // Update progress bar
    const progressBar = this.shadowRoot.querySelector('.progress-bar-fill');
    if (progressBar) {
      progressBar.style.width = `${data.progress}%`;
    }
    
    const progressText = this.shadowRoot.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = `${Math.round(data.progress)}%`;
    }
    
    // Update title
    updateText('.title', data.name);
    
    // Update status
    updateText('.status-text', data.stateStr);
    
    // Update time left
    const timeValue = this.shadowRoot.querySelector('.stats-row .stat-value');
    if (timeValue) {
      timeValue.textContent = data.printTimeLeft;
    }
    
    // Update layer
    const layerValue = this.shadowRoot.querySelector('.stats-row .stat-value:last-of-type');
    if (layerValue) {
      layerValue.textContent = `${data.currentLayer} / ${data.totalLayers}`;
    }
    
    // Update temperatures and fans via pill values
    const pillValues = this.shadowRoot.querySelectorAll('.pill-value');
    if (pillValues.length >= 5) {
      pillValues[0].textContent = `${data.modelFanSpeed}%`;
      pillValues[1].textContent = `${data.auxFanSpeed}%`;
      pillValues[2].textContent = `${Math.round(data.nozzleTemp)}°`;
      pillValues[3].textContent = `${Math.round(data.bedTemp)}°`;
      pillValues[4].textContent = `${Math.round(data.chamberTemp)}°`;
    }
    
    // Update target temps
    const pillLabels = this.shadowRoot.querySelectorAll('.overlay-right .pill-label');
    if (pillLabels.length >= 2) {
      pillLabels[0].textContent = `/${Math.round(data.targetNozzleTemp)}°`;
      pillLabels[1].textContent = `/${Math.round(data.targetBedTemp)}°`;
    }
    
    // Update camera stream hass if it exists
    const cameraStream = this.shadowRoot.querySelector('ha-camera-stream');
    if (cameraStream && this._hass) {
      cameraStream.hass = this._hass;
      if (data.cameraEntity) {
        cameraStream.stateObj = this._hass.states[data.cameraEntity];
      }
    }
    
    // Update light button state from actual HA state
    if (data.lightEntity) {
      const lightBtn = this.shadowRoot.querySelector('.btn-light');
      if (lightBtn) {
        if (data.isLightOn) {
          lightBtn.classList.add('active');
        } else {
          lightBtn.classList.remove('active');
        }
      }
    }
    
    // Update power button state from actual HA state
    if (data.powerSwitch) {
      const powerBtn = this.shadowRoot.querySelector('.btn-power');
      if (powerBtn) {
        if (data.isPowerOn) {
          powerBtn.classList.remove('off');
          powerBtn.classList.add('on');
          powerBtn.title = 'Power Off';
        } else {
          powerBtn.classList.remove('on');
          powerBtn.classList.add('off');
          powerBtn.title = 'Power On';
        }
      }
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
    // Cleanup camera popup
    if (this._cameraPopupEscHandler) {
      document.removeEventListener('keydown', this._cameraPopupEscHandler);
      this._cameraPopupEscHandler = null;
    }
    if (this._cameraPopupUpdateInterval) {
      clearInterval(this._cameraPopupUpdateInterval);
      this._cameraPopupUpdateInterval = null;
    }
    // Close camera popup if open
    this.closeCameraPopup();
  }

  setupListeners() {
    // Use onclick to avoid duplicate event listeners when re-rendering
    const viewToggle = this.shadowRoot?.querySelector('.view-toggle');
    if (viewToggle) {
      viewToggle.onclick = () => this.toggleView();
    }

    const pauseBtn = this.shadowRoot?.querySelector('.btn-pause');
    if (pauseBtn) {
      pauseBtn.onclick = () => this.handlePause();
    }

    const stopBtn = this.shadowRoot?.querySelector('.btn-stop');
    if (stopBtn) {
      stopBtn.onclick = () => this.handleStop();
    }

    const homeBtn = this.shadowRoot?.querySelector('.btn-home');
    if (homeBtn) {
      homeBtn.onclick = () => this.handleHome();
    }
    
    // Header light button - toggle light
    const lightBtn = this.shadowRoot?.querySelector('.btn-light');
    if (lightBtn) {
      lightBtn.onclick = (e) => {
        e.stopPropagation();
        this.handleLightToggle();
      };
    }
    
    // Header camera button - toggle camera view
    const cameraBtn = this.shadowRoot?.querySelector('.btn-camera');
    if (cameraBtn) {
      cameraBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleView();
      };
    }
    
    // Camera container - create ha-camera-stream element programmatically
    const cameraContainer = this.shadowRoot?.querySelector('.camera-container');
    if (cameraContainer && this._hass) {
      const entityId = cameraContainer.dataset.entity;
      const stateObj = this._hass.states[entityId];
      
      if (stateObj) {
        // Create the camera stream element
        const cameraStream = document.createElement('ha-camera-stream');
        cameraStream.hass = this._hass;
        cameraStream.stateObj = stateObj;
        cameraStream.className = 'camera-feed';
        cameraStream.style.cursor = 'pointer';
        
        // Click to open popup
        cameraStream.onclick = (e) => {
          e.stopPropagation();
          this.openCameraPopup();
        };
        
        // Clear container and add stream
        cameraContainer.innerHTML = '';
        cameraContainer.appendChild(cameraStream);
      }
    }
    
    // Power button click handler
    const powerBtn = this.shadowRoot?.querySelector('.btn-power');
    if (powerBtn) {
      powerBtn.onclick = (e) => {
        e.stopPropagation();
        this.handlePowerToggle();
      };
    }
  }
  
  handlePowerToggle() {
    if (!this._hass || !this.config.power_switch) return;
    const entityId = this.config.power_switch;
    
    // Call the service
    this._hass.callService('switch', 'toggle', { entity_id: entityId });
    
    // Optimistically update UI immediately
    const powerBtn = this.shadowRoot?.querySelector('.btn-power');
    const currentState = this._hass.states[entityId]?.state;
    const newState = currentState === 'on' ? 'off' : 'on';
    
    if (powerBtn) {
      if (newState === 'on') {
        powerBtn.classList.remove('off');
        powerBtn.classList.add('on');
        powerBtn.title = 'Power Off';
      } else {
        powerBtn.classList.remove('on');
        powerBtn.classList.add('off');
        powerBtn.title = 'Power On';
      }
    }
  }

  toggleView() {
    this.showCamera = !this.showCamera;
    this.render();
  }

  handlePause() {
    if (!this._hass) return;
    // Find pause/resume button entity
    const pauseBtn = this.findEntityByPattern('pause_resume') || this.findEntityByPattern('pause');
    if (pauseBtn) {
      this._hass.callService('button', 'press', { entity_id: pauseBtn });
    } else {
      // Open more-info for the print status entity
      const stateEntity = this.findEntityByPattern('print_state') || this.findEntityByPattern('state');
      if (stateEntity) {
        const event = new CustomEvent('hass-more-info', {
          bubbles: true,
          composed: true,
          detail: { entityId: stateEntity }
        });
        this.dispatchEvent(event);
      }
    }
  }

  handleStop() {
    if (!this._hass) return;
    // Find stop button entity
    const stopBtn = this.findEntityByPattern('stop_print') || this.findEntityByPattern('stop');
    if (stopBtn) {
      this._hass.callService('button', 'press', { entity_id: stopBtn });
    }
  }

  handleHome() {
    if (!this._hass) return;
    // Find home button entity
    const homeBtn = this.findEntityByPattern('home_all') || this.findEntityByPattern('home');
    if (homeBtn) {
      this._hass.callService('button', 'press', { entity_id: homeBtn });
    }
  }
  
  handleLightToggle() {
    if (!this._hass) return;
    
    // Use configured light_switch or auto-detect switch domain
    let entityId = this.config.light_switch;
    
    // Otherwise find the light switch (must be switch domain for control)
    if (!entityId) {
      entityId = this.findEntityByPattern('light', 'switch');
    }
    
    if (!entityId) {
      console.warn('Prism Creality: No light switch entity found. Please configure light_switch in card settings.');
      return;
    }
    
    // Determine domain from entity_id
    const domain = entityId.startsWith('light.') ? 'light' : 'switch';
    
    // Call the service
    this._hass.callService(domain, 'toggle', { entity_id: entityId });
    
    // Optimistically update UI immediately
    const lightBtn = this.shadowRoot?.querySelector('.btn-light');
    const currentState = this._hass.states[entityId]?.state;
    const newState = currentState === 'on' ? 'off' : 'on';
    
    if (lightBtn) {
      if (newState === 'on') {
        lightBtn.classList.add('active');
        lightBtn.innerHTML = '<ha-icon icon="mdi:lightbulb"></ha-icon>';
      } else {
        lightBtn.classList.remove('active');
        lightBtn.innerHTML = '<ha-icon icon="mdi:lightbulb-outline"></ha-icon>';
      }
    }
    
    // Also update printer image dimming
    const printerImg = this.shadowRoot?.querySelector('.printer-img');
    if (printerImg) {
      if (newState === 'on') {
        printerImg.classList.remove('dimmed');
      } else {
        printerImg.classList.add('dimmed');
      }
    }
  }
  
  openCameraPopup() {
    if (!this._hass) return;
    
    // Check if multi-printer mode is enabled
    const isMultiPrinter = this.config.multi_printer_enabled && (
      this.config.multi_printer_2 || this.config.multi_printer_3 || this.config.multi_printer_4
    );
    
    if (isMultiPrinter) {
      this.openMultiCameraPopup();
      return;
    }
    
    // Single printer mode - original behavior
    // Get camera entity (must be camera domain)
    let entityId = this.config.camera_entity;
    if (!entityId) {
      entityId = this.findEntityByPattern('camera', 'camera');
    }
    
    if (!entityId || !entityId.startsWith('camera.')) {
      console.warn('Prism Creality: No valid camera entity found. Please configure camera_entity in card settings.');
      return;
    }
    
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return;
    
    // Remove existing popup if any
    this.closeCameraPopup();
    
    // Get printer name for title
    const deviceId = this.config.printer;
    const device = this._hass.devices?.[deviceId];
    const printerName = this.config.name || device?.name || 'Creality Printer';
    
    // Get printer data for info panel
    const data = this.getPrinterData();
    
    // Create popup in document.body (outside shadow DOM for true fullscreen modal)
    const overlay = document.createElement('div');
    overlay.id = 'prism-camera-popup-overlay';
    overlay.innerHTML = `
      <style>
        #prism-camera-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          box-sizing: border-box;
          animation: prismCameraFadeIn 0.2s ease;
          font-family: system-ui, -apple-system, sans-serif;
        }
        @keyframes prismCameraFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .prism-camera-popup {
          position: relative;
          min-width: 500px;
          min-height: 400px;
          /* Calculate width based on 16:9 aspect ratio of video area (height minus header + footer bar ~110px) */
          width: calc((75vh - 110px) * 16 / 9);
          height: 75vh;
          max-width: 95vw;
          max-height: 90vh;
          background: transparent;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.1);
          animation: prismCameraSlideIn 0.3s ease;
          display: flex;
          flex-direction: column;
          /* resize via custom handle */
        }
        @keyframes prismCameraSlideIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .prism-camera-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: linear-gradient(180deg, rgba(30,32,36,0.95), rgba(25,27,30,0.95));
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: move;
          user-select: none;
        }
        .prism-camera-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.95);
          font-size: 14px;
          font-weight: 600;
        }
        .prism-camera-title-icon {
          width: 28px;
          height: 28px;
          background: rgba(0, 150, 255, 0.15);
          border: 1px solid rgba(0, 150, 255, 0.3);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0096FF;
        }
        .prism-camera-title-icon ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prism-camera-close {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.6);
          transition: all 0.2s;
        }
        .prism-camera-close ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prism-camera-close:hover {
          background: rgba(255,80,80,0.25);
          border-color: rgba(255,80,80,0.4);
          color: #ff6b6b;
        }
        .prism-camera-body {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }
        .prism-camera-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #000;
          position: relative;
        }
        .prism-camera-content ha-camera-stream {
          width: 100%;
          height: 100%;
          --video-max-height: 100%;
        }
        .prism-camera-content ha-camera-stream video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .prism-camera-content .prism-camera-snapshot {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        /* Info Panel Overlay - Compact & Transparent */
        .prism-camera-info {
          position: absolute;
          right: 12px;
          top: 12px;
          width: 160px;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .prism-info-header {
          padding: 10px 12px;
          background: rgba(0,0,0,0.2);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .prism-info-header-icon {
          width: 22px;
          height: 22px;
          background: rgba(0, 150, 255, 0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0096FF;
        }
        .prism-info-header-icon ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prism-info-header-text {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .prism-info-content {
          flex: 1;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
        }
        
        /* Progress Section */
        .prism-info-progress {
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.04);
        }
        .prism-info-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .prism-info-progress-label {
          font-size: 8px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .prism-info-progress-value {
          font-size: 16px;
          font-weight: 700;
          color: #00C8FF;
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-info-progress-bar {
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .prism-info-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #0096FF, #00C8FF);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        
        /* Stat Items */
        .prism-info-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: rgba(0,0,0,0.15);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.03);
        }
        .prism-info-stat-icon {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .prism-info-stat-icon ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prism-info-stat-icon.time { background: rgba(96, 165, 250, 0.12); color: #60a5fa; }
        .prism-info-stat-icon.layer { background: rgba(167, 139, 250, 0.12); color: #a78bfa; }
        .prism-info-stat-icon.nozzle { background: rgba(248, 113, 113, 0.12); color: #f87171; }
        .prism-info-stat-icon.bed { background: rgba(251, 146, 60, 0.12); color: #fb923c; }
        .prism-info-stat-icon.chamber { background: rgba(74, 222, 128, 0.12); color: #4ade80; }
        .prism-info-stat-data {
          flex: 1;
          min-width: 0;
        }
        .prism-info-stat-label {
          font-size: 8px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .prism-info-stat-value {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-info-stat-value .target {
          font-size: 9px;
          color: rgba(255,255,255,0.35);
          font-weight: 500;
        }
        
        /* Status Badge */
        .prism-info-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          background: ${data.isPrinting ? 'rgba(0, 200, 255, 0.08)' : data.isPaused ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255,255,255,0.03)'};
          border: 1px solid ${data.isPrinting ? 'rgba(0, 200, 255, 0.2)' : data.isPaused ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.06)'};
          border-radius: 8px;
          margin-top: auto;
        }
        .prism-info-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${data.isPrinting ? '#00C8FF' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.3)'};
          ${data.isPrinting ? 'animation: statusPulse 2s infinite;' : ''}
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        .prism-info-status-text {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: ${data.isPrinting ? '#00C8FF' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.4)'};
        }
        
        .prism-camera-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 16px;
          background: rgba(15,15,15,0.9);
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 10px;
          color: rgba(255,255,255,0.35);
        }
        .prism-camera-footer-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .prism-camera-entity {
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 9px;
          background: rgba(255,255,255,0.06);
          padding: 3px 8px;
          border-radius: 4px;
        }
        .prism-camera-toggle-info {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 9px;
          font-family: inherit;
        }
        .prism-camera-toggle-info:hover {
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8);
        }
        .prism-camera-toggle-info.active {
          background: rgba(0, 150, 255, 0.15);
          color: #00C8FF;
        }
        .prism-camera-toggle-info ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prism-camera-resize-hint {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-right: 30px;
        }
        .prism-camera-resize-hint ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prism-info-stop-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 12px;
          margin-top: 8px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          font-size: 10px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }
        .prism-info-stop-btn:hover {
          background: rgba(239, 68, 68, 0.25);
          border-color: rgba(239, 68, 68, 0.5);
          transform: translateY(-1px);
        }
        .prism-info-stop-btn:active {
          transform: translateY(0);
        }
        .prism-info-stop-btn ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .prism-camera-info.hidden {
          display: none;
        }
        /* Custom Resize Handle - larger grab area */
        .prism-camera-resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 40px;
          height: 40px;
          cursor: nwse-resize;
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          padding: 8px;
        }
        .prism-camera-resize-handle::before {
          content: '';
          width: 20px;
          height: 20px;
          background: 
            linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.12) 38%, transparent 38%),
            linear-gradient(135deg, transparent 48%, rgba(255,255,255,0.12) 48%, rgba(255,255,255,0.12) 56%, transparent 56%),
            linear-gradient(135deg, transparent 66%, rgba(255,255,255,0.18) 66%);
          border-radius: 0 0 12px 0;
          transition: all 0.2s;
        }
        .prism-camera-resize-handle:hover::before {
          background: 
            linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.2) 38%, transparent 38%),
            linear-gradient(135deg, transparent 48%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0.2) 56%, transparent 56%),
            linear-gradient(135deg, transparent 66%, rgba(255,255,255,0.3) 66%);
        }
        .prism-camera-resize-handle:active::before {
          background: 
            linear-gradient(135deg, transparent 30%, rgba(0,150,255,0.3) 30%, rgba(0,150,255,0.3) 38%, transparent 38%),
            linear-gradient(135deg, transparent 48%, rgba(0,150,255,0.3) 48%, rgba(0,150,255,0.3) 56%, transparent 56%),
            linear-gradient(135deg, transparent 66%, rgba(0,150,255,0.4) 66%);
        }
      </style>
      <div class="prism-camera-popup">
        <div class="prism-camera-header">
          <div class="prism-camera-title">
            <div class="prism-camera-title-icon">
              <ha-icon icon="mdi:camera" style="width:16px;height:16px;"></ha-icon>
            </div>
            <span>${printerName}</span>
          </div>
          <button class="prism-camera-close">
            <ha-icon icon="mdi:close" style="width:16px;height:16px;"></ha-icon>
          </button>
        </div>
        <div class="prism-camera-body">
          <div class="prism-camera-content"></div>
          <div class="prism-camera-info">
            <div class="prism-info-header">
              <div class="prism-info-header-icon">
                <ha-icon icon="mdi:printer-3d-nozzle" style="width:12px;height:12px;"></ha-icon>
              </div>
              <span class="prism-info-header-text">Print Info</span>
            </div>
            <div class="prism-info-content">
              <div class="prism-info-progress">
                <div class="prism-info-progress-header">
                  <span class="prism-info-progress-label">Progress</span>
                  <span class="prism-info-progress-value" data-field="progress">${Math.round(data.progress)}%</span>
                </div>
                <div class="prism-info-progress-bar">
                  <div class="prism-info-progress-fill" style="width: ${data.progress}%"></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon time">
                  <ha-icon icon="mdi:clock-outline" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Time Left</div>
                  <div class="prism-info-stat-value" data-field="time">${data.printTimeLeft}</div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon layer">
                  <ha-icon icon="mdi:layers-triple" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Layer</div>
                  <div class="prism-info-stat-value" data-field="layer">${data.currentLayer} <span class="target">/ ${data.totalLayers}</span></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon nozzle">
                  <ha-icon icon="mdi:printer-3d-nozzle-heat" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Nozzle</div>
                  <div class="prism-info-stat-value" data-field="nozzle">${Math.round(data.nozzleTemp)}° <span class="target">/ ${Math.round(data.targetNozzleTemp)}°</span></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon bed">
                  <ha-icon icon="mdi:radiator" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Bed</div>
                  <div class="prism-info-stat-value" data-field="bed">${Math.round(data.bedTemp)}° <span class="target">/ ${Math.round(data.targetBedTemp)}°</span></div>
                </div>
              </div>
              
              <div class="prism-info-stat">
                <div class="prism-info-stat-icon chamber">
                  <ha-icon icon="mdi:thermometer" style="width:14px;height:14px;"></ha-icon>
                </div>
                <div class="prism-info-stat-data">
                  <div class="prism-info-stat-label">Chamber</div>
                  <div class="prism-info-stat-value" data-field="chamber">${Math.round(data.chamberTemp)}°</div>
                </div>
              </div>
              
              <div class="prism-info-status">
                <div class="prism-info-status-dot"></div>
                <span class="prism-info-status-text" data-field="status">${data.stateStr}</span>
              </div>
              
              <button class="prism-info-stop-btn" title="Stop Print">
                <ha-icon icon="mdi:stop-circle" style="width:16px;height:16px;"></ha-icon>
                <span>Stop Print</span>
              </button>
            </div>
          </div>
        </div>
        <div class="prism-camera-footer">
          <div class="prism-camera-footer-left">
            <div class="prism-camera-entity">${entityId}</div>
            <button class="prism-camera-toggle-info active">
              <ha-icon icon="mdi:information" style="width:10px;height:10px;"></ha-icon>
              <span>Info</span>
            </button>
          </div>
          <div class="prism-camera-resize-hint">
            <ha-icon icon="mdi:resize-bottom-right" style="width:12px;height:12px;"></ha-icon>
            <span>Resize</span>
          </div>
        </div>
        <div class="prism-camera-resize-handle"></div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this._cameraPopupOverlay = overlay;
    
    // Get content container
    const content = overlay.querySelector('.prism-camera-content');
    
    // Use ha-camera-stream element for live stream
    const cameraStream = document.createElement('ha-camera-stream');
    cameraStream.hass = this._hass;
    cameraStream.stateObj = stateObj;
    cameraStream.muted = true;
    cameraStream.controls = true;
    cameraStream.allowExoPlayer = true;
    cameraStream.setAttribute('muted', '');
    cameraStream.setAttribute('controls', '');
    cameraStream.setAttribute('autoplay', '');
    content.appendChild(cameraStream);
    
    // Close button handler
    overlay.querySelector('.prism-camera-close').onclick = () => this.closeCameraPopup();
    
    // Toggle info panel handler
    const toggleInfoBtn = overlay.querySelector('.prism-camera-toggle-info');
    const infoPanel = overlay.querySelector('.prism-camera-info');
    toggleInfoBtn.onclick = () => {
      infoPanel.classList.toggle('hidden');
      toggleInfoBtn.classList.toggle('active');
    };
    
    // Stop print button handler
    const stopBtn = overlay.querySelector('.prism-info-stop-btn');
    stopBtn.onclick = async () => {
      // For Creality, we look for stop-related entities
      const deviceId = this.config.printer;
      let stopEntity = null;
      
      // Look for button.xxx_stop or similar Creality entities
      for (const entityId in this._hass.entities) {
        const entityInfo = this._hass.entities[entityId];
        if (entityInfo.device_id === deviceId && 
            (entityId.includes('stop') || 
             (entityInfo.translation_key && entityInfo.translation_key.includes('stop')))) {
          stopEntity = entityId;
          break;
        }
      }
      
      if (stopEntity) {
        // Confirm before stopping
        if (confirm('Are you sure you want to stop the print?')) {
          try {
            // Determine the domain from entity_id
            const domain = stopEntity.split('.')[0];
            if (domain === 'button') {
              await this._hass.callService('button', 'press', {
                entity_id: stopEntity
              });
            } else if (domain === 'switch') {
              await this._hass.callService('switch', 'turn_off', {
                entity_id: stopEntity
              });
            }
          } catch (e) {
            console.error('Failed to stop print:', e);
          }
        }
      } else {
        alert('Stop entity not found. Please check your Creality integration.');
      }
    };
    
    // Click on overlay background closes popup
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeCameraPopup();
      }
    };
    
    // Escape key handler
    this._cameraPopupEscHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeCameraPopup();
      }
    };
    document.addEventListener('keydown', this._cameraPopupEscHandler);
    
    // Make popup draggable by header
    const popup = overlay.querySelector('.prism-camera-popup');
    const header = overlay.querySelector('.prism-camera-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    header.onmousedown = (e) => {
      if (e.target.closest('.prism-camera-close')) return;
      isDragging = true;
      const rect = popup.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      popup.style.position = 'fixed';
      popup.style.margin = '0';
      popup.style.left = startLeft + 'px';
      popup.style.top = startTop + 'px';
      e.preventDefault();
    };
    
    document.addEventListener('mousemove', this._cameraPopupDragHandler = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      popup.style.left = (startLeft + dx) + 'px';
      popup.style.top = (startTop + dy) + 'px';
    });
    
    document.addEventListener('mouseup', this._cameraPopupDragEndHandler = () => {
      isDragging = false;
    });
    
    // Custom resize handle
    const resizeHandle = overlay.querySelector('.prism-camera-resize-handle');
    let isResizing = false;
    let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;
    
    resizeHandle.onmousedown = (e) => {
      isResizing = true;
      const rect = popup.getBoundingClientRect();
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      resizeStartWidth = rect.width;
      resizeStartHeight = rect.height;
      
      // Ensure popup has fixed positioning for resize
      if (popup.style.position !== 'fixed') {
        popup.style.position = 'fixed';
        popup.style.margin = '0';
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.top + 'px';
      }
      
      e.preventDefault();
      e.stopPropagation();
    };
    
    document.addEventListener('mousemove', this._cameraPopupResizeHandler = (e) => {
      if (!isResizing) return;
      const dx = e.clientX - resizeStartX;
      const dy = e.clientY - resizeStartY;
      const newWidth = Math.max(400, Math.min(resizeStartWidth + dx, window.innerWidth * 0.95));
      const newHeight = Math.max(300, Math.min(resizeStartHeight + dy, window.innerHeight * 0.95));
      popup.style.width = newWidth + 'px';
      popup.style.height = newHeight + 'px';
    });
    
    document.addEventListener('mouseup', this._cameraPopupResizeEndHandler = () => {
      isResizing = false;
    });
    
    // Update info panel data periodically
    this._cameraPopupUpdateInterval = setInterval(() => {
      if (!this._cameraPopupOverlay) return;
      const newData = this.getPrinterData();
      
      // Update progress
      const progressValue = overlay.querySelector('[data-field="progress"]');
      const progressFill = overlay.querySelector('.prism-info-progress-fill');
      if (progressValue) progressValue.textContent = `${Math.round(newData.progress)}%`;
      if (progressFill) progressFill.style.width = `${newData.progress}%`;
      
      // Update time
      const timeValue = overlay.querySelector('[data-field="time"]');
      if (timeValue) timeValue.textContent = newData.printTimeLeft;
      
      // Update layer
      const layerValue = overlay.querySelector('[data-field="layer"]');
      if (layerValue) layerValue.innerHTML = `${newData.currentLayer} <span class="target">/ ${newData.totalLayers}</span>`;
      
      // Update temperatures
      const nozzleValue = overlay.querySelector('[data-field="nozzle"]');
      if (nozzleValue) nozzleValue.innerHTML = `${Math.round(newData.nozzleTemp)}° <span class="target">/ ${Math.round(newData.targetNozzleTemp)}°</span>`;
      
      const bedValue = overlay.querySelector('[data-field="bed"]');
      if (bedValue) bedValue.innerHTML = `${Math.round(newData.bedTemp)}° <span class="target">/ ${Math.round(newData.targetBedTemp)}°</span>`;
      
      const chamberValue = overlay.querySelector('[data-field="chamber"]');
      if (chamberValue) chamberValue.textContent = `${Math.round(newData.chamberTemp)}°`;
      
      // Update status
      const statusText = overlay.querySelector('[data-field="status"]');
      if (statusText) statusText.textContent = newData.stateStr;
    }, 2000);
    
    console.log('Prism Creality: Camera popup opened:', entityId);
  }
  
  closeCameraPopup() {
    // Remove popup from document.body
    if (this._cameraPopupOverlay) {
      this._cameraPopupOverlay.remove();
      this._cameraPopupOverlay = null;
    }
    
    // Also check for any orphaned popups
    const existingPopup = document.getElementById('prism-camera-popup-overlay');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // Clear info update interval
    if (this._cameraPopupUpdateInterval) {
      clearInterval(this._cameraPopupUpdateInterval);
      this._cameraPopupUpdateInterval = null;
    }
    
    // Remove escape key listener
    if (this._cameraPopupEscHandler) {
      document.removeEventListener('keydown', this._cameraPopupEscHandler);
      this._cameraPopupEscHandler = null;
    }
    
    // Remove drag listeners
    if (this._cameraPopupDragHandler) {
      document.removeEventListener('mousemove', this._cameraPopupDragHandler);
      this._cameraPopupDragHandler = null;
    }
    if (this._cameraPopupDragEndHandler) {
      document.removeEventListener('mouseup', this._cameraPopupDragEndHandler);
      this._cameraPopupDragEndHandler = null;
    }
    
    // Remove resize listeners
    if (this._cameraPopupResizeHandler) {
      document.removeEventListener('mousemove', this._cameraPopupResizeHandler);
      this._cameraPopupResizeHandler = null;
    }
    if (this._cameraPopupResizeEndHandler) {
      document.removeEventListener('mouseup', this._cameraPopupResizeEndHandler);
      this._cameraPopupResizeEndHandler = null;
    }
    
    console.log('Prism Creality: Camera popup closed');
  }

  // Multi-Printer Camera Popup - shows grid of all configured printers
  openMultiCameraPopup() {
    if (!this._hass) return;
    
    // Remove existing popup if any
    this.closeCameraPopup();
    
    // Get all configured printers
    const printerConfigs = this.getMultiPrinterConfigs();
    if (printerConfigs.length === 0) return;
    
    // Get data for all printers
    const printersData = printerConfigs.map(pc => 
      this.getPrinterDataForDevice(pc.deviceId, pc.cameraEntity, pc.name)
    );
    
    // Filter to only printers with valid camera entities
    const validPrinters = printersData.filter(p => p.cameraEntity);
    if (validPrinters.length === 0) return;
    
    const printerCount = validPrinters.length;
    
    // Determine grid layout
    let gridCols = 1, gridRows = 1;
    if (printerCount === 2) { gridCols = 2; gridRows = 1; }
    else if (printerCount === 3) { gridCols = 2; gridRows = 2; }
    else if (printerCount >= 4) { gridCols = 2; gridRows = 2; }
    
    // Create popup in document.body
    const overlay = document.createElement('div');
    overlay.id = 'prism-camera-popup-overlay';
    overlay.innerHTML = `
      <style>
        #prism-camera-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          animation: prismMultiFadeIn 0.2s ease;
          font-family: system-ui, -apple-system, sans-serif;
        }
        @keyframes prismMultiFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .prism-multi-popup {
          position: relative;
          width: 90vw;
          height: 90vh;
          max-width: 1800px;
          background: #0a0a0a;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.1);
          animation: prismMultiSlideIn 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        @keyframes prismMultiSlideIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .prism-multi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: linear-gradient(180deg, rgba(30,32,36,0.98), rgba(20,22,25,0.98));
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: move;
          user-select: none;
        }
        .prism-multi-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.95);
          font-size: 15px;
          font-weight: 600;
        }
        .prism-multi-title-icon {
          width: 32px;
          height: 32px;
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3B82F6;
          --mdc-icon-size: 18px;
        }
        .prism-multi-title-icon ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
        }
        .prism-multi-badge {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        .prism-multi-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.6);
          transition: all 0.2s;
          --mdc-icon-size: 18px;
        }
        .prism-multi-close ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
        }
        .prism-multi-close:hover {
          background: rgba(255,80,80,0.25);
          border-color: rgba(255,80,80,0.4);
          color: #ff6b6b;
        }
        .prism-multi-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(${gridCols}, 1fr);
          grid-template-rows: repeat(${gridRows}, 1fr);
          gap: 2px;
          background: rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .prism-multi-cell {
          position: relative;
          background: #000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .prism-multi-cell-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 8px 12px;
          background: linear-gradient(180deg, rgba(0,0,0,0.7), transparent);
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
        }
        .prism-multi-cell-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
        }
        .prism-multi-cell-name-icon {
          width: 22px;
          height: 22px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3B82F6;
          --mdc-icon-size: 12px;
        }
        .prism-multi-cell-name-icon ha-icon {
          display: flex;
          --mdc-icon-size: 12px;
        }
        .prism-multi-cell-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .prism-multi-light-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.5);
          transition: all 0.2s;
          --mdc-icon-size: 14px;
        }
        .prism-multi-light-btn ha-icon {
          display: flex;
          --mdc-icon-size: 14px;
        }
        .prism-multi-light-btn:hover {
          background: rgba(255,200,100,0.2);
          color: #ffc864;
        }
        .prism-multi-light-btn.active {
          background: rgba(255,200,100,0.25);
          border-color: rgba(255,200,100,0.4);
          color: #ffc864;
        }
        .prism-multi-cell-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(0,0,0,0.5);
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
        }
        .prism-multi-cell-status.printing {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }
        .prism-multi-cell-status.paused {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }
        .prism-multi-cell-status.idle {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
        }
        .prism-multi-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .prism-multi-cell-status.printing .prism-multi-status-dot {
          animation: statusPulse 2s infinite;
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .prism-multi-camera {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .prism-multi-camera ha-camera-stream,
        .prism-multi-camera img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .prism-multi-camera ha-camera-stream video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .prism-multi-info-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px 12px;
          background: linear-gradient(0deg, rgba(0,0,0,0.85), rgba(0,0,0,0.6), transparent);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 16px;
          z-index: 10;
        }
        .prism-multi-progress-section {
          flex: 0 0 auto;
          min-width: 140px;
        }
        .prism-multi-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .prism-multi-progress-label {
          font-size: 9px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .prism-multi-progress-value {
          font-size: 14px;
          font-weight: 700;
          color: #60a5fa;
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-multi-progress-bar {
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .prism-multi-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3B82F6, #60a5fa);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        .prism-multi-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .prism-multi-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .prism-multi-stat-label {
          font-size: 8px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .prism-multi-stat-value {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          font-family: 'SF Mono', Monaco, monospace;
        }
        .prism-multi-stat-value .target {
          font-size: 9px;
          color: rgba(255,255,255,0.35);
          font-weight: 500;
        }
        .prism-multi-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 20px;
          background: rgba(15,15,15,0.95);
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 10px;
          color: rgba(255,255,255,0.35);
        }
        .prism-multi-footer-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .prism-multi-toggle-info {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: rgba(255,255,255,0.06);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 10px;
          font-family: inherit;
          --mdc-icon-size: 12px;
        }
        .prism-multi-toggle-info ha-icon {
          display: flex;
          --mdc-icon-size: 12px;
        }
        .prism-multi-toggle-info:hover {
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8);
        }
        .prism-multi-toggle-info.active {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }
        .prism-multi-info-hidden .prism-multi-info-panel {
          display: none;
        }
        .prism-multi-resize-hint {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-right: 30px;
        }
        .prism-multi-resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          cursor: nwse-resize;
          z-index: 100;
        }
        .prism-multi-resize-handle::before {
          content: '';
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 12px;
          height: 12px;
          border-right: 2px solid rgba(255,255,255,0.3);
          border-bottom: 2px solid rgba(255,255,255,0.3);
          transition: all 0.2s;
        }
        .prism-multi-resize-handle:hover::before {
          border-color: rgba(255,255,255,0.5);
        }
      </style>
      <div class="prism-multi-popup">
        <div class="prism-multi-header">
          <div class="prism-multi-title">
            <div class="prism-multi-title-icon">
              <ha-icon icon="mdi:view-grid"></ha-icon>
            </div>
            <span>Multi-Printer View</span>
            <span class="prism-multi-badge">${printerCount} Printers</span>
          </div>
          <button class="prism-multi-close">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="prism-multi-grid">
          ${validPrinters.map((printer, idx) => `
            <div class="prism-multi-cell" data-printer-idx="${idx}" data-device-id="${printer.deviceId}">
              <div class="prism-multi-cell-header">
                <div class="prism-multi-cell-name">
                  <div class="prism-multi-cell-name-icon">
                    <ha-icon icon="mdi:printer-3d-nozzle"></ha-icon>
                  </div>
                  <span>${printer.name}</span>
                </div>
                <div class="prism-multi-cell-actions">
                  <button class="prism-multi-light-btn" data-light-idx="${idx}" data-device-id="${printer.deviceId}" title="Toggle Light">
                    <ha-icon icon="mdi:lightbulb-outline"></ha-icon>
                  </button>
                  <div class="prism-multi-cell-status ${printer.isPrinting ? 'printing' : printer.isPaused ? 'paused' : 'idle'}">
                    <div class="prism-multi-status-dot"></div>
                    <span data-field="status-${idx}">${printer.stateStr}</span>
                  </div>
                </div>
              </div>
              <div class="prism-multi-camera" data-camera-idx="${idx}"></div>
              <div class="prism-multi-info-panel">
                <div class="prism-multi-progress-section">
                  <div class="prism-multi-progress-header">
                    <span class="prism-multi-progress-label">Progress</span>
                    <span class="prism-multi-progress-value" data-field="progress-${idx}">${Math.round(printer.progress)}%</span>
                  </div>
                  <div class="prism-multi-progress-bar">
                    <div class="prism-multi-progress-fill" data-field="progress-fill-${idx}" style="width: ${printer.progress}%"></div>
                  </div>
                </div>
                <div class="prism-multi-stats">
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Time Left</span>
                    <span class="prism-multi-stat-value" data-field="time-${idx}">${printer.printTimeLeft}</span>
                  </div>
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Layer</span>
                    <span class="prism-multi-stat-value" data-field="layer-${idx}">${printer.currentLayer} <span class="target">/ ${printer.totalLayers}</span></span>
                  </div>
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Nozzle</span>
                    <span class="prism-multi-stat-value" data-field="nozzle-${idx}">${Math.round(printer.nozzleTemp)}° <span class="target">/ ${Math.round(printer.targetNozzleTemp)}°</span></span>
                  </div>
                  <div class="prism-multi-stat">
                    <span class="prism-multi-stat-label">Bed</span>
                    <span class="prism-multi-stat-value" data-field="bed-${idx}">${Math.round(printer.bedTemp)}° <span class="target">/ ${Math.round(printer.targetBedTemp)}°</span></span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="prism-multi-footer">
          <div class="prism-multi-footer-left">
            <button class="prism-multi-toggle-info active">
              <ha-icon icon="mdi:information"></ha-icon>
              <span>Info</span>
            </button>
          </div>
          <div class="prism-multi-resize-hint">
            <span>Drag corner to resize</span>
          </div>
        </div>
        <div class="prism-multi-resize-handle"></div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this._cameraPopupOverlay = overlay;
    
    // Store printer configs for updates
    this._multiPrinterConfigs = printerConfigs;
    
    // Setup camera feeds (Creality uses ha-camera-stream)
    validPrinters.forEach((printer, idx) => {
      const cameraContainer = overlay.querySelector(`[data-camera-idx="${idx}"]`);
      if (!cameraContainer || !printer.cameraEntity) return;
      
      const stateObj = this._hass.states[printer.cameraEntity];
      if (!stateObj) return;
      
      const cameraStream = document.createElement('ha-camera-stream');
      cameraStream.hass = this._hass;
      cameraStream.stateObj = stateObj;
      cameraStream.muted = true;
      cameraStream.controls = true;
      cameraStream.allowExoPlayer = true;
      cameraStream.setAttribute('muted', '');
      cameraStream.setAttribute('controls', '');
      cameraStream.setAttribute('autoplay', '');
      cameraContainer.appendChild(cameraStream);
    });
    
    // Close button handler
    overlay.querySelector('.prism-multi-close').onclick = () => this.closeCameraPopup();
    
    // Click on overlay background closes popup
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeCameraPopup();
      }
    };
    
    // Toggle info panels
    const toggleInfoBtn = overlay.querySelector('.prism-multi-toggle-info');
    const grid = overlay.querySelector('.prism-multi-grid');
    toggleInfoBtn.onclick = () => {
      grid.classList.toggle('prism-multi-info-hidden');
      toggleInfoBtn.classList.toggle('active');
    };
    
    // Light button handlers for each printer
    overlay.querySelectorAll('.prism-multi-light-btn').forEach(btn => {
      const deviceId = btn.dataset.deviceId;
      
      // Find light entity for this device (Creality uses switch or light domain)
      let lightEntity = null;
      for (const entityId in this._hass.entities) {
        const entityInfo = this._hass.entities[entityId];
        if (entityInfo.device_id === deviceId && 
            (entityId.includes('light') || entityInfo.translation_key === 'lightSw')) {
          if (entityId.startsWith('light.') || entityId.startsWith('switch.')) {
            lightEntity = entityId;
            break;
          }
        }
      }
      
      // Update button state based on current light state
      if (lightEntity) {
        const domain = lightEntity.split('.')[0];
        const updateLightBtn = () => {
          const state = this._hass.states[lightEntity]?.state;
          if (state === 'on') {
            btn.classList.add('active');
            btn.querySelector('ha-icon').setAttribute('icon', 'mdi:lightbulb');
          } else {
            btn.classList.remove('active');
            btn.querySelector('ha-icon').setAttribute('icon', 'mdi:lightbulb-outline');
          }
        };
        updateLightBtn();
        
        btn.onclick = (e) => {
          e.stopPropagation();
          this._hass.callService(domain, 'toggle', { entity_id: lightEntity });
          setTimeout(updateLightBtn, 100);
        };
      } else {
        btn.style.display = 'none';
      }
    });
    
    // Escape key handler
    this._cameraPopupEscHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeCameraPopup();
      }
    };
    document.addEventListener('keydown', this._cameraPopupEscHandler);
    
    // Make popup draggable by header
    const popup = overlay.querySelector('.prism-multi-popup');
    const header = overlay.querySelector('.prism-multi-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    header.onmousedown = (e) => {
      if (e.target.closest('.prism-multi-close')) return;
      isDragging = true;
      const rect = popup.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      popup.style.position = 'fixed';
      popup.style.margin = '0';
      popup.style.left = startLeft + 'px';
      popup.style.top = startTop + 'px';
      e.preventDefault();
    };
    
    document.addEventListener('mousemove', this._cameraPopupDragHandler = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      popup.style.left = (startLeft + dx) + 'px';
      popup.style.top = (startTop + dy) + 'px';
    });
    
    document.addEventListener('mouseup', this._cameraPopupDragEndHandler = () => {
      isDragging = false;
    });
    
    // Custom resize handle
    const resizeHandle = overlay.querySelector('.prism-multi-resize-handle');
    let isResizing = false;
    let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;
    
    resizeHandle.onmousedown = (e) => {
      isResizing = true;
      const rect = popup.getBoundingClientRect();
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      resizeStartWidth = rect.width;
      resizeStartHeight = rect.height;
      
      if (popup.style.position !== 'fixed') {
        popup.style.position = 'fixed';
        popup.style.margin = '0';
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.top + 'px';
      }
      
      e.preventDefault();
      e.stopPropagation();
    };
    
    document.addEventListener('mousemove', this._cameraPopupResizeHandler = (e) => {
      if (!isResizing) return;
      const dx = e.clientX - resizeStartX;
      const dy = e.clientY - resizeStartY;
      const newWidth = Math.max(600, Math.min(resizeStartWidth + dx, window.innerWidth * 0.98));
      const newHeight = Math.max(400, Math.min(resizeStartHeight + dy, window.innerHeight * 0.98));
      popup.style.width = newWidth + 'px';
      popup.style.height = newHeight + 'px';
    });
    
    document.addEventListener('mouseup', this._cameraPopupResizeEndHandler = () => {
      isResizing = false;
    });
    
    // Update info panel data periodically
    this._cameraPopupUpdateInterval = setInterval(() => {
      if (!this._cameraPopupOverlay || !this._multiPrinterConfigs) return;
      
      this._multiPrinterConfigs.forEach((pc, idx) => {
        const newData = this.getPrinterDataForDevice(pc.deviceId, pc.cameraEntity, pc.name);
        
        // Update progress
        const progressValue = overlay.querySelector(`[data-field="progress-${idx}"]`);
        const progressFill = overlay.querySelector(`[data-field="progress-fill-${idx}"]`);
        if (progressValue) progressValue.textContent = `${Math.round(newData.progress)}%`;
        if (progressFill) progressFill.style.width = `${newData.progress}%`;
        
        // Update time
        const timeValue = overlay.querySelector(`[data-field="time-${idx}"]`);
        if (timeValue) timeValue.textContent = newData.printTimeLeft;
        
        // Update layer
        const layerValue = overlay.querySelector(`[data-field="layer-${idx}"]`);
        if (layerValue) layerValue.innerHTML = `${newData.currentLayer} <span class="target">/ ${newData.totalLayers}</span>`;
        
        // Update temperatures
        const nozzleValue = overlay.querySelector(`[data-field="nozzle-${idx}"]`);
        if (nozzleValue) nozzleValue.innerHTML = `${Math.round(newData.nozzleTemp)}° <span class="target">/ ${Math.round(newData.targetNozzleTemp)}°</span>`;
        
        const bedValue = overlay.querySelector(`[data-field="bed-${idx}"]`);
        if (bedValue) bedValue.innerHTML = `${Math.round(newData.bedTemp)}° <span class="target">/ ${Math.round(newData.targetBedTemp)}°</span>`;
        
        // Update status
        const statusText = overlay.querySelector(`[data-field="status-${idx}"]`);
        if (statusText) statusText.textContent = newData.stateStr;
        
        // Update status badge class
        const cell = overlay.querySelector(`[data-printer-idx="${idx}"]`);
        if (cell) {
          const statusBadge = cell.querySelector('.prism-multi-cell-status');
          if (statusBadge) {
            statusBadge.classList.remove('printing', 'paused', 'idle');
            statusBadge.classList.add(newData.isPrinting ? 'printing' : newData.isPaused ? 'paused' : 'idle');
          }
        }
      });
    }, 2000);
    
    console.log('Prism Creality: Multi-camera popup opened with', printerCount, 'printers');
  }

  getPrinterData() {
    if (!this._hass || !this.config) {
      return this.getPreviewData();
    }

    // If no printer selected, show preview
    if (!this.config.printer) {
      return this.getPreviewData();
    }

    // If no device entities found, show preview
    if (Object.keys(this._deviceEntities).length === 0) {
      console.warn('Prism Creality: No device entities found for device:', this.config.printer);
      return this.getPreviewData();
    }
    
    // Find entities by searching entity_ids (Creality uses different naming pattern)
    const progressEntity = this.findEntityByPattern('print_progress');
    const stateEntity = this.findEntityByPattern('print_state') || this.findEntityByPattern('device_state');
    const layerEntity = this.findEntityByPattern('current_layer');
    const totalLayerEntity = this.findEntityByPattern('total_layer');
    const timeLeftEntity = this.findEntityByPattern('time_left');
    const nozzleTempEntity = this.findEntityByPattern('nozzle_temp');
    const targetNozzleTempEntity = this.findEntityByPattern('target_nozzle');
    const bedTempEntity = this.findEntityByPattern('bed_temp');
    const targetBedTempEntity = this.findEntityByPattern('target_bed');
    const boxTempEntity = this.findEntityByPattern('box_temp');
    const modelFanEntity = this.findEntityByPattern('model_fan');
    const auxFanEntity = this.findEntityByPattern('auxiliary_fan');
    const caseFanEntity = this.findEntityByPattern('case_fan');
    // Light: prefer switch domain for control, sensor for status
    const lightSwitchEntity = this.findEntityByPattern('light', 'switch');
    const lightSensorEntity = this.findEntityByPattern('light', 'sensor');
    // Camera: must be camera domain
    const cameraEntityAuto = this.findEntityByPattern('camera', 'camera');
    const fileNameEntity = this.findEntityByPattern('filename') || this.findEntityByPattern('print_filename');
    
    // Read values
    const progress = this.getEntityValueById(progressEntity);
    const stateStr = this.getEntityStateById(stateEntity) || 'unavailable';
    
    // Debug: Log the current status
    console.log('Prism Creality: Current status:', stateStr, 'Progress:', progress);
    
    // Determine if printer is actively printing
    const statusLower = stateStr.toLowerCase();
    const isPrinting = ['printing', 'prepare', 'running', 'druckt', 'vorbereiten', 'busy'].includes(statusLower);
    const isPaused = ['paused', 'pause', 'pausiert'].includes(statusLower);
    const isIdle = !isPrinting && !isPaused;
    
    // Get remaining time - format it nicely
    let printTimeLeft = '--';
    let printEndTime = '--:--';
    if (timeLeftEntity && (isPrinting || isPaused)) {
      const state = this._hass.states[timeLeftEntity];
      if (state) {
        // Creality returns time as HH:MM:SS string or seconds
        const timeValue = state.state;
        if (timeValue && timeValue !== 'Unknown') {
          if (timeValue.includes(':')) {
            // Already formatted as HH:MM:SS
            const parts = timeValue.split(':');
            if (parts.length >= 2) {
              const hours = parseInt(parts[0]) || 0;
              const mins = parseInt(parts[1]) || 0;
              if (hours > 0) {
                printTimeLeft = `${hours}h ${mins}m`;
              } else {
                printTimeLeft = `${mins}m`;
              }
              // Calculate end time
              const totalMinutes = hours * 60 + mins;
              const endTime = new Date(Date.now() + totalMinutes * 60 * 1000);
              printEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          } else {
            // Seconds value
            const seconds = parseInt(timeValue) || 0;
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (hours > 0) {
              printTimeLeft = `${hours}h ${mins}m`;
            } else {
              printTimeLeft = `${mins}m`;
            }
            const endTime = new Date(Date.now() + seconds * 1000);
            printEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        }
      }
    }
    
    // Temperatures
    const nozzleTemp = this.getEntityValueById(nozzleTempEntity);
    const targetNozzleTemp = this.getEntityValueById(targetNozzleTempEntity);
    const bedTemp = this.getEntityValueById(bedTempEntity);
    const targetBedTemp = this.getEntityValueById(targetBedTempEntity);
    const chamberTemp = this.getEntityValueById(boxTempEntity);
    
    // Fans
    const modelFanSpeed = this.getEntityValueById(modelFanEntity);
    const auxFanSpeed = this.getEntityValueById(auxFanEntity);
    const caseFanSpeed = this.getEntityValueById(caseFanEntity);
    
    // Layer info
    let currentLayer = 0;
    let totalLayers = 0;
    if (isPrinting || isPaused) {
      currentLayer = parseInt(this.getEntityStateById(layerEntity)) || 0;
      totalLayers = parseInt(this.getEntityStateById(totalLayerEntity)) || 0;
    }
    
    // Light: Use configured light_switch, or auto-detected switch, or sensor for status
    let lightEntityId = this.config.light_switch || lightSwitchEntity;
    let lightState = null;
    
    if (lightEntityId) {
      // Use the switch state directly
      lightState = this._hass.states[lightEntityId]?.state;
    } else if (lightSensorEntity) {
      // Fall back to sensor for status display (but won't be controllable)
      lightState = this._hass.states[lightSensorEntity]?.state;
      // Sensor uses "1" for on, "0" for off
      lightState = lightState === '1' ? 'on' : lightState === '0' ? 'off' : lightState;
    }
    
    const isLightOn = lightState === 'on' || lightState === '1';
    
    // Custom sensors
    const customHumidity = this.config.custom_humidity;
    const customHumidityState = customHumidity ? this._hass.states[customHumidity] : null;
    const humidity = customHumidityState ? parseFloat(customHumidityState.state) || 0 : null;
    
    const customTemperature = this.config.custom_temperature;
    const customTemperatureState = customTemperature ? this._hass.states[customTemperature] : null;
    const customTemp = customTemperatureState ? parseFloat(customTemperatureState.state) || 0 : null;
    
    const powerSwitch = this.config.power_switch;
    const powerSwitchState = powerSwitch ? this._hass.states[powerSwitch] : null;
    const isPowerOn = powerSwitchState?.state === 'on';
    const powerSwitchIcon = this.config.power_switch_icon || 'mdi:power';
    
    // Debug: Log light entity details
    console.log('Prism Creality: Light - configured:', this.config.light_switch, 'auto-switch:', lightSwitchEntity, 'auto-sensor:', lightSensorEntity);
    console.log('Prism Creality: Light entity used:', lightEntityId, 'State:', lightState, 'isLightOn:', isLightOn);
    
    // Get printer name from device
    const deviceId = this.config.printer;
    const device = this._hass.devices?.[deviceId];
    const name = this.config.name || device?.name || 'Creality Printer';
    
    // Camera: Use configured camera_entity or auto-detected from camera domain
    let resolvedCameraEntity = this.config.camera_entity || cameraEntityAuto;
    if (resolvedCameraEntity && !resolvedCameraEntity.startsWith('camera.')) {
      console.warn('Prism Creality: Camera entity is not from camera domain:', resolvedCameraEntity);
      resolvedCameraEntity = null;
    }
    const cameraState = resolvedCameraEntity ? this._hass.states[resolvedCameraEntity] : null;
    const cameraImage = cameraState?.attributes?.entity_picture || null;
    
    // Debug: Log camera entity
    console.log('Prism Creality: Camera entity:', resolvedCameraEntity, 'Has image:', !!cameraImage, 'Auto-detected:', cameraEntityAuto);
    
    // Image path
    const printerImg = this.config.image || '/local/community/Prism-Dashboard/images/printer-blank.jpg';
    
    // Get print filename
    const fileName = this.getEntityStateById(fileNameEntity) || '';

    const returnData = {
      stateStr,
      progress: isIdle ? 0 : progress,
      printTimeLeft,
      printEndTime,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      chamberTemp,
      modelFanSpeed,
      auxFanSpeed,
      caseFanSpeed,
      currentLayer,
      totalLayers,
      name,
      cameraEntity: resolvedCameraEntity,
      cameraImage,
      printerImg,
      fileName,
      isPrinting,
      isPaused,
      isIdle,
      isLightOn,
      lightEntity: lightEntityId,
      // Custom sensors
      humidity,
      customTemp,
      powerSwitch,
      isPowerOn,
      powerSwitchIcon
    };
    
    // Debug: Log key data
    console.log('Prism Creality: Icons - Light:', lightEntityId, 'Camera:', resolvedCameraEntity);
    console.log('Prism Creality: Status - isPrinting:', isPrinting, 'isPaused:', isPaused, 'isIdle:', isIdle);
    
    return returnData;
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
      modelFanSpeed: 50,
      auxFanSpeed: 30,
      caseFanSpeed: 40,
      currentLayer: 12,
      totalLayers: 28,
      name: this.config?.name || 'Creality Printer',
      cameraEntity: null,
      cameraImage: null,
      printerImg: this.config?.image || '/local/community/Prism-Dashboard/images/printer-blank.jpg',
      fileName: 'benchy.gcode',
      isPrinting: true,
      isPaused: false,
      isIdle: false,
      isLightOn: true,
      lightEntity: null,
      humidity: null,
      customTemp: null,
      powerSwitch: null,
      isPowerOn: true,
      powerSwitchIcon: 'mdi:power'
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
            min-height: 550px;
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
            background-color: rgba(0, 150, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0096FF;
            border: 1px solid rgba(0, 150, 255, 0.2);
            box-shadow: inset 0 0 10px rgba(0, 150, 255, 0.1);
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
            background-color: ${data.isPrinting ? '#22c55e' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.2)'};
            animation: ${data.isPrinting ? 'pulse 2s infinite' : 'none'};
        }
        .status-text {
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: ${data.isPrinting ? '#4ade80' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.6)'};
        }
        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .header-icon-btn {
            width: 36px;
            height: 36px;
            min-width: 36px;
            min-height: 36px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;
        }
        .header-icon-btn:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
        }
        .header-icon-btn.active {
            color: #fbbf24;
            background-color: rgba(20, 20, 20, 0.9);
            border-color: rgba(0, 0, 0, 0.3);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
        }
        .header-icon-btn ha-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Main Visual */
        .main-visual {
            position: relative;
            flex: 1;
            border-radius: 24px;
            background-color: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
            overflow: visible;
            margin-bottom: 24px;
            min-height: 280px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .main-visual-inner {
            position: relative;
            width: 100%;
            height: 100%;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* Power Corner Button */
        .power-corner-btn {
            position: absolute;
            top: -14px;
            right: -14px;
            z-index: 50;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .power-corner-btn.on {
            background: linear-gradient(135deg, rgba(74, 222, 128, 0.9), rgba(34, 197, 94, 0.9));
            color: white;
            box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4), 0 0 20px rgba(74, 222, 128, 0.3);
        }
        .power-corner-btn.off {
            background: linear-gradient(135deg, rgba(60, 60, 60, 0.9), rgba(40, 40, 40, 0.9));
            color: rgba(255, 255, 255, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .power-corner-btn:hover {
            transform: scale(1.1);
        }
        .power-corner-btn.on:hover {
            box-shadow: 0 6px 16px rgba(74, 222, 128, 0.5), 0 0 30px rgba(74, 222, 128, 0.4);
        }
        .power-corner-btn.off:hover {
            background: linear-gradient(135deg, rgba(248, 113, 113, 0.8), rgba(220, 38, 38, 0.8));
            color: white;
            box-shadow: 0 6px 16px rgba(248, 113, 113, 0.4);
        }
        .power-corner-btn ha-icon {
            width: 24px;
            height: 24px;
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
            filter: drop-shadow(0 0 30px rgba(0,150,255,0.15)) brightness(1.05);
            z-index: 10;
            padding: 16px;
            box-sizing: border-box;
            transition: filter 0.3s ease;
        }
        .printer-img.dimmed {
            filter: drop-shadow(0 0 10px rgba(0,0,0,0.3)) brightness(0.4);
        }
        .printer-fallback-icon {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,255,255,0.2);
        }
        .printer-fallback-icon ha-icon {
            width: 80px;
            height: 80px;
        }
        .camera-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .camera-feed {
            width: 100%;
            height: 100%;
            object-fit: cover;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .camera-feed:hover {
            opacity: 0.9;
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
            background: linear-gradient(to right, #0096FF, #00C8FF);
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
        .btn-secondary:hover:not(:disabled) {
            background-color: rgba(255, 255, 255, 0.1);
        }
        .btn-primary {
            grid-column: span 2;
            background-color: rgba(20, 20, 20, 0.8);
            color: #0096FF;
            gap: 8px;
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(0, 0, 0, 0.2);
        }
        .btn-primary:hover:not(:disabled) {
            color: #00b8ff;
            background-color: rgba(20, 20, 20, 0.9);
        }
        .btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
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
            <div class="header-right">
                ${data.lightEntity ? `
                <button class="header-icon-btn btn-light ${data.isLightOn ? 'active' : ''}" title="Light">
                    <ha-icon icon="mdi:lightbulb${data.isLightOn ? '' : '-outline'}"></ha-icon>
                </button>
                ` : ''}
                ${data.cameraEntity ? `
                <button class="header-icon-btn btn-camera ${this.showCamera ? 'active' : ''}" title="Toggle Camera">
                    <ha-icon icon="mdi:camera${this.showCamera ? '' : '-outline'}"></ha-icon>
                </button>
                ` : ''}
            </div>
        </div>

        <div class="main-visual ${!data.isLightOn ? 'light-off' : ''}">
            ${data.powerSwitch ? `
            <button class="power-corner-btn btn-power ${data.isPowerOn ? 'on' : 'off'}" title="Power ${data.isPowerOn ? 'Off' : 'On'}">
                <ha-icon icon="${data.powerSwitchIcon}"></ha-icon>
            </button>
            ` : ''}
            <div class="main-visual-inner">
            ${data.cameraEntity && this.showCamera ? `
                <div class="camera-container" data-entity="${data.cameraEntity}"></div>
            ` : `
                <img src="${data.printerImg}" class="printer-img ${!data.isLightOn ? 'dimmed' : ''}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="printer-fallback-icon" style="display: none;">
                  <ha-icon icon="mdi:printer-3d"></ha-icon>
                </div>
                
                <div class="overlay-left">
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.modelFanSpeed}%</span>
                            <span class="pill-label">Model</span>
                        </div>
                    </div>
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:weather-windy"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.auxFanSpeed}%</span>
                            <span class="pill-label">Aux</span>
                        </div>
                    </div>
                    ${data.humidity !== null ? `
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:water-percent" style="color: #60a5fa;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${Math.round(data.humidity)}%</span>
                            <span class="pill-label">Humid</span>
                        </div>
                    </div>
                    ` : ''}
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
                            <span class="pill-label">Box</span>
                        </div>
                    </div>
                    ${data.customTemp !== null ? `
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer-lines" style="color: #a78bfa;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${Math.round(data.customTemp)}°</span>
                            <span class="pill-label">Custom</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `}
            </div>
        </div>

        <div class="stats-row">
            <div class="stat-group">
                <span class="stat-label">Time Left</span>
                <span class="stat-val">${data.printTimeLeft}</span>
            </div>
            <div class="stat-group" style="align-items: flex-end;">
                <span class="stat-label">Layer</span>
                <span class="stat-val">${data.isIdle ? '--' : data.currentLayer} <span style="font-size: 0.875rem; opacity: 0.4;">/ ${data.isIdle ? '--' : data.totalLayers}</span></span>
            </div>
        </div>

        <div class="progress-bar-container">
            <div class="progress-bar-fill"></div>
            <div class="progress-text">${data.progress}%</div>
        </div>

        <div class="controls">
            <button class="btn btn-secondary btn-home" ${data.isIdle ? '' : 'disabled'} title="Home All Axes">
                <ha-icon icon="mdi:home"></ha-icon>
            </button>
            <button class="btn btn-secondary btn-stop" ${data.isIdle ? 'disabled' : ''} title="Stop Print">
                <ha-icon icon="mdi:stop"></ha-icon>
            </button>
            <button class="btn btn-primary btn-pause" ${data.isIdle ? 'disabled' : ''}>
                <ha-icon icon="${data.isPaused ? 'mdi:play' : 'mdi:pause'}"></ha-icon>
                ${data.isPaused ? 'Resume Print' : data.isPrinting ? 'Pause Print' : 'Control'}
            </button>
        </div>

      </div>
    `;

    this.setupListeners();
  }

  getCardSize() {
    return 7;
  }
}

customElements.define('prism-creality', PrismCrealityCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'prism-creality',
  name: 'Prism Creality',
  preview: true,
  description: 'Creality 3D Printer card for K1, K1C, K1 Max, K1 SE and more'
});

