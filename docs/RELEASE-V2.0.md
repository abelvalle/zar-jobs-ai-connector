# Zar Jobs AI Connector V2.0

V2.0 completa la primera hoja de ruta pública con una práctica de entrevista por turnos, portable y basada en evidencia.

## Novedades

- `start_interview_simulation`: crea 3–10 preguntas deterministas para seis fases y conserva rutas del CV.
- `review_interview_simulation`: audita las respuestas aportadas, muestra pendientes y agrega cobertura STAR sin una nota.
- prompt MCP `practice-interview`: hace una pregunta cada vez y espera al candidato.
- documentación completa del flujo, privacidad, arquitectura y límites de evaluación.

## Contrato de seguridad

- no genera respuestas en nombre del candidato;
- no inventa experiencia ni oculta lagunas;
- no calcula idoneidad, ranking, probabilidad o decisión de contratación;
- no usa atributos protegidos, cámara, micrófono, audio, vídeo ni biometría;
- no accede a portales, no escribe, no guarda sesiones y no envía candidaturas.

## Evidencia de release

- 149 pruebas automatizadas;
- 58 herramientas, 9 prompts y 3 recursos MCP;
- smoke local y desde paquete portable;
- manifiestos de Codex y Claude Code validados;
- CI en Node.js 22 para Windows, Linux y macOS;
- auditoría de dependencias sin vulnerabilidades conocidas.
