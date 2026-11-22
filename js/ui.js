export const $ = (selector) => document.querySelector(selector);
export const page = (slug) => "/html_pages/" + slug + ".html";
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
export const money = (cents) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
export const prettyDate = (iso) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso + "T12:00:00"));
export const clubUrl = (id) => page("locations/" + encodeURIComponent(id));
export function destination(value, fallback = page("user_profile")) {
  if (!value) return fallback;
  try {
    const u = new URL(value, location.origin);
    return u.origin === location.origin
      ? u.pathname + u.search + u.hash
      : fallback;
  } catch {
    return fallback;
  }
}
export function loginUrl() {
  return (
    page("login&register") +
    "?next=" +
    encodeURIComponent(location.pathname + location.search + location.hash)
  );
}
export async function api(path, method = "GET", data) {
  const options = {
    method,
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  };
  if (method !== "GET") options.headers["X-Gym-Request"] = "1";
  if (data !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(data);
  }
  let res;
  try {
    res = await fetch("/api" + path, options);
  } catch {
    throw Error("The club service is unreachable. Please try again.");
  }
  if (res.status === 204) return null;
  const payload = await res.json().catch(() => null);
  if (!res.ok || payload === null) {
    const error = Error(
      payload?.error ||
        (res.status === 401
          ? "Sign in to continue."
          : "The club service could not complete the request.")
    );
    error.status = res.status;
    throw error;
  }
  return payload;
}
export function notice(message = "") {
  const n = $("#notice");
  n.textContent = message;
  if (message) n.scrollIntoView({ block: "nearest" });
}
export function render(html) {
  $("#workspace").innerHTML = html;
  $("#workspace").setAttribute("aria-busy", "false");
}
export function handleError(error) {
  if (error.status === 401 && document.body.dataset.page !== "auth")
    location.assign(loginUrl());
  else notice(error.message);
}
export async function action(button, work) {
  if (button.disabled) return;
  button.disabled = true;
  notice();
  try {
    await work();
  } catch (e) {
    handleError(e);
  } finally {
    button.disabled = false;
  }
}
export const link = (url, label, css = "text-link") =>
  '<a class="' + css + '" href="' + esc(url) + '">' + esc(label) + "</a>";
export const empty = (text) => '<p class="empty">' + esc(text) + "</p>";
