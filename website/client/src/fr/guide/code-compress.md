# Compression de code

La compression de code est une fonctionnalité puissante qui extrait intelligemment les structures de code essentielles tout en supprimant les détails d'implémentation. C'est particulièrement utile pour réduire le nombre de tokens tout en conservant les informations structurelles importantes de votre base de code.

> [!NOTE]  
> Il s'agit d'une fonctionnalité expérimentale que nous améliorerons activement en fonction des retours utilisateurs et de l'usage réel

## Utilisation de base

Activez la compression de code en utilisant l'option `--compress`:

```bash
repomix --compress
```

Vous pouvez également l'utiliser avec des dépôts distants:

```bash
repomix --remote user/repo --compress
```

## Fonctionnement

L'algorithme de compression traite le code en utilisant l'analyse tree-sitter pour extraire et préserver les éléments structurels essentiels tout en supprimant les détails d'implémentation.

La compression préserve:
- Les signatures de fonctions et de méthodes
- Les définitions d'interfaces et de types
- Les structures de classes et leurs propriétés
- Les éléments structurels importants

Tout en supprimant:
- Les implémentations de fonctions et de méthodes
- Les détails de logique des boucles et conditions
- Les déclarations de variables internes
- Le code spécifique à l'implémentation

### Exemple

Code TypeScript original:

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

Après compression:

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

## Configuration

Vous pouvez activer la compression dans votre fichier de configuration:

```json
{
  "output": {
    "compress": true
  }
}
```

## Cas d'utilisation

La compression de code est particulièrement utile pour:
- Analyser la structure et l'architecture du code
- Réduire le nombre de tokens pour le traitement par les LLM
- Créer une documentation de haut niveau
- Comprendre les motifs de code et les signatures
- Partager les conceptions d'API et d'interfaces

## Options associées

Vous pouvez combiner la compression avec d'autres options:
- `--remove-comments`: Supprimer les commentaires du code (voir [Suppression des commentaires](/fr/guide/comment-removal))
- `--remove-empty-lines`: Supprimer les lignes vides
- `--output-show-line-numbers`: Ajouter les numéros de ligne à la sortie

## Ressources associées

- [Suppression des commentaires](/fr/guide/comment-removal) - Supprimer les commentaires pour réduire davantage les tokens
- [Configuration](/fr/guide/configuration) - Définir `output.compress` dans le fichier de configuration
- [Options de ligne de commande](/fr/guide/command-line-options) - Référence complète de la CLI
