type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

let clientLoggingInstalled = false;

function errorPayload(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function sendClientLog(event: string, error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window
    .fetch("/api/app-log", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        level: "error",
        event,
        area: "client",
        message: error instanceof Error ? error.message : String(error),
        details: { ...context, error: errorPayload(error) },
        url: window.location.href,
        userAgent: window.navigator.userAgent,
      }),
    })
    .catch(() => undefined);
}

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  sendClientLog("react_error_boundary", error, context);
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}

export function installClientErrorLogging() {
  if (typeof window === "undefined" || clientLoggingInstalled) return;
  clientLoggingInstalled = true;

  window.addEventListener("error", (event) => {
    sendClientLog("window_error", event.error ?? event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    sendClientLog("unhandled_rejection", event.reason);
  });
}
