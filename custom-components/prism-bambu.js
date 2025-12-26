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
  'nozzle_temp', 'power', 'print_progress', 'print_status', 'remaining_time',
  'speed_profile', 'stage', 'target_bed_temp', 'target_bed_temperature',
  'target_nozzle_temp', 'target_nozzle_temperature', 'total_layers', 'camera',
  'titelbild' // German translation key for cover image
];

class PrismBambuCard extends HTMLElement {
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
      name: 'Bambu Lab Printer',
      camera_entity: '',
      image: '/local/custom-components/images/prism-bambu-pic.png'
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
          name: 'custom_light',
          label: 'Custom light entity (optional - overrides auto-detected)',
          selector: { entity: { domain: 'light' } }
        },
        {
          name: 'power_switch',
          label: 'Power switch (optional)',
          selector: { entity: { domain: 'switch' } }
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
      console.log('Prism Bambu: Found device entities:', Object.keys(this._deviceEntities));
    }
    
    // Get current status to detect changes
    const data = this.getPrinterData();
    const newStatus = `${data.isIdle}-${data.isPrinting}-${data.isPaused}-${!!data.chamberLightEntity}-${!!data.cameraEntity}`;
    
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
      pillValues[0].textContent = `${data.partFanSpeed}%`;
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
    // Cleanup if needed
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
    
    // Optimistically update UI immediately (don't wait for HA state update)
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
    if (!this._hass || !this._deviceEntities['print_status']) return;
    // Open more-info for the print status entity
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this._deviceEntities['print_status'].entity_id }
    });
    this.dispatchEvent(event);
  }

  handleStop() {
    if (!this._hass || !this._deviceEntities['print_status']) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this._deviceEntities['print_status'].entity_id }
    });
    this.dispatchEvent(event);
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
    
    // Fire the more-info event to open the camera popup
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: entityId }
    });
    this.dispatchEvent(event);
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
    console.log('Prism Bambu: Current status:', stateStr, 'Progress:', progress);
    
    // Determine if printer is actively printing (support German status names too)
    const statusLower = stateStr.toLowerCase();
    const isPrinting = ['printing', 'prepare', 'running', 'druckt', 'vorbereiten'].includes(statusLower);
    const isPaused = ['paused', 'pause', 'pausiert'].includes(statusLower);
    const isIdle = !isPrinting && !isPaused; // Everything else is idle
    
    // Get remaining time - format it nicely (only if printing)
    const remainingTimeEntity = this._deviceEntities['remaining_time'];
    let printTimeLeft = '--';
    let printEndTime = '--:--';
    if (remainingTimeEntity?.entity_id && (isPrinting || isPaused)) {
      const state = this._hass.states[remainingTimeEntity.entity_id];
      if (state) {
        const minutes = parseFloat(state.state) || 0;
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
    
    const customTemperature = this.config.custom_temperature;
    const customTemperatureState = customTemperature ? this._hass.states[customTemperature] : null;
    const customTemp = customTemperatureState ? parseFloat(customTemperatureState.state) || 0 : null;
    
    const powerSwitch = this.config.power_switch;
    const powerSwitchState = powerSwitch ? this._hass.states[powerSwitch] : null;
    const isPowerOn = powerSwitchState?.state === 'on';
    
    // Debug: Log light entity
    console.log('Prism Bambu: Chamber light entity:', chamberLightEntityId, 'State:', chamberLightState);
    
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
    console.log('Prism Bambu: Camera entity:', cameraEntity, 'Has image:', !!cameraImage);
    
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
    console.log('Prism Bambu: Cover image entity:', coverImageEntity, 'URL:', coverImageUrl);
    
    // Image path - use configured image or default
    // Supports both .png and .jpg formats
    const printerImg = this.config.image || '/local/custom-components/images/prism-bambu-pic.png';

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
      
      console.log('Prism Bambu: AMS device:', amsName, 'model:', amsModel, 'isExternalSpool:', isExternalSpool);
      
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
                console.log('Prism Bambu: Found External Spool entity:', entityId);
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
      console.log('Prism Bambu: Found tray/spool entities:', trayEntities.map(e => e.entityId));
      const firstState = this._hass.states[trayEntities[0].entityId];
      console.log('Prism Bambu: First entity full state:', firstState);
    } else if (this.config.ams_device) {
      console.log('Prism Bambu: No tray entities found for AMS device');
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
          console.log('Prism Bambu: Slot 1 attributes:', JSON.stringify(attr));
        }
        console.log(`Prism Bambu: Slot ${i + 1} - name: "${attr.name}", type: "${attr.type}", state: "${trayState?.state}"`);
        
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
          empty: isEmpty
        });
      } else if (!isExternalSpool && i < 4) {
        // Fill empty slots up to 4 only for full AMS (not external spool)
        amsData.push({
          id: i + 1,
          type: '',
          color: '#666666',
          remaining: 0,
          active: false,
          empty: true
        });
      }
    }
    
    // Debug: Log final AMS data
    console.log('Prism Bambu: Final AMS data:', amsData, 'isExternalSpool:', isExternalSpool, 'ams_device configured:', !!this.config.ams_device);
    
    // If no AMS device configured OR no entities found, hide section
    if (!this.config.ams_device || amsData.length === 0) {
      console.log('Prism Bambu: No AMS configured or no data, hiding AMS section');
      amsData = []; // Empty = hide section
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
      customTemp,
      powerSwitch,
      isPowerOn
    };
    
    // Debug: Log key data for icons and status
    console.log('Prism Bambu: Icons - Light:', chamberLightEntityId, 'Camera:', cameraEntity);
    console.log('Prism Bambu: Status - isPrinting:', isPrinting, 'isPaused:', isPaused, 'isIdle:', isIdle);
    
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
      currentLayer: 12,
      totalLayers: 28,
      name: this.config?.name || 'Bambu Lab Printer',
      cameraEntity: null,
      cameraImage: null,
      printerImg: this.config?.image || '/local/custom-components/images/prism-bambu-pic.png',
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
      customTemp: null,
      powerSwitch: null,
      isPowerOn: true
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
        
        /* Power Corner Button - positioned at top-right corner, half outside */
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
            color: #00AE42;
            gap: 8px;
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(0, 0, 0, 0.2);
        }
        .btn-primary:hover:not(:disabled) {
            color: #00c94d;
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
                <div class="ams-slot ${slot.active ? 'active' : ''}">
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
        ` : ''}

        <div class="main-visual ${!data.isLightOn ? 'light-off' : ''}">
            ${data.powerSwitch ? `
            <button class="power-corner-btn btn-power ${data.isPowerOn ? 'on' : 'off'}" title="Power ${data.isPowerOn ? 'Off' : 'On'}">
                <ha-icon icon="mdi:power"></ha-icon>
            </button>
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
                            <span class="pill-label">Cham</span>
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
            <button class="btn btn-secondary btn-speed" ${data.isIdle ? 'disabled' : ''}>
                <ha-icon icon="mdi:speedometer"></ha-icon>
            </button>
            <button class="btn btn-secondary btn-stop" ${data.isIdle ? 'disabled' : ''}>
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

