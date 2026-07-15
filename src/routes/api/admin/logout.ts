import { createFileRoute } from "@tanstack/react-router";
import { H3Event, clearSession } from "h3-v2";

import { ADMIN_COOKIE_NAME, adminSessionConfig } from "@/lib/admin-session.server";
import { errorDetails, logAppEvent } from "@/lib/logging.server";

function extractSetCookie(event: H3Event): string[] {
  const h = event.res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") return h.getSetCookie();
  const v = h.get("set-cookie");
  return v ? [v] : [];
}

export const Route = createFileRoute("/api/admin/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.ADMIN_SESSION_SECRET ?? "x".repeat(32);
        try {
          const event = new H3Event(request);
          await clearSession(event, adminSessionConfig(secret));
          const cookies = extractSetCookie(event);
          const headers = new Headers({ "content-type": "application/json" });
          for (const c of cookies) headers.append("set-cookie", c);
          await logAppEvent({
            level: "info",
            event: "admin_logout",
            area: "admin",
            message: "Session admin verrouillée.",
            request,
            details: { setCookieCount: cookies.length, cookieName: ADMIN_COOKIE_NAME },
          });
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
        } catch (error) {
          await logAppEvent({
            level: "error",
            event: "admin_logout_failed",
            area: "admin",
            message: "Déconnexion admin impossible.",
            request,
            details: errorDetails(error),
          });
          return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { "content-type": "application/json" } });
        }
      },
    },
  },
});
