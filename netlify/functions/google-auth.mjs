import crypto from "node:crypto";

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export default async (request) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!clientId || !clientSecret) {
    return new Response("Google OAuth ist nicht konfiguriert.", {
      status: 500
    });
  }

  if (!token) {
    return new Response("Kalender-Token fehlt.", {
      status: 400
    });
  }

  const payload = JSON.stringify({
    token,
    ts: Date.now()
  });

  const encoded = base64url(payload);

  const signature = crypto
    .createHmac("sha256", clientSecret)
    .update(encoded)
    .digest("hex");

  const state = `${encoded}.${signature}`;

  const redirectUri =
    "https://muneasycalendar.netlify.app/.netlify/functions/google-callback";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",

    scope:
      "https://www.googleapis.com/auth/calendar.app.created",

    access_type: "offline",
    include_granted_scopes: "true",

    // wichtig für unseren Test:
    // so bekommen wir beim erneuten Verbinden zuverlässig
    // wieder einen Consent-Screen
    prompt: "consent",

    state
  });

  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    302
  );
};