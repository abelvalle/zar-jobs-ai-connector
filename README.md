# Zar Jobs AI Connector

Conector de empleo para asistentes de IA, empaquetado como plugin de Codex y basado en MCP.

> AI job connector for Codex and other MCP-compatible clients.

## Estado

Los hitos 0, 1, 2A, 3A y 4 están completos. InfoJobs dispone de búsqueda y detalle mediante su API oficial, Tecnoempleo puede leerse mediante el RSS personalizado de una alerta propia y LinkedIn admite importación manual sin conectarse al portal. Las pruebas en vivo dependen de configurar los accesos correspondientes. El conector no persiste consultas, ofertas ni credenciales.

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
| Tecnoempleo | RSS personalizado de una alerta propia | Configurar la URL del canal; el API general sigue sujeto a autorización escrita |
| LinkedIn | Importación manual de URL o alertas propias | Sin scraping; API directa solo con aprobación de LinkedIn |

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

El smoke test inicia el servidor MCP por `stdio`, conecta un cliente real, enumera las cuatro herramientas y ejecuta las capacidades que no requieren credenciales.

## Herramientas actuales

- `get_portal_capabilities`: devuelve el estado, dependencias y siguiente acción segura de InfoJobs, Tecnoempleo y LinkedIn.
- `normalize_job_url`: valida una URL HTTPS sin abrirla, elimina parámetros de seguimiento conocidos e identifica el portal.
- `search_infojobs_jobs`: busca ofertas mediante el endpoint oficial de InfoJobs, con paginación y un máximo de 50 resultados.
- `get_infojobs_job`: obtiene y normaliza el detalle público de una oferta de InfoJobs.
- `list_tecnoempleo_alert_jobs`: devuelve ofertas del RSS oficial de una alerta propia de Tecnoempleo.
- `import_linkedin_job`: normaliza una oferta de LinkedIn aportada por el usuario y la marca como no verificada.

Las dos herramientas de InfoJobs requieren `INFOJOBS_CLIENT_ID` y `INFOJOBS_CLIENT_SECRET` en el entorno del servidor. Consulta la [guía de configuración de InfoJobs](docs/INFOJOBS-SETUP.md); nunca compartas esos valores en un chat ni los confirmes en Git.

Tecnoempleo requiere `TECNOEMPLEO_RSS_URL`. Consulta la [guía de configuración de Tecnoempleo](docs/TECNOEMPLEO-SETUP.md); la URL puede ser privada y tampoco debe publicarse.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Tecnología](docs/TECHNOLOGY.md)
- [Roadmap e hitos](docs/ROADMAP.md)
- [Capacidades por portal](docs/PORTAL-CAPABILITIES.md)
- [Configuración de InfoJobs](docs/INFOJOBS-SETUP.md)
- [Configuración de Tecnoempleo](docs/TECNOEMPLEO-SETUP.md)
- [Uso seguro con LinkedIn](docs/LINKEDIN-USAGE.md)
- [Seguridad y privacidad](docs/SECURITY-PRIVACY.md)
- [Contribución y ramas](CONTRIBUTING.md)

## Ramas

- `develop`: desarrollo activo.
- `master`: último hito estable y verificado.

El repositorio se inicializa con la documentación en `master`; el desarrollo posterior parte de `develop` y solo se promociona a `master` tras superar sus comprobaciones.

La publicación actual es el código fuente público en GitHub. La aparición en el directorio universal de plugins de OpenAI corresponde al Hito 6 y requiere un MCP remoto, identidad verificada y revisión externa.

## Licencia

[MIT](LICENSE)
