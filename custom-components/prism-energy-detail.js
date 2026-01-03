/**
 * Prism Energy Details Card
 * Standalone details section with optional bare mode (no bg/border/shadow)
 *
 * Features:
 * - Toggle: show_header
 * - Toggle: bare (removes background/border/shadow/blur)
 * - Toggle: grid_sign (openems vs inverted)
 * - Labels: Import / Export (instead of Bezug/Einspeisung)
 * - Click-to-more-info on each column
 * - No solar module breakdown (total solar only)
 *
 * @version 1.2.0
 */

class PrismEnergyDetailsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._initialized = false;
  }

  static getStubConfig() {
    return {
      // Visual options
      bare: false,
      show_header: false,
      name: "Energy Details",

      // Grid sign convention
      // openems: + = import, - = export
      // inverted: - = import, + = export
      grid_sign: "openems",

      // Entities
      solar_power: "",
      grid_power: "",
      battery_soc: "",
      battery_power: "",
      home_consumption: "",

      // Max values for bars
      max_solar_power: 10000,
      max_grid_power: 10000,
      max_consumption: 10000,

      // Click target for battery column: "soc" (default) or "power"
      battery_click_target: "soc"
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "bare",
          label: "Ohne Hintergrund/Rahmen/Shadow (Bare Mode)",
          selector: { boolean: {} }
        },
        {
          name: "show_header",
          label: "Header anzeigen",
          selector: { boolean: {} }
        },
        {
          name: "name",
          label: "Kartenname (nur wenn Header an)",
          selector: { text: {} }
        },

        { name: "", type: "divider" },

        { name: "solar_power", label: "Solar Leistung (Gesamt)", required: true, selector: { entity: { domain: "sensor" } } },
        { name: "grid_power", label: "Netz Leistung", required: true, selector: { entity: { domain: "sensor" } } },

        {
          name: "grid_sign",
          label: "Netz-Vorzeichen (Import/Export)",
          selector: {
            select: {
              options: [
                { value: "openems", label: "OpenEMS: + = Import, - = Export" },
                { value: "inverted", label: "Invertiert: - = Import, + = Export" }
              ]
            }
          }
        },

        { name: "battery_soc", label: "Batterie SOC %", required: true, selector: { entity: { domain: "sensor" } } },
        { name: "battery_power", label: "Batterie Leistung", required: true, selector: { entity: { domain: "sensor" } } },
        { name: "home_consumption", label: "Hausverbrauch", required: true, selector: { entity: { domain: "sensor" } } },

        {
          name: "battery_click_target",
          label: "Klick auf Speicher öffnet",
          selector: {
            select: {
              options: [
                { value: "soc", label: "SOC (battery_soc)" },
                { value: "power", label: "Leistung (battery_power)" }
              ]
            }
          }
        },

        { name: "", type: "divider" },

        {
          type: "expandable",
          name: "",
          title: "📊 Maximalwerte für Fortschrittsbalken",
          schema: [
            { name: "max_solar_power", label: "Max. Solar-Leistung (Watt)", selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } } },
            { name: "max_grid_power", label: "Max. Netz-Leistung (Watt)", selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } } },
            { name: "max_consumption", label: "Max. Verbrauch (Watt)", selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } } }
          ]
        }
      ]
    };
  }

  setConfig(config) {
    // Support fallback: style: "bare"
    const bareFromStyle = (typeof config.style === "string" && config.style.toLowerCase() === "bare");

    this._config = {
      bare: config.bare === true || bareFromStyle === true,
      show_header: config.show_header === true,
      name: config.name || "Energy Details",

      grid_sign: (config.grid_sign === "inverted") ? "inverted" : "openems",

      solar_power: config.solar_power || "",
      grid_power: config.grid_power || "",
      battery_soc: config.battery_soc || "",
      battery_power: config.battery_power || "",
      home_consumption: config.home_consumption || "",

      max_solar_power: config.max_solar_power || 10000,
      max_grid_power: config.max_grid_power || 10000,
      max_consumption: config.max_consumption || 10000,

      battery_click_target: config.battery_click_target === "power" ? "power" : "soc"
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this.render();
      this._initialized = true;
      this._setupEventListeners();
    } else {
      this._updateValues();
    }
  }

  getCardSize() {
    return 2;
  }

  _openMoreInfo(entityId) {
    if (!entityId || !this._hass) return;
    const event = new Event("hass-more-info", { bubbles: true, composed: true });
    event.detail = { entityId };
    this.dispatchEvent(event);
  }

  _setupEventListeners() {
    if (!this.shadowRoot) return;

    this.shadowRoot.querySelectorAll(".detail-col[data-entity]").forEach(col => {
      col.addEventListener("click", (e) => {
        e.stopPropagation();
        const entityId = col.getAttribute("data-entity");
        if (entityId) this._openMoreInfo(entityId);
      });
    });
  }

  _getState(entityId, defaultVal = 0) {
    if (!entityId || !this._hass) return defaultVal;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return defaultVal;
    const val = parseFloat(stateObj.state);
    return isNaN(val) ? defaultVal : val;
  }

  _formatPower(watts) {
    const absWatts = Math.abs(watts);
    if (absWatts >= 1000) return `${(absWatts / 1000).toFixed(1)} kW`;
    return `${Math.round(absWatts)} W`;
  }

  _isGridExport(gridPower) {
    // openems: + import, - export  => export if gridPower < -50
    // inverted: - import, + export => export if gridPower > 50
    if (this._config.grid_sign === "inverted") {
      return gridPower > 50;
    }
    return gridPower < -50;
  }

  _updateText(selector, value) {
    const el = this.shadowRoot?.querySelector(selector);
    if (el && el.textContent !== value) el.textContent = value;
  }

  _updateBar(selector, pct, bg) {
    const el = this.shadowRoot?.querySelector(selector);
    if (!el) return;
    const clamped = Math.max(0, Math.min(100, pct));
    el.style.width = `${clamped}%`;
    if (bg) el.style.background = bg;
  }

  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;

    const solarPower = this._getState(this._config.solar_power, 0);
    const gridPower = this._getState(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0);
    const batteryPower = this._getState(this._config.battery_power, 0);
    const homeConsumption = this._getState(this._config.home_consumption, 0);

    const isGridExport = this._isGridExport(gridPower);

    // Text values
    this._updateText(".val-solar", this._formatPower(solarPower));
    this._updateText(".val-grid", this._formatPower(gridPower));
    this._updateText(".label-grid", isGridExport ? "Export" : "Import");
    this._updateText(".val-consumption", this._formatPower(homeConsumption));
    this._updateText(".val-batt-power", this._formatPower(Math.abs(batteryPower)));
    this._updateText(".val-batt-soc", `${Math.round(batterySoc)}%`);

    // Bars
    this._updateBar(".bar-solar", (solarPower / this._config.max_solar_power) * 100);
    this._updateBar(".bar-grid", (Math.abs(gridPower) / this._config.max_grid_power) * 100, isGridExport ? "#10B981" : "#ef4444");
    this._updateBar(".bar-consumption", (homeConsumption / this._config.max_consumption) * 100);
    this._updateBar(".bar-battery", batterySoc);

    // Battery click entity
    const battEntity = this._config.battery_click_target === "power" ? this._config.battery_power : this._config.battery_soc;
    const battCol = this.shadowRoot.querySelector(".col-battery");
    if (battCol) battCol.setAttribute("data-entity", battEntity || "");
  }

  render() {
    if (!this.shadowRoot) return;

    const solarPower = this._getState(this._config.solar_power, 0);
    const gridPower = this._getState(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0);
    const batteryPower = this._getState(this._config.battery_power, 0);
    const homeConsumption = this._getState(this._config.home_consumption, 0);

    const isGridExport = this._isGridExport(gridPower);

    const colors = {
      solar: "#F59E0B",
      battery: "#10B981",
      home: "#8B5CF6"
    };

    const batteryClickEntity =
      this._config.battery_click_target === "power"
        ? this._config.battery_power
        : this._config.battery_soc;

    const cardClass = this._config.bare ? "card bare" : "card";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* Default (glass) */
        .card {
          border-radius: 24px;
          overflow: hidden;
          background: rgba(30, 32, 36, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.3);
          color: white;
          box-sizing: border-box;
        }

        /* Bare mode: remove visuals */
        .card.bare {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border-radius: 0 !important;
          overflow: visible !important;
        }

        /* Optional header */
        .header {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .card.bare .header {
          background: transparent !important;
          border-bottom: none !important;
          padding: 0 0 10px 0 !important;
        }

        .title {
          font-size: 1rem;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 20px 24px;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .card.bare .details-grid {
          padding: 0 !important;
          background: transparent !important;
          backdrop-filter: none !important;
          border-top: none !important;
        }

        @media (max-width: 600px) {
          .details-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .detail-col {
          display: flex;
          flex-direction: column;
          min-height: 90px;
          border-radius: 14px;
          padding: 10px 10px 8px 10px;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .detail-col:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,0.03);
        }

        .detail-col:active { transform: translateY(0px) scale(0.99); }

        .card.bare .detail-col:hover { background: transparent !important; }

        .detail-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-header {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
        }

        .detail-label { color: rgba(255, 255, 255, 0.6); }

        .detail-val {
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
        }

        .detail-bar {
          height: 6px;
          width: 100%;
          border-radius: 999px;
          overflow: hidden;
          margin-top: auto;
          background: rgba(0, 0, 0, 0.4);
          box-shadow:
            inset 1px 1px 3px rgba(0, 0, 0, 0.5),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.3);
        }

        .card.bare .detail-bar {
          background: rgba(255,255,255,0.06) !important;
          box-shadow: none !important;
          border: none !important;
        }

        .detail-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s ease;
          box-shadow: 0 0 6px currentColor;
        }

        .card.bare .detail-fill { box-shadow: none !important; }
      </style>

      <div class="${cardClass}">
        ${this._config.show_header ? `
          <div class="header">
            <div class="title">${this._config.name || "Energy Details"}</div>
          </div>
        ` : ""}

        <div class="details-grid">
          <!-- Solar -->
          <div class="detail-col col-solar" data-entity="${this._config.solar_power}">
            <div class="detail-header">Solar</div>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">Power</span>
                <span class="detail-val val-solar" style="color:${colors.solar};">${this._formatPower(solarPower)}</span>
              </div>
            </div>
            <div class="detail-bar">
              <div class="detail-fill bar-solar" style="width:${Math.min(100, (solarPower / this._config.max_solar_power) * 100)}%; background:${colors.solar};"></div>
            </div>
          </div>

          <!-- Grid -->
          <div class="detail-col col-grid" data-entity="${this._config.grid_power}">
            <div class="detail-header">Grid</div>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label label-grid">${isGridExport ? "Export" : "Import"}</span>
                <span class="detail-val val-grid" style="color:${isGridExport ? colors.battery : "#ef4444"};">${this._formatPower(gridPower)}</span>
              </div>
            </div>
            <div class="detail-bar">
              <div class="detail-fill bar-grid" style="width:${Math.min(100, (Math.abs(gridPower) / this._config.max_grid_power) * 100)}%; background:${isGridExport ? colors.battery : "#ef4444"};"></div>
            </div>
          </div>

          <!-- Consumption -->
          <div class="detail-col col-consumption" data-entity="${this._config.home_consumption}">
            <div class="detail-header">Consumption</div>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">Current</span>
                <span class="detail-val val-consumption">${this._formatPower(homeConsumption)}</span>
              </div>
            </div>
            <div class="detail-bar">
              <div class="detail-fill bar-consumption" style="width:${Math.min(100, (homeConsumption / this._config.max_consumption) * 100)}%; background:${colors.home};"></div>
            </div>
          </div>

          <!-- Battery -->
          <div class="detail-col col-battery" data-entity="${batteryClickEntity || ""}">
            <div class="detail-header">Battery</div>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">Power</span>
                <span class="detail-val val-batt-power">${this._formatPower(Math.abs(batteryPower))}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">SOC</span>
                <span class="detail-val val-batt-soc" style="color:${colors.battery};">${Math.round(batterySoc)}%</span>
              </div>
            </div>
            <div class="detail-bar">
              <div class="detail-fill bar-battery" style="width:${batterySoc}%; background:${colors.battery};"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._setupEventListeners();
  }
}

customElements.define("prism-energy-details", PrismEnergyDetailsCard);

// Register with HA card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-energy-details",
  name: "Prism Energy Details",
  preview: true,
  description: "Standalone details section with bare mode + grid sign toggle"
});

console.info(
  `%c PRISM-ENERGY-DETAILS %c v1.2.0 `,
  "background:#F59E0B;color:black;font-weight:bold;padding:2px 6px;border-radius:4px 0 0 4px;",
  "background:#1e2024;color:white;font-weight:bold;padding:2px 6px;border-radius:0 4px 4px 0;"
);
