export default async () => {
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

  // HTML in normalen Text umwandeln
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

    /*
      Auf der SCM-Seite steht rund um das Datum ungefähr:

      Wettbewerb
      Heimteam
      :
      Auswärtsteam
      Datum
    */

    const previous = lines.slice(Math.max(0, i - 12), i);

    // ":" und Bildreste ignorieren
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

    // Nur Spiele mit SCM
    const isScm =
      /SC Magdeburg/i.test(homeTeam) ||
      /SC Magdeburg/i.test(awayTeam);

    if (!isScm) continue;

    // deutsches Datum -> ISO
    const [day, month, year] = date.split(".");

    const dateIso = `${year}-${month}-${day}`;

    const timeKnown = time && time !== "00:00";

    const startsAt = timeKnown
      ? `${dateIso}T${time}:00+02:00`
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
      external_id: externalId,
      source_id: "scm",

      title: `${homeTeam} – ${awayTeam}`,

      competition,
      home_team: homeTeam,
      away_team: awayTeam,

      date: dateIso,
      time: timeKnown ? time : null,

      starts_at: startsAt,
      all_day: !timeKnown,

      status: timeKnown ? "timed" : "scheduled"
    });
  }

  // Doppelte Treffer entfernen
  const uniqueGames = [
    ...new Map(
      games.map(game => [game.external_id, game])
    ).values()
  ];

  // Nur aktuelle / zukünftige Saisontermine
  const filteredGames = uniqueGames.filter(
    game => game.date >= "2026-07-01"
  );

  return new Response(
    JSON.stringify(
      {
        success: true,
        found: filteredGames.length,
        games: filteredGames
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