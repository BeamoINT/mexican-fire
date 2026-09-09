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

const revealEls = document.querySelectorAll(".reveal");
if (revealEls.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 },
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-in"));
}

function heatDots(n) {
  return `<div class="heat-dots" aria-label="Heat ${n} of 5">${[1, 2, 3, 4, 5]
    .map((i) => `<span class="${i <= n ? "on" : ""}"></span>`)
    .join("")}</div>`;
}

async function postForm(payload, statusEl) {
  statusEl.classList.remove("is-ok", "is-err");
  statusEl.textContent = "Sending…";
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "We could not send that just now.");
    }
    statusEl.textContent = data.message;
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

const flavorGrid = document.getElementById("flavor-grid");
const collectionRow = document.getElementById("collection-row");
const quizRoot = document.getElementById("quiz");

async function loadFlavors() {
  const res = await fetch("/data/flavors.json");
  const data = await res.json();
  return data.flavors;
}

if (flavorGrid || collectionRow || quizRoot) {
  loadFlavors().then((flavors) => {
    if (collectionRow) {
      collectionRow.innerHTML = flavors
        .map(
          (f) =>
            `<a href="/flavors.html#${f.id}"><img src="${f.image}" alt="${f.name}: ${f.tag}"></a>`,
        )
        .join("");
    }

    if (flavorGrid) {
      flavorGrid.innerHTML = flavors
        .map(
          (f) => `<article class="flavor-card reveal is-in" id="${f.id}">
            <img src="${f.image}" alt="${f.name} bar">
            <div class="body">
              <p class="eyebrow">${f.tag}</p>
              <h3>${f.name}</h3>
              ${heatDots(f.heat)}
              <p>${f.story}</p>
              <p class="form-note">${f.ingredients.join(" · ")}</p>
            </div>
          </article>`,
        )
        .join("");
      if (location.hash) {
        document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
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

  const render = () => {
    if (step >= questions.length) {
      const winner = flavors
        .map((f) => ({
          f,
          n: Object.keys(score).reduce((sum, key) => sum + score[key] * (f.weights[key] || 0), 0),
        }))
        .sort((a, b) => b.n - a.n)[0].f;

      quizRoot.innerHTML = `<div class="quiz-result">
        <p class="eyebrow">Your bar</p>
        <h2>${winner.name}</h2>
        <p class="script-small">${winner.tag}</p>
        <img src="${winner.image}" alt="${winner.name}">
        <p>${winner.story}</p>
        ${heatDots(winner.heat)}
        <p style="margin-top:1.2rem;display:flex;gap:.7rem;justify-content:center;flex-wrap:wrap">
          <a class="btn btn-primary" href="/flavors.html#${winner.id}">See the collection</a>
          <button class="btn btn-outline" type="button" id="quiz-again">Try again</button>
        </p>
      </div>`;
      document.getElementById("quiz-again").addEventListener("click", () => {
        step = 0;
        Object.keys(score).forEach((k) => (score[k] = 0));
        render();
      });
      return;
    }

    const q = questions[step];
    quizRoot.innerHTML = `
      <div class="quiz-progress" aria-hidden="true"><span style="width:${(step / questions.length) * 100}%"></span></div>
      <p class="eyebrow">Flavor Finder · ${step + 1} of ${questions.length}</p>
      <h2>${q.text}</h2>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `<button type="button" data-i="${i}">${opt.label}</button>`).join("")}
      </div>`;

    quizRoot.querySelectorAll("button[data-i]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const add = q.options[Number(btn.dataset.i)].add;
        Object.entries(add).forEach(([k, v]) => {
          score[k] += v;
        });
        step += 1;
        render();
      });
    });
  };

  render();
}
