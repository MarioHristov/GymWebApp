import { $, api, esc, render, link, empty, clubUrl, page } from "./ui.js";
import { mapsKey } from "./map-config.js";

function loadMaps() {
  if (window.google?.maps?.Map) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      reject(Error("Google Maps could not load."));
    };
    const timer = setTimeout(fail, 12000);
    window.gymMapReady = () => {
      clearTimeout(timer);
      resolve();
    };
    window.gm_authFailure = () => {
      fail();
      document.dispatchEvent(new Event("gym-map-unavailable"));
    };
    script.onerror = fail;
    script.src =
      "https://maps.googleapis.com/maps/api/js?loading=async&callback=gymMapReady&key=" +
      encodeURIComponent(mapsKey);
    document.head.append(script);
  });
}
export async function locations() {
  const { clubs } = await api("/clubs");
  let mode = "list",
    map,
    popup,
    loading,
    revision = 0,
    markers = [];
  const filtered = () => {
    const q = $("#search").value.trim().toLocaleLowerCase();
    return clubs.filter((c) =>
      (c.name + " " + c.address).toLocaleLowerCase().includes(q)
    );
  };
  function list(items) {
    return items.length
      ? '<div class="cards">' +
          items
            .map(
              (c) =>
                "<article><h2>" +
                esc(c.name) +
                "</h2><p>" +
                esc(c.address) +
                "</p><p>" +
                esc(c.hours) +
                '</p><div class="card-action">' +
                link(clubUrl(c.id), "Explore club →") +
                "</div></article>"
            )
            .join("") +
          "</div>"
      : empty("No clubs match your search.");
  }
  function unavailable() {
    if (mode === "map") {
      $("#map-canvas").hidden = true;
      render(
        "<p>Google Maps is unavailable. Matching clubs are listed below.</p>" +
          list(filtered())
      );
    }
  }
  document.addEventListener("gym-map-unavailable", unavailable);
  async function show() {
    const current = ++revision,
      items = filtered();
    $("#list").setAttribute("aria-pressed", String(mode === "list"));
    $("#map").setAttribute("aria-pressed", String(mode === "map"));
    $("#map-canvas").hidden = mode !== "map" || !items.length;
    if (mode === "list" || !items.length) {
      render(list(items));
      return;
    }
    render('<p class="fine">' + items.length + " matching clubs</p>");
    try {
      await (loading ??= loadMaps());
      if (current !== revision) return;
      map ??= new google.maps.Map($("#map-canvas"), {
        center: { lat: 42.68, lng: 23.32 },
        zoom: 12,
        mapTypeControl: false,
      });
      popup ??= new google.maps.InfoWindow();
      markers.forEach((m) => m.setMap(null));
      markers = [];
      popup.close();
      const bounds = new google.maps.LatLngBounds();
      for (const c of items) {
        const position = { lat: c.lat, lng: c.lng },
          marker = new google.maps.Marker({ map, position, title: c.name });
        const preview = () => {
          popup.setContent(
            "<strong>" +
              esc(c.name) +
              "</strong><p>" +
              esc(c.address) +
              "</p>" +
              link(clubUrl(c.id), "Open club →")
          );
          popup.open({ map, anchor: marker, shouldFocus: false });
        };
        marker.addListener("mouseover", preview);
        marker.addListener("click", () =>
          matchMedia("(hover: hover) and (pointer: fine)").matches
            ? location.assign(clubUrl(c.id))
            : preview()
        );
        markers.push(marker);
        bounds.extend(position);
      }
      if (items.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(15);
      } else map.fitBounds(bounds, 45);
    } catch {
      loading = null;
      if (current === revision) unavailable();
    }
  }
  $("#search").addEventListener("input", show);
  for (const id of ["list", "map"])
    $("#" + id).onclick = () => {
      mode = id;
      show();
    };
  await show();
}
