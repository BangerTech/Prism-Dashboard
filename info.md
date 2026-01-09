## <img src="https://raw.githubusercontent.com/BangerTech/Prism-Dashboard/main/custom-components/images/prism-logo.png" alt="Prism" width="80" align="center"> Prism Dashboard

A modern, glassmorphism-inspired dashboard for Home Assistant.

## Custom Cards Included

This repository contains the following custom cards:

- **prism-room** - Room overview card with grouped entities and status icons
- **prism-navigation** - Floating navigation bar for dashboard views
- **prism-spacer** - Invisible placeholder for layout spacing
- **prism-heat** - Thermostat knob card with glassmorphism design
- **prism-heat-small** - Compact heating card with inlet styling
- **prism-button** - Entity button card with neumorphism effects and brightness slider
- **prism-media** - Media player card with glassmorphism design
- **prism-calendar** - Calendar card for displaying upcoming events
- **prism-shutter** - Horizontal blinds card with inlet slider
- **prism-shutter-vertical** - Vertical blinds card with compact design
- **prism-vacuum** - Robot vacuum card with animation and suction control
- **prism-vacuum-switchbot** - Specialized card for SwitchBot vacuums (S10, S1, K10+)
- **prism-led** - Light card with color wheel and temperature control
- **prism-3dprinter** - 3D printer card with glassmorphism design
- **prism-bambu** - Bambu Lab 3D printer card with AMS support
- **prism-creality** - Creality 3D printer card (K1, K1 Max, K1 SE) - supports Moonraker/Klipper
- **prism-energy** - Energy flow card for solar, battery, grid and EV
- **prism-energy-horizontal** - Horizontal energy flow card
- **prism-sidebar** - Sidebar card with camera, clock, calendar and weather

All cards are also available as **Light Theme** versions.

## Installation

After installing via HACS:

1. Go to **Settings → Dashboards → Resources** (top right)
2. Click **"Add Resource"**
3. Add the bundled file:
   - **URL:** `/hacsfiles/Prism-Dashboard/prism-dashboard.js`
   - **Type:** `JavaScript Module`
4. Restart Home Assistant

> **✨ All 29 cards included!** One file contains all dark and light theme cards with automatic cache updates.

## Usage

All cards can be used in the visual dashboard editor. Simply search for "prism" in the card browser.

For more information, see the [README.md](https://github.com/BangerTech/Prism-Dashboard).
