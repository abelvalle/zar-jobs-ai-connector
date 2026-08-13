# Configuración de Tecnoempleo

Zar Jobs AI Connector puede leer las ofertas de una alerta RSS personalizada del propio usuario. Tecnoempleo documenta que cada alerta configurada ofrece un canal RSS; este flujo evita automatizar su buscador o utilizar credenciales de candidato.

## 1. Crear la alerta

1. Entra en tu cuenta de Tecnoempleo.
2. Crea una alerta con las palabras clave y filtros que quieras consultar.
3. Copia la URL del canal RSS ofrecido para esa alerta.

La [ayuda oficial para candidatos](https://www.tecnoempleo.com/buscar-trabajo/encuentra-ofertas-empleo.php) describe las alertas personalizadas y sus canales RSS.

## 2. Configurar el entorno

La URL puede contener un identificador privado. No la pegues en un chat, issue o archivo versionado. Para introducirla temporalmente sin mostrarla en PowerShell:

```powershell
$tecnoempleoCredential = Get-Credential -UserName "rss" -Message "Pega la URL RSS en el campo de contraseña"
$env:TECNOEMPLEO_RSS_URL = $tecnoempleoCredential.GetNetworkCredential().Password
```

El conector exige HTTPS, restringe el host a `tecnoempleo.com`, no sigue redirecciones y limita la respuesta a 2 MB.

### Alternativa sin configurar la URL

El usuario puede descargar o copiar el XML de su propio canal y pasarlo a `import_tecnoempleo_rss`. La herramienta local procesa el contenido en memoria, rechaza enlaces externos, devuelve como máximo 50 ofertas y descarta la entrada al finalizar la llamada.

## 3. Verificación en vivo

```powershell
npm.cmd run smoke:tecnoempleo
```

El smoke test solicita como máximo una oferta y solo imprime contadores. No muestra la URL ni el contenido de las ofertas.

Al terminar:

```powershell
Remove-Item Env:TECNOEMPLEO_RSS_URL
Remove-Variable tecnoempleoCredential
```

## Alcance

Las herramientas `list_tecnoempleo_alert_jobs` e `import_tecnoempleo_rss` devuelven hasta 50 elementos y conservan el enlace original. Los elementos ajenos a Tecnoempleo o inválidos se omiten y se cuentan en `diagnostics.skippedItems`.

El proyecto limita deliberadamente Tecnoempleo al RSS personalizado del usuario. No solicitará ni implementará el API general XML/JSON.
