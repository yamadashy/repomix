# Compressione Codice

La compressione del codice è una funzionalità potente che estrae intelligentemente le strutture di codice essenziali mentre rimuove i dettagli di implementazione. È particolarmente utile per ridurre il conteggio dei token mantenendo le informazioni strutturali importanti della tua codebase.

> [!NOTE]
> Questa è una funzionalità sperimentale che miglioreremo attivamente in base ai feedback degli utenti e all'uso reale

## Utilizzo Base

Abilita la compressione del codice usando l'opzione `--compress`:

```bash
repomix --compress
```

Puoi anche usarla con repository remoti:

```bash
repomix --remote user/repo --compress
```

## Come Funziona

L'algoritmo di compressione elabora il codice usando l'analisi tree-sitter per estrarre e preservare gli elementi strutturali essenziali mentre rimuove i dettagli di implementazione.

La compressione preserva:
- Firme di funzioni e metodi
- Definizioni di interfacce e tipi
- Strutture di classi e le loro proprietà
- Elementi strutturali importanti

Mentre rimuove:
- Implementazioni di funzioni e metodi
- Dettagli di logica di cicli e condizioni
- Dichiarazioni di variabili interne
- Codice specifico dell'implementazione

### Esempio

Codice TypeScript originale:

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

Dopo la compressione:

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

## Configurazione

Puoi abilitare la compressione nel tuo file di configurazione:

```json
{
  "output": {
    "compress": true
  }
}
```

## Casi d'Uso

La compressione del codice è particolarmente utile per:
- Analizzare la struttura e l'architettura del codice
- Ridurre il conteggio dei token per l'elaborazione da parte degli LLM
- Creare documentazione di alto livello
- Comprendere pattern di codice e firme
- Condividere design di API e interfacce

## Opzioni Correlate

Puoi combinare la compressione con altre opzioni:
- `--remove-comments`: Rimuove i commenti dal codice
- `--remove-empty-lines`: Rimuove le righe vuote
- `--output-show-line-numbers`: Aggiunge numeri di riga all'output
