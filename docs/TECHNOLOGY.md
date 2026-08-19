# Tecnología

## Stack

| Área | Elección | Motivo |
| --- | --- | --- |
| Runtime | Node.js 22 o superior | `fetch` nativo y ejecución multiplataforma |
| Lenguaje | JavaScript ESM con JSDoc | Sin compilación ni toolchain adicional |
| MCP | `@modelcontextprotocol/sdk` | Implementación estándar de herramientas y `stdio` |
| UX MCP | Prompts y recursos estándar | Flujos y límites descubribles sin API propietaria ni red |
| Validación | `zod` | Esquemas explícitos de entrada y salida |
| XML | `fast-xml-parser` | Lectura acotada del RSS sin parser propio |
| CV estructurado | `@jsonresume/schema` | Estándar abierto y validación portable del CV |
| Validación ATS | `@jsonresume/ats-validator` | Controles HTML deterministas y offline |
| PDF | `pdfkit` | PDF multipágina con texto real, sin navegador ni binarios nativos |
| DOCX | `docx` | OOXML editable con texto real, sin Word, servidor ni binarios nativos |
| ZIP | `jszip` | Paquete de candidatura comprimido y verificable completamente en memoria |
| Pruebas | `node:test` | Incluido en Node.js |
| Distribución | Marketplaces Git + `npx` | Instalación desde GitHub sin servicio alojado |
| Automatización | GitHub Actions | Validación en Linux, Windows y macOS para `develop` y `master` |

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
src/mcp/*.mjs
src/workspace/*.mjs
src/applications/*.mjs
src/portals/*.mjs
src/resumes/*.mjs
test/*.test.mjs
templates/resume.example.json
docs/
```

## Dependencias y arranque

La instalación del plugin no necesita copiar `node_modules` al marketplace. `npx` obtiene la etiqueta fijada en `.mcp.json`, instala sus dependencias en la caché local y ejecuta el binario declarado por el paquete.

Las dependencias de ejecución usan versiones exactas en `package.json`, no rangos. Esto evita que una etiqueta ya publicada cambie de comportamiento porque npm resuelva una versión compatible posterior.

El desarrollo desde un clon usa `npm ci`. No hay framework web, contenedor ni transporte de red para MCP.

Los prompts y recursos se registran con primitivas estándar del SDK MCP y se sirven desde constantes incluidas en el paquete. No contienen datos del usuario ni realizan llamadas externas.

## Configuración

Las capacidades manuales funcionan sin credenciales. Las integraciones opcionales leen estas variables del entorno:

- `INFOJOBS_CLIENT_ID`;
- `INFOJOBS_CLIENT_SECRET`;
- `TECNOEMPLEO_RSS_URL`.

Los usuarios nunca introducirán contraseñas de portales en el plugin.

`get_connector_status` comprueba solo si estas variables contienen un valor no vacío. Su respuesta puede incluir el nombre de una variable ausente, pero nunca su contenido.

Las herramientas de currículum no necesitan variables, cuentas ni servicios externos. `render_resume_pdf`, `render_resume_docx`, `render_application_bundle` y `render_portable_workspace` usan PDFKit, docx y JSZip en el mismo proceso y devuelven recursos MCP en memoria. PDF.js y Mammoth se usan únicamente como dependencias de desarrollo para demostrar en las pruebas que el texto puede extraerse; los usuarios no los instalan con el paquete publicado. No se añade Playwright, Chromium, Python ni servidor.

Las etiquetas multilingües son datos locales del repositorio y no llaman a un servicio de traducción. El mapeo Europass sigue siendo un contrato propio de revisión; enlaza la documentación oficial vigente, pero no implementa login, API de cuenta, ELM ni credenciales digitales.

La comparación de condiciones usa coincidencia literal y aritmética JavaScript determinista. No añade una fuente de tipos de cambio, motor fiscal, base legal ni modelo de extracción.

La anonimización es una transformación local por rutas. El correo reservado `candidate@example.invalid` mantiene válido el JSON Resume y se excluye de HTML, PDF y DOCX. PDFKit, docx y JSZip reutilizan el mismo pipeline de documentos; no se añade dependencia.

La analítica del tracker usa contadores, cocientes y una mediana deterministas sobre fechas ISO explícitas. No añade motor estadístico, aprendizaje automático, telemetría ni almacén de eventos: los segmentos pequeños se marcan y ninguna asociación se presenta como causa, predicción o recomendación.

La revisión recruiter reutiliza la validación, el banco de evidencias y la coincidencia literal existentes. La puntuación se calcula con aritmética JavaScript sobre presencia, longitudes, rutas, fechas y métricas visibles; no añade un modelo, servicio de IA, dataset de selección ni atributos demográficos. El prompt del cliente aporta la explicación cualitativa y debe conservar la misma frontera no predictiva.

El coach de evidencia usa reglas locales reproducibles para detectar señales de acción, escala y resultado. La auditoría compara métricas literales y conserva términos nuevos para revisión; no usa un modelo embebido ni certifica la verdad del texto.

Skills Radar normaliza texto y cuenta coincidencias literales sobre un catálogo local ampliable por el usuario. Reutiliza el banco SHA-256 del CV para enlazar evidencia; no incorpora scraping, telemetría, modelos, estadísticas inferenciales ni un dataset externo del mercado.
