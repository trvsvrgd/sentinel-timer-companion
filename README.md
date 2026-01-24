# Sentinel Timer - Dota 2 Timer Companion

A sophisticated timer application for Dota 2 players to track important game events like Roshan respawn, rune spawns, and neutral pulls. Features automatic Game State Integration (GSI) for seamless timer synchronization.

## Features

- ⏰ **Smart Timers**: Track Roshan, Bounty Runes, Power Runes, Lotus, and Neutral Pulls
- 🎮 **GSI Integration**: Automatic sync with your live Dota 2 match
- 🖥️ **Desktop App**: Automatic GSI server management (no manual setup required)
- 🌐 **Web Version**: Also works as a web app with manual GSI setup
- ⚡ **Game Mode Support**: Optimized for both All Pick and Turbo modes
- 🎯 **Position Aware**: Configure for Radiant/Dire and Safe/Mid/Off lanes
- ⌨️ **Keyboard Shortcuts**: Quick timer controls with hotkeys
- 🔊 **Audio Alerts**: Sound notifications when timers complete
- 🎨 **Dota 2 Themed**: Beautiful UI inspired by Dota 2's aesthetic

## Quick Start

### Option 1: Desktop App (Recommended)
1. Download the latest desktop app from releases
2. Install and launch Sentinel Timer
3. **That's it!** GSI server starts automatically
4. Launch Dota 2 and start a match
5. Timers will automatically sync with your game

### Option 2: Web Version
If you prefer using the web version, you'll need to set up GSI manually:

#### GSI Setup Guide

**Step 1: Create GSI Config File**
1. Navigate to your Dota 2 cfg folder:
   ```
   Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
   ```
2. Create a file named: `gamestate_integration_sentineltimer.cfg`
3. Add this content:
   ```
   "dota2-gsi Configuration"
   {
       "uri"               "http://localhost:3000/gamestate"
       "timeout"           "5.0"
       "buffer"            "0.1"
       "throttle"          "0.5"
       "heartbeat"         "30.0"
       "data"
       {
           "buildings"     "1"
           "provider"      "1"
           "map"           "1"
           "player"        "1"
           "hero"          "1"
           "abilities"     "1"
           "items"         "1"
       }
   }
   ```

**Step 2: Install GSI Server**
Choose one option:
- **Node.js**: `npm install -g dota2-gsi-server`
- **Python**: `pip install dota2-gsi-server`

**Step 3: Start GSI Server**
```bash
dota2-gsi-server --port 3000
```

**Step 4: Launch Dota 2**
Start Dota 2 and enter a match. The timer app will automatically detect and sync with your game.

## Usage

### Timer Controls
- **Manual Start**: Click any timer to start it manually
- **Auto Sync**: Use "Sync" button when GSI is connected to sync with game time
- **Pause/Resume**: Control all timers simultaneously
- **Reset**: Clear all active timers

### Keyboard Shortcuts
- `Ctrl+R`: Start Roshan timer
- `Ctrl+B`: Start Bounty Rune timer
- `Ctrl+P`: Start Power Rune timer
- `Ctrl+L`: Start Lotus timer
- `Ctrl+N`: Start Neutral Pull timer
- `Ctrl+Space`: Pause/Resume all timers

### Configuration
- **Side**: Switch between Radiant/Dire
- **Lane**: Configure for Safe/Mid/Off lane
- **Game Mode**: Toggle between All Pick and Turbo (affects timer durations)
- **Test Mode**: Enable to test audio alerts and features

## Timer Details

### Roshan Timer
- **Duration**: 11 minutes maximum, 8 minutes minimum
- **Alert**: Notification at 8 minutes (earliest respawn)
- **Final Alert**: When timer reaches 0 (latest respawn)

### Rune Timers
- **Bounty Runes**: Every 5 minutes
- **Power Runes**: Every 2 minutes
- **Lotus**: Every 3 minutes

### Neutral Pulls
- **Duration**: 1 minute
- **Purpose**: Track neutral camp pull timings

## GSI Troubleshooting

### Connection Issues
1. **Check GSI Server**: Ensure server is running on localhost:3000
2. **Verify Config**: Confirm GSI config file is in correct Dota 2 folder
3. **Active Match**: GSI only works during live matches, not in menu
4. **Firewall**: Ensure localhost:3000 is not blocked

### Common Error Messages
- **"GSI Connecting..."**: Server not found - start GSI server
- **"Setup Required"**: GSI config file missing or invalid
- **"No Game Data"**: Not in an active match or GSI not configured

### Manual Sync Alternative
If GSI isn't working, you can still use manual timer controls:
1. Start timers manually when events occur in-game
2. Use keyboard shortcuts for quick access
3. Monitor timer alerts for accurate tracking

## Development

### Prerequisites
- **Node.js 20+** (required)
- **npm** (comes with Node.js)

### Setup (Fresh Clone)
When you clone this repository on any computer, follow these steps:

```bash
# 1. Clone the repository
git clone [repository-url]
cd sentinel-timer-companion

# 2. Install dependencies (REQUIRED - do this first!)
npm install

# 3. Start development server
npm run dev

# OR for Electron development
npm run electron:dev
```

**Important**: You must run `npm install` after cloning. This installs all dependencies including `vite`, `electron`, and other required packages. The `package-lock.json` file ensures you get the exact same dependency versions on any computer.

### Building
```bash
# Make sure dependencies are installed first!
npm install

# Build web version
npm run build

# Build desktop app (platform-specific)
npm run electron:build        # Current platform
npm run electron:build:win     # Windows
npm run electron:build:mac     # macOS
npm run electron:build:linux   # Linux
```

**Note**: The GitHub CI automatically builds and tests on every push. If CI passes, you can be confident the code will work on any fresh clone.

## Technical Details

### Architecture
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS with custom Dota 2 theme
- **Desktop**: Electron with automatic GSI server management
- **GSI Integration**: HTTP polling for game state synchronization

### Timer Precision
- **Update Frequency**: 1 second intervals
- **Sync Accuracy**: ±1 second with game time
- **Alert Timing**: Precise to game events

### Cross-Platform
- **Windows**: Full desktop app support
- **macOS**: Full desktop app support  
- **Linux**: Desktop app and web version
- **Web**: All modern browsers supported

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Check existing documentation
- Review troubleshooting guide above

---

**Pro Tip**: Use the desktop version for the best experience - it automatically handles all GSI setup and provides the most reliable timer synchronization!