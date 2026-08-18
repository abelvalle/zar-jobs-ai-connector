# Workspace portable

El workspace portable reúne datos que el usuario ya ha confirmado para moverlos entre Codex, Claude y otros clientes MCP sin crear una cuenta ni mantener un servidor.

## Herramientas

- `review_portable_workspace`: valida el contrato, rechaza secretos y muestra recuentos y redacciones sin devolver valores personales.
- `render_portable_workspace`: devuelve un ZIP en memoria con `workspace.json`, `manifest.json` y SHA-256.
- `import_portable_workspace`: verifica estructura, CRC, tamaño, versión y checksum antes de devolver el workspace en memoria.

El cliente decide si guarda el recurso. El MCP nunca escribe en disco, sincroniza ni fusiona datos automáticamente.

## Contrato v1

`schemaVersion` es obligatorio y puede acompañar estas secciones:

- `profile` y `preferences`;
- `baseResume` y hasta 100 `resumeVariants` validados;
- hasta 500 `jobs`, 50 `snapshots` y 500 `applications`;
- hasta 200 entradas de `answerBank`.

El JSON preparado no puede superar 5 MB y el ZIP no puede superar 6 MB. Las claves de contraseñas, tokens, cookies, secretos, autorización o claves privadas se rechazan en cualquier profundidad.

## Privacidad

El modo predeterminado es `redacted`:

- sustituye el nombre del CV por `Candidate`;
- elimina correo, teléfono, URL, imagen, ubicación y perfiles del CV;
- elimina contacto del perfil y notas libres de candidaturas;
- vacía el banco de respuestas.

El modo `full` conserva la información, pero exige `includePersonalData: true` al exportar y `acceptPersonalData: true` al importar. El manifiesto declara el modo y nunca afirma anonimato: empresas, proyectos, fechas o logros todavía pueden identificar a una persona.

## Integridad

El ZIP contiene exactamente dos archivos sin directorios. `manifest.json` registra tamaño y SHA-256 de `workspace.json`. La importación falla si se añade un archivo, cambia el checksum, aparece una versión desconocida o falta el consentimiento del modo completo.
