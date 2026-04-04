# Seguridad

## Función de verificación de seguridad

Repomix utiliza [Secretlint](https://github.com/secretlint/secretlint) para detectar información sensible en tus archivos:
- Claves de API
- Tokens de acceso
- Credenciales
- Claves privadas
- Variables de entorno

## Configuración

Las verificaciones de seguridad están habilitadas de forma predeterminada.

Deshabilitar a través de CLI:
```bash
repomix --no-security-check
```

O en `repomix.config.json`:
```json
{
  "security": {
    "enableSecurityCheck": false
  }
}
```

## Medidas de seguridad

1. **Manejo de archivos binarios**: Los contenidos de archivos binarios se excluyen de la salida, pero sus rutas se listan en la estructura de directorios para una vista completa del repositorio
2. **Compatible con Git**: Respeta los patrones de `.gitignore`
3. **Detección automatizada**: Busca problemas de seguridad comunes:
    - Credenciales de AWS
    - Cadenas de conexión de bases de datos
    - Tokens de autenticación
    - Claves privadas

## Cuando la verificación de seguridad encuentra problemas

Ejemplo de salida:
```bash
🔍 Verificación de seguridad:
──────────────────
2 archivo(s) sospechoso(s) detectado(s) y excluido(s):
1. config/credentials.json
  - Se encontró la clave de acceso de AWS
2. .env.local
  - Se encontró la contraseña de la base de datos
```

## Mejores prácticas

1. Siempre revisa la salida antes de compartirla
2. Usa `.repomixignore` para rutas sensibles
3. Mantén las verificaciones de seguridad habilitadas
4. Elimina los archivos sensibles del repositorio

## Reportar problemas de seguridad

¿Encontraste una vulnerabilidad de seguridad? Por favor:
1. No abras un issue público
2. Envía un correo electrónico a: koukun0120@gmail.com
3. O usa [GitHub Security Advisories](https://github.com/yamadashy/repomix/security/advisories/new)

## Recursos relacionados

- [Configuración](/es/guide/configuration) - Configurar verificaciones de seguridad mediante `security.enableSecurityCheck`
- [Opciones de línea de comandos](/es/guide/command-line-options) - Usar la flag `--no-security-check`
- [Política de privacidad](/es/guide/privacy) - Conocer el manejo de datos de Repomix
