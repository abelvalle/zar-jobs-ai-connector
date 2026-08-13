# Uso seguro con Indeed

La documentación pública de Indeed describe APIs para integraciones autorizadas, especialmente flujos de empleadores y sistemas ATS. Zar Jobs AI Connector no asume que esas APIs permitan una búsqueda general de vacantes para terceros.

La herramienta `import_indeed_job` trabaja exclusivamente con información que el usuario aporta voluntariamente. No inicia sesión, abre la URL, consulta Indeed ni conserva los datos.

## Datos necesarios

- URL HTTPS de una oferta Indeed con ruta `/viewjob` y parámetro `jk`;
- título;
- empresa;
- opcionalmente ubicación, modalidad, tipo de contrato, fecha y descripción.

Ejemplo:

> Importa esta oferta de Indeed: URL ..., título Backend Engineer, empresa Example Tech, ubicación España, remoto.

La herramienta elimina los parámetros adicionales de la URL, conserva únicamente la clave `jk` y devuelve siempre:

```json
{
  "evidence": "user-provided",
  "verificationStatus": "unverified"
}
```

El resultado debe comprobarse en la oferta original antes de tomar una decisión.

## Capacidades no disponibles

- búsqueda automática de vacantes;
- extracción de resultados, perfiles o currículos;
- inicio de sesión o reutilización de cookies;
- envío de candidaturas o mensajes.

Fuentes oficiales: [Indeed Partner Docs](https://docs.indeed.com/) y [Terms of Service](https://www.indeed.com/legal).
