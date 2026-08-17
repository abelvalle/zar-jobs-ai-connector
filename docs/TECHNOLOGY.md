# Tecnología

## Stack

| Área | Elección | Motivo |
| --- | --- | --- |
| Runtime | Node.js 22 o superior | `fetch` nativo y ejecución multiplataforma |
| Lenguaje | JavaScript ESM con JSDoc | Sin compilación ni toolchain adicional |
| MCP | `@modelcontextprotocol/sdk` | Implementación estándar de herramientas y `stdio` |
| Validación | `zod` | Esquemas explícitos de entrada y salida |
| XML | `fast-xml-parser` | Lectura acotada del RSS sin parser propio |
| Pruebas | `node:test` | Incluido en Node.js |
| Distribución | Marketplaces Git + `npx` | Instalación desde GitHub sin servicio alojado |
| Automatización | GitHub Actions | Validación en `develop` y `master` |

## Estructura

```text
.agents/plugins/marketplace.json
.codex-plugin/plugin.json
.claude-plugin/plugin.json
.claude-plugin/marketplace.json
.mcp.json
skills/zar-jobs/SKILL.md
src/cli.mjs
src/connector-status.mjs
src/server.mjs
src/portals/*.mjs
test/*.test.mjs
docs/
```

## Dependencias y arranque

La instalación del plugin no necesita copiar `node_modules` al marketplace. `npx` obtiene la etiqueta fijada en `.mcp.json`, instala sus dependencias en la caché local y ejecuta el binario declarado por el paquete.

El desarrollo desde un clon usa `npm ci`. No hay framework web, contenedor ni transporte de red para MCP.

## Configuración

Las capacidades manuales funcionan sin credenciales. Las integraciones opcionales leen estas variables del entorno:

- `INFOJOBS_CLIENT_ID`;
- `INFOJOBS_CLIENT_SECRET`;
- `TECNOEMPLEO_RSS_URL`.

Los usuarios nunca introducirán contraseñas de portales en el plugin.

`get_connector_status` comprueba solo si estas variables contienen un valor no vacío. Su respuesta puede incluir el nombre de una variable ausente, pero nunca su contenido.
