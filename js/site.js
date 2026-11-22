import {
  $,
  page,
  api,
  esc,
  prettyDate,
  render,
  link,
  empty,
  handleError,
} from "./ui.js";
const menu = $(".menu-toggle");
menu.addEventListener("click", () =>
  menu.setAttribute(
    "aria-expanded",
    String($("#main-nav").classList.toggle("open"))
  )
);
document.querySelectorAll("nav a").forEach((a) => {
  if (a.pathname === location.pathname) a.setAttribute("aria-current", "page");
});
async function start() {
  switch (document.body.dataset.page) {
    case "locations":
      return (await import("./club-map.js")).locations();
    case "club":
      return (await import("./club-details.js")).clubDetails();
    case "plans":
      return (await import("./membership-ui.js")).plans();
    case "schedule":
      return (await import("./schedule-ui.js")).schedule();
    case "profile":
      return (await import("./member-ui.js")).profile();
    case "auth":
      return (await import("./member-ui.js")).auth();
    case "events": {
      const events = await api("/events");
      render(
        '<p class="fine">Demo events · Sofia local time</p><div class="events">' +
          events
            .map(
              (e) =>
                '<article class="event"><time>' +
                esc(prettyDate(e.date)) +
                " · " +
                esc(e.time) +
                "</time><h2>" +
                esc(e.name) +
                "</h2><p>" +
                esc(e.description) +
                "</p><strong>" +
                esc(e.place) +
                "</strong></article>"
            )
            .join("") +
          "</div>"
      );
    }
  }
}
start().catch((e) => {
  if ($("#workspace"))
    render(empty("This page could not load. Refresh to try again."));
  handleError(e);
});
