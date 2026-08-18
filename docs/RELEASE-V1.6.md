# Zar Jobs AI Connector V1.6

V1.6 añade una revisión recruiter estructurada al motor local de currículums. Combina una herramienta determinista con un prompt MCP nativo para que Codex, Claude Code y otros clientes puedan explicar la primera impresión del documento sin fingir una evaluación humana ni predecir una contratación.

## Hito 28 — Revisión recruiter del CV

- `review_resume_as_recruiter` valida el CV y puntúa claridad, relevancia, impacto, credibilidad, escaneabilidad y evidencia.
- `review-resume-as-recruiter` guía una lectura cualitativa de 30 segundos y conserva las puntuaciones y rutas de la herramienta.
- El modo general funciona sin oferta; el modo dirigido añade una descripción aportada por el usuario como datos no confiables.
- Las fortalezas, prioridades y preguntas conservan rutas hacia el CV confirmado.
- Los términos de la oferta que no aparecen en el CV permanecen como lagunas y nunca se añaden automáticamente.
- Las ediciones posteriores siguen usando variantes separadas, procedencia declarada y auditoría frente al CV base.

Contrato completo: [RECRUITER-REVIEW.md](RECRUITER-REVIEW.md).

## Límites verificables

La respuesta declara siempre:

- `professionalRecruiterReviewPerformed: false`;
- `hiringProbabilityCalculated: false`;
- `hiringDecisionMade: false`;
- `protectedTraitsUsed: false`;
- `factsAdded: false`;
- `stored: false`.

La herramienta no usa edad, género, etnia, discapacidad, fotografía, estado civil, nacionalidad ni otros atributos protegidos. No envía candidaturas, no descarta personas, no modifica perfiles y no escribe archivos.

## Superficie V1.6

- 51 herramientas MCP locales;
- 5 prompts MCP nativos;
- 3 recursos MCP estáticos;
- instalación desde GitHub para Codex, Claude Code y clientes MCP compatibles;
- sin servidor web, HTTPS alojado, Docker, dominio ni base de datos.

## Verificación de release

La release se publica solo después de superar:

- comprobación sintáctica de todos los módulos;
- suite completa de pruebas unitarias;
- validación de la skill y de los manifiestos Codex, Claude Code, marketplaces y MCP;
- smoke test del checkout local y del paquete generado por `npm pack`;
- auditoría de dependencias de producción;
- CI con Node.js 22 en Linux, Windows y macOS para `develop` y `master`;
- instalación y smoke desde la etiqueta pública de GitHub.

Estas comprobaciones demuestran el contrato local y la distribución. No convierten la rúbrica en una opinión profesional, un resultado ATS externo o una garantía de entrevista.
