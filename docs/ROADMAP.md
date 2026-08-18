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

## Hito 9 — Planificador de variantes con evidencia ✅

Objetivo: convertir la comparación con una oferta en un plan explicable sin redactar ni añadir hechos automáticamente.

Criterios de aceptación:

- priorización de resumen, experiencia, proyectos, habilidades, formación, certificados e idiomas existentes;
- cada evidencia conserva su ruta dentro del JSON Resume base;
- términos respaldados y no respaldados aparecen por separado;
- los términos sin respaldo generan preguntas, nunca afirmaciones;
- orden recomendado de secciones sin modificar el CV;
- revisión humana y auditoría posterior obligatorias.

## Hito 10 — Cadena de suministro y portabilidad reforzadas ✅

Objetivo: hacer reproducible la instalación publicada y comprobar el mismo paquete en los tres sistemas de escritorio objetivo.

Criterios de aceptación:

- todas las dependencias de ejecución fijadas a versiones exactas;
- `package-lock.json` coherente y auditoría sin vulnerabilidades conocidas;
- CI con Node.js 22 en Linux, Windows y macOS;
- smoke del paquete portable en los tres sistemas;
- instalación y actualización reales desde el marketplace comprobadas después de publicar;
- comprobación de Claude Code con un runtime Node compatible, separada de fallos del CLI anfitrión.

## Hito 11 — Plantillas ATS seguras ✅

Objetivo: ofrecer variedad visual sin alterar hechos, orden de lectura ni compatibilidad de extracción.

Criterios de aceptación:

- plantillas `classic`, `compact` y `technical` para HTML y PDF;
- una sola columna, sin tablas, iconos, imágenes ni texto rasterizado;
- mismo contenido personal en las tres salidas;
- puntuación ATS estructural comprobada por plantilla;
- extracción real de nombre, empresa y habilidades en cada PDF;
- revisión visual de las tres páginas de muestra antes de publicar.

## Hito 12 — Importación guiada y confirmación de CV ✅

Objetivo: convertir texto aportado por el usuario desde TXT, PDF o DOCX en un borrador revisable sin aceptar afirmaciones automáticamente.

Criterios de aceptación:

- el cliente extrae el texto del archivo y el MCP no necesita parser binario, web ni servidor;
- comparación local con límite de 200.000 caracteres y sin persistencia;
- cada campo conserva su ruta JSON y se clasifica como exacto, parcial o no encontrado;
- todos los campos permanecen `confirmed: false`, incluso si coinciden literalmente;
- los borradores incompletos devuelven también sus errores de validación;
- la documentación obliga a revisión humana antes de validar, adaptar o exportar.

## Hito 13 — Exportación DOCX editable ✅

Objetivo: ofrecer un formato editable equivalente a las salidas ATS existentes sin depender de Word, LibreOffice, una web o un servidor.

Criterios de aceptación:

- generación OOXML local con `docx` y desde el mismo JSON Resume validado;
- documento A4 de una columna, con texto y listas reales, sin tablas, imágenes ni cuadros de texto;
- plantillas `classic`, `compact` y `technical` con el mismo contenido y orden;
- resultado como recurso MCP en memoria, sin rutas ni escrituras implícitas;
- límite de 200 KB de entrada y 2 MB de salida;
- extracción automática de nombre, empresa y habilidades mediante Mammoth;
- renderizado e inspección visual de las tres plantillas antes de publicar.

## Hito 14 — Editor seguro y linaje de variantes ✅

Objetivo: permitir que el asistente construya variantes reproducibles sin sobrescribir el CV base ni ocultar de dónde sale cada cambio.

Criterios de aceptación:

- operaciones explícitas `add`, `replace` y `remove` sobre una copia en memoria;
- procedencia `base-resume` comprobada por ruta exacta o `user-confirmed` declarada;
- protección frente a rutas de prototipo, índices ambiguos y entradas desproporcionadas;
- linaje antes/después, hashes SHA-256, validación y auditoría en una sola respuesta;
- comparación independiente con diferencias de campo y hashes deterministas;
- revisión humana obligatoria y ausencia de persistencia;
- pruebas unitarias y smoke local y portable en verde.

## Hito 15 — Importación universal y duplicados exactos ✅

Objetivo: incorporar ofertas de cualquier origen aportado por el usuario sin añadir otro adaptador, navegar ni depender de acuerdos de API.

Criterios de aceptación:

- texto y borrador estructurado en memoria, con límite de 200.000 caracteres;
- URL HTTPS opcional normalizada sin abrirla y con credenciales incrustadas prohibidas;
- campos `exact`, `partial` o `unmatched`, siempre no confirmados y no verificados;
- validación explícita de título y empresa;
- huellas SHA-256 deterministas por identificador, URL o identidad de la oferta;
- agrupación solo de duplicados exactos, sin similitud difusa;
- sin red, scraping, almacenamiento, cuenta o servidor;
- pruebas unitarias y smoke local y portable en verde.

## Hito 16 — Kit de candidatura trazable ✅

Objetivo: coordinar CV, carta y respuestas de formulario con evidencia común y una parada obligatoria antes de cualquier envío.

Criterios de aceptación:

- esquema de carta con rutas del CV, términos no respaldados y preguntas de revisión;
- planificación de hasta 20 respuestas sin generar automáticamente su contenido;
- auditoría determinista por frase, evidencia y cifras, con limitaciones explícitas;
- manifiesto con nombres seguros, plantilla, checklist y herramientas de renderizado siguientes;
- `finalApprovalRequired: true` y `submissionPerformed: false` invariables;
- sin escritura, navegación, formulario, cuenta, mensaje o candidatura automática;
- pruebas unitarias y smoke local y portable en verde.

## Releases

Cada versión estable alinea `develop` y `master`, actualiza ambos manifiestos y fija la misma etiqueta en `.mcp.json`.

## Fuera de alcance

- servidor MCP remoto o servicio web;
- directorio universal que exija un endpoint público;
- aplicar masivamente o pulsar `Submit`, `Send` o equivalentes;
- scraping o evasión de controles de acceso;
- vender o reutilizar datos personales;
- replicar un portal de empleo completo.
