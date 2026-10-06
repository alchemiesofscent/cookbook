/* The Cookbook: the scaler, ticking off steps, choosing a rendering, previous and
   next, copying, and the search and filters of the lists. Plain script, no library.
   Every page works without it; it only adds. */
(function () {
  'use strict';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('aos-cookbook:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('aos-cookbook:' + k, JSON.stringify(v)); } catch (e) { /* private window */ } }
  };

  /* numbers as build.py (words.py) writes them */
  function num(x, d) {
    if (d === undefined) d = x >= 100 || Math.abs(x - Math.round(x)) < 1e-9 ? 0 : (x >= 10 ? 1 : 2);
    var s = x.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
    return s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  }
  function span(lo, hi, unit, d) { var a = num(lo, d), b = num(hi, d); return a === b ? a + ' ' + unit : a + '–' + b + ' ' + unit; }
  function grams(lo, hi) { return hi >= 1000 ? span(lo / 1000, hi / 1000, 'kg', 1) : span(lo, hi, 'g', hi >= 10 ? 0 : 1); }
  function ml(lo, hi) { return hi >= 1000 ? span(lo / 1000, hi / 1000, 'l', 1) : span(lo, hi, 'ml', 0); }

  /* what a copy did: said on the button itself, and to a screen reader */
  function said(btn, msg) {
    var live = $('[data-live]'), label = btn && $('span', btn);
    if (live) live.textContent = msg;
    if (!label) return;
    var was = label.dataset.was || label.textContent;
    label.dataset.was = was; label.textContent = msg;
    clearTimeout(btn._t); btn._t = setTimeout(function () { label.textContent = was; }, 1800);
  }
  function copy(text, done, btn) {
    var ok = function () { said(btn, done); };
    var fallback = function () {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { said(btn, 'Select the text to copy it'); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }

  /* ---- the menu: whole viewport, focus kept inside, Escape or a tap outside the list closes ---- */
  var menu = $('#ck-menu'), opener = $('[data-menu-open]');
  if (menu && opener) {
    var lastFocus = null;
    var focusables = function () { return $$('a[href], button', menu); };
    var close = function () {
      menu.classList.remove('is-open');
      opener.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKey, true);
      setTimeout(function () { menu.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }, 150);
    };
    var onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    opener.addEventListener('click', function () {
      lastFocus = document.activeElement; menu.hidden = false; document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      opener.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onKey, true);
      $('[data-menu-close]', menu).focus();
    });
    $('[data-menu-close]', menu).addEventListener('click', close);
    menu.addEventListener('click', function (e) { if (!e.target.closest('.ck-menu-secs, .ck-menu-nav, [data-menu-close]')) close(); });
  }

  /* ---- recipe page ---- */
  var rid = document.body.dataset.recipe;
  if (rid) {
    /* the scaler: every metric figure follows; the ancient amounts stay as written */
    var sc = $('[data-scale]'), factor = 1;
    var apply = function (f) {
      factor = f;
      $$('data[data-g]').forEach(function (d) { var v = d.value.split(','); d.textContent = grams(v[0] * f, v[1] * f); });
      $$('data[data-ml]').forEach(function (d) { var v = d.value.split(','); d.textContent = ml(v[0] * f, v[1] * f); });
      $$('data[data-count]').forEach(function (d) { d.textContent = num(Math.round(d.value * f)); });
      if (!sc) return;
      var state = $('.ck-scale-state', sc);
      state.textContent = Math.abs(f - 1) < 1e-6 ? 'as written' : '×' + num(f, f >= 10 ? 0 : 2) + ' the written batch';
      $$('[data-factor]', sc).forEach(function (b) { b.setAttribute('aria-pressed', String(Math.abs(b.dataset.factor - f) < 1e-6)); });
    };
    if (sc) {
      var input = $('input', sc), base = parseFloat(sc.dataset.base), written = parseFloat(input.dataset.written);
      var setTo = function (f) { input.value = num(written * f, 0).replace(/,/g, ''); apply(f); };
      input.addEventListener('input', function () { var v = parseFloat(input.value); if (v > 0) apply(v / base); });
      $$('[data-factor]', sc).forEach(function (b) { b.addEventListener('click', function () { setTo(parseFloat(b.dataset.factor)); }); });
      apply(1);
    }

    /* the bottom sheet on phone */
    var tools = $('[data-tools]'), handle = $('[data-tools-handle]');
    if (handle) handle.addEventListener('click', function () {
      var open = tools.classList.toggle('is-open'); handle.setAttribute('aria-expanded', String(open));
    });

    /* copy the recipe as Markdown, and the citation */
    var art = $('[data-md]');
    $$('[data-copy-recipe]').forEach(function (b) { b.addEventListener('click', function () { copy(art.dataset.md, 'Copied', b); }); });
    $$('[data-copy-cite]').forEach(function (b) { b.addEventListener('click', function () { copy($('[data-cite]').textContent, 'Copied', b); }); });

    /* steps: tap the number to tick a step off; remembered per recipe */
    var steps = $$('.ck-step'), reset = $('[data-steps-reset]'), done = store.get('steps:' + rid, []);
    var paint = function () {
      steps.forEach(function (li) {
        var on = done.indexOf(li.dataset.step) >= 0;
        li.classList.toggle('is-done', on); $('.ck-num', li).setAttribute('aria-pressed', String(on));
      });
      if (reset) reset.hidden = !done.length;
    };
    steps.forEach(function (li) {
      $('.ck-num', li).addEventListener('click', function () {
        var i = done.indexOf(li.dataset.step);
        if (i >= 0) done.splice(i, 1); else done.push(li.dataset.step);
        store.set('steps:' + rid, done); paint();
      });
    });
    if (reset) reset.addEventListener('click', function () { done = []; store.set('steps:' + rid, done); paint(); });
    paint();

    /* the chooser: an attested rendering, an identification, or the Greek alone */
    var dataEl = $('#ck-choices'), dlg = $('.ck-choose');
    var choices = dataEl ? JSON.parse(dataEl.textContent) : {}, chosen = store.get('choices', {});
    var label = function (lem, btn) {
      var c = choices[lem], k = chosen[lem], w = $('.ck-ren-w', btn), o = null;
      if (c && k && k !== 'greek') c.opts.forEach(function (x) { if (x.k === k) o = x; });
      btn.dataset.mode = k === 'greek' ? 'greek' : (o ? 'chosen' : 'default');
      if (k === 'greek') { w.textContent = 'English'; }
      else if (o && o.taxon) { w.innerHTML = ''; var i = document.createElement('i'); i.textContent = o.word; w.appendChild(i); w.appendChild(document.createTextNode(' · ' + o.by)); }
      else if (o) { w.textContent = o.word + ' · ' + o.by; }
      else { w.textContent = btn.dataset.default; }
    };
    var paintAll = function () { $$('[data-choose]').forEach(function (b) { label(b.dataset.choose, b); }); };
    var open = function (btn) {
      var lem = btn.dataset.choose, c = choices[lem]; if (!c || !dlg || !dlg.showModal) return;
      $('.ck-choose-title', dlg).innerHTML = '';
      var g = document.createElement('span'); g.lang = 'grc'; g.textContent = c.grc;
      var t = document.createElement('span'); t.className = 'ck-tr'; t.textContent = ' ' + c.tr;
      $('.ck-choose-title', dlg).appendChild(g); $('.ck-choose-title', dlg).appendChild(t);
      var body = $('.ck-choose-body', dlg); body.innerHTML = '';
      var cur = chosen[lem] || 'default';
      var add = function (key, word, by, italic) {
        var l = document.createElement('label'); l.className = 'ck-opt';
        var r = document.createElement('input'); r.type = 'radio'; r.name = 'ck-opt'; r.value = key; r.checked = key === cur;
        var s = document.createElement('span'), w = document.createElement(italic ? 'i' : 'span');
        w.className = 'ck-opt-w'; w.textContent = word; s.appendChild(w);
        if (by) { var b = document.createElement('span'); b.className = 'ck-opt-by'; b.textContent = by; s.appendChild(b); }
        l.appendChild(r); l.appendChild(s); body.appendChild(l);
        r.addEventListener('change', function () {
          if (key === 'default') delete chosen[lem]; else chosen[lem] = key;
          store.set('choices', chosen); paintAll(); dlg.close();
        });
      };
      var head = function (text) { var h = document.createElement('h3'); h.textContent = text; body.appendChild(h); };
      add('greek', 'Greek alone', 'no English beside it');
      add('default', c.ren, c.basis);
      var rens = c.opts.filter(function (x) { return !x.taxon; }), ids = c.opts.filter(function (x) { return x.taxon; });
      if (rens.length) { head('Other English words'); rens.forEach(function (x) { add(x.k, x.word, x.by); }); }
      if (ids.length) { head('What scholars identify it as'); ids.forEach(function (x) { add(x.k, x.word, x.by, true); }); }
      var link = btn.closest('.ck-ing').querySelector('.ck-ing-grc');
      $('.ck-choose-more', dlg).href = link.getAttribute('href');
      dlg.showModal();
    };
    $$('[data-choose]').forEach(function (b) { b.addEventListener('click', function () { open(b); }); });
    if (dlg) dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    paintAll();

    /* the in-page list marks the section in view */
    var toc = $$('.ck-toc a');
    if (toc.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          toc.forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id)); });
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      toc.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) io.observe(s); });
    }

    /* previous and next: arrow keys at desktop, a swipe on phone */
    var go = function (dir) { var href = document.body.dataset[dir]; if (href) location.href = href; };
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var a = document.activeElement;
      if (a && a !== document.body && !a.classList.contains('cb-wrap')) return;
      if ((dlg && dlg.open) || (menu && !menu.hidden)) return;
      if (e.key === 'ArrowLeft') go('prev'); else if (e.key === 'ArrowRight') go('next');
    });
    var sx = null, sy = 0;
    document.addEventListener('touchstart', function (e) {
      var t = e.target;
      sx = (e.touches.length === 1 && !t.closest('input, .ck-tablewrap, .ck-filters, .ck-tools, dialog, .ck-menu')) ? e.touches[0].clientX : null;
      sy = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 90 && Math.abs(dy) < 40) go(dx < 0 ? 'next' : 'prev');
      sx = null;
    }, { passive: true });
  }

  /* ---- lists: search, filter chips, tiles or list ---- */
  var q = $('[data-q]');
  if (q) {
    var items = $$('[data-item]'), count = $('[data-count]'), empty = $('[data-empty]');
    var noun = count ? count.textContent.replace(/^\d+\s*/, '') : '';
    /* facets (round 12): one kind, one author, one family; ingredients add up (a recipe must have
       all of them); the URL carries the choice (?kind=oil&ingredient=smyrna,kalamos) */
    var facets = { kind: '', author: '', family: '' }, ings = [];
    var fold = function (s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ'); };
    var badge = $('[data-filter-n]'), active = $('[data-active]'), shownEl = $('[data-shown]');
    var labelOf = function (k) {
      var b = $('[data-facet="' + k + '"][data-value="' + facets[k] + '"] .ck-opt2-l');
      return facets[k] && b ? b.textContent : '';
    };
    var paint = function () {
      $$('[data-facet]').forEach(function (b) { b.setAttribute('aria-pressed', String(facets[b.dataset.facet] === b.dataset.value)); });
      $$('[data-ing]').forEach(function (b) { b.setAttribute('aria-pressed', String(ings.indexOf(b.dataset.ing) >= 0)); });
      var n = ings.length + Object.keys(facets).filter(function (k) { return facets[k]; }).length;
      if (badge) { badge.hidden = !n; badge.textContent = n; }
      if (active) {
        var parts = ['kind', 'author', 'family'].map(labelOf).filter(Boolean);
        if (ings.length) parts.push('with ' + ings.map(function (g) { var b = $('[data-ing="' + g + '"]'); return b ? b.dataset.label : g; }).join(', '));
        active.hidden = !parts.length;
        $('[data-active-text]', active).textContent = parts.join(' · ');
      }
    };
    var toUrl = function () {
      try {
        var p = new URLSearchParams();
        Object.keys(facets).forEach(function (k) { if (facets[k]) p.set(k, facets[k]); });
        if (ings.length) p.set('ingredient', ings.join(','));
        var qs = p.toString().replace(/%2C/g, ',');
        history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
      } catch (e) { /* a frame that forbids it: the filter still works */ }
    };
    var run = function () {
      var words = fold(q.value.trim()).split(/\s+/).filter(Boolean), shown = 0, total = 0;
      items.forEach(function (el) {
        var hay = fold(el.dataset.search || ''), ok = words.every(function (w) { return hay.indexOf(w) >= 0; });
        Object.keys(facets).forEach(function (k) { if (ok && facets[k] && el.dataset[k] !== facets[k]) ok = false; });
        if (ok) ok = ings.every(function (g) { return (el.dataset.ings || '').indexOf('|' + g + '|') >= 0; });
        el.hidden = !ok;
        if (el.tagName !== 'TR') { total++; if (ok) shown++; }
      });
      if (count) count.textContent = (shown === total ? total : shown + ' of ' + total) + ' ' + noun;
      if (shownEl) { shownEl.textContent = shown; shownEl.nextSibling.nodeValue = shown === 1 ? ' recipe' : ' recipes'; }
      if (empty) empty.hidden = shown > 0;
    };
    var update = function () { paint(); run(); toUrl(); };
    q.addEventListener('input', run);
    $$('[data-facet]').forEach(function (b) {
      b.addEventListener('click', function () { facets[b.dataset.facet] = b.dataset.value; update(); });
    });
    $$('[data-ing]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = ings.indexOf(b.dataset.ing);
        if (k >= 0) ings.splice(k, 1); else ings.push(b.dataset.ing);
        update();
      });
    });
    $$('[data-reset]').forEach(function (b) {
      b.addEventListener('click', function () { facets = { kind: '', author: '', family: '' }; ings = []; update(); });
    });
    /* the drawer: a sheet from the bottom on a phone, from the side on a desktop */
    var drawer = $('#ck-drawer');
    if (drawer && drawer.showModal) {
      $$('[data-filters-open]').forEach(function (b) { b.addEventListener('click', function () { drawer.showModal(); }); });
      $$('[data-filters-close]', drawer).forEach(function (b) { b.addEventListener('click', function () { drawer.close(); }); });
      drawer.addEventListener('click', function (e) { if (e.target === drawer) drawer.close(); });
    }
    try {
      var p0 = new URLSearchParams(location.search);
      Object.keys(facets).forEach(function (k) {
        var v = p0.get(k) || '';
        if (!v || $('[data-facet="' + k + '"][data-value="' + v + '"]')) facets[k] = v;
      });
      ings = (p0.get('ingredient') || '').split(',').filter(function (g) { return g && $('[data-ing="' + g + '"]'); });
    } catch (e) { /* no query string here */ }
    if ($('[data-facet]') || ings.length) { paint(); run(); }
    if (location.hash === '#search') { q.focus(); }
    $$('[data-search-tab]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); q.focus(); q.scrollIntoView({ block: 'center' }); }); });

    var tiles = $('[data-results]'), list = $('[data-results-list]');
    if (list) {
      var view = function (v) {
        tiles.hidden = v === 'list'; list.hidden = v !== 'list';
        $$('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === v)); });
        store.set('view', v);
      };
      $$('[data-view]').forEach(function (b) { b.addEventListener('click', function () { view(b.dataset.view); }); });
      if (window.matchMedia('(min-width: 760px)').matches) view(store.get('view', 'tiles'));
      var tbody = $('tbody', list);
      $$('[data-sort]', list).forEach(function (b) {
        b.addEventListener('click', function () {
          var th = b.closest('th'), col = +b.dataset.sort, dir = th.getAttribute('aria-sort') === 'ascending' ? -1 : 1;
          $$('th[aria-sort]', list).forEach(function (x) { x.removeAttribute('aria-sort'); });
          th.setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
          $$('tr', tbody).sort(function (a, b2) {
            var x = a.children[col].dataset.v, y = b2.children[col].dataset.v;
            return x < y ? -dir : x > y ? dir : 0;
          }).forEach(function (tr) { tbody.appendChild(tr); });
        });
      });
    }
  }
})();
