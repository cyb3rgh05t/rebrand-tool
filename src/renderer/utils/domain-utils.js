import { log } from "./logging.js";

/**
 * Extract subdomain from domain name
 * @param {string} domain Full domain name
 * @returns {string} Extracted subdomain or empty string
 */
export function extractSubdomainFromDomain(domain) {
  if (!domain || !domain.includes(".")) return "";

  // Get root domain from app state
  const rootDomain = window.appState?.rootDomain;
  if (!rootDomain) {
    log.error("Root domain not available in app state");
    return "";
  }

  // Handle case where domain includes the root domain
  if (domain.endsWith(`.${rootDomain}`)) {
    const prefix = domain.slice(0, -(rootDomain.length + 1));
    // If prefix has no dots, it's a direct subdomain
    if (!prefix.includes(".")) {
      return prefix;
    }
    // If prefix has dots (like sub.domain.example.com), take the first part
    return prefix.split(".")[0];
  }

  // Fallback to simpler extraction if domain doesn't match root domain pattern
  const parts = domain.split(".");
  // If it has at least 3 parts (e.g., test.example.com), the first part is the subdomain
  if (parts.length >= 3) {
    return parts[0];
  }

  return "";
}
