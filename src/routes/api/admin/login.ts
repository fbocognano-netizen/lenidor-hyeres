import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";

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

function buildCookie(value: string, secure: boolean) {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
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
          return json({ ok: false, reason: "invalid" }, { status: 400 });
        }
        const code = typeof payload.code === "string" ? payload.code : "";
        if (!code || !matches(code, expected)) {
          return json({ ok: false, reason: "invalid" });
        }

        const { sealSession } = await import("h3-v2");
        const sessionData = {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          data: { unlocked: true },
        };
        const sealed = await sealSession(
          // h3 sealSession signature: (event, config, sessionData)
          // We fake a minimal event since we only need the sealed string
          { req: request, res: new Response() } as unknown as never,
          {
            password: secret,
            name: COOKIE_NAME,
            maxAge: MAX_AGE,
            cookie: { httpOnly: true, sameSite: "lax", path: "/" },
          } as never,
          sessionData as never,
        );

        const secure = new URL(request.url).protocol === "https:";
        return json(
          { ok: true },
          { headers: { "set-cookie": buildCookie(sealed, secure) } },
        );
      },
    },
  },
});
