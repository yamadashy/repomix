# Grundlegende Verwendung

## Schnellstart

Packen Sie Ihr gesamtes Repository:
```bash
repomix
```

## Häufige Anwendungsfälle

### Bestimmte Verzeichnisse packen
Verarbeiten Sie nur bestimmte Verzeichnisse oder Dateien, um sich auf relevanten Code zu konzentrieren und die Token-Anzahl zu reduzieren:
```bash
repomix path/to/directory
```

### Bestimmte Dateien einschließen
Verwenden Sie [Glob-Muster](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax), um präzise zu steuern, welche Dateien eingeschlossen werden:
```bash
repomix --include "src/**/*.ts,**/*.md"
```

### Dateien ausschließen
Überspringen Sie bestimmte Dateien oder Verzeichnisse mit Glob-Mustern, um unnötige oder sensible Inhalte nicht einzuschließen:
```bash
repomix --ignore "**/*.log,tmp/"
```

### Remote-Repositories
```bash
# Mit GitHub-URL
repomix --remote https://github.com/user/repo

# Mit Kurzform
repomix --remote user/repo

# Bestimmter Branch/Tag/Commit
repomix --remote user/repo --remote-branch main
repomix --remote user/repo --remote-branch 935b695
```

### Code-Komprimierung

Verwenden Sie Tree-sitter, um intelligent wesentliche Code-Strukturen zu extrahieren und gleichzeitig Implementierungsdetails zu entfernen, wodurch die Token-Anzahl erheblich reduziert wird, während die Architektur erhalten bleibt:

```bash
repomix --compress

# Sie können es auch mit Remote-Repositories verwenden:
repomix --remote yamadashy/repomix --compress
```

## Ausgabeformate

### XML (Standard)
```bash
repomix --style xml
```

### Markdown
```bash
repomix --style markdown
```

### Klartext
```bash
repomix --style plain
```

## Zusätzliche Optionen

### Kommentare entfernen
```bash
repomix --remove-comments
```

### Zeilennummern anzeigen
```bash
repomix --output-show-line-numbers
```

### In die Zwischenablage kopieren
```bash
repomix --copy
```

### Sicherheitsprüfung deaktivieren
```bash
repomix --no-security-check
```

## Konfiguration

Konfigurationsdatei initialisieren:
```bash
repomix --init
```

Siehe [Konfigurationsleitfaden](/de/guide/configuration) für detaillierte Optionen. 
