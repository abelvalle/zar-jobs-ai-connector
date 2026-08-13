# Checklist de publicación pública

## Completado en el repositorio

- [x] servidor MCP Streamable HTTP sin estado;
- [x] endpoint `/health` sin datos sensibles;
- [x] separación entre herramientas públicas y secretos locales;
- [x] imagen Docker reproducible;
- [x] pruebas unitarias, cliente MCP HTTP y smoke por `stdio`;
- [x] siete evaluaciones positivas y cuatro negativas;
- [x] política de privacidad, términos, seguridad y soporte;
- [x] anotaciones de solo lectura en todas las herramientas;
- [x] sin scraping, candidaturas, mensajería ni persistencia.

## Requiere decisiones o cuentas externas

- [ ] elegir hosting y dominio HTTPS estable;
- [ ] configurar `ALLOWED_HOSTS`, límite de tasa, reinicio y monitorización;
- [ ] verificar identidad de desarrollador y permiso `api.apps.write`;
- [ ] completar la ficha, países, iconos definitivos y vídeo de demostración;
- [ ] ejecutar las once evaluaciones contra producción;
- [ ] enviar la URL `/mcp` a revisión de OpenAI;
- [ ] corregir observaciones, obtener aprobación y pulsar publicar.

Seguimiento público: [despliegue HTTPS #1](https://github.com/abelvalle/zar-jobs-ai-connector/issues/1) y [revisión de OpenAI #2](https://github.com/abelvalle/zar-jobs-ai-connector/issues/2).

La aprobación no se puede declarar desde el código. OpenAI exige una URL pública real, identidad verificada y revisión antes de que el complemento aparezca en el directorio: [App review](https://developers.openai.com/plugins/deploy/app-review) y [Submit your app](https://developers.openai.com/plugins/deploy/submission).

## Ampliaciones de proveedor independientes

- LinkedIn: solicitar acceso al programa aplicable antes de añadir cualquier API Talent; sus APIs públicas documentadas no constituyen una búsqueda general de vacantes.

Seguimiento público: [elegibilidad de LinkedIn #4](https://github.com/abelvalle/zar-jobs-ai-connector/issues/4).

Las plantillas y la evidencia necesaria están en [PROVIDER-AUTHORIZATION.md](PROVIDER-AUTHORIZATION.md).
