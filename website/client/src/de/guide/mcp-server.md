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

### Für Cursor

In Cursor fügen Sie einen neuen MCP-Server aus `Cursor Settings` > `MCP` > `+ Add new global MCP server` mit einer ähnlichen Konfiguration wie bei Cline hinzu.

### Für Claude Desktop

Bearbeiten Sie die `claude_desktop_config.json`-Datei mit einer ähnlichen Konfiguration wie bei Cline.

### Für Claude Code

Um Repomix als MCP-Server in [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) zu konfigurieren, verwenden Sie den folgenden Befehl:

```bash
claude mcp add repomix -- npx -y repomix --mcp
```

Alternativ können Sie die **offiziellen Repomix-Plugins** für ein komfortableres Erlebnis verwenden. Die Plugins bieten natürlichsprachliche Befehle und eine einfachere Einrichtung. Weitere Informationen finden Sie in der Dokumentation [Claude Code Plugins](/de/guide/claude-code-plugins).

### Docker anstelle von npx verwenden

Anstatt npx zu verwenden, können Sie auch Docker verwenden, um Repomix als MCP-Server auszuführen:

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

## Verfügbare MCP-Tools

Wenn Repomix als MCP-Server ausgeführt wird, stellt es die folgenden Tools bereit:

### pack_codebase

Dieses Tool verpackt ein lokales Code-Verzeichnis in eine XML-Datei für die KI-Analyse. Es analysiert die Codebase-Struktur, extrahiert relevanten Code-Inhalt und generiert einen umfassenden Bericht mit Metriken, Dateibaum und formatiertem Code-Inhalt.

**Parameter:**
- `directory`: (Erforderlich) Absoluter Pfad zum zu verpackenden Verzeichnis
- `compress`: (Optional, Standard: false) Aktiviert Tree-sitter-Komprimierung zur Extraktion wesentlicher Code-Signaturen und -Strukturen bei gleichzeitiger Entfernung von Implementierungsdetails. Reduziert die Token-Nutzung um ~70% bei Beibehaltung der semantischen Bedeutung. Normalerweise nicht erforderlich, da grep_repomix_output inkrementelle Inhaltsabrufung ermöglicht. Verwenden Sie dies nur, wenn Sie speziell den gesamten Codebase-Inhalt für große Repositories benötigen.
- `includePatterns`: (Optional) Spezifiziert Dateien zum Einschließen mit fast-glob-Mustern. Mehrere Muster können durch Kommas getrennt werden (z.B. "**/*.{js,ts}", "src/**,docs/**"). Nur übereinstimmende Dateien werden verarbeitet.
- `ignorePatterns`: (Optional) Spezifiziert zusätzliche Dateien zum Ausschließen mit fast-glob-Mustern. Mehrere Muster können durch Kommas getrennt werden (z.B. "test/**,*.spec.js", "node_modules/**,dist/**"). Diese Muster ergänzen .gitignore und eingebaute Ausschlüsse.
- `topFilesLength`: (Optional, Standard: 10) Anzahl der größten Dateien nach Größe, die in der Metrik-Zusammenfassung für die Codebase-Analyse angezeigt werden.

**Beispiel:**
```json
{
  "directory": "/path/to/your/project",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### pack_remote_repository

Dieses Tool holt, klont und verpackt ein GitHub-Repository in eine XML-Datei für die KI-Analyse. Es klont automatisch das entfernte Repository, analysiert seine Struktur und generiert einen umfassenden Bericht.

**Parameter:**
- `remote`: (Erforderlich) GitHub-Repository-URL oder user/repo-Format (z.B. "yamadashy/repomix", "https://github.com/user/repo", oder "https://github.com/user/repo/tree/branch")
- `compress`: (Optional, Standard: false) Aktiviert Tree-sitter-Komprimierung zur Extraktion wesentlicher Code-Signaturen und -Strukturen bei gleichzeitiger Entfernung von Implementierungsdetails. Reduziert die Token-Nutzung um ~70% bei Beibehaltung der semantischen Bedeutung. Normalerweise nicht erforderlich, da grep_repomix_output inkrementelle Inhaltsabrufung ermöglicht. Verwenden Sie dies nur, wenn Sie speziell den gesamten Codebase-Inhalt für große Repositories benötigen.
- `includePatterns`: (Optional) Spezifiziert Dateien zum Einschließen mit fast-glob-Mustern. Mehrere Muster können durch Kommas getrennt werden (z.B. "**/*.{js,ts}", "src/**,docs/**"). Nur übereinstimmende Dateien werden verarbeitet.
- `ignorePatterns`: (Optional) Spezifiziert zusätzliche Dateien zum Ausschließen mit fast-glob-Mustern. Mehrere Muster können durch Kommas getrennt werden (z.B. "test/**,*.spec.js", "node_modules/**,dist/**"). Diese Muster ergänzen .gitignore und eingebaute Ausschlüsse.
- `topFilesLength`: (Optional, Standard: 10) Anzahl der größten Dateien nach Größe, die in der Metrik-Zusammenfassung für die Codebase-Analyse angezeigt werden.

**Beispiel:**
```json
{
  "remote": "yamadashy/repomix",
  "compress": false,
  "includePatterns": "src/**/*.ts,**/*.md",
  "ignorePatterns": "**/*.log,tmp/",
  "topFilesLength": 10
}
```

### read_repomix_output

Dieses Tool liest den Inhalt einer von Repomix generierten Ausgabedatei. Es unterstützt partielles Lesen mit Zeilenbereichen für große Dateien. Dieses Tool ist für Umgebungen konzipiert, in denen der direkte Dateisystemzugriff eingeschränkt ist.

**Parameter:**
- `outputId`: (Erforderlich) ID der zu lesenden Repomix-Ausgabedatei
- `startLine`: (Optional) Startzeilennummer (1-basiert, inklusive). Wenn nicht angegeben, wird vom Anfang gelesen.
- `endLine`: (Optional) Endzeilennummer (1-basiert, inklusive). Wenn nicht angegeben, wird bis zum Ende gelesen.

**Funktionen:**
- Speziell für webbasierte Umgebungen oder Sandbox-Anwendungen entwickelt
- Ruft den Inhalt zuvor generierter Ausgaben über ihre ID ab
- Bietet sicheren Zugriff auf verpackte Codebase ohne Dateisystemzugriff
- Unterstützt partielles Lesen für große Dateien

**Beispiel:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "startLine": 100,
  "endLine": 200
}
```

### grep_repomix_output

Dieses Tool durchsucht Muster in einer Repomix-Ausgabedatei mit grep-ähnlicher Funktionalität unter Verwendung der JavaScript RegExp-Syntax. Es gibt übereinstimmende Zeilen mit optionalen Kontextzeilen um die Übereinstimmungen zurück.

**Parameter:**
- `outputId`: (Erforderlich) ID der zu durchsuchenden Repomix-Ausgabedatei
- `pattern`: (Erforderlich) Suchmuster (JavaScript RegExp-Syntax für reguläre Ausdrücke)
- `contextLines`: (Optional, Standard: 0) Anzahl der Kontextzeilen, die vor und nach jeder Übereinstimmung angezeigt werden. Wird von beforeLines/afterLines überschrieben, wenn angegeben.
- `beforeLines`: (Optional) Anzahl der Kontextzeilen, die vor jeder Übereinstimmung angezeigt werden (wie grep -B). Hat Vorrang vor contextLines.
- `afterLines`: (Optional) Anzahl der Kontextzeilen, die nach jeder Übereinstimmung angezeigt werden (wie grep -A). Hat Vorrang vor contextLines.
- `ignoreCase`: (Optional, Standard: false) Führt groß-/kleinschreibungsunabhängige Übereinstimmung durch

**Funktionen:**
- Verwendet JavaScript RegExp-Syntax für leistungsstarke Musterübereinstimmung
- Unterstützt Kontextzeilen für besseres Verständnis der Übereinstimmungen
- Ermöglicht separate Kontrolle von Vor-/Nach-Kontextzeilen
- Groß-/kleinschreibungsabhängige und -unabhängige Suchoptionen

**Beispiel:**
```json
{
  "outputId": "8f7d3b1e2a9c6054",
  "pattern": "function\\s+\\w+\\(",
  "contextLines": 3,
  "ignoreCase": false
}
```

### file_system_read_file und file_system_read_directory

Der Repomix MCP-Server bietet zwei Dateisystemwerkzeuge, die es KI-Assistenten ermöglichen, sicher mit dem lokalen Dateisystem zu interagieren:

1. `file_system_read_file`
  - Liest Dateiinhalte aus dem lokalen Dateisystem unter Verwendung absoluter Pfade
  - Beinhaltet eingebaute Sicherheitsvalidierung zur Erkennung und Verhinderung des Zugriffs auf Dateien mit sensiblen Informationen
  - Implementiert Sicherheitsvalidierung mit [Secretlint](https://github.com/secretlint/secretlint)
  - Verhindert den Zugriff auf Dateien mit sensiblen Informationen (API-Schlüssel, Passwörter, Geheimnisse)
  - Validiert absolute Pfade zur Verhinderung von Directory Traversal-Angriffen
  - Liefert klare Fehlermeldungen für ungültige Pfade und Sicherheitsprobleme

2. `file_system_read_directory`
  - Listet den Inhalt eines Verzeichnisses unter Verwendung eines absoluten Pfads
  - Gibt eine formatierte Liste zurück, die Dateien und Unterverzeichnisse mit klaren Indikatoren zeigt
  - Zeigt Dateien und Verzeichnisse mit klaren Indikatoren (`[FILE]` oder `[DIR]`)
  - Bietet sichere Verzeichnisnavigation mit angemessener Fehlerbehandlung
  - Validiert Pfade und stellt sicher, dass sie absolut sind
  - Nützlich für die Erkundung der Projektstruktur und das Verständnis der Codebase-Organisation

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
- Bestimmte Dateien in der Codebase analysieren müssen
- Verzeichnisstrukturen navigieren müssen
- Existenz und Zugänglichkeit von Dateien überprüfen müssen
- Sichere Dateisystemoperationen gewährleisten müssen

## Vorteile der Verwendung von Repomix als MCP-Server

Die Verwendung von Repomix als MCP-Server bietet mehrere Vorteile:

1. **Direkte Integration**: KI-Assistenten können Ihre Codebasis ohne manuelle Dateivorbereitung direkt analysieren.
2. **Effizienter Workflow**: Optimiert den Prozess der Codeanalyse, indem die Notwendigkeit entfällt, Dateien manuell zu generieren und hochzuladen.
3. **Konsistente Ausgabe**: Stellt sicher, dass der KI-Assistent die Codebasis in einem konsistenten, optimierten Format erhält.
4. **Erweiterte Funktionen**: Nutzt alle Funktionen von Repomix wie Code-Komprimierung, Token-Zählung und Sicherheitsprüfungen.

Nach der Konfiguration kann Ihr KI-Assistent die Funktionen von Repomix direkt nutzen, um Codebasen zu analysieren, was Codeanalyse-Workflows effizienter macht.

## Verwandte Ressourcen

- [Claude Code Plugins](/de/guide/claude-code-plugins) - Komfortable Plugin-Integration für Claude Code
- [Konfiguration](/de/guide/configuration) - Repomix-Verhalten anpassen
- [Befehlszeilenoptionen](/de/guide/command-line-options) - Vollständige CLI-Referenz
- [Ausgabeformate](/de/guide/output) - Verfügbare Ausgabeformate kennenlernen
