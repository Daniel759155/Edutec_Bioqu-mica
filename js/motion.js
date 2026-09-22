document.addEventListener("DOMContentLoaded", function () {
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: encolhe/ganha fundo ao rolar ---------- */
  var header = document.querySelector(".header");
  if (header) {
    var updateHeaderState = function () {
      var scrolled = window.scrollY > 24;
      header.classList.toggle("is-scrolled", scrolled);
    };
    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
  }

  /* ---------- Revelação ao rolar ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) {
        el.classList.add("is-visible");
      });
    } else {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach(function (el) {
        observer.observe(el);
      });
    }
  }

  /* ---------- Marcos da história: destaque ao clicar ---------- */
  document.querySelectorAll(".marco").forEach(function (marco) {
    marco.addEventListener("click", function () {
      marco.classList.toggle("is-active");
    });
    marco.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        marco.classList.toggle("is-active");
      }
    });
  });

  /* ---------- Accordion genérico ---------- */
  document.querySelectorAll(".accordion-trigger").forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      var item = trigger.closest(".accordion-item");
      if (!item) return;
      var isOpen = item.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });

  /* ---------- Cartões expansíveis (biomoléculas) ---------- */
  document.querySelectorAll(".biomol-expand-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest(".biomol-card");
      if (!card) return;
      var isExpanded = card.classList.toggle("is-expanded");
      btn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      btn.textContent = isExpanded ? "Ver menos" : "Ver mais";
    });
  });
});
