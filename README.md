# muneasy calendar V1.0

Klickbarer MVP ohne Backend.

## Enthalten
- auswählbare Kalenderquellen
- Werder Bremen
- Borussia Mönchengladbach
- SC Magdeburg
- Schulferien Sachsen-Anhalt 2026/27
- Feiertage Sachsen-Anhalt 2026/27
- eigene Geburtstage
- lokale Speicherung im Browser (localStorage)
- Kalender-Vorschau
- Export als .ics für Samsung/Google/Apple/Outlook

## Wichtig
V1 enthält bei den Sportkalendern zunächst nur erste verifizierte Termine.
Die Daten liegen getrennt in `data/calendar-data.js`, damit in V1.1 ein automatischer
Sync per API/Netlify Function ergänzt werden kann.

## Start
Einfach `index.html` öffnen oder den kompletten Ordner auf Netlify deployen.

## Nächster sinnvoller Schritt
V1.1: persistenter persönlicher Kalender-Link statt einmaligem ICS-Import,
damit Terminänderungen automatisch beim Nutzer ankommen.
