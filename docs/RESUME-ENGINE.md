# Motor de currículums

## Decisión

Zar Jobs reutiliza dos paquetes MIT del repositorio público [JSON Resume](https://github.com/jsonresume/jsonresume.org):

- `@jsonresume/schema` como contrato portable del CV;
- `@jsonresume/ats-validator` para comprobar de forma determinista la estructura HTML.

La exportación usa [PDFKit](https://github.com/foliojs/pdfkit), también MIT, para producir texto PDF directamente en Node.js. No interpreta HTML arbitrario: renderiza el mismo JSON Resume ya validado con la misma estructura lineal, evitando incorporar un navegador.

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
```

El CV base nunca se sobrescribe al preparar una oferta. Cada variante debe conservar un nombre distinto y ser revisada por la persona antes de utilizarla.

## Herramientas

- `review_resume_import`: contrasta un borrador JSON Resume con texto extraído de TXT, PDF o DOCX y marca cada campo como coincidencia exacta, parcial o no encontrada; ninguno queda confirmado automáticamente.
- `validate_resume`: valida JSON Resume y requisitos mínimos.
- `match_resume_to_job`: calcula coincidencia orientativa con el texto de una oferta.
- `plan_resume_variant`: ordena evidencia existente por relevancia, conserva su ruta JSON y separa términos sin respaldo.
- `audit_resume_variant`: señala hechos estructurados, habilidades y cifras que no aparecen en el CV base.
- `check_resume_ats`: ejecuta controles offline sobre la plantilla HTML elegida.
- `render_resume_html`: genera HTML escapado, imprimible y de una sola columna.
- `render_resume_pdf`: genera un PDF A4 multipágina, limitado a 10 páginas y 2 MB, y lo devuelve como recurso MCP en memoria.

Las salidas aceptan `classic`, `compact` o `technical`. Las tres conservan el mismo contenido, orden lineal y fuentes estándar; solo cambian tamaños, espaciado, líneas y un acento oscuro en `technical`.

## Importación guiada

El conector no incorpora un parser binario. El cliente que ya tiene acceso al archivo del usuario —Codex, Claude u otro asistente compatible— extrae su texto y prepara un borrador JSON Resume. Después llama a `review_resume_import` con:

- `sourceFormat`: `text`, `pdf-extracted` o `docx-extracted`;
- `sourceText`: texto extraído, limitado a 200.000 caracteres;
- `resume`: borrador en memoria.

La respuesta no repite el documento de origen ni lo guarda. Devuelve cada ruta y valor del borrador con soporte `exact`, `partial` o `unmatched`, siempre con `confirmed: false`. Primero se revisan los campos parciales y no encontrados; luego el usuario confirma todos los campos. Solo después se usa `validate_resume` y se considera ese documento un CV base.

Este mecanismo detecta diferencias de texto, no significado ni autoría. Un valor marcado como exacto también requiere confirmación humana.

## Límites

Ninguna herramienta puede garantizar que un CV supere un ATS o una evaluación de IA externos. Los productos usan parsers, modelos y reglas privadas que cambian. La puntuación local detecta problemas reproducibles de estructura; la coincidencia por palabras clave es solo una señal.

Una palabra ausente nunca se añade automáticamente. Primero debe estar respaldada por el CV base o ser confirmada por el usuario. La auditoría de variantes tampoco comprende el significado completo de una reformulación, por lo que la revisión humana continúa siendo obligatoria.

Las salidas HTML y PDF se generan desde el mismo documento validado. El PDF contiene texto seleccionable y extraíble, no una captura de pantalla. La prueba automatizada vuelve a leerlo con PDF.js y comprueba nombre, empresa y habilidades. La fuente estándar actual está orientada a alfabetos latinos; otros sistemas de escritura requieren una fuente portable adicional antes de poder considerarse soportados.

El conector no escribe el PDF. Devuelve el binario codificado dentro de un recurso MCP y un nombre sugerido; Codex, Claude u otro cliente solo debe guardarlo cuando el usuario lo pida y en una ruta bajo su control.
