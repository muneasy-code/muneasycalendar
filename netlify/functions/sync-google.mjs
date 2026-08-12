function googleHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
}

function supabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`
  };
}

function addOneDay(dateString) {
  const d = new Date(`${dateString}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function toGoogleEvent(event) {
  const body = {
    summary: event.title,
    location: event.location || undefined,
    description: event.competition
      ? `${event.competition}\n\nSynchronisiert von muneasy calendar`
      : "Synchronisiert von muneasy calendar",
    extendedProperties: {
      private: {
        muneasyManaged: "1",
        muneasyKey: `event:${event.id}`
      }
    }
  };

  if (event.all_day) {
    body.start = { date: event.start_date };
    body.end = { date: event.end_date || addOneDay(event.start_date) };
  } else {
    body.start = { dateTime: event.starts_at, timeZone: "Europe/Berlin" };
    body.end = { dateTime: event.ends_at, timeZone: "Europe/Berlin" };
  }
  return body;
}

function toGoogleBirthday(birthday) {
  const [, month, day] = birthday.birthday.split("-");
  const startDate = `2000-${month}-${day}`;
  return {
    summary: `🎂 ${birthday.name}`,
    description: "Geburtstag · muneasy calendar",
    start: { date: startDate },
    end: { date: addOneDay(startDate) },
    recurrence: ["RRULE:FREQ=YEARLY"],
    extendedProperties: {
      private: {
        muneasyManaged: "1",
        muneasyKey: `birthday:${birthday.id}`
      }
    }
  };
}

async function refreshGoogleAccessToken(refreshToken, clientId, clientSecret) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Google Token Refresh fehlgeschlagen: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function getAllGoogleEvents(calendarId, accessToken) {
  const items = [];
  let pageToken = null;
  do {
    const params = new URLSearchParams({
      maxResults: "2500",
      showDeleted: "false",
      singleEvents: "false"
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: googleHeaders(accessToken) }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(`Google Events konnten nicht geladen werden: ${JSON.stringify(data)}`);
    items.push(...(data.items || []));
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return items;
}

async function insertGoogleEvent(calendarId, accessToken, body) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", headers: googleHeaders(accessToken), body: JSON.stringify(body) }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`Google Event INSERT fehlgeschlagen: ${JSON.stringify(data)}`);
  return data;
}

async function updateGoogleEvent(calendarId, googleEventId, accessToken, body) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    { method: "PUT", headers: googleHeaders(accessToken), body: JSON.stringify(body) }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(`Google Event UPDATE fehlgeschlagen: ${JSON.stringify(data)}`);
  return data;
}

async function deleteGoogleEvent(calendarId, googleEventId, accessToken) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Google Event DELETE fehlgeschlagen: ${response.status} ${text}`);
  }
}

export default async (request) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const shouldReturn = url.searchParams.get("return") === "1";
  const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" }
  });

  try {
    if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
      return json({ error: "Server-Konfiguration unvollständig." }, 500);
    }
    if (!token) return json({ error: "Kalender-Token fehlt." }, 400);

    const sbHeaders = supabaseHeaders(supabaseKey);
    const calendarResponse = await fetch(
      `${supabaseUrl}/rest/v1/calendars?token=eq.${encodeURIComponent(token)}&select=*`,
      { headers: sbHeaders }
    );
    const calendars = await calendarResponse.json();
    if (!calendarResponse.ok || !calendars.length) {
      return json({ error: "muneasy Kalender nicht gefunden." }, 404);
    }
    const calendar = calendars[0];
    if (!calendar.google_calendar_id || !calendar.google_refresh_token) {
      return json({ error: "Google Kalender ist noch nicht vollständig verbunden." }, 400);
    }

    const accessToken = await refreshGoogleAccessToken(
      calendar.google_refresh_token, clientId, clientSecret
    );

    const sourcesResponse = await fetch(
      `${supabaseUrl}/rest/v1/calendar_sources?calendar_id=eq.${calendar.id}&select=source_id`,
      { headers: sbHeaders }
    );
    const sourceRows = await sourcesResponse.json();
    if (!sourcesResponse.ok) throw new Error(`Kalenderquellen konnten nicht geladen werden: ${JSON.stringify(sourceRows)}`);
    const sourceIds = sourceRows.map(row => row.source_id);

    let sourceEvents = [];
    if (sourceIds.length) {
      const inFilter = sourceIds.join(",");
      const eventsResponse = await fetch(
        `${supabaseUrl}/rest/v1/events?source_id=in.(${encodeURIComponent(inFilter)})&select=*&order=created_at.asc`,
        { headers: sbHeaders }
      );
      sourceEvents = await eventsResponse.json();
      if (!eventsResponse.ok) throw new Error(`Events konnten nicht geladen werden: ${JSON.stringify(sourceEvents)}`);
    }

    sourceEvents = sourceEvents.filter(event => {
      if (String(event.status || "").toLowerCase() === "cancelled") return false;
      if (event.all_day) return Boolean(event.start_date);
      return Boolean(event.starts_at && event.ends_at);
    });

    const birthdayResponse = await fetch(
      `${supabaseUrl}/rest/v1/birthdays?calendar_id=eq.${calendar.id}&select=*`,
      { headers: sbHeaders }
    );
    const birthdays = await birthdayResponse.json();
    if (!birthdayResponse.ok) throw new Error(`Geburtstage konnten nicht geladen werden: ${JSON.stringify(birthdays)}`);

    const desired = [
      ...sourceEvents.map(event => ({ key: `event:${event.id}`, body: toGoogleEvent(event) })),
      ...birthdays.map(birthday => ({ key: `birthday:${birthday.id}`, body: toGoogleBirthday(birthday) }))
    ];

    const googleEvents = await getAllGoogleEvents(calendar.google_calendar_id, accessToken);
    const existing = new Map();
    for (const googleEvent of googleEvents) {
      const props = googleEvent.extendedProperties?.private;
      if (props?.muneasyManaged === "1" && props?.muneasyKey) {
        existing.set(props.muneasyKey, googleEvent);
      }
    }

    const desiredKeys = new Set(desired.map(item => item.key));
    let inserted = 0, updated = 0, deleted = 0;

    for (const item of desired) {
      const old = existing.get(item.key);
      if (old) {
        await updateGoogleEvent(calendar.google_calendar_id, old.id, accessToken, item.body);
        updated++;
      } else {
        await insertGoogleEvent(calendar.google_calendar_id, accessToken, item.body);
        inserted++;
      }
    }

    for (const [key, old] of existing) {
      if (!desiredKeys.has(key)) {
        await deleteGoogleEvent(calendar.google_calendar_id, old.id, accessToken);
        deleted++;
      }
    }

    await fetch(
      `${supabaseUrl}/rest/v1/calendars?id=eq.${calendar.id}`,
      {
        method: "PATCH",
        headers: { ...sbHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ google_last_synced_at: new Date().toISOString() })
      }
    ).catch(() => {});

    if (shouldReturn) {
      return Response.redirect(
        `https://muneasycalendar.netlify.app/?google=synced&token=${encodeURIComponent(token)}&inserted=${inserted}&updated=${updated}&deleted=${deleted}`,
        302
      );
    }

    return json({
      success: true,
      calendar: calendar.display_name || "muneasy calendar",
      sources: sourceIds,
      sourceEvents: sourceEvents.length,
      birthdays: birthdays.length,
      inserted,
      updated,
      deleted,
      message: "Google Kalender erfolgreich synchronisiert."
    });
  } catch (error) {
    console.error(error);
    if (shouldReturn) {
      return Response.redirect(
        "https://muneasycalendar.netlify.app/?google=sync-error",
        302
      );
    }
    return json({ success: false, error: error?.message || "Google Sync fehlgeschlagen." }, 500);
  }
};
