## Prism-Dashboard

💎 Ein modernes, glassmorphism-inspiriertes Dashboard für Home Assistant, aufgebaut auf den beliebten Mushroom Cards.

---

<p align="center">
  <strong>Dashboard Konfiguration</strong><br>
  <img src="https://github.com/user-attachments/assets/6048858f-4ba0-40a8-95b8-7787cde1d8ab" alt="Prism Dashboard - Dashboard Konfiguration" width="80%">
</p>

<p align="center">
  <strong>Custom Cards</strong><br>
  <img src="custom-components/images/prism-dashboard-new.png" alt="Prism Dashboard - Custom Cards" width="80%">
</p>

---

### Inhaltsverzeichnis

- [Was ist Prism?](#was-ist-prism)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
  - [1. Dateien vorbereiten](#1-dateien-vorbereiten)
  - [2. Dashboard anlegen](#2-dashboard-anlegen)
  - [3. Custom Cards registrieren](#3-custom-cards-registrieren)
- [Dashboard-Konfiguration](#dashboard-konfiguration)
- [Support / Feedback](#support--feedback)
- [Contributing](#contributing)
- [Sponsorship](#sponsorship)
- [Keywords](#keywords)

---

## Was ist Prism?

Prism ist ein modernes, responsives Home Assistant Dashboard im Glassmorphism-Design.  
Es kombiniert halbtransparente „frosted glass“-Oberflächen mit Neumorphismus-Elementen für haptisches Feedback und nutzt intelligente YAML-Anker, um den Code schlank, einheitlich und leicht wartbar zu halten.

Prism ist optimiert für Wandtablets und Smartphones und eignet sich ideal als zentraler Smart-Home-Hub im Alltag.


<p align="center">
  <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=FD26FHKRWS3US" target="_blank" rel="noopener noreferrer">
    <img src="https://pics.paypal.com/00/s/N2EwMzk4NzUtOTQ4Yy00Yjc4LWIwYmUtMTA3MWExNWIzYzMz/file.PNG" alt="SUPPORT PRISM" height="51">
  </a>
</p>

---

## Features

- **💎 Glassmorphism UI**  
  Halbtransparente „Frosted Glass“-Karten mit Unschärfe-Effekten für einen modernen, hochwertigen Look.

- **👆 Haptisches Feedback (Neumorphismus)**  
  Aktive Buttons wirken „eingedrückt“ und geben visuelles Feedback bei Interaktionen.

- **🧭 Smart Navigation**  
  Animierte Navigationsleiste, die den aktuellen Raum bzw. die aktive Ansicht automatisch hervorhebt.

- **🌈 Status Glow**  
  Icons leuchten je nach Zustand in passenden Farben (z. B. Grün für Sicherheit, Orange für Heizung).

- **📱 Responsives Grid**  
  Layout passt sich nahtlos an verschiedene Geräte an (Tablet an der Wand, Smartphone in der Hand).

- **🧹 Clean Code mit YAML-Ankern**  
  Nutzt YAML-Anker (`&` und `*`), um Wiederholungen zu vermeiden und globale Style-Änderungen zentral zu halten.

---

## Requirements

Damit dieses Dashboard funktioniert, müssen folgende Frontend-Integrationen über **HACS (Home Assistant Community Store)** installiert sein:

- **Mushroom Cards**  
  Basis für fast alle Karten im Dashboard.

- **card-mod**  
  Essenziell für das CSS- und Glassmorphism-Styling.

- **layout-card**  
  Ermöglicht das responsive Grid-Layout (Sidebar + Main-Bereich).

- **kiosk-mode**  
  Versteckt Header und Sidebar von Home Assistant für einen cleanen Fullscreen-Look.

- **mini-graph-card**  
  Für Temperatur- und Verlaufsdiagramme.

- **browser_mod**  
  Wichtig für Popups (z. B. Kalender, Staubsauger-Steuerung).

---

## Installation

### Option 1: Installation über HACS (Empfohlen)

1. Stelle sicher, dass [HACS](https://hacs.xyz) installiert ist.
2. Gehe zu **HACS → Frontend** (3-Punkte-Menü oben rechts) → **Benutzerdefinierte Repositories**
3. Füge dieses Repository hinzu:
   - **Repository:** `https://github.com/BangerTech/Prism-Dashboard`
   - **Typ:** `Dashboard`
4. Suche nach "Prism Dashboard" und klicke auf **"Herunterladen"**
5. **WICHTIG:** Nach der Installation müssen die Custom Cards manuell zu den Dashboard-Ressourcen hinzugefügt werden (HACS lädt die Dateien herunter, registriert sie aber nicht automatisch).
6. Gehe zu **Einstellungen → Dashboards** → **Ressourcen** (oben rechts)
7. Klicke auf **"Ressource hinzufügen"** und füge die gewünschten Custom Cards hinzu:
   
   **Dark Theme Karten:**
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
   - `/hacsfiles/Prism-Dashboard/prism-sidebar.js`
   
   **Light Theme Karten (optional):**
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
   
   > **Hinweis:** Du musst nur die Karten hinzufügen, die du auch tatsächlich verwenden möchtest. Du kannst Dark und Light Theme Karten auch parallel verwenden.
8. Wähle für alle den Typ **"JavaScript-Modul"**
9. Starte Home Assistant neu

### Option 2: Manuelle Installation

1. Dieses Repository herunterladen oder clonen.  
2. Den Inhalt des Ordners `www` in deinen Home Assistant Konfigurationsordner unter  
   `/config/www/` kopieren.  
3. Das Hintergrundbild sollte anschließend unter  
   `/local/background/background.png`  
   erreichbar sein.  
4. **Hinweis:** Starte Home Assistant neu, falls der `www`-Ordner neu erstellt oder neu hinzugefügt wurde.

### 2. Dashboard anlegen

1. In Home Assistant zu **Einstellungen → Dashboards** navigieren.  
2. Auf **„Dashboard hinzufügen"** klicken → **„Neues Dashboard von Grund auf"** wählen.  
3. Folgende Einstellungen vornehmen:
   - **Titel:** `Prism` (oder ein Titel deiner Wahl)
   - **Ansichtstyp:** `Grid (layout-card)` (falls verfügbar, ansonsten später im Code definieren)

> **Hinweis:** Für die Dashboard-Konfiguration und Anpassungen siehe [Dashboard-Konfiguration](#dashboard-konfiguration) und [Dashboard-README](dashboard/README.md).

### 3. Custom Cards registrieren (nur bei manueller Installation)

Falls du Option 2 (manuelle Installation) gewählt hast, müssen die Custom Cards manuell registriert werden:

1. In Home Assistant zu **Einstellungen → Dashboards** navigieren.  
2. Auf **„Ressourcen"** (oben rechts) klicken.  
3. Auf **„Ressource hinzufügen"** klicken.  
4. Folgende Ressourcen hinzufügen:
   - **URL:** `/local/custom-components/prism-heat.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-heat-small.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-button.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-media.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-calendar.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-shutter.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-shutter-vertical.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-vacuum.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-led.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-3dprinter.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-sidebar.js`  
     **Typ:** `JavaScript-Modul`
   
   **Light Theme Karten (optional):**
   - **URL:** `/local/custom-components/prism-heat-light.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-heat-small-light.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-button-light.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-media-light.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-calendar-light.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-shutter-light.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-shutter-vertical-light.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-vacuum-light.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-led-light.js`  
     **Typ:** `JavaScript-Modul`
   - **URL:** `/local/custom-components/prism-sidebar-light.js`  
     **Typ:** `JavaScript-Modul`
5. Home Assistant neu starten, damit die Custom Cards geladen werden.

> **Hinweis:** Bei Installation über HACS werden die Ressourcen automatisch unter `/hacsfiles/` bereitgestellt (siehe Option 1).

---

## Projektstruktur

```
Prism-Dashboard/
├── custom-components/          # JavaScript Custom Cards (prism-heat.js, prism-button.js, etc.)
│   ├── images/                  # Bilder für die Custom Cards
│   └── README.md                # Dokumentation der Custom Cards
├── dashboard/                   # Dashboard-Konfiguration
│   ├── prism-dashboard.yml      # Hauptdashboard-Konfiguration
│   ├── components/              # Wiederverwendbare YAML-Komponenten
│   │   ├── custom-card.yml      # Template für Standard-Karten
│   │   ├── navigation-bar.yml   # Navigationsleiste
│   │   └── sidebar.yml          # Sidebar-Komponente
│   └── README.md                # Dokumentation der Dashboard-Komponenten
├── www/                         # Statische Dateien für Home Assistant
│   ├── background/               # Hintergrundbilder
│   └── custom-components/        # Kompilierte Custom Cards
└── README.md                    # Diese Datei
```

> **Hinweis:** Die Dashboard-Komponenten im `dashboard/components/`-Ordner sind wiederverwendbare YAML-Vorlagen. Siehe [Dashboard-README](dashboard/README.md) für Details zur Verwendung.

---

## Dashboard-Konfiguration

Die Dashboard-Konfiguration befindet sich im Ordner `dashboard/`. Dort findest du:

- **`prism-dashboard.yml`** – Die komplette Dashboard-Konfiguration
- **`components/`** – Wiederverwendbare YAML-Komponenten (Sidebar, Navigation, etc.)

### Dashboard einrichten

1. Öffne dein Dashboard in Home Assistant
2. Gehe zu **Bearbeiten** → **Raw-Konfigurationseditor**
3. Kopiere den Inhalt von `dashboard/prism-dashboard.yml` hinein
4. **WICHTIG:** Passe alle Entitäten an deine Hardware an (siehe [Dashboard-README](dashboard/README.md))
5. Speichere die Änderungen

### Anpassungen

Für detaillierte Informationen zur:
- **Anpassung von Entitäten** – Siehe [Dashboard-README](dashboard/README.md#anpassungen)
- **Verwendung der Komponenten** – Siehe [Dashboard-README](dashboard/README.md#wiederverwendbare-komponenten)
- **Anpassung von Styles** – Siehe [Dashboard-README](dashboard/README.md#anpassungen)
- **Custom Cards konfigurieren** – Siehe [Custom Components README](custom-components/README.md)

---

## Support / Feedback

Bei Bugs, Fragen oder Feature Requests:

- **GitHub Issues:** Bitte das „Issues“-Tab dieses Repositories verwenden.  
- Alternativ: Kontaktiere mich direkt (z. B. über dein bevorzugtes Profil, falls hier verlinkt).

Feedback, Vorschläge und Screenshots deiner eigenen Setups sind jederzeit willkommen!

---

## Contributing

Beiträge sind ausdrücklich erwünscht:

1. Repository forken.  
2. Eigenen Branch erstellen (`feature/...` oder `fix/...`).  
3. Änderungen vornehmen und testen.  
4. Pull Request eröffnen und kurz beschreiben, was geändert wurde.

---

## Sponsorship

Wenn dir Prism gefällt und du die Weiterentwicklung unterstützen möchtest:

Nutze gerne den **Support-Button oben** 

Vielen Dank für deine Unterstützung! 💙

---

## Keywords

`home-assistant`, `dashboard`, `glassmorphism`, `lovelace`, `mushroom-cards`, `yaml`, `smart-home`, `ui-design`, `hacs`, `minimalist`

