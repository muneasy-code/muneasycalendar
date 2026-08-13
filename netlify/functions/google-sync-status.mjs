function supabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`
  };
}

export default async (request) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  const token = new URL(request.url).searchParams.get("token");

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store"
      }
    });

  if (!token) return json({ error: "Token fehlt." }, 400);

  const response = await fetch(
    `${supabaseUrl}/rest/v1/calendars?token=eq.${encodeURIComponent(token)}&select=google_sync_status,google_sync_inserted,google_sync_updated,google_sync_deleted,google_sync_error,google_last_synced_at`,
    { headers: supabaseHeaders(supabaseKey) }
  );

  const rows = await response.json();

  if (!response.ok || !rows.length) {
    return json({ error: "Kalender nicht gefunden." }, 404);
  }

  return json(rows[0]);
};
