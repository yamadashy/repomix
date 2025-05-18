# Verarbeitung von Remote-Repositories

Repomix unterstützt die Verarbeitung von entfernten Git-Repositories ohne die Notwendigkeit eines manuellen Klonens. Diese Funktion ermöglicht es Ihnen, jedes öffentliche Git-Repository mit einem einzigen Befehl schnell zu analysieren und optimiert so den Arbeitsablauf für die Codeanalyse.

## Grundlegende Verwendung

Verarbeiten Sie öffentliche Repositories:
```bash
# Mit vollständiger URL
repomix --remote https://github.com/user/repo

# Mit GitHub-Kurzform
repomix --remote user/repo
```

## Branch- und Commit-Auswahl

Sie können den Branch-Namen, Tag oder Commit-Hash angeben:

```bash
# Spezifischer Branch mit der Option --remote-branch
repomix --remote user/repo --remote-branch main

# Direkte Verwendung der Branch-URL
repomix --remote https://github.com/user/repo/tree/main

# Tag
repomix --remote user/repo --remote-branch v1.0.0

# Spezifischer Commit-Hash mit der Option --remote-branch
repomix --remote user/repo --remote-branch 935b695
```

## Anforderungen

- Git muss installiert sein
- Internetverbindung
- Lesezugriff auf das Repository

## Ausgabesteuerung

```bash
# Benutzerdefinierter Ausgabeort
repomix --remote user/repo -o custom-output.xml

# Mit XML-Format
repomix --remote user/repo --style xml

# Kommentare entfernen
repomix --remote user/repo --remove-comments
```

## Docker-Verwendung

```bash
# Verarbeiten und Ausgabe in das aktuelle Verzeichnis
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo

# Ausgabe in ein bestimmtes Verzeichnis
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix \
  --remote user/repo
```

## Häufige Probleme

### Zugriffsprobleme
- Stellen Sie sicher, dass das Repository öffentlich ist
- Überprüfen Sie die Git-Installation
- Überprüfen Sie die Internetverbindung

### Große Repositories
- Verwenden Sie `--include`, um bestimmte Pfade auszuwählen
- Aktivieren Sie `--remove-comments`
- Verarbeiten Sie Branches separat
