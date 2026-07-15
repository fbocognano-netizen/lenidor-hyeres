import { createFileRoute } from "@tanstack/react-router";
import { H3Event, updateSession } from "h3-v2";

import { adminCodeMatches, adminSessionConfig } from "@/lib/admin-session.server";
import { errorDetails, logAppEvent } from "@/lib/logging.server";

function json(body: unknown, extraHeaders: Record<string, string> = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

function extractSetCookie(event: H3Event): string[] {
  const h = event.res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") return h.getSetCookie();
  const v = h.get("set-cookie");
  return v ? [v] : [];
}

export const Route = createFileRoute("/api/admin/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.ADMIN_ACCESS_CODE;
        const secret = process.env.ADMIN_SESSION_SECRET;
        await logAppEvent({
          level: "info",
          event: "admin_login_started",
          area: "admin",
          message: "Tentative de connexion admin reçue.",
          request,
          details: {
            accessCodeConfigured: Boolean(expected),
            sessionSecretConfigured: Boolean(secret),
          },
        });
        if (!expected) {
          await logAppEvent({
            level: "error",
            event: "admin_login_missing_access_code",
            area: "admin",
            message: "ADMIN_ACCESS_CODE n'est pas configuré.",
            request,
          });
          return json({ ok: false, reason: "not_configured" });
        }
        if (!secret) {
          await logAppEvent({
            level: "error",
            event: "admin_login_missing_session_secret",
            area: "admin",
            message: "ADMIN_SESSION_SECRET n'est pas configuré.",
            request,
          });
          return json({ ok: false, reason: "session_not_configured" });
        }

        let payload: { code?: string } = {};
        try {
          payload = (await request.json()) as { code?: string };
        } catch (error) {
          await logAppEvent({
            level: "warning",
            event: "admin_login_invalid_payload",
            area: "admin",
            message: "Payload de connexion admin invalide.",
            request,
            details: errorDetails(error),
          });
          return json({ ok: false, reason: "invalid" }, {}, 400);
        }
        const code = typeof payload.code === "string" ? payload.code : "";
        if (!code || !adminCodeMatches(code, expected)) {
          await logAppEvent({
            level: "warning",
            event: "admin_login_invalid_code",
            area: "admin",
            message: "Code admin incorrect.",
            request,
            details: { codeLength: code.length },
          });
          return json({ ok: false, reason: "invalid" });
        }

        try {
          const event = new H3Event(request);
          await updateSession(event, adminSessionConfig(secret), { unlocked: true });
          const cookies = extractSetCookie(event);

          await logAppEvent({
            level: cookies.length > 0 ? "info" : "error",
            event: cookies.length > 0 ? "admin_login_cookie_created" : "admin_login_cookie_missing",
            area: "admin",
            message: cookies.length > 0
              ? "Code admin valide et cookie de session généré."
              : "Code admin valide mais aucun cookie de session n'a été généré.",
            request,
            details: { setCookieCount: cookies.length },
          });

          if (cookies.length === 0) return json({ ok: false, reason: "session_error" });

          const headers = new Headers({ "content-type": "application/json" });
          for (const c of cookies) headers.append("set-cookie", c);
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
        } catch (error) {
          await logAppEvent({
            level: "error",
            event: "admin_login_session_update_failed",
            area: "admin",
            message: "Création de session admin impossible.",
            request,
            details: errorDetails(error),
          });
          return json({ ok: false, reason: "session_error" }, {}, 500);
        }
      },
    },
  },
});
