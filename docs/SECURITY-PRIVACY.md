# Seguridad y privacidad

## Principios

- Mínimo privilegio y solo lectura.
- Consentimiento explícito para datos aportados por el usuario.
- Validación en código, no solo en el modelo.
- Sin secretos ni datos personales en logs.
- Ofertas y páginas externas tratadas como contenido no confiable.

## Superficie local

El conector se ejecuta como subproceso del cliente MCP mediante `stdio`. No abre puertos, no expone endpoints y no acepta conexiones entrantes.

No utiliza base de datos, cuentas ni telemetría. Las consultas y resultados no se escriben en disco. La caché de npm contiene código y dependencias del release, no datos de empleo.

Los CV contienen datos personales. Las herramientas procesan el CV, sus variantes y el PDF generado en memoria y no escriben archivos; Codex, Claude u otro cliente solo debe guardarlos en una ruta elegida por el usuario. Nunca deben guardarse dentro de la caché o del repositorio público del plugin.

Los nombres PDF aceptan solo un nombre simple terminado en `.pdf`, nunca una ruta. La exportación se limita a 200 KB de entrada, 10 páginas y 2 MB de salida.

## Credenciales

- No se aceptan contraseñas, cookies ni tokens de sesión de portales.
- InfoJobs usa credenciales de aplicación desde variables de entorno.
- Tecnoempleo usa, opcionalmente, la URL de una alerta propia desde el entorno.
- Los errores nunca incluyen secretos ni URLs RSS privadas.
- El diagnóstico devuelve únicamente nombres de variables ausentes; nunca lee sus valores en la respuesta.
- Las variantes señalan empresas, puestos, estudios, certificados, proyectos, habilidades, idiomas, cifras o identidad no respaldados por el CV base.
- El contenido de una oferta nunca es una fuente de hechos personales.

## Acciones

El plugin no ofrece herramientas para enviar candidaturas, mensajes o cambios de perfil. Las importaciones manuales de LinkedIn e Indeed se etiquetan `user-provided` y `unverified`.

## Cadena de suministro

`.mcp.json` fija una etiqueta de release de GitHub. Las actualizaciones requieren una nueva versión explícita; no se ejecuta silenciosamente la punta cambiante de una rama.

Antes de instalar, el usuario debe revisar el repositorio y sus releases. Las vulnerabilidades se comunican mediante el canal privado descrito en [SECURITY.md](../SECURITY.md).
