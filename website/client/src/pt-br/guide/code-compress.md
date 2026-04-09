# Compressão de Código

A compressão de código é um recurso poderoso que extrai estruturas essenciais do código de forma inteligente enquanto remove detalhes de implementação. Isso é particularmente útil para reduzir a contagem de tokens enquanto mantém informações estruturais importantes sobre sua base de código.

> [!NOTE]
> Este é um recurso experimental que estaremos melhorando ativamente com base no feedback dos usuários e no uso no mundo real.

## Uso Básico

Ative a compressão de código usando a flag `--compress`:

```bash
repomix --compress
```

Você também pode usá-la com repositórios remotos:

```bash
repomix --remote user/repo --compress
```

## Como Funciona

O algoritmo de compressão processa o código usando análise Tree-sitter para extrair e preservar elementos estruturais essenciais enquanto remove detalhes de implementação.

A compressão preserva:
- Assinaturas de funções e métodos
- Definições de interfaces e tipos
- Estruturas de classes e propriedades
- Elementos estruturais importantes

Enquanto remove:
- Implementações de funções e métodos
- Detalhes de lógica de loops e condicionais
- Declarações de variáveis internas
- Código específico de implementação

### Exemplo

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

Após a compressão:

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

## Configuração

Você pode ativar a compressão em seu arquivo de configuração:

```json
{
  "output": {
    "compress": true
  }
}
```

## Casos de Uso

A compressão de código é particularmente útil quando:
- Analisando estrutura e arquitetura do código
- Reduzindo contagem de tokens para processamento LLM
- Criando documentação de alto nível
- Compreendendo padrões e assinaturas de código
- Compartilhando designs de API e interface

## Opções Relacionadas

Você pode combinar a compressão com outras opções:
- `--remove-comments`: Remover comentários do código (ver [Remoção de Comentários](/pt-br/guide/comment-removal))
- `--remove-empty-lines`: Remover linhas vazias
- `--output-show-line-numbers`: Adicionar números de linha à saída

## Recursos relacionados

- [Remoção de Comentários](/pt-br/guide/comment-removal) - Remover comentários para reduzir ainda mais os tokens
- [Configuração](/pt-br/guide/configuration) - Definir `output.compress` no arquivo de configuração
- [Opções de Linha de Comando](/pt-br/guide/command-line-options) - Referência completa da CLI