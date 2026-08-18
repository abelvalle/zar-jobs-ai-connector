# Zar Jobs AI Connector V1.5

V1.5 amplía el conector local con cuatro capacidades portables y verificables. Todas funcionan mediante MCP `stdio`, procesan datos en memoria y mantienen la decisión final en manos del usuario.

## Hitos incluidos

### Hito 24 — Workspace portable

- Exporta perfil, preferencias, CV, variantes, ofertas, snapshots y tracker en un ZIP versionado.
- Usa redacción por defecto y exige consentimiento explícito para conservar datos personales.
- Rechaza claves que puedan contener contraseñas, tokens, cookies o claves privadas.
- Verifica estructura, versión, CRC, tamaño y SHA-256 al importar.

Contrato completo: [PORTABLE-WORKSPACE.md](PORTABLE-WORKSPACE.md).

### Hito 25 — Salario y condiciones verificables

- Conserva la cita literal que respalda cada condición.
- Anualiza salarios únicamente con multiplicadores explícitos.
- Separa moneda y base bruta, neta o desconocida.
- No estima impuestos, tipos de cambio, valor de beneficios ni conclusiones legales.

Contrato completo: [JOB-CONDITIONS.md](JOB-CONDITIONS.md).

### Hito 26 — CV anónimo

- Crea copias `contact-safe` o `blind-review` sin alterar el CV base.
- Retira contacto y puede seudonimizar organizaciones de forma estable.
- Bloquea el bundle si detecta identificadores directos residuales en texto libre.
- Produce JSON, PDF, DOCX y manifiesto con checksums sin incluir el original.

Contrato completo: [ANONYMOUS-RESUME.md](ANONYMOUS-RESUME.md).

### Hito 27 — Analítica descriptiva

- Calcula el embudo observado desde fechas aportadas por el usuario.
- Segmenta por portal, puesto, variante de CV y banda de ajuste.
- Marca datos ausentes y muestras inferiores a cinco candidaturas.
- No realiza inferencia causal, ranking, predicción ni recomendaciones automáticas.

Contrato completo: [APPLICATION-ANALYTICS.md](APPLICATION-ANALYTICS.md).

## Superficie V1.5

- 50 herramientas MCP locales;
- 4 prompts MCP nativos;
- 3 recursos MCP estáticos;
- instalación desde GitHub para Codex, Claude Code y clientes MCP compatibles;
- sin servidor web, HTTPS alojado, Docker, dominio ni base de datos.

## Verificación de release

La release se publica solo después de superar:

- comprobación sintáctica de todos los módulos;
- suite completa de pruebas unitarias;
- validación de manifiestos Codex, Claude Code, marketplaces y MCP;
- smoke test del checkout local;
- smoke test del paquete portable generado por `npm pack`;
- auditoría de dependencias de producción;
- CI con Node.js 22 en Linux, Windows y macOS;
- instalación y smoke desde la etiqueta pública de GitHub.

Los resultados exactos se conservan en las ejecuciones de GitHub Actions y en la publicación de la release. Las comprobaciones locales prueban el paquete y el protocolo; no sustituyen la verificación en vivo opcional de credenciales de InfoJobs o de una alerta RSS propia de Tecnoempleo.

## Límites que no cambian

Zar Jobs no raspa LinkedIn, Indeed ni Tecnoempleo; no solicita contraseñas de portales; no aloja un servicio; no sincroniza cuentas; no envía mensajes; no modifica perfiles; y nunca presenta, descarta o envía una candidatura automáticamente.
