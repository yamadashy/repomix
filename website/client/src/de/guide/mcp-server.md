# MCP-Server

Repomix unterstützt das [Model Context Protocol (MCP)](https://modelcontextprotocol.io), das es KI-Assistenten ermöglicht, direkt mit Ihrer Codebasis zu interagieren. Wenn Repomix als MCP-Server ausgeführt wird, stellt es Tools bereit, die es KI-Assistenten ermöglichen, lokale oder entfernte Repositories ohne manuelle Dateivorbereitung für die Analyse zu verpacken.

## Repomix als MCP-Server ausführen

Um Repomix als MCP-Server auszuführen, verwenden Sie die `--mcp`-Flag:

```bash
repomix --mcp
```

Dadurch wird Repomix im MCP-Server-Modus gestartet und steht KI-Assistenten zur Verfügung, die das Model Context Protocol unterstützen.

## Verfügbare MCP-Tools

Wenn Repomix als MCP-Server ausgeführt wird, stellt es die folgenden Tools bereit:

### pack_codebase

Dieses Tool verpackt ein lokales Code-Verzeichnis in eine konsolidierte Datei für die KI-Analyse.

**Parameter:**
- `directory`: (Erforderlich) Absoluter Pfad zum zu verpackenden Verzeichnis
- `compress`: (Optional, Standard: true) Ob eine intelligente Code-Extraktion durchgeführt werden soll, um die Token-Anzahl zu reduzieren
- `includePatterns`: (Optional) Kommagetrennte Liste von Einschlussmuster
- `ignorePatterns`: (Optional) Kommagetrennte Liste von Ausschlussmuster

**Beispiel:**
```json
{
  "directory": "/path/to/your/project",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### pack_remote_repository

Dieses Tool holt, klont und verpackt ein GitHub-Repository in eine konsolidierte Datei für die KI-Analyse.

**Parameter:**
- `remote`: (Erforderlich) GitHub-Repository-URL oder user/repo-Format (z.B. yamadashy/repomix)
- `compress`: (Optional, Standard: true) Ob eine intelligente Code-Extraktion durchgeführt werden soll, um die Token-Anzahl zu reduzieren
- `includePatterns`: (Optional) Kommagetrennte Liste von Einschlussmuster
- `ignorePatterns`: (Optional) Kommagetrennte Liste von Ausschlussmuster

**Beispiel:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

## MCP-Server konfigurieren

Um Repomix als MCP-Server mit KI-Assistenten wie Claude zu verwenden, müssen Sie die MCP-Einstellungen konfigurieren:

### Für Cline (VS Code-Erweiterung)

Bearbeiten Sie die `cline_mcp_settings.json`-Datei:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    }
  }
}
```

### Für Claude Desktop

Bearbeiten Sie die `claude_desktop_config.json`-Datei mit einer ähnlichen Konfiguration wie bei Cline.

## Vorteile der Verwendung von Repomix als MCP-Server

Die Verwendung von Repomix als MCP-Server bietet mehrere Vorteile:

1. **Direkte Integration**: KI-Assistenten können Ihre Codebasis ohne manuelle Dateivorbereitung direkt analysieren.
2. **Effizienter Workflow**: Optimiert den Prozess der Codeanalyse, indem die Notwendigkeit entfällt, Dateien manuell zu generieren und hochzuladen.
3. **Konsistente Ausgabe**: Stellt sicher, dass der KI-Assistent die Codebasis in einem konsistenten, optimierten Format erhält.
4. **Erweiterte Funktionen**: Nutzt alle Funktionen von Repomix wie Code-Komprimierung, Token-Zählung und Sicherheitsprüfungen.

Nach der Konfiguration kann Ihr KI-Assistent die Funktionen von Repomix direkt nutzen, um Codebasen zu analysieren, was Codeanalyse-Workflows effizienter macht.
