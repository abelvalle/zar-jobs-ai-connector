# Uso seguro con LinkedIn

LinkedIn no ofrece en su documentación pública una API general para que un plugin de búsqueda de empleo consulte vacantes. Sus APIs Talent están orientadas a partners autorizados, y sus condiciones prohíben el crawling automatizado sin permiso expreso.

Por ello Zar Jobs AI Connector no inicia sesión, navega, busca ni extrae contenido de LinkedIn. La herramienta `import_linkedin_job` trabaja exclusivamente con información que el usuario aporta de forma voluntaria.

## Datos necesarios

- URL de una oferta LinkedIn con identificador numérico;
- título;
- empresa;
- opcionalmente ubicación, modalidad, tipo de contrato, fecha y descripción.

Ejemplo de petición al asistente:

> Importa esta oferta de LinkedIn: URL ..., título Backend Engineer, empresa Example Tech, ubicación España, remoto.

La herramienta elimina parámetros de seguimiento conocidos, conserva el ID de la oferta y devuelve siempre:

```json
{
  "evidence": "user-provided",
  "verificationStatus": "unverified"
}
```

`unverified` significa que los datos se han estructurado correctamente, pero el conector no ha abierto LinkedIn ni ha confirmado que la oferta siga activa. Antes de tomar una decisión, el usuario debe revisar la URL original.

## Capacidades no disponibles

- búsqueda automática de vacantes;
- extracción de resultados o perfiles;
- inicio de sesión o reutilización de cookies;
- envío de candidaturas o mensajes.

Cualquier integración directa futura requerirá autorización verificable de LinkedIn y una revisión previa de alcance, privacidad y condiciones.
