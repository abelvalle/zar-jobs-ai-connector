# Kit de candidatura

## Objetivo

El kit coordina los documentos y comprobaciones de una candidatura concreta sin convertir el plugin en un agente de envío. Todo se procesa en memoria; el usuario conserva la decisión final y la acción de aplicar.

## Flujo

1. Validar el CV base y revisar la oferta importada.
2. Ejecutar `plan_resume_variant` y crear la variante con `apply_resume_changes`.
3. Ejecutar `plan_cover_letter`; el asistente puede redactar después usando únicamente las rutas de evidencia y las confirmaciones del usuario.
4. Ejecutar `plan_screening_answers`; cada pregunta indica evidencia disponible y lagunas que requieren respuesta del usuario.
5. Pasar la carta y cada respuesta por `audit_application_text`.
6. Ejecutar `prepare_application_kit` para obtener auditorías, nombres sugeridos, checklist y las siguientes herramientas de renderizado.
7. Generar PDF y DOCX con `render_resume_pdf` y `render_resume_docx`, abrir los archivos y revisarlos.
8. El usuario decide si presenta la candidatura manualmente.

## Garantías y límites

- Los planificadores no generan carta ni respuestas; devuelven evidencia trazable y preguntas.
- La auditoría separa texto neutral, evidencia hallada, contexto que solo aparece en la oferta y afirmaciones seleccionadas sin respaldo.
- Las cifras ausentes tanto del CV como de la oferta se señalan de forma explícita.
- El análisis es léxico y determinista: puede no detectar una reformulación falsa, una implicación engañosa o una atribución incorrecta.
- `prepare_application_kit` devuelve siempre `finalApprovalRequired: true` y `submissionPerformed: false`.
- El manifiesto no guarda archivos. Solo sugiere nombres seguros y las herramientas locales que el cliente puede llamar después.

Nunca se pulsa `Submit`, `Send`, `Apply` ni equivalentes, y no se navega por portales, inicia sesión o completa formularios.
