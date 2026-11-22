import {
  $,
  api,
  esc,
  money,
  prettyDate,
  render,
  link,
  page,
  action,
  notice,
} from "./ui.js";

export async function plans() {
  const { plans, discount } = await api("/plans");
  const term = (m) =>
    m === 1 ? "Monthly" : m === 3 ? "Three months" : "Annual";
  const card = (p) =>
    "<article><h3>" +
    esc(p.name) +
    "</h3><p>" +
    esc(p.description) +
    "</p>" +
    (p.credits
      ? '<p class="price">' +
        money(p.prices[0].totalCents) +
        "</p><p>Valid for 12 months.</p>"
      : "<div>" +
        p.prices
          .map((q) => {
            const saved = (1 - q.termCents / q.baseCents) * 100;
            return (
              "<p><strong>" +
              term(q.months) +
              " · " +
              money(q.totalCents) +
              "</strong><br><small>" +
              money(q.totalCents / q.months) +
              "/month · " +
              saved.toFixed(1).replace(/\.0$/, "") +
              "% term discount</small></p>"
            );
          })
          .join("") +
        "</div>") +
    '<button class="card-action" data-plan="' +
    esc(p.id) +
    '">Choose ' +
    esc(p.name) +
    "</button></article>";
  render(
    "<section><h2>Club access</h2><p>Under 18s and members aged 65+ receive 20%. University students receive 10%. The highest personal discount applies after the term discount. Coaching packs have fixed prices.</p><p>Discount applied to these prices: <strong>" +
      discount +
      "%</strong>. " +
      link(page("user_profile"), "Update eligibility in your profile") +
      '.</p><div class="cards">' +
      plans
        .filter((p) => !p.credits)
        .map(card)
        .join("") +
      '</div></section><section class="section"><h2>Personal training</h2><p>Demo coaching rates in USD.</p><div class="cards">' +
      plans
        .filter((p) => p.credits)
        .map(card)
        .join("") +
      '</div></section><section id="order" class="panel" hidden></section>'
  );
  $("#workspace").onclick = (e) => {
    const id = e.target.closest("[data-plan]")?.dataset.plan;
    if (!id) return;
    const p = plans.find((p) => p.id === id),
      box = $("#order");
    box.hidden = false;
    box.innerHTML =
      "<h2>" +
      esc(p.name) +
      '</h2><form class="form-grid"><label>Term<select name="term">' +
      p.prices
        .map(
          (q) =>
            '<option value="' +
            q.months +
            '">' +
            (p.credits ? p.credits + " coaching credit(s)" : term(q.months)) +
            " · " +
            money(q.totalCents) +
            "</option>"
        )
        .join("") +
      "</select></label><p>Confirm to enroll and pay at reception. A new club term starts after any existing term. Coaching credits are available immediately.</p><button>Confirm enrollment</button></form>";
    box.scrollIntoView({ block: "center" });
    box.querySelector("select").focus({ preventScroll: true });
    box.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget,
        months = Number(form.term.value);
      history.replaceState(
        null,
        "",
        "?" + new URLSearchParams({ plan: id, months })
      );
      action(form.querySelector("button"), async () => {
        const key = "gym.order." + id + "." + months;
        let requestId = sessionStorage.getItem(key);
        if (!requestId) {
          requestId = crypto.randomUUID();
          sessionStorage.setItem(key, requestId);
        }
        const expectedCents = p.prices.find(
          (q) => q.months === months
        ).totalCents;
        const result = await api("/enrollments", "POST", {
          planId: id,
          months,
          requestId,
          expectedCents,
        });
        sessionStorage.removeItem(key);
        history.replaceState(null, "", location.pathname);
        box.innerHTML =
          "<h2>Enrollment recorded</h2><p>" +
          esc(result.plan) +
          " starts " +
          prettyDate(result.start) +
          ". Amount due at reception: " +
          money(result.totalCents) +
          ".</p>" +
          link(page("user_profile"), "View membership history →");
        notice("Enrollment confirmed.");
      });
    };
  };
  const previous = new URLSearchParams(location.search),
    plan = plans.find((p) => p.id === previous.get("plan"));
  if (plan) {
    document.querySelector('[data-plan="' + CSS.escape(plan.id) + '"]').click();
    if (plan.prices.some((q) => String(q.months) === previous.get("months")))
      $("#order select").value = previous.get("months");
  }
}
