import { createFileRoute } from "@tanstack/react-router";

import { ThankYouPage } from "@/components/crm/thank-you-page";
import { SITE_URL } from "@/lib/blog";

const PAGE_PATH = "/merci-club-nid-or";

export const Route = createFileRoute("/merci-club-nid-or")({
  head: () => ({
    meta: [{ title: "Merci | Club du Nid d'Or" }, { name: "robots", content: "noindex, follow" }],
    links: [{ rel: "canonical", href: `${SITE_URL}${PAGE_PATH}` }],
  }),
  component: MerciClubPage,
});

function MerciClubPage() {
  return (
    <ThankYouPage
      eyebrow="Club du Nid d'Or"
      title="Bienvenue dans le club"
      text="Votre inscription est bien enregistrée. Gardez ce code : il permettra d'identifier votre demande comme une réservation directe lors de votre prochain échange avec Le Nid d'Or."
      code="NIDOR-DIRECT"
      codeDescription="À rappeler dans votre message ou lors de votre prochaine demande de disponibilités."
    />
  );
}
