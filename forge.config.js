const { VitePlugin } = require('@electron-forge/plugin-vite');

module.exports = {
  packagerConfig: {
    name: 'CaseThread',
    executableName: 'casethread',
    icon: './assets/icon',
    extraResource: [
      './templates',
      './mock-data'
    ],
    asar: true,
    // Security configurations
    appBundleId: 'com.casethread.app',
    appCategoryType: 'public.app-category.productivity',
    // macOS specific
    osxSign: {},
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // Main process configuration
        build: [
          {
            entry: 'src/electron/main/index.ts',
            config: 'vite.main.config.ts',
            target: 'main',
          },
          {
            entry: 'src/electron/preload/index.ts',
            config: 'vite.preload.config.ts',
            target: 'preload',
          },
        ],
        // Renderer process configuration
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.ts',
          },
        ],
      },
    },
  ],
  publishers: [],
}; 