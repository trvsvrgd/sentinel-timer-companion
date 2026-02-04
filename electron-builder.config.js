export default {
  appId: 'com.sentineltimer.app',
  productName: 'Sentinel Timer',
  copyright: 'Copyright © 2025 Sentinel Timer',
  directories: {
    output: 'dist-electron',
    buildResources: 'build'
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'package.json',
    '!src/**/*',
    '!index.html'
  ],
  asar: true,
  extraMetadata: {
    main: 'electron/main.js'
  },
  publish: {
    provider: 'github',
    owner: process.env.GITHUB_REPOSITORY_OWNER || 'your-username',
    repo: process.env.GITHUB_REPOSITORY_NAME || 'sentinel-timer-companion',
    releaseType: 'release'
  },
  mac: {
    icon: 'public/favicon.ico',
    category: 'public.app-category.games',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist'
  },
  win: {
    icon: 'public/favicon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    publisherName: 'Sentinel Timer'
  },
  linux: {
    icon: 'public/favicon.ico',
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      }
    ],
    category: 'Game'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Sentinel Timer',
    include: 'build/installer.nsh'
  },
  dmg: {
    contents: [
      {
        x: 410,
        y: 150,
        type: 'link',
        path: '/Applications'
      },
      {
        x: 130,
        y: 150,
        type: 'file'
      }
    ],
    window: {
      width: 540,
      height: 380
    }
  },
  compression: 'maximum',
  artifactName: '${productName}-${version}-${platform}-${arch}.${ext}',
  // Auto-updater configuration
  updater: {
    provider: 'github',
    owner: process.env.GITHUB_REPOSITORY_OWNER || 'your-username',
    repo: process.env.GITHUB_REPOSITORY_NAME || 'sentinel-timer-companion'
  }
};