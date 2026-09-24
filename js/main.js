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

  document.querySelectorAll(".nav-item-dropdown").forEach(function (item) {
    var dropdownToggle = item.querySelector(".nav-dropdown-toggle");
    if (!dropdownToggle) return;

    dropdownToggle.addEventListener("click", function (e) {
      e.preventDefault();
      var isOpen = item.classList.toggle("open");
      dropdownToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });

  document.addEventListener("click", function (e) {
    document.querySelectorAll(".nav-item-dropdown.open").forEach(function (item) {
      if (!item.contains(e.target)) {
        item.classList.remove("open");
        var dropdownToggle = item.querySelector(".nav-dropdown-toggle");
        if (dropdownToggle) dropdownToggle.setAttribute("aria-expanded", "false");
      }
    });
  });

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

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PAGE_EXIT_MS = reduceMotion ? 0 : 250;

  document.querySelectorAll("a[href]").forEach(function (link) {
    var href = link.getAttribute("href");
    if (
      !href ||
      href.charAt(0) === "#" ||
      href.indexOf("mailto:") === 0 ||
      href.indexOf("tel:") === 0 ||
      link.target === "_blank" ||
      link.hostname !== window.location.hostname
    ) {
      return;
    }

    link.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
      document.body.classList.add("page-exit");
      setTimeout(function () {
        window.location.href = link.href;
      }, PAGE_EXIT_MS);
    });
  });
});
