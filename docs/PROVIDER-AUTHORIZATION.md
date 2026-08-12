# Autorizaciones de proveedores

Estas solicitudes son ampliaciones opcionales. La versión pública segura funciona mediante importación aportada por el usuario y no afirma una integración oficial directa.

## Tecnoempleo

Canal oficial: [API, integraciones y partners](https://www.tecnoempleo.com/api-integraciones.php).

Plantilla:

> Asunto: Solicitud de acceso API para Zar Jobs AI Connector
>
> Somos los responsables del proyecto abierto Zar Jobs AI Connector: https://github.com/abelvalle/zar-jobs-ai-connector. El complemento es de solo lectura, no envía candidaturas, no almacena perfiles y conserva la atribución y el enlace original. Solicitamos confirmación escrita de si el feed XML/JSON general puede usarse en un MCP público para consultar ofertas, junto con esquema, autenticación, límites, condiciones de caché, atribución y entorno de pruebas. No activaremos el adaptador hasta recibir autorización expresa.

Evidencia que debe guardarse sin secretos: fecha, interlocutor, alcance autorizado, documentación de esquema, hosts, límites, atribución y expiración/revocación.

## LinkedIn

Fuentes oficiales: [Talent Solutions APIs](https://learn.microsoft.com/en-us/linkedin/talent/) y [crawling terms](https://www.linkedin.com/legal/crawling-terms).

Plantilla:

> Subject: Partner/API eligibility for Zar Jobs AI Connector
>
> We maintain the open-source Zar Jobs AI Connector: https://github.com/abelvalle/zar-jobs-ai-connector. It is read-only, never submits applications or messages, and currently imports only job data manually supplied by the user without contacting LinkedIn. Please confirm whether any approved Talent Solutions program permits general job discovery through a public MCP connector, and provide the applicable eligibility, scopes, rate limits, display requirements, review process, and written authorization. We will not enable automated access without approval.

No debe solicitarse ni reutilizarse una cookie de sesión. Una aprobación para publicar ofertas desde un ATS no debe interpretarse como permiso para buscar o extraer vacantes generales.

## Criterio de cierre

Un adaptador directo solo puede empezar cuando exista una autorización verificable que cubra exactamente el caso de uso, más esquema, credenciales de prueba, límites y obligaciones de visualización. Una respuesta comercial genérica o la mera existencia de documentación no basta.
