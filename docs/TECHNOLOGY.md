# Tecnología

## Stack seleccionado

| Área | Elección | Motivo |
| --- | --- | --- |
| Runtime | Node.js 22 o superior | `fetch` nativo, ecosistema MCP y despliegue sencillo |
| Lenguaje | JavaScript ESM con JSDoc | MVP pequeño, sin fase de compilación |
| MCP | `@modelcontextprotocol/sdk` | SDK oficial para herramientas y transportes MCP |
| Validación | `zod` | Esquemas explícitos compartidos con el SDK |
| XML | `fast-xml-parser` | Lectura acotada del RSS de Tecnoempleo sin implementar un parser casero |
| Pruebas | `node:test` | Incluido en Node.js, sin framework adicional |
| Calidad | `node --check` y pruebas | Controles mínimos, rápidos y reproducibles |
| Transporte local | `stdio` | Desarrollo y pruebas sin infraestructura |
| Transporte público | Streamable HTTP sobre HTTPS | Requisito operativo para un MCP remoto revisable |
| Automatización | GitHub Actions | Validación en `develop` y `master` |

La documentación oficial de OpenAI recomienda los SDK oficiales de TypeScript o Python y el transporte Streamable HTTP para servidores MCP. Este proyecto usa el SDK de TypeScript desde JavaScript ESM para mantener un MVP mínimo.

## Estructura prevista

```text
.codex-plugin/plugin.json
.mcp.json
skills/zar-jobs/SKILL.md
src/server.mjs
src/domain/job.mjs
src/portals/capabilities.mjs
src/portals/url-normalizer.mjs
test/*.test.mjs
docs/
```

## Dependencias aceptadas

Solo se incorporarán dependencias necesarias para el protocolo MCP o validación de esquemas. HTTP utilizará `fetch` nativo. No se añadirá un framework web hasta que el hito del servidor remoto lo necesite.

## Configuración de portales

Las credenciales se suministran mediante variables de entorno o, en un futuro hosting, mediante su gestor de secretos:

- `INFOJOBS_CLIENT_ID`
- `INFOJOBS_CLIENT_SECRET`
- `TECNOEMPLEO_RSS_URL`
- credenciales que Tecnoempleo defina al autorizar su API general, todavía no implementadas

Los usuarios nunca introducirán contraseñas de portales en el plugin.

## Compatibilidad

El plugin se diseña para Codex y para clientes compatibles con MCP. Las capacidades que dependan de una superficie concreta se declararán de forma explícita en lugar de asumir que están disponibles en todos los clientes.
