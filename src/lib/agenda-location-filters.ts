export type AgendaLocationFilter = {
  value: string;
  label: string;
  matches: (value: string) => boolean;
};

export type AgendaLocationEvent = {
  city: string | null;
  locationLabel: string | null;
};

export type AgendaLocationOption = {
  value: string;
  label: string;
  matches: (event: AgendaLocationEvent) => boolean;
};

export function normalizeAgendaLocationText(value: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function agendaLocationKey(value: string | null) {
  return normalizeAgendaLocationText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sameAgendaLocation(left: string | null, right: string | null) {
  return agendaLocationKey(left) === agendaLocationKey(right);
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

export function buildAgendaLocationOptions(events: AgendaLocationEvent[]): AgendaLocationOption[] {
  const cityOptions = new Map<string, AgendaLocationOption>();
  const neighborhoodOptions = new Map<string, AgendaLocationOption>();

  for (const event of events) {
    const city = event.city?.trim() || null;
    const locationLabel = event.locationLabel?.trim() || null;

    if (city) {
      const cityKey = agendaLocationKey(city);
      cityOptions.set(cityKey, {
        value: `city:${cityKey}`,
        label: city,
        matches: (candidate) => sameAgendaLocation(candidate.city, city),
      });
    }

    if (locationLabel) {
      const locationKey = agendaLocationKey(locationLabel);
      const cityKey = agendaLocationKey(city);
      const optionKey = cityKey ? `${cityKey}:${locationKey}` : locationKey;

      if (!city || !sameAgendaLocation(city, locationLabel)) {
        neighborhoodOptions.set(optionKey, {
          value: `place:${optionKey}`,
          label: city ? `${city} - ${locationLabel}` : locationLabel,
          matches: (candidate) =>
            sameAgendaLocation(candidate.locationLabel, locationLabel) &&
            (!city || sameAgendaLocation(candidate.city, city)),
        });
      }
    }
  }

  const sortByLabel = (left: AgendaLocationOption, right: AgendaLocationOption) =>
    left.label.localeCompare(right.label, "fr-FR");

  return [
    { value: "all", label: "Tous les lieux", matches: () => true },
    ...Array.from(cityOptions.values()).sort(sortByLabel),
    ...Array.from(neighborhoodOptions.values()).sort(sortByLabel),
  ];
}
