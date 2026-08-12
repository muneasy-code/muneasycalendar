function esc(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function dateOnly(value) {
  return value.replaceAll("-", "");
}

function dateTime(value) {
  const d = new Date(value);
  const pad = n => String(n).padStart(2, "0");

  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export default async (request) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Kalender-Token fehlt.", {
      status: 400
    });
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`
  };

  // Kalender anhand Token holen
  const calendarResponse = await fetch(
    `${supabaseUrl}/rest/v1/calendars?token=eq.${encodeURIComponent(token)}&select=*`,
    { headers }
  );

  const calendars = await calendarResponse.json();

  if (!calendarResponse.ok || !calendars.length) {
    return new Response("Kalender nicht gefunden.", {
      status: 404
    });
  }

  const calendar = calendars[0];

  // Quellen dieses Kalenders
  const sourceResponse = await fetch(
    `${supabaseUrl}/rest/v1/calendar_sources?calendar_id=eq.${calendar.id}&select=source_id`,
    { headers }
  );

  const sourceRows = await sourceResponse.json();
  const sourceIds = sourceRows.map(row => row.source_id);

  let events = [];

  if (sourceIds.length) {
    const filter = sourceIds
      .map(id => `"${id}"`)
      .join(",");

    const eventsResponse = await fetch(
      `${supabaseUrl}/rest/v1/events?source_id=in.(${encodeURIComponent(filter)})&select=*&order=starts_at.asc`,
      { headers }
    );

    events = await eventsResponse.json();
  }

  // Persönliche Geburtstage
  const birthdayResponse = await fetch(
    `${supabaseUrl}/rest/v1/birthdays?calendar_id=eq.${calendar.id}&select=*`,
    { headers }
  );

  const birthdays = await birthdayResponse.json();

  const now = dateTime(new Date().toISOString());

  const eventBlocks = events.map(event => {
    let dates;

    if (event.all_day) {
      dates =
        `DTSTART;VALUE=DATE:${dateOnly(event.start_date)}\r\n` +
        `DTEND;VALUE=DATE:${dateOnly(event.end_date)}`;
    } else {
      dates =
        `DTSTART:${dateTime(event.starts_at)}\r\n` +
        `DTEND:${dateTime(event.ends_at)}`;
    }

    return [
      "BEGIN:VEVENT",
      `UID:${esc(event.source_id)}-${esc(event.external_id)}@muneasy-calendar`,
      `DTSTAMP:${now}`,
      dates,
      `SUMMARY:${esc(event.title)}`,
      event.location
        ? `LOCATION:${esc(event.location)}`
        : null,
      "END:VEVENT"
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  const birthdayBlocks = birthdays.map(birthday => {
    const [, month, day] = birthday.birthday.split("-");

    // Startjahr ist egal, RRULE macht es jährlich
    const start =
      `2000${month}${day}`;

    return [
      "BEGIN:VEVENT",
      `UID:birthday-${birthday.id}@muneasy-calendar`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      "RRULE:FREQ=YEARLY",
      `SUMMARY:${esc(`🎂 ${birthday.name}`)}`,
      "END:VEVENT"
    ].join("\r\n");
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//muneasy//calendar//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calendar.display_name || "muneasy calendar")}`,
    ...eventBlocks,
    ...birthdayBlocks,
    "END:VCALENDAR"
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition":
        `inline; filename="muneasy-calendar.ics"`,
      "Cache-Control":
        "public, max-age=300"
    }
  });
};