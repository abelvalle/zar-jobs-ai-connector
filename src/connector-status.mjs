export const CONNECTOR_VERSION = "1.4.0";

export function getConnectorStatus(env = process.env) {
  const infoJobsMissing = missingVariables(env, [
    "INFOJOBS_CLIENT_ID",
    "INFOJOBS_CLIENT_SECRET",
  ]);
  const tecnoempleoMissing = missingVariables(env, ["TECNOEMPLEO_RSS_URL"]);

  return {
    connector: {
      version: CONNECTOR_VERSION,
      transport: "stdio",
      operational: true,
    },
    portals: [
      {
        portal: "infojobs",
        status: infoJobsMissing.length === 0 ? "ready" : "limited",
        availableMode:
          infoJobsMissing.length === 0 ? "official-api" : "url-normalization-only",
        missingVariables: infoJobsMissing,
        safeNextAction:
          infoJobsMissing.length === 0
            ? "Use search_infojobs_jobs or get_infojobs_job."
            : "Configure the missing InfoJobs application variables before using its API tools.",
      },
      {
        portal: "tecnoempleo",
        status: tecnoempleoMissing.length === 0 ? "ready" : "limited",
        availableMode:
          tecnoempleoMissing.length === 0 ? "rss-url" : "rss-content-import",
        missingVariables: tecnoempleoMissing,
        safeNextAction:
          tecnoempleoMissing.length === 0
            ? "Use list_tecnoempleo_alert_jobs."
            : "Use import_tecnoempleo_rss with your own XML, or configure TECNOEMPLEO_RSS_URL.",
      },
      manualPortalStatus("linkedin"),
      manualPortalStatus("indeed"),
    ],
  };
}

function missingVariables(env, names) {
  return names.filter((name) => !hasValue(env[name]));
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function manualPortalStatus(portal) {
  return {
    portal,
    status: "ready",
    availableMode: "manual-import",
    missingVariables: [],
    safeNextAction: `Provide the ${portal} job URL, title, and company, then verify the original posting.`,
  };
}
