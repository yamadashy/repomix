# Sicherheit

## Sicherheitsprüfungsfunktion

Repomix verwendet [Secretlint](https://github.com/secretlint/secretlint), um sensible Informationen in Ihren Dateien zu erkennen, darunter:
- API-Schlüssel und Zugriffstoken
- Authentifizierungsdaten
- Private Schlüssel und Zertifikate
- Datenbankverbindungszeichenfolgen
- Umgebungsvariablen mit Geheimnissen
- Persönliche oder sensible Daten

## Konfiguration

Sicherheitsprüfungen sind standardmäßig aktiviert.

Deaktivieren über CLI:
```bash
repomix --no-security-check
```

Oder in `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Sicherheitsmaßnahmen

1. **Ausschluss von Binärdateien**: Binärdateien werden nicht in die Ausgabe aufgenommen, um die Dateigröße zu reduzieren und das Durchsickern sensibler Daten zu verhindern
2. **Git-bewusst**: Respektiert `.gitignore`-Muster, um das Einbeziehen sensibler Dateien zu vermeiden, die bereits für den Ausschluss markiert sind
3. **Automatisierte Erkennung**: Scannt nach häufigen Sicherheitsproblemen:
  - AWS-Anmeldedaten und Zugriffsschlüssel
  - Datenbankverbindungszeichenfolgen und Passwörter
  - Authentifizierungstoken und OAuth-Anmeldedaten
  - Private Schlüssel und Zertifikate
  - Umgebungsvariablen mit sensiblen Informationen

## Wenn die Sicherheitsprüfung Probleme findet

Beispielausgabe:
```bash
🔍 Sicherheitsprüfung:
──────────────────
2 verdächtige Datei(en) erkannt und ausgeschlossen:
1. config/credentials.json
  - AWS-Zugriffsschlüssel gefunden
2. .env.local
  - Datenbankpasswort gefunden
```

## Bewährte Praktiken

1. Überprüfen Sie die Ausgabe immer, bevor Sie sie mit KI-Diensten teilen
2. Verwenden Sie `.repomixignore` für zusätzliche sensible Pfade
3. Lassen Sie Sicherheitsprüfungen aktiviert, es sei denn, es ist unbedingt notwendig, sie zu deaktivieren
4. Entfernen Sie sensible Dateien aus dem Repository oder fügen Sie sie zu Ignoriermustern hinzu

## Melden von Sicherheitsproblemen

Haben Sie eine Sicherheitslücke gefunden? Bitte:
1. Öffnen Sie kein öffentliches Issue
2. E-Mail: koukun0120@gmail.com
3. Oder verwenden Sie [GitHub Security Advisories](https://github.com/yamadashy/repomix/security/advisories/new)
