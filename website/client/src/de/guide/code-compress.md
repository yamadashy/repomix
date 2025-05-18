# Code-Komprimierung

Die Code-Komprimierung ist eine leistungsstarke Funktion, die intelligent wesentliche Code-Strukturen extrahiert und gleichzeitig Implementierungsdetails entfernt. Diese Funktion nutzt [Tree-sitter](https://github.com/tree-sitter/tree-sitter), um eine intelligente Code-Extraktion durchzuführen, wobei der Fokus auf Funktions- und Klassensignaturen liegt und wichtige strukturelle Informationen erhalten bleiben. Dies ist besonders nützlich, um die Token-Anzahl zu reduzieren und gleichzeitig das architektonische Verständnis Ihres Codes zu bewahren.

> [!NOTE]  
> Dies ist eine experimentelle Funktion, die wir basierend auf Benutzerfeedback und realer Nutzung aktiv verbessern werden

## Grundlegende Verwendung

Aktivieren Sie die Code-Komprimierung mit dem Flag `--compress`:

```bash
repomix --compress
```

Sie können sie auch mit Remote-Repositories verwenden:

```bash
repomix --remote user/repo --compress
```

## Funktionsweise

Der Komprimierungsalgorithmus verarbeitet Code mithilfe von Tree-sitter-Parsing, um wesentliche strukturelle Elemente zu extrahieren und zu erhalten, während Implementierungsdetails entfernt werden.

Die Komprimierung bewahrt:
- Funktions- und Methodensignaturen (Parameter und Rückgabetypen)
- Schnittstellen- und Typdefinitionen (Eigenschaftstypen und Struktur)
- Klassenstrukturen und -eigenschaften (Vererbungsbeziehungen)
- Wichtige strukturelle Elemente (Importe, Exporte, Modulstruktur)

Während entfernt werden:
- Funktions- und Methodenimplementierungen
- Details zu Schleifen- und Bedingungslogik
- Interne Variablendeklarationen
- Implementierungsspezifischer Code

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

Die Code-Komprimierung ist besonders nützlich für:
- Analyse von Codestruktur und -architektur
- Reduzierung der Token-Anzahl für LLM-Verarbeitung
- Erstellung von High-Level-Dokumentation
- Verständnis von Code-Mustern und -Signaturen
- Teilen von API- und Schnittstellendesigns

## Verwandte Optionen

Sie können die Komprimierung mit anderen Optionen kombinieren:
- `--remove-comments`: Entfernt Code-Kommentare
- `--remove-empty-lines`: Entfernt Leerzeilen
- `--output-show-line-numbers`: Fügt Zeilennummern zur Ausgabe hinzu
