import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Repomix',
    short_name: 'repomix',
    version: '1.0.2',
    description: '__MSG_appDescription__',
    default_locale: 'en',
    icons: {
      16: 'images/icon-16.png',
      19: 'images/icon-19.png',
      32: 'images/icon-32.png',
      38: 'images/icon-38.png',
      48: 'images/icon-48.png',
      64: 'images/icon-64.png',
      128: 'images/icon-128.png',
    },
    minimum_chrome_version: '88.0',
    permissions: ['scripting'],
    host_permissions: ['https://github.com/*'],
    web_accessible_resources: [
      {
        resources: [
          'images/icon-16.png',
          'images/icon-19.png',
          'images/icon-32.png',
          'images/icon-38.png',
          'images/icon-48.png',
          'images/icon-64.png',
          'images/icon-128.png',
        ],
        matches: ['https://github.com/*'],
      },
    ],
    browser_specific_settings: {
      gecko: {
        id: '{3AB97897-F299-4DBC-8084-A92813FE2685}',
        strict_min_version: '102.0',
      },
    },
  },
  webExt: {
    startUrls: ['https://github.com/yamadashy/repomix'],
  },
});
