# Primeros pasos con Repomix

<script setup>
import HomeBadges from '../../../components/HomeBadges.vue'
import YouTubeVideo from '../../../components/YouTubeVideo.vue'
import { VIDEO_IDS } from '../../../utils/videos'
</script>

Repomix es una herramienta que empaqueta todo tu repositorio en un solo archivo amigable para la IA. Está diseñado para ayudarte a alimentar tu código a modelos de lenguaje grandes (LLMs) como ChatGPT, Claude, Gemini, Grok, DeepSeek, Perplexity, Gemma, Llama y más.

<YouTubeVideo :videoId="VIDEO_IDS.REPOMIX_DEMO" />

<HomeBadges />

<br>
<!--@include: ../../shared/sponsors-section.md-->

## Inicio rápido

Ejecuta este comando en el directorio de tu proyecto:

```bash
npx repomix@latest
```

¡Eso es todo! Encontrarás un archivo `repomix-output.xml` que contiene todo tu repositorio en un formato amigable para la IA.

Luego puedes enviar este archivo a un asistente de IA con un prompt como:

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

Repomix se puede usar con cualquier servicio de suscripción como ChatGPT, Claude, Gemini o Grok sin preocuparte por costos adicionales. Al proporcionar el contexto completo de tu código, Repomix elimina la necesidad de explorar archivos uno por uno, haciendo el análisis más rápido y preciso.

Con todo el código disponible como contexto, Repomix permite una amplia variedad de usos: planificación de implementaciones, investigación de bugs, auditorías de seguridad de bibliotecas de terceros, generación de documentación y mucho más.

## Características principales

- **Salida optimizada para IA**: Formatea tu código para un fácil procesamiento por parte de la IA
- **Conteo de tokens**: Realiza un seguimiento del uso de tokens para los límites de contexto de los LLM
- **Compatible con Git**: Respeta tus archivos `.gitignore` y `.git/info/exclude`
- **Enfocado en la seguridad**: Detecta información sensible
- **Múltiples formatos de salida**: Elige entre texto plano, XML o Markdown

## ¿Qué sigue?

- [Guía de instalación](installation.md): Diferentes formas de instalar Repomix
- [Guía de uso](usage.md): Aprende sobre las funciones básicas y avanzadas
- [Configuración](configuration.md): Personaliza Repomix para tus necesidades
- [Funciones de seguridad](security.md): Aprende sobre las comprobaciones de seguridad
- [Formatos de salida](output.md): Elige el mejor formato para tu modelo de IA
- [Servidor MCP](mcp-server.md): Integra Repomix directamente con asistentes de IA

## Comunidad

Únete a nuestra [comunidad de Discord](https://discord.gg/wNYzTwZFku) para:
- Obtener ayuda con Repomix
- Compartir tus experiencias
- Sugerir nuevas funciones
- Conectarte con otros usuarios

## Soporte

¿Encontraste un error o necesitas ayuda?
- [Abre un issue en GitHub](https://github.com/yamadashy/repomix/issues)
- Únete a nuestro servidor de Discord
- Consulta la [documentación](https://repomix.com)
