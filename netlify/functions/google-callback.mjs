import crypto from "node:crypto";

function decodeBase64url(value) {
  value = value.replace(/-/g, "+").replace(/_/g, "/");

  while (value.length % 4) {
    value += "=";
  }

  return Buffer.from(value, "base64").toString("utf8");
}

function verifyState(state, secret) {
  const [encoded, signature] = String(state || "").split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64url(encoded));

    // State maximal 30 Minuten akzeptieren
    if (
      !payload.token ||
      !payload.ts ||
      Date.now() - payload.ts > 30 * 60 * 1000
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export default async (request) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return Response.redirect(
      "https://muneasycalendar.netlify.app/?google=cancelled",
      302
    );
  }

  const statePayload = verifyState(
    state,
    clientSecret
  );

  if (!statePayload) {
    return new Response(
      "Ungültiger oder abgelaufener OAuth-State.",
      { status: 400 }
    );
  }

  if (!code) {
    return new Response(
      "Google hat keinen Autorisierungscode geliefert.",
      { status: 400 }
    );
  }

  const redirectUri =
    "https://muneasycalendar.netlify.app/.netlify/functions/google-callback";

  // Authorization Code gegen Tokens tauschen
  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    }
  );

  const tokens = await tokenResponse.json();

  if (!tokenResponse.ok) {
    return new Response(
      JSON.stringify(tokens, null, 2),
      {
        status: 500,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }

  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token;

  // persönlichen muneasy-Kalender laden
  const calendarResponse = await fetch(
    `${supabaseUrl}/rest/v1/calendars?token=eq.${encodeURIComponent(
      statePayload.token
    )}&select=*`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    }
  );

  const calendars =
    await calendarResponse.json();

  if (
    !calendarResponse.ok ||
    !calendars.length
  ) {
    return new Response(
      "muneasy Kalender nicht gefunden.",
      { status: 404 }
    );
  }

  const muneasyCalendar = calendars[0];

  // sekundären Google Kalender anlegen
  const googleCalendarResponse =
    await fetch(
      "https://www.googleapis.com/calendar/v3/calendars",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          summary:
            muneasyCalendar.display_name ||
            "muneasy calendar",
          timeZone: "Europe/Berlin"
        })
      }
    );

  const googleCalendar =
    await googleCalendarResponse.json();

  if (!googleCalendarResponse.ok) {
    return new Response(
      JSON.stringify(
        {
          error:
            "Google Kalender konnte nicht erstellt werden.",
          details: googleCalendar
        },
        null,
        2
      ),
      {
        status:
          googleCalendarResponse.status,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }

  // Google-Verbindung speichern
  const updatePayload = {
    google_calendar_id:
      googleCalendar.id,

    google_connected_at:
      new Date().toISOString()
  };

  // refresh_token kommt normalerweise beim ersten
  // Offline-Consent zurück
  if (refreshToken) {
    updatePayload.google_refresh_token =
      refreshToken;
  }

  const updateResponse = await fetch(
    `${supabaseUrl}/rest/v1/calendars?id=eq.${muneasyCalendar.id}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseKey,
        Authorization:
          `Bearer ${supabaseKey}`,
        "Content-Type":
          "application/json",
        Prefer:
          "return=representation"
      },
      body: JSON.stringify(updatePayload)
    }
  );

  if (!updateResponse.ok) {
    return new Response(
      "Google Verbindung konnte nicht gespeichert werden.",
      { status: 500 }
    );
  }

  return Response.redirect(
    `https://muneasycalendar.netlify.app/.netlify/functions/sync-google?token=${encodeURIComponent(
      statePayload.token
    )}&return=1`,
    302
  );
};