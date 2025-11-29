# Claude Code Plugins

Repomix bietet offizielle Plugins für [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), die sich nahtlos in die KI-gestützte Entwicklungsumgebung integrieren. Diese Plugins ermöglichen es Ihnen, Codebases direkt innerhalb von Claude Code mithilfe natürlichsprachlicher Befehle zu analysieren und zu verpacken.

## Installation

### 1. Repomix-Plugin-Marktplatz hinzufügen

Fügen Sie zunächst den Repomix-Plugin-Marktplatz zu Claude Code hinzu:

```text
/plugin marketplace add yamadashy/repomix
```

### 2. Plugins installieren

Installieren Sie die Plugins mit den folgenden Befehlen:

```text
# MCP-Server-Plugin installieren (empfohlene Basis)
/plugin install repomix-mcp@repomix

# Befehls-Plugin installieren (erweitert Funktionalität)
/plugin install repomix-commands@repomix

# Repository-Explorer-Plugin installieren (KI-gestützte Analyse)
/plugin install repomix-explorer@repomix
```

::: tip Plugin-Beziehung
Das `repomix-mcp`-Plugin wird als Basis empfohlen. Das `repomix-commands`-Plugin bietet praktische Slash-Befehle, während `repomix-explorer` KI-gestützte Analysefunktionen hinzufügt. Obwohl Sie sie unabhängig installieren können, bietet die Verwendung aller drei die umfassendste Erfahrung.
:::

### Alternative: Interaktive Installation

Sie können auch das interaktive Plugin-Installationsprogramm verwenden:

```text
/plugin
```

Dies öffnet eine interaktive Oberfläche, in der Sie verfügbare Plugins durchsuchen und installieren können.

## Verfügbare Plugins

### 1. repomix-mcp (MCP-Server-Plugin)

Basis-Plugin, das KI-gestützte Codebase-Analyse durch MCP-Server-Integration bereitstellt.

**Funktionen:**
- Lokale und entfernte Repositories verpacken
- Verpackte Ausgaben durchsuchen
- Dateien mit integriertem Sicherheitsscan lesen ([Secretlint](https://github.com/secretlint/secretlint))
- Automatische Tree-sitter-Kompression (ca. 70% Token-Reduktion)

### 2. repomix-commands (Slash-Befehls-Plugin)

Bietet praktische Slash-Befehle mit Unterstützung für natürliche Sprache.

**Verfügbare Befehle:**
- `/repomix-commands:pack-local` - Lokale Codebase mit verschiedenen Optionen verpacken
- `/repomix-commands:pack-remote` - Entfernte GitHub-Repositories verpacken und analysieren

### 3. repomix-explorer (KI-Analyse-Agent-Plugin)

KI-gesteuerter Repository-Analyse-Agent, der Codebases intelligent mit Repomix CLI erkundet.

**Funktionen:**
- Natürlichsprachliche Codebase-Erkundung und -Analyse
- Intelligente Mustererkennung und Verständnis der Codestruktur
- Inkrementelle Analyse mit grep und gezieltem Dateilesen
- Automatische Kontextverwaltung für große Repositories

**Verfügbare Befehle:**
- `/repomix-explorer:explore-local` - Lokale Codebase mit KI-Unterstützung analysieren
- `/repomix-explorer:explore-remote` - Entfernte GitHub-Repositories mit KI-Unterstützung analysieren

**Funktionsweise:**
1. Führt `npx repomix@latest` aus, um das Repository zu verpacken
2. Nutzt Grep- und Read-Tools zur effizienten Durchsuchung der Ausgabe
3. Bietet umfassende Analyse ohne übermäßigen Kontextverbrauch

## Verwendungsbeispiele

### Lokale Codebase verpacken

Verwenden Sie den Befehl `/repomix-commands:pack-local` mit natürlichsprachlichen Anweisungen:

```text
/repomix-commands:pack-local
Dieses Projekt im Markdown-Format mit Kompression verpacken
```

Weitere Beispiele:
- "Nur das src-Verzeichnis verpacken"
- "TypeScript-Dateien mit Zeilennummern verpacken"
- "Ausgabe im JSON-Format generieren"

### Entferntes Repository verpacken

Verwenden Sie den Befehl `/repomix-commands:pack-remote`, um GitHub-Repositories zu analysieren:

```text
/repomix-commands:pack-remote yamadashy/repomix
Nur TypeScript-Dateien aus dem Repository yamadashy/repomix verpacken
```

Weitere Beispiele:
- "Main-Branch mit Kompression verpacken"
- "Nur Dokumentationsdateien einschließen"
- "Bestimmte Verzeichnisse verpacken"

### Lokale Codebase mit KI erkunden

Verwenden Sie den Befehl `/repomix-explorer:explore-local` für KI-gestützte Analyse:

```text
/repomix-explorer:explore-local ./src
Alle authentifizierungsbezogenen Codes finden
```

Weitere Beispiele:
- "Die Struktur dieses Projekts analysieren"
- "Die Hauptkomponenten anzeigen"
- "Alle API-Endpunkte finden"

### Entferntes Repository mit KI erkunden

Verwenden Sie den Befehl `/repomix-explorer:explore-remote`, um GitHub-Repositories zu analysieren:

```text
/repomix-explorer:explore-remote facebook/react
Die Hauptkomponentenarchitektur anzeigen
```

Weitere Beispiele:
- "Alle React-Hooks im Repository finden"
- "Die Projektstruktur erklären"
- "Wo sind Error Boundaries definiert?"

## Verwandte Ressourcen

- [MCP-Server-Dokumentation](/guide/mcp-server) - Erfahren Sie mehr über den zugrunde liegenden MCP-Server
- [Konfiguration](/guide/configuration) - Repomix-Verhalten anpassen
- [Sicherheit](/guide/security) - Sicherheitsfunktionen verstehen
- [Befehlszeilenoptionen](/guide/command-line-options) - Verfügbare CLI-Optionen

## Plugin-Quellcode

Der Plugin-Quellcode ist im Repomix-Repository verfügbar:

- [Plugin-Marktplatz](https://github.com/yamadashy/repomix/tree/main/.claude-plugin)
- [MCP-Plugin](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-mcp)
- [Befehls-Plugin](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-commands)
- [Repository-Explorer-Plugin](https://github.com/yamadashy/repomix/tree/main/.claude/plugins/repomix-explorer)

## Feedback und Support

Wenn Sie Probleme haben oder Vorschläge für die Claude Code Plugins haben:

- [Issue auf GitHub öffnen](https://github.com/yamadashy/repomix/issues)
- [Unserer Discord-Community beitreten](https://discord.gg/wNYzTwZFku)
- [Bestehende Diskussionen ansehen](https://github.com/yamadashy/repomix/discussions)
