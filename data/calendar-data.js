
window.CALENDAR_DATA = {
  sources: [
    { id:"werder", icon:"⚽", title:"Werder Bremen", subtitle:"Bundesliga · erste bestätigte Termine", kind:"sport" },
    { id:"gladbach", icon:"⚽", title:"Borussia Mönchengladbach", subtitle:"Bundesliga · erste bestätigte Termine", kind:"sport" },
    { id:"scm", icon:"🤾", title:"SC Magdeburg", subtitle:"Handball · erste bestätigte Termine", kind:"sport" },
    { id:"ferien_st", icon:"🏫", title:"Schulferien Sachsen-Anhalt", subtitle:"Schuljahr 2026/27", kind:"ferien" },
    { id:"feiertage_st", icon:"🎉", title:"Feiertage Sachsen-Anhalt", subtitle:"2026 + 2027", kind:"feiertag" }
  ],

  // V1.0: Sporttermine liegen absichtlich separat.
  // Später kann dieses Array automatisiert per API/Server-Funktion aktualisiert werden.
  events: [
    // Werder – bestätigte Bundesliga-Termine, Stand 09.08.2026
    {source:"werder", start:"2026-08-30T13:30:00", end:"2026-08-30T15:30:00", title:"SC Freiburg – Werder Bremen", note:"Bundesliga"},
    {source:"werder", start:"2026-09-05T13:30:00", end:"2026-09-05T15:30:00", title:"Werder Bremen – RB Leipzig", note:"Bundesliga"},
    {source:"werder", start:"2026-09-12T16:30:00", end:"2026-09-12T18:30:00", title:"1. FC Köln – Werder Bremen", note:"Bundesliga"},
    {source:"werder", start:"2026-09-19T13:30:00", end:"2026-09-19T15:30:00", title:"Werder Bremen – FC Augsburg", note:"Bundesliga"},

    // Gladbach – bestätigter Saisonauftakt
    {source:"gladbach", start:"2026-08-29T13:30:00", end:"2026-08-29T15:30:00", title:"RB Leipzig – Borussia Mönchengladbach", note:"Bundesliga"},

    // SCM – aktuelle verifizierte Termine
    {source:"scm", start:"2026-08-11T19:00:00", end:"2026-08-11T21:00:00", title:"SC Magdeburg – GWD Minden", note:"Hummel-Cup · Warm-up"},
    {source:"scm", start:"2026-08-14T17:30:00", end:"2026-08-14T19:30:00", title:"TBV Lemgo Lippe – SC Magdeburg", note:"Wartburg-Cup"},
    {source:"scm", start:"2026-08-15T18:00:00", end:"2026-08-15T20:00:00", title:"SC Magdeburg – ThSV Eisenach", note:"Wartburg-Cup"},
    {source:"scm", start:"2026-08-22T00:00:00", end:"2026-08-23T00:00:00", title:"SC Magdeburg – Füchse Berlin", note:"Super Cup · Uhrzeit in V1 noch offen", allDay:true},

    // Ferien Sachsen-Anhalt 2026/27
    {source:"ferien_st", start:"2026-10-19", end:"2026-10-31", title:"Herbstferien", note:"Sachsen-Anhalt", allDay:true},
    {source:"ferien_st", start:"2026-12-21", end:"2027-01-03", title:"Weihnachtsferien", note:"Sachsen-Anhalt", allDay:true},
    {source:"ferien_st", start:"2027-02-01", end:"2027-02-07", title:"Winterferien", note:"Sachsen-Anhalt", allDay:true},
    {source:"ferien_st", start:"2027-03-22", end:"2027-03-28", title:"Osterferien", note:"Sachsen-Anhalt", allDay:true},
    {source:"ferien_st", start:"2027-05-15", end:"2027-05-23", title:"Pfingstferien", note:"Sachsen-Anhalt", allDay:true},
    {source:"ferien_st", start:"2027-07-10", end:"2027-08-21", title:"Sommerferien", note:"Sachsen-Anhalt", allDay:true},

    // Feiertage Sachsen-Anhalt
    {source:"feiertage_st", start:"2026-10-03", end:"2026-10-04", title:"Tag der Deutschen Einheit", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2026-10-31", end:"2026-11-01", title:"Reformationstag", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2026-12-25", end:"2026-12-26", title:"1. Weihnachtstag", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2026-12-26", end:"2026-12-27", title:"2. Weihnachtstag", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-01-01", end:"2027-01-02", title:"Neujahr", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-01-06", end:"2027-01-07", title:"Heilige Drei Könige", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-03-26", end:"2027-03-27", title:"Karfreitag", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-03-29", end:"2027-03-30", title:"Ostermontag", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-05-01", end:"2027-05-02", title:"Tag der Arbeit", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-05-06", end:"2027-05-07", title:"Christi Himmelfahrt", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-05-17", end:"2027-05-18", title:"Pfingstmontag", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-10-03", end:"2027-10-04", title:"Tag der Deutschen Einheit", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-10-31", end:"2027-11-01", title:"Reformationstag", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-12-25", end:"2027-12-26", title:"1. Weihnachtstag", note:"Feiertag", allDay:true},
    {source:"feiertage_st", start:"2027-12-26", end:"2027-12-27", title:"2. Weihnachtstag", note:"Feiertag", allDay:true}
  ]
};
