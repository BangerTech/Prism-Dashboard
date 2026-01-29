// Manufacturer and Models for device filtering
// Supports: Moonraker/Klipper integrations ONLY
// For Creality printers, use prism-creality.js instead
const SUPPORTED_MANUFACTURERS = [
  'Moonraker', 
  'Klipper',
  'moonraker',
  'klipper',
  'Voron',
  'Prusa',
  'RatRig',
  'Generic'
];

const SUPPORTED_PRINTER_MODELS = [
  // Generic Moonraker/Klipper printers
  '3D Printer', 'Printer', 'FDM Printer',
  // Common Klipper printers
  'Voron', 'Voron 0', 'Voron 2', 'Voron Trident',
  'Prusa', 'Prusa MK3', 'Prusa MK4',
  'RatRig', 'V-Core',
  'Ender 3', 'Ender 5',
  'CR-10',
  // Generic
  'Klipper Printer', 'Moonraker Printer'
];

// Entity keys to look for (Moonraker/Klipper entities)
const ENTITY_KEYS = [
  // Print Status (Moonraker)
  'current_print_state', 'printer_state', 'print_status', 'status',
  'progress', 'print_progress',
  'current_layer', 'total_layer', 'total_layers',
  'print_time_left', 'slicer_print_time_left_estimate', 'time_remaining', 'eta',
  'print_duration', 'filename',
  // Temperatures (Moonraker)
  'extruder_temperature', 'extruder_target',
  'heater_bed_temperature', 'bed_temperature', 'bed_target', 'heater_bed_target',
  'chamber_temperature', 'enclosure_temp',
  // Fans (Moonraker)
  'fan_speed', 'part_fan', 'heater_fan',
  // Controls (Moonraker)
  'pause_print', 'resume_print', 'cancel_print'
];

class Prism3DPrinterCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.showCamera = false;
    this.hasRendered = false;
    this._deviceEntities = {}; // Cache for device entities
    this._lastStatus = null; // Track status for re-render decisions
    // Spoolman tracking
    this._printStartUsage = null; // Filament usage at print start (for tracking)
    this._spoolmanPopupOpen = false; // Track if spoolman select popup is open
    this._lastSpoolmanStatus = null; // Track status for spoolman usage tracking
  }

  static getStubConfig() {
    return {
      printer: '',
      name: '3D Printer',
      camera_entity: '',
      image: '/local/community/Prism-Dashboard/images/printer-blank.jpg'
    };
  }

  static getConfigForm() {
    // Build filter for printer device selector
    // Moonraker/Klipper integrations ONLY
    const printerFilterCombinations = [];
    
    // Add all manufacturer/model combinations
    for (const manufacturer of SUPPORTED_MANUFACTURERS) {
      for (const model of SUPPORTED_PRINTER_MODELS) {
        printerFilterCombinations.push({ manufacturer, model });
      }
    }
    
    // Integration-based filters (Moonraker/Klipper only)
    printerFilterCombinations.push({ integration: 'moonraker' });
    printerFilterCombinations.push({ integration: 'klipper' });

    return {
      schema: [
        {
          name: 'printer',
          label: 'Printer Device (Moonraker/Klipper)',
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
          label: 'Camera entity (e.g. camera.printer_webcam)',
          selector: { entity: { domain: 'camera' } }
        },
        {
          name: 'light_switch',
          label: 'Light switch entity (e.g. light.printer_light)',
          selector: { entity: { domain: ['light', 'switch'] } }
        },
        {
          name: 'image',
          label: 'Printer image path (optional, supports .png, .jpg, .webp)',
          selector: { text: {} }
        },
        {
          name: 'show_cover_image',
          label: 'Show 3D model preview (Thumbnail) with print progress',
          selector: { boolean: {} }
        },
        {
          name: 'cover_image_entity',
          label: 'Cover image/thumbnail entity (optional - auto-detected if not set)',
          selector: { entity: { domain: ['camera', 'image'] } }
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
        // Display Options section - toggle visibility of chips/overlays
        {
          type: 'expandable',
          name: '',
          title: 'Display Options',
          schema: [
            {
              name: 'show_model_fan',
              label: 'Show Model/Part Fan',
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
              name: 'show_case_fan',
              label: 'Show Case/Enclosure Fan',
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
              name: 'show_layer_info',
              label: 'Show Layer Information',
              default: true,
              selector: { boolean: {} }
            },
            {
              name: 'show_time_info',
              label: 'Show Time Left / ETA',
              default: true,
              selector: { boolean: {} }
            }
          ]
        },
        // Spoolman Integration section
        {
          type: 'expandable',
          name: '',
          title: 'Spoolman Integration',
          schema: [
            {
              name: 'enable_spoolman',
              label: 'Enable Spoolman spool selection (for printers without AMS/CFS)',
              selector: { boolean: {} }
            },
            {
              name: 'filament_usage_entity',
              label: 'Filament Usage Entity (Used Material Length)',
              selector: { entity: { domain: 'sensor' } }
            },
            {
              name: 'enable_spoolman_tracking',
              label: 'Auto-track filament usage to Spoolman after print completes',
              selector: { boolean: {} }
            },
            {
              name: 'spool_view',
              label: 'Spool Display Style (Side = circular, Front = AMS-style vertical)',
              default: 'side',
              selector: {
                select: {
                  options: [
                    { value: 'side', label: 'Side (Circular - Default)' },
                    { value: 'front', label: 'Front (AMS-Style)' }
                  ]
                }
              }
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

  // Find all entities belonging to this device
  getDeviceEntities() {
    if (!this._hass || !this.config?.printer) return {};
    
    const deviceId = this.config.printer;
    const result = {};
    
    // Support multiple platforms
    const supportedPlatforms = ['moonraker', 'klipper'];
    
    // First try: Loop through all hass entities and find those belonging to our device
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      
      if (entityInfo.device_id === deviceId) {
        // Check if this entity matches one of our known keys or is from a supported platform
        const platform = entityInfo.platform || '';
        const isSupported = supportedPlatforms.some(p => platform.toLowerCase().includes(p)) || 
                           !platform || platform === '';
        
        if (isSupported) {
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
    
    // Second try: If no entities found by device_id, search by device name in entity IDs
    // This is important for Moonraker where entities are named like "sensor.k1_098d_bed_temperature"
    if (Object.keys(result).length === 0) {
      const device = this._hass.devices?.[deviceId];
      if (device?.name) {
        // Create search patterns from device name
        // E.g., "K1-098D" -> "k1_098d" (with underscores) and "k1098d" (simple)
        const deviceName = device.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const deviceNameSimple = device.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Search in states (this covers ALL entities including those without entity registry entry)
        for (const entityId in this._hass.states) {
          const entityIdLower = entityId.toLowerCase();
          
          // Match by device name pattern (e.g., "sensor.k1_098d_bed_temperature" contains "k1_098d")
          if (deviceName && entityIdLower.includes(deviceName)) {
            result[entityId] = { entity_id: entityId };
          }
          // Also try simplified name without underscores
          else if (deviceNameSimple && deviceNameSimple !== deviceName && entityIdLower.includes(deviceNameSimple)) {
            result[entityId] = { entity_id: entityId };
          }
        }
        
      }
    }
    
    return result;
  }

  // Get entity by name pattern (searches entity_id)
  // IMPORTANT: Only searches for entities belonging to the selected device
  findEntityByPattern(pattern, domain = null) {
    if (!this._hass) return null;
    
    const deviceId = this.config?.printer;
    
    // Get device name patterns for searching (dynamically from actual device name)
    // E.g., device "K1-098D" -> patterns: ["k1_098d", "k1098d"] and parts: ["k1", "098d"]
    let deviceNamePattern = '';
    let deviceNameSimple = '';
    
    if (deviceId) {
      const device = this._hass.devices?.[deviceId];
      if (device?.name) {
        deviceNamePattern = device.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        deviceNameSimple = device.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
    }
    
    // Helper to check if entity matches domain
    const matchesDomain = (entityId, targetDomain) => {
      if (!targetDomain) return true;
      return entityId.split('.')[0] === targetDomain;
    };
    
    // First pass: Look for entities bound to our device by device_id
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      if (entityInfo.device_id === deviceId && entityId.toLowerCase().includes(pattern.toLowerCase())) {
        if (matchesDomain(entityId, domain)) return entityId;
      }
    }
    
    // Second pass: Look for entities by full device name pattern (e.g., "k1_098d")
    // This catches Moonraker entities like "sensor.k1_098d_bed_temperature"
    // IMPORTANT: Only match if entity contains the device name pattern!
    if (deviceNamePattern) {
      for (const entityId in this._hass.states) {
        const entityIdLower = entityId.toLowerCase();
        // Must contain BOTH device name AND pattern
        if (entityIdLower.includes(deviceNamePattern) && entityIdLower.includes(pattern.toLowerCase())) {
          if (matchesDomain(entityId, domain)) return entityId;
        }
      }
    }
    
    // Third pass: Try simplified device name (without underscores)
    if (deviceNameSimple && deviceNameSimple !== deviceNamePattern) {
      for (const entityId in this._hass.states) {
        const entityIdLower = entityId.toLowerCase();
        // Must contain BOTH device name AND pattern
        if (entityIdLower.includes(deviceNameSimple) && entityIdLower.includes(pattern.toLowerCase())) {
          if (matchesDomain(entityId, domain)) return entityId;
        }
      }
    }
    
    // NO fourth pass - don't search for generic platform entities as this can find wrong devices!
    // If a device is selected, only return entities that belong to that device.
    
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
    // Support Moonraker/Klipper platforms
    const supportedPlatforms = ['moonraker', 'klipper'];
    
    // First try: Find by device_id in entities registry
    for (const entityId in this._hass.entities) {
      const entityInfo = this._hass.entities[entityId];
      
      if (entityInfo.device_id === deviceId) {
        // Accept entities from supported platforms, or any entity if platform is unknown
        const platform = entityInfo.platform || '';
        const isSupported = supportedPlatforms.some(p => platform.toLowerCase().includes(p)) || 
                           !platform || 
                           platform === '';
        
        if (isSupported) {
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
    
    // Second try: If no entities found, search by device name in entity IDs
    if (Object.keys(result).length === 0) {
      const device = this._hass.devices?.[deviceId];
      if (device) {
        const deviceName = device.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || '';
        const deviceNameSimple = device.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        
        // Search in states by device name pattern (covers all entities)
        for (const entityId in this._hass.states) {
          const entityIdLower = entityId.toLowerCase();
          if (entityIdLower.includes(deviceName) || entityIdLower.includes(deviceNameSimple)) {
            result[entityId] = { entity_id: entityId };
          }
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
    
    // First try: Find by device_id
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
    
    // Second try: Get device name and search by entity name pattern
    // This is important for integrations where entities might not have device_id set
    const device = this._hass.devices?.[deviceId];
    if (device) {
      const deviceName = device.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || '';
      const deviceNameSimple = device.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      
      for (const entityId in this._hass.states) {
        const entityIdLower = entityId.toLowerCase();
        // Check if entity name contains device name or pattern
        if ((entityIdLower.includes(deviceName) || entityIdLower.includes(deviceNameSimple)) && 
            entityIdLower.includes(pattern.toLowerCase())) {
          if (domain) {
            const entityDomain = entityId.split('.')[0];
            if (entityDomain === domain) return entityId;
          } else {
            return entityId;
          }
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
    
    // Helper to find entity with multiple pattern options
    const findEntityMultiPattern = (patterns, domain = 'sensor') => {
      for (const pattern of patterns) {
        const entity = this.findEntityByPatternForDevice(deviceId, pattern, domain);
        if (entity) return entity;
      }
      return null;
    };
    
    // Get print status
    // Status entity patterns
    // Moonraker HA: current_print_state, printer_state, status
    let stateStr = 'Idle';
    const stateEntity = findEntityMultiPattern([
      'devicestate', 'current_print_state', 'print_status', 'print_state', 
      'printer_state', 'status', '_state'
    ]);
    
    if (stateEntity) {
      const rawState = this._hass.states[stateEntity]?.state || 'unavailable';
      // If state is purely numeric (like "0", "1"), convert to readable status
      if (/^\d+$/.test(rawState)) {
        // Numeric states mapping (for legacy integrations): 0 = Idle, 1 = Printing, 2 = Paused, etc.
        const numericStateMap = {
          '0': 'Idle',
          '1': 'Printing',
          '2': 'Paused',
          '3': 'Finished',
          '4': 'Stopped',
          '5': 'Paused',  // Layer pause / User pause
          '6': 'Paused',  // Other pause states
          '7': 'Error'
        };
        stateStr = numericStateMap[rawState] || 'Idle';
      } else {
        stateStr = rawState;
      }
    }
    
    const statusLower = stateStr.toLowerCase();
    
    // Progress - get early for smart status detection
    // Progress entity patterns
    // Moonraker: print_progress, progress_percentage
    let progress = 0;
    const progressEntity = findEntityMultiPattern([
      'printprogress', 'print_progress', 'progress_percentage', 'progress'
    ]);
    if (progressEntity) {
      progress = parseFloat(this._hass.states[progressEntity]?.state) || 0;
    }
    
    // Extended pause states - includes layer pause, user pause, waiting states
    // Extended pause states
    const pauseStates = ['paused', 'pause', 'pausiert', '2', '5', '6', 'waiting', 'user_pause', 'user pause', 
                         'layer_pause', 'layer pause', 'filament_change', 'filament change',
                         'suspended', 'on hold', 'halted'];
    
    const printingStates = ['printing', 'prepare', 'running', 'druckt', '1', 'busy'];
    const idleStates = ['idle', 'standby', 'ready', 'finished', 'complete', 'stopped', 'cancelled', 
                        'error', 'offline', 'unavailable', '0', '3', '4'];
    
    let isPrinting = printingStates.includes(statusLower);
    let isPaused = pauseStates.includes(statusLower);
    
    // Smart detection: If progress is between 0-100 and status is unknown, 
    // check if it's likely a pause state (not printing, not explicitly idle)
    if (!isPrinting && !isPaused && progress > 0 && progress < 100) {
      // If we have progress but status isn't recognized as printing or idle, assume paused
      if (!idleStates.includes(statusLower)) {
        isPaused = true;
      }
    }
    
    const isIdle = !isPrinting && !isPaused;

    // Remaining time
    // Time remaining entity patterns
    // Moonraker HA: slicer_print_time_left_estimate, print_time_left, time_remaining, eta (may be in seconds)
    let printTimeLeft = '--';
    const timeEntity = findEntityMultiPattern([
      'printlefttime', 'slicer_print_time_left', 'print_time_left', 'time_remaining', 'lefttime', 'eta', 'print_eta', 'remaining'
    ]);
    if (timeEntity && (isPrinting || isPaused)) {
      let timeValue = parseFloat(this._hass.states[timeEntity]?.state) || 0;
      // If value > 1000, assume it's in seconds (Moonraker), convert to minutes
      if (timeValue > 1000) {
        timeValue = timeValue / 60;
      }
      if (timeValue > 0) {
        const hours = Math.floor(timeValue / 60);
        const mins = Math.round(timeValue % 60);
        printTimeLeft = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }
    }

    // Layer info
    // Layer info entity patterns
    // Moonraker: current_layer, total_layer, layer
    let currentLayer = 0;
    let totalLayers = 0;
    if (isPrinting || isPaused) {
      const layerEntity = findEntityMultiPattern(['current_layer', '_layer', 'layer']);
      const totalLayerEntity = findEntityMultiPattern(['total_layer', 'totallayer', 'total_layers']);
      if (layerEntity) currentLayer = parseInt(this._hass.states[layerEntity]?.state) || 0;
      if (totalLayerEntity) totalLayers = parseInt(this._hass.states[totalLayerEntity]?.state) || 0;
    }

    // Temperatures
    // Temperature entity patterns
    // Moonraker: extruder_temperature, heater_bed_temperature, temperature
    let nozzleTemp = 0, targetNozzleTemp = 0, bedTemp = 0, targetBedTemp = 0, chamberTemp = 0;
    
    const nozzleTempEntity = findEntityMultiPattern([
      'nozzletemp', 'extruder_temperature', 'extruder_temp', 'hotend_temp', 'nozzle_temp'
    ]);
    // Target nozzle can be sensor OR number domain in Moonraker HA
    let targetNozzleEntity = findEntityMultiPattern([
      'targetnozzle', 'extruder_target', 'target_extruder', 'nozzle_target', 'target_nozzle'
    ]);
    if (!targetNozzleEntity) {
      targetNozzleEntity = findEntityMultiPattern([
        'extruder_target', 'target_extruder', 'nozzle_target'
      ], 'number');
    }
    const bedTempEntity = findEntityMultiPattern([
      'bedtemp', 'heater_bed_temperature', 'bed_temp', 'bed_temperature', 'heated_bed'
    ]);
    // Target bed can be sensor OR number domain in Moonraker HA
    let targetBedEntity = findEntityMultiPattern([
      'targetbed', 'heater_bed_target', 'bed_target', 'target_bed'
    ]);
    if (!targetBedEntity) {
      targetBedEntity = findEntityMultiPattern([
        'bed_target', 'target_bed', 'heater_bed_target'
      ], 'number');
    }
    const boxTempEntity = findEntityMultiPattern([
      'boxtemp', 'chamber_temp', 'chamber_temperature', 'enclosure_temp'
    ]);
    
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
    const name = customName || device?.name || '3D Printer';

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
    const oldSpoolmanStatus = this._lastSpoolmanStatus;
    this._hass = hass;
    
    // Cache device entities on first hass assignment or if empty (only if printer is configured)
    if (this.config?.printer && (firstTime || Object.keys(this._deviceEntities).length === 0)) {
      this._deviceEntities = this.getDeviceEntities();
    }
    
    // Get current status to detect changes
    const data = this.getPrinterData();
    const newStatus = `${data.isIdle}-${data.isPrinting}-${data.isPaused}-${!!data.lightEntity}-${!!data.cameraEntity}-${!!data.powerSwitch}-${data.isPowerOn}`;
    
    // Track Spoolman filament usage (if enabled)
    if (this.config?.enable_spoolman_tracking) {
      this._trackSpoolmanUsage(data.stateStr, oldSpoolmanStatus);
      this._lastSpoolmanStatus = data.stateStr;
    }
    
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
    
    // Update time left
    const statVals = this.shadowRoot.querySelectorAll('.stats-row .stat-val');
    if (statVals.length >= 1) {
      statVals[0].textContent = data.printTimeLeft;
    }
    
    // Update layer
    if (statVals.length >= 2) {
      statVals[1].innerHTML = `${data.isIdle ? '--' : data.currentLayer} <span style="font-size: 0.875rem; opacity: 0.4;">/ ${data.isIdle ? '--' : data.totalLayers}</span>`;
    }
    
    // Update fans via data-field attributes
    const modelFanEl = this.shadowRoot.querySelector('[data-field="model-fan"]');
    if (modelFanEl) modelFanEl.textContent = `${Math.round(data.modelFanSpeed)}%`;
    
    const auxFanEl = this.shadowRoot.querySelector('[data-field="aux-fan"]');
    if (auxFanEl) auxFanEl.textContent = `${Math.round(data.auxFanSpeed)}%`;
    
    const caseFanEl = this.shadowRoot.querySelector('[data-field="case-fan"]');
    if (caseFanEl) caseFanEl.textContent = `${Math.round(data.caseFanSpeed)}%`;
    
    const humidityEl = this.shadowRoot.querySelector('[data-field="humidity"]');
    if (humidityEl) humidityEl.textContent = `${Math.round(data.humidity)}%`;
    
    // Update temperatures via data-field attributes
    const nozzleTempEl = this.shadowRoot.querySelector('[data-field="nozzle-temp"]');
    if (nozzleTempEl) nozzleTempEl.textContent = `${Math.round(data.nozzleTemp)}°`;
    
    const nozzleTargetEl = this.shadowRoot.querySelector('[data-field="nozzle-target"]');
    if (nozzleTargetEl) nozzleTargetEl.textContent = `/${Math.round(data.targetNozzleTemp)}°`;
    
    const bedTempEl = this.shadowRoot.querySelector('[data-field="bed-temp"]');
    if (bedTempEl) bedTempEl.textContent = `${Math.round(data.bedTemp)}°`;
    
    const bedTargetEl = this.shadowRoot.querySelector('[data-field="bed-target"]');
    if (bedTargetEl) bedTargetEl.textContent = `/${Math.round(data.targetBedTemp)}°`;
    
    const chamberTempEl = this.shadowRoot.querySelector('[data-field="chamber-temp"]');
    if (chamberTempEl) chamberTempEl.textContent = `${Math.round(data.chamberTemp)}°`;
    
    const customTempEl = this.shadowRoot.querySelector('[data-field="custom-temp"]');
    if (customTempEl) customTempEl.textContent = `${Math.round(data.customTemp)}°`;
    
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
    const coverImageProgress = this.shadowRoot.querySelector('.cover-image-progress');
    if (coverImage && data.coverImageUrl && coverImage.src !== data.coverImageUrl) {
      coverImage.src = data.coverImageUrl;
      if (coverImageProgress) {
        coverImageProgress.src = data.coverImageUrl;
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
        
        // Clear container and add stream
        cameraContainer.innerHTML = '';
        cameraContainer.appendChild(cameraStream);
        
        // Tap/Click to open popup (works on tablets too)
        addTapListener(cameraStream, () => {
          this.openCameraPopup();
        });
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
    
    // Spoolman slot click handler
    const spoolmanSlot = this.shadowRoot?.querySelector('.spoolman-slot');
    if (spoolmanSlot) {
      addTapListener(spoolmanSlot, () => {
        this._openSpoolmanSelectPopup();
      });
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
    
    const deviceId = this.config?.printer;
    const data = this.getPrinterData();
    let btn = null;
    
    // First try: Toggle button (some integrations use this)
    const togglePatterns = ['pause_resume_print', 'pause_resume', 'pauseresume'];
    for (const pattern of togglePatterns) {
      btn = this.findEntityByPatternForDevice(deviceId, pattern, 'button');
      if (btn) break;
    }
    if (!btn) {
      for (const pattern of togglePatterns) {
        btn = this.findEntityByPattern(pattern, 'button');
        if (btn) break;
      }
    }
    
    // Second try: Separate pause/resume buttons (Moonraker uses these)
    if (!btn) {
      if (data.isPaused) {
        // Need to RESUME
        const resumePatterns = ['resume_print', 'resume'];
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
        // Need to PAUSE
        const pausePatterns = ['pause_print', 'pause'];
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
    }
    
    console.log('Prism 3DPrinter: handlePause - isPaused:', data.isPaused, 'isPrinting:', data.isPrinting, 'Found entity:', btn);
    
    if (btn) {
      this._hass.callService('button', 'press', { entity_id: btn });
      console.log('Prism 3DPrinter: Called button.press for:', btn);
    } else {
      console.warn('Prism 3DPrinter: No pause/resume button found. Available entities:', 
        Object.keys(this._hass.entities).filter(e => e.includes('moonraker') || e.includes('klipper') || e.includes('printer')));
      
      // Open more-info for the print status entity as fallback
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
    const deviceId = this.config?.printer;
    
    // Stop patterns: cancel_print, stop_print, emergency_stop
    // Moonraker: cancel_print, emergency_stop
    const patterns = ['stop_print', 'cancel_print', 'emergency_stop', 'stop'];
    let stopBtn = null;
    
    for (const pattern of patterns) {
      stopBtn = this.findEntityByPatternForDevice(deviceId, pattern, 'button');
      if (stopBtn) break;
    }
    
    if (!stopBtn) {
      for (const pattern of patterns) {
        stopBtn = this.findEntityByPattern(pattern, 'button');
        if (stopBtn) break;
      }
    }
    
    if (stopBtn) {
      this._hass.callService('button', 'press', { entity_id: stopBtn });
      console.log('Prism 3DPrinter: Called button.press for:', stopBtn);
    }
  }

  handleHome() {
    if (!this._hass) return;
    const deviceId = this.config?.printer;
    
    // Home button patterns
    const patterns = ['home_all_axes', 'home_all', 'home'];
    let homeBtn = null;
    
    for (const pattern of patterns) {
      homeBtn = this.findEntityByPatternForDevice(deviceId, pattern, 'button');
      if (homeBtn) break;
    }
    
    if (!homeBtn) {
      for (const pattern of patterns) {
        homeBtn = this.findEntityByPattern(pattern, 'button');
        if (homeBtn) break;
      }
    }
    
    if (homeBtn) {
      this._hass.callService('button', 'press', { entity_id: homeBtn });
      console.log('Prism 3DPrinter: Called button.press for:', homeBtn);
    }
  }
  
  handleLightToggle() {
    if (!this._hass) return;
    
    // Use configured light_switch or auto-detect
    let entityId = this.config.light_switch;
    
    // Otherwise find the light entity (switch, light, or number domain)
    if (!entityId) {
      entityId = this.findEntityByPattern('light', 'switch');
    }
    if (!entityId) {
      entityId = this.findEntityByPattern('light', 'light');
    }
    // Moonraker HA uses number domain for LED control
    if (!entityId) {
      entityId = this.findEntityByPattern('output_pin_led', 'number') || this.findEntityByPattern('led', 'number');
    }
    
    if (!entityId) {
      console.warn('Prism 3DPrinter: No light entity found. Please configure light_switch in card settings.');
      return;
    }
    
    // Determine domain from entity_id
    const domain = entityId.split('.')[0];
    const currentState = this._hass.states[entityId]?.state;
    let newState;
    
    // Handle different domains
    if (domain === 'number') {
      // Number entities: toggle between 0 and max value
      const currentValue = parseFloat(currentState) || 0;
      const maxValue = this._hass.states[entityId]?.attributes?.max || 100;
      const newValue = currentValue > 0 ? 0 : maxValue;
      newState = newValue > 0 ? 'on' : 'off';
      this._hass.callService('number', 'set_value', { entity_id: entityId, value: newValue });
    } else {
      // Light/Switch entities: use toggle service
      newState = currentState === 'on' ? 'off' : 'on';
      this._hass.callService(domain, 'toggle', { entity_id: entityId });
    }
    
    // Optimistically update UI immediately
    const lightBtn = this.shadowRoot?.querySelector('.btn-light');
    
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
      console.warn('Prism 3DPrinter: No valid camera entity found. Please configure camera_entity in card settings.');
      return;
    }
    
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return;
    
    // Remove existing popup if any
    this.closeCameraPopup();
    
    // Get printer name for title
    const deviceId = this.config.printer;
    const device = this._hass.devices?.[deviceId];
    const printerName = this.config.name || device?.name || '3D Printer';
    
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
          color: #8B5CF6;
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.4),
            -1px -1px 3px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-camera-title-icon ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.5));
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
          transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.4),
            -1px -1px 3px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-camera-close ha-icon {
          display: flex;
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
          color: #8B5CF6;
          box-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.3),
            -1px -1px 2px rgba(255, 255, 255, 0.02),
            inset 1px 1px 1px rgba(255, 255, 255, 0.05);
        }
        .prism-info-header-icon ha-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 3px rgba(0, 150, 255, 0.5));
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
          background: linear-gradient(90deg, #8B5CF6, #00C8FF);
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
        
        /* Mobile Responsive Styles */
        @media (max-width: 600px) {
          #prism-camera-popup-overlay {
            padding: 0;
          }
          .prism-camera-popup {
            min-width: unset;
            min-height: unset;
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100vw;
            max-height: 100vh;
            border-radius: 0;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
          }
          .prism-camera-body {
            flex-direction: column;
          }
          .prism-camera-content {
            flex: 1;
            min-height: 40vh;
          }
          .prism-camera-info {
            position: static;
            width: 100%;
            max-height: 35vh;
            border-radius: 0;
            border: none;
            border-top: 1px solid rgba(255,255,255,0.1);
            overflow-y: auto;
          }
          .prism-info-content {
            padding: 10px;
            gap: 8px;
          }
          .prism-camera-footer {
            flex-wrap: wrap;
            gap: 8px;
            padding: 10px 12px;
          }
          .prism-camera-footer-left {
            flex-wrap: wrap;
            gap: 6px;
          }
          .prism-camera-entity {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .prism-camera-resize-hint {
            display: none;
          }
          .prism-camera-resize-handle {
            display: none;
          }
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
      // Look for stop-related entities
      const deviceId = this.config.printer;
      let stopEntity = null;
      
      // Look for button.xxx_stop or similar entities
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
        alert('Stop entity not found. Please check your Moonraker/Klipper integration.');
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
    
    console.log('Prism 3DPrinter: Camera popup opened:', entityId);
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
    
    // Refresh the camera stream in the card (it may have paused while popup was open)
    this._refreshCardCameraStream();
    
    console.log('Prism 3DPrinter: Camera popup closed');
  }
  
  // Refresh the camera stream in the card after popup closes
  _refreshCardCameraStream() {
    console.log('Prism 3DPrinter: _refreshCardCameraStream called, showCamera:', this.showCamera);
    
    if (!this.shadowRoot || !this._hass) {
      console.log('Prism 3DPrinter: Refresh aborted - no shadowRoot or hass');
      return;
    }
    
    if (!this.showCamera) {
      console.log('Prism 3DPrinter: Refresh aborted - camera view not active');
      return;
    }
    
    const cameraContainer = this.shadowRoot.querySelector('.camera-container');
    if (!cameraContainer) {
      console.log('Prism 3DPrinter: Refresh aborted - no camera container found');
      return;
    }
    
    const entityId = cameraContainer.dataset.entity;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) {
      console.log('Prism 3DPrinter: Refresh aborted - no state object for:', entityId);
      return;
    }
    
    // Find existing camera stream
    const existingStream = cameraContainer.querySelector('ha-camera-stream');
    if (!existingStream) {
      console.log('Prism 3DPrinter: No existing stream found, creating new one');
    }
    
    // Longer delay to let popup fully close and resources release, then recreate stream
    setTimeout(() => {
      // Remove old stream if exists
      if (existingStream) {
        existingStream.remove();
      }
      
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
      
      console.log('Prism 3DPrinter: Camera stream refreshed after popup close');
    }, 300);
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
          color: #8B5CF6;
          --mdc-icon-size: 18px;
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .prism-multi-title-icon ha-icon {
          display: flex;
          --mdc-icon-size: 18px;
          filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.5));
        }
        .prism-multi-badge {
          background: linear-gradient(145deg, #1c1e24, #25282e);
          color: #60a5fa;
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
        
        /* Mobile Responsive Styles for Multi-Printer Popup */
        @media (max-width: 600px) {
          #prism-camera-popup-overlay {
            padding: 0;
          }
          .prism-multi-popup {
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100vw;
            border-radius: 0;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
          }
          .prism-multi-grid {
            padding: 8px;
            gap: 8px;
          }
          .prism-multi-cell {
            min-height: 180px;
          }
          .prism-multi-cell-header {
            padding: 6px 10px;
          }
          .prism-multi-cell-name span {
            font-size: 11px;
          }
          .prism-multi-info {
            padding: 6px;
            gap: 4px;
          }
          .prism-multi-stat {
            font-size: 10px;
            padding: 3px 6px;
          }
          .prism-multi-resize-handle {
            display: none;
          }
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
    
    // Setup camera feeds (uses ha-camera-stream)
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
      
      // Find light entity for this device (switch or light domain)
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
    
    console.log('Prism 3DPrinter: Multi-camera popup opened with', printerCount, 'printers');
  }

  // ==================== SPOOLMAN INTEGRATION ====================
  
  // Get localStorage key for this printer's selected spool
  _getSpoolmanStorageKey() {
    return `prism-3dprinter-spoolman-${this.config?.printer || 'default'}`;
  }
  
  // Get the currently selected spool entity ID from localStorage
  _getSelectedSpoolEntityId() {
    return localStorage.getItem(this._getSpoolmanStorageKey());
  }
  
  // Save selected spool entity ID to localStorage
  // Note: The active spool is stored locally. Filament usage is tracked via spoolman.use_spool_filament service.
  _setSelectedSpoolEntityId(entityId) {
    if (entityId) {
      localStorage.setItem(this._getSpoolmanStorageKey(), entityId);
    } else {
      localStorage.removeItem(this._getSpoolmanStorageKey());
    }
    // Force re-render to show updated spool
    this.render();
    this.setupListeners();
  }
  
  // Get all available Spoolman spools from Home Assistant
  _getAllSpoolmanSpools() {
    if (!this._hass) return [];
    
    const spools = [];
    
    // Regex to match only main spool sensors: sensor.spoolman_spool_123 (number only, no suffix)
    const mainSpoolRegex = /^sensor\.spoolman_spool_\d+$/;
    
    // Find all sensor.spoolman_spool_* entities (main spool sensors only)
    for (const [entityId, state] of Object.entries(this._hass.states)) {
      // Match main spool sensors: sensor.spoolman_spool_X (only numbers, no sub-sensors)
      if (mainSpoolRegex.test(entityId)) {
        
        const attrs = state.attributes || {};
        const remaining = parseFloat(state.state) || 0;
        const archived = attrs.archived === true;
        
        // Only include active spools with filament remaining (not archived, remaining > 0)
        if (!archived && remaining > 0) {
          // Try to get vendor from attributes first, then from separate sensor
          let vendor = attrs.filament_vendor || attrs.vendor || '';
          if (!vendor) {
            // Try to get vendor from separate sensor entity
            const vendorEntityId = entityId + '_vendor';
            const vendorState = this._hass.states[vendorEntityId];
            if (vendorState && vendorState.state && vendorState.state !== 'unknown' && vendorState.state !== 'unavailable') {
              vendor = vendorState.state;
            }
          }
          
          spools.push({
            entityId,
            id: attrs.id,
            name: attrs.filament_name || attrs.friendly_name || 'Unknown Spool',
            type: attrs.filament_material || 'PLA',
            color: attrs.filament_color_hex ? `#${attrs.filament_color_hex}` : '#666666',
            remaining: remaining,
            usedPercentage: attrs.used_percentage || 0,
            vendor: vendor,
            location: attrs.location || ''
          });
        }
      }
    }
    
    // Sort by vendor + name
    return spools.sort((a, b) => {
      const nameA = `${a.vendor} ${a.name}`.trim().toLowerCase();
      const nameB = `${b.vendor} ${b.name}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }
  
  // Get data for the currently selected spool
  _getSelectedSpoolData() {
    const entityId = this._getSelectedSpoolEntityId();
    if (!entityId || !this._hass) return null;
    
    const state = this._hass.states[entityId];
    if (!state) return null;
    
    const attrs = state.attributes || {};
    const remaining = parseFloat(state.state) || 0;
    
    // Check if spool is still valid (not archived, has remaining)
    if (attrs.archived === true || remaining <= 0) {
      // Spool is no longer valid, clear selection
      this._setSelectedSpoolEntityId(null);
      return null;
    }
    
    // Try to get vendor from attributes first, then from separate sensor
    let vendor = attrs.filament_vendor || attrs.vendor || '';
    if (!vendor) {
      // Try to get vendor from separate sensor entity
      const vendorEntityId = entityId + '_vendor';
      const vendorState = this._hass.states[vendorEntityId];
      if (vendorState && vendorState.state && vendorState.state !== 'unknown' && vendorState.state !== 'unavailable') {
        vendor = vendorState.state;
      }
    }
    
    return {
      entityId,
      id: attrs.id,
      name: attrs.filament_name || attrs.friendly_name || 'Unknown',
      type: attrs.filament_material || 'PLA',
      color: attrs.filament_color_hex ? `#${attrs.filament_color_hex}` : '#666666',
      remaining: remaining,
      usedPercentage: attrs.used_percentage || 0,
      vendor: vendor,
      location: attrs.location || ''
    };
  }
  
  // Open Spoolman spool selection popup
  _openSpoolmanSelectPopup() {
    if (this._spoolmanPopupOpen) return;
    this._spoolmanPopupOpen = true;
    
    const spools = this._getAllSpoolmanSpools();
    const selectedEntityId = this._getSelectedSpoolEntityId();
    
    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'spoolman-select-overlay';
    popup.innerHTML = `
      <div class="spoolman-select-popup">
        <div class="spoolman-select-header">
          <div class="spoolman-select-title">
            <ha-icon icon="mdi:selection-ellipse"></ha-icon>
            <span>Select Spool</span>
          </div>
          <button class="spoolman-select-close">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="spoolman-select-list">
          ${spools.length === 0 ? `
            <div class="spoolman-no-spools">
              <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
              <span>No active spools found in Spoolman</span>
            </div>
          ` : spools.map(spool => `
            <div class="spoolman-select-item ${spool.entityId === selectedEntityId ? 'selected' : ''}"
                 data-entity-id="${spool.entityId}"
                 data-spool-id="${spool.id}">
              <div class="spoolman-spool-color" style="background-color: ${spool.color};"></div>
              <div class="spoolman-spool-details">
                <div class="spoolman-spool-name">${spool.name}</div>
                <div class="spoolman-spool-meta">${spool.vendor ? spool.vendor + ' • ' : ''}${spool.type} • ${Math.round(spool.remaining)}g remaining</div>
              </div>
              ${spool.entityId === selectedEntityId ? '<ha-icon icon="mdi:check-circle" class="spoolman-selected-icon"></ha-icon>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    // Add event listeners
    const closeBtn = popup.querySelector('.spoolman-select-close');
    closeBtn.onclick = () => this._closeSpoolmanSelectPopup();
    
    // Close on overlay click
    popup.onclick = (e) => {
      if (e.target === popup) this._closeSpoolmanSelectPopup();
    };
    
    // Handle spool selection
    const items = popup.querySelectorAll('.spoolman-select-item');
    items.forEach(item => {
      item.onclick = () => {
        const entityId = item.dataset.entityId;
        this._setSelectedSpoolEntityId(entityId);
        this._closeSpoolmanSelectPopup();
      };
    });
    
    // Add to shadow DOM
    this.shadowRoot.appendChild(popup);
  }
  
  // Close Spoolman select popup
  _closeSpoolmanSelectPopup() {
    this._spoolmanPopupOpen = false;
    const popup = this.shadowRoot?.querySelector('.spoolman-select-overlay');
    if (popup) {
      popup.remove();
    }
  }
  
  // Call Spoolman service to report filament usage
  _callSpoolmanService(spoolId, usedLengthMm) {
    if (!this._hass || !spoolId || usedLengthMm <= 0) return;
    
    this._hass.callService('spoolman', 'use_spool_filament', {
      id: spoolId,
      use_length: usedLengthMm
    });
    
    console.log(`[Prism-3DPrinter] Reported ${usedLengthMm.toFixed(1)}mm filament usage to Spoolman spool ${spoolId}`);
  }
  
  // Track filament usage for Spoolman (called from set hass)
  _trackSpoolmanUsage(newStatus, oldStatus) {
    if (!this.config?.enable_spoolman_tracking || !this.config?.filament_usage_entity) return;
    
    const selectedSpool = this._getSelectedSpoolData();
    if (!selectedSpool) return;
    
    const usageEntity = this._hass?.states[this.config.filament_usage_entity];
    const currentUsage = parseFloat(usageEntity?.state) || 0;
    
    // Normalize status strings for comparison
    const normalizeStatus = (s) => (s || '').toLowerCase().trim();
    const newStatusNorm = normalizeStatus(newStatus);
    const oldStatusNorm = normalizeStatus(oldStatus);
    
    const isPrinting = ['printing', 'running', 'busy'].includes(newStatusNorm);
    const wasPrinting = ['printing', 'running', 'busy'].includes(oldStatusNorm);
    const isFinished = ['completed', 'idle', 'standby', 'finished', 'ready'].includes(newStatusNorm);
    
    // Print started - remember current usage value
    if (isPrinting && !wasPrinting) {
      this._printStartUsage = currentUsage;
      console.log(`[Prism-3DPrinter] Print started. Tracking usage for Spoolman spool ${selectedSpool.id} (start: ${currentUsage})`);
    }
    
    // Print ended - calculate and report usage
    if (wasPrinting && isFinished && this._printStartUsage !== null) {
      const usedCm = currentUsage - this._printStartUsage;
      const usedMm = usedCm * 10; // Convert cm to mm
      
      if (usedMm > 0) {
        this._callSpoolmanService(selectedSpool.id, usedMm);
      }
      
      this._printStartUsage = null; // Reset for next print
    }
  }
  
  // ==================== END SPOOLMAN INTEGRATION ====================

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
      console.warn('Prism 3DPrinter: No device entities found for device:', this.config.printer);
      return this.getPreviewData();
    }
    
    // Find entities by searching entity_ids
    // Helper to find entity with multiple pattern options (Moonraker/Klipper)
    const findMulti = (patterns, domain = null) => {
      for (const pattern of patterns) {
        const entity = this.findEntityByPattern(pattern, domain);
        if (entity) return entity;
      }
      return null;
    };
    
    // Status, Progress, Layers - Moonraker/Klipper
    // Moonraker HA uses: current_print_state, printer_state, progress, current_layer, total_layer, print_time_left
    const progressEntity = findMulti(['printprogress', 'print_progress', 'progress_percentage', 'progress']);
    const stateEntity = findMulti(['devicestate', 'current_print_state', 'print_status', 'print_state', 'printer_state', 'device_state', 'status']);
    const layerEntity = findMulti(['current_layer', '_layer', 'layer']);
    const totalLayerEntity = findMulti(['total_layer', 'totallayer', 'total_layers']);
    // Moonraker HA: slicer_print_time_left_estimate, print_time_left, print_eta
    const timeLeftEntity = findMulti(['printlefttime', 'slicer_print_time_left', 'print_time_left', 'time_remaining', 'time_left', 'eta', 'print_eta']);
    
    
    // Temperatures
    const nozzleTempEntity = findMulti(['nozzletemp', 'extruder_temperature', 'extruder_temp', 'nozzle_temp']);
    // Target temps can be sensor OR number domain in Moonraker HA
    let targetNozzleTempEntity = findMulti(['targetnozzle', 'extruder_target', 'target_nozzle']);
    if (!targetNozzleTempEntity) {
      targetNozzleTempEntity = findMulti(['extruder_target', 'target_nozzle', 'nozzle_target'], 'number');
    }
    const bedTempEntity = findMulti(['bedtemp', 'heater_bed_temperature', 'bed_temp', 'bed_temperature']);
    let targetBedTempEntity = findMulti(['targetbed', 'heater_bed_target', 'bed_target', 'target_bed']);
    if (!targetBedTempEntity) {
      targetBedTempEntity = findMulti(['bed_target', 'target_bed', 'heater_bed_target'], 'number');
    }
    const boxTempEntity = findMulti(['boxtemp', 'chamber_temp', 'chamber_temperature', 'enclosure_temp']);
    
    
    // Fans - Moonraker: hotend_fan, output_pin_fan0/1/2
    // Moonraker K1 fan mapping: Fan0 = Model/Part, Fan1 = Case/Enclosure, Fan2 = Aux/Side
    // Note: chamber_fan_temp is a temperature sensor, not a fan speed!
    // Moonraker uses number domain for fan control entities
    let modelFanEntity = findMulti(['modelfan', 'model_fan', 'part_fan', 'fan_speed', 'print_cooling_fan']);
    if (!modelFanEntity) {
      // Moonraker: hotend_fan is a sensor, output_pin_fan0 is the model/part fan
      modelFanEntity = findMulti(['hotend_fan'], 'sensor') || findMulti(['output_pin_fan0'], 'number');
    }
    
    // Case fan: Moonraker uses output_pin_fan1 (number domain)
    let caseFanEntity = findMulti(['casefan', 'case_fan', 'enclosure_fan', 'controller_fan']);
    if (!caseFanEntity) {
      caseFanEntity = findMulti(['output_pin_fan1'], 'number');
    }
    
    // Aux fan: Moonraker uses output_pin_fan2 (number domain)
    let auxFanEntity = findMulti(['auxiliaryfan', 'auxiliary_fan', 'aux_fan']);
    if (!auxFanEntity) {
      auxFanEntity = findMulti(['output_pin_fan2'], 'number');
    }
    
    
    // Light: prefer switch domain for control, then number (Moonraker), then sensor for status
    let lightSwitchEntity = findMulti(['lightsw', 'light', 'led'], 'switch');
    // Moonraker HA uses number domain for LED control (e.g., number.k1_098d_output_pin_led)
    if (!lightSwitchEntity) {
      lightSwitchEntity = findMulti(['output_pin_led', 'led'], 'number');
    }
    const lightSensorEntity = findMulti(['lightsw', 'light', 'led'], 'sensor');
    
    // Camera: must be camera domain
    const cameraEntityAuto = this.findEntityByPattern('camera', 'camera');
    const fileNameEntity = findMulti(['filename', 'print_filename', 'current_file']);
    
    // Thumbnail/Cover image: auto-detect from camera or image domain
    let thumbnailEntityAuto = null;
    // First try camera domain (Moonraker uses camera.xxx_thumbnail)
    thumbnailEntityAuto = findMulti(['thumbnail', 'cover_image', 'titelbild', 'gcode_preview'], 'camera');
    // Then try image domain
    if (!thumbnailEntityAuto) {
      thumbnailEntityAuto = findMulti(['thumbnail', 'cover_image', 'titelbild', 'gcode_preview'], 'image');
    }
    
    // Read values
    const progress = this.getEntityValueById(progressEntity);
    let stateStr = this.getEntityStateById(stateEntity) || 'Idle';
    
    // If state is purely numeric (like "0", "1"), convert to readable status
    if (/^\d+$/.test(stateStr)) {
      // Numeric states mapping (for legacy integrations): 0 = Idle, 1 = Printing, 2 = Paused, etc.
      const numericStateMap = {
        '0': 'Idle',
        '1': 'Printing',
        '2': 'Paused',
        '3': 'Finished',
        '4': 'Stopped',
        '5': 'Paused',  // Layer pause / User pause
        '6': 'Paused',  // Other pause states
        '7': 'Error'
      };
      stateStr = numericStateMap[stateStr] || 'Idle';
    }
    
    // Determine if printer is actively printing
    const statusLower = stateStr.toLowerCase();
    
    // Extended pause states - includes layer pause, user pause, waiting states
    // Extended pause states
    const pauseStates = ['paused', 'pause', 'pausiert', '2', '5', '6', 'waiting', 'user_pause', 'user pause', 
                         'layer_pause', 'layer pause', 'filament_change', 'filament change',
                         'suspended', 'on hold', 'halted'];
    const printingStates = ['printing', 'prepare', 'running', 'druckt', 'vorbereiten', 'busy', '1'];
    const idleStates = ['idle', 'standby', 'ready', 'finished', 'complete', 'stopped', 'cancelled', 
                        'error', 'offline', 'unavailable', '0', '3', '4'];
    
    let isPrinting = printingStates.includes(statusLower);
    let isPaused = pauseStates.includes(statusLower);
    
    // Smart detection: If progress is between 0-100 and status is unknown, assume paused
    if (!isPrinting && !isPaused && progress > 0 && progress < 100) {
      if (!idleStates.includes(statusLower)) {
        isPaused = true;
      }
    }
    
    const isIdle = !isPrinting && !isPaused;
    
    // Get remaining time - format it nicely
    let printTimeLeft = '--';
    let printEndTime = '--:--';
    if (timeLeftEntity && (isPrinting || isPaused)) {
      const state = this._hass.states[timeLeftEntity];
      if (state) {
        const timeValue = state.state;
        
        // Skip unavailable/unknown states
        if (timeValue && timeValue !== 'Unknown' && timeValue !== 'unknown' && 
            timeValue !== 'unavailable' && timeValue !== 'none') {
          
          if (typeof timeValue === 'string' && timeValue.includes(':')) {
            // Already formatted as HH:MM:SS or H:MM:SS
            const parts = timeValue.split(':');
            if (parts.length >= 2) {
              const hours = parseInt(parts[0]) || 0;
              const mins = parseInt(parts[1]) || 0;
              if (hours > 0) {
                printTimeLeft = `${hours}h ${mins}m`;
              } else {
                printTimeLeft = `${mins}m`;
              }
              const totalMinutes = hours * 60 + mins;
              const endTime = new Date(Date.now() + totalMinutes * 60 * 1000);
              printEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          } else {
            // Numeric value - Moonraker HA returns HOURS (e.g., 2.68 = 2h 41m)
            const numValue = parseFloat(timeValue) || 0;
            if (numValue > 0) {
              // Convert hours to minutes
              const totalMinutes = numValue * 60;
              const hours = Math.floor(totalMinutes / 60);
              const mins = Math.round(totalMinutes % 60);
              if (hours > 0) {
                printTimeLeft = `${hours}h ${mins}m`;
              } else if (mins > 0) {
                printTimeLeft = `${mins}m`;
              } else {
                printTimeLeft = `<1m`;
              }
              const endTime = new Date(Date.now() + totalMinutes * 60 * 1000);
              printEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
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
    
    // Fans - need special handling for number entities which may have 0-1 or 0-255 range
    const getFanSpeedPercent = (entityId) => {
      if (!entityId) return 0;
      const state = this._hass.states[entityId];
      if (!state) return 0;
      
      const value = parseFloat(state.state) || 0;
      const domain = entityId.split('.')[0];
      
      // For number entities, normalize to percentage based on max value
      if (domain === 'number') {
        const max = parseFloat(state.attributes?.max) || 1;
        // If max is 1, value is already a fraction (0-1), multiply by 100
        // If max is 255, normalize to 0-100
        // If max is 100, use as-is
        if (max <= 1) {
          return value * 100;
        } else if (max > 100) {
          return (value / max) * 100;
        }
        return value;
      }
      
      // For sensor entities, assume value is already in percentage or needs no conversion
      return value;
    };
    
    const modelFanSpeed = getFanSpeedPercent(modelFanEntity);
    const auxFanSpeed = getFanSpeedPercent(auxFanEntity);
    const caseFanSpeed = getFanSpeedPercent(caseFanEntity);
    
    // Layer info
    let currentLayer = 0;
    let totalLayers = 0;
    if (isPrinting || isPaused) {
      currentLayer = parseInt(this.getEntityStateById(layerEntity)) || 0;
      totalLayers = parseInt(this.getEntityStateById(totalLayerEntity)) || 0;
    }
    
    // Light: Use configured light_switch, or auto-detected switch/number, or sensor for status
    let lightEntityId = this.config.light_switch || lightSwitchEntity;
    let lightState = null;
    let isLightOn = false;
    
    if (lightEntityId) {
      const lightDomain = lightEntityId.split('.')[0];
      if (lightDomain === 'number') {
        // Number entities: on if value > 0
        const numValue = parseFloat(this._hass.states[lightEntityId]?.state) || 0;
        isLightOn = numValue > 0;
        lightState = isLightOn ? 'on' : 'off';
      } else {
        // Switch/Light entities: use state directly
        lightState = this._hass.states[lightEntityId]?.state;
        isLightOn = lightState === 'on';
      }
    } else if (lightSensorEntity) {
      // Fall back to sensor for status display (but won't be controllable)
      lightState = this._hass.states[lightSensorEntity]?.state;
      // Sensor uses "1" for on, "0" for off
      lightState = lightState === '1' ? 'on' : lightState === '0' ? 'off' : lightState;
      isLightOn = lightState === 'on' || lightState === '1';
    }
    
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
    
    // Get printer name from device
    const deviceId = this.config.printer;
    const device = this._hass.devices?.[deviceId];
    const name = this.config.name || device?.name || '3D Printer';
    
    // Camera: Use configured camera_entity or auto-detected from camera domain
    let resolvedCameraEntity = this.config.camera_entity || cameraEntityAuto;
    if (resolvedCameraEntity && !resolvedCameraEntity.startsWith('camera.')) {
      console.warn('Prism 3DPrinter: Camera entity is not from camera domain:', resolvedCameraEntity);
      resolvedCameraEntity = null;
    }
    const cameraState = resolvedCameraEntity ? this._hass.states[resolvedCameraEntity] : null;
    const cameraImage = cameraState?.attributes?.entity_picture || null;
    
    // Image path
    const printerImg = this.config.image || '/local/community/Prism-Dashboard/images/printer-blank.jpg';
    
    // Get print filename
    const fileName = this.getEntityStateById(fileNameEntity) || '';
    
    // Cover image / Thumbnail - use configured or auto-detected
    let coverImageEntity = this.config.cover_image_entity || thumbnailEntityAuto;
    let coverImageUrl = null;
    
    if (coverImageEntity && this.config.show_cover_image !== false) {
      const coverState = this._hass.states[coverImageEntity];
      if (coverState) {
        // Try entity_picture first (works for image entities)
        coverImageUrl = coverState.attributes?.entity_picture || null;
        
        // For camera entities, use camera proxy URL if no entity_picture
        if (!coverImageUrl && coverImageEntity.startsWith('camera.')) {
          // Use the access_token from the entity state for authenticated access
          const accessToken = coverState.attributes?.access_token;
          if (accessToken) {
            coverImageUrl = `/api/camera_proxy/${coverImageEntity}?token=${accessToken}`;
          } else {
            // Fallback without token (may work for some setups)
            coverImageUrl = `/api/camera_proxy/${coverImageEntity}`;
          }
        }
        
        // Prepend / if needed for relative URLs
        if (coverImageUrl && !coverImageUrl.startsWith('http') && !coverImageUrl.startsWith('/')) {
          coverImageUrl = '/' + coverImageUrl;
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
      // Cover image / Thumbnail - only show when printing or paused (not idle)
      coverImageEntity,
      coverImageUrl,
      showCoverImage: this.config.show_cover_image !== false && !!coverImageUrl && !isIdle,
      // Custom sensors
      humidity,
      customTemp,
      powerSwitch,
      isPowerOn,
      powerSwitchIcon,
      // Spoolman data
      spoolmanEnabled: this.config.enable_spoolman === true,
      spoolmanData: this.config.enable_spoolman === true ? this._getSelectedSpoolData() : null,
      showSpoolman: this.config.enable_spoolman === true,
      // Spool view mode: 'side' (circular, default) or 'front' (AMS-style vertical)
      spoolView: this.config.spool_view || 'side'
    };
    
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
      name: this.config?.name || '3D Printer',
      cameraEntity: null,
      cameraImage: null,
      printerImg: this.config?.image || '/local/community/Prism-Dashboard/images/printer-blank.jpg',
      fileName: 'benchy.gcode',
      isPrinting: true,
      isPaused: false,
      isIdle: false,
      isLightOn: true,
      lightEntity: null,
      coverImageEntity: null,
      coverImageUrl: null,
      showCoverImage: false,
      humidity: null,
      customTemp: null,
      powerSwitch: null,
      isPowerOn: true,
      powerSwitchIcon: 'mdi:power',
      // Spoolman preview data
      spoolmanEnabled: false,
      spoolmanData: null,
      showSpoolman: false,
      spoolView: 'side'
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
            color: #8B5CF6;
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
            filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.5));
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
        /* Printing - Blue with glow, slightly pressed */
        .printer-icon.printing {
            background: linear-gradient(145deg, #1c1e24, #25282e);
            box-shadow: 
                inset 2px 2px 4px rgba(0, 0, 0, 0.4),
                inset -1px -1px 3px rgba(255, 255, 255, 0.03);
            animation: printerIconGlow 2s ease-in-out infinite;
        }
        .printer-icon.printing ha-icon {
            filter: drop-shadow(0 0 6px rgba(0, 150, 255, 0.7));
        }
        @keyframes printerIconGlow {
            0%, 100% { 
                color: #8B5CF6;
            }
            50% { 
                color: #4db8ff;
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
        
        /* Cover Image (3D Model Preview / Thumbnail) - positioned on print bed */
        .cover-image-container {
            position: absolute;
            /* Position on the print bed area - matching prism-bambu style */
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
            /* Transparent "ghost" image as background - matching prism-bambu */
            opacity: 0.45;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) 
                    grayscale(0.3) brightness(0.75);
            transition: filter 0.3s ease, opacity 0.3s ease;
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
        /* Progress overlay - actual IMG element so drop-shadow follows the model shape! */
        .cover-image-progress {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            /* Clip from bottom to top based on progress
               Added 12% base offset so model starts showing earlier
               (accounts for empty space at bottom of preview images) */
            clip-path: inset(calc(88% - var(--progress-height, 0%)) 0 0 0);
            /* drop-shadow on <img> follows the actual alpha shape of the image! */
            filter: drop-shadow(0 0 8px rgba(74, 222, 128, 0.6))
                    drop-shadow(0 0 4px rgba(74, 222, 128, 0.8))
                    brightness(1.1) contrast(1.15);
            pointer-events: none;
        }
        /* Glow effect when printing - follows the actual model shape! */
        .cover-image-wrapper.printing .cover-image-progress {
            filter: drop-shadow(0 0 12px rgba(74, 222, 128, 0.7))
                    drop-shadow(0 0 6px rgba(74, 222, 128, 0.9))
                    drop-shadow(0 0 3px rgba(255, 255, 255, 0.5))
                    brightness(1.15) contrast(1.2);
            animation: modelBuildGlow 2s ease-in-out infinite;
        }
        @keyframes modelBuildGlow {
            0%, 100% { 
                filter: drop-shadow(0 0 10px rgba(74, 222, 128, 0.6))
                        drop-shadow(0 0 5px rgba(74, 222, 128, 0.8))
                        drop-shadow(0 0 2px rgba(255, 255, 255, 0.4))
                        brightness(1.1) contrast(1.15);
            }
            50% { 
                filter: drop-shadow(0 0 20px rgba(74, 222, 128, 0.8))
                        drop-shadow(0 0 10px rgba(74, 222, 128, 1))
                        drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))
                        brightness(1.2) contrast(1.2);
            }
        }
        /* Idle state - dimmer ghost image, no progress visible */
        .cover-image-wrapper.idle .cover-image {
            opacity: 0.3;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) 
                    grayscale(0.3) brightness(0.5);
            /* contrast at 1.0 (default) and grayscale 0.3 so black models remain visible */
        }
        .cover-image-wrapper.idle .cover-image-progress {
            opacity: 0;
        }
        .cover-image-wrapper.idle::after {
            opacity: 0.2;
        }
        /* Paused state - yellow glow following model shape */
        .cover-image-wrapper.paused .cover-image-progress {
            filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.7))
                    drop-shadow(0 0 6px rgba(251, 191, 36, 0.9))
                    drop-shadow(0 0 3px rgba(255, 255, 255, 0.4))
                    brightness(1.1) contrast(1.15);
            animation: none;
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
            background: linear-gradient(to right, #8B5CF6, #00C8FF);
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
        /* Home button - blue on hover */
        .btn-home:hover:not(:disabled) {
            color: #8B5CF6;
        }
        .btn-home:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.5));
        }
        /* Primary button (Pause/Resume) - Default: raised (for Resume) */
        .btn-primary {
            grid-column: span 2;
            background: linear-gradient(145deg, #2d3038, #22252b);
            color: #8B5CF6;
            gap: 8px;
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03),
                inset 1px 1px 2px rgba(255, 255, 255, 0.05);
        }
        .btn-primary ha-icon {
            filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.5));
        }
        .btn-primary:hover:not(:disabled) {
            color: #4db8ff;
        }
        .btn-primary:hover:not(:disabled) ha-icon {
            filter: drop-shadow(0 0 6px rgba(0, 150, 255, 0.7));
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
            filter: drop-shadow(0 0 6px rgba(0, 150, 255, 0.7));
        }
        .btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        /* ==================== SPOOLMAN STYLES ==================== */
        
        /* Spoolman Slot - Uses CSS Grid with single column matching CFS slot width */
        /* CFS uses: grid-template-columns: repeat(4, 1fr) with gap: 12px */
        /* Single column width = (100% - 3*12px) / 4 = (100% - 36px) / 4 */
        .spoolman-grid-centered {
            display: grid;
            grid-template-columns: calc((100% - 36px) / 4);
            justify-content: center; /* Centers the single column in the container */
            margin-bottom: 24px;
            z-index: 20;
        }
        /* Base Spoolman Slot - identical to CFS-slot from prism-creality */
        .spoolman-slot {
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
            cursor: pointer;
        }
        .spoolman-slot.active {
            background-color: #1A1A1A;
            border-bottom: 2px solid #0096FF;
            border-top: none;
            opacity: 1;
            filter: none;
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05), 0 0 15px rgba(0, 150, 255, 0.15);
        }
        .spoolman-slot.empty {
            opacity: 0.5;
        }
        
        /* Spoolman Slot Side View (circular spool) - identical to CFS-slot from prism-creality */
        .spool-visual {
            position: relative;
            width: 100%;
            height: 0;
            padding-bottom: 100%; /* Forces square aspect ratio */
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.4);
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }
        .filament {
            position: absolute;
            top: 15%;
            left: 15%;
            width: 70%;
            height: 70%;
            border-radius: 50%;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }
        .spool-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
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
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.8);
            font-size: 9px;
            font-family: monospace;
            color: white;
            padding: 2px 6px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 10;
        }
        .spoolman-info {
            text-align: center;
            width: 100%;
        }
        .spoolman-type {
            font-size: 10px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.9);
        }
        
        /* ========== FRONT VIEW (AMS-Style) Styles ========== */
        .spoolman-grid-centered.front-view {
            gap: 12px;
        }
        .spoolman-slot.front-view {
            /* Same aspect-ratio as side view (3/4) for consistent sizing */
            aspect-ratio: 3/4;
            padding: 12px;
            background: linear-gradient(180deg, rgba(30, 32, 38, 0.95), rgba(20, 22, 26, 0.98));
            border-radius: 16px;
            overflow: hidden;
            position: relative;
        }
        .spoolman-slot.front-view.active {
            border-bottom: 2px solid #0096FF;
        }
        
        /* Hide the external spoolman-info for front view - we show it inside the filament */
        .spoolman-slot.front-view > .spoolman-info {
            display: none;
        }
        
        /* Front view spool container - vertically centered */
        .spool-front-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        /* The main filament column wrapper with flanges */
        .spool-front-wrapper {
            position: relative;
            width: 45%;
            height: 75%;
        }
        
        /* Side flanges (left/right edges of spool) - same height top and bottom */
        .spool-front-flange {
            position: absolute;
            top: -4px;
            bottom: -4px;
            width: 4px;
            border-radius: 3px;
            background: linear-gradient(180deg, rgba(70,75,85,0.95), rgba(50,55,65,0.98) 50%, rgba(35,40,50,0.95));
            box-shadow: inset 1px 0 0 rgba(255,255,255,0.1), inset -1px 0 0 rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.4);
            z-index: 15;
        }
        .spool-front-flange.left {
            left: -3px;
        }
        .spool-front-flange.right {
            right: -3px;
        }
        
        /* Bottom flare extension of flanges - HIDDEN, not needed */
        .spool-front-flange-bottom {
            display: none;
        }
        
        /* Inner core shadow (cardboard core hint) - very subtle, not visible */
        .spool-front-core {
            display: none;
        }
        
        /* The filament column */
        .spool-front-filament {
            position: relative;
            width: 100%;
            height: 100%;
            border-radius: 4px 4px 0 0;
            box-shadow: inset 0 12px 12px rgba(255,255,255,0.12), inset 0 -16px 18px rgba(0,0,0,0.65), 0 12px 18px rgba(0,0,0,0.4);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        /* Filament ridges (winding pattern) - vertical lines */
        .spool-front-ridges {
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(90deg, rgba(0,0,0,0.20) 0px, rgba(0,0,0,0) 1px, rgba(255,255,255,0.16) 2px, rgba(255,255,255,0) 3px, rgba(0,0,0,0.20) 4px);
            opacity: 0.70;
            mix-blend-mode: overlay;
            pointer-events: none;
        }
        
        /* Filament helix pattern (diagonal lines) */
        .spool-front-helix {
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(168deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0) 2px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0) 6px);
            opacity: 0.32;
            mix-blend-mode: overlay;
            pointer-events: none;
        }
        
        /* Filament sheen (glossy vertical highlight) */
        .spool-front-sheen {
            position: absolute;
            top: 0;
            left: 28%;
            width: 44%;
            height: 100%;
            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 40%, rgba(255,255,255,0.22) 60%, rgba(255,255,255,0) 100%);
            opacity: 0.62;
            mix-blend-mode: overlay;
            pointer-events: none;
        }
        
        /* Volume (inner glow for depth) */
        .spool-front-volume {
            position: absolute;
            inset: 0;
            background: radial-gradient(55% 80% at 50% 50%, rgba(255,255,255,0.10), transparent 70%);
            mix-blend-mode: overlay;
            pointer-events: none;
        }
        
        /* Volume shadow (soft inner shadows on left/right) */
        .spool-front-volume-shadow {
            position: absolute;
            inset: 0;
            box-shadow: inset 6px 0 16px rgba(0,0,0,0.35), inset -6px 0 16px rgba(0,0,0,0.35);
            pointer-events: none;
        }
        
        /* Specular highlight (bright spot at top) */
        .spool-front-specular {
            position: absolute;
            top: 0;
            left: 18%;
            width: 64%;
            height: 22%;
            background: linear-gradient(180deg, rgba(255,255,255,0.26), transparent 60%);
            border-radius: 0 0 50% 50%;
            opacity: 0.72;
            mix-blend-mode: overlay;
            pointer-events: none;
        }
        
        /* Ambient occlusion top (darkening at top edge) */
        .spool-front-ao-top {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 18px;
            background: linear-gradient(180deg, rgba(0,0,0,0.38), transparent);
            border-radius: 4px 4px 0 0;
            pointer-events: none;
        }
        /* Ambient occlusion bottom */
        .spool-front-ao-bottom {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 22px;
            background: linear-gradient(0deg, rgba(0,0,0,0.52), transparent);
            border-radius: 0 0 4px 4px;
            pointer-events: none;
        }
        /* Ambient occlusion corners (bottom left/right darkening) */
        .spool-front-ao-corners {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 32px;
            border-radius: 0 0 4px 4px;
            background: radial-gradient(32px 18px at 8% 100%, rgba(0,0,0,0.55), transparent 70%), radial-gradient(32px 18px at 92% 100%, rgba(0,0,0,0.55), transparent 70%);
            pointer-events: none;
        }
        
        /* Front view does not use remaining-badge (shown inside filament) */
        .spoolman-slot.front-view .remaining-badge {
            display: none;
        }
        /* ========== END FRONT VIEW Styles ========== */
        
        /* Labels inside filament */
        .spool-front-label {
            position: relative;
            z-index: 10;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            text-align: center;
            pointer-events: none;
        }
        .spool-front-label-type {
            font-size: 10px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.95);
            text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7);
            letter-spacing: 0.5px;
            letter-spacing: 0.5px;
        }
        .spool-front-label-weight {
            font-size: 9px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.8);
            text-shadow: 0 1px 3px rgba(0,0,0,0.9);
            line-height: 1;
        }
        /* Dark filament needs inverted text color for visibility */
        .spool-front-filament.dark-filament .spool-front-label-type,
        .spool-front-filament.dark-filament .spool-front-label-weight {
            color: rgba(255, 255, 255, 0.9);
            text-shadow: 0 0 6px rgba(255,255,255,0.4), 0 1px 4px rgba(255,255,255,0.3);
        }
        
        /* Filament lead (active strand) */
        .filament-lead {
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            width: 4px;
            height: 25px;
            border-radius: 0 0 2px 2px;
            z-index: 5;
        }
        
        /* Spoolman Select Popup */
        .spoolman-select-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        }
        .spoolman-select-popup {
            background: linear-gradient(145deg, #2d3038, #22252b);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            width: 90%;
            max-width: 380px;
            max-height: 70vh;
            overflow: hidden;
            animation: slideUp 0.3s ease;
        }
        .spoolman-select-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: rgba(0, 0, 0, 0.3);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .spoolman-select-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
            font-size: 16px;
            color: rgba(255, 255, 255, 0.9);
        }
        .spoolman-select-title ha-icon {
            color: #0096FF;
        }
        .spoolman-select-close {
            background: linear-gradient(145deg, #2d3038, #22252b);
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.6);
            box-shadow: 
                3px 3px 6px rgba(0, 0, 0, 0.4),
                -2px -2px 4px rgba(255, 255, 255, 0.03);
            transition: all 0.2s;
        }
        .spoolman-select-close:hover {
            color: #f87171;
        }
        .spoolman-select-list {
            max-height: calc(70vh - 70px);
            overflow-y: auto;
            padding: 12px;
        }
        .spoolman-select-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            margin-bottom: 8px;
            background: linear-gradient(145deg, rgba(45, 48, 56, 0.5), rgba(34, 37, 43, 0.5));
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
        }
        .spoolman-select-item:hover {
            background: linear-gradient(145deg, rgba(55, 58, 66, 0.6), rgba(44, 47, 53, 0.6));
            border-color: rgba(255, 255, 255, 0.1);
        }
        .spoolman-select-item.selected {
            border-color: #0096FF;
            background: linear-gradient(145deg, rgba(0, 150, 255, 0.1), rgba(0, 100, 200, 0.05));
        }
        .spoolman-spool-color {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.3);
            flex-shrink: 0;
        }
        .spoolman-spool-details {
            flex: 1;
            min-width: 0;
        }
        .spoolman-spool-name {
            font-weight: 600;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .spoolman-spool-meta {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
        }
        .spoolman-selected-icon {
            color: #0096FF;
            flex-shrink: 0;
        }
        .spoolman-no-spools {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 24px;
            color: rgba(255, 255, 255, 0.5);
            text-align: center;
        }
        .spoolman-no-spools ha-icon {
            --mdc-icon-size: 32px;
            opacity: 0.5;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        /* ==================== END SPOOLMAN STYLES ==================== */
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

        ${data.showSpoolman ? `
        <!-- Spoolman Spool Slot -->
        <div class="spoolman-grid-centered ${data.spoolView === 'front' ? 'front-view' : ''}">
            <div class="spoolman-slot clickable ${data.spoolmanData ? 'active' : 'empty'} ${data.spoolView === 'front' ? 'front-view' : ''}"
                 data-action="spoolman-select">
                ${data.spoolView === 'front' ? `
                <!-- Front View (AMS-Style vertical spools) -->
                <div class="spool-front-container">
                    <div class="spool-front-wrapper">
                        <div class="spool-front-flange left"></div>
                        <div class="spool-front-flange right"></div>
                        <div class="spool-front-flange-bottom left"></div>
                        <div class="spool-front-flange-bottom right"></div>
                        <div class="spool-front-core"></div>
                        <div class="spool-front-filament ${(data.spoolmanData?.color || '#666666') === '#000000' ? 'dark-filament' : ''}" style="background-color: ${data.spoolmanData?.color || '#666666'};">
                            <div class="spool-front-ridges"></div>
                            <div class="spool-front-helix"></div>
                            <div class="spool-front-sheen"></div>
                            <div class="spool-front-volume"></div>
                            <div class="spool-front-volume-shadow"></div>
                            <div class="spool-front-specular"></div>
                            <div class="spool-front-ao-top"></div>
                            <div class="spool-front-ao-bottom"></div>
                            <div class="spool-front-ao-corners"></div>
                            <!-- Labels inside filament -->
                            <div class="spool-front-label">
                                <span class="spool-front-label-type">${data.spoolmanData?.type || 'Select'}</span>
                                ${data.spoolmanData ? `<span class="spool-front-label-weight">${Math.round(data.spoolmanData.remaining)}g</span>` : ''}
                            </div>
                        </div>
                        ${data.spoolmanData ? `<div class="filament-lead" style="background: linear-gradient(180deg, ${data.spoolmanData.color}, rgba(0,0,0,0.45));"></div>` : ''}
                    </div>
                </div>
                <div class="spoolman-info">
                    <div class="spoolman-type">${data.spoolmanData?.type || 'Select'}</div>
                </div>
                ` : `
                <!-- Side View (circular spool - default) -->
                <div class="spool-visual">
                    <div class="filament" style="background-color: ${data.spoolmanData?.color || '#666666'};"></div>
                    <div class="spool-center"></div>
                    ${data.spoolmanData ? `<div class="remaining-badge">${Math.round(data.spoolmanData.remaining)}g</div>` : ''}
                </div>
                <div class="spoolman-info">
                    <div class="spoolman-type">${data.spoolmanData?.type || 'Select'}</div>
                </div>
                `}
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
                <img src="${data.printerImg}" class="printer-img ${!data.isLightOn ? 'dimmed' : ''}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="printer-fallback-icon" style="display: none;">
                  <ha-icon icon="mdi:printer-3d"></ha-icon>
                </div>
                
                ${data.showCoverImage ? `
                <div class="cover-image-container">
                    <div class="cover-image-wrapper ${data.isPrinting ? 'printing' : ''} ${data.isPaused ? 'paused' : ''} ${data.isIdle ? 'idle' : ''}">
                        <img src="${data.coverImageUrl}" class="cover-image" alt="3D Model Ghost" />
                        <img src="${data.coverImageUrl}" class="cover-image-progress" style="--progress-height: ${data.progress}%;" alt="3D Model" />
                        <div class="cover-progress-badge">${Math.round(data.progress)}%</div>
                    </div>
                </div>
                ` : ''}
                
                <div class="overlay-left">
                    ${this.config.show_model_fan !== false ? `
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value" data-field="model-fan">${Math.round(data.modelFanSpeed)}%</span>
                            <span class="pill-label">Model</span>
                        </div>
                    </div>
                    ` : ''}
                    ${this.config.show_aux_fan !== false ? `
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:weather-windy"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value" data-field="aux-fan">${Math.round(data.auxFanSpeed)}%</span>
                            <span class="pill-label">Aux</span>
                        </div>
                    </div>
                    ` : ''}
                    ${this.config.show_case_fan !== false ? `
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan-alert"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value" data-field="case-fan">${Math.round(data.caseFanSpeed)}%</span>
                            <span class="pill-label">Case</span>
                        </div>
                    </div>
                    ` : ''}
                    ${this.config.show_humidity !== false && data.humidity !== null ? `
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:water-percent" style="color: #60a5fa;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value" data-field="humidity">${Math.round(data.humidity)}%</span>
                            <span class="pill-label">Humid</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="overlay-right">
                    ${this.config.show_nozzle_temp !== false ? `
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer" style="color: #F87171;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value" data-field="nozzle-temp">${Math.round(data.nozzleTemp)}°</span>
                            <span class="pill-label" data-field="nozzle-target">/${Math.round(data.targetNozzleTemp)}°</span>
                        </div>
                    </div>
                    ` : ''}
                    ${this.config.show_bed_temp !== false ? `
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:radiator" style="color: #FB923C;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value" data-field="bed-temp">${Math.round(data.bedTemp)}°</span>
                            <span class="pill-label" data-field="bed-target">/${Math.round(data.targetBedTemp)}°</span>
                        </div>
                    </div>
                    ` : ''}
                    ${this.config.show_chamber_temp !== false ? `
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer" style="color: #4ade80;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value" data-field="chamber-temp">${Math.round(data.chamberTemp)}°</span>
                            <span class="pill-label">Box</span>
                        </div>
                    </div>
                    ` : ''}
                    ${this.config.show_custom_temp !== false && data.customTemp !== null ? `
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer-lines" style="color: #a78bfa;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value" data-field="custom-temp">${Math.round(data.customTemp)}°</span>
                            <span class="pill-label">Custom</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `}
            </div>
        </div>

        <div class="stats-row">
            ${this.config.show_time_info !== false ? `
            <div class="stat-group">
                <span class="stat-label">Time Left</span>
                <span class="stat-val">${data.printTimeLeft}</span>
            </div>
            ` : '<div class="stat-group"></div>'}
            ${this.config.show_layer_info !== false ? `
            <div class="stat-group" style="align-items: flex-end;">
                <span class="stat-label">Layer</span>
                <span class="stat-val">${data.isIdle ? '--' : data.currentLayer} <span style="font-size: 0.875rem; opacity: 0.4;">/ ${data.isIdle ? '--' : data.totalLayers}</span></span>
            </div>
            ` : '<div class="stat-group"></div>'}
        </div>

        <div class="progress-bar-container">
            <div class="progress-bar-fill"></div>
            <div class="progress-text">${Math.round(data.progress)}%</div>
        </div>

        <div class="controls">
            <button class="btn btn-secondary btn-home" ${data.isIdle ? '' : 'disabled'} title="Home All Axes">
                <ha-icon icon="mdi:home"></ha-icon>
            </button>
            <button class="btn btn-secondary btn-stop" ${data.isIdle ? 'disabled' : ''} title="Stop Print">
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
    return 7;
  }
}

customElements.define('prism-3dprinter', Prism3DPrinterCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'prism-3dprinter',
  name: 'Prism 3D Printer',
  preview: true,
  description: '3D Printer card for Moonraker/Klipper printers (Voron, Prusa, RatRig, etc.)'
});

