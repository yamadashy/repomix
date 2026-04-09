# Kommentarentfernung

Repomix kann beim Generieren der Ausgabedatei automatisch Kommentare aus Ihrer Codebasis entfernen. Dies kann helfen, Störungen zu reduzieren und sich auf den eigentlichen Code zu konzentrieren.

## Verwendung

Um die Kommentarentfernung zu aktivieren, setzen Sie die Option `removeComments` in Ihrer `repomix.config.json` auf `true`:

```json
{
  "output": {
    "removeComments": true
  }
}
```

## Unterstützte Sprachen

Repomix unterstützt die Kommentarentfernung für eine Vielzahl von Programmiersprachen, einschließlich:

- JavaScript/TypeScript (`//`, `/* */`)
- Python (`#`, `"""`, `'''`)
- Java (`//`, `/* */`)
- C/C++ (`//`, `/* */`)
- HTML (`<!-- -->`)
- CSS (`/* */`)
- Und viele mehr...

## Beispiel

Gegeben sei der folgende JavaScript-Code:

```javascript
// Dies ist ein einzeiliger Kommentar
function test() {
  /* Dies ist ein
     mehrzeiliger Kommentar */
  return true;
}
```

Mit aktivierter Kommentarentfernung wird die Ausgabe wie folgt aussehen:

```javascript
function test() {
  return true;
}
```

## Hinweise

- Die Kommentarentfernung wird vor anderen Verarbeitungsschritten durchgeführt, wie z.B. der Zeilennummerierung.
- Einige Kommentare, wie JSDoc-Kommentare, können je nach Sprache und Kontext erhalten bleiben.

## Verwandte Ressourcen

- [Code-Komprimierung](/de/guide/code-compress) - Token-Anzahl durch Extraktion der Code-Struktur weiter reduzieren
- [Konfiguration](/de/guide/configuration) - `output.removeComments` in der Konfigurationsdatei setzen
- [Befehlszeilenoptionen](/de/guide/command-line-options) - `--remove-comments`-Flag verwenden
