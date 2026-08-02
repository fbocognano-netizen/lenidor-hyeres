import { Facebook, Instagram } from "lucide-react";

export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/igershyeres",
  instagram: "https://www.instagram.com/lenidor_hyeres",
} as const;

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a
        href={SOCIAL_LINKS.instagram}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
        aria-label="Instagram Le Nid d'Or Hyères"
      >
        <Instagram className="h-4 w-4" />
        <span>Instagram</span>
      </a>
      <a
        href={SOCIAL_LINKS.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
        aria-label="Facebook Le Nid d'Or Hyères"
      >
        <Facebook className="h-4 w-4" />
        <span>Facebook</span>
      </a>
    </div>
  );
}
