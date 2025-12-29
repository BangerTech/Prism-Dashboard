## Prism-Dashboard

💎 A modern, glassmorphism-inspired dashboard for Home Assistant, built on the popular Mushroom Cards.

---

<p align="center">
  <strong>Dashboard Configuration</strong><br>
  <img src="https://github.com/user-attachments/assets/6048858f-4ba0-40a8-95b8-7787cde1d8ab" alt="Prism Dashboard - Dashboard Configuration" width="85%">
</p>

<p align="center">
  <strong>Custom Cards</strong><br>
  <img src="https://raw.githubusercontent.com/BangerTech/Prism-Dashboard/main/custom-components/images/prism-dashboard-new.png" alt="Prism Dashboard - Custom Cards" width="85%">
</p>

---

### Table of Contents

- [What is Prism?](#what-is-prism)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
  - [1. Prepare Files](#1-prepare-files)
  - [2. Create Dashboard](#2-create-dashboard)
  - [3. Register Custom Cards](#3-register-custom-cards)
- [Dashboard Configuration](#dashboard-configuration)
- [Support / Feedback](#support--feedback)
- [Contributing](#contributing)
- [Sponsorship](#sponsorship)
- [Keywords](#keywords)

---

## What is Prism?

Prism is a modern, responsive Home Assistant dashboard with a glassmorphism design.  
It combines semi-transparent "frosted glass" surfaces with neumorphism elements for haptic feedback and uses smart YAML anchors to keep the code lean, consistent, and easy to maintain.

Prism is optimized for wall tablets and smartphones and is ideal as a central smart home hub for everyday use.


<p align="center">
  <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=FD26FHKRWS3US" target="_blank" rel="noopener noreferrer">
    <img src="https://pics.paypal.com/00/s/N2EwMzk4NzUtOTQ4Yy00Yjc4LWIwYmUtMTA3MWExNWIzYzMz/file.PNG" alt="SUPPORT PRISM" height="51">
  </a>
</p>

---

## Features

- **💎 Glassmorphism UI**  
  Semi-transparent "Frosted Glass" cards with blur effects for a modern, premium look.

- **👆 Haptic Feedback (Neumorphism)**  
  Active buttons appear "pressed" and provide visual feedback on interactions.

- **🧭 Smart Navigation**  
  Animated navigation bar that automatically highlights the current room or active view.

- **🌈 Status Glow**  
  Icons glow in appropriate colors depending on state (e.g., green for security, orange for heating).

- **📱 Responsive Grid**  
  Layout seamlessly adapts to different devices (tablet on the wall, smartphone in hand).

- **🧹 Clean Code with YAML Anchors**  
  Uses YAML anchors (`&` and `*`) to avoid repetition and keep global style changes centralized.

---

## Requirements

For this dashboard to work, the following frontend integrations must be installed via **HACS (Home Assistant Community Store)**:

- **Mushroom Cards**  
  Base for almost all cards in the dashboard.

- **card-mod**  
  Essential for CSS and glassmorphism styling.

- **layout-card**  
  Enables the responsive grid layout (sidebar + main area).

- **kiosk-mode**  
  Hides Home Assistant header and sidebar for a clean fullscreen look.

- **mini-graph-card**  
  For temperature and trend graphs.

- **browser_mod**  
  Important for popups (e.g., calendar, vacuum control).

---

## Installation

### Option 1: Installation via HACS (Recommended)

1. Make sure [HACS](https://hacs.xyz) is installed.
2. Go to **HACS → Frontend** (three-dot menu top right) → **Custom Repositories**
3. Add this repository:
   - **Repository:** `https://github.com/BangerTech/Prism-Dashboard`
   - **Type:** `Dashboard`
4. Search for "Prism Dashboard" and click **"Download"**
5. **IMPORTANT:** After installation, the custom cards must be manually added to the dashboard resources (HACS downloads the files but does not automatically register them).
6. Go to **Settings → Dashboards** → **Resources** (top right)
7. Click **"Add Resource"** and add the desired custom cards:
   
   **Dark Theme Cards:**
   - `/hacsfiles/Prism-Dashboard/prism-heat.js`
   - `/hacsfiles/Prism-Dashboard/prism-heat-small.js`
   - `/hacsfiles/Prism-Dashboard/prism-button.js`
   - `/hacsfiles/Prism-Dashboard/prism-media.js`
   - `/hacsfiles/Prism-Dashboard/prism-calendar.js`
   - `/hacsfiles/Prism-Dashboard/prism-shutter.js`
   - `/hacsfiles/Prism-Dashboard/prism-shutter-vertical.js`
   - `/hacsfiles/Prism-Dashboard/prism-vacuum.js`
   - `/hacsfiles/Prism-Dashboard/prism-led.js`
   - `/hacsfiles/Prism-Dashboard/prism-3dprinter.js`
   - `/hacsfiles/Prism-Dashboard/prism-bambu.js`
   - `/hacsfiles/Prism-Dashboard/prism-creality.js`
   - `/hacsfiles/Prism-Dashboard/prism-energy.js`
   - `/hacsfiles/Prism-Dashboard/prism-energy-horizontal.js`
   - `/hacsfiles/Prism-Dashboard/prism-sidebar.js`
   
   **Light Theme Cards (optional):**
   - `/hacsfiles/Prism-Dashboard/prism-heat-light.js`
   - `/hacsfiles/Prism-Dashboard/prism-heat-small-light.js`
   - `/hacsfiles/Prism-Dashboard/prism-button-light.js`
   - `/hacsfiles/Prism-Dashboard/prism-media-light.js`
   - `/hacsfiles/Prism-Dashboard/prism-calendar-light.js`
   - `/hacsfiles/Prism-Dashboard/prism-shutter-light.js`
   - `/hacsfiles/Prism-Dashboard/prism-shutter-vertical-light.js`
   - `/hacsfiles/Prism-Dashboard/prism-vacuum-light.js`
   - `/hacsfiles/Prism-Dashboard/prism-led-light.js`
   - `/hacsfiles/Prism-Dashboard/prism-sidebar-light.js`
   
   > **Note:** You only need to add the cards you actually want to use. You can use dark and light theme cards in parallel.
8. Select **"JavaScript Module"** as the type for all
9. Restart Home Assistant

### Option 2: Manual Installation

1. Download or clone this repository.  
2. Copy the contents of the `www` folder to your Home Assistant configuration folder under  
   `/config/www/`.  
3. The background image should then be accessible at  
   `/local/background/background.png`.  
4. **Note:** Restart Home Assistant if the `www` folder was newly created or newly added.

### 2. Create Dashboard

1. Navigate to **Settings → Dashboards** in Home Assistant.  
2. Click **"Add Dashboard"** → Select **"New Dashboard from Scratch"**.  
3. Make the following settings:
   - **Title:** `Prism` (or a title of your choice)
   - **View Type:** `Grid (layout-card)` (if available, otherwise define it later in the code)

> **Note:** For dashboard configuration and adjustments, see [Dashboard Configuration](#dashboard-configuration) and [Dashboard README](dashboard/README.md).

### 3. Register Custom Cards (Manual Installation Only)

If you chose Option 2 (manual installation), the custom cards must be registered manually:

1. Navigate to **Settings → Dashboards** in Home Assistant.  
2. Click **"Resources"** (top right).  
3. Click **"Add Resource"**.  
4. Add the following resources:
   - **URL:** `/local/custom-components/prism-heat.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-heat-small.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-button.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-media.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-calendar.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-shutter.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-shutter-vertical.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-vacuum.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-led.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-3dprinter.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-bambu.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-creality.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-energy.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-energy-horizontal.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-sidebar.js`  
     **Type:** `JavaScript Module`
   
   **Light Theme Cards (optional):**
   - **URL:** `/local/custom-components/prism-heat-light.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-heat-small-light.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-button-light.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-media-light.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-calendar-light.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-shutter-light.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-shutter-vertical-light.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-vacuum-light.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-led-light.js`  
     **Type:** `JavaScript Module`
   - **URL:** `/local/custom-components/prism-sidebar-light.js`  
     **Type:** `JavaScript Module`
5. Restart Home Assistant so the custom cards are loaded.

> **Note:** When installing via HACS, resources are automatically provided under `/hacsfiles/` (see Option 1).

---

## Project Structure

```
Prism-Dashboard/
├── custom-components/          # JavaScript Custom Cards (prism-heat.js, prism-button.js, etc.)
│   ├── images/                  # Images for Custom Cards
│   └── README.md                # Custom Cards Documentation
├── dashboard/                   # Dashboard Configuration
│   ├── prism-dashboard.yml      # Main Dashboard Configuration
│   ├── components/              # Reusable YAML Components
│   │   ├── custom-card.yml      # Template for Standard Cards
│   │   ├── navigation-bar.yml   # Navigation Bar
│   │   └── sidebar.yml          # Sidebar Component
│   └── README.md                # Dashboard Components Documentation
├── www/                         # Static Files for Home Assistant
│   ├── background/               # Background Images
│   └── custom-components/        # Compiled Custom Cards
└── README.md                    # This File
```

> **Note:** The dashboard components in the `dashboard/components/` folder are reusable YAML templates. See [Dashboard README](dashboard/README.md) for details on usage.

---

## Dashboard Configuration

The dashboard configuration is located in the `dashboard/` folder. There you will find:

- **`prism-dashboard.yml`** – The complete dashboard configuration
- **`components/`** – Reusable YAML components (Sidebar, Navigation, etc.)

### Setup Dashboard

1. Open your dashboard in Home Assistant
2. Go to **Edit** → **Raw Configuration Editor**
3. Copy the contents of `dashboard/prism-dashboard.yml` into it
4. **IMPORTANT:** Adjust all entities to your hardware (see [Dashboard README](dashboard/README.md))
5. Save the changes

### Customization

For detailed information on:
- **Adjusting entities** – See [Dashboard README](dashboard/README.md#customization)
- **Using components** – See [Dashboard README](dashboard/README.md#reusable-components)
- **Adjusting styles** – See [Dashboard README](dashboard/README.md#customization)
- **Configuring custom cards** – See [Custom Components README](custom-components/README.md)

---

## Support / Feedback

For bugs, questions, or feature requests:

- **GitHub Issues:** Please use the "Issues" tab of this repository.  
- Alternatively: Contact me directly (e.g., via your preferred profile, if linked here).

Feedback, suggestions, and screenshots of your own setups are always welcome!

---

## Contributing

Contributions are explicitly welcome:

1. Fork the repository.  
2. Create your own branch (`feature/...` or `fix/...`).  
3. Make changes and test them.  
4. Open a pull request and briefly describe what was changed.

---

## Sponsorship

If you like Prism and want to support further development:

Feel free to use the **Support button above** 

Thank you for your support! 💙

---

## Keywords

`home-assistant`, `dashboard`, `glassmorphism`, `lovelace`, `mushroom-cards`, `yaml`, `smart-home`, `ui-design`, `hacs`, `minimalist`
