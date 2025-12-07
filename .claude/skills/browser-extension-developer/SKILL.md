---
name: browser-extension-developer
description: Use this skill when developing, reviewing, or maintaining browser extension code, including Chrome/Firefox/Edge compatibility work, manifest file updates, content script development, background script implementation, popup UI creation, or any browser extension-related tasks in the `browser/` directory.
---

# Browser Extension Developer

Expert guidance for the Repomix cross-platform browser extension (Chrome/Firefox/Edge).

## Project Structure

Cross-browser extension with GitHub integration using Manifest V3. Content scripts inject "Repomix" button into GitHub UI.

```
browser/
├── app/
│   ├── _locales/      # i18n files (11 languages)
│   ├── manifest.json  # Manifest V3
│   ├── scripts/       # TypeScript (background.ts, content.ts)
│   └── styles/        # CSS for injected elements
└── dist/              # Built files
```

## Development Commands

- `npm run dev chrome` - Development mode
- `npm run build-all` - Build for all browsers
- `npm run lint` - TypeScript checking
- `npm run test` - Run tests

## Browser Compatibility

- **Chrome/Edge**: Use `chrome.*` APIs
- **Firefox**: May require polyfills for some APIs
- Test manifest.json changes across all browsers

## Internationalization

Supported languages: English, Japanese, German, French, Spanish, Portuguese (Brazilian), Indonesian, Vietnamese, Korean, Chinese (Simplified/Traditional), Hindi

For new languages:
1. Create `app/_locales/[code]/messages.json` with required keys (appName, appDescription, buttonText)
2. Add `detailed-description.txt` for store descriptions
3. Test extension loads correctly with new locale

## Quality Standards

- Test across all supported browsers before completion
- Run lint and tests before considering work complete
- Follow Airbnb JavaScript Style Guide
- Keep files under 250 lines
- Use English for all code comments
