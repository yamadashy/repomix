# Remoção de Comentários

O Repomix pode remover automaticamente os comentários do seu código ao gerar o arquivo de saída. Isso pode ajudar a reduzir o ruído e focar no código real.

## Uso

Para habilitar a remoção de comentários, defina a opção `removeComments` como `true` no seu `repomix.config.json`:

```json
{
  "output": {
    "removeComments": true
  }
}
```

## Linguagens Suportadas

O Repomix suporta a remoção de comentários para uma ampla gama de linguagens de programação, incluindo:

- JavaScript/TypeScript (`//`, `/* */`)
- Python (`#`, `"""`, `'''`)
- Java (`//`, `/* */`)
- C/C++ (`//`, `/* */`)
- HTML (`<!-- -->`)
- CSS (`/* */`)
- E muitas outras...

## Exemplo

Dado o seguinte código JavaScript:

```javascript
// Este é um comentário de linha única
function test() {
  /* Este é um
     comentário de várias linhas */
  return true;
}
```

Com a remoção de comentários habilitada, a saída será:

```javascript
function test() {
  return true;
}
```

## Notas

- A remoção de comentários é realizada antes de outras etapas de processamento, como a adição de números de linha.
- Alguns comentários, como os comentários JSDoc, podem ser preservados dependendo da linguagem e do contexto.

## Recursos relacionados

- [Compressão de Código](/pt-br/guide/code-compress) - Reduzir ainda mais a contagem de tokens extraindo a estrutura do código
- [Configuração](/pt-br/guide/configuration) - Definir `output.removeComments` no arquivo de configuração
- [Opções de Linha de Comando](/pt-br/guide/command-line-options) - Usar a flag `--remove-comments`
