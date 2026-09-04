import { createFileRoute, redirect } from "@tanstack/react-router";

/** Préserve les anciens liens vers la page de tous les guides. */
export const Route = createFileRoute("/guide")({
  beforeLoad: () => {
    throw redirect({
      to: "/guides-hyeres",
      replace: true,
      statusCode: 301,
    });
  },
});
