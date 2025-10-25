# Changelog

All notable changes to the repomix-explorer plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-10-25

### Changed
- **BREAKING**: Renamed plugin from `repository-explorer` to `repomix-explorer`
- **BREAKING**: Simplified agent name from `repository-explorer` to `explorer`
- Updated fully qualified agent name from `repository-explorer:repository-explorer` to `repomix-explorer:explorer`
- Updated all commands to use new namespace: `/repomix-explorer:explore-local`, `/repomix-explorer:explore-remote`
- Aligned plugin naming with Repomix ecosystem (repomix-mcp, repomix-commands)

### Migration Guide
Users upgrading from 1.0.x need to:
1. Uninstall old plugin: `/plugin uninstall repository-explorer@repomix`
2. Install new plugin: `/plugin install repomix-explorer@repomix`
3. Update command usage:
   - Old: `/repository-explorer:explore-local`
   - New: `/repomix-explorer:explore-local`

## [1.0.0] - 2024-10-18

### Added
- Initial release of repository-explorer plugin for Claude Code
- AI-powered repository analysis using Repomix CLI
- `/repository-explorer:explore-local` command for analyzing local codebases
- `/repository-explorer:explore-remote` command for analyzing remote GitHub repositories
- Intelligent pattern discovery and code structure understanding
- Incremental analysis using grep and targeted file reading
- Automatic context management for large repositories

### Features
- Natural language codebase exploration
- Automated repository packing with Repomix CLI
- Efficient search using grep on packed outputs
- Incremental file reading for large codebases
- Support for both local and remote repository analysis
- Integration with Claude Code's agent system

[1.1.0]: https://github.com/yamadashy/repomix/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/yamadashy/repomix/releases/tag/v1.0.0
