const MAX_BYTES = 20_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTENTS = new Set(["contact", "tasting", "wholesale", "press"]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function clean(value, max) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BYTES) {
    return json({ ok: false, error: "That message is too long." }, 413);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Send the form as JSON." }, 400);
  }

  if (clean(payload.website, 80)) {
    return json({ ok: true });
  }

  const name = clean(payload.name, 80);
  const email = clean(payload.email, 120).toLowerCase();
  const company = clean(payload.company, 80);
  const message = clean(payload.message, 4000);
  const intent = INTENTS.has(payload.intent) ? payload.intent : "contact";

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "Enter a valid email so we can write back." }, 400);
  }

  if (intent !== "tasting" && (name.length < 2 || message.length < 8)) {
    return json({ ok: false, error: "Tell us your name and a little about what you need." }, 400);
  }

  const to = clean(env.CONTACT_TO, 120) || "beamo@beamosupport.com";
  const subject =
    intent === "tasting"
      ? "Mexican Fire — tasting list"
      : intent === "wholesale"
        ? "Mexican Fire — wholesale inquiry"
        : `Mexican Fire — ${intent}`;

  const text = [
    `Intent: ${intent}`,
    `Name: ${name || "(tasting list)"}`,
    `Email: ${email}`,
    company ? `Company: ${company}` : null,
    "",
    message || "Please add this address to the Mexican Fire tasting list.",
  ]
    .filter(Boolean)
    .join("\n");

  const form = new FormData();
  form.set("name", name || "Tasting guest");
  form.set("email", email);
  form.set("_replyto", email);
  form.set("_subject", subject);
  form.set("intent", intent);
  if (company) form.set("company", company);
  form.set("message", text);
  form.set("_template", "table");
  form.set("_captcha", "false");

  const origin = new URL(request.url).origin;
  const upstream = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Origin: origin,
      Referer: `${origin}/contact.html`,
    },
    body: form,
  });

  const upstreamBody = await upstream.json().catch(() => ({}));
  if (!upstream.ok || upstreamBody.success === false || upstreamBody.success === "false") {
    return json(
      {
        ok: false,
        error: "We could not send that just now. Email us directly and we will write back.",
      },
      502,
    );
  }

  return json({
    ok: true,
    message:
      intent === "tasting"
        ? "You're on the list. Taste the sweet. Crave the heat."
        : "Received. We will write back from the house.",
  });
}

export function onRequestGet() {
  return json({ ok: false, error: "Use POST." }, 405);
}
