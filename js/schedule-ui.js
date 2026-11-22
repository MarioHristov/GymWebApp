import {
  $,
  api,
  esc,
  render,
  link,
  page,
  empty,
  prettyDate,
  action,
  notice,
  handleError,
} from "./ui.js";
const sofiaToday = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Sofia" }).format(
    new Date()
  );
const monthShift = (month, delta) => {
  const d = new Date(month + "-15T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
};
export async function schedule() {
  const { clubs, trainers } = await api("/clubs"),
    query = new URLSearchParams(location.search);
  const today = sofiaToday(),
    base = today.slice(0, 7);
  const requested = query.get("date") || "";
  let day =
    /^\d{4}-\d{2}-\d{2}$/.test(requested) &&
    requested.slice(0, 7) >= monthShift(base, -2) &&
    requested.slice(0, 7) <= monthShift(base, 11)
      ? requested
      : today;
  let month = day.slice(0, 7),
    trainer = query.get("trainer") || "",
    club = query.get("club") || "",
    kind = query.get("kind") || "all",
    sessions = [],
    version = 0;
  const options = (items, selected) =>
    items
      .map(
        (x) =>
          '<option value="' +
          esc(x.id) +
          '" ' +
          (x.id === selected ? "selected" : "") +
          ">" +
          esc(x.name) +
          "</option>"
      )
      .join("");
  render(
    '<div class="filters"><label>Club<select id="club"><option value="">All clubs</option>' +
      options(clubs, club) +
      '</select></label><label>Trainer<select id="trainer"><option value="">All trainers</option>' +
      options(trainers, trainer) +
      '</select></label><label>Session type<select id="kind"><option value="all">All sessions</option><option value="group">Group classes</option><option value="pt">Personal training</option></select></label></div><p class="fine">Demo timetable · All times are local to Sofia.</p><div class="toolbar"><h2 id="month"></h2><div class="actions"><button id="prev" class="secondary" aria-label="Previous month">←</button><button id="next" class="secondary" aria-label="Next month">→</button></div></div><div id="calendar" class="calendar"></div><section class="agenda" id="agenda" aria-live="polite"></section>'
  );
  function filtered() {
    return sessions.filter(
      (s) => kind === "all" || (kind === "pt") === s.personal
    );
  }
  $("#kind").value = kind;
  function remember(slot = "") {
    const params = new URLSearchParams({ date: day });
    if (trainer) params.set("trainer", trainer);
    if (club) params.set("club", club);
    if (kind !== "all") params.set("kind", kind);
    if (slot) params.set("session", slot);
    history.replaceState(null, "", "?" + params);
  }
  function agenda(reopen) {
    const matches = filtered().filter((s) => s.date === day);
    $("#agenda").innerHTML =
      "<h2>" +
      prettyDate(day) +
      "</h2>" +
      (!matches.length
        ? "<p>No sessions match these filters on this date.</p>"
        : matches
            .map((s) => {
              const loc =
                clubs.find((c) => c.id === s.trainer.clubId)?.name ||
                s.trainer.clubId;
              const status = s.booked
                ? "Reserved"
                : s.started
                ? "Started"
                : s.remaining
                ? s.remaining + " places left"
                : "Full";
              return (
                '<details class="slot" ' +
                (s.id === reopen ? "open" : "") +
                "><summary>" +
                esc(s.time) +
                " · " +
                esc(s.name) +
                " · " +
                esc(status) +
                "</summary><p>" +
                esc(s.description) +
                "</p><p>" +
                esc(s.trainer.name) +
                " · " +
                esc(loc) +
                " · " +
                s.minutes +
                " min</p><p>" +
                (s.personal
                  ? "Uses one coaching credit."
                  : "Included with Premium and Diamond.") +
                " " +
                link(page("memberships"), "View plans") +
                '</p><button data-session="' +
                esc(s.id) +
                '" ' +
                (s.started || (!s.booked && s.remaining <= 0)
                  ? "disabled"
                  : "") +
                ">" +
                (s.booked ? "Cancel reservation" : "Reserve place") +
                "</button></details>"
              );
            })
            .join(""));
  }
  function draw(reopen) {
    $("#month").textContent = new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(new Date(month + "-15T12:00:00"));
    $("#prev").disabled = month <= monthShift(base, -2);
    $("#next").disabled = month >= monthShift(base, 11);
    const first = new Date(month + "-01T12:00:00Z"),
      days = new Date(
        Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
      ).getUTCDate();
    const cells = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (n) => '<span class="weekday">' + n + "</span>"
    );
    for (let i = 0; i < (first.getUTCDay() + 6) % 7; i++)
      cells.push('<span class="blank"></span>');
    const all = filtered();
    for (let i = 1; i <= days; i++) {
      const date = month + "-" + String(i).padStart(2, "0"),
        items = all.filter((s) => s.date === date);
      cells.push(
        '<button class="day" data-date="' +
          date +
          '" aria-label="' +
          esc(prettyDate(date)) +
          ", " +
          items.length +
          ' sessions" aria-pressed="' +
          (date === day) +
          '"><strong>' +
          i +
          "</strong>" +
          (items.length
            ? "<small>" +
              items.length +
              '<span class="day-name"> sessions · ' +
              esc(items[0].name) +
              "</span></small>"
            : "") +
          "</button>"
      );
    }
    $("#calendar").innerHTML = cells.join("");
    agenda(reopen);
    remember(reopen);
  }
  async function refresh(reopen) {
    const v = ++version,
      p = new URLSearchParams({ month });
    if (trainer) p.set("trainer", trainer);
    if (club) p.set("club", club);
    const data = await api("/schedule?" + p);
    if (v !== version) return;
    sessions = data.sessions;
    draw(reopen);
  }
  $("#club").onchange = () => {
    club = $("#club").value;
    trainer = "";
    $("#trainer").value = "";
    refresh().catch(handleError);
  };
  $("#trainer").onchange = () => {
    trainer = $("#trainer").value;
    if (trainer) {
      club = trainers.find((t) => t.id === trainer).clubId;
      $("#club").value = club;
    }
    refresh().catch(handleError);
  };
  $("#kind").onchange = () => {
    kind = $("#kind").value;
    draw();
  };
  for (const [id, delta] of [
    ["prev", -1],
    ["next", 1],
  ])
    $("#" + id).onclick = () => {
      month = monthShift(month, delta);
      day = month === base ? today : month + "-01";
      refresh().catch(handleError);
    };
  $("#calendar").onclick = (e) => {
    const b = e.target.closest("[data-date]");
    if (b) {
      day = b.dataset.date;
      draw();
      $("#agenda").scrollIntoView({ block: "nearest" });
    }
  };
  $("#agenda").onclick = (e) => {
    const b = e.target.closest("[data-session]");
    if (!b) return;
    action(b, async () => {
      const s = sessions.find((x) => x.id === b.dataset.session);
      remember(s.id);
      try {
        await api(
          "/bookings/" + encodeURIComponent(s.id),
          s.booked ? "DELETE" : "PUT"
        );
      } finally {
        await refresh(s.id);
      }
      notice(s.booked ? "Reservation cancelled." : "Place reserved.");
    });
  };
  await refresh(query.get("session"));
}
