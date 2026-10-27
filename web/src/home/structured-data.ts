import { homeContent } from "../content/home.ts";
import { githubUrl, linkedinUrl, ownerName, siteName, siteUrl } from "../site.config.ts";

/** Home's JSON-LD: the site and its owner, in one @graph (R6.4). */
export const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, name: siteName, url: `${siteUrl}/` },
    {
      "@type": "Person",
      "@id": `${siteUrl}/#person`,
      name: ownerName,
      jobTitle: homeContent.role,
      url: `${siteUrl}/`,
      sameAs: [linkedinUrl, githubUrl],
    },
  ],
};
