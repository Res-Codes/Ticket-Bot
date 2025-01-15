# Res-Codes Support Bot

Ein leistungsstarker Discord-Bot zur Verwaltung von Support-Tickets mit einer intuitiven Benutzeroberfläche, automatischen Transkriptionen und flexibler Anpassung.

## 👤 Funktionen

- 📂 **Ticket-System**: Erstelle und verwalte Support-Tickets mit individuellen Kategorien.
- 📄 **Automatische Transkripte**: Transkripte werden bei Schließung eines Tickets automatisch erstellt und gespeichert.
- 📍 **Benutzerfreundliche Interaktionen**: Slash-Commands, Buttons und Dropdown-Menüs zur einfachen Steuerung.
- 📅 **Anpassbare Einstellungen**: Über das Control Panel können Tickets angepasst werden.
- 🔒 **Berechtigungen**: Nur der Ticket-Ersteller und bestimmte Rollen haben Zugriff auf das Ticket.

## 🛠️ Installation

1. **Abhängigkeiten installieren**
   ```bash
   npm install discord.js discord-html-transcripts fs path @discordjs/rest discord-api-types
   ```
2. **Bot konfigurieren**
   Bearbeite die Datei `./config/bot.json` und füge deinen Bot-Token und die Client-ID hinzu:
   ```json
   {
     "token": "DEIN_BOT_TOKEN",
     "clientId": "DEINE_CLIENT_ID"
   }
   ```
3. **Bot starten**
   ```bash
   node index.js
   ```

## 🛠️ Wichtige Commands

### `/control`
- 📊 Öffnet das Ticket-Kontrollpanel mit Buttons zum Umbenennen und Schließen des Tickets.

### `/config`
- 📊 Öffnet das Ticket-Configpanel mit Buttons zum bearbeiten der Config.

## 👨‍💻 Rollen & Berechtigungen

Beim Erstellen eines Tickets:
- ✅ **Ticket-Ersteller**: Erhält Zugriff auf den Channel (Lesen, Schreiben, Verlauf).
- ⛔️ **@everyone**: Kein Zugriff.
- 🛠️ **Bot**: Hat volle Berechtigungen zum Verwalten des Channels.

## 📂 Dateisystemstruktur
```
├── config
│   ├── bot.json
│   ├── dropdownConfig.json
│   └── ticketconfig.json
├── commands
│   └── control.js
│   └── config.js
├── transcripts
│   └──
├── index.js
└── README.md
```

## 🛡️ Sicherheit
- Nur **Administratoren** haben Zugriff auf sensitive Befehle (z.B. `/config`).
- Tickets sind privat und nur für den Ersteller und Support-Team sichtbar.

## 🛠️ Fehlerbehebung
- **Fehler beim Erstellen des Tickets:** Stelle sicher, dass die Kategorien und IDs in der `dropdownConfig.json` korrekt sind.
- **Bot reagiert nicht:** Überprüfe, ob der Bot-Token korrekt ist und der Bot alle nötigen Berechtigungen hat.

## 🛠️ Zukünftige Funktionen
- 📊 **Statistiken** über abgeschlossene Tickets
- 🔒 **Erweiterte Berechtigungen** pro Ticket-Typ
- 📅 **Automatische Ticket-Löschungen** nach Zeitablauf

---

👤 **Erstellt von Res-Codes** | 🛠️ Viel Spaß beim Support!

