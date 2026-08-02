export function AgencyCredit({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      Site conçu et développé par{" "}
      <a
        href="https://overside360.fr/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
      >
        Overside
      </a>
      , agence digitale à Hyères.
    </p>
  );
}
