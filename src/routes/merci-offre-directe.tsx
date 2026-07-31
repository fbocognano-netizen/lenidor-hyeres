import { createFileRoute } from "@tanstack/react-router";

import { ThankYouPage } from "@/components/crm/thank-you-page";
import { SITE_URL } from "@/lib/blog";

const PAGE_PATH = "/merci-offre-directe";

export const Route = createFileRoute("/merci-offre-directe")({
  head: () => ({
    meta: [
      { title: "Merci | Offre directe Le Nid d'Or" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}${PAGE_PATH}` }],
  }),
  component: MerciOffreDirectePage,
});

function MerciOffreDirectePage() {
  return (
    <ThankYouPage
      eyebrow="Offre directe"
      title="Votre demande est bien enregistrée"
      text="Vous recevrez les informations utiles pour préparer votre séjour au Nid d'Or en direct, sans frais de plateforme."
    />
  );
}
