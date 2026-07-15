import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const clientLogSchema = z.object({
  level: z.enum(["debug", "info", "warning", "error"]).default("error"),
  event: z.string().min(1).max(120),
  area: z.string().max(80).optional(),
  message: z.string().max(2000).optional(),
  details: z.unknown().optional(),
  url: z.string().max(2000).optional(),
  userAgent: z.string().max(1000).optional(),
});

export const Route = createFileRoute("/api/app-log")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = clientLogSchema.parse(await request.json());
          const { logAppEvent } = await import("@/lib/logging.server");
          await logAppEvent({
            level: payload.level,
            event: payload.event,
            area: payload.area ?? "client",
            message: payload.message,
            details: payload.details,
            request,
            url: payload.url,
            userAgent: payload.userAgent,
          });
        } catch (error) {
          console.error("client log route failed", error);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
