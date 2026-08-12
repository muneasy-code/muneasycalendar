function addDays(dateString, days = 1) {
  const d = new Date(`${dateString}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);

  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function moveDate(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function holidaysForYear(year) {
  const easter = easterSunday(year);

  return [
    ["Neujahr", `${year}-01-01`],
    ["Heilige Drei Könige", `${year}-01-06`],

    ["Karfreitag", isoDate(moveDate(easter, -2))],
    ["Ostermontag", isoDate(moveDate(easter, 1))],

    ["Tag der Arbeit", `${year}-05-01`],
    ["Christi Himmelfahrt", isoDate(moveDate(easter, 39))],
    ["Pfingstmontag", isoDate(moveDate(easter, 50))],

    ["Tag der Deutschen Einheit", `${year}-10-03`],
    ["Reformationstag", `${year}-10-31`],

    ["1. Weihnachtstag", `${year}-12-25`],
    ["2. Weihnachtstag", `${year}-12-26`]
  ];
}

export default async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({
        error: "SUPABASE_URL oder SUPABASE_SECRET_KEY fehlt."
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }

  // Offizielle Ferien Sachsen-Anhalt – Schuljahr 2026/27
  const holidaysSchool = [
    {
      title: "Herbstferien",
      start: "2026-10-19",
      endInclusive: "2026-10-30"
    },
    {
      title: "Weihnachtsferien",
      start: "2026-12-21",
      endInclusive: "2027-01-01"
    },
    {
      title: "Winterferien",
      start: "2027-02-01",
      endInclusive: "2027-02-05"
    },
    {
      title: "Osterferien",
      start: "2027-03-22",
      endInclusive: "2027-03-29"
    },
    {
      title: "Pfingstferien",
      start: "2027-05-17",
      endInclusive: "2027-05-21"
    },
    {
      title: "Sommerferien",
      start: "2027-07-12",
      endInclusive: "2027-08-20"
    }
  ];

  const schoolEvents = holidaysSchool.map(item => ({
    source_id: "ferien_st",

    external_id:
      `ferien-st-${item.start}-${item.title}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),

    title: item.title,

    start_date: item.start,

    // ICS / Datenbank-Ende exklusiv
    end_date: addDays(item.endInclusive),

    starts_at: null,
    ends_at: null,

    all_day: true,
    status: "scheduled",

    competition: null,
    home_team: null,
    away_team: null,

    last_synced_at: new Date().toISOString(),
    source_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const publicHolidayEvents = [
    ...holidaysForYear(2026),
    ...holidaysForYear(2027)
  ].map(([title, date]) => ({
    source_id: "feiertage_st",

    external_id:
      `feiertag-st-${date}-${title}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),

    title,

    start_date: date,
    end_date: addDays(date),

    starts_at: null,
    ends_at: null,

    all_day: true,
    status: "scheduled",

    competition: null,
    home_team: null,
    away_team: null,

    last_synced_at: new Date().toISOString(),
    source_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const events = [
    ...schoolEvents,
    ...publicHolidayEvents
  ];

  const supabaseResponse = await fetch(
    `${supabaseUrl}/rest/v1/events?on_conflict=source_id,external_id`,
    {
      method: "POST",

      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },

      body: JSON.stringify(events)
    }
  );

  const result = await supabaseResponse.json();

  if (!supabaseResponse.ok) {
    return new Response(
      JSON.stringify({
        error: "Supabase Fehler",
        details: result
      }),
      {
        status: supabaseResponse.status,
        headers: { "content-type": "application/json" }
      }
    );
  }

  return new Response(
    JSON.stringify(
      {
        success: true,
        holidays: publicHolidayEvents.length,
        schoolHolidays: schoolEvents.length,
        imported: result.length,
        message: "Ferien und Feiertage erfolgreich synchronisiert.",
        events: result
      },
      null,
      2
    ),
    {
      headers: {
        "content-type": "application/json"
      }
    }
  );
};