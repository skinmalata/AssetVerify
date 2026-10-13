/* =============================================================================
   AssetVerify Property Services — Multi-step request form
   -----------------------------------------------------------------------------
   Handles the six-step verification request form, per-step validation, document
   validation and secure submission via AssetVerify.api.
   ========================================================================== */
(function () {
  var cfg = AssetVerify.CONFIG;
  var ui = AssetVerify.ui;
  var api = AssetVerify.api;

  var state = {
    step: 1,
    category: "land",
    checks: [],
    packageId: null,
    files: [],
    fileTypes: []
  };

  var form, steps, stepper;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ------------------------------- setup -------------------------------- */
  function init() {
    form = $("#request-form");
    steps = $all(".form-step");
    stepper = $all(".stepper__item");

    // Populate category options
    $("#category").innerHTML = '<option value="">Select…</option>' + cfg.categories.map(function (c) {
      return '<option value="' + c.id + '">' + ui.escapeHtml(c.label) + "</option>";
    }).join("");

    // Prefill from URL + logged-in user
    var params = new URLSearchParams(location.search);
    if (params.get("category")) $("#category").value = params.get("category");
    if (params.get("custom") === "1") $("#custom_quote").checked = true;

    var user = api.getUser();
    if (user) {
      if (!$("#email").value) $("#email").value = user.email || "";
      if (!$("#customer_name").value && user.user_metadata) $("#customer_name").value = user.user_metadata.full_name || "";
    }

    $("#category").addEventListener("change", onCategoryChange);
    $("#custom_quote").addEventListener("change", renderPackages);
    $("#files").addEventListener("change", onFilesChange);
    $("#btn-next").addEventListener("click", next);
    $("#btn-prev").addEventListener("click", prev);
    form.addEventListener("submit", onSubmit);

    state.category = $("#category").value || "land";
    renderChecks();
    renderPackages();
    if (params.get("package")) {
      state.packageId = params.get("package");
      renderPackages();
    }
    updateStepUI();
  }

  function onCategoryChange() {
    state.category = $("#category").value || "land";
    state.checks = [];
    state.packageId = null;
    renderChecks();
    renderPackages();
  }

  /* ------------------------------ step 3 -------------------------------- */
  function renderChecks() {
    var list = cfg.checksByCategory[state.category] || [];
    $("#checks-root").innerHTML = list.map(function (c) {
      var checked = state.checks.indexOf(c.id) !== -1 ? " checked" : "";
      return '<label class="checkbox"><input type="checkbox" value="' + c.id + '"' + checked + ">" +
        "<span><strong>" + ui.escapeHtml(c.label) + "</strong><span class='small muted'>" + ui.escapeHtml(c.desc) + "</span></span></label>";
    }).join("");
    $all("#checks-root input[type=checkbox]").forEach(function (box) {
      box.addEventListener("change", function () {
        var i = state.checks.indexOf(box.value);
        if (box.checked && i === -1) state.checks.push(box.value);
        if (!box.checked && i !== -1) state.checks.splice(i, 1);
        $("#checks-error").textContent = "";
      });
    });
  }

  /* ------------------------------ step 5 -------------------------------- */
  function renderPackages() {
    var packs = cfg.packages[state.category] || [];
    var custom = $("#custom_quote").checked;
    $("#packages-root").innerHTML = packs.map(function (p) {
      var sel = state.packageId === p.id ? " style='border-color:var(--navy-600);box-shadow:var(--shadow)'" : "";
      return '<article class="card card--hover" data-pkg="' + p.id + '"' + sel + " tabindex='0' role='button'>" +
        "<h3>" + ui.escapeHtml(p.name) + "</h3>" +
        '<div class="stat__value" style="font-size:1.4rem">' + ui.formatMoneyNaira(p.baseFee) + "</div>" +
        '<p class="small muted">Base fee · ' + ui.escapeHtml(p.days) + "</p>" +
        "<ul>" + p.items.map(function (i) { return "<li>" + ui.escapeHtml(i) + "</li>"; }).join("") + "</ul>" +
        (state.packageId === p.id ? '<span class="badge badge--done">Selected</span>' : "") +
      "</article>";
    }).join("");
    if (custom) {
      $("#packages-root").insertAdjacentHTML("beforeend",
        '<div class="alert alert--info" style="grid-column:1/-1"><p class="mb-0">You asked for a custom quote. Selecting a package is optional — we will review your request and send a tailored quotation.</p></div>');
    }
    $all("#packages-root [data-pkg]").forEach(function (el) {
      function choose() { state.packageId = el.getAttribute("data-pkg"); renderPackages(); renderPrice(); }
      el.addEventListener("click", choose);
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); } });
    });
    renderPrice();
  }

  function currentPackage() {
    return (cfg.packages[state.category] || []).find(function (p) { return p.id === state.packageId; }) || null;
  }

  function renderPrice() {
    var p = currentPackage();
    var custom = $("#custom_quote").checked;
    if (!p) {
      $("#price-summary").innerHTML =
        '<h3>Estimated cost</h3><p class="mb-0 muted">' +
        (custom ? "A tailored quotation will be issued after review." : "Select a package to see the estimated cost.") + "</p>";
      return;
    }
    var prof = Math.round(p.baseFee * 0.25 / 1000) * 1000;
    var third = Math.round(p.baseFee * 0.15 / 1000) * 1000;
    var total = p.baseFee + prof + third;
    $("#price-summary").innerHTML =
      "<h3>Estimated cost</h3>" +
      '<div class="table-wrap"><table><tbody>' +
        "<tr><th>Base fee (our work)</th><td>" + ui.formatMoneyNaira(p.baseFee) + "</td></tr>" +
        "<tr><th>Professional fees <span class='muted small'>(estimate)</span></th><td>" + ui.formatMoneyNaira(prof) + "</td></tr>" +
        "<tr><th>Third-party charges <span class='muted small'>(estimate)</span></th><td>" + ui.formatMoneyNaira(third) + "</td></tr>" +
        "<tr><th>Estimated total</th><td><strong>" + ui.formatMoneyNaira(total) + "</strong></td></tr>" +
        "<tr><th>Estimated delivery</th><td>" + ui.escapeHtml(p.days) + "</td></tr>" +
      "</tbody></table></div>" +
      '<p class="small muted mt-4 mb-0">Professional and third-party amounts are estimates only and are confirmed in your written quotation. Approx. ' + ui.formatMoney(ui.usdEstimate(total), "USD") + ".</p>";
  }

  /* ------------------------------ step 4 -------------------------------- */
  function onFilesChange() {
    var picked = Array.prototype.slice.call($("#files").files || []);
    var errors = api.validateFiles(picked);
    if (errors.length) {
      ui.showAlert("#form-alert", errors.join(" "), "danger");
      $("#files").value = "";
      return;
    }
    ui.showAlert("#form-alert", "", "info");
    var existing = state.files.length;
    if (existing + picked.length > cfg.upload.maxFiles) {
      ui.showAlert("#form-alert", "You may upload at most " + cfg.upload.maxFiles + " files in total.", "danger");
      return;
    }
    picked.forEach(function (f) { state.files.push(f); state.fileTypes.push("other"); });
    $("#files").value = "";
    renderFileList();
  }

  function renderFileList() {
    $("#file-list").innerHTML = state.files.map(function (f, i) {
      var opts = cfg.documentTypes.map(function (t) {
        return '<option value="' + t.id + '"' + (state.fileTypes[i] === t.id ? " selected" : "") + ">" + ui.escapeHtml(t.label) + "</option>";
      }).join("");
      return '<div class="card" style="padding:var(--space-3)"><div class="flex between">' +
        "<div><strong>" + ui.escapeHtml(f.name) + "</strong><br><span class='small muted'>" + (f.size / 1024).toFixed(0) + " KB</span></div>" +
        '<div class="flex">' +
          '<div class="field" style="margin:0"><label class="sr-only">Document type</label>' +
          '<select data-file-type="' + i + '">' + opts + "</select></div>" +
          '<button type="button" class="btn btn--outline btn--sm" data-remove="' + i + '">Remove</button>' +
        "</div></div></div>";
    }).join("");
    $all("#file-list [data-file-type]").forEach(function (sel) {
      sel.addEventListener("change", function () { state.fileTypes[Number(sel.getAttribute("data-file-type"))] = sel.value; });
    });
    $all("#file-list [data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-remove"));
        state.files.splice(i, 1); state.fileTypes.splice(i, 1); renderFileList();
      });
    });
  }

  /* ------------------------------ step 6 -------------------------------- */
  function collectPayload() {
    var p = currentPackage();
    var prof = p ? Math.round(p.baseFee * 0.25 / 1000) * 1000 : 0;
    var third = p ? Math.round(p.baseFee * 0.15 / 1000) * 1000 : 0;
    return {
      customer_name: $("#customer_name").value.trim(),
      email: $("#email").value.trim(),
      phone: $("#phone").value.trim(),
      preferred_contact: $("#preferred_contact").value,
      country: $("#country").value.trim(),
      buying_remote: $("#buying_remote").value,
      category: $("#category").value,
      asset_title: $("#asset_title").value.trim(),
      state: $("#state").value.trim(),
      lga: $("#lga").value.trim(),
      town: $("#town").value.trim(),
      address: $("#address").value.trim(),
      gps: $("#gps").value.trim(),
      asking_price: $("#asking_price").value ? Number($("#asking_price").value) : null,
      currency: $("#currency").value,
      seller_contact: $("#seller_contact").value.trim(),
      intended_purchase_date: $("#intended_purchase_date").value,
      checks: state.checks.slice(),
      package_id: state.packageId,
      base_fee: p ? p.baseFee : 0,
      professional_fees: prof,
      third_party_fees: third,
      total_fee: p ? p.baseFee + prof + third : 0,
      custom_quote: $("#custom_quote").checked,
      terms_accepted: $("#terms_accepted").checked,
      consent_processing: $("#consent_processing").checked
    };
  }

  function renderReview() {
    var d = collectPayload();
    var p = currentPackage();
    var checkLabels = state.checks.map(function (id) {
      var all = (cfg.checksByCategory[state.category] || []);
      var c = all.find(function (x) { return x.id === id; });
      return c ? c.label : id;
    });
    function row(k, v) { return "<tr><th>" + k + "</th><td>" + (v || "—") + "</td></tr>"; }
    $("#review-root").innerHTML =
      '<div class="table-wrap"><table><tbody>' +
        row("Name", ui.escapeHtml(d.customer_name)) +
        row("Email", ui.escapeHtml(d.email)) +
        row("Phone", ui.escapeHtml(d.phone)) +
        row("Preferred contact", ui.escapeHtml(d.preferred_contact)) +
        row("Country", ui.escapeHtml(d.country)) +
        row("Buying", d.buying_remote === "remotely" ? "Remotely" : "Locally") +
        row("Asset category", ui.escapeHtml(ui.categoryLabel(d.category))) +
        row("Asset", ui.escapeHtml(d.asset_title)) +
        row("Location", ui.escapeHtml([d.address, d.town, d.lga, d.state].filter(Boolean).join(", "))) +
        (d.gps ? row("GPS", ui.escapeHtml(d.gps)) : "") +
        row("Asking price", d.asking_price ? ui.formatMoney(d.asking_price, d.currency) : "—") +
        row("Checks requested", ui.escapeHtml(checkLabels.join(", "))) +
        row("Package", p ? ui.escapeHtml(p.name) + " — " + ui.formatMoneyNaira(p.baseFee) + " base" : (d.custom_quote ? "Custom quote requested" : "—")) +
        row("Estimated total", p ? ui.formatMoneyNaira(d.total_fee) : "To be quoted") +
        row("Documents attached", state.files.length ? state.files.length + " file(s)" : "None (can add later)") +
      "</tbody></table></div>" +
      '<p class="small muted mt-4">By submitting you confirm the details are accurate and accept our <a href="terms.html">Terms</a>.</p>';
  }

  /* --------------------------- step navigation -------------------------- */
  function validateStep(step) {
    var fs = steps[step - 1];
    if (step === 1 || step === 2) {
      return ui.validateRequired(fs, $all("[required]", fs));
    }
    if (step === 3) {
      if (state.checks.length === 0) {
        $("#checks-error").textContent = "Please select at least one check, or choose a package that covers your needs.";
        return false;
      }
      return true;
    }
    if (step === 4) {
      return ui.validateRequired(fs, $all("[required]", fs));
    }
    if (step === 5) {
      var custom = $("#custom_quote").checked;
      if (!custom && !state.packageId) {
        ui.showAlert("#form-alert", "Please select a service package, or tick 'request a custom quote'.", "danger");
        return false;
      }
      return ui.validateRequired(fs, $all("[required]", fs));
    }
    return true;
  }

  function next() {
    if (!validateStep(state.step)) {
      ui.showAlert("#form-alert", "Please complete the highlighted items before continuing.", "danger");
      return;
    }
    ui.showAlert("#form-alert", "", "info");
    if (state.step === 6) { return; }
    state.step++;
    if (state.step === 6) renderReview();
    updateStepUI();
    document.getElementById("main").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function prev() {
    if (state.step > 1) { state.step--; updateStepUI(); }
  }

  function updateStepUI() {
    steps.forEach(function (fs, i) { fs.classList.toggle("active", i + 1 === state.step); });
    stepper.forEach(function (s, i) {
      var n = i + 1;
      s.classList.toggle("active", n === state.step);
      s.classList.toggle("done", n < state.step);
    });
    $("#btn-prev").style.visibility = state.step === 1 ? "hidden" : "visible";
    $("#btn-next").classList.toggle("hidden", state.step === 6);
    $("#btn-submit").classList.toggle("hidden", state.step !== 6);
  }

  /* ------------------------------ submit -------------------------------- */
  async function onSubmit(e) {
    e.preventDefault();
    for (var s = 1; s <= 5; s++) {
      if (!validateStep(s)) {
        state.step = s; updateStepUI();
        ui.showAlert("#form-alert", "Please complete the highlighted items before submitting.", "danger");
        return;
      }
    }
    var payload = collectPayload();
    var btn = $("#btn-submit");
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      var result = await api.submitRequest(payload, state.files, state.fileTypes);
      showConfirmation(result);
    } catch (err) {
      ui.showAlert("#form-alert", (err && err.message) || "Sorry, we could not submit your request. Please try again or contact us.", "danger");
      btn.disabled = false; btn.textContent = "Submit request";
    }
  }

  function showConfirmation(result) {
    form.classList.add("hidden");
    document.getElementById("stepper").classList.add("hidden");
    ui.showAlert("#form-alert", "", "info");
    var user = api.getUser();
    $("#confirmation").classList.remove("hidden");
    $("#confirmation").innerHTML =
      '<div class="text-center">' +
        '<div class="card__icon" style="margin:0 auto var(--space-4);background:var(--success-bg);color:var(--success)">✓</div>' +
        "<h2>Request received</h2>" +
        "<p>Thank you. Your verification request has been submitted.</p>" +
        '<p class="eyebrow" style="font-size:1.1rem">Reference number</p>' +
        '<p style="font-size:1.6rem;font-weight:800;color:var(--navy-800);letter-spacing:.04em">' + ui.escapeHtml(result.reference) + "</p>" +
      "</div>" +
      '<div class="alert alert--info"><h3>What happens next</h3><ol class="mb-0">' +
        "<li>We review your request and confirm scope, price and any professional/third-party fees.</li>" +
        "<li>We contact you about payment and any documents we still need.</li>" +
        "<li>Once confirmed, verification begins and you can follow progress.</li>" +
      "</ol><p class='small mt-3 mb-0'>We aim to respond within one working day. An acknowledgement email will be sent to the address you provided when email delivery is configured.</p></div>" +
      '<div class="btn-group">' +
        '<a class="btn btn--primary" href="track.html?ref=' + encodeURIComponent(result.reference) + '">Track this request</a>' +
        (user ? '<a class="btn btn--outline" href="dashboard.html">Go to my dashboard</a>' : '<a class="btn btn--outline" href="register.html">Create an account to track easily</a>') +
      "</div>";
    document.getElementById("main").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
