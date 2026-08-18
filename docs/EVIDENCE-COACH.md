# Coach de evidencia y logros

El coach cubre el paso entre detectar una debilidad del CV y corregirla con datos reales. No genera logros por sí solo ni convierte una posibilidad en un hecho.

## Flujo

1. `plan_resume_achievement_interview` valida el CV y revisa highlights de experiencia y proyectos.
2. Cada entrada recibe señales de acción, escala y resultado, rutas de origen y preguntas concretas.
3. El cliente pregunta como máximo tres cuestiones a la vez y conserva solo respuestas confirmadas por el candidato.
4. El modelo puede proponer redacciones desde la entrada original y esas respuestas.
5. `audit_resume_achievement_rewrite` compara métricas y términos antes de permitir una edición trazable.

## Límites

- Una métrica propuesta debe aparecer literalmente en la entrada original o en la evidencia confirmada.
- Una auditoría limpia no certifica que el texto sea verdadero.
- Todo término nuevo queda visible para revisión.
- La herramienta no modifica el CV base, escribe archivos, almacena respuestas ni usa red.
- La redacción aceptada se aplica a una variante con `apply_resume_changes` y origen `user-confirmed`.
