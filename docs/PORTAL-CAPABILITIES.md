# Capacidades por portal

Estado revisado el 13 de agosto de 2026. Antes de implementar un adaptador se volverán a verificar las fuentes y condiciones vigentes.

## Matriz

| Portal | Búsqueda | Estado de candidaturas | Envío | Decisión del proyecto |
| --- | --- | --- | --- | --- |
| InfoJobs | Implementada mediante API oficial; requiere credenciales de aplicación | API con OAuth del candidato | La API lo permite, pero Zar Jobs AI Connector no lo automatizará | Búsqueda y detalle disponibles; verificación en vivo pendiente |
| Tecnoempleo | RSS propio implementado por URL configurada o contenido aportado a la herramienta local | No implementado | No implementado | Limitar el proyecto al RSS propio; no solicitar el API general |
| LinkedIn | Sin API pública general identificada; importación manual implementada | APIs Talent restringidas a partners | Integraciones restringidas | URL y datos aportados por el usuario; nunca scraping |
| Indeed | Sin API pública general de búsqueda identificada; importación manual implementada | Integraciones documentadas para partners/ATS | Integraciones restringidas | URL y datos aportados por el usuario; nunca scraping |

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

- Alertas personalizadas y RSS: https://www.tecnoempleo.com/buscar-trabajo/encuentra-ofertas-empleo.php

La ayuda para candidatos indica que cada alerta configurada ofrece un canal RSS personalizado. El plugin puede leer ese canal cuando el propio usuario configura su URL, o procesar localmente el XML que aporte, sin iniciar sesión ni automatizar el buscador.

El alcance definitivo es el RSS personalizado que el usuario controla. El proyecto no solicitará ni implementará un feed general.

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

## Indeed

Fuentes oficiales:

- Partner Docs: https://docs.indeed.com/
- Condiciones de uso: https://www.indeed.com/legal

Las APIs documentadas por Indeed se orientan a integraciones autorizadas, especialmente empleadores y sistemas ATS. El proyecto no interpreta ese acceso como una API pública general de búsqueda. Por ello:

- acepta únicamente una URL `viewjob` y los campos que aporta el usuario;
- conserva la clave `jk` y elimina parámetros adicionales;
- marca la importación como `user-provided` y `unverified`;
- no inicia sesión, navega, busca, extrae ni aplica automáticamente en Indeed.

## Importación universal

`review_job_import` permite pegar texto procedente de cualquier portal, página corporativa, correo o documento. El cliente prepara un borrador y el MCP contrasta título, empresa, ubicación, modalidad, contrato, salario, fecha y descripción con el texto aportado. Las coincidencias se clasifican como `exact`, `partial` o `unmatched`, pero todas conservan `confirmed: false` y `verificationStatus: unverified`.

La URL es opcional, debe usar HTTPS y no puede incluir credenciales. Se normaliza sin abrirla. `fingerprint_jobs` genera huellas SHA-256 mediante, por orden, identificador externo, URL normalizada o identidad empresa/puesto/ubicación. Solo agrupa claves exactas; no usa similitud difusa ni decide que dos ofertas parecidas sean la misma.

Ambas herramientas funcionan en memoria, sin red, scraping, cuenta ni persistencia.

## Regla de cierre

Si la evidencia de una oferta o candidatura no identifica claramente el portal, la empresa, el puesto o el estado, el plugin devolverá `unverified` y pedirá revisión humana. Nunca inferirá un avance o rechazo a partir de una alerta genérica.
