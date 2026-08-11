
const SUPABASE_URL = "https://pxobzvufndjodlsusbnw.supabase.co";
const SUPABASE_KEY = "sb_publishable_sm2-0z2PFpBh-bMRgUpjAA_USlevBAo";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let DATA = {
  sources: [],
  events: []
};
const STORAGE_KEY = "muneasy-calendar-v1";
const now = new Date();

let state = {
  selected: ["werder","scm","ferien_st","feiertage_st"],
  birthdays: []
};

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved && Array.isArray(saved.selected) && Array.isArray(saved.birthdays)) state = saved;
} catch {}

const sourceGrid = document.querySelector("#sourceGrid");
const eventList = document.querySelector("#eventList");
const eventCount = document.querySelector("#eventCount");
const birthdayList = document.querySelector("#birthdayList");

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function esc(s=""){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function renderSources(){
  sourceGrid.innerHTML = DATA.sources.map(src => {
    const selected = state.selected.includes(src.id);
    return `
      <label class="source ${selected ? "selected":""}">
        <input type="checkbox" value="${src.id}" ${selected ? "checked":""}>
        <div class="source-top"><span class="icon">${src.icon}</span><span class="check">${selected ? "✓":""}</span></div>
        <h3>${esc(src.title)}</h3>
        <p>${esc(src.subtitle)}</p>
      </label>`;
  }).join("");

  sourceGrid.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", () => {
      if(input.checked) state.selected = [...new Set([...state.selected,input.value])];
      else state.selected = state.selected.filter(x => x !== input.value);
      save(); renderSources(); renderEvents();
    });
  });
}

function birthdayEvents(){
  const years = [now.getFullYear(), now.getFullYear()+1, now.getFullYear()+2];
  return state.birthdays.flatMap(b => years.map(year => {
    const [,m,d] = b.date.split("-");
    const start = `${year}-${m}-${d}`;
    const next = new Date(`${start}T12:00:00`);
    next.setDate(next.getDate()+1);
    const end = localYmd(next);
    const age = b.date.slice(0,4) !== "0000" ? year - Number(b.date.slice(0,4)) : null;
    return {
      source:"birthdays", start, end, allDay:true,
      title:`🎂 ${b.name}${age && age > 0 ? ` (${age})` : ""}`,
      note:"Geburtstag"
    };
  }));
}

function localYmd(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function selectedEvents(){
  const base = DATA.events.filter(e => state.selected.includes(e.source));
  return [...base, ...birthdayEvents()].sort((a,b) => new Date(a.start) - new Date(b.start));
}

function renderEvents(){
  const cutoff = new Date(); cutoff.setHours(0,0,0,0);
  const items = selectedEvents().filter(e => new Date(e.end || e.start) >= cutoff).slice(0,18);
  eventCount.textContent = `${selectedEvents().length} Termine`;

  if(!items.length){
    eventList.innerHTML = `<div class="no-events">Wähle einen Kalender aus oder füge einen Geburtstag hinzu.</div>`;
    return;
  }

  eventList.innerHTML = items.map(e => {
    const d = new Date(e.start.length === 10 ? e.start+"T12:00:00" : e.start);
    const day = String(d.getDate()).padStart(2,"0");
    const mon = new Intl.DateTimeFormat("de-DE",{month:"short"}).format(d).replace(".","");
    const time = e.allDay ? "ganztägig" : new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(d)+" Uhr";
    const src = DATA.sources.find(s=>s.id===e.source);
    return `<div class="event">
      <div class="datebox"><strong>${day}</strong><span>${mon}</span></div>
      <div><div class="event-title">${esc(e.title)}</div><div class="event-meta">${time} · ${esc(e.note || "")}</div></div>
      <span class="tag">${src ? esc(src.title) : "Geburtstag"}</span>
    </div>`;
  }).join("");
}

function renderBirthdays(){
  if(!state.birthdays.length){
    birthdayList.className = "birthday-list empty";
    birthdayList.textContent = "Noch keine Geburtstage eingetragen.";
    return;
  }
  birthdayList.className = "birthday-list";
  birthdayList.innerHTML = state.birthdays.map((b,i)=>{
    const d = new Date(b.date+"T12:00:00");
    const label = new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit"}).format(d);
    return `<div class="bday"><span>🎂 ${esc(b.name)} · ${label}</span><button data-i="${i}" title="Löschen">×</button></div>`;
  }).join("");
  birthdayList.querySelectorAll("button").forEach(btn=>btn.addEventListener("click",()=>{
    state.birthdays.splice(Number(btn.dataset.i),1); save(); renderBirthdays(); renderEvents();
  }));
}

document.querySelector("#birthdayForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name = document.querySelector("#birthdayName").value.trim();
  const date = document.querySelector("#birthdayDate").value;
  if(!name || !date) return;
  state.birthdays.push({name,date});
  state.birthdays.sort((a,b)=>a.date.slice(5).localeCompare(b.date.slice(5)));
  save(); e.target.reset(); renderBirthdays(); renderEvents();
});

document.querySelector("#clearAll").addEventListener("click",()=>{
  state.selected=[];save();renderSources();renderEvents();
});

function icsEscape(s=""){
  return s.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
}
function icsDate(s){
  return s.replaceAll("-","");
}
function icsDateTime(s){
  const d = new Date(s);
  const pad=n=>String(n).padStart(2,"0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function uidFor(e,i){
  return `${e.source}-${e.start.replace(/[^0-9]/g,"")}-${i}@muneasy-calendar`;
}
function buildICS(){
  const events = selectedEvents();
  const stamp = icsDateTime(new Date().toISOString());
  const body = events.map((e,i)=>{
    const dates = e.allDay
      ? `DTSTART;VALUE=DATE:${icsDate(e.start)}\r\nDTEND;VALUE=DATE:${icsDate(e.end)}`
      : `DTSTART:${icsDateTime(e.start)}\r\nDTEND:${icsDateTime(e.end)}`;
    return [
      "BEGIN:VEVENT",
      `UID:${uidFor(e,i)}`,
      `DTSTAMP:${stamp}`,
      dates,
      `SUMMARY:${icsEscape(e.title)}`,
      `DESCRIPTION:${icsEscape(e.note || "muneasy calendar")}`,
      "END:VEVENT"
    ].join("\r\n");
  }).join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//muneasy//calendar V1.0//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:muneasy calendar",
    body,
    "END:VCALENDAR"
  ].join("\r\n");
}

document.querySelector("#downloadBtn").addEventListener("click",()=>{
  const events = selectedEvents();
  if(!events.length){ alert("Wähle zuerst mindestens einen Kalender oder Geburtstag aus."); return; }
  const blob = new Blob([buildICS()],{type:"text/calendar;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download="muneasy-kalender.ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
async function loadDatabase() {
  const { data: sources, error: sourcesError } = await db
    .from("sources")
    .select("*")
    .eq("active", true)
    .order("name");

  if (sourcesError) {
    console.error("Fehler beim Laden der Quellen:", sourcesError);
    return;
  }

  const { data: events, error: eventsError } = await db
    .from("events")
    .select("*")
    .order("starts_at");

  if (eventsError) {
    console.error("Fehler beim Laden der Termine:", eventsError);
    return;
  }

  DATA.sources = sources.map(source => ({
    id: source.id,
    title: source.name,
    kind: source.category,
    icon: source.icon,
    subtitle: getSourceSubtitle(source.category)
  }));

  DATA.events = events.map(event => ({
    source: event.source_id,
    title: event.title,

    start: event.all_day
      ? event.start_date
      : event.starts_at,

    end: event.all_day
      ? event.end_date
      : event.ends_at,

    allDay: event.all_day,

    note: event.location || ""
  }));

  renderSources();
  renderBirthdays();
  renderEvents();
}

function getSourceSubtitle(category) {
  const labels = {
    football: "Bundesliga",
    handball: "Handball",
    school_holidays: "Schulferien",
    public_holidays: "Feiertage"
  };

  return labels[category] || "";
}
loadDatabase();
