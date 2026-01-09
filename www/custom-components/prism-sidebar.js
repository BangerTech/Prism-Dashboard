class PrismSidebarCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.timer = null;
        this.cameraTimer = null;
        this.hasRendered = false;
        this.currentCameraIndex = 0;
        this.cameraEntities = [];
        this.forecastSubscriber = null; // For weather forecast subscription
        this._popupCards = []; // Store references to custom cards in popup for hass updates
    }

    // Format energy value with max 2 decimal places
    _formatEnergyValue(value, unit) {
        if (value === undefined || value === null || value === 'unavailable' || value === 'unknown') {
            return '-- ' + (unit || 'kW');
        }
        const num = parseFloat(value);
        if (isNaN(num)) {
            return '-- ' + (unit || 'kW');
        }
        // Round to max 2 decimal places, remove trailing zeros
        const formatted = num.toFixed(2).replace(/\.?0+$/, '');
        return `${formatted} ${unit || 'kW'}`;
    }

    static getStubConfig() {
        return {
            camera_entity: "camera.example",
            camera_entity_2: "",
            camera_entity_3: "",
            rotation_interval: 10,
            temperature_entity: "sensor.outdoor_temperature",
            weather_entity: "weather.example",
            forecast_days: 3,
            grid_entity: "sensor.example",
            solar_entity: "sensor.example",
            home_entity: "sensor.example",
            calendar_entity: "calendar.example"
        };
    }

    static getConfigForm() {
        return {
            schema: [
                {
                    name: "width",
                    label: "Sidebar width (optional, e.g. 350px)",
                    selector: { text: {} }
                },
                // Camera Section
                {
                    type: 'expandable',
                    name: '',
                    title: '📷 Camera',
                    schema: [
                        {
                            name: "camera_entity",
                            label: "Camera entity",
                            selector: { entity: { domain: "camera" } }
                        },
                        {
                            name: "camera_entity_2",
                            label: "Camera entity 2",
                            selector: { entity: { domain: "camera" } }
                        },
                        {
                            name: "camera_entity_3",
                            label: "Camera entity 3",
                            selector: { entity: { domain: "camera" } }
                        },
                        {
                            name: "rotation_interval",
                            label: "Rotation interval",
                            selector: { number: { min: 3, max: 60, step: 1, unit_of_measurement: "s" } },
                            default: 10
                        }
                    ]
                },
                // Calendar Section
                {
                    type: 'expandable',
                    name: '',
                    title: '📅 Calendar',
                    schema: [
                        {
                            name: "calendar_entity",
                            label: "Calendar entity",
                            selector: { entity: { domain: "calendar" } }
                        },
                        {
                            name: "use_custom_popup_calendar",
                            label: "Use Custom Popup",
                            selector: { boolean: {} }
                        },
                        {
                            name: "popup_cards_calendar",
                            label: "Custom Popup Cards (YAML - array of card configs)",
                            selector: { object: {} }
                        }
                    ]
                },
                // Weather Section
                {
                    type: 'expandable',
                    name: '',
                    title: '🌤️ Weather',
                    schema: [
                        {
                            name: "temperature_entity",
                            label: "Temperature entity",
                            selector: { entity: { domain: "sensor" } }
                        },
                        {
                            name: "temperature_title",
                            label: "Temperature section title",
                            selector: { text: {} }
                        },
                        {
                            name: "weather_entity",
                            label: "Weather entity",
                            selector: { entity: { domain: "weather" } }
                        },
                        {
                            name: "forecast_days",
                            label: "Forecast days",
                            selector: { number: { min: 1, max: 7, step: 1, unit_of_measurement: "days" } },
                            default: 3
                        },
                        {
                            name: "graph_hours",
                            label: "Graph hours to show (requires mini-graph-card from HACS)",
                            selector: { number: { min: 1, max: 168, step: 1, unit_of_measurement: "h" } },
                            default: 24
                        },
                        {
                            name: "use_custom_popup_weather",
                            label: "Use Custom Popup",
                            selector: { boolean: {} }
                        },
                        {
                            name: "popup_cards_weather",
                            label: "Custom Popup Cards (YAML - array of card configs)",
                            selector: { object: {} }
                        }
                    ]
                },
                // Energy Section
                {
                    type: 'expandable',
                    name: '',
                    title: '⚡ Energy',
                    schema: [
                        {
                            name: "grid_entity",
                            label: "Grid entity",
                            selector: { entity: {} }
                        },
                        {
                            name: "solar_entity",
                            label: "Solar entity",
                            selector: { entity: {} }
                        },
                        {
                            name: "home_entity",
                            label: "Home entity",
                            selector: { entity: {} }
                        },
                        {
                            name: "use_custom_popup_energy",
                            label: "Use Custom Popup",
                            selector: { boolean: {} }
                        },
                        {
                            name: "popup_cards_energy",
                            label: "Custom Popup Cards (YAML - array of card configs)",
                            selector: { object: {} }
                        }
                    ]
                },
                // Custom Card Section
                {
                    type: 'expandable',
                    name: '',
                    title: '🎴 Custom Card',
                    schema: [
                        {
                            name: "custom_card",
                            label: "Custom card config (YAML)",
                            selector: { object: {} }
                        },
                        {
                            name: "use_custom_popup_card",
                            label: "Use Custom Popup (opens popup when clicked)",
                            selector: { boolean: {} }
                        },
                        {
                            name: "popup_cards_custom",
                            label: "Custom Popup Cards (YAML - array of card configs)",
                            selector: { object: {} }
                        }
                    ]
                }
            ]
        };
    }

    setConfig(config) {
        // Store previous config values to detect changes
        const prevWeatherEntity = this.weatherEntity;
        const prevForecastDays = this.forecastDays;
        const prevTemperatureEntity = this.temperatureEntity;
        
        this.config = { ...config };
        // Default entities if not provided
        this.temperatureEntity = this.config.temperature_entity || 'sensor.outdoor_temperature';
        this.weatherEntity = this.config.weather_entity || 'weather.example';
        this.gridEntity = this.config.grid_entity || 'sensor.example';
        this.solarEntity = this.config.solar_entity || 'sensor.example';
        this.homeEntity = this.config.home_entity || 'sensor.example';
        this.calendarEntity = this.config.calendar_entity || 'calendar.example';
        this.temperatureTitle = this.config.temperature_title || 'Outdoor';
        this.customCardConfig = this.config.custom_card || null;
        
        // Custom Popup Configs
        this.useCustomPopupCalendar = this.config.use_custom_popup_calendar || false;
        this.popupCardsCalendar = this.config.popup_cards_calendar || null;
        
        this.useCustomPopupWeather = this.config.use_custom_popup_weather || false;
        this.popupCardsWeather = this.config.popup_cards_weather || null;
        
        this.useCustomPopupEnergy = this.config.use_custom_popup_energy || false;
        this.popupCardsEnergy = this.config.popup_cards_energy || null;
        
        this.useCustomPopupCard = this.config.use_custom_popup_card || false;
        this.popupCardsCustom = this.config.popup_cards_custom || null;
        
        // Graph settings (uses mini-graph-card)
        this.graphHours = this.config.graph_hours || 24;
        
        // Custom width (optional)
        this.sidebarWidth = this.config.width || null;
        
        // Build camera entities array (only include non-empty entities)
        this.cameraEntities = [];
        if (this.config.camera_entity) {
            this.cameraEntities.push(this.config.camera_entity);
        }
        if (this.config.camera_entity_2) {
            this.cameraEntities.push(this.config.camera_entity_2);
        }
        if (this.config.camera_entity_3) {
            this.cameraEntities.push(this.config.camera_entity_3);
        }
        // Fallback to default if no cameras configured
        if (this.cameraEntities.length === 0) {
            this.cameraEntities.push('camera.example');
        }
        
        // Get rotation interval (default 10 seconds)
        this.rotationInterval = (this.config.rotation_interval && this.config.rotation_interval >= 3) 
            ? this.config.rotation_interval * 1000 
            : 10000; // Default 10 seconds
        
        // Get forecast days (default 3)
        this.forecastDays = this.config.forecast_days || 3;
        
        // Reset camera index
        this.currentCameraIndex = 0;
        
        // Stop existing camera rotation timer
        if (this.cameraTimer) {
            clearInterval(this.cameraTimer);
            this.cameraTimer = null;
        }
        
        // Check if important config changed that requires full re-render
        const needsRerender = prevWeatherEntity !== this.weatherEntity || 
                             prevForecastDays !== this.forecastDays ||
                             prevTemperatureEntity !== this.temperatureEntity;
        
        // Force re-render when config changes (important for forecast_days or entity changes)
        if (this.hasRendered && needsRerender) {
            // Reset temperature history if entity changed
            if (prevTemperatureEntity !== this.temperatureEntity) {
                this.temperatureHistory = [];
                this.historyLoading = false;
            }
            this.hasRendered = false;
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
            if (this._hass) {
                this.updateValues();
            }
        } else if (this.hasRendered) {
            // Minor changes, just update values
            this.startClock();
            this.startCameraRotation();
            if (this._hass) {
                this.updateValues();
            }
        } else if (!this._hass) {
        // Initialize preview values
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
        }
    }

    set hass(hass) {
        this._hass = hass;
        if (!this.hasRendered) {
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
            // Initial forecast update
            setTimeout(() => this.updateForecastGrid(), 100);
        } else {
            this.updateValues();
        }
        
        // Update custom card hass
        if (this._customCardElement && this._customCardElement.hass !== undefined) {
            this._customCardElement.hass = hass;
        }
        
        // Insert mini-graph-card (needs hass to be available first)
        if (!this._miniGraphCardElement) {
            this._insertMiniGraphCard();
        }
        
        // Update mini-graph-card hass
        if (this._miniGraphCardElement && this._miniGraphCardElement.hass !== undefined) {
            this._miniGraphCardElement.hass = hass;
        }
        
        // Update popup cards hass (if popup is open)
        if (this._popupCards && this._popupCards.length > 0) {
            this._popupCards.forEach(card => {
                if (card) {
                    try {
                        card.hass = hass;
                    } catch (e) {
                        // Card doesn't support hass updates
                    }
                }
            });
        }
    }
    
    _createCustomCard() {
        if (!this.customCardConfig) return null;
        
        let cardType = this.customCardConfig.type;
        if (!cardType) return null;
        
        // Strip 'custom:' prefix if present (HA uses this in YAML but element name doesn't have it)
        if (cardType.startsWith('custom:')) {
            cardType = cardType.substring(7);
        }
        
        try {
            // Create the custom element
            const element = document.createElement(cardType);
            if (element.setConfig) {
                element.setConfig(this.customCardConfig);
            }
            if (this._hass && element.hass !== undefined) {
                element.hass = this._hass;
            }
            return element;
        } catch (error) {
            console.error('Error creating custom card:', error);
            return null;
        }
    }
    
    _createMiniGraphCard() {
        if (!this.temperatureEntity || !this._hass) return null;
        
        // Check if mini-graph-card is available
        if (!customElements.get('mini-graph-card')) {
            console.warn('mini-graph-card is not installed. Please install it via HACS.');
            return null;
        }
        
        // Verify entity exists
        if (!this._hass.states[this.temperatureEntity]) {
            console.warn(`Entity ${this.temperatureEntity} not found`);
            return null;
        }
        
        try {
            const element = document.createElement('mini-graph-card');
            const config = {
                entities: [
                    {
                        entity: this.temperatureEntity
                    }
                ],
                hours_to_show: this.graphHours || 24,
                points_per_hour: 4,
                line_width: 1.5,
                line_color: '#3b82f6',
                height: 105,
                animate: false,
                font_size: 85,
                font_size_header: 10,
                decimals: 1,
                unit: '°C',
                align_state: 'center',
                show: {
                    fill: true,
                    icon: false,
                    name: false,
                    state: true,
                    labels: false,
                    points: false,
                    legend: false,
                    average: false,
                    extrema: false
                },
                card_mod: {
                    style: `
                        ha-card {
                            background: transparent !important;
                            box-shadow: none !important;
                            border: none !important;
                        }
                    `
                }
            };
            
            element.setConfig(config);
            element.hass = this._hass;
            
            // Apply custom styles directly
            element.style.cssText = '--ha-card-background: transparent; --ha-card-box-shadow: none; --ha-card-border-width: 0;';
            
            return element;
        } catch (error) {
            console.error('Error creating mini-graph-card:', error);
            return null;
        }
    }

    connectedCallback() {
        if (this.config && !this.hasRendered) {
            this.render();
            this.hasRendered = true;
            this.startClock();
            this.startCameraRotation();
        }
    }

    disconnectedCallback() {
        if (this.timer) clearInterval(this.timer);
        if (this.cameraTimer) clearInterval(this.cameraTimer);
        // Unsubscribe from forecast
        if (this.forecastSubscriber) {
            this.forecastSubscriber().catch(() => {});
            this.forecastSubscriber = null;
        }
    }

    startClock() {
        if (this.timer) clearInterval(this.timer);
        this.updateClock(); // Initial
        this.timer = setInterval(() => this.updateClock(), 1000);
    }

    startCameraRotation() {
        // Only rotate if we have more than one camera
        if (this.cameraEntities.length > 1) {
            if (this.cameraTimer) clearInterval(this.cameraTimer);
            this.cameraTimer = setInterval(() => {
                this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameraEntities.length;
                this.updateCamera();
            }, this.rotationInterval);
        }
    }

    getCurrentCameraEntity() {
        if (this.cameraEntities.length === 0) return 'camera.example';
        return this.cameraEntities[this.currentCameraIndex];
    }

    updateCamera() {
        if (!this._hass) return;
        
        const cameraEntity = this.getCurrentCameraEntity();
        const cameraState = this._hass.states[cameraEntity];
        
        const camImgEl = this.shadowRoot?.querySelector('.camera-img');
        const camNameEl = this.shadowRoot?.getElementById('cam-name');
        const cameraBox = this.shadowRoot?.getElementById('camera-box');
        
        if (camImgEl && cameraState) {
            const entityPicture = cameraState.attributes.entity_picture;
            if (entityPicture) {
                camImgEl.src = entityPicture;
            }
        } else if (camImgEl) {
            // Fallback to default image
            camImgEl.src = 'https://images.unsplash.com/photo-1558435186-d31d1eb6fa3c?q=80&w=600&auto=format&fit=crop';
        }

        if (camNameEl && cameraState) {
            camNameEl.textContent = cameraState.attributes.friendly_name || cameraEntity.split('.')[1];
        } else if (camNameEl) {
            camNameEl.textContent = cameraEntity.split('.')[1] || 'Camera';
        }

        // Update click handler
        if (cameraBox) {
            // Remove old listener and add new one
            const newBox = cameraBox.cloneNode(true);
            cameraBox.parentNode.replaceChild(newBox, cameraBox);
            newBox.addEventListener('click', () => this._handleCameraClick());
        }
    }

    updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' });
        
        const timeEl = this.shadowRoot?.getElementById('clock-time');
        const dateEl = this.shadowRoot?.getElementById('clock-date');
        
        if (timeEl) timeEl.textContent = timeStr;
        if (dateEl) dateEl.textContent = dateStr;
    }

    async updateValues() {
        if (!this._hass) return;
        
        // Update Grid/Solar/Home values if entities exist
        const gridState = this._hass.states[this.gridEntity];
        const solarState = this._hass.states[this.solarEntity];
        const homeState = this._hass.states[this.homeEntity];
        const weatherState = this._hass.states[this.weatherEntity];
        const cameraEntity = this.getCurrentCameraEntity();
        const cameraState = this._hass.states[cameraEntity];
        const calendarState = this._hass.states[this.calendarEntity];

        const gridEl = this.shadowRoot?.getElementById('val-grid');
        const solarEl = this.shadowRoot?.getElementById('val-solar');
        const homeEl = this.shadowRoot?.getElementById('val-home');
        const tempEl = this.shadowRoot?.getElementById('val-temp');
        const camNameEl = this.shadowRoot?.getElementById('cam-name');
        const camImgEl = this.shadowRoot?.querySelector('.camera-img');
        const calTitleEl = this.shadowRoot?.getElementById('cal-title');
        const calSubEl = this.shadowRoot?.getElementById('cal-sub');
        const calIconEl = this.shadowRoot?.getElementById('cal-icon');

        if (gridEl && gridState) {
            gridEl.textContent = this._formatEnergyValue(gridState.state, gridState.attributes.unit_of_measurement);
        }
        if (solarEl && solarState) {
            solarEl.textContent = this._formatEnergyValue(solarState.state, solarState.attributes.unit_of_measurement);
        }
        if (homeEl && homeState) {
            homeEl.textContent = this._formatEnergyValue(homeState.state, homeState.attributes.unit_of_measurement);
        }
        
        // Get temperature from the configured temperature entity, not weather
        const temperatureState = this._hass.states[this.temperatureEntity];
        if (tempEl && temperatureState) {
            tempEl.textContent = temperatureState.state || '0';
        }

        if (camImgEl && cameraState) {
            const entityPicture = cameraState.attributes.entity_picture;
            if (entityPicture) {
                camImgEl.src = entityPicture;
            }
        }

        if (camNameEl && cameraState) {
            camNameEl.textContent = cameraState.attributes.friendly_name || cameraEntity.split('.')[1];
        }

        // Update calendar
        if (calendarState && calendarState.attributes) {
            const attr = calendarState.attributes;
            if (calTitleEl && attr.message) {
                calTitleEl.textContent = attr.message;
            }
            if (calSubEl) {
                let subText = '';
                if (attr.all_day) {
                    subText = this._t('all_day');
                } else if (attr.start_time) {
                    const date = new Date(attr.start_time);
                    subText = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                }
                if (attr.location) {
                    subText += subText ? ` • ${attr.location}` : attr.location;
                }
                calSubEl.textContent = subText || 'Kein Termin';
            }
            if (calIconEl && attr.start_time) {
                const date = new Date(attr.start_time);
                calIconEl.textContent = date.getDate().toString();
            }
        }

        // Note: Forecast is updated via subscription, not here
        // updateForecastGrid() is called only once on initial render
    }

    // Check if weather entity supports forecast features (like clock-weather-card does)
    isLegacyWeather() {
        if (!this._hass || !this.weatherEntity) return true;
        const weatherState = this._hass.states[this.weatherEntity];
        if (!weatherState || !weatherState.attributes) return true;
        
        // WeatherEntityFeature.FORECAST_DAILY = 1, FORECAST_HOURLY = 2
        const supportedFeatures = weatherState.attributes.supported_features || 0;
        const supportsDaily = (supportedFeatures & 1) !== 0;
        const supportsHourly = (supportedFeatures & 2) !== 0;
        
        return !supportsDaily && !supportsHourly;
    }

    async updateForecastGrid() {
        if (!this._hass) return;
        
        // Skip if already subscribed (prevent multiple subscriptions)
        if (this.forecastSubscriber) return;
        
        const weatherState = this._hass.states[this.weatherEntity];
        const forecastGridEl = this.shadowRoot?.querySelector('.forecast-grid');
        
        if (!forecastGridEl || !weatherState) {
            return;
        }
        
        let forecast = [];
        
        // Check if legacy weather (has forecast in attributes) - like clock-weather-card does
        if (this.isLegacyWeather()) {
            // Legacy: Get forecast from attributes
            if (weatherState.attributes.forecast && weatherState.attributes.forecast.length > 0) {
                forecast = weatherState.attributes.forecast;
            }
        } else {
            // Modern: Use subscribeMessage (like clock-weather-card does)
            try {
                // Subscribe to forecast updates
                const callback = (event) => {
                    if (event && event.forecast && Array.isArray(event.forecast)) {
                        forecast = event.forecast;
                        this.renderForecastGrid(forecast, forecastGridEl);
                    }
                };
                
                const message = {
                    type: 'weather/subscribe_forecast',
                    forecast_type: 'daily',
                    entity_id: this.weatherEntity
                };
                
                this.forecastSubscriber = await this._hass.connection.subscribeMessage(callback, message, { resubscribe: false });
                
                // Wait a bit for the first callback
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                // Fallback to attributes if subscription fails
                if (weatherState.attributes.forecast && weatherState.attributes.forecast.length > 0) {
                    forecast = weatherState.attributes.forecast;
                }
            }
        }
        
        // Render forecast (either from attributes or from subscription)
        if (forecast && forecast.length > 0) {
            this.renderForecastGrid(forecast, forecastGridEl);
        } else {
            // Show placeholder if no forecast available
            
            if (forecastGridEl) {
                forecastGridEl.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">
                        <div style="font-size: 12px; margin-bottom: 8px;">Forecast nicht verfügbar</div>
                        <div style="font-size: 10px; color: rgba(255,255,255,0.3);">
                            ${this.weatherEntity}<br>
                            <small>Bitte verwende eine Weather-Integration, die Forecast unterstützt<br>
                            (z.B. Open-Meteo, Met.no, oder aktualisiere OpenWeatherMap)</small>
                        </div>
                    </div>
                `;
            }
        }
    }

    renderForecastGrid(forecast, forecastGridEl) {
        if (!forecast || !forecastGridEl) return;
        
        const forecastCount = this.forecastDays || 3;
        const forecastSlice = forecast.slice(0, forecastCount);
        
        // Rebuild the entire forecast grid
        forecastGridEl.innerHTML = forecastSlice.map((day, i) => {
            const date = day.datetime ? new Date(day.datetime) : new Date();
            const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
                    const iconMap = {
                        'sunny': 'mdi:weather-sunny',
                        'partlycloudy': 'mdi:weather-partly-cloudy',
                        'cloudy': 'mdi:cloud',
                        'rainy': 'mdi:weather-rainy',
                'snowy': 'mdi:weather-snowy',
                'pouring': 'mdi:weather-pouring',
                'lightning': 'mdi:weather-lightning',
                'fog': 'mdi:weather-fog',
                'windy': 'mdi:weather-windy',
                'clear-night': 'mdi:weather-night'
                    };
            const icon = iconMap[day.condition?.toLowerCase()] || 'mdi:weather-cloudy';
            const temp = day.temperature !== undefined ? day.temperature : (day.templow !== undefined ? day.templow : '0');
            const low = day.templow !== undefined ? day.templow : (day.temperature !== undefined ? day.temperature : '0');
            
            return `
                <div class="forecast-item">
                    <span class="day-name">${dayName}</span>
                    <ha-icon icon="${icon}" style="color: ${icon === 'mdi:weather-sunny' ? '#f59e0b' : 'rgba(255,255,255,0.8)'}; width: 20px;"></ha-icon>
                    <span class="day-temp">${temp}°</span>
                    <span class="day-low">${low}°</span>
                </div>
            `;
        }).join('');
    }

    convertHourlyToDaily(hourlyForecast) {
        if (!hourlyForecast || hourlyForecast.length === 0) return [];
        
        const dailyMap = new Map();
        
        hourlyForecast.forEach(hour => {
            if (!hour.datetime) return;
            const date = new Date(hour.datetime);
            const dayKey = date.toDateString(); // Group by day
            
            if (!dailyMap.has(dayKey)) {
                dailyMap.set(dayKey, {
                    datetime: hour.datetime,
                    condition: hour.condition,
                    temperature: hour.temperature,
                    templow: hour.temperature,
                    temps: [hour.temperature]
                });
            } else {
                const day = dailyMap.get(dayKey);
                day.temps.push(hour.temperature);
                day.temperature = Math.max(...day.temps); // High temp
                day.templow = Math.min(...day.temps); // Low temp
                // Use most common condition or latest
                if (hour.condition) {
                    day.condition = hour.condition;
                }
            }
        });
        
        return Array.from(dailyMap.values()).sort((a, b) => 
            new Date(a.datetime) - new Date(b.datetime)
        );
    }


    render() {
        // Use temperature history data for graph
        // Get entity states for preview/display
        const cameraEntity = this.getCurrentCameraEntity();
        const cameraState = this._hass?.states[cameraEntity];
        const temperatureState = this._hass?.states[this.temperatureEntity];
        const weatherState = this._hass?.states[this.weatherEntity];
        const calendarState = this._hass?.states[this.calendarEntity];
        const gridState = this._hass?.states[this.gridEntity];
        const solarState = this._hass?.states[this.solarEntity];
        const homeState = this._hass?.states[this.homeEntity];

        const cameraImage = cameraState?.attributes?.entity_picture || 'https://images.unsplash.com/photo-1558435186-d31d1eb6fa3c?q=80&w=600&auto=format&fit=crop';
        const cameraName = cameraState?.attributes?.friendly_name || cameraEntity.split('.')[1] || 'Camera';
        const currentTemp = temperatureState?.state || '0';
        const calendarTitle = calendarState?.attributes?.message || this._t('no_events');
        const calendarSub = calendarState?.attributes?.all_day ? this._t('all_day') : 
                           (calendarState?.attributes?.start_time ? 
                            new Date(calendarState.attributes.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 
                            '');
        const calendarDate = calendarState?.attributes?.start_time ? 
                            new Date(calendarState.attributes.start_time).getDate() : 
                            new Date().getDate();
        const gridValue = gridState ? `${gridState.state} ${gridState.attributes.unit_of_measurement || 'kW'}` : '0 kW';
        const solarValue = solarState ? `${solarState.state} ${solarState.attributes.unit_of_measurement || 'kW'}` : '0 kW';
        const homeValue = homeState ? `${homeState.state} ${homeState.attributes.unit_of_measurement || 'kW'}` : '0 kW';

        // Get forecast (daily forecast for display)
        const forecastDays = this.forecastDays || 3;
        const forecast = weatherState?.attributes?.forecast?.slice(0, forecastDays) || [];
        
        // Check if elements should be shown (only if entity is configured and not default)
        const showCamera = this.cameraEntities.length > 0 && 
                          this.cameraEntities[0] !== 'camera.example';
        const showCalendar = this.calendarEntity && 
                            this.calendarEntity !== 'calendar.example';
        const showTemperature = this.temperatureEntity && 
                               this.temperatureEntity !== 'sensor.outdoor_temperature';
        const showForecast = this.weatherEntity && 
                            this.weatherEntity !== 'weather.example';
        const showEnergy = (this.gridEntity && this.gridEntity !== 'sensor.example') ||
                          (this.solarEntity && this.solarEntity !== 'sensor.example') ||
                          (this.homeEntity && this.homeEntity !== 'sensor.example');
        const showCustomCard = !!this.customCardConfig;

        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: system-ui, -apple-system, sans-serif;
                height: 100%;
                box-sizing: border-box;
            }
            :host {
                display: block;
                height: 100%;
                ${this.sidebarWidth ? `width: ${this.sidebarWidth};` : ''}
            }
            .sidebar {
                width: 100%;
                min-height: 100%;
                height: auto;
                display: flex;
                flex-direction: column;
                padding: 16px;
                box-sizing: border-box;
                background: rgba(30, 32, 36, 0.6);
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 24px;
                box-shadow: 
                    0 10px 40px rgba(0,0,0,0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                overflow: hidden;
                color: white;
            }

            /* Camera */
            .camera-box {
                position: relative;
                width: 100%;
                aspect-ratio: 16/9;
                border-radius: 16px;
                overflow: hidden;
                margin-bottom: 32px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
                cursor: pointer;
                transition: transform 0.3s;
                flex-shrink: 0;
            }
            .camera-box:hover { transform: scale(1.02); }
            .camera-img {
                width: 100%; height: 100%; object-fit: cover;
            }
            .camera-overlay {
                position: absolute; inset: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.6), transparent, transparent);
            }
            .live-badge {
                position: absolute; top: 12px; left: 12px;
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(8px);
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 10px; font-weight: bold;
                color: white;
                display: flex; align-items: center; gap: 6px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .pulse {
                width: 6px; height: 6px; border-radius: 50%;
                background: #ef4444;
                box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
                animation: pulse 2s infinite;
            }
            .cam-name {
                position: absolute; bottom: 12px; right: 12px;
                font-size: 10px; font-family: monospace;
                color: rgba(255, 255, 255, 0.8);
                background: rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(8px);
                padding: 4px 8px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            /* Clock */
            .clock-box {
                display: flex; flex-direction: column; align-items: center;
                margin-bottom: 32px;
                position: relative;
                flex-shrink: 0;
            }
            .clock-glow {
                position: absolute; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 120px; height: 120px;
                background: rgba(255, 255, 255, 0.05);
                filter: blur(50px);
                border-radius: 50%;
                pointer-events: none;
            }
            .clock-time {
                font-size: 72px;
                font-weight: 700;
                letter-spacing: -4px;
                color: #e0e0e0;
                text-shadow: 2px 4px 8px rgba(0,0,0,0.5), -1px -1px 1px rgba(255,255,255,0.2);
                line-height: 1;
            }
            .clock-date {
                font-size: 14px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.6);
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-top: 5px;
                margin-left: 2px; /* Ausgleich für letter-spacing Verschiebung */
            }

            /* Calendar Inlet */
            .calendar-inlet {
                position: relative;
                margin-bottom: 32px;
                padding: 16px;
                border-radius: 16px;
                background: rgba(20, 20, 20, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.05);
                box-shadow: inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.05);
                display: flex; align-items: center; gap: 16px;
                cursor: pointer;
                transition: background 0.3s;
                flex-shrink: 0;
            }
            .calendar-inlet:hover { background: rgba(20, 20, 20, 0.6); }
            .cal-icon {
                width: 40px; height: 40px; border-radius: 12px;
                background: #1e2024;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                border: 1px solid rgba(255, 255, 255, 0.05);
                display: flex; align-items: center; justify-content: center;
                font-weight: bold; font-size: 18px; color: #3b82f6;
            }
            .cal-info { display: flex; flex-direction: column; }
            .cal-title { font-weight: 500; color: white; line-height: 1.2; }
            .cal-sub { font-size: 12px; color: rgba(255, 255, 255, 0.4); margin-top: 2px; }

            /* Weather - Clean */
            .weather-box {
                display: flex; flex-direction: column;
                flex: 1;
                min-height: 0;
            }
            .section-title {
                font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.35);
                text-transform: uppercase; letter-spacing: 2px;
                margin-bottom: 2px;
                text-align: center;
            }
            
            /* Mini Graph Card Container */
            .mini-graph-container {
                width: 100%;
                margin-bottom: 16px;
                border-radius: 0;
                overflow: visible;
                cursor: pointer;
            }
            .mini-graph-container mini-graph-card {
                --card-background-color: transparent !important;
                --ha-card-background: transparent !important;
                --ha-card-box-shadow: none !important;
                --ha-card-border-width: 0 !important;
                display: block !important;
            }
            .mini-graph-container ha-card {
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            .mini-graph-container .header {
                display: none !important;
            }
            .mini-graph-container .states {
                justify-content: center !important;
                padding: 0 !important;
                margin: 0 !important;
                padding-top: 0 !important;
            }
            .mini-graph-container .state {
                text-align: center !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            .mini-graph-container .state__value {
                margin: 0 !important;
                padding: 0 !important;
            }
            .mini-graph-container .graph {
                margin-top: 8px !important;
            }
            .forecast-grid {
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); 
                gap: 8px;
                cursor: pointer;
            }
            .forecast-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
            .day-name { font-size: 12px; color: rgba(255, 255, 255, 0.4); }
            .day-temp { font-size: 14px; font-weight: 700; color: white; }
            .day-low { font-size: 12px; color: rgba(255, 255, 255, 0.3); }
            
            /* Custom Card Container */
            .custom-card-container {
                margin-top: 24px;
                margin-bottom: 24px;
                border-radius: 16px;
                overflow: hidden;
            }

            /* Energy Footer - Animated Flow Style */
            .energy-flow-bar {
                display: flex;
                align-items: stretch;
                width: 100%;
                margin-top: auto;
                flex-shrink: 0;
                border-radius: 14px;
                overflow: hidden;
                background: rgba(15, 15, 15, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.04);
            }
            
            .energy-flow-item {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 12px 4px;
                position: relative;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 0;
            }
            
            .energy-flow-item:hover {
                background: rgba(255, 255, 255, 0.03);
            }
            
            .energy-flow-item:not(:last-child)::after {
                content: '';
                position: absolute;
                right: 0;
                top: 20%;
                height: 60%;
                width: 1px;
                background: rgba(255, 255, 255, 0.06);
            }
            
            .energy-flow-item .flow-icon-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                margin-bottom: 4px;
            }
            
            .energy-flow-item .flow-icon {
                --mdc-icon-size: 16px;
                opacity: 0.5;
            }
            
            .energy-flow-item.grid .flow-icon { color: #6b9bd1; }
            .energy-flow-item.solar .flow-icon { color: #c9a054; }
            .energy-flow-item.home .flow-icon { color: #9b85c4; }
            
            .energy-flow-item .flow-val {
                font-size: 11px;
                font-weight: 700;
                font-family: 'SF Mono', Monaco, monospace;
                color: rgba(255, 255, 255, 0.9);
                white-space: nowrap;
                text-align: center;
                line-height: 1.2;
            }
            
            .energy-flow-item .flow-label {
                font-size: 8px;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.35);
                margin-top: 2px;
                letter-spacing: 0.5px;
            }
            
            .energy-flow-item .glow-line {
                position: absolute;
                bottom: 0;
                left: 10%;
                right: 10%;
                height: 2px;
                border-radius: 2px;
            }
            
            .energy-flow-item.grid .glow-line {
                background: linear-gradient(90deg, transparent, rgba(107, 155, 209, 0.6), transparent);
                box-shadow: 0 0 8px rgba(107, 155, 209, 0.3);
                animation: glow-pulse-grid 3s ease-in-out infinite;
            }
            
            .energy-flow-item.solar .glow-line {
                background: linear-gradient(90deg, transparent, rgba(201, 160, 84, 0.6), transparent);
                box-shadow: 0 0 8px rgba(201, 160, 84, 0.3);
                animation: glow-pulse-solar 3s ease-in-out infinite;
            }
            
            .energy-flow-item.home .glow-line {
                background: linear-gradient(90deg, transparent, rgba(155, 133, 196, 0.6), transparent);
                box-shadow: 0 0 8px rgba(155, 133, 196, 0.3);
                animation: glow-pulse-home 3s ease-in-out infinite;
            }
            
            @keyframes glow-pulse-grid {
                0%, 100% { opacity: 0.4; box-shadow: 0 0 6px rgba(107, 155, 209, 0.2); }
                50% { opacity: 0.8; box-shadow: 0 0 12px rgba(107, 155, 209, 0.4); }
            }
            
            @keyframes glow-pulse-solar {
                0%, 100% { opacity: 0.4; box-shadow: 0 0 6px rgba(201, 160, 84, 0.2); }
                50% { opacity: 0.8; box-shadow: 0 0 12px rgba(201, 160, 84, 0.4); }
            }
            
            @keyframes glow-pulse-home {
                0%, 100% { opacity: 0.4; box-shadow: 0 0 6px rgba(155, 133, 196, 0.2); }
                50% { opacity: 0.8; box-shadow: 0 0 12px rgba(155, 133, 196, 0.4); }
            }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }

            /* Popup Styles */
            .popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1;
                animation: fadeIn 0.2s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .popup {
                background: linear-gradient(145deg, rgba(30, 32, 38, 0.98), rgba(22, 24, 28, 0.98));
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                width: 90%;
                max-width: 500px;
                max-height: 85vh;
                overflow: hidden;
                box-shadow: 
                    0 25px 80px rgba(0, 0, 0, 0.6),
                    0 0 0 1px rgba(255, 255, 255, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05);
                display: flex;
                flex-direction: column;
                animation: slideUp 0.3s ease;
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .popup-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                color: white;
                font-weight: 600;
                font-size: 16px;
            }
            .popup-close {
                margin-left: auto;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 8px;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: rgba(255, 255, 255, 0.6);
                transition: all 0.2s;
            }
            .popup-close:hover {
                background: rgba(255, 255, 255, 0.2);
                color: white;
            }
            .popup-content {
                flex: 1;
                padding: 12px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .popup-footer {
                padding: 12px 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .popup-more-info-btn {
                width: 100%;
                padding: 10px 16px;
                border-radius: 10px;
                border: none;
                background: rgba(59, 130, 246, 0.2);
                color: #3b82f6;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s;
            }
            .popup-more-info-btn:hover {
                background: rgba(59, 130, 246, 0.3);
            }

            /* Popup Responsive - Tablet/Mobile */
            @media (max-height: 1200px) {
                .popup-content > *,
                .custom-cards-container > * {
                    transform: scale(0.8);
                    margin-bottom: -20%;
                }
                .popup-header {
                    padding: 8px 12px;
                    font-size: 15px;
                }
                .popup-header ha-icon {
                    --mdc-icon-size: 20px;
                }
                .popup-close {
                    width: 28px;
                    height: 28px;
                }
                .popup-close ha-icon {
                    --mdc-icon-size: 16px;
                }
            }

            @media (max-height: 900px) {
                .popup {
                    max-height: 95vh;
                }
                .popup-content {
                    max-height: calc(95vh - 50px);
                    padding: 6px;
                }
                .popup-content > *,
                .custom-cards-container > * {
                    transform: scale(0.65);
                    margin-bottom: -35%;
                }
                .popup-header {
                    padding: 6px 10px;
                    font-size: 14px;
                }
                .popup-header ha-icon {
                    --mdc-icon-size: 18px;
                }
                .popup-close {
                    width: 24px;
                    height: 24px;
                }
                .popup-close ha-icon {
                    --mdc-icon-size: 14px;
                }
                .popup-footer {
                    padding: 5px 8px;
                }
            }

            @media (max-height: 700px) {
                .popup-content > *,
                .custom-cards-container > * {
                    transform: scale(0.55);
                    margin-bottom: -45%;
                }
                .popup-header {
                    padding: 5px 8px;
                    font-size: 13px;
                }
                .popup-header ha-icon {
                    --mdc-icon-size: 16px;
                }
                .popup-close {
                    width: 22px;
                    height: 22px;
                }
                .popup-close ha-icon {
                    --mdc-icon-size: 12px;
                }
                .popup-footer {
                    padding: 4px 6px;
                }
            }

            @media (max-height: 600px) {
                .popup-content > *,
                .custom-cards-container > * {
                    transform: scale(0.5);
                    margin-bottom: -50%;
                }
            }

            @media (max-width: 1200px) {
                .popup-content > *,
                .custom-cards-container > * {
                    transform: scale(0.8);
                    margin-bottom: -20%;
                }
                .popup-header {
                    padding: 8px 12px;
                    font-size: 15px;
                }
                .popup-header ha-icon {
                    --mdc-icon-size: 20px;
                }
                .popup-close {
                    width: 28px;
                    height: 28px;
                }
                .popup-close ha-icon {
                    --mdc-icon-size: 16px;
                }
            }

            @media (max-width: 1024px) {
                .popup-content > *,
                .custom-cards-container > * {
                    transform: scale(0.75);
                    margin-bottom: -25%;
                }
                .popup-header {
                    padding: 6px 10px;
                    font-size: 14px;
                }
                .popup-header ha-icon {
                    --mdc-icon-size: 18px;
                }
                .popup-close {
                    width: 24px;
                    height: 24px;
                }
                .popup-close ha-icon {
                    --mdc-icon-size: 14px;
                }
            }

            @media (max-width: 768px) {
                .popup {
                    width: 95%;
                    max-height: 95vh;
                }
                .popup-content {
                    max-height: calc(95vh - 50px);
                    padding: 6px;
                }
                .popup-content > *,
                .custom-cards-container > * {
                    transform: scale(0.65);
                    margin-bottom: -35%;
                }
                .popup-header {
                    padding: 5px 8px;
                    font-size: 13px;
                }
                .popup-header ha-icon {
                    --mdc-icon-size: 16px;
                }
                .popup-close {
                    width: 22px;
                    height: 22px;
                }
                .popup-close ha-icon {
                    --mdc-icon-size: 12px;
                }
            }

            @media (max-width: 480px) {
                .popup {
                    width: 98%;
                    border-radius: 16px;
                }
                .popup-header {
                    padding: 4px 6px;
                    font-size: 12px;
                }
                .popup-header ha-icon {
                    --mdc-icon-size: 14px;
                }
                .popup-close {
                    width: 20px;
                    height: 20px;
                }
                .popup-close ha-icon {
                    --mdc-icon-size: 11px;
                }
                .popup-header {
                    padding: 10px 12px;
                    font-size: 15px;
                }
                .popup-content {
                    padding: 6px;
                }
                .popup-footer {
                    padding: 6px 8px;
                }
            }

            /* Calendar Popup Styles */
            .calendar-no-events {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 40px 20px;
                color: rgba(255, 255, 255, 0.4);
            }
            .calendar-event {
                display: flex;
                gap: 12px;
                padding: 12px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.03);
                margin-bottom: 8px;
                transition: background 0.2s;
            }
            .calendar-event:hover {
                background: rgba(255, 255, 255, 0.08);
            }
            .calendar-event.today {
                background: rgba(59, 130, 246, 0.15);
                border-left: 3px solid #3b82f6;
            }
            .calendar-event.tomorrow {
                background: rgba(139, 92, 246, 0.1);
                border-left: 3px solid #8b5cf6;
            }
            .calendar-event-date {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-width: 44px;
                padding: 8px;
                border-radius: 10px;
                background: rgba(0, 0, 0, 0.3);
            }
            .calendar-event-day {
                font-size: 20px;
                font-weight: 700;
                color: white;
                line-height: 1;
            }
            .calendar-event-month {
                font-size: 10px;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.5);
                margin-top: 2px;
            }
            .calendar-event-details {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 0;
            }
            .calendar-event-title {
                font-weight: 500;
                color: white;
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .calendar-event-time,
            .calendar-event-location {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.5);
            }
            .calendar-event-location {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Weather Popup Styles */
            .weather-current {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 16px;
                padding: 20px;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 12px;
                margin-bottom: 12px;
            }
            .weather-current-temp {
                font-size: 48px;
                font-weight: 300;
                color: white;
            }
            .weather-current-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .weather-current-condition {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.8);
                text-transform: capitalize;
            }
            .weather-current-details {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
            }
            .weather-forecast-title {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: rgba(255, 255, 255, 0.4);
                margin-bottom: 12px;
                padding: 0 4px;
            }
            .weather-forecast-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 10px;
                margin-bottom: 6px;
            }
            .weather-forecast-item:hover {
                background: rgba(255, 255, 255, 0.06);
            }
            .weather-forecast-day {
                min-width: 60px;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.7);
            }
            .weather-forecast-icon {
                width: 28px;
                height: 28px;
            }
            .weather-forecast-temps {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 8px;
            }
            .weather-forecast-high {
                font-size: 14px;
                font-weight: 600;
                color: white;
            }
            .weather-forecast-low {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.4);
            }

            /* Responsive Spacing - Tablet */
            @media (max-width: 1024px) {
                .camera-box {
                    margin-bottom: 20px;
                }
                .clock-box {
                    margin-bottom: 20px;
                }
                .calendar-inlet {
                    margin-bottom: 20px;
                }
                .custom-card-container {
                    margin-top: 16px;
                    margin-bottom: 16px;
                }
            }

            /* Responsive Spacing - Mobile Large */
            @media (max-width: 768px) {
                .camera-box {
                    margin-bottom: 16px;
                }
                .clock-box {
                    margin-bottom: 16px;
                }
                .calendar-inlet {
                    margin-bottom: 16px;
                    padding: 14px;
                    gap: 14px;
                }
                .custom-card-container {
                    margin-top: 14px;
                    margin-bottom: 14px;
                }
                .sidebar {
                    padding: 14px;
                }
            }

            /* Responsive Spacing - Mobile Small */
            @media (max-width: 480px) {
                .camera-box {
                    margin-bottom: 12px;
                }
                .clock-box {
                    margin-bottom: 12px;
                }
                .calendar-inlet {
                    margin-bottom: 12px;
                    padding: 10px;
                    gap: 10px;
                }
                .custom-card-container {
                    margin-top: 10px;
                    margin-bottom: 10px;
                }
                .sidebar {
                    padding: 10px;
                }
                .clock-time {
                    font-size: 56px;
                    letter-spacing: -3px;
                }
                .clock-date {
                    font-size: 12px;
                    letter-spacing: 1px;
                    margin-left: 1px;
                }
                .mini-graph-container {
                    margin-bottom: 10px;
                }
            }

            /* Popup Styles */
            .popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                z-index: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                animation: fadeIn 0.2s ease;
            }

            .popup {
                background: linear-gradient(145deg, rgba(30, 32, 38, 0.98), rgba(22, 24, 28, 0.98));
                border-radius: 20px;
                max-width: 500px;
                width: 90%;
                max-height: 85vh;
                overflow: hidden;
                box-shadow: 
                    0 25px 80px rgba(0, 0, 0, 0.6),
                    0 0 0 1px rgba(255, 255, 255, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05);
                display: flex;
                flex-direction: column;
                animation: slideUp 0.3s ease;
            }

            .popup-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }

            .popup-title {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .popup-title-icon {
                width: 32px;
                height: 32px;
                border-radius: 10px;
                background: linear-gradient(145deg, rgba(122, 101, 168, 0.3), rgba(122, 101, 168, 0.15));
                border: 1px solid rgba(122, 101, 168, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #a78bfa;
                box-shadow: 
                    0 2px 8px rgba(122, 101, 168, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
            }

            .popup-title-icon ha-icon {
                --mdc-icon-size: 18px;
                filter: drop-shadow(0 0 4px rgba(167, 139, 250, 0.4));
            }

            .popup-title span {
                font-size: 16px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.9);
                letter-spacing: -0.01em;
            }

            .popup-close {
                width: 32px;
                height: 32px;
                border-radius: 10px;
                background: linear-gradient(145deg, #2a2d35, #23262c);
                border: 1px solid rgba(255, 255, 255, 0.06);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: rgba(255, 255, 255, 0.5);
                transition: all 0.2s;
                box-shadow: 
                    2px 2px 6px rgba(0, 0, 0, 0.3),
                    -1px -1px 4px rgba(255, 255, 255, 0.03);
            }

            .popup-close ha-icon {
                --mdc-icon-size: 18px;
            }

            .popup-close:hover {
                color: #f87171;
                background: linear-gradient(145deg, #2d3038, #262930);
                border-color: rgba(248, 113, 113, 0.3);
            }

            .popup-content {
                flex: 1;
                padding: 12px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            /* Wrapper for scaled content - JS will calculate optimal scale */
            .popup-scale-wrapper {
                transform-origin: top center;
                transition: transform 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                width: 100%;
            }

            .custom-cards-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                width: 100%;
            }

            .popup-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                color: rgba(255, 255, 255, 0.5);
                font-size: 14px;
            }

            .popup-error {
                padding: 16px;
                background: rgba(248, 113, 113, 0.1);
                border: 1px solid rgba(248, 113, 113, 0.3);
                border-radius: 12px;
                color: #f87171;
                font-size: 13px;
                text-align: center;
            }

            .popup-footer {
                padding: 12px 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.06);
                background: rgba(0, 0, 0, 0.1);
                display: flex;
                justify-content: flex-end;
            }

            .popup-more-info-btn {
                background: linear-gradient(145deg, rgba(122, 101, 168, 0.25), rgba(122, 101, 168, 0.15));
                border: 1px solid rgba(122, 101, 168, 0.3);
                border-radius: 10px;
                padding: 8px 14px;
                color: #a78bfa;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
                box-shadow: 0 2px 8px rgba(122, 101, 168, 0.15);
            }

            .popup-more-info-btn:hover {
                background: linear-gradient(145deg, rgba(122, 101, 168, 0.35), rgba(122, 101, 168, 0.25));
                border-color: rgba(122, 101, 168, 0.5);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(20px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Custom Popup Responsive - Tablet/Mobile */
            @media (max-width: 1200px), (max-height: 1200px) {
                .popup-header {
                    padding: 10px 14px;
                }
                .popup-title span {
                    font-size: 15px;
                }
                .popup-title-icon {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                }
                .popup-title-icon ha-icon {
                    --mdc-icon-size: 16px;
                }
                .popup-close {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                }
                .popup-close ha-icon {
                    --mdc-icon-size: 16px;
                }
                .popup-content {
                    padding: 10px;
                }
            }

            @media (max-width: 1024px), (max-height: 900px) {
                .popup-header {
                    padding: 8px 12px;
                }
                .popup-title {
                    gap: 10px;
                }
                .popup-title span {
                    font-size: 14px;
                }
                .popup-title-icon {
                    width: 26px;
                    height: 26px;
                }
                .popup-title-icon ha-icon {
                    --mdc-icon-size: 14px;
                }
                .popup-close {
                    width: 26px;
                    height: 26px;
                }
                .popup-close ha-icon {
                    --mdc-icon-size: 14px;
                }
                .popup-content {
                    padding: 8px;
                }
            }

            @media (max-width: 768px), (max-height: 700px) {
                .popup-header {
                    padding: 6px 10px;
                }
                .popup-title {
                    gap: 8px;
                }
                .popup-title span {
                    font-size: 13px;
                }
                .popup-title-icon {
                    width: 24px;
                    height: 24px;
                }
                .popup-title-icon ha-icon {
                    --mdc-icon-size: 13px;
                }
                .popup-close {
                    width: 24px;
                    height: 24px;
                }
                .popup-close ha-icon {
                    --mdc-icon-size: 13px;
                }
                .popup-content {
                    padding: 6px;
                }
            }

            /* Calendar Popup Styles */
            .calendar-no-events {
                text-align: center;
                padding: 40px 20px;
                color: rgba(255, 255, 255, 0.4);
            }

            .calendar-event {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                border-left: 4px solid #7a65a8;
            }

            .calendar-event-title {
                font-size: 16px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.9);
                margin-bottom: 8px;
            }

            .calendar-event-time {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.6);
                display: flex;
                align-items: center;
                gap: 6px;
            }

            /* Weather Popup Styles */
            .weather-current {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 24px;
                padding: 20px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 16px;
            }

            .weather-current-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .weather-current-temp {
                font-size: 32px;
                font-weight: 700;
                color: rgba(255, 255, 255, 0.9);
            }

            .weather-current-condition {
                font-size: 16px;
                color: rgba(255, 255, 255, 0.6);
            }

            .weather-current-details {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.4);
                margin-top: 4px;
            }

            .weather-forecast-title {
                font-size: 14px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.5);
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .weather-forecast-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 12px;
                margin-bottom: 8px;
            }

            .weather-forecast-day {
                flex: 1;
                font-size: 14px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.7);
            }

            .weather-forecast-temps {
                display: flex;
                gap: 8px;
                font-size: 14px;
            }

            .weather-forecast-high {
                color: rgba(255, 255, 255, 0.9);
                font-weight: 600;
            }

            .weather-forecast-low {
                color: rgba(255, 255, 255, 0.4);
            }
        </style>

        <div class="sidebar">
            
            <!-- Camera -->
            ${showCamera ? `
            <div class="camera-box" id="camera-box">
                <img src="${cameraImage}" class="camera-img" />
                <div class="camera-overlay"></div>
                <div class="live-badge">
                    <div class="pulse"></div> LIVE
                </div>
                <div class="cam-name" id="cam-name">${cameraName}</div>
            </div>
            ` : ''}

            <!-- Clock - ALWAYS visible -->
            <div class="clock-box">
                <div class="clock-glow"></div>
                <div class="clock-time" id="clock-time">08:12</div>
                <div class="clock-date" id="clock-date">Wednesday, 24. Dec</div>
            </div>

            <!-- Calendar Inlet -->
            ${showCalendar ? `
            <div class="calendar-inlet" id="calendar-inlet">
                <div class="cal-icon" id="cal-icon">${calendarDate}</div>
                <div class="cal-info">
                    <div class="cal-title" id="cal-title">${calendarTitle}</div>
                    <div class="cal-sub" id="cal-sub">${calendarSub}</div>
                </div>
            </div>
            ` : ''}

            <!-- Weather -->
            ${showTemperature || showForecast ? `
            <div class="weather-box">
                <div class="section-title">${this.temperatureTitle}</div>
                
                <!-- Mini Graph Card Container -->
                <div class="mini-graph-container" id="mini-graph-slot">
                    <!-- mini-graph-card will be inserted here -->
                </div>

                ${showForecast ? `
                <div class="forecast-grid">
                    ${forecast.map((day, i) => {
                        const date = day.datetime ? new Date(day.datetime) : new Date();
                        const dayName = date.toLocaleDateString('de-DE', { weekday: 'short' });
                        const iconMap = {
                            'sunny': 'mdi:weather-sunny',
                            'partlycloudy': 'mdi:weather-partly-cloudy',
                            'cloudy': 'mdi:cloud',
                            'rainy': 'mdi:weather-rainy',
                            'snowy': 'mdi:weather-snowy'
                        };
                        const icon = iconMap[day.condition?.toLowerCase()] || 'mdi:weather-cloudy';
                        return `
                            <div class="forecast-item">
                                <span class="day-name" id="day-name-${i}">${dayName}</span>
                                <ha-icon icon="${icon}" id="day-icon-${i}" style="color: ${icon === 'mdi:weather-sunny' ? '#f59e0b' : 'rgba(255,255,255,0.8)'}; width: 20px;"></ha-icon>
                                <span class="day-temp" id="day-temp-${i}">${day.temperature !== undefined ? day.temperature : (day.templow !== undefined ? day.templow : '0')}°</span>
                                <span class="day-low" id="day-low-${i}">${day.templow !== undefined ? day.templow : (day.temperature !== undefined ? day.temperature : '0')}°</span>
                            </div>
                        `;
                    }).join('') || `
                        <div class="forecast-item">
                            <span class="day-name">Mi</span>
                            <ha-icon icon="mdi:weather-rainy" style="color: rgba(255,255,255,0.8); width: 20px;"></ha-icon>
                            <span class="day-temp">0,4°</span>
                            <span class="day-low">-1,4°</span>
                        </div>
                        <div class="forecast-item">
                            <span class="day-name">Do</span>
                            <ha-icon icon="mdi:cloud" style="color: rgba(255,255,255,0.8); width: 20px;"></ha-icon>
                            <span class="day-temp">2,6°</span>
                            <span class="day-low">-1,6°</span>
                        </div>
                        <div class="forecast-item">
                            <span class="day-name">Fr</span>
                            <ha-icon icon="mdi:weather-sunny" style="color: #f59e0b; width: 20px;"></ha-icon>
                            <span class="day-temp">4,1°</span>
                            <span class="day-low">-1,7°</span>
                        </div>
                    `}
                </div>
                ` : ''}
            </div>
            ` : ''}
            
            <!-- Custom Card -->
            ${showCustomCard ? `
            <div class="custom-card-container" id="custom-card-slot"></div>
            ` : ''}

            <!-- Energy Footer - Flow Style -->
            ${showEnergy ? `
            <div class="energy-flow-bar">
                <div class="energy-flow-item grid" id="energy-grid">
                    <div class="flow-icon-wrapper">
                        <ha-icon class="flow-icon" icon="mdi:transmission-tower"></ha-icon>
                    </div>
                    <span class="flow-val" id="val-grid">${gridValue}</span>
                    <span class="flow-label">Grid</span>
                    <div class="glow-line"></div>
                </div>
                <div class="energy-flow-item solar" id="energy-solar">
                    <div class="flow-icon-wrapper">
                        <ha-icon class="flow-icon" icon="mdi:solar-power-variant"></ha-icon>
                    </div>
                    <span class="flow-val" id="val-solar">${solarValue}</span>
                    <span class="flow-label">Solar</span>
                    <div class="glow-line"></div>
                </div>
                <div class="energy-flow-item home" id="energy-home">
                    <div class="flow-icon-wrapper">
                        <ha-icon class="flow-icon" icon="mdi:home-lightning-bolt"></ha-icon>
                    </div>
                    <span class="flow-val" id="val-home">${homeValue}</span>
                    <span class="flow-label">Home</span>
                    <div class="glow-line"></div>
                </div>
            </div>
            ` : ''}

        </div>
        `;

        // Setup event listeners
        this.setupListeners();
        
        // Insert custom card if configured
        if (this.customCardConfig) {
            const slot = this.shadowRoot.getElementById('custom-card-slot');
            if (slot) {
                // Clear previous card
                slot.innerHTML = '';
                const card = this._createCustomCard();
                if (card) {
                    this._customCardElement = card;
                    slot.appendChild(card);
                }
            }
        }
        
        // Mini-graph-card will be inserted in _insertMiniGraphCard() after hass is available
    }
    
    _insertMiniGraphCard() {
        if (!this._hass) return;
        
        const miniGraphSlot = this.shadowRoot?.getElementById('mini-graph-slot');
        if (!miniGraphSlot) return;
        
        // Don't recreate if already exists
        if (this._miniGraphCardElement && miniGraphSlot.contains(this._miniGraphCardElement)) {
            return;
        }
        
        miniGraphSlot.innerHTML = '';
        const miniGraphCard = this._createMiniGraphCard();
        if (miniGraphCard) {
            this._miniGraphCardElement = miniGraphCard;
            miniGraphSlot.appendChild(miniGraphCard);
            
            // Inject styles into mini-graph-card's shadow DOM to remove padding
            this._injectMiniGraphStyles(miniGraphCard);
        } else {
            // Show fallback message if mini-graph-card not available
            miniGraphSlot.innerHTML = `
                <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5); font-size: 12px;">
                    <ha-icon icon="mdi:alert-circle-outline" style="margin-bottom: 8px;"></ha-icon>
                    <div>mini-graph-card nicht installiert</div>
                    <div style="font-size: 10px; margin-top: 4px;">Installiere es über HACS</div>
                </div>
            `;
        }
    }
    
    _injectMiniGraphStyles(element) {
        // Wait for the element to render and then inject styles
        const injectStyles = () => {
            const shadowRoot = element.shadowRoot;
            if (!shadowRoot) {
                // Retry if shadow root not ready yet
                setTimeout(injectStyles, 50);
                return;
            }
            
            // Check if styles already injected
            if (shadowRoot.querySelector('#prism-mini-graph-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'prism-mini-graph-styles';
            style.textContent = `
                ha-card {
                    padding: 0 !important;
                    margin: 0 !important;
                    background: transparent !important;
                }
                .header {
                    display: none !important;
                }
                .states {
                    padding: 0 !important;
                    margin: 0 !important;
                    padding-top: 0 !important;
                    margin-top: 0 !important;
                }
                .state {
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .state__value {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .graph {
                    margin-top: 8px !important;
                }
                .graph__container {
                    padding: 0 !important;
                }
            `;
            shadowRoot.appendChild(style);
        };
        
        // Start injection process
        setTimeout(injectStyles, 100);
    }

    setupListeners() {
        const cameraBox = this.shadowRoot?.getElementById('camera-box');
        const calendarInlet = this.shadowRoot?.getElementById('calendar-inlet');
        const energyGrid = this.shadowRoot?.getElementById('energy-grid');
        const energySolar = this.shadowRoot?.getElementById('energy-solar');
        const energyHome = this.shadowRoot?.getElementById('energy-home');

        if (cameraBox) {
            cameraBox.addEventListener('click', () => this._handleCameraClick());
        }
        if (calendarInlet) {
            calendarInlet.addEventListener('click', () => this._handleCalendarClick());
        }
        if (energyGrid) {
            energyGrid.addEventListener('click', () => this._handleEnergyClick(this.gridEntity));
        }
        if (energySolar) {
            energySolar.addEventListener('click', () => this._handleEnergyClick(this.solarEntity));
        }
        if (energyHome) {
            energyHome.addEventListener('click', () => this._handleEnergyClick(this.homeEntity));
        }
        
        // Mini graph container click - opens weather popup
        const miniGraphSlot = this.shadowRoot?.getElementById('mini-graph-slot');
        if (miniGraphSlot) {
            miniGraphSlot.addEventListener('click', () => this._handleWeatherClick());
        }
        
        // Forecast grid click - opens weather popup
        const forecastGrid = this.shadowRoot?.querySelector('.forecast-grid');
        if (forecastGrid) {
            forecastGrid.addEventListener('click', () => this._handleWeatherClick());
        }
        
        // Custom card click - opens custom popup if enabled
        const customCardSlot = this.shadowRoot?.getElementById('custom-card-slot');
        if (customCardSlot && this.useCustomPopupCard && this.popupCardsCustom) {
            customCardSlot.style.cursor = 'pointer';
            customCardSlot.addEventListener('click', () => this._handleCustomCardClick());
        }
    }

    _handleCameraClick() {
        if (!this._hass) return;
        const cameraEntity = this.getCurrentCameraEntity();
        if (!cameraEntity) return;
        // Open native HA camera dialog (has real live stream + fullscreen)
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: cameraEntity }
        });
        this.dispatchEvent(event);
    }

    async _handleCalendarClick() {
        if (!this._hass || !this.calendarEntity) return;
        
        // Check if custom popup is enabled
        if (this.useCustomPopupCalendar && this.popupCardsCalendar) {
            this._showCustomPopup('Calendar', this.popupCardsCalendar);
            return;
        }
        
        // Load upcoming events
        const now = new Date();
        const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // Next 14 days
        
        try {
            // Use the correct API endpoint for calendar events
            const response = await this._hass.callApi(
                'GET',
                `calendars/${this.calendarEntity}?start=${now.toISOString()}&end=${endDate.toISOString()}`
            );
            
            this._showCalendarPopup(response || []);
        } catch (error) {
            console.warn('Calendar API error, trying alternative method:', error);
            
            // Try alternative WS method
            try {
                const events = await this._hass.callWS({
                    type: 'calendar/events',
                    entity_id: this.calendarEntity,
                    start_date_time: now.toISOString(),
                    end_date_time: endDate.toISOString()
                });
                
                this._showCalendarPopup(events?.events || events || []);
            } catch (wsError) {
                console.warn('Calendar WS error:', wsError);
                // Fallback: show more-info dialog
                const event = new CustomEvent('hass-more-info', {
                    bubbles: true,
                    composed: true,
                    detail: { entityId: this.calendarEntity }
                });
                this.dispatchEvent(event);
            }
        }
    }

    _showCalendarPopup(events) {
        // Remove existing popup
        const existingPopup = this.shadowRoot?.querySelector('.popup-overlay');
        if (existingPopup) existingPopup.remove();

        // Limit to 5 events
        const upcomingEvents = events.slice(0, 5);
        
        // Create popup
        const popupOverlay = document.createElement('div');
        popupOverlay.className = 'popup-overlay';
        popupOverlay.innerHTML = `
            <div class="popup">
                <div class="popup-header">
                    <ha-icon icon="mdi:calendar" style="--mdc-icon-size: 24px; color: #3b82f6;"></ha-icon>
                    <span>Kommende Termine</span>
                    <button class="popup-close">
                        <ha-icon icon="mdi:close" style="--mdc-icon-size: 20px;"></ha-icon>
                    </button>
                </div>
                <div class="popup-content">
                    ${upcomingEvents.length === 0 ? `
                        <div class="calendar-no-events">
                            <ha-icon icon="mdi:calendar-blank" style="--mdc-icon-size: 48px; color: rgba(255,255,255,0.2);"></ha-icon>
                            <span>Keine Termine</span>
                        </div>
                    ` : upcomingEvents.map(event => {
                        const start = new Date(event.start.dateTime || event.start.date);
                        const end = new Date(event.end.dateTime || event.end.date);
                        const isAllDay = !event.start.dateTime;
                        const isToday = start.toDateString() === new Date().toDateString();
                        const isTomorrow = start.toDateString() === new Date(Date.now() + 86400000).toDateString();
                        
                        let dateStr;
                        if (isToday) {
                            dateStr = 'Heute';
                        } else if (isTomorrow) {
                            dateStr = 'Morgen';
                        } else {
                            dateStr = start.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
                        }
                        
                        let timeStr;
                        if (isAllDay) {
                            timeStr = 'Ganztägig';
                        } else {
                            timeStr = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + 
                                     ' - ' + end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                        }
                        
                        return `
                            <div class="calendar-event ${isToday ? 'today' : ''} ${isTomorrow ? 'tomorrow' : ''}">
                                <div class="calendar-event-date">
                                    <span class="calendar-event-day">${start.getDate()}</span>
                                    <span class="calendar-event-month">${start.toLocaleDateString('de-DE', { month: 'short' })}</span>
                                </div>
                                <div class="calendar-event-details">
                                    <div class="calendar-event-title">${event.summary || 'Ohne Titel'}</div>
                                    <div class="calendar-event-time">
                                        <ha-icon icon="${isAllDay ? 'mdi:calendar-today' : 'mdi:clock-outline'}" style="--mdc-icon-size: 12px;"></ha-icon>
                                        ${dateStr} • ${timeStr}
                                    </div>
                                    ${event.location ? `
                                        <div class="calendar-event-location">
                                            <ha-icon icon="mdi:map-marker" style="--mdc-icon-size: 12px;"></ha-icon>
                                            ${event.location}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="popup-footer">
                    <button class="popup-more-info-btn">
                        <ha-icon icon="mdi:open-in-new" style="--mdc-icon-size: 16px;"></ha-icon>
                        Alle Termine anzeigen
                    </button>
                </div>
            </div>
        `;
        
        // Add to shadow root
        this.shadowRoot.appendChild(popupOverlay);
        
        // Event listeners
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                popupOverlay.remove();
            }
        });
        
        const closeBtn = popupOverlay.querySelector('.popup-close');
        closeBtn?.addEventListener('click', () => popupOverlay.remove());
        
        const moreInfoBtn = popupOverlay.querySelector('.popup-more-info-btn');
        moreInfoBtn?.addEventListener('click', () => {
            popupOverlay.remove();
            const event = new CustomEvent('hass-more-info', {
                bubbles: true,
                composed: true,
                detail: { entityId: this.calendarEntity }
            });
            this.dispatchEvent(event);
        });
    }

    _handleEnergyClick(entityId) {
        if (!this._hass || !entityId) return;
        
        // Check if custom popup is enabled
        if (this.useCustomPopupEnergy && this.popupCardsEnergy) {
            this._showCustomPopup('Energy', this.popupCardsEnergy);
            return;
        }
        
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: entityId }
        });
        this.dispatchEvent(event);
    }

    _handleCustomCardClick() {
        if (!this._hass) return;
        
        // Show custom popup
        if (this.useCustomPopupCard && this.popupCardsCustom) {
            this._showCustomPopup('Details', this.popupCardsCustom);
        }
    }

    async _handleWeatherClick() {
        if (!this._hass || !this.weatherEntity) return;
        
        // Check if custom popup is enabled
        if (this.useCustomPopupWeather && this.popupCardsWeather) {
            this._showCustomPopup('Weather', this.popupCardsWeather);
            return;
        }
        
        // Get weather data
        const weatherState = this._hass.states[this.weatherEntity];
        const temperatureState = this._hass.states[this.temperatureEntity];
        
        if (!weatherState) {
            // Fallback to more-info
            const event = new CustomEvent('hass-more-info', {
                bubbles: true,
                composed: true,
                detail: { entityId: this.weatherEntity }
            });
            this.dispatchEvent(event);
            return;
        }
        
        // Get forecast data - try modern subscription first, then fall back to attributes
        let forecast = [];
        
        // Check if legacy weather (has forecast in attributes)
        if (this.isLegacyWeather()) {
            // Legacy: Get forecast from attributes
            if (weatherState.attributes.forecast && weatherState.attributes.forecast.length > 0) {
                forecast = weatherState.attributes.forecast.slice(0, 7);
            }
        } else {
            // Modern: Use subscribeMessage to get forecast
            try {
                const forecastData = await new Promise((resolve, reject) => {
                    let resolved = false;
                    const timeout = setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            reject(new Error('Timeout'));
                        }
                    }, 3000);
                    
                    this._hass.connection.subscribeMessage(
                        (event) => {
                            if (!resolved && event && event.forecast) {
                                resolved = true;
                                clearTimeout(timeout);
                                resolve(event.forecast);
                            }
                        },
                        {
                            type: 'weather/subscribe_forecast',
                            forecast_type: 'daily',
                            entity_id: this.weatherEntity
                        },
                        { resubscribe: false }
                    ).catch(err => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeout);
                            reject(err);
                        }
                    });
                });
                
                forecast = forecastData.slice(0, 7);
            } catch (error) {
                console.warn('Weather forecast subscription error:', error);
                // Fallback to attributes if subscription fails
                if (weatherState.attributes.forecast && weatherState.attributes.forecast.length > 0) {
                    forecast = weatherState.attributes.forecast.slice(0, 7);
                }
            }
        }
        
        this._showWeatherPopup(weatherState, temperatureState, forecast);
    }

    _showWeatherPopup(weatherState, temperatureState, forecast) {
        // Remove existing popup
        const existingPopup = this.shadowRoot?.querySelector('.popup-overlay');
        if (existingPopup) existingPopup.remove();
        
        const currentTemp = temperatureState?.state || weatherState?.attributes?.temperature || '0';
        const condition = weatherState?.state || 'unknown';
        const humidity = weatherState?.attributes?.humidity;
        const windSpeed = weatherState?.attributes?.wind_speed;
        const pressure = weatherState?.attributes?.pressure;
        
        // Icon map
        const iconMap = {
            'sunny': 'mdi:weather-sunny',
            'partlycloudy': 'mdi:weather-partly-cloudy',
            'cloudy': 'mdi:cloud',
            'rainy': 'mdi:weather-rainy',
            'snowy': 'mdi:weather-snowy',
            'pouring': 'mdi:weather-pouring',
            'lightning': 'mdi:weather-lightning',
            'fog': 'mdi:weather-fog',
            'windy': 'mdi:weather-windy',
            'clear-night': 'mdi:weather-night',
            'lightning-rainy': 'mdi:weather-lightning-rainy',
            'hail': 'mdi:weather-hail',
            'exceptional': 'mdi:alert-circle'
        };
        
        // Condition translation
        const conditionNames = {
            'sunny': 'Sonnig',
            'partlycloudy': 'Teilweise bewölkt',
            'cloudy': 'Bewölkt',
            'rainy': 'Regnerisch',
            'snowy': 'Schnee',
            'pouring': 'Starkregen',
            'lightning': 'Gewitter',
            'fog': 'Nebel',
            'windy': 'Windig',
            'clear-night': 'Klare Nacht',
            'lightning-rainy': 'Gewitter mit Regen',
            'hail': 'Hagel',
            'exceptional': 'Außergewöhnlich'
        };
        
        const mainIcon = iconMap[condition] || 'mdi:weather-cloudy';
        const conditionName = conditionNames[condition] || condition;
        
        // Details text
        let detailsText = '';
        if (humidity) detailsText += `💧 ${humidity}%`;
        if (windSpeed) detailsText += detailsText ? ` · 💨 ${windSpeed} km/h` : `💨 ${windSpeed} km/h`;
        if (pressure) detailsText += detailsText ? ` · ${pressure} hPa` : `${pressure} hPa`;
        
        // Create popup
        const popupOverlay = document.createElement('div');
        popupOverlay.className = 'popup-overlay';
        popupOverlay.innerHTML = `
            <div class="popup">
                <div class="popup-header">
                    <ha-icon icon="mdi:weather-partly-cloudy" style="--mdc-icon-size: 24px; color: #f59e0b;"></ha-icon>
                    <span>Wetter</span>
                    <button class="popup-close">
                        <ha-icon icon="mdi:close" style="--mdc-icon-size: 20px;"></ha-icon>
                    </button>
                </div>
                <div class="popup-content">
                    <div class="weather-current">
                        <ha-icon icon="${mainIcon}" style="--mdc-icon-size: 56px; color: ${mainIcon.includes('sunny') ? '#f59e0b' : 'rgba(255,255,255,0.8)'};"></ha-icon>
                        <div class="weather-current-info">
                            <span class="weather-current-temp">${currentTemp}°C</span>
                            <span class="weather-current-condition">${conditionName}</span>
                            ${detailsText ? `<span class="weather-current-details">${detailsText}</span>` : ''}
                        </div>
                    </div>
                    
                    ${forecast.length > 0 ? `
                        <div class="weather-forecast-title">Vorhersage</div>
                        ${forecast.map((day, i) => {
                            const date = day.datetime ? new Date(day.datetime) : new Date();
                            const isToday = date.toDateString() === new Date().toDateString();
                            const dayName = isToday ? 'Heute' : date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' });
                            const icon = iconMap[day.condition?.toLowerCase()] || 'mdi:weather-cloudy';
                            const iconColor = icon.includes('sunny') ? '#f59e0b' : 'rgba(255,255,255,0.7)';
                            const temp = day.temperature !== undefined ? day.temperature : '0';
                            const low = day.templow !== undefined ? day.templow : temp;
                            
                            return `
                                <div class="weather-forecast-item">
                                    <span class="weather-forecast-day">${dayName}</span>
                                    <ha-icon icon="${icon}" class="weather-forecast-icon" style="--mdc-icon-size: 24px; color: ${iconColor};"></ha-icon>
                                    <div class="weather-forecast-temps">
                                        <span class="weather-forecast-high">${temp}°</span>
                                        <span class="weather-forecast-low">${low}°</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    ` : `
                        <div class="calendar-no-events">
                            <ha-icon icon="mdi:weather-cloudy-alert" style="--mdc-icon-size: 48px; color: rgba(255,255,255,0.2);"></ha-icon>
                            <span>Keine Vorhersage verfügbar</span>
                        </div>
                    `}
                </div>
                <div class="popup-footer">
                    <button class="popup-more-info-btn">
                        <ha-icon icon="mdi:open-in-new" style="--mdc-icon-size: 16px;"></ha-icon>
                        Mehr Details
                    </button>
                </div>
            </div>
        `;
        
        // Add to shadow root
        this.shadowRoot.appendChild(popupOverlay);
        
        // Event listeners
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                popupOverlay.remove();
            }
        });
        
        const closeBtn = popupOverlay.querySelector('.popup-close');
        closeBtn?.addEventListener('click', () => popupOverlay.remove());
        
        const moreInfoBtn = popupOverlay.querySelector('.popup-more-info-btn');
        moreInfoBtn?.addEventListener('click', () => {
            popupOverlay.remove();
            const event = new CustomEvent('hass-more-info', {
                bubbles: true,
                composed: true,
                detail: { entityId: this.weatherEntity }
            });
            this.dispatchEvent(event);
        });
    }

    // Close custom popup helper
    _closeCustomPopup() {
        // Remove resize handler
        if (this._popupResizeHandler) {
            window.removeEventListener('resize', this._popupResizeHandler);
            this._popupResizeHandler = null;
        }
        
        const existingPopup = document.getElementById('prism-sidebar-custom-popup');
        if (existingPopup) {
            existingPopup.style.animation = 'prismPopupFadeOut 0.2s ease forwards';
            setTimeout(() => {
                existingPopup.remove();
            }, 200);
        }
        this._popupCards = [];
    }

    // Show custom popup with custom cards - SAME APPROACH AS prism-button.js
    async _showCustomPopup(title, cardsConfig) {
        // Close any existing popup first
        this._closeCustomPopup();
        
        // Clear previous popup cards
        this._popupCards = [];
        
        // Parse cards config
        let cards = [];
        if (Array.isArray(cardsConfig)) {
            cards = cardsConfig;
        } else if (cardsConfig && typeof cardsConfig === 'object') {
            cards = [cardsConfig];
        }
        
        // Create popup in document.body (OUTSIDE shadow DOM - same as prism-button)
        const overlay = document.createElement('div');
        overlay.id = 'prism-sidebar-custom-popup';
        overlay.innerHTML = `
            <style>
                #prism-sidebar-custom-popup {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 999; /* High enough to be above navigation */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    box-sizing: border-box;
                    animation: prismPopupFadeIn 0.2s ease;
                    font-family: system-ui, -apple-system, sans-serif;
                    transition: z-index 0s; /* For dynamic z-index changes */
                }
                #prism-sidebar-custom-popup.behind-dialog {
                    z-index: 0 !important; /* Temporarily go behind HA dialogs */
                }
                @keyframes prismPopupFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes prismPopupFadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                @keyframes prismPopupSlideIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .prism-custom-popup {
                    position: relative;
                    min-width: 320px;
                    max-width: 500px;
                    width: 90vw;
                    background: linear-gradient(180deg, rgba(35, 38, 45, 0.98), rgba(25, 27, 32, 0.98));
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 
                        0 25px 80px rgba(0, 0, 0, 0.8),
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    overflow: hidden;
                    animation: prismPopupSlideIn 0.3s ease;
                    display: flex;
                    flex-direction: column;
                }
                .prism-custom-popup-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    background: linear-gradient(180deg, rgba(40, 43, 50, 0.9), rgba(30, 33, 38, 0.9));
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .prism-custom-popup-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: rgba(255, 255, 255, 0.95);
                    font-size: 16px;
                    font-weight: 600;
                }
                .prism-custom-popup-title-icon {
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(145deg, #2d3038, #22252b);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgb(167, 139, 250);
                    --mdc-icon-size: 18px;
                    box-shadow: 
                        2px 2px 4px rgba(0, 0, 0, 0.4),
                        -1px -1px 3px rgba(255, 255, 255, 0.03),
                        inset 1px 1px 2px rgba(255, 255, 255, 0.05);
                }
                .prism-custom-popup-title-icon ha-icon {
                    display: flex;
                    --mdc-icon-size: 18px;
                    filter: drop-shadow(0 0 4px rgba(167, 139, 250, 0.5));
                }
                .prism-custom-popup-close {
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    background: linear-gradient(145deg, #2d3038, #22252b);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255, 255, 255, 0.4);
                    --mdc-icon-size: 18px;
                    transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
                    box-shadow: 
                        2px 2px 4px rgba(0, 0, 0, 0.4),
                        -1px -1px 3px rgba(255, 255, 255, 0.03),
                        inset 1px 1px 2px rgba(255, 255, 255, 0.05);
                }
                .prism-custom-popup-close ha-icon {
                    display: flex;
                    --mdc-icon-size: 18px;
                    transition: all 0.2s ease;
                }
                .prism-custom-popup-close:hover {
                    color: #f87171;
                }
                .prism-custom-popup-close:hover ha-icon {
                    filter: drop-shadow(0 0 4px rgba(248, 113, 113, 0.6));
                }
                .prism-custom-popup-close:active {
                    background: linear-gradient(145deg, #22252b, #2d3038);
                    box-shadow: 
                        inset 2px 2px 4px rgba(0, 0, 0, 0.5),
                        inset -1px -1px 3px rgba(255, 255, 255, 0.03);
                }
                .prism-custom-popup-content {
                    padding: 16px;
                    overflow: hidden;
                    flex: 1;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                }
                .prism-custom-popup-cards {
                    transform-origin: top center;
                    width: 100%;
                }
                .prism-custom-popup-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 14px;
                }
                .prism-custom-popup-error {
                    padding: 16px;
                    background: rgba(248, 113, 113, 0.1);
                    border: 1px solid rgba(248, 113, 113, 0.3);
                    border-radius: 12px;
                    color: #f87171;
                    font-size: 13px;
                }

                /* Responsive header styling - same as prism-button */
                @media (max-width: 1024px), (max-height: 900px) {
                    .prism-custom-popup-header {
                        padding: 10px 14px;
                    }
                    .prism-custom-popup-title {
                        font-size: 15px;
                        gap: 10px;
                    }
                    .prism-custom-popup-title-icon {
                        width: 28px;
                        height: 28px;
                    }
                    .prism-custom-popup-title-icon ha-icon {
                        --mdc-icon-size: 16px;
                    }
                    .prism-custom-popup-close {
                        width: 28px;
                        height: 28px;
                    }
                    .prism-custom-popup-close ha-icon {
                        --mdc-icon-size: 16px;
                    }
                }

                @media (max-width: 768px), (max-height: 700px) {
                    .prism-custom-popup {
                        width: 95vw;
                        max-width: 95vw;
                    }
                    .prism-custom-popup-content {
                        padding: 8px;
                    }
                    .prism-custom-popup-header {
                        padding: 8px 12px;
                    }
                    .prism-custom-popup-title {
                        font-size: 14px;
                        gap: 8px;
                    }
                    .prism-custom-popup-title-icon {
                        width: 26px;
                        height: 26px;
                    }
                    .prism-custom-popup-title-icon ha-icon {
                        --mdc-icon-size: 14px;
                    }
                    .prism-custom-popup-close {
                        width: 26px;
                        height: 26px;
                    }
                    .prism-custom-popup-close ha-icon {
                        --mdc-icon-size: 14px;
                    }
                }

                @media (max-width: 480px) {
                    #prism-sidebar-custom-popup {
                        padding: 8px;
                    }
                    .prism-custom-popup {
                        width: 98vw;
                        max-width: 98vw;
                        border-radius: 16px;
                    }
                    .prism-custom-popup-header {
                        padding: 6px 10px;
                    }
                    .prism-custom-popup-title {
                        font-size: 13px;
                        gap: 6px;
                    }
                    .prism-custom-popup-title-icon {
                        width: 24px;
                        height: 24px;
                    }
                    .prism-custom-popup-title-icon ha-icon {
                        --mdc-icon-size: 13px;
                    }
                    .prism-custom-popup-close {
                        width: 24px;
                        height: 24px;
                    }
                    .prism-custom-popup-close ha-icon {
                        --mdc-icon-size: 13px;
                    }
                    .prism-custom-popup-content {
                        padding: 6px;
                    }
                }
            </style>
            <div class="prism-custom-popup">
                <div class="prism-custom-popup-header">
                    <div class="prism-custom-popup-title">
                        <div class="prism-custom-popup-title-icon">
                            <ha-icon icon="mdi:view-dashboard"></ha-icon>
                        </div>
                        <span>${title}</span>
                    </div>
                    <button class="prism-custom-popup-close">
                        <ha-icon icon="mdi:close"></ha-icon>
                    </button>
                </div>
                <div class="prism-custom-popup-content">
                    <div class="prism-custom-popup-cards">
                        <div class="prism-custom-popup-loading">Loading cards...</div>
                    </div>
                </div>
            </div>
        `;
        
        // Append to document.body (NOT shadow root - this is the key fix!)
        document.body.appendChild(overlay);
        
        // IMPORTANT: Forward hass-more-info events from popup to Home Assistant
        // Since popup is in document.body (outside HA's shadow DOM), we need to catch
        // these events and re-dispatch them to the home-assistant element
        overlay.addEventListener('hass-more-info', (e) => {
            e.stopPropagation();
            const haEl = document.querySelector('home-assistant');
            if (haEl && e.detail?.entityId) {
                // Temporarily lower z-index so HA dialog appears on top
                overlay.classList.add('behind-dialog');
                
                const newEvent = new CustomEvent('hass-more-info', {
                    bubbles: true,
                    composed: true,
                    detail: { entityId: e.detail.entityId }
                });
                haEl.dispatchEvent(newEvent);
                
                // Restore z-index when HA dialog is closed (listen for click on HA overlay)
                const restoreZIndex = () => {
                    overlay.classList.remove('behind-dialog');
                };
                // Restore after a short delay and when user interacts
                setTimeout(() => {
                    document.addEventListener('click', function handler(evt) {
                        // Check if click is outside HA dialog (dialog closed)
                        const haDialog = document.querySelector('ha-more-info-dialog, ha-dialog');
                        if (!haDialog || !haDialog.contains(evt.target)) {
                            restoreZIndex();
                            document.removeEventListener('click', handler);
                        }
                    });
                }, 500);
            }
        });
        
        // Event listeners
        overlay.querySelector('.prism-custom-popup-close').onclick = () => this._closeCustomPopup();
        overlay.onclick = (e) => {
            if (e.target === overlay) this._closeCustomPopup();
        };
        
        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this._closeCustomPopup();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // Render the cards
        const cardsContainer = overlay.querySelector('.prism-custom-popup-cards');
        const contentContainer = overlay.querySelector('.prism-custom-popup-content');
        await this._renderCustomPopupCards(cardsContainer, cards);
        
        // Scale cards to fit available height
        this._scalePopupContent(cardsContainer, contentContainer);
    }
    
    // Scale popup content to fit available height
    _scalePopupContent(cardsContainer, contentContainer) {
        // Wait for cards to render
        setTimeout(() => {
            if (!cardsContainer || !contentContainer) return;
            
            // Get computed padding
            const computedStyle = window.getComputedStyle(contentContainer);
            const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
            const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
            
            // Get available height (content area minus padding)
            const availableHeight = contentContainer.clientHeight - paddingTop - paddingBottom;
            
            // Get natural height of cards
            const naturalHeight = cardsContainer.scrollHeight;
            
            if (naturalHeight > 0 && availableHeight > 0) {
                // Calculate scale to fit
                let scale = availableHeight / naturalHeight;
                
                // Cap scale at 1 (don't upscale) and minimum 0.3 (readable)
                scale = Math.min(scale, 1);
                scale = Math.max(scale, 0.3);
                
                // Apply scale
                cardsContainer.style.transform = `scale(${scale})`;
                
                // Adjust container to remove empty space
                cardsContainer.style.height = `${naturalHeight}px`;
                cardsContainer.style.marginBottom = `-${naturalHeight * (1 - scale)}px`;
            }
        }, 200);
    }

    // Render custom cards in popup using HA's official card helpers (like prism-button)
    async _renderCustomPopupCards(container, cardConfigs) {
        if (!cardConfigs || cardConfigs.length === 0) {
            container.innerHTML = '<div class="prism-custom-popup-error">No cards configured</div>';
            return;
        }
        
        // Clear loading message
        container.innerHTML = '';
        
        // Try to get card helpers (official HA method)
        let helpers = null;
        try {
            helpers = await window.loadCardHelpers?.();
        } catch (e) {
            console.warn('Prism Sidebar Custom Popup: Could not load card helpers', e);
        }
        
        for (const cardConfig of cardConfigs) {
            try {
                let cardElement;
                
                if (helpers?.createCardElement) {
                    // Method 1: Official card helpers (preferred) - same as prism-button
                    cardElement = await helpers.createCardElement(cardConfig);
                } else {
                    // Method 2: Fallback - direct element creation
                    const cardType = cardConfig.type || 'entity';
                    let tag;
                    
                    if (cardType.startsWith('custom:')) {
                        tag = cardType.replace('custom:', '');
                    } else {
                        tag = `hui-${cardType}-card`;
                    }
                    
                    cardElement = document.createElement(tag);
                    if (cardElement.setConfig) {
                        cardElement.setConfig(cardConfig);
                    }
                }
                
                // Set hass and append to container
                if (cardElement) {
                    cardElement.hass = this._hass;
                    container.appendChild(cardElement);
                    this._popupCards.push(cardElement);
                }
            } catch (e) {
                console.error('Prism Sidebar Custom Popup: Failed to create card', cardConfig, e);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'prism-custom-popup-error';
                errorDiv.textContent = `Failed to load card: ${cardConfig.type || 'unknown'}`;
                container.appendChild(errorDiv);
            }
        }
        
        // If no cards were added, show message
        if (container.children.length === 0) {
            container.innerHTML = '<div class="prism-custom-popup-error">No cards could be loaded</div>';
        }
    }

    // Translation helper - English default, German if HA is set to German
    _t(key) {
        const lang = this._hass?.language || this._hass?.locale?.language || 'en';
        const isGerman = lang.startsWith('de');
        
        const translations = {
            'all_day': isGerman ? 'Ganztägig' : 'All day',
            'no_events': isGerman ? 'Keine Termine' : 'No events'
        };
        
        return translations[key] || key;
    }

    // Apply optimal scale to popup content based on available space
    _applyOptimalScale(popupContent, scaleWrapper, overlay) {
        // Wait for cards to fully render
        requestAnimationFrame(() => {
            setTimeout(() => {
                const popup = popupContent?.closest('.popup');
                const header = popup?.querySelector('.popup-header');
                
                if (!popup || !header || !scaleWrapper || !overlay) return;
                
                // Get available space
                const overlayPadding = 40;
                const availableHeight = window.innerHeight - overlayPadding;
                const availableWidth = window.innerWidth - overlayPadding;
                const headerHeight = header.offsetHeight;
                const contentPadding = 24;
                
                // Maximum space for content
                const maxContentHeight = availableHeight - headerHeight - contentPadding;
                const maxContentWidth = availableWidth - contentPadding;
                
                // Reset scale to measure natural size
                scaleWrapper.style.transform = 'scale(1)';
                
                // Get natural content size
                const naturalHeight = scaleWrapper.scrollHeight;
                const naturalWidth = scaleWrapper.scrollWidth;
                
                // Calculate optimal scale
                const scaleHeight = maxContentHeight / naturalHeight;
                const scaleWidth = maxContentWidth / naturalWidth;
                
                // Use the smaller scale to fit both dimensions, but cap at 1 (no upscaling)
                let optimalScale = Math.min(scaleHeight, scaleWidth, 1);
                
                // Minimum scale to keep content readable
                optimalScale = Math.max(optimalScale, 0.4);
                
                // Apply scale
                scaleWrapper.style.transform = `scale(${optimalScale})`;
                
                // Adjust wrapper height to match scaled content (removes empty space)
                const scaledHeight = naturalHeight * optimalScale;
                scaleWrapper.style.height = `${naturalHeight}px`;
                popupContent.style.height = `${scaledHeight}px`;
                
                // Set popup to fit content
                popup.style.height = 'auto';
                popup.style.maxHeight = `${availableHeight}px`;
                
                // Handle window resize
                const resizeHandler = () => {
                    if (!this.shadowRoot?.querySelector('.popup-overlay')) {
                        window.removeEventListener('resize', resizeHandler);
                        return;
                    }
                    this._applyOptimalScale(popupContent, scaleWrapper, overlay);
                };
                
                // Remove any existing resize handler and add new one
                if (this._popupResizeHandler) {
                    window.removeEventListener('resize', this._popupResizeHandler);
                }
                this._popupResizeHandler = resizeHandler;
                window.addEventListener('resize', resizeHandler);
                
            }, 100); // Small delay to ensure cards are fully rendered
        });
    }

    getCardSize() {
        return 10; // Tall card
    }
}

customElements.define('prism-sidebar', PrismSidebarCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "prism-sidebar",
    name: "Prism Sidebar",
    preview: true,
    description: "Full height sidebar with clock, camera, weather and energy stats"
});

