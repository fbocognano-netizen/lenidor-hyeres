import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getGuideSearchItems, searchGuides } from "@/lib/guide-search";
import { cn } from "@/lib/utils";

export function GuideSearchButton({
  className,
  label = "Rechercher",
}: {
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-sm text-muted-foreground transition hover:border-foreground/40 hover:text-foreground",
          className,
        )}
      >
        <Search className="h-4 w-4" />
        <span>{label}</span>
      </button>
      <GuideSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function GuideSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const items = useMemo(() => getGuideSearchItems(), []);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchGuides(query, items), [items, query]);

  function close() {
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <DialogContent className="top-[8vh] max-h-[86vh] translate-y-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="border-b border-border/70 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="font-display text-2xl">
                Rechercher dans les guides
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                Restaurants, plages, marchés, Porquerolles, parking...
              </DialogDescription>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex. restaurant, Almanarre, Porquerolles..."
              className="h-12 rounded-full pl-10"
            />
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto p-3 sm:p-4">
          {query.trim().length < 2 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Tapez au moins deux lettres pour chercher dans les guides publiés.
            </p>
          ) : results.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Aucun guide ne correspond à cette recherche.
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map((result) => (
                <li key={result.slug}>
                  <a
                    href={result.path}
                    onClick={close}
                    className="block rounded-md border border-border/60 p-4 transition hover:border-primary/40 hover:bg-secondary/50"
                  >
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {result.category}
                    </p>
                    <h3 className="mt-1 font-display text-xl leading-snug">{result.cardTitle}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {result.snippet || result.excerpt}
                    </p>
                    <span className="mt-3 inline-flex text-sm font-medium text-primary">
                      Ouvrir le guide →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">
          Recherche locale dans les guides publiés uniquement.
        </div>
      </DialogContent>
    </Dialog>
  );
}
