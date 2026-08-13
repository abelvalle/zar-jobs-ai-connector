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

## Hito 3A — Alertas RSS propias de Tecnoempleo ✅

Objetivo: consultar ofertas reales desde el canal RSS oficial de una alerta creada por el usuario.

Criterios de aceptación:

- herramienta MCP `list_tecnoempleo_alert_jobs`;
- URL leída exclusivamente desde el entorno y restringida a HTTPS en `tecnoempleo.com`;
- parser RSS con entidades deshabilitadas, límite de 2 MB y máximo de 50 resultados;
- enlaces externos o elementos inválidos omitidos y contabilizados;
- sin credenciales personales, scraping, persistencia ni inscripción.

## Hito 4 — LinkedIn seguro ✅

Objetivo: aportar valor sin automatizar ni extraer datos de LinkedIn sin permiso.

Criterios de aceptación:

- importación manual de enlaces compartidos por el usuario;
- campos mínimos de título y empresa exigidos para evitar importaciones ambiguas;
- resultado marcado como `user-provided` y `unverified`;
- rechazo explícito de búsquedas automatizadas o scraping;
- cualquier API nueva requiere aprobación verificable de LinkedIn.

## Hito 4B — Indeed seguro ✅

Objetivo: incorporar Indeed sin automatizar el portal ni depender de credenciales o autorizaciones.

Criterios de aceptación:

- reconocimiento de URLs `viewjob` bajo `indeed.com` y extracción de la clave `jk`;
- importación manual con título y empresa obligatorios;
- resultado marcado como `user-provided` y `unverified`;
- disponibilidad idéntica en MCP local y remoto;
- cero llamadas de red, scraping, persistencia o candidaturas.

## Hito 5A — MCP remoto anónimo y sin estado ✅

Objetivo: permitir conexión remota sin ejecutar un proceso local y sin custodiar datos privados de usuarios.

Criterios de aceptación:

- Streamable HTTP sin estado en `/mcp` y health check mínimo en `/health`;
- servidor ligado a loopback por defecto y `ALLOWED_HOSTS` obligatorio al publicar;
- límite de petición de 3 MB, errores sanitizados y cero logs de contenidos;
- `import_tecnoempleo_rss`, `import_linkedin_job` e `import_indeed_job` sin red ni persistencia;
- la herramienta de URL RSS privada queda excluida del servidor remoto;
- imagen Docker reproducible y pruebas de cliente MCP reales.

## Hito 5B — OAuth y datos privados por usuario

Solo será necesario si el servicio remoto guarda URLs RSS, tokens o accede a datos de cuenta. No forma parte de la versión pública anónima.

Dependencias externas: proveedor de identidad, dominio, hosting y decisión formal sobre almacenamiento.

Criterios de aceptación:

- OAuth 2.1 compatible con MCP y mínimo privilegio;
- tokens cifrados, rotación y revocación;
- retención y eliminación operativa probadas;
- revisión de seguridad completada.

## Hito 6 — Publicación en el directorio de plugins

Dependencias externas: identidad de desarrollador verificada y permisos de publicación en OpenAI Platform.

Criterios de aceptación:

- privacidad, términos, soporte y metadatos públicos definitivos;
- casos de prueba y países disponibles declarados;
- revisión de OpenAI aprobada;
- versión etiquetada y notas de publicación.

## Hito 6A — Paquete de revisión pública ✅

- instrucciones de despliegue y endurecimiento;
- cinco pruebas positivas y tres negativas documentadas;
- privacidad, términos, soporte y alcance enlazados;
- solicitudes externas y bloqueos trazables sin afirmar autorizaciones inexistentes.

## Hito 6B — Despliegue, revisión y publicación

Dependencias externas no presentes en el repositorio: dominio HTTPS, cuenta de hosting, identidad de desarrollador verificada y aprobación de OpenAI. El código no puede sustituir esas decisiones ni simular su resultado.

## Fuera de alcance

- aplicar masivamente a ofertas;
- pulsar `Submit`, `Send` o equivalentes;
- scraping o evasión de controles de acceso;
- vender o reutilizar datos personales;
- replicar un portal de empleo completo.
