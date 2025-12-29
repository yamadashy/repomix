---
name: browser-extension-developer
description: Use this skill when developing or maintaining browser extension code in the `browser/` directory, including Chrome/Firefox/Edge compatibility, content scripts, background scripts, or i18n updates.
---

# Browser Extension Developer

Cross-browser extension (Chrome/Firefox/Edge) using **WXT framework** with Manifest V3. Injects "Repomix" button into GitHub repository pages.

## Structure

```plaintext
browser/
├── entrypoints/       # background.ts, content.ts
├── public/_locales/   # i18n (12 languages)
├── wxt.config.ts      # WXT configuration
└── .output/           # Built files (chrome-mv3, firefox-mv2)
```

## Commands

- `npm run dev` - Development mode (Chrome default)
- `npm run dev:firefox` - Firefox dev mode
- `npm run build-all` - Build all browsers
- `npm run lint` / `npm run test`

## i18n

12 languages: en, ja, de, fr, es, pt_BR, id, vi, ko, zh_CN, zh_TW, hi

New language: Create `public/_locales/[code]/messages.json` with keys: appDescription, openWithRepomix

## Notes

- Chrome/Edge use `chrome.*` APIs, Firefox may need polyfills
- Run lint and tests before completion
