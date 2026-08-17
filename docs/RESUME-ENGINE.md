# Motor de currículums

## Decisión

Zar Jobs reutiliza dos paquetes MIT del repositorio público [JSON Resume](https://github.com/jsonresume/jsonresume.org):

- `@jsonresume/schema` como contrato portable del CV;
- `@jsonresume/ats-validator` para comprobar de forma determinista la estructura HTML.

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

- `validate_resume`: valida JSON Resume y requisitos mínimos.
- `match_resume_to_job`: calcula coincidencia orientativa con el texto de una oferta.
- `audit_resume_variant`: señala hechos estructurados, habilidades y cifras que no aparecen en el CV base.
- `check_resume_ats`: ejecuta controles offline sobre la representación HTML.
- `render_resume_html`: genera HTML escapado, imprimible y de una sola columna.

## Límites

Ninguna herramienta puede garantizar que un CV supere un ATS o una evaluación de IA externos. Los productos usan parsers, modelos y reglas privadas que cambian. La puntuación local detecta problemas reproducibles de estructura; la coincidencia por palabras clave es solo una señal.

Una palabra ausente nunca se añade automáticamente. Primero debe estar respaldada por el CV base o ser confirmada por el usuario. La auditoría de variantes tampoco comprende el significado completo de una reformulación, por lo que la revisión humana continúa siendo obligatoria.

La salida actual es HTML imprimible. La exportación PDF automatizada queda separada para no obligar a instalar un navegador o un segundo runtime.
