# Zar Jobs AI Connector

Conector de empleo para asistentes de IA, empaquetado como plugin de Codex y basado en MCP.

> AI job connector for Codex and other MCP-compatible clients.

## Estado

Los hitos 0 y 1 están implementados: documentación fundacional, plugin de Codex, skill y servidor MCP local de solo lectura. El MVP no utiliza credenciales, red ni persistencia.

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
| Tecnoempleo | Feed XML/JSON oficial | Obtener autorización escrita y credenciales |
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

El smoke test inicia el servidor MCP por `stdio`, conecta un cliente real, enumera las herramientas y ejecuta ambas capacidades del MVP.

## Herramientas actuales

- `get_portal_capabilities`: devuelve el estado, dependencias y siguiente acción segura de InfoJobs, Tecnoempleo y LinkedIn.
- `normalize_job_url`: valida una URL HTTPS sin abrirla, elimina parámetros de seguimiento conocidos e identifica el portal.

Las búsquedas reales llegarán únicamente después de obtener las autorizaciones documentadas.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Tecnología](docs/TECHNOLOGY.md)
- [Roadmap e hitos](docs/ROADMAP.md)
- [Capacidades por portal](docs/PORTAL-CAPABILITIES.md)
- [Seguridad y privacidad](docs/SECURITY-PRIVACY.md)
- [Contribución y ramas](CONTRIBUTING.md)

## Ramas

- `develop`: desarrollo activo.
- `master`: último hito estable y verificado.

El repositorio se inicializa con la documentación en `master`; el desarrollo posterior parte de `develop` y solo se promociona a `master` tras superar sus comprobaciones.

La publicación actual es el código fuente público en GitHub. La aparición en el directorio universal de plugins de OpenAI corresponde al Hito 6 y requiere un MCP remoto, identidad verificada y revisión externa.

## Licencia

[MIT](LICENSE)
