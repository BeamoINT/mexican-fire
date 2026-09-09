const nav = document.getElementById("nav");
const toggle = document.querySelector(".nav-toggle");
const form = document.getElementById("tasting-form");
const status = document.querySelector(".form-status");

const onScroll = () => {
  nav.classList.toggle("is-scrolled", window.scrollY > 20);
};

onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = form.email.value.trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  status.classList.remove("is-ok", "is-err");

  if (!valid) {
    status.textContent = "Enter a valid email so we can send the tasting invite.";
    status.classList.add("is-err");
    form.email.focus();
    return;
  }

  status.textContent = "You're on the list. Taste the heat. Crave the sweet.";
  status.classList.add("is-ok");
  form.reset();
});
