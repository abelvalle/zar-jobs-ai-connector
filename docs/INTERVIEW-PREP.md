# Preparación de entrevistas con evidencia

Las herramientas de entrevista reutilizan el CV validado como fuente de hechos. Ayudan a preparar temas y revisar borradores, pero no escriben respuestas que el candidato deba memorizar ni afirman que una respuesta sea verdadera.

## Plan

`plan_interview` recibe el CV y el texto de la oferta. Puede indicar una fase `general`, `screening`, `recruiter`, `technical`, `behavioral` o `final`.

La salida contiene:

- temas respaldados por el CV;
- tarjetas de evidencia con su ruta JSON exacta;
- preguntas técnicas y conductuales para preparar;
- lagunas que necesitan confirmación o una respuesta honesta;
- una checklist de revisión de la oferta y de las afirmaciones.

La herramienta no genera respuestas: devuelve `generatedAnswers: false`.

## Auditoría de una respuesta

`audit_interview_answer` compara el borrador con el CV y, opcionalmente, con la oferta. Reutiliza la detección de cifras y afirmaciones seleccionadas del kit de candidatura. También comprueba etiquetas explícitas de Situation, Task, Action y Result, y una coincidencia literal básica con los temas de la pregunta.

Estas comprobaciones tienen límites deliberados:

- no prueban que una historia haya sucedido;
- no juzgan comunicación, tono, seniority ni calidad de razonamiento;
- pueden omitir equivalencias semánticas y afirmaciones engañosas;
- una estructura STAR completa no convierte una afirmación sin respaldo en válida.

Todas las respuestas mantienen `truthVerified: false` y requieren revisión humana.
