# Zar Jobs AI Connector

Conector local para buscar o importar ofertas de empleo y preparar currículums verificables desde asistentes de IA.

> Installable GitHub plugin for Codex, ChatGPT desktop, Claude Code and compatible MCP clients.

## Estado

La versión 1.7.0 se distribuye directamente desde este repositorio público como marketplace de Codex y Claude Code. El cliente de IA inicia un proceso MCP local por `stdio` cuando lo necesita y lo cierra al terminar.

No hay servicio web, endpoint público, Docker, dominio, HTTPS de alojamiento ni base de datos que mantener.

## Instalación

Requisitos: Node.js 22 o superior y Git.

### Codex

```powershell
codex plugin marketplace add abelvalle/zar-jobs-ai-connector --ref master
codex plugin add zar-jobs-ai-connector@zar-jobs
```

### Claude Code

```powershell
claude plugin marketplace add abelvalle/zar-jobs-ai-connector
claude plugin install zar-jobs-ai-connector@zar-jobs
```

Reinicia el cliente o abre una tarea nueva tras instalar. Consulta la [guía completa de instalación](docs/INSTALLATION.md) para ChatGPT de escritorio, actualización, desinstalación y clientes MCP genéricos.

## Portales

| Portal | Capacidad actual | Requisito |
| --- | --- | --- |
| InfoJobs | Búsqueda y detalle mediante API oficial | Credenciales de aplicación en variables de entorno |
| Tecnoempleo | Lectura de RSS de una alerta propia o importación de su XML | URL RSS propia o XML aportado por el usuario |
| LinkedIn | Importación manual de URL y datos visibles | Sin llamadas al portal ni scraping |
| Indeed | Importación manual de URL y datos visibles | Sin llamadas al portal ni scraping |

La matriz completa y sus fuentes están en [docs/PORTAL-CAPABILITIES.md](docs/PORTAL-CAPABILITIES.md).

## Herramientas

- `get_connector_status`: indica qué modos están listos y qué variables faltan, sin devolver valores.
- `get_portal_capabilities`: explica el acceso disponible y sus límites.
- `normalize_job_url`: valida una URL sin abrirla, elimina seguimiento conocido e identifica el portal.
- `search_infojobs_jobs`: busca ofertas con la API oficial de InfoJobs.
- `get_infojobs_job`: obtiene el detalle público de una oferta de InfoJobs.
- `list_tecnoempleo_alert_jobs`: lee el RSS de una alerta propia configurada localmente.
- `import_tecnoempleo_rss`: procesa en memoria el XML que aporta el usuario.
- `import_linkedin_job`: estructura una oferta aportada por el usuario y la marca `unverified`.
- `import_indeed_job`: estructura una oferta aportada por el usuario y la marca `unverified`.
- `review_job_import`: revisa una oferta pegada desde cualquier portal sin abrir su URL y deja todos los campos sin confirmar.
- `fingerprint_jobs`: agrupa solo duplicados exactos mediante huellas deterministas locales.
- `import_job_alert`: normaliza alertas RSS, Atom, JSON, CSV o texto que aporta el usuario.
- `compare_job_snapshots`: muestra altas, bajas, cambios y republicaciones exactas entre dos snapshots.
- `score_job_fit`: puntúa una oferta con reglas fijas y muestra factores, lagunas y bloqueadores.
- `compare_job_fit`: ordena hasta 20 ofertas con las mismas reglas, sin decidir ni solicitar puestos.
- `review_offer_conditions`: verifica salario y condiciones contra citas literales aportadas por el usuario.
- `compare_offer_conditions`: compara hasta 10 ofertas sin mezclar divisas ni bases brutas y netas.
- `review_application_tracker`: calcula métricas y seguimientos desde registros aportados en memoria.
- `analyze_application_funnel`: calcula un embudo descriptivo y segmentos con muestras y límites visibles, sin causalidad ni ranking.
- `plan_application_update`: prepara una copia y un parche revisable sin escribir el tracker.
- `export_followup_calendar`: genera un calendario ICS local sin conectarse a servicios externos.
- `plan_interview`: prepara temas, preguntas y evidencia trazable sin generar respuestas.
- `audit_interview_answer`: revisa afirmaciones, estructura STAR y relevancia literal de un borrador.
- `review_resume_import`: compara un borrador con texto extraído de TXT, PDF o DOCX y deja cada campo pendiente de confirmación.
- `validate_resume`: valida un documento JSON Resume sin guardarlo.
- `review_resume_as_recruiter`: revisa seis dimensiones de primera criba y prioriza mejoras sin fingir un recruiter humano ni predecir contratación.
- `plan_resume_achievement_interview`: detecta logros sin acción, escala o resultado y devuelve preguntas para obtener evidencia real.
- `audit_resume_achievement_rewrite`: bloquea métricas nuevas y conserva la revisión humana de cada redacción propuesta.
- `analyze_job_skill_radar`: compara competencias literales de 2–20 ofertas aportadas con evidencia del CV y conserva las lagunas sin inferirlas.
- `prepare_resume_locale`: localiza etiquetas en seis idiomas sin traducir ni alterar los hechos.
- `prepare_europass_mapping`: crea un borrador trazable para transferencia manual, no un import oficial.
- `build_evidence_bank`: extrae evidencia reutilizable con rutas, cifras y un hash determinista.
- `match_resume_evidence`: relaciona esa evidencia con una oferta y conserva las lagunas.
- `match_resume_to_job`: calcula coincidencias orientativas con una oferta.
- `plan_resume_variant`: prioriza evidencia existente y devuelve rutas trazables para preparar una variante.
- `apply_resume_changes`: crea una variante sin alterar el CV base y conserva origen, antes/después y hashes.
- `compare_resume_versions`: devuelve diferencias de campo, validación y auditoría entre dos versiones.
- `audit_resume_variant`: señala posibles afirmaciones nuevas frente al CV base.
- `check_resume_ats`: evalúa la estructura HTML con reglas offline.
- `render_resume_html`: genera HTML escapado con plantilla `classic`, `compact` o `technical`.
- `render_resume_pdf`: genera el mismo diseño ATS como PDF con texto extraíble y lo devuelve en memoria.
- `render_resume_docx`: genera un DOCX editable, A4 y de una columna con texto extraíble y lo devuelve en memoria.
- `plan_cover_letter`: prepara una carta desde evidencia trazable, sin redactar hechos.
- `plan_screening_answers`: relaciona preguntas de formulario con evidencia y lagunas.
- `audit_application_text`: señala afirmaciones seleccionadas sin respaldo en borradores.
- `prepare_application_kit`: coordina auditorías, nombres de archivo y revisión final, sin enviar nada.
- `audit_resume_privacy`: señala rutas con datos sensibles seleccionados sin devolver sus valores.
- `plan_resume_anonymization`: prepara eliminaciones y seudónimos sin devolver los valores originales.
- `create_anonymous_resume`: crea una copia `contact-safe` o `blind-review` sin modificar el CV base.
- `render_anonymous_resume_bundle`: empaqueta JSON, PDF y DOCX anónimos con checksums y revisión obligatoria.
- `render_application_bundle`: empaqueta PDF, DOCX y borradores en un ZIP con checksums y aprobación final obligatoria.
- `review_portable_workspace`: valida un workspace y muestra redacciones y riesgos sin devolver valores personales.
- `render_portable_workspace`: exporta un workspace versionado como ZIP en memoria, sin secretos ni escritura automática.
- `import_portable_workspace`: verifica e importa ese ZIP en memoria, con consentimiento adicional para el modo completo.

El proyecto nunca envía candidaturas, mensajes o cambios de perfil.

## Prompts y recursos MCP

Los clientes compatibles descubren siete flujos nativos: `review-job`, `review-resume-as-recruiter`, `strengthen-resume-achievements`, `analyze-skills-radar`, `tailor-resume`, `prepare-application` y `prepare-interview`. También pueden leer guías locales de capacidades, privacidad y contrato del CV mediante recursos `zar-jobs://`. Todo se incluye en el paquete y funciona sin servidor ni red. Consulta [docs/MCP-EXPERIENCE.md](docs/MCP-EXPERIENCE.md).

## Currículums

El plugin usa el estándar abierto JSON Resume para crear un CV base y variantes independientes por oferta. Codex, Claude u otro cliente puede extraer el texto de un TXT, PDF o DOCX aportado por el usuario y revisar el borrador campo a campo con `review_resume_import`; el MCP no interpreta ni almacena el binario. Después valida el contenido, aplica cambios explícitos con linaje y hashes, compara cada variante con sus hechos de origen y genera HTML ATS, PDF o DOCX editable con texto extraíble en tres diseños de una columna. Todo se procesa localmente y en memoria.

Las etiquetas de los tres formatos pueden localizarse en seis idiomas sin traducir automáticamente el contenido. También existe un mapeo de revisión para transferencia manual a Europass y un banco de evidencias con rutas y hashes. Consulta [docs/RESUME-INTEROPERABILITY.md](docs/RESUME-INTEROPERABILITY.md).

Estas comprobaciones mejoran la legibilidad para parsers, pero no garantizan superar un ATS o una evaluación de IA externos. Consulta [docs/RESUME-ENGINE.md](docs/RESUME-ENGINE.md).

La revisión recruiter añade una lectura general o dirigida a una oferta con seis dimensiones, fortalezas por rutas y preguntas para descubrir evidencia real. No usa atributos protegidos ni calcula probabilidades de contratación. Consulta [docs/RECRUITER-REVIEW.md](docs/RECRUITER-REVIEW.md).

El coach de evidencia convierte esas preguntas en una entrevista guiada y audita cada nueva redacción contra respuestas confirmadas. No completa métricas por su cuenta. Consulta [docs/EVIDENCE-COACH.md](docs/EVIDENCE-COACH.md).

Skills Radar resume las competencias recurrentes dentro de una muestra de ofertas aportada por el usuario y las contrasta con rutas del CV. No afirma representar el mercado. Consulta [docs/SKILLS-RADAR.md](docs/SKILLS-RADAR.md).

Las cartas y respuestas se planifican y auditan contra el CV base. El kit final puede ser un manifiesto o un ZIP local con PDF, DOCX, borradores opcionales y checksums; nunca envía candidaturas. Consulta [docs/APPLICATION-KIT.md](docs/APPLICATION-KIT.md).

Para revisiones ciegas o compartir con menos datos, el conector puede crear una copia sin contacto y, opcionalmente, seudonimizar organizaciones. Bloquea el bundle si encuentra identificadores directos repetidos en texto libre, pero no promete anonimato. Consulta [docs/ANONYMOUS-RESUME.md](docs/ANONYMOUS-RESUME.md).

La priorización de ofertas es determinista y explicable: cada resultado conserva pesos, coincidencias, datos desconocidos y preferencias bloqueantes. No sustituye la revisión del usuario. Consulta [docs/JOB-RANKING.md](docs/JOB-RANKING.md).

El comparador de condiciones conserva citas literales, normaliza periodos solo con multiplicadores explícitos y separa divisas y bases brutas/netas. No estima impuestos ni decide por el usuario. Consulta [docs/JOB-CONDITIONS.md](docs/JOB-CONDITIONS.md).

La bandeja universal reúne alertas que el usuario ya recibe y compara snapshots sin abrir enlaces ni depender de un portal nuevo. Consulta [docs/JOB-INBOX.md](docs/JOB-INBOX.md).

El seguimiento de candidaturas también es portable: el cliente aporta los registros y puede guardar la copia actualizada o importar un calendario ICS. El MCP no mantiene base de datos ni sincroniza cuentas. Consulta [docs/APPLICATION-TRACKING.md](docs/APPLICATION-TRACKING.md).

La analítica del embudo usa solo fechas y dimensiones aportadas por el usuario, marca datos ausentes y muestras pequeñas, y nunca atribuye un resultado al portal o al CV. Consulta [docs/APPLICATION-ANALYTICS.md](docs/APPLICATION-ANALYTICS.md).

El workspace portable mueve CV, preferencias, ofertas y tracker entre clientes compatibles. Por defecto elimina contacto, notas libres y respuestas; el modo completo requiere consentimiento explícito en exportación e importación. Consulta [docs/PORTABLE-WORKSPACE.md](docs/PORTABLE-WORKSPACE.md).

La preparación de entrevistas parte del CV confirmado: diferencia temas respaldados y lagunas, y audita borradores sin certificar su verdad o calidad. Consulta [docs/INTERVIEW-PREP.md](docs/INTERVIEW-PREP.md).

## Desarrollo

```powershell
git clone https://github.com/abelvalle/zar-jobs-ai-connector.git
Set-Location zar-jobs-ai-connector
npm.cmd ci
npm.cmd run check
npm.cmd test
npm.cmd run validate:plugin
npm.cmd run smoke
npm.cmd run smoke:portable
```

CI repite estas puertas con Node.js 22 en Linux, Windows y macOS. Las dependencias de ejecución están fijadas a versiones exactas para que una etiqueta publicada sea reproducible.

## Documentación

- [Novedades y evidencia de V1.7](docs/RELEASE-V1.7.md)
- [Novedades y evidencia de V1.6](docs/RELEASE-V1.6.md)
- [Novedades y evidencia de V1.5](docs/RELEASE-V1.5.md)
- [Instalación](docs/INSTALLATION.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Tecnología](docs/TECHNOLOGY.md)
- [Roadmap e hitos](docs/ROADMAP.md)
- [Capacidades por portal](docs/PORTAL-CAPABILITIES.md)
- [Configuración de InfoJobs](docs/INFOJOBS-SETUP.md)
- [Configuración de Tecnoempleo](docs/TECNOEMPLEO-SETUP.md)
- [Uso seguro con LinkedIn](docs/LINKEDIN-USAGE.md)
- [Uso seguro con Indeed](docs/INDEED-USAGE.md)
- [Motor de currículums](docs/RESUME-ENGINE.md)
- [Revisión recruiter del CV](docs/RECRUITER-REVIEW.md)
- [Coach de evidencia y logros](docs/EVIDENCE-COACH.md)
- [Skills Radar](docs/SKILLS-RADAR.md)
- [Interoperabilidad y CV multilingüe](docs/RESUME-INTEROPERABILITY.md)
- [Ranking explicable de ofertas](docs/JOB-RANKING.md)
- [Bandeja universal de alertas](docs/JOB-INBOX.md)
- [Seguimiento local de candidaturas](docs/APPLICATION-TRACKING.md)
- [Analítica descriptiva de candidaturas](docs/APPLICATION-ANALYTICS.md)
- [Preparación de entrevistas](docs/INTERVIEW-PREP.md)
- [Seguridad y privacidad](docs/SECURITY-PRIVACY.md)
- [Soporte](SUPPORT.md)
- [Contribución y ramas](CONTRIBUTING.md)

## Ramas

- `develop`: desarrollo activo.
- `master`: último hito estable y verificado.

## Licencia

[MIT](LICENSE)
