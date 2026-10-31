/* =====================================================================
   DigiAgentic — CTA popup form
   Opens a short enquiry form (Name, Mobile, Email optional, Query) when a
   visitor clicks any "Book a discovery call" / contact CTA, instead of
   jumping to the contact section. Submits to the existing contact API, so
   leads land in the same admin inbox.

   Loaded on every page. Self-contained: injects its own styles + markup.
   CTAs it hijacks: <a> with class button-primary / button-light /
   footer-cta-link whose href ends in "#contact". (The "Get a Free Audit"
   button and plain nav links are left alone.)
   ===================================================================== */
(function () {
  "use strict";

  var API_URL = "https://api.digiagentic.in/api/contact/submit/";
  var SELECTOR =
    'a.button-primary[href$="#contact"],' +
    'a.button-light[href$="#contact"],' +
    'a.footer-cta-link[href$="#contact"],' +
    'a.audit-btn,' +
    'a.services-cta-button,' +
    'a[href$="/free-digital-presence-audit/"]';

  /* ---------- styles ---------- */
  var css =
    '.cta-modal{position:fixed;inset:0;z-index:4000;display:flex;align-items:flex-start;justify-content:center;padding:clamp(16px,6vh,80px) 16px 16px;overflow-y:auto}' +
    '.cta-modal[hidden]{display:none}' +
    '.cta-modal-backdrop{position:fixed;inset:0;background:rgba(13,13,18,.55);backdrop-filter:blur(3px)}' +
    '.cta-modal-box{position:relative;width:100%;max-width:440px;background:#fff;border-radius:18px;padding:28px 26px 24px;box-shadow:0 30px 70px rgba(13,13,18,.4);font-family:"Lora",Georgia,serif}' +
    '.cta-modal-close{position:absolute;top:12px;right:14px;width:34px;height:34px;border:none;background:transparent;font-size:1.7rem;line-height:1;color:#6b7186;cursor:pointer;border-radius:8px}' +
    '.cta-modal-close:hover{color:#212467;background:#f5f6fa}' +
    '.cta-modal-kicker{margin:0 0 8px;color:#208281;font-family:"Poppins",Arial,sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}' +
    '.cta-modal-box h2{margin:0 0 6px;color:#212467;font-family:"Poppins",Arial,sans-serif;font-size:1.3rem;font-weight:700;letter-spacing:-.02em;line-height:1.2}' +
    '.cta-modal-sub{margin:0 0 18px;color:#6b7186;font-size:.92rem;line-height:1.5}' +
    '.cta-modal-form{display:flex;flex-direction:column;gap:13px}' +
    '.cta-modal-form label{display:flex;flex-direction:column;gap:5px;font-family:"Poppins",Arial,sans-serif;font-size:.78rem;font-weight:600;color:#212467}' +
    '.cta-modal-form input,.cta-modal-form textarea{font-family:"Lora",Georgia,serif;font-size:.95rem;color:#0d0d12;padding:11px 13px;border:1px solid rgba(33,36,103,.22);border-radius:9px;background:#fff;width:100%;box-sizing:border-box}' +
    '.cta-modal-form input:focus,.cta-modal-form textarea:focus{outline:none;border-color:#208281;box-shadow:0 0 0 3px rgba(32,130,129,.15)}' +
    '.cta-modal-form textarea{resize:vertical;min-height:70px}' +
    '.cta-hp{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}' +
    '.cta-modal-submit{margin-top:4px;min-height:50px;border:none;border-radius:8px;background:#fbc731;color:#212467;font-family:"Poppins",Arial,sans-serif;font-size:.92rem;font-weight:700;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;box-shadow:0 8px 18px rgba(33,36,103,.14)}' +
    '.cta-modal-submit:hover{transform:translateY(-1px);box-shadow:0 12px 24px rgba(33,36,103,.2)}' +
    '.cta-modal-submit:disabled{opacity:.6;cursor:default;transform:none}' +
    '.cta-modal-status{margin:6px 0 0;font-family:"Poppins",Arial,sans-serif;font-size:.86rem;font-weight:600;line-height:1.5}' +
    '.cta-modal-status.ok{color:#208281}.cta-modal-status.err{color:#c0392b}' +
    '.cta-modal-done{text-align:center;padding:14px 0 6px}' +
    '.cta-modal-done .cta-tick{width:54px;height:54px;margin:0 auto 14px;border-radius:50%;background:#208281;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.7rem}' +
    '.cta-modal-done h2{margin-bottom:8px}';

  /* ---------- markup ---------- */
  var html =
    '<div class="cta-modal-backdrop" data-cta-close></div>' +
    '<div class="cta-modal-box" role="dialog" aria-modal="true" aria-labelledby="cta-modal-title">' +
      '<button type="button" class="cta-modal-close" data-cta-close aria-label="Close">&times;</button>' +
      '<div class="cta-modal-content">' +
        '<p class="cta-modal-kicker">Book a discovery call</p>' +
        '<h2 id="cta-modal-title">Let’s understand your business</h2>' +
        '<p class="cta-modal-sub">Share a few details and we’ll call you back within 24 hours. No obligation.</p>' +
        '<form class="cta-modal-form" novalidate>' +
          '<label>Name<input name="name" type="text" autocomplete="name" required maxlength="200" /></label>' +
          '<label>Mobile number<input name="phone" type="tel" inputmode="numeric" autocomplete="tel" required /></label>' +
          '<label>Email <span style="font-weight:400;color:#6b7186">(optional)</span><input name="email" type="email" autocomplete="email" /></label>' +
          '<label>Your query<textarea name="message" rows="3" required></textarea></label>' +
          '<input class="cta-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
          '<button type="submit" class="cta-modal-submit">Submit</button>' +
          '<p class="cta-modal-status" role="status" aria-live="polite" hidden></p>' +
        '</form>' +
      '</div>' +
    '</div>';

  var modal, lastFocus;

  function build() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    modal = document.createElement("div");
    modal.className = "cta-modal";
    modal.hidden = true;
    modal.innerHTML = html;
    document.body.appendChild(modal);

    modal.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-cta-close")) close();
    });
    modal.querySelector(".cta-modal-form").addEventListener("submit", submit);
  }

  function open(sourceLabel) {
    if (!modal) build();
    lastFocus = document.activeElement;
    // record which page/CTA the lead came from (shows in the admin + email)
    var hp = modal.querySelector('input[name="website"]');
    modal.setAttribute("data-source", sourceLabel || document.title || location.pathname);
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    var first = modal.querySelector('input[name="name"]');
    if (first) setTimeout(function () { first.focus(); }, 30);
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function submit(e) {
    e.preventDefault();
    var form = e.target;
    var els = form.elements;
    var status = form.querySelector(".cta-modal-status");
    var btn = form.querySelector(".cta-modal-submit");

    function show(msg, ok) {
      status.textContent = msg;
      status.className = "cta-modal-status " + (ok ? "ok" : "err");
      status.hidden = false;
    }

    var name = (els["name"].value || "").trim();
    var phoneRaw = (els["phone"].value || "").trim();
    var phoneDigits = phoneRaw.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    var email = (els["email"].value || "").trim();
    var message = (els["message"].value || "").trim();

    if (name.length < 2) { show("Please enter your name.", false); els["name"].focus(); return; }
    if (phoneDigits.length !== 10) { show("Please enter a valid 10-digit mobile number.", false); els["phone"].focus(); return; }
    if (message.length < 3) { show("Please tell us briefly what you need.", false); els["message"].focus(); return; }

    var payload = {
      name: name,
      phone: phoneDigits,
      email: email,
      message: message,
      service_interest: modal.getAttribute("data-source") || "",
      website: els["website"] ? els["website"].value : ""
    };

    var orig = btn.textContent;
    btn.disabled = true; btn.textContent = "Sending…";
    status.hidden = true;

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d && res.d.success) {
          var box = modal.querySelector(".cta-modal-content");
          box.innerHTML =
            '<div class="cta-modal-done">' +
              '<div class="cta-tick" aria-hidden="true">✓</div>' +
              '<h2>Submitted successfully!</h2>' +
              '<p class="cta-modal-sub">Thank you. We’ll call you back within 24 hours.</p>' +
              '<button type="button" class="cta-modal-submit" data-cta-close>Close</button>' +
            '</div>';
        } else {
          show("Something went wrong. Please try again, or email info@digiagentic.in.", false);
        }
      })
      .catch(function () {
        show("Could not send right now. Please email info@digiagentic.in.", false);
      })
      .finally(function () { btn.disabled = false; btn.textContent = orig; });
  }

  /* ---------- wire up the CTA buttons (event delegation) ---------- */
  document.addEventListener("click", function (e) {
    var link = e.target.closest ? e.target.closest(SELECTOR) : null;
    if (!link) return;
    e.preventDefault();
    var label = (link.textContent || "").trim() + "  —  " + location.pathname;
    open(label);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && !modal.hidden) close();
  });
})();
