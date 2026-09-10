const nav = document.getElementById("nav");
const toggle = document.querySelector(".nav-toggle");

if (nav) {
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.querySelectorAll("#nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let revealObserver = null;

function observeReveals(nodes) {
  const els = [...nodes];
  if (!els.length) return;
  if (reduceMotion) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
  }
  els.forEach((el) => {
    revealObserver.observe(el);
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 40) {
        el.classList.add("is-in");
        revealObserver.unobserve(el);
      }
    });
  });
}

observeReveals(document.querySelectorAll(".reveal"));

function heatDots(n) {
  return `<div class="heat-dots" aria-label="Heat ${n} of 5">${[1, 2, 3, 4, 5]
    .map((i) => `<span class="${i <= n ? "on" : ""}"></span>`)
    .join("")}</div>`;
}

const CONTACT_INBOX = "beamo@beamosupport.com";

function formSuccessMessage(intent) {
  return intent === "tasting"
    ? "You're on the list. Taste the sweet. Crave the heat."
    : "Received. We will write back from the house.";
}

async function postForm(payload, statusEl) {
  statusEl.classList.remove("is-ok", "is-err");
  statusEl.textContent = "Sending…";

  const subject =
    payload.intent === "tasting"
      ? "Mexican Fire tasting list"
      : payload.intent === "wholesale"
        ? "Mexican Fire wholesale inquiry"
        : "Mexican Fire contact";

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${CONTACT_INBOX}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: payload.name || "Tasting guest",
        email: payload.email,
        company: payload.company || "",
        intent: payload.intent,
        message: payload.message,
        _replyto: payload.email,
        _subject: subject,
        _template: "table",
        _captcha: "false",
        _honey: payload.website || "",
      }),
    });
    const data = await res.json().catch(() => ({}));
    const activating = String(data.message || "").toLowerCase().includes("activat");
    if ((data.success === false || data.success === "false") && !activating) {
      const api = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const fallback = await api.json().catch(() => ({}));
      if (!api.ok || !fallback.ok) {
        throw new Error(data.message || fallback.error || "We could not send that just now.");
      }
    }
    statusEl.textContent = activating
      ? "Got it. We confirm the inbox, then write back."
      : formSuccessMessage(payload.intent);
    statusEl.classList.add("is-ok");
    return true;
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.classList.add("is-err");
    return false;
  }
}

const tasting = document.getElementById("tasting-form");
if (tasting) {
  tasting.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = tasting.querySelector(".form-status");
    const email = tasting.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = "Enter a valid email so we can send the tasting invite.";
      status.classList.remove("is-ok");
      status.classList.add("is-err");
      tasting.email.focus();
      return;
    }
    const ok = await postForm(
      { intent: "tasting", email, name: "", message: "Tasting list", website: tasting.website?.value },
      status,
    );
    if (ok) tasting.reset();
  });
}

const contact = document.getElementById("contact-form");
if (contact) {
  contact.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = contact.querySelector(".form-status");
    const payload = {
      intent: contact.intent.value,
      name: contact.name.value.trim(),
      email: contact.email.value.trim(),
      company: contact.company.value.trim(),
      message: contact.message.value.trim(),
      website: contact.website.value,
    };
    const ok = await postForm(payload, status);
    if (ok) contact.reset();
  });
}

function nfCell(amount, dv, { skipDv = false } = {}) {
  if (skipDv) return amount;
  return `${amount} ${dv}%`;
}

function nfRow(name, s, b, { bold = false, indent = 0, skipDv = false } = {}) {
  const nameHtml = bold ? `<b>${name}</b>` : name;
  const indentClass = indent === 2 ? " nf-indent2" : indent === 1 ? " nf-indent" : "";
  return `<div class="nf-row${indentClass}">
    <span class="nf-name">${nameHtml}</span>
    <span>${nfCell(s.amount, s.dv, { skipDv })}</span>
    <span>${nfCell(b.amount, b.dv, { skipDv })}</span>
  </div>`;
}

function nutritionLabel(flavor) {
  const n = flavor.nutrition;
  const s = n.serving;
  const b = n.bar;
  return `<div class="nf" aria-label="Nutrition Facts for ${flavor.name}">
    <p class="nf-title">Nutrition Facts</p>
    <p class="nf-servings">3 servings per container</p>
    <p class="nf-ssize"><span>Serving size</span><span>1/3 bar (27g)</span></p>
    <div class="nf-head"><span></span><span>Per serving</span><span>Per 1 bar</span></div>
    <div class="nf-cals"><span class="nf-cals-name">Calories</span><span>${s.calories}</span><span>${b.calories}</span></div>
    <div class="nf-dv"><span></span><span>% DV*</span><span>% DV*</span></div>
    ${nfRow("Total Fat", { amount: s.fat, dv: s.fatDv }, { amount: b.fat, dv: b.fatDv }, { bold: true })}
    ${nfRow("Saturated Fat", { amount: s.sat, dv: s.satDv }, { amount: b.sat, dv: b.satDv }, { indent: 1 })}
    ${nfRow("Trans Fat", { amount: s.trans, dv: "" }, { amount: b.trans, dv: "" }, { indent: 1, skipDv: true })}
    ${nfRow("Cholesterol", { amount: s.chol, dv: s.cholDv }, { amount: b.chol, dv: b.cholDv }, { bold: true })}
    ${nfRow("Sodium", { amount: s.sodium, dv: s.sodiumDv }, { amount: b.sodium, dv: b.sodiumDv }, { bold: true })}
    ${nfRow("Total Carbohydrate", { amount: s.carb, dv: s.carbDv }, { amount: b.carb, dv: b.carbDv }, { bold: true })}
    ${nfRow("Dietary Fiber", { amount: s.fiber, dv: s.fiberDv }, { amount: b.fiber, dv: b.fiberDv }, { indent: 1 })}
    ${nfRow("Total Sugars", { amount: s.sugars, dv: "" }, { amount: b.sugars, dv: "" }, { indent: 1, skipDv: true })}
    ${nfRow("Includes Added Sugars", { amount: s.added, dv: s.addedDv }, { amount: b.added, dv: b.addedDv }, { indent: 2 })}
    ${nfRow("Protein", { amount: s.protein, dv: s.proteinDv }, { amount: b.protein, dv: b.proteinDv }, { bold: true })}
    <div class="nf-vits">
      ${nfRow("Vitamin D", { amount: s.vitD, dv: s.vitDDv }, { amount: b.vitD, dv: b.vitDDv })}
      ${nfRow("Calcium", { amount: s.calcium, dv: s.calciumDv }, { amount: b.calcium, dv: b.calciumDv })}
      ${nfRow("Iron", { amount: s.iron, dv: s.ironDv }, { amount: b.iron, dv: b.ironDv })}
      ${nfRow("Potassium", { amount: s.potassium, dv: s.potassiumDv }, { amount: b.potassium, dv: b.potassiumDv })}
      ${nfRow("Magnesium", { amount: s.magnesium, dv: s.magnesiumDv }, { amount: b.magnesium, dv: b.magnesiumDv })}
    </div>
    <p class="nf-note">* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.</p>
  </div>
  <div class="nf-meta">
    <p><strong>Net Wt</strong> 2.82 oz (80 g) · ${flavor.cacaoPercent}% cacao</p>
    <p><strong>Ingredients:</strong> ${flavor.ingredientStatement}</p>
    <p><strong>Contains:</strong> Milk.</p>
    <p><strong>May contain:</strong> Tree nuts.</p>
    <p><strong>Caffeine:</strong> ${n.caffeine.serving} mg per serving (${n.caffeine.bar} mg per bar).</p>
  </div>`;
}

function flavorSheet(flavor, i) {
  return `<article class="flavor-sheet reveal" id="${flavor.id}" style="--d:${Math.min(i, 3) * 0.06}s">
    <img src="${flavor.image}" alt="${flavor.name} bar">
    <div>
      <p class="eyebrow">${flavor.tag}</p>
      <h2>${flavor.name}</h2>
      ${heatDots(flavor.heat)}
      <p>${flavor.story}</p>
      <div class="flavor-specs">
        <span>${flavor.cacaoPercent}% cacao</span>
        <span>2.82 oz (80 g)</span>
        <span>3 servings</span>
        <span>${flavor.nutrition.serving.calories} cal / serving</span>
      </div>
      <div class="flavor-panel">
        <h3>What is in the bar</h3>
        <p>${flavor.ingredients.join(" · ")}</p>
      </div>
    </div>
    <div class="nf-col">${nutritionLabel(flavor)}</div>
  </article>`;
}

const flavorGrid = document.getElementById("flavor-grid");
const flavorSheets = document.getElementById("flavor-sheets");
const flavorJump = document.getElementById("flavor-jump");
const collectionRow = document.getElementById("collection-row");
const quizRoot = document.getElementById("quiz");

async function loadFlavors() {
  const res = await fetch("/data/flavors.json");
  const data = await res.json();
  return data.flavors;
}

if (flavorGrid || flavorSheets || collectionRow || quizRoot) {
  loadFlavors().then((flavors) => {
    if (collectionRow) {
      collectionRow.innerHTML = flavors
        .map(
          (f, i) =>
            `<a class="reveal" style="--d:${i * 0.07}s" href="/flavors.html#${f.id}"><img src="${f.image}" alt="${f.name}: ${f.tag}"></a>`,
        )
        .join("");
      observeReveals(collectionRow.querySelectorAll(".reveal"));
    }

    if (flavorJump) {
      flavorJump.innerHTML = flavors
        .map((f) => `<a href="#${f.id}">${f.name}</a>`)
        .join("");
    }

    if (flavorSheets) {
      flavorSheets.innerHTML = flavors.map((f, i) => flavorSheet(f, i)).join("");
      observeReveals(flavorSheets.querySelectorAll(".reveal"));
      if (location.hash) {
        document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    if (flavorGrid) {
      flavorGrid.innerHTML = flavors
        .map(
          (f, i) => `<a class="flavor-card reveal" id="${f.id}-card" style="--d:${i * 0.08}s" href="/flavors.html#${f.id}">
            <img src="${f.image}" alt="${f.name} bar">
            <div class="body">
              <p class="eyebrow">${f.tag}</p>
              <h3>${f.name}</h3>
              ${heatDots(f.heat)}
              <p>${f.story}</p>
              <p class="form-note">${f.nutrition.serving.calories} cal per serving · ${f.cacaoPercent}% cacao</p>
            </div>
          </a>`,
        )
        .join("");
      observeReveals(flavorGrid.querySelectorAll(".reveal"));
    }

    if (quizRoot) initQuiz(flavors);
  });
}

function initQuiz(flavors) {
  const questions = [
    {
      text: "How do you like the heat?",
      options: [
        { label: "A hush. I want cinnamon more than fire.", add: { cream: 3, heat: 0, adventure: 0 } },
        { label: "A glow. Warm, then gone enough to crave more.", add: { heat: 2, spice: 2, fruit: 1 } },
        { label: "Live fire. I came for the spark.", add: { heat: 4, spice: 3, adventure: 3 } },
      ],
    },
    {
      text: "What is your chocolate mood?",
      options: [
        { label: "Extra dark. Ember and cacao.", add: { smoke: 4, heat: 1 } },
        { label: "Silky and milky. A slow hug.", add: { cream: 4, spice: 1 } },
        { label: "Bright fruit over dark cacao.", add: { fruit: 4, floral: 1 } },
      ],
    },
    {
      text: "Which destination do you want in the wrapper?",
      options: [
        { label: "Cancún cactus fruit and jalapeño.", add: { fruit: 3, spice: 2, adventure: 1 } },
        { label: "A mango stand in the gold hour.", add: { fruit: 4, heat: 2, adventure: 2 } },
        { label: "Lime, salt, and green chile.", add: { citrus: 5, heat: 1 } },
        { label: "Hibiscus tea in the heat of the day.", add: { floral: 5, fruit: 1 } },
        { label: "A cinnamon kitchen after dark.", add: { cream: 3, spice: 3 } },
        { label: "Shade-grown cacao and smoke.", add: { smoke: 5, heat: 2 } },
      ],
    },
    {
      text: "After the sweet, what should stay?",
      options: [
        { label: "Fruit. I taste the sweet, then look for it again.", add: { fruit: 3, floral: 1 } },
        { label: "Heat. I want to crave the fire.", add: { heat: 3, spice: 2, adventure: 2 } },
        { label: "Smoke and orange peel.", add: { smoke: 3, citrus: 2 } },
      ],
    },
    {
      text: "How far off the map are you willing to go?",
      options: [
        { label: "First trip. Be kind, then surprise me.", add: { cream: 2, adventure: 0 } },
        { label: "I want the house original.", add: { fruit: 2, spice: 2, adventure: 2 } },
        { label: "Take the long road.", add: { adventure: 4, heat: 2, smoke: 1 } },
      ],
    },
  ];

  let step = 0;
  const score = { heat: 0, fruit: 0, cream: 0, citrus: 0, floral: 0, smoke: 0, spice: 0, adventure: 0 };

  const bind = () => {
    quizRoot.querySelectorAll("button[data-i]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const add = questions[step].options[Number(btn.dataset.i)].add;
        Object.entries(add).forEach(([k, v]) => {
          score[k] += v;
        });
        step += 1;
        render();
      });
    });
    document.getElementById("quiz-again")?.addEventListener("click", () => {
      step = 0;
      Object.keys(score).forEach((k) => (score[k] = 0));
      render();
    });
  };

  const markup = () => {
    if (step >= questions.length) {
      const winner = flavors
        .map((f) => ({
          f,
          n: Object.keys(score).reduce((sum, key) => sum + score[key] * (f.weights[key] || 0), 0),
        }))
        .sort((a, b) => b.n - a.n)[0].f;

      const ns = winner.nutrition.serving;
      return `<div class="quiz-face"><div class="quiz-result">
        <p class="eyebrow">Your bar</p>
        <h2>${winner.name}</h2>
        <p class="script-small">${winner.tag}</p>
        <img src="${winner.image}" alt="${winner.name}">
        <p>${winner.story}</p>
        ${heatDots(winner.heat)}
        <p class="quiz-nf">${ns.calories} calories per serving · ${winner.cacaoPercent}% cacao · 2.82 oz bar</p>
        <p style="margin-top:1.2rem;display:flex;gap:.7rem;justify-content:center;flex-wrap:wrap">
          <a class="btn btn-primary" href="/flavors.html#${winner.id}">Full Nutrition Facts</a>
          <button class="btn btn-outline" type="button" id="quiz-again">Try again</button>
        </p>
      </div></div>`;
    }

    const q = questions[step];
    return `<div class="quiz-face">
      <div class="quiz-progress" aria-hidden="true"><span style="width:${(step / questions.length) * 100}%"></span></div>
      <p class="eyebrow">Flavor Finder · ${step + 1} of ${questions.length}</p>
      <h2>${q.text}</h2>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `<button type="button" data-i="${i}">${opt.label}</button>`).join("")}
      </div>
    </div>`;
  };

  const paint = () => {
    quizRoot.style.pointerEvents = "";
    quizRoot.innerHTML = markup();
    bind();
  };

  const render = () => {
    const face = quizRoot.querySelector(".quiz-face");
    if (!face || reduceMotion) {
      paint();
      return;
    }
    quizRoot.style.pointerEvents = "none";
    face.classList.add("is-out");
    let swapped = false;
    const swap = () => {
      if (swapped) return;
      swapped = true;
      paint();
    };
    face.addEventListener("animationend", swap, { once: true });
    setTimeout(swap, 320);
  };

  paint();
}
