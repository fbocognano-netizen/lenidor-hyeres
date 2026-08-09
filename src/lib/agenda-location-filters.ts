export type AgendaLocationFilter = {
  value: string;
  label: string;
  matches: (value: string) => boolean;
};

export function normalizeAgendaLocationText(value: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export const LOCATION_FILTERS = [
  { value: "all", label: "Tous les lieux", matches: () => true },
  {
    value: "hyeres-centre",
    label: "Hyères centre-ville",
    matches: (value: string) => /centre|hyeres ville/i.test(value),
  },
  {
    value: "hyeres-port",
    label: "Hyères port",
    matches: (value: string) =>
      /^(port|port de hyeres|port d'hyeres|hyeres les palmiers)$/i.test(value.trim()),
  },
  {
    value: "capte",
    label: "La Capte",
    matches: (value: string) => /capte|presqu'ile de giens|presquile de giens/i.test(value),
  },
  {
    value: "giens",
    label: "Presqu'île de Giens",
    matches: (value: string) =>
      /giens|tour fondue|plage d'almanarre|plage de l'almanarre|almanarre/i.test(value),
  },
  {
    value: "porquerolles",
    label: "Porquerolles",
    matches: (value: string) => /porquerolles/i.test(value),
  },
  {
    value: "port-cros",
    label: "Port-Cros",
    matches: (value: string) => /port[- ]cros/i.test(value),
  },
  {
    value: "alentours",
    label: "Hyères et alentours",
    matches: (value: string) => /toulon|la londe|bormes|le lavandou|var|alentour/i.test(value),
  },
  {
    value: "ayguade",
    label: "L'Ayguade",
    matches: (value: string) => /ayguade/i.test(value),
  },
] as const satisfies readonly AgendaLocationFilter[];

export const SORTED_LOCATION_FILTERS = [
  LOCATION_FILTERS[0],
  ...LOCATION_FILTERS.slice(1).sort((left, right) =>
    left.label.localeCompare(right.label, "fr-FR"),
  ),
];
