/* =============================================================================
   AssetVerify Property Services — API / data layer
   -----------------------------------------------------------------------------
   One clean interface used by every page. It automatically uses Supabase when
   `AssetVerify.CONFIG.supabase.url` is set, otherwise it uses a localStorage
   demo backend seeded with fictional records.

   Security note: the browser only ever holds the Supabase ANON key. Row Level
   Security policies (see supabase/migrations) decide what that key can read or
   write. Administrative actions are additionally guarded here for UX, but the
   real enforcement lives in the database, never in this file.
   ========================================================================== */
window.AssetVerify = window.AssetVerify || {};

AssetVerify.api = (function () {
  var cfg = AssetVerify.CONFIG;
  var sb = null;                 // Supabase client instance
  var currentSession = null;     // cached session
  var authListeners = [];
  var STORE_KEY = "vn_demo_db_v1";
  var SESSION_KEY = "vn_demo_session_v1";
  var readyResolve = null;
  var readyPromise = new Promise(function (res) { readyResolve = res; });

  /* ------------------------------------------------------------------ *
   *  Helpers
   * ------------------------------------------------------------------ */
  function isLive() {
    return !!(cfg.supabase && cfg.supabase.url && cfg.supabase.anonKey && window.supabase);
  }

  function nowISO() { return new Date().toISOString(); }

  function uid(prefix) {
    var rnd = Math.random().toString(36).slice(2, 10);
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + rnd;
  }

  function makeReference() {
    var year = new Date().getFullYear();
    var n = Math.floor(100000 + Math.random() * 900000);
    return "AV-" + year + "-" + n;
  }

  /* ------------------------------------------------------------------ *
   *  Demo backend (localStorage)
   * ------------------------------------------------------------------ */
  var demo = (function () {
    function load() {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) {
        var seed = JSON.parse(JSON.stringify(AssetVerify.DEMO_SEED));
        localStorage.setItem(STORE_KEY, JSON.stringify(seed));
        return seed;
      }
      try { return JSON.parse(raw); } catch (e) { return JSON.parse(JSON.stringify(AssetVerify.DEMO_SEED)); }
    }
    function save(db) { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
    return {
      load: load, save: save,
      reset: function () { localStorage.removeItem(STORE_KEY); localStorage.removeItem(SESSION_KEY); }
    };
  })();

  function demoSession() {
    var raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }
  function setDemoSession(user) {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
    currentSession = user ? { user: user } : null;
    authListeners.forEach(function (cb) { try { cb(currentSession); } catch (e) {} });
  }

  /* ------------------------------------------------------------------ *
   *  Initialisation
   * ------------------------------------------------------------------ */
  function init() {
    if (isLive()) {
      sb = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);
      sb.auth.getSession().then(function (res) {
        currentSession = res && res.data ? res.data.session : null;
        authListeners.forEach(function (cb) { cb(currentSession); });
        readyResolve();
      });
      sb.auth.onAuthStateChange(function (_event, session) {
        currentSession = session;
        authListeners.forEach(function (cb) { cb(session); });
      });
    } else {
      setDemoSession(demoSession());
      readyResolve();
    }
  }

  function ready() { return readyPromise; }

  function onAuth(cb) {
    authListeners.push(cb);
    if (currentSession !== undefined) cb(currentSession);
    return function () { authListeners = authListeners.filter(function (f) { return f !== cb; }); };
  }

  function getUser() {
    if (isLive()) return currentSession ? currentSession.user : null;
    var s = demoSession();
    return s ? { id: s.id, email: s.email, user_metadata: { full_name: s.full_name, role: s.role } } : null;
  }

  function isAdmin() {
    var u = getUser();
    if (!u) return false;
    if (!isLive()) return (u.user_metadata && u.user_metadata.role) === "admin";
    return (u.user_metadata && u.user_metadata.role) === "admin" ||
           (u.app_metadata && u.app_metadata.role) === "admin";
  }

  /* ------------------------------------------------------------------ *
   *  Authentication
   * ------------------------------------------------------------------ */
  var auth = {
    signUp: async function (email, password, meta) {
      if (isLive()) {
        var res = await sb.auth.signUp({
          email: email, password: password,
          options: { data: { full_name: (meta && meta.full_name) || "", phone: (meta && meta.phone) || "" } }
        });
        if (res.error) throw res.error;
        if (res.data && res.data.session) {
          currentSession = res.data.session;
          authListeners.forEach(function (cb) { cb(currentSession); });
        }
        return res.data;
      }
      var db = demo.load();
      if (db.users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })) {
        throw new Error("An account with this email already exists.");
      }
      var user = { id: uid("user"), email: email, password: password,
        full_name: (meta && meta.full_name) || "", phone: (meta && meta.phone) || "",
        country: (meta && meta.country) || "", role: "customer" };
      db.users.push(user); demo.save(db);
      setDemoSession(user);
      return { user: user };
    },
    signIn: async function (email, password) {
      if (isLive()) {
        var res = await sb.auth.signInWithPassword({ email: email, password: password });
        if (res.error) throw res.error;
        if (res.data && res.data.session) {
          currentSession = res.data.session;
          authListeners.forEach(function (cb) { cb(currentSession); });
        }
        return res.data;
      }
      var db = demo.load();
      var user = db.users.find(function (u) {
        return u.email.toLowerCase() === email.toLowerCase() && u.password === password;
      });
      if (!user) throw new Error("Incorrect email or password.");
      setDemoSession(user);
      return { user: user };
    },
    signOut: async function () {
      if (isLive()) { await sb.auth.signOut(); }
      else { setDemoSession(null); }
    },
    resetPassword: async function (email) {
      if (isLive()) {
        var res = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, "") + "reset-password.html" });
        if (res.error) throw res.error;
        return true;
      }
      return true; // demo: accepted silently
    },
    updatePassword: async function (password) {
      if (isLive()) {
        var res = await sb.auth.updateUser({ password: password });
        if (res.error) throw res.error;
        return true;
      }
      var s = demoSession();
      if (!s) throw new Error("Not signed in.");
      var db = demo.load();
      db.users.forEach(function (u) { if (u.id === s.id) u.password = password; });
      demo.save(db);
      return true;
    }
  };

  /* ------------------------------------------------------------------ *
   *  Files
   * ------------------------------------------------------------------ */
  function validateFiles(files) {
    var rules = cfg.upload;
    var errors = [];
    var list = Array.prototype.slice.call(files || []);
    if (list.length > rules.maxFiles) errors.push("You may upload at most " + rules.maxFiles + " files.");
    list.forEach(function (f) {
      var ext = (f.name.split(".").pop() || "").toLowerCase();
      if (rules.allowedExt.indexOf(ext) === -1 || (f.type && rules.allowedMime.indexOf(f.type) === -1)) {
        errors.push("\"" + f.name + "\" is not an allowed file type (PDF, JPG, PNG, WEBP only).");
      }
      if (f.size > rules.maxFileMB * 1024 * 1024) {
        errors.push("\"" + f.name + "\" exceeds the " + rules.maxFileMB + "MB limit.");
      }
    });
    return errors;
  }

  async function uploadFilesLive(requestId, userId, files, types) {
    var out = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      var path = userId + "/" + requestId + "/" + Date.now() + "-" + safeName;
      var up = await sb.storage.from(cfg.upload.bucket).upload(path, f, { upsert: false, contentType: f.type });
      if (up.error) throw up.error;
      var row = await sb.from("verification_documents").insert({
        request_id: requestId, user_id: userId, doc_type: (types && types[i]) || "other",
        filename: f.name, path: path, size: f.size
      }).select().single();
      if (row.error) throw row.error;
      out.push(row.data);
    }
    return out;
  }

  function uploadFilesDemo(db, requestId, userId, files, types) {
    return Array.prototype.slice.call(files || []).map(function (f, i) {
      var row = { id: uid("doc"), request_id: requestId, user_id: userId,
        doc_type: (types && types[i]) || "other", filename: f.name, size: f.size,
        path: "demo/" + requestId + "/" + f.name, created_at: nowISO() };
      db.documents.push(row);
      return row;
    });
  }

  async function signedUrl(path) {
    if (!isLive()) return null;
    var res = await sb.storage.from(cfg.upload.bucket).createSignedUrl(path, 300);
    return res && res.data ? res.data.signedUrl : null;
  }

  /* ------------------------------------------------------------------ *
   *  Requests
   * ------------------------------------------------------------------ */
  async function submitRequest(payload, files, fileTypes) {
    var user = getUser();
    var reference = makeReference();

    if (isLive()) {
      // Server-side, security-definer RPC: works for guests and signed-in users,
      // validates input, generates the reference and writes the audit entry.
      var payloadForDb = {
        customer_name: payload.customer_name, email: payload.email, phone: payload.phone,
        preferred_contact: payload.preferred_contact, country: payload.country,
        buying_remote: payload.buying_remote, category: payload.category,
        asset_title: payload.asset_title, state: payload.state, lga: payload.lga,
        town: payload.town, address: payload.address, gps: payload.gps,
        asking_price: payload.asking_price, currency: payload.currency,
        seller_contact: payload.seller_contact,
        intended_purchase_date: payload.intended_purchase_date || "",
        checks: payload.checks, package_id: payload.package_id,
        base_fee: payload.base_fee, professional_fees: payload.professional_fees,
        third_party_fees: payload.third_party_fees, total_fee: payload.total_fee,
        custom_quote: payload.custom_quote, consent_processing: payload.consent_processing,
        terms_accepted: payload.terms_accepted
      };
      var rpc = await sb.rpc("submit_verification_request", { payload: payloadForDb });
      if (rpc.error) throw rpc.error;
      var row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
      var req = { id: row.id, reference: row.reference };

      // Documents require an authenticated user (folder is namespaced by user id).
      if (files && files.length && user) {
        await uploadFilesLive(req.id, user.id, files, fileTypes);
      }
      // Fire-and-forget acknowledgement email via Edge Function (if deployed)
      try {
        sb.functions.invoke("send-email", { body: { template: "request_received", request: req, email: payload.email } }).catch(function () {});
      } catch (e) {}
      return { id: req.id, reference: req.reference };
    }

    // ---- demo ----
    var db = demo.load();
    var id = uid("req");
    var row = Object.assign({}, payload, {
      id: id, reference: reference, user_id: user ? user.id : uid("guest"),
      status: "submitted", risk_level: null, created_at: nowISO(), updated_at: nowISO(),
      consent_processing: true
    });
    db.requests.push(row);
    if (files && files.length) uploadFilesDemo(db, id, row.user_id, files, fileTypes);
    db.progress.push({ id: uid("pu"), request_id: id, message: "Request received and queued for initial review.", visible_to_customer: true, created_at: nowISO() });
    db.audit.push({ id: uid("al"), actor: user ? user.id : "guest", action: "request_submitted", entity: "request:" + id, detail: reference, created_at: nowISO() });
    demo.save(db);
    return { id: id, reference: reference };
  }

  async function listMine() {
    var user = getUser();
    if (!user) return [];
    if (isLive()) {
      var res = await sb.from("verification_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (res.error) throw res.error;
      return res.data || [];
    }
    var db = demo.load();
    return db.requests.filter(function (r) { return r.user_id === user.id; })
      .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  }

  async function getRequest(id) {
    if (isLive()) {
      var res = await sb.from("verification_requests").select("*").eq("id", id).maybeSingle();
      if (res.error) throw res.error;
      return res.data;
    }
    var db = demo.load();
    return db.requests.find(function (r) { return r.id === id || r.reference === id; }) || null;
  }

  async function findByReference(reference, email) {
    if (isLive()) {
      // Uses a SECURITY DEFINER function that returns only limited fields and
      // requires both the reference and the email to match.
      var res = await sb.rpc("public_track_request", { p_reference: reference, p_email: email });
      if (res.error) throw res.error;
      var row = Array.isArray(res.data) ? res.data[0] : res.data;
      return row || null;
    }
    var db = demo.load();
    var r = db.requests.find(function (x) {
      return x.reference.toLowerCase() === String(reference).toLowerCase() &&
        (!email || x.email.toLowerCase() === String(email).toLowerCase());
    });
    if (!r) return null;
    return { reference: r.reference, status: r.status, category: r.category, asset_title: r.asset_title,
      state: r.state, lga: r.lga, town: r.town, created_at: r.created_at, updated_at: r.updated_at };
  }

  async function requestBundle(id) {
    // Returns request + documents + progress + report + payments for the owner
    if (isLive()) {
      var r = await sb.from("verification_requests").select("*").eq("id", id).single();
      if (r.error) throw r.error;
      var docs = await sb.from("verification_documents").select("*").eq("request_id", id);
      var prog = await sb.from("progress_updates").select("*").eq("request_id", id).eq("visible_to_customer", true).order("created_at");
      var rep  = await sb.from("verification_reports").select("*").eq("request_id", id).eq("published", true).maybeSingle();
      var pay  = await sb.from("payments").select("*").eq("request_id", id).order("created_at");
      var out = { request: r.data, documents: docs.data || [], progress: prog.data || [],
        report: rep.data || null, payments: pay.data || [] };
      // attach short-lived signed urls
      for (var i = 0; i < out.documents.length; i++) {
        out.documents[i].signed_url = await signedUrl(out.documents[i].path);
      }
      return out;
    }
    var db = demo.load();
    var req = db.requests.find(function (x) { return x.id === id; });
    return {
      request: req,
      documents: db.documents.filter(function (d) { return d.request_id === id; }),
      progress: db.progress.filter(function (p) { return p.request_id === id && p.visible_to_customer; }),
      report: db.reports.find(function (rp) { return rp.request_id === id && rp.published; }) || null,
      payments: db.payments.filter(function (p) { return p.request_id === id; }),
      quotations: db.quotations.filter(function (q) { return q.request_id === id; })
    };
  }

  /* ------------------------------------------------------------------ *
   *  Admin
   * ------------------------------------------------------------------ */
  var admin = {
    async stats() {
      var rows = await admin.list({});
      var s = { total: rows.length, new: 0, awaiting_documents: 0, in_progress: 0, completed: 0, cancelled: 0, revenue: 0, outstanding: 0 };
      rows.forEach(function (r) {
        if (r.status === "submitted" || r.status === "awaiting_review") s.new++;
        if (r.status === "awaiting_documents") s.awaiting_documents++;
        if (["in_progress", "awaiting_findings", "quality_review"].indexOf(r.status) !== -1) s.in_progress++;
        if (r.status === "report_completed" || r.status === "delivered") s.completed++;
        if (r.status === "cancelled") s.cancelled++;
      });
      // payments
      if (isLive()) {
        var pay = await sb.from("payments").select("amount,status");
        (pay.data || []).forEach(function (p) {
          if (p.status === "confirmed") s.revenue += Number(p.amount || 0);
          else s.outstanding += Number(p.amount || 0);
        });
      } else {
        var db = demo.load();
        db.payments.forEach(function (p) {
          if (p.status === "confirmed") s.revenue += Number(p.amount || 0);
          else s.outstanding += Number(p.amount || 0);
        });
        rows.forEach(function (r) {
          var paid = db.payments.some(function (p) { return p.request_id === r.id && p.status === "confirmed"; });
          if (!paid && r.status !== "cancelled") s.outstanding += Number(r.total_fee || 0);
        });
      }
      return s;
    },

    async list(filters) {
      filters = filters || {};
      var rows;
      if (isLive()) {
        var res = await sb.from("verification_requests").select("*").order("created_at", { ascending: false });
        if (res.error) throw res.error;
        rows = res.data || [];
      } else {
        rows = demo.load().requests.slice();
      }
      if (filters.status) rows = rows.filter(function (r) { return r.status === filters.status; });
      if (filters.category) rows = rows.filter(function (r) { return r.category === filters.category; });
      if (filters.q) {
        var q = filters.q.toLowerCase();
        rows = rows.filter(function (r) {
          return [r.reference, r.customer_name, r.asset_title, r.state, r.lga, r.town, r.email]
            .filter(Boolean).join(" ").toLowerCase().indexOf(q) !== -1;
        });
      }
      return rows;
    },

    async updateStatus(id, status) {
      if (isLive()) {
        var res = await sb.from("verification_requests").update({ status: status, updated_at: nowISO() }).eq("id", id);
        if (res.error) throw res.error;
        await sb.from("audit_logs").insert({ actor: getUser().id, action: "status_change", entity: "request:" + id, detail: status });
      } else {
        var db = demo.load();
        var r = db.requests.find(function (x) { return x.id === id; });
        if (r) { r.status = status; r.updated_at = nowISO(); }
        db.audit.push({ id: uid("al"), actor: getUser().id, action: "status_change", entity: "request:" + id, detail: status, created_at: nowISO() });
        demo.save(db);
      }
    },

    async addProgress(id, message, visible) {
      var row = { request_id: id, message: message, visible_to_customer: visible !== false, created_at: nowISO() };
      if (isLive()) {
        var res = await sb.from("progress_updates").insert(row);
        if (res.error) throw res.error;
      } else {
        var db = demo.load();
        row.id = uid("pu"); db.progress.push(row);
        db.audit.push({ id: uid("al"), actor: getUser().id, action: "progress_update", entity: "request:" + id, detail: message.slice(0, 60), created_at: nowISO() });
        demo.save(db);
      }
    },

    async saveQuote(id, quote) {
      var row = Object.assign({ request_id: id, status: "issued", created_at: nowISO() }, quote);
      if (isLive()) {
        var res = await sb.from("quotations").insert(row);
        if (res.error) throw res.error;
        await sb.from("verification_requests").update({ base_fee: quote.base_fee, professional_fees: quote.professional_fees, third_party_fees: quote.third_party_fees, total_fee: quote.total, updated_at: nowISO() }).eq("id", id);
      } else {
        var db = demo.load();
        row.id = uid("q"); db.quotations = db.quotations || []; db.quotations.push(row);
        var r = db.requests.find(function (x) { return x.id === id; });
        if (r) { r.base_fee = quote.base_fee; r.professional_fees = quote.professional_fees; r.third_party_fees = quote.third_party_fees; r.total_fee = quote.total; }
        db.audit.push({ id: uid("al"), actor: getUser().id, action: "quote_issued", entity: "request:" + id, detail: String(quote.total), created_at: nowISO() });
        demo.save(db);
      }
    },

    async confirmPayment(id, amount, ref, method) {
      var row = { request_id: id, amount: amount, currency: "NGN", status: "confirmed", method: method || "bank_transfer", reference: ref || "", confirmed_at: nowISO(), created_at: nowISO() };
      if (isLive()) {
        var res = await sb.from("payments").insert(row);
        if (res.error) throw res.error;
        await sb.from("verification_requests").update({ status: "in_progress", updated_at: nowISO() }).eq("id", id);
      } else {
        var db = demo.load();
        row.id = uid("pay"); db.payments.push(row);
        var r = db.requests.find(function (x) { return x.id === id; });
        if (r && r.status === "awaiting_payment") r.status = "in_progress";
        db.audit.push({ id: uid("al"), actor: getUser().id, action: "payment_confirmed", entity: "request:" + id, detail: String(amount), created_at: nowISO() });
        demo.save(db);
      }
    },

    async saveReport(report) {
      if (isLive()) {
        var existing = await sb.from("verification_reports").select("id,version").eq("request_id", report.request_id).maybeSingle();
        var payload = Object.assign({}, report, { issued_at: nowISO() });
        if (existing.data) {
          payload.version = (existing.data.version || 1) + 1;
          var res = await sb.from("verification_reports").update(payload).eq("request_id", report.request_id);
          if (res.error) throw res.error;
          await sb.from("report_versions").insert({ report_id: existing.data.id, version: payload.version, snapshot: payload });
        } else {
          payload.version = 1;
          var ins = await sb.from("verification_reports").insert(payload).select().single();
          if (ins.error) throw ins.error;
        }
        if (report.risk_level) await sb.from("verification_requests").update({ risk_level: report.risk_level, status: "report_completed", updated_at: nowISO() }).eq("id", report.request_id);
      } else {
        var db = demo.load();
        var rep = db.reports.find(function (x) { return x.request_id === report.request_id; });
        if (rep) { Object.assign(rep, report, { version: (rep.version || 1) + 1, issued_at: nowISO() }); }
        else { db.reports.push(Object.assign({ id: uid("rep"), version: 1, issued_at: nowISO() }, report)); }
        var r2 = db.requests.find(function (x) { return x.id === report.request_id; });
        if (r2) { r2.risk_level = report.risk_level; r2.status = "report_completed"; r2.updated_at = nowISO(); }
        db.audit.push({ id: uid("al"), actor: getUser().id, action: "report_saved", entity: "request:" + report.request_id, detail: "risk=" + report.risk_level, created_at: nowISO() });
        demo.save(db);
      }
    },

    async audit() {
      if (isLive()) {
        var res = await sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
        if (res.error) throw res.error;
        return res.data || [];
      }
      return demo.load().audit.slice().reverse();
    },

    async getBundle(id) {
      if (isLive()) {
        var r = await sb.from("verification_requests").select("*").eq("id", id).single();
        var docs = await sb.from("verification_documents").select("*").eq("request_id", id);
        var prog = await sb.from("progress_updates").select("*").eq("request_id", id).order("created_at");
        var rep  = await sb.from("verification_reports").select("*").eq("request_id", id).maybeSingle();
        var quo  = await sb.from("quotations").select("*").eq("request_id", id).order("created_at", { ascending: false });
        var pay  = await sb.from("payments").select("*").eq("request_id", id).order("created_at");
        var sup  = await sb.from("support_messages").select("*").eq("request_id", id).order("created_at");
        var docsData = docs.data || [];
        for (var i = 0; i < docsData.length; i++) docsData[i].signed_url = await signedUrl(docsData[i].path);
        return { request: r.data, documents: docsData, progress: prog.data || [], report: rep.data || null,
          quotations: quo.data || [], payments: pay.data || [], support: sup.data || [] };
      }
      var db = demo.load();
      return {
        request: db.requests.find(function (x) { return x.id === id; }),
        documents: db.documents.filter(function (d) { return d.request_id === id; }),
        progress: db.progress.filter(function (p) { return p.request_id === id; }),
        report: db.reports.find(function (rp) { return rp.request_id === id; }) || null,
        quotations: db.quotations.filter(function (q) { return q.request_id === id; }),
        payments: db.payments.filter(function (p) { return p.request_id === id; }),
        support: db.support.filter(function (s) { return s.request_id === id; })
      };
    },

    async addSupport(id, message, fromCustomer) {
      var user = getUser();
      var row = { request_id: id, user_id: user ? user.id : null, from_customer: !!fromCustomer, message: message, created_at: nowISO() };
      if (isLive()) {
        var res = await sb.from("support_messages").insert(row);
        if (res.error) throw res.error;
      } else {
        var db = demo.load();
        row.id = uid("sm"); db.support.push(row); demo.save(db);
      }
    }
  };

  function sendSupport(requestId, message) {
    return admin.addSupport(requestId, message, true);
  }

  return {
    init: init, ready: ready, isLive: isLive, onAuth: onAuth, getUser: getUser, isAdmin: isAdmin,
    auth: auth, validateFiles: validateFiles, signedUrl: signedUrl,
    submitRequest: submitRequest, listMine: listMine, getRequest: getRequest,
    findByReference: findByReference, requestBundle: requestBundle,
    sendSupport: sendSupport,
    admin: admin,
    demo: demo,
    _makeReference: makeReference
  };
})();
