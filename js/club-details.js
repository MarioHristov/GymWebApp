import { $, api, esc, page, link } from "./ui.js";

export async function clubDetails() {
  const { clubs, trainers, activities } = await api("/clubs");
  const club = clubs.find((c) => c.id === document.body.dataset.club);
  if (!club) return;
  const team = trainers.filter((t) => t.clubId === club.id);
  $("#club-name").textContent = club.name;
  $("#club-about").textContent = club.about;
  $("#club-address").textContent = club.address + ", Sofia";
  $("#club-hours").textContent = club.hours;
  $("#club-facilities").textContent = club.facilities.join(" · ");
  $("#club-activities").textContent = activities
    .filter((a) => team.some((t) => t.id === a.trainerId))
    .map((a) => a.name)
    .join(" · ");
  $("#club-team").innerHTML = team
    .map(
      (t) =>
        '<article class="trainer"><div><h3>' +
        esc(t.name) +
        "</h3><p>" +
        esc(t.specialty) +
        "</p></div>" +
        link(
          page("schedule") + "?trainer=" + encodeURIComponent(t.id),
          "View schedule →"
        ) +
        "</article>"
    )
    .join("");
}
