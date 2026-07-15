import { createFileRoute } from "@tanstack/react-router";
import { H3Event, clearSession } from "h3-v2";

const COOKIE_NAME = "villa-admin-session";

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
        const event = new H3Event(request);
        await clearSession(event, {
          password: secret,
          name: COOKIE_NAME,
          cookie: { path: "/", httpOnly: true, sameSite: "none", secure: true, partitioned: true },
        });
        const cookies = extractSetCookie(event);
        const headers = new Headers({ "content-type": "application/json" });
        for (const c of cookies) headers.append("set-cookie", c);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      },
    },
  },
});
