// Lightweight HR<->EN switcher for permedis.com.
// Croatian is the authored language; when EN is selected we translate visible
// text nodes and a few attributes via window.PERMEDIS_DICT. Choice is stored in
// localStorage so it carries across pages. A MutationObserver re-applies after
// Design Component re-renders (which reset the DOM back to Croatian).
(function () {
  var DICT = window.PERMEDIS_DICT || {};
  var ATTRS = ["placeholder", "aria-label", "title"];
  var LETTERS = /[A-Za-zÀ-ÿČĆŽŠĐčćžšđ]/;
  var lang = "hr";
  try { lang = localStorage.getItem("permedis_lang") || "hr"; } catch (e) {}

  var origText = new WeakMap();
  var observer = null;

  function translateTextNode(n) {
    var raw = n.nodeValue;
    if (!raw) return;
    var key = raw.trim();
    if (!key || !LETTERS.test(key)) return;
    if (!origText.has(n)) origText.set(n, raw);
    if (lang === "en") {
      var en = DICT[key];
      if (en != null) {
        var lead = raw.match(/^\s*/)[0];
        var trail = raw.match(/\s*$/)[0];
        var next = lead + en + trail;
        if (n.nodeValue !== next) n.nodeValue = next;
      }
    } else {
      var o = origText.get(n);
      if (o != null && n.nodeValue !== o) n.nodeValue = o;
    }
  }

  function translateAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      if (!el.__i18nOrig) el.__i18nOrig = {};
      if (el.__i18nOrig[a] == null) el.__i18nOrig[a] = el.getAttribute(a);
      var base = el.__i18nOrig[a];
      if (base == null) continue;
      if (lang === "en") {
        var en = DICT[base.trim()];
        if (en != null && el.getAttribute(a) !== en) el.setAttribute(a, en);
      } else if (el.getAttribute(a) !== base) {
        el.setAttribute(a, base);
      }
    }
  }

  function walk(node) {
    var tag = node.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return;
    if (node.nodeType === 1) translateAttrs(node);
    for (var n = node.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) translateTextNode(n);
      else if (n.nodeType === 1) walk(n);
    }
  }

  function translateAll() {
    if (!document.body) return;
    if (observer) observer.disconnect();
    walk(document.body);
    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function updateToggle() {
    var opts = document.querySelectorAll(".lang-opt");
    for (var i = 0; i < opts.length; i++) {
      var o = opts[i];
      var active = o.getAttribute("data-lang") === lang;
      o.style.color = active ? "#101418" : "#6C6F73";
      o.style.fontWeight = active ? "600" : "400";
    }
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    try { localStorage.setItem("permedis_lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
    translateAll();
    updateToggle();
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var o = t.closest && t.closest(".lang-opt");
    if (!o) return;
    e.preventDefault();
    setLang(o.getAttribute("data-lang"));
  });

  function start() {
    document.documentElement.lang = lang;
    translateAll();
    updateToggle();
    // Catch late Design Component mounts / async content.
    var n = 0;
    var iv = setInterval(function () { translateAll(); updateToggle(); if (++n > 20) clearInterval(iv); }, 200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
