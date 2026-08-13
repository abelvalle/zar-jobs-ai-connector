# Configuración de InfoJobs

Zar Jobs AI Connector usa exclusivamente la API oficial de InfoJobs para buscar ofertas públicas y consultar su detalle. No utiliza credenciales personales, cookies ni scraping.

## 1. Registrar la aplicación

1. Inicia sesión en el [programa de desarrolladores de InfoJobs](https://developer.infojobs.net/).
2. [Registra una aplicación](https://developer.infojobs.net/app/manage-app/create.xhtml) siguiendo la [guía de inicio rápido](https://developer.infojobs.net/documentation/quick-start/index.xhtml).
3. Conserva el `Client ID` y el `Client secret` fuera del repositorio.
4. Revisa las [condiciones de uso de la API](https://developer.infojobs.net/legal/legal/terms-of-use.xhtml) antes de publicar o alojar el conector.

El proyecto no necesita OAuth de candidato: las operaciones implementadas son públicas y de solo lectura, aunque InfoJobs exige autenticar cada llamada con las credenciales de la aplicación.

## 2. Configurar el entorno local

No pegues secretos en un chat ni los guardes en `.env`. Para una sesión temporal de PowerShell puedes usar el cuadro seguro de credenciales:

```powershell
$infoJobsCredential = Get-Credential -Message "InfoJobs application credentials"
$env:INFOJOBS_CLIENT_ID = $infoJobsCredential.UserName
$env:INFOJOBS_CLIENT_SECRET = $infoJobsCredential.GetNetworkCredential().Password
```

La configuración del plugin hereda esas dos variables del entorno de Codex o Claude Code. No se envían a ningún servicio intermedio.

## 3. Verificación en vivo

Con las variables configuradas:

```powershell
npm.cmd run smoke:infojobs
```

Opcionalmente, indica otra consulta:

```powershell
npm.cmd run smoke:infojobs -- "backend engineer"
```

El smoke test solicita como máximo una oferta y solo imprime estado y contadores; no registra credenciales ni contenido de la oferta.

Al terminar, elimina las variables de la sesión:

```powershell
Remove-Item Env:INFOJOBS_CLIENT_ID
Remove-Item Env:INFOJOBS_CLIENT_SECRET
Remove-Variable infoJobsCredential
```

## Herramientas habilitadas

- `search_infojobs_jobs`: consulta palabra clave, hasta diez provincias, orden y paginación; máximo 50 resultados por llamada.
- `get_infojobs_job`: obtiene el detalle público de una oferta por su identificador.

Ambas herramientas son de solo lectura, no persisten respuestas y conservan la fuente y el enlace original. Todo texto recibido del portal se considera contenido externo no confiable.
