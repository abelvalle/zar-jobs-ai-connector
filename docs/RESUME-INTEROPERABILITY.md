# CV multilingüe, Europass y banco de evidencias

## Etiquetas multilingües

`prepare_resume_locale` crea una copia en memoria con `meta.language` y etiquetas de documento en inglés, español, francés, alemán, italiano o portugués. HTML, PDF y DOCX usan las mismas etiquetas.

El contenido profesional no se traduce automáticamente. La salida incluye `translationReviewPaths` para que el asistente proponga traducciones solo sobre esos textos, el usuario las revise y después se audite la variante contra el CV base. Empresas, instituciones, fechas y métricas permanecen intactas.

## Mapeo para Europass

Europass declara como objetivo la reutilización e intercambio de perfiles y CV, dejando al usuario la elección de cómo y dónde compartir sus datos. Sus páginas actuales describen la interoperabilidad y el vocabulario, pero este proyecto no depende de una API de cuenta ni presenta su borrador como contrato oficial de importación: [interoperabilidad de Europass](https://europass.europa.eu/en/stakeholders/interoperability-europass) y [perfil e interoperabilidad](https://europass.europa.eu/en/europass-profile-and-interoperability).

`prepare_europass_mapping` devuelve `zar-jobs-europass-mapping-draft-v1`, con rutas al JSON Resume original. Sirve para revisar y transferir datos manualmente. Mantiene explícitamente:

- `officialEuropassImport: false`;
- `europeanLearningModelCredential: false`;
- `europeanDigitalCredential: false`;
- `loginPerformed: false`.

No inicia sesión, publica un perfil ni emite credenciales.

## Banco de evidencias

`build_evidence_bank` extrae del CV validado elementos reutilizables con identificador, categoría, ruta, texto, cifras y palabras clave. El hash SHA-256 del banco permite detectar si la entrada cambió. No incluye nombre, correo o teléfono como evidencia profesional y no añade hechos.

`match_resume_evidence` reconstruye el banco desde el CV y lo compara con una oferta mediante solapamiento literal determinista. Los temas no respaldados permanecen como lagunas. El resultado puede perder equivalencias semánticas y siempre necesita revisión humana.
