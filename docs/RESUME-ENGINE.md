# Motor de currículums

## Decisión

Zar Jobs reutiliza dos paquetes MIT del repositorio público [JSON Resume](https://github.com/jsonresume/jsonresume.org):

- `@jsonresume/schema` como contrato portable del CV;
- `@jsonresume/ats-validator` para comprobar de forma determinista la estructura HTML.

La exportación usa [PDFKit](https://github.com/foliojs/pdfkit), también MIT, para producir texto PDF directamente en Node.js. No interpreta HTML arbitrario: renderiza el mismo JSON Resume ya validado con la misma estructura lineal, evitando incorporar un navegador.

La salida editable usa [docx](https://github.com/dolanmiu/docx), también MIT, para construir OOXML directamente en Node.js. No automatiza Word ni necesita LibreOffice en tiempo de ejecución.

El conector conserva Node.js y `stdio`. No añade web, servidor, cuenta, base de datos ni proveedor de IA.

## Alternativas evaluadas

| Proyecto | Ventaja | Motivo para no integrarlo completo |
| --- | --- | --- |
| [JSON Resume](https://github.com/jsonresume/jsonresume.org) | Esquema estándar, validador ATS y licencia MIT | Seleccionado por paquetes, sin importar su web o registro |
| [resuml](https://github.com/phoinixi/resuml) | YAML, MCP, análisis por oferta y PDF opcional | Su MCP añade búsquedas no solicitadas y prompts que pueden inducir métricas no respaldadas |
| [RenderCV](https://github.com/rendercv/rendercv) | PDF local de alta calidad y proyecto maduro | Requiere Python 3.12 y una segunda cadena de renderizado |
| [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume) | Editor visual completo y licencia MIT | La aplicación completa incorpora web, base de datos y despliegue |
| [OpenResume](https://github.com/xitanggg/open-resume) | Constructor y parser ATS | AGPL-3.0, Next.js y aplicación web; no encaja con el plugin MIT local |

La investigación se revisó el 17 de agosto de 2026. Las dependencias están fijadas en `package-lock.json` y deben auditarse en cada actualización.

## Modelo de datos

El CV base y cada variante usan JSON Resume 1.x. La plantilla está en `templates/resume.example.json`.

El plugin procesa el documento recibido durante una llamada y no lo guarda. Codex, Claude u otro cliente solo debe crear archivos cuando el usuario lo solicite. Una organización recomendada en el proyecto del usuario es:

```text
resumes/
  base.resume.json
  variants/
    empresa-puesto.resume.json
  output/
    empresa-puesto.html
    empresa-puesto.pdf
    empresa-puesto.docx
```

El CV base nunca se sobrescribe al preparar una oferta. Cada variante debe conservar un nombre distinto y ser revisada por la persona antes de utilizarla.

## Herramientas

- `review_resume_import`: contrasta un borrador JSON Resume con texto extraído de TXT, PDF o DOCX y marca cada campo como coincidencia exacta, parcial o no encontrada; ninguno queda confirmado automáticamente.
- `validate_resume`: valida JSON Resume y requisitos mínimos.
- `prepare_resume_locale`: localiza las etiquetas de los tres formatos sin traducir el contenido profesional.
- `prepare_europass_mapping`: prepara un mapeo trazable para revisión y transferencia manual, no un archivo oficial de importación.
- `build_evidence_bank`: extrae evidencia con rutas, cifras, palabras clave y hash del banco.
- `match_resume_evidence`: relaciona el banco reconstruido con una oferta y conserva los temas no respaldados.
- `match_resume_to_job`: calcula coincidencia orientativa con el texto de una oferta.
- `review_resume_as_recruiter`: puntúa seis dimensiones de primera criba, devuelve rutas, prioridades y preguntas, y mantiene desactivadas la predicción y la decisión de contratación.
- `plan_resume_variant`: ordena evidencia existente por relevancia, conserva su ruta JSON y separa términos sin respaldo.
- `apply_resume_changes`: aplica como máximo 50 operaciones explícitas sobre una copia, conserva valores anterior y posterior, procedencia declarada y hashes SHA-256, y ejecuta validación y auditoría.
- `compare_resume_versions`: calcula diferencias de campo y hashes deterministas entre el CV base y una variante.
- `audit_resume_variant`: señala hechos estructurados, habilidades y cifras que no aparecen en el CV base.
- `check_resume_ats`: ejecuta controles offline sobre la plantilla HTML elegida.
- `render_resume_html`: genera HTML escapado, imprimible y de una sola columna.
- `render_resume_pdf`: genera un PDF A4 multipágina, limitado a 10 páginas y 2 MB, y lo devuelve como recurso MCP en memoria.
- `render_resume_docx`: genera un DOCX A4 editable, limitado a 2 MB, y lo devuelve como recurso MCP en memoria.

Las salidas aceptan `classic`, `compact` o `technical`. Las tres conservan el mismo contenido, orden lineal y fuentes estándar; solo cambian tamaños, espaciado, líneas y un acento oscuro en `technical`. Las etiquetas de sección compartidas están disponibles en inglés, español, francés, alemán, italiano y portugués; el texto del candidato no se traduce automáticamente. El DOCX usa el preset interno `resume_a4`, con cabecera `resume_identity_header`, márgenes compactos y listas numeradas reales; no usa tablas, columnas, imágenes ni cuadros de texto.

## Importación guiada

El conector no incorpora un parser binario. El cliente que ya tiene acceso al archivo del usuario —Codex, Claude u otro asistente compatible— extrae su texto y prepara un borrador JSON Resume. Después llama a `review_resume_import` con:

- `sourceFormat`: `text`, `pdf-extracted` o `docx-extracted`;
- `sourceText`: texto extraído, limitado a 200.000 caracteres;
- `resume`: borrador en memoria.

La respuesta no repite el documento de origen ni lo guarda. Devuelve cada ruta y valor del borrador con soporte `exact`, `partial` o `unmatched`, siempre con `confirmed: false`. Primero se revisan los campos parciales y no encontrados; luego el usuario confirma todos los campos. Solo después se usa `validate_resume` y se considera ese documento un CV base.

Este mecanismo detecta diferencias de texto, no significado ni autoría. Un valor marcado como exacto también requiere confirmación humana.

## Edición trazable

`apply_resume_changes` nunca modifica el objeto base. Cada operación `add`, `replace` o `remove` indica una ruta acotada y una fuente declarada:

- `base-resume`: el valor debe coincidir exactamente con otra ruta existente del CV base;
- `user-confirmed`: el usuario ha confirmado el valor, pero sigue pendiente la revisión final.

La herramienta rechaza claves de prototipo, rutas inexistentes, inserciones ambiguas y valores superiores a 20 KB. Devuelve el documento resultante, el linaje completo, hashes SHA-256 deterministas y los resultados de `validate_resume` y `audit_resume_variant`. No prueba por sí sola que una afirmación sea verdadera ni guarda documentos.

## Límites

Ninguna herramienta puede garantizar que un CV supere un ATS o una evaluación de IA externos. Los productos usan parsers, modelos y reglas privadas que cambian. La puntuación local detecta problemas reproducibles de estructura; la coincidencia por palabras clave es solo una señal.

La rúbrica recruiter tampoco representa la opinión de una persona ni una probabilidad de entrevista. Evalúa señales visibles y reproducibles del documento. No considera atributos protegidos y no debe utilizarse para decidir si una persona merece ser contratada.

El coach de evidencia revisa cada logro para localizar acción, escala o resultado ausentes. Sus preguntas y la auditoría de reescritura mantienen separadas la redacción del modelo y la evidencia confirmada por el candidato; una auditoría limpia tampoco certifica la verdad.

Una palabra ausente nunca se añade automáticamente. Primero debe estar respaldada por el CV base o ser confirmada por el usuario. La auditoría de variantes tampoco comprende el significado completo de una reformulación, por lo que la revisión humana continúa siendo obligatoria.

Las salidas HTML, PDF y DOCX se generan desde el mismo documento validado. PDF y DOCX contienen texto seleccionable y extraíble, no una captura de pantalla. Las pruebas automatizadas vuelven a leerlos con PDF.js y Mammoth para comprobar nombre, empresa y habilidades. La fuente estándar actual está orientada a alfabetos latinos; otros sistemas de escritura requieren una fuente portable adicional antes de poder considerarse soportados.

El conector no escribe el PDF ni el DOCX. Devuelve cada binario codificado dentro de un recurso MCP y un nombre sugerido; Codex, Claude u otro cliente solo debe guardarlo cuando el usuario lo pida y en una ruta bajo su control.
