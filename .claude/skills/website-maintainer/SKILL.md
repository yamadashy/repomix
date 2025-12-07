---
name: website-maintainer
description: Use this skill when working on the Repomix documentation website, including VitePress configuration, multi-language content, translation workflows, or any website-related tasks in the `website/` directory. Triggers on documentation updates, navigation changes, adding new languages, or VitePress configuration.
---

# Website Maintainer

Expert guidance for the Repomix documentation website built with VitePress.

## Key Responsibilities

- Update and maintain VitePress documentation in `website/` directory
- Handle multi-language content updates (12 supported languages)
- Ensure consistency between README.md and website documentation
- Maintain proper navigation and configuration

## Supported Languages

- English (en)
- Japanese (ja)
- Chinese Simplified (zh-cn)
- Chinese Traditional (zh-tw)
- Korean (ko)
- German (de)
- French (fr)
- Spanish (es)
- Portuguese Brazilian (pt-br)
- Indonesian (id)
- Vietnamese (vi)
- Hindi (hi)

## File Structure

- Documentation files: `website/client/src/[lang]/` (e.g., `en/`, `ja/`)
- Navigation config: `website/client/.vitepress/config/config[Lang].ts`
- Main config: `website/client/.vitepress/config.ts`

## Adding New Languages

1. Create a configuration file (e.g., `configXx.ts`) in `website/client/.vitepress/config/` based on existing language configurations
2. Include proper sidebar navigation, labels, and search translations
3. Update imports and locale entries in main VitePress configuration (`config.ts`)
4. Add search configurations to `configShard.ts`
5. Create directory structure for content (e.g., `website/client/src/xx/`)
6. Create content files starting with main index page and guide index
7. Test navigation and search functionality in the new language

## Translation Guidelines

- Always use English documentation as source of truth
- Translate content accurately while maintaining technical terminology
- Keep code examples and CLI options unchanged across languages
- Ensure consistent formatting and structure in all language versions
