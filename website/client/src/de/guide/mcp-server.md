# MCP-Server

Repomix unterstützt das [Model Context Protocol (MCP)](https://modelcontextprotocol.io), das KI-Assistenten ermöglicht, direkt mit Ihrem Quellcode zu interagieren. Wenn Repomix als MCP-Server ausgeführt wird, stellt es Werkzeuge bereit, die KI-Assistenten die Möglichkeit geben, lokale oder entfernte Repositories für die Analyse zu verpacken, ohne dass eine manuelle Dateivorbereitung erforderlich ist. Diese Integration vereinfacht den Prozess der Codeanalyse, indem die Notwendigkeit entfällt, Dateien manuell zu generieren und hochzuladen.

> [!NOTE]  
> Dies ist eine experimentelle Funktion, die wir basierend auf Benutzerfeedback und realer Nutzung aktiv verbessern werden

## Ausführen von Repomix als MCP-Server

Um Repomix als MCP-Server auszuführen, verwenden Sie das Flag `--mcp`:

```bash
repomix --mcp
```

Dies startet Repomix im MCP-Server-Modus und macht es für KI-Assistenten verfügbar, die das Model Context Protocol unterstützen.

## Konfiguration von MCP-Servern

Um Repomix als MCP-Server mit KI-Assistenten wie Claude zu verwenden, müssen Sie die MCP-Einstellungen konfigurieren:

### Für VS Code

Sie können den Repomix MCP-Server in VS Code mit einer dieser Methoden installieren:

1. **Verwendung des Installations-Badges:**

  [![In VS Code installieren](https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF)](vscode:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)<br>
  [![In VS Code Insiders installieren](https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5)](vscode-insiders:mcp/install?%7B%22name%22%3A%22repomix%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22repomix%22%2C%22--mcp%22%5D%7D)

2. **Verwendung der Kommandozeile:**

  ```bash
  code --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

  Für VS Code Insiders:
  ```bash
  code-insiders --add-mcp '{"name":"repomix","command":"npx","args":["-y","repomix","--mcp"]}'
  ```

### Für Cline (VS Code-Erweiterung)

Bearbeiten Sie die Datei `cline_mcp_settings.json`:

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

### Für Cursor

Fügen Sie in Cursor einen neuen MCP-Server über `Cursor-Einstellungen` > `MCP` > `+ Neuen globalen MCP-Server hinzufügen` mit einer ähnlichen Konfiguration wie bei Cline hinzu.

### Für Claude Desktop

Bearbeiten Sie die Datei `claude_desktop_config.json` mit einer ähnlichen Konfiguration wie bei Cline.

### Verwendung von Docker anstelle von npx

Anstatt npx zu verwenden, können Sie auch Docker nutzen, um Repomix als MCP-Server auszuführen:

```json
{
  "mcpServers": {
    "repomix-docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/yamadashy/repomix",
        "--mcp"
      ]
    }
  }
}
```

## Verfügbare MCP-Werkzeuge

Wenn Repomix als MCP-Server ausgeführt wird, stellt es die folgenden Werkzeuge bereit:

### pack_codebase

Dieses Werkzeug verpackt ein lokales Code-Verzeichnis in eine konsolidierte Datei für die KI-Analyse.

**Parameter:**
- `directory`: (Erforderlich) Absoluter Pfad zum zu verpackenden Verzeichnis
- `compress`: (Optional, Standard: true) Ob eine intelligente Code-Extraktion durchgeführt werden soll, um die Token-Anzahl zu reduzieren
- `includePatterns`: (Optional) Durch Kommas getrennte Liste von Einschlussmustern
- `ignorePatterns`: (Optional) Durch Kommas getrennte Liste von Ignorierungsmustern

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

Dieses Werkzeug holt, klont und verpackt ein GitHub-Repository in eine konsolidierte Datei für die KI-Analyse.

**Parameter:**
- `remote`: (Erforderlich) GitHub-Repository-URL oder Benutzer/Repo-Format (z.B. yamadashy/repomix)
- `compress`: (Optional, Standard: true) Ob eine intelligente Code-Extraktion durchgeführt werden soll, um die Token-Anzahl zu reduzieren
- `includePatterns`: (Optional) Durch Kommas getrennte Liste von Einschlussmustern
- `ignorePatterns`: (Optional) Durch Kommas getrennte Liste von Ignorierungsmustern

**Beispiel:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": true,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/"
}
```

### read_repomix_output

Dieses Werkzeug liest den Inhalt einer Repomix-Ausgabedatei in Umgebungen, in denen kein direkter Dateizugriff möglich ist.

**Parameter:**
- `outputId`: (Erforderlich) ID der zu lesenden Repomix-Ausgabedatei

**Funktionen:**
- Speziell für webbasierte Umgebungen oder Sandbox-Anwendungen konzipiert
- Ruft den Inhalt zuvor generierter Ausgaben anhand ihrer ID ab
- Bietet sicheren Zugriff auf verpackten Quellcode, ohne Dateisystemzugriff zu benötigen

**Beispiel:**
```json
{
  "outputId": "8f7d3b1e2a9c6054"
}
```

### file_system_read_file und file_system_read_directory

Der MCP-Server von Repomix bietet zwei Dateisystem-Werkzeuge, die KI-Assistenten eine sichere Interaktion mit dem lokalen Dateisystem ermöglichen:

1. `file_system_read_file`
  - Liest Dateiinhalte mit absoluten Pfaden
  - Implementiert Sicherheitsvalidierung mit [Secretlint](https://github.com/secretlint/secretlint)
  - Verhindert den Zugriff auf Dateien mit sensiblen Informationen
  - Gibt formatierten Inhalt mit klaren Fehlermeldungen für ungültige Pfade oder Sicherheitsprobleme zurück

2. `file_system_read_directory`
  - Listet Verzeichnisinhalte mit absoluten Pfaden auf
  - Zeigt sowohl Dateien als auch Verzeichnisse mit klaren Indikatoren (`[FILE]` oder `[DIR]`)
  - Bietet sichere Verzeichnisnavigation mit ordnungsgemäßer Fehlerbehandlung
  - Validiert Pfade und stellt sicher, dass sie absolut sind

Beide Werkzeuge beinhalten robuste Sicherheitsmaßnahmen:
- Validierung absoluter Pfade, um Directory-Traversal-Angriffe zu verhindern
- Berechtigungsprüfungen, um ordnungsgemäße Zugriffsrechte zu gewährleisten
- Integration mit Secretlint zur Erkennung sensibler Informationen
- Klare Fehlermeldungen für besseres Debugging und Sicherheitsbewusstsein
- Validierung von Dateitypen, um den Zugriff auf Binär- oder ausführbare Dateien zu verhindern

**Beispiel:**
```typescript
// Lesen einer Datei
const fileContent = await tools.file_system_read_file({
  path: '/absolute/path/to/file.txt'
});

// Auflisten von Verzeichnisinhalten
const dirContent = await tools.file_system_read_directory({
  path: '/absolute/path/to/directory'
});
```

Diese Werkzeuge sind besonders nützlich, wenn KI-Assistenten:
- Bestimmte Dateien im Quellcode analysieren müssen
- Verzeichnisstrukturen navigieren müssen
- Die Existenz und Zugänglichkeit von Dateien überprüfen müssen
- Sichere Dateisystemoperationen gewährleisten müssen

## Vorteile der Verwendung von Repomix als MCP-Server

Die Verwendung von Repomix als MCP-Server bietet mehrere Vorteile:

1. **Direkte Integration**: KI-Assistenten können Ihren Quellcode direkt analysieren, ohne manuelle Dateivorbereitung.
2. **Effizienter Arbeitsablauf**: Vereinfacht den Prozess der Codeanalyse, indem die Notwendigkeit entfällt, Dateien manuell zu generieren und hochzuladen.
3. **Konsistente Ausgabe**: Stellt sicher, dass der KI-Assistent den Quellcode in einem konsistenten, optimierten Format erhält.
4. **Erweiterte Funktionen**: Nutzt alle Funktionen von Repomix wie Code-Komprimierung, Token-Zählung und Sicherheitsprüfungen.
5. **Sicherheitskontrollen**: Bietet sicheren Zugriff auf Ihren Quellcode mit integrierter Sicherheitsvalidierung.

Nach der Konfiguration kann Ihr KI-Assistent die Fähigkeiten von Repomix direkt nutzen, um Codebasen zu analysieren und Codeanalyse-Workflows effizienter zu gestalten.
