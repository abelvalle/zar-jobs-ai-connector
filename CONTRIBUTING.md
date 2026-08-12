# Contribuir

## Flujo de ramas

- `develop` recibe el desarrollo activo.
- `master` contiene el último hito estable.
- Cada hito se implementa y verifica por separado.
- La promoción normal es `develop` → `master` después de pasar todas las comprobaciones.
- El commit documental inicial es la única excepción de arranque directo en `master`.
- Tras publicar un hito estable, ambas ramas quedan alineadas y el trabajo local vuelve a `develop`.

## Commits

Usa mensajes breves y trazables:

- `docs: define architecture and roadmap`
- `feat: add local MCP foundation`
- `test: cover portal URL normalization`

No mezcles varios hitos en un commit.

## Comprobaciones mínimas

```powershell
npm.cmd test
npm.cmd run check
python C:\Users\Usuario\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py .
```

Las rutas locales de herramientas son orientativas; CI utilizará una validación reproducible incluida en el proyecto cuando el plugin madure.

## Reglas de integración

- No scraping ni automatización que incumpla las condiciones de un portal.
- No enviar candidaturas.
- No incorporar credenciales, tokens, cookies o fixtures con datos personales.
- Toda integración de red debe enlazar la documentación oficial y disponer de autorización verificable.
- Los fallos de un portal deben degradarse de forma aislada.
