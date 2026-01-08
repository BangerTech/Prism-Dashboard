/**
 * Prism Energy Horizontal Card
 * A glassmorphism energy flow card for Home Assistant
 * Horizontal layout optimized for tablets with side panel details
 * 
 * Features:
 * - Animated energy flow visualization
 * - Weather effects (rain, snow, fog, sun, moon, stars)
 * - Day/Night transitions with house dimming
 * 
 * @version 1.2.3
 * @author BangerTech
 */

class PrismEnergyHorizontalCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._animationFrame = null;
  }

  static getStubConfig() {
    return {
      name: "Energy Monitor",
      solar_power: "",
      grid_power: "",
      battery_soc: "",
      battery_power: "",
      home_consumption: "",
      ev_power: "",
      autarky: "",
      image: "/local/community/Prism-Dashboard/images/prism-energy-home.png",
      max_solar_power: 10000,
      max_grid_power: 10000,
      max_consumption: 10000,
      show_details: true,
      // Weather effects (optional)
      enable_weather_effects: false,
      weather_entity: "",
      cloud_coverage_entity: "",
      // Solar modules (optional)
      solar_module1: "",
      solar_module1_name: "",
      solar_module2: "",
      solar_module2_name: "",
      solar_module3: "",
      solar_module3_name: "",
      solar_module4: "",
      solar_module4_name: "",
      // Pill positions (optional - in percent)
      solar_pill_top: 21,
      solar_pill_left: 55,
      solar_pill_scale: 1.0,
      grid_pill_top: 34,
      grid_pill_left: 18,
      grid_pill_scale: 1.0,
      home_pill_top: 50,
      home_pill_left: 52,
      home_pill_scale: 1.0,
      battery_pill_top: 62,
      battery_pill_left: 88,
      battery_pill_scale: 1.0,
      ev_pill_top: 70,
      ev_pill_left: 20,
      ev_pill_scale: 1.0
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "name",
          label: "Card Name",
          selector: { text: {} }
        },
        {
          name: "image",
          label: "Image URL (default: prism-energy-home.png)",
          selector: { text: {} }
        },
        {
          name: "show_details",
          label: "Show details panel by default",
          selector: { boolean: {} }
        },
        {
          name: "",
          type: "divider"
        },
        {
          name: "solar_power",
          label: "Solar Power (Total)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "grid_power",
          label: "Grid Power (positive=import, negative=export)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "battery_soc",
          label: "Battery SOC %",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "battery_power",
          label: "Battery Power (positive=discharge, negative=charge)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "home_consumption",
          label: "Home Consumption",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "ev_power",
          label: "EV Charging Power (optional)",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "autarky",
          label: "Autarky % (optional)",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "",
          type: "divider"
        },
        {
          type: "expandable",
          name: "",
          title: "🌤️ Weather & Day/Night Animation",
          schema: [
            {
              name: "enable_weather_effects",
              label: "Enable weather effects",
              selector: { boolean: {} }
            },
            {
              name: "weather_entity",
              label: "Weather Entity (e.g. weather.home)",
              selector: { entity: { domain: "weather" } }
            },
            {
              name: "cloud_coverage_entity",
              label: "Cloud Coverage Sensor (optional, e.g. sensor.openweathermap_cloud_coverage)",
              selector: { entity: { domain: "sensor" } }
            }
          ]
        },
        {
          type: "expandable",
          name: "",
          title: "📊 Maximum Values for Gauges",
          schema: [
            {
              name: "max_solar_power",
              label: "Max Solar Power (Watts) - e.g. 10000 for 10kW",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            },
            {
              name: "max_grid_power",
              label: "Max Grid Power (Watts)",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            },
            {
              name: "max_consumption",
              label: "Max Consumption (Watts)",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            }
          ]
        },
        {
          type: "expandable",
          name: "",
          title: "☀️ Solar Modules (optional - for individual display)",
          schema: [
            {
              name: "solar_module1",
              label: "Solar Module 1 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module1_name",
              label: "Module 1 Name (e.g. Roof East)",
              selector: { text: {} }
            },
            {
              name: "solar_module2",
              label: "Solar Module 2 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module2_name",
              label: "Module 2 Name (e.g. Roof West)",
              selector: { text: {} }
            },
            {
              name: "solar_module3",
              label: "Solar Module 3 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module3_name",
              label: "Module 3 Name (e.g. Garage)",
              selector: { text: {} }
            },
            {
              name: "solar_module4",
              label: "Solar Module 4 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module4_name",
              label: "Module 4 Name",
              selector: { text: {} }
            }
          ]
        },
        {
          type: "expandable",
          name: "",
          title: "📍 Pill Positions & Size (optional)",
          schema: [
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "solar_pill_top",
                  label: "Solar pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "solar_pill_left",
                  label: "Solar pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "solar_pill_scale",
                  label: "Solar pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "grid_pill_top",
                  label: "Grid pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "grid_pill_left",
                  label: "Grid pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "grid_pill_scale",
                  label: "Grid pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "home_pill_top",
                  label: "Home pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "home_pill_left",
                  label: "Home pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "home_pill_scale",
                  label: "Home pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "battery_pill_top",
                  label: "Battery pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "battery_pill_left",
                  label: "Battery pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "battery_pill_scale",
                  label: "Battery pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            },
            {
              type: "grid",
              name: "",
              schema: [
                {
                  name: "ev_pill_top",
                  label: "Ev pill top",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "ev_pill_left",
                  label: "Ev pill left",
                  selector: { number: { min: 0, max: 100, step: 1, mode: "box" } }
                },
                {
                  name: "ev_pill_scale",
                  label: "Ev pill size",
                  selector: { number: { min: 0.5, max: 2.0, step: 0.1, mode: "box" } }
                }
              ]
            }
          ]
        }
      ]
    };
  }

  setConfig(config) {
    this._config = {
      name: config.name || "Energy Monitor",
      solar_power: config.solar_power || "",
      grid_power: config.grid_power || "",
      battery_soc: config.battery_soc || "",
      battery_power: config.battery_power || "",
      home_consumption: config.home_consumption || "",
      ev_power: config.ev_power || "",
      autarky: config.autarky || "",
      image: config.image || "/local/community/Prism-Dashboard/images/prism-energy-home.png",
      show_details: config.show_details !== false,
      // Max values for gauges (in Watts)
      max_solar_power: config.max_solar_power || 10000,
      max_grid_power: config.max_grid_power || 10000,
      max_consumption: config.max_consumption || 10000,
      // Weather effects
      enable_weather_effects: config.enable_weather_effects || false,
      weather_entity: config.weather_entity || "",
      cloud_coverage_entity: config.cloud_coverage_entity || "",
      // Solar modules
      solar_module1: config.solar_module1 || "",
      solar_module1_name: config.solar_module1_name || "Module 1",
      solar_module2: config.solar_module2 || "",
      solar_module2_name: config.solar_module2_name || "Module 2",
      solar_module3: config.solar_module3 || "",
      solar_module3_name: config.solar_module3_name || "Module 3",
      solar_module4: config.solar_module4 || "",
      solar_module4_name: config.solar_module4_name || "Module 4",
      // Pill positions (in percent) - default values match current layout
      solar_pill_top: config.solar_pill_top ?? 21,
      solar_pill_left: config.solar_pill_left ?? 55,
      solar_pill_scale: config.solar_pill_scale ?? 1.0,
      grid_pill_top: config.grid_pill_top ?? 34,
      grid_pill_left: config.grid_pill_left ?? 18,
      grid_pill_scale: config.grid_pill_scale ?? 1.0,
      home_pill_top: config.home_pill_top ?? 50,
      home_pill_left: config.home_pill_left ?? 52,
      home_pill_scale: config.home_pill_scale ?? 1.0,
      battery_pill_top: config.battery_pill_top ?? 62,
      battery_pill_left: config.battery_pill_left ?? 88,
      battery_pill_scale: config.battery_pill_scale ?? 1.0,
      ev_pill_top: config.ev_pill_top ?? 70,
      ev_pill_left: config.ev_pill_left ?? 20,
      ev_pill_scale: config.ev_pill_scale ?? 1.0
    };
  }

  set hass(hass) {
    this._hass = hass;
    // Only do full render on first load, then just update values
    if (!this._initialized) {
      this.render();
      this._initialized = true;
    } else {
      this._updateValues();
      this._updateWeatherIfChanged();
    }
  }

  // Check if weather conditions changed and update only weather elements
  _updateWeatherIfChanged() {
    if (!this._config.enable_weather_effects || !this._config.weather_entity) return;
    
    const weatherData = this._getWeatherData();
    // Include cloud coverage in key (rounded to 10% steps to avoid too frequent updates)
    const cloudKey = weatherData.cloudCoverage !== null ? Math.round(weatherData.cloudCoverage / 10) * 10 : 'none';
    const weatherKey = `${weatherData.weatherType}-${weatherData.isNight}-${weatherData.isSunrise}-${weatherData.isSunset}-${cloudKey}`;
    
    // Only update if weather state changed
    if (this._lastWeatherKey === weatherKey) return;
    this._lastWeatherKey = weatherKey;
    
    // Update weather container
    const weatherContainer = this.shadowRoot.querySelector('.weather-container');
    if (weatherContainer) {
      weatherContainer.remove();
    }
    
    const visualContainer = this.shadowRoot.querySelector('.visual-container');
    if (visualContainer) {
      visualContainer.insertAdjacentHTML('afterbegin', this._renderWeatherEffects(weatherData));
      
      // Update night-mode classes
      const houseImg = this.shadowRoot.querySelector('.house-img');
      if (houseImg) {
        houseImg.classList.toggle('night-mode', weatherData.isNight);
      }
      visualContainer.classList.toggle('night-mode', weatherData.isNight);
    }
    
    // Update weather label in header
    const weatherStatus = this.shadowRoot.querySelector('.weather-status');
    if (weatherStatus) {
      const dayNightLabel = this._getDayNightLabel(weatherData.isNight);
      const weatherTypeLabel = this._getWeatherLabel(weatherData);
      weatherStatus.textContent = `${dayNightLabel} • ${weatherTypeLabel}`;
    }
  }

  // Update only the dynamic values without re-rendering (preserves animations)
  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;

    // Use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0); // SOC is percentage, not power
    const batteryPower = this._getStateInWatts(this._config.battery_power, 0);
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);
    const evPower = this._getStateInWatts(this._config.ev_power, 0);
    const autarky = this._getState(this._config.autarky, 0); // Autarky is percentage

    // Determine states for labels
    const isSolarActive = solarPower > 50;
    const isGridImport = gridPower > 50;
    const isGridExport = gridPower < -50;
    const isBatteryCharging = batteryPower < -50;
    const isBatteryDischarging = batteryPower > 50;
    const isEvCharging = evPower > 50;
    const hasBattery = !!this._config.battery_soc;

    // Update pill values
    this._updateElement('.pill-solar .pill-val', this._formatPower(solarPower));
    this._updateElement('.pill-grid .pill-val', this._formatPower(gridPower));
    this._updateElement('.pill-home .pill-val', this._formatPower(homeConsumption));
    if (hasBattery) {
      this._updateElement('.pill-battery .pill-val', `${Math.round(batterySoc)}%`);
    }
    
    // Update pill labels dynamically
    this._updateElement('.pill-solar .pill-label', isSolarActive ? this._t('production') : this._t('inactive'));
    this._updateElement('.pill-grid .pill-label', isGridExport ? this._t('export') : isGridImport ? this._t('import') : this._t('neutral'));
    if (hasBattery) {
      this._updateElement('.pill-battery .pill-label', isBatteryCharging ? this._t('charging') : isBatteryDischarging ? this._t('discharging') : this._t('standby'));
    }
    
    // Update pill icon classes (active/inactive states)
    this._updatePillIconClass('.pill-solar .pill-icon', isSolarActive, 'bg-solar');
    this._updatePillIconClass('.pill-solar .pill-icon ha-icon', isSolarActive, 'color-solar');
    this._updatePillIconClass('.pill-grid .pill-icon', isGridImport || isGridExport, 'bg-grid');
    this._updatePillIconClass('.pill-grid .pill-icon ha-icon', isGridImport || isGridExport, 'color-grid');
    if (hasBattery) {
      this._updatePillIconClass('.pill-battery .pill-icon', isBatteryCharging || isBatteryDischarging, 'bg-battery');
      this._updatePillIconClass('.pill-battery .pill-icon ha-icon', isBatteryCharging || isBatteryDischarging, 'color-battery');
    }
    
    if (this._config.ev_power) {
      this._updateElement('.pill-ev .pill-val', isEvCharging ? this._formatPower(evPower) : this._t('idle'));
      this._updatePillIconClass('.pill-ev .pill-icon', isEvCharging, 'bg-ev');
      this._updatePillIconClass('.pill-ev .pill-icon ha-icon', isEvCharging, 'color-ev');
    }
    
    if (this._config.autarky) {
      this._updateElement('.autarkie-value', `${Math.round(autarky)}%`);
    }

    // Update gauge values
    this._updateGauges();

    // Update flow visibility
    this._updateFlows();
  }
  
  // Helper to toggle active/inactive classes on pill icons
  _updatePillIconClass(selector, isActive, activeClass) {
    const el = this.shadowRoot.querySelector(selector);
    if (!el) return;
    
    const inactiveClass = 'bg-inactive';
    const inactiveColorClass = 'color-inactive';
    
    if (activeClass.startsWith('bg-')) {
      el.classList.toggle(activeClass, isActive);
      el.classList.toggle(inactiveClass, !isActive);
    } else if (activeClass.startsWith('color-')) {
      el.classList.toggle(activeClass, isActive);
      el.classList.toggle(inactiveColorClass, !isActive);
    }
  }

  _updateElement(selector, value) {
    const el = this.shadowRoot.querySelector(selector);
    if (el && el.textContent !== value) {
      el.textContent = value;
    }
  }

  _updateGauges() {
    // Use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0); // SOC is percentage, not power
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);

    // Update inlet gauge arcs
    this._updateGaugeArc('solar-gauge-arc', solarPower / this._config.max_solar_power);
    this._updateGaugeArc('grid-gauge-arc', Math.abs(gridPower) / this._config.max_grid_power);
    this._updateGaugeArc('consumption-gauge-arc', homeConsumption / this._config.max_consumption);

    // Update inlet gauge values
    this._updateElement('.inlet-gauge-solar .inlet-value', this._formatPower(solarPower));
    this._updateElement('.inlet-gauge-grid .inlet-value', this._formatPower(gridPower));
    this._updateElement('.inlet-gauge-consumption .inlet-value', this._formatPower(homeConsumption));
    
    // Update battery display
    this._updateElement('.battery-soc', `${Math.round(batterySoc)}%`);
  }

  _updateGaugeArc(id, percentage) {
    const arc = this.shadowRoot.querySelector(`#${id}`);
    if (arc) {
      const clampedPercentage = Math.min(Math.max(percentage, 0), 1);
      const r = 40;
      const c = 2 * Math.PI * r;
      const arcLength = c * 0.75; // 270 degrees
      const dashOffset = arcLength * (1 - clampedPercentage);
      arc.style.strokeDashoffset = dashOffset;
    }
  }

  _updateFlows() {
    // Use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batteryPower = this._getStateInWatts(this._config.battery_power, 0);
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);
    const evPower = this._getStateInWatts(this._config.ev_power, 0);

    const isSolarActive = solarPower > 50;
    const isGridImport = gridPower > 50;
    const isGridExport = gridPower < -50;
    const isBatteryCharging = batteryPower < -50;
    const isBatteryDischarging = batteryPower > 50;
    const isEvCharging = evPower > 50;
    const hasEV = !!this._config.ev_power;
    const hasBattery = !!this._config.battery_soc;

    // Show/hide flow groups based on state
    this._setFlowVisibility('flow-solar-home', isSolarActive && homeConsumption > 0);
    this._setFlowVisibility('flow-solar-battery', hasBattery && isSolarActive && isBatteryCharging);
    this._setFlowVisibility('flow-solar-grid', isSolarActive && isGridExport);
    this._setFlowVisibility('flow-grid-home', isGridImport);
    this._setFlowVisibility('flow-grid-battery', hasBattery && isGridImport && isBatteryCharging);
    this._setFlowVisibility('flow-battery-home', hasBattery && isBatteryDischarging);
    this._setFlowVisibility('flow-battery-grid', hasBattery && isBatteryDischarging && isGridExport);
    
    if (hasEV) {
      // EV is treated as sub-load of home - only one line from home to EV
      this._setFlowVisibility('flow-home-ev', isEvCharging);
    }
  }

  _setFlowVisibility(className, visible) {
    const el = this.shadowRoot.querySelector(`.${className}`);
    if (el) {
      el.style.display = visible ? 'block' : 'none';
    }
  }

  getCardSize() {
    return 5;
  }

  // Tell HA this card prefers full width
  getLayoutOptions() {
    return {
      grid_columns: 4,
      grid_min_columns: 3,
      grid_rows: 'auto'
    };
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
  }

  disconnectedCallback() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  // Open more-info dialog for an entity (shows history)
  _openMoreInfo(entityId) {
    if (!entityId || !this._hass) return;
    
    // Use CustomEvent (not Event) to properly pass detail through Shadow DOM boundaries
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: entityId }
    });
    this.dispatchEvent(event);
  }

  // Setup click event listeners for pills
  _setupEventListeners() {
    if (!this.shadowRoot) return;
    
    // Add click listeners to all pills with data-entity attribute
    this.shadowRoot.querySelectorAll('.pill[data-entity]').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = pill.getAttribute('data-entity');
        if (entityId) {
          this._openMoreInfo(entityId);
        }
      });
    });

    // Add click listener to house image (opens home consumption history)
    const houseImg = this.shadowRoot.querySelector('.house-img');
    if (houseImg && this._config.home_consumption) {
      houseImg.addEventListener('click', () => {
        this._openMoreInfo(this._config.home_consumption);
      });
    }

    // Add click listeners to gauges
    this.shadowRoot.querySelectorAll('.gauge[data-entity]').forEach(gauge => {
      gauge.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = gauge.getAttribute('data-entity');
        if (entityId) {
          this._openMoreInfo(entityId);
        }
      });
    });

    // Add click listener to autarkie badge (opens autarky history)
    const autarkieBadge = this.shadowRoot.querySelector('.autarkie-badge[data-entity]');
    if (autarkieBadge) {
      autarkieBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = autarkieBadge.getAttribute('data-entity');
        if (entityId) {
          this._openMoreInfo(entityId);
        }
      });
    }
  }

  // Helper to get entity state
  _getState(entityId, defaultVal = 0) {
    if (!entityId || !this._hass) return defaultVal;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return defaultVal;
    const val = parseFloat(stateObj.state);
    return isNaN(val) ? defaultVal : val;
  }

  // Helper to get power entity state normalized to Watts
  // Handles entities that report in kW (like evcc) and converts them to W
  _getStateInWatts(entityId, defaultVal = 0) {
    if (!entityId || !this._hass) return defaultVal;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return defaultVal;
    const val = parseFloat(stateObj.state);
    if (isNaN(val)) return defaultVal;
    
    // Check unit of measurement and convert kW to W if needed
    const unit = stateObj.attributes?.unit_of_measurement?.toLowerCase() || '';
    if (unit === 'kw') {
      return val * 1000; // Convert kW to W
    }
    return val;
  }

  // Helper to format power values
  _formatPower(watts) {
    const absWatts = Math.abs(watts);
    if (absWatts >= 1000) {
      return `${(absWatts / 1000).toFixed(1)} kW`;
    }
    return `${Math.round(absWatts)} W`;
  }

  // Render a circular gauge with inlet style (like prism-heat)
  _renderInletGauge(id, label, value, percentage, color, entityId = '') {
    const r = 36;
    const c = 2 * Math.PI * r;
    const arcLength = c * 0.75; // 270 degrees
    const strokeDashArray = `${arcLength} ${c}`;
    const clampedPercentage = Math.min(Math.max(percentage, 0), 1);
    const dashOffset = arcLength * (1 - clampedPercentage);

    return `
      <div class="inlet-gauge inlet-gauge-${id}" data-entity="${entityId}" title="Klicken für Historie">
        <div class="inlet-track"></div>
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="inlet-grad-${id}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:0.4" />
              <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
            </linearGradient>
          </defs>
          <!-- Background track -->
          <circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8" 
                  stroke-dasharray="${strokeDashArray}" stroke-linecap="round" 
                  transform="rotate(135, 50, 50)" />
          <!-- Active arc -->
          <circle id="${id}-gauge-arc" cx="50" cy="50" r="${r}" fill="none" stroke="url(#inlet-grad-${id})" stroke-width="8" 
                  stroke-dasharray="${strokeDashArray}" 
                  stroke-dashoffset="${dashOffset}" 
                  stroke-linecap="round"
                  transform="rotate(135, 50, 50)"
                  style="transition: stroke-dashoffset 0.5s ease;" />
        </svg>
        <div class="inlet-content">
          <div class="inlet-value">${value}</div>
          <div class="inlet-label">${label}</div>
        </div>
      </div>
    `;
  }

  // Generate animated flow path with real SVG filter glow (CodePen style)
  _renderFlow(path, color, active, reverse = false, className = '') {
    const direction = reverse ? 'reverse' : '';
    const display = active ? 'block' : 'none';
    
    return `
      <g class="flow-group ${className}" style="display: ${display};">
        <!-- Background track (pulsing, async) -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="0.4" stroke-linecap="round" class="flow-track" />
        
        <!-- Glowing animated beam with SVG filter -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="1.0" stroke-opacity="0.9" stroke-linecap="round" 
              class="flow-beam ${direction}" filter="url(#strokeGlow)" />
        
        <!-- Bright core with soft edges -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="0.4" stroke-opacity="0.85" stroke-linecap="round" 
              class="flow-beam ${direction}" filter="url(#softEdge)" />
      </g>
    `;
  }

  // Get weather icon based on conditions
  _getWeatherIcon(weatherData) {
    if (!weatherData.enabled) return 'mdi:weather-sunny';
    const { weatherType, isNight } = weatherData;
    if (isNight) {
      if (weatherType === 'cloudy') return 'mdi:weather-night-partly-cloudy';
      if (weatherType === 'rainy') return 'mdi:weather-rainy';
      if (weatherType === 'snowy') return 'mdi:weather-snowy';
      if (weatherType === 'foggy') return 'mdi:weather-fog';
      if (weatherType === 'stormy') return 'mdi:weather-lightning';
      return 'mdi:weather-night';
    } else {
      if (weatherType === 'cloudy') return 'mdi:weather-partly-cloudy';
      if (weatherType === 'rainy') return 'mdi:weather-rainy';
      if (weatherType === 'snowy') return 'mdi:weather-snowy';
      if (weatherType === 'foggy') return 'mdi:weather-fog';
      if (weatherType === 'stormy') return 'mdi:weather-lightning';
      if (weatherType === 'windy') return 'mdi:weather-windy';
      return 'mdi:weather-sunny';
    }
  }

  // Get weather label for display (supports EN/DE)
  _getWeatherLabel(weatherData) {
    if (!weatherData.enabled) return '';
    const lang = this._hass?.language || this._hass?.locale?.language || 'en';
    const isGerman = lang.startsWith('de');
    const labels = isGerman ? {
      'sunny': 'Sonnig', 'clear': 'Klar', 'cloudy': 'Bewölkt', 'rainy': 'Regen',
      'snowy': 'Schnee', 'foggy': 'Nebel', 'stormy': 'Gewitter', 'windy': 'Windig'
    } : {
      'sunny': 'Sunny', 'clear': 'Clear', 'cloudy': 'Cloudy', 'rainy': 'Rain',
      'snowy': 'Snow', 'foggy': 'Fog', 'stormy': 'Storm', 'windy': 'Windy'
    };
    return labels[weatherData.weatherType] || weatherData.weatherType;
  }

  // Get day/night label based on HA language
  _getDayNightLabel(isNight) {
    const lang = this._hass?.language || this._hass?.locale?.language || 'en';
    const isGerman = lang.startsWith('de');
    return isGerman ? (isNight ? 'Nacht' : 'Tag') : (isNight ? 'Night' : 'Day');
  }

  // Translate UI labels based on HA language (card display only, not editor)
  _t(key) {
    const lang = this._hass?.language || this._hass?.locale?.language || 'en';
    const isGerman = lang.startsWith('de');
    
    const translations = {
      // Pill labels
      'production': isGerman ? 'Erzeugung' : 'Production',
      'inactive': isGerman ? 'Inaktiv' : 'Inactive',
      'export': isGerman ? 'Einspeisung' : 'Export',
      'import': isGerman ? 'Bezug' : 'Import',
      'neutral': isGerman ? 'Neutral' : 'Neutral',
      'consumption': isGerman ? 'Verbrauch' : 'Consumption',
      'charging': isGerman ? 'Ladung' : 'Charging',
      'discharging': isGerman ? 'Entladung' : 'Discharging',
      'standby': isGerman ? 'Standby' : 'Standby',
      'idle': isGerman ? 'Inaktiv' : 'Idle',
      // Detail headers
      'grid': isGerman ? 'Netz' : 'Grid',
      'storage': isGerman ? 'Speicher' : 'Storage',
      'current': isGerman ? 'Aktuell' : 'Current',
      // Detail labels
      'power': isGerman ? 'Leistung' : 'Power',
      'autarky': isGerman ? 'Autarkie' : 'Autarky',
      // Module defaults
      'module': isGerman ? 'Modul' : 'Module',
      // Live indicator
      'live': 'LIVE'
    };
    
    return translations[key] || key;
  }

  // Get weather data from Home Assistant
  _getWeatherData() {
    if (!this._config.enable_weather_effects || !this._config.weather_entity || !this._hass) {
      return { enabled: false };
    }
    const weatherState = this._hass.states[this._config.weather_entity];
    const weatherCondition = (weatherState?.state || 'clear').toLowerCase();
    const sunState = this._hass.states['sun.sun'];
    const isNight = sunState?.state === 'below_horizon';
    const sunElevation = sunState?.attributes?.elevation || 0;
    const isSunrise = sunElevation > -10 && sunElevation < 10 && !isNight;
    const isSunset = sunElevation > -10 && sunElevation < 10 && isNight;

    let weatherType = 'clear';
    if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle') || weatherCondition.includes('shower')) weatherType = 'rainy';
    else if (weatherCondition.includes('snow') || weatherCondition.includes('sleet') || weatherCondition.includes('hail')) weatherType = 'snowy';
    else if (weatherCondition.includes('fog') || weatherCondition.includes('mist') || weatherCondition.includes('haze')) weatherType = 'foggy';
    else if (weatherCondition.includes('cloud') || weatherCondition.includes('overcast')) weatherType = 'cloudy';
    else if (weatherCondition.includes('clear') || weatherCondition.includes('sunny')) weatherType = 'sunny';
    else if (weatherCondition.includes('thunder') || weatherCondition.includes('lightning')) weatherType = 'stormy';
    else if (weatherCondition.includes('wind')) weatherType = 'windy';

    // Get cloud coverage from optional sensor (0-100%)
    let cloudCoverage = null;
    if (this._config.cloud_coverage_entity) {
      const cloudState = this._hass.states[this._config.cloud_coverage_entity];
      if (cloudState) {
        cloudCoverage = parseFloat(cloudState.state) || 0;
      }
    }

    return { enabled: true, weatherType, isNight, isSunrise, isSunset, condition: weatherCondition, cloudCoverage };
  }

  // Render weather effects HTML
  _renderWeatherEffects(weatherData) {
    if (!weatherData.enabled) return '';
    let html = '<div class="weather-container">';
    const { weatherType, isNight, isSunrise, isSunset } = weatherData;

    // Rain (optimized for mobile performance)
    if (weatherType === 'rainy' || weatherType === 'stormy') {
      const dropCount = weatherType === 'stormy' ? 25 : 15;
      for (let i = 0; i < dropCount; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 0.6 + Math.random() * 0.4;
        html += `<div class="rain-drop" style="left: ${left}%; animation-delay: ${delay}s; animation-duration: ${duration}s;"></div>`;
      }
    }

    // Snow (optimized for mobile performance)
    if (weatherType === 'snowy') {
      for (let i = 0; i < 25; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 6;
        const duration = 5 + Math.random() * 5;
        const size = 3 + Math.random() * 3;
        html += `<div class="snow-flake" style="left: ${left}%; animation-delay: ${delay}s; animation-duration: ${duration}s; width: ${size}px; height: ${size}px;"></div>`;
      }
    }

    // Fog
    if (weatherType === 'foggy') {
      html += `<div class="fog-layer fog-1"></div><div class="fog-layer fog-2"></div>`;
    }

    // Lightning
    if (weatherType === 'stormy') {
      html += `<div class="lightning"></div>`;
    }

    // Night: stars and moon
    if (isNight) {
      html += '<div class="stars-container">';
      for (let i = 0; i < 20; i++) {
        const left = Math.random() * 100;
        const top = Math.random() * 18;
        const size = 1 + Math.random() * 1.5;
        const delay = Math.random() * 3;
        const brightness = 0.2 + Math.random() * 0.3;
        html += `<div class="star" style="left: ${left}%; top: ${top}%; width: ${size}px; height: ${size}px; animation-delay: ${delay}s; opacity: ${brightness};"></div>`;
      }
      html += '</div>';
      if (weatherType !== 'foggy' && weatherType !== 'stormy') {
        html += `<div class="moon"><div class="moon-crater c1"></div><div class="moon-crater c2"></div><div class="moon-crater c3"></div></div>`;
      }
    } else if (weatherType === 'sunny' || weatherType === 'clear') {
      html += '<div class="sun-glow"></div>';
    }

    // Sunrise/Sunset gradient overlay
    if (isSunrise) {
      html += '<div class="sunrise-overlay"></div>';
    } else if (isSunset) {
      html += '<div class="sunset-overlay"></div>';
    }

    // Clouds based on cloud coverage or weather type
    const cloudCoverage = weatherData.cloudCoverage;
    const showClouds = (weatherType === 'cloudy' || (cloudCoverage !== null && cloudCoverage > 0)) && 
                       weatherType !== 'foggy' && !isNight;
    
    if (showClouds) {
      // Determine cloud count based on coverage (if available) or default to all
      let staticCount = 3;
      let movingCount = 4;
      
      if (cloudCoverage !== null) {
        if (cloudCoverage <= 20) { staticCount = 0; movingCount = 1; }
        else if (cloudCoverage <= 40) { staticCount = 1; movingCount = 1; }
        else if (cloudCoverage <= 55) { staticCount = 2; movingCount = 2; }
        else if (cloudCoverage <= 70) { staticCount = 2; movingCount = 3; }
        else if (cloudCoverage <= 85) { staticCount = 3; movingCount = 3; }
        else { staticCount = 3; movingCount = 4; }
      }
      
      // Static clouds
      if (staticCount >= 1) html += '<div class="cloud cloud-static cloud-static-1"></div>';
      if (staticCount >= 2) html += '<div class="cloud cloud-static cloud-static-2"></div>';
      if (staticCount >= 3) html += '<div class="cloud cloud-static cloud-static-3"></div>';
      // Moving clouds
      if (movingCount >= 1) html += '<div class="cloud cloud-moving cloud-1"></div>';
      if (movingCount >= 2) html += '<div class="cloud cloud-moving cloud-2"></div>';
      if (movingCount >= 3) html += '<div class="cloud cloud-moving cloud-3"></div>';
      if (movingCount >= 4) html += '<div class="cloud cloud-moving cloud-4"></div>';
    }

    html += '</div>';
    return html;
  }

  // Weather CSS styles
  _getWeatherStyles() {
    return `
      .weather-container { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; border-radius: 28px; }
      /* Rain Animation (optimized for mobile performance) */
      .rain-drop { position: absolute; width: 2px; height: 20px; background: linear-gradient(to bottom, transparent, rgba(174, 194, 224, 0.6)); top: 0; border-radius: 0 0 2px 2px; opacity: 0; will-change: transform, opacity; contain: layout style paint; animation: rain-fall linear infinite; }
      @keyframes rain-fall { 0% { transform: translateY(-30px); opacity: 0; } 5% { opacity: 0.7; } 95% { opacity: 0.7; } 100% { transform: translateY(100vh); opacity: 0; } }
      /* Snow Animation (optimized for mobile performance) */
      .snow-flake { position: absolute; background: rgba(255, 255, 255, 0.9); border-radius: 50%; top: 0; opacity: 0; will-change: transform, opacity; contain: layout style paint; animation: snow-fall linear infinite; box-shadow: 0 0 4px rgba(255, 255, 255, 0.5); }
      @keyframes snow-fall { 0% { transform: translateY(-10px) translateX(0); opacity: 0; } 5% { opacity: 0.7; } 50% { transform: translateY(50vh) translateX(20px); } 95% { opacity: 0.7; } 100% { transform: translateY(100vh) translateX(-20px); opacity: 0; } }
      .fog-layer { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(200, 210, 220, 0.15), transparent); animation: fog-drift linear infinite; filter: blur(30px); }
      .fog-1 { animation-duration: 25s; } .fog-2 { animation-duration: 35s; animation-direction: reverse; opacity: 0.5; }
      @keyframes fog-drift { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      .stars-container { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
      .star { position: absolute; background: radial-gradient(circle at center, rgba(255, 255, 255, 0.8), rgba(170, 204, 255, 0.5)); border-radius: 50%; animation: star-twinkle 4s ease-in-out infinite; box-shadow: 0 0 3px rgba(255, 255, 255, 0.3); }
      @keyframes star-twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.9); } 50% { opacity: 0.5; transform: scale(1.1); } }
      .moon { position: absolute; top: 60px; left: 75%; width: 55px; height: 55px; border-radius: 50%; background: linear-gradient(135deg, rgba(245, 245, 245, 0.5) 0%, rgba(232, 232, 232, 0.4) 50%, rgba(208, 208, 208, 0.3) 100%); box-shadow: 0 0 20px rgba(255, 255, 255, 0.2); z-index: 0; opacity: 0.65; }
      .moon-crater { position: absolute; background: radial-gradient(circle at 60% 40%, rgba(180, 180, 180, 0.3), rgba(160, 160, 160, 0.4)); border-radius: 50%; }
      .moon-crater.c1 { width: 14px; height: 14px; top: 8px; right: 10px; } .moon-crater.c2 { width: 8px; height: 8px; bottom: 12px; left: 12px; } .moon-crater.c3 { width: 7px; height: 7px; top: 20px; left: 8px; }
      .sun-glow { position: absolute; top: 30px; left: 35%; width: 150px; height: 150px; background: radial-gradient(circle at center, rgba(255, 200, 50, 0.2) 0%, rgba(255, 180, 50, 0.1) 30%, transparent 70%); filter: blur(25px); z-index: 0; animation: sun-pulse 10s ease-in-out infinite; }
      @keyframes sun-pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.05); opacity: 0.8; } }
      .lightning { position: absolute; inset: 0; background: rgba(255, 255, 255, 0); animation: lightning-flash 8s infinite; z-index: 0; pointer-events: none; }
      @keyframes lightning-flash { 0%, 89%, 91%, 93%, 100% { background: rgba(255, 255, 255, 0); } 90%, 92% { background: rgba(255, 255, 255, 0.3); } }
      .cloud { position: absolute; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 0%, rgba(220, 220, 230, 0.2) 100%); border-radius: 50px; filter: blur(3px); z-index: 0; }
      .cloud::before, .cloud::after { content: ''; position: absolute; background: inherit; border-radius: 50%; }
      .cloud-moving { animation: cloud-drift linear infinite; }
      .cloud-1 { width: 90px; height: 32px; top: 8%; left: -100px; animation-duration: 55s; opacity: 0.4; }
      .cloud-1::before { width: 45px; height: 45px; top: -22px; left: 18px; } .cloud-1::after { width: 52px; height: 52px; top: -26px; left: 42px; }
      .cloud-2 { width: 70px; height: 26px; top: 14%; left: -80px; animation-duration: 70s; animation-delay: -25s; opacity: 0.35; }
      .cloud-2::before { width: 35px; height: 35px; top: -17px; left: 12px; } .cloud-2::after { width: 42px; height: 42px; top: -21px; left: 32px; }
      .cloud-static { animation: cloud-float 8s ease-in-out infinite; }
      .cloud-static-1 { width: 75px; height: 28px; top: 12%; left: 30%; opacity: 0.35; }
      .cloud-static-1::before { width: 38px; height: 38px; top: -18px; left: 12px; } .cloud-static-1::after { width: 44px; height: 44px; top: -22px; left: 34px; }
      .cloud-static-2 { width: 60px; height: 22px; top: 7%; left: 55%; opacity: 0.3; animation-delay: -3s; }
      .cloud-static-2::before { width: 30px; height: 30px; top: -14px; left: 10px; } .cloud-static-2::after { width: 36px; height: 36px; top: -18px; left: 28px; }
      .cloud-static-3 { width: 52px; height: 18px; top: 16%; left: 42%; opacity: 0.28; animation-delay: -5s; }
      .cloud-static-3::before { width: 26px; height: 26px; top: -12px; left: 9px; } .cloud-static-3::after { width: 30px; height: 30px; top: -15px; left: 24px; }
      .cloud-3 { width: 80px; height: 28px; top: 5%; left: -95px; animation-duration: 75s; animation-delay: -30s; opacity: 0.3; }
      .cloud-3::before { width: 40px; height: 40px; top: -20px; left: 16px; } .cloud-3::after { width: 48px; height: 48px; top: -24px; left: 38px; }
      .cloud-4 { width: 65px; height: 24px; top: 18%; left: -85px; animation-duration: 62s; animation-delay: -18s; opacity: 0.32; }
      .cloud-4::before { width: 32px; height: 32px; top: -16px; left: 12px; } .cloud-4::after { width: 38px; height: 38px; top: -19px; left: 30px; }
      @keyframes cloud-drift { 0% { transform: translateX(0); } 100% { transform: translateX(calc(100vw + 200px)); } }
      @keyframes cloud-float { 0%, 100% { transform: translateX(0) translateY(0); } 25% { transform: translateX(5px) translateY(-3px); } 50% { transform: translateX(0) translateY(-5px); } 75% { transform: translateX(-5px) translateY(-2px); } }
      .house-img.night-mode { filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5)) brightness(0.55) saturate(0.85); transition: filter 1s ease; }
      .visual-container.night-mode { background: linear-gradient(to bottom, rgba(15, 23, 42, 0.2) 0%, transparent 40%); }
      /* Sunrise/Sunset Overlays */
      .sunrise-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(255, 150, 80, 0.08) 0%, rgba(255, 180, 100, 0.04) 30%, transparent 60%); pointer-events: none; z-index: 0; border-radius: 28px; }
      .sunset-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(255, 100, 50, 0.1) 0%, rgba(255, 80, 80, 0.05) 30%, transparent 60%); pointer-events: none; z-index: 0; border-radius: 28px; }
    `;
  }

  render() {
    if (!this.shadowRoot) return;

    // Get current values - use _getStateInWatts for power sensors to handle kW units (e.g. from evcc)
    const solarPower = this._getStateInWatts(this._config.solar_power, 0);
    const gridPower = this._getStateInWatts(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0); // SOC is percentage, not power
    const batteryPower = this._getStateInWatts(this._config.battery_power, 0);
    const homeConsumption = this._getStateInWatts(this._config.home_consumption, 0);
    const evPower = this._getStateInWatts(this._config.ev_power, 0);
    const autarky = this._getState(this._config.autarky, 0); // Autarky is percentage
    
    const hasEV = !!this._config.ev_power;
    const hasAutarky = !!this._config.autarky;
    const hasBattery = !!this._config.battery_soc;
    const houseImg = this._config.image;
    
    // Get weather data
    const weatherData = this._getWeatherData();

    // Determine flow states
    const isSolarActive = solarPower > 50;
    const isGridImport = gridPower > 50;
    const isGridExport = gridPower < -50;
    const isBatteryCharging = batteryPower < -50;
    const isBatteryDischarging = batteryPower > 50;
    const isEvCharging = evPower > 50;

    // Battery icon based on SOC
    let batteryIcon = "mdi:battery";
    if (batterySoc >= 90) batteryIcon = "mdi:battery";
    else if (batterySoc >= 70) batteryIcon = "mdi:battery-80";
    else if (batterySoc >= 50) batteryIcon = "mdi:battery-60";
    else if (batterySoc >= 30) batteryIcon = "mdi:battery-40";
    else if (batterySoc >= 10) batteryIcon = "mdi:battery-20";
    else batteryIcon = "mdi:battery-outline";
    
    if (isBatteryCharging) batteryIcon = "mdi:battery-charging";

    // Get pill positions and scale from config (with defaults)
    const pillPos = {
      solar: { x: this._config.solar_pill_left, y: this._config.solar_pill_top, scale: this._config.solar_pill_scale },
      grid: { x: this._config.grid_pill_left, y: this._config.grid_pill_top, scale: this._config.grid_pill_scale },
      home: { x: this._config.home_pill_left, y: this._config.home_pill_top, scale: this._config.home_pill_scale },
      battery: { x: this._config.battery_pill_left, y: this._config.battery_pill_top, scale: this._config.battery_pill_scale },
      ev: { x: this._config.ev_pill_left, y: this._config.ev_pill_top, scale: this._config.ev_pill_scale }
    };

    // Helper to calculate control point for smooth curves
    const midPoint = (p1, p2) => ({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    });

    // SVG Paths for energy flows (dynamically calculated based on pill positions)
    const paths = {
      solarToHome: `M ${pillPos.solar.x} ${pillPos.solar.y} Q ${midPoint(pillPos.solar, pillPos.home).x} ${midPoint(pillPos.solar, pillPos.home).y} ${pillPos.home.x} ${pillPos.home.y}`,
      solarToBattery: `M ${pillPos.solar.x} ${pillPos.solar.y} Q ${midPoint(pillPos.solar, pillPos.battery).x} ${midPoint(pillPos.solar, pillPos.battery).y} ${pillPos.battery.x} ${pillPos.battery.y}`,
      solarToGrid: `M ${pillPos.solar.x} ${pillPos.solar.y} Q ${midPoint(pillPos.solar, pillPos.grid).x} ${midPoint(pillPos.solar, pillPos.grid).y} ${pillPos.grid.x} ${pillPos.grid.y}`,
      
      gridToHome: `M ${pillPos.grid.x} ${pillPos.grid.y} Q ${midPoint(pillPos.grid, pillPos.home).x} ${midPoint(pillPos.grid, pillPos.home).y} ${pillPos.home.x} ${pillPos.home.y}`,
      gridToBattery: `M ${pillPos.grid.x} ${pillPos.grid.y} Q ${midPoint(pillPos.grid, pillPos.battery).x} ${midPoint(pillPos.grid, pillPos.battery).y} ${pillPos.battery.x} ${pillPos.battery.y}`,
      
      batteryToHome: `M ${pillPos.battery.x} ${pillPos.battery.y} Q ${midPoint(pillPos.battery, pillPos.home).x} ${midPoint(pillPos.battery, pillPos.home).y} ${pillPos.home.x} ${pillPos.home.y}`,
      batteryToGrid: `M ${pillPos.battery.x} ${pillPos.battery.y} Q ${midPoint(pillPos.battery, pillPos.grid).x} ${midPoint(pillPos.battery, pillPos.grid).y} ${pillPos.grid.x} ${pillPos.grid.y}`,
      
      // EV flow from home (EV is sub-load of home)
      homeToEv: `M ${pillPos.home.x} ${pillPos.home.y} Q ${midPoint(pillPos.home, pillPos.ev).x} ${midPoint(pillPos.home, pillPos.ev).y} ${pillPos.ev.x} ${pillPos.ev.y}`
    };

    // Colors
    const colors = {
      solar: '#F59E0B',
      grid: '#3B82F6',
      battery: '#10B981',
      home: '#8B5CF6',
      ev: '#EC4899'
    };

    this.shadowRoot.innerHTML = `
      <style>
        .card {
          position: relative;
          width: 100%;
          min-width: 600px;
          border-radius: 28px;
          display: flex;
          flex-direction: row;
          overflow: hidden;
          background: rgba(30, 32, 36, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.3);
          color: white;
          box-sizing: border-box;
          user-select: none;
          height: calc(100vh - 80px);
          max-height: 850px;
          min-height: 350px;
        }
        
        :host {
          display: block;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          /* Force card to use full width in dashboard */
          --ha-card-border-radius: 28px;
        }
        
        .noise {
          position: absolute;
          inset: 0;
          opacity: 0.02;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }

        /* Main Content (House Area) */
        .main-content {
          position: relative;
          flex: 1;
          min-width: 380px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Header - above weather animations */
        .header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 24px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 50;
          background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        
        .icon-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colors.solar};
          border: 1px solid rgba(245, 158, 11, 0.25);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.2), inset 0 0 10px rgba(245, 158, 11, 0.1);
        }
        
        .icon-circle ha-icon {
          --mdc-icon-size: 26px;
        }
        
        .title-group h2 {
          font-size: 1.3rem;
          font-weight: 600;
          line-height: 1.2;
          margin: 0;
          color: rgba(255, 255, 255, 0.95);
        }
        
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }
        
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 8px #22c55e;
        }
        
        .live-text {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #4ade80;
        }
        
        .autarkie-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px 10px 10px;
          border-radius: 999px;
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.6),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03),
            0 6px 12px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
        }
        
        .autarkie-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(74, 222, 128, 0.15);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.4),
            inset -1px -1px 2px rgba(255, 255, 255, 0.05),
            0 0 15px rgba(74, 222, 128, 0.3);
        }
        
        .autarkie-icon ha-icon {
          --mdc-icon-size: 20px;
          color: #4ade80;
        }
        
        .autarkie-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .autarkie-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          line-height: 1;
        }
        
        .autarkie-label {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.5);
        }
        

        /* Visual Container - Larger House */
        .visual-container {
          position: relative;
          width: 100%;
          height: 100%;
          flex: 1;
          min-width: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          padding: 60px 0 0 0;
          box-sizing: border-box;
        }
        
        /* Wrapper for image and pills - pills are positioned relative to this */
        .house-wrapper {
          position: relative;
          width: 120%;
          max-width: 900px;
          margin-left: -10%;
        }
        
        /* When no details panel - house can be larger */
        .card:not(:has(.details-panel)) .house-wrapper {
          width: 100%;
          max-width: 1100px;
          margin-left: 0;
        }
        
        .card:not(:has(.details-panel)) .main-content {
          align-items: center;
          justify-content: center;
        }
        
        .card:not(:has(.details-panel)) .visual-container {
          max-width: 1000px;
        }
        
        .house-img {
          width: 100%;
          height: auto;
          display: block;
          z-index: 0;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5));
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.3s ease;
        }
        
        .house-img:hover {
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5)) brightness(1.05);
        }
        
        .bottom-gradient {
          position: absolute;
          inset: auto 0 0 0;
          height: 4rem;
          background: linear-gradient(to top, rgba(30, 32, 36, 1), transparent);
          pointer-events: none;
          z-index: 5;
        }

        /* SVG Overlay */
        .svg-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        
        @keyframes flow-animation {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes flow-animation-reverse {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 100; }
        }
        
        @keyframes track-pulse {
          0%, 100% { stroke-opacity: 0.18; }
          50% { stroke-opacity: 0.06; }
        }
        
        .flow-track {
          animation: track-pulse 2.2s ease-in-out infinite;
        }
        
        .flow-beam {
          stroke-dasharray: 25 75;
          animation: flow-animation 3s linear infinite;
        }
        
        .flow-beam.reverse {
          stroke-dasharray: 25 75;
          animation: flow-animation-reverse 3s linear infinite;
        }

        /* Data Pills - Fixed to image positions */
        .pill {
          --pill-scale: 1;
          position: absolute;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 999px;
          padding: 10px 16px 10px 10px;
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.6),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03),
            0 6px 12px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 20;
          transform: translate(-50%, -50%) scale(var(--pill-scale));
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        
        .pill:hover {
          transform: translate(-50%, -50%) scale(calc(var(--pill-scale) * 1.05));
        }
        
        .pill[data-entity] {
          cursor: pointer;
        }
        
        .pill[data-entity]:active {
          transform: translate(-50%, -50%) scale(calc(var(--pill-scale) * 0.97));
        }
        
        .pill-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .pill-icon ha-icon {
          --mdc-icon-size: 22px;
        }
        
        .pill-content {
          display: flex;
          flex-direction: column;
          line-height: 1;
          gap: 3px;
        }
        
        .pill-val {
          font-size: 1.1rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .pill-label {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
        }

        /* Pill Icon Colors */
        .bg-solar {
          background: rgba(245, 158, 11, 0.15);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
        }
        .color-solar { color: ${colors.solar}; }
        
        .bg-grid {
          background: rgba(59, 130, 246, 0.15);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
        }
        .color-grid { color: ${colors.grid}; }
        
        .bg-battery {
          background: rgba(16, 185, 129, 0.15);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }
        .color-battery { color: ${colors.battery}; }
        
        .bg-home {
          background: rgba(139, 92, 246, 0.15);
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .color-home { color: ${colors.home}; }
        
        .bg-ev {
          background: rgba(236, 72, 153, 0.15);
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.3);
        }
        .color-ev { color: ${colors.ev}; }
        
        .bg-inactive {
          background: rgba(255, 255, 255, 0.03);
          box-shadow: none;
        }
        .color-inactive { color: rgba(255, 255, 255, 0.35); }

        /* Details Panel (Right Side) - Responsive */
        .details-panel {
          width: clamp(280px, 25vw, 400px);
          min-width: 280px;
          flex-shrink: 0;
          background: rgba(0, 0, 0, 0.35);
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          padding: clamp(12px, 1.5vw, 20px);
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 1vw, 14px);
          overflow-y: auto;
        }
        
        .details-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        
        .details-title {
          /* Neumorphic Raised Chip */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          align-self: center;
          padding: 5px 12px;
          margin-bottom: 8px;
          
          background: linear-gradient(145deg, #2d3038, #22252b);
          border-radius: 20px;
          box-shadow: 
            3px 3px 6px rgba(0, 0, 0, 0.4),
            -2px -2px 4px rgba(255, 255, 255, 0.03),
            inset 1px 1px 2px rgba(255, 255, 255, 0.05);
          
          font-size: clamp(0.55rem, 0.7vw, 0.65rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
          
          transition: all 0.2s ease;
        }
        
        .details-title:hover {
          box-shadow: 
            4px 4px 8px rgba(0, 0, 0, 0.5),
            -3px -3px 6px rgba(255, 255, 255, 0.04),
            inset 1px 1px 2px rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.8);
        }

        /* Inlet Gauge Styles (like prism-heat) - Responsive */
        .inlet-gauge {
          position: relative;
          width: clamp(100px, 12vw, 160px);
          height: clamp(100px, 12vw, 160px);
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        .inlet-gauge:hover {
          transform: scale(1.05);
        }
        
        .inlet-gauge:active {
          transform: scale(0.98);
        }
        
        .inlet-gauge .inlet-track {
          position: absolute;
          inset: 8%;
          border-radius: 50%;
          background: rgba(20, 20, 20, 0.8);
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.7), inset -1px -1px 2px rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          border-top: 1px solid rgba(0,0,0,0.3);
        }
        
        .inlet-gauge svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform: rotate(0deg);
        }
        
        .inlet-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          width: 65%;
          z-index: 2;
        }
        
        .inlet-value {
          font-size: clamp(0.9rem, 1.2vw, 1.3rem);
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          line-height: 1.1;
        }
        
        .inlet-label {
          font-size: clamp(0.55rem, 0.7vw, 0.75rem);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
        }
        
        /* Two gauges side by side */
        .gauges-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          width: 100%;
        }
        
        /* Solar Modules List */
        .modules-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        
        .module-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: clamp(8px, 1vw, 12px) clamp(10px, 1.2vw, 16px);
          background: rgba(20, 20, 20, 0.6);
          border-radius: 12px;
          box-shadow: inset 1px 1px 3px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.03);
          border: 1px solid rgba(0,0,0,0.2);
        }
        
        .module-name {
          font-size: clamp(0.7rem, 0.85vw, 0.9rem);
          color: rgba(255, 255, 255, 0.5);
        }
        
        .module-value {
          font-size: clamp(0.8rem, 0.95vw, 1rem);
          font-weight: 700;
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          color: ${colors.solar};
        }

        /* Battery Display */
        .battery-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 16px;
          background: rgba(20, 20, 20, 0.6);
          border-radius: 16px;
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.03);
          border: 1px solid rgba(0,0,0,0.2);
          width: 100%;
          box-sizing: border-box;
        }
        
        .battery-icon-container {
          position: relative;
          width: clamp(50px, 5vw, 70px);
          height: clamp(70px, 7vw, 95px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .battery-icon-container ha-icon {
          --mdc-icon-size: clamp(48px, 5vw, 72px);
          color: ${colors.battery};
          filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.4));
        }
        
        .battery-soc {
          font-size: clamp(1.2rem, 1.5vw, 1.8rem);
          font-weight: 700;
          color: ${colors.battery};
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .battery-info {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 0.5vw, 8px);
          width: 100%;
        }
        
        .battery-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: clamp(0.75rem, 0.9vw, 0.95rem);
        }
        
        .battery-label {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .battery-value {
          font-weight: 600;
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .battery-value.charging { color: ${colors.battery}; }
        .battery-value.discharging { color: #ef4444; }
        .battery-value.standby { color: rgba(255, 255, 255, 0.6); }

        ha-icon {
          --mdc-icon-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Responsive Media Queries */
        @media (max-width: 1200px) {
          .card {
            min-width: 550px;
          }
          .house-wrapper {
            width: 115%;
            margin-left: -7%;
          }
        }

        @media (max-width: 900px) {
          .card {
            flex-direction: column;
            min-width: unset;
            height: auto;
            max-height: unset;
          }
          .main-content {
            min-width: unset;
            height: 60vh;
            min-height: 400px;
          }
          .house-wrapper {
            width: 100%;
            margin-left: 0;
          }
          .details-panel {
            width: 100%;
            min-width: unset;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
          }
          .gauges-row {
            justify-content: center;
          }
        }

        @media (max-height: 600px) {
          .card {
            height: calc(100vh - 40px);
            min-height: 300px;
          }
          .inlet-gauge {
            width: 90px;
            height: 90px;
          }
        }
        
        /* Weather status text in header */
        .weather-separator {
          margin: 0 6px;
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.65rem;
        }
        .weather-status {
          font-size: 0.65rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
        }
        
        ${this._getWeatherStyles()}
      </style>

      <div class="card">
        <div class="noise"></div>
        
        <!-- Main Content (House Visualization) -->
        <div class="main-content">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="icon-circle">
                <ha-icon icon="mdi:solar-power-variant"></ha-icon>
              </div>
              <div class="title-group">
                <h2>${this._config.name}</h2>
                <div class="live-indicator">
                  <div class="dot"></div>
                  <span class="live-text">Live</span>
                  ${weatherData.enabled ? `
                  <span class="weather-separator">|</span>
                  <span class="weather-status">${this._getDayNightLabel(weatherData.isNight)} • ${this._getWeatherLabel(weatherData)}</span>
                  ` : ''}
                </div>
              </div>
            </div>
            ${hasAutarky ? `
            <div class="autarkie-badge" data-entity="${this._config.autarky}" title="Klicken für Historie">
              <div class="autarkie-icon">
                <ha-icon icon="mdi:leaf"></ha-icon>
              </div>
              <div class="autarkie-content">
                <span class="autarkie-value">${Math.round(autarky)}%</span>
                <span class="autarkie-label">${this._t('autarky')}</span>
              </div>
            </div>
            ` : ''}
          </div>

          <!-- Visual Container -->
          <div class="visual-container ${weatherData.enabled && weatherData.isNight ? 'night-mode' : ''}">
            ${weatherData.enabled ? this._renderWeatherEffects(weatherData) : ''}
            <!-- House Wrapper - Pills are positioned relative to this -->
            <div class="house-wrapper">
              <img src="${houseImg}" class="house-img ${weatherData.enabled && weatherData.isNight ? 'night-mode' : ''}" alt="Energy Home" />

              <!-- SVG Flows -->
              <svg class="svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <!-- Stroke Glow Filter (optimized: 2 blur instead of 3, ~39% faster) -->
                  <filter id="strokeGlow" x="-100%" y="-100%" width="300%" height="300%" filterUnits="userSpaceOnUse">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.7" result="softCore" />
                    <feColorMatrix in="softCore" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" result="core" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="core" />
                      <feMergeNode in="core" />
                      <feMergeNode in="core" />
                    </feMerge>
                  </filter>
                  <!-- Soft Core Filter (minimal blur for smooth edges) -->
                  <filter id="softEdge" x="-50%" y="-50%" width="200%" height="200%" filterUnits="userSpaceOnUse">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.25" />
                  </filter>
                </defs>
                
                <!-- Solar Flows -->
                ${this._renderFlow(paths.solarToHome, colors.solar, isSolarActive && homeConsumption > 0, false, 'flow-solar-home')}
                ${hasBattery ? this._renderFlow(paths.solarToBattery, colors.solar, isSolarActive && isBatteryCharging, false, 'flow-solar-battery') : ''}
                ${this._renderFlow(paths.solarToGrid, colors.solar, isSolarActive && isGridExport, false, 'flow-solar-grid')}

                <!-- Grid Flows -->
                ${this._renderFlow(paths.gridToHome, colors.grid, isGridImport, false, 'flow-grid-home')}
                ${hasBattery ? this._renderFlow(paths.gridToBattery, colors.grid, isGridImport && isBatteryCharging, false, 'flow-grid-battery') : ''}

                <!-- Battery Flows -->
                ${hasBattery ? this._renderFlow(paths.batteryToHome, colors.battery, isBatteryDischarging, false, 'flow-battery-home') : ''}
                ${hasBattery ? this._renderFlow(paths.batteryToGrid, colors.battery, isBatteryDischarging && isGridExport, false, 'flow-battery-grid') : ''}

                <!-- EV Flow (sub-load of home) -->
                ${hasEV ? this._renderFlow(paths.homeToEv, colors.ev, isEvCharging, false, 'flow-home-ev') : ''}
              </svg>

              <!-- Solar Pill (Top - over roof) -->
              <div class="pill pill-solar" style="top: ${pillPos.solar.y}%; left: ${pillPos.solar.x}%; --pill-scale: ${pillPos.solar.scale};" data-entity="${this._config.solar_power}">
                <div class="pill-icon ${isSolarActive ? 'bg-solar' : 'bg-inactive'}">
                  <ha-icon icon="mdi:solar-power" class="${isSolarActive ? 'color-solar' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${this._formatPower(solarPower)}</span>
                  <span class="pill-label">${isSolarActive ? this._t('production') : this._t('inactive')}</span>
                </div>
              </div>

              <!-- Grid Pill (on power pole) -->
              <div class="pill pill-grid" style="top: ${pillPos.grid.y}%; left: ${pillPos.grid.x}%; --pill-scale: ${pillPos.grid.scale};" data-entity="${this._config.grid_power}">
                <div class="pill-icon ${isGridImport || isGridExport ? 'bg-grid' : 'bg-inactive'}">
                  <ha-icon icon="mdi:transmission-tower" class="${isGridImport || isGridExport ? 'color-grid' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${this._formatPower(gridPower)}</span>
                  <span class="pill-label">${isGridExport ? this._t('export') : isGridImport ? this._t('import') : this._t('neutral')}</span>
                </div>
              </div>

              <!-- Home Pill (Center-right - on house) -->
              <div class="pill pill-home" style="top: ${pillPos.home.y}%; left: ${pillPos.home.x}%; --pill-scale: ${pillPos.home.scale};" data-entity="${this._config.home_consumption}">
                <div class="pill-icon bg-home">
                  <ha-icon icon="mdi:home-lightning-bolt" class="color-home"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${this._formatPower(homeConsumption)}</span>
                  <span class="pill-label">${this._t('consumption')}</span>
                </div>
              </div>

              <!-- Battery Pill (Right - battery storage) -->
              ${hasBattery ? `
              <div class="pill pill-battery" style="top: ${pillPos.battery.y}%; left: ${pillPos.battery.x}%; --pill-scale: ${pillPos.battery.scale};" data-entity="${this._config.battery_soc}">
                <div class="pill-icon ${isBatteryCharging || isBatteryDischarging ? 'bg-battery' : 'bg-inactive'}">
                  <ha-icon icon="${batteryIcon}" class="${isBatteryCharging || isBatteryDischarging ? 'color-battery' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${Math.round(batterySoc)}%</span>
                  <span class="pill-label">${isBatteryCharging ? this._t('charging') : isBatteryDischarging ? this._t('discharging') : this._t('standby')}</span>
                </div>
              </div>
              ` : ''}

              <!-- EV Pill (Bottom Left - carport) -->
              ${hasEV ? `
              <div class="pill pill-ev" style="top: ${pillPos.ev.y}%; left: ${pillPos.ev.x}%; --pill-scale: ${pillPos.ev.scale};" data-entity="${this._config.ev_power}">
                <div class="pill-icon ${isEvCharging ? 'bg-ev' : 'bg-inactive'}">
                  <ha-icon icon="mdi:car-electric" class="${isEvCharging ? 'color-ev' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${isEvCharging ? this._formatPower(evPower) : this._t('idle')}</span>
                  <span class="pill-label">EV</span>
                </div>
              </div>
              ` : ''}
            </div>
            <div class="bottom-gradient"></div>
          </div>
        </div>

        <!-- Details Panel (Right Side) - shown based on config -->
        ${this._config.show_details ? `
        <div class="details-panel">
          <!-- Solar Section -->
          <div class="details-section">
            <div class="details-title">Solar</div>
            ${this._renderInletGauge('solar', this._t('production'), this._formatPower(solarPower), solarPower / this._config.max_solar_power, colors.solar, this._config.solar_power)}
          </div>
          
          <!-- Solar Modules (if configured) -->
          ${this._renderSolarModules()}
          
          <!-- Grid & Consumption Row -->
          <div class="gauges-row">
            ${this._renderInletGauge('grid', isGridExport ? this._t('export') : this._t('import'), this._formatPower(gridPower), Math.abs(gridPower) / this._config.max_grid_power, isGridExport ? colors.battery : '#ef4444', this._config.grid_power)}
            ${this._renderInletGauge('consumption', this._t('consumption'), this._formatPower(homeConsumption), homeConsumption / this._config.max_consumption, colors.home, this._config.home_consumption)}
          </div>
          
          <!-- Battery Section with Icon -->
          ${hasBattery ? `
          <div class="details-section">
            <div class="details-title">${this._t('storage')}</div>
            <div class="battery-display" data-entity="${this._config.battery_soc}">
              <div class="battery-icon-container">
                <ha-icon icon="${batteryIcon}"></ha-icon>
              </div>
              <div class="battery-soc">${Math.round(batterySoc)}%</div>
              <div class="battery-info">
                <div class="battery-row">
                  <span class="battery-label">${this._t('power')}</span>
                  <span class="battery-value ${isBatteryCharging ? 'charging' : isBatteryDischarging ? 'discharging' : 'standby'}">
                    ${isBatteryCharging ? '↓ ' : isBatteryDischarging ? '↑ ' : ''}${this._formatPower(Math.abs(batteryPower))}
                  </span>
                </div>
                <div class="battery-row">
                  <span class="battery-label">Status</span>
                  <span class="battery-value ${isBatteryCharging ? 'charging' : isBatteryDischarging ? 'discharging' : 'standby'}">
                    ${isBatteryCharging ? this._t('charging') : isBatteryDischarging ? this._t('discharging') : this._t('standby')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          ` : ''}
          
          ${hasEV ? `
          <!-- EV Section -->
          <div class="details-section">
            <div class="details-title">E-Auto</div>
            <div class="battery-display" data-entity="${this._config.ev_power}" style="cursor: pointer;">
              <div class="battery-icon-container">
                <ha-icon icon="mdi:car-electric" style="--mdc-icon-size: clamp(40px, 4vw, 56px); color: ${isEvCharging ? colors.ev : 'rgba(255,255,255,0.3)'}; filter: ${isEvCharging ? 'drop-shadow(0 0 10px rgba(236, 72, 153, 0.4))' : 'none'};"></ha-icon>
              </div>
              <div class="battery-soc" style="color: ${isEvCharging ? colors.ev : 'rgba(255,255,255,0.5)'};">${isEvCharging ? this._formatPower(evPower) : '—'}</div>
              <div class="battery-info">
                <div class="battery-row">
                  <span class="battery-label">Status</span>
                  <span class="battery-value" style="color: ${isEvCharging ? colors.ev : 'rgba(255,255,255,0.5)'};">
                    ${isEvCharging ? this._t('charging') : this._t('idle')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    `;
    
    // Setup click event listeners after rendering
    this._setupEventListeners();
  }

  // Render solar modules if configured
  _renderSolarModules() {
    const modules = [];
    if (this._config.solar_module1) {
      modules.push({
        entity: this._config.solar_module1,
        name: this._config.solar_module1_name || "Module 1"
      });
    }
    if (this._config.solar_module2) {
      modules.push({
        entity: this._config.solar_module2,
        name: this._config.solar_module2_name || "Module 2"
      });
    }
    if (this._config.solar_module3) {
      modules.push({
        entity: this._config.solar_module3,
        name: this._config.solar_module3_name || "Module 3"
      });
    }
    if (this._config.solar_module4) {
      modules.push({
        entity: this._config.solar_module4,
        name: this._config.solar_module4_name || "Module 4"
      });
    }

    if (modules.length === 0) return '';

    let html = `<div class="modules-list">`;

    modules.forEach(mod => {
      const power = this._getStateInWatts(mod.entity, 0);
      html += `
        <div class="module-item">
          <span class="module-name">${mod.name}</span>
          <span class="module-value">${this._formatPower(power)}</span>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }
}

// Register card component
customElements.define('prism-energy-horizontal', PrismEnergyHorizontalCard);

// Register with HACS / HA card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-energy-horizontal",
  name: "Prism Energy Horizontal",
  preview: true,
  description: "A glassmorphism energy flow card optimized for tablets with side panel details"
});

console.info(
  `%c PRISM-ENERGY-HORIZONTAL %c v1.2.3 %c Weather Performance Optimized `,
  'background: #F59E0B; color: black; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'background: #1e2024; color: white; font-weight: bold; padding: 2px 6px;',
  'background: #3B82F6; color: white; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;'
);
