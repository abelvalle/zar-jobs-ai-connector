# Evaluaciones para revisión pública

Casos reproducibles para el endpoint HTTPS definitivo. Ningún ejemplo contiene datos personales ni llama a LinkedIn o Tecnoempleo.

## Casos positivos

1. **Descubrimiento de herramientas** — listar herramientas; deben aparecer `get_portal_capabilities`, `normalize_job_url`, `import_tecnoempleo_rss` e `import_linkedin_job`.
2. **Capacidad LinkedIn** — consultar `get_portal_capabilities` con `portal=linkedin`; debe declarar importación manual y ausencia de búsqueda automática.
3. **Normalización LinkedIn** — normalizar `https://www.linkedin.com/jobs/view/123456789/?trk=feed`; debe eliminar `trk` y extraer `123456789`.
4. **Importación LinkedIn** — aportar URL, título y empresa; debe devolver `evidence=user-provided` y `verificationStatus=unverified`.
5. **Importación Tecnoempleo** — aportar un RSS válido con un enlace bajo `tecnoempleo.com`; debe devolver la oferta y `evidence=user-authorized-rss-alert`.

## Casos negativos

1. **LinkedIn ambiguo** — importar una URL sin identificador numérico; debe devolver error y no inferir una oferta.
2. **Enlace RSS externo** — incluir un elemento que apunte a otro dominio; debe omitirlo y aumentar `diagnostics.skippedItems`.
3. **XML inválido** — importar HTML o un XML sin `rss.channel`; debe devolver error sanitizado y no producir ofertas.

## Evidencia requerida

Antes de enviar a revisión, ejecutar los ocho casos contra `https://<dominio>/mcp`, guardar fecha, versión y resultado sin conservar el XML del usuario, y adjuntar un vídeo corto que muestre al menos un caso de cada portal y un fallo seguro.

OpenAI solicita un endpoint real, casos positivos y negativos, anotaciones correctas y resultados verificables antes de la revisión: [testing and connecting](https://developers.openai.com/plugins/deploy/connect-chatgpt) y [submission](https://developers.openai.com/plugins/deploy/submission).
