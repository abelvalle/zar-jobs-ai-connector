# Zar Jobs AI Connector

Conector de empleo para asistentes de IA, empaquetado como plugin de Codex y basado en MCP.

> AI job connector for Codex and other MCP-compatible clients.

## Estado

Los hitos 0, 1, 2A, 3A, 4, 4B, 5A y 6A están completos. InfoJobs dispone de búsqueda y detalle local mediante su API oficial, Tecnoempleo admite exclusivamente RSS propio por URL local o XML aportado al MCP remoto, y LinkedIn e Indeed admiten importación manual sin conectarse a sus portales. El servidor público es anónimo, sin estado y no persiste consultas, ofertas ni credenciales. El despliegue HTTPS y la revisión del directorio requieren cuentas y decisiones externas.

## Objetivo

Zar Jobs AI Connector permitirá que un asistente de IA:

- conozca qué capacidades están disponibles en cada portal;
- normalice enlaces de ofertas aportados por el usuario;
- busque ofertas mediante APIs oficiales cuando exista autorización;
- prepare comparaciones y siguientes pasos sin enviar candidaturas;
- mantenga siempre a la persona como responsable de la decisión final.

## Portales previstos

| Portal | Primera integración | Condición |
| --- | --- | --- |
| InfoJobs | Búsqueda oficial de ofertas | Registrar una aplicación y respetar sus condiciones de API |
| Tecnoempleo | RSS personalizado de una alerta propia | Configurar la URL o aportar el XML; no se solicitará acceso API general |
| LinkedIn | Importación manual de URL o alertas propias | Sin scraping; API directa solo con aprobación de LinkedIn |
| Indeed | Importación manual de URL y datos visibles | Sin llamadas a Indeed, scraping ni credenciales |

La matriz completa y sus fuentes están en [docs/PORTAL-CAPABILITIES.md](docs/PORTAL-CAPABILITIES.md).

## Principios

- APIs oficiales o acceso expresamente autorizado.
- Solo lectura por defecto.
- Nunca enviar una candidatura automáticamente.
- Credenciales fuera del repositorio.
- Datos mínimos, trazabilidad de la fuente y resultados verificables.
- Funcionar sin depender de una instalación de `career-ops`.

## Inicio rápido para desarrollo

Requisitos: Node.js 22 o superior.

```powershell
git clone https://github.com/abelvalle/zar-jobs-ai-connector.git
Set-Location zar-jobs-ai-connector
npm.cmd install
npm.cmd run check
npm.cmd test
npm.cmd run smoke
```

El smoke test inicia el servidor MCP por `stdio`, conecta un cliente real y ejecuta las capacidades que no requieren credenciales. Las pruebas incluyen además un cliente real conectado al transporte Streamable HTTP.

## Herramientas actuales

- `get_portal_capabilities`: devuelve el estado, dependencias y siguiente acción segura de InfoJobs, Tecnoempleo, LinkedIn e Indeed.
- `normalize_job_url`: valida una URL HTTPS sin abrirla, elimina parámetros de seguimiento conocidos e identifica el portal.
- `search_infojobs_jobs`: busca ofertas mediante el endpoint oficial de InfoJobs, con paginación y un máximo de 50 resultados.
- `get_infojobs_job`: obtiene y normaliza el detalle público de una oferta de InfoJobs.
- `list_tecnoempleo_alert_jobs`: devuelve ofertas del RSS oficial de una alerta propia de Tecnoempleo.
- `import_tecnoempleo_rss`: procesa en memoria el XML de una alerta propia aportado por el usuario, sin hacer una llamada de red.
- `import_linkedin_job`: normaliza una oferta de LinkedIn aportada por el usuario y la marca como no verificada.
- `import_indeed_job`: normaliza una oferta de Indeed aportada por el usuario y la marca como no verificada.

Las dos herramientas de InfoJobs requieren `INFOJOBS_CLIENT_ID` y `INFOJOBS_CLIENT_SECRET` en el entorno del servidor. Consulta la [guía de configuración de InfoJobs](docs/INFOJOBS-SETUP.md); nunca compartas esos valores en un chat ni los confirmes en Git.

La lectura local de Tecnoempleo requiere `TECNOEMPLEO_RSS_URL`. Consulta la [guía de configuración de Tecnoempleo](docs/TECNOEMPLEO-SETUP.md); la URL puede ser privada y tampoco debe publicarse. El MCP remoto utiliza contenido RSS aportado en la llamada y no necesita esa variable.

## MCP remoto

`npm.cmd run start:http` sirve `/mcp` mediante Streamable HTTP y `/health` para monitorización. Su superficie pública incluye capacidades, normalización e importaciones seguras de Tecnoempleo, LinkedIn e Indeed; excluye las herramientas que dependen de secretos locales.

Consulta [despliegue remoto](docs/REMOTE-MCP.md), [evaluaciones](docs/PUBLICATION-EVALS.md) y [checklist de publicación](docs/PUBLICATION-CHECKLIST.md).

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Tecnología](docs/TECHNOLOGY.md)
- [Roadmap e hitos](docs/ROADMAP.md)
- [Capacidades por portal](docs/PORTAL-CAPABILITIES.md)
- [Configuración de InfoJobs](docs/INFOJOBS-SETUP.md)
- [Configuración de Tecnoempleo](docs/TECNOEMPLEO-SETUP.md)
- [Uso seguro con LinkedIn](docs/LINKEDIN-USAGE.md)
- [Uso seguro con Indeed](docs/INDEED-USAGE.md)
- [Seguridad y privacidad](docs/SECURITY-PRIVACY.md)
- [MCP remoto](docs/REMOTE-MCP.md)
- [Checklist de publicación](docs/PUBLICATION-CHECKLIST.md)
- [Autorizaciones de proveedores](docs/PROVIDER-AUTHORIZATION.md)
- [Soporte](SUPPORT.md)
- [Contribución y ramas](CONTRIBUTING.md)

## Ramas

- `develop`: desarrollo activo.
- `master`: último hito estable y verificado.

El repositorio se inicializa con la documentación en `master`; el desarrollo posterior parte de `develop` y solo se promociona a `master` tras superar sus comprobaciones.

La publicación actual es el código fuente público y el servidor remoto reproducible. La aparición en el directorio universal de plugins de OpenAI corresponde al Hito 6B y requiere un endpoint HTTPS estable, identidad verificada y revisión externa.

## Licencia

[MIT](LICENSE)
