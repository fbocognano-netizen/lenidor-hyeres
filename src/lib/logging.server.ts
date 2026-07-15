import type { Json } from "@/integrations/supabase/types";

type LogLevel = "debug" | "info" | "warning" | "error";

type LogInput = {
  level: LogLevel;
  event: string;
  area?: string;
  message?: string;
  details?: unknown;
  request?: Request;
  url?: string;
  userAgent?: string;
};

const REDACTED_KEY = /(password|secret|token|authorization|cookie|code|key)/i;
const MAX_STRING_LENGTH = 2_000;

function truncate(value: string) {
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
}

function toJson(value: unknown, depth = 0): Json {
  if (value == null) return null;
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncate(value.message),
      stack: value.stack ? truncate(value.stack) : null,
    };
  }
  if (depth > 4) return "[max-depth]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => toJson(item, depth + 1));
  if (typeof value === "object") {
    const output: Record<string, Json> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 80)) {
      output[key] = REDACTED_KEY.test(key) ? "[redacted]" : toJson(item, depth + 1);
    }
    return output;
  }
  return truncate(String(value));
}

async function requestFromContext(): Promise<Request | undefined> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    return getRequest();
  } catch {
    return undefined;
  }
}

export async function logAppEvent(input: LogInput) {
  try {
    const request = input.request ?? (await requestFromContext());
    const url = input.url ?? request?.url ?? null;
    const userAgent = input.userAgent ?? request?.headers.get("user-agent") ?? null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_logs").insert({
      level: input.level,
      event: input.event,
      area: input.area ?? null,
      message: input.message ? truncate(input.message) : null,
      details: toJson(input.details ?? {}),
      url,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[app-log] database insert failed", error.message);
    }
  } catch (error) {
    console.error("[app-log] logging failed", error);
  }
}

export function errorDetails(error: unknown, extra: Record<string, unknown> = {}) {
  return {
    ...extra,
    error: toJson(error),
  };
}
