export default async () => {
  const footballToken = process.env.FOOTBALL_DATA_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!footballToken || !supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({
        error: "Eine Environment Variable fehlt."
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }

  // Bundesliga-Spielplan laden
  const response = await fetch(
    "https://api.football-data.org/v4/competitions/BL1/matches",
    {
      headers: {
        "X-Auth-Token": footballToken
      }
    }
  );

  if (!response.ok) {
    return new Response(
      JSON.stringify({
        error: "football-data.org Fehler",
        status: response.status
      }),
      {
        status: response.status,
        headers: { "content-type": "application/json" }
      }
    );
  }

  const data = await response.json();

  const teams = {
    "SV Werder Bremen": "werder",
    "Borussia Mönchengladbach": "gladbach"
  };

  // Nur Spiele unserer Teams
  const matches = data.matches.filter(match =>
    teams[match.homeTeam.name] ||
    teams[match.awayTeam.name]
  );

  const events = matches.map(match => {
    const sourceId =
      teams[match.homeTeam.name] ||
      teams[match.awayTeam.name];

    return {
      source_id: sourceId,
      external_id: `football-data-${match.id}`,

      title:
        `${match.homeTeam.name} – ${match.awayTeam.name}`,

      starts_at: match.utcDate,
      ends_at: new Date(
        new Date(match.utcDate).getTime() + 2 * 60 * 60 * 1000
      ).toISOString(),

      all_day: false,

      competition: "Bundesliga",
      home_team: match.homeTeam.name,
      away_team: match.awayTeam.name,

      status: match.status?.toLowerCase() || "scheduled",

      source_updated_at:
        match.lastUpdated || new Date().toISOString(),

      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  // Nach Supabase schreiben
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
    JSON.stringify({
      success: true,
      imported: events.length,
      events: result
    }, null, 2),
    {
      headers: {
        "content-type": "application/json"
      }
    }
  );
};