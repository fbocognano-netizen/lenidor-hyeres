import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reserver-en-direct")({
  beforeLoad: () => {
    throw redirect({
      to: "/offres-directes",
      replace: true,
    });
  },
});
