# Code-Komprimierung

Die Code-Komprimierung ist eine leistungsstarke Funktion, die wichtige Code-Strukturen intelligent extrahiert und dabei Implementierungsdetails entfernt. Dies ist besonders nützlich, um die Token-Anzahl zu reduzieren und gleichzeitig wichtige strukturelle Informationen über Ihre Codebasis beizubehalten.

> [!NOTE]
> Dies ist eine experimentelle Funktion, die wir basierend auf Benutzerfeedback und praktischer Nutzung aktiv verbessern werden.

## Grundlegende Verwendung

Aktivieren Sie die Code-Komprimierung mit der Option `--compress`:

```bash
repomix --compress
```

Sie können sie auch mit Remote-Repositories verwenden:

```bash
repomix --remote user/repo --compress
```

## Funktionsweise

Der Komprimierungsalgorithmus verarbeitet Code mithilfe von Tree-Sitter-Parsing, um wesentliche strukturelle Elemente zu extrahieren und zu bewahren, während Implementierungsdetails entfernt werden.

Die Komprimierung bewahrt:
- Funktions- und Methodensignaturen
- Schnittstellen- und Typdefinitionen
- Klassenstrukturen und Eigenschaften
- Wichtige strukturelle Elemente

Während sie entfernt:
- Funktions- und Methodenimplementierungen
- Details zu Schleifen- und Bedingungslogik
- Interne Variablendeklarationen
- Implementierungsspezifischen Code

### Beispiel

Ursprünglicher TypeScript-Code:

```typescript
import { ShoppingItem } from './shopping-item';

/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

Nach der Komprimierung:

```typescript
import { ShoppingItem } from './shopping-item';
⋮----
/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
⋮----
// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

## Konfiguration

Sie können die Komprimierung in Ihrer Konfigurationsdatei aktivieren:

```json
{
  "output": {
    "compress": true
  }
}
```

## Anwendungsfälle

Die Code-Komprimierung ist besonders nützlich wenn:
- Code-Struktur und Architektur analysiert werden
- Token-Anzahl für LLM-Verarbeitung reduziert werden soll
- Hochrangige Dokumentation erstellt wird
- Code-Muster und Signaturen verstanden werden sollen
- API- und Schnittstellendesigns geteilt werden

## Verwandte Optionen

Sie können die Komprimierung mit anderen Optionen kombinieren:
- `--remove-comments`: Code-Kommentare entfernen (siehe [Kommentarentfernung](/de/guide/comment-removal))
- `--remove-empty-lines`: Leere Zeilen entfernen
- `--output-show-line-numbers`: Zeilennummern zur Ausgabe hinzufügen

## Verwandte Ressourcen

- [Kommentarentfernung](/de/guide/comment-removal) - Kommentare für weitere Token-Reduzierung entfernen
- [Konfiguration](/de/guide/configuration) - `output.compress` in der Konfigurationsdatei setzen
- [Befehlszeilenoptionen](/de/guide/command-line-options) - Vollständige CLI-Referenz
