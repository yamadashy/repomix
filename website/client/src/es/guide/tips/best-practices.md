---
title: "Mejores prácticas para el desarrollo asistido por IA: Desde mi experiencia"
description: "Consejos prácticos de desarrollo asistido por IA para usar código existente, implementación modular, pruebas, planificación y contexto compartido con Repomix."
---

# Mejores prácticas para el desarrollo asistido por IA: Desde mi experiencia

Aunque todavía no he completado con éxito un proyecto a gran escala utilizando IA, me gustaría compartir lo que he aprendido hasta ahora de mi experiencia trabajando con IA en el desarrollo.

## Enfoque de desarrollo básico

Cuando se trabaja con IA, intentar implementar todas las funciones a la vez puede llevar a problemas inesperados y al estancamiento del proyecto. Por eso es más efectivo comenzar con la funcionalidad principal y construir cada función una por una, asegurando una implementación sólida antes de seguir adelante.

### El poder del código existente

Este enfoque es efectivo porque implementar la funcionalidad principal te permite materializar tu diseño ideal y estilo de codificación a través de código real. La forma más efectiva de comunicar la visión de tu proyecto es a través de código que refleje tus estándares y preferencias.

Al comenzar con las funciones principales y asegurar que cada componente funcione correctamente antes de continuar, todo el proyecto mantiene la consistencia, lo que facilita que la IA genere código más apropiado.

## El enfoque modular

Dividir el código en módulos más pequeños es crucial. En mi experiencia, mantener los archivos alrededor de 250 líneas de código facilita dar instrucciones claras a la IA y hace que el proceso de prueba y error sea más eficiente. Si bien el recuento de tokens sería una métrica más precisa, el recuento de líneas es más práctico para los desarrolladores humanos, por lo que lo usamos como una guía.

Esta modularización no se trata solo de separar los componentes de frontend, backend y base de datos, sino de desglosar la funcionalidad a un nivel mucho más fino. Por ejemplo, dentro de una sola función, podrías separar la validación, el manejo de errores y otras funcionalidades específicas en módulos distintos. Por supuesto, la separación de alto nivel también es importante, e implementar este enfoque modular gradualmente ayuda a mantener instrucciones claras y permite que la IA genere código más apropiado. Este enfoque es efectivo no solo para la IA sino también para los desarrolladores humanos.

## Asegurar la calidad a través de las pruebas

Considero que las pruebas son cruciales en el desarrollo asistido por IA. Las pruebas no solo sirven como medidas de garantía de calidad, sino también como documentación que demuestra claramente las intenciones del código. Al pedirle a la IA que implemente nuevas funciones, el código de prueba existente actúa efectivamente como un documento de especificación.

Las pruebas también son una excelente herramienta para validar la corrección del código generado por IA. Por ejemplo, al hacer que la IA implemente una nueva funcionalidad para un módulo, escribir casos de prueba de antemano te permite evaluar objetivamente si el código generado se comporta como se espera. Esto se alinea bien con los principios de desarrollo basado en pruebas (TDD) y es particularmente efectivo cuando se colabora con la IA.

## Equilibrar la planificación y la implementación

Antes de implementar funciones a gran escala, recomiendo discutir primero el plan con la IA. Organizar los requisitos y considerar la arquitectura conduce a una implementación más fluida. Una buena práctica es compilar primero los requisitos y luego pasar a una sesión de chat separada para el trabajo de implementación.

Es esencial que un humano revise el resultado de la IA y haga los ajustes necesarios. Si bien la calidad del código generado por IA es generalmente moderada, aún acelera el desarrollo en comparación con escribir todo desde cero.

## Conclusión

Siguiendo estas prácticas, puedes aprovechar las fortalezas de la IA mientras construyes una base de código consistente y de alta calidad. Incluso a medida que tu proyecto crece en tamaño, cada componente permanece bien definido y manejable.
