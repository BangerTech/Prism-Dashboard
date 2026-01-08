
class PrismRoomCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._popupElement = null;
    this._cardRendered = false;
  }

  static getStubConfig() {
    return {
      name: "Wohnzimmer",
      icon: "mdi:sofa",
      show_icon: true,
      icon_size: 42,
      name_size: 1.125,
      hide_card_background: false,
      temperature_entity: "",
      humidity_entity: "",
      show_climate_placeholder: false,
      show_status_placeholder: false,
      light_entities: [],
      climate_entities: [],
      motion_entities: [],
      media_entities: [],
      cover_entities: [],
      switch_entities: [],
      fan_entities: [],
      other_entities: []
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "name",
          required: true,
          selector: { text: {} }
        },
        {
          name: "icon",
          selector: { icon: {} }
        },
        {
          name: "show_icon",
          selector: { boolean: {} }
        },
        {
          name: "icon_size",
          selector: { number: { min: 24, max: 80, step: 2 } }
        },
        {
          name: "name_size",
          selector: { number: { min: 0.75, max: 2, step: 0.125 } }
        },
        {
          name: "hide_card_background",
          label: "Hide card background (show only icons and text)",
          selector: { boolean: {} }
        },
        {
          name: "temperature_entity",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "humidity_entity",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "show_climate_placeholder",
          label: "Show placeholder for temperature/humidity (consistent card height)",
          selector: { boolean: {} }
        },
        {
          name: "show_status_placeholder",
          label: "Show placeholder for status icons (consistent card height)",
          selector: { boolean: {} }
        },
        {
          name: "active_color",
          selector: { color_rgb: {} }
        },
        // Grouped entities section
        {
          type: 'expandable',
          name: '',
          title: 'Lights',
          schema: [
            {
              name: "light_entities",
              label: "Light entities (all lights in this group will show as 1 icon)",
              selector: { entity: { multiple: true, domain: "light" } }
            }
          ]
        },
        {
          type: 'expandable',
          name: '',
          title: 'Climate/Heating',
          schema: [
            {
              name: "climate_entities",
              label: "Climate entities",
              selector: { entity: { multiple: true, domain: "climate" } }
            }
          ]
        },
        {
          type: 'expandable',
          name: '',
          title: 'Motion Sensors',
          schema: [
            {
              name: "motion_entities",
              label: "Motion sensor entities",
              selector: { entity: { multiple: true, domain: "binary_sensor" } }
            }
          ]
        },
        {
          type: 'expandable',
          name: '',
          title: 'Media Players',
          schema: [
            {
              name: "media_entities",
              label: "Media player entities",
              selector: { entity: { multiple: true, domain: "media_player" } }
            }
          ]
        },
        {
          type: 'expandable',
          name: '',
          title: 'Covers/Blinds',
          schema: [
            {
              name: "cover_entities",
              label: "Cover entities",
              selector: { entity: { multiple: true, domain: "cover" } }
            }
          ]
        },
        {
          type: 'expandable',
          name: '',
          title: 'Switches',
          schema: [
            {
              name: "switch_entities",
              label: "Switch entities",
              selector: { entity: { multiple: true, domain: "switch" } }
            }
          ]
        },
        {
          type: 'expandable',
          name: '',
          title: 'Fans',
          schema: [
            {
              name: "fan_entities",
              label: "Fan entities",
              selector: { entity: { multiple: true, domain: "fan" } }
            }
          ]
        },
        {
          type: 'expandable',
          name: '',
          title: 'Other Entities',
          schema: [
            {
              name: "other_entities",
              label: "Other entities (scenes, scripts, etc.)",
              selector: { entity: { multiple: true } }
            },
            {
              name: "other_entities_icon",
              label: "Icon for Other entities (shown in status bar)",
              selector: { icon: {} }
            }
          ]
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.name) {
      throw new Error('Please define a name');
    }
    this._config = { 
      ...config,
      icon: config.icon || 'mdi:home',
      show_icon: config.show_icon !== false,
      icon_size: config.icon_size || 42,
      name_size: config.name_size || 1.125,
      hide_card_background: config.hide_card_background || false,
      show_climate_placeholder: config.show_climate_placeholder || false,
      show_status_placeholder: config.show_status_placeholder || false,
      light_entities: config.light_entities || [],
      climate_entities: config.climate_entities || [],
      motion_entities: config.motion_entities || [],
      media_entities: config.media_entities || [],
      cover_entities: config.cover_entities || [],
      switch_entities: config.switch_entities || [],
      fan_entities: config.fan_entities || [],
      other_entities: config.other_entities || [],
      other_entities_icon: config.other_entities_icon || 'mdi:apps'
    };
    
    if (this._config.active_color) {
      this._config.active_color = this._normalizeColor(this._config.active_color);
    }
    
    this._cardRendered = false;
    this._renderCard();
  }

  _normalizeColor(color) {
    if (Array.isArray(color) && color.length >= 3) {
      const r = color[0].toString(16).padStart(2, '0');
      const g = color[1].toString(16).padStart(2, '0');
      const b = color[2].toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return color;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config) {
      this._updateCardContent();
      // Update popup if it's open
      if (this._popupElement) {
        this._updatePopupContent();
      }
    }
  }

  getCardSize() {
    return 2;
  }

  connectedCallback() {
    if (this._config && !this._cardRendered) {
      this._renderCard();
    }
  }

  // Get temperature value
  _getTemperature() {
    if (!this._hass || !this._config.temperature_entity) return null;
    const entity = this._hass.states[this._config.temperature_entity];
    if (!entity || isNaN(parseFloat(entity.state))) return null;
    return parseFloat(entity.state);
  }

  // Get humidity value
  _getHumidity() {
    if (!this._hass || !this._config.humidity_entity) return null;
    const entity = this._hass.states[this._config.humidity_entity];
    if (!entity || isNaN(parseFloat(entity.state))) return null;
    return parseFloat(entity.state);
  }

  // Get all entities from all groups
  _getAllEntities() {
    const allEntities = [
      ...(this._config.light_entities || []),
      ...(this._config.climate_entities || []),
      ...(this._config.motion_entities || []),
      ...(this._config.media_entities || []),
      ...(this._config.cover_entities || []),
      ...(this._config.switch_entities || []),
      ...(this._config.fan_entities || []),
      ...(this._config.other_entities || [])
    ];
    return allEntities;
  }

  // Get light status from light_entities group
  _getLightStatus() {
    if (!this._hass || !this._config.light_entities || this._config.light_entities.length === 0) {
      return { active: false, count: 0, total: 0 };
    }
    const lights = this._config.light_entities;
    const activeLights = lights.filter(entityId => {
      const entity = this._hass.states[entityId];
      return entity && entity.state === 'on';
    });
    return { 
      active: activeLights.length > 0, 
      count: activeLights.length, 
      total: lights.length 
    };
  }

  // Get climate/heating status from climate_entities group
  _getClimateStatus() {
    if (!this._hass || !this._config.climate_entities || this._config.climate_entities.length === 0) {
      return { active: false, count: 0, total: 0 };
    }
    const climates = this._config.climate_entities;
    const activeClimateCount = climates.filter(entityId => {
      const entity = this._hass.states[entityId];
      if (!entity) return false;
      const state = entity.state;
      return state === 'heat' || state === 'auto' || state === 'heating' || state === 'cool' || state === 'cooling';
    }).length;
    return { 
      active: activeClimateCount > 0, 
      count: activeClimateCount, 
      total: climates.length 
    };
  }

  // Get motion sensor status from motion_entities group
  _getMotionStatus() {
    if (!this._hass || !this._config.motion_entities || this._config.motion_entities.length === 0) {
      return { active: false, count: 0, total: 0 };
    }
    const motions = this._config.motion_entities;
    const activeMotionCount = motions.filter(entityId => {
      const entity = this._hass.states[entityId];
      return entity && entity.state === 'on';
    }).length;
    return { 
      active: activeMotionCount > 0, 
      count: activeMotionCount, 
      total: motions.length 
    };
  }

  // Get media player status from media_entities group
  _getMediaStatus() {
    if (!this._hass || !this._config.media_entities || this._config.media_entities.length === 0) {
      return { active: false, count: 0, total: 0 };
    }
    const medias = this._config.media_entities;
    const activeMediaCount = medias.filter(entityId => {
      const entity = this._hass.states[entityId];
      if (!entity) return false;
      return entity.state === 'playing' || entity.state === 'paused';
    }).length;
    return { 
      active: activeMediaCount > 0, 
      count: activeMediaCount, 
      total: medias.length 
    };
  }

  // Get cover status from cover_entities group
  _getCoverStatus() {
    if (!this._hass || !this._config.cover_entities || this._config.cover_entities.length === 0) {
      return { active: false, count: 0, total: 0 };
    }
    const covers = this._config.cover_entities;
    const activeCoverCount = covers.filter(entityId => {
      const entity = this._hass.states[entityId];
      if (!entity) return false;
      return entity.state === 'open' || entity.state === 'opening';
    }).length;
    return { 
      active: activeCoverCount > 0, 
      count: activeCoverCount, 
      total: covers.length 
    };
  }

  // Get switch status from switch_entities group
  _getSwitchStatus() {
    if (!this._hass || !this._config.switch_entities || this._config.switch_entities.length === 0) {
      return { active: false, count: 0, total: 0 };
    }
    const switches = this._config.switch_entities;
    const activeSwitchCount = switches.filter(entityId => {
      const entity = this._hass.states[entityId];
      if (!entity) return false;
      return entity.state === 'on';
    }).length;
    return { 
      active: activeSwitchCount > 0, 
      count: activeSwitchCount, 
      total: switches.length 
    };
  }

  // Get fan status from fan_entities group
  _getFanStatus() {
    if (!this._hass || !this._config.fan_entities || this._config.fan_entities.length === 0) {
      return { active: false, count: 0, total: 0 };
    }
    const fans = this._config.fan_entities;
    const activeFanCount = fans.filter(entityId => {
      const entity = this._hass.states[entityId];
      if (!entity) return false;
      return entity.state === 'on';
    }).length;
    return { 
      active: activeFanCount > 0, 
      count: activeFanCount, 
      total: fans.length 
    };
  }

  // Get other entities status
  _getOtherStatus() {
    if (!this._hass || !this._config.other_entities || this._config.other_entities.length === 0) {
      return { active: false, count: 0, total: 0 };
    }
    const others = this._config.other_entities;
    const activeOtherCount = others.filter(entityId => {
      const entity = this._hass.states[entityId];
      if (!entity) return false;
      const domain = entityId.split('.')[0];
      return this._isEntityActive(entity, domain);
    }).length;
    return { 
      active: activeOtherCount > 0, 
      count: activeOtherCount, 
      total: others.length 
    };
  }

  // Get all entities with their states, grouped by type
  _getEntitiesWithStates() {
    if (!this._hass) return [];
    
    const processGroup = (entityIds, groupName) => {
      if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) return [];
      
      return entityIds.map(entityId => {
        const entity = this._hass.states[entityId];
        if (!entity) return null;
        
        const domain = entityId.split('.')[0];
        const isActive = this._isEntityActive(entity, domain);
        
        return {
          id: entityId,
          name: entity.attributes?.friendly_name || entityId,
          state: entity.state,
          icon: entity.attributes?.icon || this._getDomainIcon(domain),
          domain: domain,
          group: groupName,
          isActive: isActive,
          attributes: entity.attributes
        };
      }).filter(e => e !== null);
    };
    
    return [
      ...processGroup(this._config.light_entities, 'Lights'),
      ...processGroup(this._config.climate_entities, 'Climate'),
      ...processGroup(this._config.motion_entities, 'Motion Sensors'),
      ...processGroup(this._config.media_entities, 'Media Players'),
      ...processGroup(this._config.cover_entities, 'Covers'),
      ...processGroup(this._config.switch_entities, 'Switches'),
      ...processGroup(this._config.fan_entities, 'Fans'),
      ...processGroup(this._config.other_entities, 'Other')
    ];
  }

  _isEntityActive(entity, domain) {
    const state = entity.state;
    switch(domain) {
      case 'light':
      case 'switch':
      case 'fan':
      case 'input_boolean':
        return state === 'on';
      case 'cover':
        return state === 'open';
      case 'lock':
        return state === 'locked';
      case 'climate':
        return state === 'heat' || state === 'auto' || state === 'cool';
      case 'media_player':
        return state === 'playing' || state === 'paused';
      case 'binary_sensor':
        return state === 'on';
      default:
        return state === 'on';
    }
  }

  _getDomainIcon(domain) {
    const icons = {
      'light': 'mdi:lightbulb',
      'switch': 'mdi:power-socket-de',
      'fan': 'mdi:fan',
      'cover': 'mdi:blinds',
      'lock': 'mdi:lock',
      'climate': 'mdi:thermostat',
      'media_player': 'mdi:play-circle',
      'binary_sensor': 'mdi:motion-sensor',
      'sensor': 'mdi:gauge',
      'input_boolean': 'mdi:toggle-switch',
      'scene': 'mdi:palette',
      'script': 'mdi:script-text',
      'vacuum': 'mdi:robot-vacuum'
    };
    return icons[domain] || 'mdi:help-circle';
  }

  _toggleEntity(entityId) {
    if (!this._hass) return;
    const domain = entityId.split('.')[0];
    
    if (['light', 'switch', 'fan', 'input_boolean'].includes(domain)) {
      this._hass.callService(domain, 'toggle', { entity_id: entityId });
    } else if (domain === 'cover') {
      const entity = this._hass.states[entityId];
      if (entity?.state === 'open' || entity?.state === 'opening') {
        this._hass.callService('cover', 'close_cover', { entity_id: entityId });
      } else {
        this._hass.callService('cover', 'open_cover', { entity_id: entityId });
      }
    } else if (domain === 'lock') {
      const entity = this._hass.states[entityId];
      if (entity?.state === 'locked') {
        this._hass.callService('lock', 'unlock', { entity_id: entityId });
      } else {
        this._hass.callService('lock', 'lock', { entity_id: entityId });
      }
    } else if (domain === 'media_player') {
      this._hass.callService('media_player', 'media_play_pause', { entity_id: entityId });
    } else if (domain === 'climate') {
      // Toggle climate between heat and off
      const entity = this._hass.states[entityId];
      if (!entity) return;
      const currentState = entity.state;
      if (currentState === 'off') {
        this._hass.callService('climate', 'set_hvac_mode', { 
          entity_id: entityId, 
          hvac_mode: 'heat' 
        });
      } else {
        this._hass.callService('climate', 'set_hvac_mode', { 
          entity_id: entityId, 
          hvac_mode: 'off' 
        });
      }
    } else if (domain === 'scene') {
      this._hass.callService('scene', 'turn_on', { entity_id: entityId });
    } else if (domain === 'script') {
      this._hass.callService('script', 'turn_on', { entity_id: entityId });
    }
  }

  _openPopup() {
    // Create popup overlay
    this._popupElement = document.createElement('div');
    this._popupElement.className = 'prism-room-popup-overlay';
    this._popupElement.innerHTML = this._getPopupHTML();
    document.body.appendChild(this._popupElement);
    
    // Add styles to document if not already present
    if (!document.getElementById('prism-room-popup-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'prism-room-popup-styles';
      styleSheet.textContent = this._getPopupStyles();
      document.head.appendChild(styleSheet);
    }
    
    // Setup popup event listeners
    this._setupPopupListeners();
    
    // Trigger animation
    requestAnimationFrame(() => {
      this._popupElement.classList.add('visible');
    });
  }

  _closePopup() {
    if (this._popupElement) {
      this._popupElement.classList.remove('visible');
      setTimeout(() => {
        if (this._popupElement && this._popupElement.parentNode) {
          this._popupElement.parentNode.removeChild(this._popupElement);
        }
        this._popupElement = null;
      }, 200);
    }
  }

  _updatePopupContent() {
    if (!this._popupElement) return;
    
    const popup = this._popupElement.querySelector('.prism-room-popup');
    if (!popup) return;
    
    // Extract the inner HTML from the new popup HTML
    const newPopupHTML = this._getPopupHTML();
    const match = newPopupHTML.match(/<div class="prism-room-popup">([\s\S]*)<\/div>$/);
    if (match) {
      popup.innerHTML = match[1];
      this._setupPopupListeners();
    }
  }

  _handleEntityLongPress(entityId) {
    // Close popup first so more-info dialog appears on top
    this._closePopup();
    
    // Dispatch more-info event after a short delay to ensure popup is closed
    setTimeout(() => {
      const event = new CustomEvent('hass-more-info', {
        bubbles: true,
        composed: true,
        detail: { entityId: entityId }
      });
      this.dispatchEvent(event);
    }, 100);
  }

  _getEntityColor(entity) {
    const colors = {
      'light': '#ffc864',
      'switch': '#4ade80',
      'fan': '#38bdf8',
      'cover': '#22d3ee',
      'lock': '#10b981',
      'climate': '#fb923c',
      'media_player': '#a78bfa',
      'binary_sensor': '#818cf8',
      'vacuum': '#4ade80'
    };
    return colors[entity.domain] || '#94a3b8';
  }

  // Translation helper - English default, German if HA is set to German
  _t(key) {
    const lang = this._hass?.language || this._hass?.locale?.language || 'en';
    const isGerman = lang.startsWith('de');
    
    const translations = {
      // States
      'on': isGerman ? 'An' : 'On',
      'off': isGerman ? 'Aus' : 'Off',
      'open': isGerman ? 'Offen' : 'Open',
      'closed': isGerman ? 'Geschlossen' : 'Closed',
      'locked': isGerman ? 'Verriegelt' : 'Locked',
      'unlocked': isGerman ? 'Entriegelt' : 'Unlocked',
      'heat': isGerman ? 'Heizen' : 'Heating',
      'cool': isGerman ? 'Kühlen' : 'Cooling',
      'auto': isGerman ? 'Auto' : 'Auto',
      'playing': isGerman ? 'Spielt' : 'Playing',
      'paused': isGerman ? 'Pausiert' : 'Paused',
      'idle': isGerman ? 'Leerlauf' : 'Idle',
      'unavailable': isGerman ? 'Nicht verfügbar' : 'Unavailable',
      'unknown': isGerman ? 'Unbekannt' : 'Unknown',
      // Status icons
      'heating_on': isGerman ? 'Heizung' : 'Heating',
      'heating_off': isGerman ? 'Heizung aus' : 'Heating off',
      'light_on': isGerman ? 'an' : 'on',
      'lights_on': isGerman ? 'er an' : 's on',
      'light_off': isGerman ? 'Licht aus' : 'Light off',
      'motion_detected': isGerman ? 'Bewegung erkannt' : 'Motion detected',
      'no_motion': isGerman ? 'Keine Bewegung' : 'No motion',
      'playback_active': isGerman ? 'Wiedergabe aktiv' : 'Playback active',
      'no_playback': isGerman ? 'Keine Wiedergabe' : 'No playback',
      // Popup
      'devices': isGerman ? 'Geräte' : 'Devices',
      'no_entities': isGerman ? 'Keine Entitäten konfiguriert' : 'No entities configured',
      'room': isGerman ? 'Raum' : 'Room',
      'light': isGerman ? 'Licht' : 'Light',
      // Group names
      'Lights': isGerman ? 'Lichter' : 'Lights',
      'Climate': isGerman ? 'Heizungen' : 'Climate',
      'Motion Sensors': isGerman ? 'Bewegungsmelder' : 'Motion Sensors',
      'Media Players': isGerman ? 'Mediaplayer' : 'Media Players',
      'Covers': isGerman ? 'Rollläden' : 'Covers',
      'Switches': isGerman ? 'Schalter' : 'Switches',
      'Fans': isGerman ? 'Ventilatoren' : 'Fans',
      'Other': isGerman ? 'Sonstige' : 'Other',
      // Status messages
      'covers_open': isGerman ? 'offen' : 'open',
      'covers_closed': isGerman ? 'geschlossen' : 'closed',
      'switches_on': isGerman ? 'an' : 'on',
      'switches_off': isGerman ? 'aus' : 'off',
      'fans_on': isGerman ? 'an' : 'on',
      'fans_off': isGerman ? 'aus' : 'off',
      'other_active': isGerman ? 'aktiv' : 'active',
      'other_inactive': isGerman ? 'inaktiv' : 'inactive'
    };
    
    return translations[key] || key;
  }

  _translateState(state) {
    return this._t(state);
  }

  // Render the card structure once
  _renderCard() {
    if (!this._config) return;
    
    const activeColor = this._config.active_color || '#60a5fa';
    
    this.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .prism-room-card {
          background: rgba(30, 32, 36, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom: 1px solid rgba(0, 0, 0, 0.4);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3);
          transition: all 0.15s ease-out;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .prism-room-card.transparent {
          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          border: none;
          box-shadow: none;
        }
        .prism-room-card:hover {
          box-shadow: 0 12px 24px -5px rgba(0, 0, 0, 0.6), 0 4px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08);
        }
        .prism-room-card.transparent:hover {
          box-shadow: none;
        }
        .prism-room-card:active {
          transform: scale(0.98);
          background: rgba(20, 20, 20, 0.6);
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1);
        }
        .prism-room-card.transparent:active {
          background: transparent;
          box-shadow: none;
        }
        
        .prism-room-card .card-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          gap: 10px;
        }
        
        .prism-room-card .icon-container {
          position: relative;
          width: var(--icon-size, 42px);
          height: var(--icon-size, 42px);
          flex-shrink: 0;
        }
        
        .prism-room-card .icon-container.hidden {
          display: none;
        }
        
        .prism-room-card .icon-circle {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 
            inset 3px 3px 8px rgba(0, 0, 0, 0.5),
            inset -2px -2px 6px rgba(255, 255, 255, 0.05),
            inset 1px 1px 3px rgba(0, 0, 0, 0.3);
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        .prism-room-card .icon-circle.active {
          background: linear-gradient(145deg, 
            rgba(var(--active-color-rgb), 0.2), 
            rgba(var(--active-color-rgb), 0.1));
          border: none;
          box-shadow: 
            3px 3px 8px rgba(0, 0, 0, 0.3),
            -2px -2px 6px rgba(255, 255, 255, 0.04),
            0 0 12px rgba(var(--active-color-rgb), 0.6),
            0 0 24px rgba(var(--active-color-rgb), 0.15),
            inset 1px 1px 2px rgba(255, 255, 255, 0.1);
        }
        
        .prism-room-card .icon-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .prism-room-card .icon-wrapper ha-icon {
          --mdc-icon-size: calc(var(--icon-size, 42px) * 0.52);
          color: rgba(255, 255, 255, 0.4);
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        .prism-room-card .icon-wrapper.active ha-icon {
          color: var(--active-color);
          filter: drop-shadow(0 0 6px rgba(var(--active-color-rgb), 0.6));
        }
        
        .prism-room-card .info {
          text-align: center;
          width: 100%;
        }
        
        .prism-room-card .name {
          font-size: var(--name-size, 1.125rem);
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.2;
          margin-bottom: 2px;
        }
        
        .prism-room-card .state {
          font-size: calc(var(--name-size, 1.125rem) * 0.65);
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.4;
        }
        
        .prism-room-card .state.placeholder {
          min-height: calc(var(--name-size, 1.125rem) * 0.65 * 1.4);
        }
        
        /* Status Icons Row */
        .prism-room-card .status-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        
        .prism-room-card .status-row.placeholder {
          min-height: 38px; /* 32px icon + 3px badge overflow + 3px buffer */
        }
        
        .prism-room-card .status-icon {
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        
        .prism-room-card .status-icon-inner {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
        }
        
        .prism-room-card .status-icon.inactive .status-icon-inner {
          background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03);
        }
        
        .prism-room-card .status-icon.inactive ha-icon {
          color: rgba(255, 255, 255, 0.25);
        }
        
        .prism-room-card .status-icon.active .status-icon-inner {
          background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
          box-shadow: 
            inset 2px 2px 5px rgba(0, 0, 0, 0.6),
            inset -1px -1px 3px rgba(255, 255, 255, 0.03);
        }
        
        .prism-room-card .status-icon ha-icon {
          --mdc-icon-size: 16px;
          transition: all 0.2s ease;
        }
        
        .prism-room-card .status-icon.active ha-icon {
          filter: drop-shadow(0 0 4px currentColor);
        }
        
        .prism-room-card .status-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          min-width: 14px;
          height: 14px;
          border-radius: 7px;
          color: white;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      </style>
      
      <div class="prism-room-card ${this._config.hide_card_background ? 'transparent' : ''}" style="--active-color: ${activeColor}; --active-color-rgb: ${this._hexToRgb(activeColor)}; --icon-size: ${this._config.icon_size}px; --name-size: ${this._config.name_size}rem;">
        <div class="card-content">
          <div class="icon-container ${this._config.show_icon ? '' : 'hidden'}">
            <div class="icon-circle" id="icon-circle"></div>
            <div class="icon-wrapper" id="icon-wrapper">
              <ha-icon icon="${this._config.icon}"></ha-icon>
            </div>
          </div>
          <div class="info">
            <div class="name">${this._config.name}</div>
            <div class="state" id="climate-text"></div>
          </div>
          <div class="status-row" id="status-row"></div>
        </div>
      </div>
    `;
    
    this._cardRendered = true;
    this._setupCardListeners();
    this._updateCardContent();
  }

  _hexToRgb(hex) {
    if (!hex) return '96, 165, 250';
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  // Update only the dynamic content
  _updateCardContent() {
    if (!this._config || !this._cardRendered || !this._hass) return;
    
    const temperature = this._getTemperature();
    const humidity = this._getHumidity();
    const climate = this._getClimateStatus();
    const motion = this._getMotionStatus();
    const media = this._getMediaStatus();
    const lights = this._getLightStatus();
    const covers = this._getCoverStatus();
    const switches = this._getSwitchStatus();
    const fans = this._getFanStatus();
    const others = this._getOtherStatus();
    
    // Determine if any status should be highlighted
    const hasActiveStatus = climate.active || motion.active || media.active || lights.active || 
                            covers.active || switches.active || fans.active || others.active;
    
    // Update icon circle
    const iconCircle = this.querySelector('#icon-circle');
    const iconWrapper = this.querySelector('#icon-wrapper');
    if (iconCircle) {
      iconCircle.className = hasActiveStatus ? 'icon-circle active' : 'icon-circle';
    }
    if (iconWrapper) {
      iconWrapper.className = hasActiveStatus ? 'icon-wrapper active' : 'icon-wrapper';
    }
    
    // Climate info text
    let climateText = '';
    if (temperature !== null) {
      climateText += `${temperature.toFixed(1)}°C`;
    }
    if (humidity !== null) {
      if (climateText) climateText += ' · ';
      climateText += `${humidity.toFixed(0)}%`;
    }
    
    const climateEl = this.querySelector('#climate-text');
    if (climateEl) {
      if (climateText) {
        climateEl.textContent = climateText;
        climateEl.classList.remove('placeholder');
      } else if (this._config.show_climate_placeholder) {
        climateEl.textContent = '';
        climateEl.classList.add('placeholder');
      } else {
        climateEl.textContent = '';
        climateEl.classList.remove('placeholder');
      }
    }
    
    // Build status icons
    const statusIcons = [];
    
    if (climate.total > 0) {
      statusIcons.push({
        icon: 'mdi:heating-coil',
        active: climate.active,
        color: '#fb923c',
        title: climate.active ? `${climate.count} ${this._t('heating_on')}` : this._t('heating_off'),
        badge: climate.count > 0 ? climate.count : null
      });
    }
    
    if (lights.total > 0) {
      statusIcons.push({
        icon: 'mdi:lightbulb-group',
        active: lights.active,
        color: '#ffc864',
        title: lights.active ? `${lights.count} ${this._t('light')}${lights.count > 1 ? this._t('lights_on') : ' ' + this._t('light_on')}` : this._t('light_off'),
        badge: lights.count > 0 ? lights.count : null
      });
    }
    
    if (covers.total > 0) {
      statusIcons.push({
        icon: 'mdi:blinds',
        active: covers.active,
        color: '#22d3ee',
        title: covers.active ? `${covers.count} ${this._t('covers_open')}` : this._t('covers_closed'),
        badge: covers.count > 0 ? covers.count : null
      });
    }
    
    if (switches.total > 0) {
      statusIcons.push({
        icon: 'mdi:power-socket-de',
        active: switches.active,
        color: '#4ade80',
        title: switches.active ? `${switches.count} ${this._t('switches_on')}` : this._t('switches_off'),
        badge: switches.count > 0 ? switches.count : null
      });
    }
    
    if (fans.total > 0) {
      statusIcons.push({
        icon: 'mdi:fan',
        active: fans.active,
        color: '#38bdf8',
        title: fans.active ? `${fans.count} ${this._t('fans_on')}` : this._t('fans_off'),
        badge: fans.count > 0 ? fans.count : null
      });
    }
    
    if (motion.total > 0) {
      statusIcons.push({
        icon: 'mdi:motion-sensor',
        active: motion.active,
        color: '#818cf8',
        title: motion.active ? `${motion.count} ${this._t('motion_detected')}` : this._t('no_motion'),
        badge: motion.count > 0 ? motion.count : null
      });
    }
    
    if (media.total > 0) {
      statusIcons.push({
        icon: media.active ? 'mdi:music' : 'mdi:music-off',
        active: media.active,
        color: '#a78bfa',
        title: media.active ? `${media.count} ${this._t('playback_active')}` : this._t('no_playback'),
        badge: media.count > 0 ? media.count : null
      });
    }
    
    if (others.total > 0) {
      statusIcons.push({
        icon: this._config.other_entities_icon || 'mdi:apps',
        active: others.active,
        color: '#94a3b8',
        title: others.active ? `${others.count} ${this._t('other_active')}` : this._t('other_inactive'),
        badge: others.count > 0 ? others.count : null
      });
    }
    
    // Update status row
    const statusRow = this.querySelector('#status-row');
    if (statusRow) {
      if (statusIcons.length > 0) {
        statusRow.innerHTML = statusIcons.map(status => `
          <div class="status-icon ${status.active ? 'active' : 'inactive'}" title="${status.title}">
            <div class="status-icon-inner">
              <ha-icon icon="${status.icon}" style="${status.active ? `color: ${status.color};` : ''}"></ha-icon>
            </div>
            ${status.badge ? `<div class="status-badge" style="background: ${status.color};">${status.badge}</div>` : ''}
          </div>
        `).join('');
        statusRow.classList.remove('placeholder');
        statusRow.style.display = '';  // Show (flex from CSS)
      } else if (this._config.show_status_placeholder) {
        statusRow.innerHTML = '';
        statusRow.classList.add('placeholder');
        statusRow.style.display = '';  // Show placeholder
      } else {
        statusRow.innerHTML = '';
        statusRow.classList.remove('placeholder');
        statusRow.style.display = 'none';  // Hide completely
      }
    }
  }

  _setupCardListeners() {
    const card = this.querySelector('.prism-room-card');
    if (card) {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._openPopup();
      });
    }
  }

  _getPopupStyles() {
    const activeColor = this._config.active_color || '#60a5fa';
    return `
      .prism-room-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0);
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        transition: all 0.2s ease;
        pointer-events: none;
      }
      
      .prism-room-popup-overlay.visible {
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        pointer-events: auto;
      }
      
      .prism-room-popup {
        width: 100%;
        max-width: 700px;
        max-height: 85vh;
        background: rgba(30, 32, 36, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 
          0 25px 50px -12px rgba(0, 0, 0, 0.8),
          0 0 0 1px rgba(255, 255, 255, 0.05);
        overflow: hidden;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      
      @media (max-width: 768px) {
        .prism-room-popup {
          max-width: 90vw;
        }
      }
      
      .prism-room-popup-overlay.visible .prism-room-popup {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      
      .prism-room-popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(0, 0, 0, 0.2);
      }
      
      .prism-room-popup-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .prism-room-popup-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
        box-shadow: 
          4px 4px 10px rgba(0, 0, 0, 0.5),
          -2px -2px 6px rgba(255, 255, 255, 0.03);
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${activeColor};
      }
      
      .prism-room-popup-icon ha-icon {
        --mdc-icon-size: 26px;
        filter: drop-shadow(0 0 6px currentColor);
      }
      
      .prism-room-popup-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.95);
      }
      
      .prism-room-popup-subtitle {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        margin-top: 2px;
      }
      
      .prism-room-popup-close {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(145deg, rgba(35, 38, 45, 1), rgba(28, 30, 35, 1));
        box-shadow: 
          3px 3px 8px rgba(0, 0, 0, 0.4),
          -2px -2px 4px rgba(255, 255, 255, 0.03);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.6);
        transition: all 0.2s ease;
      }
      
      .prism-room-popup-close:hover {
        color: #f87171;
      }
      
      .prism-room-popup-close:hover ha-icon {
        filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.5));
      }
      
      .prism-room-popup-close:active {
        background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
        box-shadow: 
          inset 2px 2px 5px rgba(0, 0, 0, 0.6),
          inset -1px -1px 3px rgba(255, 255, 255, 0.03);
      }
      
      .prism-room-popup-close ha-icon {
        --mdc-icon-size: 20px;
      }
      
      .prism-room-popup-climate {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
        padding: 16px 20px;
        background: rgba(0, 0, 0, 0.15);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .prism-room-popup-climate-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .prism-room-popup-climate-item ha-icon {
        --mdc-icon-size: 20px;
      }
      
      .prism-room-popup-climate-item.temp ha-icon {
        color: #fb923c;
      }
      
      .prism-room-popup-climate-item.humidity ha-icon {
        color: #60a5fa;
      }
      
      .prism-room-popup-climate-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.9);
      }
      
      .prism-room-popup-climate-unit {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.5);
        margin-left: 2px;
      }
      
      .prism-room-popup-content {
        padding: 16px;
        max-height: 55vh;
        overflow-y: auto;
      }
      
      .prism-room-popup-content::-webkit-scrollbar {
        width: 6px;
      }
      
      .prism-room-popup-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
      
      .prism-room-popup-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }
      
      .prism-room-groups-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        align-items: start;
        justify-content: center;
      }
      
      @media (max-width: 650px) {
        .prism-room-groups-container {
          grid-template-columns: 1fr;
        }
      }
      
      .prism-room-entity-group {
        break-inside: avoid;
        width: 100%;
      }
      
      .prism-room-entity-group-title {
        font-size: 0.8125rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 10px;
        padding-left: 4px;
      }
      
      .prism-room-entity-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      
      .prism-room-entity-card {
        background: rgba(30, 32, 36, 0.8);
        border-radius: 12px;
        padding: 10px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        border-bottom: 1px solid rgba(0, 0, 0, 0.3);
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      
      .prism-room-entity-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
      }
      
      .prism-room-entity-card:active {
        transform: scale(0.96);
      }
      
      .prism-room-entity-card.active {
        background: rgba(20, 20, 20, 0.8);
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: inset 2px 2px 4px rgba(0,0,0,0.6), inset -1px -1px 2px rgba(255,255,255,0.05);
      }
      
      .prism-room-entity-icon-wrapper {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .prism-room-entity-card.inactive .prism-room-entity-icon-wrapper {
        background: rgba(255, 255, 255, 0.03);
        box-shadow: 
          inset 2px 2px 6px rgba(0, 0, 0, 0.5),
          inset -1px -1px 4px rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.35);
      }
      
      .prism-room-entity-card.active .prism-room-entity-icon-wrapper {
        background: linear-gradient(145deg, rgba(25, 27, 30, 1), rgba(30, 32, 38, 1));
        box-shadow: 
          inset 2px 2px 5px rgba(0, 0, 0, 0.6),
          inset -1px -1px 3px rgba(255, 255, 255, 0.03);
      }
      
      .prism-room-entity-icon-wrapper ha-icon {
        --mdc-icon-size: 18px;
        transition: all 0.2s ease;
      }
      
      .prism-room-entity-card.active .prism-room-entity-icon-wrapper ha-icon {
        filter: drop-shadow(0 0 5px currentColor);
      }
      
      .prism-room-entity-name {
        font-size: 0.6875rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        text-align: center;
        line-height: 1.2;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      
      .prism-room-entity-state {
        font-size: 0.5625rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.4);
        text-transform: capitalize;
      }
      
      .prism-room-empty-state {
        text-align: center;
        padding: 40px 20px;
        color: rgba(255, 255, 255, 0.4);
      }
      
      .prism-room-empty-state ha-icon {
        --mdc-icon-size: 48px;
        margin-bottom: 12px;
        opacity: 0.3;
      }
      
      .prism-room-empty-state-text {
        font-size: 0.875rem;
      }
    `;
  }

  _getPopupHTML() {
    const entities = this._getEntitiesWithStates();
    const temperature = this._getTemperature();
    const humidity = this._getHumidity();
    
    // Group entities by their group property
    const groupedEntities = {};
    entities.forEach(entity => {
      if (!groupedEntities[entity.group]) {
        groupedEntities[entity.group] = [];
      }
      groupedEntities[entity.group].push(entity);
    });
    
    // Define group order for consistent display
    const groupOrder = ['Lights', 'Climate', 'Motion Sensors', 'Media Players', 'Covers', 'Switches', 'Fans', 'Other'];
    
    const entitiesHTML = entities.length > 0 
      ? `<div class="prism-room-groups-container">
          ${groupOrder.map(groupName => {
            const groupEntities = groupedEntities[groupName];
            if (!groupEntities || groupEntities.length === 0) return '';
            
            return `
              <div class="prism-room-entity-group">
                <div class="prism-room-entity-group-title">${this._t(groupName)}</div>
                <div class="prism-room-entity-grid">
                  ${groupEntities.map(entity => {
                    const iconColor = this._getEntityColor(entity);
                    return `
                      <div class="prism-room-entity-card ${entity.isActive ? 'active' : 'inactive'}" 
                           data-entity-id="${entity.id}">
                        <div class="prism-room-entity-icon-wrapper" style="${entity.isActive ? `color: ${iconColor};` : ''}">
                          <ha-icon icon="${entity.icon}"></ha-icon>
                        </div>
                        <div class="prism-room-entity-name">${entity.name}</div>
                        <div class="prism-room-entity-state">${this._translateState(entity.state)}</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>`
      : `<div class="prism-room-empty-state">
          <ha-icon icon="mdi:lightbulb-group-off"></ha-icon>
          <div class="prism-room-empty-state-text">${this._t('no_entities')}</div>
        </div>`;
    
    return `
      <div class="prism-room-popup">
        <div class="prism-room-popup-header">
          <div class="prism-room-popup-header-left">
            <div class="prism-room-popup-icon">
              <ha-icon icon="${this._config.icon}"></ha-icon>
            </div>
            <div>
              <div class="prism-room-popup-title">${this._config.name}</div>
              <div class="prism-room-popup-subtitle">${entities.length} ${this._t('devices')}</div>
            </div>
          </div>
          <button class="prism-room-popup-close">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        
        ${(temperature !== null || humidity !== null) ? `
          <div class="prism-room-popup-climate">
            ${temperature !== null ? `
              <div class="prism-room-popup-climate-item temp">
                <ha-icon icon="mdi:thermometer"></ha-icon>
                <span class="prism-room-popup-climate-value">${temperature.toFixed(1)}<span class="prism-room-popup-climate-unit">°C</span></span>
              </div>
            ` : ''}
            ${humidity !== null ? `
              <div class="prism-room-popup-climate-item humidity">
                <ha-icon icon="mdi:water-percent"></ha-icon>
                <span class="prism-room-popup-climate-value">${humidity.toFixed(0)}<span class="prism-room-popup-climate-unit">%</span></span>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        <div class="prism-room-popup-content">
          ${entitiesHTML}
        </div>
      </div>
    `;
  }

  _setupPopupListeners() {
    if (!this._popupElement) return;
    
    // Close button
    const closeBtn = this._popupElement.querySelector('.prism-room-popup-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closePopup();
      });
    }
    
    // Overlay click (close on background click)
    this._popupElement.addEventListener('click', (e) => {
      if (e.target === this._popupElement) {
        this._closePopup();
      }
    });
    
    // Entity cards
    const entityCards = this._popupElement.querySelectorAll('.prism-room-entity-card');
    entityCards.forEach(card => {
      const entityId = card.dataset.entityId;
      let pressTimer;
      let longPressTriggered = false;
      
      card.addEventListener('click', (e) => {
        if (!longPressTriggered) {
          e.stopPropagation();
          this._toggleEntity(entityId);
          // Note: Popup will be automatically updated when hass state changes
        }
        longPressTriggered = false;
      });
      
      card.addEventListener('mousedown', () => {
        longPressTriggered = false;
        pressTimer = setTimeout(() => {
          longPressTriggered = true;
          this._handleEntityLongPress(entityId);
        }, 500);
      });
      
      card.addEventListener('mouseup', () => clearTimeout(pressTimer));
      card.addEventListener('mouseleave', () => clearTimeout(pressTimer));
      
      card.addEventListener('touchstart', () => {
        longPressTriggered = false;
        pressTimer = setTimeout(() => {
          longPressTriggered = true;
          this._handleEntityLongPress(entityId);
        }, 500);
      }, { passive: true });
      
      card.addEventListener('touchend', () => clearTimeout(pressTimer));
      card.addEventListener('touchcancel', () => clearTimeout(pressTimer));
      
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._handleEntityLongPress(entityId);
      });
    });
  }
}

customElements.define('prism-room', PrismRoomCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-room",
  name: "Prism Room",
  preview: true,
  description: "A room overview card with temperature, humidity, and entity status icons. Click to open popup with all entities."
});
