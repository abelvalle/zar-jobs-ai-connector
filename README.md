# Zar Jobs AI Connector

Conector local y de solo lectura para buscar o importar ofertas de empleo desde asistentes de IA.

> Installable GitHub plugin for Codex, ChatGPT desktop, Claude Code and compatible MCP clients.

## Estado

La versión 0.7.0 se distribuye directamente desde este repositorio público como marketplace de Codex y Claude Code. El cliente de IA inicia un proceso MCP local por `stdio` cuando lo necesita y lo cierra al terminar.

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

- `get_portal_capabilities`: explica el acceso disponible y sus límites.
- `normalize_job_url`: valida una URL sin abrirla, elimina seguimiento conocido e identifica el portal.
- `search_infojobs_jobs`: busca ofertas con la API oficial de InfoJobs.
- `get_infojobs_job`: obtiene el detalle público de una oferta de InfoJobs.
- `list_tecnoempleo_alert_jobs`: lee el RSS de una alerta propia configurada localmente.
- `import_tecnoempleo_rss`: procesa en memoria el XML que aporta el usuario.
- `import_linkedin_job`: estructura una oferta aportada por el usuario y la marca `unverified`.
- `import_indeed_job`: estructura una oferta aportada por el usuario y la marca `unverified`.

El proyecto nunca envía candidaturas, mensajes o cambios de perfil.

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

## Documentación

- [Instalación](docs/INSTALLATION.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Tecnología](docs/TECHNOLOGY.md)
- [Roadmap e hitos](docs/ROADMAP.md)
- [Capacidades por portal](docs/PORTAL-CAPABILITIES.md)
- [Configuración de InfoJobs](docs/INFOJOBS-SETUP.md)
- [Configuración de Tecnoempleo](docs/TECNOEMPLEO-SETUP.md)
- [Uso seguro con LinkedIn](docs/LINKEDIN-USAGE.md)
- [Uso seguro con Indeed](docs/INDEED-USAGE.md)
- [Seguridad y privacidad](docs/SECURITY-PRIVACY.md)
- [Soporte](SUPPORT.md)
- [Contribución y ramas](CONTRIBUTING.md)

## Ramas

- `develop`: desarrollo activo.
- `master`: último hito estable y verificado.

## Licencia

[MIT](LICENSE)
