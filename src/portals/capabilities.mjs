export const PORTALS = ["infojobs", "tecnoempleo", "linkedin"];

const CAPABILITIES = Object.freeze([
  Object.freeze({
    portal: "infojobs",
    status: "implemented-auth-required",
    accessMode: "official-api",
    availableNow: [
      "url-normalization",
      "capability-reporting",
      "job-search",
      "job-detail"
    ],
    unavailableNow: ["application-status", "application-submission"],
    dependency:
      "Register an InfoJobs application and configure its Client ID and Client secret.",
    safeNextAction:
      "Configure INFOJOBS_CLIENT_ID and INFOJOBS_CLIENT_SECRET, then run the live smoke test.",
    sources: [
      "https://developer.infojobs.net/documentation/operation/offer-list-7.xhtml",
      "https://developer.infojobs.net/documentation/operation/offer-get-7.xhtml",
      "https://developer.infojobs.net/documentation/quick-start/index.xhtml"
    ]
  }),
  Object.freeze({
    portal: "tecnoempleo",
    status: "implemented-user-rss-required",
    accessMode: "user-authorized-rss-alert",
    availableNow: [
      "url-normalization",
      "capability-reporting",
      "alert-job-listing"
    ],
    unavailableNow: [
      "general-api-search",
      "application-status",
      "application-submission"
    ],
    dependency:
      "The user must create a Tecnoempleo alert and configure its personalized RSS URL.",
    safeNextAction:
      "Configure TECNOEMPLEO_RSS_URL with the user's own alert feed, then list its jobs.",
    sources: [
      "https://www.tecnoempleo.com/buscar-trabajo/encuentra-ofertas-empleo.php",
      "https://www.tecnoempleo.com/api-integraciones.php"
    ]
  }),
  Object.freeze({
    portal: "linkedin",
    status: "manual-only",
    accessMode: "user-provided-url",
    availableNow: ["url-normalization", "capability-reporting"],
    unavailableNow: ["automated-search", "automated-application", "scraping"],
    dependency: "Direct Talent API access requires LinkedIn approval.",
    safeNextAction: "Ask the user to provide a job URL or review their own alert email.",
    sources: [
      "https://learn.microsoft.com/en-us/linkedin/talent/",
      "https://www.linkedin.com/legal/crawling-terms"
    ]
  })
]);

export function getPortalCapabilities(portal) {
  if (portal === undefined) {
    return CAPABILITIES;
  }

  const capability = CAPABILITIES.find((item) => item.portal === portal);
  if (!capability) {
    throw new TypeError(`Unsupported portal: ${portal}`);
  }

  return [capability];
}
