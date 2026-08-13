export const PORTALS = ["infojobs", "tecnoempleo", "linkedin", "indeed"];

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
      "alert-job-listing",
      "rss-content-import"
    ],
    unavailableNow: [
      "automated-general-search",
      "application-status",
      "application-submission"
    ],
    dependency:
      "The user must create a Tecnoempleo alert and either configure its personalized RSS URL or provide its RSS content to the local tool.",
    safeNextAction:
      "Use import_tecnoempleo_rss with your XML, or configure TECNOEMPLEO_RSS_URL, then review the source links.",
    sources: [
      "https://www.tecnoempleo.com/buscar-trabajo/encuentra-ofertas-empleo.php"
    ]
  }),
  Object.freeze({
    portal: "linkedin",
    status: "implemented-manual-import",
    accessMode: "user-provided-job",
    availableNow: [
      "url-normalization",
      "capability-reporting",
      "manual-job-import"
    ],
    unavailableNow: ["automated-search", "automated-application", "scraping"],
    dependency: "Direct Talent API access requires LinkedIn approval.",
    safeNextAction:
      "Ask the user to provide a LinkedIn job URL plus title and company, then verify the original posting manually.",
    sources: [
      "https://learn.microsoft.com/en-us/linkedin/talent/",
      "https://www.linkedin.com/legal/crawling-terms"
    ]
  }),
  Object.freeze({
    portal: "indeed",
    status: "implemented-manual-import",
    accessMode: "user-provided-job",
    availableNow: ["url-normalization", "capability-reporting", "manual-job-import"],
    unavailableNow: ["automated-search", "automated-application", "scraping"],
    dependency: "The user must provide an Indeed viewjob URL plus the visible job fields.",
    safeNextAction:
      "Import the user-provided Indeed job, then verify that the original posting is active.",
    sources: ["https://docs.indeed.com/", "https://www.indeed.com/legal"]
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
