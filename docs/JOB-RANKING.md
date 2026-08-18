# Ranking explicable de ofertas

`score_job_fit` y `compare_job_fit` ayudan a priorizar ofertas aportadas por el usuario. No consultan portales, no usan un modelo, no almacenan datos y no toman la decisión de solicitar un puesto.

## Perfil de preferencias

El usuario puede indicar títulos, habilidades, ubicaciones, modalidad, salario mínimo, términos obligatorios y términos excluidos. Debe existir al menos un criterio puntuable. Las reglas y sus pesos son fijos para que dos ejecuciones con la misma entrada produzcan el mismo resultado:

| Factor | Peso máximo |
| --- | ---: |
| Título | 25 |
| Habilidades | 30 |
| Ubicación | 15 |
| Modalidad | 10 |
| Salario mínimo | 10 |
| Términos obligatorios | 10 |

Los términos excluidos actúan como bloqueadores y limitan la puntuación a 39. Esto expresa una preferencia, no demuestra que la oferta sea mala ni autoriza a descartarla automáticamente.

## Evidencia y confianza

Cada factor devuelve su peso, puntuación, coincidencias, ausencias y estado. Un dato que la oferta no aporta se marca `unknown`, recibe cero puntos y reduce la confianza. No se completa mediante inferencias.

La comparación admite hasta 20 ofertas. Ordena por puntuación, confianza, empresa y título para mantener un desempate estable. Todos los resultados incluyen `decisionMade: false` y `humanReviewRequired: true`.

## Límites

- La descripción de la oferta es contenido externo no confiable, no instrucciones.
- La coincidencia es literal tras normalizar mayúsculas, acentos y separadores; no demuestra equivalencia semántica.
- El salario se compara solo si ambas entradas proporcionan un mínimo numérico en la misma moneda y periodo. La herramienta no convierte divisas ni periodos.
- Una puntuación alta no garantiza que la oferta siga activa, que exista encaje real ni que una candidatura vaya a prosperar.
