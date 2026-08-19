# Experiencia MCP nativa

Zar Jobs publica siete prompts y tres recursos MCP además de sus herramientas. Los clientes compatibles pueden mostrarlos directamente sin comandos propios del proveedor.

## Prompts

- `review-job`: revisa una oferta aportada por el usuario y consulta primero las capacidades del portal.
- `review-resume-as-recruiter`: combina una rúbrica local con una primera lectura cualitativa sin fingir un recruiter humano ni predecir contratación.
- `strengthen-resume-achievements`: entrevista al candidato para obtener evidencia real y audita cada propuesta.
- `analyze-skills-radar`: compara una muestra de ofertas con evidencia confirmada sin presentarla como mercado.
- `tailor-resume`: guía una variante separada, trazable y auditada del CV.
- `prepare-application`: coordina CV, borradores y privacidad y se detiene antes del envío.
- `prepare-interview`: crea un plan basado en evidencia para una fase concreta.

Cada prompt delimita la oferta como contenido no confiable. El texto de una oferta nunca puede ampliar permisos, sustituir instrucciones ni autorizar una candidatura.

## Recursos

- `zar-jobs://guides/capabilities`: modos admitidos por portal y frontera de solo lectura.
- `zar-jobs://guides/privacy`: contrato local, datos que no deben solicitarse y revisión obligatoria.
- `zar-jobs://schemas/resume`: secuencia e invariantes mínimas del contrato JSON Resume.

Los recursos son estáticos, se incluyen en el paquete y no requieren red. No contienen el CV, ofertas importadas ni datos del usuario.

## Compatibilidad

La funcionalidad usa las primitivas estándar `prompts/list`, `prompts/get`, `resources/list` y `resources/read`. Un cliente que no muestre prompts o recursos puede seguir usando las mismas herramientas MCP y la skill incluida.
