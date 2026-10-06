/* =========================================================================
   THE LABORATORY — laboratory.js · v0.1.1 (WS-G design prototype)
   =========================================================================
   Vanilla, dependency-free, event-delegated. Each behavior below implements
   a RULED interaction from the core-page wireframes; the rule reference is
   given per block so the React port (WS-G G.1+) can map 1:1.

   Conventions (see docs/PROTOTYPE-README.md §5):
   - [data-pane="tplId"]      opens the detail pane (1f right slide-over /
                              1n bottom sheet <720) with <template id=tplId>.
   - [data-cite="tplId"]      opens the Cite popover (13b / 2m sheet).
   - [data-copy]              copies text of the element it points to.
   - .tog[data-tog-target]    segmented toggle; buttons carry data-val.
   - [data-expand="id"]       expands/collapses a strip (2c coverage chip).
   - .tl-node[data-tip=tplId] timeline hover/focus receipt (2c/2d).
   - .railitem[data-coll]     browse collection switch (15a).
   - [data-filter-key/val]    browse filter menu items (15a).
   - [data-jump="id"]         jump chips (2m) — no scrollIntoView.
   v0.1.1 (Turn 8): browse follows hashchange (topnav Library/Clusters/…
   work while ON browse, topbar aria-current tracks the collection); a
   failed <img> inside figure.figrec / .card-art becomes a STATED absence
   (injected .imgslot; custom wording via data-missing-note on the img).
   All state classes: .is-open / .is-active / .is-full / .is-missing.
   ========================================================================= */
(function () {
  'use strict';
  var doc = document;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function isPhone() { return window.matchMedia('(max-width: 719.9px)').matches; }
  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  /* <template> content accessor tolerant of runtimes that render template
     children as regular (UA-hidden) children instead of into .content */
  function tplFrag(tpl) {
    if (tpl.content && (tpl.content.childElementCount || tpl.content.textContent.trim())) {
      return tpl.content.cloneNode(true);
    }
    var f = doc.createDocumentFragment();
    Array.prototype.forEach.call(tpl.childNodes, function (n) { f.appendChild(n.cloneNode(true)); });
    return f;
  }

  /* ---------- shared chrome: pane + scrim, created once ------------------- */
  var pane, scrim, cpop;
  var lastTrigger = null;

  function ensureScrim() {
    if (scrim) return scrim;
    scrim = doc.createElement('div');
    scrim.className = 'scrim';
    scrim.addEventListener('click', closeAll);
    doc.body.appendChild(scrim);
    return scrim;
  }
  function ensurePane() {
    if (pane) return pane;
    pane = doc.createElement('aside');
    pane.className = 'pane';
    pane.setAttribute('role', 'dialog');
    pane.setAttribute('aria-modal', 'false'); /* 1f: non-modal — the text stays live */
    pane.innerHTML =
      '<div class="pane-hd"><span class="eyebrow" data-pane-title></span>' +
      '<button class="pane-x" aria-label="Close">✕</button></div>' +
      '<div class="sheet-handle" hidden></div>' +
      '<div class="pane-bd"></div>' +
      '<div class="pane-ft" hidden><button data-nav="prev"></button><button data-nav="next"></button></div>';
    $('.pane-x', pane).addEventListener('click', closePane);
    $('.pane-ft', pane).addEventListener('click', function (e) {
      var b = e.target.closest('button[data-nav]');
      if (!b || b.disabled) return;
      var id = pane.getAttribute(b.dataset.nav === 'prev' ? 'data-prev' : 'data-next');
      if (id) openPane(id, lastTrigger);
    });
    doc.body.appendChild(pane);
    return pane;
  }

  /* ---------- Pane (Turn 3 ruling: 1f slide-over / 1n bottom sheet) -------- */
  function openPane(tplId, trigger) {
    var tpl = doc.getElementById(tplId);
    if (!tpl) return;
    ensurePane();
    /* active-segment bookkeeping (1f: active segment carries fill + rule;
       1g: active word carries the 2px ink underline) */
    $$('.rseg.is-active').forEach(function (el) { el.classList.remove('is-active'); });
    $$('.uterm.is-open-word').forEach(function (el) {
      el.classList.remove('is-open-word', 'uterm-a'); el.classList.add('uterm');
    });
    $$('.rcell.is-active').forEach(function (el) { el.classList.remove('is-active'); });
    if (trigger) {
      var seg = trigger.closest('.rseg');
      if (seg && trigger === seg) seg.classList.add('is-active');
      var ref = trigger.getAttribute('data-segment-ref') || (trigger.closest('[data-segment-ref]') || {}).getAttribute && trigger.closest('[data-segment-ref]').getAttribute('data-segment-ref');
      if (ref) $$('[data-segment-ref="' + ref + '"]').forEach(function (el) { el.classList.add('is-active'); });
      if (trigger.classList.contains('uterm')) {
        trigger.classList.add('is-open-word', 'uterm-a');
        trigger.classList.remove('uterm');
      }
    }
    $('[data-pane-title]', pane).textContent = tpl.dataset.paneTitle || 'Detail';
    $('.pane-bd', pane).innerHTML = '';
    $('.pane-bd', pane).appendChild(tplFrag(tpl));
    $('.pane-bd', pane).scrollTop = 0;
    var ft = $('.pane-ft', pane);
    if (tpl.dataset.prev || tpl.dataset.next) {
      ft.hidden = false;
      pane.setAttribute('data-prev', tpl.dataset.prev || '');
      pane.setAttribute('data-next', tpl.dataset.next || '');
      var pb = $('[data-nav="prev"]', ft), nb = $('[data-nav="next"]', ft);
      pb.textContent = tpl.dataset.prevLabel ? '‹ ' + tpl.dataset.prevLabel : '‹';
      nb.textContent = tpl.dataset.nextLabel ? tpl.dataset.nextLabel + ' ›' : '›';
      pb.disabled = !tpl.dataset.prev; nb.disabled = !tpl.dataset.next;
    } else { ft.hidden = true; }
    $('.sheet-handle', pane).hidden = !isPhone();
    pane.dataset.openId = tplId;
    pane.classList.add('is-open');
    if (isPhone()) ensureScrim().classList.add('is-open'); /* 1n: scrim on phones only */
    $('.pane-x', pane).focus({ preventScroll: true });
  }
  function closePane() {
    if (!pane || !pane.classList.contains('is-open')) return;
    pane.classList.remove('is-open', 'is-full');
    pane.dataset.openId = '';
    if (scrim) scrim.classList.remove('is-open');
    $$('.rseg.is-active,.rcell.is-active').forEach(function (el) { el.classList.remove('is-active'); });
    $$('.is-open-word').forEach(function (el) {
      el.classList.remove('is-open-word', 'uterm-a'); el.classList.add('uterm');
    });
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus({ preventScroll: true });
  }

  /* ---------- Cite popover (13b; 2m: bottom sheet on phones) --------------- */
  function openCite(tplId, trigger) {
    var tpl = doc.getElementById(tplId);
    if (!tpl) return;
    closeCite();
    cpop = doc.createElement('div');
    cpop.className = 'cpop';
    cpop.setAttribute('role', 'dialog');
    cpop.innerHTML =
      '<div class="cpop-hd"><span class="eyebrow">' + (tpl.dataset.citeTitle || 'Cite') + '</span>' +
      '<button class="pane-x" aria-label="Close">✕</button></div>' +
      '<div class="cpop-bd"></div>';
    $('.cpop-bd', cpop).appendChild(tplFrag(tpl));
    $('.pane-x', cpop).addEventListener('click', closeCite);
    doc.body.appendChild(cpop);
    if (isPhone()) {
      ensureScrim().classList.add('is-open');
      requestAnimationFrame(function () { cpop.classList.add('is-open'); });
    } else {
      var r = trigger.getBoundingClientRect();
      var w = Math.min(400, window.innerWidth - 32);
      var left = Math.min(Math.max(12, r.left + window.scrollX), window.scrollX + window.innerWidth - w - 12);
      cpop.style.left = left + 'px';
      cpop.style.top = (r.bottom + window.scrollY + 8) + 'px';
      cpop.classList.add('is-open');
    }
    $('.pane-x', cpop).focus({ preventScroll: true });
  }
  function closeCite() {
    if (!cpop) return;
    cpop.remove(); cpop = null;
    if (scrim && (!pane || !pane.classList.contains('is-open') || !isPhone())) scrim.classList.remove('is-open');
    if (pane && pane.classList.contains('is-open') && isPhone()) scrim.classList.add('is-open');
  }
  function closeAll() { closeCite(); closePane(); hideTip(); }

  /* ---------- Timeline receipts (2c/2d: hover → the claim behind the node) - */
  var tip = null, tipFor = null;
  function showTip(node) {
    var tpl = doc.getElementById(node.dataset.tip);
    if (!tpl) return;
    hideTip();
    var tl = node.closest('.tl'); if (!tl) return;
    tip = doc.createElement('div');
    tip.className = 'tl-tip';
    tip.appendChild(tplFrag(tpl));
    tl.appendChild(tip);
    var nr = node.getBoundingClientRect(), cr = tl.getBoundingClientRect();
    var x = nr.left - cr.left;
    tip.style.top = (nr.bottom - cr.top + 10) + 'px';
    tip.style.left = Math.max(0, Math.min(x - 40, cr.width - tip.offsetWidth - 4)) + 'px';
    tipFor = node;
  }
  function hideTip() { if (tip) { tip.remove(); tip = null; tipFor = null; } }

  /* ---------- Toggles (.tog — reader language; browse sort) ---------------- */
  function handleTog(btn) {
    var tog = btn.closest('.tog');
    var targetSel = tog.dataset.togTarget, key = tog.dataset.togKey;
    $$('button', tog).forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    if (targetSel) {
      var t = $(targetSel);
      if (t && key) t.setAttribute('data-' + key, btn.dataset.val);
    }
    if (tog.dataset.persist) { try { localStorage.setItem('aos-lab:' + tog.dataset.persist, btn.dataset.val); } catch (e) {} }
    if (tog.dataset.togKey === 'sort') { sortRows(btn.dataset.val); cardOrder.mode = btn.dataset.val; sortCards(); }
  }
  /* a record page's claim cards (material page): by date as built, or by language then date, within each group;
     ascending or descending (the small control beside the toggle) */
  var cardOrder = { mode: 'date', dir: 'asc' };
  var DIR_LABEL = { date: { asc: 'earliest first', desc: 'latest first' }, language: { asc: 'A–Z', desc: 'Z–A' } };
  function sortCards() {
    var mode = cardOrder.mode, dir = cardOrder.dir;
    $$('[data-cards]').forEach(function (host) {
      var cards = $$('[data-card]', host);
      cards.sort(function (a, b) {
        if (mode === 'language' && a.dataset.lang !== b.dataset.lang) return a.dataset.lang < b.dataset.lang ? -1 : 1;
        return (+a.dataset.ord || 0) - (+b.dataset.ord || 0);
      });
      if (dir === 'desc') cards.reverse();
      cards.forEach(function (c) { host.appendChild(c); });
    });
    $$('[data-sort-dir]').forEach(function (b) {
      var label = (DIR_LABEL[mode] || DIR_LABEL.date)[dir];
      b.dataset.sortDir = dir;
      b.firstElementChild.textContent = dir === 'asc' ? '↑' : '↓';
      var l = $('[data-sort-dir-label]', b); if (l) l.textContent = label;
      b.setAttribute('aria-label', 'Reverse the order: now ' + label);
    });
  }
  /* restore persisted toggles (e.g. reader language) */
  $$('.tog[data-persist]').forEach(function (tog) {
    var v; try { v = localStorage.getItem('aos-lab:' + tog.dataset.persist); } catch (e) {}
    if (!v) return;
    var btn = $('button[data-val="' + v + '"]', tog);
    if (btn) handleTog(btn);
  });

  /* ---------- Browse (15a): collection switch · filters · sort ------------- */
  function switchCollection(item) {
    $$('.railitem').forEach(function (r) {
      r.classList.toggle('is-active', r === item);
      r.setAttribute('aria-selected', r === item ? 'true' : 'false');
    });
    $$('[data-coll-view]').forEach(function (v) {
      v.hidden = v.dataset.collView !== item.dataset.coll;
    });
    /* topbar reflects the open collection (browse only — §2 aria-current) */
    $$('.cn-nav a').forEach(function (a) {
      if (a.hash) a.setAttribute('aria-current', a.hash === '#' + item.dataset.coll ? 'true' : 'false');
    });
    try { history.replaceState(null, '', '#' + item.dataset.coll); } catch (e) {}
  }
  var filters = {};
  function applyFilters() {
    var view = $('[data-coll-view]:not([hidden])'); if (!view) return;
    var rows = $$('[data-row]', view), shown = 0;
    rows.forEach(function (row) {
      var ok = Object.keys(filters).every(function (k) {
        return !filters[k] || filters[k] === 'all' || !(k in row.dataset) || row.dataset[k] === filters[k];   /* a filter of another collection does not apply */
      });
      row.hidden = !ok; if (ok) shown++;
    });
    var count = $('[data-shown]', view);
    if (count) count.textContent = shown;
  }
  function sortRows(mode) {
    var view = $('[data-coll-view]:not([hidden])'); if (!view) return;
    var host = $('[data-rows]', view); if (!host) return;
    var rows = $$('[data-row]', host);
    rows.sort(function (a, b) {
      return mode === 'chron'
        ? (+a.dataset.year || 0) - (+b.dataset.year || 0)
        : (+a.dataset.ord || 0) - (+b.dataset.ord || 0);
    });
    rows.forEach(function (r) { host.appendChild(r); });
  }

  /* ---------- Jump chips (2m) — no scrollIntoView (host constraint) -------- */
  function jumpTo(id, chip) {
    var el = doc.getElementById(id); if (!el) return;
    var sticky = chip.closest('.jumpchips');
    var offset = sticky ? sticky.offsetHeight + 8 : 8;
    var y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    $$('.jumpchips .chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
  }

  /* ---------- Copy (Cite popover: Copy / BibTeX / JSON-LD) ------------------ */
  function copyFrom(btn) {
    var src = btn.dataset.copy ? $(btn.dataset.copy, cpop || doc) : null;
    var text = btn.dataset.copyText || (src ? src.textContent.replace(/\s+/g, ' ').trim() : '');
    if (!text) return;
    function done() {
      var old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = old; }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else { done(); }
  }

  /* ---------- Image records (Turn 8): a missing image is a STATED absence --- */
  function imgMissing(img) {
    var fig = img.closest('figure.figrec,.card-art,.obj-art');
    if (!fig || fig.classList.contains('is-missing')) return;
    fig.classList.add('is-missing');
    var slot = doc.createElement('div');
    slot.className = 'imgslot';
    slot.innerHTML = '<span>image unavailable — ' +
      (img.getAttribute('data-missing-note') || 'the source could not be reached; the provenance line still applies') + '</span>';
    img.insertAdjacentElement('afterend', slot);
  }
  doc.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG') imgMissing(e.target);
  }, true);
  $$('figure.figrec img,.card-art img,.obj-art img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) imgMissing(img);
  });

  /* ---------- One delegated listener ---------------------------------------- */
  doc.addEventListener('click', function (e) {
    var t;
    /* a Cite control inside a pane-opening row cites; it does not open the pane */
    if ((t = e.target.closest('[data-cite]'))) {
      e.preventDefault(); e.stopPropagation(); lastTrigger = t; openCite(t.dataset.cite, t); return;
    }
    if ((t = e.target.closest('[data-pane]'))) {
      e.preventDefault();
      /* tapping the open segment again closes (1f) */
      if (pane && pane.classList.contains('is-open') && pane.dataset.openId === t.dataset.pane) { closePane(); return; }
      lastTrigger = t; openPane(t.dataset.pane, t); return;
    }
    if ((t = e.target.closest('[data-expand]'))) {
      var strip = doc.getElementById(t.dataset.expand);
      if (strip) { strip.hidden = !strip.hidden; t.setAttribute('aria-expanded', String(!strip.hidden)); }
      return;
    }
    if ((t = e.target.closest('.tog button[data-val]'))) { handleTog(t); return; }
    if ((t = e.target.closest('[data-sort-dir]'))) { cardOrder.dir = cardOrder.dir === 'asc' ? 'desc' : 'asc'; sortCards(); return; }
    if ((t = e.target.closest('.railitem[data-coll]'))) { switchCollection(t); applyFilters(); return; }
    if ((t = e.target.closest('.fmenu button[data-filter-key]'))) {
      filters[t.dataset.filterKey] = t.dataset.filterVal;
      var det = t.closest('details');
      $$('button', t.closest('.fmenu')).forEach(function (b) { b.setAttribute('aria-checked', b === t ? 'true' : 'false'); });
      var chipLbl = det && $('summary .chip', det);
      if (chipLbl) chipLbl.textContent = t.dataset.filterKey + ': ' + (t.dataset.filterLabel || t.dataset.filterVal) + ' ▾';
      if (det) det.removeAttribute('open');
      applyFilters(); return;
    }
    if ((t = e.target.closest('[data-jump]'))) { jumpTo(t.dataset.jump, t); return; }
    if ((t = e.target.closest('[data-copy],[data-copy-text]'))) { copyFrom(t); return; }
    if ((t = e.target.closest('.tl-node[data-tip]'))) {
      (tipFor === t) ? hideTip() : showTip(t); return;      /* tap = toggle (touch) */
    }
    if ((t = e.target.closest('.sheet-handle'))) {
      if (pane) pane.classList.toggle('is-full'); return;    /* 1n: drag ▲ to full — tap in proto */
    }
    /* outside-click closes popover + tip; pane stays (non-modal) */
    if (cpop && !e.target.closest('.cpop')) closeCite();
    if (tip && !e.target.closest('.tl')) hideTip();
    /* close open filter menus when clicking elsewhere */
    $$('.filterbar details[open]').forEach(function (d) {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(); }                   /* I5 */
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.rseg,[data-pane]:not(a[href]):not(button)')) {
      e.preventDefault(); e.target.click();
    }
  });
  doc.addEventListener('mouseover', function (e) {
    var n = e.target.closest('.tl-node[data-tip]');
    if (n && tipFor !== n) showTip(n);
  });
  doc.addEventListener('mouseout', function (e) {
    var n = e.target.closest('.tl-node[data-tip]');
    if (n && tipFor === n && !(e.relatedTarget && e.relatedTarget.closest('.tl-tip'))) hideTip();
  });
  doc.addEventListener('focusin', function (e) {
    var n = e.target.closest('.tl-node[data-tip]');
    if (n) showTip(n);
  });

  /* make segments + nodes keyboard-reachable without markup noise */
  $$('.rseg').forEach(function (s) { if (!s.hasAttribute('tabindex')) s.setAttribute('tabindex', '0'); });
  $$('.tl-node[data-tip]').forEach(function (n) { if (!n.hasAttribute('tabindex')) n.setAttribute('tabindex', '0'); });

  /* browse deep-link: /browse#terms opens that collection — and keeps
     following the hash (topnav links work while already on browse) */
  function syncHash() {
    var it = location.hash && $('.railitem[data-coll="' + location.hash.slice(1) + '"]');
    if (it) { switchCollection(it); applyFilters(); return; }
    /* deep link to an occurrence or segment: #pane-<id> opens that pane */
    var id = location.hash && decodeURIComponent(location.hash.slice(1));
    if (id && /^pane-w-/.test(id) && !doc.getElementById(id)) {
      /* an earlier build's word identifier: resolve only through the recorded map, never by guessing */
      var legacyEl = doc.getElementById('legacy-ids'), map = {};
      try { map = legacyEl ? JSON.parse(legacyEl.textContent) : {}; } catch (e) { map = {}; }
      var mapped = map[id.replace(/^pane-/, '')];
      if (mapped && doc.getElementById('pane-' + mapped)) {
        id = 'pane-' + mapped;
        notice('Opened from an earlier link (' + location.hash.slice(1) + '); the word is now ' + mapped + '.');
      } else {
        notice('This link uses a word identifier from an earlier build (' + id + ') that cannot be resolved to a word; open the term page and choose the occurrence.');
        return;
      }
    }
    if (id && /^pane-/.test(id) && doc.getElementById(id)) {
      var trig = $('[data-pane="' + id + '"]');
      $$('.is-hit').forEach(function (h) { h.classList.remove('is-hit'); });
      if (trig) { trig.classList.add('is-hit'); if (trig.scrollIntoView) trig.scrollIntoView({ block: 'center' }); }
      openPane(id, trig || null);
    }
  }
  syncHash();
  window.addEventListener('hashchange', syncHash);

  /* ---------- Site bar: the menu below 930px (LabNav) ----------------------- */
  var menuBtn = doc.getElementById('cn-menu-btn'), menu = doc.getElementById('cn-menu');
  if (menuBtn && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      doc.body.style.overflow = open ? 'hidden' : '';
      setTimeout(function () { (open ? $('.cn-menu-close', menu) : menuBtn).focus(); }, 60);
    };
    menuBtn.addEventListener('click', function () { setMenu(true); });
    $('.cn-menu-close', menu).addEventListener('click', function () { setMenu(false); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });
  }

  /* ---------- Cookbook: the Greek switch on a recipe card ------------------- */
  $$('[data-cb-greek]').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = b.closest('.cb-card'), on = card.dataset.greek !== 'on';
      card.dataset.greek = on ? 'on' : 'off'; b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  });

  /* ---------- Cookbook: the batch scaler (every Cookbook recipe has one) ----- */
  $$('[data-cb-scale]').forEach(function (bar) {
    var card = bar.closest('.cb-card'), input = $('input', bar), out = $('.cb-factor', bar), reset = $('.cb-reset', bar);
    var base = parseFloat(bar.dataset.base), dens = parseFloat(bar.dataset.density);
    function num(x, d) { return x.toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d }); }
    function range(a, b, unit, d) { var x = num(a, d), y = num(b, d); return (x === y ? x : x + '–' + y) + ' ' + unit; }
    function grams(a, b) { return b >= 1000 ? range(a / 1000, b / 1000, 'kg', 1) : b >= 10 ? range(a, b, 'g', 0) : range(a, b, 'g', 1); }
    function volume(a, b) { return b >= 1000 ? range(a / 1000, b / 1000, 'L', 1) : range(a, b, 'ml', 0); }
    $$('.cb-met', card).forEach(function (m) { m.dataset.orig = m.textContent; });
    function apply() {
      var v = parseFloat(input.value), f = v > 0 ? v / base : 1, same = !(v > 0) || Math.abs(f - 1) < 0.005;
      $$('.cb-met', card).forEach(function (m) {
        m.classList.toggle('is-scaled', !same);
        if (same) { m.textContent = m.dataset.orig; return; }
        if (m.dataset.g) {
          var g = m.dataset.g.split(',').map(parseFloat), t = grams(g[0] * f, g[1] * f);
          if ('oil' in m.dataset) t += ' (c. ' + volume(g[0] * f / dens, g[1] * f / dens) + ')';
          m.textContent = t;
        } else if (m.dataset.count) {
          var n = Math.max(1, Math.round(parseFloat(m.dataset.count) * f));
          m.textContent = m.dataset.countTpl.replace('{n}', 'c. ' + num(n, 0)) + (m.dataset.aboutG ? ', c. ' + grams(parseFloat(m.dataset.aboutG) * f, parseFloat(m.dataset.aboutG) * f) : '');
        }
      });
      out.textContent = same ? 'the written batch' : '× ' + num(f, f < 0.1 ? 3 : 2) + ' of the written batch';
      reset.hidden = same;
    }
    input.addEventListener('input', apply);
    reset.addEventListener('click', function () { input.value = input.dataset.written; apply(); input.focus(); });
  });

  /* ---------- Cookbook: identifications, copy, and the cook's own settings --- */
  $$('.cb-card').forEach(function (card) {
    var key = 'aos-cookbook:' + card.dataset.recipe, input = $('[data-cb-scale] input', card);
    function load() { try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { return {}; } }
    function save() {
      var st = { scale: input ? input.value : null, ids: {} };
      $$('[data-cb-item]', card).forEach(function (r) { var s = $('select[data-cb-id]', r); if (s && s.value !== '') st.ids[r.dataset.cbItem] = s.value; });
      try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) {}
    }
    /* choosing an identification names the ingredient by it, with its scholars */
    $$('select[data-cb-id]', card).forEach(function (sel) {
      var row = sel.closest('[data-cb-item]'), as = $('.cb-as', row);
      sel.addEventListener('change', function () {
        var o = sel.options[sel.selectedIndex];
        as.hidden = sel.value === '';
        as.textContent = sel.value === '' ? '' : ' · ' + o.dataset.taxon + ' (' + o.dataset.by + ')';
        save();
      });
    });
    if (input) input.addEventListener('input', save);
    /* restore what this reader chose last time, in this browser only */
    var st = load();
    Object.keys(st.ids || {}).forEach(function (item) {
      var s = $('[data-cb-item="' + item + '"] select[data-cb-id]', card);
      if (s && s.options[parseInt(st.ids[item], 10) + 1]) { s.value = st.ids[item]; s.dispatchEvent(new Event('change')); }
    });
    if (input && st.scale && st.scale !== input.value) { input.value = st.scale; input.dispatchEvent(new Event('input')); }
    /* copy the recipe as plain text: scaled amounts, chosen identifications, method, citation */
    var btn = $('[data-cb-copy]', card), said = $('.cb-copied', card);
    if (!btn || !navigator.clipboard) return;
    btn.hidden = false;
    function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
    btn.addEventListener('click', function () {
      var L = [card.dataset.title, card.dataset.source], bar = $('[data-cb-scale]', card);
      if (bar) L.push('Scaled to ' + input.value + ' ' + txt($('.cb-unit', bar)) + ' (' + txt($('.cb-factor', bar)) + ')');
      L.push('', 'Ingredients');
      $$('[data-cb-item]', card).forEach(function (r) {
        var met = $('.cb-met', r), anc = txt($('.cb-anc', r));
        var as = txt($('.cb-as', r)).replace(/^·\s*/, '');
        L.push('- ' + txt($('.cb-nm', r)) + (as ? ' (as ' + as.replace(/ \(/, ', after ').replace(/\)$/, '') + ')' : '') + (txt($('.cb-use', r)) ? ', ' + txt($('.cb-use', r)) : '') + ': ' + anc + (met ? ' — ' + txt(met) : ''));
      });
      L.push('', 'Method');
      $$('.cb-step', card).forEach(function (s, i) { L.push((i + 1) + '. ' + txt($('.cb-steptext .serif', s))); });
      var times = $$('[data-cb-time]', card).map(function (t) { var b = $('b', t); return txt(b) + ': ' + txt(t).slice(txt(b).length).trim(); });
      if (times.length) L.push('', 'Time: ' + times.join('; ') + '. ' + txt($('.cb-time-note', card)));
      L.push('', 'Cite: ' + card.dataset.cite, location.href.split('#')[0]);
      navigator.clipboard.writeText(L.join('\n')).then(function () { said.textContent = 'Copied'; }, function () { said.textContent = 'Copy failed'; });
      setTimeout(function () { said.textContent = ''; }, 2500);
    });
  });

  function notice(text) {
    var n = doc.getElementById('aos-notice');
    if (!n) { n = doc.createElement('div'); n.id = 'aos-notice'; n.setAttribute('role', 'status'); n.className = 'meta'; n.style.cssText = 'position:fixed;left:16px;bottom:16px;max-width:36ch;padding:10px 12px;background:var(--paper-light);border:1px solid var(--ink);z-index:60'; doc.body.appendChild(n); }
    n.textContent = text;
  }
  window.AOSLab = { openPane: openPane, closePane: closePane, openCite: openCite, applyFilters: applyFilters };
})();
