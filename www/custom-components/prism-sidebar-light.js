class PrismSidebarLightCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.timer = null;
        this.cameraTimer = null;
        this.hasRendered = false;
        this.currentCameraIndex = 0;
        this.cameraEntities = [];
        this.temperatureHistory = [];
        this.temperatureHistoryWithTime = []; // Store data with timestamps
        this.historyLoading = false;
        this.forecastSubscriber = null; // For weather forecast subscription
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
                },
                {
                    name: "temperature_entity",
                    label: "Temperature entity",
                    selector: { entity: { domain: "sensor" } }
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
                    name: "calendar_entity",
                    label: "Calendar entity",
                    selector: { entity: { domain: "calendar" } }
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
                // Fetch new temperature history if entity changed
                if (prevTemperatureEntity !== this.temperatureEntity) {
                    this.fetchTemperatureHistory();
                }
                this.updateValues();
            }
        } else if (this.hasRendered) {
            // Minor changes, just update values
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
            this.fetchTemperatureHistory();
            // Initial forecast update
            setTimeout(() => this.updateForecastGrid(), 100);
        } else {
            this.updateValues();
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

        // Update weather forecast - rebuild entire forecast grid
        this.updateForecastGrid();
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
        
        const weatherState = this._hass.states[this.weatherEntity];
        const forecastGridEl = this.shadowRoot?.querySelector('.forecast-grid');
        
        if (!forecastGridEl || !weatherState) {
            console.warn('Prism Sidebar Light: Missing forecast grid or weather entity:', this.weatherEntity);
            return;
        }
        
        let forecast = [];
        
        // Check if legacy weather (has forecast in attributes) - like clock-weather-card does
        if (this.isLegacyWeather()) {
            // Legacy: Get forecast from attributes
            if (weatherState.attributes.forecast && weatherState.attributes.forecast.length > 0) {
                forecast = weatherState.attributes.forecast;
                console.log('Prism Sidebar Light: Using forecast from attributes (legacy)');
            }
        } else {
            // Modern: Use subscribeMessage (like clock-weather-card does)
            // Based on: https://github.com/pkissling/clock-weather-card
            try {
                console.log('Prism Sidebar Light: Subscribing to forecast via subscribeMessage for', this.weatherEntity);
                
                // Unsubscribe from previous subscription
                if (this.forecastSubscriber) {
                    try {
                        await this.forecastSubscriber();
                    } catch (e) {
                        // Ignore errors when unsubscribing
                    }
                    this.forecastSubscriber = null;
                }
                
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
                console.log('Prism Sidebar Light: Successfully subscribed to forecast');
                
                // Wait a bit for the first callback
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error('Prism Sidebar Light: Error subscribing to forecast:', error);
                // Fallback to attributes if subscription fails
                if (weatherState.attributes.forecast && weatherState.attributes.forecast.length > 0) {
                    forecast = weatherState.attributes.forecast;
                    console.log('Prism Sidebar Light: Fallback to attributes after subscription error');
                }
            }
        }
        
        // Render forecast (either from attributes or from subscription)
        if (forecast && forecast.length > 0) {
            this.renderForecastGrid(forecast, forecastGridEl);
        } else {
            // Show helpful message if no forecast available
            console.warn('Prism Sidebar Light: No forecast data available for', this.weatherEntity);
            console.log('Prism Sidebar Light: Available weather attributes:', Object.keys(weatherState.attributes));
            console.log('Prism Sidebar Light: Supported features:', weatherState.attributes.supported_features);
            
            if (forecastGridEl) {
                forecastGridEl.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; color: rgba(0,0,0,0.5); padding: 20px;">
                        <div style="font-size: 12px; margin-bottom: 8px;">Forecast nicht verfügbar</div>
                        <div style="font-size: 10px; color: rgba(0,0,0,0.3);">
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
        
        console.log(`Prism Sidebar Light: Rendering forecast with ${forecastSlice.length} days`);
        
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
                    <ha-icon icon="${icon}" style="color: ${icon === 'mdi:weather-sunny' ? '#f59e0b' : 'rgba(0,0,0,0.8)'}; width: 20px;"></ha-icon>
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
        let graphData = [1.2, 1.5, 2.1, 2.8, 2.5, 1.9, 1.4, 1.0, 0.8]; // Default
        if (this.temperatureHistory && this.temperatureHistory.length > 0) {
            graphData = this.temperatureHistory;
        }
        const graphPaths = this.generateGraphPath(graphData, 280, 60);
        const graphFillPath = graphPaths.fill || '';
        const graphLinePath = graphPaths.line || '';

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

        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: system-ui, -apple-system, sans-serif;
                height: 100%;
                box-sizing: border-box;
            }
            .sidebar {
                width: 100%;
                height: 100%;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                padding: 24px;
                box-sizing: border-box;
                background: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                border-right: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: 10px 0 30px rgba(0,0,0,0.1);
                overflow-y: auto;
                overflow-x: hidden;
                color: #1a1a1a;
            }

            /* Camera */
            .camera-box {
                position: relative;
                width: 100%;
                aspect-ratio: 16/9;
                border-radius: 16px;
                overflow: hidden;
                margin-bottom: 32px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1);
                cursor: pointer;
                transition: transform 0.3s;
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
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(8px);
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 10px; font-weight: bold;
                color: #1a1a1a;
                display: flex; align-items: center; gap: 6px;
                border: 1px solid rgba(0, 0, 0, 0.1);
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
            }
            .clock-glow {
                position: absolute; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 120px; height: 120px;
                background: rgba(0, 0, 0, 0.05);
                filter: blur(50px);
                border-radius: 50%;
                pointer-events: none;
            }
            .clock-time {
                font-size: 72px;
                font-weight: 700;
                letter-spacing: -4px;
                color: #1a1a1a;
                text-shadow: 2px 4px 8px rgba(0,0,0,0.1), -1px -1px 1px rgba(255,255,255,0.8);
                line-height: 1;
            }
            .clock-date {
                font-size: 14px;
                font-weight: 500;
                color: rgba(0, 0, 0, 0.6);
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-top: 8px;
            }

            /* Calendar Inlet */
            .calendar-inlet {
                position: relative;
                margin-bottom: 32px;
                padding: 16px;
                border-radius: 16px;
                background: linear-gradient(145deg, #e8e8e8, #f5f5f5);
                border: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: 
                    inset 3px 3px 8px rgba(0,0,0,0.1),
                    inset -3px -3px 8px rgba(255,255,255,0.9);
                display: flex; align-items: center; gap: 16px;
                cursor: pointer;
                transition: background 0.3s;
            }
            .calendar-inlet:hover { background: rgba(240, 240, 240, 0.8); }
            .cal-icon {
                width: 40px; height: 40px; border-radius: 12px;
                background: rgba(255, 255, 255, 0.9);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                border: 1px solid rgba(0, 0, 0, 0.05);
                display: flex; align-items: center; justify-content: center;
                font-weight: bold; font-size: 18px; color: #3b82f6;
            }
            .cal-info { display: flex; flex-direction: column; }
            .cal-title { font-weight: 500; color: #1a1a1a; line-height: 1.2; }
            .cal-sub { font-size: 12px; color: rgba(0, 0, 0, 0.4); margin-top: 2px; }

            /* Weather - Clean */
            .weather-box {
                display: flex; flex-direction: column;
                margin-bottom: auto; /* Push footer down */
            }
            .section-title {
                font-size: 12px; font-weight: 700; color: rgba(0, 0, 0, 0.3);
                text-transform: uppercase; letter-spacing: 2px;
                margin-bottom: 8px;
            }
            .current-temp-box {
                display: flex; align-items: center; justify-content: center;
                margin-bottom: 8px;
            }
            .temp-val { font-size: 48px; font-weight: 300; color: #1a1a1a; }
            .temp-unit { font-size: 20px; color: rgba(0, 0, 0, 0.4); margin-top: -10px; margin-left: 4px; }
            
            .graph-container {
                height: 80px; 
                width: 100%; 
                margin-bottom: 24px; 
                position: relative;
                padding: 12px 0;
                overflow: hidden;
                border-radius: 12px;
                background: rgba(240, 240, 240, 0.5);
                border: 1px solid rgba(59, 130, 246, 0.15);
            }
            .graph-container svg {
                display: block;
                width: 100%;
                height: 100%;
                overflow: visible;
            }
            .graph-container svg path {
                vector-effect: non-scaling-stroke;
                transition: all 0.3s ease;
            }
            .graph-tooltip {
                position: absolute;
                background: rgba(255, 255, 255, 0.95);
                color: #1a1a1a;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                z-index: 1000;
                white-space: nowrap;
                border: 1px solid rgba(59, 130, 246, 0.3);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .graph-tooltip.visible {
                opacity: 1;
            }
            .graph-tooltip-time {
                font-size: 10px;
                opacity: 0.6;
                margin-top: 2px;
            }
            .graph-point {
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .graph-point.visible {
                opacity: 1;
            }
            .forecast-grid {
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); 
                gap: 8px;
            }
            .forecast-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
            .day-name { font-size: 12px; color: rgba(0, 0, 0, 0.4); }
            .day-temp { font-size: 14px; font-weight: 700; color: #1a1a1a; }
            .day-low { font-size: 12px; color: rgba(0, 0, 0, 0.3); }

            /* Energy Footer */
            .energy-grid {
                display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
                margin-top: 24px;
            }
            .energy-pill {
                height: 72px;
                border-radius: 16px;
                background: linear-gradient(145deg, #e8e8e8, #f5f5f5);
                border: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: 
                    inset 3px 3px 8px rgba(0,0,0,0.1),
                    inset -3px -3px 8px rgba(255,255,255,0.9);
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                cursor: pointer; transition: background 0.3s;
                padding: 8px 4px;
                gap: 2px;
                overflow: hidden;
            }
            .energy-pill:hover { background: rgba(240, 240, 240, 0.8); }
            .pill-val { 
                font-size: 11px; 
                font-family: monospace; 
                font-weight: bold; 
                color: rgba(0, 0, 0, 0.9); 
                text-align: center;
                width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 0 2px;
            }
            .pill-label { font-size: 9px; text-transform: uppercase; color: rgba(0, 0, 0, 0.3); margin-top: 2px; }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        </style>

        <div class="sidebar">
            
            <!-- Camera -->
            <div class="camera-box" id="camera-box">
                <img src="${cameraImage}" class="camera-img" />
                <div class="camera-overlay"></div>
                <div class="live-badge">
                    <div class="pulse"></div> LIVE
                </div>
                <div class="cam-name" id="cam-name">${cameraName}</div>
            </div>

            <!-- Clock -->
            <div class="clock-box">
                <div class="clock-glow"></div>
                <div class="clock-time" id="clock-time">08:12</div>
                <div class="clock-date" id="clock-date">Wednesday, 24. Dec</div>
            </div>

            <!-- Calendar Inlet -->
            <div class="calendar-inlet" id="calendar-inlet">
                <div class="cal-icon" id="cal-icon">${calendarDate}</div>
                <div class="cal-info">
                    <div class="cal-title" id="cal-title">${calendarTitle}</div>
                    <div class="cal-sub" id="cal-sub">${calendarSub}</div>
                </div>
            </div>

            <!-- Weather -->
            <div class="weather-box">
                <div class="section-title">Outdoor</div>
                <div class="current-temp-box">
                    <span class="temp-val" id="val-temp">${currentTemp}</span>
                    <span class="temp-unit">°C</span>
                </div>
                
                <div class="graph-container">
                    <svg width="100%" height="100%" viewBox="0 0 280 60" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="grad-sidebar-light-${Date.now()}" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.5" />
                                <stop offset="40%" style="stop-color:#3b82f6;stop-opacity:0.25" />
                                <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
                            </linearGradient>
                            <filter id="shadow-sidebar-light-${Date.now()}">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                                <feOffset dx="0" dy="1" result="offsetblur"/>
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.3"/>
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <!-- Fill area (closed path) -->
                        <path d="${graphFillPath}" 
                              fill="url(#grad-sidebar-light-${Date.now()})" 
                              stroke="none" 
                              opacity="0.9" />
                        <!-- Line only (no fill, just the curve) -->
                        <path d="${graphLinePath}" 
                              fill="none" 
                              stroke="#3b82f6" 
                              stroke-width="2.5" 
                              stroke-linecap="round" 
                              stroke-linejoin="round" 
                              filter="url(#shadow-sidebar-light-${Date.now()})" />
                        <!-- Hover point indicator -->
                        <circle class="graph-point" 
                                id="graph-hover-point" 
                                r="4" 
                                fill="#3b82f6" 
                                stroke="white" 
                                stroke-width="2" 
                                cx="0" 
                                cy="0" />
                        <!-- Transparent overlay for mouse events -->
                        <rect id="graph-overlay" 
                              width="280" 
                              height="60" 
                              fill="transparent" 
                              style="cursor: crosshair;" />
                    </svg>
                    <!-- Tooltip -->
                    <div class="graph-tooltip" id="graph-tooltip">
                        <div class="graph-tooltip-temp"></div>
                        <div class="graph-tooltip-time"></div>
                    </div>
                </div>

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
                                <ha-icon icon="${icon}" id="day-icon-${i}" style="color: ${icon === 'mdi:weather-sunny' ? '#f59e0b' : 'rgba(0,0,0,0.6)'}; width: 20px;"></ha-icon>
                                <span class="day-temp" id="day-temp-${i}">${day.temperature !== undefined ? day.temperature : (day.templow !== undefined ? day.templow : '0')}°</span>
                                <span class="day-low" id="day-low-${i}">${day.templow !== undefined ? day.templow : (day.temperature !== undefined ? day.temperature : '0')}°</span>
                            </div>
                        `;
                    }).join('') || `
                        <div class="forecast-item">
                            <span class="day-name">Mi</span>
                            <ha-icon icon="mdi:weather-rainy" style="color: rgba(0,0,0,0.6); width: 20px;"></ha-icon>
                            <span class="day-temp">0,4°</span>
                            <span class="day-low">-1,4°</span>
                        </div>
                        <div class="forecast-item">
                            <span class="day-name">Do</span>
                            <ha-icon icon="mdi:cloud" style="color: rgba(0,0,0,0.6); width: 20px;"></ha-icon>
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
            </div>

            <!-- Energy Footer -->
            <div class="energy-grid">
                <div class="energy-pill" id="energy-grid">
                    <ha-icon icon="mdi:flash" style="width: 16px; height: 16px; color: rgba(0,0,0,0.3);"></ha-icon>
                    <span class="pill-val" id="val-grid">${gridValue}</span>
                    <span class="pill-label">Grid</span>
                </div>
                <div class="energy-pill" id="energy-solar">
                    <ha-icon icon="mdi:solar-power" style="width: 16px; height: 16px; color: rgba(0,0,0,0.3);"></ha-icon>
                    <span class="pill-val" id="val-solar">${solarValue}</span>
                    <span class="pill-label">Solar</span>
                </div>
                <div class="energy-pill" id="energy-home">
                    <ha-icon icon="mdi:home" style="width: 16px; height: 16px; color: rgba(0,0,0,0.3);"></ha-icon>
                    <span class="pill-val" id="val-home">${homeValue}</span>
                    <span class="pill-label">Home</span>
                </div>
            </div>

        </div>
        `;

        // Setup event listeners
        this.setupListeners();
    }

    setupListeners() {
        const cameraBox = this.shadowRoot?.getElementById('camera-box');
        const calendarInlet = this.shadowRoot?.getElementById('calendar-inlet');
        const energyGrid = this.shadowRoot?.getElementById('energy-grid');
        const energySolar = this.shadowRoot?.getElementById('energy-solar');
        const energyHome = this.shadowRoot?.getElementById('energy-home');
        const graphOverlay = this.shadowRoot?.getElementById('graph-overlay');

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
        
        // Graph hover events
        if (graphOverlay) {
            graphOverlay.addEventListener('mousemove', (e) => this._handleGraphHover(e));
            graphOverlay.addEventListener('mouseleave', () => this._handleGraphLeave());
        }
    }

    _handleCameraClick() {
        if (!this._hass) return;
        const cameraEntity = this.getCurrentCameraEntity();
        if (!cameraEntity) return;
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: cameraEntity }
        });
        this.dispatchEvent(event);
    }

    _handleCalendarClick() {
        if (!this._hass || !this.calendarEntity) return;
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: this.calendarEntity }
        });
        this.dispatchEvent(event);
    }

    _handleEnergyClick(entityId) {
        if (!this._hass || !entityId) return;
        const event = new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId: entityId }
        });
        this.dispatchEvent(event);
    }

    _handleGraphHover(e) {
        if (!this.temperatureHistoryWithTime || this.temperatureHistoryWithTime.length === 0) return;
        
        const svg = e.currentTarget.ownerSVGElement;
        if (!svg) return;
        
        // Get mouse position relative to SVG
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const svgWidth = 280;
        
        // Calculate which data point is closest
        const dataLength = this.temperatureHistoryWithTime.length;
        const stepX = dataLength > 1 ? svgWidth / (dataLength - 1) : 0;
        const index = Math.round(x / stepX);
        const clampedIndex = Math.max(0, Math.min(dataLength - 1, index));
        
        const dataPoint = this.temperatureHistoryWithTime[clampedIndex];
        if (!dataPoint) return;
        
        // Calculate Y position for the point (same logic as generateGraphPath)
        const graphData = this.temperatureHistory;
        const dataMax = Math.max(...graphData);
        const dataMin = Math.min(...graphData);
        const dataRange = dataMax - dataMin;
        const padding = Math.max(dataRange * 0.2, 2);
        const max = dataMax + padding;
        const min = dataMin - padding;
        const range = max - min;
        
        const normalized = (dataPoint.temp - min) / range;
        const margin = 60 * 0.05;
        const y = margin + (60 - 2 * margin) * (1 - normalized);
        const pointX = clampedIndex * stepX;
        
        // Update point position
        const point = this.shadowRoot?.getElementById('graph-hover-point');
        if (point) {
            point.setAttribute('cx', pointX);
            point.setAttribute('cy', y);
            point.classList.add('visible');
        }
        
        // Update tooltip
        const tooltip = this.shadowRoot?.getElementById('graph-tooltip');
        const tooltipTemp = tooltip?.querySelector('.graph-tooltip-temp');
        const tooltipTime = tooltip?.querySelector('.graph-tooltip-time');
        
        if (tooltip && tooltipTemp && tooltipTime) {
            tooltipTemp.textContent = `${dataPoint.temp.toFixed(1)}°C`;
            tooltipTime.textContent = dataPoint.time.toLocaleString('de-DE', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Position tooltip
            const tooltipRect = tooltip.getBoundingClientRect();
            let tooltipX = e.clientX - rect.left + 10;
            let tooltipY = e.clientY - rect.top - tooltipRect.height - 10;
            
            // Keep tooltip in bounds
            if (tooltipX + tooltipRect.width > rect.width) {
                tooltipX = e.clientX - rect.left - tooltipRect.width - 10;
            }
            if (tooltipY < 0) {
                tooltipY = e.clientY - rect.top + 10;
            }
            
            tooltip.style.left = `${tooltipX}px`;
            tooltip.style.top = `${tooltipY}px`;
            tooltip.classList.add('visible');
        }
    }

    _handleGraphLeave() {
        const point = this.shadowRoot?.getElementById('graph-hover-point');
        const tooltip = this.shadowRoot?.getElementById('graph-tooltip');
        
        if (point) {
            point.classList.remove('visible');
        }
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }

    // Fetch temperature history data from Home Assistant
    async fetchTemperatureHistory() {
        if (this.historyLoading || !this._hass || !this.temperatureEntity) return;
        
        this.historyLoading = true;
        
        try {
            // Calculate timestamps (last 7 days = 168 hours)
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - (168 * 60 * 60 * 1000)); // 168 hours ago
            
            // Format timestamps for Home Assistant API
            const startISO = startTime.toISOString();
            const endISO = endTime.toISOString();
            
            // Call Home Assistant History API
            const response = await this._hass.callWS({
                type: 'history/history_during_period',
                start_time: startISO,
                end_time: endISO,
                entity_ids: [this.temperatureEntity],
                minimal_response: true,
                no_attributes: true,
                significant_changes_only: true
            });
            
            if (response && response.length > 0 && response[0].length > 0) {
                // Extract temperature values with timestamps
                const historyData = response[0];
                // Sample data points (e.g., one per hour) to avoid too many points
                const sampleRate = Math.max(1, Math.floor(historyData.length / 168));
                const sampledDataWithTime = historyData
                    .filter((_, index) => index % sampleRate === 0)
                    .map(entry => ({
                        temp: parseFloat(entry.s),
                        time: entry.lu ? new Date(entry.lu * 1000) : new Date()
                    }))
                    .filter(item => !isNaN(item.temp));
                
                if (sampledDataWithTime.length > 0) {
                    this.temperatureHistoryWithTime = sampledDataWithTime;
                    this.temperatureHistory = sampledDataWithTime.map(item => item.temp);
                    // Re-render to update the graph
                    this.render();
                }
            }
        } catch (error) {
            console.error('Error fetching temperature history:', error);
            // Fallback: use current temperature state if available
            if (this._hass.states[this.temperatureEntity]) {
                const currentTemp = parseFloat(this._hass.states[this.temperatureEntity].state);
                if (!isNaN(currentTemp)) {
                    this.temperatureHistory = [currentTemp, currentTemp, currentTemp, currentTemp, currentTemp];
                }
            }
        } finally {
            this.historyLoading = false;
        }
    }

    // Helper to create smooth SVG path from data points with curved lines
    generateGraphPath(data, width, height) {
        if (!data || data.length === 0) return { line: '', fill: '' };
        
        // Calculate range with padding for better visualization
        const dataMax = Math.max(...data);
        const dataMin = Math.min(...data);
        const dataRange = dataMax - dataMin;
        
        // Add padding: 20% of range, minimum 2 units
        const padding = Math.max(dataRange * 0.2, 2);
        const max = dataMax + padding;
        const min = dataMin - padding;
        const range = max - min;
        
        // Ensure we have a valid range
        if (range <= 0) {
            const midY = height / 2;
            return { 
                line: `M 0,${midY} L ${width},${midY}`,
                fill: `M 0,${midY} L ${width},${midY} L ${width},${height} L 0,${height} Z`
            };
        }
        
        const stepX = data.length > 1 ? width / (data.length - 1) : 0;
        
        // Build line points with proper Y scaling (inverted: higher values = lower Y)
        const points = data.map((val, i) => {
            const x = i * stepX;
            // Calculate Y: higher temp = lower Y position (closer to top)
            const normalized = (val - min) / range;
            // Add small margin at top and bottom (5% of height)
            const margin = height * 0.05;
            const y = margin + (height - 2 * margin) * (1 - normalized);
            return [x, y];
        });

        if (points.length === 0) return { line: '', fill: '' };
        
        // Create smooth curve using Catmull-Rom spline
        const [firstX, firstY] = points[0];
        let linePath = `M ${firstX},${firstY} `;
        
        if (points.length === 1) {
            // Single point - just draw horizontal line
            linePath += `L ${width},${firstY}`;
        } else if (points.length === 2) {
            // Two points - straight line
            const [x, y] = points[1];
            linePath += `L ${x},${y}`;
        } else {
            // Multiple points - use smooth curves
            for (let i = 0; i < points.length - 1; i++) {
                const [x0, y0] = points[i];
                const [x1, y1] = points[i + 1];
                
                // Control points for smooth bezier curve
                const tension = 0.3; // Smoothness factor (0 = sharp, 1 = very smooth)
                const d = Math.abs(x1 - x0) * tension;
                
                linePath += `C ${x0 + d},${y0} ${x1 - d},${y1} ${x1},${y1} `;
            }
        }
        
        // Create fill path (closed area under the curve)
        const [lastX, lastY] = points[points.length - 1];
        let fillPath = linePath; // Start with the same curve
        fillPath += ` L ${lastX},${height} L ${firstX},${height} Z`; // Close at bottom
        
        return { line: linePath.trim(), fill: fillPath.trim() };
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

    getCardSize() {
        return 10; // Tall card
    }
}

customElements.define('prism-sidebar-light', PrismSidebarLightCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "prism-sidebar-light",
    name: "Prism Sidebar Light",
    preview: true,
    description: "Full height sidebar with clock, camera, weather and energy stats (light theme)"
});

