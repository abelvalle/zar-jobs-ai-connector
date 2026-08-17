# Roadmap e hitos

Cada hito es independiente, verificable y tiene su propio commit. El trabajo se realiza en `develop`; solo un hito estable pasa a `master`.

## Hito 0 — Fundación documental ✅

Alcance, arquitectura, tecnología, reglas de seguridad y ramas definidos antes de implementar.

## Hito 1 — MCP local mínimo ✅

Plugin de Codex, transporte `stdio`, capacidades básicas, pruebas y smoke test real.

## Hito 2A — InfoJobs oficial ✅

Búsqueda y detalle mediante la API oficial, con credenciales de aplicación solo en el entorno, límites y errores sanitizados.

## Hito 2B — Verificación en vivo de InfoJobs

Dependencia del usuario: registrar su aplicación de InfoJobs y ejecutar `npm run smoke:infojobs` con credenciales válidas. No bloquea la instalación ni las demás capacidades.

## Hito 3A — Tecnoempleo mediante RSS propio ✅

Lectura de una alerta RSS creada por el usuario e importación manual de su XML, sin solicitar un API general ni automatizar el buscador.

## Hito 3B — Verificación en vivo de Tecnoempleo

Dependencia del usuario: configurar la URL de una alerta propia y ejecutar `npm run smoke:tecnoempleo`. No bloquea la importación de XML.

## Hito 4 — LinkedIn seguro ✅

Importación manual de URL y datos aportados por el usuario, siempre `unverified`, sin navegación, scraping ni credenciales.

## Hito 4B — Indeed seguro ✅

Importación manual de una URL `viewjob` y sus datos visibles, sin llamadas a Indeed, persistencia ni candidaturas.

## Hito 5 — Distribución local multiplataforma ✅

Objetivo: instalar el mismo conector desde GitHub en Codex y Claude Code sin alojar un servicio.

Criterios de aceptación:

- marketplace y manifiesto válidos para Codex;
- marketplace y manifiesto válidos para Claude Code;
- MCP común por `stdio` con release fijada y smoke del binario portable;
- instalación documentada desde `owner/repo`;
- sin HTTP, Docker, dominio, puertos ni base de datos;
- pruebas, validadores, smoke y auditoría en verde.

## Hito 6 — Diagnóstico local seguro ✅

Objetivo: explicar qué capacidades están listas después de instalar el plugin sin revelar configuración sensible.

Criterios de aceptación:

- herramienta `get_connector_status` disponible por MCP;
- estados diferenciados para InfoJobs, Tecnoempleo, LinkedIn e Indeed;
- detección de configuración vacía, parcial y completa;
- respuesta limitada a nombres de variables ausentes, nunca a sus valores;
- alternativas manuales conservadas cuando falta configuración de red;
- pruebas unitarias y smoke portable en verde.

## Hito 7 — CV base y variantes ATS ✅

Objetivo: crear y adaptar currículums locales con un formato estándar, controles reproducibles y protección frente a afirmaciones inventadas.

Criterios de aceptación:

- JSON Resume como contrato reutilizado y portable;
- validación local de estructura e identidad mínima;
- comparación orientativa entre CV y oferta sin añadir palabras automáticamente;
- auditoría de variantes frente al CV base;
- render HTML escapado, imprimible y de una sola columna;
- comprobación ATS offline con aviso explícito de que no garantiza resultados externos;
- sin persistencia, cuenta, servidor, navegador o proveedor de IA obligatorio;
- pruebas unitarias, smoke local y smoke portable en verde.

## Hito 8 — Exportación PDF portable ✅

Objetivo: generar desde el mismo JSON Resume validado un PDF equivalente al HTML ATS, sin introducir un servidor ni una descarga de navegador.

Criterios de aceptación:

- generación local en Node.js con PDFKit y sin Chromium, Python ni binarios nativos;
- PDF A4 multipágina con texto seleccionable y extraíble;
- resultado como recurso MCP en memoria, sin elegir rutas ni escribir archivos;
- nombre sugerido opcional, limitado a un archivo `.pdf` sin ruta;
- límites de 200 KB de entrada, 10 páginas y 2 MB de salida;
- prueba real de extracción de nombre, empresa y habilidades mediante PDF.js;
- smoke local y portable en verde.

## Releases

Cada versión estable alinea `develop` y `master`, actualiza ambos manifiestos y fija la misma etiqueta en `.mcp.json`.

## Fuera de alcance

- servidor MCP remoto o servicio web;
- directorio universal que exija un endpoint público;
- aplicar masivamente o pulsar `Submit`, `Send` o equivalentes;
- scraping o evasión de controles de acceso;
- vender o reutilizar datos personales;
- replicar un portal de empleo completo.
