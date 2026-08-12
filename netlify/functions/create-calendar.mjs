export default async (request) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Nur POST erlaubt." }),
      {
        status: 405,
        headers: { "content-type": "application/json" }
      }
    );
  }

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: "Supabase-Konfiguration fehlt." }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }

  const body = await request.json();

  const displayName =
    String(body.name || "").trim() || "Mein Kalender";

  const sources = Array.isArray(body.sources)
    ? [...new Set(body.sources)]
    : [];

  const birthdays = Array.isArray(body.birthdays)
    ? body.birthdays
    : [];

  if (!sources.length && !birthdays.length) {
    return new Response(
      JSON.stringify({
        error: "Mindestens eine Quelle oder ein Geburtstag erforderlich."
      }),
      {
        status: 400,
        headers: { "content-type": "application/json" }
      }
    );
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json"
  };

  // Persönlichen Kalender erzeugen
  const calendarResponse = await fetch(
    `${supabaseUrl}/rest/v1/calendars`,
    {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        display_name: displayName
      })
    }
  );

  const calendarResult = await calendarResponse.json();

  if (!calendarResponse.ok) {
    return new Response(
      JSON.stringify({
        error: "Kalender konnte nicht erstellt werden.",
        details: calendarResult
      }),
      {
        status: calendarResponse.status,
        headers: { "content-type": "application/json" }
      }
    );
  }

  const calendar = calendarResult[0];

  // Ausgewählte Quellen speichern
  if (sources.length) {
    const sourceResponse = await fetch(
      `${supabaseUrl}/rest/v1/calendar_sources`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(
          sources.map(sourceId => ({
            calendar_id: calendar.id,
            source_id: sourceId
          }))
        )
      }
    );

    if (!sourceResponse.ok) {
      const details = await sourceResponse.text();

      return new Response(
        JSON.stringify({
          error: "Kalenderquellen konnten nicht gespeichert werden.",
          details
        }),
        {
          status: sourceResponse.status,
          headers: { "content-type": "application/json" }
        }
      );
    }
  }

  // Geburtstage speichern
  if (birthdays.length) {
    const birthdayRows = birthdays
      .filter(b => b?.name && b?.date)
      .map(b => ({
        calendar_id: calendar.id,
        name: String(b.name).trim(),
        birthday: b.date
      }));

    if (birthdayRows.length) {
      const birthdayResponse = await fetch(
        `${supabaseUrl}/rest/v1/birthdays`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(birthdayRows)
        }
      );

      if (!birthdayResponse.ok) {
        const details = await birthdayResponse.text();

        return new Response(
          JSON.stringify({
            error: "Geburtstage konnten nicht gespeichert werden.",
            details
          }),
          {
            status: birthdayResponse.status,
            headers: { "content-type": "application/json" }
          }
        );
      }
    }
  }

  const siteUrl =
    process.env.URL || "https://muneasycalendar.netlify.app";

  const feedUrl =
    `${siteUrl}/.netlify/functions/calendar-feed?token=${calendar.token}`;

  return new Response(
    JSON.stringify({
      success: true,
      calendar: {
        id: calendar.id,
        token: calendar.token,
        name: calendar.display_name,
        feed_url: feedUrl
      }
    }, null, 2),
    {
      headers: {
        "content-type": "application/json"
      }
    }
  );
};