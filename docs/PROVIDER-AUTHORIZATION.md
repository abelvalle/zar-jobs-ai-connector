# Autorizaciones de proveedores

Estas solicitudes son ampliaciones opcionales. La versión pública segura funciona mediante importación aportada por el usuario y no afirma una integración oficial directa.

## LinkedIn

Fuentes oficiales: [Talent Solutions APIs](https://learn.microsoft.com/en-us/linkedin/talent/) y [crawling terms](https://www.linkedin.com/legal/crawling-terms).

Plantilla:

> Subject: Partner/API eligibility for Zar Jobs AI Connector
>
> We maintain the open-source Zar Jobs AI Connector: https://github.com/abelvalle/zar-jobs-ai-connector. It is read-only, never submits applications or messages, and currently imports only job data manually supplied by the user without contacting LinkedIn. Please confirm whether any approved Talent Solutions program permits general job discovery through a public MCP connector, and provide the applicable eligibility, scopes, rate limits, display requirements, review process, and written authorization. We will not enable automated access without approval.

No debe solicitarse ni reutilizarse una cookie de sesión. Una aprobación para publicar ofertas desde un ATS no debe interpretarse como permiso para buscar o extraer vacantes generales.

## Criterio de cierre

Un adaptador directo solo puede empezar cuando exista una autorización verificable que cubra exactamente el caso de uso, más esquema, credenciales de prueba, límites y obligaciones de visualización. Una respuesta comercial genérica o la mera existencia de documentación no basta.
