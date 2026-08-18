# Seguimiento local de candidaturas

El conector puede revisar un tracker que el usuario o el cliente mantiene fuera del plugin. Las herramientas reciben registros en memoria y devuelven métricas, copias actualizadas o un calendario; no crean una base de datos ni modifican archivos o servicios externos.

## Contrato mínimo

Cada registro necesita un identificador estable, empresa, puesto, estado y fecha de creación. Los estados admitidos son `saved`, `preparing`, `ready`, `applied`, `responded`, `interview`, `offer`, `hired`, `rejected`, `withdrawn` y `closed`.

Las fechas usan `YYYY-MM-DD`. El parámetro `asOf` siempre es explícito: así, una misma entrada produce las mismas métricas y el mismo calendario en cualquier máquina y zona horaria.

## Herramientas

- `review_application_tracker` cuenta estados y separa seguimientos vencidos, de hoy, futuros y sin fecha. El embudo solo cuenta evidencia disponible: `appliedAt` demuestra solicitud; un estado actual de entrevista u oferta demuestra las fases siguientes.
- `plan_application_update` aplica cambios explícitos a una copia y devuelve un parche antes/después. Las transiciones atípicas se señalan para revisión, pero no se oculta ni se escribe nada.
- `export_followup_calendar` crea un recurso ICS en memoria con eventos de día completo. Excluye las notas y usa solo identificador, empresa, puesto, estado y próxima fecha.

El cliente puede guardar el `.ics` donde el usuario decida e importarlo manualmente en su calendario. El plugin no se conecta a Google Calendar, Outlook ni otro servicio.

## Privacidad y límites

- Máximo 500 registros por llamada.
- Las notas nunca se incluyen en el calendario.
- Los resultados declaran `stored: false`; la aplicación anfitriona puede conservar su propio historial según su configuración.
- Cambiar un estado a `applied` no significa que el conector haya enviado una candidatura. Todas las herramientas mantienen `submissionPerformed: false` cuando corresponde.
