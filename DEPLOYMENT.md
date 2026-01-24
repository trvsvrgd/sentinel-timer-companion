# Deployment Guide

This guide covers how to build, release, and distribute the Sentinel Timer application.

## Prerequisites

- Node.js 20+
- npm or yarn
- GitHub repository with Actions enabled
- (Optional) Code signing certificates for macOS/Windows

## Quick Start

### For Users

1. **Download the Latest Release**
   - Go to the [Releases](https://github.com/your-username/sentinel-timer-companion/releases) page
   - Download the installer for your operating system:
     - **Windows**: `.exe` installer or portable `.exe`
     - **macOS**: `.dmg` file
     - **Linux**: `.AppImage` or `.deb` package

2. **Install**
   - **Windows**: Run the installer and follow the prompts
   - **macOS**: Open the `.dmg`, drag the app to Applications
   - **Linux**: 
     - AppImage: Make executable (`chmod +x`) and run
     - DEB: Install with `sudo dpkg -i filename.deb`

3. **Auto-Updates**
   - The app automatically checks for updates on startup
   - You can manually check from the Update Manager in the app
   - Updates are downloaded and installed automatically

## For Developers

### Building Locally

```bash
# Install dependencies
npm install

# Build the web app
npm run build

# Build Electron app for your platform
npm run electron:build          # Current platform
npm run electron:build:win      # Windows
npm run electron:build:mac      # macOS
npm run electron:build:linux     # Linux
```

Built files will be in `dist-electron/` directory.

### Creating a Release

#### Method 1: GitHub Actions (Recommended)

1. **Create a Git Tag**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. **GitHub Actions will automatically:**
   - Build for all platforms (Windows, macOS, Linux)
   - Create a GitHub Release
   - Upload all build artifacts
   - Publish release notes

3. **Check the Actions Tab**
   - Go to your repository's Actions tab
   - Monitor the build progress
   - Download artifacts if needed

#### Method 2: Manual Release

1. **Build for all platforms locally**
   ```bash
   npm run electron:build:win
   npm run electron:build:mac
   npm run electron:build:linux
   ```

2. **Create GitHub Release**
   - Go to your repository
   - Click "Releases" → "Create a new release"
   - Tag: `v1.0.0`
   - Title: `Release v1.0.0`
   - Upload all build artifacts from `dist-electron/`

### Configuration

#### GitHub Repository Settings

Update `electron-builder.config.js` with your repository details:

```javascript
publish: {
  provider: 'github',
  owner: 'your-username',        // Your GitHub username
  repo: 'sentinel-timer-companion' // Your repository name
}
```

#### Code Signing (Optional but Recommended)

**macOS:**
1. Get an Apple Developer certificate
2. Add to GitHub Secrets:
   - `MAC_CERTIFICATE`: Base64 encoded certificate
   - `MAC_CERTIFICATE_PASSWORD`: Certificate password

**Windows:**
1. Get a code signing certificate
2. Configure in `electron-builder.config.js`

### Version Management

Update version in `package.json`:
```json
{
  "version": "1.0.0"
}
```

Then create a git tag:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)
- Runs on every push to main/develop
- Lints code
- Builds application
- Validates build output

### Build and Release Workflow (`.github/workflows/build-and-release.yml`)
- Runs on tag pushes (v*)
- Builds for all platforms
- Creates GitHub Release
- Uploads artifacts

## Auto-Updater

The app uses `electron-updater` for automatic updates:

- **Update Check**: On app startup (after 5 seconds)
- **Manual Check**: Via Update Manager component
- **Download**: Automatic when update is available
- **Install**: User-initiated restart

### Update Flow

1. App checks GitHub Releases for newer version
2. If available, shows notification
3. User can download update
4. After download, user can restart to install
5. App restarts with new version

## Distribution Channels

### GitHub Releases (Current)
- Free and easy to set up
- Works with auto-updater
- Good for open-source projects

### Future Options
- **Electron Forge**: Alternative build system
- **Electron Store**: In-app purchases
- **S3/CloudFront**: Custom update server
- **App Stores**: Microsoft Store, Mac App Store, Snap Store

## Troubleshooting

### Build Fails
- Check Node.js version (20+)
- Clear `node_modules` and reinstall
- Check disk space
- Verify all dependencies are installed

### Auto-Updater Not Working
- Verify GitHub repository settings in config
- Check network connectivity
- Ensure releases are public
- Check app logs for errors

### Code Signing Issues
- Verify certificate is valid
- Check GitHub Secrets are set correctly
- Ensure certificate password is correct

## Best Practices

1. **Versioning**: Use semantic versioning (MAJOR.MINOR.PATCH)
2. **Release Notes**: Always include changelog in releases
3. **Testing**: Test builds on target platforms before release
4. **Signing**: Code sign all releases for security
5. **Updates**: Test auto-updater before major releases

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues
- Review documentation
