---
name: website-maintainer
description: Use this skill when working on the Repomix documentation website in `website/` directory, including VitePress configuration, multi-language content, or translation workflows.
---

# Website Maintainer

VitePress documentation site with 14 languages.

## Structure

```plaintext
website/client/
├── .vitepress/
│   ├── config.ts           # Main config (imports all locales)
│   └── config/
│       ├── configShard.ts  # Shared settings (PWA, sitemap, etc.)
│       └── config[Lang].ts # Per-language config (nav, sidebar, search)
└── src/
    └── [lang]/             # en, ja, zh-cn, zh-tw, ko, de, fr, es, pt-br, id, vi, hi, it, ru
```

## Adding New Language

1. Create `config/configXx.ts` based on existing (exports config + search translations)
2. Import and add to `locales` in `config.ts`
3. Add search config to `configShard.ts`
4. Create `src/xx/` directory with content (copy from `en/`)

## Editing Content

- **Documents**: Edit `src/[lang]/guide/*.md` (e.g., `src/ja/guide/installation.md`)
- **Navigation/Sidebar**: Edit `config/config[Lang].ts` → `themeConfig.sidebar`
- **Shared settings** (logo, footer): Edit `configShard.ts`

## Translation Guidelines

- English (`src/en/`) is source of truth
- Keep code examples and CLI options unchanged
- Translate UI labels in config file (nav, sidebar, search modal)
