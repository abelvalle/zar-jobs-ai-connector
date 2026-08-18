# Analítica descriptiva de candidaturas

`analyze_application_funnel` resume el historial que el usuario aporta en memoria. Sirve para observar el paso de candidatura a respuesta, entrevista, oferta y contratación sin crear una base de datos ni atribuir causalidad a un portal, un CV o una puntuación.

## Evidencia de entrada

Cada registro necesita `id`, empresa, puesto, estado y `createdAt`. Las fases se acreditan mediante fechas explícitas (`appliedAt`, `respondedAt`, `interviewAt`, `offerAt`, `hiredAt` y `rejectedAt`) o, después de `appliedAt`, por el estado actual cuando este demuestra una fase posterior.

Los campos analíticos son opcionales:

- `sourcePortal`: origen declarado por el usuario;
- `resumeVariant`: identificador de la variante empleada;
- `fitScore`: puntuación explícita entre 0 y 100.

Una fecha nunca puede ser posterior a `asOf`, anterior a `createdAt` ni, cuando existe `appliedAt`, anterior a la candidatura. El conector rechaza identificadores duplicados y no inventa fechas ausentes.

## Resultado

La herramienta devuelve:

- recuentos y tasas observadas del embudo completo;
- segmentos opcionales por portal, puesto, variante y banda de ajuste;
- mediana de días hasta respuesta calculada solo con `appliedAt` y `respondedAt` explícitos;
- diagnóstico de portales, variantes, puntuaciones y fechas de candidatura ausentes;
- tamaño de muestra y elegibilidad descriptiva para cada segmento.

Un segmento necesita al menos cinco candidaturas acreditadas para quedar marcado como `descriptive-comparison-allowed`. Este umbral evita presentar muestras diminutas como comparaciones útiles, pero no convierte el resultado en evidencia estadística ni causal.

## Límites

- Las tasas describen únicamente los registros suministrados.
- No se corrigen selección, antigüedad, estacionalidad, calidad de la oferta ni datos ausentes.
- Una asociación entre variante, portal o banda de ajuste y un resultado no demuestra que lo haya causado.
- No hay tests de significación, intervalos de confianza, predicción, ranking ni recomendaciones automáticas.
- `causalAnalysisPerformed`, `rankingPerformed`, `recommendationsGenerated` y `stored` siempre son `false`.
- El resultado requiere revisión humana y nunca autoriza a solicitar un puesto, descartar una oferta o cambiar un tracker.

La herramienta admite como máximo 500 registros por llamada y funciona completamente en memoria, sin red ni persistencia.
