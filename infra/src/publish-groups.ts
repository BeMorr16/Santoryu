/**
 * How site files are uploaded (static-hosting design §6). Each group is one BucketDeployment over
 * the same build; `aws s3 sync --delete` only prunes files matching a group's own filters.
 */
export interface PublishGroup {
  id: string;
  /** Applied first, in the AWS CLI's filter order. */
  exclude: string[];
  include?: string[];
  cacheControl: string;
  /** Set where Python's MIME table is wrong (.xml → text/xml, .html without charset). */
  contentType?: string;
  /** S3 user metadata, served as x-amz-meta-* and read by the viewer-response function. */
  metadata: Record<string, string>;
  /** Hashed assets are never pruned, so pages already open keep working after a deploy (R3.4). */
  prune: boolean;
}

const IMMUTABLE = "public, max-age=31536000, immutable";
const REVALIDATE = "public, max-age=0, must-revalidate";
const HTML = "text/html; charset=utf-8";
const SECURITY_TXT = ".well-known/security.txt";

/** The groups in deploy order: `assets` first, `pages` last (it invalidates the cache). */
export function publishGroups(scriptHashes: readonly string[]): PublishGroup[] {
  const csp = { "csp-script-hashes": scriptHashes.join(" ") };
  return [
    {
      id: "assets",
      exclude: ["*"],
      include: ["assets/*"],
      cacheControl: IMMUTABLE,
      metadata: {},
      prune: false,
    },
    {
      id: "not-found",
      exclude: ["*"],
      include: ["404.html"],
      cacheControl: REVALIDATE,
      contentType: HTML,
      metadata: { ...csp, "site-status": "404" },
      prune: true,
    },
    {
      id: "xml",
      exclude: ["*"],
      include: ["*.xml"],
      cacheControl: REVALIDATE,
      contentType: "application/xml",
      metadata: {},
      prune: true,
    },
    {
      id: "other",
      exclude: ["assets/*", "*.html", "*.xml", SECURITY_TXT],
      cacheControl: REVALIDATE,
      metadata: {},
      prune: true,
    },
    {
      // RFC 9116 requires this exact type, and Python's MIME table omits the charset.
      id: "security-txt",
      exclude: ["*"],
      include: [SECURITY_TXT],
      cacheControl: REVALIDATE,
      contentType: "text/plain; charset=utf-8",
      metadata: {},
      prune: true,
    },
    {
      id: "pages",
      exclude: ["*"],
      include: ["index.html", "*/index.html"],
      cacheControl: REVALIDATE,
      contentType: HTML,
      metadata: csp,
      prune: true,
    },
  ];
}
