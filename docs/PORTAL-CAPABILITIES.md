# Capacidades por portal

Estado revisado el 12 de agosto de 2026. Antes de implementar un adaptador se volverán a verificar las fuentes y condiciones vigentes.

## Matriz

| Portal | Búsqueda | Estado de candidaturas | Envío | Decisión del proyecto |
| --- | --- | --- | --- | --- |
| InfoJobs | Implementada mediante API oficial; requiere credenciales de aplicación | API con OAuth del candidato | La API lo permite, pero Zar Jobs AI Connector no lo automatizará | Búsqueda y detalle disponibles; verificación en vivo pendiente |
| Tecnoempleo | RSS propio implementado; API XML/JSON general bajo solicitud | Integraciones empresariales según acuerdo | No definido para este caso | Usar alertas RSS propias; esperar autorización para el API general |
| LinkedIn | Sin API pública general identificada; importación manual implementada | APIs Talent restringidas a partners | Integraciones restringidas | URL y datos aportados por el usuario; nunca scraping |

## InfoJobs

Fuentes oficiales:

- API y operaciones: https://developer.infojobs.net/documentation/operation-list/index.xhtml
- Inicio rápido y registro de aplicación: https://developer.infojobs.net/documentation/quick-start/index.xhtml
- OAuth de usuario: https://developer.infojobs.net/documentation/user-oauth2/index.xhtml
- Condiciones de uso: https://developer.infojobs.net/legal/legal/terms-of-use.xhtml

Restricciones incorporadas al diseño:

- registrar una aplicación y autenticar cada llamada;
- pedir consentimiento para cualquier dato privado;
- no solicitar usuario ni contraseña;
- no almacenar datos de candidatos salvo lo estrictamente permitido;
- no crear un portal que sustituya a InfoJobs;
- no inscribir a una persona sin permiso explícito.

Implementación actual:

- `GET https://api.infojobs.net/api/7/offer` para búsqueda paginada;
- `GET https://api.infojobs.net/api/7/offer/{offerId}` para detalle;
- máximo local de 50 resultados por llamada y diez provincias;
- autenticación de aplicación desde variables de entorno;
- sin OAuth de candidato, persistencia ni operaciones de inscripción.

## Tecnoempleo

Fuente oficial:

- API, integraciones y partners: https://www.tecnoempleo.com/api-integraciones.php

La ayuda para candidatos indica que cada alerta configurada ofrece un canal RSS personalizado. El plugin puede leer ese canal cuando el propio usuario configura su URL, sin iniciar sesión ni automatizar el buscador.

La página de integraciones también anuncia un feed XML/JSON general y solicita contacto para proporcionar acceso. La autorización para mostrar ofertas en una web no se asumirá como autorización automática para distribuirlas mediante un plugin público. Esa variante queda bloqueada hasta obtener confirmación escrita del uso previsto, credenciales, esquema, límites y requisitos de atribución.

## LinkedIn

Fuentes oficiales:

- Talent Solutions: https://learn.microsoft.com/en-us/linkedin/talent/
- Job Posting API: https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview
- Condiciones de LinkedIn Jobs: https://www.linkedin.com/legal/jobs-terms-conditions
- Condiciones de crawling: https://www.linkedin.com/legal/crawling-terms

Las APIs de empleo documentadas están orientadas a partners autorizados. LinkedIn prohíbe medios automatizados de scraping o extracción salvo autorización escrita. Por ello el plugin:

- acepta enlaces que el usuario aporte voluntariamente;
- estructura título, empresa y otros datos que el usuario aporte;
- marca cada importación como no verificada hasta revisar la ficha original;
- no inicia sesión, navega, busca ni aplica automáticamente en LinkedIn;
- no simula una integración oficial.

## Regla de cierre

Si la evidencia de una oferta o candidatura no identifica claramente el portal, la empresa, el puesto o el estado, el plugin devolverá `unverified` y pedirá revisión humana. Nunca inferirá un avance o rechazo a partir de una alerta genérica.
