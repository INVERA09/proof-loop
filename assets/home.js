// Proof Loop landing page: scroll reveals, the sticky "how it works" picture, the nav edge and the
// sign-up form. IntersectionObserver only (no scroll listeners). Works opened straight from the folder.
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Sections fade up once as they come into view.
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); seen.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { seen.observe(el); });
  }

  // How it works: the step in the middle of the screen picks the picture.
  var stack = document.querySelector(".stack");
  var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
  var bars = Array.prototype.slice.call(document.querySelectorAll(".rail span"));
  function activate(i) {
    if (stack) stack.setAttribute("data-active", String(i));
    steps.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
    bars.forEach(function (b, k) { b.classList.toggle("is-on", k <= i); });
  }
  activate(0);
  if ("IntersectionObserver" in window) {
    var middle = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) activate(Number(e.target.getAttribute("data-step")));
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    steps.forEach(function (s) { middle.observe(s); });
  }

  // A hairline under the nav once the page has moved.
  var nav = document.querySelector(".nav");
  var sentinel = document.querySelector(".sentinel");
  if (nav && sentinel && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle("is-stuck", !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  // Sign-up form: checked here, nothing is sent (it is a prototype).
  var form = document.querySelector(".form");
  if (!form) return;
  var done = form.querySelector(".form__done");
  function setError(input, message) {
    var out = document.getElementById(input.id + "-error");
    out.textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
    return !message;
  }
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var name = form.elements.name, email = form.elements.email;
    var okName = setError(name, name.value.trim() ? "" : "Please enter your name.");
    var okEmail = setError(email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? "" : "Please enter an email like name@example.com.");
    if (!okName) { name.focus(); return; }
    if (!okEmail) { email.focus(); return; }
    var first = name.value.trim().split(/\s+/)[0];
    done.textContent = "Thanks, " + first + ". This is a school prototype, so nothing was sent.";
    form.querySelector("button").blur();
  });
})();
