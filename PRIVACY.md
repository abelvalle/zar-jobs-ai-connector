# Política de privacidad

Última actualización: 13 de agosto de 2026.

## Ejecución local

Zar Jobs AI Connector se ejecuta exclusivamente en el equipo del usuario como un proceso MCP local. No ofrece un servicio alojado, no crea cuentas, no recopila telemetría y no almacena consultas, ofertas, credenciales ni datos personales.

Cuando se invoca una herramienta de InfoJobs, el proceso envía directamente a `api.infojobs.net` las credenciales de aplicación y los parámetros necesarios. El conector no los escribe en archivos ni logs. El tratamiento de InfoJobs se rige por sus propias condiciones y política.

Cuando se consulta una alerta RSS de Tecnoempleo, el proceso solicita directamente la URL configurada por el usuario. No registra esa URL ni persiste las ofertas. `import_tecnoempleo_rss` procesa el XML aportado en memoria y lo descarta al responder.

Las importaciones de LinkedIn e Indeed procesan únicamente los campos aportados por el usuario, no contactan con esos portales y no conservan los datos.

La herramienta `get_connector_status` comprueba únicamente si las variables opcionales están presentes. Puede devolver el nombre de una variable ausente, pero nunca su valor.

Las herramientas de currículum reciben el CV y, opcionalmente, el texto de una oferta durante la llamada MCP. No guardan estos datos, no los envían a un servicio externo y no escriben archivos. El cliente de IA solo debe guardar un CV base o una variante cuando el usuario lo solicite y en una ubicación bajo su control.

## Credenciales

El plugin nunca solicita contraseñas, cookies o tokens de sesión de portales. Las variables opcionales permanecen bajo control del usuario y se heredan desde el entorno de Codex o Claude Code.

## Contacto

Usa las incidencias del repositorio para preguntas generales. Para informar de una vulnerabilidad, consulta [SECURITY.md](SECURITY.md) y evita publicar información sensible.
