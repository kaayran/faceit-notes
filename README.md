<div align="center">
  <img src="icons/icon128.png" alt="FACEIT Notes" width="96" height="96">
  <h1>FACEIT Notes</h1>
  <p>Chrome extension for managing player notes on <a href="https://www.faceit.com">FACEIT</a></p>
</div>

## Features

### Core Functionality
- **Player Notes Management** - Add, edit, and delete notes for any player directly on FACEIT pages
- **Persistent Player Tracking** - Notes linked to FACEIT Player ID, survive nickname changes
- **Nickname History** - Shows current and previous nicknames when players change names
- **Smart Note Icons** - Visual indicators on player cards showing note status
- **Search & Filter** - Quick search through all saved notes
- **Import/Export** - Backup and restore notes in JSON format with timestamp-based smart merging

### User Interface
- **Notes List View** - Compact list of all notes with preview and quick actions
- **Inline Editing** - Edit notes without leaving the page
- **Double-click Confirmation** - Safe deletion with confirmation prompt
- **Toggle Control** - Enable/disable extension functionality on the fly

### Customization
- **Color Themes** - Customize icon colors for notes/no-notes states
- **Accessibility Presets** - Built-in color schemes for different types of color blindness:
  - Protanopia (red-green, type 1)
  - Deuteranopia (red-green, type 2)
  - Tritanopia (blue-yellow)
- **Dark Mode UI** - Minimalist dark interface matching FACEIT style

### Technical Features
- **Dual API Integration** - Combines match room data with current player profiles
- **Smart Nickname Resolution** - Automatically fetches and displays most recent nicknames
- **Timestamp-based Sync** - Automatic conflict resolution when importing notes
- **Real-time Updates** - Changes reflect immediately across all tabs
- **Local Storage** - All data stored locally in your browser
- **Internationalization** - Multi-language support (English, Russian)
- **Extensive Debug Logging** - Detailed console logs for troubleshooting

## Roadmap

- [x] **Link notes by FACEIT Player ID** - Notes persist across nickname changes
- [x] **Russian localization** - Full Russian language support
- [ ] Publish to Chrome Web Store
- [ ] Add more languages (Spanish, German, French, Portuguese)
- [ ] Cloud synchronization (optional feature)
