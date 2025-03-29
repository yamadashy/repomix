# MCP-Server

Repomix unterstützt das [Model Context Protocol (MCP)](https://modelcontextprotocol.io), das es KI-Assistenten ermöglicht, direkt mit Ihrer Codebasis zu interagieren. Wenn Repomix als MCP-Server ausgeführt wird, stellt es Tools bereit, die es KI-Assistenten ermöglichen, lokale oder entfernte Repositories ohne manuelle Dateivorbereitung für die Analyse zu verpacken.

> [!NOTE]  
> Dies ist eine experimentelle Funktion, die wir basierend auf Benutzerfeedback und praktischer Nutzung aktiv verbessern werden

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

### file_system_read_file und file_system_read_directory

Der Repomix MCP-Server bietet zwei Dateisystemwerkzeuge, die es KI-Assistenten ermöglichen, sicher mit dem lokalen Dateisystem zu interagieren:

1. `file_system_read_file`
   - Liest Dateiinhalte unter Verwendung absoluter Pfade
   - Implementiert Sicherheitsvalidierung mit [Secretlint](https://github.com/secretlint/secretlint)
   - Verhindert den Zugriff auf Dateien mit sensiblen Informationen
   - Liefert klare Fehlermeldungen für ungültige Pfade und Sicherheitsprobleme

2. `file_system_read_directory`
   - Listet Verzeichnisinhalte unter Verwendung absoluter Pfade
   - Zeigt Dateien und Verzeichnisse mit klaren Indikatoren (`[FILE]` oder `[DIR]`)
   - Bietet sichere Verzeichnisnavigation mit angemessener Fehlerbehandlung
   - Validiert Pfade und stellt sicher, dass sie absolut sind

Beide Werkzeuge beinhalten robuste Sicherheitsmaßnahmen:
- Validierung absoluter Pfade zur Verhinderung von Directory Traversal-Angriffen
- Berechtigungsprüfungen zur Gewährleistung angemessener Zugriffsrechte
- Integration mit Secretlint zur Erkennung sensibler Informationen
- Klare Fehlermeldungen für Debugging und Sicherheitsbewusstsein

**Beispiel:**
```typescript
// Datei lesen
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// Verzeichnisinhalt auflisten
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

Diese Werkzeuge sind besonders nützlich, wenn KI-Assistenten:
- Bestimmte Dateien im Codebase analysieren müssen
- Verzeichnisstrukturen navigieren müssen
- Existenz und Zugänglichkeit von Dateien überprüfen müssen
- Sichere Dateisystemoperationen gewährleisten müssen

## MCP-Server konfigurieren

Um Repomix als MCP-Server mit KI-Assistenten wie Claude zu verwenden, müssen Sie die MCP-Einstellungen konfigurieren:

### Für VS Code

Sie können den Repomix MCP-Server in VS Code mit einer dieser Methoden installieren:

1. **Über das Installations-Badge:**

   [![Install in VS Code](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
   [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **Über die Kommandozeile:**

   ```bash
   code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
   ```

   Für VS Code Insiders:
   ```bash
   code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
   ```

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
