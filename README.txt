MUNEASY CALENDAR – GOOGLE BACKGROUND SYNC FIX

WARUM:
Der Google-Kalender wurde bereits erstellt, aber danach lief der komplette
Termin-Sync synchron im Browser-Request. Bei vielen Google-API-Aufrufen konnte
die Function lange laufen bzw. fehlschlagen, obwohl der Kalender schon da war.

JETZT:
Google OAuth -> Kalender wird erstellt -> Background-Sync wird gestartet ->
SOFORT zurück zur App -> "Kalender hinzugefügt ✓" -> Status wird gepollt.

1) Supabase:
   GOOGLE-BACKGROUND-SYNC.sql einmal ausführen.

2) netlify/functions/:
   google-callback.mjs ersetzen
   sync-google-background.mjs hinzufügen
   google-sync-status.mjs hinzufügen

   Die bisherige sync-google.mjs kann für manuellen Test bestehen bleiben.

3) Frontend:
   app.js ersetzen.
   index.html/style.css sind nur beigelegt, falls du den kompletten finalen
   Google-Frontend-Stand nochmal übernehmen willst.

4) Commit + Netlify Deploy.

Danach neuen Testkalender erstellen und mit Google verbinden.
Du solltest sofort zurück bei muneasy landen und eine sichtbare Erfolgsmeldung
sehen, während die Termine im Hintergrund einlaufen.
