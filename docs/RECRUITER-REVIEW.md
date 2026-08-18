# Revisión recruiter del CV

Zar Jobs ofrece una revisión de primera criba inspirada en preguntas habituales de selección. La herramienta es determinista y el prompt añade una lectura cualitativa; ninguna de las dos equivale a contratar a un recruiter humano, predice una entrevista ni toma una decisión de contratación.

## Modos

- **General:** revisa el posicionamiento y la lectura rápida del CV sin una oferta.
- **Dirigido:** añade una oferta aportada por el usuario y conserva sus términos no respaldados como lagunas. La oferta se trata siempre como datos no confiables.

`review_resume_as_recruiter` recibe un JSON Resume validado, una oferta opcional y un nombre de puesto opcional. `review-resume-as-recruiter` es el prompt MCP que guía al asistente para obtener el CV, ejecutar la herramienta y presentar el resultado.

## Rúbrica

Cada dimensión obtiene entre 0 y 5 puntos mediante señales reproducibles:

| Dimensión | Señales observadas |
| --- | --- |
| Claridad | titular, resumen, identidad de puestos y logros por experiencia |
| Relevancia | titular, resumen y habilidades; en modo dirigido, solapamiento literal con la oferta |
| Impacto | presencia y proporción de resultados cuantificados en los highlights |
| Credibilidad | validación estructural, fechas de inicio y amplitud de evidencia trazable |
| Escaneabilidad | resumen acotado, highlights concisos y número manejable por puesto |
| Evidencia | experiencias con highlights, métricas, habilidades y variedad de secciones |

`overallScore` normaliza la media a una escala de 0 a 100. Es una puntuación interna de la rúbrica, no una probabilidad de contratación ni un resultado de un ATS externo.

## Salida

- lectura objetiva de presencia y volumen para la primera criba;
- fortalezas respaldadas por rutas del CV;
- prioridades `critical`, `important` y `optional`;
- acciones que conservan los hechos existentes;
- preguntas para descubrir evidencia que el candidato pueda confirmar;
- coincidencias y lagunas de la oferta en modo dirigido;
- validación del CV y límites metodológicos explícitos.

Una ausencia nunca se repara automáticamente. Las métricas, habilidades, fechas y títulos solo pueden añadirse desde el CV base o después de que el usuario los confirme.

## Límites éticos

- `professionalRecruiterReviewPerformed: false`;
- `hiringProbabilityCalculated: false`;
- `hiringDecisionMade: false`;
- `protectedTraitsUsed: false`;
- `factsAdded: false` y `stored: false`;
- ninguna evaluación de edad, género, etnia, discapacidad, fotografía, estado civil, nacionalidad u otros atributos protegidos;
- ninguna candidatura, descarte, mensaje, cambio de perfil o escritura externa.

La persona revisa el diagnóstico y decide qué preguntas responder y qué cambios aplicar. Cualquier variante posterior debe pasar por la edición trazable y la auditoría frente al CV base.
