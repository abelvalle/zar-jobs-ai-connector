# Zar Jobs AI Connector

Conector de empleo para asistentes de IA, empaquetado como plugin de Codex y basado en MCP.

> AI job connector for Codex and other MCP-compatible clients.

## Estado

El proyecto está en fase inicial. La documentación define primero el alcance, las restricciones por portal y los hitos verificables. El primer MVP será local, de solo lectura y sin credenciales.

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

## Licencia

[MIT](LICENSE)
