export default async () => {
  const token = process.env.FOOTBALL_DATA_TOKEN;

  if (!token) {
    return new Response(
      JSON.stringify({ error: "FOOTBALL_DATA_TOKEN fehlt" }),
      { status: 500 }
    );
  }

  const response = await fetch(
    "https://api.football-data.org/v4/competitions/BL1/matches",
    {
      headers: {
        "X-Auth-Token": token
      }
    }
  );

  if (!response.ok) {
    return new Response(
      JSON.stringify({
        error: "football-data.org Fehler",
        status: response.status
      }),
      { status: response.status }
    );
  }

  const data = await response.json();

  const wanted = [
    "SV Werder Bremen",
    "Borussia Mönchengladbach"
  ];

  const matches = data.matches.filter(
    match =>
      wanted.includes(match.homeTeam.name) ||
      wanted.includes(match.awayTeam.name)
  );

  return new Response(
    JSON.stringify(matches, null, 2),
    {
      headers: {
        "content-type": "application/json"
      }
    }
  );
};