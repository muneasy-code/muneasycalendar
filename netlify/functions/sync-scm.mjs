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

  const url = "https://www.scm-handball.de/match-center/spielplan/";

  const response = await fetch(url, {
    headers: {
      "User-Agent": "muneasy-calendar/1.0"
    }
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({
        error: "SCM-Spielplan konnte nicht geladen werden",
        status: response.status
      }),
      {
        status: response.status,
        headers: { "content-type": "application/json" }
      }
    );
  }

  const html = await response.text();

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/\r/g, "")
    .replace(/\n+/g, "\n")
    .trim();

  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const games = [];

  const datePattern =
    /^(Mo\.|Di\.|Mi\.|Do\.|Fr\.|Sa\.|So\.),\s*(\d{2}\.\d{2}\.\d{4})(?:,\s*(\d{2}:\d{2})\s*Uhr)?$/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(datePattern);

    if (!match) continue;

    const date = match[2];
    const time = match[3] || null;

    const previous = lines.slice(Math.max(0, i - 12), i);

    const clean = previous.filter(
      line =>
        line !== ":" &&
        line !== "Image" &&
        !/^\d+\s*:\s*\d+$/.test(line)
    );

    if (clean.length < 3) continue;

    const awayTeam = clean.at(-1);
    const homeTeam = clean.at(-2);
    const competition = clean.at(-3);

    const isScm =
      /SC Magdeburg/i.test(homeTeam) ||
      /SC Magdeburg/i.test(awayTeam);

    if (!isScm) continue;

    const [day, month, year] = date.split(".");
    const dateIso = `${year}-${month}-${day}`;

    const timeKnown = time && time !== "00:00";

    const startsAt = timeKnown
      ? `${dateIso}T${time}:00+02:00`
      : null;

    const endsAt = timeKnown
      ? new Date(
          new Date(`${dateIso}T${time}:00+02:00`).getTime()
          + 2 * 60 * 60 * 1000
        ).toISOString()
      : null;

    const externalId = [
      "scm",
      year,
      month,
      day,
      homeTeam,
      awayTeam
    ]
      .join("-")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    games.push({
      source_id: "scm",
      external_id: externalId,

      title: `${homeTeam} – ${awayTeam}`,

      competition,
      home_team: homeTeam,
      away_team: awayTeam,

      starts_at: startsAt,
      ends_at: endsAt,

      start_date: !timeKnown ? dateIso : null,
      end_date: !timeKnown
        ? new Date(
            new Date(`${dateIso}T12:00:00`).getTime()
            + 24 * 60 * 60 * 1000
          )
            .toISOString()
            .slice(0, 10)
        : null,

      all_day: !timeKnown,

      status: timeKnown ? "timed" : "scheduled",

      last_synced_at: new Date().toISOString(),
      source_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  const uniqueGames = [
    ...new Map(
      games.map(game => [game.external_id, game])
    ).values()
  ];

  const filteredGames = uniqueGames.filter(
    game => {
      const eventDate =
        game.start_date ||
        game.starts_at?.slice(0, 10);

      return eventDate >= "2026-07-01";
    }
  );

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
      body: JSON.stringify(filteredGames)
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
    JSON.stringify({
      success: true,
      found: filteredGames.length,
      imported: result.length,
      message: "SCM-Spielplan erfolgreich synchronisiert.",
      events: result
    }, null, 2),
    {
      headers: {
        "content-type": "application/json"
      }
    }
  );
};