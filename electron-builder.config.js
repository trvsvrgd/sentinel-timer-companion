module.exports = {
  appId: 'com.sentineltimer.app',
  productName: 'Sentinel Timer',
  directories: {
    output: 'dist-electron'
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'node_modules/**/*',
    'package.json'
  ],
  extraMetadata: {
    main: 'electron/main.js'
  },
  mac: {
    icon: 'public/favicon.ico',
    category: 'public.app-category.games'
  },
  win: {
    icon: 'public/favicon.ico',
    target: 'nsis'
  },
  linux: {
    icon: 'public/favicon.ico',
    target: 'AppImage'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
};