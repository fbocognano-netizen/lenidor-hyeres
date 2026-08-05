import { createFileRoute } from "@tanstack/react-router";

import { agendaSyncResultForLog, synchronizeAgenda } from "@/lib/agenda-sync.server";
import { errorDetails, logAppEvent } from "@/lib/logging.server";

async function hashSecret(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function secretMatches(received: string, expected: string): Promise<boolean> {
  const [receivedHash, expectedHash] = await Promise.all([hashSecret(received), hashSecret(expected)]);
  return receivedHash.length === expectedHash.length && receivedHash.every((byte, index) => byte === expectedHash[index]);
}

export const Route = createFileRoute("/api/internal/agenda/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedSecret = process.env.AGENDA_SYNC_SECRET;
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

        if (!expectedSecret) {
          await logAppEvent({ level: "error", event: "agenda_sync_missing_secret", area: "agenda", message: "AGENDA_SYNC_SECRET n'est pas configuré.", request });
          return Response.json({ ok: false, reason: "not_configured" }, { status: 503 });
        }
        if (!await secretMatches(token, expectedSecret)) {
          await logAppEvent({ level: "warning", event: "agenda_sync_unauthorized", area: "agenda", message: "Tentative de synchronisation non autorisée.", request });
          return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });
        }

        try {
          const result = await synchronizeAgenda();
          await logAppEvent({ level: "info", event: "agenda_sync_completed", area: "agenda", message: "Synchronisation agenda terminée.", request, details: agendaSyncResultForLog(result) });
          return Response.json({ ok: true, ...result });
        } catch (error) {
          await logAppEvent({ level: "error", event: "agenda_sync_failed", area: "agenda", message: "Synchronisation agenda en échec.", request, details: errorDetails(error) });
          return Response.json({ ok: false, reason: "sync_failed" }, { status: 500 });
        }
      },
    },
  },
});
