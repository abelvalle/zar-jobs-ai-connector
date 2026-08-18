# Bandeja universal de alertas

`import_job_alert` normaliza alertas que el usuario ya posee. Acepta `RSS`, `Atom`, `JSON`, `CSV` y texto con campos etiquetados. No descarga feeds, abre enlaces, lee correo ni contacta portales.

## Formatos

- RSS y Atom: documentos XML completos de hasta 2 MB; se desactivan entidades y se leen campos comunes de entrada.
- JSON: un array o un objeto con un array `jobs`, `items` o `results`.
- CSV: cabecera obligatoria y comillas compatibles con comas o saltos de línea dentro del campo.
- Texto: uno o más bloques separados por una línea en blanco, con líneas como `Title:`, `Company:`, `Location:`, `URL:` y `Description:`.

Los alias habituales en español e inglés se convierten en un contrato común. Título y empresa son obligatorios; las filas incompletas o con URL insegura se omiten y se contabilizan. Se devuelven como máximo 200 ofertas.

Todos los elementos conservan `evidence: user-provided-alert` y `verificationStatus: unverified`. El usuario debe revisar la oferta original antes de puntuarla, adaptar un CV o preparar una candidatura.

## Comparación de snapshots

`compare_job_snapshots` compara dos arrays ya importados. Usa la misma identidad exacta de `fingerprint_jobs`: fuente e identificador, URL normalizada o título/empresa/ubicación. Informa de:

- ofertas añadidas y retiradas;
- cambios en campos seleccionados con hashes de contenido;
- duplicados exactos dentro de cada snapshot;
- posibles republicaciones solo cuando título, empresa y ubicación coinciden exactamente pero cambia la identidad.

No usa coincidencia semántica o difusa. Una oferta parecida no se marca como republicación. Las republicaciones también permanecen en las listas de añadidas y retiradas para conservar el historial completo.
