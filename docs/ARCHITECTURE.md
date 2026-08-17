# Arquitectura

## Objetivo

Ofrecer el mismo conector local a Codex, Claude Code y clientes MCP compatibles, sin infraestructura alojada y sin acoplar las reglas de empleo a un cliente concreto.

```text
Codex / Claude Code / cliente MCP
                |
                | stdio
                v
      Zar Jobs AI Connector
      - herramientas MCP
      - validación y normalización
          |                 |
          v                 v
  Motor de CV        Adaptadores de portal
  - JSON Resume      - InfoJobs API oficial
  - ATS offline      - Tecnoempleo RSS propio
  - variantes        - LinkedIn importación manual
  - HTML / PDF       - Indeed importación manual
```

## Distribución

El repositorio es simultáneamente:

- un marketplace de Codex mediante `.agents/plugins/marketplace.json`;
- un plugin de Codex mediante `.codex-plugin/plugin.json`;
- un marketplace de Claude Code mediante `.claude-plugin/marketplace.json`;
- un plugin de Claude Code mediante `.claude-plugin/plugin.json`;
- un paquete ejecutable de Node.js mediante `zar-jobs-ai-connector`;
- un servidor MCP local estándar mediante `.mcp.json`.

Ambos catálogos apuntan a una etiqueta de release fija. La configuración MCP usa `npx` con esa misma etiqueta. Esto evita rutas absolutas y permite que ambos clientes arranquen la misma versión en Windows, macOS y Linux.

## Ejecución

Solo existe transporte MCP por `stdio`. El cliente crea un subproceso local, intercambia mensajes por entrada y salida estándar y lo detiene al cerrar la conexión. No escucha puertos y no acepta conexiones desde la red.

`src/cli.mjs` abre el transporte local y `src/server.mjs` registra quince herramientas pequeñas. `src/connector-status.mjs` diagnostica únicamente la presencia de configuración, nunca sus valores. `src/resumes/resume-tools.mjs` contiene la validación, HTML y auditoría; `src/resumes/resume-pdf.mjs` genera PDF local con PDFKit. La lógica de portales vive en adaptadores independientes, por lo que un fallo de un portal no altera los demás.

## Datos y estado

- No hay base de datos, cuentas, telemetría ni almacenamiento de consultas.
- Las credenciales opcionales se leen del entorno del proceso y nunca se devuelven.
- El XML de Tecnoempleo y los datos manuales de LinkedIn o Indeed viven solo durante la llamada.
- Los textos de las ofertas son datos no confiables y nunca instrucciones.
- El CV base, las variantes y el PDF generado se mantienen en memoria; el MCP no escribe archivos ni conserva datos personales.

## Contrato común

Cada adaptador devuelve fuente, identificador, título, empresa, ubicación, URL y fechas cuando existen. Los campos desconocidos se omiten o usan `null`; nunca se inventan.

No existen herramientas `apply`, `submit`, `send` ni equivalentes. Una variante no autoriza a inventar experiencia ni a sobrescribir el CV base.
