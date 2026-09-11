import { NextResponse, type NextRequest } from "next/server";
import { getWebsiteByApiKey } from "@/lib/store";
import type { WebsitePublicConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated read-only endpoint a client website fetches at
 * runtime (server-side — never from browser JS, so the key stays out of the
 * client bundle) to pull its contact info, service-area cities, and
 * head/body tag-manager scripts from this app. Gated entirely by a random
 * 256-bit per-site key (see migration 029 / lib/store.ts createWebsite):
 * no key, no match, no data — this row is otherwise unreachable without
 * admin credentials to this app.
 *
 * Pass the key as `Authorization: Bearer <key>` (recommended — keeps it out
 * of URLs/logs) or `?key=<key>` (convenience, e.g. a quick browser check).
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

  const config: WebsitePublicConfig = {
    name: website.name,
    contactEmail: website.contactEmail,
    contactPhone: website.contactPhone,
    contactAddress: website.contactAddress,
    cities: website.cities,
    headScripts: website.headScripts,
    bodyScripts: website.bodyScripts,
  };

  return NextResponse.json(config, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
