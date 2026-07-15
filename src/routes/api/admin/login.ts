import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";
import { H3Event, updateSession, clearSession } from "h3-v2";

const COOKIE_NAME = "villa-admin-session";
const MAX_AGE = 60 * 60 * 24 * 14;

function normalize(v: string) {
  return v
    .normalize("NFKC")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/^["']|["']$/g, "");
}

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(normalize(input), "utf8").digest();
  const b = createHash("sha256").update(normalize(expected), "utf8").digest();
  return timingSafeEqual(a, b);
}

function sessionConfig(secret: string) {
  return {
    password: secret,
    name: COOKIE_NAME,
    maxAge: MAX_AGE,
    cookie: {
      httpOnly: true,
      sameSite: "none" as const,
      path: "/",
      secure: true,
      partitioned: true,
    },
  };
}

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
        if (!expected) return json({ ok: false, reason: "not_configured" });
        if (!secret) return json({ ok: false, reason: "session_not_configured" });

        let payload: { code?: string } = {};
        try {
          payload = (await request.json()) as { code?: string };
        } catch {
          return json({ ok: false, reason: "invalid" }, {}, 400);
        }
        const code = typeof payload.code === "string" ? payload.code : "";
        if (!code || !matches(code, expected)) return json({ ok: false, reason: "invalid" });

        const event = new H3Event(request);
        await updateSession(event, sessionConfig(secret), { unlocked: true });
        const cookies = extractSetCookie(event);
        console.info("[admin-login]", "cookies_count", cookies.length, "first", cookies[0]?.slice(0, 60));
        const headers = new Headers({ "content-type": "application/json" });
        for (const c of cookies) headers.append("set-cookie", c);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      },
    },
  },
});
