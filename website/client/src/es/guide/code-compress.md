# Compresión de Código

La compresión de código es una función poderosa que extrae de manera inteligente las estructuras esenciales del código mientras elimina los detalles de implementación. Esto es particularmente útil para reducir el conteo de tokens mientras se mantiene la información estructural importante de tu base de código.

> [!NOTE]
> Esta es una función experimental que mejoraremos activamente según los comentarios de los usuarios y el uso en el mundo real.

## Uso Básico

Habilita la compresión de código usando la bandera `--compress`:

```bash
repomix --compress
```

También puedes usarlo con repositorios remotos:

```bash
repomix --remote user/repo --compress
```

## Cómo Funciona

El algoritmo de compresión procesa el código utilizando el análisis de Tree-sitter para extraer y preservar elementos estructurales esenciales mientras elimina los detalles de implementación.

La compresión preserva:
- Firmas de funciones y métodos
- Definiciones de interfaces y tipos
- Estructuras de clases y propiedades
- Elementos estructurales importantes

Mientras elimina:
- Implementaciones de funciones y métodos
- Detalles de lógica de bucles y condicionales
- Declaraciones de variables internas
- Código específico de implementación

### Ejemplo

Código TypeScript original:

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

Después de la compresión:

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

## Configuración

Puedes habilitar la compresión en tu archivo de configuración:

```json
{
  "output": {
    "compress": true
  }
}
```

## Casos de Uso

La compresión de código es particularmente útil cuando:
- Analizas la estructura y arquitectura del código
- Reduces el conteo de tokens para procesamiento con LLM
- Creas documentación de alto nivel
- Comprendes patrones y firmas de código
- Compartes diseños de API e interfaces

## Opciones Relacionadas

Puedes combinar la compresión con otras opciones:
- `--remove-comments`: Eliminar comentarios del código (ver [Eliminación de comentarios](/es/guide/comment-removal))
- `--remove-empty-lines`: Eliminar líneas vacías
- `--output-show-line-numbers`: Agregar números de línea a la salida

## Recursos relacionados

- [Eliminación de comentarios](/es/guide/comment-removal) - Eliminar comentarios para reducir aún más los tokens
- [Configuración](/es/guide/configuration) - Establecer `output.compress` en el archivo de configuración
- [Opciones de línea de comandos](/es/guide/command-line-options) - Referencia completa de CLI
