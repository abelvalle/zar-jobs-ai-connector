# MCP remoto

La versión remota expone un servidor MCP sin estado mediante Streamable HTTP. Está pensada para desplegarse detrás de HTTPS y no guarda cuentas, tokens, ofertas ni entradas de herramientas.

## Superficie pública

El endpoint `/mcp` ofrece únicamente herramientas que no requieren secretos de usuario ni llamadas a portales:

- `get_portal_capabilities`;
- `normalize_job_url`;
- `import_tecnoempleo_rss`;
- `import_linkedin_job`.

Las herramientas InfoJobs y `list_tecnoempleo_alert_jobs` permanecen en el servidor local por `stdio`. Esto evita exponer una credencial de aplicación a abuso anónimo o compartir por error una URL RSS privada entre usuarios.

## Ejecución local del transporte HTTP

```powershell
npm.cmd ci
npm.cmd run start:http
```

Por defecto escucha en `127.0.0.1:3000`. Comprobaciones:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
npx.cmd @modelcontextprotocol/inspector http://127.0.0.1:3000/mcp
```

## Contenedor

```powershell
docker build -t zar-jobs-ai-connector:0.5.0 .
docker run --rm -p 3000:3000 `
  -e ALLOWED_HOSTS=localhost,127.0.0.1 `
  zar-jobs-ai-connector:0.5.0
```

En producción:

- termina TLS en el hosting o proxy y publica exactamente `https://<dominio>/mcp`;
- configura `ALLOWED_HOSTS` con los hostnames públicos separados por comas;
- aplica límite de tasa y tamaño en el borde; el proceso limita además cada petición a 3 MB;
- no habilites logs de cuerpos, cabeceras de autorización ni resultados de herramientas;
- usa al menos dos instancias o reinicio automático y monitoriza únicamente `/health`;
- ejecuta las evaluaciones de [PUBLICATION-EVALS.md](PUBLICATION-EVALS.md) contra el endpoint final.

`HOST=0.0.0.0` no arranca sin `ALLOWED_HOSTS`. El health check no revela configuración ni estado de portales.

## Autenticación

La superficie pública actual puede ser anónima porque procesa únicamente datos públicos o contenido aportado voluntariamente en esa llamada y no lo conserva. Si una versión futura almacena URLs RSS, accede a cuentas o conserva tokens por usuario, deberá implementar OAuth 2.1 para MCP antes de activarse.

Referencias oficiales:

- [Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [MCP server concepts](https://developers.openai.com/plugins/concepts/mcp-server)
- [Authentication](https://developers.openai.com/plugins/build/auth)
