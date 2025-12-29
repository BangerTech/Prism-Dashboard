# Dashboard Configuration

This folder contains the dashboard configuration and reusable YAML components for the Prism Dashboard.

## Structure

```
dashboard/
├── prism-dashboard.yml      # Main dashboard configuration
└── components/              # Reusable YAML components
    ├── custom-card.yml      # Template for standard cards
    ├── navigation-bar.yml   # Navigation bar
    └── sidebar.yml          # Sidebar component
```

## Main Dashboard

The file `prism-dashboard.yml` contains the complete dashboard configuration with all views (Ground Floor, Upper Floor, Office, etc.). This file can be directly copied into Home Assistant's Raw Configuration Editor.

### Usage

1. Open your dashboard in Home Assistant
2. Go to **Edit** → **Raw Configuration Editor**
3. Copy the contents of `prism-dashboard.yml` into it
4. Adjust the entities to your hardware
5. Save the changes

## Reusable Components

The components in the `components/` folder are intended as templates and can be integrated into your dashboard.

### custom-card.yml

A template for standard cards with glassmorphism design. Contains:
- Glassmorphism styling (semi-transparent with blur effect)
- Neumorphism effects (pressed when active)
- Icon glow effects (colored glow depending on entity type)

**Usage:**
```yaml
# Copy the contents of custom-card.yml and adjust the entity:
entity: light.your_light  # <-- Your entity here
name: Your Name
icon: mdi:lightbulb
```

### navigation-bar.yml

The navigation bar with glassmorphism design. Uses `mushroom-chips-card` for navigation between different views.

**Usage:**
```yaml
# Copy the contents of navigation-bar.yml
# Adjust the navigation_path values to your view paths
```

**Customization:**
- Change the `navigation_path` values to your view paths
- Adjust the chip texts (e.g., "GROUND FLOOR", "UPPER FLOOR")
- Add more navigation items or remove some

### sidebar.yml

The left sidebar component with:
- Camera image
- Date & time
- Calendar (upcoming events)
- Weather & temperature graph
- Power consumption display

**Usage:**
```yaml
# Copy the contents of sidebar.yml
# Adjust the entities:
# - camera.garden_main → your camera
# - calendar.family_shared → your calendar
# - weather.home → your weather
# - sensor.outdoor_temperature → your temperature sensor
# - sensor.power_* → your power consumption sensors
```

**Customization:**
- Replace all placeholder entities with your real entities
- Adjust the styles if desired
- Add more elements or remove some

## Integration into Main Dashboard

The main dashboard (`prism-dashboard.yml`) uses YAML anchors (`&` and `*`) to reference the components:

```yaml
# Definition with anchor
cards: &sidebar_content
  - type: vertical-stack
    cards:
      # ... Sidebar content ...

# Usage with reference
cards: *sidebar_content
```

This enables:
- **DRY Principle:** Code is not repeated
- **Central Maintenance:** Changes in one place affect all references
- **Clean Code:** Less redundancy, better readability

## Customization

### Replace Entities

All placeholder entities must be replaced with your real entities. Use search (`Ctrl+F` / `Cmd+F`) to find all occurrences:

- `camera.garden_main` → your camera
- `light.living_room_light` → your lights
- `switch.pond_pump` → your switches
- `climate.living_room` → your climate entities
- `sensor.outdoor_temperature` → your sensors
- `calendar.family_shared` → your calendar
- `weather.home` → your weather
- etc.

### Adjust Styles

The styles are defined in YAML anchors:

- **`&mush_card_style`** – Main style for glassmorphism cards
- **`&active_chip_style`** – Style for active navigation chips
- **`&inactive_chip_style`** – Style for inactive navigation chips
- **`&sidebar_content`** – Complete sidebar content

Change these anchor definitions to adjust the appearance globally.

## Tips

1. **Create Backup:** Before making changes, create a backup of your dashboard configuration
2. **Test Step by Step:** Test changes in small steps
3. **YAML Validation:** Use a YAML validator to avoid syntax errors
4. **Use Comments:** The YAML files contain comments that help with customization

## Support

For questions or problems:
- See the [Main README](../README.md) for general information
- Open a [GitHub Issue](https://github.com/BangerTech/Prism-Dashboard/issues) for bugs or feature requests
