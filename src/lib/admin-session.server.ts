import { createHash, timingSafeEqual } from "node:crypto";

export type AdminSession = { unlocked?: boolean };

export const ADMIN_COOKIE_NAME = "nid-dor-admin-v2";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 14;

export function normalizeAdminCode(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/^["']|["']$/g, "");
}

export function adminCodeMatches(input: string, expected: string) {
  const a = createHash("sha256").update(normalizeAdminCode(input), "utf8").digest();
  const b = createHash("sha256").update(normalizeAdminCode(expected), "utf8").digest();
  return timingSafeEqual(a, b);
}

export function adminSessionConfig(secret: string) {
  return {
    password: secret,
    name: ADMIN_COOKIE_NAME,
    maxAge: ADMIN_SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      sameSite: "none" as const,
      path: "/",
      secure: true,
      partitioned: true,
    },
  };
}

async function currentRequest() {
  const { getRequest } = await import("@tanstack/react-start/server");
  return getRequest();
}

export async function getAdminSessionState(request?: Request) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("La session admin n'est pas configurée.");

  const resolvedRequest = request ?? (await currentRequest());
  const { H3Event, getSession } = await import("h3-v2");
  const event = new H3Event(resolvedRequest);
  const session = await getSession<AdminSession>(event, adminSessionConfig(secret));
  const cookieHeader = resolvedRequest.headers.get("cookie") ?? "";

  return {
    session,
    cookiePresent: cookieHeader.includes(`${ADMIN_COOKIE_NAME}=`),
  };
}
