---
layout: home
title: Repomix
titleTemplate: Empaqueta tu código en formatos amigables para la IA
aside: false
editLink: false

features:
  - icon: 🤖
    title: Optimizado para IA
    details: Formatea tu código de una manera que sea fácil de entender y procesar para la IA.

  - icon: ⚙️
    title: Compatible con Git
    details: Respeta automáticamente tus archivos .gitignore.

  - icon: 🛡️
    title: Enfocado en la seguridad
    details: Incorpora Secretlint para realizar robustas comprobaciones de seguridad que detectan y previenen la inclusión de información sensible.

  - icon: 📊
    title: Conteo de tokens
    details: Proporciona recuentos de tokens para cada archivo y para todo el repositorio, útil para los límites de contexto de los LLM.

---

<script setup>
import YouTubeVideo from '../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../utils/videos'
</script>

<div class="cli-section">

<br>
<!--@include: ../shared/sponsors-section.md-->

## 🏆 Nominación a los Open Source Awards

¡Estamos honrados! Repomix ha sido nominado en la categoría **Powered by AI** en los [JSNation Open Source Awards 2025](https://osawards.com/javascript/).

¡Esto no habría sido posible sin todos ustedes que usan y apoyan Repomix. ¡Gracias!

## ¿Qué es Repomix?

Repomix es una herramienta poderosa que empaqueta toda tu base de código en un solo archivo compatible con IA. Ya sea que estés trabajando en revisiones de código, refactoring o necesites asistencia de IA para tu proyecto, Repomix facilita compartir todo el contexto de tu repositorio con herramientas de IA.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

## Inicio rápido

Una vez que hayas generado un archivo empaquetado (`repomix-output.xml`) usando Repomix, puedes enviarlo a un asistente de IA (como ChatGPT, Claude) con un prompt como:

```
Este archivo contiene todos los archivos del repositorio combinados en uno.
Quiero refactorizar el código, así que por favor revísalo primero.
```

La IA analizará todo tu código y proporcionará información completa:

![Repomix File Usage 1](/images/docs/repomix-file-usage-1.png)

Al discutir cambios específicos, la IA puede ayudar a generar código. Con funciones como los Artefactos de Claude, incluso puedes recibir múltiples archivos interdependientes:

![Repomix File Usage 2](/images/docs/repomix-file-usage-2.png)

¡Feliz programación! 🚀

## ¿Por qué Repomix?

Repomix se puede usar con cualquier servicio de suscripción como ChatGPT, Claude, Gemini o Grok sin preocuparte por costos adicionales. Al proporcionar el contexto completo de tu código, elimina la necesidad de explorar archivos uno por uno, haciendo el análisis más rápido y preciso.

Con todo el código disponible como contexto, Repomix permite una amplia variedad de usos: planificación de implementaciones, investigación de bugs, auditorías de seguridad de bibliotecas de terceros, generación de documentación y mucho más.

## Usando la herramienta CLI {#using-the-cli-tool}

Repomix puede usarse como una herramienta de línea de comandos, ofreciendo potentes funciones y opciones de personalización.

**La herramienta CLI puede acceder a repositorios privados** ya que utiliza tu Git instalado localmente.

### Inicio rápido

Puedes probar Repomix instantáneamente en el directorio de tu proyecto sin necesidad de instalación:

```bash
npx repomix@latest
```

O instalarlo globalmente para uso repetido:

```bash
# Instalar usando npm
npm install -g repomix

# O con yarn
yarn global add repomix

# O con bun
bun add -g repomix

# O con Homebrew (macOS/Linux)
brew install repomix

# Luego ejecutar en cualquier directorio de proyecto
repomix
```

¡Eso es todo! Repomix generará un archivo `repomix-output.xml` en tu directorio actual, que contendrá todo tu repositorio en un formato amigable para la IA.



### Uso

Para empaquetar todo tu repositorio:

```bash
repomix
```

Para empaquetar un directorio específico:

```bash
repomix ruta/al/directorio
```

Para empaquetar archivos o directorios específicos usando [patrones glob](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#pattern-syntax):

```bash
repomix --include "src/**/*.ts,**/*.md"
```

Para excluir archivos o directorios específicos:

```bash
repomix --ignore "**/*.log,tmp/"
```

Para empaquetar un repositorio remoto:
```bash
# Usando formato abreviado
npx repomix --remote yamadashy/repomix

# Usando URL completa (soporta ramas y rutas específicas)
npx repomix --remote https://github.com/yamadashy/repomix
npx repomix --remote https://github.com/yamadashy/repomix/tree/main

# Usando URL del commit
npx repomix --remote https://github.com/yamadashy/repomix/commit/836abcd7335137228ad77feb28655d85712680f1
```

Para inicializar un nuevo archivo de configuración (`repomix.config.json`):

```bash
repomix --init
```

Una vez que hayas generado el archivo empaquetado, puedes usarlo con herramientas de IA generativa como Claude, ChatGPT y Gemini.

#### Uso de Docker

También puedes ejecutar Repomix usando Docker 🐳  
Esto es útil si deseas ejecutar Repomix en un entorno aislado o prefieres usar contenedores.

Uso básico (directorio actual):

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

Para empaquetar un directorio específico:
```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix ruta/al/directorio
```

Procesar un repositorio remoto y generar la salida en un directorio `output`:

```bash
docker run -v ./output:/app -it --rm ghcr.io/yamadashy/repomix --remote https://github.com/yamadashy/repomix
```

### Formatos de salida

Elige tu formato de salida preferido:

```bash
# Formato XML (predeterminado)
repomix --style xml

# Formato Markdown
repomix --style markdown

# Formato JSON
repomix --style json

# Formato de texto plano
repomix --style plain
```

### Personalización

Crea un archivo `repomix.config.json` para configuraciones persistentes:

```json
{
  "output": {
    "style": "markdown",
    "filePath": "custom-output.md",
    "removeComments": true,
    "showLineNumbers": true,
    "topFilesLength": 10
  },
  "ignore": {
    "customPatterns": ["*.test.ts", "docs/**"]
  }
}
```

## Casos de Uso del Mundo Real

### [Flujo de Trabajo de Generación de Código con LLM](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/)

Un desarrollador comparte cómo usa Repomix para extraer contexto de código de bases de código existentes, y luego aprovecha ese contexto con LLMs como Claude y Aider para mejoras incrementales, revisiones de código y generación automatizada de documentación.

### [Creación de Paquetes de Conocimiento para LLMs](https://lethain.com/competitive-advantage-author-llms/)

Los autores están usando Repomix para empaquetar su contenido escrito—blogs, documentación y libros—en formatos compatibles con LLM, permitiendo a los lectores interactuar con su experiencia a través de sistemas de preguntas y respuestas impulsados por IA.

[Descubrir más casos de uso →](./guide/use-cases)

## Guía para Usuarios Avanzados

Repomix ofrece características poderosas para casos de uso avanzados. Aquí tienes algunas guías esenciales para usuarios avanzados:

- **[Servidor MCP](./guide/mcp-server)** - Integración del Protocolo de Contexto de Modelo para asistentes de IA
- **[GitHub Actions](./guide/github-actions)** - Automatiza el empaquetado de código base en flujos de trabajo CI/CD
- **[Compresión de Código](./guide/code-compress)** - Compresión inteligente basada en Tree-sitter (~70% de reducción de tokens)
- **[Usar como Biblioteca](./guide/development/using-repomix-as-a-library)** - Integra Repomix en tus aplicaciones Node.js
- **[Instrucciones Personalizadas](./guide/custom-instructions)** - Añade prompts e instrucciones personalizadas a las salidas
- **[Características de Seguridad](./guide/security)** - Integración incorporada de Secretlint y verificaciones de seguridad
- **[Mejores Prácticas](./guide/tips/best-practices)** - Optimiza tus flujos de trabajo de IA con estrategias probadas

### Más ejemplos
::: tip ¿Necesitas más ayuda? 💡
Consulta nuestra [guía](./guide/) para instrucciones detalladas, o visita nuestro [repositorio de GitHub](https://github.com/yamadashy/repomix) para más ejemplos y código fuente.
:::

</div>
