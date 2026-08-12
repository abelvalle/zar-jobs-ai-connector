# Política de privacidad

Última actualización: 12 de agosto de 2026.

## Versión actual

Zar Jobs AI Connector dispone de ejecución local y de un servidor remoto desplegable, pero todavía no declara un endpoint oficial alojado. Ninguna modalidad crea cuentas, recopila telemetría o almacena consultas, ofertas, credenciales ni datos personales.

Cuando el usuario invoca una herramienta de InfoJobs, el proceso local envía directamente a `api.infojobs.net` las credenciales de aplicación y los parámetros necesarios para esa consulta. El conector no los escribe en archivos ni logs. El tratamiento realizado por InfoJobs se rige por sus propias condiciones y política de privacidad.

Cuando se consulta una alerta RSS de Tecnoempleo, el proceso local solicita directamente la URL personalizada configurada por el usuario. El conector no registra esa URL ni persiste las ofertas recibidas.

En el servidor remoto, la URL personalizada no se configura ni se solicita. La herramienta `import_tecnoempleo_rss` recibe el XML que el usuario aporta voluntariamente, lo procesa en memoria y lo descarta al devolver la respuesta. La importación de LinkedIn funciona del mismo modo con los campos aportados por el usuario y no contacta con LinkedIn.

## Servicio alojado e integraciones futuras

Antes de activar un endpoint oficial o una integración OAuth con datos de cuenta, el operador deberá completar y publicar:

- responsable y contacto;
- datos tratados y finalidad;
- base legal y proveedores;
- ubicación, cifrado y plazo de conservación;
- proceso de acceso, revocación y eliminación.

El plugin nunca solicitará la contraseña de un portal de empleo. Las credenciales de autorización se limitarán a los permisos necesarios.

## Contacto

Usa las incidencias del repositorio para preguntas generales. Para informar de una vulnerabilidad, consulta [SECURITY.md](SECURITY.md) y evita publicar información sensible.
