import dns from "node:dns";

let configured = false;

/**
 * Reduces Atlas `mongodb+srv` failures (`querySrv` / `queryTxt` ESERVFAIL) on networks
 * with flaky ISP DNS (common on Windows). Idempotent per process.
 *
 * - Opt out: `MONGO_SKIP_DNS_TWEAK=1`
 * - Custom resolvers: `MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1`
 * - Force public DNS on any OS: `MONGO_USE_PUBLIC_DNS=1` (Windows does this by default)
 */
export function configureMongoDns(): void {
  if (configured) return;
  configured = true;

  if (process.env.MONGO_SKIP_DNS_TWEAK === "1" || process.env.MONGO_SKIP_DNS_TWEAK === "true") {
    return;
  }

  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    /* Node < 17 */
  }

  const custom =
    process.env.MONGO_DNS_SERVERS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (custom.length > 0) {
    try {
      dns.setServers(custom);
    } catch {
      /* ignore */
    }
    return;
  }

  const forcePublic =
    process.platform === "win32" || process.env.MONGO_USE_PUBLIC_DNS === "1";

  if (!forcePublic) return;

  try {
    const orig = dns.getServers().filter(Boolean);
    dns.setServers(orig.length > 0 ? ["8.8.8.8", "1.1.1.1", ...orig] : ["8.8.8.8", "1.1.1.1"]);
  } catch {
    /* ignore */
  }
}
