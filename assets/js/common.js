/* =============================================================================
   AssetVerify Property Services — Shared UI helpers
   -----------------------------------------------------------------------------
   Renders the header, footer, badges and small utilities used on every page.
   ========================================================================== */
window.AssetVerify = window.AssetVerify || {};

AssetVerify.ui = (function () {
  var cfg = AssetVerify.CONFIG;
  var api = AssetVerify.api;

  var PAGES = [
    { href: "index.html",         label: "Home",         id: "home" },
    { href: "about.html",         label: "About",        id: "about" },
    { href: "services.html",      label: "Services",     id: "services" },
    { href: "pricing.html",       label: "Pricing",      id: "pricing" },
    { href: "contact.html",       label: "Contact",      id: "contact" }
  ];

  /* --------------------------- small utilities --------------------------- */
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  function formatDateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatMoney(amount, currency) {
    amount = Number(amount || 0);
    currency = currency || cfg.currency.base;
    if (currency === "USD") {
      return "$" + amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    return cfg.currency.symbol + amount.toLocaleString("en-NG", { maximumFractionDigits: 0 });
  }
  function formatMoneyNaira(amount) { return formatMoney(amount, "NGN"); }
  function usdEstimate(ngn) {
    return Math.round(Number(ngn || 0) / cfg.currency.usdRate);
  }

  function statusMeta(id) {
    return cfg.statuses.find(function (s) { return s.id === id; }) || { label: id || "Unknown", badge: "badge--neutral" };
  }
  function statusBadge(id) {
    var m = statusMeta(id);
    return '<span class="badge ' + m.badge + '">' + escapeHtml(m.label) + "</span>";
  }
  function categoryLabel(id) {
    var c = cfg.categories.find(function (x) { return x.id === id; });
    return c ? c.label : (id || "—");
  }
  function riskMeta(id) {
    return cfg.riskLevels.find(function (r) { return r.id === id; }) || null;
  }
  function riskBadge(id) {
    var m = riskMeta(id);
    if (!m) return '<span class="badge badge--neutral">Not assessed</span>';
    return '<span class="badge ' + m.className + '">' + escapeHtml(m.label) + "</span>";
  }

  /* ------------------------------- header -------------------------------- */
  function headerHtml(active) {
    var b = cfg.brand;
    var links = PAGES.map(function (p) {
      var cur = p.id === active ? ' aria-current="page"' : "";
      return '<a href="' + p.href + '"' + cur + ">" + escapeHtml(p.label) + "</a>";
    }).join("");
    var user = api.getUser();
    var rightLinks = user
      ? '<a href="' + (api.isAdmin() ? "admin.html" : "dashboard.html") + '" class="btn btn--outline btn--sm">My Dashboard</a>' +
        '<button type="button" class="btn btn--primary btn--sm" data-action="signout">Sign Out</button>'
      : '<a href="login.html" class="btn btn--outline btn--sm">Login</a>' +
        '<a href="request.html" class="btn btn--primary btn--sm">Request Verification</a>';

    return '' +
      '<a href="#main" class="skip-link">Skip to content</a>' +
      '<div class="container site-header__bar">' +
        '<a class="brand" href="index.html" aria-label="' + escapeHtml(b.name) + ' home">' +
          '<span class="brand__mark" aria-hidden="true">' + escapeHtml(b.initials) + "</span>" +
          '<span class="brand__name"><strong>' + escapeHtml(b.name) + "</strong></span>" +
        "</a>" +
        '<button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false" data-action="nav-toggle">' +
          "<span></span><span></span><span></span>" +
        "</button>" +
        '<nav class="nav" id="primary-nav" aria-label="Primary">' + links +
          '<span class="nav-auth">' + rightLinks + "</span>" +
        "</nav>" +
      "</div>";
  }

  /* ------------------------------- footer -------------------------------- */
  function footerHtml() {
    var b = cfg.brand;
    return '' +
      '<div class="container">' +
        '<div class="footer-grid">' +
          "<div>" +
            '<a class="brand" href="index.html"><span class="brand__mark" aria-hidden="true">' + escapeHtml(b.initials) + "</span>" +
            '<span class="brand__name" style="color:#fff"><strong>' + escapeHtml(b.name) + "</strong></span></a>" +
            '<p style="margin-top:1rem">' + escapeHtml(b.tagline) + ". Helping buyers make informed decisions before they pay.</p>" +
            '<p class="small">' + escapeHtml(b.regNote) + "</p>" +
          "</div>" +
          "<div><h4>Company</h4><ul>" +
            '<li><a href="about.html">About Us</a></li>' +
            '<li><a href="services.html">Our Services</a></li>' +
            '<li><a href="how-it-works.html">How It Works</a></li>' +
            '<li><a href="pricing.html">Pricing</a></li>' +
            '<li><a href="faq.html">FAQ</a></li>' +
          "</ul></div>" +
          "<div><h4>Customers</h4><ul>" +
            '<li><a href="request.html">Submit a Request</a></li>' +
            '<li><a href="track.html">Track a Request</a></li>' +
            '<li><a href="dashboard.html">Customer Portal</a></li>' +
            '<li><a href="contact.html">Contact Us</a></li>' +
            '<li><a href="login.html">Login / Register</a></li>' +
          "</ul></div>" +
          "<div><h4>Contact</h4><ul>" +
            "<li>" + escapeHtml(b.address) + "</li>" +
            "<li><a href=\"mailto:" + escapeHtml(b.email) + "\">" + escapeHtml(b.email) + "</a></li>" +
            "<li><a href=\"tel:" + escapeHtml(b.phone.replace(/\s/g, "")) + "\">" + escapeHtml(b.phone) + "</a></li>" +
            "<li>" + escapeHtml(b.hours) + "</li>" +
          "</ul></div>" +
        "</div>" +
        '<div class="footer-bottom">' +
          "<span>&copy; " + new Date().getFullYear() + " " + escapeHtml(b.name) + ". All rights reserved.</span>" +
          '<span><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a> · <a href="disclaimer.html">Limitations &amp; Disclaimers</a></span>' +
        "</div>" +
      "</div>";
  }

  /* ------------------------------ mounting ------------------------------- */
  function mount(active) {
    var h = document.querySelector("[data-site-header]");
    if (h) { h.className = "site-header"; h.innerHTML = headerHtml(active); }
    var f = document.querySelector("[data-site-footer]");
    if (f) { f.className = "site-footer"; f.innerHTML = footerHtml(); }
    bindGlobal();
    // Re-render the header when auth state settles or changes (live mode).
    if (!mount._authBound) {
      mount._authBound = true;
      api.onAuth(function () {
        var hdr = document.querySelector("[data-site-header]");
        if (hdr) {
          hdr.innerHTML = headerHtml(document.body.getAttribute("data-page") || "");
          bindGlobal();
        }
      });
    }
  }

  function bindGlobal() {
    var toggle = document.querySelector('[data-action="nav-toggle"]');
    var nav = document.getElementById("primary-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    document.querySelectorAll('[data-action="signout"]').forEach(function (btn) {
      btn.addEventListener("click", async function () {
        await api.auth.signOut();
        location.href = "index.html";
      });
    });
  }

  /* ------------------------------- alerts -------------------------------- */
  function alertHtml(msg, type) {
    type = type || "info";
    return '<div class="alert alert--' + type + '" role="alert">' + msg + "</div>";
  }
  function showAlert(container, msg, type) {
    var el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;
    el.innerHTML = alertHtml(escapeHtml(msg), type);
  }
  function showAlertRaw(container, html, type) {
    var el = typeof container === "string" ? document.querySelector(container) : container;
    if (!el) return;
    el.innerHTML = alertHtml(html, type);
  }

  function toast(msg, type) {
    var t = document.createElement("div");
    t.className = "alert alert--" + (type || "info");
    t.setAttribute("role", "status");
    t.style.cssText = "position:fixed;right:1rem;bottom:1rem;z-index:9999;max-width:340px;box-shadow:var(--shadow-lg);background:#fff";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
  }

  /* ---------------------------- auth guards ------------------------------ */
  function requireAuth(redirect) {
    var u = api.getUser();
    if (!u) {
      location.href = (redirect || "login.html") + "?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search);
      return null;
    }
    return u;
  }
  function requireAdmin() {
    var u = requireAuth();
    if (u && !api.isAdmin()) {
      location.href = "dashboard.html";
      return null;
    }
    return u;
  }

  /* ---------------------------- form helpers ----------------------------- */
  function serialize(form) {
    var out = {};
    new FormData(form).forEach(function (v, k) { out[k] = v; });
    return out;
  }
  function setFieldError(input, message) {
    var field = input.closest(".field");
    var err = field ? field.querySelector(".error-text") : null;
    if (field) field.classList.toggle("invalid", !!message);
    if (err) err.textContent = message || "";
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }
  function validateRequired(form, selectors) {
    var ok = true;
    (selectors || form.querySelectorAll("[required]")).forEach(function (input) {
      if (input.type === "checkbox") {
        if (!input.checked) { setFieldError(input, "This is required."); ok = false; }
        else setFieldError(input, "");
        return;
      }
      var val = (input.value || "").trim();
      if (!val) { setFieldError(input, "This field is required."); ok = false; return; }
      if (input.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
        setFieldError(input, "Enter a valid email address."); ok = false; return;
      }
      if (input.type === "tel" && !/^\+?[0-9 ()\-]{7,20}$/.test(val)) {
        setFieldError(input, "Enter a valid phone number with country code."); ok = false; return;
      }
      setFieldError(input, "");
    });
    return ok;
  }

  function loadingHtml(text) {
    return '<div class="loading-block"><div class="spinner"></div><p>' + escapeHtml(text || "Loading…") + "</p></div>";
  }

  function categoryIcon(id) {
    var c = cfg.categories.find(function (x) { return x.id === id; });
    return c ? c.icon : "📄";
  }

  return {
    mount: mount, bindGlobal: bindGlobal,
    escapeHtml: escapeHtml, qs: qs,
    formatDate: formatDate, formatDateTime: formatDateTime,
    formatMoney: formatMoney, formatMoneyNaira: formatMoneyNaira, usdEstimate: usdEstimate,
    statusBadge: statusBadge, statusMeta: statusMeta, riskBadge: riskBadge, riskMeta: riskMeta,
    categoryLabel: categoryLabel, categoryIcon: categoryIcon,
    showAlert: showAlert, showAlertRaw: showAlertRaw, toast: toast,
    requireAuth: requireAuth, requireAdmin: requireAdmin,
    serialize: serialize, setFieldError: setFieldError, validateRequired: validateRequired,
    loadingHtml: loadingHtml
  };
})();

/* Boot: initialise the data layer then render chrome. */
document.addEventListener("DOMContentLoaded", function () {
  AssetVerify.api.init();
  var active = document.body.getAttribute("data-page") || "";
  AssetVerify.ui.mount(active);
});
