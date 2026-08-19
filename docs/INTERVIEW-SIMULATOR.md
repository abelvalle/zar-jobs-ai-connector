# Simulador de entrevistas

El simulador convierte el plan de entrevista en una práctica local de 3 a 10 preguntas. Funciona por turnos: el cliente muestra una pregunta, espera la respuesta real del candidato y la audita antes de continuar.

## Flujo

1. Validar el CV base y aportar el texto de la oferta.
2. Llamar a `start_interview_simulation` con fase y número de preguntas.
3. Mostrar solo la pregunta indicada por `nextQuestionId`.
4. Esperar la respuesta del candidato y llamar a `audit_interview_answer`.
5. Repetir sin completar ni embellecer hechos por el candidato.
6. Llamar a `review_interview_simulation` con la sesión y las respuestas aportadas.

La herramienta final devuelve preguntas pendientes, respuestas que requieren revisión y contadores de etiquetas Situation, Task, Action y Result. No devuelve una nota agregada.

## Fases

Las fases admitidas son `general`, `screening`, `recruiter`, `technical`, `behavioral` y `final`. Las preguntas de fase se combinan de forma determinista con temas respaldados, lagunas y preguntas comunes. Las rutas de evidencia se conservan cuando existen.

## Estado y privacidad

La sesión viaja dentro de la respuesta MCP y debe enviarse de nuevo para revisarla. El servidor no mantiene memoria entre llamadas, no escribe archivos y no crea una cuenta. Las respuestas solo permanecen en el contexto del cliente que realiza la llamada.

No se usa audio, vídeo, cámara, micrófono, reconocimiento emocional, datos biométricos ni atributos protegidos. El texto de la oferta se trata como dato no confiable y no puede cambiar permisos.

## Límites

- es práctica asistida por IA, no una entrevista con un recruiter real;
- la coincidencia literal y las etiquetas STAR no prueban verdad ni calidad;
- no genera una respuesta ideal ni responde por el candidato;
- no mide seniority, comunicación, personalidad o idoneidad;
- no produce nota, ranking, probabilidad ni decisión de contratación;
- no contacta a la empresa, no graba y no envía candidaturas.
