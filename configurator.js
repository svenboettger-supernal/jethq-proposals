(function () {
  'use strict';

  /* ── Package model ────────────────────────────────────────────
     weeks / price = null means "to be confirmed" (Admin & Finance).
     deps lists the packages that must be delivered first. Core & Home
     is the foundation everything else builds on; the rest have no
     dependency on each other, so they run in parallel when selected
     together. Order here is the display order. */
  var PACKAGES = [
    { id: 'core-home', name: 'Core &amp; Home', href: 'core-home/', weeks: 8, price: 2000, foundation: true, deps: [],
      blurb: 'The platform and the role-based home screen everyone opens first.' },
    { id: 'markets-listings', name: 'Markets &amp; Listings', href: 'markets-listings/', weeks: 4, price: 1000, deps: ['core-home'],
      blurb: 'The Hub gateway, with aircraft files consolidated on each record.' },
    { id: 'intranet', name: 'Intranet, Knowledge &amp; Marketing', href: 'intranet/', weeks: 6, price: 2000, deps: ['core-home'],
      blurb: 'The whole company intranet rebuilt in one modern place.' },
    { id: 'ask-jetty', name: 'Ask Jetty', href: 'ask-jethq/', weeks: 6, price: 2000, deps: ['core-home'],
      blurb: 'The pilot-persona copilot that replaces ChatGPT and Claude.' },
    { id: 'admin-finance', name: 'Admin &amp; Finance', href: 'admin-finance/', weeks: null, price: null, deps: ['core-home'],
      blurb: 'Accounts payable and receivable and the finance operations.' },
    { id: 'sales-ops', name: 'Sales Ops', href: 'sales-ops/', weeks: 8, price: 2500, deps: ['core-home'],
      blurb: 'Salesforce brought into Flight Deck and visualized in real time.' }
  ];

  var byId = {};
  PACKAGES.forEach(function (p) { byId[p.id] = p; });

  /* Selection state: default everything on so the full plan shows first. */
  var selected = {};
  PACKAGES.forEach(function (p) { selected[p.id] = true; });

  var elOptions, elSummary, elTimeline, elNote;

  function selectedList() {
    return PACKAGES.filter(function (p) { return selected[p.id]; });
  }

  /* Earliest-start schedule. A package starts when every selected
     prerequisite has finished; with no selected prerequisite it starts
     at week zero. Packages that share a start run in parallel. */
  function schedule() {
    var start = {}, finish = {}, done = {};

    function resolve(p) {
      if (done[p.id]) return;
      var s = 0;
      p.deps.forEach(function (d) {
        if (selected[d]) {
          resolve(byId[d]);
          if (finish[d] > s) s = finish[d];
        }
      });
      start[p.id] = s;
      finish[p.id] = s + (p.weeks == null ? 0 : p.weeks);
      done[p.id] = true;
    }

    selectedList().forEach(resolve);
    return { start: start, finish: finish };
  }

  function fmtMoney(n) {
    return '$' + n.toLocaleString('en-US');
  }

  function render() {
    var sel = selectedList();
    var sched = schedule();

    var totalPrice = 0, hasTbdPrice = false;
    var totalWeeks = 0, hasTbdWeeks = false;
    sel.forEach(function (p) {
      if (p.price == null) hasTbdPrice = true; else totalPrice += p.price;
      if (p.weeks == null) hasTbdWeeks = true;
      else if (sched.finish[p.id] > totalWeeks) totalWeeks = sched.finish[p.id];
    });

    /* Foundation nudge: something selected that leans on Core & Home
       while Core & Home itself is switched off. */
    var missingFoundation = !selected['core-home'] &&
      sel.some(function (p) { return p.deps.indexOf('core-home') > -1; });

    renderOptions();
    renderSummary(sel, totalPrice, hasTbdPrice, totalWeeks, hasTbdWeeks, missingFoundation);
    renderTimeline(sel, sched, totalWeeks, hasTbdWeeks);
  }

  function renderOptions() {
    elOptions.innerHTML = PACKAGES.map(function (p) {
      var on = selected[p.id];
      var meta = (p.weeks == null ? 'Timing TBD' : p.weeks + ' weeks') + ' &middot; ' +
                 (p.price == null ? 'Pricing TBD' : fmtMoney(p.price) + '/mo');
      return '' +
        '<label class="planner-option' + (on ? ' is-on' : '') + '">' +
          '<input type="checkbox" data-pkg="' + p.id + '"' + (on ? ' checked' : '') + '>' +
          '<span class="planner-option-body">' +
            '<span class="planner-option-name">' + p.name +
              (p.foundation ? '<span class="planner-badge">Foundation</span>' : '') +
            '</span>' +
            '<span class="planner-option-blurb">' + p.blurb + '</span>' +
          '</span>' +
          '<span class="planner-option-meta">' + meta + '</span>' +
        '</label>';
    }).join('');
  }

  function renderSummary(sel, totalPrice, hasTbdPrice, totalWeeks, hasTbdWeeks, missingFoundation) {
    if (!sel.length) {
      elSummary.innerHTML =
        '<p class="planner-summary-empty">Choose the packages JetHQ wants and the plan builds itself here.</p>';
      return;
    }

    var timeVal = totalWeeks > 0 ? '~' + totalWeeks + ' weeks' : 'TBD';
    var timeNote = hasTbdWeeks ? 'plus Admin &amp; Finance, timing set with Johnny' : 'delivered end to end';
    var priceVal = totalPrice > 0 ? fmtMoney(totalPrice) : 'TBD';
    var priceNote = hasTbdPrice ? 'plus Admin &amp; Finance, priced with Johnny' : 'on the point-based plan';

    var foundationNote = missingFoundation
      ? '<p class="planner-flag">Core &amp; Home is the foundation the rest sits on. It is worth turning on first.</p>'
      : '';

    elSummary.innerHTML = '' +
      '<p class="planner-summary-label">Your plan</p>' +
      '<div class="planner-stat">' +
        '<span class="planner-stat-num">' + sel.length + '</span>' +
        '<span class="planner-stat-cap">package' + (sel.length === 1 ? '' : 's') + ' selected</span>' +
      '</div>' +
      '<div class="planner-stat">' +
        '<span class="planner-stat-num">' + timeVal + '</span>' +
        '<span class="planner-stat-cap">time to deliver, ' + timeNote + '</span>' +
      '</div>' +
      '<div class="planner-stat">' +
        '<span class="planner-stat-num">' + priceVal + (priceVal !== 'TBD' ? '<span class="planner-stat-unit">/mo</span>' : '') + '</span>' +
        '<span class="planner-stat-cap">' + priceNote + '</span>' +
      '</div>' +
      foundationNote;
  }

  function renderTimeline(sel, sched, totalWeeks, hasTbdWeeks) {
    if (!sel.length) {
      elTimeline.innerHTML = '<p class="planner-timeline-empty">No packages selected yet.</p>';
      return;
    }

    var scale = totalWeeks > 0 ? totalWeeks : 1;

    /* Week axis: a tick roughly every 2 weeks. */
    var ticks = [];
    if (totalWeeks > 0) {
      var step = totalWeeks > 12 ? 4 : 2;
      for (var w = 0; w <= totalWeeks; w += step) {
        ticks.push('<span class="planner-tick" style="left:' + (w / scale * 100) + '%">' + w + '</span>');
      }
    }
    var axis = '<div class="planner-axis">' + ticks.join('') +
               '<span class="planner-axis-unit">weeks</span></div>';

    var rows = sel.map(function (p) {
      var s = sched.start[p.id];
      var bar;
      if (p.weeks == null) {
        bar = '<span class="planner-bar planner-bar--tbd" style="left:' + (s / scale * 100) +
              '%">TBD</span>';
      } else {
        var left = s / scale * 100;
        var width = p.weeks / scale * 100;
        bar = '<span class="planner-bar" style="left:' + left + '%;width:' + width + '%"' +
              ' title="' + p.name.replace(/&amp;/g, '&') + ', ' + p.weeks + ' weeks">' +
              '<span class="planner-bar-label">' + p.weeks + 'w</span></span>';
      }
      return '' +
        '<div class="planner-trow">' +
          '<div class="planner-trow-name">' + p.name + '</div>' +
          '<div class="planner-track">' + bar + '</div>' +
        '</div>';
    }).join('');

    elTimeline.innerHTML = axis + rows;
  }

  function onChange(e) {
    var cb = e.target.closest ? e.target.closest('input[data-pkg]') : null;
    if (!cb) return;
    selected[cb.getAttribute('data-pkg')] = cb.checked;
    render();
  }

  function init() {
    elOptions = document.getElementById('planner-options');
    elSummary = document.getElementById('planner-summary');
    elTimeline = document.getElementById('planner-timeline');
    if (!elOptions || !elSummary || !elTimeline) return;
    elOptions.addEventListener('change', onChange);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
