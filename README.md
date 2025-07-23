# Sentinel Timer - Dota 2 Timer Assistant

A real-time timer application for Dota 2 that tracks important game events like Roshan spawns, rune respawns, and neutral creep pulls. Features Game State Integration (GSI) for automatic synchronization with your Dota 2 match.

## Features

- **Timer Management**: Track Roshan, Bounty Runes, Power Runes, Lotus, and Neutral Pulls
- **Game State Integration (GSI)**: Automatically sync with Dota 2's game time
- **Audio Alerts**: Built-in Dota 2-themed sounds with custom audio upload support
- **Keyboard Shortcuts**: Quick timer controls for in-game use
- **Test Mode**: Configure and test audio alerts
- **Responsive Design**: Works on desktop and mobile

## Quick Start

### Installation & Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

### Basic Usage

1. **Manual Mode**: Click timer buttons when events occur in-game
2. **GSI Mode**: Set up GSI integration for automatic game time sync
3. **Test Mode**: Use the test toggle to configure audio alerts

## GSI (Game State Integration) Setup

For automatic synchronization with Dota 2, follow these steps:

### Step 1: Create GSI Configuration File

1. Navigate to your Dota 2 directory:
   ```
   Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
   ```

2. Create a new file named `gamestate_integration_sentineltimer.cfg`

3. Add this content to the file:
   ```
   "Dota 2 Integration Configuration"
   {
       "uri"          "http://localhost:3000/"
       "timeout"      "5.0"
       "buffer"       "0.1"
       "throttle"     "0.1"
       "heartbeat"    "30.0"
       "data"
       {
           "buildings"    "1"
           "provider"     "1"
           "map"          "1"
           "player"       "1"
           "hero"         "1"
           "abilities"    "1"
           "items"        "1"
       }
   }
   ```

### Step 2: Set Up GSI Server

You need a local server to receive GSI data. You can use one of these options:

**Option A: Simple Node.js Server**
Create a file `gsi-server.js`:
```javascript
const http = require('http');
const fs = require('fs');

let latestGameState = null;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        latestGameState = JSON.parse(body);
        console.log('GSI Update:', latestGameState.map?.clock_time);
      } catch (e) {
        console.error('GSI Parse Error:', e);
      }
    });
    res.writeHead(200);
    res.end('OK');
  } else if (req.method === 'GET' && req.url === '/gamestate') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(latestGameState || {}));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000, () => {
  console.log('GSI Server running on http://localhost:3000');
});
```

Run the server:
```sh
node gsi-server.js
```

**Option B: Use Existing GSI Tools**
- [Dota2 GSI](https://github.com/antonpup/Dota2GSI) (C#)
- [dota2-gsi-events](https://github.com/dotabod/dota2-gsi-events) (Node.js)

### Step 3: Launch Dota 2

1. Start your GSI server
2. Launch Dota 2
3. Enter a match (GSI only works during active games)
4. In Sentinel Timer, click the "GSI" button to connect
5. Click "Sync" to synchronize with game time

## Keyboard Shortcuts

- `Ctrl + R`: Start Roshan timer
- `Ctrl + B`: Start Bounty Rune timer
- `Ctrl + P`: Start Power Rune timer
- `Ctrl + L`: Start Lotus timer
- `Ctrl + N`: Start Neutral Pull timer
- `Ctrl + Space`: Pause/Resume all timers

## Audio Configuration

1. Enable **Test Mode** to access the Audio Bank
2. Choose from built-in Dota 2-themed sounds or upload custom audio
3. Configure which sounds play for each timer type
4. Test alerts using the play buttons

## Troubleshooting

### GSI Not Connecting
- Ensure your GSI config file is in the correct directory
- Verify your GSI server is running on port 3000
- Check that Dota 2 is running and you're in an active match
- GSI only works during live games, not in menus

### Audio Not Playing
- Check browser permissions for audio playback
- Ensure audio files are properly uploaded in Test Mode
- Verify volume settings in browser and system

### Timer Sync Issues
- Use the "Sync" button when entering a new game
- Manual timers work independently of GSI
- Check console for GSI connection errors

## Project Technologies

- **Frontend**: React + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Audio**: Web Audio API + Custom uploads
- **Integration**: Dota 2 Game State Integration

## Development

### Project Structure
```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── TimerManager.tsx # Main timer interface
│   ├── TimerCard.tsx   # Individual timer component
│   └── AudioBank.tsx   # Audio configuration
├── hooks/              # Custom React hooks
│   ├── useGameStateIntegration.ts # GSI connection
│   └── useAudioBank.ts # Audio management
└── pages/              # Route pages
    └── Index.tsx       # Main page
```

### Adding New Timers
1. Update `DEFAULT_TIMERS` in `TimerManager.tsx`
2. Add keyboard shortcut in the event handler
3. Include audio configuration if needed

## Deployment

Deploy your Sentinel Timer:

1. **Via Lovable**: Open your [Lovable Project](https://lovable.dev/projects/cd850d95-c83d-43ac-9bdd-fffbab4f3fae) and click Share → Publish
2. **Custom Domain**: Navigate to Project → Settings → Domains to connect your domain
3. **Manual Deployment**: Build with `npm run build` and deploy the `dist` folder

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Dota 2 GSI
5. Submit a pull request

## License

Open source - feel free to modify and distribute.

---

*Note: This application is not affiliated with Valve Corporation or Dota 2. GSI is an official Valve API for external applications.*
