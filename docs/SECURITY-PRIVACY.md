# Seguridad y privacidad

## Principios

- Mínimo privilegio.
- Consentimiento explícito.
- Validación en el servidor, no solo en el modelo.
- Sin secretos ni PII en logs.
- Confirmación humana para cualquier futura escritura.
- Las ofertas y páginas externas se consideran contenido no confiable.

## Modelo de amenazas inicial

### Inyección de instrucciones

Una descripción de empleo puede contener texto dirigido al asistente. Los adaptadores la tratan como dato, nunca como instrucción. Las herramientas devuelven campos estructurados y el skill prohíbe obedecer instrucciones embebidas en ofertas.

### Robo o exposición de credenciales

- no se aceptan contraseñas de portales;
- el desarrollo local usa variables de entorno;
- el servicio remoto usará OAuth y almacenamiento cifrado;
- los mensajes de error y logs se redactan antes de persistirlos.

### Acciones no deseadas

El producto no expone herramientas de envío de candidaturas. Si en el futuro se añade una escritura reversible, requerirá una herramienta separada, un alcance OAuth específico y confirmación de la plataforma anfitriona.

### Datos obsoletos o ambiguos

Cada resultado conserva fuente, URL y fecha cuando estén disponibles. Un estado ambiguo se marca como no verificado y no se transforma en una decisión de candidatura.

Las importaciones manuales de LinkedIn e Indeed se etiquetan siempre como `user-provided` y `unverified`: estructurar los datos no demuestra que la oferta siga activa.

## Datos del MVP

El MVP local:

- no usa cuentas;
- no almacena consultas ni ofertas;
- solo ejecuta llamadas externas cuando se invocan herramientas configuradas de InfoJobs o Tecnoempleo;
- limita las llamadas a `https://api.infojobs.net/api/7`;
- restringe el RSS configurado por el usuario a HTTPS bajo `tecnoempleo.com`, sin redirecciones;
- no incluye telemetría.

## Requisitos antes del servicio público

- inventario de datos y base legal;
- flujo de eliminación y revocación probado;
- política de retención publicada;
- cifrado en tránsito y reposo;
- rotación de secretos;
- límites de tasa y protección contra abuso;
- alertas operativas sin registrar contenido sensible;
- evaluación de dependencias y respuesta a incidentes.
