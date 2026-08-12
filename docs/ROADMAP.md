# Roadmap e hitos

Cada hito debe ser independiente, verificable y tener su propio commit. El trabajo se realiza en `develop`; solo un hito estable se promociona a `master`.

## Hito 0 — Fundación documental ✅

Objetivo: fijar alcance, arquitectura, tecnología, restricciones legales y flujo Git antes de implementar.

Criterios de aceptación:

- documentación enlazada desde el README;
- matriz de capacidades y fuentes oficiales;
- política explícita de no scraping y no autoaplicación;
- ramas `master` y `develop` definidas.

## Hito 1 — Plugin y MCP local mínimo ✅

Objetivo: disponer de un plugin instalable localmente y un servidor MCP funcional sin credenciales.

Criterios de aceptación:

- manifiesto validado por `plugin-creator`;
- skill validada;
- servidor MCP por `stdio`;
- herramientas `get_portal_capabilities` y `normalize_job_url`;
- pruebas unitarias y smoke test en verde;
- cero llamadas externas y cero persistencia.

Evidencia local:

- validación oficial de `plugin-creator` superada;
- skill validada;
- 8 pruebas unitarias superadas;
- smoke test MCP cliente-servidor superado;
- auditoría de dependencias sin vulnerabilidades conocidas.

## Hito 2A — Adaptador oficial de InfoJobs ✅

Objetivo: implementar búsqueda y detalle de ofertas públicas sin almacenar datos ni exponer secretos.

Criterios de aceptación:

- herramientas MCP `search_infojobs_jobs` y `get_infojobs_job`;
- autenticación Basic de aplicación solo mediante variables de entorno;
- límites, errores, paginación y normalización cubiertos con fixtures;
- smoke MCP sin credenciales en verde;
- ninguna inscripción automática.

Evidencia local:

- 15 pruebas unitarias superadas;
- búsqueda, detalle, autenticación, límite y error sanitizado cubiertos;
- smoke MCP cliente-servidor superado;
- auditoría de dependencias sin vulnerabilidades conocidas.

## Hito 2B — Verificación en vivo de InfoJobs

Dependencia externa: registrar la aplicación y obtener credenciales válidas.

Criterios de aceptación:

- `npm run smoke:infojobs` responde correctamente contra el endpoint oficial;
- la prueba no registra secretos ni contenido de ofertas;
- evidencia de ejecución documentada sin credenciales ni datos personales;
- compatibilidad de búsqueda y detalle confirmada con respuestas actuales de producción.

## Hito 3 — Feed autorizado de Tecnoempleo

Dependencia externa: autorización escrita para el uso del feed XML/JSON en un plugin público.

Criterios de aceptación:

- acceso restringido al host y formato autorizados;
- parser con fixtures anonimizadas;
- prueba de cambios de esquema y fallos parciales;
- atribución y enlaces conservados.

## Hito 4 — LinkedIn seguro

Objetivo: aportar valor sin automatizar ni extraer datos de LinkedIn sin permiso.

Criterios de aceptación:

- importación manual de enlaces compartidos por el usuario;
- opción documentada para alertas propias recibidas por email;
- rechazo explícito de búsquedas automatizadas o scraping;
- cualquier API nueva requiere aprobación verificable de LinkedIn.

## Hito 5 — MCP remoto y OAuth

Objetivo: permitir instalación pública sin ejecutar un proceso local.

Criterios de aceptación:

- endpoint público HTTPS con Streamable HTTP;
- OAuth de mínimo privilegio;
- tokens cifrados, rotación y revocación;
- política de retención y eliminación operativa;
- observabilidad sin PII ni secretos;
- revisión de seguridad completada.

## Hito 6 — Publicación en el directorio de plugins

Dependencias externas: identidad de desarrollador verificada y permisos de publicación en OpenAI Platform.

Criterios de aceptación:

- privacidad, términos, soporte y metadatos públicos definitivos;
- casos de prueba y países disponibles declarados;
- revisión de OpenAI aprobada;
- versión etiquetada y notas de publicación.

## Fuera de alcance

- aplicar masivamente a ofertas;
- pulsar `Submit`, `Send` o equivalentes;
- scraping o evasión de controles de acceso;
- vender o reutilizar datos personales;
- replicar un portal de empleo completo.
