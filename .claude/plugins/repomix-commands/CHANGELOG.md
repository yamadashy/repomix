# Changelog

All notable changes to the repomix-commands plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2024-10-20

### Changed
- Updated documentation and examples
- Improved command descriptions

## [1.0.1] - 2024-10-19

### Added
- Enhanced pack-local and pack-remote commands with better natural language support

## [1.0.0] - 2024-10-18

### Added
- Initial release of repomix-commands plugin for Claude Code
- `/repomix-commands:pack-local` command for packing local codebases
- `/repomix-commands:pack-remote` command for packing remote GitHub repositories
- Natural language support for command options
- Integration with repomix-explorer agent for automated analysis

### Features
- Pack local repositories with various options (format, compression, includes/excludes)
- Pack remote GitHub repositories with flexible configuration
- Automatic agent delegation for post-pack analysis
- Support for custom output paths and formats
- Include/exclude pattern support for selective packing

[1.0.2]: https://github.com/yamadashy/repomix/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/yamadashy/repomix/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/yamadashy/repomix/releases/tag/v1.0.0
