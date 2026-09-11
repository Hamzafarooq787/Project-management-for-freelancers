import { NextResponse, type NextRequest } from "next/server";
import { getWebsiteByApiKey, touchWebsiteLastFetched } from "@/lib/store";
import type { WebsitePublicConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated read-only endpoint a client website fetches at
 * runtime (server-side — never from browser JS, so the key stays out of the
 * client bundle) to pull its contact info, service-area cities, head/body
 * tag-manager scripts, and offline status from this app. Gated entirely by
 * a random 256-bit per-domain key (see migration 029/030 / lib/store.ts
 * upsertWebsiteForDomain): no key, no match, no data — this row is
 * otherwise unreachable without admin credentials to this app.
 *
 * Pass the key as `Authorization: Bearer <key>` (recommended — keeps it out
 * of URLs/logs) or `?key=<key>` (convenience, e.g. a quick browser check).
 *
 * Every successful lookup stamps last_fetched_at, which the Domains tab
 * uses to show a "Connected" signal once the live site starts calling this.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerKey = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  const queryKey = request.nextUrl.searchParams.get("key");
  const apiKey = bearerKey || queryKey;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key." }, { status: 401 });
  }

  const website = await getWebsiteByApiKey(apiKey);
  if (!website) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await touchWebsiteLastFetched(website.id);

  const config: WebsitePublicConfig = {
    name: website.name,
    contactEmail: website.contactEmail,
    contactPhone: website.contactPhone,
    contactAddress: website.contactAddress,
    cities: website.cities,
    headScripts: website.headScripts,
    bodyScripts: website.bodyScripts,
    offline: website.isOffline,
  };

  return NextResponse.json(config, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
