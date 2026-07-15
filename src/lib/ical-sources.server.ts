// Server-only helper to load configurable iCal sources from the database,
// with a hardcoded fallback so the calendar keeps working if the table
// is empty or the DB read fails.

export type IcalSource = { id?: string; label: string; url: string; enabled?: boolean };

const FALLBACK_SOURCES: IcalSource[] = [
  {
    label: "Airbnb",
    url:
      process.env.AIRBNB_ICAL_URL ??
      "https://www.airbnb.fr/calendar/ical/1526120631746320177.ics?t=774616f2469d47389d29985aecbbead5",
    enabled: true,
  },
  {
    label: "Abritel",
    url:
      process.env.ABRITEL_ICAL_URL ??
      "https://www.abritel.fr/icalendar/cf2da2a6506e4b74b4663602f0dd9803.ics?nonTentative&includeTentative=false",
    enabled: true,
  },
  {
    label: "Gens de Confiance",
    url:
      process.env.GENSDECONFIANCE_ICAL_URL ??
      "https://static.gensdeconfiance.com/calendars/1a32a175-a6ff-4fdb-a0f9-a04876a2c4d5.calendar.ics",
    enabled: true,
  },
];

export async function getActiveIcalSources(): Promise<IcalSource[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ical_sources")
      .select("id, label, url, enabled")
      .eq("enabled", true)
      .order("label", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return FALLBACK_SOURCES;
    return data.map((row) => ({
      id: row.id,
      label: row.label,
      url: row.url,
      enabled: row.enabled,
    }));
  } catch (e) {
    console.error("ical_sources DB read failed, using fallback", e);
    return FALLBACK_SOURCES;
  }
}
