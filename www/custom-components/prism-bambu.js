// Bambu Lab Manufacturer and Models for device filtering
// Synchronized with ha-bambulab-cards repository (https://github.com/greghesp/ha-bambulab-cards)
const BAMBU_MANUFACTURER = 'Bambu Lab';
const BAMBU_PRINTER_MODELS = [
  // A-Series
  'A1', 'A1 MINI', 'A1 Mini', 'A1MINI', 'A1Mini', 'A1mini',
  // H-Series (newer desktop printers)
  'H2C', 'H2D', 'H2DPRO', 'H2S',
  // P-Series
  'P1P', 'P1S', 'P2S',
  // X-Series (professional)
  'X1', 'X1C', 'X1E'
];

// AMS Models - synchronized with ha-bambulab-cards
const BAMBU_AMS_MODELS = [
  'AMS',           // Original AMS (4 slots)
  'AMS Lite',      // AMS Lite (4 slots, for A1)
  'AMS 2 Pro',     // AMS 2 Pro (newer, for H2D etc.)
  'AMS HT',        // AMS High Temperature
  'External Spool' // External spool holder
];

// Entity keys to look for (based on translation_key from ha-bambulab)
const ENTITY_KEYS = [
  'aux_fan_speed', 'bed_temp', 'chamber_fan_speed', 'chamber_light', 'chamber_temp',
  'cooling_fan_speed', 'cover_image', 'current_layer', 'door_open', 'humidity',
  'heatbreak_fan_speed', 'nozzle_temp', 'power', 'print_progress', 'print_status', 'remaining_time',
  'speed_profile', 'stage', 'target_bed_temp', 'target_bed_temperature',
  'target_nozzle_temp', 'target_nozzle_temperature', 'total_layers', 'camera',
  'titelbild' // German translation key for cover image
];

class PrismBambuCard extends HTMLElement {
  // Set to true for debugging output (should be false in production)
  static DEBUG = false;
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.showCamera = false;
    this.hasRendered = false;
    this._deviceEntities = {}; // Cache for device entities
    this._lastStatus = null; // Track status for re-render decisions
    this._updateThrottleTimer = null; // Throttle updates to prevent excessive re-renders
    this._snapshotInterval = null; // Interval for snapshot mode camera updates
  }
  
  // Debug logging helper - only logs if DEBUG is enabled
  static log(...args) {
    if (PrismBambuCard.DEBUG) {
      console.log('Prism Bambu:', ...args);
    }
  }

  static getStubConfig() {
    return {
      printer: '',
      name: 'Bambu Lab Printer',
      camera_entity: '',
      image: '/local/community/Prism-Dashboard/images/printer-blank.jpg'
    };
  }

  static getConfigForm() {
    // Build filter for printer device selector
    const printerFilterCombinations = BAMBU_PRINTER_MODELS.map(model => ({
      manufacturer: BAMBU_MANUFACTURER,
      model: model
    }));
    
    // Build filter for AMS device selector
    const amsFilterCombinations = BAMBU_AMS_MODELS.map(model => ({
      manufacturer: BAMBU_MANUFACTURER,
      model: model
    }));

    return {
      schema: [
        {
          name: 'printer',
          label: 'Bambu Lab Printer (select your printer device)',
          required: true,
          selector: { device: { filter: printerFilterCombinations } }
        },
        {
          name: 'ams_device',
          label: 'AMS Device (optional - select your AMS)',
          selector: { device: { filter: amsFilterCombinations } }
        },
        {
          name: 'name',
          label: 'Printer name (optional)',
          selector: { text: {} }
        },
        {
          name: 'camera_entity',
          label: 'Camera entity (optional - auto-detected if not set)',
          selector: { entity: { domain: 'camera' } }
        },
        {
          name: 'camera_live_stream',
          label: 'Use live stream (off = snapshot every 2 sec)',
          selector: { boolean: {} }
        },
        {
          name: 'image',
          label: 'Printer image path (optional, supports .png and .jpg)',
          selector: { text: {} }
        },
        {
          name: 'show_cover_image',
          label: 'Show 3D model preview (Titelbild) with print progress',
          selector: { boolean: {} }
        },
        {
          name: 'cover_image_entity',
          label: 'Cover image entity (optional - auto-detected if not set)',
          selector: { entity: { domain: 'image' } }
        },
        // Custom entities section
        {
          type: 'expandable',
          name: '',
          title: 'Custom Entities',
          schema: [
            {
              name: 'power_switch',
              label: 'Power switch entity',
              selector: { entity: { domain: 'switch' } }
            },
            {
              name: 'power_switch_icon',
              label: 'Power switch icon (default: mdi:power)',
              selector: { icon: {} }
            },
            {
              name: 'custom_light',
              label: 'Custom light entity (overrides auto-detected)',
              selector: { entity: { domain: 'light' } }
            },
            {
              name: 'custom_light_name',
              label: 'Custom light label (default: "Light")',
              selector: { text: {} }
            },
            {
              name: 'custom_humidity',
              label: 'Custom humidity sensor',
              selector: { entity: { domain: 'sensor', device_class: 'humidity' } }
            },
            {
              name: 'custom_humidity_name',
              label: 'Custom humidity label (default: "Humid")',
              selector: { text: {} }
            },
            {
              name: 'custom_temperature',
              label: 'Custom temperature sensor',
              selector: { entity: { domain: 'sensor', device_class: 'temperature' } }
            },
            {
              name: 'custom_temperature_name',
              label: 'Custom temperature label (default: "Custom")',
              selector: { text: {} }
            },
            {
              name: 'custom_fan',
              label: 'Custom fan sensor',
              selector: { entity: { domain: 'sensor' } }
            },
            {
              name: 'custom_fan_name',
              label: 'Custom fan label (default: "Custom")',
              selector: { text: {} }
            }
          ]
        },
        // Visibility toggles section
        {
          type: 'expandable',
          name: '',
          title: 'Display Options',
          schema: [
            {
              name: 'show_part_fan',
              label: 'Show Part Fan',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_aux_fan',
              label: 'Show Aux Fan',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_chamber_fan',
              label: 'Show Chamber Fan (if available)',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_heatbreak_fan',
              label: 'Show Heatbreak Fan (if available)',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_nozzle_temp',
              label: 'Show Nozzle Temperature',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_bed_temp',
              label: 'Show Bed Temperature',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_chamber_temp',
              label: 'Show Chamber Temperature',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_humidity',
              label: 'Show Humidity (if configured)',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_custom_temp',
              label: 'Show Custom Temperature (if configured)',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_custom_fan',
              label: 'Show Custom Fan (if configured)',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_ams_info',
              label: 'Show AMS Temperature & Humidity (if available)',
              default: true,
              selector: { boolean: {} }
            }
          ]
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

  // Find all entities belonging to this device (like ha-bambulab-cards does)
  getBambuDeviceEntities() {
    if (!this._hass || !this.config?.printer) return {};
    
    const deviceId = this.config.printer;
    const result = {};
    
    // Loop through all hass entities and find those belonging to our device
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      
      if (entityInfo.device_id === deviceId) {
        // Check if this entity matches one of our known keys
        if (entityInfo.platform === 'bambu_lab') {
          const translationKey = entityInfo.translation_key;
          if (ENTITY_KEYS.includes(translationKey)) {
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
        if (entityInfo.platform === 'bambu_lab') {
          const translationKey = entityInfo.translation_key;
          if (ENTITY_KEYS.includes(translationKey)) {
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
    if (Object.keys(deviceEntities).length === 0) {
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

    const progress = this.getEntityValueForDevice(deviceEntities, 'print_progress');
    const stateStr = this.getEntityStateForDevice(deviceEntities, 'print_status') || 
                     this.getEntityStateForDevice(deviceEntities, 'stage') || 'unavailable';
    
    const statusLower = stateStr.toLowerCase();
    
    // Extended pause states - includes layer pause, user pause, waiting states
    const pauseStates = ['paused', 'pause', 'pausiert', 'waiting', 'user_pause', 'user pause', 
                         'layer_pause', 'layer pause', 'filament_change', 'filament change',
                         'suspended', 'on hold', 'halted', 'm400_pause'];
    const printingStates = ['printing', 'prepare', 'running', 'druckt', 'vorbereiten', 'busy'];
    const idleStates = ['idle', 'standby', 'ready', 'finished', 'complete', 'stopped', 'cancelled', 
                        'error', 'offline', 'unavailable', 'slicing', 'unknown'];
    
    let isPrinting = printingStates.includes(statusLower);
    let isPaused = pauseStates.includes(statusLower);
    
    // Smart detection: If progress is between 0-100 and status is unknown, assume paused
    if (!isPrinting && !isPaused && progress > 0 && progress < 100) {
      if (!idleStates.includes(statusLower)) {
        isPaused = true;
        PrismBambuCard.log('Smart pause detection - status:', stateStr, 'progress:', progress);
      }
    }
    
    const isIdle = !isPrinting && !isPaused;

    // Remaining time
    const remainingTimeEntity = deviceEntities['remaining_time'];
    let printTimeLeft = '--';
    if (remainingTimeEntity?.entity_id && (isPrinting || isPaused)) {
      const state = this._hass.states[remainingTimeEntity.entity_id];
      if (state) {
        const unit = state?.attributes?.unit_of_measurement?.toLowerCase() || 'min';
        let rawValue = parseFloat(state.state) || 0;
        
        // Convert to minutes based on unit
        let minutes;
        if (unit === 'h' || unit === 'hours' || unit === 'hour' || unit === 'std' || unit === 'stunden') {
          minutes = rawValue * 60;
        } else if (unit === 's' || unit === 'sec' || unit === 'seconds' || unit === 'sekunden') {
          minutes = rawValue / 60;
        } else {
          minutes = rawValue;
        }
        
        if (minutes > 0) {
          const hours = Math.floor(minutes / 60);
          const mins = Math.round(minutes % 60);
          printTimeLeft = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
      }
    }

    // Temperatures
    const nozzleTemp = this.getEntityValueForDevice(deviceEntities, 'nozzle_temp');
    const targetNozzleTemp = this.getEntityValueForDevice(deviceEntities, 'target_nozzle_temp') || 
                             this.getEntityValueForDevice(deviceEntities, 'target_nozzle_temperature');
    const bedTemp = this.getEntityValueForDevice(deviceEntities, 'bed_temp');
    const targetBedTemp = this.getEntityValueForDevice(deviceEntities, 'target_bed_temp') || 
                          this.getEntityValueForDevice(deviceEntities, 'target_bed_temperature');
    const chamberTemp = this.getEntityValueForDevice(deviceEntities, 'chamber_temp');

    // Layer info
    let currentLayer = 0;
    let totalLayers = 0;
    if (isPrinting || isPaused) {
      currentLayer = parseInt(this.getEntityStateForDevice(deviceEntities, 'current_layer')) || 0;
      totalLayers = parseInt(this.getEntityStateForDevice(deviceEntities, 'total_layers')) || 0;
    }

    // Camera entity
    let cameraEntity = customCameraEntity;
    if (!cameraEntity) {
      const cameraEntityInfo = deviceEntities['camera'];
      if (cameraEntityInfo?.entity_id?.startsWith('camera.')) {
        cameraEntity = cameraEntityInfo.entity_id;
      } else {
        for (const key in deviceEntities) {
          const info = deviceEntities[key];
          if (info?.entity_id?.startsWith('camera.')) {
            cameraEntity = info.entity_id;
            break;
          }
        }
      }
    }
    if (cameraEntity && !cameraEntity.startsWith('camera.')) {
      cameraEntity = null;
    }

    // Device name
    const device = this._hass.devices?.[deviceId];
    const name = customName || device?.name || 'Bambu Lab Printer';

    return {
      deviceId,
      name,
      progress: isIdle ? 0 : progress,
      stateStr,
      isPrinting,
      isPaused,
      isIdle,
      printTimeLeft: isIdle ? '--' : printTimeLeft,
      currentLayer: isIdle ? 0 : currentLayer,
      totalLayers: isIdle ? 0 : totalLayers,
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
      this._deviceEntities = this.getBambuDeviceEntities();
      PrismBambuCard.log('Found device entities:', Object.keys(this._deviceEntities));
    }
    
    // Throttle updates to prevent excessive re-renders (max once per 100ms)
    // This prevents OOM issues when many state changes happen rapidly
    if (this._updateThrottleTimer) {
      return;
    }
    
    this._updateThrottleTimer = setTimeout(() => {
      this._updateThrottleTimer = null;
      this._performUpdate(firstTime, oldStatus);
    }, 100);
    
    // For first render, do it immediately
    if (!this.hasRendered || firstTime) {
      clearTimeout(this._updateThrottleTimer);
      this._updateThrottleTimer = null;
      this._performUpdate(firstTime, oldStatus);
    }
  }
  
  _performUpdate(firstTime, oldStatus) {
    // Get current status to detect changes
    const data = this.getPrinterData();
    const newStatus = `${data.isIdle}-${data.isPrinting}-${data.isPaused}-${!!data.chamberLightEntity}-${!!data.cameraEntity}-${!!data.powerSwitch}-${data.isPowerOn}`;
    
    // Re-render if: first time, status changed, or never rendered
    if (!this.hasRendered || firstTime || oldStatus !== newStatus) {
      this._lastStatus = newStatus;
      this.render();
      this.hasRendered = true;
      // Note: setupListeners() is already called by render(), no need to call it again
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
    const statVals = this.shadowRoot.querySelectorAll('.stats-row .stat-val');
    if (statVals.length >= 1) {
      statVals[0].textContent = data.printTimeLeft;
    }
    
    // Update layer
    if (statVals.length >= 2) {
      statVals[1].innerHTML = `${data.isIdle ? '--' : data.currentLayer} <span style="font-size: 0.875rem; opacity: 0.4;">/ ${data.isIdle ? '--' : data.totalLayers}</span>`;
    }
    
    // Update fans via data-pill attributes
    const updatePill = (selector, value) => {
      const pill = this.shadowRoot.querySelector(`[data-pill="${selector}"] .pill-value`);
      if (pill) pill.textContent = value;
    };
    
    updatePill('part-fan', `${data.partFanSpeed}%`);
    updatePill('aux-fan', `${data.auxFanSpeed}%`);
    if (data.chamberFanSpeed !== null && data.chamberFanSpeed !== undefined) {
      updatePill('chamber-fan', `${data.chamberFanSpeed}%`);
    }
    if (data.heatbreakFanSpeed !== null && data.heatbreakFanSpeed !== undefined) {
      updatePill('heatbreak-fan', `${data.heatbreakFanSpeed}%`);
    }
    if (data.humidity !== null) {
      updatePill('humidity', `${Math.round(data.humidity)}%`);
    }
    if (data.customFanSpeed !== null) {
      updatePill('custom-fan', `${Math.round(data.customFanSpeed)}%`);
    }
    
    // Update AMS info pills
    if (data.amsTemperature !== null) {
      const amsTempPill = this.shadowRoot.querySelector('[data-pill="ams-temp"] .ams-pill-content .ams-pill-value');
      if (amsTempPill) amsTempPill.textContent = `${Math.round(data.amsTemperature)}°C`;
    }
    if (data.amsHumidity !== null) {
      const amsHumidPill = this.shadowRoot.querySelector('[data-pill="ams-humidity"] .ams-pill-content .ams-pill-value');
      if (amsHumidPill) amsHumidPill.textContent = `${Math.round(data.amsHumidity)}%`;
    }
    
    // Update temperatures
    updatePill('nozzle-temp', `${Math.round(data.nozzleTemp)}°`);
    updatePill('bed-temp', `${Math.round(data.bedTemp)}°`);
    updatePill('chamber-temp', `${Math.round(data.chamberTemp)}°`);
    if (data.customTemp !== null) {
      updatePill('custom-temp', `${Math.round(data.customTemp)}°`);
    }
    
    // Update target temps
    const updateLabel = (selector, value) => {
      const label = this.shadowRoot.querySelector(`[data-pill="${selector}"] .pill-label`);
      if (label) label.textContent = value;
    };
    
    updateLabel('nozzle-temp', `/${Math.round(data.targetNozzleTemp)}°`);
    updateLabel('bed-temp', `/${Math.round(data.targetBedTemp)}°`);
    
    // Update camera stream hass if it exists
    const cameraStream = this.shadowRoot.querySelector('ha-camera-stream');
    if (cameraStream && this._hass) {
      cameraStream.hass = this._hass;
      if (data.cameraEntity) {
        cameraStream.stateObj = this._hass.states[data.cameraEntity];
      }
    }
    
    // Update light button state from actual HA state
    if (data.chamberLightEntity) {
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
    
    // Update cover image progress
    const coverProgress = this.shadowRoot.querySelector('.cover-image-progress');
    if (coverProgress) {
      coverProgress.style.setProperty('--progress-height', `${data.progress}%`);
    }
    
    const coverBadge = this.shadowRoot.querySelector('.cover-progress-badge');
    if (coverBadge) {
      coverBadge.textContent = `${Math.round(data.progress)}%`;
    }
    
    // Update cover image wrapper classes for state changes
    const coverWrapper = this.shadowRoot.querySelector('.cover-image-wrapper');
    if (coverWrapper) {
      coverWrapper.classList.toggle('printing', data.isPrinting);
      coverWrapper.classList.toggle('paused', data.isPaused);
      coverWrapper.classList.toggle('idle', data.isIdle);
    }
    
    // Update printer icon state
    const printerIcon = this.shadowRoot.querySelector('.printer-icon');
    if (printerIcon) {
      const isOfflineOrUnavailable = ['offline', 'unavailable'].includes(data.stateStr.toLowerCase());
      const isPowerOff = data.powerSwitch && !data.isPowerOn;
      
      printerIcon.classList.remove('offline', 'printing', 'paused');
      if (isOfflineOrUnavailable || isPowerOff) {
        printerIcon.classList.add('offline');
      } else if (data.isPrinting) {
        printerIcon.classList.add('printing');
      } else if (data.isPaused) {
        printerIcon.classList.add('paused');
      }
    }
    
    // Update cover image URL if it changed
    const coverImage = this.shadowRoot.querySelector('.cover-image');
    if (coverImage && data.coverImageUrl && coverImage.src !== data.coverImageUrl) {
      coverImage.src = data.coverImageUrl;
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
    // Cleanup timers to prevent memory leaks
    if (this._updateThrottleTimer) {
      clearTimeout(this._updateThrottleTimer);
      this._updateThrottleTimer = null;
    }
    if (this._snapshotInterval) {
      clearInterval(this._snapshotInterval);
      this._snapshotInterval = null;
    }
    if (this._cameraPopupInterval) {
      clearInterval(this._cameraPopupInterval);
      this._cameraPopupInterval = null;
    }
    if (this._cameraPopupUpdateInterval) {
      clearInterval(this._cameraPopupUpdateInterval);
      this._cameraPopupUpdateInterval = null;
    }
    if (this._cameraPopupEscHandler) {
      document.removeEventListener('keydown', this._cameraPopupEscHandler);
      this._cameraPopupEscHandler = null;
    }
    // Close camera popup if open
    this.closeCameraPopup();
    this._powerToggleDebounce = false;
  }

  setupListeners() {
    // Helper for touch + click support (tablets/mobile)
    const addTapListener = (element, callback) => {
      if (!element) return;
      let touchMoved = false;
      let touchStartTime = 0;
      
      element.addEventListener('touchstart', (e) => { 
        touchMoved = false; 
        touchStartTime = Date.now();
      }, { passive: true });
      
      element.addEventListener('touchmove', () => { 
        touchMoved = true; 
      }, { passive: true });
      
      element.addEventListener('touchend', (e) => {
        // Only trigger if it was a tap (not a swipe) and quick enough
        if (!touchMoved && (Date.now() - touchStartTime) < 500) {
          e.preventDefault();
          e.stopPropagation();
          callback(e);
        }
      });
      
      // Also keep click for desktop
      element.onclick = (e) => {
        e.stopPropagation();
        callback(e);
      };
    };
    
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

    const speedBtn = this.shadowRoot?.querySelector('.btn-speed');
    if (speedBtn) {
      speedBtn.onclick = () => this.handleSpeed();
    }
    
    // Header light button - toggle chamber light
    const lightBtn = this.shadowRoot?.querySelector('.btn-light');
    if (lightBtn) {
      lightBtn.onclick = (e) => {
        e.stopPropagation();
        this.handleLightToggle();
      };
    }
    
    // Header camera button - toggle camera view (separate from light!)
    const cameraBtn = this.shadowRoot?.querySelector('.btn-camera');
    if (cameraBtn) {
      cameraBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleView();
      };
    }
    
    // Camera container - create camera view (live stream or snapshot)
    const cameraContainer = this.shadowRoot?.querySelector('.camera-container');
    if (cameraContainer && this._hass) {
      const entityId = cameraContainer.dataset.entity;
      const stateObj = this._hass.states[entityId];
      
      if (stateObj) {
        // Check config for live stream mode (default: true)
        const useLiveStream = this.config.camera_live_stream !== false;
        
        // Clear any existing snapshot interval
        if (this._snapshotInterval) {
          clearInterval(this._snapshotInterval);
          this._snapshotInterval = null;
        }
        
        if (useLiveStream) {
          // LIVE STREAM MODE - use ha-camera-stream element
          const cameraStream = document.createElement('ha-camera-stream');
          cameraStream.hass = this._hass;
          cameraStream.stateObj = stateObj;
          cameraStream.className = 'camera-feed';
          cameraStream.style.cursor = 'pointer';
          
          // Enable live stream with muted audio for autoplay
          cameraStream.muted = true;
          cameraStream.controls = true;
          cameraStream.allowExoPlayer = true;
          
          // Set attributes for live streaming
          cameraStream.setAttribute('muted', '');
          cameraStream.setAttribute('controls', '');
          cameraStream.setAttribute('autoplay', '');
          
          PrismBambuCard.log('Camera live stream created:', entityId);
          
          // Clear container and add stream
          cameraContainer.innerHTML = '';
          cameraContainer.appendChild(cameraStream);
          
          // Tap/Click to open popup with full stream (works on tablets too)
          addTapListener(cameraStream, () => {
            this.openCameraPopup();
          });
        } else {
          // SNAPSHOT MODE - use img element with periodic refresh
          const snapshotImg = document.createElement('img');
          snapshotImg.className = 'camera-feed camera-snapshot';
          snapshotImg.style.cursor = 'pointer';
          snapshotImg.alt = 'Camera Snapshot';
          
          // Function to update snapshot
          const updateSnapshot = () => {
            if (this._hass && entityId) {
              const currentState = this._hass.states[entityId];
              if (currentState?.attributes?.entity_picture) {
                // Add timestamp to prevent caching
                const baseUrl = currentState.attributes.entity_picture;
                const separator = baseUrl.includes('?') ? '&' : '?';
                snapshotImg.src = `${baseUrl}${separator}_ts=${Date.now()}`;
              }
            }
          };
          
          // Initial snapshot
          updateSnapshot();
          
          // Refresh snapshot every 2 seconds
          this._snapshotInterval = setInterval(updateSnapshot, 2000);
          
          PrismBambuCard.log('Camera snapshot mode created:', entityId, 'Refresh: 2s');
          
          // Clear container and add snapshot image
          cameraContainer.innerHTML = '';
          cameraContainer.appendChild(snapshotImg);
          
          // Tap/Click to open popup with full stream (works on tablets too)
          addTapListener(snapshotImg, () => {
            this.openCameraPopup();
          });
        }
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
    
    // Filament slot click handlers - open popup with details
    const filamentSlots = this.shadowRoot?.querySelectorAll('.ams-slot.clickable');
    if (filamentSlots) {
      filamentSlots.forEach(slot => {
        slot.onclick = (e) => {
          e.stopPropagation();
          this.openFilamentPopup(slot);
        };
      });
    }
    
    // Filament popup close handlers
    const popupOverlay = this.shadowRoot?.querySelector('.filament-popup-overlay');
    const popupClose = this.shadowRoot?.querySelector('.filament-popup-close');
    
    if (popupOverlay) {
      popupOverlay.onclick = (e) => {
        if (e.target === popupOverlay) {
          this.closeFilamentPopup();
        }
      };
    }
    
    if (popupClose) {
      popupClose.onclick = (e) => {
        e.stopPropagation();
        this.closeFilamentPopup();
      };
    }
  }
  
  openFilamentPopup(slotElement) {
    const overlay = this.shadowRoot?.querySelector('.filament-popup-overlay');
    if (!overlay) return;
    
    // Get data from slot element
    const slotId = slotElement.dataset.slotId;
    const fullName = slotElement.dataset.fullName || '';
    const type = slotElement.dataset.type || 'Unknown';
    const color = slotElement.dataset.color || '#666666';
    const remaining = slotElement.dataset.remaining;
    const brand = slotElement.dataset.brand || '';
    const tempMin = slotElement.dataset.tempMin;
    const tempMax = slotElement.dataset.tempMax;
    
    // Update popup content
    const colorEl = overlay.querySelector('.filament-popup-color');
    if (colorEl) colorEl.style.backgroundColor = color;
    
    const setValue = (field, value) => {
      const el = overlay.querySelector(`[data-field="${field}"]`);
      if (el) el.textContent = value;
    };
    
    setValue('slot', `Slot ${slotId}`);
    setValue('name', fullName || type);
    setValue('type', type);
    setValue('brand', brand || '-');
    setValue('remaining', remaining < 0 ? 'Unknown' : `${remaining}%`);
    
    // Handle temperature range
    const tempRow = overlay.querySelector('[data-field-row="temp"]');
    const brandRow = overlay.querySelector('[data-field-row="brand"]');
    
    if (tempMin && tempMax) {
      setValue('temp', `${tempMin}° - ${tempMax}°`);
      if (tempRow) tempRow.style.display = 'flex';
    } else {
      if (tempRow) tempRow.style.display = 'none';
    }
    
    // Hide brand row if no brand
    if (brandRow) {
      brandRow.style.display = brand ? 'flex' : 'none';
    }
    
    // Show popup
    overlay.style.display = 'flex';
  }
  
  closeFilamentPopup() {
    const overlay = this.shadowRoot?.querySelector('.filament-popup-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
  
  handlePowerToggle() {
    if (!this._hass || !this.config.power_switch) return;
    
    // Debounce: Prevent multiple rapid clicks (wait 1 second between toggles)
    if (this._powerToggleDebounce) {
      PrismBambuCard.log('Power toggle debounced - too fast');
      return;
    }
    this._powerToggleDebounce = true;
    setTimeout(() => { this._powerToggleDebounce = false; }, 1000);
    
    const entityId = this.config.power_switch;
    
    // Verify the entity exists before calling service
    const entityState = this._hass.states[entityId];
    if (!entityState) {
      console.warn('Prism Bambu: Power switch entity not found:', entityId);
      return;
    }
    
    // Call the service
    this._hass.callService('switch', 'toggle', { entity_id: entityId });
    PrismBambuCard.log('Power toggle called for:', entityId);
    
    // Optimistically update UI immediately (don't wait for HA state update)
    const powerBtn = this.shadowRoot?.querySelector('.btn-power');
    const currentState = entityState.state;
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
    
    // Stop snapshot interval when closing camera view
    if (!this.showCamera && this._snapshotInterval) {
      clearInterval(this._snapshotInterval);
      this._snapshotInterval = null;
    }
    
    this.render();
  }

  handlePause() {
    if (!this._hass) return;
    
    const deviceId = this.config?.printer;
    const data = this.getPrinterData();
    
    // Bambu Lab has SEPARATE buttons for pause and resume
    // German: druckvorgang_anhalten (pause), druckvorgang_fortsetzen (resume)
    // English: pause, resume
    let btn = null;
    
    if (data.isPaused) {
      // Need to RESUME - find resume button
      const resumePatterns = ['druckvorgang_fortsetzen', 'resume_print', 'resume'];
      for (const pattern of resumePatterns) {
        btn = this.findEntityByPatternForDevice(deviceId, pattern, 'button');
        if (btn) break;
      }
      if (!btn) {
        for (const pattern of resumePatterns) {
          btn = this.findEntityByPattern(pattern, 'button');
          if (btn) break;
        }
      }
    } else if (data.isPrinting) {
      // Need to PAUSE - find pause button
      const pausePatterns = ['druckvorgang_anhalten', 'pause_print', 'pause'];
      for (const pattern of pausePatterns) {
        btn = this.findEntityByPatternForDevice(deviceId, pattern, 'button');
        if (btn) break;
      }
      if (!btn) {
        for (const pattern of pausePatterns) {
          btn = this.findEntityByPattern(pattern, 'button');
          if (btn) break;
        }
      }
    }
    
    PrismBambuCard.log('handlePause - isPaused:', data.isPaused, 'isPrinting:', data.isPrinting, 'Found entity:', btn);
    
    if (btn) {
      this._hass.callService('button', 'press', { entity_id: btn });
      PrismBambuCard.log('Called button.press for:', btn);
    } else {
      // Fallback: Open more-info dialog
      PrismBambuCard.log('No pause/resume button found, opening more-info dialog');
      if (this._deviceEntities['print_status']) {
        const event = new CustomEvent('hass-more-info', {
          bubbles: true,
          composed: true,
          detail: { entityId: this._deviceEntities['print_status'].entity_id }
        });
        this.dispatchEvent(event);
      }
    }
  }

  handleStop() {
    if (!this._hass) return;
    
    const deviceId = this.config?.printer;
    
    // German: druckvorgang_beenden, English: stop_print, stop
    const stopPatterns = ['druckvorgang_beenden', 'stop_print', 'stop'];
    let stopBtn = null;
    
    for (const pattern of stopPatterns) {
      stopBtn = this.findEntityByPatternForDevice(deviceId, pattern, 'button');
      if (stopBtn) break;
    }
    
    if (!stopBtn) {
      for (const pattern of stopPatterns) {
        stopBtn = this.findEntityByPattern(pattern, 'button');
        if (stopBtn) break;
      }
    }
    
    PrismBambuCard.log('handleStop - Found entity:', stopBtn);
    
    if (stopBtn) {
      this._hass.callService('button', 'press', { entity_id: stopBtn });
      PrismBambuCard.log('Called button.press for:', stopBtn);
    } else {
      // Fallback: Open more-info dialog
      if (this._deviceEntities['print_status']) {
        const event = new CustomEvent('hass-more-info', {
          bubbles: true,
          composed: true,
          detail: { entityId: this._deviceEntities['print_status'].entity_id }
        });
        this.dispatchEvent(event);
      }
    }
  }

  handleSpeed() {
    if (!this._hass || !this._deviceEntities['speed_profile']) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this._deviceEntities['speed_profile'].entity_id }
    });
    this.dispatchEvent(event);
  }
  
  handleLightToggle() {
    if (!this._hass || !this._deviceEntities['chamber_light']) return;
    const entityId = this._deviceEntities['chamber_light'].entity_id;
    
    // Call the service
    this._hass.callService('light', 'toggle', { entity_id: entityId });
    
    // Optimistically update UI immediately (don't wait for HA state update)
    const lightBtn = this.shadowRoot?.querySelector('.btn-light');
    const currentState = this._hass.states[entityId]?.state;
    const newState = currentState === 'on' ? 'off' : 'on';
    
    if (lightBtn) {
      // Toggle active class
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
    // Get camera entity - prefer config, then auto-detected
    let entityId = this.config.camera_entity;
    if (!entityId) {
      // Find camera entity from device entities (must be camera domain)
      for (const key in this._deviceEntities) {
        const info = this._deviceEntities[key];
        if (info?.entity_id?.startsWith('camera.')) {
          entityId = info.entity_id;
          break;
        }
      }
    }
    
    if (!entityId) return;
    
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return;
    
    // Remove existing popup if any
    this.closeCameraPopup();
    
    // Get printer name for title
    const deviceId = this.config.printer;
    const device = this._hass.devices?.[deviceId];
    const printerName = this.config.name || device?.name || 'Bambu Lab Printer';
    
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
          /* Calculate width based on 16:9 aspect ratio of video area (height minus header + footer bar ~90px) */
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
        /* Popup Title Icon - Neumorphism */
        .prism-camera-title-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00AE42;
          --mdc-icon-size: 16px;
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.4),
            -1px -1px 3px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-camera-title-icon ha-icon {
          display: flex;
          --mdc-icon-size: 16px;
          filter: drop-shadow(0 0 4px rgba(0, 174, 66, 0.5));
        }
        /* Popup Close Button - Neumorphism */
        .prism-camera-close {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.4);
          --mdc-icon-size: 16px;
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.4),
            -1px -1px 3px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-camera-close ha-icon {
          display: flex;
          --mdc-icon-size: 16px;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .prism-camera-close:hover {
          color: #f87171;
        }
        .prism-camera-close:hover ha-icon {
          filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.6));
        }
        .prism-camera-close:active {
          background: linear-gradient(145deg, #22252b, #2d3038);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.5),
            inset -1px -1px 3px rgba(255, 255, 255, 0.03);
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
        /* Info Header Icon - Neumorphism */
        .prism-info-header-icon {
          width: 22px;
          height: 22px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00AE42;
          --mdc-icon-size: 12px;
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.3),
            -1px -1px 2px rgba(255, 255, 255, 0.02),
            inset 1px 1px 1px rgba(255, 255, 255, 0.05);
        }
        .prism-info-header-icon ha-icon {
          display: flex;
          --mdc-icon-size: 12px;
          filter: drop-shadow(0 0 3px rgba(0, 174, 66, 0.5));
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
          color: #4ade80;
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
          background: linear-gradient(90deg, #00AE42, #4ade80);
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
        /* Stat Icons - Neumorphism */
        .prism-info-stat-icon {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(145deg, #2a2d33, #1f2226);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.4),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03);
        }
        .prism-info-stat-icon ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .prism-info-stat-icon.time { color: #60a5fa; }
        .prism-info-stat-icon.time ha-icon { filter: drop-shadow(0 0 3px rgba(96, 165, 250, 0.5)); }
        .prism-info-stat-icon.layer { color: #a78bfa; }
        .prism-info-stat-icon.layer ha-icon { filter: drop-shadow(0 0 3px rgba(167, 139, 250, 0.5)); }
        .prism-info-stat-icon.nozzle { color: #f87171; }
        .prism-info-stat-icon.nozzle ha-icon { filter: drop-shadow(0 0 3px rgba(248, 113, 113, 0.5)); }
        .prism-info-stat-icon.bed { color: #fb923c; }
        .prism-info-stat-icon.bed ha-icon { filter: drop-shadow(0 0 3px rgba(251, 146, 60, 0.5)); }
        .prism-info-stat-icon.chamber { color: #4ade80; }
        .prism-info-stat-icon.chamber ha-icon { filter: drop-shadow(0 0 3px rgba(74, 222, 128, 0.5)); }
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
          background: ${data.isPrinting ? 'rgba(74, 222, 128, 0.08)' : data.isPaused ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255,255,255,0.03)'};
          border: 1px solid ${data.isPrinting ? 'rgba(74, 222, 128, 0.2)' : data.isPaused ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.06)'};
          border-radius: 8px;
          margin-top: auto;
        }
        .prism-info-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${data.isPrinting ? '#4ade80' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.3)'};
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
          color: ${data.isPrinting ? '#4ade80' : data.isPaused ? '#fbbf24' : 'rgba(255,255,255,0.4)'};
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
        .prism-camera-toggle-info,
        .prism-camera-toggle-light {
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
          --mdc-icon-size: 10px;
        }
        .prism-camera-toggle-info ha-icon,
        .prism-camera-toggle-light ha-icon {
          display: flex;
          --mdc-icon-size: 10px;
        }
        .prism-camera-toggle-info:hover,
        .prism-camera-toggle-light:hover {
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8);
        }
        .prism-camera-toggle-info.active {
          background: rgba(0, 174, 66, 0.15);
          color: #4ade80;
        }
        .prism-camera-toggle-light.active {
          background: rgba(255, 200, 100, 0.2);
          color: #ffc864;
        }
        .prism-camera-resize-hint {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-right: 30px;
        }
        /* Stop Button - Neumorphism */
        .prism-info-stop-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px 12px;
          margin-top: 8px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          border-radius: 8px;
          color: #f87171;
          font-size: 10px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.02),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-info-stop-btn ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 3px rgba(248, 113, 113, 0.4));
          transition: all 0.2s ease;
        }
        .prism-info-stop-btn:hover {
          color: #fca5a5;
        }
        .prism-info-stop-btn:hover ha-icon {
          filter: drop-shadow(0 0 5px rgba(248, 113, 113, 0.6));
        }
        .prism-info-stop-btn:active {
          background: linear-gradient(145deg, #22252b, #2d3038);
          box-shadow: 
            inset 3px 3px 6px rgba(0, 0, 0, 0.5),
            inset -2px -2px 4px rgba(255, 255, 255, 0.02);
        }
        .prism-camera-info.hidden {
          display: none;
        }
        /* Custom Resize Handle */
        .prism-camera-resize-handle {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          cursor: nwse-resize;
          z-index: 100;
        }
        .prism-camera-resize-handle::before {
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
        .prism-camera-resize-handle:hover::before {
          background: 
            linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.2) 38%, transparent 38%),
            linear-gradient(135deg, transparent 48%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0.2) 56%, transparent 56%),
            linear-gradient(135deg, transparent 66%, rgba(255,255,255,0.3) 66%);
        }
        .prism-camera-resize-handle:active::before {
          background: 
            linear-gradient(135deg, transparent 30%, rgba(0,174,66,0.3) 30%, rgba(0,174,66,0.3) 38%, transparent 38%),
            linear-gradient(135deg, transparent 48%, rgba(0,174,66,0.3) 48%, rgba(0,174,66,0.3) 56%, transparent 56%),
            linear-gradient(135deg, transparent 66%, rgba(0,174,66,0.4) 66%);
        }
      </style>
      <div class="prism-camera-popup">
        <div class="prism-camera-header">
          <div class="prism-camera-title">
            <div class="prism-camera-title-icon">
              <ha-icon icon="mdi:camera"></ha-icon>
            </div>
            <span>${printerName}</span>
          </div>
          <button class="prism-camera-close">
            <ha-icon icon="mdi:close"></ha-icon>
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
            <button class="prism-camera-toggle-light">
              <ha-icon icon="mdi:lightbulb-outline"></ha-icon>
              <span>Light</span>
            </button>
            <button class="prism-camera-toggle-info active">
              <ha-icon icon="mdi:information"></ha-icon>
              <span>Info</span>
            </button>
          </div>
          <div class="prism-camera-resize-hint">
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
    
    // Check config for live stream mode (default: true)
    const useLiveStream = this.config.camera_live_stream !== false;
    
    if (useLiveStream) {
      // LIVE STREAM MODE - use ha-camera-stream element
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
    } else {
      // SNAPSHOT MODE - use img element
      const snapshotImg = document.createElement('img');
      snapshotImg.className = 'prism-camera-snapshot';
      snapshotImg.alt = 'Camera';
      
      if (stateObj.attributes?.entity_picture) {
        const baseUrl = stateObj.attributes.entity_picture;
        const separator = baseUrl.includes('?') ? '&' : '?';
        snapshotImg.src = `${baseUrl}${separator}_ts=${Date.now()}`;
      }
      content.appendChild(snapshotImg);
      
      // Start interval for snapshot refresh
      this._cameraPopupInterval = setInterval(() => {
        const currentState = this._hass?.states[entityId];
        if (currentState?.attributes?.entity_picture) {
          const baseUrl = currentState.attributes.entity_picture;
          const separator = baseUrl.includes('?') ? '&' : '?';
          snapshotImg.src = `${baseUrl}${separator}_ts=${Date.now()}`;
        }
      }, 2000);
    }
    
    // Close button handler
    overlay.querySelector('.prism-camera-close').onclick = () => this.closeCameraPopup();
    
    // Toggle info panel handler
    const toggleInfoBtn = overlay.querySelector('.prism-camera-toggle-info');
    const infoPanel = overlay.querySelector('.prism-camera-info');
    toggleInfoBtn.onclick = () => {
      infoPanel.classList.toggle('hidden');
      toggleInfoBtn.classList.toggle('active');
    };
    
    // Light toggle handler
    const toggleLightBtn = overlay.querySelector('.prism-camera-toggle-light');
    const lightEntity = this.config.custom_light || this._deviceEntities['chamber_light']?.entity_id;
    if (toggleLightBtn && lightEntity) {
      const updateLightState = () => {
        const state = this._hass.states[lightEntity]?.state;
        if (state === 'on') {
          toggleLightBtn.classList.add('active');
          toggleLightBtn.querySelector('ha-icon').setAttribute('icon', 'mdi:lightbulb');
        } else {
          toggleLightBtn.classList.remove('active');
          toggleLightBtn.querySelector('ha-icon').setAttribute('icon', 'mdi:lightbulb-outline');
        }
      };
      updateLightState();
      
      toggleLightBtn.onclick = () => {
        this._hass.callService('light', 'toggle', { entity_id: lightEntity });
        setTimeout(updateLightState, 100);
      };
    } else if (toggleLightBtn) {
      toggleLightBtn.style.display = 'none';
    }
    
    // Stop print button handler
    const stopBtn = overlay.querySelector('.prism-info-stop-btn');
    stopBtn.onclick = async () => {
      // Find the print stop button entity
      const deviceId = this.config.printer;
      let stopEntity = null;
      
      // Look for button.xxx_stop_print or similar
      for (const entityId in this._hass.entities) {
        const entityInfo = this._hass.entities[entityId];
        if (entityInfo.device_id === deviceId && 
            entityInfo.platform === 'bambu_lab' &&
            (entityId.includes('stop') || entityInfo.translation_key === 'stop')) {
          stopEntity = entityId;
          break;
        }
      }
      
      if (stopEntity) {
        // Confirm before stopping
        if (confirm('Are you sure you want to stop the print?')) {
          try {
            await this._hass.callService('button', 'press', {
              entity_id: stopEntity
            });
          } catch (e) {
            console.error('Failed to stop print:', e);
          }
        }
      } else {
        // Alternative: try to find any stop-related entity or use event
        alert('Stop entity not found. Please check your Bambu Lab integration.');
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
    
    // Make popup draggable by header (mouse + touch support)
    const popup = overlay.querySelector('.prism-camera-popup');
    const header = overlay.querySelector('.prism-camera-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    const getEventCoords = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };
    
    const startDrag = (e) => {
      if (e.target.closest('.prism-camera-close')) return;
      isDragging = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      startX = coords.x;
      startY = coords.y;
      startLeft = rect.left;
      startTop = rect.top;
      popup.style.position = 'fixed';
      popup.style.margin = '0';
      popup.style.left = startLeft + 'px';
      popup.style.top = startTop + 'px';
      if (e.cancelable) e.preventDefault();
    };
    
    header.onmousedown = startDrag;
    header.ontouchstart = startDrag;
    
    this._cameraPopupDragHandler = (e) => {
      if (!isDragging) return;
      const coords = getEventCoords(e);
      const dx = coords.x - startX;
      const dy = coords.y - startY;
      popup.style.left = (startLeft + dx) + 'px';
      popup.style.top = (startTop + dy) + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupDragHandler);
    document.addEventListener('touchmove', this._cameraPopupDragHandler, { passive: true });
    
    this._cameraPopupDragEndHandler = () => {
      isDragging = false;
    };
    document.addEventListener('mouseup', this._cameraPopupDragEndHandler);
    document.addEventListener('touchend', this._cameraPopupDragEndHandler);
    
    // Custom resize handle (mouse + touch support)
    const resizeHandle = overlay.querySelector('.prism-camera-resize-handle');
    let isResizing = false;
    let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;
    
    const startResize = (e) => {
      isResizing = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      resizeStartX = coords.x;
      resizeStartY = coords.y;
      resizeStartWidth = rect.width;
      resizeStartHeight = rect.height;
      
      // Ensure popup has fixed positioning for resize
      if (popup.style.position !== 'fixed') {
        popup.style.position = 'fixed';
        popup.style.margin = '0';
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.top + 'px';
      }
      
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    
    resizeHandle.onmousedown = startResize;
    resizeHandle.ontouchstart = startResize;
    
    this._cameraPopupResizeHandler = (e) => {
      if (!isResizing) return;
      const coords = getEventCoords(e);
      const dx = coords.x - resizeStartX;
      const dy = coords.y - resizeStartY;
      const newWidth = Math.max(400, Math.min(resizeStartWidth + dx, window.innerWidth * 0.95));
      const newHeight = Math.max(300, Math.min(resizeStartHeight + dy, window.innerHeight * 0.95));
      popup.style.width = newWidth + 'px';
      popup.style.height = newHeight + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupResizeHandler);
    document.addEventListener('touchmove', this._cameraPopupResizeHandler, { passive: true });
    
    this._cameraPopupResizeEndHandler = () => {
      isResizing = false;
    };
    document.addEventListener('mouseup', this._cameraPopupResizeEndHandler);
    document.addEventListener('touchend', this._cameraPopupResizeEndHandler);
    
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
    
    PrismBambuCard.log('Camera popup opened:', entityId);
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
    
    // Clear snapshot interval if running
    if (this._cameraPopupInterval) {
      clearInterval(this._cameraPopupInterval);
      this._cameraPopupInterval = null;
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
    
    // Refresh the camera stream in the card (it may have paused while popup was open)
    this._refreshCardCameraStream();
    
    // Remove drag listeners (mouse + touch)
    if (this._cameraPopupDragHandler) {
      document.removeEventListener('mousemove', this._cameraPopupDragHandler);
      document.removeEventListener('touchmove', this._cameraPopupDragHandler);
      this._cameraPopupDragHandler = null;
    }
    if (this._cameraPopupDragEndHandler) {
      document.removeEventListener('mouseup', this._cameraPopupDragEndHandler);
      document.removeEventListener('touchend', this._cameraPopupDragEndHandler);
      this._cameraPopupDragEndHandler = null;
    }
    
    // Remove resize listeners (mouse + touch)
    if (this._cameraPopupResizeHandler) {
      document.removeEventListener('mousemove', this._cameraPopupResizeHandler);
      document.removeEventListener('touchmove', this._cameraPopupResizeHandler);
      this._cameraPopupResizeHandler = null;
    }
    if (this._cameraPopupResizeEndHandler) {
      document.removeEventListener('mouseup', this._cameraPopupResizeEndHandler);
      document.removeEventListener('touchend', this._cameraPopupResizeEndHandler);
      this._cameraPopupResizeEndHandler = null;
    }
    
    PrismBambuCard.log('Camera popup closed');
  }
  
  // Refresh the camera stream in the card after popup closes
  _refreshCardCameraStream() {
    if (!this.shadowRoot || !this._hass || !this.showCamera) return;
    
    const cameraContainer = this.shadowRoot.querySelector('.camera-container');
    if (!cameraContainer) return;
    
    const entityId = cameraContainer.dataset.entity;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return;
    
    // Check if using live stream mode
    const useLiveStream = this.config.camera_live_stream !== false;
    if (!useLiveStream) return; // Snapshot mode doesn't need refresh
    
    // Find existing camera stream
    const existingStream = cameraContainer.querySelector('ha-camera-stream');
    if (!existingStream) return;
    
    // Small delay to let popup fully close, then recreate stream
    setTimeout(() => {
      // Remove old stream
      existingStream.remove();
      
      // Create fresh camera stream
      const cameraStream = document.createElement('ha-camera-stream');
      cameraStream.hass = this._hass;
      cameraStream.stateObj = stateObj;
      cameraStream.className = 'camera-feed';
      cameraStream.style.cursor = 'pointer';
      cameraStream.muted = true;
      cameraStream.controls = true;
      cameraStream.allowExoPlayer = true;
      cameraStream.setAttribute('muted', '');
      cameraStream.setAttribute('controls', '');
      cameraStream.setAttribute('autoplay', '');
      
      cameraContainer.appendChild(cameraStream);
      
      // Re-add tap listener
      let touchMoved = false;
      let touchStartTime = 0;
      
      cameraStream.addEventListener('touchstart', () => { 
        touchMoved = false; 
        touchStartTime = Date.now();
      }, { passive: true });
      
      cameraStream.addEventListener('touchmove', () => { 
        touchMoved = true; 
      }, { passive: true });
      
      cameraStream.addEventListener('touchend', (e) => {
        if (!touchMoved && (Date.now() - touchStartTime) < 500) {
          e.preventDefault();
          e.stopPropagation();
          this.openCameraPopup();
        }
      });
      
      cameraStream.onclick = (e) => {
        e.stopPropagation();
        this.openCameraPopup();
      };
      
      PrismBambuCard.log('Camera stream refreshed after popup close');
    }, 100);
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
        /* Multi-Printer Title Icon - Neumorphism */
        .prism-multi-title-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00AE42;
          --mdc-icon-size: 18px;
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-multi-title-icon ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
          filter: drop-shadow(0 0 4px rgba(0, 174, 66, 0.5));
        }
        .prism-multi-badge {
          background: linear-gradient(145deg, #1c1e24, #25282e);
          color: #4ade80;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.3),
            inset -1px -1px 2px rgba(255, 255, 255, 0.02);
        }
        /* Multi-Printer Close Button - Neumorphism */
        .prism-multi-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(145deg, #2d3038, #22252b);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.4);
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          --mdc-icon-size: 18px;
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-multi-close ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
          transition: all 0.2s ease;
        }
        .prism-multi-close:hover {
          color: #f87171;
        }
        .prism-multi-close:hover ha-icon {
          filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.6));
        }
        .prism-multi-close:active {
          background: linear-gradient(145deg, #22252b, #2d3038);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.5),
            inset -1px -1px 3px rgba(255, 255, 255, 0.03);
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
          background: rgba(0, 174, 66, 0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00AE42;
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
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
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
          color: #4ade80;
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
          background: linear-gradient(90deg, #00AE42, #4ade80);
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
          background: rgba(0, 174, 66, 0.15);
          color: #4ade80;
        }
        .prism-multi-info-hidden .prism-multi-info-panel {
          display: none;
        }
        .prism-multi-resize-hint {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-right: 30px;
          --mdc-icon-size: 12px;
        }
        .prism-multi-resize-hint ha-icon {
          display: flex;
          --mdc-icon-size: 12px;
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
    
    // Setup camera feeds
    const useLiveStream = this.config.camera_live_stream !== false;
    validPrinters.forEach((printer, idx) => {
      const cameraContainer = overlay.querySelector(`[data-camera-idx="${idx}"]`);
      if (!cameraContainer || !printer.cameraEntity) return;
      
      const stateObj = this._hass.states[printer.cameraEntity];
      if (!stateObj) return;
      
      if (useLiveStream) {
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
      } else {
        const snapshotImg = document.createElement('img');
        snapshotImg.className = 'prism-multi-snapshot';
        snapshotImg.alt = printer.name;
        snapshotImg.dataset.entityId = printer.cameraEntity;
        
        if (stateObj.attributes?.entity_picture) {
          const baseUrl = stateObj.attributes.entity_picture;
          const separator = baseUrl.includes('?') ? '&' : '?';
          snapshotImg.src = `${baseUrl}${separator}_ts=${Date.now()}`;
        }
        cameraContainer.appendChild(snapshotImg);
      }
    });
    
    // Snapshot refresh interval (if not live stream)
    if (!useLiveStream) {
      this._cameraPopupInterval = setInterval(() => {
        overlay.querySelectorAll('.prism-multi-snapshot').forEach(img => {
          const entityId = img.dataset.entityId;
          const currentState = this._hass?.states[entityId];
          if (currentState?.attributes?.entity_picture) {
            const baseUrl = currentState.attributes.entity_picture;
            const separator = baseUrl.includes('?') ? '&' : '?';
            img.src = `${baseUrl}${separator}_ts=${Date.now()}`;
          }
        });
      }, 2000);
    }
    
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
      
      // Find light entity for this device
      let lightEntity = null;
      for (const entityId in this._hass.entities) {
        const entityInfo = this._hass.entities[entityId];
        if (entityInfo.device_id === deviceId && 
            entityInfo.platform === 'bambu_lab' &&
            (entityInfo.translation_key === 'chamber_light' || entityId.includes('light'))) {
          if (entityId.startsWith('light.')) {
            lightEntity = entityId;
            break;
          }
        }
      }
      
      // Update button state based on current light state
      if (lightEntity) {
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
          this._hass.callService('light', 'toggle', { entity_id: lightEntity });
          // Optimistic update
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
    
    // Make popup draggable by header (mouse + touch support)
    const popup = overlay.querySelector('.prism-multi-popup');
    const header = overlay.querySelector('.prism-multi-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    const getEventCoords = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };
    
    const startDrag = (e) => {
      if (e.target.closest('.prism-multi-close')) return;
      isDragging = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      startX = coords.x;
      startY = coords.y;
      startLeft = rect.left;
      startTop = rect.top;
      popup.style.position = 'fixed';
      popup.style.margin = '0';
      popup.style.left = startLeft + 'px';
      popup.style.top = startTop + 'px';
      if (e.cancelable) e.preventDefault();
    };
    
    header.onmousedown = startDrag;
    header.ontouchstart = startDrag;
    
    this._cameraPopupDragHandler = (e) => {
      if (!isDragging) return;
      const coords = getEventCoords(e);
      const dx = coords.x - startX;
      const dy = coords.y - startY;
      popup.style.left = (startLeft + dx) + 'px';
      popup.style.top = (startTop + dy) + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupDragHandler);
    document.addEventListener('touchmove', this._cameraPopupDragHandler, { passive: true });
    
    this._cameraPopupDragEndHandler = () => {
      isDragging = false;
    };
    document.addEventListener('mouseup', this._cameraPopupDragEndHandler);
    document.addEventListener('touchend', this._cameraPopupDragEndHandler);
    
    // Custom resize handle (mouse + touch support)
    const resizeHandle = overlay.querySelector('.prism-multi-resize-handle');
    let isResizing = false;
    let resizeStartX, resizeStartY, resizeStartWidth, resizeStartHeight;
    
    const startResize = (e) => {
      isResizing = true;
      const rect = popup.getBoundingClientRect();
      const coords = getEventCoords(e);
      resizeStartX = coords.x;
      resizeStartY = coords.y;
      resizeStartWidth = rect.width;
      resizeStartHeight = rect.height;
      
      if (popup.style.position !== 'fixed') {
        popup.style.position = 'fixed';
        popup.style.margin = '0';
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.top + 'px';
      }
      
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    
    resizeHandle.onmousedown = startResize;
    resizeHandle.ontouchstart = startResize;
    
    this._cameraPopupResizeHandler = (e) => {
      if (!isResizing) return;
      const coords = getEventCoords(e);
      const dx = coords.x - resizeStartX;
      const dy = coords.y - resizeStartY;
      const newWidth = Math.max(600, Math.min(resizeStartWidth + dx, window.innerWidth * 0.98));
      const newHeight = Math.max(400, Math.min(resizeStartHeight + dy, window.innerHeight * 0.98));
      popup.style.width = newWidth + 'px';
      popup.style.height = newHeight + 'px';
    };
    document.addEventListener('mousemove', this._cameraPopupResizeHandler);
    document.addEventListener('touchmove', this._cameraPopupResizeHandler, { passive: true });
    
    this._cameraPopupResizeEndHandler = () => {
      isResizing = false;
    };
    document.addEventListener('mouseup', this._cameraPopupResizeEndHandler);
    document.addEventListener('touchend', this._cameraPopupResizeEndHandler);
    
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
    
    PrismBambuCard.log('Multi-camera popup opened with', printerCount, 'printers');
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
      console.warn('Prism Bambu: No device entities found for device:', this.config.printer);
      return this.getPreviewData();
    }
    
    // Read values using translation keys (how ha-bambulab organizes entities)
    const progress = this.getEntityValue('print_progress');
    const stateStr = this.getEntityState('print_status') || this.getEntityState('stage') || 'unavailable';
    
    // Debug: Log the current status
    PrismBambuCard.log('Current status:', stateStr, 'Progress:', progress);
    
    // Determine if printer is actively printing (support German status names too)
    const statusLower = stateStr.toLowerCase();
    
    // Extended pause states - includes layer pause, user pause, waiting states
    const pauseStates = ['paused', 'pause', 'pausiert', 'waiting', 'user_pause', 'user pause', 
                         'layer_pause', 'layer pause', 'filament_change', 'filament change',
                         'suspended', 'on hold', 'halted', 'm400_pause'];
    const printingStates = ['printing', 'prepare', 'running', 'druckt', 'vorbereiten', 'busy'];
    const idleStates = ['idle', 'standby', 'ready', 'finished', 'complete', 'stopped', 'cancelled', 
                        'error', 'offline', 'unavailable', 'slicing', 'unknown'];
    
    let isPrinting = printingStates.includes(statusLower);
    let isPaused = pauseStates.includes(statusLower);
    
    // Smart detection: If progress is between 0-100 and status is unknown, assume paused
    if (!isPrinting && !isPaused && progress > 0 && progress < 100) {
      if (!idleStates.includes(statusLower)) {
        isPaused = true;
        PrismBambuCard.log('Main Card Smart pause detection - status:', stateStr, 'progress:', progress);
      }
    }
    
    const isIdle = !isPrinting && !isPaused;
    
    // Get remaining time - format it nicely (only if printing)
    const remainingTimeEntity = this._deviceEntities['remaining_time'];
    let printTimeLeft = '--';
    let printEndTime = '--:--';
    
    // Debug: Log entity discovery
    PrismBambuCard.log('Entity check - remaining_time:', remainingTimeEntity?.entity_id || 'NOT FOUND');
    PrismBambuCard.log('Entity check - current_layer:', this._deviceEntities['current_layer']?.entity_id || 'NOT FOUND');
    PrismBambuCard.log('Entity check - total_layers:', this._deviceEntities['total_layers']?.entity_id || 'NOT FOUND');
    PrismBambuCard.log('isPrinting:', isPrinting, 'isPaused:', isPaused, 'isIdle:', isIdle);
    
    if (remainingTimeEntity?.entity_id && (isPrinting || isPaused)) {
      const state = this._hass.states[remainingTimeEntity.entity_id];
      const unit = state?.attributes?.unit_of_measurement?.toLowerCase() || 'min';
      PrismBambuCard.log('remaining_time state:', state?.state, 'unit:', unit);
      if (state) {
        let rawValue = parseFloat(state.state) || 0;
        
        // Convert to minutes based on unit
        let minutes;
        if (unit === 'h' || unit === 'hours' || unit === 'hour' || unit === 'std' || unit === 'stunden') {
          // Value is in hours, convert to minutes
          minutes = rawValue * 60;
          PrismBambuCard.log('Converted hours to minutes:', rawValue, 'h ->', minutes, 'min');
        } else if (unit === 's' || unit === 'sec' || unit === 'seconds' || unit === 'sekunden') {
          // Value is in seconds, convert to minutes
          minutes = rawValue / 60;
        } else {
          // Assume minutes (min, m, minutes, minuten, or unknown)
          minutes = rawValue;
        }
        
        if (minutes > 0) {
          const hours = Math.floor(minutes / 60);
          const mins = Math.round(minutes % 60);
          if (hours > 0) {
            printTimeLeft = `${hours}h ${mins}m`;
          } else {
            printTimeLeft = `${mins}m`;
          }
          // Calculate end time
          const endTime = new Date(Date.now() + minutes * 60 * 1000);
          printEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
    } else if (!remainingTimeEntity?.entity_id) {
      PrismBambuCard.log('WARNING: remaining_time entity not found! Available keys:', Object.keys(this._deviceEntities).filter(k => !k.includes('.')));
    }
    
    // Temperatures
    const nozzleTemp = this.getEntityValue('nozzle_temp');
    const targetNozzleTemp = this.getEntityValue('target_nozzle_temp') || this.getEntityValue('target_nozzle_temperature');
    const bedTemp = this.getEntityValue('bed_temp');
    const targetBedTemp = this.getEntityValue('target_bed_temp') || this.getEntityValue('target_bed_temperature');
    const chamberTemp = this.getEntityValue('chamber_temp');
    
    // Fans
    const partFanSpeed = this.getEntityValue('cooling_fan_speed');
    const auxFanSpeed = this.getEntityValue('aux_fan_speed');
    const chamberFanSpeed = this.getEntityValue('chamber_fan_speed');
    const heatbreakFanSpeed = this.getEntityValue('heatbreak_fan_speed');
    
    // Layer info (only show when printing)
    let currentLayer = 0;
    let totalLayers = 0;
    if (isPrinting || isPaused) {
      currentLayer = parseInt(this.getEntityState('current_layer')) || 0;
      totalLayers = parseInt(this.getEntityState('total_layers')) || 0;
    }
    
    // Chamber light state - use custom light if configured, otherwise auto-detected
    let chamberLightEntityId = this.config.custom_light || this._deviceEntities['chamber_light']?.entity_id;
    const chamberLightState = chamberLightEntityId ? 
      this._hass.states[chamberLightEntityId]?.state : null;
    const isLightOn = chamberLightState === 'on';
    
    // Custom sensors
    const customHumidity = this.config.custom_humidity;
    const customHumidityState = customHumidity ? this._hass.states[customHumidity] : null;
    const humidity = customHumidityState ? parseFloat(customHumidityState.state) || 0 : null;
    const humidityName = this.config.custom_humidity_name || 'Humid';
    
    const customTemperature = this.config.custom_temperature;
    const customTemperatureState = customTemperature ? this._hass.states[customTemperature] : null;
    const customTemp = customTemperatureState ? parseFloat(customTemperatureState.state) || 0 : null;
    const customTempName = this.config.custom_temperature_name || 'Custom';
    
    const powerSwitch = this.config.power_switch;
    const powerSwitchState = powerSwitch ? this._hass.states[powerSwitch] : null;
    const isPowerOn = powerSwitchState?.state === 'on';
    const powerSwitchIcon = this.config.power_switch_icon || 'mdi:power';
    
    // Custom fan
    const customFan = this.config.custom_fan;
    const customFanState = customFan ? this._hass.states[customFan] : null;
    const customFanSpeed = customFanState ? parseFloat(customFanState.state) || 0 : null;
    const customFanName = this.config.custom_fan_name || 'Custom';
    
    // Custom light name
    const customLightName = this.config.custom_light_name || 'Light';
    
    // Debug: Log light entity
    PrismBambuCard.log('Chamber light entity:', chamberLightEntityId, 'State:', chamberLightState);
    
    // Get printer name from device
    const deviceId = this.config.printer;
    const device = this._hass.devices?.[deviceId];
    const name = this.config.name || device?.name || 'Bambu Lab Printer';
    
    // Camera - auto-detect from device entities or use config
    // IMPORTANT: Only use entities from the 'camera' domain, not switches!
    let cameraEntity = this.config.camera_entity;
    if (!cameraEntity) {
      // Try to find camera entity from device entities
      const cameraEntityInfo = this._deviceEntities['camera'];
      if (cameraEntityInfo?.entity_id?.startsWith('camera.')) {
        cameraEntity = cameraEntityInfo.entity_id;
      } else {
        // Fallback: Search all device entities for one starting with 'camera.'
        for (const key in this._deviceEntities) {
          const info = this._deviceEntities[key];
          if (info?.entity_id?.startsWith('camera.')) {
            cameraEntity = info.entity_id;
            break;
          }
        }
      }
    }
    // Verify the camera entity is actually from camera domain
    if (cameraEntity && !cameraEntity.startsWith('camera.')) {
      console.warn('Prism Bambu: Configured camera_entity is not from camera domain:', cameraEntity);
      cameraEntity = null;
    }
    const cameraState = cameraEntity ? this._hass.states[cameraEntity] : null;
    const cameraImage = cameraState?.attributes?.entity_picture || null;
    
    // Debug: Log camera entity
    PrismBambuCard.log('Camera entity:', cameraEntity, 'Has image:', !!cameraImage);
    
    // Cover image (Titelbild / 3D model preview) - auto-detect or use config
    let coverImageEntity = this.config.cover_image_entity;
    if (!coverImageEntity) {
      // Try to find cover_image entity from device entities
      const coverImageInfo = this._deviceEntities['cover_image'] || this._deviceEntities['titelbild'];
      if (coverImageInfo?.entity_id?.startsWith('image.')) {
        coverImageEntity = coverImageInfo.entity_id;
      } else {
        // Fallback: Search all device entities for one starting with 'image.' and containing titelbild/cover
        for (const key in this._deviceEntities) {
          const info = this._deviceEntities[key];
          if (info?.entity_id?.startsWith('image.') && 
              (info.entity_id.toLowerCase().includes('titelbild') || 
               info.entity_id.toLowerCase().includes('cover'))) {
            coverImageEntity = info.entity_id;
            break;
          }
        }
      }
    }
    // Verify the cover image entity is from image domain
    if (coverImageEntity && !coverImageEntity.startsWith('image.')) {
      console.warn('Prism Bambu: Cover image entity is not from image domain:', coverImageEntity);
      coverImageEntity = null;
    }
    
    // Get cover image URL from entity state
    let coverImageUrl = null;
    if (coverImageEntity && this.config.show_cover_image) {
      const coverState = this._hass.states[coverImageEntity];
      // Image entities have entity_picture attribute with the actual image URL
      coverImageUrl = coverState?.attributes?.entity_picture || null;
      // Sometimes the URL needs the HA base URL prepended
      if (coverImageUrl && !coverImageUrl.startsWith('http') && !coverImageUrl.startsWith('/')) {
        coverImageUrl = '/' + coverImageUrl;
      }
    }
    
    // Debug: Log cover image entity
    PrismBambuCard.log('Cover image entity:', coverImageEntity, 'URL:', coverImageUrl);
    
    // Image path - use configured image or default
    // Supports both .png and .jpg formats
    const printerImg = this.config.image || '/local/community/Prism-Dashboard/images/printer-blank.jpg';

    // AMS Data - ONLY use manually configured AMS device (no auto-detect)
    let amsData = [];
    let foundAnyAms = false;
    const trayEntities = [];
    let isExternalSpool = false;
    
    // Helper function to check if entity is a tray/slot entity
    const isTrayEntity = (entityInfo, entityId) => {
      // Check translation_key for tray_1, tray_2, etc. (ha-bambulab style)
      if (entityInfo.translation_key && /^tray_\d+$/.test(entityInfo.translation_key)) {
        return true;
      }
      // Check entity_id for slot or tray (some integrations use slot instead of tray)
      if (entityId.includes('_slot_') || entityId.includes('_tray_')) {
        return true;
      }
      return false;
    };
    
    // ONLY look for AMS if explicitly configured
    if (this.config.ams_device) {
      const amsDeviceId = this.config.ams_device;
      const amsDevice = this._hass.devices?.[amsDeviceId];
      const amsModel = amsDevice?.model || '';
      const amsName = amsDevice?.name || '';
      
      // Check if this is an External Spool device
      isExternalSpool = amsModel.toLowerCase().includes('external spool') || 
                        amsName.toLowerCase().includes('externalspool');
      
      PrismBambuCard.log('AMS device:', amsName, 'model:', amsModel, 'isExternalSpool:', isExternalSpool);
      
      if (isExternalSpool) {
        // External Spool: The device itself contains filament info
        // Look for sensor entities on this device that have filament attributes
        for (const entityId in this._hass.entities) {
          const entityInfo = this._hass.entities[entityId];
          if (entityInfo.device_id === amsDeviceId) {
            // Check if this entity has filament-related attributes
            const state = this._hass.states[entityId];
            const attr = state?.attributes || {};
            
            // External Spool sensor typically has color, type, name attributes
            if (attr.color || attr.type || attr.name || entityId.includes('sensor.')) {
              // This looks like a filament entity
              if (!trayEntities.find(e => e.entityId === entityId)) {
                trayEntities.push({
                  entityId,
                  translationKey: entityInfo.translation_key || 'external_spool',
                  ...entityInfo
                });
                PrismBambuCard.log('Found External Spool entity:', entityId);
                break; // External spool has only one sensor per device
              }
            }
          }
        }
      } else {
        // Regular AMS: Look for tray entities
        for (const entityId in this._hass.entities) {
          const entityInfo = this._hass.entities[entityId];
          if (entityInfo.device_id === amsDeviceId && isTrayEntity(entityInfo, entityId)) {
            trayEntities.push({
              entityId,
              translationKey: entityInfo.translation_key || entityId,
              ...entityInfo
            });
          }
        }
      }
      
      // Sort tray entities by their slot/tray number
      trayEntities.sort((a, b) => {
        const getNum = (e) => {
          const tkMatch = e.translationKey?.match(/(\d+)$/);
          if (tkMatch) return parseInt(tkMatch[1]);
          const idMatch = e.entityId?.match(/slot_(\d+)|tray_(\d+)|spool(\d*)/i);
          if (idMatch) return parseInt(idMatch[1] || idMatch[2] || idMatch[3] || 1);
          return 1;
        };
        return getNum(a) - getNum(b);
      });
    }
    
    // Debug: Log found entities
    if (trayEntities.length > 0) {
      PrismBambuCard.log('Found tray/spool entities:', trayEntities.map(e => e.entityId));
      const firstState = this._hass.states[trayEntities[0].entityId];
      PrismBambuCard.log('First entity full state:', firstState);
    } else if (this.config.ams_device) {
      PrismBambuCard.log('No tray entities found for AMS device');
    }
    
    // Build AMS data from found tray entities
    // For External Spool: only show actual slots found (1 or 2)
    // For full AMS: show 4 slots (fill with empty if needed)
    const targetSlots = isExternalSpool ? Math.max(1, trayEntities.length) : (trayEntities.length > 0 ? Math.max(4, trayEntities.length) : 0);
    
    for (let i = 0; i < targetSlots; i++) {
      const trayEntity = trayEntities[i];
      
      if (trayEntity) {
        foundAnyAms = true;
        const trayState = this._hass.states[trayEntity.entityId];
        const attr = trayState?.attributes || {};
        
        // Debug slot attributes
        if (i === 0) {
          PrismBambuCard.log('Slot 1 attributes:', JSON.stringify(attr));
        }
        PrismBambuCard.log(`Slot ${i + 1} - name: "${attr.name}", type: "${attr.type}", state: "${trayState?.state}"`);
        
        // ha-bambulab-cards uses attr.name for display (e.g. "Bambu PCTG Basic", "Bambu TPU for AMS")
        // We need to extract the filament type from name first, then type, then state
        const nameStr = attr.name || '';
        const typeStr = attr.type || '';
        const stateStr = trayState?.state || '';
        
        // Combine all sources to search for known filament types
        const searchStr = `${nameStr} ${typeStr} ${stateStr}`;
        
        // Extract short type name - support common filament types
        // Order matters: check specific types before generic ones
        const typeMatch = searchStr.match(/\b(PCTG|PETG|PLA|ABS|TPU|ASA|PA-CF|PA|PC|PVA|HIPS|PP|SUPPORT)\b/i);
        let type = '';
        if (typeMatch) {
          type = typeMatch[1].toUpperCase();
        } else if (typeStr && typeStr !== 'Generic' && typeStr.length <= 8) {
          // Use type if it's short and not "Generic"
          type = typeStr.toUpperCase();
        } else if (nameStr && nameStr !== 'Generic' && nameStr.length <= 8) {
          // Use name if short
          type = nameStr.toUpperCase();
        } else if (nameStr) {
          // Shorten long names
          type = nameStr.substring(0, 6).toUpperCase();
        } else {
          type = typeStr || stateStr || '';
        }
        
        // Get color - may be 8 chars with alpha (#RRGGBBAA), convert to 6 (#RRGGBB)
        let color = attr.color || attr.tray_color || '#666666';
        if (color && typeof color === 'string') {
          // Add # if missing
          if (!color.startsWith('#') && !color.startsWith('rgb')) {
            color = '#' + color;
          }
          // Remove alpha channel if present (8 char -> 6 char)
          if (color.length === 9) {
            color = color.substring(0, 7);
          }
        }
        
        // Get remaining percentage
        // remain_enabled indicates if RFID tracking is active
        const remainEnabled = attr.remain_enabled === true;
        const remainValue = parseFloat(attr.remain ?? attr.remaining ?? 0);
        // If remain_enabled is false or not set, show "?" instead of potentially wrong 0%
        const remaining = remainEnabled ? remainValue : (remainValue > 0 ? remainValue : -1); // -1 = unknown
        
        // Check if active
        const active = attr.active === true || attr.in_use === true;
        
        // Check if empty
        const isEmpty = attr.empty === true || 
                       !trayState?.state || 
                       trayState?.state.toLowerCase() === 'empty' || 
                       trayState?.state === 'unavailable' || 
                       trayState?.state === 'unknown';
        
        amsData.push({
          id: i + 1,
          type: isEmpty ? '' : type,
          color: isEmpty ? '#666666' : color,
          remaining: isEmpty ? 0 : Math.round(remaining),
          remainEnabled: remainEnabled,
          active,
          empty: isEmpty,
          // Full filament info for popup
          fullName: attr.name || '',
          brand: attr.brand || attr.manufacturer || '',
          nozzleTempMin: attr.nozzle_temp_min || attr.min_nozzle_temp || null,
          nozzleTempMax: attr.nozzle_temp_max || attr.max_nozzle_temp || null,
          entityId: trayEntity.entityId
        });
      } else if (!isExternalSpool && i < 4) {
        // Fill empty slots up to 4 only for full AMS (not external spool)
        amsData.push({
          id: i + 1,
          type: '',
          color: '#666666',
          remaining: 0,
          active: false,
          empty: true,
          fullName: '',
          brand: '',
          nozzleTempMin: null,
          nozzleTempMax: null,
          entityId: null
        });
      }
    }
    
    // Debug: Log final AMS data
    PrismBambuCard.log('Final AMS data:', amsData, 'isExternalSpool:', isExternalSpool, 'ams_device configured:', !!this.config.ams_device);
    
    // If no AMS device configured OR no entities found, hide section
    if (!this.config.ams_device || amsData.length === 0) {
      PrismBambuCard.log('No AMS configured or no data, hiding AMS section');
      amsData = []; // Empty = hide section
    }
    
    // Get AMS temperature and humidity (from AMS device entities)
    let amsTemperature = null;
    let amsHumidity = null;
    
    if (this.config.ams_device) {
      const amsDeviceId = this.config.ams_device;
      
      // Look for temperature and humidity sensors belonging to the AMS device
      for (const entityId in this._hass.entities) {
        const entityInfo = this._hass.entities[entityId];
        if (entityInfo.device_id === amsDeviceId) {
          const state = this._hass.states[entityId];
          const entityIdLower = entityId.toLowerCase();
          const translationKey = entityInfo.translation_key?.toLowerCase() || '';
          
          // Check for temperature sensor
          if ((entityIdLower.includes('temperature') || translationKey.includes('temperature') || 
               entityIdLower.includes('temp') || translationKey.includes('temp')) &&
              !entityIdLower.includes('nozzle') && !entityIdLower.includes('bed')) {
            const tempValue = parseFloat(state?.state);
            if (!isNaN(tempValue) && state?.state !== 'unavailable' && state?.state !== 'unknown') {
              amsTemperature = tempValue;
              PrismBambuCard.log('Found AMS temperature:', amsTemperature, 'from', entityId);
            }
          }
          
          // Check for humidity sensor
          if (entityIdLower.includes('humidity') || translationKey.includes('humidity')) {
            const humValue = parseFloat(state?.state);
            if (!isNaN(humValue) && state?.state !== 'unavailable' && state?.state !== 'unknown') {
              amsHumidity = humValue;
              PrismBambuCard.log('Found AMS humidity:', amsHumidity, 'from', entityId);
            }
          }
        }
      }
    }

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
      partFanSpeed,
      auxFanSpeed,
      chamberFanSpeed,
      heatbreakFanSpeed,
      currentLayer,
      totalLayers,
      name,
      cameraEntity,
      cameraImage,
      printerImg,
      coverImageEntity,
      coverImageUrl,
      showCoverImage: this.config.show_cover_image && coverImageUrl,
      amsData,
      isExternalSpool,
      isPrinting,
      isPaused,
      isIdle,
      isLightOn,
      chamberLightEntity: chamberLightEntityId,
      // Custom sensors
      humidity,
      humidityName,
      customTemp,
      customTempName,
      customFanSpeed,
      customFanName,
      customLightName,
      powerSwitch,
      isPowerOn,
      powerSwitchIcon,
      // AMS sensors
      amsTemperature,
      amsHumidity,
      // Visibility settings (default to true if not set)
      showPartFan: this.config.show_part_fan !== false,
      showAuxFan: this.config.show_aux_fan !== false,
      showChamberFan: this.config.show_chamber_fan !== false,
      showHeatbreakFan: this.config.show_heatbreak_fan !== false,
      showNozzleTemp: this.config.show_nozzle_temp !== false,
      showBedTemp: this.config.show_bed_temp !== false,
      showChamberTemp: this.config.show_chamber_temp !== false,
      showHumidity: this.config.show_humidity !== false,
      showCustomTemp: this.config.show_custom_temp !== false,
      showCustomFan: this.config.show_custom_fan !== false,
      showAmsInfo: this.config.show_ams_info !== false
    };
    
    // Debug: Log key data for icons and status
    PrismBambuCard.log('Icons - Light:', chamberLightEntityId, 'Camera:', cameraEntity);
    PrismBambuCard.log('Status - isPrinting:', isPrinting, 'isPaused:', isPaused, 'isIdle:', isIdle);
    
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
      partFanSpeed: 50,
      auxFanSpeed: 30,
      chamberFanSpeed: 65,
      heatbreakFanSpeed: 80,
      currentLayer: 12,
      totalLayers: 28,
      name: this.config?.name || 'Bambu Lab Printer',
      cameraEntity: null,
      cameraImage: null,
      printerImg: this.config?.image || '/local/community/Prism-Dashboard/images/printer-blank.jpg',
      coverImageEntity: null,
      coverImageUrl: null,
      showCoverImage: false,
      amsData: [
        { id: 1, type: 'PLA', color: '#FF4444', remaining: 85, active: false },
        { id: 2, type: 'PETG', color: '#4488FF', remaining: 42, active: true },
        { id: 3, type: 'ABS', color: '#111111', remaining: 12, active: false },
        { id: 4, type: 'TPU', color: '#FFFFFF', remaining: 0, active: false, empty: true }
      ],
      isExternalSpool: false,
      isPrinting: true,
      isPaused: false,
      isIdle: false,
      isLightOn: true,
      chamberLightEntity: null,
      // Custom sensors
      humidity: null,
      humidityName: 'Humid',
      customTemp: null,
      customTempName: 'Custom',
      customFanSpeed: null,
      customFanName: 'Custom',
      customLightName: 'Light',
      powerSwitch: null,
      isPowerOn: true,
      powerSwitchIcon: 'mdi:power',
      // AMS sensors
      amsTemperature: 25,
      amsHumidity: 45,
      // Visibility settings (all true for preview)
      showPartFan: true,
      showAuxFan: true,
      showChamberFan: true,
      showHeatbreakFan: true,
      showNozzleTemp: true,
      showBedTemp: true,
      showChamberTemp: true,
      showHumidity: true,
      showCustomTemp: true,
      showCustomFan: true,
      showAmsInfo: true
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
            gap: 16px;
        }
        .printer-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 40px;
        }
        /* Printer Icon - Neumorphism Style */
        .printer-icon {
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
            border-radius: 50%;
            background: linear-gradient(145deg, #2d3038, #22252b);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00AE42;
            border: none;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
            flex-shrink: 0;
            transition: all 0.3s ease;
        }
        .printer-icon ha-icon {
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            filter: drop-shadow(0 0 4px rgba(0, 174, 66, 0.5));
        }
        /* Offline/Unavailable/Power Off - Inset/pressed look */
        .printer-icon.offline {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            color: rgba(255, 255, 255, 0.25);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .printer-icon.offline ha-icon {
            filter: none;
        }
        /* Printing - Green with glow, slightly pressed */
        .printer-icon.printing {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            box-shadow: 
                inset 2px 2px 4px rgba(0, 0, 0, 0.4),
                inset -1px -1px 3px rgba(255, 255, 255, 0.03);
            animation: printerIconGlow 2s ease-in-out infinite;
        }
        .printer-icon.printing ha-icon {
            filter: drop-shadow(0 0 6px rgba(0, 174, 66, 0.7));
        }
        @keyframes printerIconGlow {
            0%, 100% { 
                color: #00AE42;
            }
            50% { 
                color: #2ed573;
            }
        }
        /* Paused - Yellow/Orange */
        .printer-icon.paused {
            background: linear-gradient(145deg, #2d3038, #22252b);
            color: #fbbf24;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .printer-icon.paused ha-icon {
            filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
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
        /* Header Icon Buttons - Neumorphism Style */
        .header-icon-btn {
            width: 36px;
            height: 36px;
            min-width: 36px;
            min-height: 36px;
            border-radius: 50%;
            background: linear-gradient(145deg, #2d3038, #22252b);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.35);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
            flex-shrink: 0;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .header-icon-btn:hover {
            color: rgba(255, 255, 255, 0.7);
        }
        .header-icon-btn:active {
            transform: scale(0.95);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        /* Active state - pressed in with colored icon */
        .header-icon-btn.active {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            color: #fbbf24;
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .header-icon-btn.active ha-icon {
            filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.6));
        }
        .header-icon-btn ha-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        /* AMS Grid */
        .ams-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
            z-index: 20;
        }
        /* For fewer slots, keep same slot size as 4-slot layout */
        .ams-grid.slots-1 {
            grid-template-columns: repeat(4, 1fr);
            /* Only first slot is visible, others are empty space */
        }
        .ams-grid.slots-1 .ams-slot {
            grid-column: 2 / 3; /* Center the single slot */
        }
        .ams-grid.slots-2 {
            grid-template-columns: repeat(4, 1fr);
        }
        .ams-grid.slots-2 .ams-slot:nth-child(1) {
            grid-column: 2;
        }
        .ams-grid.slots-2 .ams-slot:nth-child(2) {
            grid-column: 3;
        }
        .ams-grid.slots-3 {
            grid-template-columns: repeat(4, 1fr);
        }
        .ams-grid.slots-3 .ams-slot:nth-child(1) {
            grid-column: 1;
        }
        .ams-grid.slots-3 .ams-slot:nth-child(2) {
            grid-column: 2;
        }
        .ams-grid.slots-3 .ams-slot:nth-child(3) {
            grid-column: 3;
        }
        .ams-grid.hidden {
            display: none;
        }
        
        /* AMS Info Pills (Temperature & Humidity) - same style as overlay-pills */
        .ams-info-bar {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 20px;
            margin-top: -8px;
        }
        .ams-info-pill {
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
        .ams-info-pill .ams-pill-icon {
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
        .ams-info-pill .ams-pill-icon ha-icon {
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ams-info-pill .ams-pill-content {
            display: flex;
            flex-direction: column;
            line-height: 1;
        }
        .ams-info-pill .ams-pill-value {
            font-size: 14px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.95);
        }
        .ams-info-pill .ams-pill-label {
            font-size: 9px;
            color: rgba(255, 255, 255, 0.5);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .ams-info-pill.temp .ams-pill-icon ha-icon {
            color: #fb923c;
        }
        .ams-info-pill.humidity .ams-pill-icon ha-icon {
            color: #60a5fa;
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
        .ams-slot.clickable {
            cursor: pointer;
        }
        .ams-slot.clickable:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }
        
        /* Filament Popup */
        .filament-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .filament-popup {
            background: linear-gradient(145deg, #1a1a1a, #252525);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            width: 90%;
            max-width: 320px;
            overflow: hidden;
            animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .filament-popup-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            background: rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .filament-popup-color {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .filament-popup-title {
            flex: 1;
            font-size: 16px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
        }
        .filament-popup-close {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.6);
            transition: all 0.2s;
        }
        .filament-popup-close:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }
        .filament-popup-content {
            padding: 16px 20px;
        }
        .filament-popup-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .filament-popup-row:last-child {
            border-bottom: none;
        }
        .filament-popup-label {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.5);
        }
        .filament-popup-value {
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
            text-align: right;
            max-width: 60%;
            word-break: break-word;
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
            min-height: 300px;
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
        
        /* Power Button - Neumorphism Style */
        .power-btn-container {
            position: absolute;
            top: -16px;
            right: -16px;
            z-index: 50;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .power-corner-btn {
            position: relative;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
            /* Outer ring - neumorphic inset */
            background: linear-gradient(145deg, #2a2d35, #1e2027);
            box-shadow: 
                /* Outer shadows for depth */
                5px 5px 10px rgba(0, 0, 0, 0.5),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                /* Inner ring shadow */
                inset 0 0 0 3px rgba(30, 32, 38, 1),
                inset 2px 2px 4px rgba(0, 0, 0, 0.3),
                inset -1px -1px 3px rgba(255, 255, 255, 0.02);
        }
        /* Inner circle - default (OFF) state: raised/normal */
        .power-corner-btn::before {
            content: '';
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(145deg, #2d3038, #22252b);
            box-shadow: 
                2px 2px 4px rgba(0, 0, 0, 0.4),
                -1px -1px 3px rgba(255, 255, 255, 0.05),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
            transition: all 0.2s ease;
        }
        /* ON state - inner circle pressed/inset */
        .power-corner-btn.on::before {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.6),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .power-corner-btn .power-icon {
            position: relative;
            z-index: 2;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .power-corner-btn .power-icon ha-icon {
            --mdc-icon-size: 20px;
            width: 20px;
            height: 20px;
        }
        /* Off state - icon is dim, button raised */
        .power-corner-btn.off .power-icon {
            color: rgba(255, 255, 255, 0.25);
        }
        /* On state - green icon with glow, button pressed */
        .power-corner-btn.on .power-icon {
            color: #4ade80;
            filter: drop-shadow(0 0 6px rgba(74, 222, 128, 0.6));
        }
        /* Hover states */
        .power-corner-btn.on:hover .power-icon {
            color: #f87171;
            filter: drop-shadow(0 0 8px rgba(248, 113, 113, 0.7));
        }
        .power-corner-btn.off:hover .power-icon {
            color: #4ade80;
            filter: drop-shadow(0 0 8px rgba(74, 222, 128, 0.7));
        }
        /* Click/tap feedback - extra press effect */
        .power-corner-btn:active {
            transform: scale(0.97);
        }
        .power-corner-btn:active::before {
            box-shadow: 
                inset 4px 4px 8px rgba(0, 0, 0, 0.7),
                inset -2px -2px 4px rgba(255, 255, 255, 0.02);
        }
        /* Responsive: smaller on tablets */
        @media (max-width: 768px) {
            .power-btn-container {
                top: -14px;
                right: -14px;
            }
            .power-corner-btn {
                width: 38px;
                height: 38px;
            }
            .power-corner-btn::before {
                width: 28px;
                height: 28px;
            }
            .power-corner-btn .power-icon {
                width: 16px;
                height: 16px;
            }
            .power-corner-btn .power-icon ha-icon {
                --mdc-icon-size: 16px;
                width: 16px;
                height: 16px;
            }
        }
        /* Even smaller on phones */
        @media (max-width: 480px) {
            .power-btn-container {
                top: -12px;
                right: -12px;
            }
            .power-corner-btn {
                width: 34px;
                height: 34px;
            }
            .power-corner-btn::before {
                width: 24px;
                height: 24px;
            }
            .power-corner-btn .power-icon {
                width: 14px;
                height: 14px;
            }
            .power-corner-btn .power-icon ha-icon {
                --mdc-icon-size: 14px;
                width: 14px;
                height: 14px;
            }
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
            position: relative;
            overflow: hidden;
            border-radius: 12px;
        }
        .camera-feed {
            width: 100%;
            height: 100%;
            object-fit: cover;
            cursor: pointer;
            transition: opacity 0.2s;
            --video-max-height: 100%;
        }
        .camera-feed video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .camera-container ha-camera-stream {
            width: 100%;
            height: 100%;
        }
        .camera-feed:hover {
            opacity: 0.9;
        }
        .camera-snapshot {
            object-fit: cover;
            background: rgba(0,0,0,0.5);
        }
        
        /* Cover Image (3D Model Preview) - positioned on print bed */
        .cover-image-container {
            position: absolute;
            /* Position on the print bed area - adjust based on printer image */
            bottom: 29%;
            left: 50%;
            transform: translateX(-50%);
            width: 38%;
            max-width: 150px;
            z-index: 15;
            pointer-events: none;
        }
        .cover-image-wrapper {
            position: relative;
            width: 100%;
            padding-bottom: 100%; /* Square aspect ratio */
            border-radius: 8px;
            overflow: visible;
            background: transparent;
        }
        .cover-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            /* Subtle shadow to make it "sit" on the bed */
            filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) 
                    drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))
                    brightness(1.0) contrast(1.1);
            transition: filter 0.3s ease, transform 0.3s ease;
        }
        /* Reflection/shadow on the bed */
        .cover-image-wrapper::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 10%;
            right: 10%;
            height: 8px;
            background: radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%);
            border-radius: 50%;
            filter: blur(4px);
        }
        /* Progress overlay - fills from bottom to top with green tint */
        .cover-image-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: var(--progress-height, 0%);
            background: linear-gradient(
                to top,
                rgba(74, 222, 128, 0.6) 0%,
                rgba(34, 197, 94, 0.4) 40%,
                rgba(34, 197, 94, 0.15) 100%
            );
            mix-blend-mode: hard-light;
            pointer-events: none;
            transition: height 0.5s ease-out;
            border-radius: 4px;
        }
        /* Glow effect when printing - affects the image directly */
        .cover-image-wrapper.printing .cover-image {
            filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) 
                    drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))
                    drop-shadow(0 0 20px rgba(74, 222, 128, 0.4))
                    brightness(1.1) contrast(1.1);
            animation: modelGlow 2s ease-in-out infinite;
        }
        @keyframes modelGlow {
            0%, 100% { 
                filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) 
                        drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))
                        drop-shadow(0 0 15px rgba(74, 222, 128, 0.3))
                        brightness(1.05) contrast(1.1);
            }
            50% { 
                filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) 
                        drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))
                        drop-shadow(0 0 30px rgba(74, 222, 128, 0.5))
                        brightness(1.15) contrast(1.1);
            }
        }
        /* Idle state - dim and grayscale */
        .cover-image-wrapper.idle .cover-image {
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) 
                    brightness(0.5) contrast(0.9) grayscale(0.6);
        }
        .cover-image-wrapper.idle::after {
            opacity: 0.3;
        }
        /* Paused state - yellow tint */
        .cover-image-wrapper.paused .cover-image-progress {
            background: linear-gradient(
                to top,
                rgba(251, 191, 36, 0.6) 0%,
                rgba(245, 158, 11, 0.4) 40%,
                rgba(245, 158, 11, 0.15) 100%
            );
        }
        .cover-image-wrapper.paused .cover-image {
            filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) 
                    drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4))
                    drop-shadow(0 0 15px rgba(251, 191, 36, 0.4))
                    brightness(1.0) contrast(1.1);
        }
        /* Progress percentage badge - positioned below model */
        .cover-progress-badge {
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.85), rgba(20, 20, 20, 0.9));
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 700;
            font-family: monospace;
            color: #4ade80;
            border: 1px solid rgba(74, 222, 128, 0.4);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
            z-index: 20;
            backdrop-filter: blur(4px);
        }
        .cover-image-wrapper.paused .cover-progress-badge {
            color: #fbbf24;
            border-color: rgba(251, 191, 36, 0.4);
        }
        .cover-image-wrapper.idle .cover-progress-badge {
            color: rgba(255, 255, 255, 0.4);
            border-color: rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.6);
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
        /* Buttons - Neumorphism Style */
        .btn {
            height: 48px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
            font-weight: 700;
            font-size: 14px;
            background: linear-gradient(145deg, #2d3038, #22252b);
            color: rgba(255, 255, 255, 0.5);
            box-shadow: 
                4px 4px 8px rgba(0, 0, 0, 0.4),
                -2px -2px 6px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .btn ha-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        .btn:hover:not(:disabled) {
            color: rgba(255, 255, 255, 0.8);
        }
        .btn:active:not(:disabled) {
            transform: scale(0.97);
            background: linear-gradient(145deg, #22252b, #2d3038);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        /* Secondary buttons (Home, Stop) */
        .btn-secondary {
            color: rgba(255, 255, 255, 0.5);
        }
        .btn-secondary:hover:not(:disabled) {
            color: rgba(255, 255, 255, 0.8);
        }
        /* Stop button - red on hover */
        .btn-stop:hover:not(:disabled) {
            color: #f87171;
        }
        .btn-stop:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.5));
        }
        /* Home button - green on hover (Bambu green) */
        .btn-home:hover:not(:disabled) {
            color: #00AE42;
        }
        .btn-home:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 4px rgba(0, 174, 66, 0.5));
        }
        /* Primary button (Pause/Resume) - Default: raised (for Resume) */
        .btn-primary {
            grid-column: span 2;
            background: linear-gradient(145deg, #2d3038, #22252b);
            color: #00AE42;
            gap: 8px;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .btn-primary ha-icon {
            filter: drop-shadow(0 0 4px rgba(0, 174, 66, 0.5));
        }
        .btn-primary:hover:not(:disabled) {
            color: #2ed573;
        }
        .btn-primary:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 6px rgba(0, 174, 66, 0.7));
        }
        .btn-primary:active:not(:disabled) {
            transform: scale(0.97);
            box-shadow: 
                inset 4px 4px 8px rgba(0, 0, 0, 0.6),
                inset -2px -2px 4px rgba(255, 255, 255, 0.02);
        }
        /* Primary button when printing - pressed/inset state */
        .btn-primary.printing {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            box-shadow: 
                inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                inset -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        .btn-primary.printing ha-icon {
            filter: drop-shadow(0 0 6px rgba(0, 174, 66, 0.7));
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
                <div class="printer-icon ${(['offline', 'unavailable'].includes(data.stateStr.toLowerCase()) || (data.powerSwitch && !data.isPowerOn)) ? 'offline' : data.isPrinting ? 'printing' : data.isPaused ? 'paused' : ''}">
                    <ha-icon icon="mdi:printer-3d-nozzle"></ha-icon>
                </div>
                <div class="printer-info">
                    <h2 class="title">${data.name}</h2>
                    <div class="status-row">
                        <div class="status-dot"></div>
                        <span class="status-text">${data.stateStr}</span>
                    </div>
                </div>
            </div>
            <div class="header-right">
                ${data.chamberLightEntity ? `
                <button class="header-icon-btn btn-light ${data.isLightOn ? 'active' : ''}" title="Chamber Light">
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

        ${data.amsData.length > 0 ? `
        <div class="ams-grid ${data.amsData.length <= 3 ? 'slots-' + data.amsData.length : ''}">
            ${data.amsData.map(slot => `
                <div class="ams-slot ${slot.active ? 'active' : ''} ${!slot.empty ? 'clickable' : ''}"
                     ${!slot.empty ? `data-slot-id="${slot.id}"
                     data-full-name="${(slot.fullName || '').replace(/"/g, '&quot;')}"
                     data-type="${slot.type}"
                     data-color="${slot.color}"
                     data-remaining="${slot.remaining}"
                     data-brand="${(slot.brand || '').replace(/"/g, '&quot;')}"
                     data-temp-min="${slot.nozzleTempMin || ''}"
                     data-temp-max="${slot.nozzleTempMax || ''}"
                     data-entity-id="${slot.entityId || ''}"` : ''}>
                    <div class="spool-visual">
                        ${!slot.empty ? `
                            <div class="filament" style="background-color: ${slot.color}"></div>
                            <div class="remaining-badge">${slot.remaining < 0 ? '?' : slot.remaining + '%'}</div>
                        ` : ''}
                        <div class="spool-center"></div>
                    </div>
                    <div class="ams-info">
                        <div class="ams-type">${slot.empty ? 'Empty' : slot.type}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${data.showAmsInfo && (data.amsTemperature !== null || data.amsHumidity !== null) ? `
        <div class="ams-info-bar">
            ${data.amsTemperature !== null ? `
            <div class="ams-info-pill temp" data-pill="ams-temp">
                <div class="ams-pill-icon"><ha-icon icon="mdi:thermometer"></ha-icon></div>
                <div class="ams-pill-content">
                    <span class="ams-pill-value">${Math.round(data.amsTemperature)}°C</span>
                    <span class="ams-pill-label">AMS</span>
                </div>
            </div>
            ` : ''}
            ${data.amsHumidity !== null ? `
            <div class="ams-info-pill humidity" data-pill="ams-humidity">
                <div class="ams-pill-icon"><ha-icon icon="mdi:water-percent"></ha-icon></div>
                <div class="ams-pill-content">
                    <span class="ams-pill-value">${Math.round(data.amsHumidity)}%</span>
                    <span class="ams-pill-label">AMS</span>
                </div>
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        <!-- Filament Info Popup -->
        <div class="filament-popup-overlay" style="display: none;">
            <div class="filament-popup">
                <div class="filament-popup-header">
                    <div class="filament-popup-color"></div>
                    <div class="filament-popup-title">Filament Details</div>
                    <button class="filament-popup-close"><ha-icon icon="mdi:close"></ha-icon></button>
                </div>
                <div class="filament-popup-content">
                    <div class="filament-popup-row">
                        <span class="filament-popup-label">Slot</span>
                        <span class="filament-popup-value" data-field="slot"></span>
                    </div>
                    <div class="filament-popup-row">
                        <span class="filament-popup-label">Name</span>
                        <span class="filament-popup-value" data-field="name"></span>
                    </div>
                    <div class="filament-popup-row">
                        <span class="filament-popup-label">Type</span>
                        <span class="filament-popup-value" data-field="type"></span>
                    </div>
                    <div class="filament-popup-row" data-field-row="brand">
                        <span class="filament-popup-label">Brand</span>
                        <span class="filament-popup-value" data-field="brand"></span>
                    </div>
                    <div class="filament-popup-row">
                        <span class="filament-popup-label">Remaining</span>
                        <span class="filament-popup-value" data-field="remaining"></span>
                    </div>
                    <div class="filament-popup-row" data-field-row="temp">
                        <span class="filament-popup-label">Nozzle Temp</span>
                        <span class="filament-popup-value" data-field="temp"></span>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="main-visual ${!data.isLightOn ? 'light-off' : ''}">
            ${data.powerSwitch ? `
            <div class="power-btn-container">
                <button class="power-corner-btn btn-power ${data.isPowerOn ? 'on' : 'off'}" title="Power ${data.isPowerOn ? 'Off' : 'On'}">
                    <span class="power-icon"><ha-icon icon="${data.powerSwitchIcon}"></ha-icon></span>
                </button>
            </div>
            ` : ''}
            <div class="main-visual-inner">
            ${data.cameraEntity && this.showCamera ? `
                <div class="camera-container" data-entity="${data.cameraEntity}"></div>
            ` : `
                <img src="${data.printerImg}" class="printer-img ${!data.isLightOn ? 'dimmed' : ''}" />
                <div class="printer-fallback-icon" style="display: none;">
                  <ha-icon icon="mdi:printer-3d"></ha-icon>
                </div>
                
                ${data.showCoverImage ? `
                <div class="cover-image-container">
                    <div class="cover-image-wrapper ${data.isPrinting ? 'printing' : ''} ${data.isPaused ? 'paused' : ''} ${data.isIdle ? 'idle' : ''}">
                        <img src="${data.coverImageUrl}" class="cover-image" alt="3D Model" />
                        <div class="cover-image-progress" style="--progress-height: ${data.progress}%;"></div>
                        <div class="cover-progress-badge">${Math.round(data.progress)}%</div>
                    </div>
                </div>
                ` : ''}
                
                <div class="overlay-left">
                    ${data.showPartFan ? `
                    <div class="overlay-pill" data-pill="part-fan">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.partFanSpeed}%</span>
                            <span class="pill-label">Part</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showAuxFan ? `
                    <div class="overlay-pill" data-pill="aux-fan">
                        <div class="pill-icon-container"><ha-icon icon="mdi:weather-windy"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.auxFanSpeed}%</span>
                            <span class="pill-label">Aux</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showChamberFan && data.chamberFanSpeed !== null && data.chamberFanSpeed !== undefined ? `
                    <div class="overlay-pill" data-pill="chamber-fan">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan-chevron-up" style="color: #22d3ee;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.chamberFanSpeed}%</span>
                            <span class="pill-label">Chamber</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showHeatbreakFan && data.heatbreakFanSpeed !== null && data.heatbreakFanSpeed !== undefined ? `
                    <div class="overlay-pill" data-pill="heatbreak-fan">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan-alert" style="color: #f472b6;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.heatbreakFanSpeed}%</span>
                            <span class="pill-label">Heatbrk</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showHumidity && data.humidity !== null ? `
                    <div class="overlay-pill" data-pill="humidity">
                        <div class="pill-icon-container"><ha-icon icon="mdi:water-percent" style="color: #60a5fa;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${Math.round(data.humidity)}%</span>
                            <span class="pill-label">${data.humidityName}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showCustomFan && data.customFanSpeed !== null ? `
                    <div class="overlay-pill" data-pill="custom-fan">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan-auto" style="color: #fbbf24;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${Math.round(data.customFanSpeed)}%</span>
                            <span class="pill-label">${data.customFanName}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="overlay-right">
                    ${data.showNozzleTemp ? `
                    <div class="overlay-pill right" data-pill="nozzle-temp">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer" style="color: #F87171;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.nozzleTemp}°</span>
                            <span class="pill-label">/${data.targetNozzleTemp}°</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showBedTemp ? `
                    <div class="overlay-pill right" data-pill="bed-temp">
                        <div class="pill-icon-container"><ha-icon icon="mdi:radiator" style="color: #FB923C;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.bedTemp}°</span>
                            <span class="pill-label">/${data.targetBedTemp}°</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showChamberTemp ? `
                    <div class="overlay-pill right" data-pill="chamber-temp">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer" style="color: #4ade80;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.chamberTemp}°</span>
                            <span class="pill-label">Cham</span>
                        </div>
                    </div>
                    ` : ''}
                    ${data.showCustomTemp && data.customTemp !== null ? `
                    <div class="overlay-pill right" data-pill="custom-temp">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer-lines" style="color: #a78bfa;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${Math.round(data.customTemp)}°</span>
                            <span class="pill-label">${data.customTempName}</span>
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
            <button class="btn btn-secondary btn-speed" ${data.isIdle ? 'disabled' : ''}>
                <ha-icon icon="mdi:speedometer"></ha-icon>
            </button>
            <button class="btn btn-secondary btn-stop" ${data.isIdle ? 'disabled' : ''}>
                <ha-icon icon="mdi:stop"></ha-icon>
            </button>
            <button class="btn btn-primary btn-pause ${data.isPrinting ? 'printing' : ''}" ${data.isIdle ? 'disabled' : ''}>
                <ha-icon icon="${data.isPaused ? 'mdi:play' : 'mdi:pause'}"></ha-icon>
                ${data.isPaused ? 'Resume Print' : data.isPrinting ? 'Pause Print' : 'Control'}
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

