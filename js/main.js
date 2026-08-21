document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var navLinks = document.getElementById("nav-links");

  if (toggle && navLinks) {
    toggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  var themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));

    themeToggle.addEventListener("click", function () {
      isDark = document.documentElement.getAttribute("data-theme") === "dark";
      var next = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      themeToggle.setAttribute("aria-pressed", String(!isDark));
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
    });
  }
});
