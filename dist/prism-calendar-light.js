
class PrismCalendarLightCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._events = [];
    this._loading = false;
    this._lastFetch = 0;
  }

  static getStubConfig() {
    return { 
      entity: "calendar.example", 
      max_events: 3,
      icon_color: "#f87171",
      dot_color: "#f87171"
    }
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: { entity: { domain: "calendar" } }
        },
        {
          name: "max_events",
          selector: { number: { min: 1, max: 10, step: 1, mode: "box" } }
        },
        {
          name: "icon_color",
          selector: { color_rgb: {} }
        },
        {
          name: "dot_color",
          selector: { color_rgb: {} }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    // Create a copy to avoid modifying read-only config object
    this.config = { ...config };
    // Set defaults
    if (!this.config.max_events) {
      this.config.max_events = 3;
    }
    // Normalize colors (convert RGB arrays to hex if needed)
    if (this.config.icon_color) {
      this.config.icon_color = this._normalizeColor(this.config.icon_color);
    } else {
      this.config.icon_color = "#f87171";
    }
    if (this.config.dot_color) {
      this.config.dot_color = this._normalizeColor(this.config.dot_color);
    } else {
      this.config.dot_color = "#f87171";
    }
    this._events = [];
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config && this.config.entity) {
      const entity = hass.states[this.config.entity];
      this._entity = entity || null;
      
      // Fetch calendar events every 60 seconds or on first load
      const now = Date.now();
      if (now - this._lastFetch > 60000 || this._events.length === 0) {
        this._fetchCalendarEvents();
      } else {
        this.render();
      }
    }
  }

  async _fetchCalendarEvents() {
    if (!this._hass || !this.config.entity || this._loading) return;
    
    this._loading = true;
    this._lastFetch = Date.now();
    
    try {
      // Calculate date range: now to 30 days in the future
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // Use REST API (works with Google Calendar Integration)
      const authToken = this._hass.auth.data.access_token || this._hass.auth.accessToken;
      const response = await fetch(
        `/api/calendars/${this.config.entity}?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const eventsArray = await response.json();
      
      // Process events - REST API returns array directly
      if (Array.isArray(eventsArray) && eventsArray.length > 0) {
        this._events = eventsArray
          .map(event => {
            // REST API returns: { start: { dateTime: "..." } or { date: "..." }, end: {...}, summary: "...", ... }
            const title = event.summary || event.title || event.message || 'Unbenannt';
            // Handle both dateTime (timed) and date (all-day) formats
            const start = event.start?.dateTime || event.start?.date || event.start;
            const end = event.end?.dateTime || event.end?.date || event.end;
            
            return { title, start, end };
          })
          .filter(event => event.start)
          .sort((a, b) => {
            const dateA = new Date(a.start);
            const dateB = new Date(b.start);
            return dateA - dateB;
          })
          .slice(0, this.config.max_events || 3);
      } else {
        // Fallback to entity attributes if REST API returns empty
        if (this._entity && this._entity.attributes) {
          const attr = this._entity.attributes;
          if (attr.message && attr.start_time) {
            this._events = [{
              title: attr.message,
              start: attr.start_time,
              end: attr.end_time || attr.start_time
            }];
          } else {
            this._events = [];
          }
        } else {
          this._events = [];
        }
      }
      
    } catch (error) {
      console.warn('Prism Calendar Light: Could not fetch calendar events:', error);
      // Fallback to entity attributes
      if (this._entity && this._entity.attributes) {
        const attr = this._entity.attributes;
        if (attr.message && attr.start_time) {
          this._events = [{
            title: attr.message,
            start: attr.start_time,
            end: attr.end_time || attr.start_time
          }];
        } else {
          this._events = [];
        }
      } else {
        this._events = [];
      }
    }
    
    this._loading = false;
    this.render();
  }

  getCardSize() {
    return 3;
  }

  connectedCallback() {
    if (this.config) {
      this.render();
    }
  }

  render() {
    if (!this.config || !this.config.entity) return;
    
    const maxEvents = this.config.max_events || 3;
    const iconColor = this._normalizeColor(this.config.icon_color || "#f87171");
    const dotColor = this._normalizeColor(this.config.dot_color || "#f87171");
    
    // Use fetched events
    const events = this._events.slice(0, maxEvents);
    
    // Generate event items
    let eventItems = '';
    if (events.length === 0) {
      // No events or still loading
      eventItems = `
        <div class="event-item" style="opacity: 0.6;">
          <div class="timeline">
            <div class="dot"></div>
          </div>
          <div class="event-info">
            <div class="event-title">${this._loading ? 'Lade Termine...' : 'Keine kommenden Termine'}</div>
            <div class="event-time">
              <ha-icon icon="mdi:clock-outline" style="--mdc-icon-size: 12px;"></ha-icon>
              -
            </div>
          </div>
        </div>
      `;
    } else {
      events.forEach((event, i) => {
        const isActive = i === 0;
        let timeStr = 'Ganztägig';
        
        if (event.start) {
          try {
            const date = new Date(event.start);
            if (!isNaN(date.getTime())) {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              
              // Check if it's an all-day event (no time component or midnight)
              const isAllDay = event.start.length === 10 || (date.getHours() === 0 && date.getMinutes() === 0);
              
              if (eventDate.getTime() === today.getTime()) {
                // Today
                timeStr = isAllDay ? 'Heute (ganztägig)' : `Heute, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              } else {
                // Future date
                const daysDiff = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
                if (daysDiff === 1) {
                  timeStr = isAllDay ? 'Morgen (ganztägig)' : `Morgen, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                } else if (daysDiff > 1 && daysDiff <= 7) {
                  timeStr = isAllDay 
                    ? date.toLocaleDateString('de-DE', { weekday: 'long' }) + ' (ganztägig)'
                    : date.toLocaleDateString('de-DE', { weekday: 'short' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                  timeStr = isAllDay
                    ? date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' (ganztägig)'
                    : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              }
            }
          } catch (e) {
            // If date parsing fails, keep default "Ganztägig"
          }
        }
        
        eventItems += `
          <div class="event-item" style="opacity: ${isActive ? '1' : '0.8'};">
            <div class="timeline">
              <div class="dot ${isActive ? 'active' : ''}" style="${isActive ? `background: ${dotColor}; box-shadow: 0 0 8px ${dotColor}99;` : ''}"></div>
            </div>
            <div class="event-info">
              <div class="event-title">${event.title}</div>
              <div class="event-time">
                <ha-icon icon="mdi:clock-outline" style="--mdc-icon-size: 12px;"></ha-icon>
                ${timeStr}
              </div>
            </div>
          </div>
        `;
      });
      
      // Fill remaining slots with placeholders if needed
      for (let i = events.length; i < maxEvents; i++) {
        eventItems += `
          <div class="event-item" style="opacity: 0.4;">
            <div class="timeline">
              <div class="dot"></div>
            </div>
            <div class="event-info">
              <div class="event-title">Keine weiteren Termine</div>
              <div class="event-time">
                <ha-icon icon="mdi:clock-outline" style="--mdc-icon-size: 12px;"></ha-icon>
                -
              </div>
            </div>
          </div>
        `;
      }
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.6);
          border-top: 1px solid rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid rgba(0, 0, 0, 0.15);
          box-shadow: 
            0 10px 30px -5px rgba(0, 0, 0, 0.15),
            0 4px 10px rgba(0,0,0,0.08),
            inset 0 1px 1px rgba(255,255,255,0.9);
          padding: 20px;
          color: #1a1a1a;
        }
        
        .header {
            display: flex; gap: 12px; align-items: center; margin-bottom: 24px; padding-left: 8px;
        }
        .icon-box {
            width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            flex-shrink: 0;
        }
        .icon-box ha-icon {
            width: 22px; height: 22px; --mdc-icon-size: 22px;
        }
        .title { font-size: 1.125rem; font-weight: 700; color: #1a1a1a; line-height: 1; }
        .subtitle { font-size: 0.75rem; font-weight: 500; color: #666; text-transform: uppercase; margin-top: 4px; }
        
        .event-list {
            display: flex; flex-direction: column; gap: 12px;
        }
        .event-item {
            display: flex; gap: 16px; align-items: center;
            background: rgba(255, 255, 255, 0.5);
            box-shadow: inset 2px 2px 5px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.1);
            border-radius: 12px;
            padding: 12px 16px;
            border: 1px solid rgba(0,0,0,0.03);
        }
        .timeline {
            display: flex; flex-direction: column; align-items: center; justify-content: center; width: 42px; flex-shrink: 0;
            margin-left: 1px; /* Precise alignment adjustment */
        }
        /* Visual alignment helper: The header icon is 42px wide. We want these dots centered relative to that column */
        
        .dot {
            width: 8px; height: 8px; border-radius: 50%; background: rgba(0,0,0,0.2);
        }
        .dot.active {
            /* Color set inline */
        }
        
        .event-info {
            flex: 1;
        }
        .event-title { font-size: 15px; font-weight: 500; color: #1a1a1a; margin-bottom: 4px; }
        .event-time { font-size: 12px; color: rgba(0,0,0,0.5); display: flex; align-items: center; gap: 6px; }
        
      </style>
      <div class="card">
        <div class="header">
            <div class="icon-box" style="background: ${this._hexToRgba(iconColor, 0.15)}; color: ${iconColor};">
                <ha-icon icon="mdi:calendar"></ha-icon>
            </div>
            <div>
                <div class="title">Kalender</div>
                <div class="subtitle">${events.length > 0 ? `${events.length} Termine` : 'Nächstes Event'}</div>
            </div>
        </div>
        
        <div class="event-list">
            ${eventItems}
        </div>
      </div>
    `;
  }

  _normalizeColor(color) {
    // If color is an array [r, g, b] from color_rgb selector, convert to hex
    if (Array.isArray(color) && color.length >= 3) {
      const r = color[0].toString(16).padStart(2, '0');
      const g = color[1].toString(16).padStart(2, '0');
      const b = color[2].toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    // If it's already a hex string, return as is
    return color;
  }

  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

customElements.define('prism-calendar-light', PrismCalendarLightCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-calendar-light",
  name: "Prism Calendar Light",
  preview: true,
  description: "A custom calendar card with configurable events and colors"
});
