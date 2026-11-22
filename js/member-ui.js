import {
  $,
  api,
  esc,
  render,
  link,
  page,
  destination,
  prettyDate,
  money,
  action,
  notice,
  loginUrl,
} from "./ui.js";
const field = (label, name, type, value = "", attributes = "") =>
  "<label>" +
  esc(label) +
  '<input type="' +
  type +
  '" name="' +
  name +
  '" value="' +
  esc(value) +
  '" ' +
  attributes +
  "></label>";
export function auth() {
  const next = destination(new URLSearchParams(location.search).get("next"));
  const form = (register) =>
    '<section class="panel"><h2>' +
    (register ? "Create an account" : "Sign in") +
    '</h2><form data-account="' +
    (register ? "register" : "login") +
    '" class="form-grid">' +
    field(
      "Email",
      "email",
      "email",
      "",
      'required maxlength="254" autocomplete="email"'
    ) +
    field(
      "Password",
      "password",
      "password",
      "",
      'required maxlength="128" autocomplete="' +
        (register ? "new-password" : "current-password") +
        '" ' +
        (register ? 'minlength="8"' : "")
    ) +
    (register ? "<small>Use at least eight characters.</small>" : "") +
    "<button>" +
    (register ? "Create account" : "Sign in") +
    "</button></form></section>";
  render('<div class="forms">' + form(false) + form(true) + "</div>");
  $("#workspace").onsubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    action(form.querySelector("button"), async () => {
      await api(
        "/account/" + form.dataset.account,
        "POST",
        Object.fromEntries(new FormData(form))
      );
      location.assign(next);
    });
  };
}
export async function profile() {
  let data;
  try {
    data = await api("/profile");
  } catch (e) {
    if (e.status !== 401) throw e;
    render(
      '<div class="panel"><h2>Member access</h2><p>Sign in to see your membership, view reservations and print your history.</p>' +
        link(loginUrl(), "Sign in or register", "button") +
        "</div>"
    );
    return;
  }
  const active = data.history.find(
    (h) => !h.trainingCredits && h.start <= data.today && h.end > data.today
  );
  const lastDay = (end) => {
    const d = new Date(end + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return prettyDate(d.toISOString().slice(0, 10));
  };
  const rows = data.history
    .map(
      (h) =>
        '<tr><th scope="row">' +
        esc(h.plan) +
        "</th><td>" +
        prettyDate(h.start) +
        "</td><td>" +
        lastDay(h.end) +
        "</td><td>" +
        money(h.totalCents) +
        "</td></tr>"
    )
    .join("");
  const bookings = data.bookings
    .map(
      (b) =>
        '<article class="trainer"><div><strong>' +
        esc(b.name) +
        "</strong><p>" +
        prettyDate(b.date) +
        " · " +
        esc(b.time) +
        " · " +
        esc(b.clubId.replace(/([a-z])([A-Z])/g, "$1 $2")) +
        '</p></div><button class="secondary" data-cancel="' +
        esc(b.id) +
        '">Cancel reservation</button></article>'
    )
    .join("");
  const security = (key, label, type) =>
    '<details class="panel"><summary>Change ' +
    label.toLowerCase() +
    '</summary><form class="form-grid" data-change="' +
    key +
    '">' +
    field(
      "Current password",
      "currentPassword",
      "password",
      "",
      'autocomplete="current-password" required'
    ) +
    field(
      "New " + label.toLowerCase(),
      "value",
      type,
      "",
      "required " +
        (type === "password"
          ? 'minlength="8" maxlength="128" autocomplete="new-password"'
          : 'maxlength="254" autocomplete="email"')
    ) +
    "<button>Save " +
    label.toLowerCase() +
    "</button></form></details>";
  render(
    '<section class="panel"><div class="section-heading"><h2>' +
      esc(data.name || "Member account") +
      '</h2><button class="secondary" id="logout">Sign out</button></div><p>' +
      esc(data.email) +
      "</p><p><strong>Current membership:</strong> " +
      (active
        ? esc(active.plan) + " · through " + lastDay(active.end)
        : "No active club membership") +
      "</p><p>Available coaching credits: " +
      Number(data.credits) +
      "</p>" +
      link(page("memberships"), "Explore memberships →") +
      "</section>" +
      "<section><h2>Upcoming reservations</h2>" +
      (bookings ||
        "<p>No upcoming reservations. " +
          link(page("schedule"), "Explore the schedule →") +
          "</p>") +
      "</section>" +
      '<section id="history" class="panel"><p class="print-only">Shredded Together · ' +
      esc(data.name || data.email) +
      '</p><div class="section-heading"><h2>Membership history</h2><button class="secondary no-print" id="print">Print history</button></div>' +
      (rows
        ? '<div class="scroll"><table><thead><tr><th>Package</th><th>From</th><th>Through</th><th>Amount due</th></tr></thead><tbody>' +
          rows +
          "</tbody></table></div>"
        : "<p>No enrollments yet.</p>") +
      "</section>" +
      '<section class="forms"><div class="panel"><h2>Personal details</h2><form class="form-grid" id="details">' +
      field(
        "Name",
        "name",
        "text",
        data.name,
        'required maxlength="100" autocomplete="name"'
      ) +
      field(
        "Birth date (optional)",
        "birthDate",
        "date",
        data.birthDate,
        'max="' + esc(data.today) + '"'
      ) +
      '<label class="check"><input type="checkbox" name="student" ' +
      (data.student ? "checked" : "") +
      "> Current university student</label><small>Age and student status determine the discount on future enrollments.</small><button>Save details</button></form></div><div><h2>Account settings</h2>" +
      security("email", "Email", "email") +
      security("password", "Password", "password") +
      "</div></section>"
  );
  $("#print").onclick = () => window.print();
  $("#logout").onclick = (e) =>
    action(e.currentTarget, async () => {
      await api("/account/logout", "POST");
      location.assign("/");
    });
  $("#workspace").onclick = (e) => {
    const b = e.target.closest("[data-cancel]");
    if (b)
      action(b, async () => {
        await api(
          "/bookings/" + encodeURIComponent(b.dataset.cancel),
          "DELETE"
        );
        await profile();
        notice("Reservation cancelled.");
      });
  };
  $("#workspace").onsubmit = (e) => {
    e.preventDefault();
    const form = e.target,
      values = Object.fromEntries(new FormData(form));
    action(form.querySelector("button"), async () => {
      if (form.id === "details")
        await api("/profile", "PUT", {
          name: values.name,
          birthDate: values.birthDate || null,
          student: values.student === "on",
        });
      else await api("/account/" + form.dataset.change, "PUT", values);
      await profile();
      notice("Changes saved.");
    });
  };
}
