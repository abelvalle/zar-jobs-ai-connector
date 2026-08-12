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
    status: "blocked-pending-provider-authorization",
    accessMode: "authorized-xml-or-json-feed",
    availableNow: ["url-normalization", "capability-reporting"],
    unavailableNow: ["job-search", "application-status"],
    dependency: "Obtain written authorization for public plugin use and feed credentials.",
    safeNextAction: "Contact Tecnoempleo with the documented public-plugin use case.",
    sources: ["https://www.tecnoempleo.com/api-integraciones.php"]
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
