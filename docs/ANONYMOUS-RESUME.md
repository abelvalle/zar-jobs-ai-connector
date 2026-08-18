# CV anónimo y paquete para compartir

Estas herramientas crean una copia separada del CV. Nunca modifican el documento base y nunca garantizan anonimato: fechas, logros poco comunes, proyectos o contexto profesional todavía pueden permitir la reidentificación.

## Herramientas

- `plan_resume_anonymization`: enumera rutas, operaciones y posibles identificadores directos repetidos en texto libre sin devolver sus valores.
- `create_anonymous_resume`: aplica el plan a una copia en memoria.
- `render_anonymous_resume_bundle`: genera JSON, PDF, DOCX y manifiesto con checksums dentro de un ZIP en memoria.

## Modos

`contact-safe` sustituye el nombre, elimina contacto, ubicación, perfiles, imágenes, enlaces y campos sensibles seleccionados. Conserva nombres de empresas, centros educativos y proyectos.

`blind-review` añade seudónimos deterministas como `Employer 1`, `Institution 1` y `Project 1`. Conserva puestos, fechas, logros y competencias para que el CV siga siendo evaluable.

## Correo reservado

El validador JSON Resume del proyecto requiere correo. La copia utiliza internamente `candidate@example.invalid`, bajo el dominio reservado `.invalid`, para mantener el contrato estructural. Los renderizadores HTML, PDF y DOCX omiten cualquier dirección `@example.invalid`; el manifiesto deja constancia de ello.

## Bloqueo por texto libre

Si el nombre, correo o teléfono originales aparecen en otro campo de texto, el plan devuelve la ruta y el bundle no se genera. El usuario debe reescribir ese texto y repetir la revisión.

## Contenido del ZIP

- CV anónimo JSON;
- PDF con texto extraíble;
- DOCX editable;
- `manifest.json` con modo, plantilla, operaciones, tamaños, SHA-256 y puertas de revisión.

El CV original no se incluye. El cliente decide si guarda y comparte el recurso.
