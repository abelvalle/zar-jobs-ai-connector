# Instalación desde GitHub

Zar Jobs AI Connector se ejecuta en el equipo del usuario mediante MCP por `stdio`. No necesita dominio, HTTPS, Docker, base de datos ni un servidor web administrado.

## Requisitos

- Node.js 22 o superior, con `npx` disponible.
- Git para añadir el marketplace desde GitHub.
- Codex o Claude Code con soporte de plugins.

La primera ejecución descarga mediante `npx` la versión etiquetada que declara el plugin. Las siguientes ejecuciones reutilizan la caché local de npm.

## Codex y ChatGPT de escritorio

Añade el repositorio como marketplace e instala el plugin:

```powershell
codex plugin marketplace add abelvalle/zar-jobs-ai-connector --ref master
codex plugin add zar-jobs-ai-connector@zar-jobs
```

Reinicia la aplicación de escritorio y abre una tarea nueva. En las superficies que muestran el directorio de plugins local, también aparecerá bajo el marketplace **Zar Jobs AI Connector**.

Este método no publica el plugin en un directorio universal y no convierte el equipo en un servidor accesible desde Internet. ChatGPT web o móvil no puede iniciar un proceso `stdio` que vive en otro equipo.

## Claude Code

```powershell
claude plugin marketplace add abelvalle/zar-jobs-ai-connector
claude plugin install zar-jobs-ai-connector@zar-jobs
```

Dentro de una sesión interactiva se pueden usar los mismos comandos con `/plugin`. Ejecuta `/reload-plugins` o abre una sesión nueva después de instalar.

## Uso directo desde un clon

Este camino sirve para desarrollo o para cualquier cliente MCP que acepte procesos `stdio`:

```powershell
git clone https://github.com/abelvalle/zar-jobs-ai-connector.git
Set-Location zar-jobs-ai-connector
npm.cmd ci
npm.cmd run smoke
```

Configura el cliente con `node` como comando y la ruta absoluta a `src/cli.mjs` como argumento. El proceso termina cuando el cliente MCP cierra la conexión.

## Configuración opcional de portales

Las importaciones manuales de LinkedIn e Indeed y la importación de XML de Tecnoempleo no requieren credenciales.

Para usar las capacidades de red autorizadas, define las variables antes de iniciar Codex o Claude Code:

- `INFOJOBS_CLIENT_ID` y `INFOJOBS_CLIENT_SECRET` para la API oficial de InfoJobs;
- `TECNOEMPLEO_RSS_URL` para el RSS de una alerta propia.

No guardes estos valores en el repositorio, en la configuración versionada ni en un chat.

Después de iniciar el plugin, pide al asistente que ejecute `get_connector_status`. El resultado indica si InfoJobs y la lectura directa del RSS están listos y mantiene disponibles las importaciones manuales aunque falte configuración.

## Currículums

Las herramientas de CV no requieren configuración adicional. Para empezar, pide al asistente que cree un CV base compatible con JSON Resume usando únicamente datos confirmados. La plantilla de referencia está en `templates/resume.example.json`.

Cada adaptación debe guardarse, si el usuario lo solicita, como un archivo diferente del CV base. El plugin devuelve el JSON, HTML o PDF en memoria y nunca decide una ruta ni escribe por su cuenta. Para el PDF, pide un nombre distinto por empresa y puesto; `render_resume_pdf` devuelve el recurso listo para que el cliente lo guarde con tu autorización.

## Actualización y desinstalación

Codex:

```powershell
codex plugin marketplace upgrade zar-jobs
codex plugin remove zar-jobs-ai-connector@zar-jobs
```

Claude Code:

```powershell
claude plugin marketplace update zar-jobs
claude plugin uninstall zar-jobs-ai-connector@zar-jobs
```

Cada release actualiza la versión fijada en ambos marketplaces y en `.mcp.json`; así la instalación nunca depende silenciosamente de código sin etiquetar.
