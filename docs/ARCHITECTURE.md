# Arquitectura

## Objetivo arquitectónico

Separar la experiencia de IA, las herramientas MCP y los adaptadores de portales. Un portal que cambie o quede deshabilitado no debe romper el resto del plugin.

## Componentes

```text
Codex / cliente MCP
        |
        v
Plugin Zar Jobs AI Connector
  - manifiesto de Codex
  - skill de búsqueda y revisión
        |
        v
Servidor MCP
  - herramientas con esquemas explícitos
  - validación y normalización
        |
        v
Adaptadores de portal
  - InfoJobs API
  - Tecnoempleo RSS propio
  - LinkedIn importación segura
  - Indeed importación segura
```

### Plugin de Codex

El paquete raíz contendrá:

- `.codex-plugin/plugin.json`: identidad y metadatos del plugin;
- `skills/zar-jobs/SKILL.md`: flujo y límites que seguirá el asistente;
- `.mcp.json`: conexión local durante el desarrollo;
- `assets/`: identidad visual cuando exista un diseño aprobado.

La publicación pública requerirá sustituir la conexión local por un MCP alojado y registrado para revisión.

### Servidor MCP

El servidor expondrá herramientas pequeñas, orientadas a objetivos. El MVP comienza con:

- `get_portal_capabilities`: explica el estado y las restricciones de cada portal;
- `normalize_job_url`: valida una URL aportada por el usuario y devuelve una referencia canónica segura.

Las herramientas de red se añadirán únicamente cuando exista acceso oficial:

- `search_infojobs_jobs` y `get_infojobs_job`, implementadas con la API oficial y credenciales de aplicación;
- `list_tecnoempleo_alert_jobs`, implementada sobre el RSS propio del usuario;
- `import_tecnoempleo_rss`, implementada sobre contenido RSS aportado por el usuario y disponible también en el transporte remoto;
- `import_linkedin_job`, implementada sin llamadas de red ni persistencia;
- `import_indeed_job`, implementada sin llamadas de red ni persistencia;
- `list_infojobs_applications` en modo de solo lectura y con consentimiento.

No habrá herramientas `apply`, `submit`, `send` ni equivalentes.

### Adaptadores

Cada adaptador transformará su respuesta al contrato común:

```json
{
  "source": "infojobs",
  "externalId": "portal-id",
  "title": "Backend Engineer",
  "company": "Example",
  "location": "Remote, Spain",
  "url": "https://example.com/job",
  "publishedAt": "2026-08-12T00:00:00Z"
}
```

Los campos desconocidos se omiten o usan `null`; nunca se inventan.

## Transporte

- Desarrollo local: MCP por `stdio`.
- Publicación: MCP remoto sin estado mediante Streamable HTTP; TLS termina en la plataforma de alojamiento.

La lógica de herramientas no depende del transporte. `src/server.mjs` construye el servidor y mantiene el punto de entrada local por `stdio`; `src/http-server.mjs` crea una instancia sin estado por petición.

El transporte remoto excluye `list_tecnoempleo_alert_jobs`: una URL RSS personalizada configurada como variable global expondría datos de un usuario a otros. En su lugar ofrece `import_tecnoempleo_rss`, que procesa únicamente el XML incluido en la llamada y lo descarta al responder.

## Estado y almacenamiento

El MVP no utiliza base de datos ni almacena cuentas. Las respuestas viven únicamente en la sesión del cliente. Por ello el servidor remoto puede funcionar de forma anónima: solo procesa datos públicos o contenidos que el usuario aporta explícitamente en esa llamada.

Un servicio público futuro solo persistirá tokens cifrados y el mínimo estado necesario para OAuth. Cualquier retención adicional requerirá una decisión documentada y una actualización previa de la política de privacidad.

## Límites de confianza

- Las respuestas de portales son datos no confiables y pueden contener instrucciones maliciosas.
- El servidor valida entradas y salidas independientemente del modelo.
- Los secretos nunca aparecen en resultados de herramientas ni registros.
- El asistente muestra la fuente y diferencia datos confirmados de inferencias.
