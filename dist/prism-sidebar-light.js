class PrismSidebarLightCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.timer = null;
        this.cameraTimer = null;
        this.hasRendered = false;
        this.currentCameraIndex = 0;
        this.cameraEntities = [];
    }

    static getStubConfig() {
        return {
            camera_entity: "camera.example",
            camera_entity_2: "",
            camera_entity_3: "",
            rotation_interval: 10,
            weather_entity: "weather.example",
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
                    selector: { entity: { domain: "camera" } }
                },
                {
                    name: "camera_entity_2",
                    selector: { entity: { domain: "camera" } }
                },
                {
                    name: "camera_entity_3",
                    selector: { entity: { domain: "camera" } }
                },
                {
                    name: "rotation_interval",
                    selector: { number: { min: 3, max: 60, step: 1, unit_of_measurement: "Sekunden" } },
                    default: 10
                },
                {
                    name: "weather_entity",
                    selector: { entity: { domain: "weather" } }
                },
                {
                    name: "grid_entity",
                    selector: { entity: {} }
                },
                {
                    name: "solar_entity",
                    selector: { entity: {} }
                },
                {
                    name: "home_entity",
                    selector: { entity: {} }
                },
                {
                    name: "calendar_entity",
                    selector: { entity: { domain: "calendar" } }
                }
            ]
        };
    }

    setConfig(config) {
        this.config = { ...config };
        // Default entities if not provided
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
        
        // Reset camera index
        this.currentCameraIndex = 0;
        
        // Stop existing camera rotation timer
        if (this.cameraTimer) {
            clearInterval(this.cameraTimer);
            this.cameraTimer = null;
        }
        
        // Initialize preview values
        if (!this._hass) {
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
            gridEl.textContent = `${gridState.state} ${gridState.attributes.unit_of_measurement || 'kW'}`;
        }
        if (solarEl && solarState) {
            solarEl.textContent = `${solarState.state} ${solarState.attributes.unit_of_measurement || 'kW'}`;
        }
        if (homeEl && homeState) {
            homeEl.textContent = `${homeState.state} ${homeState.attributes.unit_of_measurement || 'kW'}`;
        }
        
        if (tempEl && weatherState) {
            tempEl.textContent = weatherState.attributes.temperature || '0';
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
                    subText = 'Ganztägig';
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

        // Update weather forecast
        if (weatherState && weatherState.attributes.forecast) {
            const forecast = weatherState.attributes.forecast.slice(0, 3);
            forecast.forEach((day, i) => {
                const dayNameEl = this.shadowRoot?.getElementById(`day-name-${i}`);
                const dayTempEl = this.shadowRoot?.getElementById(`day-temp-${i}`);
                const dayLowEl = this.shadowRoot?.getElementById(`day-low-${i}`);
                const dayIconEl = this.shadowRoot?.getElementById(`day-icon-${i}`);

                if (dayNameEl && day.datetime) {
                    const date = new Date(day.datetime);
                    dayNameEl.textContent = date.toLocaleDateString('de-DE', { weekday: 'short' });
                }
                if (dayTempEl) {
                    dayTempEl.textContent = `${day.temperature || '0'}°`;
                }
                if (dayLowEl) {
                    dayLowEl.textContent = `${day.templow || '0'}°`;
                }
                if (dayIconEl && day.condition) {
                    const iconMap = {
                        'sunny': 'mdi:weather-sunny',
                        'partlycloudy': 'mdi:weather-partly-cloudy',
                        'cloudy': 'mdi:cloud',
                        'rainy': 'mdi:weather-rainy',
                        'snowy': 'mdi:weather-snowy'
                    };
                    const icon = iconMap[day.condition.toLowerCase()] || 'mdi:weather-cloudy';
                    dayIconEl.setAttribute('icon', icon);
                }
            });
        }
    }


    render() {
        // Get weather data for graph
        let weatherData = [1.2, 1.5, 2.1, 2.8, 2.5, 1.9, 1.4, 1.0, 0.8]; // Default
        if (this._hass && this.weatherEntity) {
            const weatherState = this._hass.states[this.weatherEntity];
            if (weatherState && weatherState.attributes.forecast) {
                weatherData = weatherState.attributes.forecast.slice(0, 9).map(f => f.temperature || 0);
            }
        }
        const graphPath = this.generateGraphPath(weatherData, 280, 60);

        // Get entity states for preview/display
        const cameraEntity = this.getCurrentCameraEntity();
        const cameraState = this._hass?.states[cameraEntity];
        const weatherState = this._hass?.states[this.weatherEntity];
        const calendarState = this._hass?.states[this.calendarEntity];
        const gridState = this._hass?.states[this.gridEntity];
        const solarState = this._hass?.states[this.solarEntity];
        const homeState = this._hass?.states[this.homeEntity];

        const cameraImage = cameraState?.attributes?.entity_picture || 'https://images.unsplash.com/photo-1558435186-d31d1eb6fa3c?q=80&w=600&auto=format&fit=crop';
        const cameraName = cameraState?.attributes?.friendly_name || cameraEntity.split('.')[1] || 'Camera';
        const currentTemp = weatherState?.attributes?.temperature || '0';
        const calendarTitle = calendarState?.attributes?.message || 'Keine Termine';
        const calendarSub = calendarState?.attributes?.all_day ? 'Ganztägig' : 
                           (calendarState?.attributes?.start_time ? 
                            new Date(calendarState.attributes.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 
                            '');
        const calendarDate = calendarState?.attributes?.start_time ? 
                            new Date(calendarState.attributes.start_time).getDate() : 
                            new Date().getDate();
        const gridValue = gridState ? `${gridState.state} ${gridState.attributes.unit_of_measurement || 'kW'}` : '0 kW';
        const solarValue = solarState ? `${solarState.state} ${solarState.attributes.unit_of_measurement || 'kW'}` : '0 kW';
        const homeValue = homeState ? `${homeState.state} ${homeState.attributes.unit_of_measurement || 'kW'}` : '0 kW';

        // Get forecast
        const forecast = weatherState?.attributes?.forecast?.slice(0, 3) || [];

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
                background: rgba(240, 240, 240, 0.6);
                border: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: inset 2px 2px 5px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.1);
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
                height: 64px; width: 100%; margin-bottom: 24px; position: relative;
                padding: 4px 0;
            }
            .graph-container svg {
                display: block;
                width: 100%;
                height: 100%;
            }
            .forecast-grid {
                display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
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
                height: 64px;
                border-radius: 16px;
                background: rgba(240, 240, 240, 0.6);
                border: 1px solid rgba(0, 0, 0, 0.05);
                box-shadow: inset 2px 2px 4px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.1);
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                cursor: pointer; transition: background 0.3s;
                padding-top: 8px;
                gap: 4px;
            }
            .energy-pill:hover { background: rgba(240, 240, 240, 0.8); }
            .pill-val { font-size: 12px; font-family: monospace; font-weight: bold; color: rgba(0, 0, 0, 0.9); }
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
                            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3" />
                                <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
                            </linearGradient>
                        </defs>
                        <path d="${graphPath}" fill="url(#grad)" stroke="#3b82f6" stroke-width="2" />
                    </svg>
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
                                <span class="day-temp" id="day-temp-${i}">${day.temperature || '0'}°</span>
                                <span class="day-low" id="day-low-${i}">${day.templow || '0'}°</span>
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

    // Helper to create smooth SVG path from data points
    generateGraphPath(data, width, height) {
        if (!data || data.length === 0) return '';
        
        const max = Math.max(...data) + 0.5;
        const min = Math.min(...data) - 0.5;
        const range = max - min;
        
        const stepX = width / (data.length - 1);
        
        let path = `M 0,${height} `; // Start bottom-left
        
        // Build line points
        const points = data.map((val, i) => {
            const x = i * stepX;
            const y = height - ((val - min) / range) * height;
            return [x, y];
        });

        // Start path at first point
        path += `L ${points[0][0]},${points[0][1]} `;

        // Simple line segments
        for (let i = 0; i < points.length - 1; i++) {
            const [x1, y1] = points[i+1];
            path += `L ${x1},${y1} `;
        }

        // Close shape for area fill
        path += `L ${width},${height} Z`;
        
        return path;
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

